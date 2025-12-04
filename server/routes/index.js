const config = require('../config');
const { executeQuery } = require('../services/jellyfin/queries');
const { enrichItemsWithPosters } = require('../services/images/posters');
const { generateWrappedInsights } = require('../services/ai/openai');
const { getItemDetails } = require('../services/jellyfin/items');
const { transformToObjects, deduplicateShows, validateAndSanitizeUserId } = require('../utils/transform');
const { getCache, setCache, getWrappedCache, setWrappedCache } = require('../services/cache/database');
const {
  buildTopMoviesQuery,
  buildTopShowsQuery,
  buildMonthlyActivityQuery,
  buildTotalWatchTimeQuery,
  buildMediaTypeComparisonQuery,
  buildTopMovieIdsForYearAnalysisQuery,
  buildTopMovieIdsForGenreAnalysisQuery,
  buildUserRankingAllMediaQuery,
  buildUserRankingMoviesQuery,
  buildUserRankingShowsQuery,
  TOP_ITEMS_LIMIT
} = require('../utils/queryBuilders');

// Using native fetch (available in Node 20+)

// Constants
const IMAGE_CACHE_MAX_AGE = 86400; // 24 hours
const DEFAULT_IMAGE_TYPE = 'Primary';
const DEFAULT_IMAGE_MAX_WIDTH = '300';
const DEFAULT_IMAGE_QUALITY = '90';
const DEFAULT_CONTENT_TYPE = 'image/jpeg';
const EMBY_AUTHORIZATION_HEADER = 'MediaBrowser Client="Jellyfin Wrapped", Device="Web Browser", DeviceId="jellyfin-wrapped-web", Version="1.0.0"';

// Helper Functions
const getYearFromQuery = (query) => parseInt(query.year) || new Date().getFullYear();

/**
 * Calculate the last Friday of November for a given year
 * @param {number} year - The year to calculate for
 * @returns {Date} Date object representing the last Friday of November
 */
const getLastFridayOfNovember = (year) => {
  // Start with November 30th
  const nov30 = new Date(year, 10, 30); // Month is 0-indexed, so 10 = November
  
  // Get the day of the week (0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday)
  const dayOfWeek = nov30.getDay();
  
  // Calculate how many days to subtract to get to Friday
  // If Nov 30 is Friday (5), subtract 0
  // If Nov 30 is Saturday (6), subtract 1
  // If Nov 30 is Sunday (0), subtract 2
  // If Nov 30 is Monday (1), subtract 3
  // If Nov 30 is Tuesday (2), subtract 4
  // If Nov 30 is Wednesday (3), subtract 5
  // If Nov 30 is Thursday (4), subtract 6
  let daysToSubtract;
  if (dayOfWeek === 5) {
    // Friday - no subtraction needed
    daysToSubtract = 0;
  } else if (dayOfWeek === 6) {
    // Saturday - go back 1 day
    daysToSubtract = 1;
  } else {
    // Sunday through Thursday - go back (dayOfWeek + 2) days
    daysToSubtract = dayOfWeek + 2;
  }
  
  const lastFriday = new Date(nov30);
  lastFriday.setDate(nov30.getDate() - daysToSubtract);
  
  return lastFriday;
};

/**
 * Check if the current year's wrapped is locked (before last Friday of November)
 * @param {number} year - The year to check
 * @returns {{locked: boolean, unlockDate: Date|null}} Object indicating if locked and unlock date
 */
const isYearLocked = (year) => {
  const currentYear = new Date().getFullYear();
  
  // Only lock the current year
  if (year !== currentYear) {
    return { locked: false, unlockDate: null };
  }
  
  const lastFriday = getLastFridayOfNovember(year);
  const now = new Date();
  
  // Set time to end of day (23:59:59) for comparison
  const unlockDate = new Date(lastFriday);
  unlockDate.setHours(23, 59, 59, 999);
  
  return {
    locked: now < unlockDate,
    unlockDate: unlockDate
  };
};

