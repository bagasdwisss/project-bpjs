// src/components/Common/Card.jsx
import React from 'react';

export const Card = ({ 
  children, 
  title, 
  subtitle, 
  action, 
  variant = 'white', 
  className = '', 
  headerClassName = '', 
  bodyClassName = '', 
  watermark = null,
  ...props 
}) => {
  const variantStyles = {
    white: 'bg-white border border-[#EAE9E4] text-[#121214]',
    yellow: 'bg-[#FCE373] text-[#121214]',
    pink: 'bg-[#F5C6EC] text-[#121214]',
    green: 'bg-[#B8C96E] text-[#121214]',
    blue: 'bg-[#BDD4F2] text-[#121214]',
    pitch: 'bg-[#121214] text-white'
  };

  return (
    <div 
      className={`rounded-[22px] relative overflow-hidden transition-all duration-200 ${variantStyles[variant] || variantStyles.white} ${className}`} 
      {...props}
    >
      {/* Decorative watermark silhouette */}
      {watermark && (
        <div className="absolute right-3 -bottom-4 pointer-events-none select-none opacity-20 transform translate-x-2">
          {watermark}
        </div>
      )}

      {(title || subtitle || action) && (
        <div className={`px-6 pt-5 pb-3 flex items-center justify-between border-b ${variant === 'white' ? 'border-[#EAE9E4]' : 'border-black/10'} ${headerClassName}`}>
          <div>
            {title && <h3 className="text-base sm:text-lg font-bold tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-[#6E6D6A] mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0 ml-4">{action}</div>}
        </div>
      )}
      <div className={`p-6 ${bodyClassName}`}>{children}</div>
    </div>
  );
};

export default Card;
