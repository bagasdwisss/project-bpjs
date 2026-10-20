// src/utils/powSolver.js - Client-Side Proof-of-Work (PoW) Solver
/**
 * Solves a cryptographic Proof-of-Work challenge in the client's browser.
 * Keeps CPU challenge computation lightweight (~10-100ms) while stopping automated bot floods.
 */
export async function solvePowChallenge(challenge) {
  const { prefix, difficulty = 4 } = challenge;
  const target = '0'.repeat(difficulty);
  const encoder = new TextEncoder();

  let nonce = 0;
  const maxIterations = 2000000;

  while (nonce < maxIterations) {
    const data = encoder.encode(`${prefix}${nonce}`);
    let hashHex = '';

    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Fallback for non-browser or worker contexts
      const cryptoModule = await import('crypto');
      hashHex = cryptoModule.createHash('sha256').update(`${prefix}${nonce}`).digest('hex');
    }

    if (hashHex.startsWith(target)) {
      return {
        challengeId: challenge.challengeId,
        nonce,
        hash: hashHex,
        solved: true
      };
    }

    nonce++;
  }

  throw new Error('PoW max iterations exceeded');
}

export default solvePowChallenge;
