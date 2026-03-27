import { OAuth2Client } from 'google-auth-library';

const clientId = process.env.GOOGLE_CLIENT_ID;
const client = clientId ? new OAuth2Client(clientId) : null;

export const verifyGoogleIdToken = async (idToken) => {
  if (!clientId) {
    const err = new Error('Google login is not configured (missing GOOGLE_CLIENT_ID on the server)');
    err.statusCode = 500;
    err.code = 'GOOGLE_NOT_CONFIGURED';
    throw err;
  }
  if (!idToken) {
    const err = new Error('idToken is required');
    err.statusCode = 400;
    throw err;
  }
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

