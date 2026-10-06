import React from 'react';
import midAmaPromoLogo from '../../assets/images/mid-ama-promo-logo.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showTagline = false, className = '', onClick }) => {
  const sizes = { sm: 'w-28', md: 'w-44', lg: 'w-52', xl: 'w-64' };
  return (
    <div onClick={onClick} className={`inline-flex flex-col select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}>
      <img src={midAmaPromoLogo} alt="Mid-Ama Promo" className={`${sizes[size]} h-auto max-h-14 object-contain`} loading="eager" draggable={false} />
      {showTagline && (
        <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-neutral-400 mt-1">
          Worldwide Music Distribution & Promotion
        </span>
      )}
    </div>
  );
};
