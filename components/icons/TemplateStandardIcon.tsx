
import React from 'react';

export const TemplateStandardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="24" height="24" rx="2" fill="currentColor" opacity="0.2"/>
    <rect x="6" y="5" width="12" height="2" rx="1" fill="currentColor"/>
    <rect x="8" y="17" width="8" height="3" rx="1.5" fill="currentColor"/>
  </svg>
);
