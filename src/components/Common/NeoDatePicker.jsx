import React, { useRef } from 'react';
import { Calendar, Clock, ChevronDown, X } from 'lucide-react';

/**
 * NeoDatePicker - Soft Neo-Brutalist styled Date and DateTime Picker
 */
const NeoDatePicker = ({
  label,
  value,
  onChange,
  type = 'date',
  placeholder,
  min,
  max,
  disabled = false,
  required = false,
  className = '',
  helperText,
  quickChips = false,
  name
}) => {
  const inputRef = useRef(null);

  const handleContainerClick = () => {
    if (disabled) return;
    if (inputRef.current) {
      if (typeof inputRef.current.showPicker === 'function') {
        inputRef.current.showPicker();
      } else {
        inputRef.current.focus();
      }
    }
  };

  const handleQuickChip = (daysToAdd) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    
    if (type === 'datetime-local') {
      const hh = String(d.getHours()).padStart(2, '0');
      const minStr = String(d.getMinutes()).padStart(2, '0');
      onChange({ target: { name: name || '', value: `${yyyy}-${mm}-${dd}T${hh}:${minStr}` } });
    } else {
      onChange({ target: { name: name || '', value: `${yyyy}-${mm}-${dd}` } });
    }
  };

  const formatDisplay = (val) => {
    if (!val) return '';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      if (type === 'time') return val;
      if (type === 'datetime-local') {
        return d.toLocaleString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return val;
    }
  };

  const IconComponent = type === 'time' ? Clock : Calendar;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#121214]">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div
        onClick={handleContainerClick}
        className={`group relative flex items-center justify-between px-3.5 py-2.5 bg-[#FAF9F6] border-2 border-[#121214] rounded-2xl shadow-[3px_3px_0px_#121214] hover:shadow-[4px_4px_0px_#121214] transition-all cursor-pointer select-none ${
          disabled ? 'opacity-50 cursor-not-allowed bg-neutral-100 shadow-none' : 'active:translate-x-[1px] active:translate-y-[1px]'
        }`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
          <div className="w-7 h-7 rounded-xl bg-[#FCE373] text-[#121214] border border-[#121214] flex items-center justify-center shrink-0">
            <IconComponent className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            {value ? (
              <span className="text-xs font-bold text-[#121214]">
                {formatDisplay(value)}
              </span>
            ) : (
              <span className="text-xs font-semibold text-[#8A8985]">
                {placeholder || (type === 'datetime-local' ? 'Pilih tanggal & waktu' : 'Pilih tanggal')}
              </span>
            )}
          </div>
        </div>

        {/* Clear or Calendar Icon */}
        <div className="flex items-center gap-1.5 shrink-0">
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange({ target: { name: name || '', value: '' } });
              }}
              className="p-1 rounded-full text-[#8A8985] hover:text-[#121214] hover:bg-[#EAE9E4] transition"
              title="Hapus tanggal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className="w-4 h-4 text-[#121214] group-hover:translate-y-0.5 transition-transform" />
        </div>

        {/* Native Input invisible under cursor */}
        <input
          ref={inputRef}
          type={type}
          name={name}
          value={value || ''}
          onChange={onChange}
          min={min}
          max={max}
          required={required}
          disabled={disabled}
          className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
          tabIndex={-1}
        />
      </div>

      {/* Quick selection chips */}
      {quickChips && !disabled && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => handleQuickChip(0)}
            className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white border border-[#121214] text-[#121214] hover:bg-[#FCE373] transition shadow-xs"
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={() => handleQuickChip(1)}
            className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white border border-[#121214] text-[#121214] hover:bg-[#FCE373] transition shadow-xs"
          >
            Besok
          </button>
          <button
            type="button"
            onClick={() => handleQuickChip(7)}
            className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white border border-[#121214] text-[#121214] hover:bg-[#FCE373] transition shadow-xs"
          >
            +7 Hari
          </button>
          <button
            type="button"
            onClick={() => handleQuickChip(30)}
            className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white border border-[#121214] text-[#121214] hover:bg-[#FCE373] transition shadow-xs"
          >
            +30 Hari
          </button>
        </div>
      )}

      {helperText && (
        <p className="text-[10px] text-[#6E6D6A] font-medium pl-1">{helperText}</p>
      )}
    </div>
  );
};

export default NeoDatePicker;
