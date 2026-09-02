import puppeteer from 'puppeteer';
import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/prisma';

export interface BatchEmissionDTO {
  studentIds: string[];
  rankId: string;
  dojoId: string;
  associationName: string;
  shihanName: string;
  presidentName: string;
  issueDate: Date;
}

export class CertificateService {
  /**
   * Processamento em Lote (Batch): Gera PDFs individuais usando Puppeteer,
   * atualiza as graduações no banco, cria os registros e empacota tudo em um ZIP.
   */
  async generateBatchZip(data: BatchEmissionDTO, createdById: string): Promise<Buffer> {
    const { studentIds, rankId, dojoId, associationName, shihanName, presidentName, issueDate } = data;
    
    // 1. Validar graduação e resgatar dados dos alunos e dojo
    const rank = await prisma.rank.findFirst({ 
      where: { id: rankId, dojoId, deletedAt: null } 
    });
    const dojo = await prisma.dojo.findUnique({ where: { id: dojoId } });
    
    if (!rank || !dojo) {
      throw new Error('Graduação ou Dojo não encontrado.');
    }

    const students = await prisma.student.findMany({
      where: { id: { in: studentIds }, dojoId, deletedAt: null }
    });

    if (students.length === 0) {
      throw new Error('Nenhum aluno válido selecionado.');
    }

    // 2. Inicializa o Motor Headless e o Compressor
    const browser = await puppeteer.launch({ 
      headless: true, 
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    });
    
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    
    archive.on('data', chunk => chunks.push(chunk));
    const zipPromise = new Promise<Buffer>((resolve, reject) => {
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', err => reject(err));
    });

    // 3. Loop Transacional de Renderização
    for (const student of students) {
      const validationHash = uuidv4();
      
      const existingCert = await prisma.certificate.findFirst({
        where: { studentId: student.id, rankId: rank.id, deletedAt: null }
      });

      if (existingCert) {
        await prisma.certificate.update({
          where: { id: existingCert.id },
          data: {
            associationName,
            shihanName,
            presidentName,
            issueDate,
            validationHash,
            updatedById: createdById
          }
        });
      } else {
        await prisma.certificate.create({
          data: {
            studentId: student.id,
            rankId: rank.id,
            associationName,
            shihanName,
            presidentName,
            issueDate,
            validationHash,
            createdById
          }
        });
      }

      await prisma.student.update({
        where: { id: student.id },
        data: { currentRankId: rank.id, updatedById: createdById }
      });

      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const htmlContent = this.getCertificateHtml({
        studentName: student.name,
        rankName: rank.name,
        color: rank.color,
        phrase: rank.phrase || '',
        associationName,
        shihanName,
        presidentName,
        issueDate,
        validationHash,
        logoPrimaryUrl: dojo.logoPrimaryUrl ? (dojo.logoPrimaryUrl.startsWith('http') ? dojo.logoPrimaryUrl : `${baseUrl}${dojo.logoPrimaryUrl}`) : null,
        logoSecondaryUrl: dojo.logoSecondaryUrl ? (dojo.logoSecondaryUrl.startsWith('http') ? dojo.logoSecondaryUrl : `${baseUrl}${dojo.logoSecondaryUrl}`) : null,
        city: dojo.city,
        showShihanText: dojo.showShihanText,
        showKanjiText: dojo.showKanjiText,
        diplomaBackground: dojo.diplomaBackground,
        diplomaBackgroundImageUrl: dojo.diplomaBackgroundImageUrl,
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true
      });

      await page.close();
      
      const safeName = student.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      archive.append(Buffer.from(pdfBuffer), { name: `Certificado_${safeName}_${rank.name}.pdf` });
    }

    await browser.close();
    await archive.finalize();
    
    return zipPromise;
  }

