const express = require('express');
const path = require('path');

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const API_URL = process.env.API_URL || 'http://localhost:5000';

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API proxy to backend service with header forwarding
app.use('/api/proxy', async (req, res) => {
  const targetUrl = `${API_URL}/api${req.url}`;

  const headers = {
    'Content-Type': 'application/json'
  };

  if (req.headers.authorization) {
    headers.authorization = req.headers.authorization;
  }

  try {
    const fetchOptions = {
      method: req.method,
      headers
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({
      success: false,
      error: 'Backend API service unreachable',
      details: err.message
    });
  }
});

// Health probe
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Single Page Application routing fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Web Frontend] Running on http://localhost:${PORT}`);
  });
}

module.exports = app;
