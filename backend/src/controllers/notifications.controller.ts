import type { Request, Response } from "express";
import { listNotificationsForUser } from "../services/notification.service.js";

export async function getNotifications(req: Request, res: Response) {
  const notifications = await listNotificationsForUser(req.user);
  res.json({ success: true, data: notifications });
}
