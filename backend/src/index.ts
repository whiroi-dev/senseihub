import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import apiRoutes from './routes/api.routes';
import prisma from './config/prisma';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve pasta de uploads publicamente
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount Private API Routes
app.use('/api', apiRoutes);

// Página Pública de Validação de Certificados (Leve, Renderizada pelo Servidor)
app.get('/validar/:hash', async (req: Request, res: Response) => {
  try {
    const hash = req.params.hash;
    
    // Busca o certificado no banco de dados e junta os dados essenciais
    const cert = await prisma.certificate.findFirst({
      where: { validationHash: hash, deletedAt: null },
      include: {
        student: true,
        rank: { include: { dojo: true } }
      }
    });

    if (!cert) {
      res.status(404).send(`
        <html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Certificado Inválido</title>
        <style>body { font-family: sans-serif; text-align: center; padding: 40px; background: #ffebee; color: #b71c1c; }</style></head>
        <body>
          <h1>❌ Certificado Inválido ou Inexistente</h1>
          <p>Não encontramos nenhum registro para o código fornecido.</p>
        </body></html>
      `);
      return;
    }

    // HTML de Validação Aprovada
    res.send(`
      <html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Certificado Válido</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f0fdf4; color: #166534; text-align: center; }
        .card { background: white; border: 1px solid #bbf7d0; border-radius: 12px; padding: 30px; max-width: 500px; margin: 40px auto; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
        h1 { margin-top: 0; color: #15803d; }
        .badge { display: inline-block; background: #22c55e; color: white; padding: 8px 16px; border-radius: 99px; font-weight: bold; margin-bottom: 20px; }
        .info { text-align: left; margin-top: 20px; line-height: 1.6; color: #374151; }
        .info strong { color: #111827; }
        .footer { margin-top: 30px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px; }
      </style></head>
      <body>
        <div class="card">
          <div class="badge">✓ CERTIFICADO AUTÊNTICO</div>
          <h1>Validação Oficial</h1>
          <p>Este documento consta em nossos registros e é reconhecido oficialmente.</p>
          
          <div class="info">
            <p><strong>Praticante:</strong> ${cert.student.name}</p>
            <p><strong>Graduação Concedida:</strong> ${cert.rank.name}</p>
            <p><strong>Associação Responsável:</strong> ${cert.associationName}</p>
            <p><strong>Dojo de Origem:</strong> ${cert.rank.dojo.name}</p>
            <p><strong>Data da Emissão:</strong> ${cert.issueDate.toLocaleDateString('pt-BR')}</p>
          </div>
          
          <div class="footer">
            Código Único de Autenticidade:<br/>
            <strong>${cert.validationHash}</strong>
          </div>
        </div>
      </body></html>
    `);

  } catch (err) {
    res.status(500).send('Erro interno do servidor ao validar.');
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
  });
}

export default app;
