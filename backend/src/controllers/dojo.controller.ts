import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../config/prisma';
import fs from 'fs';
import path from 'path';

export class DojoController {
  async getConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { dojoId } = req.user!;
      const dojo = await prisma.dojo.findUnique({
        where: { id: dojoId },
        select: {
          id: true,
          name: true,
          president: true,
          defaultShihan: true,
          defaultSensei: true,
          defaultAssociation: true,
          logoPrimaryUrl: true,
          logoSecondaryUrl: true,
          city: true,
          showShihanText: true,
          showKanjiText: true,
            diplomaBackground: true,
            diplomaBackgroundImageUrl: true,
        },
      });

      if (!dojo) {
        res.status(404).json({ error: 'Dojo não encontrado' });
        return;
      }

      res.json(dojo);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
  }

  async updateConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { dojoId, userId } = req.user!;
      const { name, president, defaultShihan, defaultSensei, defaultAssociation, city, showShihanText, showKanjiText, diplomaBackground, diplomaBackgroundImageUrl } = req.body;

      const updated = await prisma.dojo.update({
        where: { id: dojoId },
        data: {
          name,
          president,
          defaultShihan,
          defaultSensei,
          defaultAssociation,
          city,
          showShihanText: showShihanText ?? undefined,
          showKanjiText: showKanjiText ?? undefined,
          diplomaBackground: diplomaBackground ?? undefined,
            diplomaBackgroundImageUrl: diplomaBackgroundImageUrl !== undefined ? diplomaBackgroundImageUrl : undefined,
          updatedById: userId,
        },
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar configurações' });
    }
  }

  async uploadLogo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { dojoId, userId } = req.user!;
      const { type } = req.body; // 'primary' ou 'secondary'

      if (!req.file) {
        res.status(400).json({ error: 'Nenhum arquivo enviado' });
        return;
      }

      const validTypes = ['primary', 'secondary', 'background'];
      if (!validTypes.includes(type)) {
        res.status(400).json({ error: 'Tipo de logo inválido. Use primary, secondary ou background.' });
        return;
      }

      const publicUrl = `/uploads/${req.file.filename}`;
      
      const updateData = type === 'primary' 
          ? { logoPrimaryUrl: publicUrl, updatedById: userId }
          : type === 'secondary'
          ? { logoSecondaryUrl: publicUrl, updatedById: userId }
          : { diplomaBackgroundImageUrl: publicUrl, updatedById: userId };

      const updated = await prisma.dojo.update({
        where: { id: dojoId },
        data: updateData,
      });

      res.json({ message: 'Logo atualizada com sucesso', url: publicUrl, dojo: updated });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao processar upload de logo' });
    }
  }

  async removeLogo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { dojoId, userId } = req.user!;
      const { type } = req.body; // 'primary' ou 'secondary'

      if (!['primary', 'secondary'].includes(type)) {
        res.status(400).json({ error: 'Tipo inválido. Use primary ou secondary.' });
        return;
      }

      // Buscar URL atual para deletar arquivo local se existir
      const dojo = await prisma.dojo.findUnique({ where: { id: dojoId } });
      const currentUrl = type === 'primary' ? dojo?.logoPrimaryUrl : dojo?.logoSecondaryUrl;
      
      if (currentUrl && currentUrl.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '../../uploads', path.basename(currentUrl));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      const updateData = type === 'primary'
        ? { logoPrimaryUrl: null, updatedById: userId }
        : { logoSecondaryUrl: null, updatedById: userId };

      await prisma.dojo.update({ where: { id: dojoId }, data: updateData });
      res.json({ message: `Logo ${type} removida com sucesso` });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao remover logo' });
    }
  }

  async setLogoUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { dojoId, userId } = req.user!;
      const { type, url } = req.body;

      if (!['primary', 'secondary'].includes(type)) {
        res.status(400).json({ error: 'Tipo inválido. Use primary ou secondary.' });
        return;
      }

      if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'URL é obrigatória.' });
        return;
      }

      const updateData = type === 'primary'
        ? { logoPrimaryUrl: url, updatedById: userId }
        : { logoSecondaryUrl: url, updatedById: userId };

      const updated = await prisma.dojo.update({ where: { id: dojoId }, data: updateData });
      res.json({ message: 'Logo via URL salva com sucesso', url, dojo: updated });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao salvar URL da logo' });
    }
  }
}
