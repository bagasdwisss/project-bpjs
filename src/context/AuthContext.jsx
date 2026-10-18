// src/context/AuthContext.jsx

import React, { createContext, useState, useEffect, useContext } from 'react'; // TAMBAHKIN useContext
import authService from '../services/authService.js';
import userService from '../services/userService.js';
import api from '../services/api.js';
import { getDeviceFingerprint } from '../utils/deviceFingerprint.js';
import PageLoader from '../components/Common/PageLoader';

export const AuthContext = createContext();

// TAMBAHKIN CUSTOM HOOK INI
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [coordinator, setCoordinator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load coordinator data untuk user yang sedang login
  const loadCoordinator = async () => {
    try {
      console.log('Loading coordinator data...');
      const response = await userService.getCoordinator();
      
      if (response.data.success) {
        console.log('Coordinator data loaded:', response.data.data);
        setCoordinator(response.data.data);
      } else {
        console.log('No coordinator found');
        setCoordinator(null);
      }
    } catch (error) {
      console.error('Error loading coordinator:', error);
      setCoordinator(null);
    }
  };

  // Dynamic Inactivity Timeout helper (defaults to 15 minutes if not configured)
  const getInactivityTimeoutMs = () => {
    const configuredMinutes = parseInt(localStorage.getItem('sys_inactivity_minutes') || '15', 10);
    return (configuredMinutes > 0 ? configuredMinutes : 15) * 60 * 1000;
  };

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          // Dynamic Inactivity check: jika user tidak aktif melebihi batas waktu sebelum membuka web
          const storedLastActive = parseInt(localStorage.getItem('last_active_time') || '0', 10);
          const timeoutMs = getInactivityTimeoutMs();
          if (storedLastActive && (Date.now() - storedLastActive > timeoutMs)) {
            console.warn(`User idle for > ${timeoutMs / 60000} minutes before opening website. Redirecting to login...`);
            authService.clearAuth();
            setUser(null);
            setCoordinator(null);
            setLoading(false);
            window.location.href = '/login?reason=idle_timeout';
            return;
          }

          const currentUser = authService.getCurrentUser();
          console.log('Current user from storage:', currentUser);
          setUser(currentUser);
          
          if (!localStorage.getItem('last_active_time')) {
            localStorage.setItem('last_active_time', Date.now().toString());
          }

          // Fetch dynamic timeout setting from server in background
          try {
            const setRes = await api.get('/participant/attendance/settings');
            if (setRes.data?.data?.settings?.inactivity_timeout_minutes) {
              localStorage.setItem('sys_inactivity_minutes', setRes.data.data.settings.inactivity_timeout_minutes.toString());
            }
          } catch (e) {
            // Silently fallback to existing or default 15 mins
          }

          // Load coordinator data hanya jika user adalah peserta
          if (currentUser?.role_id === 1 || currentUser?.role === 'Peserta') {
            await loadCoordinator();
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Dynamic Inactivity Auto-Logout Tracker (Zero Network Heartbeat)
  useEffect(() => {
    if (!user) return;

    let lastRecordedActivity = Date.now();
    if (!localStorage.getItem('last_active_time')) {
      localStorage.setItem('last_active_time', Date.now().toString());
    }

    const triggerIdleLogout = () => {
      const timeoutMinutes = parseInt(localStorage.getItem('sys_inactivity_minutes') || '15', 10);
      console.warn(`Session expired due to ${timeoutMinutes}-minute inactivity. Logging out...`);
      authService.logout('idle_timeout');
      setUser(null);
      setCoordinator(null);
      window.location.href = '/login?reason=idle_timeout';
    };

    const checkInactivity = () => {
      if (!authService.isAuthenticated()) return;
      const storedLastActive = parseInt(localStorage.getItem('last_active_time') || '0', 10);
      const timeoutMs = getInactivityTimeoutMs();
      if (storedLastActive && (Date.now() - storedLastActive > timeoutMs)) {
        triggerIdleLogout();
      }
    };

    const handleUserActivity = () => {
      // Ignore background activity if tab is hidden
      if (document.visibilityState !== 'visible') return;

      const now = Date.now();
      const storedLastActive = parseInt(localStorage.getItem('last_active_time') || '0', 10);
      const timeoutMs = getInactivityTimeoutMs();

      // CRITICAL GUARD: If already idle for > 15 minutes, DO NOT refresh last_active_time!
      // The user returned after > 15 minutes of inactivity; trigger logout immediately!
      if (storedLastActive && (now - storedLastActive > timeoutMs)) {
        console.warn('Activity detected after > 15 minutes of idle. Triggering logout...');
        triggerIdleLogout();
        return;
      }

      // Throttle updating localStorage to once every 2 seconds
      if (now - lastRecordedActivity > 2000) {
        lastRecordedActivity = now;
        localStorage.setItem('last_active_time', now.toString());
      }
    };

    // Events to track user activity
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Check immediately when user switches tabs or focuses window
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkInactivity);

    // Periodic check every 1 second (pure local client-side interval, 0 network requests)
    const intervalId = setInterval(checkInactivity, 1000);

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkInactivity);
      clearInterval(intervalId);
    };
  }, [user]);

  // Real-time Instant Cross-Device Session Sync via SSE + BroadcastChannel
  useEffect(() => {
    if (!user) return;

    const performKickout = (customReason = 'concurrent_session') => {
      console.warn('🚨 Real-Time Instant Kickout triggered: Account logged in on another device/browser!');
      try {
        authService.logout();
      } catch {}
      setUser(null);
      setCoordinator(null);
      localStorage.removeItem('last_active_time');
      window.location.href = `/login?reason=${customReason}`;
    };

    // 1. Cross-Device Real-Time Server-Sent Events (SSE) Stream
    let eventSource = null;
    const token = localStorage.getItem('token');
    const deviceFp = getDeviceFingerprint();

    if (token && typeof window.EventSource !== 'undefined') {
      try {
        const streamUrl = `/api/auth/session-stream?token=${encodeURIComponent(token)}&fp=${encodeURIComponent(deviceFp)}`;
        eventSource = new EventSource(streamUrl);

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data?.type === 'CONCURRENT_DEVICE_KICKOUT') {
              if (eventSource) eventSource.close();
              performKickout('concurrent_session');
            }
          } catch (err) {}
        };

        eventSource.onerror = () => {
          // Keep browser reconnect logic intact
        };
      } catch (e) {
        console.warn('SSE Session Stream initialization error:', e);
      }
    }

    // 2. Active Fallback Polling Heartbeat (every 10s & on tab focus)
    const checkLiveSession = async () => {
      try {
        const res = await api.get('/auth/session-check');
        if (res.data?.valid === false) {
          if (eventSource) eventSource.close();
          performKickout('concurrent_session');
        }
      } catch (err) {
        // If 401 or session hijack detected
        if (err.response?.status === 401 && err.response?.data?.code === 'SESSION_HIJACK_DETECTED') {
          if (eventSource) eventSource.close();
          performKickout('concurrent_session');
        }
      }
    };
    const heartbeatInterval = setInterval(checkLiveSession, 10000);
    window.addEventListener('focus', checkLiveSession);

    // 3. Same-Browser Cross-Tab BroadcastChannel
    let channel;
    try {
      channel = new BroadcastChannel('bpjs_session_channel');
      channel.onmessage = (event) => {
        if (event.data?.type === 'CONCURRENT_LOGIN') {
          if (eventSource) eventSource.close();
          performKickout('concurrent_session');
        }
      };
    } catch {}

    // 4. Same-Browser Storage change detection
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        const currentToken = localStorage.getItem('token');
        if (!currentToken) {
          if (eventSource) eventSource.close();
          performKickout('concurrent_session');
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(heartbeatInterval);
      window.removeEventListener('focus', checkLiveSession);
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user]);

  const login = async (uniqueId, password) => {
    try {
      setError(null);
      setLoading(true);
      console.log('Attempting login with:', { uniqueId });
      
      const result = await authService.login(uniqueId, password);
      console.log('Login result:', result);
      
      if (result.success) {
        // Dapatkan user data langsung dari localStorage
        const currentUser = authService.getCurrentUser();
        console.log('Setting user state after login:', currentUser);
        
        // Reset last_active_time on login
        localStorage.setItem('last_active_time', Date.now().toString());

        // Notify other tabs immediately
        try {
          const channel = new BroadcastChannel('bpjs_session_channel');
          channel.postMessage({ type: 'CONCURRENT_LOGIN', timestamp: Date.now() });
          setTimeout(() => channel.close(), 200);
        } catch {}

        // Update state secara synchronous
        setUser(currentUser);
        
        // Load coordinator data setelah login berhasil hanya untuk peserta
        if (currentUser?.role_id === 1 || currentUser?.role === 'Peserta') {
          await loadCoordinator();
        }
        
        // Return success dengan user data untuk immediate redirect
        return { 
          success: true, 
          user: currentUser 
        };
      } else {
        setError(result.message);
        return { 
          success: false, 
          message: result.message 
        };
      }
    } catch (error) {
      console.error('Login error details:', error);
      const message = error.message || 'Login failed';
      setError(message);
      return { 
        success: false, 
        message 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async (reason = null) => {
    try {
      await authService.logout(reason);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setCoordinator(null);
      setError(null);
      localStorage.removeItem('last_active_time');
    }
  };

  // Helper functions untuk check role
  const isParticipant = user?.role_id === 1 || user?.role === 'Peserta';
  const isCoordinator = user?.role_id === 2 || user?.role === 'Koordinator';
  const isAdmin = user?.role_id === 3 || user?.role === 'Administrator';

  const value = {
    user,
    coordinator,
    error,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isParticipant,
    isCoordinator,
    isAdmin,
    refreshCoordinator: loadCoordinator,
    clearError: () => setError(null)
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};