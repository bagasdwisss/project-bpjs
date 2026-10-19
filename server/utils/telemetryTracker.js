// server/utils/telemetryTracker.js - Vercel Cold-Start & Latency Telemetry Tracker
import pool from '../db.js';

// Server instance startup timestamp
const serverStartTime = Date.now();
const coldStartDurationMs = Math.round(process.uptime() * 1000);

// Rolling in-memory buffer of response latencies (max 1000 samples)
const latencySamples = [];
const MAX_SAMPLES = 1000;

export const recordLatencySample = (latencyMs, path, statusCode) => {
  // Avoid recording telemetry endpoint itself
  if (path?.includes('/telemetry')) return;

  latencySamples.push({
    latency: Math.round(latencyMs * 100) / 100,
    statusCode,
    timestamp: Date.now()
  });

  if (latencySamples.length > MAX_SAMPLES) {
    latencySamples.shift();
  }
};

/**
 * Calculate percentile latency (P50, P95, P99)
 */
const calculatePercentile = (sortedArr, percentile) => {
  if (sortedArr.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, Math.min(index, sortedArr.length - 1))];
};

/**
 * Get comprehensive telemetry metrics report
 */
export const getTelemetryMetrics = async () => {
  const mem = process.memoryUsage();
  const sortedLatencies = latencySamples.map(s => s.latency).sort((a, b) => a - b);

  // Measure live database query latency (SELECT 1 ping)
  let dbPingMs = null;
  const dbStart = process.hrtime.bigint();
  try {
    await pool.query('SELECT 1');
    const dbElapsed = process.hrtime.bigint() - dbStart;
    dbPingMs = Math.round((Number(dbElapsed) / 1e6) * 100) / 100;
  } catch (err) {
    dbPingMs = -1; // DB connectivity error
  }

  const p50 = calculatePercentile(sortedLatencies, 50);
  const p95 = calculatePercentile(sortedLatencies, 95);
  const p99 = calculatePercentile(sortedLatencies, 99);
  const avg = sortedLatencies.length > 0
    ? Math.round((sortedLatencies.reduce((a, b) => a + b, 0) / sortedLatencies.length) * 100) / 100
    : 0;

  return {
    serverInstance: {
      uptimeSeconds: Math.round(process.uptime()),
      startedAt: new Date(serverStartTime).toISOString(),
      coldStartDurationMs,
      nodeVersion: process.version,
      platform: process.platform,
      isServerlessVercel: !!process.env.VERCEL
    },
    performance: {
      totalRequestsTracked: latencySamples.length,
      p50LatencyMs: p50,
      p95LatencyMs: p95,
      p99LatencyMs: p99,
      avgLatencyMs: avg,
      databasePingMs: dbPingMs,
      recentSamples: latencySamples.slice(-20)
    },
    memory: {
      rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
      heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      externalMb: Math.round((mem.external / 1024 / 1024) * 100) / 100
    },
    timestamp: new Date().toISOString()
  };
};

export default {
  recordLatencySample,
  getTelemetryMetrics
};
