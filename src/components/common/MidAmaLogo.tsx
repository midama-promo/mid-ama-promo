import React from 'react';

interface MidAmaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'badge' | 'full' | 'icon';
  showSubtitle?: boolean;
}

export const MidAmaLogo: React.FC<MidAmaLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'badge',
  showSubtitle = false,
}) => {
  const sizeMap = {
    sm: { px: 40, textSize: 'text-base', subSize: 'text-[9px]' },
    md: { px: 60, textSize: 'text-xl', subSize: 'text-xs' },
    lg: { px: 96, textSize: 'text-2xl', subSize: 'text-sm' },
    xl: { px: 144, textSize: 'text-4xl', subSize: 'text-base' },
  };

  const { px } = sizeMap[size];

  // Geometrically centered and aligned emblem badge
  const badgeSvg = (
    <svg
      viewBox="0 0 500 500"
      width={px}
      height={px}
      className="shrink-0 transition-transform duration-300 hover:scale-105 select-none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="midAmaBgGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#181215" stopOpacity="0.8" />
          <stop offset="70%" stopColor="#0a0a0c" stopOpacity="1" />
          <stop offset="100%" stopColor="#040405" stopOpacity="1" />
        </radialGradient>
      </defs>

      {/* Base Badge Circle */}
      <circle cx="250" cy="250" r="238" fill="url(#midAmaBgGlow)" stroke="#27272a" strokeWidth="2.5" />
      <circle cx="250" cy="250" r="230" stroke="#e52535" strokeOpacity="0.2" strokeWidth="1" />

      {/* TOP ARCS (Symmetrically balanced around X=250) */}
      {/* Outer White Arc Top */}
      <path
        d="M 92.5 151.5 A 186 186 0 0 1 407.5 151.5"
        stroke="#ffffff"
        strokeWidth="11"
        strokeLinecap="round"
      />
      {/* Inner Red Arc Top */}
      <path
        d="M 106 160 A 170 170 0 0 1 394 160"
        stroke="#e52535"
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* BOTTOM ARCS (Symmetrically balanced around X=250) */}
      {/* Inner Red Arc Bottom */}
      <path
        d="M 106 340 A 170 170 0 0 0 394 340"
        stroke="#e52535"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      {/* Outer White Arc Bottom */}
      <path
        d="M 92.5 348.5 A 186 186 0 0 0 407.5 348.5"
        stroke="#ffffff"
        strokeWidth="11"
        strokeLinecap="round"
      />

      {/* CENTER TYPOGRAPHY: Mid-Ama */}
      {/* Dominant-baseline central and text-anchor middle ensure absolute center alignment */}
      <text
        x="248"
        y="242"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Outfit', 'Space Grotesk', 'Montserrat', -apple-system, sans-serif"
        fontWeight="900"
        fontSize="68"
        fontStyle="italic"
        letterSpacing="-1.5"
      >
        <tspan fill="#ffffff">Mid-</tspan>
        <tspan fill="#e52535">Ama</tspan>
      </text>

      {/* PROMO ROW (Left Red Bar — P R O M O — Right Red Bar) */}
      {/* Left Red Accent Bar */}
      <rect x="95" y="295" width="85" height="5" fill="#e52535" rx="2.5" />

      {/* PROMO in Tracked White Text */}
      <text
        x="250"
        y="298"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#ffffff"
        fontFamily="'Outfit', 'Space Grotesk', 'Montserrat', sans-serif"
        fontWeight="900"
        fontSize="19"
        letterSpacing="10"
      >
        PROMO
      </text>

      {/* Right Red Accent Bar */}
      <rect x="320" y="295" width="85" height="5" fill="#e52535" rx="2.5" />
    </svg>
  );

  if (variant === 'badge' || variant === 'icon') {
    return <div className={`inline-flex items-center justify-center shrink-0 ${className}`}>{badgeSvg}</div>;
  }

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {badgeSvg}
      <div className="flex flex-col">
        <div className="flex items-center tracking-tight font-black uppercase text-xl leading-none">
          <span className="text-white italic">MID-</span>
          <span className="text-red-500 italic">AMA</span>
          <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30 font-semibold tracking-wider">
            PROMO
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium mt-1">
            Midnight-Amapiano Distro
          </span>
        )}
      </div>
    </div>
  );
};
