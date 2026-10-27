// server/utils/antiPhishingManager.js - Anti-Phishing Personal Security Phrase & Icon Lookup
import { query } from '../db.js';

/**
 * Retrieves the unique anti-phishing token and security phrase for a user
 */
export async function getAntiPhishingProfile(uniqueId) {
  if (!uniqueId) {
    return { found: false, error: 'Parameter uniqueId diperlukan.' };
  }

  const cleanId = String(uniqueId).trim();

  const res = await query(`
    SELECT t.security_phrase, t.icon_symbol, t.border_color_hex, u.full_name
    FROM users u
    LEFT JOIN user_anti_phishing_tokens t ON u.user_id = t.user_id
    WHERE LOWER(u.unique_id) = LOWER($1)
  `, [cleanId]);

  if (res.rows.length === 0) {
    return {
      found: false,
      message: 'ID Pengguna tidak terdaftar.'
    };
  }

  const row = res.rows[0];

  return {
    found: true,
    securityPhrase: row.security_phrase || 'SISTEM RESMI BPJS KETENAGAKERJAAN',
    iconSymbol: row.icon_symbol || 'shield-check',
    borderColorHex: row.border_color_hex || '#10B981',
    userFullName: row.full_name,
    verifiedSiteDomain: 'project-bpjs.vercel.app',
    status: 'VERIFIED_OFFICIAL_PORTAL'
  };
}

/**
 * Updates or sets an anti-phishing personal token for a user
 */
export async function setAntiPhishingProfile(userId, { phrase, icon, color }) {
  const res = await query(`
    INSERT INTO user_anti_phishing_tokens (user_id, security_phrase, icon_symbol, border_color_hex)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id) DO UPDATE SET
      security_phrase = EXCLUDED.security_phrase,
      icon_symbol = EXCLUDED.icon_symbol,
      border_color_hex = EXCLUDED.border_color_hex
    RETURNING *
  `, [userId, phrase, icon || 'shield-check', color || '#10B981']);

  return res.rows[0];
}
