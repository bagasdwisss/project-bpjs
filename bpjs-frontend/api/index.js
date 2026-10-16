// api/index.js - Full Express Server & Vercel Serverless Handler
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Helper router to mount endpoints under both /api/... and /...
const apiRouter = express.Router();

// Healthcheck
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'BPJS Absensi & Nilai API',
    database: 'Neon PostgreSQL'
  });
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
apiRouter.use('/admin/batches', batchRoutes);
apiRouter.use('/admin/modules', moduleRoutes);
apiRouter.use('/admin', adminRoutes);

// Coordinator routes
apiRouter.use('/coordinator/certificates', adminRoutes);
apiRouter.use('/coordinator/participants', userRoutes);
apiRouter.use('/coordinator/scores', scoreRoutes);

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

// Start local standalone server if not invoked as a serverless lambda
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 BPJS API server running on port ${PORT}`);
    console.log(`📦 Neon PostgreSQL target configured`);
  });
}

export default app;
