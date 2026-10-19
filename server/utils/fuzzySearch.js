// server/utils/fuzzySearch.js - Intelligent Typo-Tolerant Search using Levenshtein Distance Algorithm
import { query } from '../db.js';

/**
 * Computes Damerau-Levenshtein distance between two strings
 * Handles: insertions, deletions, substitutions, and adjacent transpositions.
 */
export function levenshteinDistance(a, b) {
  if (!a) return b ? b.length : 0;
  if (!b) return a.length;

  const s1 = String(a).toLowerCase().trim();
  const s2 = String(b).toLowerCase().trim();

  const len1 = s1.length;
  const len2 = s2.length;

  const d = Array.from({ length: len1 + 1 }, () => new Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) d[i][0] = i;
  for (let j = 0; j <= len2; j++) d[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,       // deletion
        d[i][j - 1] + 1,       // insertion
        d[i - 1][j - 1] + cost // substitution
      );

      // Transposition
      if (i > 1 && j > 1 && s1[i - 1] === s2[j - 2] && s1[i - 2] === s2[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }

  return d[len1][len2];
}

/**
 * Returns a normalized similarity score between 0.0 (completely different) and 1.0 (identical)
 */
export function calculateSimilarity(s1, s2) {
  if (!s1 || !s2) return 0;
  const str1 = String(s1).toLowerCase().trim();
  const str2 = String(s2).toLowerCase().trim();

  if (str1 === str2) return 1.0;
  if (str1.includes(str2) || str2.includes(str1)) {
    return Math.max(0.8, 1 - Math.abs(str1.length - str2.length) / Math.max(str1.length, str2.length));
  }

  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1.0;

  const dist = levenshteinDistance(str1, str2);
  return Math.max(0, 1 - (dist / maxLen));
}

/**
 * Performs typo-tolerant fuzzy search across participants or users
 */
export async function searchEntitiesFuzzy({
  searchTerm,
  entityType = 'peserta', // 'peserta' | 'users'
  threshold = 0.50, // minimum similarity score
  limit = 20
}) {
  if (!searchTerm || !searchTerm.trim()) {
    return [];
  }

  const q = searchTerm.trim().toLowerCase();

  let rows = [];
  if (entityType === 'users') {
    const res = await query(
      `SELECT u.user_id, u.unique_id, u.full_name, r.role_name, u.status, u.penempatan 
       FROM users u 
       JOIN roles r ON u.role_id = r.role_id`
    );
    rows = res.rows;
  } else {
    // Default peserta
    const res = await query(
      `SELECT p.peserta_id, p.nama_peserta, p.nik, p.pekerjaan, p.status_pendaftaran, p.biaya, u.full_name as intern_name
       FROM peserta p
       JOIN users u ON p.user_id = u.user_id`
    );
    rows = res.rows;
  }

  // Calculate similarity for each row
  const scored = rows.map(row => {
    const targetName = entityType === 'users' ? row.full_name : row.nama_peserta;
    const targetSub = entityType === 'users' ? row.unique_id : (row.pekerjaan || '');

    const nameSim = calculateSimilarity(q, targetName || '');
    const subSim = calculateSimilarity(q, targetSub || '');
    const bestScore = Math.max(nameSim, subSim);

    const dist = levenshteinDistance(q, targetName || '');

    return {
      ...row,
      fuzzyScore: Number(bestScore.toFixed(3)),
      editDistance: dist
    };
  });

  return scored
    .filter(item => item.fuzzyScore >= threshold)
    .sort((a, b) => b.fuzzyScore - a.fuzzyScore)
    .slice(0, limit);
}
