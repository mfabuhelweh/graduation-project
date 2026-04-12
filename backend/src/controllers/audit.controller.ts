import type {Request, Response} from 'express';
import {listAuditLogs} from '../services/audit.service.js';

export async function getAuditLogs(_req: Request, res: Response) {
  const logs = await listAuditLogs();
  res.json({success: true, data: logs});
}
