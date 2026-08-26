import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { StudentService } from '../services/student.service';

const studentService = new StudentService();

export class StudentController {
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { dojoId, userId } = req.user!;
      const { name, currentRankId, hasFinancialDebts, birthDate, phone, emergencyContact, medicalNotes } = req.body;

      const newStudent = await studentService.create({
        dojoId,
        name,
        currentRankId: currentRankId || null,
        userId: null,
        hasFinancialDebts: hasFinancialDebts || false,
        birthDate: birthDate ? new Date(birthDate) : null,
        phone: phone || null,
        emergencyContact: emergencyContact || null,
        medicalNotes: medicalNotes || null,
      }, userId);

      res.status(201).json(newStudent);
    } catch (error) {
      console.error('[StudentController.create] Error:', error);
      res.status(500).json({ error: 'Erro ao criar aluno' });
    }
  }

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { dojoId, userId } = req.user!;
      const studentId = req.params.id;
      const { name, currentRankId, hasFinancialDebts, birthDate, phone, emergencyContact, medicalNotes } = req.body;

      const existing = await studentService.findById(studentId, dojoId);
      if (!existing) {
        res.status(404).json({ error: 'Aluno não encontrado neste dojo' });
        return;
      }

      const updated = await studentService.update(studentId, {
        name,
        currentRankId: currentRankId || null,
        hasFinancialDebts: hasFinancialDebts !== undefined ? hasFinancialDebts : existing.hasFinancialDebts,
        birthDate: birthDate ? new Date(birthDate) : existing.birthDate,
        phone: phone !== undefined ? phone : existing.phone,
        emergencyContact: emergencyContact !== undefined ? emergencyContact : existing.emergencyContact,
        medicalNotes: medicalNotes !== undefined ? medicalNotes : existing.medicalNotes,
      }, userId);

      res.json(updated);
    } catch (error) {
      console.error('[StudentController.update] Error:', error);
      res.status(500).json({ error: 'Erro ao atualizar aluno' });
    }
  }

  async softDelete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { dojoId, userId } = req.user!;
      const studentId = req.params.id;

      const existing = await studentService.findById(studentId, dojoId);
      if (!existing) {
        res.status(404).json({ error: 'Aluno não encontrado neste dojo' });
        return;
      }

      await studentService.softDelete(studentId, userId);
      res.json({ message: 'Aluno removido com sucesso' });
    } catch (error) {
      console.error('[StudentController.softDelete] Error:', error);
      res.status(500).json({ error: 'Erro ao excluir aluno' });
    }
  }

  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { dojoId } = req.user!;
      const students = await studentService.listByDojo(dojoId);
      res.json(students);
    } catch (error) {
      console.error('[StudentController.list] Error:', error);
      res.status(500).json({ error: 'Erro ao listar alunos' });
    }
  }

  async get(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { dojoId } = req.user!;
      const studentId = req.params.id;

      const student = await studentService.findById(studentId, dojoId);
      if (!student) {
        res.status(404).json({ error: 'Aluno não encontrado' });
        return;
      }

      res.json(student);
    } catch (error) {
      console.error('[StudentController.get] Error:', error);
      res.status(500).json({ error: 'Erro ao buscar aluno' });
    }
  }
}
