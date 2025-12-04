const { invalidateCache } = require('./database');
const config = require('../../config');

// Track if scheduler is already running to prevent duplicates
let schedulerRunning = false;
let currentTimeout = null;

/**
 * Monthly sync job - invalidates cache at the end of each month
 * This ensures fresh data is fetched at the start of the new month
 */
function scheduleMonthlySync() {
  // Prevent multiple schedulers from running simultaneously
  if (schedulerRunning && currentTimeout) {
    console.log('[Cache Sync] Scheduler already running, skipping duplicate call');
    return;
  }
  
  schedulerRunning = true;
  // Calculate time until end of current month
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const timeUntilEndOfMonth = endOfMonth.getTime() - now.getTime();

  console.log(`[Cache Sync] Scheduled monthly sync for ${endOfMonth.toISOString()}`);

  // Maximum safe timeout value (2^31 - 1 milliseconds, ~24.8 days)
  const MAX_TIMEOUT = 2147483647;

  // If the delay exceeds the maximum, schedule a shorter timeout and check again
  if (timeUntilEndOfMonth > MAX_TIMEOUT) {
    // Schedule for maximum safe timeout, then reschedule
    currentTimeout = setTimeout(() => {
      schedulerRunning = false;
      currentTimeout = null;
      scheduleMonthlySync(); // Reschedule to check again
    }, MAX_TIMEOUT);
  } else {
    // Safe to schedule directly
    currentTimeout = setTimeout(() => {
      schedulerRunning = false;
      currentTimeout = null;
      runMonthlySync();
      
      // Schedule next month's sync
      scheduleMonthlySync();
    }, timeUntilEndOfMonth);
  }
}

/**
 * Run monthly sync - invalidate all caches for the current year
 */
async function runMonthlySync() {
  console.log('[Cache Sync] Running monthly sync...');
  
  try {
    const currentYear = new Date().getFullYear();
    const statTypes = [
      'totalWatchTime',
      'monthlyActivity',
      'topMovies',
      'topShows',
      'mediaTypeComparison',
      'topGenres',
      'topMovieYears'
    ];

    // Invalidate cache for current year (global and all users)
    for (const statType of statTypes) {
      // Invalidate global cache
      await invalidateCache(statType, currentYear, null);
      
      // Note: We can't invalidate per-user caches without knowing user IDs
      // The cache will expire naturally after 30 days
      console.log(`[Cache Sync] Invalidated ${statType} for year ${currentYear}`);
    }

    console.log('[Cache Sync] Monthly sync completed');
  } catch (error) {
    console.error('[Cache Sync] Error during monthly sync:', error);
  }
}

/**
 * Manually trigger sync for a specific year
 */
async function syncYear(year) {
  console.log(`[Cache Sync] Manually syncing year ${year}...`);
  
  try {
    const statTypes = [
      'totalWatchTime',
      'monthlyActivity',
      'topMovies',
      'topShows',
      'mediaTypeComparison',
      'topGenres',
      'topMovieYears'
    ];

    for (const statType of statTypes) {
      await invalidateCache(statType, year, null);
      console.log(`[Cache Sync] Invalidated ${statType} for year ${year}`);
    }

    console.log(`[Cache Sync] Manual sync for year ${year} completed`);
  } catch (error) {
    console.error(`[Cache Sync] Error syncing year ${year}:`, error);
    throw error;
  }
}

module.exports = {
  scheduleMonthlySync,
  runMonthlySync,
  syncYear
};

