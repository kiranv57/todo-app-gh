const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

function createAuthRouter(authController) {
  const router = express.Router();

  router.post('/register', asyncHandler(authController.register));
  router.post('/login', asyncHandler(authController.login));
  router.get('/me', requireAuth, asyncHandler(authController.me));

  return router;
}

module.exports = {
  createAuthRouter
};
