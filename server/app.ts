import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import fipeHandler from './routes/fipe.js';
import teamInviteHandler from './routes/teamInvite.js';
import whatsappConnectHandler from './routes/whatsapp/connect.js';
import whatsappDisconnectHandler from './routes/whatsapp/disconnect.js';
import whatsappStatusHandler from './routes/whatsapp/status.js';
import whatsappChatsHandler from './routes/whatsapp/chats.js';
import whatsappMessagesHandler from './routes/whatsapp/messages.js';
import whatsappSendHandler from './routes/whatsapp/send.js';
import whatsappSendMediaHandler from './routes/whatsapp/sendMedia.js';
import whatsappMediaHandler from './routes/whatsapp/media.js';
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

  app.post('/api/team/invite', asyncHandler(teamInviteHandler));

  app.post('/api/whatsapp/connect', asyncHandler(whatsappConnectHandler));
  app.post('/api/whatsapp/disconnect', asyncHandler(whatsappDisconnectHandler));
  app.get('/api/whatsapp/status', asyncHandler(whatsappStatusHandler));
  app.get('/api/whatsapp/chats', asyncHandler(whatsappChatsHandler));
  app.get('/api/whatsapp/messages', asyncHandler(whatsappMessagesHandler));
  app.post('/api/whatsapp/send', asyncHandler(whatsappSendHandler));
  app.post('/api/whatsapp/sendMedia', asyncHandler(whatsappSendMediaHandler));
  app.get('/api/whatsapp/media', asyncHandler(whatsappMediaHandler));

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
