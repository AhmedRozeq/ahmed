import React from 'react';

const BrainIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v0a2.5 2.5 0 0 1-2.5 2.5h-1A2.5 2.5 0 0 1 6 4.5v0A2.5 2.5 0 0 1 8.5 2h1Z" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v0a2.5 2.5 0 0 0 2.5 2.5h1A2.5 2.5 0 0 0 18 4.5v0A2.5 2.5 0 0 0 15.5 2h-1Z" />
    <path d="M6 10a2.5 2.5 0 0 1 0 5h.5A2.5 2.5 0 0 0 9 12.5v0A2.5 2.5 0 0 0 6.5 10h-.5Z" />
    <path d="M18 10a2.5 2.5 0 0 0 0 5h-.5A2.5 2.5 0 0 1 15 12.5v0A2.5 2.5 0 0 1 17.5 10h.5Z" />
    <path d="M6 16.5A2.5 2.5 0 0 1 8.5 19v0a2.5 2.5 0 0 1 2.5 2.5h1A2.5 2.5 0 0 0 14.5 19v0a2.5 2.5 0 0 0-2.5-2.5h-1A2.5 2.5 0 0 1 8.5 14h-1A2.5 2.5 0 0 0 5 16.5v0Z" />
  </svg>
);

export default BrainIcon;
