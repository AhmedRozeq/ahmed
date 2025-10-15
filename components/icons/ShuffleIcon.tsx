import React from 'react';

const ShuffleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <polyline points="16 3 21 3 21 8" />
    <line x1="4" x2="21" y1="20" y2="3" />
    <polyline points="16 21 21 21 21 16" />
    <line x1="15" x2="21" y1="15" y2="21" />
    <line x1="4" x2="9" y1="4" y2="9" />
  </svg>
);

export default ShuffleIcon;
