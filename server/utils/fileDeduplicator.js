// server/utils/fileDeduplicator.js - Storage File De-duplication via SHA-256 Content Hashing
import crypto from 'crypto';
import { query } from '../db.js';

/**
 * Deduplicates and registers a file based on its cryptographic SHA-256 hash
 */
export async function deduplicateAndRegisterFile({ buffer, originalFilename, mimeType }) {
  let fileBuffer;
  if (Buffer.isBuffer(buffer)) {
    fileBuffer = buffer;
  } else if (typeof buffer === 'string') {
    fileBuffer = Buffer.from(buffer.replace(/^data:[^;]+;base64,/, ''), 'base64');
  } else {
    throw new Error('Buffer atau string base64 diperlukan.');
  }

  const contentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  const fileSizeBytes = fileBuffer.length;

  // Check if hash already exists in storage registry
  const existingRes = await query(`
    SELECT * FROM storage_deduplication_registry WHERE content_sha256 = $1
  `, [contentHash]);

  if (existingRes.rows.length > 0) {
    // Existing file matched: increment reference count (0 extra storage bytes consumed)
    const updated = await query(`
      UPDATE storage_deduplication_registry
      SET reference_count = reference_count + 1,
          last_referenced_at = CURRENT_TIMESTAMP
      WHERE content_sha256 = $1
      RETURNING *
    `, [contentHash]);

    return {
      isDuplicate: true,
      deduplicated: true,
      contentHash,
      storagePath: updated.rows[0].physical_storage_path,
      referenceCount: updated.rows[0].reference_count,
      bytesSaved: fileSizeBytes,
      message: 'Berkas identik terdeteksi via SHA-256. Referensi storage ditambahkan tanpa memakan ruang disk baru.'
    };
  }

  // New unique file: record in storage registry
  const newStoragePath = `/storage/vault/${contentHash.substring(0, 16)}_${originalFilename || 'document'}`;
  await query(`
    INSERT INTO storage_deduplication_registry (
      content_sha256, physical_storage_path, file_size_bytes, mime_type, reference_count
    ) VALUES ($1, $2, $3, $4, 1)
  `, [contentHash, newStoragePath, fileSizeBytes, mimeType || 'application/octet-stream']);

  return {
    isDuplicate: false,
    deduplicated: false,
    contentHash,
    storagePath: newStoragePath,
    referenceCount: 1,
    bytesSaved: 0,
    message: 'Berkas unik baru berhasil didaftarkan ke storage registry.'
  };
}

/**
 * Returns overall deduplication storage efficiency metrics
 */
export async function getDeduplicationMetrics() {
  const res = await query(`
    SELECT 
      COUNT(*) as unique_files_count,
      SUM(reference_count) as total_references_count,
      SUM(file_size_bytes) as actual_physical_bytes,
      SUM(file_size_bytes * reference_count) as logical_bytes
    FROM storage_deduplication_registry
  `);

  const row = res.rows[0] || {};
  const uniqueCount = parseInt(row.unique_files_count || 0, 10);
  const totalRefs = parseInt(row.total_references_count || 0, 10);
  const physicalBytes = parseInt(row.actual_physical_bytes || 0, 10);
  const logicalBytes = parseInt(row.logical_bytes || 0, 10);

  const duplicatesAvoided = Math.max(0, totalRefs - uniqueCount);
  const bytesSaved = Math.max(0, logicalBytes - physicalBytes);
  const savingsPct = logicalBytes > 0 ? Number(((bytesSaved / logicalBytes) * 100).toFixed(2)) : 0;

  return {
    uniqueFilesCount: uniqueCount,
    totalReferencesCount: totalRefs,
    duplicatesAvoided,
    actualPhysicalBytes: physicalBytes,
    logicalVirtualBytes: logicalBytes,
    storageBytesSaved: bytesSaved,
    deduplicationSavingsPct: `${savingsPct}%`,
    hashingAlgorithm: 'SHA-256 (NIST FIPS 180-4 Single-Instance Storage)'
  };
}
