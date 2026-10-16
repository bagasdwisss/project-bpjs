// src/components/Participant/Notifications.jsx

import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import { notificationService } from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';

const Notifications = () => {
  const { user } = useAuth();
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
      if (response.data.success) {
        setNotifications(response.data.data.data || response.data.data);
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
      if (response.data.success) {
        setUnreadCount(response.data.data.unread_count);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      const response = await notificationService.markAsRead(id);
      if (response.data.success) {
        loadNotifications();
        loadUnreadCount();
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await notificationService.markAllAsRead();
      if (response.data.success) {
        loadNotifications();
        loadUnreadCount();
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-rose-50 text-rose-700 border border-rose-200',
      medium: 'bg-[#FCE373] text-[#121214] border border-[#F2CE46]/50',
      low: 'bg-[#B8C96E] text-[#121214] border border-[#9CB04C]/50',
    };
    return colors[priority] || 'bg-[#FAF9F6] text-[#121214] border border-[#EAE9E4]';
  };

  const getTypeColor = (type) => {
    const colors = {
      reminder: 'bg-[#BDD4F2] text-[#121214]',
      announcement: 'bg-[#F5C6EC] text-[#121214]',
      alert: 'bg-[#FCE373] text-[#121214]',
    };
    return colors[type] || 'bg-[#FAF9F6] text-[#121214]';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121214] tracking-tight">
              Pusat Notifikasi & Pengingat 🔔
            </h1>
            <p className="text-xs sm:text-sm text-[#6E6D6A] mt-1">
              Informasi instruksi pembimbing, tenggat penugasan, dan pengumuman operasional BPJS
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-4 py-2 bg-[#121214] text-white rounded-full text-xs font-bold hover:bg-neutral-800 transition-colors shadow-sm"
              >
                Tandai Semua Dibaca ({unreadCount})
              </button>
            )}
            <button
              onClick={loadNotifications}
              className="px-4 py-2 bg-white border border-[#EAE9E4] text-[#121214] rounded-full text-xs font-bold hover:bg-[#FAF9F6] transition-colors shadow-sm"
            >
              Segarkan
            </button>
          </div>
        </div>

        {/* 3 Quick Bento Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-[22px] bg-[#F5C6EC] text-[#121214] p-5 relative overflow-hidden shadow-sm flex flex-col justify-between">
            <div className="absolute right-3 -bottom-4 opacity-15 pointer-events-none text-7xl font-black">♥</div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#121214]/70">Pesan Baru</span>
            <div className="text-3xl font-black text-[#121214] my-1">{unreadCount}</div>
            <span className="text-[10px] font-bold text-[#121214]/70">Belum Dibuka</span>
          </div>

          <div className="rounded-[22px] bg-[#FCE373] text-[#121214] p-5 relative overflow-hidden shadow-sm flex flex-col justify-between">
            <div className="absolute right-3 -bottom-4 opacity-15 pointer-events-none text-7xl font-black">●</div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#121214]/70">Total Notifikasi</span>
            <div className="text-3xl font-black text-[#121214] my-1">{notifications.length}</div>
            <span className="text-[10px] font-bold text-[#121214]/70">Tersimpan di Akun</span>
          </div>

          <div className="rounded-[22px] bg-[#BDD4F2] text-[#121214] p-5 relative overflow-hidden shadow-sm flex flex-col justify-between">
            <div className="absolute right-3 -bottom-4 opacity-15 pointer-events-none text-7xl font-black">★</div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#121214]/70">Pengingat Aktif</span>
            <div className="text-3xl font-black text-[#121214] my-1">
              {notifications.filter(n => n.type === 'reminder' || n.priority === 'high').length}
            </div>
            <span className="text-[10px] font-bold text-[#121214]/70">Prioritas Tinggi</span>
          </div>
        </div>

        {/* Notifications List Bento Card */}
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#EAE9E4] flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-[#121214]">
              Riwayat Notifikasi
              {unreadCount > 0 && (
                <span className="ml-2.5 bg-[#121214] text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                  {unreadCount} baru
                </span>
              )}
            </h2>
            <span className="text-xs font-bold text-[#6E6D6A]">Klik untuk menandai dibaca</span>
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-2">
              <div className="w-8 h-8 border-2 border-[#121214] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-[#121214]">Memuat notifikasi...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center text-[#6E6D6A] text-xs">Belum ada notifikasi baru untuk Anda saat ini.</div>
          ) : (
            <div className="divide-y divide-[#F0EFEA]">
              {notifications.map((notification) => (
                <div 
                  key={notification.notification_id} 
                  className={`p-5 sm:p-6 hover:bg-[#FAF9F6] transition-colors cursor-pointer ${
                    !notification.is_read ? 'bg-[#F5C6EC]/15 border-l-4 border-[#121214]' : ''
                  }`}
                  onClick={() => !notification.is_read && handleMarkAsRead(notification.notification_id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 space-y-1.5">
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
                          {notification.type.toUpperCase()}
                        </span>
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${getPriorityColor(notification.priority)}`}>
                          {notification.priority.toUpperCase()}
                        </span>
                      </div>
                      
                      <p className="text-xs text-[#121214] leading-relaxed whitespace-pre-wrap">{notification.message}</p>
                      
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#8A8985] pt-1">
                        {notification.due_date && (
                          <span className="font-bold text-rose-600">
                            ⏰ Tenggat: {formatDate(notification.due_date)}
                          </span>
                        )}
                        <span>🕒 {formatDate(notification.created_at)}</span>
                      </div>
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