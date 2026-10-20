// server/middleware/securityHeaders.js - Enterprise HTTP Header Hardening (CSP & Permissions-Policy Strict)
export const securityHeadersMiddleware = (req, res, next) => {
  // 1. Content Security Policy (Strict, preventing XSS and unauthorized frame injection)
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
      "connect-src 'self' https: wss: ws:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "report-uri /api/security/csp-report"
    ].join('; ')
  );

  // 2. Strict Permissions-Policy (Restricting device hardware APIs to same-origin explicitly)
  res.setHeader(
    'Permissions-Policy',
    'camera=(self), geolocation=(self), microphone=(), payment=(), usb=(), display-capture=(self)'
  );

  // 3. MIME Sniffing Protection
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 4. Clickjacking Prevention
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // 5. Cross-site Scripting Filter (Legacy & Modern browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // 6. Strict Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 7. Strict-Transport-Security (HSTS: 1 Year, includes subdomains)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // 8. Cross-Origin Protections
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');

  next();
};

export default securityHeadersMiddleware;
