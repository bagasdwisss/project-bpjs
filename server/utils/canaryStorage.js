// server/utils/canaryStorage.js - Decoy File Canary Traps (Anti-Exfiltration & Ransomware Early Warning)
import { query } from '../db.js';
import { dispatchIncidentAlert } from './incidentNotifier.js';
import { logActivity } from './logger.js';

/**
 * Handles access to a canary trap decoy file.
 * Records the access, increments count, and immediately alerts administrators.
 */
export async function triggerCanaryAccess({ filename, ip, userAgent }) {
  try {
    const findRes = await query(
      `SELECT * FROM storage_canary_traps WHERE filename = $1`,
      [filename]
    );

    if (findRes.rows.length === 0) {
      return null;
    }

    const canary = findRes.rows[0];

    // Update access metadata
    await query(
      `UPDATE storage_canary_traps
       SET access_count = access_count + 1,
           last_accessed_at = CURRENT_TIMESTAMP,
           triggered_by_ip = $1
       WHERE canary_id = $2`,
      [ip || '127.0.0.1', canary.canary_id]
    );

    // Dispatch instant high-priority security incident alert
    await dispatchIncidentAlert({
      alertType: 'STORAGE_CANARY_TRAP_TRIGGERED',
      severity: 'CRITICAL',
      sourceIp: ip || '127.0.0.1',
      details: {
        canaryId: canary.canary_id,
        filename: canary.filename,
        fakeDescription: canary.fake_description,
        secretToken: canary.secret_token,
        userAgent: userAgent || 'Unknown Client',
        warning: 'Percobaan eksfiltrasi atau akses tidak sah terhadap dokumen rahasia umpan terdeteksi!'
      }
    });

    // Write to audit log
    await logActivity({
      userId: null,
      action: 'CANARY_TRAP_ACCESSED',
      details: {
        filename: canary.filename,
        ip,
        userAgent,
        note: 'Dokumen umpan canary storage diakses!'
      }
    });

    // Generate simulated deceptive document content with forensic watermark
    const isPdf = filename.toLowerCase().endsWith('.pdf');
    let content;
    let contentType;

    if (isPdf) {
      contentType = 'application/pdf';
      content = Buffer.from(
        `%PDF-1.7\n` +
        `1 0 obj << /Title (${canary.filename}) /Author (BPJS Ketenagakerjaan) /CanaryToken (${canary.secret_token}) >> endobj\n` +
        `2 0 obj << /Type /Page /Contents 3 0 R >> endobj\n` +
        `3 0 obj << /Length 200 >> stream\n` +
        `BT /F1 14 Tf 50 700 Td (PERINGATAN: DOKUMEN INI ADALAH CANARY TRAP KEAMANAN BPJS KETENAGAKERJAAN) Tj ET\n` +
        `BT /F1 10 Tf 50 670 Td (Akses dari IP: ${ip} telah dicatat ke audit log forensik pada ${new Date().toISOString()}.) Tj ET\n` +
        `endstream endobj\n` +
        `xref 0 4 0000000000 65535 f 0000000010 00000 n\ntrailer << /Size 4 /Root 2 0 R >>\nstartxref\n350\n%%EOF`
      );
    } else {
      contentType = 'text/csv';
      content = Buffer.from(
        `NIK,Nama_Karyawan,Jabatan,Gaji_Pokok,Status_Audit\n` +
        `CANARY-001,DATA_UMPAN_CANARY,Staff_Keuangan,Rp 15.000.000,CANARY_TOKEN_${canary.secret_token}\n` +
        `WARNING: AKSES DARI IP ${ip} TELAH DICATAT SISTEM KEAMANAN BPJS KETENAGAKERJAAN PADA ${new Date().toISOString()}\n`
      );
    }

    return {
      canary,
      content,
      contentType
    };
  } catch (error) {
    console.error('Canary access trigger error:', error);
    return null;
  }
}

/**
 * Returns list of configured canary decoy traps and their trigger status
 */
export async function getCanaryTrapsStatus() {
  const result = await query(
    `SELECT canary_id, filename, file_path, fake_description, access_count, last_accessed_at, triggered_by_ip, created_at
     FROM storage_canary_traps
     ORDER BY canary_id ASC`
  );
  return result.rows;
}
