import express from 'express';
// 1. Import passport config FIRST (this executes passport.use)
// import './config/passport.js';

import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import rateLimit from 'express-rate-limit';

import config from './config/index.js';
import logger from './utils/logger.js';
import ResponseFormatter from './utils/responseFormatter.js';
import database from './config/mongodb.js';

import { requestLogger, bodyLogger } from './middleware/logging.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { setupJwtStrategy, setupGoogleStrategy } from './middleware/auth.js';

import apiRoutes from './routes/api.js';

import path from "path";
import { fileURLToPath } from "url";
import { ipTracker } from './ip.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize app
const app = express();

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static('uploads'));
// // Your routes
// app.post('/upload', upload.single('file'), (req, res) => {
//   // Your upload handling
// });

// ==================== MIDDLEWARES ====================

// Security
app.use(helmet(config.helmet));

// Compression
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// CORS
// const corsOptions = config.cors[process.env.NODE_ENV === 'production' ? 'production' : 'development'];
// app.use(cors(corsOptions));

// CORS
app.use(
  cors({
    // origin: process.env.NODE_ENV === 'production' 
    //   ? ['https://synergyui.onrender.com/', 'https://app.yourdomain.com']
    //   : ['http://localhost:5173', 'http://localhost:5174'],
    // origin: 'https://synergyui.onrender.com/', 
    // https://synergyui.onrender.com/
    origin: true, 
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);


// Rate limiting
const limiter = rateLimit(config.rateLimit);
app.use('/api', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Session
const sessionConfig = config.session(process.env.SESSION_SECRET);
app.use(session(sessionConfig));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Logging
app.use(requestLogger);
if (process.env.NODE_ENV !== 'production') {
  app.use(bodyLogger);
}

app.use(ipTracker);


// ==================== AUTH STRATEGIES ====================
setupJwtStrategy();
// 48 hr to solve the error
setupGoogleStrategy(); // Uncomment when Google OAuth is fully configured

// ==================== ROUTES ====================

// Root route
app.get('/', (req, res) => {
  res.status(200).json(
    ResponseFormatter.success({
      service: 'Multi Saas Organization API',
      version: '1.0.0',
      environment: process.env.NODE_ENV,
      documentation: '/api/docs',
      endpoints: {
        health: '/health',
        auth: '/api/auth',
        googleAuth: '/auth/google',
        ingest: '/api/hit',
        analytics: '/api/analytics',
        websocket: '/socket.io'
      },
      timestamp: new Date().toISOString()
    }, 'Welcome to the API')
  );
});

// API routes
app.use('/api', apiRoutes);
// app.use('/', apiRoutes);

app.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/api/auth/google/failure',
    // failureMessage: true 
    successRedirect: '/api/auth/google/success',
  }),
  (req, res) => {
    // Success redirect to frontend
    res.redirect(process.env.CLIENT_URL || 'http://localhost:8000/dashboard');
  }
);

// ==================== ERROR HANDLING ====================
app.use(notFoundHandler);
app.use(errorHandler);

export default app;