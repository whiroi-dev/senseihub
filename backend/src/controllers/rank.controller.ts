import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { RankService } from '../services/rank.service';

const rankService = new RankService();

export class RankController {
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { dojoId, userId } = req.user!;
      const { name, color, phrase, minHours, minDays, sortOrder } = req.body;

      const newRank = await rankService.create({
        dojoId,
        name,
        color,
        phrase: phrase || null,
        minHours: Number(minHours) || 0,
        minDays: Number(minDays) || 0,
        sortOrder: Number(sortOrder) || 0,
      }, userId);

      res.status(201).json(newRank);
    } catch (error) {
      console.error('[RankController.create] Error:', error);
      res.status(500).json({ error: 'Erro ao criar graduação' });
    }
  }

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { dojoId, userId } = req.user!;
      const rankId = req.params.id;
      const { name, color, phrase, minHours, minDays, sortOrder } = req.body;

      const existing = await rankService.findById(rankId, dojoId);
      if (!existing) {
        res.status(404).json({ error: 'Graduação não encontrada neste dojo' });
        return;
      }

      const updated = await rankService.update(rankId, {
        name,
        color,
        phrase: phrase || null,
        minHours: minHours !== undefined ? Number(minHours) : existing.minHours,
        minDays: minDays !== undefined ? Number(minDays) : existing.minDays,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : existing.sortOrder,
      }, userId);

      res.json(updated);
    } catch (error) {
      console.error('[RankController.update] Error:', error);
      res.status(500).json({ error: 'Erro ao atualizar graduação' });
    }
  }

  async softDelete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { dojoId, userId } = req.user!;
      const rankId = req.params.id;

      const existing = await rankService.findById(rankId, dojoId);
      if (!existing) {
        res.status(404).json({ error: 'Graduação não encontrada neste dojo' });
        return;
      }

      await rankService.softDelete(rankId, userId);
      res.json({ message: 'Graduação removida com sucesso' });
    } catch (error) {
      console.error('[RankController.softDelete] Error:', error);
      res.status(500).json({ error: 'Erro ao excluir graduação' });
    }
  }

  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { dojoId } = req.user!;
      const ranks = await rankService.listByDojo(dojoId);
      res.json(ranks);
    } catch (error) {
      console.error('[RankController.list] Error:', error);
      res.status(500).json({ error: 'Erro ao listar graduações' });
    }
  }

  async get(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { dojoId } = req.user!;
      const rankId = req.params.id;

      const rank = await rankService.findById(rankId, dojoId);
      if (!rank) {
        res.status(404).json({ error: 'Graduação não encontrada' });
        return;
      }

      res.json(rank);
    } catch (error) {
      console.error('[RankController.get] Error:', error);
      res.status(500).json({ error: 'Erro ao buscar graduação' });
    }
  }
}
