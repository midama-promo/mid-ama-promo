import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showTagline = false, className = '', onClick }) => {
  const sizes = { sm: 'w-28', md: 'w-36', lg: 'w-44', xl: 'w-56' };
  return (
    <div onClick={onClick} className={`inline-flex flex-col select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}>
      <img src="/mid-ama-promo-logo.png" alt="Mid-Ama Promo" className={`${sizes[size]} h-auto object-contain`} />
      {showTagline && (
        <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-neutral-400 mt-1">
          Worldwide Music Distribution & Promotion
        </span>
      )}
    </div>
  );
};
