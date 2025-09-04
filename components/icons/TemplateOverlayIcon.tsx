
import React from 'react';

export const TemplateOverlayIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    {...props}
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="24" height="24" rx="2" fill="currentColor" opacity="0.2"/>
    <rect x="4" y="9" width="16" height="2" rx="1" fill="currentColor"/>
    <rect x="7" y="13" width="10" height="2" rx="1" fill="currentColor"/>
  </svg>
);
