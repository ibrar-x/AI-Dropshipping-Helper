import React from 'react';

export const LogoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    width="48"
    height="48"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="48" height="48" rx="12" fill="#2C2C2E" />
    <path
      d="M24.0002 14.6667C20.0835 14.6667 16.5835 16.5 14.6668 19.4167M24.0002 14.6667C27.9168 14.6667 31.4168 16.5 33.3335 19.4167M24.0002 14.6667V24M33.3335 19.4167C35.2502 22.3333 34.5002 26.25 32.2502 28.5C30.0002 30.75 26.5002 31.5 24.0002 30.25M33.3335 19.4167L24.0002 24M14.6668 19.4167C12.7502 22.3333 13.5002 26.25 15.7502 28.5C18.0002 30.75 21.5002 31.5 24.0002 30.25M14.6668 19.4167L24.0002 24M24.0002 30.25V33.3333"
      stroke="#EAEAEA"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);