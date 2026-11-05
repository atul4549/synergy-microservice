// import asyncHandler from "express-async-handler";
// // import { getAuth } from "@clerk/express";
import Notification from "../../models/notification.model.js";
// import {AuthUser as User} from "../../models/AuthUser.js";

// export const getNotifications = asyncHandler(async (req, res) => {
//   const { userId } = getAuth(req);

//   const user = await User.findOne({ clerkId: userId });
//   if (!user) return res.status(404).json({ error: "User not found" });

//   const notifications = await Notification.find({ to: user._id })
//     .sort({ createdAt: -1 })
//     .populate("from", "username firstName lastName profilePicture")
//     .populate("post", "content image")
//     .populate("comment", "content");

//   res.status(200).json({ notifications });
// });

// export const deleteNotification = asyncHandler(async (req, res) => {
//   const { userId } = getAuth(req);
//   const { notificationId } = req.params;

//   const user = await User.findOne({ clerkId: userId });
//   if (!user) return res.status(404).json({ error: "User not found" });

//   const notification = await Notification.findOneAndDelete({
//     _id: notificationId,
//     to: user._id,
//   });

//   if (!notification) return res.status(404).json({ error: "Notification not found" });

//   res.status(200).json({ message: "Notification deleted successfully" });
// });

// controllers/notification.controller.js
// import Notification from "../models/Notification.js";

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ to: userId })
      .populate("from", "username avatar")
      .populate("post", "content image")
      .populate("comment", "content")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalNotifications = await Notification.countDocuments({ to: userId });

    // Mark notifications as read (optional)
    // You can add a read field to the schema

    res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total: totalNotifications,
          pages: Math.ceil(totalNotifications / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get notifications",
      error: error.message,
    });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, to: userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
      error: error.message,
    });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.updateMany(
      { to: userId, read: false },
      { read: true }
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notifications as read",
      error: error.message,
    });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      to: userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete notification",
      error: error.message,
    });
  }
};