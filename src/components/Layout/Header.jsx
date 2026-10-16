import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, User, Settings, LogOut, Key, Search, ChevronDown, Check } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import ChangePasswordModal from './ChangePasswordModal';

const Header = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const { user, coordinator, isParticipant, logout } = useContext(AuthContext);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState('Semua');

  const getHeaderTitle = () => {
    if (isParticipant) return 'Portal Peserta';
    if (user?.role_id === 2 || user?.role === 'Koordinator') return 'Portal Koordinator';
    if (user?.role_id === 3 || user?.role === 'Administrator') return 'Portal Administrator';
    return 'Portal BPJS';
  };

  const handleNotificationClick = () => {
    if (isParticipant) {
      navigate('/participant/notifications');
    } else if (user?.role_id === 2 || user?.role === 'Koordinator') {
      navigate('/coordinator/reminders');
    } else if (user?.role_id === 3 || user?.role === 'Administrator') {
      navigate('/admin/broadcast');
    }
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
      <header className="bg-[#F5F4F0] border-b border-[#EAE9E4] sticky top-0 z-30 px-3 sm:px-6 lg:px-8 py-3.5">
        <div className="max-w-[1600px] mx-auto w-full flex items-center justify-between gap-4">
          {/* Mobile Hamburger & Logo preview */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-xl bg-white border border-[#EAE9E4] text-[#121214] hover:bg-[#EAE9E4] transition-colors"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="lg:hidden font-bold text-lg tracking-tight text-[#121214]">
              intelly <span className="text-xs text-[#F5C6EC] bg-[#121214] px-1.5 py-0.5 rounded-full">BPJS</span>
            </div>
          </div>

          {/* Top Search Bar with Inline Filter Pills (Intelly Signature) */}
          <div className="flex-1 max-w-2xl hidden md:flex items-center bg-[#EAE9E4] rounded-full px-2 py-1.5 border border-[#E0DFDA] shadow-inner">
            <div className="w-8 h-8 rounded-full bg-[#F5C6EC] text-[#121214] flex items-center justify-center shrink-0 shadow-sm ml-0.5">
              <Search className="w-4 h-4" />
            </div>
            
            <input 
              type="text" 
              placeholder="Cari data peserta, riwayat absensi, penilaian..." 
              className="bg-transparent border-none outline-none text-xs text-[#121214] placeholder-[#8A8985] px-3.5 flex-1 font-medium"
            />

            <div className="flex items-center gap-1.5 text-[11px] shrink-0 pr-1">
              <span className="text-[#8A8985] font-semibold text-[10px] uppercase tracking-wider ml-1">In:</span>
              <button 
                type="button" 
                onClick={() => setActiveFilter('Peserta')}
                className={`px-3 py-1 rounded-full font-bold transition-all text-[11px] ${
                  activeFilter === 'Peserta' 
                    ? 'bg-[#121214] text-white shadow-sm' 
                    : 'text-[#6E6D6A] hover:text-[#121214]'
                }`}
              >
                Peserta
              </button>
              <button 
                type="button" 
                onClick={() => setActiveFilter('Batch')}
                className={`px-2.5 py-1 rounded-full font-semibold transition-all text-[11px] ${
                  activeFilter === 'Batch' 
                    ? 'bg-[#121214] text-white shadow-sm' 
                    : 'text-[#6E6D6A] hover:text-[#121214]'
                }`}
              >
                Batch
              </button>
              <button 
                type="button" 
                onClick={() => setActiveFilter('Status')}
                className={`px-2.5 py-1 rounded-full font-semibold transition-all text-[11px] ${
                  activeFilter === 'Status' 
                    ? 'bg-[#121214] text-white shadow-sm' 
                    : 'text-[#6E6D6A] hover:text-[#121214]'
                }`}
              >
                Status
              </button>
            </div>
          </div>

          {/* Right Section: Connected Dark Pill Action Group */}
          <div className="flex items-center gap-3">
            {/* Koordinator Info Pill for Participant */}
            {isParticipant && coordinator && (
              <div className="hidden xl:flex items-center text-xs bg-[#FFFFFF] border border-[#EAE9E4] px-3 py-1.5 rounded-full text-[#121214] shadow-sm">
                <span className="text-[#6E6D6A] mr-1">Koordinator:</span>
                <span className="font-bold text-[#121214]">{coordinator.full_name}</span>
              </div>
            )}

            {/* Connected Pitch-Black Pill Action Group (Intelly Signature) */}
            <div className="flex items-center bg-[#121214] text-white rounded-full p-1 shadow-sm">
              <button 
                onClick={handleNotificationClick}
                className="p-1.5 rounded-full hover:bg-neutral-800 text-[#9CA3AF] hover:text-white transition-colors relative"
                title="Buka Pusat Notifikasi"
                aria-label="Notifikasi"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#F5C6EC] rounded-full ring-2 ring-[#121214]"></span>
              </button>

              <div className="w-[1px] h-4 bg-neutral-700 mx-1"></div>

              {/* User Dropdown Trigger */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center space-x-2 pl-1 pr-2 py-0.5 rounded-full hover:bg-neutral-800 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-[#F5C6EC] text-[#121214] flex items-center justify-center font-bold text-xs shadow-inner">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <span className="text-xs font-semibold max-w-[100px] truncate hidden sm:inline text-white">
                    {user?.full_name?.split(' ')[0] || 'User'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF]" />
                </button>

                {/* Profile Dropdown */}
                {showProfileDropdown && (
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-[20px] shadow-xl border border-[#EAE9E4] p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2.5 border-b border-[#F0EFEA]">
                      <p className="text-xs font-bold text-[#121214] truncate">{user?.full_name}</p>
                      <p className="text-[11px] text-[#6E6D6A] font-medium">{user?.role} • {user?.unique_id}</p>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={handleChangePassword}
                        className="flex items-center w-full px-3 py-2 text-xs font-semibold text-[#121214] hover:bg-[#F5F4F0] rounded-xl transition-colors"
                      >
                        <Key className="w-3.5 h-3.5 mr-2.5 text-[#6E6D6A]" />
                        Ganti Password
                      </button>
                    </div>

                    <div className="border-t border-[#F0EFEA] pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5 mr-2.5" />
                        Keluar
                      </button>
                    </div>
                  </div>
                )}
              </div>
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