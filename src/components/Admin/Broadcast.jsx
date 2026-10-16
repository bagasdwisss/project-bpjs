// src/components/Admin/Broadcast.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import api from '../../services/api';
import { 
  Send, 
  Megaphone, 
  CheckCircle, 
  AlertCircle, 
  Users, 
  Clock,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

const Broadcast = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all');
  const [priority, setPriority] = useState('Biasa');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [alertMsg, setAlertMsg] = useState(null);

  const loadHistory = async () => {
    try {
      const res = await api.get('/notifications/admin/broadcast/history');
      if (res.data.success) {
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
        target
      });

      if (res.data.success) {
        setAlertMsg({ type: 'success', text: res.data.message || 'Broadcast berhasil dikirim ke seluruh penerima!' });
        setTitle('');
        setMessage('');
        loadHistory();
      }
    } catch (err) {
      setAlertMsg({ type: 'error', text: 'Gagal mengirim broadcast: ' + err.message });
    } finally {
      setLoading(false);
      setTimeout(() => setAlertMsg(null), 5000);
    }
  };

  const getPriorityBadge = (p) => {
    if (p === 'Sangat Penting') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F5C6EC]/40 text-[#8B2471] border border-[#F5C6EC]">
          Sangat Penting
        </span>
      );
    }
    if (p === 'Penting') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FCE373]/50 text-[#856B12] border border-[#FCE373]">
          Penting
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#B8C96E]/30 text-[#3C4A11] border border-[#B8C96E]">
        Biasa
      </span>
    );
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* Header Bento Box */}
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#F5C6EC]/40 text-[#8B2471]">
                <Megaphone className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#121214]/60">Komunikasi Massal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121214] tracking-tight">Broadcast Pengumuman</h1>
            <p className="text-sm text-[#121214]/60 mt-1">Kirim pesan siaran langsung dan notifikasi serentak ke seluruh peserta atau koordinator sistem BPJS</p>
          </div>
        </div>

        {/* Status Message */}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Send Broadcast Form */}
          <div className="lg:col-span-2 bg-white rounded-[22px] border border-[#EAE9E4] shadow-sm p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#EAE9E4]">
              <span className="w-2 h-2 rounded-full bg-[#121214]"></span>
              <h2 className="text-base font-bold text-[#121214]">Tulis Pengumuman Baru</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#121214] mb-1.5">Judul Pengumuman</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Jadwal Evaluasi Lapangan Minggu ke-4"
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
                  <label className="block text-xs font-bold text-[#121214] mb-1.5">Tingkat Prioritas</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs sm:text-sm font-medium text-[#121214] focus:outline-none focus:bg-white focus:border-[#121214] transition cursor-pointer"
                  >
                    <option value="Biasa">Biasa (Normal)</option>
                    <option value="Penting">Penting (Highlight)</option>
                    <option value="Sangat Penting">Sangat Penting (Urgent Alert)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121214] mb-1.5">Isi Pesan Broadcast</label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tuliskan instruksi atau pengumuman secara lengkap dan jelas di sini..."
                  className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs sm:text-sm font-medium text-[#121214] placeholder-[#121214]/40 focus:outline-none focus:bg-white focus:border-[#121214] transition"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3 bg-[#121214] hover:bg-black disabled:opacity-50 text-white rounded-full text-xs font-bold transition-all shadow-sm inline-flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  {loading ? 'Mengirim Broadcast...' : 'Kirim Broadcast Sekarang'}
                </button>
              </div>
            </form>
          </div>

          {/* Broadcast History Summary */}
          <div className="bg-white rounded-[22px] border border-[#EAE9E4] shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE9E4]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#121214]"></span>
                <h3 className="font-bold text-[#121214] text-sm sm:text-base">Riwayat Broadcast</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FAF9F6] border border-[#EAE9E4] text-[#121214]/70">
                {history.length}
              </span>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {history.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-10 h-10 rounded-full bg-[#FAF9F6] border border-[#EAE9E4] flex items-center justify-center mx-auto mb-2 text-[#121214]/40">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-[#121214]/50">Belum ada riwayat pengiriman.</p>
                </div>
              ) : (
                history.map((item) => (
                  <div key={item.broadcast_id} className="p-4 bg-[#FAF9F6] rounded-2xl space-y-2 border border-[#EAE9E4] hover:bg-white transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-xs text-[#121214] line-clamp-1">{item.title}</span>
                      {getPriorityBadge(item.priority)}
                    </div>
                    <p className="text-[11px] text-[#121214]/70 line-clamp-2 font-medium">{item.content}</p>
                    <div className="flex items-center justify-between pt-1 text-[10px] text-[#121214]/50 font-medium">
                      <span>Target: <strong className="text-[#121214]">{item.target_role || 'Semua'}</strong></span>
                      <span>{new Date(item.sent_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
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