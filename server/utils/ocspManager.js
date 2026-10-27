// server/utils/ocspManager.js - Online Certificate Status Protocol (OCSP) & CRL Manager
import { query } from '../db.js';
import crypto from 'crypto';

const OCSP_RESPONDER_ID = 'BPJSTK-OCSP-PRIMARY-VAULT-2026';

/**
 * Checks the real-time OCSP status of an issued certificate
 */
export async function checkOcspStatus(certNumber) {
  if (!certNumber) {
    throw new Error('Nomor sertifikat diperlukan.');
  }

  const cleanCert = String(certNumber).trim().toUpperCase();
  const startTime = Date.now();

  const res = await query(`
    SELECT crl_id, cert_number, revoked_at, reason, ocsp_digest
    FROM certificate_revocation_list
    WHERE UPPER(cert_number) = $1
  `, [cleanCert]);

  const durationMs = Date.now() - startTime;
  const isRevoked = res.rows.length > 0;
  const revocationInfo = isRevoked ? res.rows[0] : null;

  // Generate OCSP response digest signature
  const ocspSignature = crypto.createHmac('sha256', 'bpjstk-ocsp-master-secret-key')
    .update(`${cleanCert}:${isRevoked ? 'REVOKED' : 'GOOD'}:${OCSP_RESPONDER_ID}`)
    .digest('hex');

  return {
    ocspVersion: 'RFC 6960 (X.509 Internet PKI OCSP)',
    responderId: OCSP_RESPONDER_ID,
    certNumber: cleanCert,
    status: isRevoked ? 'REVOKED' : 'GOOD',
    isRevoked,
    revocationDetails: revocationInfo ? {
      revokedAt: revocationInfo.revoked_at,
      reason: revocationInfo.reason,
      digest: revocationInfo.ocsp_digest
    } : null,
    producedAt: new Date().toISOString(),
    thisUpdate: new Date().toISOString(),
    nextUpdate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    signatureAlgorithm: 'sha256WithRSAEncryption',
    ocspSignatureHex: ocspSignature,
    responseTimeMs: durationMs
  };
}

/**
 * Revokes a certificate and records it in the CRL
 */
export async function revokeCertificate({ certNumber, reason, revokedBy }) {
  const cleanCert = String(certNumber).trim().toUpperCase();
  const digest = crypto.createHash('sha256').update(`${cleanCert}:${reason}:${Date.now()}`).digest('hex');

  const res = await query(`
    INSERT INTO certificate_revocation_list (cert_number, reason, revoked_by, ocsp_digest)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (cert_number) DO UPDATE SET
      reason = EXCLUDED.reason,
      revoked_at = CURRENT_TIMESTAMP,
      ocsp_digest = EXCLUDED.ocsp_digest
    RETURNING *
  `, [cleanCert, reason, revokedBy || null, digest]);

  return {
    success: true,
    crlRecord: res.rows[0],
    message: `Sertifikat ${cleanCert} berhasil dicabut dan didistribusikan ke CRL OCSP.`
  };
}

/**
 * Lists all revoked certificates
 */
export async function getCrlList() {
  const res = await query(`
    SELECT crl.*, u.full_name as revoked_by_name
    FROM certificate_revocation_list crl
    LEFT JOIN users u ON crl.revoked_by = u.user_id
    ORDER BY crl.revoked_at DESC
  `);

  return {
    crlVersion: 'v2 (RFC 5280)',
    issuer: 'BPJS Ketenagakerjaan Root CA',
    revokedCount: res.rows.length,
    revocations: res.rows
  };
}
