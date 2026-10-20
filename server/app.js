// server/app.js - Central Express Application Setup
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import pool, { circuitBreaker } from './db.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import gradingRoutes from './routes/grading.js';
import userRoutes from './routes/users.js';
import attendanceRoutes from './routes/attendance.js';
import scoreRoutes from './routes/scores.js';
import pesertaRoutes from './routes/peserta.js';
import eventRoutes from './routes/events.js';
import notificationRoutes from './routes/notifications.js';
import forumRoutes from './routes/forum.js';
import documentRoutes from './routes/documents.js';
import batchRoutes from './routes/batches.js';
import moduleRoutes from './routes/modules.js';
import adminRoutes from './routes/admin.js';
import featuresRoutes from './routes/features.js';

// Enterprise Middlewares
import securityHeadersMiddleware from './middleware/securityHeaders.js';
import compressionMiddleware from './middleware/compressionMiddleware.js';
import slidingWindowRateLimiter from './middleware/rateLimiter.js';
import maintenanceMiddleware from './middleware/maintenanceMiddleware.js';
import deviceGuardMiddleware from './middleware/deviceGuard.js';
import honeytokenMiddleware from './middleware/honeytokenMiddleware.js';
import correlationMiddleware from './middleware/correlationMiddleware.js';
import etagCacheMiddleware from './middleware/etagCacheMiddleware.js';
import payloadDeobfuscatorMiddleware from './middleware/payloadDeobfuscator.js';
import tlsFingerprintMiddleware from './middleware/tlsFingerprintMiddleware.js';
import edgeGeoTaggerMiddleware from './middleware/edgeGeoTagger.js';
import idempotencyMiddleware from './middleware/idempotencyMiddleware.js';
import { triggerCanaryAccess } from './utils/canaryStorage.js';
import { recordLatencySample } from './utils/telemetryTracker.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security: Disable X-Powered-By to prevent technology fingerprinting
app.disable('x-powered-by');

// 1. Distributed Tracing & Correlation ID Injection (Feature 11)
app.use(correlationMiddleware);

// 2. Telemetry Latency Tracking on Request Completion (Feature 9)
app.use((req, res, next) => {
  res.on('finish', () => {
    if (req._startTimeHr) {
      const elapsedNs = process.hrtime.bigint() - req._startTimeHr;
      const elapsedMs = Number(elapsedNs) / 1e6;
      recordLatencySample(elapsedMs, req.path, res.statusCode);
    }
  });
  next();
});

// 3. Early Honeytoken & Fake Admin Intrusion Trap Guard (Feature 1)
app.use(honeytokenMiddleware);

// 4. Enterprise HTTP Header Hardening (CSP, HSTS, Permissions-Policy Strict)
app.use(securityHeadersMiddleware);

// 5. Brotli & Gzip Compression Middleware
app.use(compressionMiddleware);

// 6. Sliding-Window Rate Limiter & Brute-Force IP Jailing
app.use(slidingWindowRateLimiter({ max: 200, windowMs: 60 * 1000 }));

// Optimasi HTTP Caching & Request: Strong ETag untuk 304 Not Modified
app.set('etag', 'strong');

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'x-init-key',
    'x-device-fingerprint',
    'x-security-pin',
    'x-correlation-id',
    'x-signature',
    'x-timestamp',
    'x-nonce',
    'x-payload-obfuscated',
    'x-ephemeral-salt',
    'x-payload-timestamp',
    'if-none-match',
    'x-idempotency-key',
    'x-pow-challenge-id',
    'x-pow-nonce',
    'x-client-fingerprint',
    'x-strict-enforce-tls',
    'x-bypass-pow'
  ]
}));

// Client-Side TLS Fingerprint & JA3 / JA4 Inconsistency Detection (Feature 1)
app.use(tlsFingerprintMiddleware);

// Automated Edge Geolocation Tagging (Feature 20)
app.use(edgeGeoTaggerMiddleware);

// Intelligent HTTP 304 ETag State Caching Engine (Feature 11)
app.use(etagCacheMiddleware());

app.use((req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', 'private, must-revalidate');
  }
  next();
});

// Dynamic Maintenance Mode Switch with Admin Bypass
app.use(maintenanceMiddleware);

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Polymorphic Request Deobfuscation
app.use(payloadDeobfuscatorMiddleware);

// Anti-Duplicate Transaction Idempotency Key Engine (Feature 16)
app.use(idempotencyMiddleware);

