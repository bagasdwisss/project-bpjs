// src/components/Admin/Broadcast.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { 
  Send, 
  Megaphone, 
  CheckCircle, 
  AlertCircle, 
  Users, 
  Clock, 
  Calendar,
  Sparkles, 
  AlertTriangle,
  Trash2,
  Repeat,
  Info,
  Eye
} from 'lucide-react';
import NeoDatePicker from '../Common/NeoDatePicker';
import NeoSelect from '../Common/NeoSelect';

const formatLocalDatetime = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
};

const Broadcast = () => {
  const { toast, confirm } = useToast();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all');
  const [priority, setPriority] = useState('Biasa');
  const [displayMode, setDisplayMode] = useState('toast');
  
  // Schedule and persistence states
  const now = new Date();
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [startType, setStartType] = useState('immediate'); // 'immediate' | 'custom'
  const [endType, setEndType] = useState('7d'); // '7d' | '30d' | 'never' | 'custom'
  const [startAt, setStartAt] = useState(formatLocalDatetime(now));
  const [endAt, setEndAt] = useState(formatLocalDatetime(nextWeek));
  const [showOnLogin, setShowOnLogin] = useState(true);

  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [alertMsg, setAlertMsg] = useState(null);

  const loadHistory = async () => {
    try {
      const res = await api.get('/notifications/admin/broadcast/history');
      if (res.data?.success) {
        setHistory(res.data.data || []);
      }
    } catch (err) {
      console.error('Error loading broadcast history:', err);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || !title.trim()) return;

    if (startType === 'custom' && endType === 'custom' && startAt && endAt) {
      if (new Date(endAt) <= new Date(startAt)) {
        toast.error('Batas akhir tayang harus lebih besar dari waktu mulai tayang!');
        return;
      }
    }

    setLoading(true);
    setAlertMsg(null);
    try {
      const payloadStartAt = startType === 'immediate' ? null : (startAt ? new Date(startAt).toISOString() : null);
      
      const payloadEndAt = endType === 'never' 
        ? null 
        : endType === '7d' 
        ? new Date(Date.now() + 7 * 86400000).toISOString()
        : endType === '30d'
        ? new Date(Date.now() + 30 * 86400000).toISOString()
        : (endAt ? new Date(endAt).toISOString() : null);

      const res = await api.post('/notifications/admin/broadcast/send', {
        title,
        message,
        priority,
        target,
        display_mode: displayMode,
        start_at: payloadStartAt,
        end_at: payloadEndAt,
        show_on_login: showOnLogin
      });

      if (res.data?.success) {
        toast.success(res.data.message || 'Broadcast berhasil dikirim ke seluruh penerima!');
        setAlertMsg({ 
          type: 'success', 
          text: res.data.message || 'Broadcast berhasil dikirim ke seluruh penerima sasaran!' 
        });
        setTitle('');
        setMessage('');
        loadHistory();

        // Clear cache and trigger immediate popup
        if (api.clearCache) api.clearCache();
        sessionStorage.removeItem('dismissed_broadcasts');
        window.dispatchEvent(new CustomEvent('broadcast-sent', { detail: res.data.data }));
      }
    } catch (err) {
      toast.error('Gagal mengirim broadcast: ' + (err.response?.data?.message || err.message));
      setAlertMsg({ type: 'error', text: 'Gagal mengirim broadcast: ' + (err.response?.data?.message || err.message) });
    } finally {
      setLoading(false);
      setTimeout(() => setAlertMsg(null), 6000);
    }
  };

  const handleDeleteBroadcast = async (broadcastId, e) => {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Hapus Siaran Pengumuman',
      message: 'Apakah Anda yakin ingin menghapus siaran pengumuman ini? Pop-up tidak akan ditampilkan lagi ke pengguna.',
      confirmText: 'Ya, Hapus Siaran',
      cancelText: 'Batal',
      type: 'danger'
    });
    if (!ok) return;

    try {
      const res = await api.delete(`/notifications/admin/broadcast/${broadcastId}`);
      if (res.data?.success) {
        setAlertMsg({ type: 'success', text: 'Pesan siaran pengumuman berhasil dihapus.' });
        setHistory(prev => prev.filter(item => item.broadcast_id !== broadcastId));
      }
    } catch (err) {
      setAlertMsg({ type: 'error', text: 'Gagal menghapus broadcast: ' + (err.response?.data?.message || err.message) });
    } finally {
      setTimeout(() => setAlertMsg(null), 5000);
    }
  };

  const getPriorityBadge = (p) => {
    if (p === 'Sangat Penting') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#F5C6EC] text-[#BE185D] border border-[#121214] shadow-[1px_1px_0px_#121214]">
          Sangat Penting (Tengah 3s)
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#BDD4F2] text-[#1E3A8A] border border-[#121214] shadow-[1px_1px_0px_#121214]">
        Biasa (Pojok Kanan)
      </span>
    );
  };

  const getStatusBadge = (item) => {
    const nowTime = new Date();
    const start = item.start_at ? new Date(item.start_at) : null;
    const end = item.end_at ? new Date(item.end_at) : null;

    if (end && nowTime > end) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#EAE9E4] text-[#6E6D6A]">
          Berakhir
        </span>
      );
    }
    if (start && nowTime < start) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#BDD4F2]/50 text-[#1E3A8A]">
          Terjadwal
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#B8C96E]/40 text-[#3C4A11]">
        ● Aktif Tayang
      </span>
    );
  };

  return (
    <Layout>
      <div className="space-y-6 w-full">
        
        {/* Header Bento Box */}
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#F5C6EC]/40 text-[#8B2471]">
                <Megaphone className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#121214]/60">Komunikasi Terpadu</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121214] tracking-tight">Broadcast Pengumuman & Pop-up</h1>
            <p className="text-sm text-[#121214]/60 mt-1">
              Atur siaran pengumuman instan dengan toast pop-up pojok kanan atau dialog peringatan tengah layar untuk seluruh pengguna BPJSTK.
            </p>
          </div>
        </div>

        {/* Status Alert Message */}
        {alertMsg && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-bold ${
            alertMsg.type === 'success' 
              ? 'bg-[#B8C96E]/20 text-[#3C4A11] border border-[#B8C96E]' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {alertMsg.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-[#627514] shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            )}
            <span>{alertMsg.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Send Broadcast Form (Left Side - 7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-[22px] border border-[#EAE9E4] shadow-sm p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE9E4]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#121214]"></span>
                <h2 className="text-base font-bold text-[#121214]">Buat Siaran Pengumuman Baru</h2>
              </div>
              <span className="text-xs font-semibold text-[#8A8985]">BPJSTK</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#121214] mb-1.5">Judul Pengumuman</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Pengingat Batas Akhir Input Akuisisi BPU Bulan Ini"
                  className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs sm:text-sm font-medium text-[#121214] placeholder-[#121214]/40 focus:outline-none focus:bg-white focus:border-[#121214] transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <NeoSelect
                  label="Target Penerima"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  options={[
                    { value: 'all', label: 'Semua Pengguna' },
                    { value: 'participants', label: 'Hanya Peserta Magang' },
                    { value: 'coordinators', label: 'Hanya Koordinator' }
                  ]}
                />

                <NeoSelect
                  label="Tingkat Prioritas Siaran"
                  value={priority}
                  onChange={(e) => {
                    setPriority(e.target.value);
                    setDisplayMode(e.target.value === 'Sangat Penting' ? 'modal' : 'toast');
                  }}
                  options={[
                    { value: 'Biasa', label: 'Biasa (Toast Standar Pojok Kanan)' },
                    { value: 'Sangat Penting', label: 'Sangat Penting (Toast Besar Tengah Layar - Auto Tutup 3 Detik)' }
                  ]}
                />
              </div>

              {/* Schedule Duration (Start At & End At) */}
              <div className="p-4 bg-[#FAF9F6] rounded-2xl border-2 border-[#121214] shadow-[3px_3px_0px_#121214] space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#121214]" />
                    <span className="text-xs font-bold text-[#121214]">Waktu Mulai Tayang</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setStartType('immediate')}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold border transition ${
                        startType === 'immediate'
                          ? 'bg-[#B8C96E] text-[#121214] border-[#121214] shadow-xs'
                          : 'bg-white text-[#121214]/60 border-[#EAE9E4] hover:border-[#121214]'
                      }`}
                    >
                      ✓ Langsung Sekarang
                    </button>
                    <button
                      type="button"
                      onClick={() => setStartType('custom')}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold border transition ${
                        startType === 'custom'
                          ? 'bg-[#121214] text-white border-[#121214]'
                          : 'bg-white text-[#121214]/60 border-[#EAE9E4] hover:border-[#121214]'
                      }`}
                    >
                      Pilih Tanggal
                    </button>
                  </div>
                </div>

                {startType === 'custom' && (
                  <div>
                    <NeoDatePicker
                      label="Mulai Ditampilkan Pada"
                      type="datetime-local"
                      required={startType === 'custom'}
                      value={startAt}
                      onChange={(e) => setStartAt(e.target.value)}
                    />
                  </div>
                )}

                {/* End Duration Options */}
                <div className="pt-2 border-t border-[#EAE9E4] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#121214]">Batas Akhir Penayangan</span>
                    <div className="flex flex-wrap items-center gap-1">
                      {[
                        { id: '7d', label: '7 Hari' },
                        { id: '30d', label: '30 Hari' },
                        { id: 'never', label: 'Selamanya' },
                        { id: 'custom', label: 'Kustom' }
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setEndType(p.id)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition ${
                            endType === p.id
                              ? 'bg-[#121214] text-white border-[#121214]'
                              : 'bg-white text-[#121214]/60 border-[#EAE9E4] hover:border-[#121214]'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {endType === 'custom' && (
                    <div>
                      <NeoDatePicker
                        label="Berakhir Pada"
                        type="datetime-local"
                        required={endType === 'custom'}
                        value={endAt}
                        onChange={(e) => setEndAt(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* Show on login option toggle */}
                <div className="pt-2 border-t border-[#EAE9E4] flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="show_on_login"
                    checked={showOnLogin}
                    onChange={(e) => setShowOnLogin(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-2 border-[#121214] text-[#121214] focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="show_on_login" className="text-xs cursor-pointer select-none">
                    <span className="font-bold text-[#121214] block">
                      Muncul Terus-Menerus Setiap Kali Login
                    </span>
                    <span className="text-[11px] text-[#121214]/60 font-medium">
                      Jika dicentang, pop-up akan otomatis tampil kembali setiap pengguna login selama periode siaran masih berlaku.
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121214] mb-1.5">Isi Pesan Broadcast</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tuliskan instruksi operasional, tenggat waktu penugasan, atau pengumuman secara rinci..."
                  className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs sm:text-sm font-medium text-[#121214] placeholder-[#121214]/40 focus:outline-none focus:bg-white focus:border-[#121214] transition"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-7 py-3 bg-[#121214] hover:bg-black disabled:opacity-50 text-white rounded-full text-xs font-bold transition-all shadow-[3px_3px_0px_#8A8985] hover:shadow-none inline-flex items-center justify-center gap-2 active:scale-95"
                >
                  <Send className="w-3.5 h-3.5 text-[#B8C96E]" />
                  {loading ? 'Mengirim Siaran...' : 'Kirim Siaran Sekarang'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!title.trim() && !message.trim()) {
                      toast.warning('Tuliskan judul atau pesan terlebih dahulu untuk melihat preview');
                      return;
                    }
                    window.dispatchEvent(
                      new CustomEvent('preview-broadcast', {
                        detail: {
                          broadcast_id: 'preview-' + Date.now(),
                          title: title || 'Pengumuman Operasional BPJSTK',
                          content: message || 'Ini adalah contoh preview tampilan siaran broadcast sistem BPJSTK.',
                          priority,
                          display_mode: priority === 'Sangat Penting' ? 'center_toast' : 'toast',
                          sent_at: new Date().toISOString()
                        }
                      })
                    );
                  }}
                  className="w-full sm:w-auto px-5 py-3 bg-[#FAF9F6] hover:bg-white border-2 border-[#121214] text-[#121214] rounded-full text-xs font-bold transition-all shadow-[2px_2px_0px_#121214] active:scale-95 inline-flex items-center justify-center gap-2"
                >
                  <Eye className="w-3.5 h-3.5 text-[#121214]" />
                  <span>Preview ({priority === 'Sangat Penting' ? 'Toast Besar Tengah (Auto Tutup 3s)' : 'Toast Pojok Kanan'})</span>
                </button>
              </div>
            </form>
          </div>

          {/* Broadcast History List (Right Side - 5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-[22px] border border-[#EAE9E4] shadow-sm p-6 space-y-4 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE9E4]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#121214]"></span>
                <h3 className="font-bold text-[#121214] text-sm sm:text-base">Riwayat Broadcast</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FAF9F6] border border-[#EAE9E4] text-[#121214]/70">
                {history.length} Siaran
              </span>
            </div>

            <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1 flex-1">
              {history.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#FAF9F6] border border-[#EAE9E4] flex items-center justify-center mx-auto mb-2 text-[#121214]/40">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-[#121214]/60">Belum ada riwayat pengiriman siaran.</p>
                </div>
              ) : (
                history.map((item) => (
                  <div 
                    key={item.broadcast_id} 
                    className="p-4 bg-[#FAF9F6] rounded-2xl space-y-2.5 border border-[#EAE9E4] hover:bg-white hover:border-[#121214] transition-all relative group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 pr-2">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusBadge(item)}
                          {getPriorityBadge(item.priority)}
                        </div>
                        <h4 className="font-bold text-xs sm:text-sm text-[#121214] leading-snug line-clamp-1">
                          {item.title}
                        </h4>
                      </div>

                      {/* Working Delete Button */}
                      <button
                        onClick={(e) => handleDeleteBroadcast(item.broadcast_id, e)}
                        className="p-2 rounded-xl bg-white hover:bg-rose-50 text-[#121214]/50 hover:text-rose-600 border border-[#EAE9E4] hover:border-rose-300 transition shadow-sm shrink-0"
                        title="Hapus Broadcast Ini"
                        aria-label="Hapus Broadcast"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-[11px] text-[#121214]/75 line-clamp-2 font-medium leading-relaxed">
                      {item.content}
                    </p>

                    <div className="space-y-1 text-[10px] text-[#121214]/60 font-medium pt-1 border-t border-[#EAE9E4]/60">
                      <div className="flex items-center justify-between">
                        <span>Target: <strong className="text-[#121214]">{item.target_role === 'all' ? 'Semua Pengguna' : item.target_role === 'participants' ? 'Peserta Magang' : 'Koordinator'}</strong></span>
                        <span>{item.show_on_login ? 'Muncul Setiap Login' : '1x Tampil'}</span>
                      </div>
                      
                      {(item.start_at || item.end_at) && (
                        <div className="text-[9px] text-[#121214]/50 truncate">
                          Periode: {item.start_at ? new Date(item.start_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : 'Sekarang'} s/d {item.end_at ? new Date(item.end_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Seterusnya'}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default Broadcast;