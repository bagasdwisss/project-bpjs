import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    if (!message) return;
    const id = Date.now() + Math.random().toString(36).substring(2, 7);
    const newToast = { id, message, type, duration };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const toastHelpers = {
    show: showToast,
    success: (msg, dur) => showToast(msg, 'success', dur),
    error: (msg, dur) => showToast(msg, 'error', dur),
    warning: (msg, dur) => showToast(msg, 'warning', dur),
    info: (msg, dur) => showToast(msg, 'info', dur),
  };

  const confirm = useCallback((options) => {
    const opts = typeof options === 'string' ? { message: options } : (options || {});
    return new Promise((resolve) => {
      setConfirmDialog({
        title: opts.title || 'Konfirmasi Tindakan',
        message: opts.message || 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
        confirmText: opts.confirmText || 'Ya, Lanjutkan',
        cancelText: opts.cancelText || 'Batal',
        type: opts.type || 'warning',
        resolve,
      });
    });
  }, []);

  // Intercept window.alert so all system alerts use this branded toast automatically
  useEffect(() => {
    const originalAlert = window.alert;

    window.alert = (message) => {
      const msgStr = typeof message === 'object' ? JSON.stringify(message) : String(message || '');
      const lower = msgStr.toLowerCase();

      let detectedType = 'info';
      if (
        lower.includes('berhasil') ||
        lower.includes('sukses') ||
        lower.includes('success') ||
        lower.includes('selesai')
      ) {
        detectedType = 'success';
      } else if (
        lower.includes('gagal') ||
        lower.includes('error') ||
        lower.includes('salah') ||
        lower.includes('tidak dapat') ||
        lower.includes('failed') ||
        lower.includes('hanya admin')
      ) {
        detectedType = 'error';
      } else if (
        lower.includes('peringatan') ||
        lower.includes('perhatian') ||
        lower.includes('harap') ||
        lower.includes('wajib') ||
        lower.includes('silakan') ||
        lower.includes('pilih') ||
        lower.includes('warning')
      ) {
        detectedType = 'warning';
      }

      showToast(msgStr, detectedType);
    };

    return () => {
      window.alert = originalAlert;
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast, toast: toastHelpers, confirm }}>
      {children}
      {/* Toast Container Top-Right */}
      <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-3 sm:px-0">
        {toasts.map((item) => {
          let bgClass = 'bg-[#BDD4F2] text-[#121214]'; // info
          let IconComp = Info;
          let badgeText = 'Informasi';

          if (item.type === 'success') {
            bgClass = 'bg-[#B8C96E] text-[#121214]';
            IconComp = CheckCircle2;
            badgeText = 'Berhasil';
          } else if (item.type === 'error') {
            bgClass = 'bg-[#F5C6EC] text-[#121214]';
            IconComp = XCircle;
            badgeText = 'Pemberitahuan';
          } else if (item.type === 'warning') {
            bgClass = 'bg-[#FCE373] text-[#121214]';
            IconComp = AlertTriangle;
            badgeText = 'Perhatian';
          }

          return (
            <div
              key={item.id}
              className={`pointer-events-auto rounded-2xl border-2 border-[#121214] shadow-[4px_4px_0px_#121214] p-3.5 flex items-start justify-between gap-3 transition-all duration-200 animate-in slide-in-from-top-3 ${bgClass}`}
              role="alert"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-[#121214] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-[1px_1px_0px_#121214]">
                  <IconComp className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#121214]/70 block">
                    {badgeText}
                  </span>
                  <p className="text-xs font-black text-[#121214] leading-snug break-words">
                    {item.message}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeToast(item.id)}
                className="p-1 rounded-lg hover:bg-black/10 active:scale-95 transition-all text-[#121214] shrink-0 mt-0.5"
                aria-label="Tutup notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Neo-Brutalist Branded Confirmation Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border-2 border-[#121214] rounded-2xl p-5 sm:p-6 shadow-[6px_6px_0px_#121214] max-w-sm sm:max-w-md w-full space-y-4 animate-in zoom-in-95 duration-150 pointer-events-auto">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl border-2 border-[#121214] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#121214] ${
                  confirmDialog.type === 'danger' || confirmDialog.type === 'error'
                    ? 'bg-[#F5C6EC]'
                    : confirmDialog.type === 'success'
                    ? 'bg-[#B8C96E]'
                    : confirmDialog.type === 'info'
                    ? 'bg-[#BDD4F2]'
                    : 'bg-[#FCE373]'
                }`}
              >
                <AlertTriangle className="w-5 h-5 text-[#121214]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#121214]/60 block mb-0.5">
                  Konfirmasi
                </span>
                <h3 className="font-black text-sm sm:text-base text-[#121214] leading-snug">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs font-bold text-gray-600 mt-1.5 leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  const res = confirmDialog.resolve;
                  setConfirmDialog(null);
                  res(false);
                }}
                className="px-4 py-2 bg-[#FAF9F6] hover:bg-gray-100 border-2 border-[#121214] rounded-xl font-bold text-xs text-[#121214] active:scale-95 transition-transform"
              >
                {confirmDialog.cancelText}
              </button>
              <button
                type="button"
                onClick={() => {
                  const res = confirmDialog.resolve;
                  setConfirmDialog(null);
                  res(true);
                }}
                className={`px-4 py-2 border-2 border-[#121214] rounded-xl font-black text-xs shadow-[2px_2px_0px_#121214] active:scale-95 transition-transform text-[#121214] ${
                  confirmDialog.type === 'danger' || confirmDialog.type === 'error'
                    ? 'bg-[#F5C6EC] hover:bg-[#e4b3da]'
                    : confirmDialog.type === 'success'
                    ? 'bg-[#B8C96E] hover:bg-[#a6b85c]'
                    : 'bg-[#FCE373] hover:bg-[#ecd25b]'
                }`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if component is rendered outside ToastProvider
    return {
      showToast: (msg) => console.log(msg),
      removeToast: () => {},
      confirm: async () => true,
      toast: {
        show: (msg) => console.log(msg),
        success: (msg) => console.log(msg),
        error: (msg) => console.log(msg),
        warning: (msg) => console.log(msg),
        info: (msg) => console.log(msg),
      }
    };
  }
  return context;
};

export default ToastContext;
