// server/utils/blindIndex.js - HMAC-Based Blind Indexing for UU PDP Compliance (UU No. 27 Tahun 2022)
import crypto from 'crypto';
import { query } from '../db.js';

const BLIND_INDEX_SECRET = process.env.BLIND_INDEX_SECRET || process.env.JWT_SECRET || 'bpjstk-pdp-blind-index-secure-salt-2026';

/**
 * Computes a deterministic, one-way HMAC-SHA256 blind index from a sensitive value (e.g. NIK, No Telepon).
 * Normalizes input (trims, removes dashes/spaces) before computing hash.
 * Returns a 32-character hexadecimal blind token.
 */
export function computeBlindIndex(value, secret = BLIND_INDEX_SECRET) {
  if (!value) return null;
  const normalized = String(value).trim().replace(/[\s\-\.]/g, '');
  return crypto.createHmac('sha256', secret)
    .update(normalized)
    .digest('hex')
    .substring(0, 32);
}

/**
 * Automatically backfills blind index for rows with null nik_blind_index
 */
export async function backfillBlindIndexes() {
  try {
    // 1. Peserta table
    const unindexedPeserta = await query(
      `SELECT peserta_id, nik FROM peserta WHERE nik IS NOT NULL AND nik_blind_index IS NULL LIMIT 200`
    );

    let updatedCount = 0;
    for (const row of unindexedPeserta.rows) {
      const blindIndex = computeBlindIndex(row.nik);
      if (blindIndex) {
        await query(`UPDATE peserta SET nik_blind_index = $1 WHERE peserta_id = $2`, [blindIndex, row.peserta_id]);
        updatedCount++;
      }
    }

    return {
      success: true,
      updatedCount,
      message: `Blind index berhasil diperbarui untuk ${updatedCount} entitas peserta.`
    };
  } catch (err) {
    console.error('Error backfilling blind indexes:', err.message);
    return { success: false, error: err.message };
  }
}
