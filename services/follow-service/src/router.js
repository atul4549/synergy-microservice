// routes/follow.routes.js
import express from "express";
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowStatus,
  getMutualFollowers,
} from "./follow.controller.js";
import { protect as authenticate } from "../../middleware/protect.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Follow/Unfollow
router.post("/follow", followUser);
router.post("/unfollow", unfollowUser);

// Get followers/following
router.get("/:userId/followers", getFollowers);
router.get("/:userId/following", getFollowing);

// Follow status
router.get("/:userId/status", getFollowStatus);

// Mutual followers
router.get("/:userId/mutual", getMutualFollowers);

export {
    router as followRoutes
};