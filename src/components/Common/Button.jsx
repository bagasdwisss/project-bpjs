// src/components/Common/Button.jsx
import React from 'react';

export const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 active:scale-[0.98] focus:outline-none';
  
  const variants = {
    primary: 'bg-[#121214] hover:bg-neutral-800 text-white shadow-sm',
    secondary: 'bg-white hover:bg-[#EAE9E4] text-[#121214] border border-[#EAE9E4] shadow-sm',
    pink: 'bg-[#F5C6EC] hover:bg-[#E59CD8] text-[#121214] font-semibold',
    yellow: 'bg-[#FCE373] hover:bg-[#F2CE46] text-[#121214] font-semibold',
    green: 'bg-[#B8C96E] hover:bg-[#9CB04C] text-[#121214] font-semibold',
    blue: 'bg-[#BDD4F2] hover:bg-[#91B6E6] text-[#121214] font-semibold',
    danger: 'bg-red-500 hover:bg-red-600 text-white shadow-sm',
    success: 'bg-[#B8C96E] hover:bg-[#9CB04C] text-[#121214] font-semibold',
    outline: 'border border-[#121214] hover:bg-[#121214] hover:text-white text-[#121214]',
    ghost: 'hover:bg-[#EAE9E4] text-[#121214]'
  };

  const sizes = {
    sm: 'px-3.5 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base'
  };

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '';

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseClasses} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${disabledClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
