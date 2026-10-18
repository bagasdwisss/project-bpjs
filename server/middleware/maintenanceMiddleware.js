// server/middleware/maintenanceMiddleware.js - Dynamic Maintenance Mode with Admin Bypass
import { query } from '../db.js';
import cache from '../utils/cache.js';
import jwt from 'jsonwebtoken';

export const getMaintenanceSettings = async () => {
  return await cache.getOrSet('sys_maintenance_settings', async () => {
    try {
      const res = await query(
        `SELECT setting_key, setting_value FROM system_settings 
         WHERE setting_key IN ('maintenance_mode', 'maintenance_message', 'maintenance_estimated_end')`
      );
      const settings = {
        is_active: false,
        message: 'Sistem Absensi & Penilaian BPJSTK sedang dalam pemeliharaan berkala untuk optimalisasi performa.',
        estimated_end: null
      };

      for (const row of res.rows) {
        if (row.setting_key === 'maintenance_mode') {
          settings.is_active = row.setting_value === 'true' || row.setting_value === '1';
        } else if (row.setting_key === 'maintenance_message') {
          settings.message = row.setting_value;
        } else if (row.setting_key === 'maintenance_estimated_end') {
          settings.estimated_end = row.setting_value || null;
        }
      }
      return settings;
    } catch (err) {
      console.error('Error fetching maintenance settings:', err.message);
      return { is_active: false, message: '', estimated_end: null };
    }
  }, 10000); // 10s TTL for snappy admin toggles
};

export const maintenanceMiddleware = async (req, res, next) => {
  // Always permit public health check, DB init, and auth login so admin can log in to turn it off
  const publicBypass = [
    '/health',
    '/api/health',
    '/login',
    '/api/login',
    '/init-db',
    '/api/init-db',
    '/admin/system/maintenance',
    '/api/admin/system/maintenance'
  ];

  if (publicBypass.some(path => req.path.startsWith(path))) {
    return next();
  }

  const settings = await getMaintenanceSettings();

  if (!settings.is_active) {
    return next();
  }

  // Check if requester has Administrator token
  let isAdmin = false;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.decode(token);
      if (decoded && (decoded.role === 'Administrator' || decoded.role_id === 3)) {
        isAdmin = true;
      }
    } catch (e) {
      isAdmin = false;
    }
  }

  // Admin accounts bypass maintenance mode completely
  if (isAdmin) {
    res.setHeader('X-System-Maintenance', 'ADMIN_BYPASS');
    return next();
  }

  return res.status(503).json({
    success: false,
    code: 'MAINTENANCE_MODE_ACTIVE',
    title: 'Sistem Dalam Pemeliharaan Berkala',
    message: settings.message,
    estimatedEnd: settings.estimated_end,
    timestamp: new Date().toISOString()
  });
};

export default maintenanceMiddleware;
