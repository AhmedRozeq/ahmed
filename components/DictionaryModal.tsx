import React, { useState, useEffect } from 'react';
import { generateItalianArabicDictionary } from '../services/geminiService';
import { DictionaryResult, DictionaryEntry } from '../types';
import LoadingSpinner from './LoadingSpinner';
import InfoIcon from './icons/InfoIcon';
import BookOpenIcon from './icons/BookOpenIcon';
import VolumeUpIcon from './icons/VolumeUpIcon';
import QuoteIcon from './icons/QuoteIcon';
import GlobeIcon from './icons/GlobeIcon';
import BookmarkIcon from './icons/BookmarkIcon';

interface DictionaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: string;
  cefrLevel: string;
  register: string;
  onSave: (entry: DictionaryEntry) => void;
  savedCollocationsSet: Set<string>;
}

const DictionaryModal: React.FC<DictionaryModalProps> = ({ isOpen, onClose, item, cefrLevel, register, onSave, savedCollocationsSet }) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DictionaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && item) {
      const fetchContent = async () => {
        setIsLoading(true);
        setResult(null);
        setError(null);
        try {
          const res = await generateItalianArabicDictionary(item, { cefrLevel, register });
          setResult(res);
        } catch (err: any) {
          setError(err.message || 'An error occurred');
        } finally {
          setIsLoading(false);
        }
      };
      fetchContent();
    }
  }, [isOpen, item, cefrLevel, register]);

  const handleAnimationEnd = () => {
    if (!isOpen) {
      setShouldRender(false);
    }
  };
  
  const handleSpeak = (text: string, lang: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
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
        className={`bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col ${isOpen ? 'animate-scale-in' : 'animate-scale-out'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-200/80 dark:border-slate-700/80">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BookOpenIcon className="w-5 h-5 text-teal-500" />
            Dizionario ITA-ARA: <span className="font-bold text-teal-600 dark:text-teal-400">"{item}"</span>
          </h2>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Chiudi modale">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>
        <div className="p-6 overflow-y-auto bg-slate-50/50 dark:bg-slate-800/50">
          {isLoading && <LoadingSpinner message="Ricerca nel dizionario..." />}
          {error && (
            <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-l-4 border-red-500 rounded-r-md flex items-center gap-3">
              <InfoIcon className="w-6 h-6 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {result && (
            <div className="space-y-6">
              {result.dizionario_tematico.map(group => group.voci.map((entry, index) => {
                const isSaved = savedCollocationsSet.has(entry.termine_italiano);
                return (
                  <div key={`${group.tema}-${index}`} className="bg-white dark:bg-slate-900/30 p-4 rounded-lg border border-slate-200/60 dark:border-slate-700/50">
                     <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b-2 border-slate-200/80 dark:border-slate-700/60">
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-sky-700 dark:text-sky-400">{entry.termine_italiano}</h3>
                            <button onClick={() => onSave(entry)} aria-label={isSaved ? "Rimuovi dal deck" : "Aggiungi al deck"} className={`p-2 rounded-full transition-colors ${isSaved ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-600' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500'}`}><BookmarkIcon className="w-5 h-5" isSaved={isSaved} /></button>
                        </div>
                        <div className="flex items-center gap-3 text-right" dir="rtl">
                            <h4 className="text-xl font-bold text-teal-600 dark:text-teal-400" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>{entry.traduzione_arabo}</h4>
                            <button onClick={() => handleSpeak(entry.traduzione_arabo, 'ar-SA')} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-teal-600 dark:hover:text-teal-400 transition-colors" aria-label="Ascolta pronuncia araba"><VolumeUpIcon className="w-6 h-6" /></button>
                        </div>
                    </div>
                     <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="space-y-3">
                            <p className="text-slate-600 dark:text-slate-300"><strong className="font-semibold text-slate-700 dark:text-slate-200">Definizione:</strong> {entry.definizione_italiano}</p>
                            <p className="text-slate-600 dark:text-slate-300 italic">"{entry.esempio_italiano}"</p>
                        </div>
                        <div className="space-y-3 text-right" dir="rtl">
                            <p className="text-slate-600 dark:text-slate-300"><strong className="font-semibold text-slate-700 dark:text-slate-200">التعريف:</strong> <span style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>{entry.definizione_arabo}</span></p>
                            <p className="text-slate-600 dark:text-slate-300 italic" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>"{entry.esempio_arabo}"</p>
                        </div>
                    </div>
                     <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3">
                        <GlobeIcon className="w-5 h-5 text-indigo-500 mt-1 flex-shrink-0"/>
                        <p className="text-sm text-slate-600 dark:text-slate-400"><strong className="font-semibold text-slate-700 dark:text-slate-200">Contesto:</strong> {entry.contesto_culturale}</p>
                    </div>
                    <p className="text-xs text-right text-slate-500 dark:text-slate-400 mt-3">{entry.pronuncia_arabo}</p>
                  </div>
                );
              }))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DictionaryModal;