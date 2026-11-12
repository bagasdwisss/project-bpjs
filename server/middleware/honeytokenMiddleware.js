// server/middleware/honeytokenMiddleware.js - Early Intrusion Detection & Honeytoken Trap Guard
import { query } from '../db.js';
import { dispatchIncidentAlert } from '../utils/incidentNotifier.js';

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
  '/.git/config',
  '/api/v1/shadow-tokens',
  '/api/shadow-tokens',
  '/api/admin/pg_shadow_tokens',
  '/api/pg_shadow_tokens',
  '/api/v1/pg_shadow_tokens'
]);

// Short-lived local jail cache (synchronized against jailed_ips PostgreSQL table)
const inMemoryJail = new Map(); // ip -> { jailedUntil, checkedAt }
const JAIL_CACHE_TTL_MS = 15000;

export const isIpJailed = async (ip) => {
  const cached = inMemoryJail.get(ip);
  const now = Date.now();
  if (cached && now - cached.checkedAt < JAIL_CACHE_TTL_MS) {
    if (!cached.jailedUntil) return false;
    if (now > cached.jailedUntil) {
      inMemoryJail.delete(ip);
      return false;
    }
    return true;
  }

  try {
    const dbRes = await query(
      `SELECT jailed_until FROM jailed_ips
       WHERE ip = $1 AND is_active = TRUE AND jailed_until > CURRENT_TIMESTAMP
       LIMIT 1`,
      [ip]
    );
    if (dbRes.rows.length > 0) {
      const until = new Date(dbRes.rows[0].jailed_until).getTime();
      inMemoryJail.set(ip, { jailedUntil: until, checkedAt: now });
      return true;
    }
    inMemoryJail.set(ip, { jailedUntil: null, checkedAt: now });
    return false;
  } catch {
    return Boolean(cached?.jailedUntil && now <= cached.jailedUntil);
  }
};

export const unbanIp = async (ip) => {
  inMemoryJail.delete(ip);
  try {
    await query(`UPDATE jailed_ips SET is_active = FALSE WHERE ip = $1`, [ip]);
  } catch (err) {
    console.error('Failed to unban IP in database:', err.message);
  }
};

export const honeytokenMiddleware = async (req, res, next) => {
  const clientIp = (req.headers['x-forwarded-for']?.split(',')[0] || req.ip || '127.0.0.1').trim();
  const reqPath = req.path.toLowerCase();

  // 1. Check PostgreSQL-backed + cached jail list
  if (await isIpJailed(clientIp)) {
    return res.status(403).json({
      success: false,
      code: 'IP_JAILED_THREAT_DETECTED',
      message: 'Akses Ditolak: Alamat IP Anda telah dibekukan sementara oleh BPJSTK Intrusion Prevention System karena aktivitas mencurigakan.'
    });
  }

  // 2. Match explicit honeytoken trap paths or explicit SQLi probing of pg_shadow_tokens
  const rawUrl = (req.originalUrl || req.url || '').toLowerCase();
  const hasShadowTokenInQuery = rawUrl.includes('pg_shadow_tokens') || reqPath.includes('shadow-tokens');
  const isTrap = HONEYTOKEN_PATHS.has(reqPath) ||
                 Array.from(HONEYTOKEN_PATHS).some(p => reqPath === p || reqPath.startsWith(p + '/')) ||
                 hasShadowTokenInQuery;

  if (isTrap) {
    const jailDurationMs = 24 * 60 * 60 * 1000;
    const unjailTime = new Date(Date.now() + jailDurationMs);
    inMemoryJail.set(clientIp, { jailedUntil: unjailTime.getTime(), checkedAt: Date.now() });

    console.warn(`🚨 [HONEYTOKEN TRIGGERED] IP ${clientIp} stepped into trap: ${req.path}`);

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

      await dispatchIncidentAlert({
        alertType: hasShadowTokenInQuery ? 'AUTONOMOUS_SQLI_SHADOW_TOKENS_PROBE' : 'HONEYTOKEN_INTRUSION_TRAP',
        severity: 'CRITICAL',
        sourceIp: clientIp,
        userId: req.user?.user_id || null,
        details: {
          path: reqPath,
          rawUrl,
          method: req.method,
          userAgent: req.headers['user-agent'],
          jailedUntil: unjailTime.toISOString()
        }
      });
    } catch (dbErr) {
      console.error('Honeytoken trap persistence warning:', dbErr.message);
    }

    return res.status(403).json({
      success: false,
      code: 'ACCESS_PROHIBITED_HONEYTOKEN',
      message: 'Peringatan Keamanan BPJSTK: Aktivitas intrusi terdeteksi. Alamat IP telah dicatat dan dimasukkan ke daftar pemblokiran.'
    });
  }

  next();
};

export default honeytokenMiddleware;