  /**
   * Registro Histórico: Apenas insere na timeline, NÃO altera a faixa atual do aluno.
   */
  async registerHistoric(studentId: string, rankId: string, dojoId: string, issueDate: Date, createdById: string) {
    const student = await prisma.student.findFirst({ where: { id: studentId, dojoId } });
    const rank = await prisma.rank.findFirst({ where: { id: rankId, dojoId } });
    const dojo = await prisma.dojo.findUnique({ where: { id: dojoId } });

    if (!student || !rank || !dojo) throw new Error('Dados inválidos para registro histórico');

    const existingCert = await prisma.certificate.findFirst({
      where: { studentId, rankId, deletedAt: null }
    });

    if (existingCert) {
      return prisma.certificate.update({
        where: { id: existingCert.id },
        data: {
          issueDate,
          updatedById: createdById
        }
      });
    }

    return prisma.certificate.create({
      data: {
        studentId,
        rankId,
        associationName: dojo.defaultAssociation || dojo.name,
        shihanName: dojo.defaultShihan || 'Não informado',
        presidentName: dojo.president || 'Não informado',
        issueDate,
        validationHash: uuidv4(),
        createdById
      }
    });
  }

  /**
   * Reemissão (2ª Via): Gera PDF de um certificado que já existe na Timeline.
   */
  async generateSinglePdf(certificateId: string, dojoId: string): Promise<Buffer> {
    const cert = await prisma.certificate.findFirst({
      where: { id: certificateId, deletedAt: null },
      include: { student: { include: { dojo: true } }, rank: true }
    });

    if (!cert) throw new Error('Certificado não encontrado.');
    if (cert.student.dojoId !== dojoId) throw new Error('Acesso negado.');

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const htmlContent = this.getCertificateHtml({
      studentName: cert.student.name,
      rankName: cert.rank.name,
      color: cert.rank.color,
      phrase: cert.rank.phrase || '',
      associationName: cert.associationName,
      shihanName: cert.shihanName,
      presidentName: cert.presidentName,
      issueDate: cert.issueDate,
      validationHash: cert.validationHash,
      logoPrimaryUrl: cert.student.dojo.logoPrimaryUrl ? (cert.student.dojo.logoPrimaryUrl.startsWith('http') ? cert.student.dojo.logoPrimaryUrl : `${baseUrl}${cert.student.dojo.logoPrimaryUrl}`) : null,
      logoSecondaryUrl: cert.student.dojo.logoSecondaryUrl ? (cert.student.dojo.logoSecondaryUrl.startsWith('http') ? cert.student.dojo.logoSecondaryUrl : `${baseUrl}${cert.student.dojo.logoSecondaryUrl}`) : null,
      city: cert.student.dojo.city,
      showShihanText: cert.student.dojo.showShihanText,
      showKanjiText: cert.student.dojo.showKanjiText,
        diplomaBackground: cert.student.dojo.diplomaBackground,
        diplomaBackgroundImageUrl: cert.student.dojo.diplomaBackgroundImageUrl,
    });

    const browser = await puppeteer.launch({ 
      headless: true, 
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true
    });

    await browser.close();
    return Buffer.from(pdfBuffer);
  }

  /**
   * Template Builder isolado
   */

