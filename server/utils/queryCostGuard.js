// server/utils/queryCostGuard.js - Statement Timeout Budgeting & Slow Query Guard
import pool from '../db.js';

const slowQueryHistory = [];
const budgetMetrics = {
  totalBudgetedQueries: 0,
  queriesWithinBudget: 0,
  cancelledByTimeout: 0,
  averageExecutionMs: 0
};

/**
 * Executes a query inside a transaction with a strict transaction-scoped statement_timeout budget.
 */
export async function runBudgetedQuery(sql, params = [], timeoutMs = 2500) {
  const safeTimeoutMs = Math.min(Math.max(parseInt(timeoutMs, 10) || 2500, 100), 30000);
  const client = await pool.connect();
  const startTime = Date.now();
  budgetMetrics.totalBudgetedQueries++;

  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('statement_timeout', $1, true)`, [`${safeTimeoutMs}ms`]);

    const res = await client.query(sql, params);
    await client.query('COMMIT');
    const duration = Date.now() - startTime;

    budgetMetrics.queriesWithinBudget++;
    budgetMetrics.averageExecutionMs = Number(
      ((budgetMetrics.averageExecutionMs * (budgetMetrics.queriesWithinBudget - 1) + duration) / budgetMetrics.queriesWithinBudget).toFixed(2)
    );

    if (duration > 500) {
      slowQueryHistory.unshift({
        sql: sql.substring(0, 120),
        durationMs: duration,
        budgetMs: safeTimeoutMs,
        status: 'WARNING_SLOW',
        executedAt: new Date().toISOString()
      });
      if (slowQueryHistory.length > 50) slowQueryHistory.pop();
    }

    return res;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    const duration = Date.now() - startTime;
    if (err.code === '57014' || err.message?.includes('statement timeout')) {
      budgetMetrics.cancelledByTimeout++;
      slowQueryHistory.unshift({
        sql: sql.substring(0, 120),
        durationMs: duration,
        budgetMs: safeTimeoutMs,
        status: 'CANCELLED_EXCEEDED_BUDGET',
        executedAt: new Date().toISOString()
      });
      if (slowQueryHistory.length > 50) slowQueryHistory.pop();

      const timeoutError = new Error(`Query dibatalkan otomatis oleh Query Cost Guard karena melebihi budget waktu ${safeTimeoutMs}ms.`);
      timeoutError.code = 'QUERY_BUDGET_EXCEEDED';
      timeoutError.timeoutMs = safeTimeoutMs;
      throw timeoutError;
    }
    throw err;
  } finally {
    client.release();
  }
}

export function getQueryBudgetMetrics() {
  return {
    metrics: budgetMetrics,
    recentSlowQueries: slowQueryHistory.slice(0, 15),
    defaultBudgetMs: 2500,
    policy: 'Hard auto-cancel on statement_timeout threshold (PG 57014)'
  };
}
