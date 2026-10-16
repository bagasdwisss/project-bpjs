import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, Calendar, FileText, ClipboardList, TrendingUp, 
  FolderOpen, Bell, Users, Award, 
  BarChart3, Download, 
  Database, Radio, LogOut, X, ChevronRight, Sparkles
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import logo from '../../assets/27102023_091008_dorong_universal.png';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const role = user?.role || '';
  const roleLower = role.toLowerCase();

  // Menu categorization into General & Tools
  const getCategorizedMenu = () => {
    if (roleLower.includes('admin') || roleLower.includes('administrator')) {
      return {
        general: [
          { path: '/admin/dashboard', icon: Home, label: 'Dashboard' },
          { path: '/admin/users', icon: Users, label: 'Kelola User' },
          { path: '/admin/batches', icon: Calendar, label: 'Kelola Batch' },
          { path: '/admin/reports', icon: FileText, label: 'Laporan' },
          { path: '/admin/monitoring', icon: BarChart3, label: 'Monitoring' },
        ],
        tools: [
          { path: '/admin/import-export', icon: Download, label: 'Import / Export' },
          { path: '/admin/backup', icon: Database, label: 'Backup Data' },
          { path: '/admin/broadcast', icon: Radio, label: 'Broadcast Pesan' },
        ]
      };
    } else if (roleLower.includes('koordinator') || roleLower.includes('coordinator')) {
      return {
        general: [
          { path: '/coordinator/dashboard', icon: Home, label: 'Dashboard' },
          { path: '/coordinator/participants', icon: Users, label: 'Data Peserta' },
          { path: '/coordinator/grading', icon: Award, label: 'Penilaian' },
          { path: '/coordinator/analysis', icon: BarChart3, label: 'Analisis Metrik' },
        ],
        tools: [
          { path: '/coordinator/reminders', icon: Bell, label: 'Pengingat' },
        ]
      };
    } else {
      // Peserta
      const generalItems = [
        { path: '/participant/dashboard', icon: Home, label: 'Dashboard' },
        { path: '/participant/attendance', icon: ClipboardList, label: 'Absensi Harian' },
        { path: '/participant/calendar', icon: Calendar, label: 'Jadwal & Kalender' },
        { path: '/participant/progress', icon: TrendingUp, label: 'Progress Saya' },
        { path: '/participant/acquisition-result', icon: Database, label: 'Hasil Akuisisi' },
      ];

      // Hide attendance for "lapangan"
      const filteredGeneral = user?.penempatan === 'lapangan'
        ? generalItems.filter(item => item.path !== '/participant/attendance')
        : generalItems;

      return {
        general: filteredGeneral,
        tools: [
          { path: '/participant/documents', icon: FolderOpen, label: 'Basis Dokumen' },
          { path: '/participant/notifications', icon: Bell, label: 'Notifikasi' },
        ]
      };
    }
  };

  const { general, tools } = getCategorizedMenu();

  const renderNavList = (items) => (
    <ul className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;

        return (
          <li key={item.path}>
            <Link
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 1024) toggleSidebar();
              }}
              className={`
                group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-200
                ${isActive 
                  ? 'bg-[#1C1C20] text-[#F5C6EC] border-l-[3px] border-[#F5C6EC] pl-3 shadow-inner' 
                  : 'text-[#9CA3AF] hover:bg-[#18181B] hover:text-white'
                }
              `}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-[#F5C6EC]' : 'text-[#9CA3AF]'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#F5C6EC] shrink-0"></div>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Pitch-Black Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full bg-[#121214] text-white w-64 z-50 flex flex-col justify-between
        transform transition-transform duration-300 ease-in-out border-r border-[#1C1C20]
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Top Header & Branding */}
        <div>
          <div className="px-5 pt-6 pb-4 flex items-center justify-between border-b border-[#1C1C20]">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FCE373] via-[#F5C6EC] to-[#BDD4F2] p-0.5 flex items-center justify-center shadow-md">
                <div className="w-full h-full bg-[#121214] rounded-[10px] flex items-center justify-center overflow-hidden">
                  <img src={logo} alt="Logo" width="20" height="20" style={{ width: '20px', height: '20px', objectFit: 'contain' }} className="w-5 h-5 object-contain" />
                </div>
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="font-bold text-xl tracking-tight text-white font-sans">intelly</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#F5C6EC] bg-[#1C1C20] px-1.5 py-0.5 rounded-full">BPJS</span>
              </div>
            </div>

            <button 
              onClick={toggleSidebar}
              className="lg:hidden text-[#9CA3AF] hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Mini Card in Pitch Black */}
          <div className="px-5 py-4 border-b border-[#1C1C20]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#F5C6EC] text-[#121214] flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {user?.full_name || 'Pengguna'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block text-[10px] font-semibold bg-[#1C1C20] text-[#F5C6EC] px-2 py-0.5 rounded-full border border-[#27272A]">
                    {user?.role || 'Peserta'}
                  </span>
                  {user?.unique_id && (
                    <span className="text-[10px] text-[#71717A] truncate">
                      {user.unique_id}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Menu (General & Tools) */}
          <nav className="px-3 py-4 space-y-6 overflow-y-auto max-h-[calc(100vh-220px)]">
            <div>
              <p className="px-3 mb-2 text-[10px] font-bold text-[#71717A] uppercase tracking-wider">
                General
              </p>
              {renderNavList(general)}
            </div>

            <div>
              <p className="px-3 mb-2 text-[10px] font-bold text-[#71717A] uppercase tracking-wider">
                Tools
              </p>
              {renderNavList(tools)}
            </div>
          </nav>
        </div>

        {/* Footer Sidebar (Logout Button) */}
        <div className="p-4 border-t border-[#1C1C20]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold text-[#9CA3AF] hover:text-red-400 hover:bg-[#1C1C20] transition-all duration-200"
          >
            <div className="flex items-center space-x-2.5">
              <LogOut className="w-4 h-4 text-[#9CA3AF] group-hover:text-red-400" />
              <span>Keluar (Log out)</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-50" />
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;