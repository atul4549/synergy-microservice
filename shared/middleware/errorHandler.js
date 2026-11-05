// import logger from '../utils/logger.js';
// import ResponseFormatter from '../utils/responseFormatter.js';

import logger from "../utils/logger.js";
import ResponseFormatter from "../utils/responseFormatter.js";

export const errorHandler = (err, req, res, next) => {
  logger.error('Error handler caught:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json(
      ResponseFormatter.error('Validation error', 400, { errors })
    );
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json(
      ResponseFormatter.error(`Duplicate value for ${field}`, 409)
    );
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(
      ResponseFormatter.error('Invalid token', 401)
    );
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(
      ResponseFormatter.error('Token expired', 401)
    );
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  res.status(statusCode).json(
    ResponseFormatter.error(message, statusCode, err.details)
  );
};

export const notFoundHandler = (req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json(
    ResponseFormatter.error('Endpoint not found', 404, {
      path: req.path,
      method: req.method
    })
  );
};