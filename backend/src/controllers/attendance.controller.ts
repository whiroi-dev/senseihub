import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { AttendanceService } from '../services/attendance.service';

const attendanceService = new AttendanceService();

export class AttendanceController {
  async batchCreate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.user!;
      const { date, studentIds, hoursCredited } = req.body;
      
      const promises = studentIds.map((id: string) => 
        attendanceService.create({
          studentId: id,
          date: new Date(date),
          hoursCredited: Number(hoursCredited) || 1,
          notes: 'Batch Attendance'
        }, userId)
      );

      await Promise.all(promises);
      res.status(201).json({ success: true, count: studentIds.length });
    } catch (err: any) {
      res.status(500).json({ error: 'Erro ao registrar frequência em lote.' });
    }
  }
}
