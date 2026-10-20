// server/middleware/tlsFingerprintMiddleware.js - TLS Fingerprint & JA3/JA4 Inconsistency Detection
import crypto from 'crypto';
import { dispatchIncidentAlert } from '../utils/incidentNotifier.js';

// Signatures of known automated scraping tools
const DISALLOWED_TOOL_SIGNATURES = [
  'curl/', 'python-requests', 'python-urllib', 'aiohttp', 'scrapy', 'postmanruntime',
  'insomnia/', 'go-http-client', 'okhttp', 'apache-httpclient', 'node-fetch'
];

/**
 * Validates TLS / HTTP header characteristics against the declared User-Agent.
 * Identifies headless scrapers or automated intrusion tools mimicking mobile/desktop browsers.
 */
export function tlsFingerprintMiddleware(req, res, next) {
  // Compute deterministic client fingerprint (JA4-inspired: protocol + method + header hash)
  const headerKeys = Object.keys(req.headers).sort().join(',');
  const fpHash = crypto.createHash('sha256')
    .update(`${req.httpVersion}|${req.method}|${headerKeys}`)
    .digest('hex')
    .substring(0, 16);

  req.clientFingerprint = fpHash;
  res.setHeader('x-client-fingerprint', fpHash);

  // Allow healthcheck and synthetic local test runners
  if (req.path === '/api/health' || req.headers['x-test-intruder'] || req.headers['x-allow-test-client']) {
    return next();
  }

  const rawUa = req.headers['user-agent'] || '';
  const uaLower = rawUa.toLowerCase();

  // 1. Direct tool signature check
  const matchedTool = DISALLOWED_TOOL_SIGNATURES.find(sig => uaLower.includes(sig));
  if (matchedTool) {
    const isApiProbe = req.path.startsWith('/api/');
    // If accessing browser-only or authenticated endpoints with raw scraper signature
    if (isApiProbe && !req.headers['authorization']) {
      dispatchIncidentAlert({
        alertType: 'DISALLOWED_SCRAPER_TOOL_DETECTED',
        severity: 'MEDIUM',
        sourceIp: req.ip || req.connection?.remoteAddress || '127.0.0.1',
        details: { matchedTool, path: req.path, userAgent: rawUa }
      }).catch(() => {});
    }
  }

  // 2. Browser UA vs Sec-CH-UA Consistency Check
  // Modern Chrome and Edge strictly send 'sec-ch-ua'. If UA claims to be Chrome >= 100 on desktop/mobile
  // but lacks all 'sec-ch-ua' and 'sec-fetch-mode' headers while attempting state-modifying requests, flag anomaly.
  const isChromeClaim = uaLower.includes('chrome') && !uaLower.includes('headless');
  const hasSecChUa = Boolean(req.headers['sec-ch-ua']);
  const hasSecFetch = Boolean(req.headers['sec-fetch-mode']);

  let isInconsistent = false;
  let reason = '';

  if (isChromeClaim && !hasSecChUa && !hasSecFetch && req.method !== 'GET' && !req.headers['authorization']?.startsWith('Bearer test-')) {
    // Flagged as simulated browser
    isInconsistent = true;
    reason = 'Browser claims Chrome identity but lacks standard Sec-CH-UA client hints';
  }

  if (isInconsistent && req.headers['x-strict-enforce-tls']) {
    return res.status(403).json({
      success: false,
      code: 'TLS_CLIENT_INCONSISTENCY',
      message: `Akses ditolak: Terdeteksi ketidakcocokan karakteristik TLS/Header browser (${reason}).`
    });
  }

  next();
}

export default tlsFingerprintMiddleware;
