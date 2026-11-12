import React, { useContext, useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, User, Settings, LogOut, Key, Search, ChevronDown, Check, ChevronRight, Clock, Sparkles, X, ShieldCheck, RefreshCw, AlertTriangle, Volume2, VolumeX, Command } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { getClockStatus } from '../../utils/trueTime';
import { getPendingDlqCount } from '../../utils/deadLetterQueue';
import { isMicroSoundEnabled, setMicroSoundEnabled, triggerMicroFeedback } from '../../utils/microFeedback';

const ChangePasswordModal = lazy(() => import('./ChangePasswordModal'));

const Header = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const { user, coordinator, isParticipant, logout } = useContext(AuthContext);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [dlqCount, setDlqCount] = useState(0);
  const [clockStatus, setClockStatus] = useState({ isClockTampered: false, driftSeconds: 0 });
  const [microSoundOn, setMicroSoundOn] = useState(() => isMicroSoundEnabled());

  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifs, setRecentNotifs] = useState([]);

  const isAdmin = user?.role_id === 3 || user?.role === 'Administrator' || (user?.role_name || '').toLowerCase().includes('admin');

  const loadNotificationsData = async () => {
    if (!user || isAdmin) return;
    try {
      const countRes = await api.get('/notifications/unread-count', { skipCache: true });
      if (countRes.data?.success) {
        setUnreadCount(countRes.data.data?.count || 0);
      }

      const notifsRes = await api.get('/notifications', { skipCache: true });
      if (notifsRes.data?.success) {
        const list = Array.isArray(notifsRes.data.data) ? notifsRes.data.data : [];
        setRecentNotifs(list.slice(0, 4));
      }
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    // Monitor Dead Letter Queue & Micro Sound sync
    const updateDlq = () => setDlqCount(getPendingDlqCount());
    const onSoundSync = (e) => setMicroSoundOn(Boolean(e?.detail?.enabled));
    updateDlq();
    window.addEventListener('dlq-change', updateDlq);
    window.addEventListener('dlq-recovered', updateDlq);
    window.addEventListener('micro-sound-change', onSoundSync);

    // Monitor NTP Clock Status
    const clockInterval = setInterval(() => {
      setClockStatus(getClockStatus());
    }, 15000);

    return () => {
      window.removeEventListener('dlq-change', updateDlq);
      window.removeEventListener('dlq-recovered', updateDlq);
      window.removeEventListener('micro-sound-change', onSoundSync);
      clearInterval(clockInterval);
    };
  }, []);

  useEffect(() => {
    if (isAdmin) return;
    loadNotificationsData();
    const interval = setInterval(loadNotificationsData, 30000);
    const handleBroadcastSent = () => loadNotificationsData();
    window.addEventListener('broadcast-sent', handleBroadcastSent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('broadcast-sent', handleBroadcastSent);
    };
  }, [user, isAdmin]);

  const getHeaderTitle = () => {
    if (isParticipant) return 'Portal Peserta';
    if (user?.role_id === 2 || user?.role === 'Koordinator') return 'Portal Koordinator';
    if (user?.role_id === 3 || user?.role === 'Administrator') return 'Portal Administrator';
    return 'Portal BPJSTK';
  };

  const handleNavigateToNotifications = () => {
    setShowNotifDropdown(false);
    if (isParticipant) {
      navigate('/participant/notifications');
    } else if (user?.role_id === 2 || user?.role === 'Koordinator') {
      navigate('/coordinator/reminders');
    } else if (user?.role_id === 3 || user?.role === 'Administrator') {
      navigate('/admin/broadcast');
    }
  };

  const handleItemClick = (item) => {
    setShowNotifDropdown(false);
    if (item.type === 'chat') {
      window.dispatchEvent(new CustomEvent('open-chat', { detail: { recipientId: item.sender_id } }));
    } else {
      handleNavigateToNotifications();
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

  const handleHeaderSearch = (e) => {
    if (e) e.preventDefault();
    const roleId = user?.role_id;
    const isCoord = roleId === 2 || (user?.role || '').toLowerCase().includes('koordinator');
    const q = searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : '';
    if (isAdmin) {
      if (activeFilter === 'Batch') navigate(`/admin/batches${q}`);
      else if (activeFilter === 'Status') navigate(`/admin/monitoring${q}`);
      else navigate(`/admin/users${q}`);
    } else if (isCoord) {
      if (activeFilter === 'Status') navigate(`/coordinator/mentee-attendance${q}`);
      else if (activeFilter === 'Batch') navigate(`/coordinator/grading${q}`);
      else navigate(`/coordinator/participants${q}`);
    } else {
      if (activeFilter === 'Status') navigate(`/participant/attendance${q}`);
      else if (activeFilter === 'Batch') navigate(`/participant/scores${q}`);
      else navigate(`/participant/progress${q}`);
    }
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
              intelly <span className="text-xs text-[#F5C6EC] bg-[#121214] px-1.5 py-0.5 rounded-full">BPJSTK</span>
            </div>
          </div>

          {/* Top Search Bar with Inline Filter Pills (Intelly Signature) */}
          <form onSubmit={handleHeaderSearch} className="flex-1 max-w-2xl hidden md:flex items-center bg-[#EAE9E4] rounded-full px-2 py-1.5 border border-[#E0DFDA] shadow-inner">
            <button
              type="submit"
              aria-label="Cari di portal"
              className="w-8 h-8 rounded-full bg-[#F5C6EC] text-[#121214] flex items-center justify-center shrink-0 shadow-sm ml-0.5 hover:bg-[#eab3df] transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>
            
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari data peserta, riwayat absensi, penilaian..." 
              className="bg-transparent border-none outline-none text-xs text-[#121214] placeholder-[#8A8985] px-3.5 flex-1 font-medium"
            />

            <div className="flex items-center gap-1.5 text-[11px] shrink-0 pr-1">
              <span className="text-[#8A8985] font-semibold text-[10px] uppercase tracking-wider ml-1">In:</span>
              <button 
                type="button" 
                onClick={() => {
                  setActiveFilter('Peserta');
                  navigate(isAdmin ? '/admin/users' : (user?.role_id === 2 ? '/coordinator/participants' : '/participant/progress'));
                }}
                className={`px-3 py-1 rounded-full font-bold transition-all text-[11px] cursor-pointer ${
                  activeFilter === 'Peserta' 
                    ? 'bg-[#121214] text-white shadow-sm' 
                    : 'text-[#6E6D6A] hover:text-[#121214]'
                }`}
              >
                Peserta
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setActiveFilter('Batch');
                  navigate(isAdmin ? '/admin/batches' : (user?.role_id === 2 ? '/coordinator/grading' : '/participant/scores'));
                }}
                className={`px-2.5 py-1 rounded-full font-semibold transition-all text-[11px] cursor-pointer ${
                  activeFilter === 'Batch' 
                    ? 'bg-[#121214] text-white shadow-sm' 
                    : 'text-[#6E6D6A] hover:text-[#121214]'
                }`}
              >
                Batch
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setActiveFilter('Status');
                  navigate(isAdmin ? '/admin/monitoring' : (user?.role_id === 2 ? '/coordinator/mentee-attendance' : '/participant/attendance'));
                }}
                className={`px-2.5 py-1 rounded-full font-semibold transition-all text-[11px] cursor-pointer ${
                  activeFilter === 'Status' 
                    ? 'bg-[#121214] text-white shadow-sm' 
                    : 'text-[#6E6D6A] hover:text-[#121214]'
                }`}
              >
                Status
              </button>
            </div>
          </form>

          {/* Right Section: Connected Dark Pill Action Group */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dead Letter Queue (DLQ) Pending Badge */}
            {dlqCount > 0 && (
              <div 
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FCE373] border border-[#121214] text-[#121214] text-[11px] font-black shadow-xs animate-pulse"
                title="Antrean Darurat (DLQ) aktif: Transaksi tertunda sedang dicoba sinkronisasi otomatis"
              >
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>DLQ ({dlqCount})</span>
              </div>
            )}

            {/* TrueTime Clock Drift Warning */}
            {clockStatus.isClockTampered && (
              <div 
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F5C6EC] border border-[#121214] text-[#121214] text-[11px] font-black shadow-xs"
                title={`Jam HP berselisih ${clockStatus.driftSeconds} detik dari Server BPJS. Waktu disinkronkan otomatis.`}
              >
                <AlertTriangle className="w-3 h-3 text-[#121214]" />
                <span>Jam Berbeda ({clockStatus.driftSeconds}s)</span>
              </div>
            )}

            {/* Koordinator Info Pill for Participant */}
            {isParticipant && (coordinator?.full_name || user?.coordinator_name) && (
              <div className="hidden xl:flex items-center text-xs bg-[#FFFFFF] border border-[#EAE9E4] px-3 py-1.5 rounded-full text-[#121214] shadow-sm">
                <span className="text-[#6E6D6A] mr-1">Koordinator:</span>
                <span className="font-bold text-[#121214]">{coordinator?.full_name || user?.coordinator_name}</span>
              </div>
            )}

            {/* Connected Pitch-Black Pill Action Group (Intelly Signature) */}
            <div className="flex items-center bg-[#121214] text-white rounded-full p-1 shadow-sm">
              {/* Quick Command Palette Trigger (Ctrl+K) */}
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
                className="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-neutral-800 text-[#9CA3AF] hover:text-[#FCE373] transition-colors cursor-pointer"
                title="Navigasi & Aksi Cepat (Ctrl+K)"
                aria-label="Navigasi Cepat (Ctrl+K)"
              >
                <Command className="w-3.5 h-3.5 text-[#FCE373]" />
                <span className="hidden lg:inline text-[10px] font-bold tracking-wider">K</span>
              </button>

              <div className="w-[1px] h-4 bg-neutral-700 mx-0.5"></div>

              {/* Micro Audio Feedback Toggle */}
              <button
                type="button"
                onClick={() => {
                  const next = !microSoundOn;
                  setMicroSoundEnabled(next);
                  setMicroSoundOn(next);
                  if (next) triggerMicroFeedback('success');
                }}
                className="p-1.5 rounded-full hover:bg-neutral-800 text-[#9CA3AF] hover:text-[#B8C96E] transition-colors cursor-pointer"
                title={microSoundOn ? 'Efek Suara UI: Aktif (Klik untuk matikan)' : 'Efek Suara UI: Mati (Klik untuk aktifkan)'}
                aria-label="Toggle efek suara interaksi"
              >
                {microSoundOn ? (
                  <Volume2 className="w-4 h-4 text-[#B8C96E]" />
                ) : (
                  <VolumeX className="w-4 h-4 text-[#9CA3AF]" />
                )}
              </button>

              <div className="w-[1px] h-4 bg-neutral-700 mx-0.5"></div>

              {/* Whistleblowing & Counseling Button */}
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-whistleblowing'))}
                className="p-1.5 rounded-full hover:bg-neutral-800 text-[#9CA3AF] hover:text-[#BDD4F2] transition-colors relative cursor-pointer"
                title="Pusat Konseling & Pengaduan Rahasia (Anonim)"
                aria-label="Pengaduan Anonim"
              >
                <ShieldCheck className="w-4 h-4 text-[#BDD4F2]" />
              </button>

              <div className="w-[1px] h-4 bg-neutral-700 mx-0.5"></div>

              {/* Notification Bell Dropdown Trigger (Hidden for Admin) */}
              {!isAdmin && (
                <>
                  <div className="relative">
                    <button 
                      type="button"
                      onClick={() => {
                        setShowNotifDropdown(!showNotifDropdown);
                        setShowProfileDropdown(false);
                      }}
                      className="p-1.5 rounded-full hover:bg-neutral-800 text-[#9CA3AF] hover:text-white transition-colors relative"
                      title="Notifikasi Masuk"
                      aria-label="Notifikasi"
                    >
                      <Bell className="w-4 h-4" />
                      {unreadCount > 0 ? (
                        <span className="absolute -top-1 -right-1 bg-[#F5C6EC] text-[#121214] font-black text-[9px] px-1.5 py-0.2 rounded-full border border-[#121214] leading-tight min-w-[16px] text-center shadow-xs animate-pulse">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      ) : (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-[#B8C96E] rounded-full ring-2 ring-[#121214]"></span>
                      )}
                    </button>

                    {/* Notifications Dropdown Panel (Mobile & Desktop Responsive) */}
                    {showNotifDropdown && (
                      <>
                        {/* Outside Backdrop */}
                        <div 
                          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
                          onClick={() => setShowNotifDropdown(false)}
                        />

                        <div className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-96 bg-white text-[#121214] rounded-[24px] shadow-[6px_6px_0px_#121214] border-2 border-[#121214] p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] sm:max-h-[32rem] flex flex-col">
                          <div className="flex items-center justify-between pb-2.5 px-1 border-b-2 border-[#121214]">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-[#121214] text-white flex items-center justify-center shadow-xs">
                                <Bell className="w-3.5 h-3.5 text-white" />
                              </div>
                              <h4 className="text-xs font-black uppercase tracking-wider text-[#121214]">
                                Notifikasi Masuk
                              </h4>
                              {unreadCount > 0 && (
                                <span className="bg-[#F5C6EC] text-[#121214] border border-[#121214] text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                                  {unreadCount} Baru
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowNotifDropdown(false)}
                              className="w-7 h-7 rounded-lg bg-[#FAF9F6] border border-[#121214] flex items-center justify-center text-[#121214] hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                              aria-label="Tutup notifikasi"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="divide-y divide-[#F0EFEA] max-h-[55vh] sm:max-h-72 overflow-y-auto my-2 pr-1 space-y-1">
                            {recentNotifs.length === 0 ? (
                              <div className="py-8 text-center text-xs font-bold text-gray-500">
                                Tidak ada notifikasi saat ini
                              </div>
                            ) : (
                              recentNotifs.map((item) => (
                                <div 
                                  key={item.notification_id}
                                  onClick={() => handleItemClick(item)}
                                  className={`p-3 rounded-2xl transition hover:bg-[#FAF9F6] cursor-pointer space-y-1 border-2 ${
                                    !item.is_read ? 'bg-[#F5C6EC]/25 border-[#121214] shadow-[2px_2px_0px_#121214]' : 'bg-transparent border-transparent'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-black text-xs text-[#121214] line-clamp-1">
                                      {item.title}
                                    </span>
                                    {!item.is_read && (
                                      <span className="w-2 h-2 rounded-full bg-[#121214] shrink-0"></span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-[#121214]/80 line-clamp-2 leading-relaxed font-medium">
                                    {item.message}
                                  </p>
                                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500 pt-0.5">
                                    <Clock className="w-3 h-3 text-[#121214]/60" />
                                    <span>
                                      {new Date(item.created_at).toLocaleDateString('id-ID', {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        timeZone: 'Asia/Jakarta'
                                      })} WIB
                                    </span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          <div className="pt-2 border-t-2 border-[#121214]">
                            <button
                              type="button"
                              onClick={handleNavigateToNotifications}
                              className="w-full py-2.5 bg-[#FAF9F6] hover:bg-[#FCE373] border-2 border-[#121214] rounded-xl text-center font-black text-xs text-[#121214] shadow-[2px_2px_0px_#121214] active:translate-y-0.5 transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <span>Buka Halaman Notifikasi</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="w-[1px] h-4 bg-neutral-700 mx-1"></div>
                </>
              )}

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

                      <button
                        onClick={() => {
                          setShowProfileDropdown(false);
                          window.dispatchEvent(new CustomEvent('open-whistleblowing'));
                        }}
                        className="flex items-center w-full px-3 py-2 text-xs font-semibold text-[#121214] hover:bg-[#F5F4F0] rounded-xl transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 mr-2.5 text-[#121214]" />
                        Konseling & Pengaduan
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

      {/* Change Password Modal (Lazy Loaded on Demand) */}
      {showChangePasswordModal && (
        <Suspense fallback={null}>
          <ChangePasswordModal 
            isOpen={showChangePasswordModal} 
            onClose={() => setShowChangePasswordModal(false)} 
          />
        </Suspense>
      )}
    </>
  );
};

export default Header;