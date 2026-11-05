// import express from 'express';
// import dotenv from 'dotenv';
// import cors from 'cors';
// import helmet from 'helmet';
// import cookieParser from 'cookie-parser';
// // import session from 'express-session';
// import passport from 'passport';
// import rateLimit from 'express-rate-limit';
// import { GoogleRoute } from './route.js';
// import {
//     //  setupGoogleStrategy, 
//     setupJwtStrategy } from './auth.js';


// dotenv.config();

// // Initialize app
// const app = express();

// // Security
// app.use(helmet(process.env.helmet));

// // CORS
// app.use(
//   cors({
//     origin: true, 
//     credentials: true,
//     optionsSuccessStatus: 200,
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
//   })
// );

// // Rate limiting
// // const limiter = rateLimit(process.env.rateLimit);
// // app.use('/api', limiter);

// // Rate limiting — global (covers /auth too) + stricter on auth endpoints
// app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
// app.use('/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false }));
// app.use('/api',  rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }))

// // Body parser
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// app.use(cookieParser());

// // // Session
// // const sessionConfig = config.session(process.env.SESSION_SECRET);
// // app.use(session(sessionConfig));

// // Passport
// app.use(passport.initialize());
// // app.use(passport.session());

// // // Logging
// // app.use(requestLogger);
// // if (process.env.NODE_ENV !== 'production') {
// //   app.use(bodyLogger);
// // }


// // ==================== AUTH STRATEGIES ====================
// setupJwtStrategy();
// // 48 hr to solve the error
// // setupGoogleStrategy(); // Uncomment when Google OAuth is fully configured



// // ==================== ROUTES ====================

// // Root route
// app.get('/', (req, res) => {
//   res.status(200).json(
//     ResponseFormatter.success({
//       service: 'Synergy Auth Service',
//       version: '1.0.0',
//       environment: process.env.NODE_ENV,
//       documentation: '/api/docs',
//       endpoints: {
//         health: '/health',
//         auth: '/api/auth',
//         googleAuth: '/auth/google',
//       },
//       timestamp: new Date().toISOString()
//     }, 'Welcome to the authentication service!')
//   );
// });


// // // API routes
// // app.use('/api', apiRoutes);
// // // app.use('/', apiRoutes);
// app.use("/auth", GoogleRoute);
// // app.get('/auth/google/callback',
// //   passport.authenticate('google', {
// //     failureRedirect: '/api/auth/google/failure',
// //     // failureMessage: true 
// //     successRedirect: '/api/auth/google/success',
// //   }),
// //   (req, res) => {
// //     res.redirect(process.env.CLIENT_URL);
// //   }
// // );

// app.get('/auth/google/callback',
//   passport.authenticate('google', { 
//     session: false, 
//     failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth` }),
//   (req, res) => {
//     const token = issueJwt(req.user);        // your JWT util
//     res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'lax' });
//     res.redirect(process.env.CLIENT_URL);
//   }
// );

// // // ==================== ERROR HANDLING ====================
// // app.use(notFoundHandler);
// // app.use(errorHandler);

// export default app;

import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import cors from 'cors';
import helmet from 'helmet';
// import cookieParser from 'cookie-parser';
// import passport from 'passport';
import rateLimit from 'express-rate-limit';

// import { GoogleRoute } from './route.js';
// import { setupJwtStrategy } from './config/auth.js';
import { requestLogger } from '../../api-gateway/src/logger.js';
import { errorHandler, notFoundHandler } from '../../../shared/middleware/errorHandler.js';
// import { setupJwtStrategy, setupGoogleStrategy } from './auth.js';
// import ResponseFormatter from './utils/ResponseFormatter.js';
// import { notFoundHandler, errorHandler, requestLogger } from './middleware/index.js';
// import env from './config/env.js'; // validated env (zod/joi)
import ResponseFormatter from '../../../shared/utils/responseFormatter.js';
// import './config/passport.js' 

const app = express();

// Behind a proxy (Render/Heroku/nginx) — needed for correct req.ip + secure cookies
// app.set('trust proxy', 1);
// app.disable('x-powered-by');

// Security headers
app.use(helmet());

// CORS — explicit allowlist, never `origin: true` with credentials
const allowedOrigins = [process.env.CLIENT_URL, process.env.ADMIN_URL].filter(Boolean);
app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate limiting — global (covers /auth too) + stricter on auth endpoints
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
// app.use('/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false }));
app.use('/api',  rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));

// Body parsers
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true, limit: '200kb' }));
// app.use(cookieParser());

// Logging
app.use(requestLogger);

// Passport — REQUIRED for any strategy to work
// app.use(passport.initialize());
// No passport.session() — we're issuing JWTs, not using Passport sessions.

// Strategies
// setupJwtStrategy();
// setupGoogleStrategy();

// ==================== ROUTES ====================
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.get('/', (req, res) => {
  res.status(200).json(
    ResponseFormatter.success({
      service: 'Synergy Auth Service',
      version: '1.0.0',
      environment: process.env.NODE_ENV,
      documentation: '/api/docs',
      endpoints: {
        health: '/health',
        auth: '/auth',
        googleAuth: '/auth/google',
      },
      timestamp: new Date().toISOString(),
    }, 'Welcome to the authentication service!')
  );
});

// All Google auth (including /google/callback) lives in GoogleRoute — single source of truth
// app.use('/auth', GoogleRoute);
// app.use('/', GoogleRoute);
// app.use('/auth/google', GoogleRoute);

// (Optional) other API routes
app.use('/api', apiRoutes);

// ==================== ERROR HANDLING ====================
app.use(notFoundHandler);
app.use(errorHandler);

export default app;