import type { Request, Response } from "express";
import { listNotificationsForUser } from "../services/notification.service.js";

export async function getNotifications(req: Request, res: Response) {
  try {
    const notifications = await listNotificationsForUser(req.user);
    res.json({ success: true, data: notifications ?? [] });
  } catch {
    // في حالة عدم وجود قاعدة بيانات أو خطأ غير متوقع، نرجع قائمة فارغة
    res.json({ success: true, data: [] });
  }
}
