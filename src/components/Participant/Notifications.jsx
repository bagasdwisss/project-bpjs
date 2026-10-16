// src/components/Participant/Notifications.jsx

import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import { notificationService } from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ListSkeleton } from '../Common/Skeleton';
import { 
  Bell, 
  Trash2, 
  CheckCheck, 
  RefreshCw, 
  Clock, 
  Calendar, 
  AlertCircle,
  Inbox
} from 'lucide-react';

const Notifications = () => {
  const { user } = useAuth();
  const { toast, confirm } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationService.getAll();
      if (response.data?.success) {
        setNotifications(response.data.data?.data || response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await notificationService.getUnreadCount();
      if (response.data?.success) {
        setUnreadCount(response.data.data.unread_count || response.data.data.count || 0);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      const response = await notificationService.markAsRead(id);
      if (response.data?.success) {
        setNotifications(prev => 
          prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n)
        );
        loadUnreadCount();
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await notificationService.markAllAsRead();
      if (response.data?.success) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteNotification = async (id, e) => {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Hapus Notifikasi',
      message: 'Hapus notifikasi ini dari akun Anda?',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger'
    });
    if (!ok) return;
    try {
      const response = await notificationService.delete(id);
      if (response.data?.success) {
        setNotifications(prev => prev.filter(n => n.notification_id !== id));
        loadUnreadCount();
        toast.success('Notifikasi berhasil dihapus.');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Gagal menghapus notifikasi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleClearAllRead = async () => {
    const ok = await confirm({
      title: 'Bersihkan Notifikasi',
      message: 'Hapus seluruh notifikasi yang sudah Anda baca?',
      confirmText: 'Ya, Bersihkan',
      cancelText: 'Batal',
      type: 'warning'
    });
    if (!ok) return;
    try {
      const response = await notificationService.clearAllRead();
      if (response.data?.success) {
        setNotifications(prev => prev.filter(n => !n.is_read));
        toast.success('Notifikasi yang terbaca berhasil dibersihkan.');
      }
    } catch (error) {
      console.error('Error clearing read notifications:', error);
      toast.error('Gagal membersihkan notifikasi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleClearAll = async () => {
    const ok = await confirm({
      title: 'Hapus Semua Notifikasi',
      message: 'Apakah Anda yakin ingin menghapus SEMUA notifikasi di akun Anda? Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Ya, Hapus Semua',
      cancelText: 'Batal',
      type: 'danger'
    });
    if (!ok) return;
    try {
      const response = await notificationService.clearAll();
      if (response.data?.success) {
        setNotifications([]);
        setUnreadCount(0);
        toast.success('Seluruh notifikasi berhasil dibersihkan.');
      }
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      toast.error('Gagal membersihkan semua notifikasi: ' + (error.response?.data?.message || error.message));
    }
  };

  const getPriorityColor = (priority) => {
    const p = (priority || '').toLowerCase();
    const colors = {
      high: 'bg-rose-50 text-rose-700 border border-rose-200',
      medium: 'bg-[#FCE373]/50 text-[#856B12] border border-[#FCE373]',
      low: 'bg-[#B8C96E]/40 text-[#3C4A11] border border-[#B8C96E]',
    };
    return colors[p] || 'bg-[#FAF9F6] text-[#121214] border border-[#EAE9E4]';
  };

  const getTypeColor = (type) => {
    const t = (type || '').toLowerCase();
    const colors = {
      reminder: 'bg-[#BDD4F2] text-[#1E3A8A]',
      announcement: 'bg-[#F5C6EC] text-[#8B2471]',
      alert: 'bg-[#FCE373] text-[#856B12]',
    };
    return colors[t] || 'bg-[#FAF9F6] text-[#121214]';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const hasReadNotifications = notifications.some(n => n.is_read);

  return (
    <Layout>
      <div className="space-y-6 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#BDD4F2]/50 text-[#1E3A8A]">
                <Bell className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#121214]/60">Pemberitahuan</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121214] tracking-tight">
              Pusat Notifikasi & Pengingat
            </h1>
            <p className="text-xs sm:text-sm text-[#6E6D6A] mt-1">
              Informasi instruksi pembimbing, tenggat penugasan, dan pengumuman operasional BPJSTK
            </p>
          </div>

          {/* Action Button Group */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-3.5 py-2 bg-[#121214] text-white rounded-full text-xs font-bold hover:bg-neutral-800 transition-colors shadow-sm inline-flex items-center gap-1.5"
              >
                <CheckCheck className="w-3.5 h-3.5 text-[#B8C96E]" />
                Tandai Semua Dibaca ({unreadCount})
              </button>
            )}

            {hasReadNotifications && (
              <button
                onClick={handleClearAllRead}
                className="px-3.5 py-2 bg-white border border-[#EAE9E4] text-[#121214] rounded-full text-xs font-bold hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors shadow-sm inline-flex items-center gap-1.5"
                title="Hapus notifikasi yang telah dibaca"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Terbaca
              </button>
            )}

            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-3.5 py-2 bg-white border border-[#EAE9E4] text-rose-600 rounded-full text-xs font-bold hover:bg-rose-50 hover:border-rose-200 transition-colors shadow-sm inline-flex items-center gap-1.5"
                title="Hapus seluruh riwayat notifikasi"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Semua
              </button>
            )}

            <button
              onClick={() => {
                loadNotifications();
                loadUnreadCount();
              }}
              className="p-2 bg-white border border-[#EAE9E4] text-[#121214] rounded-full hover:bg-[#FAF9F6] transition-colors shadow-sm"
              title="Segarkan Notifikasi"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3 Bento Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-[22px] bg-[#F5C6EC] text-[#121214] p-5 relative overflow-hidden shadow-sm flex flex-col justify-between border-2 border-[#121214]">
            <div className="absolute right-3 -bottom-4 opacity-15 pointer-events-none text-7xl font-black">♥</div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#121214]/70">Pesan Baru</span>
            <div className="text-3xl font-black text-[#121214] my-1">{unreadCount}</div>
            <span className="text-[10px] font-bold text-[#121214]/70">Belum Dibuka</span>
          </div>

          <div className="rounded-[22px] bg-[#FCE373] text-[#121214] p-5 relative overflow-hidden shadow-sm flex flex-col justify-between border-2 border-[#121214]">
            <div className="absolute right-3 -bottom-4 opacity-15 pointer-events-none text-7xl font-black">●</div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#121214]/70">Total Notifikasi</span>
            <div className="text-3xl font-black text-[#121214] my-1">{notifications.length}</div>
            <span className="text-[10px] font-bold text-[#121214]/70">Tersimpan di Akun</span>
          </div>

          <div className="rounded-[22px] bg-[#BDD4F2] text-[#121214] p-5 relative overflow-hidden shadow-sm flex flex-col justify-between border-2 border-[#121214]">
            <div className="absolute right-3 -bottom-4 opacity-15 pointer-events-none text-7xl font-black">★</div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#121214]/70">Pengingat & Prioritas</span>
            <div className="text-3xl font-black text-[#121214] my-1">
              {notifications.filter(n => n.type === 'reminder' || n.priority === 'high' || n.priority === 'medium').length}
            </div>
            <span className="text-[10px] font-bold text-[#121214]/70">Perlu Diperhatikan</span>
          </div>
        </div>

        {/* Notifications List Bento Card */}
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#EAE9E4] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#121214]"></span>
              <h2 className="text-sm sm:text-base font-bold text-[#121214]">
                Daftar Notifikasi Masuk
                {unreadCount > 0 && (
                  <span className="ml-2.5 bg-[#121214] text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                    {unreadCount} belum dibaca
                  </span>
                )}
              </h2>
            </div>
            <span className="text-xs font-semibold text-[#8A8985] hidden sm:inline">
              Klik baris untuk menandai telah dibaca
            </span>
          </div>
          
          {loading ? (
            <div className="p-4">
              <ListSkeleton items={5} />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#FAF9F6] border border-[#EAE9E4] flex items-center justify-center mx-auto text-[#121214]/40">
                <Inbox className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#121214]">Tidak ada notifikasi</h3>
              <p className="text-xs text-[#6E6D6A] max-w-sm mx-auto">
                Kotak masuk notifikasi Anda bersih. Semua pengumuman dan instruksi baru akan ditampilkan di sini.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#F0EFEA]">
              {notifications.map((notification) => (
                <div 
                  key={notification.notification_id} 
                  className={`p-5 sm:p-6 hover:bg-[#FAF9F6] transition-colors cursor-pointer group relative ${
                    !notification.is_read ? 'bg-[#F5C6EC]/15 border-l-4 border-[#121214]' : ''
                  }`}
                  onClick={() => !notification.is_read && handleMarkAsRead(notification.notification_id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 space-y-1.5 pr-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-[#121214]">
                          {notification.title}
                        </h3>
                        {!notification.is_read && (
                          <span className="bg-[#121214] text-white px-2 py-0.5 rounded-full text-[9px] font-bold">
                            Baru
                          </span>
                        )}
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${getTypeColor(notification.type)}`}>
                          {(notification.type || 'Pemberitahuan').toUpperCase()}
                        </span>
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${getPriorityColor(notification.priority)}`}>
                          {(notification.priority || 'Normal').toUpperCase()}
                        </span>
                      </div>
                      
                      <p className="text-xs text-[#121214]/85 leading-relaxed whitespace-pre-wrap font-medium">
                        {notification.message}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#8A8985] pt-1 font-medium">
                        {notification.due_date && (
                          <span className="font-bold text-rose-600 inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Tenggat: {formatDate(notification.due_date)}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(notification.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Working Action Buttons (Delete Individual) */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-start pt-1 sm:pt-0">
                      <button
                        onClick={(e) => handleDeleteNotification(notification.notification_id, e)}
                        className="p-2 rounded-xl bg-white hover:bg-rose-50 text-[#121214]/50 hover:text-rose-600 border border-[#EAE9E4] hover:border-rose-300 transition shadow-sm"
                        title="Hapus notifikasi ini"
                        aria-label="Hapus notifikasi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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

export default Notifications;