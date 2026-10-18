// server/middleware/rateLimiter.js - Sliding-Window Rate Limiter & Brute-Force IP Jailing
const ipWindows = new Map();
const ipAuthFails = new Map();
const ipJails = new Map();

// Helper to clean up expired windows periodically (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipWindows.entries()) {
    if (now - data.startTime > 120000) ipWindows.delete(ip);
  }
  for (const [ip, jail] of ipJails.entries()) {
    if (now > jail.until) ipJails.delete(ip);
  }
  for (const [ip, fails] of ipAuthFails.entries()) {
    if (now - fails.lastAttempt > 900000) ipAuthFails.delete(ip);
  }
}, 600000);

export const recordFailedAuth = (ip) => {
  const now = Date.now();
  const current = ipAuthFails.get(ip) || { count: 0, lastAttempt: now };
  current.count += 1;
  current.lastAttempt = now;
  ipAuthFails.set(ip, current);

  // If failed 10 times in 15 minutes, JAIL IP for 30 minutes
  if (current.count >= 10) {
    const jailUntil = now + 30 * 60 * 1000;
    ipJails.set(ip, {
      until: jailUntil,
      reason: 'Aktivitas percobaan login berulang (Brute-Force / Credential Stuffing)'
    });
    console.warn(`🚨 [Security Alert] IP ${ip} telah di-JAIL hingga ${new Date(jailUntil).toISOString()} karena brute-force!`);
  }
};

export const recordSuccessAuth = (ip) => {
  ipAuthFails.delete(ip);
};

export const slidingWindowRateLimiter = (options = {}) => {
  const windowMs = options.windowMs || 60 * 1000; // default 1 minute
  const maxRequests = options.max || 180; // default 180 requests per minute

  return (req, res, next) => {
    // Determine real client IP
    const clientIp = (
      req.headers['x-forwarded-for']?.split(',')[0] || 
      req.socket.remoteAddress || 
      '127.0.0.1'
    ).trim();

    const now = Date.now();

    // 1. Check if IP is currently JAILED
    const jail = ipJails.get(clientIp);
    if (jail) {
      if (now < jail.until) {
        const remainingSec = Math.ceil((jail.until - now) / 1000);
        res.setHeader('Retry-After', remainingSec);
        res.setHeader('X-Jail-Status', 'ACTIVE');
        return res.status(403).json({
          success: false,
          code: 'IP_JAILED',
          message: `Akses ditolak. IP Anda (${clientIp}) telah di-jail sementara selama ${Math.ceil(remainingSec / 60)} menit lagi karena indikasi serangan brute-force / credential stuffing.`,
          remainingSeconds: remainingSec
        });
      } else {
        // Jail expired
        ipJails.delete(clientIp);
      }
    }

    // 2. Sliding Window Counter
    let windowData = ipWindows.get(clientIp);
    if (!windowData || now - windowData.startTime > windowMs) {
      windowData = { count: 1, startTime: now };
      ipWindows.set(clientIp, windowData);
    } else {
      windowData.count += 1;
    }

    const remaining = Math.max(0, maxRequests - windowData.count);
    const resetTime = Math.ceil((windowData.startTime + windowMs) / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime);

    if (windowData.count > maxRequests) {
      res.setHeader('Retry-After', Math.ceil((windowData.startTime + windowMs - now) / 1000));
      return res.status(429).json({
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Batas frekuensi request terlampaui (Rate Limit Exceeded). Harap perlambat laju interaksi Anda.'
      });
    }

    next();
  };
};

export default slidingWindowRateLimiter;
