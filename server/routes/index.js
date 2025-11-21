const config = require('../config');
const { executeQuery, executeQueryForUser } = require('../services/jellyfin/queries');
const { enrichItemsWithPosters } = require('../services/images/posters');
const { generateIntroMessages } = require('../services/ai/openai');
const { getItemDetails } = require('../services/jellyfin/items');
const { transformToObjects, deduplicateShows, validateAndSanitizeUserId } = require('../utils/transform');
const {
  buildTopMoviesQuery,
  buildTopShowsQuery,
  buildMonthlyActivityQuery,
  buildTotalWatchTimeQuery,
  buildMediaTypeComparisonQuery,
  buildTopMovieIdsForYearAnalysisQuery,
  buildTopMovieIdsForGenreAnalysisQuery,
  TOP_ITEMS_LIMIT
} = require('../utils/queryBuilders');

const fetch = globalThis.fetch || require('node-fetch');

// Constants
const VALID_USE_CASES = ['global', 'server', 'personal', 'user', 'family'];
const DEFAULT_USE_CASE = 'global';
const IMAGE_CACHE_MAX_AGE = 86400; // 24 hours
const DEFAULT_IMAGE_TYPE = 'Primary';
const DEFAULT_IMAGE_MAX_WIDTH = '300';
const DEFAULT_IMAGE_QUALITY = '90';
const DEFAULT_CONTENT_TYPE = 'image/jpeg';
const EMBY_AUTHORIZATION_HEADER = 'MediaBrowser Client="Jellyfin Wrapped", Device="Web Browser", DeviceId="jellyfin-wrapped-web", Version="1.0.0"';

// Helper Functions
const getYearFromQuery = (query) => parseInt(query.year) || new Date().getFullYear();

const handleError = (res, error, defaultMessage, statusCode = 500) => {
  console.error(defaultMessage, error);
  res.status(statusCode).json({
    error: defaultMessage,
    message: error.message
  });
};

const makeJellyfinRequest = async (endpoint, options = {}) => {
  const headers = {
    'accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Emby-Authorization': EMBY_AUTHORIZATION_HEADER,
    ...options.headers
  };

  const response = await fetch(endpoint, {
    method: options.method || 'GET',
    headers,
    ...(options.body && { body: JSON.stringify(options.body) })
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText };
    }
    return { ok: false, status: response.status, error: errorData };
  }

  return { ok: true, data: await response.json() };
};

const extractAuthData = (data) => ({
  user: {
    id: data.User?.Id,
    name: data.User?.Name,
    serverId: data.ServerId
  },
  accessToken: data.AccessToken,
  sessionInfo: data.SessionInfo
});

// Helper functions for analyzing additional stats
const analyzeGenres = async (movieIds) => {
  const genreCounts = new Map();
  const batchSize = 10;
  
  for (let i = 0; i < movieIds.length; i += batchSize) {
    const batch = movieIds.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (movie) => {
        try {
          const itemDetails = await getItemDetails(movie.ItemId);
          if (itemDetails && itemDetails.Genres && Array.isArray(itemDetails.Genres)) {
            return itemDetails.Genres;
          }
          return [];
        } catch (error) {
          console.error(`[analyzeGenres] Error fetching details for ${movie.ItemId}:`, error.message);
          return [];
        }
      })
    );
    
    results.forEach((genres, index) => {
      const playCount = batch[index].PlayCount || 1;
      genres.forEach(genre => {
        genreCounts.set(genre, (genreCounts.get(genre) || 0) + playCount);
      });
    });
    
    // Small delay to avoid overwhelming the API
    if (i + batchSize < movieIds.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return Array.from(genreCounts.entries())
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 genres
};

