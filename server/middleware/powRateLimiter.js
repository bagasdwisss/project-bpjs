// server/middleware/powRateLimiter.js - Cryptographic Proof of Work (PoW) Challenge-Response Rate Limiter
import crypto from 'crypto';

// In-memory challenge store with TTL
const activeChallenges = new Map();

// Cleanup expired challenges periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, challenge] of activeChallenges.entries()) {
    if (challenge.expiresAt < now) {
      activeChallenges.delete(id);
    }
  }
}, 60 * 1000);

/**
 * Creates a new Proof-of-Work challenge
 * @param {number} difficulty - Number of leading hex zeros required (default 4)
 * @param {number} ttlMs - Time to live in ms (default 3 minutes)
 */
export function createPowChallenge(difficulty = 4, ttlMs = 180000) {
  const challengeId = crypto.randomBytes(16).toString('hex');
  const prefix = crypto.randomBytes(12).toString('hex');
  const now = Date.now();

  const challenge = {
    challengeId,
    prefix,
    difficulty,
    createdAt: now,
    expiresAt: now + ttlMs,
    used: false
  };

  activeChallenges.set(challengeId, challenge);

  return {
    challengeId,
    prefix,
    difficulty,
    target: '0'.repeat(difficulty),
    expiresAt: challenge.expiresAt
  };
}

/**
 * Validates a solved challenge against a provided nonce
 */
export function verifyPowSolution(challengeId, nonce) {
  if (!challengeId || nonce === undefined || nonce === null) {
    return { valid: false, error: 'Challenge ID dan Nonce diperlukan' };
  }

  const challenge = activeChallenges.get(challengeId);
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
  const isSolved = hash.startsWith(targetPrefix);

  if (!isSolved) {
    return { valid: false, error: `Hash '${hash}' tidak memenuhi target ${targetPrefix}` };
  }

  // Mark as solved/used to prevent replay
  challenge.used = true;
  activeChallenges.delete(challengeId);

  return { valid: true, hash, difficulty: challenge.difficulty };
}

/**
 * Express middleware to enforce PoW challenge for specific endpoints
 */
export function powChallengeEnforcer({ difficulty = 4 } = {}) {
  return (req, res, next) => {
    // Whitelist test client / admin bypass if explicitly indicated
    if (req.headers['x-bypass-pow'] === process.env.POW_BYPASS_SECRET) {
      return next();
    }

    const challengeId = req.headers['x-pow-challenge-id'];
    const nonce = req.headers['x-pow-nonce'];

    if (!challengeId || !nonce) {
      const challenge = createPowChallenge(difficulty);
      return res.status(428).json({
        success: false,
        code: 'POW_CHALLENGE_REQUIRED',
        message: 'Tindakan ini memerlukan penyelesaian tantangan Proof of Work (PoW) kriptografis untuk mencegah serangan brute-force.',
        challenge
      });
    }

    const verification = verifyPowSolution(challengeId, nonce);
    if (!verification.valid) {
      const newChallenge = createPowChallenge(difficulty);
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
