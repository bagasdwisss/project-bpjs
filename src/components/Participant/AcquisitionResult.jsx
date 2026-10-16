import React, { useState, useEffect, useContext } from 'react';
import { Table, Search, Download, Eye, AlertCircle, Upload, CheckCircle, Plus, Edit, XCircle } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import Layout from '../Layout/Layout';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { TableSkeleton } from '../Common/Skeleton';

// Komponen Toast Berwarna Sistem Intelly Soft Neo-Brutalism
const Toast = ({ message, type = 'info', onClose, duration = 4000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const getColorConfig = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-[#B8C96E] text-[#121214]',
          icon: <CheckCircle className="w-4 h-4 text-[#121214] shrink-0" />,
          badge: 'Berhasil'
        };
      case 'error':
        return {
          bg: 'bg-[#F5C6EC] text-[#121214]',
          icon: <XCircle className="w-4 h-4 text-[#121214] shrink-0" />,
          badge: 'Pemberitahuan'
        };
      case 'warning':
        return {
          bg: 'bg-[#FCE373] text-[#121214]',
          icon: <AlertCircle className="w-4 h-4 text-[#121214] shrink-0" />,
          badge: 'Perhatian'
        };
      case 'info':
      default:
        return {
          bg: 'bg-[#BDD4F2] text-[#121214]',
          icon: <AlertCircle className="w-4 h-4 text-[#121214] shrink-0" />,
          badge: 'Informasi'
        };
    }
  };

  const { bg, icon, badge } = getColorConfig();

  return (
    <div className="fixed top-5 right-5 z-[9999] animate-in slide-in-from-top-3 duration-200">
      <div className={`${bg} px-4 py-3 rounded-2xl border-2 border-[#121214] shadow-[4px_4px_0px_#121214] flex items-start justify-between gap-3 min-w-[280px] max-w-sm sm:max-w-md`}>
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-[#121214] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-[1px_1px_0px_#121214]">
            {icon}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#121214]/70 block">
              {badge}
            </span>
            <p className="text-xs font-black text-[#121214] leading-snug break-words">
              {message}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-black/10 active:scale-95 transition-all text-[#121214] shrink-0 mt-0.5"
          aria-label="Tutup notifikasi"
        >
          <XCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const AcquisitionResult = () => {
  const { confirm } = useToast();
  const [acquisitionData, setAcquisitionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState(null); // 'payment' or 'socialization'
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    nama_peserta: '',
    program_terdaftar: '',
    nik: '',
    tanggal_pendaftaran: '',
    no_telepon: '',
    pekerjaan: '',
    email: '',
    status_pendaftaran: 'BARU DAFTAR',
    periode_pelatihan: '1bulan',
    biaya: ''
  });
  const [paymentProofFile, setPaymentProofFile] = useState(null);
  const [socializationProofFile, setSocializationProofFile] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const { user } = useContext(AuthContext);

  // State untuk toast
  const [toasts, setToasts] = useState([]);

  // Fungsi untuk menampilkan toast
  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  // Fungsi untuk menghapus toast
  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Format angka ke Rupiah dengan separator ribuan
  const formatRupiah = (angka) => {
    if (!angka && angka !== 0) return 'Rp 0';
    const num = typeof angka === 'string' ? parseFloat(angka) : angka;
    return `Rp ${num.toLocaleString('id-ID')}`;
  };

  // Handle input biaya dengan format
  const handleBiayaChange = (e) => {
    const { value } = e.target;
    // Hapus semua karakter non-digit
    const numericValue = value.replace(/\D/g, '');
    
    setFormData(prev => ({
      ...prev,
      biaya: numericValue
    }));

    // Clear error for this field when user types
    if (formErrors.biaya) {
      setFormErrors(prev => ({
        ...prev,
        biaya: ''
      }));
    }
  };

  // Ambil data acquisition dari API
  useEffect(() => {
    const fetchAcquisitionData = async () => {
      try {
        const response = await api.get('/participant/acquisition-result');

        if (response.data?.success) {
          setAcquisitionData(response.data.data || []);
        } else {
          console.error('Error fetching acquisition data:', response.data?.message);
          showToast(`Gagal mengambil data: ${response.data?.message || 'Error'}`, 'error');
        }
      } catch (error) {
        console.error('Error fetching acquisition data:', error);
        showToast(`Terjadi kesalahan saat mengambil data: ${error.response?.data?.message || error.message}`, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchAcquisitionData();
  }, [user]);

  const handleFileChange = (e) => {
    setUploadFile(e.target.files[0]);
  };

  const handleUploadProof = async () => {
    if (!uploadFile || !selectedItem) {
      showToast('Pilih file terlebih dahulu', 'warning');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    
    if (uploadType === 'payment') {
      formData.append('bukti_pembayaran', uploadFile);
    } else if (uploadType === 'socialization') {
      formData.append('bukti_sosialisasi', uploadFile);
    }

    try {
      const endpoint = uploadType === 'payment' 
        ? `/participant/acquisition-result/${selectedItem.peserta_id}/upload-payment-proof`
        : `/participant/acquisition-result/${selectedItem.peserta_id}/upload-socialization-proof`;

      const response = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data?.success) {
        // Update data lokal
        setAcquisitionData(prev => prev.map(item => 
          item.peserta_id === selectedItem.peserta_id 
            ? { 
                ...item, 
                [uploadType === 'payment' ? 'bukti_pembayaran_link' : 'bukti_sosialisasi_link']: 
                response.data.data[uploadType === 'payment' ? 'bukti_pembayaran_link' : 'bukti_sosialisasi_link'] 
              }
            : item
        ));
        
        showToast(`Bukti ${uploadType === 'payment' ? 'pembayaran' : 'sosialisasi'} berhasil diunggah!`, 'success');
        setShowUploadModal(false);
        setUploadFile(null);
      } else {
        showToast(`Gagal mengunggah bukti: ${response.data?.message}`, 'error');
      }
    } catch (error) {
      console.error('Error uploading proof:', error);
      showToast('Terjadi kesalahan saat mengunggah bukti', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmPayment = async (pesertaId) => {
    const ok = await confirm({
      title: 'Konfirmasi Pembayaran',
      message: 'Apakah Anda yakin pembayaran iuran BPJS peserta ini sudah selesai dan terverifikasi?',
      confirmText: 'Ya, Konfirmasi',
      cancelText: 'Batal',
      type: 'info'
    });
    if (!ok) return;

    try {
        const response = await api.put(`/participant/acquisition-result/${pesertaId}/confirm-payment`);

        if (response.data?.success) {
          // Update data lokal
          setAcquisitionData(prev => prev.map(item =>
            item.peserta_id === pesertaId
              ? { ...item, status_pendaftaran: 'PEMBAYARAN BERHASIL' }
              : item
          ));

          showToast('Pembayaran berhasil dikonfirmasi!', 'success');
        } else {
          showToast(`Gagal mengkonfirmasi pembayaran: ${response.data?.message}`, 'error');
        }
      } catch (error) {
        console.error('Error confirming payment:', error);
        showToast('Terjadi kesalahan saat mengkonfirmasi pembayaran', 'error');
      }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Jika field biaya, gunakan handler khusus
    if (name === 'biaya') {
      handleBiayaChange(e);
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field when user types
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.nama_peserta.trim()) {
      errors.nama_peserta = 'Nama peserta harus diisi';
    }

    if (!formData.nik.trim()) {
      errors.nik = 'NIK harus diisi';
    } else if (formData.nik.length < 16) {
      errors.nik = 'NIK harus terdiri dari minimal 16 digit';
    }

    if (!formData.tanggal_pendaftaran) {
      errors.tanggal_pendaftaran = 'Tanggal pendaftaran harus diisi';
    }

    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      errors.email = 'Format email tidak valid';
    }

    if (formData.no_telepon && !/^\d{10,15}$/.test(formData.no_telepon)) {
      errors.no_telepon = 'Nomor telepon harus berupa angka 10-15 digit';
    }

    if (formData.biaya && isNaN(parseFloat(formData.biaya))) {
      errors.biaya = 'Biaya harus berupa angka';
    }

    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      showToast('Harap periksa kembali form yang diisi', 'warning');
    }
    
    return Object.keys(errors).length === 0;
  };

  const handlePaymentProofChange = (e) => {
    setPaymentProofFile(e.target.files[0]);
  };

  const handleSocializationProofChange = (e) => {
    setSocializationProofFile(e.target.files[0]);
  };

  const handleProgramChange = (e) => {
    const { name, checked } = e.target;

    setFormData(prev => {
      const currentPrograms = prev.program_terdaftar ? prev.program_terdaftar.split(',') : [];
      let newPrograms = [...currentPrograms];

      if (checked) {
        // Add the selected program if not already in the list
        if (!newPrograms.includes(name.toUpperCase())) {
          newPrograms.push(name.toUpperCase());
        }
      } else {
        // Remove the unselected program
        newPrograms = newPrograms.filter(program => program !== name.toUpperCase());
      }

      // Sort the programs for consistent ordering
      newPrograms.sort();

      // Enforce the specific combinations: either JKK,JKM or JKK,JKM,JHT
      const jkkPresent = newPrograms.includes('JKK');
      const jkmPresent = newPrograms.includes('JKM');
      const jhtPresent = newPrograms.includes('JHT');

      // If JKK and JKM are not selected together, reset to empty
      if (jkkPresent && jkmPresent) {
        // If JHT is also selected, we have JKK,JKM,JHT combination
        if (jhtPresent) {
          return { ...prev, program_terdaftar: 'JKK,JKM,JHT' };
        } else {
          // Only JKK,JKM combination
          return { ...prev, program_terdaftar: 'JKK,JKM' };
        }
      } else if (!jkkPresent && !jkmPresent && !jhtPresent) {
        // All unchecked
        return { ...prev, program_terdaftar: '' };
      } else {
        // Invalid combination - reset checkboxes to valid state
        // If JHT is selected alone or with JHT only, only allow valid combinations
        if (jhtPresent) {
          // If JHT is selected, we need both JKK and JKM for valid combination
          return { ...prev, program_terdaftar: 'JKK,JKM,JHT' };
        } else if (jkkPresent || jkmPresent) {
          // If only one of JKK or JKM is selected, make sure both are selected
          return { ...prev, program_terdaftar: 'JKK,JKM' };
        } else {
          return { ...prev, program_terdaftar: '' };
        }
      }
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const url = isEditMode
        ? `/participant/peserta/${selectedItem.peserta_id}`
        : '/participant/peserta';

      // Check if there are files to upload
      const hasFiles = paymentProofFile || socializationProofFile;

      let response;
      if (hasFiles) {
        // Use FormData for file uploads
        const formDataToSend = new FormData();

        // Add regular form data
        Object.keys(formData).forEach(key => {
          if (formData[key] !== undefined && formData[key] !== null) {
            if (key === 'biaya') {
              formDataToSend.append(key, parseFloat(formData[key]) || 0);
            } else {
              formDataToSend.append(key, formData[key]);
            }
          }
        });
        
        // Add user_id
        formDataToSend.append('user_id', user.user_id);

        // Add file data if present
        if (paymentProofFile) {
          formDataToSend.append('bukti_pembayaran', paymentProofFile);
        }
        if (socializationProofFile) {
          formDataToSend.append('bukti_sosialisasi', socializationProofFile);
        }

        response = await (isEditMode 
          ? api.put(url, formDataToSend, { headers: { 'Content-Type': 'multipart/form-data' } })
          : api.post(url, formDataToSend, { headers: { 'Content-Type': 'multipart/form-data' } }));
      } else {
        // Use regular JSON for non-file data
        const requestData = {
          ...formData,
          biaya: parseFloat(formData.biaya) || 0,
          user_id: user.user_id
        };

        response = await (isEditMode ? api.put(url, requestData) : api.post(url, requestData));
      }

      if (response.data?.success) {
        if (isEditMode) {
          // Update data lokal
          setAcquisitionData(prev => prev.map(item =>
            item.peserta_id === selectedItem.peserta_id
              ? { ...item, ...response.data.data }
              : item
          ));
          showToast('Data peserta berhasil diperbarui!', 'success');
        } else {
          // Tambahkan data baru ke awal array
          setAcquisitionData(prev => [response.data.data, ...prev]);
          showToast('Data peserta berhasil ditambahkan!', 'success');
        }

        setShowFormModal(false);
        resetForm();
      } else {
        showToast(`Gagal ${isEditMode ? 'memperbarui' : 'menambahkan'} data: ${response.data?.message}`, 'error');
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} data:`, error);
      showToast(`Terjadi kesalahan saat ${isEditMode ? 'memperbarui' : 'menambahkan'} data: ${error.response?.data?.message || error.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nama_peserta: '',
      program_terdaftar: '',
      nik: '',
      tanggal_pendaftaran: '',
      no_telepon: '',
      pekerjaan: '',
      email: '',
      status_pendaftaran: 'BARU DAFTAR',
      periode_pelatihan: '1bulan',
      biaya: ''
    });
    setPaymentProofFile(null);
    setSocializationProofFile(null);
    setFormErrors({});
    setIsEditMode(false);
    setSelectedItem(null);
  };

  const openAddForm = () => {
    resetForm();
    setIsEditMode(false);
    setShowFormModal(true);
  };

  const openEditForm = (item) => {
    setFormData({
      nama_peserta: item.nama_peserta || item.user?.full_name || '',
      program_terdaftar: item.program_terdaftar || '',
      nik: item.nik || '',
      tanggal_pendaftaran: item.tanggal_pendaftaran || '',
      no_telepon: item.no_telepon || '',
      pekerjaan: item.pekerjaan || '',
      email: item.email || '',
      status_pendaftaran: item.status_pendaftaran || 'BARU DAFTAR',
      periode_pelatihan: item.periode_pelatihan || '1bulan',
      biaya: item.biaya || ''
    });
    setPaymentProofFile(null);
    setSocializationProofFile(null);
    setSelectedItem(item);
    setIsEditMode(true);
    setShowFormModal(true);
  };

  // Filter data berdasarkan pencarian
  const safeData = Array.isArray(acquisitionData) ? acquisitionData : [];
  const filteredData = safeData.filter(item => {
    const searchString = (searchTerm || '').toLowerCase();
    return (
      (item?.nama_peserta && item.nama_peserta.toLowerCase().includes(searchString)) ||
      (item?.nik && item.nik.toLowerCase().includes(searchString)) ||
      (item?.email && item.email.toLowerCase().includes(searchString)) ||
      (item?.pekerjaan && item.pekerjaan.toLowerCase().includes(searchString)) ||
      (item?.no_telepon && item.no_telepon.includes(searchString))
    );
  });

  // Format program terdaftar untuk display
  const formatProgramTerdaftar = (programs) => {
    if (!programs) return '-';
    return programs.split(',').map(program => 
      program === 'JKK' ? 'JKK ' :
      program === 'JKM' ? 'JKM ' :
      program === 'JHT' ? 'JHT ' : program
    ).join('');
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121214] tracking-tight">
              Hasil Akuisisi Kepesertaan BPU
            </h1>
            <p className="text-xs sm:text-sm text-[#6E6D6A] mt-1">
              Catatan pendaftaran peserta BPU mandiri, verifikasi pembayaran, dan bukti sosialisasi lapangan.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openAddForm}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#121214] text-white rounded-full text-xs font-bold hover:bg-neutral-800 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Hasil Akuisisi
            </button>
          </div>
        </div>

        {/* 4-Card Pastel Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-[22px] bg-[#FCE373] text-[#121214] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Total Peserta BPU</p>
              <h3 className="text-3xl font-black mt-1 text-[#121214]">{acquisitionData.length}</h3>
              <p className="text-[10px] text-[#121214]/60 font-medium">Target magang: 20</p>
            </div>
            <div className="w-11 h-11 bg-[#121214] text-[#FCE373] rounded-[14px] flex items-center justify-center font-bold">
              <Table className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-[22px] bg-[#B8C96E] text-[#121214] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Terbayar / Aktif</p>
              <h3 className="text-3xl font-black mt-1 text-[#121214]">
                {safeData.filter(p => p.status_pendaftaran === 'PEMBAYARAN BERHASIL').length}
              </h3>
              <p className="text-[10px] text-[#121214]/60 font-medium">Iuran lunas</p>
            </div>
            <div className="w-11 h-11 bg-[#121214] text-[#B8C96E] rounded-[14px] flex items-center justify-center font-bold">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-[22px] bg-[#BDD4F2] text-[#121214] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Menunggu Bayar</p>
              <h3 className="text-3xl font-black mt-1 text-[#121214]">
                {safeData.filter(p => p.status_pendaftaran === 'MENUNGGU PEMBAYARAN').length}
              </h3>
              <p className="text-[10px] text-[#121214]/60 font-medium">Dalam proses</p>
            </div>
            <div className="w-11 h-11 bg-[#121214] text-[#BDD4F2] rounded-[14px] flex items-center justify-center font-bold">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-[22px] bg-[#F5C6EC] text-[#121214] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Baru Terdaftar</p>
              <h3 className="text-3xl font-black mt-1 text-[#121214]">
                {safeData.filter(p => p.status_pendaftaran === 'BARU DAFTAR').length}
              </h3>
              <p className="text-[10px] text-[#121214]/60 font-medium">Form sosialisasi</p>
            </div>
            <div className="w-11 h-11 bg-[#121214] text-[#F5C6EC] rounded-[14px] flex items-center justify-center font-bold">
              <Plus className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] p-3.5 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8985] w-4 h-4" />
            <input
              type="text"
              placeholder="Cari berdasarkan NIK, nama, atau email..."
              className="pl-9 pr-4 py-2 w-full bg-[#FAF9F6] border border-[#EAE9E4] rounded-full text-xs font-medium text-[#121214] placeholder-[#8A8985] focus:outline-none focus:ring-2 focus:ring-[#121214]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <button 
              className="flex items-center px-4 py-2 bg-white border border-[#EAE9E4] text-[#121214] rounded-full text-xs font-bold hover:bg-[#FAF9F6] transition-colors"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export Data
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] shadow-sm overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#EAE9E4] text-xs">
              <thead className="bg-[#FAF9F6] text-[#6E6D6A] uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 text-left">Nama Peserta</th>
                  <th className="px-5 py-3.5 text-left">NIK</th>
                  <th className="px-5 py-3.5 text-left">Tgl Daftar</th>
                  <th className="px-5 py-3.5 text-left">Pekerjaan</th>
                  <th className="px-5 py-3.5 text-left">Email</th>
                  <th className="px-5 py-3.5 text-left">Program</th>
                  <th className="px-5 py-3.5 text-left">Status</th>
                  <th className="px-5 py-3.5 text-left">Periode</th>
                  <th className="px-5 py-3.5 text-left">Iuran</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EFEA] bg-white">
                {filteredData.length > 0 ? (
                  filteredData.map((item) => (
                    <tr key={item.peserta_id} className="hover:bg-[#FAF9F6] transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap text-xs font-bold text-[#121214]">
                        {item.nama_peserta || 'Peserta BPU'}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs font-mono text-[#6E6D6A]">{item.nik}</td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-[#6E6D6A]">
                        {new Date(item.tanggal_pendaftaran).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-[#6E6D6A]">{item.pekerjaan || '-'}</td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-[#6E6D6A]">{item.email || '-'}</td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs font-semibold text-[#121214]">
                        {formatProgramTerdaftar(item.program_terdaftar)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status_pendaftaran === 'BARU DAFTAR'
                            ? 'bg-[#F5C6EC] text-[#121214]'
                            : item.status_pendaftaran === 'MENUNGGU PEMBAYARAN'
                              ? 'bg-[#FCE373] text-[#121214]'
                              : 'bg-[#B8C96E] text-[#121214]'
                        }`}>
                          {item.status_pendaftaran}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-[#6E6D6A]">
                        {item.periode_pelatihan?.replace('bulan', ' Bulan') || '1 Bulan'}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs font-bold text-[#121214]">
                        {formatRupiah(item.biaya)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            className="w-7 h-7 rounded-xl flex items-center justify-center bg-[#FAF9F6] border border-[#EAE9E4] text-[#121214]/70 hover:bg-[#121214] hover:text-white transition"
                            onClick={() => {
                              setSelectedItem(item);
                              setUploadType('payment');
                              setShowUploadModal(true);
                            }}
                            title="Upload Bukti Pembayaran"
                          >
                            <Upload className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="w-7 h-7 rounded-xl flex items-center justify-center bg-[#FAF9F6] border border-[#EAE9E4] text-[#121214]/70 hover:bg-[#121214] hover:text-white transition"
                            onClick={() => {
                              setSelectedItem(item);
                              setUploadType('socialization');
                              setShowUploadModal(true);
                            }}
                            title="Upload Bukti Sosialisasi"
                          >
                            <Upload className="w-3.5 h-3.5" />
                          </button>
                          {item.status_pendaftaran === 'MENUNGGU PEMBAYARAN' && item.bukti_pembayaran_link && (
                            <button
                              className="w-7 h-7 rounded-xl flex items-center justify-center bg-[#B8C96E]/30 border border-[#B8C96E] text-[#3C4A11] hover:bg-[#121214] hover:text-white transition"
                              onClick={() => handleConfirmPayment(item.peserta_id)}
                              title="Konfirmasi Pembayaran"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            className="w-7 h-7 rounded-xl flex items-center justify-center bg-[#FAF9F6] border border-[#EAE9E4] text-[#121214]/70 hover:bg-[#121214] hover:text-white transition"
                            onClick={() => openEditForm(item)}
                            title="Edit Data"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Search className="w-12 h-12 text-gray-400 mb-2" />
                        <p className="text-gray-600">Data tidak ditemukan</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && selectedItem && (
        <div className="fixed inset-0 bg-[#121214]/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[26px] border border-[#EAE9E4] shadow-2xl max-w-md w-full p-6 sm:p-7 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base sm:text-lg font-bold text-[#121214] mb-2">
              Unggah {uploadType === 'payment' ? 'Bukti Pembayaran' : 'Bukti Sosialisasi'}
            </h3>

            <p className="text-xs text-[#121214]/60 mb-4">
              Peserta: <strong className="text-[#121214]">{selectedItem.nama_peserta || 'Nama Tidak Tersedia'}</strong> (NIK: {selectedItem.nik})
            </p>

            <div className="mb-5">
              <label className="block text-xs font-bold text-[#121214] mb-2">
                Pilih file {uploadType === 'payment' ? 'bukti pembayaran' : 'bukti sosialisasi'}:
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileChange}
                className="w-full text-xs text-[#121214]/60
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border file:border-[#EAE9E4]
                  file:text-xs file:font-bold
                  file:bg-[#FAF9F6] file:text-[#121214]
                  hover:file:bg-[#121214] hover:file:text-white file:transition"
              />
              <p className="text-[11px] text-[#121214]/40 mt-1.5">
                Format: JPG, PNG, PDF. Maksimal 5MB
              </p>
            </div>

            <div className="flex justify-end items-center gap-2.5 pt-3 border-t border-[#EAE9E4]">
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                }}
                className="px-5 py-2.5 rounded-full border border-[#EAE9E4] text-xs font-bold text-[#121214] hover:bg-[#FAF9F6] transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleUploadProof}
                disabled={!uploadFile || uploading}
                className={`px-6 py-2.5 rounded-full text-xs font-bold transition shadow-sm ${
                  !uploadFile || uploading
                    ? 'bg-[#121214]/20 text-[#121214]/40 cursor-not-allowed'
                    : 'bg-[#121214] hover:bg-black text-white'
                }`}
              >
                {uploading ? 'Mengunggah...' : 'Unggah File'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-[#121214]/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[26px] border border-[#EAE9E4] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-7 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base sm:text-lg font-bold text-[#121214] mb-3">
              {isEditMode ? 'Edit Data Peserta BPU' : 'Tambah Data Akuisisi BPU'}
            </h3>

            {/* Catatan wajib diisi */}
            <div className="mb-4 p-3.5 bg-[#FCE373]/30 border border-[#FCE373] rounded-2xl text-xs font-medium text-[#856B12]">
              <span className="font-bold">Perhatian:</span> Kolom bertanda <span className="text-red-500 font-bold">*</span> wajib diisi dengan data valid.
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Peserta <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nama_peserta"
                    value={formData.nama_peserta}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.nama_peserta ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Masukkan nama peserta"
                  />
                  {formErrors.nama_peserta && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.nama_peserta}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NIK <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nik"
                    value={formData.nik}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.nik ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Masukkan NIK (minimal 16 digit)"
                  />
                  {formErrors.nik && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.nik}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal Pendaftaran <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="tanggal_pendaftaran"
                    value={formData.tanggal_pendaftaran}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.tanggal_pendaftaran ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.tanggal_pendaftaran && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.tanggal_pendaftaran}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    No. Telepon
                  </label>
                  <input
                    type="text"
                    name="no_telepon"
                    value={formData.no_telepon}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.no_telepon ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Masukkan no. telepon"
                  />
                  {formErrors.no_telepon && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.no_telepon}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pekerjaan
                  </label>
                  <input
                    type="text"
                    name="pekerjaan"
                    value={formData.pekerjaan}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Masukkan pekerjaan"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Masukkan email"
                  />
                  {formErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Program Terdaftar
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="jkk"
                        name="jkk"
                        checked={formData.program_terdaftar.split(',').includes('JKK')}
                        onChange={handleProgramChange}
                        className="h-4 w-4 accent-[#121214] rounded cursor-pointer"
                      />
                      <label htmlFor="jkk" className="ml-2 block text-xs font-medium text-[#121214] cursor-pointer">
                        JKK (Jaminan Kecelakaan Kerja)
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="jkm"
                        name="jkm"
                        checked={formData.program_terdaftar.split(',').includes('JKM')}
                        onChange={handleProgramChange}
                        className="h-4 w-4 accent-[#121214] rounded cursor-pointer"
                      />
                      <label htmlFor="jkm" className="ml-2 block text-xs font-medium text-[#121214] cursor-pointer">
                        JKM (Jaminan Kematian)
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="jht"
                        name="jht"
                        checked={formData.program_terdaftar.split(',').includes('JHT')}
                        onChange={handleProgramChange}
                        className="h-4 w-4 accent-[#121214] rounded cursor-pointer"
                      />
                      <label htmlFor="jht" className="ml-2 block text-xs font-medium text-[#121214] cursor-pointer">
                        JHT (Jaminan Hari Tua)
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status Pendaftaran
                  </label>
                  <select
                    name="status_pendaftaran"
                    value={formData.status_pendaftaran}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="BARU DAFTAR">BARU DAFTAR</option>
                    <option value="MENUNGGU PEMBAYARAN">MENUNGGU PEMBAYARAN</option>
                    <option value="PEMBAYARAN BERHASIL">PEMBAYARAN BERHASIL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Periode Pendaftaran
                  </label>
                  <select
                    name="periode_pelatihan"
                    value={formData.periode_pelatihan}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1bulan">1 Bulan</option>
                    <option value="2bulan">2 Bulan</option>
                    <option value="3bulan">3 Bulan</option>
                    <option value="4bulan">4 Bulan</option>
                    <option value="5bulan">5 Bulan</option>
                    <option value="6bulan">6 Bulan</option>
                    <option value="7bulan">7 Bulan</option>
                    <option value="8bulan">8 Bulan</option>
                    <option value="9bulan">9 Bulan</option>
                    <option value="10bulan">10 Bulan</option>
                    <option value="11bulan">11 Bulan</option>
                    <option value="12bulan">12 Bulan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Biaya
                  </label>
                  <input
                    type="text"
                    name="biaya"
                    value={formatRupiah(formData.biaya)}
                    onChange={handleBiayaChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.biaya ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Masukkan biaya"
                  />
                  {formErrors.biaya && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.biaya}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Biaya ditampilkan dengan format Rupiah: {formatRupiah(formData.biaya)}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#121214] mb-1.5">
                    Upload Bukti Pembayaran
                  </label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handlePaymentProofChange}
                    className="w-full text-xs text-[#121214]/60
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border file:border-[#EAE9E4]
                      file:text-xs file:font-bold
                      file:bg-[#FAF9F6] file:text-[#121214]
                      hover:file:bg-[#121214] hover:file:text-white file:transition"
                  />
                  <p className="text-[11px] text-[#121214]/40 mt-1">
                    Format: JPG, PNG, PDF. Maksimal 5MB
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#121214] mb-1.5">
                    Upload Bukti Sosialisasi
                  </label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleSocializationProofChange}
                    className="w-full text-xs text-[#121214]/60
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border file:border-[#EAE9E4]
                      file:text-xs file:font-bold
                      file:bg-[#FAF9F6] file:text-[#121214]
                      hover:file:bg-[#121214] hover:file:text-white file:transition"
                  />
                  <p className="text-[11px] text-[#121214]/40 mt-1">
                    Format: JPG, PNG, PDF. Maksimal 5MB
                  </p>
                </div>
              </div>

              <div className="flex justify-end items-center gap-2.5 pt-3 border-t border-[#EAE9E4]">
                <button
                  type="button"
                  onClick={() => {
                    setShowFormModal(false);
                    resetForm();
                  }}
                  className="px-5 py-2.5 rounded-full border border-[#EAE9E4] text-xs font-bold text-[#121214] hover:bg-[#FAF9F6] transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-6 py-2.5 rounded-full text-xs font-bold transition shadow-sm ${
                    submitting
                      ? 'bg-[#121214]/20 text-[#121214]/40 cursor-not-allowed'
                      : 'bg-[#121214] hover:bg-black text-white'
                  }`}
                >
                  {submitting ? 'Menyimpan...' : isEditMode ? 'Perbarui Data' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Render semua toast */}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
      </div>
    </Layout>
  );
};

export default AcquisitionResult;