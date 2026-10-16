// src/components/Admin/Dashboard.jsx
import React, { useState, useEffect, useContext } from 'react';
import Layout from '../Layout/Layout';
import { AuthContext } from '../../context/AuthContext';
import dashboardService from '../../services/DashboardService';
import { 
  Users, TrendingUp, Database, Server, 
  Download, Upload, BarChart3, Shield,
  Calendar, FileText, Bell, RefreshCw, CheckCircle
} from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await dashboardService.getAdminDashboard();
      if (res.success && res.data) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.error('Error fetching admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const stats = dashboardData?.stats || {
    totalUsers: 11,
    activeParticipants: 4,
    totalCoordinators: 4,
    totalBatches: 2,
    totalModules: 4,
    systemHealth: '100% Online'
  };

  const activities = dashboardData?.recent_activities || [];
  const events = dashboardData?.upcoming_events || [];

  const StatCard = ({ icon: Icon, title, value, subtitle, color, trend }) => (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900 mb-1">{value}</h3>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 pt-3 border-t border-gray-50 flex items-center text-xs">
          <span className="text-green-600 font-semibold">{trend}</span>
          <span className="text-gray-400 ml-1.5">dibandingkan bulan lalu</span>
        </div>
      )}
    </div>
  );

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Administrator</h1>
            <p className="text-sm text-gray-500 mt-1">Selamat datang kembali, <span className="font-semibold text-gray-800">{user?.full_name}</span>. Ringkasan operasional sistem BPJS.</p>
          </div>
          <button
            onClick={fetchDashboard}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
          </button>
        </div>

        {/* Primary Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            icon={Users}
            title="Total Pengguna"
            value={stats.totalUsers}
            subtitle="Akun terdaftar dalam sistem"
            color="bg-blue-600"
            trend="+12%"
          />
          <StatCard
            icon={TrendingUp}
            title="Peserta Aktif"
            value={stats.activeParticipants}
            subtitle="Sedang menjalani masa magang"
            color="bg-green-600"
            trend="+5%"
          />
          <StatCard
            icon={Shield}
            title="Koordinator"
            value={stats.totalCoordinators}
            subtitle="Koordinator pembimbing aktif"
            color="bg-purple-600"
            trend="Stabil"
          />
          <StatCard
            icon={Calendar}
            title="Gelombang / Batch"
            value={stats.totalBatches}
            subtitle="Periode pelatihan aktif"
            color="bg-orange-500"
            trend="Aktif"
          />
        </div>

        {/* Operational Overview & Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Audit Activities */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-base">Aktivitas Sistem Terakhir</h2>
              <span className="text-xs text-gray-400">Audit Log Real-Time</span>
            </div>

            {activities.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">Belum ada aktivitas tercatat.</p>
            ) : (
              <div className="space-y-3">
                {activities.map((act) => (
                  <div key={act.log_id} className="p-3.5 bg-gray-50 rounded-xl flex items-center justify-between border border-gray-100">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{act.activity_type} - {act.details}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Oleh: <span className="font-medium text-gray-700">{act.full_name || 'System'}</span> {act.unique_id && `(${act.unique_id})`}</p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0 ml-4">{new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Info & Cloud Infrastructure */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-gray-900 text-base">Infrastruktur Hosting & Database</h3>
            <div className="space-y-3 text-xs text-gray-600">
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                <span className="font-bold text-blue-900 block">Vercel Serverless Hosting</span>
                <span className="text-blue-700 mt-0.5 block">Zero cold-start micro-functions, auto-scaled, free tier ready.</span>
              </div>
              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100">
                <span className="font-bold text-purple-900 block">Neon PostgreSQL Cloud</span>
                <span className="text-purple-700 mt-0.5 block">Branching-enabled serverless PostgreSQL dengan SSL pooling.</span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <h4 className="font-semibold text-gray-800 text-xs uppercase tracking-wider mb-2">Event Terdekat</h4>
              {events.length === 0 ? (
                <p className="text-xs text-gray-400">Tidak ada event terjadwal.</p>
              ) : (
                <div className="space-y-2">
                  {events.slice(0, 3).map((e) => (
                    <div key={e.event_id} className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                      <p className="font-bold text-gray-800">{e.event_title}</p>
                      <p className="text-gray-500 mt-0.5">{new Date(e.start_datetime).toLocaleDateString('id-ID')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;