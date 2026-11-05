import express from "express";
import { protect as protectRoute } from "../../middleware/protect.js";
import { createComment, getComments, deleteComment } from "./comment.controller.js";

const router = express.Router();

// public routes
router.get("/post/:postId", getComments);

// protected routes
router.post("/post/:postId", protectRoute, createComment);
router.delete("/:commentId", protectRoute, deleteComment);

export default router;
