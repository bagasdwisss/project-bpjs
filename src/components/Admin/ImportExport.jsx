import React, { useState } from 'react';
import Layout from '../Layout/Layout';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  FileText,
  Database,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

const ImportExport = () => {
  const { toast } = useToast();
  const [importFile, setImportFile] = useState(null);
  const [exportType, setExportType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importFile) return;

    setLoading(true);
    setStatusMsg(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await import('xlsx');
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const parsedData = XLSX.utils.sheet_to_json(ws);

        if (!parsedData || parsedData.length === 0) {
          throw new Error('File Excel/CSV kosong atau format tidak sesuai.');
        }

        const res = await api.post('/users/import', { users: parsedData });

        setStatusMsg({
          type: 'success',
          message: res.data.message || `${parsedData.length} baris data berhasil diimpor ke sistem!`
        });
        setImportFile(null);
      } catch (error) {
        setStatusMsg({
          type: 'error',
          message: 'Gagal mengimpor file: ' + (error.response?.data?.message || error.message)
        });
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(importFile);
  };

  const handleExport = async () => {
    setExportLoading(true);
    setStatusMsg(null);
    try {
      const XLSX = await import('xlsx');
      let url = '/users';
      if (exportType === 'participants') url += '?role_id=1';
      else if (exportType === 'coordinators') url += '?role_id=2';

      const res = await api.get(url);
      const data = res.data.data || res.data || [];

      if (data.length === 0) {
        toast.warning('Tidak ada data untuk diekspor.');
        return;
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data Pengguna');

      const fileName = `Export_BPJSTK_${exportType}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      setStatusMsg({
        type: 'success',
        message: `File ${fileName} berhasil diunduh.`
      });
    } catch (error) {
      setStatusMsg({
        type: 'error',
        message: 'Gagal mengekspor data: ' + error.message
      });
    } finally {
      setExportLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const templateData = [
      {
        unique_id: 'PES999',
        full_name: 'Nama Peserta Contoh',
        role_id: 1,
        status: 'Aktif',
        penempatan: 'Kantor Cabang BPJSTK'
      },
      {
        unique_id: 'KO999',
        full_name: 'Nama Koordinator Contoh',
        role_id: 2,
        status: 'Aktif',
        penempatan: 'Kantor Cabang BPJSTK'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Template_Import_Pengguna_BPJSTK.xlsx');
  };

  return (
    <Layout>
      <div className="space-y-6 w-full">
        
        {/* Header Bento Box */}
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#FCE373]/50 text-[#856B12]">
                <FileSpreadsheet className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#121214]/60">Integrasi & Sinkronisasi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121214] tracking-tight">Import & Export Data</h1>
            <p className="text-sm text-[#121214]/60 mt-1">Sinkronisasi data massal akun peserta magang dan koordinator menggunakan berkas Excel / CSV</p>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#EAE9E4] bg-white text-xs font-bold text-[#121214] hover:bg-[#FAF9F6] transition shadow-sm self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            Unduh Template Excel
          </button>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-bold ${
            statusMsg.type === 'success' 
              ? 'bg-[#B8C96E]/20 text-[#3C4A11] border border-[#B8C96E]' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {statusMsg.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-[#627514] shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            )}
            <span>{statusMsg.message}</span>
          </div>
        )}

        {/* 2 Main Action Bento Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Import Card */}
          <div className="bg-white p-6 rounded-[22px] border border-[#EAE9E4] shadow-sm flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE9E4] mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#121214]"></span>
                  <h2 className="text-base font-bold text-[#121214]">Impor Data Pengguna</h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF9F6] border border-[#EAE9E4] text-[#121214]/70">
                  Spreadsheet
                </span>
              </div>
              
              <p className="text-xs text-[#121214]/60 mb-4">
                Unggah file spreadsheet (<code className="font-mono text-[#121214]">.xlsx</code>, <code className="font-mono text-[#121214]">.csv</code>) dengan kolom identitas yang valid.
              </p>

              <form onSubmit={handleImport} className="space-y-4">
                <div className="border-2 border-dashed border-[#EAE9E4] hover:border-[#121214] bg-[#FAF9F6] rounded-2xl p-6 text-center transition-all cursor-pointer">
                  <FileSpreadsheet className="w-10 h-10 text-[#121214]/40 mx-auto mb-2" />
                  <input
                    type="file"
                    id="importFileInput"
                    onChange={(e) => setImportFile(e.target.files[0])}
                    className="hidden"
                    accept=".csv,.xlsx,.xls"
                  />
                  <label
                    htmlFor="importFileInput"
                    className="cursor-pointer text-xs sm:text-sm font-bold text-[#121214] hover:underline block"
                  >
                    {importFile ? importFile.name : 'Klik untuk memilih file Excel/CSV'}
                  </label>
                  <p className="text-[11px] text-[#121214]/40 mt-1">Ukuran maksimal file: 10MB</p>
                </div>

                <button
                  type="submit"
                  disabled={!importFile || loading}
                  className="w-full py-2.5 px-4 rounded-full text-xs font-bold text-white bg-[#121214] hover:bg-black disabled:opacity-40 transition-all shadow-sm"
                >
                  {loading ? 'Mengimpor Data...' : 'Mulai Proses Impor'}
                </button>
              </form>
            </div>
          </div>

          {/* Export Card */}
          <div className="bg-white p-6 rounded-[22px] border border-[#EAE9E4] shadow-sm flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE9E4] mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#121214]"></span>
                  <h2 className="text-base font-bold text-[#121214]">Ekspor Data ke Excel</h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF9F6] border border-[#EAE9E4] text-[#121214]/70">
                  Database Neon
                </span>
              </div>

              <p className="text-xs text-[#121214]/60 mb-4">
                Unduh snapshot data akun peserta magang atau koordinator langsung dari basis data Neon PostgreSQL.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#121214] mb-1.5">Kategori Data Pengguna</label>
                  <select
                    value={exportType}
                    onChange={(e) => setExportType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#FAF9F6] border-2 border-[#121214] rounded-2xl text-xs font-bold text-[#121214] shadow-[3px_3px_0px_#121214] focus:outline-none focus:bg-white transition cursor-pointer"
                  >
                    <option value="all">Semua Pengguna Terdaftar</option>
                    <option value="participants">Hanya Peserta Magang (Role 1)</option>
                    <option value="coordinators">Hanya Koordinator Binaan (Role 2)</option>
                  </select>
                </div>

                <div className="pt-6">
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={exportLoading}
                    className="w-full py-2.5 px-4 rounded-full text-xs font-bold text-white bg-[#121214] hover:bg-black disabled:opacity-40 transition-all shadow-sm inline-flex items-center justify-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {exportLoading ? 'Sedang Mengekspor...' : 'Unduh Berkas Excel (.xlsx)'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Pastel Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#BDD4F2]/30 rounded-[22px] border border-[#BDD4F2] p-5">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-xl bg-white/80 flex items-center justify-center text-[#121214]">
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-bold text-[#121214]">Format Terstandar</h4>
            </div>
            <p className="text-[11px] text-[#121214]/70 font-medium">Mendukung format spreadsheet XLSX dan CSV standar industri.</p>
          </div>

          <div className="bg-[#B8C96E]/30 rounded-[22px] border border-[#B8C96E] p-5">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-xl bg-white/80 flex items-center justify-center text-[#121214]">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-bold text-[#121214]">Validasi Kolom Otomatis</h4>
            </div>
            <p className="text-[11px] text-[#121214]/70 font-medium">Mencegah data duplikat atau NIK/ID yang tidak sesuai aturan skema.</p>
          </div>

          <div className="bg-[#FCE373]/30 rounded-[22px] border border-[#FCE373] p-5">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-xl bg-white/80 flex items-center justify-center text-[#121214]">
                <Database className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-bold text-[#121214]">Koneksi Langsung Neon</h4>
            </div>
            <p className="text-[11px] text-[#121214]/70 font-medium">Data diekstrak secara real-time dari PostgreSQL pooler tanpa jeda cache.</p>
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default ImportExport;