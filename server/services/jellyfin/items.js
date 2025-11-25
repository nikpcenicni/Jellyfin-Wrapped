const config = require('../../config');
const { getUserId } = require('./users');
// Using native fetch (available in Node 20+)

/**
 * Get item details by ItemId from Jellyfin
 * @param {string} itemId - Item ID
 * @returns {Promise<Object|null>} Item details or null if not found
 */
async function getItemDetails(itemId) {
  try {
    if (!itemId || !config.jellyfin.serverUrl || !config.jellyfin.apiKey) {
      console.log(`[getItemDetails] Missing required params - itemId: ${!!itemId}, server: ${!!config.jellyfin.serverUrl}, key: ${!!config.jellyfin.apiKey}`);
      return null;
    }

    // Get userId - required by Jellyfin API
    const userId = await getUserId();
    if (!userId) {
      console.error(`[getItemDetails] Cannot fetch item without userId`);
      return null;
    }

    const headers = {
      'accept': 'application/json',
      'X-Emby-Token': config.jellyfin.apiKey
    };

    // Include userId as query parameter per API docs
    const url = `${config.jellyfin.serverUrl}/Items/${itemId}?userId=${userId}`;
    console.log(`[getItemDetails] Fetching item: ${itemId} with userId: ${userId}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });

    console.log(`[getItemDetails] Response status: ${response.status} for ${itemId}`);
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log(`[getItemDetails] Success - Item: ${data.Name || 'Unknown'}, Type: ${data.Type}, HasImageTags: ${!!data.ImageTags}`);
        return data;
      } else {
        console.log(`[getItemDetails] Unexpected content-type: ${contentType} for ${itemId}`);
      }
    } else if (response.status === 404) {
      // Item not found - this is expected for some items
      console.log(`[getItemDetails] Item not found (404): ${itemId}`);
      return null;
    } else {
      // Log unexpected errors but don't fail loudly
      const errorText = await response.text().catch(() => 'Unable to read error');
      console.error(`[getItemDetails] Jellyfin API returned ${response.status} for item ${itemId}: ${errorText.substring(0, 100)}`);
      return null;
    }
    return null;
  } catch (error) {
    // Network or other errors - log but don't fail
    console.error(`[getItemDetails] Error fetching item details for ${itemId}:`, error.message);
    return null;
  }
}

/**
 * Get show ID from episode ID (traverse Episode → Season → Show)
 * @param {string} episodeId - Episode ID
 * @returns {Promise<string|null>} Show ID or null if not found
 */
async function getShowIdFromEpisode(episodeId) {
  try {
    // Get episode details
    const episode = await getItemDetails(episodeId);
    if (!episode || !episode.ParentId) return null;

    // Get season details
    const season = await getItemDetails(episode.ParentId);
    if (!season || !season.ParentId) return null;

    // Return show ID
    return season.ParentId;
  } catch (error) {
    return null;
  }
}

module.exports = {
  getItemDetails,
  getShowIdFromEpisode,
};

