import React from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * NeoSelect - Soft Neo-Brutalist styled Select Dropdown
 */
const NeoSelect = ({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Pilih salah satu',
  name,
  disabled = false,
  required = false,
  className = '',
  helperText,
  icon: Icon
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#121214]">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative group">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#121214] z-10">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <select
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`w-full appearance-none bg-[#FAF9F6] border-2 border-[#121214] rounded-2xl py-2.5 pr-10 text-xs font-bold text-[#121214] shadow-[3px_3px_0px_#121214] hover:shadow-[4px_4px_0px_#121214] focus:outline-none focus:bg-white transition-all cursor-pointer ${
            Icon ? 'pl-10' : 'pl-4'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-neutral-100 shadow-none' : ''}`}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => {
            const optVal = typeof opt === 'object' ? opt.value : opt;
            const optLabel = typeof opt === 'object' ? opt.label : opt;
            return (
              <option key={optVal} value={optVal}>
                {optLabel}
              </option>
            );
          })}
        </select>

        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#121214]">
          <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
        </div>
      </div>

      {helperText && (
        <p className="text-[10px] text-[#6E6D6A] font-medium pl-1">{helperText}</p>
      )}
    </div>
  );
};

export default NeoSelect;
