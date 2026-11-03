// src/components/Admin/SignatureCaptureInput.jsx
import React, { useRef, useState, useEffect } from 'react';
import { PenTool, Upload, Trash2, CheckCircle2, RotateCcw, Sparkles, Image as ImageIcon } from 'lucide-react';

/**
 * SignatureCaptureInput
 * Allows administrators to either:
 * 1. Draw/paint signature directly on a canvas (mouse or touch)
 * 2. Upload a photo of a signature on paper and extract it into a transparent PNG signature
 */
const SignatureCaptureInput = ({ label, roleTitle, signerName, value, onChange }) => {
  const [mode, setMode] = useState('preview'); // 'preview' | 'draw' | 'upload'
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [previewExtracted, setPreviewExtracted] = useState(null);

  // Initialize canvas when entering draw mode
  useEffect(() => {
    if (mode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#00552B'; // Official BPJS deep green ink
      setHasDrawn(false);
    }
  }, [mode]);

  // Coordinate helper taking canvas scaling into account
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    if (e.cancelable && e.touches) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    if (e.cancelable && e.touches) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSaveCanvasSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const dataUrl = canvas.toDataURL('image/png');
    onChange(dataUrl);
    setMode('preview');
  };

  // Image Upload with Automatic Background Transparency Extraction
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtracting(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create an offscreen processing canvas
        const offscreen = document.createElement('canvas');
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        offscreen.width = w;
        offscreen.height = h;

        const ctx = offscreen.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // Background transparency extraction algorithm
        // Threshold: pixels with brightness > 185 become completely transparent
        // Dark ink strokes are sharpened and tinted into official deep green/black
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;

          if (brightness > 185) {
            data[i + 3] = 0; // Transparent
          } else {
            // Keep ink stroke, enhance contrast
            data[i] = 0;       // R
            data[i + 1] = 85;  // G (#00552B)
            data[i + 2] = 43;  // B
            data[i + 3] = Math.min(255, Math.round((1 - brightness / 185) * 320)); // Smooth anti-aliased edge
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const transparentDataUrl = offscreen.toDataURL('image/png');
        setPreviewExtracted(transparentDataUrl);
        setExtracting(false);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleApplyExtractedSignature = () => {
    if (!previewExtracted) return;
    onChange(previewExtracted);
    setPreviewExtracted(null);
    setMode('preview');
  };

  const handleRemoveSignature = () => {
    onChange('');
    setMode('preview');
  };

  return (
    <div className="p-3.5 bg-white border border-[#121214]/30 rounded-xl space-y-3">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
        <div>
          <span className="text-xs font-black text-[#121214] flex items-center gap-1.5">
            <PenTool className="w-3.5 h-3.5 text-[#008F4C]" />
            {label}
          </span>
          <p className="text-[10px] text-gray-500 font-medium">
            Untuk: <strong>{signerName || 'Pejabat Terkait'}</strong> ({roleTitle})
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          {value ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Tanda Tangan Aktif
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300">
              Spesimen Default (Belum Diinput)
            </span>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {mode === 'preview' && (
        <div className="space-y-3">
          {/* Active Signature Box */}
          <div 
            className="h-28 rounded-xl border border-dashed border-[#121214]/40 flex items-center justify-center p-2 relative overflow-hidden"
            style={{
              backgroundColor: '#FAF9F6',
              backgroundImage: 'radial-gradient(#121214 0.5px, transparent 0.5px)',
              backgroundSize: '12px 12px'
            }}
          >
            {value ? (
              <img 
                src={value} 
                alt={`Tanda Tangan ${signerName}`} 
                className="max-h-24 max-w-[280px] object-contain drop-shadow-sm select-none"
              />
            ) : (
              <div className="text-center space-y-1">
                <PenTool className="w-6 h-6 text-gray-400 mx-auto" />
                <p className="text-[11px] font-bold text-gray-500">Belum ada tanda tangan digital</p>
                <p className="text-[10px] text-gray-400">Pilih metode input di bawah untuk menambahkan tanda tangan</p>
              </div>
            )}
          </div>

          {/* Action Buttons to Choose Method */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('draw')}
              className="flex-1 min-w-[140px] px-3 py-2 rounded-lg bg-[#BDD4F2] hover:bg-[#a5c4ec] text-[#121214] font-black text-xs border border-[#121214] shadow-[2px_2px_0px_#121214] transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>✍️ Lukis Langsung</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('upload')}
              className="flex-1 min-w-[140px] px-3 py-2 rounded-lg bg-[#FCE373] hover:bg-[#f5da5a] text-[#121214] font-black text-xs border border-[#121214] shadow-[2px_2px_0px_#121214] transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>📁 Ekstrak dari Foto</span>
            </button>

            {value && (
              <button
                type="button"
                onClick={handleRemoveSignature}
                className="px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-300 transition-all flex items-center gap-1 cursor-pointer"
                title="Hapus tanda tangan ini"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* MODE 1: LUKIS LANGSUNG PADA KANVAS */}
      {mode === 'draw' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-[#121214] uppercase tracking-wide">
              Kanvas Tanda Tangan Digital
            </span>
            <span className="text-[10px] text-gray-500 font-medium">Goreskan mouse atau jari Anda pada kotak di bawah</span>
          </div>

          <div className="border-2 border-[#008F4C] rounded-xl overflow-hidden bg-white shadow-inner relative">
            <canvas
              ref={canvasRef}
              width={480}
              height={140}
              className="w-full h-32 touch-none cursor-crosshair block"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            <div className="absolute bottom-1 right-2 pointer-events-none text-[9px] font-bold text-gray-400 select-none">
              Area Tanda Tangan BPJSTK
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={clearCanvas}
              className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs border border-gray-300 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ulangi / Bersihkan</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMode('preview')}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-gray-100 text-gray-700 font-bold text-xs border border-gray-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveCanvasSignature}
                disabled={!hasDrawn}
                className="px-4 py-1.5 rounded-lg bg-[#008F4C] hover:bg-[#00753e] text-white font-black text-xs border border-[#121214] shadow-[2px_2px_0px_#121214] flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Gunakan Tanda Tangan Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: UNGGAH FOTO & EKSTRAKSI BACKGROUND TRANSPARAN */}
      {mode === 'upload' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-[#121214] uppercase tracking-wide flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Ekstraksi Gambar Tanda Tangan Transparan
            </span>
            <span className="text-[10px] text-gray-500">Mendukung JPG, PNG, WEBP</span>
          </div>

          <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-center space-y-2">
            <input
              type="file"
              accept="image/*"
              id={`upload-${roleTitle.replace(/\s+/g, '-')}`}
              onChange={handleImageUpload}
              className="hidden"
            />
            <label
              htmlFor={`upload-${roleTitle.replace(/\s+/g, '-')}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-gray-100 text-[#121214] border-2 border-[#121214] shadow-[2px_2px_0px_#121214] text-xs font-black cursor-pointer active:scale-95 transition-all"
            >
              <ImageIcon className="w-4 h-4 text-[#008F4C]" />
              <span>Pilih Foto Tanda Tangan di Kertas</span>
            </label>
            <p className="text-[10px] text-gray-500">
              Sistem akan otomatis menghapus warna kertas putih dan menyisakan goresan tinta transparan berkualitas tinggi.
            </p>
          </div>

          {extracting && (
            <div className="p-3 text-center text-xs font-bold text-gray-600 animate-pulse">
              Memproses & menghapus background kertas...
            </div>
          )}

          {previewExtracted && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-emerald-800 block">
                Hasil Ekstraksi Transparan (Siap Digunakan):
              </span>
              <div 
                className="h-24 rounded-xl border border-[#008F4C] flex items-center justify-center p-2"
                style={{
                  backgroundColor: '#FAF9F6',
                  backgroundImage: 'radial-gradient(#121214 0.5px, transparent 0.5px)',
                  backgroundSize: '12px 12px'
                }}
              >
                <img 
                  src={previewExtracted} 
                  alt="Hasil Ekstraksi" 
                  className="max-h-20 max-w-[260px] object-contain drop-shadow"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPreviewExtracted(null)}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs"
                >
                  Ulangi
                </button>
                <button
                  type="button"
                  onClick={handleApplyExtractedSignature}
                  className="px-4 py-1.5 rounded-lg bg-[#008F4C] hover:bg-[#00753e] text-white font-black text-xs border border-[#121214] shadow-[2px_2px_0px_#121214] flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Terapkan Hasil Ekstraksi</span>
                </button>
              </div>
            </div>
          )}

          <div className="text-right">
            <button
              type="button"
              onClick={() => {
                setPreviewExtracted(null);
                setMode('preview');
              }}
              className="text-xs font-bold text-gray-500 hover:text-gray-800 underline"
            >
              Kembali ke Pratinjau
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignatureCaptureInput;
