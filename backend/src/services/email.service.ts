import nodemailer from 'nodemailer';

let transporterPromise: Promise<nodemailer.Transporter> | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      const testAccount = await nodemailer.createTestAccount();
      return nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    })();
  }
  return transporterPromise;
}

export interface SendCertificateEmailParams {
  to: string;
  studentName: string;
  rank: string;
  associationName: string;
  pdfBuffer: Buffer;
}

export interface EmailSendResult {
  sent: boolean;
  previewUrl: string;
  messageId: string;
}

export async function sendCertificateEmail(params: SendCertificateEmailParams): Promise<EmailSendResult> {
  try {
    const transporter = await getTransporter();

    const info = await transporter.sendMail({
      from: `"${params.associationName}" <certificados@ethereal.email>`,
      to: params.to,
      subject: `🥋 Certificado de Graduação - ${params.studentName} (${params.rank})`,
      text: `Olá ${params.studentName},\n\nParabéns pela sua graduação para ${params.rank} na ${params.associationName}!\nSeu certificado oficial segue em anexo.\n\nOss!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #991b1b; text-align: center;">🥋 Certificado Oficial de Graduação</h2>
          <p>Olá <strong>${params.studentName}</strong>,</p>
          <p>Parabéns por sua conquista! É com satisfação que emitimos seu certificado oficial para a graduação <strong>${params.rank}</strong> na <strong>${params.associationName}</strong>.</p>
          <p>O seu certificado em PDF de alta qualidade foi gerado e está anexo a esta mensagem.</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="font-size: 12px; color: #6b7280; text-align: center;">Sistema de Gestão & Certificados de Karatê-Dô</p>
        </div>
      `,
      attachments: [
        {
          filename: `Certificado_${params.studentName.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
          content: params.pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    const testUrl = nodemailer.getTestMessageUrl(info);
    const previewUrl = typeof testUrl === 'string' ? testUrl : '';

    console.log('📬 [EMAIL PREVIEW URL]:', previewUrl);

    return {
      sent: true,
      previewUrl,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('[emailService.sendCertificateEmail] Error sending email:', error);
    return {
      sent: false,
      previewUrl: '',
      messageId: '',
    };
  }
}
