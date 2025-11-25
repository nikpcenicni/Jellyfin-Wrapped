/**
 * SQL Query Builders for Jellyfin User Usage Stats
 * These functions build SQL queries for fetching statistics from the PlaybackActivity table
 */

const TOP_ITEMS_LIMIT = 10;

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
 * Build SQL query for top movies
 * @param {number} year - The year to filter by
 * @param {string|null} userId - Optional user ID to filter by (for personalized stats)
 * @returns {string} SQL query string
 */
const buildTopMoviesQuery = (year, userId = null) => {
  const { startDate, endDate } = buildYearFilter(year);
  const userFilter = userId ? `AND UserId = '${userId}'` : '';
  
  return `
    SELECT
      ItemId,
      ItemName,
      ItemType,
      COUNT(*) as PlayCount,
      CAST(SUM(CAST(PlayDuration AS INTEGER)) AS INTEGER) as TotalPlayDuration,
      (COUNT(*) + CAST(SUM(CAST(PlayDuration AS INTEGER)) AS REAL) / 3600.0) as CombinedScore
    FROM PlaybackActivity
    WHERE ItemType = 'Movie'
      ${userFilter}
      AND DateCreated >= '${startDate}'
      AND DateCreated < '${endDate}'
      AND PlayDuration > 0
      AND PlayDuration < 86400
    GROUP BY ItemId, ItemName, ItemType
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
  const userFilter = userId ? `AND UserId = '${userId}'` : '';
  
  return `
    SELECT
      TRIM(SUBSTR(ItemName, 1, INSTR(ItemName || ' - s', ' - s') - 1)) as SeriesName,
      COUNT(*) as PlayCount,
      CAST(SUM(CAST(PlayDuration AS INTEGER)) AS INTEGER) as TotalPlayDuration,
      MIN(ItemId) as ItemId,
      'Series' as ItemType,
      (COUNT(*) + CAST(SUM(CAST(PlayDuration AS INTEGER)) AS REAL) / 3600.0) as CombinedScore
    FROM PlaybackActivity
    WHERE ItemType = 'Episode'
      ${userFilter}
      AND DateCreated >= '${startDate}'
      AND DateCreated < '${endDate}'
      AND PlayDuration > 0
      AND PlayDuration < 86400
      AND ItemName LIKE '% - s%'
    GROUP BY TRIM(SUBSTR(ItemName, 1, INSTR(ItemName || ' - s', ' - s') - 1))
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
  const userFilter = userId ? `AND UserId = '${userId}'` : '';
  
  return `
    SELECT
      strftime('%Y-%m', DateCreated) as Month,
      COUNT(*) as PlayCount,
      CAST(SUM(CAST(PlayDuration AS INTEGER)) AS INTEGER) as TotalSeconds
    FROM PlaybackActivity
    WHERE DateCreated >= '${startDate}'
      AND DateCreated < '${endDate}'
      ${userFilter}
      AND PlayDuration > 0
      AND PlayDuration < 86400
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
  const userFilter = userId ? `AND UserId = '${userId}'` : '';
  
  return `
    SELECT
      COUNT(DISTINCT ItemId) as UniqueItems,
      COUNT(*) as TotalPlays,
      CAST(SUM(CAST(PlayDuration AS INTEGER)) AS INTEGER) as TotalSeconds,
      CAST(SUM(CAST(PlayDuration AS INTEGER)) / 60.0 AS INTEGER) as TotalMinutes,
      CAST(SUM(CAST(PlayDuration AS INTEGER)) / 3600.0 AS INTEGER) as TotalHours
    FROM PlaybackActivity
    WHERE DateCreated >= '${startDate}'
      AND DateCreated < '${endDate}'
      ${userFilter}
      AND PlayDuration > 0
      AND PlayDuration < 86400
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
  const userFilter = userId ? `AND UserId = '${userId}'` : '';
  
  return `
    SELECT
      CASE 
        WHEN ItemType = 'Movie' THEN 'Movies'
        WHEN ItemType = 'Episode' THEN 'Shows'
        ELSE ItemType
      END as MediaType,
      COUNT(*) as PlayCount,
      COUNT(DISTINCT ItemId) as UniqueItems,
      CAST(SUM(CAST(PlayDuration AS INTEGER)) AS INTEGER) as TotalSeconds,
      CAST(SUM(CAST(PlayDuration AS INTEGER)) / 3600.0 AS INTEGER) as TotalHours
    FROM PlaybackActivity
    WHERE DateCreated >= '${startDate}'
      AND DateCreated < '${endDate}'
      ${userFilter}
      AND PlayDuration > 0
      AND PlayDuration < 86400
      AND (ItemType = 'Movie' OR ItemType = 'Episode')
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
  const userFilter = userId ? `AND UserId = '${userId}'` : '';
  
  return `
    SELECT DISTINCT
      ItemId,
      ItemName,
      COUNT(*) as PlayCount
    FROM PlaybackActivity
    WHERE ItemType = 'Movie'
      ${userFilter}
      AND DateCreated >= '${startDate}'
      AND DateCreated < '${endDate}'
      AND PlayDuration > 0
      AND PlayDuration < 86400
    GROUP BY ItemId, ItemName
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
  const userFilter = userId ? `AND UserId = '${userId}'` : '';
  
  return `
    SELECT DISTINCT
      ItemId,
      ItemName,
      COUNT(*) as PlayCount
    FROM PlaybackActivity
    WHERE ItemType = 'Movie'
      ${userFilter}
      AND DateCreated >= '${startDate}'
      AND DateCreated < '${endDate}'
      AND PlayDuration > 0
      AND PlayDuration < 86400
    GROUP BY ItemId, ItemName
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
  
  return `
    SELECT
      UserId,
      CAST(SUM(CAST(PlayDuration AS INTEGER)) AS INTEGER) as TotalSeconds,
      CAST(SUM(CAST(PlayDuration AS INTEGER)) / 3600.0 AS INTEGER) as TotalHours
    FROM PlaybackActivity
    WHERE DateCreated >= '${startDate}'
      AND DateCreated < '${endDate}'
      AND PlayDuration > 0
      AND PlayDuration < 86400
    GROUP BY UserId
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
  
  return `
    SELECT
      UserId,
      CAST(SUM(CAST(PlayDuration AS INTEGER)) AS INTEGER) as TotalSeconds,
      CAST(SUM(CAST(PlayDuration AS INTEGER)) / 3600.0 AS INTEGER) as TotalHours
    FROM PlaybackActivity
    WHERE ItemType = 'Movie'
      AND DateCreated >= '${startDate}'
      AND DateCreated < '${endDate}'
      AND PlayDuration > 0
      AND PlayDuration < 86400
    GROUP BY UserId
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
  
  return `
    SELECT
      UserId,
      CAST(SUM(CAST(PlayDuration AS INTEGER)) AS INTEGER) as TotalSeconds,
      CAST(SUM(CAST(PlayDuration AS INTEGER)) / 3600.0 AS INTEGER) as TotalHours
    FROM PlaybackActivity
    WHERE ItemType = 'Episode'
      AND DateCreated >= '${startDate}'
      AND DateCreated < '${endDate}'
      AND PlayDuration > 0
      AND PlayDuration < 86400
    GROUP BY UserId
    ORDER BY TotalSeconds DESC
  `;
};

module.exports = {
  buildYearFilter,
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

