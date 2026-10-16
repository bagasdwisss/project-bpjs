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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-[#121214]/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`relative w-full ${maxWidth} bg-white rounded-[26px] shadow-2xl border border-[#EAE9E4] overflow-hidden transform transition-all z-10`}>
          {title && (
            <div className="px-6 py-5 border-b border-[#EAE9E4] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#121214]">{title}</h3>
                {subtitle && <p className="text-xs text-[#6E6D6A] mt-0.5">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#F5F4F0] text-[#121214] hover:bg-[#EAE9E4] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="p-6 max-h-[75vh] overflow-y-auto">{children}</div>
          {footer && (
            <div className="px-6 py-4 bg-[#FAF9F6] border-t border-[#EAE9E4] flex justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
