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
    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A3 3 0 1 0 12 18Z" />
    <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A3 3 0 1 1 12 18Z" />
    <path d="M12 2a3 3 0 1 0 0 6 3 3 0 1 0 0-6Z" />
    <path d="M4.5 10.5a3 3 0 1 0 0 6 3 3 0 1 0 0-6Z" />
    <path d="M19.5 10.5a3 3 0 1 0 0 6 3 3 0 1 0 0-6Z" />
  </svg>
);

export default BrainIcon;