  private getCertificateHtml(data: any): string {
    const isWhite = data.color && ['#ffffff', '#fff', '#fafafa', '#f8f9fa', '#f1f5f9', '#f3f4f6'].includes(data.color.toLowerCase());
    const borderColor = data.color;
    const elementColor = isWhite ? '#111827' : data.color;

    const isDiploma = data.rankName && data.rankName.includes('Preta');
    const bgs: Record<string, string> = {
      white: 'background-color: white;',
      sunset: 'background: linear-gradient(135deg, #ffffff 0%, #fff0e6 40%, #ffdfc4 100%);',
      golden: 'background: linear-gradient(135deg, #ffffff 0%, #fffbf0 40%, #fef0c7 100%);',
      silver: 'background: linear-gradient(135deg, #ffffff 0%, #f8fafc 40%, #e2e8f0 100%);',
      parchment: 'background: linear-gradient(135deg, #fdfbf7 0%, #f3ecd8 100%);',
      ruby: 'background: linear-gradient(135deg, #ffffff 0%, #fff0f0 40%, #ffe0e0 100%);',
      emerald: 'background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 40%, #dcfce7 100%);',
      sapphire: 'background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 40%, #e0f2fe 100%);',
      platinum: 'background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 40%, #cbd5e1 100%);',
      sakura: 'background: linear-gradient(135deg, #ffffff 0%, #fdf2f8 40%, #fce7f3 100%);',
      copper: 'background: linear-gradient(135deg, #ffffff 0%, #fff7ed 40%, #ffedd5 100%);',
      amethyst: 'background: linear-gradient(135deg, #ffffff 0%, #faf5ff 40%, #f3e8ff 100%);',
      ocean: 'background: linear-gradient(135deg, #ffffff 0%, #f0fdfa 40%, #ccfbf1 100%);',
      sand: 'background: linear-gradient(135deg, #ffffff 0%, #fdfbf7 40%, #f5f0e1 100%);',
      bamboo: 'background: linear-gradient(135deg, #ffffff 0%, #f7fee7 40%, #ecfccb 100%);'
    };
    let backgroundStyle = 'background-color: white;';
    if (isDiploma) {
      if (data.diplomaBackground === 'custom_image' && data.diplomaBackgroundImageUrl) {
        const bgUrl = data.diplomaBackgroundImageUrl.startsWith('http') ? data.diplomaBackgroundImageUrl : `${process.env.BASE_URL || 'http://localhost:3000'}${data.diplomaBackgroundImageUrl}`;
        backgroundStyle = `background: url('${bgUrl}') center/100% 100% no-repeat;`;
      } else {
        const bg = data.diplomaBackground || 'sunset';
        backgroundStyle = bgs[bg] || 'background-color: white;';
      }
    }
    const isCustomBg = isDiploma && data.diplomaBackground === 'custom_image' && !!data.diplomaBackgroundImageUrl;
      const title = isDiploma ? 'Diploma' : 'Certificado';
    const subtitle = isDiploma ? 'Outorga de Faixa Preta' : 'de Graduação';
    const finalStudentName = data.studentName || 'Nome do Aluno';
    const phrase = data.phrase || '';
    const dateFormatted = data.issueDate ? new Date(data.issueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';
    const finalDate = data.city ? `${data.city}, ${dateFormatted}` : dateFormatted;

    const shihanParts = data.shihanName ? data.shihanName.trim().split(/\s+/) : [];
    const shihanShort = shihanParts.length > 1 ? `${shihanParts[0]} ${shihanParts[shihanParts.length - 1]}` : (shihanParts[0] || '');

    const shihanHtml = data.showShihanText ? `<div style="font-weight: bold; color: black; font-size: 20px; white-space: nowrap; margin-top: 10px;">
        Shihan: <span style="color: #dc2626;">${shihanShort}</span>
      </div>` : '';

    const kanjiHtml = data.showKanjiText ? `<div style="display: flex; justify-content: center; gap: 70px; margin-top: 30px; color: black; font-weight: bold; font-size: 50px; line-height: 1.1; font-family: 'Noto Serif JP', serif;">
        <div style="display: flex; flex-direction: column;"><span>\u62F3</span><span>\u5FD7</span><span>\u4F1A</span></div>
        <div style="display: flex; flex-direction: column;"><span>\u7A7A</span><span>\u624B</span><span>\u9053</span></div>
      </div>` : '';

    const dynamicText = (data.showShihanText || data.showKanjiText)
      ? `<div style="text-align: center; width: 100%; margin-top: 10px;">${shihanHtml}${kanjiHtml}</div>`
      : '';

    const logo1 = data.logoPrimaryUrl
      ? `<img src="${data.logoPrimaryUrl}" alt="Logo 1" style="width: 85%; object-fit: contain; flex-shrink: 0;">`
      : `<div style="width: 100px; height: 100px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; color: #999; flex-shrink: 0;">Logo 1</div>`;
      
    const logo2 = data.logoSecondaryUrl
      ? `<img src="${data.logoSecondaryUrl}" alt="Logo 2" style="max-width: 95%; max-height: 25%; object-fit: contain; margin-top: auto;">`
      : '';

    const flexAlignment = data.logoSecondaryUrl ? 'space-between' : 'center';

    return `<!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Montserrat:wght@400;500;700&family=Noto+Serif+JP:wght@700&family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
      <style>
        body { margin: 0; padding: 0; background: #fff; }
        .cert-container {
          width: 29.7cm; height: 21cm; box-sizing: border-box; 
          border: 30px solid ${borderColor}; 
          ${backgroundStyle} display: flex; flex-direction: row; 
          font-family: 'Montserrat', 'Noto Sans JP', sans-serif;
          position: relative;
        }
        .left-panel {
          width: 30%; display: flex; flex-direction: column; align-items: center; justify-content: ${flexAlignment}; 
          box-sizing: border-box; border-right: ${isDiploma ? 'none' : '2px solid #e5e7eb'}; padding: 1rem; padding-bottom: 2rem;
        }
        .left-panel-top {
          width: 100%; display: flex; flex-direction: column; align-items: center;
        }
        .right-panel {
          width: 70%; display: flex; flex-direction: column; padding: 2.5rem; box-sizing: border-box;
        }
        .cert-header { text-align: center; }
        .cert-association { font-size: 1.5rem; line-height: 2rem; font-weight: 700; text-transform: uppercase; color: #1f2937; margin: 0; }
        .cert-title { font-family: 'Playfair Display', serif; font-size: 3.5rem; line-height: 1; color: #991b1b; margin-top: 0.5rem; margin-bottom: 0; }
        .cert-subtitle { font-size: 1.5rem; line-height: 2rem; margin-top: 0.25rem; color: #4b5563; margin-bottom: 0; }
        
        .cert-body { text-align: center; padding: 0 1rem; margin-top: 2.5rem; }
        .cert-text { font-size: 1.125rem; line-height: 1.75rem; color: #374151; margin: 0; }
        .cert-student { font-weight: 700; font-size: 2.5rem; line-height: 1.1; color: #111827; margin: 0.5rem 0; min-height: 5rem; display: flex; align-items: center; justify-content: center; flex-wrap: wrap; text-align: center; }
        .cert-rank { font-weight: 700; font-size: 2rem; line-height: 1.1; margin: 0.5rem 0; color: ${elementColor}; }
        .cert-phrase { font-size: 1rem; line-height: 1.5rem; font-style: italic; color: #4b5563; margin-top: 1rem; }
        .cert-date { font-size: 1.125rem; line-height: 1.75rem; color: #1f2937; margin-top: 1.5rem; font-weight: 500; }
        
        .signatures { width: 100%; display: flex; justify-content: space-between; align-items: flex-start; text-align: center; padding-top: 1rem; }
        .sig-block { width: 30%; }
        .sig-line { border-top: 2px solid ${elementColor}; width: 75%; margin: 0 auto; }
        .sig-name { margin-top: 0.5rem; font-weight: 700; font-size: 0.875rem; line-height: 1.25rem; color: #1f2937; margin-bottom: 0; padding: 0 5px; }
        .sig-role { font-size: 0.75rem; line-height: 1rem; color: #4b5563; margin-top: 0; }
      </style>
    </head>
    <body>
      <div class="cert-container">
          <div class="left-panel">
              <div class="left-panel-top">
                ${logo1}
                ${dynamicText}
              </div>
              ${logo2}
          </div>

          <div class="right-panel">
              <div class="cert-header">
                  <h2 class="cert-association">${data.associationName}</h2>
                  <h1 class="cert-title">${title}</h1>
                  <p class="cert-subtitle">${subtitle}</p>
              </div>
              <div class="cert-body">
                  <p class="cert-text">Conferimos a</p>
                  <p class="cert-student">${finalStudentName}</p>
                  <p class="cert-text">em vista de sua aprovação na categoria de</p>
                  <p class="cert-rank">${data.rankName}</p>
                  <p class="cert-text">de <strong>KARATÊ-DÔ KENSHI-KAI</strong>, para que possa gozar de todos os direitos e prerrogativas concedidos a este certificado.</p>
                  <p class="cert-phrase">${phrase}</p>
                  <p class="cert-date">${finalDate}</p>
              </div>

              <div style="flex-grow: 1;"></div>

              <div class="signatures">
                  <div class="sig-block">
                      <div class="sig-line"></div>
                      <p class="sig-name">${data.presidentName}</p>
                      <p class="sig-role">Presidente da Associação</p>
                  </div>
                  <div class="sig-block">
                      <div class="sig-line"></div>
                      <p class="sig-name">${finalStudentName}</p>
                      <p class="sig-role">Aluno(a)</p>
                  </div>
                  <div class="sig-block">
                      <div class="sig-line"></div>
                      <p class="sig-name">${data.shihanName}</p>
                      <p class="sig-role">Diretor Técnico</p>
                  </div>
              </div>
          </div>
      </div>
    </body>
    </html>`;
  }
}
