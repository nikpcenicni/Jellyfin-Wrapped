const config = require('../../config');

// Helper function to check if API key is valid (non-empty string)
function hasValidApiKey() {
  return config.openai.apiKey && typeof config.openai.apiKey === 'string' && config.openai.apiKey.trim().length > 0;
}

// OpenAI client (only initialize if API key is available and valid)
let openai = null;
if (hasValidApiKey()) {
  try {
    const OpenAI = require('openai');
    openai = new OpenAI({
      apiKey: config.openai.apiKey
    });
  } catch (error) {
    console.warn('OpenAI package not available:', error.message);
  }
}

// Static fallback messages when OpenAI API key is not available
const FALLBACK_MESSAGES = {
  global: [
    [
      "Time to unwrap the year! 🎬",
      (stats) => `Your server binged ${stats.totalHours} hours of pure entertainment. That's like watching the entire Lord of the Rings trilogy ${Math.floor(stats.totalHours / 9)} times!`,
      (stats) => `${stats.totalPlays.toLocaleString()} plays later, and we're still not tired.`,
      (stats) => `From blockbusters to hidden gems, ${stats.uniqueItems.toLocaleString()} unique titles made this year unforgettable.`
    ],
    [
      "Lights, camera, statistics! 📊",
      (stats) => `The community collectively watched ${stats.totalHours} hours of content. That's more screen time than a Netflix executive's dream!`,
      (stats) => `With ${stats.totalPlays.toLocaleString()} plays, your server was basically a 24/7 cinema.`,
      (stats) => `${stats.uniqueItems.toLocaleString()} different titles explored. Talk about variety!`
    ],
    [
      "Ready for your year in review? 🎉",
      (stats) => `${stats.totalHours} hours of watch time! That's enough to watch every episode of The Office ${Math.floor(stats.totalHours / 100)} times.`,
      (stats) => `Your server hit play ${stats.totalPlays.toLocaleString()} times. The remote control deserves a raise!`,
      (stats) => `${stats.uniqueItems.toLocaleString()} unique items means you never ran out of options.`
    ],
    [
      "Drumroll please... 🥁",
      (stats) => `This year, your server logged ${stats.totalHours} hours of viewing. That's basically a part-time job in entertainment!`,
      (stats) => `${stats.totalPlays.toLocaleString()} plays across the board. The binge is strong with this one.`,
      (stats) => `From classics to new releases, ${stats.uniqueItems.toLocaleString()} titles kept everyone entertained.`
    ],
    [
      "Let's dive into the data! 🌊",
      (stats) => `${stats.totalHours} hours of content consumed. Your server is basically a professional couch potato!`,
      (stats) => `With ${stats.totalPlays.toLocaleString()} plays, you've mastered the art of the perfect binge.`,
      (stats) => `${stats.uniqueItems.toLocaleString()} unique items watched. Variety is the spice of streaming life!`
    ],
    [
      "Time to see what you've been up to! 👀",
      (stats) => `${stats.totalHours} hours of watch time! That's more hours than there are in a month.`,
      (stats) => `Your server pressed play ${stats.totalPlays.toLocaleString()} times. The dedication is real!`,
      (stats) => `${stats.uniqueItems.toLocaleString()} different titles explored. Your watchlist is probably still growing!`
    ]
  ],
  personal: [
    [
      "Your year in entertainment starts now! 🎬",
      (stats) => `You watched ${stats.totalHours} hours of content. That's dedication (and maybe a few late nights)!`,
      (stats) => `${stats.totalPlays.toLocaleString()} plays means you're basically a professional viewer.`,
      (stats) => `${stats.uniqueItems.toLocaleString()} unique titles? Your taste is as diverse as it gets!`
    ],
    [
      "Let's see what you've been watching! 👀",
      (stats) => `${stats.totalHours} hours of pure entertainment. Your couch has seen some things this year!`,
      (stats) => `You hit play ${stats.totalPlays.toLocaleString()} times. The remote control is your best friend.`,
      (stats) => `${stats.uniqueItems.toLocaleString()} different titles explored. You're a true content connoisseur!`
    ],
    [
      "Time to reveal your viewing habits! 🎉",
      (stats) => `${stats.totalHours} hours watched. That's more screen time than a movie theater projector!`,
      (stats) => `With ${stats.totalPlays.toLocaleString()} plays, you've mastered the art of the perfect binge session.`,
      (stats) => `${stats.uniqueItems.toLocaleString()} unique items means you never stuck to just one genre.`
    ],
    [
      "Ready to see your stats? 📊",
      (stats) => `You logged ${stats.totalHours} hours of watch time. That's impressive (and maybe slightly concerning)!`,
      (stats) => `${stats.totalPlays.toLocaleString()} plays later, and you're still going strong.`,
      (stats) => `${stats.uniqueItems.toLocaleString()} different titles watched. Your watchlist is probably still infinite!`
    ],
    [
      "Your entertainment journey awaits! 🌟",
      (stats) => `${stats.totalHours} hours of content consumed. You're basically a streaming superhero!`,
      (stats) => `You pressed play ${stats.totalPlays.toLocaleString()} times. The dedication is unmatched!`,
      (stats) => `${stats.uniqueItems.toLocaleString()} unique titles explored. Variety? You've got it covered!`
    ],
    [
      "Let's unwrap your viewing year! 🎁",
      (stats) => `${stats.totalHours} hours watched. That's enough time to watch every Marvel movie ${Math.floor(stats.totalHours / 50)} times!`,
      (stats) => `Your play count hit ${stats.totalPlays.toLocaleString()}. The binge is real!`,
      (stats) => `${stats.uniqueItems.toLocaleString()} different titles means you're never bored.`
    ]
  ],
  family: [
    [
      "Time to see what the family watched! 👨‍👩‍👧‍👦",
      (stats) => `Your family collectively watched ${stats.totalHours} hours of content. That's a lot of family time!`,
      (stats) => `With ${stats.totalPlays.toLocaleString()} plays, your family knows how to pick the perfect show.`,
      (stats) => `${stats.uniqueItems.toLocaleString()} unique titles means everyone found something they loved.`
    ],
    [
      "The family viewing report is here! 🎬",
      (stats) => `${stats.totalHours} hours of family entertainment. That's more bonding time than a family reunion!`,
      (stats) => `Your family hit play ${stats.totalPlays.toLocaleString()} times. The remote control got a workout!`,
      (stats) => `${stats.uniqueItems.toLocaleString()} different titles watched. From kids' shows to dramas, you covered it all!`
    ],
    [
      "Let's see what kept the family entertained! 🎉",
      (stats) => `The family logged ${stats.totalHours} hours of watch time. That's quality time well spent!`,
      (stats) => `${stats.totalPlays.toLocaleString()} plays across the household. The TV was never lonely!`,
      (stats) => `${stats.uniqueItems.toLocaleString()} unique titles explored. Everyone's tastes were well represented!`
    ],
    [
      "Your family's year in review! 📺",
      (stats) => `${stats.totalHours} hours of content consumed together. That's what family time looks like!`,
      (stats) => `With ${stats.totalPlays.toLocaleString()} plays, your family knows how to keep the entertainment flowing.`,
      (stats) => `${stats.uniqueItems.toLocaleString()} different titles means there was something for everyone.`
    ],
    [
      "Time to celebrate family viewing! 🎊",
      (stats) => `Your family watched ${stats.totalHours} hours of content. That's a lot of shared moments!`,
      (stats) => `The family pressed play ${stats.totalPlays.toLocaleString()} times. The entertainment never stopped!`,
      (stats) => `${stats.uniqueItems.toLocaleString()} unique titles explored. From cartoons to thrillers, you did it all!`
    ],
    [
      "Let's see what the family binged! 🍿",
      (stats) => `${stats.totalHours} hours of family entertainment. That's more hours than a family vacation!`,
      (stats) => `Your family hit ${stats.totalPlays.toLocaleString()} plays. The couch was well-loved this year!`,
      (stats) => `${stats.uniqueItems.toLocaleString()} different titles watched. Variety is the spice of family life!`
    ]
  ]
};

