// server/utils/identityResolver.js - Automated Duplicate Identity Resolution Workflow
import { query } from '../db.js';

/**
 * Retrieves all pending duplicate identity conflict cases
 */
export async function getDuplicateIdentityCases() {
  const res = await query(`
    SELECT c.*,
           e.full_name as existing_name, e.unique_id as existing_nim,
           cf.full_name as conflicting_name, cf.unique_id as conflicting_nim
    FROM identity_duplicate_cases c
    LEFT JOIN users e ON c.existing_user_id = e.user_id
    LEFT JOIN users cf ON c.conflicting_user_id = cf.user_id
    ORDER BY c.created_at DESC
  `);

  return res.rows;
}

/**
 * Resolves an identity conflict case (MERGED, SPLIT_CONFIRMED, REJECTED)
 */
export async function resolveDuplicateCase({ caseId, action, notes, resolvedBy }) {
  const validActions = ['MERGED', 'SPLIT_CONFIRMED', 'REJECTED'];
  if (!validActions.includes(action)) {
    throw new Error(`Aksi tidak valid. Pilihan: ${validActions.join(', ')}`);
  }

  const findCase = await query(`SELECT * FROM identity_duplicate_cases WHERE case_id = $1`, [caseId]);
  if (findCase.rows.length === 0) {
    throw new Error('Kasus duplikasi identitas tidak ditemukan.');
  }

  const res = await query(`
    UPDATE identity_duplicate_cases
    SET resolution_status = $1,
        resolution_notes = $2,
        resolved_by = $3,
        resolved_at = CURRENT_TIMESTAMP
    WHERE case_id = $4
    RETURNING *
  `, [action, notes || 'Diselesaikan via Admin Identity Workflow', resolvedBy || null, caseId]);

  return {
    success: true,
    resolvedCase: res.rows[0],
    actionTaken: action,
    message: `Kasus duplikasi #${caseId} berhasil diproses dengan status: ${action}.`
  };
}
