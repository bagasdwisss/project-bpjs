import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Navbar } from '../Login/Navbar';
import { LoginFormCard } from '../Login/LoginFormCard';
import { HdWorkersAnimation } from '../Login/HdWorkersAnimation';
import PageLoader from '../Common/PageLoader';
import { ShieldCheck, Sparkles } from 'lucide-react';

const Login = () => {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');

  const [uniqueId, setUniqueId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [roleDetected, setRoleDetected] = useState('');
  const [formError, setFormError] = useState('');

  const { user, login, error, clearError, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  // Redirect pengguna setelah autentikasi berhasil sesuai role
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
      setFormError('Email / NIK / Nomor Kepesertaan wajib diisi.');
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
    return <PageLoader text="Memuat Halaman Portal..." />;
  }

  return (
    <div 
      className="relative min-h-[100svh] w-full bg-[#2E7047] text-white overflow-x-hidden overflow-y-auto lg:overflow-hidden flex flex-col justify-between select-none"
      style={{ fontFamily: "var(--font-body, Inter, sans-serif)" }}
    >
      {/* 04. BACKGROUND VIDEO: ASSET VIDEO ASLI DARI FOLDER ASSETS (BPJSTK VIDEO.mp4) */}
      <HdWorkersAnimation />

      {/* 05. NAVBAR WITH OFFICIAL BPJS KETENAGAKERJAAN LOGO (Tanpa link program perlindungan) */}
      <Navbar />

      {/* 06. MAIN CONTENT: 2-COLUMN LAYOUT (Tagline di kiri, Form Login di kanan) */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 pt-24 sm:pt-28 pb-10 sm:pb-16 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* LEFT COLUMN: BRANDING & OFFICIAL TAGLINE */}
          <div className="lg:col-span-7 text-left text-white space-y-4 sm:space-y-6">
            
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-xs font-bold text-white shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#FCE373] animate-ping" />
              <span>Portal Resmi Layanan & Magang Terpadu</span>
            </div>

            {/* MAIN HEADLINE */}
            <h1 
              className="text-white uppercase font-extrabold tracking-[-0.04em] leading-[1.08] drop-shadow-md text-3xl sm:text-4xl md:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Kerja Keras <br className="hidden sm:inline" />
              <span className="text-[#FCE373]">Bebas Cemas</span>
            </h1>

            {/* SUBHEADING */}
            <p className="text-white/90 text-sm sm:text-base font-normal leading-relaxed max-w-xl drop-shadow-sm">
              Perlindungan jaminan sosial ketenagakerjaan yang menyeluruh bagi seluruh insan pekerja Indonesia. Masuk ke portal resmi untuk mengakses layanan presensi, capaian kinerja, dan pelaporan terpadu.
            </p>

            {/* Trust Indicators */}
            <div className="pt-2 flex flex-wrap gap-2.5 sm:gap-3 text-xs">
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md border border-white/20 px-3.5 py-2 rounded-2xl text-white/95 shadow-sm">
                <ShieldCheck className="w-4 h-4 text-[#FCE373]" />
                <span className="font-semibold">Otentikasi Aman SSL 256-Bit</span>
              </div>
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md border border-white/20 px-3.5 py-2 rounded-2xl text-white/95 shadow-sm">
                <Sparkles className="w-4 h-4 text-[#FCE373]" />
                <span className="font-semibold">Layanan Terintegrasi BPJSTK</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: LOGIN FORM CARD (Berada di sisi kanan layar) */}
          <div className="lg:col-span-5 w-full flex justify-center lg:justify-end animate-hero-form">
            <LoginFormCard
              uniqueId={uniqueId}
              setUniqueId={setUniqueId}
              password={password}
              setPassword={setPassword}
              roleDetected={roleDetected}
              loading={loading}
              formError={formError || error}
              reason={reason}
              handleSubmit={handleSubmit}
              handleUniqueIdChange={handleUniqueIdChange}
            />
          </div>

        </div>
      </main>

      {/* Subtle bottom spacing */}
      <div className="relative z-10 w-full h-4 sm:h-6 pointer-events-none" />
    </div>
  );
};

export default Login;
