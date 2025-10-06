import React from 'react';

const WandIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="M15 4V2" />
    <path d="M15 8V6" />
    <path d="M15 12v-2" />
    <path d="m3 15 2.5-2.5" />
    <path d="M15 22v-4" />
    <path d="m21 9-2.5 2.5" />
    <path d="M9 15H3" />
    <path d="M21 9h-6" />
    <path d="M9 3v6" />
    <path d="M15 22a3 3 0 0 0 3-3" />
    <path d="M15 6a3 3 0 0 0-3-3" />
    <path d="M3 15a3 3 0 0 0 3 3" />
    <path d="M21 9a3 3 0 0 0-3-3" />
  </svg>
);

export default WandIcon;