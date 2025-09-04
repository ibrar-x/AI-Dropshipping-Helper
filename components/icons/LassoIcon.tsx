import React from 'react';

export const LassoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="M11 21H8a2 2 0 0 1-2-2v-3" />
    <path d="M20 13v3a2 2 0 0 1-2 2h-1" />
    <path d="M3 13V8a2 2 0 0 1 2-2h3" />
    <path d="M13 3h3a2 2 0 0 1 2 2v1" />
    <path d="M15 9.3a1.5 1.5 0 0 1-1-1.4 1.5 1.5 0 0 1 1-1.4 1.5 1.5 0 0 1 1.6.8 1.5 1.5 0 0 1 .4 1.2 1.5 1.5 0 0 1-2 1.3" />
    <path d="M20.2 11c-.1-.5-.4-1-.7-1.3-.5-.5-1.2-.8-1.9-.8-1.5 0-2.8 1.2-2.8 2.8 0 1.2.8 2.3 2 2.7.7.3 1.5.3 2.2.1.7-.2 1.3-.7 1.7-1.3.3-.5.5-1.1.5-1.7 0-.5-.1-1-.3-1.4" />
  </svg>
);