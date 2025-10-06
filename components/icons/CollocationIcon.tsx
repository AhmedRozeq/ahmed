import React from 'react';

const CollocationIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    {/* Top-left block */}
    <path d="M10 3H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1Z" />
    {/* Interlocking part of top-left block */}
    <path d="M8 11V8a2 2 0 1 1 4 0v3" />
    
    {/* Bottom-right block */}
    <path d="M20 13h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1Z" />
     {/* Interlocking part of bottom-right block */}
    <path d="M12 13v3a2 2 0 1 0 4 0v-3" />
  </svg>
);

export default CollocationIcon;
