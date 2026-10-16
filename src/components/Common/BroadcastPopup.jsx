import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Megaphone, 
  AlertTriangle, 
  AlertCircle, 
  X, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Calendar 
} from 'lucide-react';

const BroadcastPopup = () => {
  const { user } = useAuth();
  const isAdmin = user?.role_id === 3 || user?.role === 'Administrator' || (user?.role_name || '').toLowerCase().includes('admin');

  if (isAdmin) return null;

  const [broadcasts, setBroadcasts] = useState([]);
  const [activeModalBroadcast, setActiveModalBroadcast] = useState(null);
  const [activeToastBroadcasts, setActiveToastBroadcasts] = useState([]);

  const fetchActiveBroadcasts = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications/broadcasts/active', { skipCache: true });
      if (res.data?.success && Array.isArray(res.data.data)) {
        const list = res.data.data;
        
        // Filter out broadcasts already dismissed in this current browser session
        const sessionDismissed = JSON.parse(sessionStorage.getItem('dismissed_broadcasts') || '[]');
        const visibleBroadcasts = list.filter(b => !sessionDismissed.includes(b.broadcast_id));
        
        setBroadcasts(visibleBroadcasts);

        // Find modal broadcasts (Penting or Sangat Penting)
        const modalItem = visibleBroadcasts.find(
          b => b.priority === 'Sangat Penting' || b.priority === 'Penting'
        );
        setActiveModalBroadcast(modalItem || null);

        // Normal (Biasa) broadcasts shown as toasts
        const toastItems = visibleBroadcasts.filter(
          b => b.priority === 'Biasa' && (!modalItem || b.broadcast_id !== modalItem.broadcast_id)
        );
        setActiveToastBroadcasts(toastItems);
      }
    } catch (err) {
      console.warn('Could not fetch active broadcasts:', err.message);
    }
  };

  useEffect(() => {
    if (user) {
      fetchActiveBroadcasts();

      // Listen for immediate broadcast sent by admin in the same window
      const handleBroadcastEvent = () => {
        sessionStorage.removeItem('dismissed_broadcasts');
        fetchActiveBroadcasts();
      };

      const handlePreviewBroadcast = (e) => {
        const item = e.detail;
        if (!item) return;
        if (item.priority === 'Biasa') {
          setActiveToastBroadcasts(prev => [item, ...prev]);
        } else {
          setActiveModalBroadcast(item);
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

  const handleDismiss = async (broadcast) => {
    // 1. Record dismissal in sessionStorage for this session
    const sessionDismissed = JSON.parse(sessionStorage.getItem('dismissed_broadcasts') || '[]');
    if (!sessionDismissed.includes(broadcast.broadcast_id)) {
      sessionDismissed.push(broadcast.broadcast_id);
      sessionStorage.setItem('dismissed_broadcasts', JSON.stringify(sessionDismissed));
    }

    // 2. Remove from active state immediately
    if (activeModalBroadcast?.broadcast_id === broadcast.broadcast_id) {
      // If there was another modal in queue, pick the next one
      const remainingModals = broadcasts.filter(
        b => (b.priority === 'Sangat Penting' || b.priority === 'Penting') && 
             b.broadcast_id !== broadcast.broadcast_id &&
             !sessionDismissed.includes(b.broadcast_id)
      );
      setActiveModalBroadcast(remainingModals[0] || null);
    }

    setActiveToastBroadcasts(prev => prev.filter(t => t.broadcast_id !== broadcast.broadcast_id));
    setBroadcasts(prev => prev.filter(b => b.broadcast_id !== broadcast.broadcast_id));

    // 3. Inform backend so if show_on_login is false, it won't show again on future logins
    try {
      await api.post(`/notifications/broadcasts/${broadcast.broadcast_id}/dismiss`);
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
      {/* ======================================================== */}
      {/* 1. HIGH-PRIORITY CENTER MODAL (PENTING & SANGAT PENTING) */}
      {/* ======================================================== */}
      {activeModalBroadcast && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#121214]/65 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full max-w-lg bg-white rounded-[26px] border-2 border-[#121214] shadow-[8px_8px_0px_#121214] overflow-hidden transform animate-in zoom-in-95 duration-200 flex flex-col"
            role="alertdialog"
            aria-modal="true"
          >
            {/* Header Banner */}
            <div className={`p-5 sm:p-6 border-b-2 border-[#121214] ${
              activeModalBroadcast.priority === 'Sangat Penting'
                ? 'bg-[#F5C6EC] text-[#121214]'
                : 'bg-[#FCE373] text-[#121214]'
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#121214] text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                    {activeModalBroadcast.priority === 'Sangat Penting' ? (
                      <ShieldAlert className="w-5 h-5 text-[#F5C6EC]" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-[#FCE373]" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-[#121214] text-white px-2.5 py-0.5 rounded-full inline-block">
                      {activeModalBroadcast.priority === 'Sangat Penting' ? 'Darurat / Sangat Penting' : 'Pemberitahuan Penting'}
                    </span>
                    <h2 className="text-xs font-bold text-[#121214]/80 mt-0.5">BPJSTK</h2>
                  </div>
                </div>

                <button
                  onClick={() => handleDismiss(activeModalBroadcast)}
                  className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-[#121214] border border-[#121214] flex items-center justify-center transition"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-[#121214] mt-3.5 tracking-tight leading-snug">
                {activeModalBroadcast.title}
              </h1>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-4 max-h-[55vh] overflow-y-auto">
              <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-[#EAE9E4] text-[#121214] text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-line">
                {activeModalBroadcast.content}
              </div>

              {/* Meta details */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#121214]/60 font-medium pt-1">
                {activeModalBroadcast.start_at && (
                  <span className="inline-flex items-center gap-1.5 bg-[#FAF9F6] px-2.5 py-1 rounded-full border border-[#EAE9E4]">
                    <Clock className="w-3.5 h-3.5 text-[#121214]" />
                    Mulai: {formatDate(activeModalBroadcast.start_at)}
                  </span>
                )}
                {activeModalBroadcast.end_at && (
                  <span className="inline-flex items-center gap-1.5 bg-[#FAF9F6] px-2.5 py-1 rounded-full border border-[#EAE9E4]">
                    <Calendar className="w-3.5 h-3.5 text-rose-600" />
                    Berakhir: {formatDate(activeModalBroadcast.end_at)}
                  </span>
                )}
              </div>
            </div>

            {/* Footer Action */}
            <div className="p-5 sm:p-6 bg-[#FAF9F6] border-t-2 border-[#121214] flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => handleDismiss(activeModalBroadcast)}
                className="w-full sm:w-auto px-7 py-3 rounded-full bg-[#121214] hover:bg-black text-white font-bold text-xs sm:text-sm transition-all shadow-[3px_3px_0px_#8A8985] hover:shadow-none inline-flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-[#B8C96E]" />
                Saya Sudah Membaca & Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. NORMAL TOAST POPUPS (PRIORITAS BIASA) - TOP RIGHT     */}
      {/* ======================================================== */}
      {activeToastBroadcasts.length > 0 && (
        <div className="fixed top-5 right-5 z-[9990] flex flex-col gap-3 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0">
          {activeToastBroadcasts.map((toast) => (
            <div
              key={toast.broadcast_id}
              className="pointer-events-auto bg-white rounded-2xl border-2 border-[#121214] shadow-[4px_4px_0px_#121214] p-4 transition-all duration-300 animate-in slide-in-from-top-4 relative overflow-hidden"
            >
              {/* Top Accent Strip */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#B8C96E] border-b border-[#121214]"></div>

              <div className="flex items-start justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#B8C96E]/40 text-[#3C4A11] border border-[#B8C96E] flex items-center justify-center shrink-0">
                    <Megaphone className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#121214]/60">
                      Pengumuman
                    </span>
                    <h3 className="text-xs sm:text-sm font-extrabold text-[#121214] line-clamp-1">
                      {toast.title}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => handleDismiss(toast)}
                  className="p-1 rounded-full text-[#121214]/60 hover:text-[#121214] hover:bg-[#FAF9F6] transition"
                  aria-label="Tutup notifikasi"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[#121214]/80 mt-2 font-medium line-clamp-3 leading-relaxed">
                {toast.content}
              </p>

              <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#EAE9E4] text-[10px] text-[#121214]/50 font-medium">
                <span>{new Date(toast.sent_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                <button
                  onClick={() => handleDismiss(toast)}
                  className="text-[#121214] font-bold hover:underline"
                >
                  Tutup
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
