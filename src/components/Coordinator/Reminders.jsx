// src/components/Coordinator/Reminders.jsx

import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import { notificationService } from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  Bell, 
  Plus, 
  Trash2, 
  Clock, 
  Users, 
  Calendar as CalendarIcon, 
  Send, 
  AlertCircle,
  Megaphone,
  CheckCircle2,
  RefreshCw,
  X
} from 'lucide-react';

const Reminders = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'reminder',
    priority: 'medium',
    due_date: '',
    recipients: ['all']
  });

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationService.getCoordinatorNotifications();
      if (response.data.success) {
        setNotifications(response.data.data.data || response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNotification = async (e) => {
    e.preventDefault();
    try {
      let response;
      if (newNotification.recipients[0] === 'participants') {
        response = await notificationService.broadcastToParticipants(newNotification);
      } else {
        response = await notificationService.create(newNotification);
      }
      
      if (response.data.success) {
        setNewNotification({
          title: '',
          message: '',
          type: 'reminder',
          priority: 'medium',
          due_date: '',
          recipients: ['all']
        });
        setShowCreateForm(false);
        loadNotifications();
        toast.success(response.data.message || 'Notifikasi berhasil dikirim');
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      toast.error('Gagal membuat notifikasi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus notifikasi ini?')) return;
    
    try {
      const response = await notificationService.coordinatorDelete(id);
      if (response.data.success) {
        toast.success('Notifikasi berhasil dihapus');
        loadNotifications();
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Gagal menghapus notifikasi: ' + (error.response?.data?.message || error.message));
    }
  };

  const getPriorityBadge = (priority) => {
    const p = (priority || '').toLowerCase();
    if (p === 'high') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F5C6EC]/40 text-[#8B2471] border border-[#F5C6EC]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E02E9B]"></span>
          Tinggi
        </span>
      );
    }
    if (p === 'medium') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FCE373]/40 text-[#856B12] border border-[#FCE373]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4A600]"></span>
          Sedang
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#B8C96E]/40 text-[#3C4A11] border border-[#B8C96E]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#627514]"></span>
        Rendah
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const t = (type || '').toLowerCase();
    if (t === 'reminder') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#BDD4F2]/50 text-[#1F4275] border border-[#BDD4F2]">
          <Clock className="w-3 h-3" />
          Pengingat
        </span>
      );
    }
    if (t === 'announcement') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F5C6EC]/40 text-[#8B2471] border border-[#F5C6EC]">
          <Megaphone className="w-3 h-3" />
          Pengumuman
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FCE373]/40 text-[#856B12] border border-[#FCE373]">
        <AlertCircle className="w-3 h-3" />
        Alert
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Stats calculation
  const totalCount = notifications.length;
  const reminderCount = notifications.filter(n => n.type === 'reminder').length;
  const announcementCount = notifications.filter(n => n.type === 'announcement').length;
  const highPriorityCount = notifications.filter(n => n.priority === 'high').length;

  return (
    <Layout>
      <div className="space-y-6 w-full">
        
        {/* Header Bento Box */}
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#BDD4F2]/40 text-[#1F4275]">
                <Bell className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#121214]/60">Koordinator Notifikasi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121214] tracking-tight">Pengingat & Notifikasi</h1>
            <p className="text-sm text-[#121214]/60 mt-1">Buat, kelola, dan siarkan pengingat jadwal kegiatan atau pengumuman peserta</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={loadNotifications}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#EAE9E4] bg-white text-xs font-bold text-[#121214] hover:bg-[#FAF9F6] transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Segarkan
            </button>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#121214] text-xs font-bold text-white hover:bg-black transition shadow-sm"
            >
              {showCreateForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showCreateForm ? 'Tutup Formulir' : 'Buat Notifikasi'}
            </button>
          </div>
        </div>

        {/* 4 Pastel Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#BDD4F2]/30 rounded-[22px] border border-[#BDD4F2] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#121214]/70">Total Notifikasi</span>
              <div className="w-7 h-7 rounded-xl bg-white/80 flex items-center justify-center text-[#121214]">
                <Bell className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#121214]">{totalCount}</div>
            <p className="text-xs text-[#121214]/60 mt-1">Riwayat notifikasi</p>
          </div>

          <div className="bg-[#FCE373]/30 rounded-[22px] border border-[#FCE373] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#121214]/70">Pengingat Jadwal</span>
              <div className="w-7 h-7 rounded-xl bg-white/80 flex items-center justify-center text-[#121214]">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#121214]">{reminderCount}</div>
            <p className="text-xs text-[#121214]/60 mt-1">Target jatuh tempo</p>
          </div>

          <div className="bg-[#B8C96E]/30 rounded-[22px] border border-[#B8C96E] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#121214]/70">Pengumuman</span>
              <div className="w-7 h-7 rounded-xl bg-white/80 flex items-center justify-center text-[#121214]">
                <Megaphone className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#121214]">{announcementCount}</div>
            <p className="text-xs text-[#121214]/60 mt-1">Informasi umum</p>
          </div>

          <div className="bg-[#F5C6EC]/30 rounded-[22px] border border-[#F5C6EC] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#121214]/70">Prioritas Tinggi</span>
              <div className="w-7 h-7 rounded-xl bg-white/80 flex items-center justify-center text-[#121214]">
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#121214]">{highPriorityCount}</div>
            <p className="text-xs text-[#121214]/60 mt-1">Perlu perhatian cepat</p>
          </div>
        </div>

        {/* Create Notification Card (Collapsible) */}
        {showCreateForm && (
          <div className="bg-white rounded-[22px] border border-[#EAE9E4] p-5 sm:p-6 shadow-sm transition-all duration-300">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#EAE9E4]">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-[#121214] text-white flex items-center justify-center text-xs font-bold">
                  +
                </span>
                <h2 className="text-base font-bold text-[#121214]">Formulir Buat Notifikasi Baru</h2>
              </div>
              <button 
                onClick={() => setShowCreateForm(false)}
                className="text-xs font-bold text-[#121214]/50 hover:text-[#121214]"
              >
                Batal
              </button>
            </div>

            <form onSubmit={handleCreateNotification} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#121214] mb-1.5">Judul Notifikasi</label>
                  <input
                    type="text"
                    placeholder="Contoh: Pengumpulan Laporan Modul 2"
                    value={newNotification.title}
                    onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                    className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-sm font-medium text-[#121214] placeholder-[#121214]/40 focus:outline-none focus:bg-white focus:border-[#121214] transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#121214] mb-1.5">Batas Waktu (Opsional)</label>
                  <input
                    type="date"
                    value={newNotification.due_date}
                    onChange={(e) => setNewNotification({ ...newNotification, due_date: e.target.value })}
                    className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-sm font-medium text-[#121214] focus:outline-none focus:bg-white focus:border-[#121214] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121214] mb-1.5">Isi Pesan Notifikasi</label>
                <textarea
                  placeholder="Tuliskan rincian instruksi atau pengumuman yang jelas..."
                  value={newNotification.message}
                  onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                  className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-sm font-medium text-[#121214] placeholder-[#121214]/40 focus:outline-none focus:bg-white focus:border-[#121214] transition"
                  rows="3"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#121214] mb-1.5">Tipe</label>
                  <select 
                    value={newNotification.type} 
                    onChange={(e) => setNewNotification({ ...newNotification, type: e.target.value })} 
                    className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-sm font-medium text-[#121214] focus:outline-none focus:bg-white focus:border-[#121214] transition cursor-pointer"
                  >
                    <option value="reminder">Pengingat (Reminder)</option>
                    <option value="announcement">Pengumuman (Announcement)</option>
                    <option value="alert">Penting / Alert</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-[#121214] mb-1.5">Prioritas</label>
                  <select 
                    value={newNotification.priority} 
                    onChange={(e) => setNewNotification({ ...newNotification, priority: e.target.value })} 
                    className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-sm font-medium text-[#121214] focus:outline-none focus:bg-white focus:border-[#121214] transition cursor-pointer"
                  >
                    <option value="low">Rendah (Low)</option>
                    <option value="medium">Sedang (Medium)</option>
                    <option value="high">Tinggi (High)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#121214] mb-1.5">Penerima</label>
                  <select
                    value={newNotification.recipients[0]}
                    onChange={(e) => setNewNotification({ ...newNotification, recipients: [e.target.value] })}
                    className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-sm font-medium text-[#121214] focus:outline-none focus:bg-white focus:border-[#121214] transition cursor-pointer"
                  >
                    <option value="all">Semua Pengguna</option>
                    <option value="participants">Khusus Peserta</option>
                    <option value="coordinators">Khusus Koordinator</option>
                  </select>
                </div>
              </div>

              <div className="bg-[#FAF9F6] border border-[#EAE9E4] p-4 rounded-xl flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 text-xs font-medium text-[#121214]/70">
                  <Send className="w-4 h-4 text-[#121214]" />
                  <span>
                    {newNotification.recipients[0] === 'participants' 
                      ? 'Notifikasi akan disiarkan ke SEMUA peserta magang aktif' 
                      : newNotification.recipients[0] === 'coordinators'
                      ? 'Notifikasi akan dikirimkan ke internal tim koordinator'
                      : 'Notifikasi akan disiarkan ke seluruh akun sistem'
                    }
                  </span>
                </div>

                <button 
                  type="submit" 
                  className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#121214] text-white text-xs font-bold hover:bg-black transition shadow-sm"
                >
                  {newNotification.recipients[0] === 'participants' ? 'Siarkan ke Peserta' : 'Kirim Notifikasi'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Notifications List Container */}
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-[#EAE9E4] mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#121214]"></span>
              <h3 className="text-base font-bold text-[#121214]">Daftar Notifikasi Terkirim</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FAF9F6] border border-[#EAE9E4] text-[#121214]/70">
                {notifications.length}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-2 border-[#121214] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs font-bold text-[#121214]/60">Memuat daftar notifikasi...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-[#FAF9F6] border border-[#EAE9E4] flex items-center justify-center mx-auto mb-3 text-[#121214]/40">
                <Bell className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-[#121214]">Belum ada notifikasi</h4>
              <p className="text-xs text-[#121214]/50 mt-1">Klik tombol Buat Notifikasi di atas untuk menyiarkan informasi ke peserta.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div 
                  key={notification.notification_id} 
                  className="p-4 sm:p-5 rounded-2xl border border-[#EAE9E4] bg-[#FAF9F6] hover:bg-white transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-bold text-[#121214]">
                        {notification.title}
                      </h4>
                      {getTypeBadge(notification.type)}
                      {getPriorityBadge(notification.priority)}
                    </div>
                    
                    <p className="text-xs sm:text-sm text-[#121214]/70 font-medium whitespace-pre-line">
                      {notification.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-[#121214]/50 font-medium">
                      {notification.due_date && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarIcon className="w-3.5 h-3.5 text-[#121214]/70" />
                          Batas: <strong className="text-[#121214]">{formatDate(notification.due_date)}</strong>
                        </span>
                      )}
                      
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-[#121214]/70" />
                        Sasaran: <strong className="text-[#121214]">{notification.recipients?.join(', ') || 'Semua'}</strong>
                      </span>
                      
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#121214]/70" />
                        Dibuat: {formatDate(notification.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button 
                      onClick={() => handleDelete(notification.notification_id)} 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-xs font-bold transition"
                      title="Hapus Notifikasi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
};

export default Reminders;