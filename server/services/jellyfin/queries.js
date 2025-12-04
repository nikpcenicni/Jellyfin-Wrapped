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
  // Validate access token
  if (!accessToken || typeof accessToken !== 'string' || accessToken.trim().length === 0) {
    throw new Error('Invalid or missing access token. Please re-authenticate.');
  }

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
      let errorMessage = `Jellyfin API error: ${response.status}`;
      
      // Provide more specific error messages for common status codes
      if (response.status === 403) {
        errorMessage = `Access denied (403). This may indicate:
- Your access token has expired. Please log out and log back in.
- Your account doesn't have permission to access User Usage Stats plugin.
- The access token is invalid or malformed.

Original error: ${errorText || 'No additional details'}`;
      } else if (response.status === 401) {
        errorMessage = `Authentication failed (401). Your access token may have expired. Please log out and log back in. Original error: ${errorText || 'No additional details'}`;
      } else {
        errorMessage = `Jellyfin API error: ${response.status} - ${errorText || 'No additional details'}`;
      }
      
      const error = new Error(errorMessage);
      error.statusCode = response.status;
      error.originalError = errorText;
      throw error;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    // If it's already our custom error, just re-throw it
    if (error.statusCode) {
      throw error;
    }
    
    // Otherwise, log and wrap it
    console.error('Query execution error:', error);
    throw error;
  }
}

module.exports = {
  executeQuery,
  executeQueryForUser,
};

