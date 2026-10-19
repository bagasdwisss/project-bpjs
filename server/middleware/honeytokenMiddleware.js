// server/middleware/honeytokenMiddleware.js - Early Intrusion Detection & Honeytoken Trap Guard
import { query } from '../db.js';

// Pre-defined honeytoken trap endpoints targeted by automated bot scanners
const HONEYTOKEN_PATHS = new Set([
  '/wp-admin',
  '/wp-login.php',
  '/phpmyadmin',
  '/api/v1/debug-db',
  '/admin-login',
  '/.env',
  '/config.json',
  '/xmlrpc.php',
  '/actuator/health',
  '/server-status',
  '/database_dump.sql',
  '/.git/config'
]);

// In-memory set for zero-overhead fast-rejection of jailed IPs
const inMemoryJail = new Map(); // ip -> unjailTimestamp

/**
 * Check if IP is currently jailed
 */
export const isIpJailed = (ip) => {
  const jailedUntil = inMemoryJail.get(ip);
  if (!jailedUntil) return false;
  if (Date.now() > jailedUntil) {
    inMemoryJail.delete(ip);
    return false;
  }
  return true;
};

/**
 * Unban an IP address
 */
export const unbanIp = async (ip) => {
  inMemoryJail.delete(ip);
  try {
    await query(`UPDATE jailed_ips SET is_active = FALSE WHERE ip = $1`, [ip]);
  } catch (err) {
    console.error('Failed to unban IP in database:', err.message);
  }
};

/**
 * Honeytoken & Jailed IP Interceptor Middleware
 */
export const honeytokenMiddleware = async (req, res, next) => {
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '127.0.0.1';
  const reqPath = req.path.toLowerCase();

  // 1. Fast-fail if IP is already in jail
  if (isIpJailed(clientIp)) {
    return res.status(403).json({
      success: false,
      code: 'IP_JAILED_THREAT_DETECTED',
      message: 'Akses Ditolak: Alamat IP Anda telah dibekukan sementara oleh BPJSTK Intrusion Prevention System karena aktivitas mencurigakan.'
    });
  }

  // 2. Check if request matches any honeytoken trap path
  const isTrap = HONEYTOKEN_PATHS.has(reqPath) || 
                 Array.from(HONEYTOKEN_PATHS).some(p => reqPath.startsWith(p));

  if (isTrap) {
    const jailDurationMs = 24 * 60 * 60 * 1000; // 24 hours
    const unjailTime = new Date(Date.now() + jailDurationMs);
    inMemoryJail.set(clientIp, unjailTime.getTime());

    console.warn(`🚨 [HONEYTOKEN TRIGGERED] IP ${clientIp} stepped into trap: ${req.path}`);

    // Persist intrusion record asynchronously
    try {
      await query(
        `INSERT INTO honeytoken_traps (trap_path, ip_address, user_agent, http_method, request_headers, severity, jailed_until)
         VALUES ($1, $2, $3, $4, $5, 'CRITICAL', $6)`,
        [reqPath, clientIp, req.headers['user-agent'] || 'Unknown', req.method, JSON.stringify(req.headers), unjailTime]
      );

      await query(
        `INSERT INTO jailed_ips (ip, reason, jailed_until, is_active)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (ip) DO UPDATE SET jailed_until = $3, is_active = TRUE`,
        [clientIp, `Menyentuh honeytoken trap path: ${reqPath}`, unjailTime]
      );
    } catch (dbErr) {
      console.error('Honeytoken trap persistence warning:', dbErr.message);
    }

    // Return generic forbidden deception
    return res.status(403).json({
      success: false,
      code: 'ACCESS_PROHIBITED_HONEYTOKEN',
      message: 'Peringatan Keamanan BPJSTK: Aktivitas intrusi terdeteksi. Alamat IP telah dicatat dan dimasukkan ke daftar pemblokiran.'
    });
  }

  next();
};

export default honeytokenMiddleware;
