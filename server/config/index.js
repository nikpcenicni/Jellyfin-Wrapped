require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  jellyfin: {
    serverUrl: process.env.JELLYFIN_SERVER_URL,
    apiKey: process.env.JELLYFIN_API_KEY,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  tmdb: {
    apiKey: process.env.TMDB_API_KEY,
  },
};

// Validate required configuration
if (!config.jellyfin.serverUrl || !config.jellyfin.apiKey) {
  console.error('ERROR: JELLYFIN_SERVER_URL and JELLYFIN_API_KEY must be set in environment variables');
  process.exit(1);
}

module.exports = config;

