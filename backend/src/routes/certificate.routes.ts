import { Router } from 'express';
import { createCertificate, listCertificates } from '../controllers/certificate.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// Guard POST /api/certificates with authMiddleware
router.post('/', authMiddleware, createCertificate);
router.get('/', listCertificates);

export default router;
