import type {NextFunction, Request, Response} from 'express';

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  const message = error instanceof Error ? error.message : 'Unexpected server error';
  const status =
    /not found|not registered/i.test(message) ? 404 :
    /required|invalid|expired|already|blocked|not active|not open|failed/i.test(message) ? 400 :
    500;
  console.error('[API Error]', error);
  res.status(status).json({success: false, message});
}
