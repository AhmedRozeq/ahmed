import React, { useState, useEffect } from 'react';
import { getCulturalContext } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import InfoIcon from './icons/InfoIcon';
import MarkdownDisplay from './MarkdownDisplay';
import GlobeIcon from './icons/GlobeIcon';

interface CulturalContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  expression: string;
}

const CulturalContextModal: React.FC<CulturalContextModalProps> = ({ isOpen, onClose, expression }) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && expression) {
      const fetchContent = async () => {
        setIsLoading(true);
        setContent(null);
        setError(null);
        try {
          const result = await getCulturalContext(expression);
          setContent(result);
        } catch (err: any) {
          setError(err.message || 'An error occurred');
        } finally {
          setIsLoading(false);
        }
      };
      fetchContent();
    }
  }, [isOpen, expression]);

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
    >
      <div
        className={`bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col ${isOpen ? 'animate-scale-in' : 'animate-scale-out'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-200/80 dark:border-slate-700/80">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <GlobeIcon className="w-5 h-5 text-teal-500" />
            Approfondimento Culturale: <span className="font-bold text-teal-600 dark:text-teal-400">"{expression}"</span>
          </h2>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Chiudi modale">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>
        <div className="p-6 overflow-y-auto bg-slate-50/50 dark:bg-slate-800/50">
          {isLoading && <LoadingSpinner message="Ricerca contesto culturale..." />}
          {error && (
            <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-l-4 border-red-500 rounded-r-md flex items-center gap-3">
              <InfoIcon className="w-6 h-6 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {content && <MarkdownDisplay content={content} title="" />}
        </div>
      </div>
    </div>
  );
};

export default CulturalContextModal;