// src/components/Coordinator/Reminders.jsx

import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import { notificationService } from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';

const Reminders = () => {
  const { user } = useAuth();
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
        setNotifications(response.data.data.data || response.data.data);
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
      
      // JIKA recipients adalah 'participants', gunakan broadcast
      if (newNotification.recipients[0] === 'participants') {
        response = await notificationService.broadcastToParticipants(newNotification);
      } else {
        // Untuk recipients lain, gunakan create biasa
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
        
        // Tampilkan pesan sukses
        alert(response.data.message || 'Notifikasi berhasil dikirim');
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      alert('Gagal membuat notifikasi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus notifikasi ini?')) return;
    
    try {
      const response = await notificationService.coordinatorDelete(id);
      if (response.data.success) {
        loadNotifications();
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('Gagal menghapus notifikasi: ' + (error.response?.data?.message || error.message));
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-100 text-red-800 border border-red-200',
      medium: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      low: 'bg-green-100 text-green-800 border border-green-200',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  const getTypeColor = (type) => {
    const colors = {
      reminder: 'bg-blue-100 text-blue-800 border border-blue-200',
      announcement: 'bg-purple-100 text-purple-800 border border-purple-200',
      alert: 'bg-orange-100 text-orange-800 border border-orange-200',
    };
    return colors[type] || 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Reminders & Notifications</h1>
          <p className="mt-2 text-sm text-gray-600">Buat dan kelura pengingat untuk peserta</p>
        </div>

        {/* Create New Notification Form */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Buat Notifikasi Baru</h2>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {showCreateForm ? 'Batal' : 'Buat Notifikasi Baru'}
            </button>
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreateNotification} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Judul notifikasi"
                  value={newNotification.title}
                  onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="date"
                  value={newNotification.due_date}
                  onChange={(e) => setNewNotification({ ...newNotification, due_date: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <textarea
                placeholder="Pesan notifikasi"
                value={newNotification.message}
                onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                required
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select 
                  value={newNotification.type} 
                  onChange={(e) => setNewNotification({ ...newNotification, type: e.target.value })} 
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="reminder">Pengingat</option>
                  <option value="announcement">Pengumuman</option>
                  <option value="alert">Alert</option>
                </select>
                
                <select 
                  value={newNotification.priority} 
                  onChange={(e) => setNewNotification({ ...newNotification, priority: e.target.value })} 
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Prioritas Rendah</option>
                  <option value="medium">Prioritas Medium</option>
                  <option value="high">Prioritas Tinggi</option>
                </select>
                
                <select
                  value={newNotification.recipients[0]}
                  onChange={(e) => setNewNotification({ ...newNotification, recipients: [e.target.value] })}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Semua Pengguna</option>
                  <option value="participants">Peserta Saja</option>
                  <option value="coordinators">Koordinator Saja</option>
                </select>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-700">
                  {newNotification.recipients[0] === 'participants' 
                    ? '📢 Notifikasi akan dikirim ke SEMUA peserta' 
                    : newNotification.recipients[0] === 'coordinators'
                    ? '👥 Notifikasi akan dikirim ke koordinator saja'
                    : '🌐 Notifikasi akan dikirim ke semua pengguna'
                  }
                </p>
              </div>
              
              <button 
                type="submit" 
                className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {newNotification.recipients[0] === 'participants' ? 'Broadcast ke Peserta' : 'Buat Notifikasi'}
              </button>
            </form>
          )}
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              Notifikasi Anda
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({notifications.length} items)
              </span>
            </h3>
            
            <button
              onClick={loadNotifications}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
            >
              Refresh
            </button>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-gray-500">Memuat notifikasi...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Belum ada notifikasi</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <div key={notification.notification_id} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {notification.title}
                        </h3>
                        <div className="flex space-x-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(notification.type)}`}>
                            {notification.type.toUpperCase()}
                          </span>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(notification.priority)}`}>
                            {notification.priority.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      <p className="mt-2 text-sm text-gray-600">{notification.message}</p>
                      
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        {notification.due_date && (
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Jatuh Tempo: {formatDate(notification.due_date)}
                          </span>
                        )}
                        
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Untuk: {notification.recipients?.join(', ') || 'all'}
                        </span>
                        
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatDate(notification.created_at)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex space-x-2 ml-4">
                      <button 
                        onClick={() => handleDelete(notification.notification_id)} 
                        className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                      >
                        Hapus
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

export default Reminders;