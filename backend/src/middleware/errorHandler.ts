import type {NextFunction, Request, Response} from 'express';

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  const message = error instanceof Error ? error.message : 'Unexpected server error';
  const explicitStatus =
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as {status?: unknown}).status === 'number'
      ? (error as {status: number}).status
      : null;
  const status =
    explicitStatus && explicitStatus >= 400 && explicitStatus < 600 ? explicitStatus :
    /hidden until|forbidden|only access|authentication is required|does not match/i.test(message) ? 403 :
    /not found|not registered/i.test(message) ? 404 :
    /required|invalid|expired|already|blocked|not active|not open|failed|not configured|json/i.test(message) ? 400 :
    500;
  console.error('[API Error]', error);
  res.status(status).json({success: false, message});
}
