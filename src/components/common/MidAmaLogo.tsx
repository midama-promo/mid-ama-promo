import React from 'react';

interface MidAmaLogoProps { className?: string; size?: 'sm' | 'md' | 'lg' | 'xl'; variant?: 'badge' | 'full' | 'icon'; showSubtitle?: boolean; }

/** Compatibility wrapper: keeps existing props while using the new translucent glass logo. */
export const MidAmaLogo: React.FC<MidAmaLogoProps> = ({ className = '', size = 'md', variant = 'badge', showSubtitle = false }) => {
  const sizes = { sm: 'w-24', md: 'w-32', lg: 'w-40', xl: 'w-52' };
  return <div className={`ma-glass-mark ${variant === 'full' ? 'ma-glass-mark-full' : ''} ${className}`}>
    <img src="/mid-ama-promo-logo.png" alt="M.A™ Promo" className={`ma-logo-image ${sizes[size]} ${variant === 'icon' ? 'ma-logo-icon' : ''}`} />
    {showSubtitle && <span className="ma-glass-caption">MIDNIGHT-AMAPIANO DISTRIBUTION</span>}
  </div>;
};
