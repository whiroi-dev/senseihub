import { Request, Response } from 'express';
import prisma from '../config/prisma';

// Standard karate belt colors matching PROJECT.md
const BELT_COLORS: Record<string, string> = {
  'branca': '#F3F4F6',
  'amarela': '#FACC15',
  'vermelha': '#EF4444',
  'laranja': '#FB923C',
  'azul': '#3B82F6',
  'verde': '#22C55E',
  'roxa': '#A855F7',
  'marrom': '#78350F',
  'preta': '#111827',
};

function getBeltColor(rank: string): string {
  const lowerRank = rank.toLowerCase();
  for (const [key, color] of Object.entries(BELT_COLORS)) {
    if (lowerRank.includes(key)) {
      return color;
    }
  }
  return '#6B7280';
}

/**
 * GET /api/dashboard/stats
 * Protected by authMiddleware. Returns aggregated system statistics.
 */
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalCertificates = await prisma.certificate.count();
    const totalStudents = await prisma.student.count();

    const studentRanks = await prisma.student.groupBy({
      by: ['rank'],
      _count: {
        rank: true,
      },
      orderBy: {
        _count: {
          rank: 'desc',
        },
      },
    });

    const rankDistribution = studentRanks.map((item) => ({
      rank: item.rank,
      count: item._count.rank,
      color: getBeltColor(item.rank),
    }));

    const recentCertificatesList = await prisma.certificate.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        student: true,
      },
    });

    const recentCertificates = recentCertificatesList.map((cert) => ({
      id: cert.id,
      studentName: cert.student.name,
      rank: cert.student.rank,
      associationName: cert.associationName,
      issueDate: cert.issueDate.toISOString(),
      createdAt: cert.createdAt.toISOString(),
    }));

    res.json({
      totalCertificates,
      totalStudents,
      rankDistribution,
      recentCertificates,
    });
  } catch (error: any) {
    console.error('[dashboardController.getDashboardStats] Error:', error);
    res.status(500).json({ error: 'Falha ao buscar estatísticas do dashboard' });
  }
};
