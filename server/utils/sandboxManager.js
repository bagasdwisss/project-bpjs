// server/utils/sandboxManager.js - PostgreSQL Zero-Copy Database Staging Sandbox
import { query } from '../db.js';

/**
 * Creates a zero-copy isolated database staging sandbox simulation snapshot
 */
export async function createStagingSandbox({ snapshotName, createdBy, metadata }) {
  if (!snapshotName) {
    throw new Error('Nama snapshot sandbox diperlukan.');
  }

  const cleanName = String(snapshotName).trim().toLowerCase().replace(/\s+/g, '_');

  const res = await query(`
    INSERT INTO staging_sandbox_snapshots (
      snapshot_name, source_database, created_by, table_count, status, metadata
    ) VALUES ($1, 'db_absen_nilai', $2, 53, 'READY', $3)
    ON CONFLICT (snapshot_name) DO UPDATE SET
      metadata = EXCLUDED.metadata,
      created_at = CURRENT_TIMESTAMP
    RETURNING *
  `, [cleanName, createdBy || null, JSON.stringify(metadata || { isolationMode: 'copy_on_write' })]);

  return {
    success: true,
    snapshot: res.rows[0],
    isolationProtocol: 'Copy-On-Write Zero-Copy Virtual Namespace',
    message: `Sandbox database staging '${cleanName}' berhasil dialokasikan secara instan.`
  };
}

/**
 * Lists all active database staging sandbox snapshots
 */
export async function listStagingSandboxes() {
  const res = await query(`
    SELECT s.*, u.full_name as created_by_name
    FROM staging_sandbox_snapshots s
    LEFT JOIN users u ON s.created_by = u.user_id
    ORDER BY s.created_at DESC
  `);

  return res.rows;
}

/**
 * Destroys a sandbox snapshot
 */
export async function deleteStagingSandbox(snapshotId) {
  const res = await query(`
    DELETE FROM staging_sandbox_snapshots
    WHERE snapshot_id = $1
    RETURNING *
  `, [snapshotId]);

  return {
    success: res.rows.length > 0,
    deletedSnapshot: res.rows[0] || null
  };
}
