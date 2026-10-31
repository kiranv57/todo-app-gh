const { createApp } = require('./app');
const { createContainer } = require('./container');
const { getEnv } = require('./config/env');

try {
  const env = getEnv();
  const container = createContainer({ jwtSecret: env.JWT_SECRET });
  const app = createApp(container);

  const server = app.listen(env.PORT, () => {
    console.log(`[API Server] Booted successfully on port ${env.PORT}`);
  });

  const shutdown = () => {
    console.log('[API Server] Graceful shutdown initiated...');
    server.close(() => {
      console.log('[API Server] Closed active connections.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (err) {
  console.error(`[API Boot Failure] ${err.message}`);
  process.exit(1);
}
