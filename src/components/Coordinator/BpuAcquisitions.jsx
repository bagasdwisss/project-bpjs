// src/components/Coordinator/BpuAcquisitions.jsx
import React, { useState, useEffect, useContext } from 'react';
import Layout from '../Layout/Layout';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { TableSkeleton } from '../Common/Skeleton';
import NeoSelect from '../Common/NeoSelect';
import { 
  Users, Search, RefreshCw, Eye, CheckCircle2, 
  Clock, ShieldAlert, FileText, ExternalLink, X, 
  Check, Phone, IdCard, Briefcase, DollarSign, Shield
} from 'lucide-react';
import { maskNIK, maskPhone } from '../../utils/pdpMasking';

const BpuAcquisitions = () => {
  const { user } = useContext(AuthContext);
  const { toast, confirm } = useToast();

  const [loading, setLoading] = useState(true);
  const [acquisitions, setAcquisitions] = useState([]);
  const [stats, setStats] = useState({ total: 0, paid: 0, pending: 0, revenue: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIntern, setSelectedIntern] = useState('all');
  const [internList, setInternList] = useState([]);

  // Detail Modal State
  const [selectedItem, setSelectedItem] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);

  const fetchAcquisitions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/coordinator/acquisitions');
      if (res.data?.success) {
        const data = res.data.data || [];
        setAcquisitions(data);
        if (res.data.statistics) {
          setStats(res.data.statistics);
        }

        // Extract unique interns
        const interns = [];
        const seen = new Set();
        data.forEach((item) => {
          if (item.user_id && !seen.has(item.user_id)) {
            seen.add(item.user_id);
            interns.push({
              id: item.user_id,
              name: item.intern_name || `Peserta #${item.user_id}`,
              nim: item.intern_nim || '-'
            });
          }
        });
        setInternList(interns);
      }
    } catch (err) {
      console.error('Error fetching coordinator acquisitions:', err);
      toast.error('Gagal memuat data akuisisi BPJSTK BPU.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcquisitions();
  }, []);

  const handleVerifyPayment = async (item) => {
    const ok = await confirm({
      title: 'Verifikasi Pembayaran BPU',
      message: `Konfirmasi bahwa calon peserta BPU "${item.nama_peserta}" telah melunasi iuran pertama?`,
      confirmText: 'Ya, Konfirmasi Lunas',
      cancelText: 'Batal',
      type: 'warning'
    });
    if (!ok) return;

    setVerifyingId(item.peserta_id);
    try {
      const res = await api.put(`/coordinator/acquisitions/${item.peserta_id}/verify`, {
        status_pendaftaran: 'PEMBAYARAN BERHASIL'
      });
      if (res.data?.success) {
        toast.success(`Pembayaran untuk ${item.nama_peserta} berhasil diverifikasi.`);
        if (selectedItem?.peserta_id === item.peserta_id) {
          setSelectedItem(prev => ({ ...prev, status_pendaftaran: 'PEMBAYARAN BERHASIL' }));
        }
        fetchAcquisitions();
      } else {
        toast.error(res.data?.message || 'Gagal memverifikasi pembayaran.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setVerifyingId(null);
    }
  };

  const formatIDR = (num) => {
    const val = parseFloat(num) || 0;
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  // Filter Data
  const filteredData = acquisitions.filter((item) => {
    const matchesSearch = 
      (item.nama_peserta || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.nik || '').includes(searchTerm) ||
      (item.no_telepon || '').includes(searchTerm) ||
      (item.intern_name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || item.status_pendaftaran === statusFilter;
    const matchesIntern = selectedIntern === 'all' || String(item.user_id) === String(selectedIntern);

    return matchesSearch && matchesStatus && matchesIntern;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PEMBAYARAN BERHASIL':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#B8C96E] text-[#121214] border-2 border-[#121214] rounded-full text-[10px] font-black shadow-[2px_2px_0px_#121214]">
            <CheckCircle2 className="w-3 h-3" />
            LUNAS
          </span>
        );
      case 'MENUNGGU PEMBAYARAN':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#FCE373] text-[#121214] border-2 border-[#121214] rounded-full text-[10px] font-black shadow-[2px_2px_0px_#121214]">
            <Clock className="w-3 h-3" />
            MENUNGGU
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#F5C6EC] text-[#121214] border-2 border-[#121214] rounded-full text-[10px] font-black shadow-[2px_2px_0px_#121214]">
            <ShieldAlert className="w-3 h-3" />
            BARU DAFTAR
          </span>
        );
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#121214] tracking-tight">
              Akuisisi Peserta BPJSTK BPU
            </h1>
            <p className="text-xs sm:text-sm text-[#6E6D6A] mt-1 font-medium">
              Pemantauan dan verifikasi data calon peserta Bukan Penerima Upah yang diakuisisi peserta magang bimbingan Anda
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchAcquisitions}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-[#121214] rounded-full text-xs font-black text-[#121214] hover:bg-[#FAF9F6] shadow-[2px_2px_0px_#121214] transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Segarkan Data
            </button>
          </div>
        </div>

        {/* 4 Bento Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-3xl bg-[#FCE373] border-2 border-[#121214] p-5 shadow-[4px_4px_0px_#121214] flex flex-col justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#121214]/70">Total Akuisisi BPU</span>
            <div className="text-3xl font-black text-[#121214] my-1">{stats.total}</div>
            <span className="text-[11px] font-bold text-[#121214]/70">Calon Peserta Terdaftar</span>
          </div>

          <div className="rounded-3xl bg-[#B8C96E] border-2 border-[#121214] p-5 shadow-[4px_4px_0px_#121214] flex flex-col justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#121214]/70">Iuran Lunas</span>
            <div className="text-3xl font-black text-[#121214] my-1">{stats.paid}</div>
            <span className="text-[11px] font-bold text-[#121214]/70">Pembayaran Terverifikasi</span>
          </div>

          <div className="rounded-3xl bg-[#F5C6EC] border-2 border-[#121214] p-5 shadow-[4px_4px_0px_#121214] flex flex-col justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#121214]/70">Menunggu Pembayaran</span>
            <div className="text-3xl font-black text-[#121214] my-1">{stats.pending}</div>
            <span className="text-[11px] font-bold text-[#121214]/70">Perlu Tindak Lanjut</span>
          </div>

          <div className="rounded-3xl bg-[#BDD4F2] border-2 border-[#121214] p-5 shadow-[4px_4px_0px_#121214] flex flex-col justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#121214]/70">Estimasi Iuran Masuk</span>
            <div className="text-2xl font-black text-[#121214] my-1 truncate">{formatIDR(stats.revenue)}</div>
            <span className="text-[11px] font-bold text-[#121214]/70">Penerimaan BPJSTK</span>
          </div>
        </div>

        {/* Filters Bento Card */}
        <div className="bg-white rounded-3xl border-2 border-[#121214] p-4 sm:p-5 shadow-[4px_4px_0px_#121214]">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
            <div className="md:col-span-5">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#121214] mb-1.5">
                Cari Peserta BPU / Anak Didik
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#121214]/60" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ketik nama, NIK, no telepon, atau nama anak didik..."
                  className="w-full bg-[#FAF9F6] border-2 border-[#121214] rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-[#121214] shadow-[3px_3px_0px_#121214] focus:outline-none focus:bg-white"
                />
              </div>
            </div>

            <div className="md:col-span-4">
              <NeoSelect
                label="Filter Anak Didik"
                value={selectedIntern}
                onChange={(e) => setSelectedIntern(e.target.value)}
                options={[
                  { value: 'all', label: 'Semua Anak Didik' },
                  ...internList.map(i => ({ value: String(i.id), label: `${i.name} (${i.nim})` }))
                ]}
              />
            </div>

            <div className="md:col-span-3">
              <NeoSelect
                label="Status Pembayaran"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'Semua Status' },
                  { value: 'PEMBAYARAN BERHASIL', label: 'Lunas (Berhasil)' },
                  { value: 'MENUNGGU PEMBAYARAN', label: 'Menunggu Pembayaran' },
                  { value: 'BARU DAFTAR', label: 'Baru Daftar' }
                ]}
              />
            </div>
          </div>
        </div>

        {/* Table List */}
        <div className="bg-white rounded-3xl border-2 border-[#121214] shadow-[5px_5px_0px_#121214] overflow-hidden">
          {loading ? (
            <div className="p-6">
              <TableSkeleton rows={5} columns={6} />
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Users className="w-12 h-12 text-[#121214]/30 mx-auto mb-3" />
              <h3 className="text-base font-black text-[#121214]">Tidak Ada Data Akuisisi BPU</h3>
              <p className="text-xs text-[#6E6D6A] mt-1 max-w-sm mx-auto">
                {searchTerm || statusFilter !== 'all' || selectedIntern !== 'all'
                  ? 'Tidak ada data akuisisi yang cocok dengan kriteria pencarian.'
                  : 'Peserta magang bimbingan Anda belum mendaftarkan calon peserta BPU.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y-2 divide-[#121214] text-xs">
                <thead className="bg-[#FAF9F6]">
                  <tr>
                    <th className="px-5 py-4 text-left font-black uppercase tracking-wider text-[#121214]">Calon Peserta BPU</th>
                    <th className="px-5 py-4 text-left font-black uppercase tracking-wider text-[#121214]">Program BPJSTK</th>
                    <th className="px-5 py-4 text-left font-black uppercase tracking-wider text-[#121214]">Iuran</th>
                    <th className="px-5 py-4 text-left font-black uppercase tracking-wider text-[#121214]">Diakuisisi Oleh</th>
                    <th className="px-5 py-4 text-left font-black uppercase tracking-wider text-[#121214]">Status</th>
                    <th className="px-5 py-4 text-center font-black uppercase tracking-wider text-[#121214]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE9E4] bg-white font-medium">
                  {filteredData.map((item) => (
                    <tr key={item.peserta_id} className="hover:bg-[#FAF9F6]/80 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-black text-sm text-[#121214]">{item.nama_peserta || 'Tanpa Nama'}</div>
                        <div className="text-[11px] text-[#6E6D6A] mt-0.5 space-x-2">
                          <span>NIK: <strong className="text-[#121214] font-mono">{maskNIK(item.nik)}</strong></span>
                          <span>•</span>
                          <span>HP: <span className="font-mono">{maskPhone(item.no_telepon)}</span></span>
                        </div>
                        {item.pekerjaan && (
                          <div className="text-[10px] text-[#121214]/70 font-semibold mt-0.5">
                            Profesi: {item.pekerjaan}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-bold text-[#121214] block">
                          {item.program_terdaftar || 'JKK + JKM (BPU)'}
                        </span>
                        <span className="text-[11px] text-[#6E6D6A]">
                          Periode: {item.periode_pelatihan || '1 Bulan'}
                        </span>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-black text-[#121214]">
                          {formatIDR(item.biaya)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-bold text-[#121214]">{item.intern_name || 'Peserta Magang'}</div>
                        <div className="text-[10px] text-[#6E6D6A]">NIM: {item.intern_nim || '-'}</div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        {getStatusBadge(item.status_pendaftaran)}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedItem(item)}
                            className="p-2 rounded-xl bg-white border-2 border-[#121214] hover:bg-[#FAF9F6] text-[#121214] shadow-[2px_2px_0px_#121214] transition-all"
                            title="Lihat Detail Lengkap"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {item.status_pendaftaran !== 'PEMBAYARAN BERHASIL' && (
                            <button
                              type="button"
                              onClick={() => handleVerifyPayment(item)}
                              disabled={verifyingId === item.peserta_id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#B8C96E] hover:bg-[#a6b85c] border-2 border-[#121214] rounded-xl text-[11px] font-black text-[#121214] shadow-[2px_2px_0px_#121214] transition-all disabled:opacity-50"
                              title="Konfirmasi Pembayaran Lunas"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Lunas
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {selectedItem && (
          <div className="fixed inset-0 bg-[#121214]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white rounded-[28px] border-2 border-[#121214] p-6 sm:p-7 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[6px_6px_0px_#121214]">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusBadge(selectedItem.status_pendaftaran)}
                    <span className="text-[11px] font-bold text-[#6E6D6A]">
                      ID #{selectedItem.peserta_id}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-[#121214] tracking-tight">
                    {selectedItem.nama_peserta}
                  </h3>
                  <p className="text-xs text-[#6E6D6A] mt-0.5">
                    Calon Peserta BPJSTK Bukan Penerima Upah (BPU)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="w-8 h-8 rounded-full bg-[#FAF9F6] border border-[#EAE9E4] hover:bg-[#EAE9E4] flex items-center justify-center text-[#121214] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Detail Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-[#FAF9F6] rounded-2xl border-2 border-[#121214]">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#6E6D6A] mb-1">Nomor Induk Kependudukan (NIK)</p>
                  <p className="font-bold text-sm text-[#121214] font-mono">{selectedItem.nik || '-'}</p>
                </div>

                <div className="p-3.5 bg-[#FAF9F6] rounded-2xl border-2 border-[#121214]">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#6E6D6A] mb-1">Nomor Telepon / WhatsApp</p>
                  <p className="font-bold text-sm text-[#121214]">{selectedItem.no_telepon || '-'}</p>
                </div>

                <div className="p-3.5 bg-[#FAF9F6] rounded-2xl border-2 border-[#121214]">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#6E6D6A] mb-1">Profesi / Sektor Pekerjaan</p>
                  <p className="font-bold text-sm text-[#121214]">{selectedItem.pekerjaan || 'Pekerja Mandiri / Sektor Informal'}</p>
                </div>

                <div className="p-3.5 bg-[#FAF9F6] rounded-2xl border-2 border-[#121214]">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#6E6D6A] mb-1">Besaran Iuran BPJSTK</p>
                  <p className="font-black text-sm text-[#121214]">{formatIDR(selectedItem.biaya)}</p>
                </div>

                <div className="p-3.5 bg-[#FAF9F6] rounded-2xl border-2 border-[#121214]">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#6E6D6A] mb-1">Program Perlindungan</p>
                  <p className="font-bold text-xs text-[#121214]">{selectedItem.program_terdaftar || 'JKK + JKM (Wajib BPU)'}</p>
                </div>

                <div className="p-3.5 bg-[#FAF9F6] rounded-2xl border-2 border-[#121214]">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#6E6D6A] mb-1">Tanggal Pendaftaran</p>
                  <p className="font-bold text-xs text-[#121214]">
                    {selectedItem.tanggal_pendaftaran 
                      ? new Date(selectedItem.tanggal_pendaftaran).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                      : '-'}
                  </p>
                </div>
              </div>

              {/* Intern Information Box */}
              <div className="mt-4 p-4 bg-[#BDD4F2]/30 rounded-2xl border-2 border-[#121214]">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#121214]/70 mb-1">
                  Data Anak Didik yang Melakukan Akuisisi
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="font-black text-sm text-[#121214]">{selectedItem.intern_name || 'Peserta Magang'}</p>
                    <p className="text-xs text-[#6E6D6A]">NIM: {selectedItem.intern_nim || '-'} • Penempatan: {selectedItem.penempatan || 'Kantor Cabang'}</p>
                  </div>
                </div>
              </div>

              {/* Bukti Dokumen Preview */}
              <div className="mt-4 space-y-3">
                <p className="text-xs font-black uppercase tracking-wider text-[#121214]">
                  Bukti Pembayaran & Sosialisasi Lapangan
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-white rounded-2xl border-2 border-[#121214] flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#121214]">Bukti Pembayaran Iuran</p>
                      <p className="text-[11px] text-[#6E6D6A]">
                        {selectedItem.bukti_pembayaran_link ? 'File terlampir' : 'Belum diunggah'}
                      </p>
                    </div>
                    {selectedItem.bukti_pembayaran_link && (
                      <a
                        href={selectedItem.bukti_pembayaran_link}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-[#FAF9F6] border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] hover:bg-[#EAE9E4] inline-flex items-center gap-1 shadow-[2px_2px_0px_#121214]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Buka
                      </a>
                    )}
                  </div>

                  <div className="p-3.5 bg-white rounded-2xl border-2 border-[#121214] flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#121214]">Foto Bukti Sosialisasi</p>
                      <p className="text-[11px] text-[#6E6D6A]">
                        {selectedItem.bukti_sosialisasi_link ? 'Foto terlampir' : 'Belum diunggah'}
                      </p>
                    </div>
                    {selectedItem.bukti_sosialisasi_link && (
                      <a
                        href={selectedItem.bukti_sosialisasi_link}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-[#FAF9F6] border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] hover:bg-[#EAE9E4] inline-flex items-center gap-1 shadow-[2px_2px_0px_#121214]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Buka
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-[#F0EFEA] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {selectedItem.status_pendaftaran !== 'PEMBAYARAN BERHASIL' && (
                  <button
                    type="button"
                    onClick={() => handleVerifyPayment(selectedItem)}
                    disabled={verifyingId === selectedItem.peserta_id}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#B8C96E] hover:bg-[#a6b85c] border-2 border-[#121214] rounded-full text-xs font-black text-[#121214] shadow-[3px_3px_0px_#121214] transition-all disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    Konfirmasi Pembayaran Lunas
                  </button>
                )}
                <div className="ml-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-[#121214] text-white border-2 border-[#121214] rounded-full text-xs font-bold hover:bg-neutral-800 transition-all shadow-[2px_2px_0px_#121214]"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default BpuAcquisitions;
