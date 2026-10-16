import React, { useState, useEffect, useContext } from 'react';
import Layout from '../Layout/Layout';
import { AuthContext } from '../../context/AuthContext';
import { 
  FileText, Download, Upload, Search, Filter,
  Folder, CheckCircle, Clock, XCircle, Eye,
  FolderOpen, Archive, BookOpen, Award, Users
} from 'lucide-react';

import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const Documents = () => {
  const { user } = useContext(AuthContext);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await api.get('/documents');
        const raw = response.data;
        const docList = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        setDocuments(docList);
      } catch (error) {
        console.error('Error fetching documents:', error);
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDocuments();
  }, []);

  const safeDocs = Array.isArray(documents) ? documents : [];

  const categories = [
    { id: 'all', label: 'Semua Dokumen', icon: FolderOpen, count: safeDocs.length },
    { id: 'guidelines', label: 'Panduan', icon: BookOpen, count: safeDocs.filter(d => d.category === 'guidelines').length },
    { id: 'submissions', label: 'Submission', icon: Upload, count: safeDocs.filter(d => d.category === 'submissions').length },
    { id: 'certificates', label: 'Sertifikat', icon: Award, count: safeDocs.filter(d => d.category === 'certificates').length },
    { id: 'materials', label: 'Materi', icon: FileText, count: safeDocs.filter(d => d.category === 'materials').length },
    { id: 'reports', label: 'Laporan', icon: Archive, count: safeDocs.filter(d => d.category === 'reports').length },
    { id: 'templates', label: 'Template', icon: Folder, count: safeDocs.filter(d => d.category === 'templates').length },
    { id: 'documentation', label: 'Dokumentasi', icon: Users, count: safeDocs.filter(d => d.category === 'documentation').length }
  ];

  const getFileIcon = (type) => {
    const icons = {
      pdf: <FileText className="w-6 h-6 text-red-500" />,
      docx: <FileText className="w-6 h-6 text-blue-500" />,
      xlsx: <FileText className="w-6 h-6 text-green-500" />,
      pptx: <FileText className="w-6 h-6 text-orange-500" />,
      png: <FileText className="w-6 h-6 text-purple-500" />,
      jpg: <FileText className="w-6 h-6 text-pink-500" />
    };
    return icons[type] || <FileText className="w-6 h-6 text-gray-500" />;
  };

  const getStatusConfig = (status) => {
    const configs = {
      approved: {
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        icon: <CheckCircle className="w-3.5 h-3.5" />,
        text: 'Disetujui'
      },
      pending: {
        color: 'text-[#121214] bg-[#FCE373]/50 border-[#FCE373]',
        icon: <Clock className="w-3.5 h-3.5" />,
        text: 'Menunggu'
      },
      rejected: {
        color: 'text-rose-700 bg-rose-50 border-rose-200',
        icon: <XCircle className="w-3.5 h-3.5" />,
        text: 'Ditolak'
      }
    };
    return configs[status] || configs.pending;
  };

  const getCategoryColor = (category) => {
    const colors = {
      guidelines: 'bg-[#BDD4F2] text-[#121214]',
      submissions: 'bg-[#B8C96E] text-[#121214]',
      certificates: 'bg-[#F5C6EC] text-[#121214]',
      materials: 'bg-[#FCE373] text-[#121214]',
      reports: 'bg-[#FAF9F6] text-[#121214] border border-[#EAE9E4]',
      templates: 'bg-[#BDD4F2] text-[#121214]',
      documentation: 'bg-[#F5C6EC] text-[#121214]'
    };
    return colors[category] || 'bg-[#FAF9F6] text-[#121214]';
  };

  const handleDownload = async (document) => {
    try {
      const response = await api.get(`/documents/${document.id}/download`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = document.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // Update download count in state
      setDocuments(prevDocs => 
        prevDocs.map(doc => 
          doc.id === document.id 
            ? {...doc, downloadCount: (doc.downloadCount || 0) + 1} 
            : doc
        )
      );
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Terjadi kesalahan saat mengunduh dokumen.');
    }
  };

  const handleFileUpload = async (event) => {
    if (user?.role && (user.role.toLowerCase().includes('admin') || user.role.toLowerCase().includes('koordinator'))) {
      const file = event.target.files[0];
      if (file) {
        setUploading(true);
        try {
          const res = await api.post('/documents/upload', {
            file_name: file.name,
            category: 'submissions',
            description: 'File upload baru'
          });

          if (res.data.success) {
            setDocuments(prev => [res.data.data, ...prev]);
            toast.success('File berhasil diupload!');
          }
        } catch (error) {
          console.error('Error uploading file:', error);
          toast.error('Gagal mengupload file: ' + (error.response?.data?.message || error.message));
        } finally {
          setUploading(false);
          event.target.value = '';
        }
      }
    } else {
      toast.warning('Hanya admin dan koordinator yang dapat mengupload dokumen.');
      event.target.value = '';
    }
  };

  const filteredDocuments = safeDocs.filter((doc) => {
    const docName = doc?.name || '';
    const docDesc = doc?.description || '';
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    const matchesSearch = docName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         docDesc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const stats = {
    total: safeDocs.length,
    approved: safeDocs.filter(d => d.status === 'approved').length,
    pending: safeDocs.filter(d => d.status === 'pending').length,
    myUploads: (user?.role && (user.role.toLowerCase().includes('admin') || user.role.toLowerCase().includes('koordinator'))) 
      ? safeDocs.filter(d => d.uploadedBy === (user?.full_name || 'Peserta')).length 
      : 0
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
          <div className="w-10 h-10 border-3 border-[#121214] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-[#121214]">Memuat basis dokumen...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121214] tracking-tight">
              Basis Dokumen & Modul
            </h1>
            <p className="text-xs sm:text-sm text-[#6E6D6A] mt-1">
              Pusat unduhan materi pelatihan, panduan magang, formulir, dan penyerahan tugas resmi
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-[#121214] text-white px-3.5 py-1.5 rounded-full shadow-sm">
              {safeDocs.length} Dokumen Tersedia
            </span>
          </div>
        </div>

        {/* 4 Pastel Bento Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-[22px] bg-[#FCE373] text-[#121214] p-4 sm:p-5 relative overflow-hidden shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#121214]/70">Total Dokumen</span>
            <div className="text-3xl font-black text-[#121214] my-1">{stats.total}</div>
            <span className="text-[10px] font-bold text-[#121214]/70">Semua Kategori</span>
          </div>

          <div className="rounded-[22px] bg-[#B8C96E] text-[#121214] p-4 sm:p-5 relative overflow-hidden shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#121214]/70">Disetujui</span>
            <div className="text-3xl font-black text-[#121214] my-1">{stats.approved}</div>
            <span className="text-[10px] font-bold text-[#121214]/70">Terverifikasi</span>
          </div>

          <div className="rounded-[22px] bg-[#F5C6EC] text-[#121214] p-4 sm:p-5 relative overflow-hidden shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#121214]/70">Menunggu</span>
            <div className="text-3xl font-black text-[#121214] my-1">{stats.pending}</div>
            <span className="text-[10px] font-bold text-[#121214]/70">Dalam Review</span>
          </div>

          <div className="rounded-[22px] bg-[#BDD4F2] text-[#121214] p-4 sm:p-5 relative overflow-hidden shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#121214]/70">Sertifikat</span>
            <div className="text-3xl font-black text-[#121214] my-1">
              {safeDocs.filter(d => d.category === 'certificates').length}
            </div>
            <span className="text-[10px] font-bold text-[#121214]/70">Kelulusan & Prestasi</span>
          </div>
        </div>

        {/* Search & Category Pills Bento Card */}
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            {/* Search Input */}
            <div className="flex-1 w-full flex items-center bg-[#FAF9F6] rounded-full px-3.5 py-2 border border-[#EAE9E4] focus-within:ring-2 focus-within:ring-[#121214]">
              <div className="w-6 h-6 rounded-full bg-[#F5C6EC] flex items-center justify-center shrink-0 text-[#121214]">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                placeholder="Cari berdasarkan nama dokumen, panduan, atau deskripsi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs sm:text-sm text-[#121214] placeholder-[#8A8985] px-3 w-full font-medium"
              />
            </div>

            {/* Upload Button (if admin/coordinator) */}
            {(user?.role && (user.role.toLowerCase().includes('admin') || user.role.toLowerCase().includes('koordinator'))) && (
              <label className="cursor-pointer shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-[#121214] hover:bg-neutral-800 text-white rounded-full text-xs font-bold transition-all shadow-sm">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploading ? 'Mengunggah...' : 'Unggah File'}</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Category Filter Pills (Horizontal Scrollable) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                    isActive 
                      ? 'bg-[#121214] text-white shadow-sm' 
                      : 'bg-[#FAF9F6] text-[#6E6D6A] border border-[#EAE9E4] hover:text-[#121214] hover:bg-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{category.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-[#27272A] text-white' : 'bg-[#EAE9E4] text-[#121214]'
                  }`}>
                    {category.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Documents List Bento Card */}
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#EAE9E4] flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-[#121214]">
              {selectedCategory === 'all' ? 'Semua Dokumen' : categories.find(c => c.id === selectedCategory)?.label}
              <span className="text-xs font-normal text-[#6E6D6A] ml-2">
                ({filteredDocuments.length} berkas)
              </span>
            </h2>
            <span className="text-xs font-bold bg-[#FAF9F6] border border-[#EAE9E4] text-[#121214] px-3 py-1 rounded-full">
              PDF / Docs
            </span>
          </div>
          
          <div className="divide-y divide-[#F0EFEA]">
            {filteredDocuments.length > 0 ? (
              filteredDocuments.map((doc) => {
                const statusConfig = getStatusConfig(doc.status);
                
                return (
                  <div key={doc.id} className="p-5 sm:p-6 hover:bg-[#FAF9F6] transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#FAF9F6] border border-[#EAE9E4] flex items-center justify-center shrink-0">
                          {getFileIcon(doc.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-bold text-sm text-[#121214] truncate">{doc.name}</h3>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${getCategoryColor(doc.category)}`}>
                              {categories.find(c => c.id === doc.category)?.label}
                            </span>
                          </div>
                          
                          <p className="text-xs text-[#6E6D6A] mb-2 line-clamp-1">{doc.description}</p>
                          
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] text-[#8A8985]">
                            <span>{doc.size || '1.2 MB'}</span>
                            <span>•</span>
                            <span>{new Date(doc.uploadDate || Date.now()).toLocaleDateString('id-ID')}</span>
                            <span>•</span>
                            <span>{doc.uploadedBy || 'Admin BPJS'}</span>
                            <span>•</span>
                            <span>{doc.downloadCount || 0}x diunduh</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                        <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border flex items-center gap-1 ${statusConfig.color}`}>
                          {statusConfig.icon}
                          <span>{statusConfig.text}</span>
                        </span>
                        
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-2 bg-[#FAF9F6] hover:bg-[#121214] hover:text-white border border-[#EAE9E4] text-[#121214] rounded-full transition-colors"
                          title="Unduh Berkas"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center">
                <Folder className="w-10 h-10 text-[#A09F9B] mx-auto mb-3" />
                <p className="text-sm font-bold text-[#121214]">Tidak ada dokumen yang ditemukan</p>
                <p className="text-xs text-[#6E6D6A] mt-1">
                  {searchQuery ? 'Coba ubah kata kunci pencarian Anda.' : 'Belum ada dokumen yang diunggah dalam kategori ini.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Documents;