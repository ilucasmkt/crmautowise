import express, { type Express, type NextFunction, type Request, type Response } from 'express';

export function createApp(): Express {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({ ok: true });
  });

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Não encontrado' });
  });

  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', err);
    if (res.headersSent) {
      next(err);
      return;
    }
    res.status(500).json({ error: 'Erro interno' });
  });

  return app;
}
