import React, { useState, useEffect } from 'react';
import { Collocation } from '../types';
import LoadingSpinner from './LoadingSpinner';
import InfoIcon from './icons/InfoIcon';
import WandIcon from './icons/WandIcon';
import MarkdownDisplay from './MarkdownDisplay';

interface DeepDiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  content: string | null;
  collocation: Collocation | null;
  error: string | null;
}

const DeepDiveModal: React.FC<DeepDiveModalProps> = ({ isOpen, onClose, isLoading, content, collocation, error }) => {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    }
  }, [isOpen]);

  const handleAnimationEnd = () => {
    if (!isOpen) {
      setShouldRender(false);
    }
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${isOpen ? 'animate-fade-in' : 'animate-fade-out'}`}
      onClick={onClose}
      onAnimationEnd={handleAnimationEnd}
      role="dialog"
      aria-modal="true"
      aria-labelledby="deepdive-title"
    >
      <div
        className={`bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col ${isOpen ? 'animate-scale-in' : 'animate-scale-out'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0">
          <h2 id="deepdive-title" className="text-lg font-semibold text-slate-800 truncate flex items-center gap-2">
            <WandIcon className="w-5 h-5 text-sky-500" />
            Approfondimento: <span className="text-sky-600 font-bold">"{collocation?.voce}"</span>
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 p-1 rounded-full hover:bg-slate-100"
            aria-label="Chiudi modale"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>

        <div className="p-6 overflow-y-auto bg-slate-50/50">
          {isLoading && <LoadingSpinner message="Generazione approfondimento in corso..." />}
          {error && (
            <div className="p-4 bg-red-100 text-red-800 border-l-4 border-red-500 rounded-r-md flex items-center gap-3">
              <InfoIcon className="w-6 h-6 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {content && (
              <MarkdownDisplay content={content} title="" />
          )}
        </div>
      </div>
    </div>
  );
};

export default DeepDiveModal;
