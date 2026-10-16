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
      high: 'bg-red-100 text-red-800 border border-red-200',
      medium: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      low: 'bg-green-100 text-green-800 border border-green-200',
    };
    return colors[priority];
  };

  const getTypeColor = (type) => {
    const colors = {
      reminder: 'bg-blue-100 text-blue-800 border border-blue-200',
      announcement: 'bg-purple-100 text-purple-800 border border-purple-200',
      alert: 'bg-orange-100 text-orange-800 border border-orange-200',
    };
    return colors[type];
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
      <div className="p-6">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifikasi</h1>
              <p className="mt-2 text-sm text-gray-600">Update dan pengingat penting</p>
            </div>
            
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                Tandai Semua Dibaca ({unreadCount})
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              Notifikasi Anda
              {unreadCount > 0 && (
                <span className="ml-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                  {unreadCount} belum dibaca
                </span>
              )}
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
                <div 
                  key={notification.notification_id} 
                  className={`p-6 hover:bg-gray-50 cursor-pointer ${!notification.is_read ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                  onClick={() => !notification.is_read && handleMarkAsRead(notification.notification_id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {notification.title}
                          {!notification.is_read && (
                            <span className="ml-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs">
                              Baru
                            </span>
                          )}
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatDate(notification.created_at)}
                        </span>
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