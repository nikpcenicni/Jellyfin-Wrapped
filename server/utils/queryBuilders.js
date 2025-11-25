/**
 * SQL Query Builders for Jellyfin User Usage Stats
 * These functions build SQL queries for fetching statistics from the PlaybackActivity table
 */

const TOP_ITEMS_LIMIT = 10;

// Validation constants
const MIN_PLAY_DURATION_SECONDS = 60; // Minimum 1 minute to count as a valid play
const MIN_PLAY_PERCENTAGE = 0.05; // Minimum 5% of typical duration (for movies ~90min = 4.5min)
const DUPLICATE_WINDOW_MINUTES = 10; // Consider plays within 10 minutes as potential duplicates

/**
 * Build year filter dates for SQL queries
 * @param {number} year - The year to filter by
 * @returns {{startDate: string, endDate: string}} Date range for the year
 */
const buildYearFilter = (year) => ({
  startDate: `${year}-01-01`,
  endDate: `${year + 1}-01-01`
});

/**
 * Build validation WHERE clause to filter invalid/duplicate plays
 * This filters out:
 * - Plays shorter than minimum duration (60 seconds)
 * - Duplicate plays within a short time window (same item, same user, within 10 minutes)
 *   Strategy: Keep only the first play in a sequence of rapid plays
 * @param {string} tableAlias - Table alias to use (default: 'pa')
 * @returns {string} SQL WHERE clause fragment
 */
const buildPlayValidationClause = (tableAlias = 'pa') => {
  // Filter out plays that are too short (less than 1 minute)
  // Filter out duplicate plays: if the same item was played by the same user within 10 minutes,
  // keep only the first one (the one with the earliest DateCreated)
  return `
    AND ${tableAlias}.PlayDuration >= ${MIN_PLAY_DURATION_SECONDS}
    AND ${tableAlias}.DateCreated = (
      SELECT MIN(pa2.DateCreated)
      FROM PlaybackActivity pa2
      WHERE pa2.ItemId = ${tableAlias}.ItemId
        AND pa2.UserId = ${tableAlias}.UserId
        AND pa2.PlayDuration >= ${MIN_PLAY_DURATION_SECONDS}
        AND (julianday(${tableAlias}.DateCreated) - julianday(pa2.DateCreated)) * 1440 < ${DUPLICATE_WINDOW_MINUTES}
        AND (julianday(${tableAlias}.DateCreated) - julianday(pa2.DateCreated)) * 1440 >= 0
    )
  `;
};

/**
 * Build SQL query for top movies
 * @param {number} year - The year to filter by
 * @param {string|null} userId - Optional user ID to filter by (for personalized stats)
 * @returns {string} SQL query string
 */
const buildTopMoviesQuery = (year, userId = null) => {
  const { startDate, endDate } = buildYearFilter(year);
  const userFilter = userId ? `AND pa.UserId = '${userId}'` : '';
  const validationClause = buildPlayValidationClause('pa');
  
  return `
    SELECT
      pa.ItemId,
      pa.ItemName,
      pa.ItemType,
      COUNT(*) as PlayCount,
      CAST(SUM(CAST(pa.PlayDuration AS INTEGER)) AS INTEGER) as TotalPlayDuration,
      (COUNT(*) + CAST(SUM(CAST(pa.PlayDuration AS INTEGER)) AS REAL) / 3600.0) as CombinedScore
    FROM PlaybackActivity pa
    WHERE pa.ItemType = 'Movie'
      ${userFilter}
      AND pa.DateCreated >= '${startDate}'
      AND pa.DateCreated < '${endDate}'
      AND pa.PlayDuration > 0
      AND pa.PlayDuration < 86400
      ${validationClause}
    GROUP BY pa.ItemId, pa.ItemName, pa.ItemType
    ORDER BY CombinedScore DESC
    LIMIT ${TOP_ITEMS_LIMIT}
  `;
};

/**
 * Build SQL query for top TV shows (aggregated by series name)
 * @param {number} year - The year to filter by
 * @param {string|null} userId - Optional user ID to filter by (for personalized stats)
 * @returns {string} SQL query string
 */
const buildTopShowsQuery = (year, userId = null) => {
  const { startDate, endDate } = buildYearFilter(year);
  const userFilter = userId ? `AND pa.UserId = '${userId}'` : '';
  const validationClause = buildPlayValidationClause('pa');
  
  return `
    SELECT
      TRIM(SUBSTR(pa.ItemName, 1, INSTR(pa.ItemName || ' - s', ' - s') - 1)) as SeriesName,
      COUNT(*) as PlayCount,
      CAST(SUM(CAST(pa.PlayDuration AS INTEGER)) AS INTEGER) as TotalPlayDuration,
      MIN(pa.ItemId) as ItemId,
      'Series' as ItemType,
      (COUNT(*) + CAST(SUM(CAST(pa.PlayDuration AS INTEGER)) AS REAL) / 3600.0) as CombinedScore
    FROM PlaybackActivity pa
    WHERE pa.ItemType = 'Episode'
      ${userFilter}
      AND pa.DateCreated >= '${startDate}'
      AND pa.DateCreated < '${endDate}'
      AND pa.PlayDuration > 0
      AND pa.PlayDuration < 86400
      AND pa.ItemName LIKE '% - s%'
      ${validationClause}
    GROUP BY TRIM(SUBSTR(pa.ItemName, 1, INSTR(pa.ItemName || ' - s', ' - s') - 1))
    ORDER BY CombinedScore DESC
    LIMIT ${TOP_ITEMS_LIMIT}
  `;
};

