import { Request, Response } from 'express';
import prisma from '../config/prisma';

/**
 * POST /api/settings/logo
 * Protected by authMiddleware. Accepts single image upload, saves path in Setting model.
 */
export const uploadLogo = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Nenhum arquivo de imagem enviado' });
      return;
    }

    const logoUrl = `/uploads/${req.file.filename}`;
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const fullUrl = `${protocol}://${host}${logoUrl}`;

    await prisma.setting.upsert({
      where: { key: 'active_logo' },
      update: { value: logoUrl },
      create: { key: 'active_logo', value: logoUrl },
    });

    res.status(200).json({
      success: true,
      logoUrl,
      fullUrl,
    });
  } catch (error: any) {
    console.error('[settingsController.uploadLogo] Error:', error);
    res.status(500).json({ error: 'Falha ao salvar o logotipo' });
  }
};

/**
 * GET /api/settings/logo
 * Public endpoint to retrieve active logo path/URL.
 */
export const getLogo = async (req: Request, res: Response): Promise<void> => {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'active_logo' },
    });

    if (!setting || !setting.value) {
      res.status(200).json({
        logoUrl: '',
        fullUrl: '',
      });
      return;
    }

    const logoUrl = setting.value;
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const fullUrl = logoUrl.startsWith('http') ? logoUrl : `${protocol}://${host}${logoUrl}`;

    res.status(200).json({
      logoUrl,
      fullUrl,
    });
  } catch (error: any) {
    console.error('[settingsController.getLogo] Error:', error);
    res.status(500).json({ error: 'Falha ao recuperar o logotipo' });
  }
};
