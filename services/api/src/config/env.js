function getEnv() {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.trim() === '') {
    throw new Error('FATAL: JWT_SECRET environment variable is required and must not be empty.');
  }

  return {
    JWT_SECRET: jwtSecret,
    PORT: parseInt(process.env.PORT || '5000', 10),
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/todo-db'
  };
}

module.exports = {
  getEnv
};
