import React, { useState, useEffect } from 'react';
import { improveSentence } from '../services/geminiService';
import { ImprovedSentenceResult } from '../types';
import LoadingSpinner from './LoadingSpinner';
import InfoIcon from './icons/InfoIcon';
import WandIcon from './icons/WandIcon';
import SparklesIcon from './icons/SparklesIcon';

interface SentenceImproverModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTargetCollocation?: string;
  cefrLevel: string;
}

const SentenceImproverModal: React.FC<SentenceImproverModalProps> = ({ isOpen, onClose, initialTargetCollocation, cefrLevel }) => {
  const [sentence, setSentence] = useState('');
  const [targetCollocation, setTargetCollocation] = useState('');
  const [register, setRegister] = useState('Neutro');
  const [localCefrLevel, setLocalCefrLevel] = useState(cefrLevel);
  const [result, setResult] = useState<ImprovedSentenceResult | null>(null);
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

  useEffect(() => {
    if (isOpen) {
        setTargetCollocation(initialTargetCollocation || '');
        setSentence('');
        setResult(null);
        setError(null);
        setRegister('Neutro');
        setLocalCefrLevel(cefrLevel);
    }
  }, [isOpen, initialTargetCollocation, cefrLevel]);

  if (!shouldRender) return null;

  const handleImprove = async () => {
    if (!sentence.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await improveSentence(sentence, targetCollocation, localCefrLevel, register);
      setResult(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Si è verificato un errore.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const highlightCollocation = (text: string, collocation: string) => {
    if (!collocation) return text;
    const parts = text.split(new RegExp(`(${collocation})`, 'gi'));
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === collocation.toLowerCase() ? (
            <span key={index} className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold rounded px-1 py-0.5">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${isOpen ? 'animate-fade-in' : 'animate-fade-out'}`}
      onClick={onClose}
      onAnimationEnd={handleAnimationEnd}
      role="dialog"
      aria-modal="true"
      aria-labelledby="improver-title"
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col ${isOpen ? 'animate-scale-in' : 'animate-scale-out'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-200/80 dark:border-gray-700/80 flex-shrink-0">
          <h2 id="improver-title" className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <WandIcon className="w-5 h-5 text-indigo-500" />
            Migliora una Frase
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Chiudi modale"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>

        <div className="p-6 overflow-y-auto space-y-4">
          <div>
            <label htmlFor="sentence-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Scrivi la frase che vuoi migliorare
            </label>
            <textarea
              id="sentence-input"
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              placeholder="Es. 'Ho fatto una scelta importante.'"
              className="w-full h-24 p-2 bg-white/60 dark:bg-gray-900/40 border border-gray-300/80 dark:border-gray-700/60 rounded-lg shadow-inner focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="collocation-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Usa una collocazione specifica (opzionale)
                </label>
                <input
                  id="collocation-input"
                  type="text"
                  value={targetCollocation}
                  onChange={(e) => setTargetCollocation(e.target.value)}
                  placeholder="Es. 'prendere una decisione'"
                  className="w-full p-2 bg-white/60 dark:bg-gray-900/40 border border-gray-300/80 dark:border-gray-700/60 rounded-lg shadow-inner focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
              <div>
                <label htmlFor="cefr-level-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Livello Linguistico (QCER)
                </label>
                <select id="cefr-level-select" value={localCefrLevel} onChange={(e) => setLocalCefrLevel(e.target.value)} className="w-full p-2 bg-white/60 dark:bg-gray-900/40 border border-gray-300/80 dark:border-gray-700/60 rounded-lg shadow-inner focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200">
                    <option value="A1">A1 (Principiante)</option>
                    <option value="A2">A2 (Elementare)</option>
                    <option value="B1">B1 (Intermedio)</option>
                    <option value="B2">B2 (Intermedio-Avanzato)</option>
                    <option value="C1">C1 (Avanzato)</option>
                    <option value="C2">C2 (Padronanza)</option>
                </select>
              </div>
               <div>
                <label htmlFor="register-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Registro
                </label>
                <select id="register-select" value={register} onChange={(e) => setRegister(e.target.value)} className="w-full p-2 bg-white/60 dark:bg-gray-900/40 border border-gray-300/80 dark:border-gray-700/60 rounded-lg shadow-inner focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200">
                    <option value="Neutro">Neutro</option>
                    <option value="Formale">Formale</option>
                    <option value="Informale">Informale</option>
                    <option value="Giornalistico">Giornalistico</option>
                    <option value="Letterario">Letterario</option>
                    <option value="Burocratico">Burocratico</option>
                </select>
              </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleImprove}
              disabled={isLoading || !sentence.trim()}
              className="px-6 py-2 text-base font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? 'Miglioro...' : 'Migliora'}
              <SparklesIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200/80 dark:border-gray-700/80">
            {isLoading && <LoadingSpinner message="L'IA sta riscrivendo la tua frase..." />}
            {error && (
              <div className="p-4 bg-red-100/80 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-l-4 border-red-500 rounded-r-md flex items-center gap-3">
                <InfoIcon className="w-6 h-6 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {result && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">Frase Migliorata:</h3>
                  <p className="mt-2 text-lg text-gray-800 dark:text-gray-100 p-3 bg-gray-50 dark:bg-gray-900/40 rounded-md">
                    {highlightCollocation(result.improved_sentence, result.collocation_used)}
                  </p>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">Spiegazione:</h3>
                  <p className="mt-1 text-base text-gray-600 dark:text-gray-300">
                    {result.explanation}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SentenceImproverModal;