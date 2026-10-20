import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
}

/** Shared translucent glass logo. Keeps the existing component API and click behavior. */
export const Logo: React.FC<LogoProps> = ({ size = 'md', showTagline = false, className = '', onClick }) => {
  const sizes = { sm: 'w-24', md: 'w-32', lg: 'w-40', xl: 'w-52' };
  return (
    <div onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      className={`ma-wordmark inline-flex flex-col select-none ${onClick ? 'cursor-pointer' : ''} ${className}`} aria-label="Mid-Ama Promo">
      <img src="/mid-ama-promo-logo.png" alt="M.A™ Promo" className={`ma-logo-image ${sizes[size]}`} />
      {showTagline && <span className="ma-wordmark-tagline">INDEPENDENT MUSIC. WORLDWIDE REACH.</span>}
    </div>
  );
};
