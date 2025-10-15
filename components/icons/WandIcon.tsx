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
    <path d="M15 22v-2" />
    <path d="M12.07 4.93 10 7" />
    <path d="M14 14.07 12 12" />
    <path d="M7 10 4.93 12.07" />
    <path d="M12 12 10 14" />
    <path d="M22 15h-2" />
    <path d="M4 15H2" />
    <path d="m19.07 19.07-1.414 1.414" />
    <path d="m6.343 6.343-1.414 1.414" />
    <path d="m19.07 4.93-1.414-1.414" />
    <path d="m6.343 17.657-1.414-1.414" />
    <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
    <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" />
  </svg>
);

export default WandIcon;
