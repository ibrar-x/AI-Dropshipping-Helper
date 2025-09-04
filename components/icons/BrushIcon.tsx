import React from 'react';

export const BrushIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9.06 11.9 16 5.01l4 4-6.91 6.89a2.12 2.12 0 0 1-3 0l-1.08-1.08a2.12 2.12 0 0 1 0-3Z" />
    <path d="m7.01 15.9-4.02-4.02a2.12 2.12 0 0 1 0-3l1.08-1.08a2.12 2.12 0 0 1 3 0l6.9 6.9" />
  </svg>
);