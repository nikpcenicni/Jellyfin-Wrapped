const config = require('../../config');
const fetch = globalThis.fetch || require('node-fetch');

// Cache for user ID - we'll fetch it once and reuse it
let cachedUserId = null;

/**
 * Get a user ID from Jellyfin (for server-wide queries, get first user)
 * @returns {Promise<string|null>} User ID or null if not found
 */
async function getUserId() {
  if (cachedUserId) {
    return cachedUserId;
  }

  try {
    const headers = {
      'accept': 'application/json',
      'X-Emby-Token': config.jellyfin.apiKey
    };

    // Get all users - we'll use the first one for item lookups
    const response = await fetch(`${config.jellyfin.serverUrl}/Users`, {
      method: 'GET',
      headers: headers
    });

    if (response.ok) {
      const users = await response.json();
      if (users && users.length > 0) {
        cachedUserId = users[0].Id;
        console.log(`[getUserId] Cached userId: ${cachedUserId}`);
        return cachedUserId;
      }
    }
    console.error(`[getUserId] Failed to get userId - status: ${response.status}`);
    return null;
  } catch (error) {
    console.error(`[getUserId] Error fetching userId:`, error.message);
    return null;
  }
}

module.exports = {
  getUserId,
};

