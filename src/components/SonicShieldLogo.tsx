import React from 'react';

interface SonicShieldLogoProps {
  size?: number;
  className?: string;
}

export const SonicShieldLogo: React.FC<SonicShieldLogoProps> = ({ size = 34, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Vaak PingTalk Sonic-Shield Logo"
    >
      <defs>
        <linearGradient id="vaakShieldGrad" x1="6" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="vaakCoreGrad" x1="12" y1="10" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="100%" stopColor="#60A5FA" />
        </linearGradient>
      </defs>
      {/* Outer protective shield */}
      <path
        d="M20 3.2L6.5 8.6V18.8C6.5 27.3 12.25 34.7 20 37.2C27.75 34.7 33.5 27.3 33.5 18.8V8.6L20 3.2Z"
        fill="#0F172A"
        stroke="url(#vaakShieldGrad)"
        strokeWidth="2.2"
      />
      {/* Inner resonant sonic arcs */}
      <path
        d="M13.5 14.5C11.6 16.9 11.6 21.1 13.5 23.5"
        stroke="#60A5FA"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M26.5 14.5C28.4 16.9 28.4 21.1 26.5 23.5"
        stroke="#60A5FA"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Central Vaak sonic pulse crest */}
      <path
        d="M16.5 16.2L20 25.4L23.5 16.2"
        stroke="url(#vaakCoreGrad)"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="12.2" r="1.8" fill="#38BDF8" />
    </svg>
  );
};
