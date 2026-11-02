import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import PageLoader from '../Common/PageLoader';
import HeroVideoBackground from '../Kinora/HeroVideoBackground';
import Navbar from '../Kinora/Navbar';
import HeroContent from '../Kinora/HeroContent';
import LoginModal from '../Kinora/LoginModal';
import InfoModal from '../Kinora/InfoModal';

/**
 * Login - KINORA Full-Screen Hero Landing Page
 * Faithfully recreating the GreenGuard reference composition
 * with integrated authentication for BPJS Ketenagakerjaan
 */
const Login = () => {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');
  const action = searchParams.get('action');

  // Modal display states
  const [isLoginOpen, setIsLoginOpen] = useState(Boolean(reason || action === 'login'));
  const [infoTopic, setInfoTopic] = useState(null);

  // Authentication form states
  const [uniqueId, setUniqueId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [roleDetected, setRoleDetected] = useState('');
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

  // Open login dialog automatically if a session termination reason is present
  useEffect(() => {
    if (reason) {
      setIsLoginOpen(true);
    }
  }, [reason]);

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
    return <PageLoader text="Memuat Halaman Portal..." />;
  }

  return (
    <main 
      className="relative w-full overflow-hidden bg-[#397C50] text-white select-none flex flex-col justify-between"
      style={{
        minHeight: '100svh',
        height: '100svh',
        position: 'relative'
      }}
    >
      {/* 04. BACKGROUND VIDEO — MAIN VISUAL ASSET */}
      <HeroVideoBackground />

      {/* 05. NAVBAR */}
      <Navbar 
        onOpenLogin={() => setIsLoginOpen(true)} 
        onOpenInfo={(topic) => setInfoTopic(topic)} 
      />

      {/* 06. HERO CONTENT */}
      <HeroContent 
        onOpenLogin={() => setIsLoginOpen(true)} 
      />

      {/* Spacer to guarantee the waving characters in bottom 55-60% of viewport remain visible */}
      <div className="w-full pointer-events-none pb-6 sm:pb-8 flex justify-center z-10">
        <span className="text-[10px] text-white/40 tracking-wider font-medium">
          KINORA Ecosystem • BPJS Ketenagakerjaan
        </span>
      </div>

      {/* AUTHENTICATION DIALOG MODAL */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        uniqueId={uniqueId}
        setUniqueId={setUniqueId}
        password={password}
        setPassword={setPassword}
        roleDetected={roleDetected}
        setRoleDetected={setRoleDetected}
        formError={formError || error}
        setFormError={setFormError}
        loading={loading}
        onSubmit={handleSubmit}
        reason={reason}
      />

      {/* INFO DRAWER MODAL (About, Solutions, Community, Contact) */}
      <InfoModal
        isOpen={Boolean(infoTopic)}
        onClose={() => setInfoTopic(null)}
        topic={infoTopic}
      />
    </main>
  );
};

export default Login;
