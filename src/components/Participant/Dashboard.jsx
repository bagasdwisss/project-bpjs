import React, { useState, useEffect, useContext } from 'react';
import Layout from '../Layout/Layout';
import { AuthContext } from '../../context/AuthContext';
import { useDashboard } from '../../context/DashboardContext';
import { Calendar, TrendingUp, Award, Clock, CheckCircle, AlertCircle, BarChart3, Bell, RefreshCw, AlertTriangle } from 'lucide-react';
import dashboardService from '../../services/DashboardService.js';

const ParticipantDashboard = () => {
  const { user } = useContext(AuthContext);
  const { dashboardState, markAsRefreshed } = useDashboard();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard data utama dari database
  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      // Ambil data utama dari dashboard service
      const result = await dashboardService.getParticipantDashboard();

      if (result.success) {
        setDashboardData(result.data);
      } else {
        setError(result.message || 'Gagal memuat data dashboard');
      }
    } catch (err) {
      setError('Terjadi kesalahan tak terduga');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Mark as refreshed when dashboard data is loaded
    return () => {
      if (dashboardState.needsRefresh) {
        markAsRefreshed();
      }
    };
  }, []);
  
  // Effect to refresh dashboard when refresh is needed
  useEffect(() => {
    if (dashboardState.needsRefresh) {
      fetchDashboardData();
      markAsRefreshed();
    }
  }, [dashboardState.needsRefresh]);

  // Handle refresh
  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  // Stat Card Component
  const StatCard = ({ icon: Icon, title, value, subtitle, color }) => (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900 mb-2">{value}</h3>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  // Loading State
  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
          <p className="text-gray-600 font-medium">Memuat data dashboard...</p>
        </div>
      </Layout>
    );
  }

  // Error State
  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <AlertTriangle className="w-16 h-16 text-red-500" />
          <h3 className="text-xl font-bold text-gray-900">Gagal Memuat Dashboard</h3>
          <p className="text-gray-600 text-center max-w-md">{error}</p>
          <button onClick={() => fetchDashboardData()} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Coba Lagi
          </button>
        </div>
      </Layout>
    );
  }

  // No data state
  if (!dashboardData) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <AlertCircle className="w-16 h-16 text-gray-400" />
          <p className="text-gray-600">Tidak ada data tersedia</p>
        </div>
      </Layout>
    );
  }

  const { stats, recent_scores, upcoming_events, module_progress, unread_notifications } = dashboardData;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome Section with Refresh */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-8 text-white relative">
          <button onClick={handleRefresh} disabled={refreshing} className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50" title="Refresh Dashboard">
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <h1 className="text-3xl font-bold mb-2">Selamat Datang, {user?.full_name || 'Peserta'}! 👋</h1>
          <p className="text-blue-100">Semangat untuk belajar hari ini! Lihat progress dan pencapaian kamu di bawah.</p>

          {unread_notifications > 0 && (
            <div className="mt-4 flex items-center space-x-2 bg-white/20 rounded-lg px-4 py-2 w-fit">
              <Bell className="w-4 h-4" />
              <span className="text-sm">Kamu memiliki {unread_notifications} notifikasi belum dibaca</span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            icon={CheckCircle} 
            title="Kehadiran" 
            value={`${stats.attendance.percentage}%`} 
            subtitle={`${stats.attendance.effectivePresent} dari ${stats.attendance.total} hari`} 
            color="bg-gradient-to-br from-green-500 to-green-600" 
          />
          <StatCard
            icon={Award}
            title="Nilai Rata-rata"
            value={stats.averageScore && stats.averageScore > 0 ? stats.averageScore.toFixed(1) : '-'}
            subtitle={stats.maxScore && stats.maxScore > 0 ? `Nilai tertinggi: ${stats.maxScore}` : 'Belum ada nilai'}
            color="bg-gradient-to-br from-blue-500 to-blue-600"
          />
          <StatCard 
            icon={TrendingUp} 
            title="Peringkat" 
            value={stats.rank !== '-' ? `#${stats.rank}` : '-'} 
            subtitle={`Dari ${stats.totalParticipants} peserta`} 
            color="bg-gradient-to-br from-purple-500 to-purple-600" 
          />
          {/* Tetap "Hasil Akuisisi BPU" */}
          <StatCard 
            icon={Clock} 
            title="Hasil Akuisisi BPU" 
            value={stats.hasilAkuisisiBPU || 0} 
            subtitle="Total hasil akuisisi" 
            color="bg-gradient-to-br from-orange-500 to-orange-600" 
          />
        </div>

        {/* Attendance Details */}
        {stats.attendance.total > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Detail Kehadiran - {stats.attendance.month}</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{stats.attendance.present}</p>
                <p className="text-sm text-gray-600">Hadir</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{stats.attendance.izin}</p>
                <p className="text-sm text-gray-600">Izin</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{stats.attendance.sick}</p>
                <p className="text-sm text-gray-600">Sakit</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{stats.attendance.absent}</p>
                <p className="text-sm text-gray-600">Alpa</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{stats.attendance.late}</p>
                <p className="text-sm text-gray-600">Terlambat</p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Total Hadir Efektif (Hadir + Izin):</span>
                <span className="text-lg font-bold text-green-600">{stats.attendance.effectivePresent} hari</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm font-medium text-gray-700">Total Tidak Hadir (Alpa + Sakit + Terlambat):</span>
                <span className="text-lg font-bold text-red-600">{stats.attendance.totalAbsent} hari</span>
              </div>
            </div>
          </div>
        )}

        {/* Progress Overview - DIPERBAIKI sesuai permintaan */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Progress Akuisisi BPU</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{stats.akuisisiBPU || 0}</p>
              <p className="text-sm text-gray-600">Kunjungan BPU</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{stats.hasilAkuisisiBPU || 0}</p>
              <p className="text-sm text-gray-600">Hasil Akuisisi</p>
            </div>
            {/* Modul Selesai diganti menjadi Kunjungan PU */}
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{stats.kunjunganPU || 0}</p>
              <p className="text-sm text-gray-600">Kunjungan PU</p>
            </div>
            {/* Total Modul diganti menjadi Kehadiran Seminar */}
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">{stats.kehadiranSeminar || 0}</p>
              <p className="text-sm text-gray-600">Kehadiran Seminar</p>
            </div>
            <div className="text-center p-4 bg-indigo-50 rounded-lg">
              <p className="text-2xl font-bold text-indigo-600">{stats.nilai || 0}</p>
              <p className="text-sm text-gray-600">Nilai Total</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{stats.grade || '-'}</p>
              <p className="text-sm text-gray-600">Grade</p>
            </div>
          </div>
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Scores */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Nilai Terbaru</h2>
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {recent_scores && recent_scores.length > 0 ? (
                recent_scores.map((score, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{score.module_name}</p>
                      <p className="text-sm text-gray-500">{score.graded_at}</p>
                      {score.comments && <p className="text-xs text-gray-400 mt-1 italic">{score.comments}</p>}
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${score.score_value >= 80 ? 'text-green-600' : score.score_value >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {score.score_value}
                      </p>
                      <p className="text-xs text-gray-500">dari {score.max_score}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Belum ada nilai</p>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Kegiatan Mendatang</h2>
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {upcoming_events && upcoming_events.length > 0 ? (
                upcoming_events.map((event, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{event.event_title}</p>
                      <p className="text-sm text-gray-600 mt-1">{event.event_description}</p>
                      <p className="text-xs text-gray-500 mt-2">📅 {event.start_datetime}</p>
                      {event.batch_name && <p className="text-xs text-blue-600 mt-1">🎓 {event.batch_name}</p>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Tidak ada kegiatan mendatang</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress Chart */}
        {module_progress && module_progress.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Progress Belajar per Modul</h2>
            <div className="space-y-4">
              {module_progress.map((module, index) => (
                <div key={index}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{module.module_name}</span>
                    <span className={`text-sm font-medium ${module.percentage >= 80 ? 'text-green-600' : module.percentage >= 60 ? 'text-blue-600' : module.percentage >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {module.score_value}/{module.max_score} ({module.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        module.percentage >= 80
                          ? 'bg-gradient-to-r from-green-500 to-green-600'
                          : module.percentage >= 60
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                          : module.percentage >= 40
                          ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                          : 'bg-gradient-to-r from-red-500 to-red-600'
                      }`}
                      style={{ width: `${module.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ParticipantDashboard;