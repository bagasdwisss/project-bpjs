// src/components/Common/Modal.jsx
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-lg', footer }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain" role="dialog" aria-modal="true" aria-label={title || 'Dialog'}>
      <div 
        className="fixed inset-0 bg-[#121214]/40 backdrop-blur-sm animate-in fade-in duration-150" 
        onClick={onClose} 
      />
      <div className="flex min-h-full items-center justify-center p-2.5 sm:p-4">
        <div className={`relative w-full ${maxWidth} bg-white rounded-[22px] sm:rounded-[26px] shadow-2xl border border-[#EAE9E4] overflow-hidden modal-surface-enter z-10`}>
          {title && (
            <div className="px-4 py-3.5 sm:px-6 sm:py-5 border-b border-[#EAE9E4] flex items-start sm:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-bold text-[#121214]">{title}</h3>
                {subtitle && <p className="text-xs text-[#6E6D6A] mt-0.5">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup dialog"
                className="w-9 h-9 rounded-full bg-[#F5F4F0] text-[#121214] hover:bg-[#EAE9E4] flex items-center justify-center transition-all duration-200 hover:rotate-90 cursor-pointer shrink-0 touch-target"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="p-4 sm:p-6 max-h-[78dvh] overflow-y-auto overscroll-contain">{children}</div>
          {footer && (
            <div className="px-4 py-3 sm:px-6 sm:py-4 bg-[#FAF9F6] border-t border-[#EAE9E4] flex flex-wrap justify-end gap-2 sm:gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