/**
 * Get fallback messages when OpenAI is not available
 * @param {Object} stats - Statistics object
 * @param {string} useCase - Use case ('global', 'server', 'personal', 'user', 'family')
 * @returns {Array<string>} Array of 4 intro messages
 */
function getFallbackMessages(stats, useCase = 'global') {
  // Normalize use case
  let normalizedUseCase = useCase;
  if (useCase === 'server') {
    normalizedUseCase = 'global';
  } else if (useCase === 'user') {
    normalizedUseCase = 'personal';
  }

  const messageSets = FALLBACK_MESSAGES[normalizedUseCase] || FALLBACK_MESSAGES.global;
  
  // Randomly select a message set
  const selectedSet = messageSets[Math.floor(Math.random() * messageSets.length)];
  
  // Extract stats
  const totalWatchTime = stats.totalWatchTime?.[0] || {};
  const totalHours = totalWatchTime.TotalHours || 0;
  const totalPlays = totalWatchTime.TotalPlays || 0;
  const uniqueItems = totalWatchTime.UniqueItems || 0;
  
  const statsObj = {
    totalHours: Math.round(totalHours),
    totalPlays: totalPlays,
    uniqueItems: uniqueItems
  };
  
  // Process each message template
  return selectedSet.map(template => {
    if (typeof template === 'function') {
      return template(statsObj);
    }
    return template; // Static string
  });
}

/**
 * Generate creative intro messages using OpenAI (or return static messages by default)
 * @param {Object} stats - Statistics object
 * @param {string} useCase - Use case ('global', 'server', 'personal', 'user', 'family')
 * @returns {Promise<Array<string>>} Array of 4 intro messages
 */
async function generateIntroMessages(stats, useCase = 'global') {
  // Default to static messages - only use OpenAI if a valid key is provided
  if (!hasValidApiKey() || !openai) {
    return getFallbackMessages(stats, useCase);
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
      // Fall back to static messages if OpenAI returns no content
      return getFallbackMessages(stats, useCase);
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

    // If OpenAI response is invalid, fall back to static messages
    return getFallbackMessages(stats, useCase);
  } catch (error) {
    console.error('Error generating intro messages with OpenAI:', error.message);
    // Fall back to static messages on error
    return getFallbackMessages(stats, useCase);
  }
}

module.exports = {
  generateIntroMessages,
};

