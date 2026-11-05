import app from './app.js';
import { setupSocketIO } from './sockets/index.js';
import database from './config/mongodb.js';
import config from './config/index.js';
import logger from './utils/logger.js';

let server;

const startServer = async () => {
  try {
    // Connect to database
    await database.connect();
    
    // Create HTTP server
    const httpServer = app.listen(config.port, () => {
      logger.info(`🚀 Server started successfully!`);
      logger.info(`📍 Port: ${config.port}`);
      logger.info(`🌍 Environment: ${config.nodeEnv}`);
      logger.info(`📡 API URL: http://localhost:${config.port}`);
      logger.info(`📊 API Documentation: http://localhost:${config.port}/api/docs`);
      logger.info(`🔄 Health Check: http://localhost:${config.port}/health`);
    });
    
    // Setup Socket.IO
    const { io, onlineUsersManager, userSocketMap } = setupSocketIO(httpServer);
    
    // Make socket available to routes
    app.set('io', io);
    app.set('onlineUsersManager', onlineUsersManager);
    
    // Update health check with socket status
    app.get('/health', (req, res, next) => {
      const healthData = res.locals.healthData || {};
      healthData.services.socket = {
        status: io.engine.clientsCount > 0 ? 'active' : 'idle',
        connections: io.engine.clientsCount
      };
      res.locals.healthData = healthData;
      next();
    });
    
    server = httpServer;
    
    // Setup graceful shutdown
    setupGracefulShutdown(server, io);
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

const setupGracefulShutdown = (server, io) => {
  const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received, initiating graceful shutdown...`);

    const shutdownTimeout = setTimeout(() => {
      logger.error('Forced shutdown triggered');
      process.exit(1);
    }, 30000);

    try {
      server.close(async (err) => {
        if (err) {
          logger.error('Error closing HTTP server:', err);
        } else {
          logger.info('HTTP server closed');
        }

        try {
          io.close(() => {
            logger.info('Socket.IO server closed');
          });

          await database.disconnect();
          logger.info('All connections closed successfully');
          
          clearTimeout(shutdownTimeout);
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          clearTimeout(shutdownTimeout);
          process.exit(1);
        }
      });
    } catch (error) {
      logger.error('Unexpected error during shutdown:', error);
      clearTimeout(shutdownTimeout);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
  });
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
  });
  process.on('warning', (warning) => {
    logger.warn('Process warning:', warning);
  });
};

// Start the server
startServer();

export { server };