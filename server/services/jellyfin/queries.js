const config = require('../../config');
// Using native fetch (available in Node 20+)

/**
 * Execute a query against Jellyfin User Usage Stats plugin
 * @param {string} query - SQL query string
 * @param {boolean} replaceUserId - Whether to anonymize user IDs
 * @returns {Promise<Object>} Query results
 */
async function executeQuery(query, replaceUserId = true) {
  const endpoint = `${config.jellyfin.serverUrl}/user_usage_stats/submit_custom_query`;
  
  const body = {
    CustomQueryString: query,
    ReplaceUserId: replaceUserId
  };

  const headers = {
    'accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Emby-Token': config.jellyfin.apiKey
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jellyfin API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Query execution error:', error);
    throw error;
  }
}

/**
 * Execute a query for a specific user (uses user's access token)
 * @param {string} query - SQL query string
 * @param {string} accessToken - User's access token
 * @returns {Promise<Object>} Query results
 */
async function executeQueryForUser(query, accessToken) {
  const endpoint = `${config.jellyfin.serverUrl}/user_usage_stats/submit_custom_query`;
  
  const body = {
    CustomQueryString: query,
    ReplaceUserId: false // Don't replace user ID for personalized queries
  };

  const headers = {
    'accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Emby-Token': accessToken // Use user's access token
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jellyfin API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Query execution error:', error);
    throw error;
  }
}

module.exports = {
  executeQuery,
  executeQueryForUser,
};