/**
 * Build SQL query for monthly activity statistics
 * @param {number} year - The year to filter by
 * @param {string|null} userId - Optional user ID to filter by (for personalized stats)
 * @returns {string} SQL query string
 */
const buildMonthlyActivityQuery = (year, userId = null) => {
  const { startDate, endDate } = buildYearFilter(year);
  const userFilter = userId ? `AND pa.UserId = '${userId}'` : '';
  const validationClause = buildPlayValidationClause('pa');
  
  return `
    SELECT
      strftime('%Y-%m', pa.DateCreated) as Month,
      COUNT(*) as PlayCount,
      CAST(SUM(CAST(pa.PlayDuration AS INTEGER)) AS INTEGER) as TotalSeconds
    FROM PlaybackActivity pa
    WHERE pa.DateCreated >= '${startDate}'
      AND pa.DateCreated < '${endDate}'
      ${userFilter}
      AND pa.PlayDuration > 0
      AND pa.PlayDuration < 86400
      ${validationClause}
    GROUP BY Month
    ORDER BY Month
  `;
};

/**
 * Build SQL query for total watch time statistics
 * @param {number} year - The year to filter by
 * @param {string|null} userId - Optional user ID to filter by (for personalized stats)
 * @returns {string} SQL query string
 */
const buildTotalWatchTimeQuery = (year, userId = null) => {
  const { startDate, endDate } = buildYearFilter(year);
  const userFilter = userId ? `AND pa.UserId = '${userId}'` : '';
  const validationClause = buildPlayValidationClause('pa');
  
  return `
    SELECT
      COUNT(DISTINCT pa.ItemId) as UniqueItems,
      COUNT(*) as TotalPlays,
      CAST(SUM(CAST(pa.PlayDuration AS INTEGER)) AS INTEGER) as TotalSeconds,
      CAST(ROUND(SUM(CAST(pa.PlayDuration AS INTEGER)) / 60.0) AS INTEGER) as TotalMinutes,
      CAST(ROUND(SUM(CAST(pa.PlayDuration AS INTEGER)) / 3600.0) AS INTEGER) as TotalHours
    FROM PlaybackActivity pa
    WHERE pa.DateCreated >= '${startDate}'
      AND pa.DateCreated < '${endDate}'
      ${userFilter}
      AND pa.PlayDuration > 0
      AND pa.PlayDuration < 86400
      ${validationClause}
  `;
};

/**
 * Build SQL query for movies vs shows comparison
 * @param {number} year - The year to filter by
 * @param {string|null} userId - Optional user ID to filter by (for personalized stats)
 * @returns {string} SQL query string
 */
const buildMediaTypeComparisonQuery = (year, userId = null) => {
  const { startDate, endDate } = buildYearFilter(year);
  const userFilter = userId ? `AND pa.UserId = '${userId}'` : '';
  const validationClause = buildPlayValidationClause('pa');
  
  return `
    SELECT
      CASE 
        WHEN pa.ItemType = 'Movie' THEN 'Movies'
        WHEN pa.ItemType = 'Episode' THEN 'Shows'
        ELSE pa.ItemType
      END as MediaType,
      COUNT(*) as PlayCount,
      COUNT(DISTINCT pa.ItemId) as UniqueItems,
      CAST(SUM(CAST(pa.PlayDuration AS INTEGER)) AS INTEGER) as TotalSeconds,
      CAST(ROUND(SUM(CAST(pa.PlayDuration AS INTEGER)) / 3600.0) AS INTEGER) as TotalHours
    FROM PlaybackActivity pa
    WHERE pa.DateCreated >= '${startDate}'
      AND pa.DateCreated < '${endDate}'
      ${userFilter}
      AND pa.PlayDuration > 0
      AND pa.PlayDuration < 86400
      AND (pa.ItemType = 'Movie' OR pa.ItemType = 'Episode')
      ${validationClause}
    GROUP BY MediaType
    ORDER BY PlayCount DESC
  `;
};

/**
 * Build SQL query to get top movie ItemIds for year analysis
 * Gets the most watched movies to then fetch their production years
 * @param {number} year - The year to filter by
 * @param {string|null} userId - Optional user ID to filter by (for personalized stats)
 * @param {number} limit - Number of movies to fetch (default: 50)
 * @returns {string} SQL query string
 */
