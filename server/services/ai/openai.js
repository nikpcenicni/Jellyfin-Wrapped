const config = require('../../config');

// OpenAI client (only initialize if API key is available)
let openai = null;
if (config.openai.apiKey) {
  try {
    const OpenAI = require('openai');
    openai = new OpenAI({
      apiKey: config.openai.apiKey
    });
  } catch (error) {
    console.warn('OpenAI package not available:', error.message);
  }
}

/**
 * Generate creative intro messages using OpenAI
 * @param {Object} stats - Statistics object
 * @param {string} useCase - Use case ('global', 'server', 'personal', 'user', 'family')
 * @returns {Promise<Array<string>|null>} Array of 4 intro messages or null
 */
async function generateIntroMessages(stats, useCase = 'global') {
  if (!openai || !config.openai.apiKey) {
    return null;
  }

  try {
    const totalWatchTime = stats.totalWatchTime?.[0] || {};
    const totalHours = totalWatchTime.TotalHours || 0;
    const totalPlays = totalWatchTime.TotalPlays || 0;
    const uniqueItems = totalWatchTime.UniqueItems || 0;
    const year = stats.year || new Date().getFullYear();

    // Different prompts for different use cases
    let contextDescription = '';
    let perspective = '';
    let tone = '';

    switch (useCase) {
      case 'global':
      case 'server':
        contextDescription = 'server-wide statistics that represent all users on the media server';
        perspective = 'the entire community';
        tone = 'celebratory and inclusive, emphasizing the collective viewing experience';
        break;
      case 'personal':
      case 'user':
        contextDescription = 'personal viewing statistics for a single user';
        perspective = 'you';
        tone = 'personal and reflective, celebrating individual viewing habits and preferences';
        break;
      case 'family':
        contextDescription = 'family viewing statistics that represent all family members';
        perspective = 'your family';
        tone = 'warm and family-oriented, highlighting shared viewing experiences';
        break;
      default:
        // Default to global
        contextDescription = 'server-wide statistics that represent all users on the media server';
        perspective = 'the entire community';
        tone = 'celebratory and inclusive, emphasizing the collective viewing experience';
    }

    const prompt = `You are creating creative, engaging intro messages for a "Year in Review" statistics page (similar to Spotify Wrapped) for a media server. 

This is for ${contextDescription}. The perspective should be from ${perspective}'s point of view. The tone should be ${tone}.

Generate 4 short, creative, and fun messages that will be displayed sequentially to introduce ${perspective}'s viewing statistics for ${year}. Each message should be:
- 1-2 sentences maximum
- Creative, engaging, and celebratory
- Include the actual statistics naturally
- Have personality and energy
- Be appropriate for all ages
- Match the ${useCase} context (${contextDescription})

Statistics to include:
- Total watch time: ${totalHours} hours
- Total plays: ${totalPlays.toLocaleString()} plays
- Unique items watched: ${uniqueItems.toLocaleString()} items

Return a JSON object with a "messages" array containing exactly 4 strings. Example format:
{"messages": ["First creative message about the year", "Second message with watch time", "Third message about plays", "Fourth message about unique items"]}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a creative copywriter specializing in engaging, fun statistics presentations. Always return valid JSON objects with a "messages" array containing exactly 4 strings. Adapt your writing style to match the use case context (global/server-wide vs personal vs family).'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 400,
      response_format: { type: 'json_object' }
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      return null;
    }

    // Parse the JSON response
    const parsed = JSON.parse(responseText);
    
    // Handle different possible response formats
    let messages = null;
    if (Array.isArray(parsed)) {
      messages = parsed;
    } else if (parsed.messages && Array.isArray(parsed.messages)) {
      messages = parsed.messages;
    } else if (parsed.intro && Array.isArray(parsed.intro)) {
      messages = parsed.intro;
    } else {
      // Try to find any array in the response
      const values = Object.values(parsed);
      const arrayValue = values.find(v => Array.isArray(v));
      if (arrayValue) {
        messages = arrayValue;
      }
    }

    // Validate we have exactly 4 messages
    if (messages && Array.isArray(messages) && messages.length >= 4) {
      return messages.slice(0, 4);
    }

    return null;
  } catch (error) {
    console.error('Error generating intro messages with OpenAI:', error.message);
    return null;
  }
}

module.exports = {
  generateIntroMessages,
};

