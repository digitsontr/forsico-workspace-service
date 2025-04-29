const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('../config/swagger');
const loggingMiddleware = require('../middleware/logging.middleware');
const errorHandler = require('../middleware/error.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const healthService = require('../services/health.service');
const workspaceRoutes = require('../routes/workspace.routes');

function createApp() {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(loggingMiddleware);

  // Swagger documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

  // Health check endpoint
  app.get('/health', async (req, res) => {
    const { health, statusCode } = await healthService.check();
    res.status(statusCode).json(health);
  });

  // Protected routes - Apply authentication middleware
  app.use('/api', authenticate);

  // API Routes
  app.use('/api/workspaces', workspaceRoutes);

  // Error handling
  app.use(errorHandler);

  return app;
}

module.exports = createApp; 