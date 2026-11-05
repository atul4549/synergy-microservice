import jwt from 'jsonwebtoken'
// ==================== MONGODB SCHEMAS ====================

import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AuthUserV3',
    required: true
  },
  token: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['refresh', 'access'],
    default: 'refresh'
  },
  expiresAt: {
    type: Date,
    required: true
  },
  isRevoked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for token cleanup
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// 3. Session Schema (for tracking user sessions)
const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AuthUserV3',
    required: true
  },
  sessionId: {
    type: String,
    required: true
  },
  ipAddress: String,
  userAgent: String,
  deviceInfo: String,
  isValid: {
    type: Boolean,
    default: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 4. Audit Log Schema
const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AuthUserV3'
  },
  action: {
    type: String,
    required: true,
    enum: [
      'REGISTER', 'LOGIN', 'LOGOUT', 'PASSWORD_CHANGE',
      'EMAIL_VERIFY', 'PROFILE_UPDATE', 'TOKEN_REFRESH',
      'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_COMPLETE',
      'ACCOUNT_LOCK', 'ACCOUNT_UNLOCK', 'GOOGLE_LOGIN'
    ]
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: String,
  userAgent: String,
  status: {
    type: String,
    enum: ['success', 'failure'],
    default: 'success'
  }
}, {
  timestamps: true
});

// ==================== MODELS ====================
// export const User = mongoose.model('User', userSchema);
export const Token = mongoose.model('Token', tokenSchema);
export const Session = mongoose.model('Session', sessionSchema);
export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
