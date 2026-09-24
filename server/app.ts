import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import fipeHandler from './routes/fipe.js';
import { asyncHandler } from './asyncHandler.js';

export function createApp(): Express {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({ ok: true });
  });

  app.get('/api/fipe/*', (req: Request, _res: Response, next: NextFunction) => {
    req.query.path = req.params[0];
    next();
  }, asyncHandler(fipeHandler));

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
