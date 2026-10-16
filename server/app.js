// server/app.js - Central Express Application Setup
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import pool from './db.js';
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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Optimasi HTTP Caching & Request: Strong ETag untuk 304 Not Modified
app.set('etag', 'strong');

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use((req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', 'private, must-revalidate');
  }
  next();
});

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Helper router to mount endpoints under both /api/... and /...
const apiRouter = express.Router();

// Real-time Healthcheck & Database Status
apiRouter.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let tables = [];
  try {
    const dbTest = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    dbStatus = 'connected';
    tables = dbTest.rows.map(r => r.table_name);
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'BPJSTK Absensi & Nilai API',
    database: {
      provider: 'Neon Serverless PostgreSQL',
      status: dbStatus,
      tablesCount: tables.length,
      initialized: tables.includes('users') && tables.includes('roles'),
      initHelp: tables.includes('users') ? 'Database ready!' : 'Database sedang dipersiapkan'
    }
  });
});

// One-Click Database Initialization Endpoint for Vercel + Neon
apiRouter.all('/init-db', async (req, res) => {
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
      message: '🎉 Inisialisasi Database Neon PostgreSQL Berhasil!',
      description: 'Semua tabel, view, dan data awal (roles, default users, batches, dll) telah terpasang.',
      accounts: {
        admin: 'ADM001 (Password: password123)',
        koordinator: 'KO001 (Password: password123)',
        peserta: 'PES001 (Password: password123)'
      }
    });
  } catch (err) {
    console.error('Inisialisasi DB Error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal menginisialisasi database: ' + err.message
    });
  }
});

// Mount modular sub-routers
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
apiRouter.use('/coordinator/participants', userRoutes);
apiRouter.use('/coordinator/scores', scoreRoutes);
apiRouter.use('/coordinator', pesertaRoutes);

// System Version & Live Update Tracker
// Direct shortcuts often called by frontend
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
    console.log(`🚀 BPJS API server running on port ${PORT}`);
    console.log(`📦 Neon PostgreSQL target configured`);
  });
}

export default app;
