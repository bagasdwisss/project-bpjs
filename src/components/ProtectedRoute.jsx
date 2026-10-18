import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import authService from '../services/authService';
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';
import PageLoader from './Common/PageLoader';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  // Inactivity check on protected route access
  const storedLastActive = parseInt(localStorage.getItem('last_active_time') || '0', 10);
  const configuredMinutes = parseInt(localStorage.getItem('sys_inactivity_minutes') || '15', 10);
  const INACTIVITY_TIMEOUT_MS = (configuredMinutes > 0 ? configuredMinutes : 15) * 60 * 1000;
  if (storedLastActive && (Date.now() - storedLastActive > INACTIVITY_TIMEOUT_MS)) {
    authService.clearAuth();
    return <Navigate to="/login?reason=idle_timeout" replace />;
  }

  if (!isAuthenticated) {
    // Redirect ke login dengan return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Jika ada allowedRoles dan user role tidak termasuk, tampilkan error 403
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    console.warn('Access denied:', {
      userRole: user?.role,
      allowedRoles: allowedRoles,
      path: location.pathname
    });
    
    return (
      <div className="min-h-screen bg-[#F5F4F0] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[26px] border border-[#EAE9E4] shadow-xl p-8 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 bg-[#F5C6EC]/40 border border-[#F5C6EC] rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#8B2471]">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-[#121214] mb-2">403 — Akses Ditolak</h2>
          <p className="text-xs sm:text-sm text-[#121214]/60 mb-6">
            Anda tidak memiliki izin hak akses untuk membuka halaman ini.
            <br />
            <span className="inline-block mt-2 px-3 py-1 bg-[#FAF9F6] border border-[#EAE9E4] rounded-full text-xs font-bold text-[#121214]">
              Role Aktif: {user?.role || 'Tidak terdeteksi'}
            </span>
          </p>
          <div className="space-y-2.5">
            <button
              onClick={() => window.history.back()}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#121214] hover:bg-black text-white font-bold py-2.5 px-4 rounded-full text-xs transition shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke Halaman Sebelumnya
            </button>
            <button
              onClick={() => window.location.href = '/login'}
              className="w-full inline-flex items-center justify-center gap-2 bg-white border border-[#EAE9E4] hover:bg-[#FAF9F6] text-[#121214] font-bold py-2.5 px-4 rounded-full text-xs transition shadow-sm"
            >
              <LogIn className="w-4 h-4" /> Masuk dengan Akun Lain
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;