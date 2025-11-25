const sqlite3 = require('sqlite3').verbose();
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
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('[Cache DB] Error opening database:', err);
        reject(err);
        return;
      }
      console.log('[Cache DB] Connected to SQLite database');
      
      // Create tables
      db.serialize(() => {
        db.run(`
          CREATE TABLE IF NOT EXISTS stats_cache (
            cache_key TEXT PRIMARY KEY,
            stat_type TEXT NOT NULL,
            year INTEGER NOT NULL,
            user_id TEXT,
            data TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            expires_at INTEGER NOT NULL
          )
        `, (err) => {
          if (err) {
            console.error('[Cache DB] Error creating table:', err);
            reject(err);
            return;
          }
          
          // Create indexes
          db.run(`
            CREATE INDEX IF NOT EXISTS idx_stat_type_year 
            ON stats_cache(stat_type, year, user_id)
          `, (err) => {
            if (err) {
              console.error('[Cache DB] Error creating index:', err);
            }
            
            // Clean up expired entries
            cleanupExpiredEntries();
            resolve();
          });
        });
      });
    });
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
    
    const cacheKey = getCacheKey(statType, year, userId);
    const now = Date.now();
    
    db.get(
      'SELECT data, expires_at FROM stats_cache WHERE cache_key = ? AND expires_at > ?',
      [cacheKey, now],
      (err, row) => {
        if (err) {
          console.error('[Cache DB] Error reading cache:', err);
          resolve(null);
          return;
        }
        
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
      }
    );
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
    
    const cacheKey = getCacheKey(statType, year, userId);
    const now = Date.now();
    const expiresAt = now + (ttlDays * 24 * 60 * 60 * 1000);
    const dataStr = JSON.stringify(data);
    
    db.run(
      `INSERT OR REPLACE INTO stats_cache (cache_key, stat_type, year, user_id, data, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cacheKey, statType, year, userId, dataStr, now, expiresAt],
      (err) => {
        if (err) {
          console.error('[Cache DB] Error writing cache:', err);
          reject(err);
          return;
        }
        resolve();
      }
    );
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
    
    const cacheKey = getCacheKey(statType, year, userId);
    
    db.run(
      'DELETE FROM stats_cache WHERE cache_key = ?',
      [cacheKey],
      (err) => {
        if (err) {
          console.error('[Cache DB] Error invalidating cache:', err);
          reject(err);
          return;
        }
        resolve();
      }
    );
  });
}

/**
 * Clean up expired entries
 */
function cleanupExpiredEntries() {
  if (!db) return;
  
  const now = Date.now();
  db.run(
    'DELETE FROM stats_cache WHERE expires_at <= ?',
    [now],
    (err) => {
      if (err) {
        console.error('[Cache DB] Error cleaning up expired entries:', err);
      } else {
        db.get('SELECT changes() as count', (err, row) => {
          if (!err && row && row.count > 0) {
            console.log(`[Cache DB] Cleaned up ${row.count} expired entries`);
          }
        });
      }
    }
  );
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
    
    const now = Date.now();
    db.get(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN expires_at <= ? THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN expires_at > ? THEN 1 ELSE 0 END) as valid
       FROM stats_cache`,
      [now, now],
      (err, row) => {
        if (err) {
          console.error('[Cache DB] Error getting cache stats:', err);
          resolve({ total: 0, expired: 0, valid: 0 });
          return;
        }
        resolve({
          total: row.total || 0,
          expired: row.expired || 0,
          valid: row.valid || 0
        });
      }
    );
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
    
    db.close((err) => {
      if (err) {
        console.error('[Cache DB] Error closing database:', err);
        reject(err);
        return;
      }
      console.log('[Cache DB] Database connection closed');
      db = null;
      resolve();
    });
  });
}

// Run cleanup every hour
setInterval(cleanupExpiredEntries, 60 * 60 * 1000);

module.exports = {
  initDatabase,
  getCache,
  setCache,
  invalidateCache,
  cleanupExpiredEntries,
  getCacheStats,
  closeDatabase
};

