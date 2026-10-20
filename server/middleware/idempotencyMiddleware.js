// server/middleware/idempotencyMiddleware.js - Anti-Duplicate Transaction Idempotency Key Engine
import { query } from '../db.js';

/**
 * Ensures requests with X-Idempotency-Key header are executed exactly once.
 * Subsequent identical requests return the cached response without re-executing state changes.
 */
export async function idempotencyMiddleware(req, res, next) {
  // Only apply to state-modifying HTTP methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  const rawKey = req.headers['x-idempotency-key'];
  if (!rawKey) {
    return next();
  }

  const idempotencyKey = String(rawKey).trim().substring(0, 64);

  try {
    // 1. Check if idempotency key exists and is still valid
    const existing = await query(`
      SELECT response_status, response_body, expires_at 
      FROM idempotency_keys 
      WHERE idempotency_key = $1 AND expires_at > CURRENT_TIMESTAMP
    `, [idempotencyKey]);

    if (existing.rows.length > 0) {
      const cached = existing.rows[0];
      res.setHeader('X-Idempotency-Hit', 'true');
      res.setHeader('X-Cache-Lookup', 'HIT-IDEMPOTENT');
      return res.status(cached.response_status).json(cached.response_body);
    }

    // 2. Intercept response to store result upon successful completion
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        const userId = req.user?.user_id || null;
        const route = req.originalUrl || req.url;

        // Persist response asynchronously with 10-minute TTL
        query(`
          INSERT INTO idempotency_keys (idempotency_key, user_id, route, response_status, response_body, expires_at)
          VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP + INTERVAL '10 minutes')
          ON CONFLICT (idempotency_key) DO NOTHING
        `, [idempotencyKey, userId, route, res.statusCode, JSON.stringify(body)]).catch(err => {
          console.error('Idempotency save error:', err.message);
        });
      }

      res.setHeader('X-Idempotency-Key', idempotencyKey);
      return originalJson(body);
    };

    next();
  } catch (error) {
    console.error('Idempotency middleware error:', error.message);
    next();
  }
}

export default idempotencyMiddleware;
