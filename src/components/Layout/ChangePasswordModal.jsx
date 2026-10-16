import React, { useState, useContext } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import authService from '../../services/authService';

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const { user } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear messages when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const validateForm = () => {
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('Semua field harus diisi');
      return false;
    }

    if (formData.newPassword.length < 6) {
      setError('Password baru harus minimal 6 karakter');
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Password baru dan konfirmasi password tidak cocok');
      return false;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('Password baru harus berbeda dengan password saat ini');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await authService.changePassword({
        current_password: formData.currentPassword,
        new_password: formData.newPassword,
        new_password_confirmation: formData.confirmPassword
      });

      if (result.success) {
        setSuccess('Password berhasil diubah');
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(result.message || 'Gagal mengubah password');
      }
    } catch (error) {
      setError(error.message || 'Terjadi kesalahan saat mengubah password');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setError('');
    setSuccess('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#121214]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-[26px] border border-[#EAE9E4] shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#EAE9E4]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#F5C6EC] flex items-center justify-center text-[#121214] font-bold text-sm shadow-sm">
              🔑
            </div>
            <div>
              <h2 className="text-base font-bold text-[#121214]">Ganti Kata Sandi</h2>
              <p className="text-xs text-[#6E6D6A]">Amankan akun Anda dengan kata sandi baru</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-[#F5F4F0] hover:bg-[#EAE9E4] text-[#121214] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-xs font-bold text-[#121214] uppercase tracking-wider mb-1.5">
              Password Saat Ini
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white border border-[#EAE9E4] rounded-xl text-sm text-[#121214] placeholder-[#A09F9B] focus:outline-none focus:ring-2 focus:ring-[#121214] focus:border-[#121214] transition-all"
                placeholder="Masukkan kata sandi saat ini"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-[#8A8985] hover:text-[#121214]"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-bold text-[#121214] uppercase tracking-wider mb-1.5">
              Password Baru
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white border border-[#EAE9E4] rounded-xl text-sm text-[#121214] placeholder-[#A09F9B] focus:outline-none focus:ring-2 focus:ring-[#121214] focus:border-[#121214] transition-all"
                placeholder="Min. 6 karakter"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-[#8A8985] hover:text-[#121214]"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-bold text-[#121214] uppercase tracking-wider mb-1.5">
              Konfirmasi Password Baru
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white border border-[#EAE9E4] rounded-xl text-sm text-[#121214] placeholder-[#A09F9B] focus:outline-none focus:ring-2 focus:ring-[#121214] focus:border-[#121214] transition-all"
                placeholder="Ulangi kata sandi baru"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-[#8A8985] hover:text-[#121214]"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700">
              {success}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-[#121214] bg-white border border-[#EAE9E4] rounded-full hover:bg-[#F5F4F0] transition-colors disabled:opacity-50"
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-[#121214] hover:bg-neutral-800 rounded-full transition-colors disabled:opacity-50 flex items-center justify-center shadow-sm"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent mr-2"></div>
                  Menyimpan...
                </>
              ) : (
                'Ubah Password'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;