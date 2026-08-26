import { Router } from 'express';
import { uploadLogo, getLogo } from '../controllers/settings.controller';
import { authMiddleware } from '../middlewares/auth';
import { upload } from '../config/multer';

const router = Router();

router.post('/logo', authMiddleware, upload.single('file'), uploadLogo);
router.get('/logo', getLogo);

export default router;
