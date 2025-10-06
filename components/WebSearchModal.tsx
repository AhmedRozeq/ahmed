
import React, { useState, useEffect } from 'react';
import { generateText } from '../services/geminiService';
import GlobeIcon from './icons/GlobeIcon';
import LoadingSpinner from './LoadingSpinner';
import InfoIcon from './icons/InfoIcon';

interface WebSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTextGenerated: (text: string) => void;
  cefrLevel: string;
  register: string;
}

const WebSearchModal: React.FC<WebSearchModalProps> = ({ isOpen, onClose, onTextGenerated, cefrLevel, register }) => {
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const handleSearch = async () => {
    if (!topic.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const generatedText = await generateText({ cefrLevel, topic, useSearch: true, register });
      onTextGenerated(generatedText);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Si è verificato un errore sconosciuto.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${isOpen ? 'animate-fade-in' : 'animate-fade-out'}`}
      onClick={onClose}
      onAnimationEnd={handleAnimationEnd}
      role="dialog"
      aria-modal="true"
      aria-labelledby="websearch-title"
    >
      <div
        className={`bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-lg ${isOpen ? 'animate-scale-in' : 'animate-scale-out'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-200/80 dark:border-slate-700/80">
          <h2 id="websearch-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <GlobeIcon className="w-5 h-5 text-sky-500" />
            Cerca Testo di Esempio dal Web
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label="Chiudi modale"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>
        <div className="p-6">
          {isLoading ? (
            <LoadingSpinner message="Ricerca e generazione in corso..." />
          ) : (
            <div className="space-y-4">
              <p className="text-slate-600 dark:text-slate-300">Inserisci un argomento e l'IA genererà un breve testo informativo basato su risultati di ricerca web.</p>
              <div>
                <label htmlFor="topic-input" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Argomento
                </label>
                <input
                  id="topic-input"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                  placeholder="Es. 'intelligenza artificiale in Italia'"
                  className="w-full p-2.5 border border-slate-300/80 dark:border-slate-600/80 rounded-lg bg-white/60 dark:bg-slate-900/40 focus:ring-2 focus:ring-sky-500"
                />
              </div>
              {error && (
                <div className="p-3 bg-red-100/80 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-l-4 border-red-500 rounded-r-md flex items-center gap-2 text-sm">
                  <InfoIcon className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSearch}
                  disabled={!topic.trim()}
                  className="px-6 py-2 text-sm font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Cerca e Genera
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebSearchModal;