import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Megaphone, 
  X, 
  Clock, 
  ShieldAlert, 
  Calendar,
  Sparkles
} from 'lucide-react';

const AUTO_CLOSE_MS = 3000; // 3 seconds strictly

const BroadcastPopup = () => {
  const { user } = useAuth();

  const [urgentBroadcast, setUrgentBroadcast] = useState(null);
  const [urgentQueue, setUrgentQueue] = useState([]);
  const [timeLeftMs, setTimeLeftMs] = useState(AUTO_CLOSE_MS);
  const [activeToastBroadcasts, setActiveToastBroadcasts] = useState([]);

  // Ref to track current urgentBroadcast to avoid stale state in timer
  const urgentRef = useRef(null);
  urgentRef.current = urgentBroadcast;

  const getSessionDismissed = () => {
    try {
      const data = JSON.parse(sessionStorage.getItem('dismissed_broadcasts') || '[]');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  };

  const fetchActiveBroadcasts = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications/broadcasts/active', { skipCache: true });
      if (res.data?.success && Array.isArray(res.data.data)) {
        const list = res.data.data;
        
        // Filter out broadcasts already dismissed in this current browser session
        const sessionDismissed = getSessionDismissed();
        const visibleBroadcasts = list.filter(b => !sessionDismissed.includes(b.broadcast_id));
        
        // 1. Separate "Sangat Penting" vs "Biasa"
        const urgentItems = visibleBroadcasts.filter(b => b.priority === 'Sangat Penting');
        const biasaItems = visibleBroadcasts.filter(b => b.priority !== 'Sangat Penting');

        // Manage urgent queue
        if (urgentItems.length > 0) {
          if (!urgentRef.current) {
            setUrgentBroadcast(urgentItems[0]);
            setTimeLeftMs(AUTO_CLOSE_MS);
            setUrgentQueue(urgentItems.slice(1));
          } else {
            // Keep queue updated
            setUrgentQueue(urgentItems.filter(b => b.broadcast_id !== urgentRef.current.broadcast_id));
          }
        }

        // Manage standard top-right toast list for "Biasa"
        setActiveToastBroadcasts(biasaItems);
      }
    } catch (err) {
      console.warn('Could not fetch active broadcasts:', err.message);
    }
  };

  useEffect(() => {
    if (user) {
      fetchActiveBroadcasts();

      const handleBroadcastEvent = () => {
        sessionStorage.removeItem('dismissed_broadcasts');
        fetchActiveBroadcasts();
      };

      const handlePreviewBroadcast = (e) => {
        const item = e.detail;
        if (!item) return;

        if (item.priority === 'Sangat Penting') {
          setUrgentBroadcast(item);
          setTimeLeftMs(AUTO_CLOSE_MS);
        } else {
          setActiveToastBroadcasts(prev => [item, ...prev.filter(t => t.broadcast_id !== item.broadcast_id)]);
        }
      };

      window.addEventListener('broadcast-sent', handleBroadcastEvent);
      window.addEventListener('preview-broadcast', handlePreviewBroadcast);
      window.addEventListener('focus', fetchActiveBroadcasts);
      
      const interval = setInterval(fetchActiveBroadcasts, 20000);
      return () => {
        window.removeEventListener('broadcast-sent', handleBroadcastEvent);
        window.removeEventListener('preview-broadcast', handlePreviewBroadcast);
        window.removeEventListener('focus', fetchActiveBroadcasts);
        clearInterval(interval);
      };
    }
  }, [user]);

  // Handle strictly 3-second auto-close countdown for "Sangat Penting"
  useEffect(() => {
    if (!urgentBroadcast) return;

    setTimeLeftMs(AUTO_CLOSE_MS);
    const step = 50; // update every 50ms for smooth progress bar

    const timer = setInterval(() => {
      setTimeLeftMs(prev => {
        if (prev <= step) {
          clearInterval(timer);
          // Dismiss the urgent broadcast once 3 seconds have passed
          handleDismissUrgent(urgentBroadcast);
          return 0;
        }
        return prev - step;
      });
    }, step);

    return () => clearInterval(timer);
  }, [urgentBroadcast?.broadcast_id]);

  const handleDismissUrgent = async (broadcast) => {
    if (!broadcast) return;

    // Record dismissal in sessionStorage
    const sessionDismissed = getSessionDismissed();
    if (!sessionDismissed.includes(broadcast.broadcast_id)) {
      sessionDismissed.push(broadcast.broadcast_id);
      sessionStorage.setItem('dismissed_broadcasts', JSON.stringify(sessionDismissed));
    }

    // Advance queue
    if (urgentQueue.length > 0) {
      const nextUrgent = urgentQueue[0];
      setUrgentBroadcast(nextUrgent);
      setTimeLeftMs(AUTO_CLOSE_MS);
      setUrgentQueue(prev => prev.slice(1));
    } else {
      setUrgentBroadcast(null);
    }

    // Backend dismissal recording
    try {
      if (broadcast.broadcast_id && !String(broadcast.broadcast_id).startsWith('preview-')) {
        await api.post(`/notifications/broadcasts/${broadcast.broadcast_id}/dismiss`);
      }
    } catch (err) {
      console.error('Error logging broadcast dismissal:', err);
    }
  };

  const handleDismissBiasa = async (broadcast) => {
    if (!broadcast) return;

    const sessionDismissed = getSessionDismissed();
    if (!sessionDismissed.includes(broadcast.broadcast_id)) {
      sessionDismissed.push(broadcast.broadcast_id);
      sessionStorage.setItem('dismissed_broadcasts', JSON.stringify(sessionDismissed));
    }

    setActiveToastBroadcasts(prev => prev.filter(t => t.broadcast_id !== broadcast.broadcast_id));

    try {
      if (broadcast.broadcast_id && !String(broadcast.broadcast_id).startsWith('preview-')) {
        await api.post(`/notifications/broadcasts/${broadcast.broadcast_id}/dismiss`);
      }
    } catch (err) {
      console.error('Error logging broadcast dismissal:', err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. SANGAT PENTING: TOAST BESAR BENAR-BENAR DI TENGAH HALAMAN              */}
      {/*    HANYA BISA TERTUTUP OTOMATIS SETELAH 3 DETIK (TIDAK ADA TOMBOL TUTUP)  */}
      {/* ========================================================================= */}
      {urgentBroadcast && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-xs pointer-events-none animate-in fade-in duration-150"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="pointer-events-auto w-full max-w-lg bg-white rounded-[28px] border-3 border-[#121214] shadow-[10px_10px_0px_#121214] overflow-hidden p-6 sm:p-7 text-center transform animate-in zoom-in-95 duration-200 relative select-none">
            
            {/* Top Accent Strip */}
            <div className="absolute top-0 left-0 right-0 h-3 bg-[#BE185D] border-b-2 border-[#121214]"></div>

            {/* Smooth 3-Second Shrinking Progress Bar */}
            <div className="w-full h-2 bg-gray-100 rounded-full border border-[#121214] overflow-hidden mt-2 mb-4">
              <div 
                className="h-full bg-gradient-to-r from-[#BE185D] via-[#F5C6EC] to-[#BE185D] transition-all duration-75 ease-linear"
                style={{ width: `${Math.max(0, (timeLeftMs / AUTO_CLOSE_MS) * 100)}%` }}
              />
            </div>

            {/* Warning Shield & Pulsing Indicator */}
            <div className="relative inline-block mx-auto mb-2.5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#F5C6EC] border-3 border-[#121214] shadow-[4px_4px_0px_#121214] flex items-center justify-center text-[#BE185D] mx-auto">
                <ShieldAlert className="w-9 h-9 sm:w-11 sm:h-11 animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 border border-white"></span>
              </span>
            </div>

            {/* Badge Priority */}
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#BE185D] text-white border-2 border-[#121214] shadow-[2px_2px_0px_#121214]">
                <Sparkles className="w-3.5 h-3.5" />
                PENGUMUMAN SANGAT PENTING
              </span>
            </div>

            {/* Broadcast Title */}
            <h2 className="text-xl sm:text-2xl font-black text-[#121214] tracking-tight leading-snug mt-3">
              {urgentBroadcast.title}
            </h2>

            {/* Broadcast Content Body */}
            <div className="mt-3.5 bg-[#FAF9F6] border-2 border-[#121214] rounded-2xl p-4 sm:p-5 text-xs sm:text-sm font-bold text-[#121214] text-left leading-relaxed shadow-[2px_2px_0px_#121214] max-h-56 overflow-y-auto whitespace-pre-line">
              {urgentBroadcast.content}
            </div>

            {/* Meta Timestamp if available */}
            {(urgentBroadcast.start_at || urgentBroadcast.end_at) && (
              <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] text-[#121214]/70 font-black mt-3">
                {urgentBroadcast.start_at && (
                  <span className="inline-flex items-center gap-1 bg-[#FAF9F6] px-2.5 py-1 rounded-full border border-[#121214]">
                    <Clock className="w-3 h-3 text-[#121214]" />
                    Mulai: {formatDate(urgentBroadcast.start_at)}
                  </span>
                )}
                {urgentBroadcast.end_at && (
                  <span className="inline-flex items-center gap-1 bg-[#FAF9F6] px-2.5 py-1 rounded-full border border-[#121214]">
                    <Calendar className="w-3 h-3 text-rose-600" />
                    Batas: {formatDate(urgentBroadcast.end_at)}
                  </span>
                )}
              </div>
            )}

            {/* Auto-Close Status Indicator (NO MANUAL CLOSE BUTTON) */}
            <div className="mt-4 pt-3.5 border-t-2 border-[#121214]/15 flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#BE185D]" />
                Hanya tertutup otomatis setelah 3 detik
              </span>

              <span className="px-3.5 py-1 rounded-full text-xs font-black bg-[#121214] text-[#FCE373] border-2 border-[#121214] shadow-[2px_2px_0px_#8A8985] inline-flex items-center gap-1">
                ⏱ {Math.max(1, Math.ceil(timeLeftMs / 1000))}s
              </span>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BIASA: TOAST STANDAR POJOK KANAN ATAS                                  */}
      {/*    TETAP SEPERTI BIASA DENGAN TOMBOL TUTUP DAN MENGERTI                   */}
      {/* ========================================================================= */}
      {activeToastBroadcasts.length > 0 && (
        <div className="fixed top-4 right-3 sm:right-5 sm:top-5 z-[9990] flex flex-col gap-3 sm:max-w-md w-auto sm:w-full pointer-events-none">
          {activeToastBroadcasts.map((toast) => (
            <div
              key={toast.broadcast_id}
              className="pointer-events-auto bg-white rounded-2xl border-2 border-[#121214] shadow-[4px_4px_0px_#121214] p-4 transition-all duration-300 animate-in slide-in-from-top-4 relative overflow-hidden"
            >
              {/* Top Accent Strip for Biasa */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-[#BDD4F2] border-b-2 border-[#121214]"></div>

              <div className="flex items-start justify-between gap-3 pt-1.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-[#BDD4F2] border-2 border-[#121214] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#121214] text-[#1E3A8A]">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block border border-[#121214] bg-[#BDD4F2] text-[#1E3A8A] mb-0.5">
                      INFORMASI BIASA
                    </span>
                    <h3 className="text-xs sm:text-sm font-black text-[#121214] line-clamp-1">
                      {toast.title}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => handleDismissBiasa(toast)}
                  className="p-1 rounded-lg text-[#121214] hover:bg-black/10 transition shrink-0"
                  aria-label="Tutup notifikasi"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[#121214]/85 mt-2.5 font-medium line-clamp-3 leading-relaxed">
                {toast.content}
              </p>

              <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#121214]/20 text-[10px] text-[#121214]/60 font-bold">
                <span>{new Date(toast.sent_at || Date.now()).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                <button
                  onClick={() => handleDismissBiasa(toast)}
                  className="text-[#121214] font-black hover:underline px-2.5 py-0.5 bg-white border border-[#121214] rounded-lg shadow-[1px_1px_0px_#121214] active:scale-95 transition"
                >
                  Mengerti
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default BroadcastPopup;
