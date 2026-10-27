// src/components/Common/KtmScannerModal.jsx - Student ID (KTM) Scanner & Autofill Modal
import React, { useState, useRef } from 'react';
import { Camera, Upload, CheckCircle2, Sparkles, X, RefreshCw, AlertCircle } from 'lucide-react';
import { extractKtmMetadata } from '../../utils/ktmOcrExtractor';

export default function KtmScannerModal({ isOpen, onClose, onAutofill }) {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setError(null);

    const extraction = await extractKtmMetadata(file);
    setProcessing(false);

    if (extraction.success) {
      setResult(extraction.extractedData);
    } else {
      setError(extraction.error || 'Gagal mengekstrak data kartu mahasiswa.');
    }
  };

  const handleConfirmAutofill = () => {
    if (result && onAutofill) {
      onAutofill(result);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40">
              <Camera className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Pemindai KTM Cerdas</h4>
              <p className="text-[10px] text-emerald-400 font-medium">Autofill Formulir Berbasis OCR Klien</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {!result && (
            <div className="text-center">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-500/40 rounded-2xl p-8 hover:bg-emerald-50/50 cursor-pointer transition-colors flex flex-col items-center justify-center gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Unggah Foto Kartu Tanda Mahasiswa (KTM)</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Mendukung format JPG, PNG, atau WebP</p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileUpload}
                />
              </div>

              {processing && (
                <div className="flex items-center justify-center gap-2 mt-4 text-xs font-semibold text-emerald-700">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Mengekstrak data KTM via AI Canvas OCR...
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Data Kartu Mahasiswa Berhasil Diekstrak ({result.confidenceScore})
              </div>

              <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px]">NIM Mahasiswa:</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">{result.nim}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Nama Mahasiswa:</span>
                  <span className="font-bold text-slate-800">{result.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Institusi Kampus:</span>
                  <span className="font-semibold text-slate-700">{result.university}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Program Studi / Jurusan:</span>
                  <span className="font-semibold text-slate-700">{result.major}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleConfirmAutofill}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  Terapkan ke Formulir
                </button>
                <button
                  onClick={() => setResult(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Ulangi
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
