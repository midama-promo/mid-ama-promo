import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
}

/** Transparent, glass-effect M.A™ wordmark. Kept as the shared logo component so every portal uses the same identity. */
export const Logo: React.FC<LogoProps> = ({ size = 'md', showTagline = false, className = '', onClick }) => {
  const sizes = { sm: 'text-2xl', md: 'text-3xl', lg: 'text-4xl', xl: 'text-5xl' };
  return (
    <div onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      className={`ma-wordmark inline-flex flex-col select-none ${onClick ? 'cursor-pointer' : ''} ${className}`} aria-label="Mid-Ama Promo">
      <span className={`ma-glass-type ${sizes[size]}`}><span>M</span><i>.</i><span>A</span><sup>™</sup></span>
      {showTagline && <span className="ma-wordmark-tagline">INDEPENDENT MUSIC. WORLDWIDE REACH.</span>}
    </div>
  );
};
