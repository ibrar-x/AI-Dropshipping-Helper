import React from 'react';

export const EmptyStateIllustration: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    viewBox="0 0 256 256"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_105_2)">
      <rect width="256" height="256" rx="32" fill="#131314" />
      <circle cx="128" cy="128" r="100" fill="#1C1C1E" />
      <path
        d="M128 228C72.7715 228 28 183.228 28 128C28 72.7715 72.7715 28 128 28C183.228 28 228 72.7715 228 128C228 183.228 183.228 228 128 228Z"
        stroke="#333333"
        strokeWidth="4"
      />

      {/* Box */}
      <rect x="80" y="128" width="96" height="64" rx="8" fill="#2C2C2E" stroke="#6d28d9" strokeWidth="3" />
      <rect x="80" y="112" width="96" height="16" rx="4" fill="#2C2C2E" stroke="#6d28d9" strokeWidth="3" />

      {/* Camera */}
      <rect x="136" y="72" width="56" height="40" rx="6" fill="#2C2C2E" stroke="#9E9E9E" strokeWidth="3" />
      <circle cx="164" cy="92" r="10" fill="#1C1C1E" stroke="#9E9E9E" strokeWidth="3" />
      <rect x="144" y="66" width="12" height="6" rx="2" fill="#2C2C2E" stroke="#9E9E9E" strokeWidth="2" />

      {/* Plant */}
      <path d="M88 100 C 88 92, 80 88, 72 88" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" />
      <path d="M72 88 C 64 88, 60 96, 60 104" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" />
      <path d="M72 88 L 72 112" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" />
      <rect x="64" y="112" width="16" height="8" rx="2" fill="#9E9E9E" />
      
      {/* Sparkles */}
      <path d="M188 152 L 196 160" stroke="#EAEAEA" strokeWidth="2" strokeLinecap="round" />
      <path d="M192 148 L 192 164" stroke="#EAEAEA" strokeWidth="2" strokeLinecap="round" />
      <path d="M70 70 L 74 74" stroke="#EAEAEA" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M72 69 L 72 75" stroke="#EAEAEA" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M190 60 L 190 64" stroke="#EAEAEA" strokeWidth="1.5" strokeLinecap="round" />

    </g>
    <defs>
      <clipPath id="clip0_105_2">
        <rect width="256" height="256" rx="32" fill="white" />
      </clipPath>
    </defs>
  </svg>
);
