import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  AlertTriangle, 
  Clock, 
  ShieldAlert 
} from 'lucide-react';
import logo from '../../assets/27102023_091008_dorong_universal.png';

const Login = () => {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');

  const [uniqueId, setUniqueId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [roleDetected, setRoleDetected] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const { user, login, error, clearError, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  // Redirect after authentication
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role_id === 1 || user.role === 'Peserta') {
        navigate('/participant/dashboard', { replace: true });
      } else if (user.role_id === 2 || user.role === 'Koordinator') {
        navigate('/coordinator/dashboard', { replace: true });
      } else if (user.role_id === 3 || user.role === 'Administrator') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/participant/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const detectRole = (id) => {
    if (id.startsWith('PES')) return 'Peserta';
    if (id.startsWith('KO')) return 'Koordinator';
    if (id.startsWith('ADM')) return 'Administrator';
    return '';
  };

  const handleUniqueIdChange = (e) => {
    const value = e.target.value.toUpperCase();
    setUniqueId(value);
    setRoleDetected(detectRole(value));
    setFormError('');
    clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    clearError();

    if (!uniqueId.trim()) {
      setFormError('ID Pengguna wajib diisi.');
      return;
    }

    if (!password) {
      setFormError('Kata Sandi wajib diisi.');
      return;
    }

    setLoading(true);

    try {
      const result = await login(uniqueId.trim(), password);
      if (!result.success) {
        setFormError(result.message || 'ID Pengguna atau Kata Sandi salah.');
      }
    } catch (err) {
      setFormError(err.message || 'Koneksi ke server terputus.');
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F5F4F0] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-3 border-[#121214] border-t-transparent animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-[#121214]">Mengarahkan ke dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F4F0] flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2.5 bg-white border border-[#EAE9E4] px-4 py-2 rounded-full shadow-sm">
            <div className="w-6 h-6 rounded-lg bg-[#F5C6EC] flex items-center justify-center overflow-hidden">
              <img src={logo} alt="BPJSTK Logo" width="16" height="16" loading="lazy" decoding="async" style={{ width: '16px', height: '16px', objectFit: 'contain' }} className="w-4 h-4 object-contain" />
            </div>
            <span className="font-bold text-base text-[#121214]">intelly</span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#121214] text-white px-2 py-0.5 rounded-full">
              BPJSTK Portal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121214] tracking-tight">
            Selamat Datang Kembali
          </h1>
          <p className="text-xs sm:text-sm text-[#6E6D6A]">
            Sistem Informasi Absensi & Penilaian Magang Terintegrasi
          </p>
        </div>

        {/* Soft Neo-Brutalist Login Card */}
        <div className="bg-white rounded-[28px] border border-[#EAE9E4] shadow-xl p-7 sm:p-9 relative overflow-hidden">
          {/* Subtle Decorative pastel background glow */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#FCE373]/30 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-[#F5C6EC]/30 rounded-full blur-2xl pointer-events-none"></div>

          {/* Security Alert Notice (Concurrent Login or Idle Timeout) */}
          {reason === 'concurrent_session' && (
            <div className="mb-5 bg-[#F5C6EC]/30 border-2 border-[#121214] shadow-[4px_4px_0px_#121214] rounded-2xl p-3.5 flex items-start gap-3 animate-in fade-in duration-200">
              <div className="w-8 h-8 rounded-xl bg-[#121214] text-[#F5C6EC] flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-black text-[#121214]">Login Ganda Terdeteksi</p>
                <p className="text-[11px] text-[#121214]/80 font-medium leading-relaxed mt-0.5">
                  Akun Anda terdeteksi masuk dari perangkat atau peramban lain. Sesi pada perangkat ini telah ditutup demi keamanan.
                </p>
              </div>
            </div>
          )}

          {reason === 'idle_timeout' && (
            <div className="mb-5 bg-[#FCE373]/30 border-2 border-[#121214] shadow-[4px_4px_0px_#121214] rounded-2xl p-3.5 flex items-start gap-3 animate-in fade-in duration-200">
              <div className="w-8 h-8 rounded-xl bg-[#121214] text-[#FCE373] flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-black text-[#121214]">Sesi Berakhir (Inaktivitas)</p>
                <p className="text-[11px] text-[#121214]/80 font-medium leading-relaxed mt-0.5">
                  Tidak ada aktivitas terdeteksi selama lebih dari 5 menit. Demi melindungi data Anda, silakan masuk kembali.
                </p>
              </div>
            </div>
          )}

          {reason === 'session_expired' && (
            <div className="mb-5 bg-[#FAF9F6] border-2 border-[#121214] shadow-[4px_4px_0px_#121214] rounded-2xl p-3.5 flex items-start gap-3 animate-in fade-in duration-200">
              <div className="w-8 h-8 rounded-xl bg-[#121214] text-white flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-[#FCE373]" />
              </div>
              <div>
                <p className="text-xs font-black text-[#121214]">Sesi Berakhir</p>
                <p className="text-[11px] text-[#121214]/80 font-medium leading-relaxed mt-0.5">
                  Masa berlaku sesi login Anda telah selesai. Silakan masukkan kredensial Anda kembali.
                </p>
              </div>
            </div>
          )}

          {/* Role pill badge indicator with smooth sliding/fade transition */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-out ${
              roleDetected 
                ? 'max-h-16 opacity-100 translate-y-0 mb-5' 
                : 'max-h-0 opacity-0 -translate-y-2 pointer-events-none mb-0'
            }`}
          >
            <div className="flex items-center justify-between bg-[#F5C6EC]/40 border-2 border-[#121214] px-4 py-2 rounded-2xl text-xs font-black text-[#121214] shadow-[3px_3px_0px_#121214] transition-all duration-200">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#121214] animate-ping" />
                <Sparkles className="w-4 h-4 text-[#121214]" />
                Role Terdeteksi:
              </span>
              <span className="bg-[#121214] text-white px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider shadow-sm">
                {roleDetected}
              </span>
            </div>
          </div>

          {/* Form Error alert */}
          {(formError || error) && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs font-semibold">
              {formError || error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            {/* Unique ID Input */}
            <div>
              <label className="block text-xs font-bold text-[#121214] uppercase tracking-wider mb-1.5">
                ID Pengguna
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6E6D6A]">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  id="uniqueId"
                  required
                  value={uniqueId}
                  onChange={handleUniqueIdChange}
                  className="block w-full pl-10 pr-3 py-3 bg-[#FAF9F6] border border-[#EAE9E4] rounded-2xl text-sm font-semibold text-[#121214] placeholder-[#A09F9B] focus:outline-none focus:ring-2 focus:ring-[#121214] focus:bg-white transition-all"
                  placeholder="e.g. ADM001 / KO001 / PES001"
                  autoComplete="off"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold text-[#121214] uppercase tracking-wider mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6E6D6A]">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 bg-[#FAF9F6] border border-[#EAE9E4] rounded-2xl text-sm font-semibold text-[#121214] placeholder-[#A09F9B] focus:outline-none focus:ring-2 focus:ring-[#121214] focus:bg-white transition-all"
                  placeholder="Masukkan kata sandi akun"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6E6D6A] hover:text-[#121214]"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#121214] hover:bg-neutral-800 active:scale-[0.98] disabled:opacity-50 text-white font-bold py-3.5 px-5 rounded-full transition-all duration-200 shadow-md flex items-center justify-center space-x-2 text-sm"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security & Support Note */}
          <div className="mt-6 pt-5 border-t border-[#F0EFEA] flex items-center justify-between text-[11px] text-[#6E6D6A]">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Sistem Terotentikasi & Aman
            </span>
            <span>BPJSTK</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-[#8A8985]">
          <p>© 2026 Intelly BPJSTK. Seluruh hak cipta dilindungi.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;