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
        logoSecondaryUrl: dojo.logoSecondaryUrl ? (dojo.logoSecondaryUrl.startsWith('http') ? dojo.logoSecondaryUrl : `${baseUrl}${dojo.logoSecondaryUrl}`) : null
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
      logoSecondaryUrl: cert.student.dojo.logoSecondaryUrl ? (cert.student.dojo.logoSecondaryUrl.startsWith('http') ? cert.student.dojo.logoSecondaryUrl : `${baseUrl}${cert.student.dojo.logoSecondaryUrl}`) : null
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
    const title = data.rankName && data.rankName.includes('Preta') ? 'Diploma' : 'Certificado';
    const subtitle = data.rankName && data.rankName.includes('Preta') ? 'Outorga de Faixa Preta' : 'de Graduação';
    const finalStudentName = data.studentName || 'Nome do Aluno';
    const phrase = data.phrase || '';
    
    const logo1 = data.logoPrimaryUrl 
      ? `<img src="${data.logoPrimaryUrl}" alt="Logo 1" style="max-width: 95%; height: auto; object-fit: contain;">`
      : `<div style="width: 100px; height: 100px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; color: #999;">Logo 1</div>`;
      
    const logo2 = data.logoSecondaryUrl 
      ? `<img src="${data.logoSecondaryUrl}" alt="Logo 2" style="max-width: 95%; height: auto; object-fit: contain; margin-top: 1rem;">`
      : '';

    return `<!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Montserrat:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        body { margin: 0; padding: 0; background: #fff; }
        .cert-container {
          width: 29.7cm; height: 21cm; box-sizing: border-box; 
          border: 30px solid ${data.color}; 
          background-color: white; display: flex; flex-direction: row; 
          font-family: 'Montserrat', sans-serif;
          position: relative;
        }
        .left-panel {
          width: 30%; display: flex; flex-direction: column; align-items: center; justify-content: space-around; 
          box-sizing: border-box; border-right: 2px solid #e5e7eb; padding: 1rem;
        }
        .right-panel {
          width: 70%; display: flex; flex-direction: column; padding: 2.5rem; box-sizing: border-box;
        }
        .cert-header { text-align: center; }
        .cert-association { font-size: 1.5rem; line-height: 2rem; font-weight: 700; text-transform: uppercase; color: #1f2937; margin: 0; }
        .cert-title { font-family: 'Playfair Display', serif; font-size: 3.75rem; line-height: 1; color: #991b1b; margin-top: 0.5rem; margin-bottom: 0; }
        .cert-subtitle { font-size: 1.5rem; line-height: 2rem; margin-top: 0.25rem; color: #4b5563; margin-bottom: 0; }
        
        .cert-body { text-align: center; padding: 0 1rem; margin-top: 2.5rem; }
        .cert-text { font-size: 1.125rem; line-height: 1.75rem; color: #374151; margin: 0; }
        .cert-student { font-weight: 700; font-size: 2.25rem; line-height: 2.5rem; color: #111827; margin: 0.5rem 0; height: 5rem; display: flex; align-items: center; justify-content: center; flex-wrap: wrap; }
        .cert-rank { font-weight: 700; font-size: 1.875rem; line-height: 2.25rem; margin: 0.5rem 0; color: ${data.color}; }
        .cert-phrase { font-size: 1rem; line-height: 1.5rem; font-style: italic; color: #4b5563; margin-top: 1rem; }
        .cert-date { font-size: 1.125rem; line-height: 1.75rem; color: #1f2937; margin-top: 1.5rem; font-weight: 500; }
        
        .signatures { width: 100%; display: flex; justify-content: space-between; align-items: flex-start; text-align: center; padding-top: 1rem; }
        .sig-block { width: 30%; }
        .sig-line { border-top: 2px solid ${data.color}; width: 75%; margin: 0 auto; }
        .sig-name { margin-top: 0.5rem; font-weight: 700; font-size: 0.875rem; line-height: 1.25rem; color: #1f2937; margin-bottom: 0; }
        .sig-role { font-size: 0.75rem; line-height: 1rem; color: #4b5563; margin-top: 0; }
        
        .hash { position: absolute; bottom: 8px; left: 16px; font-size: 8px; color: #9ca3af; font-family: monospace; }
      </style>
    </head>
    <body>
      <div class="cert-container">
          <div class="left-panel">
              ${logo1}
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
                  <p class="cert-date">${new Date(data.issueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
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
          <div class="hash">Validação: ${data.validationHash}</div>
      </div>
    </body>
    </html>`;
  }
}
