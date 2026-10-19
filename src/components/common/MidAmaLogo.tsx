import React from 'react';

interface MidAmaLogoProps { className?: string; size?: 'sm' | 'md' | 'lg' | 'xl'; variant?: 'badge' | 'full' | 'icon'; showSubtitle?: boolean; }

/** Compatibility wrapper: preserves the existing component API while replacing the legacy badge. */
export const MidAmaLogo: React.FC<MidAmaLogoProps> = ({ className = '', size = 'md', variant = 'badge', showSubtitle = false }) => {
  const sizes = { sm: 'text-xl', md: 'text-3xl', lg: 'text-5xl', xl: 'text-7xl' };
  return <div className={`ma-glass-mark ${variant === 'full' ? 'ma-glass-mark-full' : ''} ${className}`}>
    <span className={`ma-glass-type ${sizes[size]}`}><span>M</span><i>.</i><span>A</span><sup>™</sup></span>
    {variant === 'full' && <span className="ma-glass-caption">MID-AMA PROMO</span>}
    {showSubtitle && <span className="ma-glass-caption">MIDNIGHT-AMAPIANO DISTRIBUTION</span>}
  </div>;
};
