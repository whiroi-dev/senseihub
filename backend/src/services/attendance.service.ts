import prisma from '../config/prisma';
import { Attendance } from '@prisma/client';

export class AttendanceService {
  async create(
    data: Omit<Attendance, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'createdById' | 'updatedById'>,
    createdById: string
  ): Promise<Attendance> {
    return prisma.attendance.create({
      data: {
        ...data,
        createdById,
      },
    });
  }

  async update(
    id: string,
    data: Partial<Omit<Attendance, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'createdById' | 'updatedById' | 'studentId'>>,
    updatedById: string
  ): Promise<Attendance> {
    return prisma.attendance.update({
      where: { id },
      data: {
        ...data,
        updatedById,
      },
    });
  }

  async softDelete(id: string, deletedById: string): Promise<Attendance> {
    return prisma.attendance.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedById: deletedById,
      },
    });
  }

  async listByStudent(studentId: string): Promise<Attendance[]> {
    return prisma.attendance.findMany({
      where: { studentId, deletedAt: null },
      orderBy: { date: 'desc' },
    });
  }
}
