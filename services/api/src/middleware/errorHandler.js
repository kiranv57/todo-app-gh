const { AppError } = require('../errors');

function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    const payload = {
      success: false,
      error: err.message,
      code: err.code
    };
    if (err.issues && err.issues.length > 0) {
      payload.issues = err.issues;
    }
    return res.status(err.statusCode).json(payload);
  }

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: err.message || 'Duplicate key constraint violation',
      code: 'CONFLICT'
    });
  }

  // Fallback for unexpected runtime errors
  console.error('[Unhandled Error]:', err);
  return res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
}

module.exports = {
  asyncHandler,
  errorHandler
};
