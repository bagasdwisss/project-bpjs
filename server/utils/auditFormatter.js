// server/utils/auditFormatter.js - Standardized Forensic Before/After Audit Trail Formatter
import { query } from '../db.js';
import { logActivity } from './logger.js';
import { getJakartaNow, formatJakartaDate } from './jakartaTime.js';

/**
 * Formats an instant into explicit Indonesian WIB date-time string: DD/MM/YYYY HH:mm:ss WIB
 */
export function formatWibDateTime(referenceDate = new Date()) {
  const { dateStr, timeStr } = getJakartaNow(referenceDate);
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y} ${timeStr} WIB`;
}

/**
 * Normalizes a field value for comparison & human-readable forensic logs
 */
export function formatAuditValue(val, type = 'auto') {
  if (val === null || val === undefined || val === '') return '-';
  if (val instanceof Date) {
    return formatJakartaDate(val) || val.toISOString();
  }
  if (type === 'date' && typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  }
  return String(val);
}

/**
 * Computes field-level diff entries between pre-update and post-update database snapshots
 */
export function buildFieldChanges(beforeObj = {}, afterObj = {}, fieldDefs = []) {
  const changes = [];
  for (const def of fieldDefs) {
    const { key, label, type = 'auto' } = def;
    const rawBefore = beforeObj?.[key];
    const rawAfter = afterObj?.[key];
    const beforeFormatted = formatAuditValue(rawBefore, type);
    const afterFormatted = formatAuditValue(rawAfter, type);

    // Compare numerics accurately (e.g. 80 vs "80.00")
    if (type === 'number') {
      const n1 = rawBefore === null || rawBefore === undefined || rawBefore === '' ? null : Number(rawBefore);
      const n2 = rawAfter === null || rawAfter === undefined || rawAfter === '' ? null : Number(rawAfter);
      if (n1 === n2) continue;
    } else if (beforeFormatted === afterFormatted) {
      continue;
    }

    changes.push({
      key,
      label: label || key,
      from: beforeFormatted,
      to: afterFormatted
    });
  }
  return changes;
}

/**
 * Resolves actor/target identity (full_name, unique_id, role_name) reliably
 */
async function resolveIdentity(userOrObj, explicitUserId) {
  if (userOrObj && userOrObj.full_name && userOrObj.unique_id) {
    return {
      user_id: userOrObj.user_id || explicitUserId || null,
      full_name: userOrObj.full_name,
      unique_id: userOrObj.unique_id,
      role_name: userOrObj.role_name || userOrObj.role || null
    };
  }
  const idToFetch = userOrObj?.user_id || explicitUserId;
  if (!idToFetch) return null;
  try {
    const res = await query(
      `SELECT u.user_id, u.full_name, u.unique_id, r.role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = $1`,
      [idToFetch]
    );
    return res.rows[0] || null;
  } catch {
    return null;
  }
}

/**
 * Writes an explicit, detailed forensic audit entry containing:
 * - Exact WIB timestamp & date (DD/MM/YYYY HH:mm:ss WIB)
 * - Actor role, full name, and unique_id (which Koordinator/Admin performed the change)
 * - Target participant/user full name and unique_id (which child/student was modified)
 * - Entity label & contextual record date/name
 * - Explicit before -> after transition values
 */
export async function logEntityChange({
  req,
  actorUser = null,
  targetUser = null,
  targetUserId = null,
  action,
  verb = 'mengubah',
  entityLabel,
  targetRoleWord = 'anak didik',
  recordContext = null,
  changes = [],
  notes = null,
  isAnomaly = false,
  anomalyReason = null
}) {
  const [actor, target] = await Promise.all([
    resolveIdentity(actorUser || req?.user, req?.user?.user_id),
    targetUser || targetUserId ? resolveIdentity(targetUser, targetUserId) : Promise.resolve(null)
  ]);

  const wibStamp = formatWibDateTime(new Date());
  const actorRole = actor?.role_name || 'Pengguna';
  const actorLabel = actor
    ? `${actorRole} ${actor.full_name} (${actor.unique_id || `ID #${actor.user_id}`})`
    : 'Sistem';

  const targetLabel = target
    ? `${targetRoleWord} ${target.full_name} (${target.unique_id || `ID #${target.user_id}`})`
    : (targetUserId ? `${targetRoleWord} ID #${targetUserId}` : null);

  const changeSummary = Array.isArray(changes) && changes.length > 0
    ? changes.map((c) => `${c.label}: "${c.from}" -> "${c.to}"`).join(', ')
    : 'verifikasi/pembaruan data tanpa perubahan nilai kolom';

  const parts = [
    `[${wibStamp}]`,
    actorLabel,
    verb,
    entityLabel,
    targetLabel ? `milik ${targetLabel}` : null,
    recordContext ? `[${recordContext}]` : null
  ].filter(Boolean);

  let description = `${parts.join(' ')}: ${changeSummary}`;
  if (notes && String(notes).trim()) {
    description += ` | Catatan: ${String(notes).trim()}`;
  }

  await logActivity({
    req,
    userId: actor?.user_id || req?.user?.user_id || null,
    action,
    description,
    isAnomaly,
    anomalyReason
  });

  return description;
}

export default {
  formatWibDateTime,
  formatAuditValue,
  buildFieldChanges,
  logEntityChange
};
