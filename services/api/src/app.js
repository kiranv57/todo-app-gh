const express = require('express');
const { createContainer } = require('./container');
const { createAuthRouter } = require('./routes/auth');
const { createTodoRouter } = require('./routes/todos');
const { requireAuth } = require('./middleware/auth');
const { asyncHandler, errorHandler } = require('./middleware/errorHandler');

/**
 * Express Application Factory
 * Configures routes, middleware, and centralized error handling using the provided Composition Root Container.
 *
 * @param {ReturnType<typeof createContainer>} [container]
 * @returns {express.Express}
 */
function createApp(container = createContainer()) {
  const app = express();

  app.use(express.json());

  // Health check endpoint for Docker & Kubernetes probes
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
  });

  // Mount routes via container controllers
  app.use('/api/auth', createAuthRouter(container.authController));
  app.use('/api/todos', createTodoRouter(container.todoController));
  app.get('/api/dashboard', requireAuth, asyncHandler(container.todoController.getDashboardStats));

  // Fallback 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: `Route not found: ${req.method} ${req.originalUrl}`,
      code: 'NOT_FOUND'
    });
  });

  // Centralized Error Handling Middleware (must be registered last)
  app.use(errorHandler);

  // Attach container to app instance for inspection and testing
  app.container = container;

  return app;
}

// Default app instance for backward-compatible imports
const defaultContainer = createContainer();
const defaultApp = createApp(defaultContainer);

module.exports = defaultApp;
module.exports.createApp = createApp;
