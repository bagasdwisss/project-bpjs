import React, { useState, useEffect, useContext } from 'react';
import Layout from '../Layout/Layout';
import { AuthContext } from '../../context/AuthContext';
import { 
  FileText, Download, Upload, Search, Filter,
  Folder, CheckCircle, Clock, XCircle, Eye,
  FolderOpen, Archive, BookOpen, Award, Users
} from 'lucide-react';

import api from '../../services/api';

const Documents = () => {
  const { user } = useContext(AuthContext);
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
        color: 'text-green-600 bg-green-50 border-green-200',
        icon: <CheckCircle className="w-4 h-4" />,
        text: 'Disetujui'
      },
      pending: {
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        icon: <Clock className="w-4 h-4" />,
        text: 'Menunggu'
      },
      rejected: {
        color: 'text-red-600 bg-red-50 border-red-200',
        icon: <XCircle className="w-4 h-4" />,
        text: 'Ditolak'
      }
    };
    return configs[status] || configs.pending;
  };

  const getCategoryColor = (category) => {
    const colors = {
      guidelines: 'bg-blue-100 text-blue-800',
      submissions: 'bg-green-100 text-green-800',
      certificates: 'bg-purple-100 text-purple-800',
      materials: 'bg-orange-100 text-orange-800',
      reports: 'bg-red-100 text-red-800',
      templates: 'bg-indigo-100 text-indigo-800',
      documentation: 'bg-teal-100 text-teal-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
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
      alert('Terjadi kesalahan saat mengunduh dokumen.');
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
            alert('File berhasil diupload!');
          }
        } catch (error) {
          console.error('Error uploading file:', error);
          alert('Gagal mengupload file: ' + (error.response?.data?.message || error.message));
        } finally {
          setUploading(false);
          event.target.value = '';
        }
      }
    } else {
      alert('Hanya admin dan koordinator yang dapat mengupload dokumen.');
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
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Manajemen Dokumen 📁
              </h1>
              <p className="text-blue-100">
                Kelola semua dokumen program dan submission tugas
              </p>
            </div>
            <Folder className="w-12 h-12 text-blue-200" />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Dokumen</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-gray-600">Disetujui</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Menunggu</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.myUploads}</div>
            <div className="text-sm text-gray-600">Upload Saya</div>
          </div>
        </div>

        {/* Search and Upload */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari dokumen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Only show upload button for admin and coordinator */}
            {(user?.role && (user.role.toLowerCase().includes('admin') || user.role.toLowerCase().includes('koordinator'))) && (
              <div className="flex gap-2">
                <label className={`flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <Upload className="w-4 h-4" />
                  <span>{uploading ? 'Mengupload...' : 'Upload File'}</span>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Category Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Kategori Dokumen</h2>
            <Filter className="w-5 h-5 text-gray-400" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedCategory === category.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-5 h-5 text-gray-600" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{category.label}</div>
                      <div className="text-sm text-gray-500">{category.count} dokumen</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              {selectedCategory === 'all' ? 'Semua Dokumen' : categories.find(c => c.id === selectedCategory)?.label}
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({filteredDocuments.length} dokumen)
              </span>
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {filteredDocuments.length > 0 ? (
              filteredDocuments.map((doc) => {
                const statusConfig = getStatusConfig(doc.status);
                
                return (
                  <div key={doc.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="flex-shrink-0">
                          {getFileIcon(doc.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-gray-900 truncate">{doc.name}</h3>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(doc.category)}`}>
                              {categories.find(c => c.id === doc.category)?.label}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3">{doc.description}</p>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            <span>💾 {doc.size}</span>
                            <span>📅 {new Date(doc.uploadDate).toLocaleDateString('id-ID')}</span>
                            <span>👤 {doc.uploadedBy}</span>
                            <span>⬇️ {doc.downloadCount} download</span>
                            <span>{doc.isPublic ? '🌐 Publik' : '🔒 Privat'}</span>
                          </div>

                          {doc.status === 'rejected' && doc.rejectionReason && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                              <strong>Alasan penolakan:</strong> {doc.rejectionReason}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 ml-4">
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full border flex items-center space-x-1 ${statusConfig.color}`}>
                          {statusConfig.icon}
                          <span>{statusConfig.text}</span>
                        </span>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleDownload(doc)}
                            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center">
                <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Tidak ada dokumen yang ditemukan</p>
                <p className="text-sm text-gray-400 mt-1">
                  {searchQuery ? 'Coba ubah kata kunci pencarian' : 'Tidak ada dokumen dalam kategori ini'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Upload Guidelines - Only show for admin and coordinator */}
        {(user?.role && (user.role.toLowerCase().includes('admin') || user.role.toLowerCase().includes('koordinator'))) && (
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Panduan Upload</h3>
            <ul className="text-blue-800 space-y-2 text-sm">
              <li>• Format file yang didukung: PDF, DOCX, XLSX, PPTX, JPG, PNG</li>
              <li>• Maksimal ukuran file: 10 MB</li>
              <li>• File submission akan diverifikasi oleh koordinator</li>
              <li>• Status "Menunggu" berarti file sedang dalam proses review</li>
              <li>• Hubungi koordinator jika file ditolak tanpa alasan jelas</li>
            </ul>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Documents;