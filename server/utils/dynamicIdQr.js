// server/utils/dynamicIdQr.js - Dynamic Rotating QR Code for Intern Digital ID Card
import crypto from 'crypto';
import { query } from '../db.js';

const ID_CARD_SECRET = process.env.ID_CARD_SECRET_KEY || 'bpjstk-dynamic-id-card-rotating-qr-secret-2026';
const TIME_STEP_SECONDS = 60;

/**
 * Computes current 60-second time step and seconds remaining
 */
export function getCurrentTimeStep() {
  const nowSec = Math.floor(Date.now() / 1000);
  const step = Math.floor(nowSec / TIME_STEP_SECONDS);
  const secondsRemaining = TIME_STEP_SECONDS - (nowSec % TIME_STEP_SECONDS);
  return { step, secondsRemaining, nowSec };
}

/**
 * Generates dynamic rotating QR payload and HMAC signature for an intern
 */
export async function generateDynamicIdCardPayload(userId) {
  const userRes = await query(`
    SELECT u.user_id, u.unique_id, u.full_name, u.status, u.role_id,
           p.program_terdaftar, p.status_pendaftaran,
           b.batch_name
    FROM users u
    LEFT JOIN peserta p ON u.user_id = p.user_id
    LEFT JOIN user_batches ub ON u.user_id = ub.user_id
    LEFT JOIN batches b ON ub.batch_id = b.batch_id
    WHERE u.user_id = $1
  `, [userId]);

  if (userRes.rows.length === 0) {
    throw new Error('Peserta magang tidak ditemukan.');
  }

  const user = userRes.rows[0];
  const { step, secondsRemaining } = getCurrentTimeStep();

  // Create rolling HMAC signature valid only for this 60s time window
  const canonicalData = `${user.user_id}:${user.unique_id}:${step}`;
  const rollingSignature = crypto.createHmac('sha256', ID_CARD_SECRET)
    .update(canonicalData)
    .digest('hex')
    .substring(0, 24);

  const qrPayload = JSON.stringify({
    uid: user.user_id,
    nim: user.unique_id,
    name: user.full_name,
    step,
    sig: rollingSignature,
    exp: Date.now() + (secondsRemaining * 1000)
  });

  return {
    success: true,
    card: {
      userId: user.user_id,
      uniqueId: user.unique_id,
      fullName: user.full_name,
      institution: 'BPJS Ketenagakerjaan Magang',
      major: user.program_terdaftar || 'Operasional & Pelayanan BPU',
      batch: user.batch_name || 'Gelombang Aktif',
      status: user.status || 'Aktif',
      issuedAt: new Date().toISOString()
    },
    qr: {
      payload: qrPayload,
      signature: rollingSignature,
      timeStep: step,
      secondsRemaining,
      refreshIntervalSeconds: TIME_STEP_SECONDS
    }
  };
}

/**
 * Verifies a scanned dynamic QR payload in the field (coordinator check)
 */
export function verifyDynamicIdQr(rawPayload) {
  try {
    const data = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
    const { uid, nim, step, sig } = data;

    if (!uid || !nim || step === undefined || !sig) {
      return { valid: false, message: 'Format data QR tidak valid.' };
    }

    const { step: currentStep } = getCurrentTimeStep();

    // Allow current step or previous step (1-minute skew tolerance)
    const isStepValid = (step === currentStep || step === currentStep - 1);
    if (!isStepValid) {
      return { valid: false, message: 'QR Code telah kedaluwarsa. Mohon minta peserta memperbarui layar ID Card.' };
    }

    const expectedSig = crypto.createHmac('sha256', ID_CARD_SECRET)
      .update(`${uid}:${nim}:${step}`)
      .digest('hex')
      .substring(0, 24);

    const isMatch = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
    if (!isMatch) {
      return { valid: false, message: 'Tanda tangan kriptografis QR Code palsu atau telah dimodifikasi!' };
    }

    return {
      valid: true,
      userId: uid,
      uniqueId: nim,
      verifiedAt: new Date().toISOString(),
      message: 'ID Card Digital Magang Terverifikasi Otentik.'
    };
  } catch (err) {
    return { valid: false, message: 'Gagal memproses QR Code: ' + err.message };
  }
}
