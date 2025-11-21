/**
 * Transform Jellyfin API response (array of arrays) to array of objects
 * @param {Object} response - Jellyfin API response with results and columns
 * @returns {Array<Object>} Array of transformed objects
 */
function transformToObjects(response) {
  if (!response.results || !Array.isArray(response.results)) {
    return [];
  }
  const columns = response.colums || response.columns || [];
  
  // Define numeric columns that should be converted to numbers
  const numericColumns = [
    'PlayCount', 'TotalPlayDuration', 'TotalSeconds', 'TotalMinutes', 'TotalHours',
    'UniqueItems', 'TotalPlays', 'CombinedScore'
  ];
  
  return response.results.map(row => {
    const obj = {};
    columns.forEach((col, index) => {
      let value = row[index];
      // Convert to number if it's a numeric column and the value exists
      if (numericColumns.includes(col) && value !== null && value !== undefined) {
        value = Number(value);
      }
      obj[col] = value;
    });
    
    // For TV shows aggregated by series, use SeriesName as ItemName
    if (obj.SeriesName) {
      obj.ItemName = obj.SeriesName;
    }
    
    return obj;
  });
}

/**
 * Deduplicate TV shows by normalized series name
 * @param {Array<Object>} shows - Array of show objects
 * @returns {Array<Object>} Deduplicated shows array
 */
function deduplicateShows(shows) {
  const seenSeries = new Map();
  const deduplicatedShows = [];
  
  for (const show of shows) {
    const normalizedName = (show.SeriesName || show.ItemName || '').trim().toLowerCase();
    if (!normalizedName) {
      continue; // Skip entries with no name
    }
    
    if (seenSeries.has(normalizedName)) {
      // If duplicate found, keep the one with higher combined score
      const existing = seenSeries.get(normalizedName);
      if ((show.CombinedScore || 0) > (existing.CombinedScore || 0)) {
        // Replace the existing entry with this better one
        const existingIndex = deduplicatedShows.indexOf(existing);
        if (existingIndex !== -1) {
          deduplicatedShows[existingIndex] = show;
          seenSeries.set(normalizedName, show);
        }
      }
    } else {
      // New series, add it
      seenSeries.set(normalizedName, show);
      deduplicatedShows.push(show);
    }
  }

  // Re-sort after deduplication to ensure correct order
  return deduplicatedShows.sort((a, b) => (b.CombinedScore || 0) - (a.CombinedScore || 0));
}

/**
 * Validate and sanitize user ID for SQL queries
 * @param {string} userId - User ID to validate
 * @returns {{valid: boolean, sanitized?: string, error?: string}} Validation result
 */
function validateAndSanitizeUserId(userId) {
  if (!userId) {
    return { valid: false, error: 'User ID is required' };
  }

  const trimmed = userId.trim();
  
  // Validate userId format (UUID with or without dashes)
  const uuidWithDashes = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const uuidWithoutDashes = /^[0-9a-f]{32}$/i;
  
  const isValidFormat = uuidWithDashes.test(trimmed) || uuidWithoutDashes.test(trimmed);
  
  if (!isValidFormat) {
    console.error(`[Validate UserId] Invalid userId format: "${trimmed}" (length: ${trimmed.length})`);
    return { 
      valid: false, 
      error: 'Invalid user ID format. Expected UUID format (32 hex characters).',
      received: trimmed,
      length: trimmed.length
    };
  }

  // Sanitize userId for SQL (replace any single quotes)
  const sanitized = trimmed.replace(/'/g, "''");
  
  return { valid: true, sanitized };
}

module.exports = {
  transformToObjects,
  deduplicateShows,
  validateAndSanitizeUserId,
};

