/**
 * Standard API shape for JSON responses:
 * - Success: { success: true, message: 'OK', data }
 * - Bodies with `error` (no `success`): normalized to { success: false, ...body }
 * - Already has `success`: pass through
 *
 * Skips `/api/health` and `/api/csrf-token` so monitoring and CSRF clients stay simple.
 */
const SKIP_PATHS = new Set(['/api/health', '/api/csrf-token']);

export const apiEnvelope = (req, res, next) => {
  if (!req.path.startsWith('/api') || SKIP_PATHS.has(req.path.split('?')[0])) {
    return next();
  }

  const origJson = res.json.bind(res);
  res.json = function envelopeJson(body) {
    const code = res.statusCode || 200;

    if (body === undefined) {
      return origJson();
    }

    if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'success')) {
      return origJson(body);
    }

    if (body && typeof body === 'object' && body.error != null) {
      return origJson({ success: false, ...body });
    }

    if (code >= 400) {
      return origJson(body);
    }

    return origJson({
      success: true,
      message: 'OK',
      data: body,
    });
  };

  next();
};
