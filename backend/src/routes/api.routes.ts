import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { StudentController } from '../controllers/student.controller';
import { RankController } from '../controllers/rank.controller';
import { EligibilityController } from '../controllers/eligibility.controller';
import { AttendanceController } from '../controllers/attendance.controller';
import { CertificateController } from '../controllers/certificate.controller';
import { DojoController } from '../controllers/dojo.controller';
import { authMiddleware, authorizeRole } from '../middlewares/auth';
import multer from 'multer';
import path from 'path';

const router = Router();

const authCtrl = new AuthController();
const studentCtrl = new StudentController();
const rankCtrl = new RankController();
const eligCtrl = new EligibilityController();
const attendCtrl = new AttendanceController();
const certCtrl = new CertificateController();
const dojoController = new DojoController();

// Configuração do Multer para Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${(req as any).user?.dojoId}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// DOJO (Configurações e Upload)
router.get('/dojo/config', authMiddleware, dojoController.getConfig.bind(dojoController));
router.put('/dojo/config', authMiddleware, dojoController.updateConfig.bind(dojoController));
router.post('/dojo/upload-logo', authMiddleware, upload.single('logo'), dojoController.uploadLogo.bind(dojoController));
router.delete('/dojo/remove-logo', authMiddleware, dojoController.removeLogo.bind(dojoController));
router.put('/dojo/logo-url', authMiddleware, dojoController.setLogoUrl.bind(dojoController));

// Rotas Públicas
router.post('/auth/login', authCtrl.login.bind(authCtrl));

// Middleware Global para Rotas Protegidas
router.use(authMiddleware);

// --- Rotas de Alunos ---
router.get('/students', studentCtrl.list.bind(studentCtrl));
router.get('/students/:id', studentCtrl.get.bind(studentCtrl));
router.post('/students', authorizeRole(['ADMIN', 'PROFESSOR']), studentCtrl.create.bind(studentCtrl));
router.put('/students/:id', authorizeRole(['ADMIN', 'PROFESSOR']), studentCtrl.update.bind(studentCtrl));
router.delete('/students/:id', authorizeRole(['ADMIN', 'PROFESSOR']), studentCtrl.softDelete.bind(studentCtrl));

// --- Rotas de Graduações ---
router.get('/ranks', rankCtrl.list.bind(rankCtrl));
router.post('/ranks', authorizeRole(['ADMIN']), rankCtrl.create.bind(rankCtrl));
router.put('/ranks/:id', authorizeRole(['ADMIN']), rankCtrl.update.bind(rankCtrl));
router.delete('/ranks/:id', authorizeRole(['ADMIN']), rankCtrl.softDelete.bind(rankCtrl));

// --- Regras de Negócio e Lote ---
router.get('/eligibility/:studentId', authorizeRole(['ADMIN', 'PROFESSOR']), eligCtrl.check.bind(eligCtrl));
router.post('/attendances/batch', authorizeRole(['ADMIN', 'PROFESSOR']), attendCtrl.batchCreate.bind(attendCtrl));

// CERTIFICADOS
router.post('/certificates/batch', authMiddleware, certCtrl.batch.bind(certCtrl));
router.get('/certificates/:id/download', authMiddleware, certCtrl.downloadPdf.bind(certCtrl));
router.post('/students/:studentId/certificates/historic', authMiddleware, certCtrl.historic.bind(certCtrl));

export default router;
