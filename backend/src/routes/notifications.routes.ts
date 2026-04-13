import { Router } from "express";
import { getNotifications } from "../controllers/notifications.controller.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const notificationsRoutes = Router();

notificationsRoutes.get("/", authMiddleware, asyncHandler(getNotifications));
