import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
// Impor ikon dari lucide-react
import { User, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';

const Login = () => {
  const [uniqueId, setUniqueId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [roleDetected, setRoleDetected] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  const { user, login, error, clearError, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  const demoAccounts = [
    { id: 'PES001', role: 'Peserta', password: 'password123', description: 'Akses dashboard peserta' },
    { id: 'KO001', role: 'Koordinator', password: 'password123', description: 'Kelola data absensi & penilaian' },
    { id: 'ADM001', role: 'Administrator', password: 'password123', description: 'Manajemen sistem keseluruhan' },
  ];

  // Effect untuk handle redirect setelah login berhasil
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('Redirecting after successful login...', user);
      
      // Redirect berdasarkan role
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
      setFormError('ID Pengguna harus diisi');
      return;
    }

    if (!password) {
      setFormError('Kata Sandi harus diisi');
      return;
    }

    setLoading(true);

    try {
      console.log('Attempting login with:', { uniqueId });
      const result = await login(uniqueId.trim(), password);
      console.log('Login result:', result);
      
      if (result.success) {
        console.log('Login successful! Waiting for redirect...');
        setLoginSuccess(true);
        // Redirect akan ditangani oleh useEffect di atas
      } else {
        setFormError(result.message || 'Login gagal. Periksa kembali ID Pengguna dan Kata Sandi Anda.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setFormError(err.message || 'Terjadi kesalahan saat menghubungi server.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccountClick = (account) => {
    setUniqueId(account.id);
    setPassword(account.password);
    setRoleDetected(account.role);
    setFormError('');
    clearError();
  };
  
  const getRoleColor = (role) => {
    switch (role) {
      case 'Peserta':
        return 'bg-gradient-to-br from-green-500 to-green-600';
      case 'Koordinator':
        return 'bg-gradient-to-br from-blue-500 to-blue-600';
      case 'Administrator':
        return 'bg-gradient-to-br from-purple-500 to-purple-600';
      default:
        return 'bg-gradient-to-br from-gray-500 to-gray-600';
    }
  };

  // Jika sudah authenticated, tampilkan loading sampai redirect
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Mengarahkan ke dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 text-center">
            <h1 className="text-2xl font-bold mb-2">Sistem Absensi & Penilaian</h1>
            <p className="text-blue-100 opacity-90">
              Masuk dengan ID unik Anda untuk melanjutkan
            </p>
            {roleDetected && (
              <div className="mt-4 inline-block bg-white/20 text-white text-sm font-semibold px-4 py-1 rounded-full">
                Role Terdeteksi: {roleDetected}
              </div>
            )}
          </div>

          {/* Form Section */}
          <div className="p-8">
            {(formError || error) && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
                {formError || error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Unique ID Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID Pengguna
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="uniqueId"
                    required
                    value={uniqueId}
                    onChange={handleUniqueIdChange}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Masukkan ID unik Anda (e.g., PES001)"
                    autoComplete="off"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kata Sandi
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Masukkan kata sandi"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:-translate-y-0.5 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:transform-none disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Memproses...
                  </div>
                ) : (
                  'Masuk ke Sistem'
                )}
              </button>
            </form>

            {/* Demo Accounts Section */}
            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-700 mb-4 text-center">
                Atau gunakan akun demo:
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {demoAccounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => handleDemoAccountClick(account)}
                    disabled={loading}
                    className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors group w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getRoleColor(account.role)}`}>
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{account.role} ({account.id})</span>
                        <span className="text-xs text-gray-500">Klik untuk login</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{account.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Information Section */}
            <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Informasi Login
              </h3>
              <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                <li>Setiap pengguna memiliki ID unik.</li>
                <li>Role akan terdeteksi saat Anda memasukkan ID.</li>
                <li>Gunakan kata sandi yang diberikan administrator.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            © 2025 Sistem Absensi & Penilaian. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;