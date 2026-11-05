import mongoose from "mongoose";

// ============================================================
// MAIN POST SCHEMA
// ============================================================

const PostSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuthUserV3",
      required: true,
    },
    // author: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "AuthUserV3",
    //   required: true,
    // },
    content: {
      type: String,
      maxLength: 1000,
    },
    image: {
      type: String,
      default: "",
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AuthUserV3",
      },
    ],
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    // Soft delete fields
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuthUserV3",
      default: null,
    },
    restoreToken: {
      type: String,
      default: null,
    },
    // Expiry tracking
    expiresAt: {
      type: Date,
      default: null,
    },
    isPermanentlyDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);
const postSchema = PostSchema
// Index for queries
postSchema.index({ isDeleted: 1 });
postSchema.index({ expiresAt: 1 });
postSchema.index({ author: 1, createdAt: -1 });

// Middleware to automatically set expiresAt when soft deleted
// postSchema.pre('save', function(next) {
//   if (this.isDeleted && !this.expiresAt) {
//     // Set expiration to 6 months from now
//     const expiryDate = new Date();
//     expiryDate.setMonth(expiryDate.getMonth() + 6);
//     this.expiresAt = expiryDate;
//   }
//   next();
// });

// Static method to find active posts (not deleted)
postSchema.statics.findActive = function() {
  return this.find({ isDeleted: false });
};

// Static method to find deleted posts
postSchema.statics.findDeleted = function() {
  return this.find({ 
    isDeleted: true, 
    isPermanentlyDeleted: false,
    expiresAt: { $gt: new Date() }
  });
};


// ============================================================
// MODEL
// ============================================================

export const Post = mongoose.model("PostV1", PostSchema);

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default Post;
