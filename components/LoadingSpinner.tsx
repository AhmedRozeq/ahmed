import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = "Analisi del testo in corso..." }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
       <svg width="60" height="60" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="text-sky-500">
        <style>{`.spinner_S1WN{animation:spinner_MGfb .8s linear infinite;animation-delay:-.8s}.spinner_Km9P{animation-delay:-.65s}.spinner_JApP{animation-delay:-.5s}@keyframes spinner_MGfb{93.75%,100%{opacity:0.2}}`}</style>
        <circle className="spinner_S1WN" cx="12" cy="3" r="3" fill="currentColor"/>
        <circle className="spinner_S1WN spinner_Km9P" cx="16.5" cy="7.5" r="3" fill="currentColor"/>
        <circle className="spinner_S1WN spinner_JApP" cx="12" cy="21" r="3" fill="currentColor"/>
        <circle className="spinner_S1WN" style={{animationDelay: '-.35s'}} cx="7.5" cy="16.5" r="3" fill="currentColor"/>
        <circle className="spinner_S1WN" style={{animationDelay: '-.2s'}} cx="3" cy="12" r="3" fill="currentColor"/>
       </svg>
      <p className="text-slate-700 font-semibold text-lg mt-2">{message}</p>
      <p className="text-sm text-slate-500 max-w-xs">L'IA sta analizzando il testo per trovare gemme linguistiche...</p>
    </div>
  );
};

export default LoadingSpinner;