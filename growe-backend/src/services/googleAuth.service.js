import { OAuth2Client } from 'google-auth-library';

const clientId = process.env.GOOGLE_CLIENT_ID;
const client = clientId ? new OAuth2Client(clientId) : null;

export const verifyGoogleIdToken = async (idToken) => {
  if (!clientId) {
    const err = new Error('Google login is not configured (missing GOOGLE_CLIENT_ID)');
    err.statusCode = 500;
    throw err;
  }
  if (!idToken) {
    const err = new Error('idToken is required');
    err.statusCode = 400;
    throw err;
  }
  const ticket = await client.verifyIdToken({
    idToken,
    audience: clientId,
  });
  const payload = ticket.getPayload();
  return payload;
};

