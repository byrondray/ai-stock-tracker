/**
 * Token Utilities
 *
 * Helper functions for JWT token management
 */

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;

    // Check if token has an expiration and if it's expired
    return payload.exp ? payload.exp < currentTime : false;
  } catch (error) {
    // If we can't parse the token, consider it expired
    return true;
  }
}

export function getTokenPayload(token: string): any {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (error) {
    return null;
  }
}

export function isValidToken(token: string): boolean {
  if (!token) return false;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const payload = getTokenPayload(token);
    if (!payload) return false;

    return !isTokenExpired(token);
  } catch (error) {
    return false;
  }
}
