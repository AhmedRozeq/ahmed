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
    <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
    <path d="m18 2 4 4-4 4" />
    <path d="M2 6h1.4c1.3 0 2.5.6 3.3 1.7l2.1 3" />
    <path d="m18 22-4-4 4-4" />
    <path d="M14 12.3 7.7 20.3c-.8 1.1-2 1.7-3.3 1.7H2" />
  </svg>
);

export default ShuffleIcon;