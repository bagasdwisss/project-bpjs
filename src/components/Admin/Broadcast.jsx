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
  Info
} from 'lucide-react';

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
  
  // Schedule and persistence states
  const now = new Date();
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
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

    setLoading(true);
    setAlertMsg(null);
    try {
      const res = await api.post('/notifications/admin/broadcast/send', {
        title,
        message,
        priority,
        target,
        start_at: startAt ? new Date(startAt).toISOString() : null,
        end_at: endAt ? new Date(endAt).toISOString() : null,
        show_on_login: showOnLogin
      });

      if (res.data?.success) {
        setAlertMsg({ 
          type: 'success', 
          text: res.data.message || 'Broadcast berhasil dikirim ke seluruh penerima sasaran!' 
        });
        setTitle('');
        setMessage('');
        loadHistory();
      }
    } catch (err) {
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
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#F5C6EC] text-[#8B2471] border border-[#121214] shadow-[1px_1px_0px_#121214]">
          ⚡ Sangat Penting (Tengah)
        </span>
      );
    }
    if (p === 'Penting') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FCE373] text-[#856B12] border border-[#121214] shadow-[1px_1px_0px_#121214]">
          ⭐ Penting (Tengah)
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#B8C96E] text-[#3C4A11] border border-[#121214] shadow-[1px_1px_0px_#121214]">
        📌 Biasa (Pojok Kanan)
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
              Atur siaran pengumuman instan dengan toast pop-up pojok kanan atau dialog peringatan tengah layar untuk seluruh pengguna BPJS Ketenagakerjaan.
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
              <span className="text-xs font-semibold text-[#8A8985]">BPJS Ketenagakerjaan</span>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#121214] mb-1.5">Target Penerima</label>
                  <select
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs sm:text-sm font-medium text-[#121214] focus:outline-none focus:bg-white focus:border-[#121214] transition cursor-pointer"
                  >
                    <option value="all">Semua Pengguna (Peserta & Koordinator)</option>
                    <option value="participants">Hanya Peserta Magang</option>
                    <option value="coordinators">Hanya Koordinator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#121214] mb-1.5">Tingkat Prioritas & Tampilan</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs sm:text-sm font-medium text-[#121214] focus:outline-none focus:bg-white focus:border-[#121214] transition cursor-pointer"
                  >
                    <option value="Biasa">Biasa ➔ Pop-up Toast Pojok Kanan Atas</option>
                    <option value="Penting">Penting ➔ Dialog Modal Tengah Halaman</option>
                    <option value="Sangat Penting">Sangat Penting ➔ Urgent Modal Tengah Layar</option>
                  </select>
                </div>
              </div>

              {/* Schedule Duration (Start At & End At) */}
              <div className="p-4 bg-[#FAF9F6] rounded-2xl border border-[#EAE9E4] space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#121214]" />
                  <span className="text-xs font-bold text-[#121214]">Durasi Waktu Pop-up Ditampilkan</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#121214]/70 mb-1">Mulai Tampil</label>
                    <input
                      type="datetime-local"
                      required
                      value={startAt}
                      onChange={(e) => setStartAt(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#EAE9E4] rounded-xl text-xs font-semibold text-[#121214] focus:outline-none focus:border-[#121214]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#121214]/70 mb-1">Selesai Tampil (Batas Akhir)</label>
                    <input
                      type="datetime-local"
                      required
                      value={endAt}
                      onChange={(e) => setEndAt(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#EAE9E4] rounded-xl text-xs font-semibold text-[#121214] focus:outline-none focus:border-[#121214]"
                    />
                  </div>
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
                      Jika dicentang, pop-up akan selalu muncul setiap kali peserta dan koordinator login selama rentang durasi di atas masih aktif. Jika tidak dicentang, hanya akan muncul 1 kali hingga ditutup pengguna.
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121214] mb-1.5">Isi Pesan Broadcast</label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tuliskan instruksi operasional, tenggat waktu penugasan, atau pengumuman secara rinci..."
                  className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs sm:text-sm font-medium text-[#121214] placeholder-[#121214]/40 focus:outline-none focus:bg-white focus:border-[#121214] transition"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3 bg-[#121214] hover:bg-black disabled:opacity-50 text-white rounded-full text-xs font-bold transition-all shadow-[3px_3px_0px_#8A8985] hover:shadow-none inline-flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5 text-[#B8C96E]" />
                  {loading ? 'Mengirim Siaran...' : 'Kirim Siaran Sekarang'}
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
                        <span>{item.show_on_login ? '🔄 Muncul Setiap Login' : '1x Tampil'}</span>
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