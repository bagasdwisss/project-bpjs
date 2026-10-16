// src/components/Common/Input.jsx
import React from 'react';

export const Input = ({
  label,
  error,
  helperText,
  id,
  type = 'text',
  className = '',
  containerClassName = '',
  required = false,
  ...props
}) => {
  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-[#121214]">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        id={id}
        type={type}
        required={required}
        className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-[#121214] placeholder-[#A09F9B] transition-all focus:outline-none focus:ring-2 focus:ring-[#121214] focus:border-[#121214] ${
          error ? 'border-red-500 focus:ring-red-400' : 'border-[#EAE9E4]'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      {helperText && !error && <p className="text-xs text-[#6E6D6A] mt-1">{helperText}</p>}
    </div>
  );
};

export default Input;
