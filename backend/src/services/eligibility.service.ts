import prisma from '../config/prisma';

export interface EligibilityResult {
  isEligible: boolean;
  reason?: string;
  hoursDeficit?: number;
  eligibleFromDate?: Date;
}

export class EligibilityService {
  /**
   * Avalia a elegibilidade de um aluno para realizar exame de faixa
   * com base nas regras financeiras, carência de tempo e carga horária.
   */
  async checkEligibility(studentId: string, dojoId: string): Promise<EligibilityResult> {
    const student = await prisma.student.findFirst({
      where: { id: studentId, dojoId, deletedAt: null },
      include: {
        currentRank: true,
        certificates: {
          where: { deletedAt: null },
          orderBy: { issueDate: 'desc' },
          take: 1
        },
      }
    });

    if (!student) {
      throw new Error('Aluno não encontrado');
    }

    // Regra 1: Bloqueio Financeiro
    if (student.hasFinancialDebts) {
      return {
        isEligible: false,
        reason: 'Bloqueio Financeiro: O aluno possui pendências financeiras em aberto.'
      };
    }

    if (!student.currentRank) {
      return {
        isEligible: false,
        reason: 'Aluno não possui graduação definida no sistema.'
      };
    }

    const { minHours, minDays } = student.currentRank;
    
    // Identifica o marco zero: Data do último certificado ou data de ingresso
    const lastPromotionDate = student.certificates.length > 0 
      ? student.certificates[0].issueDate 
      : student.joinedAt;

    // Regra 2: Cálculo de Frequência (Horas de Tatame)
    const attendances = await prisma.attendance.findMany({
      where: {
        studentId,
        deletedAt: null,
        date: {
          gte: lastPromotionDate
        }
      }
    });

    const totalHours = attendances.reduce((acc, record) => acc + record.hoursCredited, 0);

    if (totalHours < minHours) {
      return {
        isEligible: false,
        reason: 'Carga horária acadêmica insuficiente na graduação atual.',
        hoursDeficit: minHours - totalHours
      };
    }

    // Regra 3: Período de Carência (Dias)
    const today = new Date();
    // Usa UTC para evitar problemas de fuso horário nos cálculos de diferença de dias
    const msElapsed = today.getTime() - lastPromotionDate.getTime();
    const daysElapsed = Math.floor(msElapsed / (1000 * 60 * 60 * 24));

    if (daysElapsed < minDays) {
      const eligibleDate = new Date(lastPromotionDate);
      eligibleDate.setDate(eligibleDate.getDate() + minDays);

      return {
        isEligible: false,
        reason: 'Período de carência cronológica (dias mínimos) não atingido.',
        eligibleFromDate: eligibleDate
      };
    }

    // Aprovado no Motor de Regras
    return {
      isEligible: true
    };
  }
}
