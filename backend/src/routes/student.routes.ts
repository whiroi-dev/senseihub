import { Router } from 'express';
import { listStudents, createStudent } from '../controllers/student.controller';

const router = Router();

router.get('/', listStudents);
router.post('/', createStudent);

export default router;
