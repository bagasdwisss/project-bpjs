import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, Calendar, FileText, ClipboardList, TrendingUp, 
  FolderOpen, MessageSquare, Bell, Users, Award, 
  BarChart3, FileSpreadsheet, Download, 
  Database, Radio, LogOut, X 
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

// Import logo
import logo from '../../assets/27102023_091008_dorong_universal.png';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Fungsi untuk mendapatkan menu items berdasarkan role
  const getMenuItems = () => {
    const role = user?.role;

    // Filter menu items based on user placement (for participants)
    const getFilteredParticipantMenu = () => {
      const baseMenu = [
        { path: '/participant/dashboard', icon: Home, label: 'Dashboard' },
        { path: '/participant/attendance', icon: ClipboardList, label: 'Absensi' },
        { path: '/participant/calendar', icon: Calendar, label: 'Kalender' },
        { path: '/participant/progress', icon: TrendingUp, label: 'Progress Saya' },
        { path: '/participant/documents', icon: FolderOpen, label: 'Dokumen' },
        { path: '/participant/notifications', icon: Bell, label: 'Notifikasi' },
        { path: '/participant/acquisition-result', icon: Database, label: 'Hasil Akuisisi' },
      ];

      // Hide attendance menu for "lapangan" participants
      if (user?.penempatan === 'lapangan') {
        return baseMenu.filter(item => item.path !== '/participant/attendance');
      }

      return baseMenu;
    };

    const participantMenu = getFilteredParticipantMenu();

    const coordinatorMenu = [
      { path: '/coordinator/dashboard', icon: Home, label: 'Dashboard' },
      { path: '/coordinator/participants', icon: Users, label: 'Data Peserta' },
      { path: '/coordinator/grading', icon: Award, label: 'Penilaian' },
      { path: '/coordinator/analysis', icon: BarChart3, label: 'Analisis' },
      { path: '/coordinator/reminders', icon: Bell, label: 'Pengingat' },
    ];

    const adminMenu = [
      { path: '/admin/dashboard', icon: Home, label: 'Dashboard' },
      { path: '/admin/users', icon: Users, label: 'Kelola User' },
      { path: '/admin/batches', icon: Calendar, label: 'Kelola Batch' },
      { path: '/admin/reports', icon: FileText, label: 'Laporan' },
      { path: '/admin/import-export', icon: Download, label: 'Import/Export' },
      { path: '/admin/monitoring', icon: BarChart3, label: 'Monitoring' },
      { path: '/admin/backup', icon: Database, label: 'Backup' },
      { path: '/admin/broadcast', icon: Radio, label: 'Broadcast' },
    ];

    // Logic untuk menentukan menu berdasarkan role
    if (!role) {
      return participantMenu;
    }

    const roleLower = role.toLowerCase();
    
    if (roleLower.includes('peserta') || roleLower.includes('participant') || roleLower.includes('student')) {
      return participantMenu;
    } else if (roleLower.includes('koordinator') || roleLower.includes('coordinator') || roleLower.includes('trainer')) {
      return coordinatorMenu;
    } else if (roleLower.includes('admin') || roleLower.includes('administrator')) {
      return adminMenu;
    } else {
      return participantMenu;
    }
  };

  const currentMenu = getMenuItems();

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-full bg-gradient-to-b from-slate-800 to-slate-900 
        text-white w-64 z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Ganti ikon dengan logo */}
              <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
                <img 
                  src={logo} 
                  alt="Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-bold text-lg">Absensi & Nilai</span>
            </div>
            <button 
              onClick={toggleSidebar}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-lg font-bold">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">
                {user?.full_name || 'User'}
              </p>
              <span className="inline-block px-2 py-1 text-xs bg-blue-500 bg-opacity-20 text-blue-300 rounded-full mt-1">
                {user?.role || 'Role'}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          {currentMenu.length > 0 ? (
            <ul className="space-y-1">
              {currentMenu.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => {
                        if (window.innerWidth < 1024) {
                          toggleSidebar();
                        }
                      }}
                      className={`
                        flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200
                        ${isActive 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50' 
                          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <p>No menu items available</p>
              <p className="text-sm mt-2">Check user role configuration</p>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-slate-300 hover:bg-red-600 hover:text-white rounded-lg transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;