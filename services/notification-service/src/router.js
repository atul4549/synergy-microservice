import express from "express";
import { protect } from "../../middleware/protect.js";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "./notification.controller.js";

const router = express.Router();

router.use(protect);

router.get("/", getNotifications);
router.put("/:notificationId/read", markNotificationAsRead);
router.put("/read-all", markAllNotificationsAsRead);
router.delete("/:notificationId", deleteNotification);

export default router;
