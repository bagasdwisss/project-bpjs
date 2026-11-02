import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Navbar } from '../Login/Navbar';
import { FeatureIcons } from '../Login/FeatureIcons';
import { LoginFormCard } from '../Login/LoginFormCard';
import { HdWorkersAnimation } from '../Login/HdWorkersAnimation';
import PageLoader from '../Common/PageLoader';

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
      className="relative min-h-[100svh] w-full bg-[#2E7047] text-white overflow-x-hidden overflow-y-auto flex flex-col justify-between select-none"
      style={{ fontFamily: "var(--font-body, Inter, sans-serif)" }}
    >
      {/* 04. BACKGROUND VIDEO & ADULT WORKERS ANIMATION (BPJSTK VIDEO.mp4 FROM ASSETS) */}
      <HdWorkersAnimation />

      {/* 05. NAVBAR WITH OFFICIAL BPJS KETENAGAKERJAAN LOGO */}
      <Navbar />

      {/* 06. LOGIN HERO CONTENT & INTEGRATED LOGIN FORM CARD */}
      <main className="relative z-10 w-full max-w-4xl mx-auto px-4 pt-20 sm:pt-24 pb-16 sm:pb-24 flex-1 flex flex-col items-center justify-start text-center">
        {/* A. FIVE PROTECTION PROGRAM ICONS (FEATURE ICON ROW) */}
        <div className="mb-2 sm:mb-2.5 animate-hero-icons">
          <FeatureIcons />
        </div>

        {/* B. MAIN HEADLINE (OFFICIAL TAGLINE) */}
        <h1 
          className="text-white uppercase font-extrabold tracking-[-0.04em] leading-[1.08] max-w-[760px] text-center drop-shadow-md animate-hero-headline"
          style={{ 
            fontFamily: "var(--font-heading)",
            fontSize: 'clamp(28px, 4.4vw, 46px)'
          }}
        >
          Kerja Keras <br className="hidden sm:inline" />
          <span className="text-[#FCE373]">Bebas Cemas</span>
        </h1>

        {/* C. SUBHEADING */}
        <p className="text-white/90 text-[11px] sm:text-xs font-normal leading-[1.6] max-w-[520px] mt-2 mb-3.5 sm:mb-4 text-center animate-hero-subheading drop-shadow-sm">
          Perlindungan jaminan sosial ketenagakerjaan yang menyeluruh bagi seluruh pekerja Indonesia. Masuk untuk mengakses layanan Anda.
        </p>

        {/* D. INTEGRATED LOGIN CARD (NO AKES CEPAT PENGUJIAN) */}
        <div className="w-full flex justify-center animate-hero-form">
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
      </main>

      {/* Spacer to preserve bottom crowd headroom */}
      <div className="relative z-10 w-full h-8 sm:h-12 pointer-events-none" />
    </div>
  );
};

export default Login;
