import '../bootstrap-env.js';
import { OAuth2Client } from 'google-auth-library';

/**
 * Read client ID when verifying, not at module load.
 * Ensures growe-backend/.env is applied even if this module loaded before dotenv elsewhere,
 * and picks up GOOGLE_CLIENT_ID after a server restart without stale cached values.
 */
export const verifyGoogleIdToken = async (idToken) => {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    const err = new Error(
      'Google login is not configured (missing GOOGLE_CLIENT_ID on the server). Add GOOGLE_CLIENT_ID to growe-backend/.env — use the same OAuth client ID as VITE_GOOGLE_CLIENT_ID in growe-frontend/.env — then restart the API.'
    );
    err.statusCode = 500;
    err.code = 'GOOGLE_NOT_CONFIGURED';
    throw err;
  }
  if (!idToken) {
    const err = new Error('idToken is required');
    err.statusCode = 400;
    throw err;
  }
  const client = new OAuth2Client(clientId);
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    return payload;
  } catch (e) {
    const msg = e?.message || 'Google token verification failed';
    const err = new Error(
      `${msg}. Ensure GOOGLE_CLIENT_ID in growe-backend/.env matches VITE_GOOGLE_CLIENT_ID (same OAuth client ID).`
    );
    err.statusCode = 401;
    err.code = 'GOOGLE_TOKEN_INVALID';
    err.cause = e;
    throw err;
  }
};