const analyzeMovieYears = async (movieIds) => {
  const yearCounts = new Map();
  const batchSize = 10;
  
  for (let i = 0; i < movieIds.length; i += batchSize) {
    const batch = movieIds.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (movie) => {
        try {
          const itemDetails = await getItemDetails(movie.ItemId);
          if (itemDetails && itemDetails.ProductionYear) {
            return { year: itemDetails.ProductionYear, playCount: movie.PlayCount || 1 };
          }
          return null;
        } catch (error) {
          console.error(`[analyzeMovieYears] Error fetching details for ${movie.ItemId}:`, error.message);
          return null;
        }
      })
    );
    
    results.forEach((result) => {
      if (result && result.year) {
        yearCounts.set(result.year, (yearCounts.get(result.year) || 0) + result.playCount);
      }
    });
    
    // Small delay to avoid overwhelming the API
    if (i + batchSize < movieIds.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return Array.from(yearCounts.entries())
    .map(([year, count]) => ({ year: parseInt(year), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 years
};

// Route Handlers
const handleHealthCheck = (req, res) => {
  res.json({
    status: 'ok',
    jellyfinConfigured: !!config.jellyfin.serverUrl,
    openaiConfigured: !!config.openai.apiKey
  });
};

const handleIntro = async (req, res) => {
  try {
    const { stats, useCase } = req.body;

    if (!stats) {
      return res.status(400).json({ error: 'Stats data is required' });
    }

    const validatedUseCase = VALID_USE_CASES.includes(useCase) ? useCase : DEFAULT_USE_CASE;
    const messages = await generateIntroMessages(stats, validatedUseCase);

    res.json({ messages: messages || null });
  } catch (error) {
    handleError(res, error, 'Failed to generate intro messages');
  }
};

const handleImageProxy = async (req, res) => {
  try {
    const { itemId, imageType = DEFAULT_IMAGE_TYPE, tag, maxWidth = DEFAULT_IMAGE_MAX_WIDTH, quality = DEFAULT_IMAGE_QUALITY } = req.query;

    if (!itemId) {
      return res.status(400).json({ error: 'itemId parameter is required' });
    }

    const params = new URLSearchParams({ maxWidth, quality });
    if (tag) params.set('tag', tag);

    const imageUrl = `${config.jellyfin.serverUrl}/Items/${itemId}/Images/${imageType}?${params.toString()}`;

    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'X-Emby-Token': config.jellyfin.apiKey,
        'accept': 'image/*'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Failed to fetch image from Jellyfin',
        status: response.status
      });
    }

    const contentType = response.headers.get('content-type') || DEFAULT_CONTENT_TYPE;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', `public, max-age=${IMAGE_CACHE_MAX_AGE}`);

    const imageBuffer = await response.arrayBuffer();
    res.send(Buffer.from(imageBuffer));
  } catch (error) {
    handleError(res, error, 'Internal server error while fetching image');
  }
};

const fetchStatsData = async (year, userId = null, accessToken = null) => {
  const queries = {
    topMovies: buildTopMoviesQuery(year, userId),
    topShows: buildTopShowsQuery(year, userId),
    monthlyActivity: buildMonthlyActivityQuery(year, userId),
    totalWatchTime: buildTotalWatchTimeQuery(year, userId),
    mediaTypeComparison: buildMediaTypeComparisonQuery(year, userId),
    topMovieIdsForYear: buildTopMovieIdsForYearAnalysisQuery(year, userId, 50),
    topMovieIdsForGenre: buildTopMovieIdsForGenreAnalysisQuery(year, userId, 100)
  };

  const executeArgs = accessToken 
    ? (query) => executeQueryForUser(query, accessToken)
    : (query) => executeQuery(query, true);

  // Execute all SQL queries in parallel
  const [
    topMoviesResponse,
    topShowsResponse,
    monthlyActivityResponse,
    totalWatchTimeResponse,
    mediaTypeComparisonResponse,
    topMovieIdsForYearResponse,
    topMovieIdsForGenreResponse
  ] = await Promise.all([
    executeArgs(queries.topMovies),
    executeArgs(queries.topShows),
    executeArgs(queries.monthlyActivity),
    executeArgs(queries.totalWatchTime),
    executeArgs(queries.mediaTypeComparison),
    executeArgs(queries.topMovieIdsForYear),
    executeArgs(queries.topMovieIdsForGenre)
  ]);

  let topMovies = transformToObjects(topMoviesResponse);
  let topShows = transformToObjects(topShowsResponse);
  const monthlyActivity = transformToObjects(monthlyActivityResponse);
  const totalWatchTime = transformToObjects(totalWatchTimeResponse);
  const mediaTypeComparison = transformToObjects(mediaTypeComparisonResponse);
  const topMovieIdsForYear = transformToObjects(topMovieIdsForYearResponse);
  const topMovieIdsForGenre = transformToObjects(topMovieIdsForGenreResponse);

  topShows = deduplicateShows(topShows).slice(0, TOP_ITEMS_LIMIT);

  // Enrich items with posters and analyze additional stats in parallel
  const [enrichedMovies, enrichedShows, topGenres, topMovieYears] = await Promise.all([
    enrichItemsWithPosters(topMovies),
    enrichItemsWithPosters(topShows),
    analyzeGenres(topMovieIdsForGenre).catch(err => {
      console.error('[fetchStatsData] Error analyzing genres:', err);
      return [];
    }),
    analyzeMovieYears(topMovieIdsForYear).catch(err => {
      console.error('[fetchStatsData] Error analyzing movie years:', err);
      return [];
    })
  ]);

  // Determine which media type was watched more
  const moviesData = mediaTypeComparison.find(m => m.MediaType === 'Movies');
  const showsData = mediaTypeComparison.find(m => m.MediaType === 'Shows');
  
  let preferredMediaType = null;
  if (moviesData && showsData) {
    const moviesHours = moviesData.TotalHours || 0;
    const showsHours = showsData.TotalHours || 0;
    preferredMediaType = {
      type: moviesHours > showsHours ? 'Movies' : 'Shows',
      movies: {
        hours: moviesHours,
        plays: moviesData.PlayCount || 0,
        uniqueItems: moviesData.UniqueItems || 0
      },
      shows: {
        hours: showsHours,
        plays: showsData.PlayCount || 0,
        uniqueItems: showsData.UniqueItems || 0
      }
    };
  }

  return {
    year,
    topMovies: enrichedMovies,
    topShows: enrichedShows,
    monthlyActivity,
    totalWatchTime,
    mediaTypeComparison,
    preferredMediaType,
    topGenres: topGenres.length > 0 ? topGenres : null,
    topMovieYears: topMovieYears.length > 0 ? topMovieYears : null
  };
};

