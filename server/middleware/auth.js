// api/middleware/auth.js
import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'bpjs-super-secret-key-2026-vercel-neon';

/**
 * Middleware to verify JWT token
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak. Token tidak disediakan.'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user from database to ensure user is active and exists
    const userRes = await query(
      `SELECT u.user_id, u.unique_id, u.full_name, u.role_id, u.coordinator_id, u.status, u.penempatan, u.current_session_token, r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = $1`,
      [decoded.user_id]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Pengguna tidak ditemukan.'
      });
    }

    const user = userRes.rows[0];

    // Single Session Protection: detect if user logged in on another device
    if (decoded.session_token && user.current_session_token && decoded.session_token !== user.current_session_token) {
      return res.status(401).json({
        success: false,
        code: 'CONCURRENT_LOGIN_DETECTED',
        message: 'Akun Anda terdeteksi baru saja login di perangkat atau browser lain. Sesi ini telah ditutup secara otomatis.'
      });
    }

    if (user.status && user.status.toLowerCase() !== 'aktif') {
      return res.status(403).json({
        success: false,
        message: 'Akun Anda sedang dinonaktifkan.'
      });
    }

    req.user = {
      ...user,
      role: user.role_name
    };

    next();
  } catch (err) {
    console.error('JWT Authentication error:', err.message);
    return res.status(401).json({
      success: false,
      message: 'Token tidak valid atau telah kedaluwarsa.'
    });
  }
};

/**
 * Middleware to enforce role restrictions
 * @param  {...string} allowedRoles e.g. 'Administrator', 'Koordinator', 'Peserta'
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const userRole = req.user.role || req.user.role_name;

    // Check by role name or role_id (1: Peserta, 2: Koordinator, 3: Administrator)
    const roleMap = {
      1: 'Peserta',
      2: 'Koordinator',
      3: 'Administrator'
    };

    const hasPermission = allowedRoles.some(role => 
      role.toLowerCase() === (userRole || '').toLowerCase() ||
      role.toLowerCase() === (roleMap[req.user.role_id] || '').toLowerCase()
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Akses dilarang. Anda tidak memiliki izin untuk tindakan ini.'
      });
    }

    next();
  };
};

export { JWT_SECRET };