const buildTopMovieIdsForYearAnalysisQuery = (year, userId = null, limit = 50) => {
  const { startDate, endDate } = buildYearFilter(year);
  const userFilter = userId ? `AND pa.UserId = '${userId}'` : '';
  const validationClause = buildPlayValidationClause('pa');
  
  return `
    SELECT DISTINCT
      pa.ItemId,
      pa.ItemName,
      COUNT(*) as PlayCount
    FROM PlaybackActivity pa
    WHERE pa.ItemType = 'Movie'
      ${userFilter}
      AND pa.DateCreated >= '${startDate}'
      AND pa.DateCreated < '${endDate}'
      AND pa.PlayDuration > 0
      AND pa.PlayDuration < 86400
      ${validationClause}
    GROUP BY pa.ItemId, pa.ItemName
    ORDER BY PlayCount DESC
    LIMIT ${limit}
  `;
};

/**
 * Build SQL query to get top movie ItemIds for genre analysis
 * Gets the most watched movies to then fetch their genres
 * @param {number} year - The year to filter by
 * @param {string|null} userId - Optional user ID to filter by (for personalized stats)
 * @param {number} limit - Number of movies to fetch (default: 100)
 * @returns {string} SQL query string
 */
const buildTopMovieIdsForGenreAnalysisQuery = (year, userId = null, limit = 100) => {
  const { startDate, endDate } = buildYearFilter(year);
  const userFilter = userId ? `AND pa.UserId = '${userId}'` : '';
  const validationClause = buildPlayValidationClause('pa');
  
  return `
    SELECT DISTINCT
      pa.ItemId,
      pa.ItemName,
      COUNT(*) as PlayCount
    FROM PlaybackActivity pa
    WHERE pa.ItemType = 'Movie'
      ${userFilter}
      AND pa.DateCreated >= '${startDate}'
      AND pa.DateCreated < '${endDate}'
      AND pa.PlayDuration > 0
      AND pa.PlayDuration < 86400
      ${validationClause}
    GROUP BY pa.ItemId, pa.ItemName
    ORDER BY PlayCount DESC
    LIMIT ${limit}
  `;
};

/**
 * Build SQL query for user rankings by total watch time (all media)
 * @param {number} year - The year to filter by
 * @returns {string} SQL query string
 */
const buildUserRankingAllMediaQuery = (year) => {
  const { startDate, endDate } = buildYearFilter(year);
  const validationClause = buildPlayValidationClause('pa');
  
  return `
    SELECT
      pa.UserId,
      CAST(SUM(CAST(pa.PlayDuration AS INTEGER)) AS INTEGER) as TotalSeconds,
      CAST(ROUND(SUM(CAST(pa.PlayDuration AS INTEGER)) / 3600.0) AS INTEGER) as TotalHours
    FROM PlaybackActivity pa
    WHERE pa.DateCreated >= '${startDate}'
      AND pa.DateCreated < '${endDate}'
      AND pa.PlayDuration > 0
      AND pa.PlayDuration < 86400
      ${validationClause}
    GROUP BY pa.UserId
    ORDER BY TotalSeconds DESC
  `;
};

/**
 * Build SQL query for user rankings by movies watch time
 * @param {number} year - The year to filter by
 * @returns {string} SQL query string
 */
const buildUserRankingMoviesQuery = (year) => {
  const { startDate, endDate } = buildYearFilter(year);
  const validationClause = buildPlayValidationClause('pa');
  
  return `
    SELECT
      pa.UserId,
      CAST(SUM(CAST(pa.PlayDuration AS INTEGER)) AS INTEGER) as TotalSeconds,
      CAST(ROUND(SUM(CAST(pa.PlayDuration AS INTEGER)) / 3600.0) AS INTEGER) as TotalHours
    FROM PlaybackActivity pa
    WHERE pa.ItemType = 'Movie'
      AND pa.DateCreated >= '${startDate}'
      AND pa.DateCreated < '${endDate}'
      AND pa.PlayDuration > 0
      AND pa.PlayDuration < 86400
      ${validationClause}
    GROUP BY pa.UserId
    ORDER BY TotalSeconds DESC
  `;
};

/**
 * Build SQL query for user rankings by TV shows watch time
 * @param {number} year - The year to filter by
 * @returns {string} SQL query string
 */
const buildUserRankingShowsQuery = (year) => {
  const { startDate, endDate } = buildYearFilter(year);
  const validationClause = buildPlayValidationClause('pa');
  
  return `
    SELECT
      pa.UserId,
      CAST(SUM(CAST(pa.PlayDuration AS INTEGER)) AS INTEGER) as TotalSeconds,
      CAST(ROUND(SUM(CAST(pa.PlayDuration AS INTEGER)) / 3600.0) AS INTEGER) as TotalHours
    FROM PlaybackActivity pa
    WHERE pa.ItemType = 'Episode'
      AND pa.DateCreated >= '${startDate}'
      AND pa.DateCreated < '${endDate}'
      AND pa.PlayDuration > 0
      AND pa.PlayDuration < 86400
      ${validationClause}
    GROUP BY pa.UserId
    ORDER BY TotalSeconds DESC
  `;
};

module.exports = {
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
};

