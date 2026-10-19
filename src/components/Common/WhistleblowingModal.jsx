// src/components/Common/WhistleblowingModal.jsx - Pusat Konseling & Pengaduan Anonim Terisolasi
import React, { useState } from 'react';
import { Shield, EyeOff, Send, CheckCircle2, Copy, Search, AlertCircle, X, HelpCircle } from 'lucide-react';
import axios from 'axios';

export const WhistleblowingModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('submit'); // 'submit' | 'track'
  
  // Submit state
  const [category, setCategory] = useState('Kendala Bimbingan Lapangan');
  const [location, setLocation] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);
  const [copied, setCopied] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Track state
  const [trackCode, setTrackCode] = useState('');
  const [tracking, setTracking] = useState(false);
  const [trackedReport, setTrackedReport] = useState(null);
  const [trackError, setTrackError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);

    try {
      const res = await axios.post('/api/whistleblowing/submit', {
        category,
        location_or_unit: location,
        subject,
        description
      });

      if (res.data?.success) {
        setSubmittedTicket(res.data.data.ticket_code);
        setSubject('');
        setDescription('');
        setLocation('');
      } else {
        setSubmitError(res.data?.message || 'Gagal mengirimkan pengaduan.');
      }
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Terjadi kesalahan koneksi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrack = async (e) => {
    e.preventDefault();
    setTrackError('');
    setTrackedReport(null);
    if (!trackCode.trim()) return;

    setTracking(true);
    try {
      const res = await axios.get(`/api/whistleblowing/status/${encodeURIComponent(trackCode.trim())}`);
      if (res.data?.success) {
        setTrackedReport(res.data.data);
      } else {
        setTrackError(res.data?.message || 'Kode tiket tidak ditemukan.');
      }
    } catch (err) {
      setTrackError(err.response?.data?.message || 'Kode tiket pengaduan tidak ditemukan.');
    } finally {
      setTracking(false);
    }
  };

  const copyTicket = () => {
    if (submittedTicket) {
      navigator.clipboard.writeText(submittedTicket);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SELESAI':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-[#B8C96E] text-[#121214] border border-[#121214]">SELESAI</span>;
      case 'DITINDAKLANJUTI':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-[#FCE373] text-[#121214] border border-[#121214]">SEDANG DITINDAKLANJUTI</span>;
      case 'DALAM_PENELAAHAN':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-[#BDD4F2] text-[#121214] border border-[#121214]">DALAM PENELAAHAN</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-[#FAF9F6] text-[#121214] border border-[#121214]">TERKIRIM</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border-2 border-[#121214] rounded-[24px] shadow-[6px_6px_0px_#121214] max-w-xl w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full border-2 border-[#121214] bg-[#FAF9F6] hover:bg-[#F5C6EC] flex items-center justify-center transition"
        >
          <X className="w-4 h-4 text-[#121214]" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#BDD4F2] border-2 border-[#121214] flex items-center justify-center shadow-[2px_2px_0px_#121214]">
            <Shield className="w-5 h-5 text-[#121214]" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-[#121214]">Pusat Konseling & Pengaduan Rahasia</h2>
            <p className="text-xs text-[#121214]/60 font-semibold flex items-center gap-1.5 mt-0.5">
              <EyeOff className="w-3.5 h-3.5 text-[#121214]/80" /> Identitas Anda 100% anonim dan terlindungi
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-2 border-[#121214] rounded-xl p-1 bg-[#FAF9F6] mb-5 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('submit')}
            className={`flex-1 py-2 text-xs font-black rounded-lg transition ${
              activeTab === 'submit' ? 'bg-[#121214] text-white shadow-sm' : 'text-[#121214]/70 hover:text-[#121214]'
            }`}
          >
            Kirim Pengaduan Baru
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('track')}
            className={`flex-1 py-2 text-xs font-black rounded-lg transition ${
              activeTab === 'track' ? 'bg-[#121214] text-white shadow-sm' : 'text-[#121214]/70 hover:text-[#121214]'
            }`}
          >
            Pantau Status Tiket
          </button>
        </div>

        {/* TAB 1: SUBMIT */}
        {activeTab === 'submit' && (
          <div>
            {submittedTicket ? (
              <div className="bg-[#B8C96E]/30 border-2 border-[#121214] rounded-2xl p-6 text-center shadow-[4px_4px_0px_#121214] space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#B8C96E] border-2 border-[#121214] flex items-center justify-center mx-auto text-[#121214]">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#121214]">Pengaduan Berhasil Terkirim!</h3>
                  <p className="text-xs text-[#121214]/70 mt-1">
                    Laporan Anda telah diteruskan langsung ke Tim Kepatuhan BPJSTK secara anonim tanpa mencatat akun Anda.
                  </p>
                </div>

                <div className="bg-white border-2 border-[#121214] rounded-xl p-3 flex items-center justify-between gap-2 max-w-xs mx-auto">
                  <span className="font-mono font-black text-sm text-[#121214] tracking-wider">{submittedTicket}</span>
                  <button
                    onClick={copyTicket}
                    className="p-1.5 rounded-lg border border-[#121214] bg-[#FCE373] hover:bg-[#F5C6EC] text-xs font-bold transition flex items-center gap-1"
                  >
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#121214]/60 font-semibold">
                  ⚠️ Simpan kode tiket di atas untuk memeriksa tanggapan dan perkembangan laporan Anda.
                </p>

                <button
                  type="button"
                  onClick={() => setSubmittedTicket(null)}
                  className="px-4 py-2 bg-[#121214] text-white rounded-xl text-xs font-bold"
                >
                  Kirim Laporan Lain
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {submitError && (
                  <div className="p-3 bg-[#F5C6EC]/50 border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black uppercase text-[#121214]/70 mb-1">Kategori Pengaduan</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full text-xs font-bold bg-[#FAF9F6] border-2 border-[#121214] rounded-xl p-2.5 focus:outline-none"
                    >
                      <option value="Kendala Bimbingan Lapangan">Kendala Bimbingan Lapangan</option>
                      <option value="Pelecehan / Etika Kerja">Pelecehan / Etika Kerja</option>
                      <option value="Ketidakadilan Penilaian">Ketidakadilan Penilaian</option>
                      <option value="Beban Kerja Tidak Sesuai SOP">Beban Kerja Tidak Sesuai SOP</option>
                      <option value="Lainnya">Lainnya / Konseling Pribadi</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase text-[#121214]/70 mb-1">Unit / Lokasi Kejadian</label>
                    <input
                      type="text"
                      placeholder="Contoh: Kantor Cabang / Lapangan Pasar X"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full text-xs font-medium bg-[#FAF9F6] border-2 border-[#121214] rounded-xl p-2.5 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-[#121214]/70 mb-1">Perihal / Judul Singkat</label>
                  <input
                    type="text"
                    required
                    placeholder="Tuliskan pokok persoalan secara ringkas"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full text-xs font-medium bg-[#FAF9F6] border-2 border-[#121214] rounded-xl p-2.5 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-[#121214]/70 mb-1">Penjelasan Detail</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Ceritakan kejadian atau kendala yang dialami secara objektif..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full text-xs font-medium bg-[#FAF9F6] border-2 border-[#121214] rounded-xl p-2.5 focus:outline-none"
                  />
                </div>

                <div className="bg-[#FCE373]/30 border border-[#121214] rounded-xl p-3 text-[11px] text-[#121214]/80 flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-[#121214] shrink-0 mt-0.5" />
                  <span>
                    Jaminan Keamanan: Sistem ini menerapkan <em>Blind Ticketing</em>. Alamat IP, identitas akun, dan nama Anda tidak akan pernah ditampilkan kepada pihak mana pun.
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl border-2 border-[#121214] text-xs font-bold hover:bg-[#FAF9F6]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 bg-[#121214] hover:bg-black text-white rounded-xl text-xs font-bold border-2 border-[#121214] shadow-[3px_3px_0px_#121214] transition inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Mengirimkan...' : 'Kirim Pengaduan Rahasia'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: TRACK */}
        {activeTab === 'track' && (
          <div className="space-y-4">
            <form onSubmit={handleTrack} className="flex gap-2">
              <input
                type="text"
                placeholder="Masukkan Kode Tiket (WB-2026-XXXX)"
                value={trackCode}
                onChange={(e) => setTrackCode(e.target.value)}
                className="flex-1 text-xs font-mono font-bold uppercase bg-[#FAF9F6] border-2 border-[#121214] rounded-xl p-2.5 focus:outline-none"
              />
              <button
                type="submit"
                disabled={tracking}
                className="px-4 py-2.5 bg-[#121214] text-white rounded-xl text-xs font-bold border-2 border-[#121214] shadow-[2px_2px_0px_#121214] transition inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{tracking ? 'Mencari...' : 'Periksa'}</span>
              </button>
            </form>

            {trackError && (
              <div className="p-3 bg-[#F5C6EC]/50 border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{trackError}</span>
              </div>
            )}

            {trackedReport && (
              <div className="bg-[#FAF9F6] border-2 border-[#121214] rounded-2xl p-4 shadow-[3px_3px_0px_#121214] space-y-3">
                <div className="flex items-center justify-between border-b border-[#EAE9E4] pb-2">
                  <span className="font-mono font-bold text-xs text-[#121214]">{trackedReport.ticket_code}</span>
                  {getStatusBadge(trackedReport.status)}
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase text-[#121214]/60">Kategori: {trackedReport.category}</h4>
                  <p className="text-sm font-black text-[#121214] mt-0.5">{trackedReport.subject}</p>
                </div>

                <div className="bg-white border border-[#EAE9E4] rounded-xl p-3">
                  <h5 className="text-[11px] font-black uppercase text-[#121214]/70 mb-1">Tanggapan Tim Kepatuhan:</h5>
                  <p className="text-xs text-[#121214] whitespace-pre-wrap leading-relaxed">
                    {trackedReport.admin_response || 'Laporan Anda telah diterima dan saat ini sedang dalam penelaahan oleh Tim Kepatuhan BPJSTK. Kami akan memberikan tindak lanjut segera.'}
                  </p>
                </div>

                <p className="text-[10px] text-[#121214]/50 text-right">
                  Dikirim pada: {new Date(trackedReport.created_at).toLocaleString('id-ID')}
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default WhistleblowingModal;
