import React from 'react';

interface LoadingSpinnerProps {
  message?: string | null;
  size?: 'sm' | 'md' | 'lg';
  details?: string | null;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = "Analisi in corso...", 
  size = 'md',
  details 
}) => {
  const sizeMap = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };
  const currentSize = sizeMap[size];

  return (
    <div className={`flex flex-col items-center justify-center gap-4 text-center p-4 text-indigo-500`}>
       <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${currentSize} animate-spin`}
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      {message && <p className="text-gray-700 dark:text-gray-200 font-semibold text-base mt-1">{message}</p>}
      {details && <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">{details}</p>}
    </div>
  );
};

export default LoadingSpinner;