const handleStats = async (req, res) => {
  try {
    const year = getYearFromQuery(req.query);
    const stats = await fetchStatsData(year);
    res.json(stats);
  } catch (error) {
    handleError(res, error, 'Failed to fetch statistics');
  }
};

const handlePersonalStats = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Please provide access token.' });
    }

    const accessToken = authHeader.substring(7);
    const userId = req.query.userId?.trim();
    const validation = validateAndSanitizeUserId(userId);

    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
        ...(validation.received && { received: validation.received, length: validation.length })
      });
    }

    const year = getYearFromQuery(req.query);
    const stats = await fetchStatsData(year, validation.sanitized, accessToken);
    
    res.json({
      ...stats,
      isPersonalized: true
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch personalized statistics');
  }
};

const handleLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (!config.jellyfin.serverUrl) {
      return res.status(500).json({ error: 'Jellyfin server URL not configured' });
    }

    const endpoint = `${config.jellyfin.serverUrl}/Users/AuthenticateByName`;
    const result = await makeJellyfinRequest(endpoint, {
      method: 'POST',
      body: { Username: username, Pw: password }
    });

    if (!result.ok) {
      const status = result.status === 401 ? 401 : result.status;
      return res.status(status).json({
        error: status === 401 ? 'Invalid username or password' : (result.error.message || 'Authentication failed'),
        ...(result.error.details && { details: result.error })
      });
    }

    res.json(extractAuthData(result.data));
  } catch (error) {
    handleError(res, error, 'Failed to authenticate');
  }
};

const handleQuickConnectInitiate = async (req, res) => {
  try {
    if (!config.jellyfin.serverUrl) {
      return res.status(500).json({ error: 'Jellyfin server URL not configured' });
    }

    const endpoint = `${config.jellyfin.serverUrl}/QuickConnect/Initiate`;
    const result = await makeJellyfinRequest(endpoint, { method: 'POST' });

    if (!result.ok) {
      return res.status(result.status).json({
        error: 'Failed to initiate Quick Connect',
        details: result.error.message
      });
    }

    res.json(result.data);
  } catch (error) {
    handleError(res, error, 'Failed to initiate Quick Connect');
  }
};

const handleQuickConnectStatus = async (req, res) => {
  try {
    const { secret } = req.query;

    if (!secret) {
      return res.status(400).json({ error: 'Secret is required' });
    }

    if (!config.jellyfin.serverUrl) {
      return res.status(500).json({ error: 'Jellyfin server URL not configured' });
    }

    const endpoint = `${config.jellyfin.serverUrl}/QuickConnect/Connect?secret=${encodeURIComponent(secret)}`;
    const result = await makeJellyfinRequest(endpoint);

    if (!result.ok) {
      return res.status(result.status).json({
        error: 'Failed to check Quick Connect status',
        details: result.error.message
      });
    }

    res.json(result.data);
  } catch (error) {
    handleError(res, error, 'Failed to check Quick Connect status');
  }
};

const handleQuickConnectAuthenticate = async (req, res) => {
  try {
    const { secret } = req.body;

    if (!secret) {
      return res.status(400).json({ error: 'Secret is required' });
    }

    if (!config.jellyfin.serverUrl) {
      return res.status(500).json({ error: 'Jellyfin server URL not configured' });
    }

    const endpoint = `${config.jellyfin.serverUrl}/Users/AuthenticateWithQuickConnect`;
    const result = await makeJellyfinRequest(endpoint, {
      method: 'POST',
      body: { Secret: secret }
    });

    if (!result.ok) {
      const status = result.status === 400 ? 400 : result.status;
      return res.status(status).json({
        error: status === 400 ? 'Missing token or invalid secret' : (result.error.message || 'Authentication failed'),
        ...(result.error.details && { details: result.error })
      });
    }

    res.json(extractAuthData(result.data));
  } catch (error) {
    handleError(res, error, 'Failed to authenticate with Quick Connect');
  }
};

/**
 * Attach all routes to the Express app
 * @param {Express} app - Express application instance
 */
function attachRoutes(app) {
  // Health & Utility Routes
  app.get('/api/health', handleHealthCheck);
  app.post('/api/intro', handleIntro);
  app.get('/api/image', handleImageProxy);

  // Statistics Routes
  app.get('/api/stats', handleStats);
  app.get('/api/stats/personal', handlePersonalStats);

  // Authentication Routes
  app.post('/api/login', handleLogin);
  app.post('/api/quick-connect/initiate', handleQuickConnectInitiate);
  app.get('/api/quick-connect/status', handleQuickConnectStatus);
  app.post('/api/quick-connect/authenticate', handleQuickConnectAuthenticate);
}

module.exports = attachRoutes;
