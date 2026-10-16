import React, { useContext, useState } from 'react';
import { Menu, Bell, User, Settings, LogOut, Key } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import ChangePasswordModal from './ChangePasswordModal'; // Komponen baru

const Header = ({ toggleSidebar }) => {
  const { user, coordinator, isParticipant, logout } = useContext(AuthContext);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  // Fungsi untuk mendapatkan judul header dinamis berdasarkan role
  const getHeaderTitle = () => {
    if (isParticipant) {
      return 'Dashboard Peserta';
    } else if (user?.role_id === 2 || user?.role === 'Koordinator') {
      return 'Dashboard Koordinator';
    } else if (user?.role_id === 3 || user?.role === 'Administrator') {
      return 'Dashboard Administrator';
    } else {
      return 'Dashboard';
    }
  };

  // Fungsi untuk mendapatkan nama role yang ditampilkan
  const getDisplayRole = () => {
    if (user?.role_id === 1 || user?.role === 'Peserta') return 'Peserta';
    if (user?.role_id === 2 || user?.role === 'Koordinator') return 'Koordinator';
    if (user?.role_id === 3 || user?.role === 'Administrator') return 'Administrator';
    return user?.role || 'Peran';
  };

  const handleLogout = () => {
    logout();
    setShowProfileDropdown(false);
  };

  const handleChangePassword = () => {
    setShowChangePasswordModal(true);
    setShowProfileDropdown(false);
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4">
          {/* Left Section */}
          <div className="flex items-center min-w-0">
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors mr-2 text-gray-700"
              aria-label="Buka Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="min-w-0">
              <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                <h1 className="text-base sm:text-xl font-semibold text-gray-900 truncate">
                  {getHeaderTitle()}
                </h1>
                
                {/* Tampilkan info koordinator untuk peserta */}
                {isParticipant && coordinator && (
                  <div className="hidden sm:flex items-center text-xs sm:text-sm text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    <span className="font-medium">Koordinator:</span>
                    <span className="ml-1 font-semibold truncate max-w-[150px]">{coordinator.full_name}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5 hidden sm:block truncate">
                Sistem Absensi & Penilaian BPJS Ketenagakerjaan
              </p>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User Profile */}
            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user?.full_name || 'Nama Pengguna'}</p>
                  <p className="text-xs text-gray-500">{getDisplayRole()}</p>
                </div>
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
              </button>

              {/* Profile Dropdown */}
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={handleChangePassword}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Ganti Password
                  </button>
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Change Password Modal */}
      <ChangePasswordModal 
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />
    </>
  );
};

export default Header;