const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(process.cwd(), 'data', 'stats_cache.db');
const DB_DIR = path.dirname(DB_PATH);

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let db = null;

/**
 * Initialize the SQLite database
 */
function initDatabase() {
  return new Promise((resolve, reject) => {
    try {
      db = new Database(DB_PATH);
      console.log('[Cache DB] Connected to SQLite database');
      
      // Create tables
      db.exec(`
        CREATE TABLE IF NOT EXISTS stats_cache (
          cache_key TEXT PRIMARY KEY,
          stat_type TEXT NOT NULL,
          year INTEGER NOT NULL,
          user_id TEXT,
          data TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL
        );
        
        CREATE INDEX IF NOT EXISTS idx_stat_type_year 
        ON stats_cache(stat_type, year, user_id);
      `);
      
      // Clean up expired entries
      cleanupExpiredEntries();
      resolve();
    } catch (err) {
      console.error('[Cache DB] Error initializing database:', err);
      reject(err);
    }
  });
}

/**
 * Generate cache key
 */
function getCacheKey(statType, year, userId = null) {
  return `${statType}:${year}:${userId || 'global'}`;
}

/**
 * Get cached data
 */
function getCache(statType, year, userId = null) {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve(null);
      return;
    }
    
    try {
      const cacheKey = getCacheKey(statType, year, userId);
      const now = Date.now();
      
      const stmt = db.prepare('SELECT data, expires_at FROM stats_cache WHERE cache_key = ? AND expires_at > ?');
      const row = stmt.get(cacheKey, now);
      
      if (row) {
        try {
          const data = JSON.parse(row.data);
          resolve(data);
        } catch (parseErr) {
          console.error('[Cache DB] Error parsing cached data:', parseErr);
          resolve(null);
        }
      } else {
        resolve(null);
      }
    } catch (err) {
      console.error('[Cache DB] Error reading cache:', err);
      resolve(null);
    }
  });
}

/**
 * Set cache data
 */
function setCache(statType, year, data, userId = null, ttlDays = 30) {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }
    
    try {
      const cacheKey = getCacheKey(statType, year, userId);
      const now = Date.now();
      const expiresAt = now + (ttlDays * 24 * 60 * 60 * 1000);
      const dataStr = JSON.stringify(data);
      
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO stats_cache (cache_key, stat_type, year, user_id, data, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(cacheKey, statType, year, userId, dataStr, now, expiresAt);
      resolve();
    } catch (err) {
      console.error('[Cache DB] Error writing cache:', err);
      reject(err);
    }
  });
}

/**
 * Generate cache key with language support (for wrapped insights)
 */
function getCacheKeyWithLanguage(statType, year, userId = null, language = 'en') {
  return `${statType}:${year}:${userId || 'global'}:${language}`;
}

/**
 * Get cached wrapped insights (with language support)
 */
function getWrappedCache(year, userId = null, language = 'en') {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve(null);
      return;
    }
    
    try {
      const cacheKey = getCacheKeyWithLanguage('wrappedInsights', year, userId, language);
      const now = Date.now();
      
      const stmt = db.prepare('SELECT data, expires_at FROM stats_cache WHERE cache_key = ? AND expires_at > ?');
      const row = stmt.get(cacheKey, now);
      
      if (row) {
        try {
          const data = JSON.parse(row.data);
          resolve(data);
        } catch (parseErr) {
          console.error('[Cache DB] Error parsing cached wrapped data:', parseErr);
          resolve(null);
        }
      } else {
        resolve(null);
      }
    } catch (err) {
      console.error('[Cache DB] Error reading wrapped cache:', err);
      resolve(null);
    }
  });
}

/**
 * Set cached wrapped insights (with language support)
 */
function setWrappedCache(year, data, userId = null, language = 'en', ttlDays = 365) {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }
    
    try {
      const cacheKey = getCacheKeyWithLanguage('wrappedInsights', year, userId, language);
      const now = Date.now();
      const expiresAt = now + (ttlDays * 24 * 60 * 60 * 1000);
      const dataStr = JSON.stringify(data);
      
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO stats_cache (cache_key, stat_type, year, user_id, data, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(cacheKey, 'wrappedInsights', year, userId, dataStr, now, expiresAt);
      resolve();
    } catch (err) {
      console.error('[Cache DB] Error writing wrapped cache:', err);
      reject(err);
    }
  });
}

/**
 * Invalidate cache for a specific stat type, year, and optionally user
 */
function invalidateCache(statType, year, userId = null) {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }
    
    try {
      const cacheKey = getCacheKey(statType, year, userId);
      const stmt = db.prepare('DELETE FROM stats_cache WHERE cache_key = ?');
      stmt.run(cacheKey);
      resolve();
    } catch (err) {
      console.error('[Cache DB] Error invalidating cache:', err);
      reject(err);
    }
  });
}

/**
 * Clean up expired entries
 */
function cleanupExpiredEntries() {
  if (!db) return;
  
  try {
    const now = Date.now();
    const stmt = db.prepare('DELETE FROM stats_cache WHERE expires_at <= ?');
    const info = stmt.run(now);
    
    if (info.changes > 0) {
      console.log(`[Cache DB] Cleaned up ${info.changes} expired entries`);
    }
  } catch (err) {
    console.error('[Cache DB] Error cleaning up expired entries:', err);
  }
}

/**
 * Get cache stats
 */
function getCacheStats() {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve({ total: 0, expired: 0, valid: 0 });
      return;
    }
    
    try {
      const now = Date.now();
      const stmt = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN expires_at <= ? THEN 1 ELSE 0 END) as expired,
          SUM(CASE WHEN expires_at > ? THEN 1 ELSE 0 END) as valid
        FROM stats_cache
      `);
      
      const row = stmt.get(now, now);
      resolve({
        total: row.total || 0,
        expired: row.expired || 0,
        valid: row.valid || 0
      });
    } catch (err) {
      console.error('[Cache DB] Error getting cache stats:', err);
      resolve({ total: 0, expired: 0, valid: 0 });
    }
  });
}

/**
 * Close database connection
 */
function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }
    
    try {
      db.close();
      console.log('[Cache DB] Database connection closed');
      db = null;
      resolve();
    } catch (err) {
      console.error('[Cache DB] Error closing database:', err);
      reject(err);
    }
  });
}

// Run cleanup every hour
setInterval(cleanupExpiredEntries, 60 * 60 * 1000);

module.exports = {
  initDatabase,
  getCache,
  setCache,
  getWrappedCache,
  setWrappedCache,
  invalidateCache,
  cleanupExpiredEntries,
  getCacheStats,
  closeDatabase
};