const handleError = (res, error, defaultMessage, statusCode = 500) => {
  console.error(defaultMessage, error);
  
  // Use the error's status code if available (for API errors like 403, 401)
  const finalStatusCode = error.statusCode || statusCode;
  
  // For authentication/authorization errors, provide more helpful messages
  if (finalStatusCode === 403 || finalStatusCode === 401) {
    return res.status(finalStatusCode).json({
      error: error.message || defaultMessage,
      message: error.message || 'Authentication or authorization failed. Please try logging out and logging back in.',
      requiresReauth: true
    });
  }
  
  res.status(finalStatusCode).json({
    error: defaultMessage,
    message: error.message || error.toString()
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

const handleWrappedInsights = async (req, res) => {
  try {
    const { stats, language, userName, userId } = req.body;

    if (!stats) {
      return res.status(400).json({ error: 'Stats data is required' });
    }

    const lang = language || 'en';
    const year = stats.year || new Date().getFullYear();
    const lockCheck = isYearLocked(year);
    
    if (lockCheck.locked) {
      const unlockDateStr = lockCheck.unlockDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      return res.status(403).json({ 
        error: 'Wrapped for the current year is locked',
        message: `Wrapped statistics for ${year} will be available starting on the last Friday of November (${unlockDateStr}).`,
        unlockDate: lockCheck.unlockDate.toISOString()
      });
    }
    
    const cacheUserId = userId || null;

    // Check cache first
    const cached = await getWrappedCache(year, cacheUserId, lang);
    if (cached && cached.slides && Array.isArray(cached.slides) && cached.slides.length > 0) {
      console.log(`[Wrapped Cache] Hit for year: ${year}, user: ${cacheUserId || 'global'}, lang: ${lang}`);
      return res.json({ slides: cached.slides, cached: true });
    }

    console.log(`[Wrapped Cache] Miss for year: ${year}, user: ${cacheUserId || 'global'}, lang: ${lang}`);
    
    // Generate new insights
    const insights = await generateWrappedInsights(stats, lang, userName);

    if (insights && insights.length > 0) {
      // Cache the insights (3 year TTL since wrapped is yearly)
      await setWrappedCache(year, { slides: insights }, cacheUserId, lang, 1095).catch(err => {
        console.error('[Wrapped Cache] Failed to cache insights:', err);
      });
    }

    res.json({ slides: insights || [], cached: false });
  } catch (error) {
    handleError(res, error, 'Failed to generate wrapped insights');
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

// Individual stat fetching functions with caching
const fetchStatWithCache = async (statType, year, userId, fetchFn) => {
  // Check cache first
  const cached = await getCache(statType, year, userId);
  if (cached) {
    console.log(`[Cache] Hit for ${statType} (year: ${year}, user: ${userId || 'global'})`);
    return cached;
  }
  
  console.log(`[Cache] Miss for ${statType} (year: ${year}, user: ${userId || 'global'})`);
  const data = await fetchFn();
  
  // Cache the result (3 year TTL)
  await setCache(statType, year, data, userId, 1095).catch(err => {
    console.error(`[Cache] Failed to cache ${statType}:`, err);
  });
  
  return data;
};

const fetchTotalWatchTime = async (year, userId = null) => {
  const query = buildTotalWatchTimeQuery(year, userId);
  // Always use admin API key. replaceUserId=false to see actual user IDs (needed for proper aggregation)
  const response = await executeQuery(query, false);
  return transformToObjects(response);
};

const fetchMonthlyActivity = async (year, userId = null) => {
  const query = buildMonthlyActivityQuery(year, userId);
  // Always use admin API key. replaceUserId=false to see actual user IDs (needed for proper aggregation)
  const response = await executeQuery(query, false);
  return transformToObjects(response);
};

const fetchTopMovies = async (year, userId = null) => {
  const query = buildTopMoviesQuery(year, userId);
  // Always use admin API key. replaceUserId=false to see actual user IDs (needed for proper aggregation)
  const response = await executeQuery(query, false);
  let movies = transformToObjects(response);
  return await enrichItemsWithPosters(movies);
};

const fetchTopShows = async (year, userId = null) => {
  const query = buildTopShowsQuery(year, userId);
  // Always use admin API key. replaceUserId=false to see actual user IDs (needed for proper aggregation)
  const response = await executeQuery(query, false);
  let shows = transformToObjects(response);
  shows = deduplicateShows(shows).slice(0, TOP_ITEMS_LIMIT);
  return await enrichItemsWithPosters(shows);
};

const fetchMediaTypeComparison = async (year, userId = null) => {
  const query = buildMediaTypeComparisonQuery(year, userId);
  // Always use admin API key. replaceUserId=false to see actual user IDs (needed for proper aggregation)
  const response = await executeQuery(query, false);
  const mediaTypeComparison = transformToObjects(response);
  
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
  
  return { mediaTypeComparison, preferredMediaType };
};

const fetchTopGenres = async (year, userId = null) => {
  const query = buildTopMovieIdsForGenreAnalysisQuery(year, userId, 100);
  // Always use admin API key. replaceUserId=false to see actual user IDs (needed for proper aggregation)
  const response = await executeQuery(query, false);
  const topMovieIdsForGenre = transformToObjects(response);
  const topGenres = await analyzeGenres(topMovieIdsForGenre).catch(err => {
    console.error('[fetchTopGenres] Error analyzing genres:', err);
    return [];
  });
  
  return topGenres.length > 0 ? topGenres : null;
};

const fetchTopMovieYears = async (year, userId = null) => {
  const query = buildTopMovieIdsForYearAnalysisQuery(year, userId, 50);
  // Always use admin API key. replaceUserId=false to see actual user IDs (needed for proper aggregation)
  const response = await executeQuery(query, false);
  const topMovieIdsForYear = transformToObjects(response);
  const topMovieYears = await analyzeMovieYears(topMovieIdsForYear).catch(err => {
    console.error('[fetchTopMovieYears] Error analyzing movie years:', err);
    return [];
  });
  
  return topMovieYears.length > 0 ? topMovieYears : null;
};

const handleUserRanking = async (req, res) => {
  try {
    const userId = req.query.userId?.trim();
    const validation = validateAndSanitizeUserId(userId);

    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
        ...(validation.received && { received: validation.received, length: validation.length })
      });
    }

    const year = getYearFromQuery(req.query);
    const lockCheck = isYearLocked(year);
    
    if (lockCheck.locked) {
      const unlockDateStr = lockCheck.unlockDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      return res.status(403).json({ 
        error: 'Wrapped for the current year is locked',
        message: `Wrapped statistics for ${year} will be available starting on the last Friday of November (${unlockDateStr}).`,
        unlockDate: lockCheck.unlockDate.toISOString()
      });
    }
    
    // Build and execute ranking queries
    const queries = {
      allMedia: buildUserRankingAllMediaQuery(year),
      movies: buildUserRankingMoviesQuery(year),
      shows: buildUserRankingShowsQuery(year)
    };

    // Execute queries using admin API key (with ReplaceUserId: false to see actual user IDs)
    const [allMediaResponse, moviesResponse, showsResponse] = await Promise.all([
      executeQuery(queries.allMedia, false),
      executeQuery(queries.movies, false),
      executeQuery(queries.shows, false)
    ]);

    const allMediaResults = transformToObjects(allMediaResponse);
    const moviesResults = transformToObjects(moviesResponse);
    const showsResults = transformToObjects(showsResponse);

    // Find user's rank in each category
    const findRank = (results, targetUserId) => {
      const index = results.findIndex(r => r.UserId === targetUserId);
      return index >= 0 ? index + 1 : null; // Rank is 1-based
    };

    const allMediaRank = findRank(allMediaResults, validation.sanitized);
    const moviesRank = findRank(moviesResults, validation.sanitized);
    const showsRank = findRank(showsResults, validation.sanitized);

    // Get user's stats for each category
    const getUserStats = (results, targetUserId) => {
      const userData = results.find(r => r.UserId === targetUserId);
      return userData ? {
        totalSeconds: userData.TotalSeconds || 0,
        totalHours: userData.TotalHours || 0
      } : null;
    };

    res.json({
      year,
      allMedia: {
        rank: allMediaRank,
        totalUsers: allMediaResults.length,
        stats: getUserStats(allMediaResults, validation.sanitized)
      },
      movies: {
        rank: moviesRank,
        totalUsers: moviesResults.length,
        stats: getUserStats(moviesResults, validation.sanitized)
      },
      shows: {
        rank: showsRank,
        totalUsers: showsResults.length,
        stats: getUserStats(showsResults, validation.sanitized)
      }
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch user rankings');
  }
};

// Individual stat endpoints for progressive loading
const handleStatTotalWatchTime = async (req, res) => {
  try {
    const year = getYearFromQuery(req.query);
    const lockCheck = isYearLocked(year);
    
    if (lockCheck.locked) {
      const unlockDateStr = lockCheck.unlockDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      return res.status(403).json({ 
        error: 'Wrapped for the current year is locked',
        message: `Wrapped statistics for ${year} will be available starting on the last Friday of November (${unlockDateStr}).`,
        unlockDate: lockCheck.unlockDate.toISOString()
      });
    }
    
    const userId = req.query.userId?.trim() || null;
    
    const data = await fetchStatWithCache(
      'totalWatchTime',
      year,
      userId,
      () => fetchTotalWatchTime(year, userId)
    );
    
    // Fetch previous year data for comparison
    const previousYear = year - 1;
    let previousYearData = null;
    try {
      previousYearData = await fetchStatWithCache(
        'totalWatchTime',
        previousYear,
        userId,
        () => fetchTotalWatchTime(previousYear, userId)
      );
    } catch (err) {
      // If previous year data doesn't exist, that's okay - just continue without comparison
      console.log(`[TotalWatchTime] No data available for previous year ${previousYear}`);
    }
    
    res.json({ 
      totalWatchTime: data,
      previousYearTotalWatchTime: previousYearData 
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch total watch time');
  }
};

const handleStatMonthlyActivity = async (req, res) => {
  try {
    const year = getYearFromQuery(req.query);
    const lockCheck = isYearLocked(year);
    
    if (lockCheck.locked) {
      const unlockDateStr = lockCheck.unlockDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      return res.status(403).json({ 
        error: 'Wrapped for the current year is locked',
        message: `Wrapped statistics for ${year} will be available starting on the last Friday of November (${unlockDateStr}).`,
        unlockDate: lockCheck.unlockDate.toISOString()
      });
    }
    
    const userId = req.query.userId?.trim() || null;
    
    const data = await fetchStatWithCache(
      'monthlyActivity',
      year,
      userId,
      () => fetchMonthlyActivity(year, userId)
    );
    
    res.json({ monthlyActivity: data });
  } catch (error) {
    handleError(res, error, 'Failed to fetch monthly activity');
  }
};

const handleStatTopMovies = async (req, res) => {
  try {
    const year = getYearFromQuery(req.query);
    const lockCheck = isYearLocked(year);
    
    if (lockCheck.locked) {
      const unlockDateStr = lockCheck.unlockDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      return res.status(403).json({ 
        error: 'Wrapped for the current year is locked',
        message: `Wrapped statistics for ${year} will be available starting on the last Friday of November (${unlockDateStr}).`,
        unlockDate: lockCheck.unlockDate.toISOString()
      });
    }
    
    const userId = req.query.userId?.trim() || null;
    
    const data = await fetchStatWithCache(
      'topMovies',
      year,
      userId,
      () => fetchTopMovies(year, userId)
    );
    
    res.json({ topMovies: data });
  } catch (error) {
    handleError(res, error, 'Failed to fetch top movies');
  }
};

const handleStatTopShows = async (req, res) => {
  try {
    const year = getYearFromQuery(req.query);
    const lockCheck = isYearLocked(year);
    
    if (lockCheck.locked) {
      const unlockDateStr = lockCheck.unlockDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      return res.status(403).json({ 
        error: 'Wrapped for the current year is locked',
        message: `Wrapped statistics for ${year} will be available starting on the last Friday of November (${unlockDateStr}).`,
        unlockDate: lockCheck.unlockDate.toISOString()
      });
    }
    
    const userId = req.query.userId?.trim() || null;
    
    const data = await fetchStatWithCache(
      'topShows',
      year,
      userId,
      () => fetchTopShows(year, userId)
    );
    
    res.json({ topShows: data });
  } catch (error) {
    handleError(res, error, 'Failed to fetch top shows');
  }
};

const handleStatMediaTypeComparison = async (req, res) => {
  try {
    const year = getYearFromQuery(req.query);
    const lockCheck = isYearLocked(year);
    
    if (lockCheck.locked) {
      const unlockDateStr = lockCheck.unlockDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      return res.status(403).json({ 
        error: 'Wrapped for the current year is locked',
        message: `Wrapped statistics for ${year} will be available starting on the last Friday of November (${unlockDateStr}).`,
        unlockDate: lockCheck.unlockDate.toISOString()
      });
    }
    
    const userId = req.query.userId?.trim() || null;
    
    const data = await fetchStatWithCache(
      'mediaTypeComparison',
      year,
      userId,
      () => fetchMediaTypeComparison(year, userId)
    );
    
    res.json(data);
  } catch (error) {
    handleError(res, error, 'Failed to fetch media type comparison');
  }
};

const handleStatTopGenres = async (req, res) => {
  try {
    const year = getYearFromQuery(req.query);
    const lockCheck = isYearLocked(year);
    
    if (lockCheck.locked) {
      const unlockDateStr = lockCheck.unlockDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      return res.status(403).json({ 
        error: 'Wrapped for the current year is locked',
        message: `Wrapped statistics for ${year} will be available starting on the last Friday of November (${unlockDateStr}).`,
        unlockDate: lockCheck.unlockDate.toISOString()
      });
    }
    
    const userId = req.query.userId?.trim() || null;
    
    const data = await fetchStatWithCache(
      'topGenres',
      year,
      userId,
      () => fetchTopGenres(year, userId)
    );
    
    res.json({ topGenres: data });
  } catch (error) {
    handleError(res, error, 'Failed to fetch top genres');
  }
};

const handleStatTopMovieYears = async (req, res) => {
  try {
    const year = getYearFromQuery(req.query);
    const lockCheck = isYearLocked(year);
    
    if (lockCheck.locked) {
      const unlockDateStr = lockCheck.unlockDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      return res.status(403).json({ 
        error: 'Wrapped for the current year is locked',
        message: `Wrapped statistics for ${year} will be available starting on the last Friday of November (${unlockDateStr}).`,
        unlockDate: lockCheck.unlockDate.toISOString()
      });
    }
    
    const userId = req.query.userId?.trim() || null;
    
    const data = await fetchStatWithCache(
      'topMovieYears',
      year,
      userId,
      () => fetchTopMovieYears(year, userId)
    );
    
    res.json({ topMovieYears: data });
  } catch (error) {
    handleError(res, error, 'Failed to fetch top movie years');
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
  app.post('/api/wrapped/insights', handleWrappedInsights);
  app.get('/api/image', handleImageProxy);

  // Statistics Routes
  app.get('/api/stats/ranking', handleUserRanking);
  
  // Individual stat endpoints for progressive loading
  app.get('/api/stats/total-watch-time', handleStatTotalWatchTime);
  app.get('/api/stats/monthly-activity', handleStatMonthlyActivity);
  app.get('/api/stats/top-movies', handleStatTopMovies);
  app.get('/api/stats/top-shows', handleStatTopShows);
  app.get('/api/stats/media-type-comparison', handleStatMediaTypeComparison);
  app.get('/api/stats/top-genres', handleStatTopGenres);
  app.get('/api/stats/top-movie-years', handleStatTopMovieYears);

  // Authentication Routes
  app.post('/api/login', handleLogin);
  app.post('/api/quick-connect/initiate', handleQuickConnectInitiate);
  app.get('/api/quick-connect/status', handleQuickConnectStatus);
  app.post('/api/quick-connect/authenticate', handleQuickConnectAuthenticate);
}

module.exports = attachRoutes;
