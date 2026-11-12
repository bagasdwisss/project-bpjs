// server/middleware/idempotencyMiddleware.js - Anti-Duplicate Transaction Idempotency Key Engine
import crypto from 'crypto';
import { query } from '../db.js';

/**
 * Ensures requests with X-Idempotency-Key header are executed once per user + method + route scope.
 */
export async function idempotencyMiddleware(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  const rawKey = req.headers['x-idempotency-key'];
  if (!rawKey) {
    return next();
  }

  const userScope = req.user?.user_id ? `u${req.user.user_id}` : `ip:${(req.headers['x-forwarded-for']?.split(',')[0] || req.ip || 'local').trim()}`;
  const route = req.originalUrl || req.url;
  const scopedHash = crypto
    .createHash('sha256')
    .update(`${String(rawKey).trim()}::${userScope}::${req.method}::${route}`)
    .digest('hex')
    .substring(0, 64);

  try {
    const existing = await query(
      `SELECT response_status, response_body, expires_at
       FROM idempotency_keys
       WHERE idempotency_key = $1 AND expires_at > CURRENT_TIMESTAMP`,
      [scopedHash]
    );

    if (existing.rows.length > 0) {
      const cached = existing.rows[0];
      res.setHeader('X-Idempotency-Hit', 'true');
      res.setHeader('X-Cache-Lookup', 'HIT-IDEMPOTENT');
      return res.status(cached.response_status).json(cached.response_body);
    }

    const originalJson = res.json.bind(res);
    res.json = function (body) {
      const statusCode = res.statusCode;
      res.setHeader('X-Idempotency-Key', String(rawKey).trim().substring(0, 64));

      if (statusCode >= 200 && statusCode < 400) {
        const userId = req.user?.user_id || null;
        query(
          `INSERT INTO idempotency_keys (idempotency_key, user_id, route, response_status, response_body, expires_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP + INTERVAL '10 minutes')
           ON CONFLICT (idempotency_key) DO UPDATE SET
             response_status = EXCLUDED.response_status,
             response_body = EXCLUDED.response_body,
             expires_at = EXCLUDED.expires_at`,
          [scopedHash, userId, route.substring(0, 150), statusCode, JSON.stringify(body)]
        ).catch(err => {
          console.error('Idempotency save error:', err.message);
        });
      }

      return originalJson(body);
    };

    next();
  } catch (error) {
    console.error('Idempotency middleware error:', error.message);
    next();
  }
}

export default idempotencyMiddleware;
