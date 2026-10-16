// src/components/Admin/ImportExport.jsx
import React, { useState } from 'react';
import Layout from '../Layout/Layout';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, FileText } from 'lucide-react';

const ImportExport = () => {
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
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const parsedData = XLSX.utils.sheet_to_json(ws);

        if (!parsedData || parsedData.length === 0) {
          throw new Error('File Excel/CSV kosong atau format tidak sesuai.');
        }

        // Call backend import API
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
      let url = '/users';
      if (exportType === 'participants') url += '?role_id=1';
      else if (exportType === 'coordinators') url += '?role_id=2';

      const res = await api.get(url);
      const data = res.data.data || res.data || [];

      if (data.length === 0) {
        alert('Tidak ada data untuk diekspor.');
        return;
      }

      // Convert to Excel worksheet
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data Pengguna');

      const fileName = `Export_BPJS_${exportType}_${new Date().toISOString().split('T')[0]}.xlsx`;
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

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        unique_id: 'PES999',
        full_name: 'Nama Peserta Contoh',
        role_id: 1,
        status: 'Aktif',
        penempatan: 'Kantor'
      },
      {
        unique_id: 'KO999',
        full_name: 'Nama Koordinator Contoh',
        role_id: 2,
        status: 'Aktif',
        penempatan: 'Kantor'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Template_Import_Pengguna_BPJS.xlsx');
  };

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import & Export Data</h1>
          <p className="text-sm text-gray-500 mt-1">Sinkronisasi data massal pengguna dan laporan menggunakan format Excel / CSV</p>
        </div>

        {statusMsg && (
          <div className={`p-4 rounded-xl flex items-center gap-2 text-sm font-medium ${
            statusMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {statusMsg.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
            <span>{statusMsg.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Import Section */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" /> Impor Data Pengguna
              </h2>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
              >
                <FileText className="w-3.5 h-3.5" /> Unduh Template Excel
              </button>
            </div>
            
            <p className="text-xs text-gray-500">
              Unggah file spreadsheet (.xlsx, .xls, .csv) berisi kolom: <code>unique_id</code>, <code>full_name</code>, <code>role_id</code>.
            </p>

            <form onSubmit={handleImport} className="space-y-4">
              <div className="border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-2xl p-6 text-center transition-colors">
                <FileSpreadsheet className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <input
                  type="file"
                  id="importFileInput"
                  onChange={(e) => setImportFile(e.target.files[0])}
                  className="hidden"
                  accept=".csv,.xlsx,.xls"
                />
                <label
                  htmlFor="importFileInput"
                  className="cursor-pointer text-sm font-semibold text-blue-600 hover:underline block"
                >
                  {importFile ? importFile.name : 'Klik untuk memilih file Excel/CSV'}
                </label>
                <p className="text-xs text-gray-400 mt-1">Maksimal 10MB</p>
              </div>

              <button
                type="submit"
                disabled={!importFile || loading}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {loading ? 'Mengimpor Data...' : 'Mulai Proses Impor'}
              </button>
            </form>
          </div>

          {/* Export Section */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Download className="w-5 h-5 text-green-600" /> Ekspor Data ke Excel
            </h2>
            <p className="text-xs text-gray-500">
              Unduh data master peserta magang atau koordinator langsung dari database Neon PostgreSQL.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Kategori Data</label>
                <select
                  value={exportType}
                  onChange={(e) => setExportType(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Semua Pengguna</option>
                  <option value="participants">Hanya Peserta Magang</option>
                  <option value="coordinators">Hanya Koordinator</option>
                </select>
              </div>

              <div className="pt-8">
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exportLoading}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm inline-flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {exportLoading ? 'Sedang Mengekspor...' : 'Unduh Data Excel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ImportExport;