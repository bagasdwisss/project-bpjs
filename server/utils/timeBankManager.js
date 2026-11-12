// server/utils/timeBankManager.js - Time-Bank Overtime & Comp-Time Ledger
import pool, { query } from '../db.js';

/**
 * Calculates current accrued overtime balance for a user
 */
export async function getTimeBankBalance(userId) {
  const res = await query(`
    SELECT balance_after
    FROM time_bank_ledger
    WHERE user_id = $1
    ORDER BY ledger_id DESC
    LIMIT 1
  `, [userId]);

  return parseFloat(res.rows[0]?.balance_after || 0);
}

/**
 * Records overtime hours earned by a participant in the field (atomic with row/advisory lock)
 */
export async function recordOvertimeHours({ userId, hours, eventDesc, approvedBy }) {
  const parsedHours = parseFloat(hours);
  if (!Number.isFinite(parsedHours) || parsedHours <= 0 || parsedHours > 24) {
    throw new Error('Jumlah jam lembur harus berupa angka positif (0.1 - 24 jam).');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(84729500, $1)', [parseInt(userId, 10) || 0]);

    const balRes = await client.query(
      `SELECT balance_after FROM time_bank_ledger WHERE user_id = $1 ORDER BY ledger_id DESC LIMIT 1`,
      [userId]
    );
    const currentBalance = parseFloat(balRes.rows[0]?.balance_after || 0);
    const newBalance = Number((currentBalance + parsedHours).toFixed(2));

    const res = await client.query(`
      INSERT INTO time_bank_ledger (
        user_id, transaction_type, hours_amount, event_description, approved_by, balance_after, status
      ) VALUES ($1, 'EARNED_OVERTIME', $2, $3, $4, $5, 'APPROVED')
      RETURNING *
    `, [userId, parsedHours, eventDesc, approvedBy, newBalance]);

    await client.query('COMMIT');
    return {
      success: true,
      ledger: res.rows[0],
      previousBalance: currentBalance,
      newBalance
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Claims accumulated time-bank hours as compensatory leave (atomic & serialized to prevent double spend)
 */
export async function claimCompTimeLeave({ userId, hours, reason }) {
  const parsedHours = parseFloat(hours);
  if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
    throw new Error('Jumlah jam klaim kompensasi harus lebih besar dari 0.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(84729500, $1)', [parseInt(userId, 10) || 0]);

    const balRes = await client.query(
      `SELECT balance_after FROM time_bank_ledger WHERE user_id = $1 ORDER BY ledger_id DESC LIMIT 1`,
      [userId]
    );
    const currentBalance = parseFloat(balRes.rows[0]?.balance_after || 0);

    if (currentBalance < parsedHours) {
      throw new Error(`Saldo Time-Bank tidak mencukupi (Tersedia: ${currentBalance} jam, Diajukan: ${parsedHours} jam).`);
    }

    const newBalance = Number((currentBalance - parsedHours).toFixed(2));

    const res = await client.query(`
      INSERT INTO time_bank_ledger (
        user_id, transaction_type, hours_amount, event_description, balance_after, status
      ) VALUES ($1, 'CLAIMED_LEAVE', $2, $3, $4, $5)
      RETURNING *
    `, [userId, parsedHours, `Klaim Cuti Kompensasi: ${reason}`, newBalance, 'APPROVED']);

    await client.query('COMMIT');
    return {
      success: true,
      ledger: res.rows[0],
      previousBalance: currentBalance,
      newBalance
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Retrieves the full transaction ledger for a participant
 */
export async function getTimeBankLedger(userId) {
  const res = await query(`
    SELECT l.*, u.full_name as approved_by_name
    FROM time_bank_ledger l
    LEFT JOIN users u ON l.approved_by = u.user_id
    WHERE l.user_id = $1
    ORDER BY l.created_at DESC, l.ledger_id DESC
  `, [userId]);

  const balance = await getTimeBankBalance(userId);

  return {
    userId,
    currentBalanceHours: balance,
    transactions: res.rows
  };
}
