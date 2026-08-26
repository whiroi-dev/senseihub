import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { generateCertificatePdfBuffer } from '../services/pdf.service';

/**
 * POST /api/certificates
 * Protected by authMiddleware. Creates a certificate record for a student
 * and generates a PDF attachment.
 */
export const createCertificate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId, studentName, rank, associationName, shihanName, presidentName, issueDate } = req.body;

    let targetStudentId = studentId ? Number(studentId) : null;

    // Auto-create student if studentName and rank provided and studentId not specified
    if (!targetStudentId && studentName && rank) {
      const newStudent = await prisma.student.create({
        data: { name: studentName, rank }
      });
      targetStudentId = newStudent.id;
    }

    if (!targetStudentId) {
      res.status(400).json({ error: 'studentId ou dados do aluno (studentName, rank) são obrigatórios' });
      return;
    }

    if (!associationName || !shihanName || !presidentName || !issueDate) {
      res.status(400).json({ error: 'associationName, shihanName, presidentName e issueDate são obrigatórios' });
      return;
    }

    const certificate = await prisma.certificate.create({
      data: {
        studentId: targetStudentId,
        associationName,
        shihanName,
        presidentName,
        issueDate: new Date(issueDate)
      },
      include: {
        student: true
      }
    });

    res.status(201).json({
      success: true,
      certificate: {
        id: certificate.id,
        studentId: certificate.studentId,
        associationName: certificate.associationName,
        shihanName: certificate.shihanName,
        presidentName: certificate.presidentName,
        issueDate: certificate.issueDate
      }
    });
  } catch (error: any) {
    console.error('[certificateController.createCertificate] Error:', error);
    res.status(500).json({ error: 'Failed to create certificate record' });
  }
};

/**
 * GET /api/certificates
 * Lists existing certificates.
 */
export const listCertificates = async (req: Request, res: Response): Promise<void> => {
  try {
    const certificates = await prisma.certificate.findMany({
      include: { student: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(certificates);
  } catch (error: any) {
    console.error('[certificateController.listCertificates] Error:', error);
    res.status(500).json({ error: 'Failed to fetch certificates' });
  }
};

