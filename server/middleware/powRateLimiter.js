// server/middleware/powRateLimiter.js - Cryptographic Proof of Work (PoW) Challenge-Response Rate Limiter
import crypto from 'crypto';
import { query } from '../db.js';

// Local fast cache backed by PostgreSQL pow_challenges table for Vercel multi-instance durability
const activeChallenges = new Map();

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [id, challenge] of activeChallenges.entries()) {
    if (challenge.expiresAt < now) {
      activeChallenges.delete(id);
    }
  }
}, 60 * 1000);
if (cleanupTimer.unref) cleanupTimer.unref();

/**
 * Creates a new Proof-of-Work challenge and persists it in PostgreSQL + local memory
 */
export async function createPowChallenge(difficulty = 4, ttlMs = 180000) {
  const challengeId = crypto.randomBytes(16).toString('hex');
  const prefix = crypto.randomBytes(12).toString('hex');
  const now = Date.now();
  const expiresAt = now + ttlMs;
  const safeDifficulty = Math.min(Math.max(parseInt(difficulty, 10) || 4, 1), 6);

  const challenge = {
    challengeId,
    prefix,
    difficulty: safeDifficulty,
    createdAt: now,
    expiresAt,
    used: false
  };

  activeChallenges.set(challengeId, challenge);

  try {
    await query(
      `INSERT INTO pow_challenges (challenge_id, prefix, difficulty, expires_at, used)
       VALUES ($1, $2, $3, $4, FALSE)
       ON CONFLICT (challenge_id) DO NOTHING`,
      [challengeId, prefix, safeDifficulty, new Date(expiresAt)]
    );
  } catch (err) {
    console.warn('[PoW] DB persist fallback warning:', err.message);
  }

  return {
    challengeId,
    prefix,
    difficulty: safeDifficulty,
    target: '0'.repeat(safeDifficulty),
    expiresAt
  };
}

/**
 * Validates a solved challenge against a provided nonce (serverless-safe via PostgreSQL atomic update)
 */
export async function verifyPowSolution(challengeId, nonce) {
  if (!challengeId || nonce === undefined || nonce === null) {
    return { valid: false, error: 'Challenge ID dan Nonce diperlukan' };
  }

  let challenge = activeChallenges.get(challengeId);

  if (!challenge) {
    try {
      const dbRes = await query(
        `SELECT challenge_id, prefix, difficulty, expires_at, used
         FROM pow_challenges
         WHERE challenge_id = $1
         LIMIT 1`,
        [challengeId]
      );
      if (dbRes.rows.length > 0) {
        const r = dbRes.rows[0];
        challenge = {
          challengeId: r.challenge_id,
          prefix: r.prefix,
          difficulty: r.difficulty,
          expiresAt: new Date(r.expires_at).getTime(),
          used: r.used
        };
      }
    } catch (err) {
      console.warn('[PoW] DB lookup warning:', err.message);
    }
  }

  if (!challenge) {
    return { valid: false, error: 'Challenge ID tidak ditemukan atau telah kedaluwarsa' };
  }

  if (Date.now() > challenge.expiresAt) {
    activeChallenges.delete(challengeId);
    return { valid: false, error: 'Challenge PoW telah kedaluwarsa' };
  }

  if (challenge.used) {
    return { valid: false, error: 'Challenge PoW ini sudah pernah digunakan' };
  }

  const hash = crypto.createHash('sha256')
    .update(`${challenge.prefix}${nonce}`)
    .digest('hex');

  const targetPrefix = '0'.repeat(challenge.difficulty);
  if (!hash.startsWith(targetPrefix)) {
    return { valid: false, error: `Hash '${hash}' tidak memenuhi target ${targetPrefix}` };
  }

  // Atomically consume challenge in DB to prevent cross-instance replay
  try {
    const consumeRes = await query(
      `UPDATE pow_challenges SET used = TRUE WHERE challenge_id = $1 AND used = FALSE RETURNING challenge_id`,
      [challengeId]
    );
    if (consumeRes.rowCount === 0 && !activeChallenges.has(challengeId)) {
      return { valid: false, error: 'Challenge PoW ini sudah pernah digunakan' };
    }
  } catch (err) {
    console.warn('[PoW] DB consume warning:', err.message);
  }

  challenge.used = true;
  activeChallenges.delete(challengeId);

  return { valid: true, hash, difficulty: challenge.difficulty };
}

/**
 * Express middleware to enforce PoW challenge for specific endpoints
 */
export function powChallengeEnforcer({ difficulty = 4 } = {}) {
  return async (req, res, next) => {
    const bypassSecret = process.env.POW_BYPASS_SECRET;
    if (bypassSecret && req.headers['x-bypass-pow'] === bypassSecret) {
      return next();
    }

    const challengeId = req.headers['x-pow-challenge-id'];
    const nonce = req.headers['x-pow-nonce'];

    if (!challengeId || nonce === undefined || nonce === '') {
      const challenge = await createPowChallenge(difficulty);
      return res.status(428).json({
        success: false,
        code: 'POW_CHALLENGE_REQUIRED',
        message: 'Tindakan ini memerlukan penyelesaian tantangan Proof of Work (PoW) kriptografis untuk mencegah serangan brute-force.',
        challenge
      });
    }

    const verification = await verifyPowSolution(challengeId, nonce);
    if (!verification.valid) {
      const newChallenge = await createPowChallenge(difficulty);
      return res.status(403).json({
        success: false,
        code: 'POW_VERIFICATION_FAILED',
        message: `Verifikasi PoW gagal: ${verification.error}`,
        newChallenge
      });
    }

    req.powVerified = true;
    next();
  };
}
