const config = require('../../config');
const fetch = globalThis.fetch || require('node-fetch');

const CLIENT_NAME = 'Jellyfin Wrapped';
const DEVICE_NAME = 'Web Browser';
const DEVICE_ID = 'jellyfin-wrapped-web';
const VERSION = '1.0.0';

/**
 * Get authorization header value for Jellyfin API
 * @returns {string} Authorization header value
 */
function getAuthorizationHeader() {
  return `MediaBrowser Client="${CLIENT_NAME}", Device="${DEVICE_NAME}", DeviceId="${DEVICE_ID}", Version="${VERSION}"`;
}

/**
 * Authenticate user by username and password
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<Object>} Authentication response with user, accessToken, and sessionInfo
 */
async function authenticateByName(username, password) {
  const endpoint = `${config.jellyfin.serverUrl}/Users/AuthenticateByName`;

  const body = {
    Username: username,
    Pw: password
  };

  const headers = {
    'accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Emby-Authorization': getAuthorizationHeader()
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText };
    }
    throw { status: response.status, data: errorData };
  }

  const data = await response.json();
  return {
    user: {
      id: data.User?.Id,
      name: data.User?.Name,
      serverId: data.ServerId
    },
    accessToken: data.AccessToken,
    sessionInfo: data.SessionInfo
  };
}

/**
 * Initiate Quick Connect
 * @returns {Promise<Object>} Quick Connect response with Secret and Code
 */
async function initiateQuickConnect() {
  const endpoint = `${config.jellyfin.serverUrl}/QuickConnect/Initiate`;

  const headers = {
    'accept': 'application/json',
    'X-Emby-Authorization': getAuthorizationHeader()
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: headers
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw { status: response.status, data: errorText };
  }

  return await response.json();
}

/**
 * Check Quick Connect status
 * @param {string} secret - Quick Connect secret
 * @returns {Promise<Object>} Quick Connect status
 */
async function checkQuickConnectStatus(secret) {
  const endpoint = `${config.jellyfin.serverUrl}/QuickConnect/Connect?secret=${encodeURIComponent(secret)}`;

  const headers = {
    'accept': 'application/json',
    'X-Emby-Authorization': getAuthorizationHeader()
  };

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: headers
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw { status: response.status, data: errorText };
  }

  return await response.json();
}

/**
 * Authenticate with Quick Connect
 * @param {string} secret - Quick Connect secret
 * @returns {Promise<Object>} Authentication response
 */
async function authenticateWithQuickConnect(secret) {
  const endpoint = `${config.jellyfin.serverUrl}/Users/AuthenticateWithQuickConnect`;

  const body = {
    Secret: secret
  };

  const headers = {
    'accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Emby-Authorization': getAuthorizationHeader()
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText };
    }
    throw { status: response.status, data: errorData };
  }

  const data = await response.json();
  return {
    user: {
      id: data.User?.Id,
      name: data.User?.Name,
      serverId: data.ServerId
    },
    accessToken: data.AccessToken,
    sessionInfo: data.SessionInfo
  };
}

module.exports = {
  authenticateByName,
  initiateQuickConnect,
  checkQuickConnectStatus,
  authenticateWithQuickConnect,
};

