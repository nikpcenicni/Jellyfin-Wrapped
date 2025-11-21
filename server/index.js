const express = require('express');
const cors = require('cors');
require('dotenv').config();
const config = require('./config');

const app = express();
const PORT = config.port;

// Middleware
app.use(cors());
app.use(express.json());
// Note: In production Docker setup, nginx handles serving the Next.js frontend
// The Express server only handles API routes

// Import and attach routes
const attachRoutes = require('./routes');
attachRoutes(app);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    jellyfinConfigured: !!config.jellyfin.serverUrl,
    openaiConfigured: !!config.openai.apiKey
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Jellyfin Server: ${config.jellyfin.serverUrl}`);
});

module.exports = app;

