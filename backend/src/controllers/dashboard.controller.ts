import type {Request, Response} from 'express';
import {getDashboardSummary} from '../services/dashboard.service.js';

export async function getDashboard(req: Request, res: Response) {
  res.json({success: true, data: await getDashboardSummary()});
}
