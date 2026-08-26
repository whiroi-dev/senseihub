import prisma from '../config/prisma';
import { Rank } from '@prisma/client';

export class RankService {
  async create(
    data: Omit<Rank, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'createdById' | 'updatedById'>,
    createdById: string
  ): Promise<Rank> {
    return prisma.rank.create({
      data: {
        ...data,
        createdById,
      },
    });
  }

  async update(
    id: string,
    data: Partial<Omit<Rank, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'createdById' | 'updatedById' | 'dojoId'>>,
    updatedById: string
  ): Promise<Rank> {
    return prisma.rank.update({
      where: { id },
      data: {
        ...data,
        updatedById,
      },
    });
  }

  async softDelete(id: string, deletedById: string): Promise<Rank> {
    return prisma.rank.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedById: deletedById,
      },
    });
  }

  async findById(id: string, dojoId: string): Promise<Rank | null> {
    return prisma.rank.findFirst({
      where: { id, dojoId, deletedAt: null },
    });
  }

  async listByDojo(dojoId: string): Promise<Rank[]> {
    return prisma.rank.findMany({
      where: { dojoId, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
