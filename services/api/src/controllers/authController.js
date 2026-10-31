const { registerSchema, loginSchema } = require('@repo/shared');
const { registerUser, loginUser, getUserById } = require('../services/authService');

function formatZodIssues(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message
  }));
}

function register(req, res) {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      issues: formatZodIssues(result.error)
    });
  }

  try {
    const data = registerUser(result.data);
    return res.status(201).json({
      success: true,
      data
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: err.message,
        code: 'CONFLICT'
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}

function login(req, res) {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      issues: formatZodIssues(result.error)
    });
  }

  try {
    const data = loginUser(result.data);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    if (err.status === 401) {
      return res.status(401).json({
        success: false,
        error: err.message,
        code: 'UNAUTHORIZED'
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}

function me(req, res) {
  const user = getUserById(req.user.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
      code: 'NOT_FOUND'
    });
  }

  return res.status(200).json({
    success: true,
    data: { user }
  });
}

module.exports = {
  register,
  login,
  me
};
