import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { CertificateService } from '../services/certificate.service';

const certService = new CertificateService();

export class CertificateController {
  async batch(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { dojoId, userId } = req.user!;
      const { studentIds, rankId, associationName, shihanName, presidentName, issueDate } = req.body;
      
      const zipBuffer = await certService.generateBatchZip({
        studentIds,
        rankId,
        dojoId,
        associationName,
        shihanName,
        presidentName,
        issueDate: new Date(issueDate)
      }, userId);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename=certificados_lote.zip');
      res.send(zipBuffer);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }

  async historic(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { dojoId, userId } = req.user!;
      const { studentId } = req.params;
      const { rankId, issueDate } = req.body;

      const cert = await certService.registerHistoric(
        studentId,
        rankId,
        dojoId,
        new Date(issueDate),
        userId
      );

      res.status(201).json(cert);
    } catch (err: any) {
      console.error(err);
      res.status(400).json({ error: err.message });
    }
  }

  async downloadPdf(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { dojoId } = req.user!;
      const { id } = req.params; // certificateId

      const pdfBuffer = await certService.generateSinglePdf(id, dojoId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=certificado_${id}.pdf`);
      res.send(pdfBuffer);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
}
