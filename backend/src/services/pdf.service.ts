import PDFDocument from 'pdfkit';

export interface CertificatePdfParams {
  studentName: string;
  rank: string;
  associationName: string;
  shihanName: string;
  presidentName: string;
  issueDate: Date | string;
}

export function generateCertificatePdfBuffer(params: CertificatePdfParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 30,
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const width = doc.page.width;
      const height = doc.page.height;

      // Outer Decorative Border
      doc
        .rect(20, 20, width - 40, height - 40)
        .lineWidth(5)
        .strokeColor('#991b1b')
        .stroke();

      // Inner Decorative Border
      doc
        .rect(26, 26, width - 52, height - 52)
        .lineWidth(1.5)
        .strokeColor('#b91c1c')
        .stroke();

      // Header: Association
      doc
        .font('Helvetica-Bold')
        .fontSize(22)
        .fillColor('#1f2937')
        .text(params.associationName.toUpperCase(), 40, 55, { align: 'center' });

      doc.moveDown(0.4);

      // Title
      const title = params.rank.includes('Preta') ? 'DIPLOMA DE OUTORGA' : 'CERTIFICADO DE GRADUAÇÃO';
      doc
        .font('Helvetica-Bold')
        .fontSize(30)
        .fillColor('#991b1b')
        .text(title, { align: 'center' });

      doc.moveDown(0.8);

      // Body Intro
      doc
        .font('Helvetica')
        .fontSize(14)
        .fillColor('#374151')
        .text('Certificamos que o(a) atleta e praticante de Karatê-Dô', { align: 'center' });

      doc.moveDown(0.7);

      // Student Name
      doc
        .font('Helvetica-Bold')
        .fontSize(24)
        .fillColor('#111827')
        .text(params.studentName, { align: 'center' });

      doc.moveDown(0.7);

      // Rank Approval
      doc
        .font('Helvetica')
        .fontSize(14)
        .fillColor('#374151')
        .text('concluiu com êxito e mérito a avaliação técnica para a graduação de', { align: 'center' });

      doc.moveDown(0.4);

      // Rank Name
      doc
        .font('Helvetica-Bold')
        .fontSize(20)
        .fillColor('#991b1b')
        .text(params.rank, { align: 'center' });

      doc.moveDown(0.5);

      // Date
      const dateObj = new Date(params.issueDate);
      const formattedDate = isNaN(dateObj.getTime())
        ? String(params.issueDate)
        : dateObj.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          });

      doc
        .font('Helvetica')
        .fontSize(12)
        .fillColor('#4b5563')
        .text(`Emitido em ${formattedDate}`, { align: 'center' });

      // Signatures at bottom
      const sigY = height - 105;

      // President Signature
      doc
        .strokeColor('#4b5563')
        .lineWidth(1)
        .moveTo(60, sigY)
        .lineTo(240, sigY)
        .stroke();
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#1f2937')
        .text(params.presidentName, 60, sigY + 4, { width: 180, align: 'center' });
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#6b7280')
        .text('Presidente da Associação', 60, sigY + 16, { width: 180, align: 'center' });

      // Student Signature
      doc
        .strokeColor('#4b5563')
        .lineWidth(1)
        .moveTo(width / 2 - 90, sigY)
        .lineTo(width / 2 + 90, sigY)
        .stroke();
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#1f2937')
        .text(params.studentName, width / 2 - 90, sigY + 4, { width: 180, align: 'center' });
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#6b7280')
        .text('Aluno(a) Graduado(a)', width / 2 - 90, sigY + 16, { width: 180, align: 'center' });

      // Shihan Signature
      doc
        .strokeColor('#4b5563')
        .lineWidth(1)
        .moveTo(width - 240, sigY)
        .lineTo(width - 60, sigY)
        .stroke();
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#1f2937')
        .text(params.shihanName, width - 240, sigY + 4, { width: 180, align: 'center' });
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#6b7280')
        .text('Diretor Técnico / Shihan', width - 240, sigY + 16, { width: 180, align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
