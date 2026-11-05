// controllers/follow.controller.js
import { AuthUser as User } from "../../models/AuthUser.js";
import Notification from "../../models/notification.model.js";

export const followUser = async (req, res) => {
  try {
    const { userId } = req.body;
    const followerId = req.user.id; // From auth middleware

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (followerId === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow yourself",
      });
    }

    // Check if user to follow exists
    const userToFollow = await User.findById(userId);
    if (!userToFollow) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if already following
    const currentUser = await User.findById(followerId);
    if (currentUser.following.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: "Already following this user",
      });
    }

    // Add to following and followers
    await User.findByIdAndUpdate(followerId, {
      $addToSet: { following: userId },
    });
    await User.findByIdAndUpdate(userId, {
      $addToSet: { followers: followerId },
    });

    // Create notification
    const notification = new Notification({
      from: followerId,
      to: userId,
      type: "follow",
      post: null,
      comment: null,
    });
    await notification.save();

    // Populate notification
    const populatedNotification = await Notification.findById(notification._id)
      .populate("from", "username avatar")
      .populate("to", "username avatar");

    // Emit real-time notification via socket.io
    const io = req.app.get("io");
    if (io) {
      io.to(userId).emit("new-notification", {
        ...populatedNotification.toObject(),
        message: `${currentUser.username} started following you`,
      });
    }

    res.status(200).json({
      success: true,
      message: "User followed successfully",
      data: {
        followerId,
        followingId: userId,
        notification: populatedNotification,
      },
    });
  } catch (error) {
    console.error("Follow error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to follow user",
      error: error.message,
    });
  }
};

export const unfollowUser = async (req, res) => {
  try {
    const { userId } = req.body;
    const followerId = req.user.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (followerId === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot unfollow yourself",
      });
    }

    // Check if user exists
    const userToUnfollow = await User.findById(userId);
    if (!userToUnfollow) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Remove from following and followers
    const currentUser = await User.findByIdAndUpdate(followerId, {
      $pull: { following: userId },
    });

    await User.findByIdAndUpdate(userId, {
      $pull: { followers: followerId },
    });

    // Delete follow notification (optional)
    await Notification.findOneAndDelete({
      from: followerId,
      to: userId,
      type: "follow",
    });

    res.status(200).json({
      success: true,
      message: "User unfollowed successfully",
      data: {
        followerId,
        unfollowedId: userId,
      },
    });
  } catch (error) {
    console.error("Unfollow error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unfollow user",
      error: error.message,
    });
  }
};

export const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId).populate({
      path: "followers",
      select: "username avatar bio isPrivate",
      options: {
        skip,
        limit,
        sort: { createdAt: -1 },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const totalFollowers = user.followers.length;

    res.status(200).json({
      success: true,
      data: {
        followers: user.followers,
        pagination: {
          page,
          limit,
          total: totalFollowers,
          pages: Math.ceil(totalFollowers / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get followers error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get followers",
      error: error.message,
    });
  }
};

export const getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId).populate({
      path: "following",
      select: "username avatar bio isPrivate",
      options: {
        skip,
        limit,
        sort: { createdAt: -1 },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const totalFollowing = user.following.length;

    res.status(200).json({
      success: true,
      data: {
        following: user.following,
        pagination: {
          page,
          limit,
          total: totalFollowing,
          pages: Math.ceil(totalFollowing / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get following error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get following",
      error: error.message,
    });
  }
};

export const getFollowStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isFollowing = user.followers.includes(currentUserId);
    const isFollowedBy = user.following.includes(currentUserId);

    res.status(200).json({
      success: true,
      data: {
        isFollowing,
        isFollowedBy,
        followersCount: user.followers.length,
        followingCount: user.following.length,
      },
    });
  } catch (error) {
    console.error("Get follow status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get follow status",
      error: error.message,
    });
  }
};

// Get mutual followers/following (people you both follow)
export const getMutualFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Find mutual followers
    const mutualFollowers = targetUser.followers.filter(
      (follower) =>
        currentUser.following.includes(follower) &&
        follower.toString() !== currentUserId,
    );

    // Populate mutual followers
    const populatedMutualFollowers = await User.find({
      _id: { $in: mutualFollowers },
    }).select("username avatar bio");

    res.status(200).json({
      success: true,
      data: {
        mutualFollowers: populatedMutualFollowers,
        count: populatedMutualFollowers.length,
      },
    });
  } catch (error) {
    console.error("Get mutual followers error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get mutual followers",
      error: error.message,
    });
  }
};
