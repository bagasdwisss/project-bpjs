// server/middleware/etagCacheMiddleware.js - Intelligent HTTP 304 ETag State Caching Engine
import crypto from 'crypto';

/**
 * Intelligent HTTP 304 ETag State Caching Middleware
 * Computes deterministic ETags for JSON API responses and handles If-None-Match.
 * Bypasses network payload transmission (0 byte body) when client state is fresh.
 */
export function etagCacheMiddleware(options = {}) {
  const { excludePaths = ['/api/auth/session-stream', '/api/auth/session-check'] } = options;

  return (req, res, next) => {
    // Only apply to idempotent safe GET requests
    if (req.method !== 'GET') {
      return next();
    }

    if (excludePaths.some(p => req.path.includes(p))) {
      return next();
    }

    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    res.json = function (body) {
      if (res.headersSent) {
        return originalJson(body);
      }

      try {
        const payloadString = JSON.stringify(body);
        const hash = crypto.createHash('sha256').update(payloadString).digest('hex').substring(0, 24);
        const etag = `"${hash}"`;

        res.setHeader('ETag', etag);
        res.setHeader('Cache-Control', 'private, must-revalidate, max-age=0');

        const clientEtag = req.headers['if-none-match'];

        if (clientEtag && (clientEtag === etag || clientEtag === `W/${etag}` || clientEtag.includes(hash))) {
          // Client cache is fresh! Send 304 Not Modified
          return res.status(304).end();
        }
      } catch (err) {
        console.warn('ETag generation error:', err.message);
      }

      return originalJson(body);
    };

    next();
  };
}

export default etagCacheMiddleware;
