const { verifyToken } = require('../lib/jwt');
const { getEnv } = require('../config/env');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Missing Bearer token.',
      code: 'UNAUTHORIZED'
    });
  }

  const token = authHeader.split(' ')[1];
  const env = getEnv();

  try {
    const payload = verifyToken(token, env.JWT_SECRET);
    req.user = {
      id: payload.sub,
      email: payload.email,
      username: payload.username
    };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token.',
      code: 'UNAUTHORIZED'
    });
  }
}

module.exports = {
  requireAuth
};
