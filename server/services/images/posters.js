const config = require('../../config');
const { getItemDetails, getShowIdFromEpisode } = require('../jellyfin/items');
// Using native fetch (available in Node 20+)

/**
 * Get poster URL using ItemId directly
 * Returns proxy URL that our backend will handle
 * @param {string} itemId - Item ID
 * @param {string} itemType - Item type (Movie, Series, Episode)
 * @returns {Promise<string|null>} Poster URL or null
 */
async function getItemPosterUrlByItemId(itemId, itemType) {
  try {
    if (!itemId) {
      return null;
    }
    
    let targetItemId = itemId;
    let item = null;
    let imageType = 'Primary';
    let imageTag = null;
    
    // For TV shows aggregated from episodes, we need to get the actual show ID
    if (itemType === 'Series' || itemType === 'Episode') {
      // Try to get show ID if this is an episode ID
      const showId = await getShowIdFromEpisode(itemId);
      if (showId) {
        targetItemId = showId;
        item = await getItemDetails(showId);
      } else {
        // If traversal failed, try the original itemId
        item = await getItemDetails(itemId);
      }
    } else {
      // For movies, get item details directly
      item = await getItemDetails(targetItemId);
    }

    // Try to get image from the item itself
    if (item) {
      // Check if item has ImageTags with Primary image
      if (item.ImageTags && item.ImageTags.Primary) {
        imageTag = item.ImageTags.Primary;
        imageType = 'Primary';
      } else if (item.ImageTags) {
        // If no primary image, try other image types
        const imageTypes = ['Backdrop', 'Thumb', 'Logo'];
        for (const imgType of imageTypes) {
          if (item.ImageTags[imgType]) {
            imageTag = item.ImageTags[imgType];
            imageType = imgType;
            break;
          }
        }
      }
      
      // Use our proxy endpoint instead of direct Jellyfin URL
      // Proxy will handle authentication properly
      const proxyParams = new URLSearchParams({
        itemId: targetItemId,
        imageType: imageType,
        maxWidth: '300',
        quality: '90'
      });
      
      if (imageTag) {
        proxyParams.set('tag', imageTag);
      }
      
      const proxyUrl = `/api/image?${proxyParams.toString()}`;
      return proxyUrl;
    }
    
    return null;
  } catch (error) {
    console.error(`[getItemPosterUrlByItemId] Error getting poster for item ${itemId}:`, error.message);
    return null;
  }
}

/**
 * Get poster URL from TMDB (The Movie Database) or fallback to Jellyfin
 * @param {string} itemId - Item ID
 * @param {string} itemName - Item name
 * @param {string} itemType - Item type (Movie, Series, Episode)
 * @returns {Promise<string|null>} Poster URL or null
 */
async function getItemPosterUrl(itemId, itemName, itemType) {
  try {
    const searchName = itemName || '';
    
    // Clean up the name - remove episode info for TV shows
    let cleanName = searchName.split(' - s')[0].trim();
    cleanName = cleanName.replace(/\s*\([0-9]{4}\).*$/, '').trim();
    
    // Determine media type
    const isMovie = itemType === 'Movie';
    const isTvShow = itemType === 'Series' || itemType === 'Episode';
    
    // First, try to get poster directly from Jellyfin using ItemId
    if (itemId) {
      try {
        const jellyfinUrl = await getItemPosterUrlByItemId(itemId, itemType);
        if (jellyfinUrl) {
          return jellyfinUrl;
        }
      } catch (error) {
        console.error(`[getItemPosterUrl] Error getting Jellyfin poster for ${itemId}:`, error.message);
      }
    }
    
    // Try TMDB if API key is available
    if (config.tmdb.apiKey) {
      try {
        const mediaType = isMovie ? 'movie' : 'tv';
        const searchUrl = `https://api.themoviedb.org/3/search/${mediaType}?api_key=${config.tmdb.apiKey}&query=${encodeURIComponent(cleanName)}&language=en-US&page=1`;
        
        const response = await fetch(searchUrl, {
          method: 'GET',
          headers: {
            'accept': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.results && data.results.length > 0) {
            // Try to find exact match first (case-insensitive)
            let result = data.results.find(r => {
              const resultName = (r.title || r.name || '').toLowerCase();
              return resultName === cleanName.toLowerCase();
            });
            
            // If no exact match, use first result with poster
            if (!result || !result.poster_path) {
              result = data.results.find(r => r.poster_path) || data.results[0];
            }
            
            if (result && result.poster_path) {
              // TMDB image base URL - w300 is 300px width
              return `https://image.tmdb.org/t/p/w300${result.poster_path}`;
            }
          }
        }
      } catch (tmdbError) {
        console.error(`TMDB search failed for ${cleanName}:`, tmdbError.message);
      }
    }
    
    // Final fallback: Try Jellyfin search by name
    try {
      const headers = {
        'accept': 'application/json',
        'X-Emby-Token': config.jellyfin.apiKey
      };

      const searchQuery = encodeURIComponent(cleanName);
      const searchType = isMovie ? 'Movie' : 'Series';
      
      const response = await fetch(`${config.jellyfin.serverUrl}/Items?SearchTerm=${searchQuery}&IncludeItemTypes=${searchType}&Limit=1`, {
        method: 'GET',
        headers: headers
      });

      if (response.ok) {
        const searchResult = await response.json();
        if (searchResult.Items && searchResult.Items.length > 0) {
          const item = searchResult.Items.find(i => 
            i.Name.toLowerCase() === cleanName.toLowerCase()
          ) || searchResult.Items[0];
          
          if (item && item.ImageTags && item.ImageTags.Primary) {
            const imageTag = item.ImageTags.Primary;
            // Use proxy endpoint for authenticated image access
            const proxyParams = new URLSearchParams({
              itemId: item.Id,
              imageType: 'Primary',
              tag: imageTag,
              maxWidth: '300',
              quality: '90'
            });
            return `/api/image?${proxyParams.toString()}`;
          }
        }
      }
    } catch (jellyfinError) {
      // Jellyfin fallback also failed
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Enrich items with poster URLs
 * @param {Array} items - Array of items to enrich
 * @returns {Promise<Array>} Enriched items with PosterUrl property
 */
async function enrichItemsWithPosters(items) {
  // Process items in batches to avoid overwhelming the API
  const batchSize = 3;
  const enrichedItems = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const enrichedBatch = await Promise.all(
      batch.map(async (item) => {
        const posterUrl = await getItemPosterUrl(item.ItemId, item.ItemName || item.SeriesName, item.ItemType);
        return {
          ...item,
          PosterUrl: posterUrl
        };
      })
    );
    enrichedItems.push(...enrichedBatch);
    
    // Small delay between batches to avoid overwhelming the API
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return enrichedItems;
}

module.exports = {
  getItemPosterUrl,
  getItemPosterUrlByItemId,
  enrichItemsWithPosters,
};

