import prisma from '../config/prisma';
import { Student } from '@prisma/client';

export class StudentService {
  async create(
    data: Omit<Student, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'createdById' | 'updatedById' | 'joinedAt'>,
    createdById: string
  ): Promise<Student> {
    return prisma.student.create({
      data: {
        ...data,
        createdById,
      },
    });
  }

  async update(
    id: string,
    data: Partial<Omit<Student, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'createdById' | 'updatedById' | 'dojoId'>>,
    updatedById: string
  ): Promise<Student> {
    return prisma.student.update({
      where: { id },
      data: {
        ...data,
        updatedById,
      },
    });
  }

  async softDelete(id: string, deletedById: string): Promise<Student> {
    return prisma.student.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedById: deletedById,
      },
    });
  }

  async findById(id: string, dojoId: string): Promise<Student | null> {
    return prisma.student.findFirst({
      where: { id, dojoId, deletedAt: null },
      include: {
        currentRank: true,
        attendances: {
          where: { deletedAt: null },
          orderBy: { date: 'desc' }
        },
        certificates: {
          where: { deletedAt: null },
          orderBy: { issueDate: 'desc' },
          include: { rank: true }
        }
      }
    });
  }

  async listByDojo(dojoId: string): Promise<Student[]> {
    return prisma.student.findMany({
      where: { dojoId, deletedAt: null },
      include: { currentRank: true },
      orderBy: { name: 'asc' },
    });
  }
}
