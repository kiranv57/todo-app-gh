const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

function createTodoRouter(todoController) {
  const router = express.Router();

  // All todo operations require authentication
  router.use(requireAuth);

  router.post('/', asyncHandler(todoController.create));
  router.get('/', asyncHandler(todoController.list));
  router.get('/:id', asyncHandler(todoController.getById));
  router.patch('/:id', asyncHandler(todoController.update));
  router.delete('/:id', asyncHandler(todoController.remove));

  return router;
}

module.exports = {
  createTodoRouter
};

