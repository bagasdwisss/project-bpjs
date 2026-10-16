// src/context/AuthContext.jsx

import React, { createContext, useState, useEffect, useContext } from 'react'; // TAMBAHKIN useContext
import authService from '../services/authService.js';
import userService from '../services/userService.js';
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

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const currentUser = authService.getCurrentUser();
          console.log('Current user from storage:', currentUser);
          setUser(currentUser);
          
          if (!localStorage.getItem('last_active_time')) {
            localStorage.setItem('last_active_time', Date.now().toString());
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

  // 5-Minute Inactivity Auto-Logout Tracker
  useEffect(() => {
    if (!user) return;

    const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 menit = 300,000 ms
    let lastRecordedActivity = Date.now();
    localStorage.setItem('last_active_time', Date.now().toString());

    const handleUserActivity = () => {
      const now = Date.now();
      // Throttle updating localStorage to once every 2 seconds
      if (now - lastRecordedActivity > 2000) {
        lastRecordedActivity = now;
        localStorage.setItem('last_active_time', now.toString());
      }
    };

    const checkInactivity = () => {
      const storedLastActive = parseInt(localStorage.getItem('last_active_time') || '0', 10);
      if (storedLastActive && Date.now() - storedLastActive > INACTIVITY_TIMEOUT_MS) {
        console.warn('User idle for > 5 minutes. Logging out for security...');
        authService.logout();
        setUser(null);
        setCoordinator(null);
        localStorage.removeItem('last_active_time');
        window.location.href = '/login?reason=idle_timeout';
      }
    };

    // Events to track user activity
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Check on focus / tab visibility change (e.g. when user switches tabs or wakes computer)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkInactivity);

    // Periodic check every 10 seconds
    const intervalId = setInterval(checkInactivity, 10000);

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkInactivity);
      clearInterval(intervalId);
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

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setCoordinator(null);
      setError(null);
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