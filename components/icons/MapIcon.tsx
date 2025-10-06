import React from 'react';

const MapIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="5" r="3" />
    <circle cx="5" cy="12" r="3" />
    <circle cx="19" cy="12" r="3" />
    <circle cx="12" cy="19" r="3" />
    <path d="m12 8-3.5 1" />
    <path d="m12 8 3.5 1" />
    <path d="m12 16 3.5-1" />
    <path d="m12 16-3.5-1" />
    <path d="M8.5 12.5 5 12" />
    <path d="m15.5 12.5 3.5-.5" />
  </svg>
);

export default MapIcon;