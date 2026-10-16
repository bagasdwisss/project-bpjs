// src/components/Admin/Broadcast.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import api from '../../services/api';
import { Send, Bell, CheckCircle, AlertCircle, Users, Clock } from 'lucide-react';

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
        setHistory(res.data.data);
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
        setAlertMsg({ type: 'success', text: res.data.message });
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

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Broadcast Pengumuman</h1>
          <p className="text-sm text-gray-500 mt-1">Kirim pesan dan notifikasi massal ke seluruh peserta atau koordinator</p>
        </div>

        {alertMsg && (
          <div className={`p-4 rounded-xl flex items-center gap-2 text-sm font-medium ${
            alertMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {alertMsg.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
            <span>{alertMsg.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Send Broadcast Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" /> Tulis Pengumuman Baru
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Judul Pengumuman</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Jadwal Evaluasi Lapangan Minggu ke-4"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Target Penerima</label>
                  <select
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="all">Semua Pengguna (Peserta & Koordinator)</option>
                    <option value="participants">Hanya Peserta Magang</option>
                    <option value="coordinators">Hanya Koordinator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tingkat Prioritas</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Biasa">Biasa</option>
                    <option value="Penting">Penting</option>
                    <option value="Sangat Penting">Sangat Penting</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Isi Pesan Broadcast</label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tuliskan instruksi atau pengumuman secara lengkap di sini..."
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
              >
                <Send className="w-4 h-4" /> {loading ? 'Mengirim Broadcast...' : 'Kirim Broadcast Sekarang'}
              </button>
            </form>
          </div>

          {/* Broadcast History Summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" /> Riwayat Broadcast Terakhir
            </h3>
            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">Belum ada riwayat pengiriman.</p>
              ) : (
                history.map((item) => (
                  <div key={item.broadcast_id} className="p-3.5 bg-gray-50 rounded-xl space-y-1.5 border border-gray-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-900">{item.title}</span>
                      <span className="text-gray-400">{new Date(item.sent_at).toLocaleDateString('id-ID')}</span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{item.content}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                        Target: {item.target_role || 'Semua'}
                      </span>
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