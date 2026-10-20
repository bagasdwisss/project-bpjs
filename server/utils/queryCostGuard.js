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
 * Executes a query with a strict statement_timeout budget.
 * Automatically cancels runaway queries when the budget is exceeded.
 */
export async function runBudgetedQuery(sql, params = [], timeoutMs = 2500) {
  const client = await pool.connect();
  const startTime = Date.now();
  budgetMetrics.totalBudgetedQueries++;

  try {
    // 1. Set local statement timeout for this specific query transaction
    await client.query(`SET LOCAL statement_timeout = '${timeoutMs}ms'`);

    // 2. Execute query
    const res = await client.query(sql, params);
    const duration = Date.now() - startTime;

    budgetMetrics.queriesWithinBudget++;
    budgetMetrics.averageExecutionMs = Number(
      ((budgetMetrics.averageExecutionMs * (budgetMetrics.queriesWithinBudget - 1) + duration) / budgetMetrics.queriesWithinBudget).toFixed(2)
    );

    if (duration > 500) {
      slowQueryHistory.unshift({
        sql: sql.substring(0, 120),
        durationMs: duration,
        budgetMs: timeoutMs,
        status: 'WARNING_SLOW',
        executedAt: new Date().toISOString()
      });
      if (slowQueryHistory.length > 50) slowQueryHistory.pop();
    }

    return res;
  } catch (err) {
    const duration = Date.now() - startTime;
    // Check if cancelled due to statement timeout (PostgreSQL error 57014: query_canceled)
    if (err.code === '57014' || err.message?.includes('statement timeout')) {
      budgetMetrics.cancelledByTimeout++;
      slowQueryHistory.unshift({
        sql: sql.substring(0, 120),
        durationMs: duration,
        budgetMs: timeoutMs,
        status: 'CANCELLED_EXCEEDED_BUDGET',
        executedAt: new Date().toISOString()
      });
      if (slowQueryHistory.length > 50) slowQueryHistory.pop();

      const timeoutError = new Error(`Query dibatalkan otomatis oleh Query Cost Guard karena melebihi budget waktu ${timeoutMs}ms.`);
      timeoutError.code = 'QUERY_BUDGET_EXCEEDED';
      timeoutError.timeoutMs = timeoutMs;
      throw timeoutError;
    }
    throw err;
  } finally {
    try {
      await client.query(`RESET statement_timeout`);
    } catch (_) {}
    client.release();
  }
}

/**
 * Returns current metrics and slow query execution logs
 */
export function getQueryBudgetMetrics() {
  return {
    metrics: budgetMetrics,
    recentSlowQueries: slowQueryHistory.slice(0, 15),
    defaultBudgetMs: 2500,
    policy: 'Hard auto-cancel on statement_timeout threshold (PG 57014)'
  };
}
