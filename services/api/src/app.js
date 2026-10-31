const express = require('express');
const authRoutes = require('./routes/auth');
const todoRoutes = require('./routes/todos');
const { getDashboardStats } = require('./controllers/todoController');
const { requireAuth } = require('./middleware/auth');

const app = express();

app.use(express.json());

// Health check endpoint for Docker & Kubernetes probes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/todos', todoRoutes);
app.get('/api/dashboard', requireAuth, getDashboardStats);

// Fallback 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    code: 'NOT_FOUND'
  });
});

module.exports = app;
