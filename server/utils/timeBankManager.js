// server/utils/timeBankManager.js - Time-Bank Overtime & Comp-Time Ledger
import { query } from '../db.js';

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
 * Records overtime hours earned by a participant in the field
 */
export async function recordOvertimeHours({ userId, hours, eventDesc, approvedBy }) {
  const currentBalance = await getTimeBankBalance(userId);
  const parsedHours = parseFloat(hours);
  const newBalance = currentBalance + parsedHours;

  const res = await query(`
    INSERT INTO time_bank_ledger (
      user_id, transaction_type, hours_amount, event_description, approved_by, balance_after, status
    ) VALUES ($1, 'EARNED_OVERTIME', $2, $3, $4, $5, 'APPROVED')
    RETURNING *
  `, [userId, parsedHours, eventDesc, approvedBy, newBalance]);

  return {
    success: true,
    ledger: res.rows[0],
    previousBalance: currentBalance,
    newBalance
  };
}

/**
 * Claims accumulated time-bank hours as compensatory leave (comp-time)
 */
export async function claimCompTimeLeave({ userId, hours, reason }) {
  const currentBalance = await getTimeBankBalance(userId);
  const parsedHours = parseFloat(hours);

  if (currentBalance < parsedHours) {
    throw new Error(`Saldo Time-Bank tidak mencukupi (Tersedia: ${currentBalance} jam, Diajukan: ${parsedHours} jam).`);
  }

  const newBalance = currentBalance - parsedHours;

  const res = await query(`
    INSERT INTO time_bank_ledger (
      user_id, transaction_type, hours_amount, event_description, balance_after, status
    ) VALUES ($1, 'CLAIMED_LEAVE', $2, $3, $4)
    RETURNING *
  `, [userId, parsedHours, `Klaim Cuti Kompensasi: ${reason}`, newBalance, 'APPROVED']);

  return {
    success: true,
    ledger: res.rows[0],
    previousBalance: currentBalance,
    newBalance
  };
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
    ORDER BY l.created_at DESC
  `, [userId]);

  const balance = await getTimeBankBalance(userId);

  return {
    userId,
    currentBalanceHours: balance,
    transactions: res.rows
  };
}