// Direct Decoy File Canary Traps Route (Feature 4)
app.get(['/storage/confidential/:filename', '/api/storage/canary/:filename'], async (req, res) => {
  const result = await triggerCanaryAccess({
    filename: req.params.filename,
    ip: req.ip || req.connection?.remoteAddress || '127.0.0.1',
    userAgent: req.headers['user-agent']
  });

  if (!result) {
    return res.status(404).json({ success: false, message: 'Berkas tidak ditemukan.' });
  }

  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `inline; filename="${result.canary.filename}"`);
  return res.send(result.content);
});

// Helper router to mount endpoints under both /api/... and /...
const apiRouter = express.Router();

// Real-time Healthcheck & Circuit Breaker Status
apiRouter.get('/health', async (req, res) => {
  let isDbConnected = false;
  try {
    await pool.query('SELECT 1');
    isDbConnected = true;
  } catch (err) {
    isDbConnected = false;
  }

  const circuitStatus = circuitBreaker.getStatus();

  res.json({
    status: isDbConnected && !circuitStatus.isDegraded ? 'healthy' : 'degraded',
    service: 'BPJSTK Absensi & Penilaian API (Enterprise Grade)',
    database: isDbConnected ? 'connected' : 'disconnected',
    circuitBreaker: circuitStatus,
    timestamp: new Date().toISOString()
  });
});

// Protected Database Initialization Endpoint (Requires secret key, blocks unauthenticated wiping)
apiRouter.all('/init-db', async (req, res) => {
  const initKey = req.headers['x-init-key'] || req.query.key;
  const expectedKey = process.env.INIT_DB_KEY;

  if (!expectedKey || initKey !== expectedKey) {
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak. Operasi inisialisasi basis data memerlukan otentikasi kunci administratif khusus.'
    });
  }

  try {
    let sqlPath = path.resolve(__dirname, '../neon_schema.sql');
    if (!fs.existsSync(sqlPath)) {
      return res.status(404).json({
        success: false,
        message: 'File neon_schema.sql tidak ditemukan di server.'
      });
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sqlContent);

    res.json({
      success: true,
      message: 'Inisialisasi Database Neon PostgreSQL Berhasil.',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Inisialisasi DB Error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal menginisialisasi database.'
    });
  }
});

// Mount modular sub-routers
apiRouter.use('/auth', authRoutes);
apiRouter.use('/', authRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/grading', gradingRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/participant/attendance', attendanceRoutes);
apiRouter.use('/participant/scores', scoreRoutes);
apiRouter.use('/participant', pesertaRoutes);
apiRouter.use('/events', eventRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/forum', forumRoutes);
apiRouter.use('/documents', documentRoutes);
apiRouter.use('/participant/documents', documentRoutes);
// Enterprise Features Routes
apiRouter.use('/features', featuresRoutes);
apiRouter.use('/admin', featuresRoutes);
apiRouter.use('/', featuresRoutes);

apiRouter.use('/admin/batches', batchRoutes);
apiRouter.use('/admin/modules', moduleRoutes);
apiRouter.use('/admin', adminRoutes);

// Coordinator routes
apiRouter.use('/coordinator/certificates', adminRoutes);
apiRouter.use('/coordinator/analysis', scoreRoutes);
apiRouter.use('/coordinator', adminRoutes);
apiRouter.use('/coordinator/participants', userRoutes);
apiRouter.use('/coordinator/scores', scoreRoutes);
apiRouter.use('/coordinator', pesertaRoutes);

// Direct shortcuts often called by frontend
apiRouter.use('/progress', (req, res, next) => {
  req.url = '/progress' + (req.url === '/' ? '' : req.url);
  userRoutes(req, res, next);
});

apiRouter.use('/visits', (req, res, next) => {
  req.url = '/visits' + (req.url === '/' ? '' : req.url);
  userRoutes(req, res, next);
});

apiRouter.get('/coordinators', (req, res, next) => {
  req.url = '/coordinators';
  userRoutes(req, res, next);
});

apiRouter.get('/coordinator', (req, res, next) => {
  req.url = '/profile';
  authRoutes(req, res, next);
});

// Mount on both /api and root to handle any rewrite setup
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start local standalone server only when NOT on Vercel
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 BPJSTK API server running on port ${PORT}`);
    console.log(`📦 Neon PostgreSQL target configured`);
  });
}

export default app;
