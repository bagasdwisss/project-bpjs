// src/utils/fuzzySearch.js - Client-Side Typo-Tolerant Search using Levenshtein Distance
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
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && s1[i - 1] === s2[j - 2] && s1[i - 2] === s2[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }

  return d[len1][len2];
}

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
 * Filters an array of items by checking specified keys against query with typo tolerance
 */
export function filterWithTypoTolerance(items, query, keys = ['full_name', 'nama_peserta', 'unique_id'], threshold = 0.5) {
  if (!query || !query.trim() || !items || !Array.isArray(items)) {
    return items || [];
  }

  const q = query.trim().toLowerCase();

  return items
    .map(item => {
      let maxScore = 0;
      for (const key of keys) {
        const val = item[key];
        if (val) {
          const score = calculateSimilarity(q, String(val));
          if (score > maxScore) maxScore = score;
        }
      }
      return { item, maxScore };
    })
    .filter(({ maxScore }) => maxScore >= threshold)
    .sort((a, b) => b.maxScore - a.maxScore)
    .map(({ item }) => item);
}
