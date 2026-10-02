import type React from 'react';

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 32, showText = true, className = '' }) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Icon Badge */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        className="shrink-0 transition-transform duration-200 hover:scale-105"
        aria-label="Renovix"
      >
        <defs>
          <linearGradient id="logoAmber" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
        </defs>

        {/* Background Tile */}
        <rect width="64" height="64" rx="16" fill="#1C1917" />
        <rect x="1" y="1" width="62" height="62" rx="15" fill="none" stroke="#292524" strokeWidth="1.5" />

        {/* House Outline */}
        <path
          d="M32 13 L49 27.5 V49 C49 50.1 48.1 51 47 51 H17 C15.9 51 15 50.1 15 49 V27.5 L32 13 Z"
          fill="none"
          stroke="url(#logoAmber)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Door Anchor */}
        <path
          d="M26 51 V35 C26 33.9 26.9 33 28 33 H36 C37.1 33 38 33.9 38 35 V51"
          fill="none"
          stroke="url(#logoAmber)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Brand Wordmark */}
      {showText && (
        <div className="flex flex-col leading-none gap-0.5">
          <span className="font-bold tracking-wider text-sm text-zinc-100 uppercase">
            Renovix
          </span>
          <span className="text-[10px] tracking-widest uppercase text-zinc-500 font-medium">
            3D Spatial Studio
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;