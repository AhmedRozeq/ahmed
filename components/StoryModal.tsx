import React, { useState, useEffect } from 'react';
import { generateStoryForCollocation } from '../services/geminiService';
import { StoryResult, Collocation } from '../types';
import LoadingSpinner from './LoadingSpinner';
import InfoIcon from './icons/InfoIcon';
import BookTextIcon from './icons/BookTextIcon';

interface StoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  collocation: Collocation | null;
  initialCefrLevel: string;
  initialRegister: string;
}

const StoryModal: React.FC<StoryModalProps> = ({ isOpen, onClose, collocation, initialCefrLevel, initialRegister }) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  
  // Internal state
  const [storyData, setStoryData] = useState<StoryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [cefrLevel, setCefrLevel] = useState(initialCefrLevel);
  const [register, setRegister] = useState(initialRegister);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Reset state on open
      setStoryData(null);
      setIsLoading(false);
      setError(null);
      setTopic(collocation?.voce || '');
      setCefrLevel(initialCefrLevel);
      setRegister(initialRegister);
    }
  }, [isOpen, collocation, initialCefrLevel, initialRegister]);

  const handleAnimationEnd = () => {
    if (!isOpen) {
      setShouldRender(false);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;

    setIsLoading(true);
    setError(null);
    setStoryData(null);
    
    const collocationForApi: Collocation = { 
        voce: topic, 
        spiegazione: `Una storia che usa la frase "${topic}"`, 
        frase_originale: '' 
    };

    try {
      const data = await generateStoryForCollocation(collocationForApi, { cefrLevel, register });
      setStoryData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Si è verificato un errore sconosciuto.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!shouldRender) return null;

  return (
    <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${isOpen ? 'animate-fade-in' : 'animate-fade-out'}`} onClick={onClose} onAnimationEnd={handleAnimationEnd} role="dialog" aria-modal="true">
      <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col ${isOpen ? 'animate-scale-in' : 'animate-scale-out'}`} onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-slate-200/80 dark:border-slate-700/80 flex-shrink-0">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 truncate flex items-center gap-2">
            <BookTextIcon className="w-5 h-5 text-emerald-500" />
            Crea una Storia
          </h2>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Chiudi modale"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </header>
        <div className="p-6 overflow-y-auto">
          {isLoading && <LoadingSpinner message="L'IA sta scrivendo la storia..." />}
          {error && <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-l-4 border-red-500 rounded-r-md flex items-center gap-3"><InfoIcon className="w-6 h-6" /><span>{error}</span></div>}
          
          {!isLoading && !error && !storyData && (
             <div className="space-y-4">
                <p className="text-slate-600 dark:text-slate-300">Inserisci una collocazione per generare una breve storia che la contestualizzi.</p>
                <div>
                    <label htmlFor="topic-input-story" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Collocazione</label>
                    <input id="topic-input-story" type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Es. 'avere un asso nella manica'" className="w-full p-2.5 border border-slate-300/80 dark:border-slate-600/80 rounded-lg bg-white/60 dark:bg-slate-900/40 focus:ring-2 focus:ring-sky-500"/>
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="cefr-level-story" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Livello</label>
                        <select id="cefr-level-story" value={cefrLevel} onChange={e => setCefrLevel(e.target.value)} className="w-full p-2.5 border border-slate-300/80 dark:border-slate-600/80 rounded-lg bg-white/60 dark:bg-slate-900/40 focus:ring-2 focus:ring-sky-500">
                            <option value="A1">A1 (Principiante)</option>
                            <option value="A2">A2 (Elementare)</option>
                            <option value="B1">B1 (Intermedio)</option>
                            <option value="B2">B2 (Intermedio-Avanzato)</option>
                            <option value="C1">C1 (Avanzato)</option>
                            <option value="C2">C2 (Padronanza)</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="register-story" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Registro</label>
                        <select id="register-story" value={register} onChange={e => setRegister(e.target.value)} className="w-full p-2.5 border border-slate-300/80 dark:border-slate-600/80 rounded-lg bg-white/60 dark:bg-slate-900/40 focus:ring-2 focus:ring-sky-500">
                            <option value="Neutro">Neutro</option>
                            <option value="Formale">Formale</option>
                            <option value="Informale">Informale</option>
                            <option value="Giornalistico">Giornalistico</option>
                            <option value="Letterario">Letterario</option>
                        </select>
                    </div>
                </div>
                <div className="flex justify-end pt-2">
                    <button onClick={handleGenerate} disabled={!topic.trim()} className="px-6 py-2 text-base font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:bg-slate-400">Crea Storia</button>
                </div>
            </div>
          )}

          {storyData && (
            <div className="animate-fade-in space-y-4">
                <p className="text-lg text-slate-800 dark:text-slate-200 leading-relaxed italic bg-slate-50 dark:bg-slate-700/50 p-4 rounded-md border border-slate-200/60 dark:border-slate-600/60">
                    "{storyData.story}"
                </p>
                <div className="flex justify-end">
                    <button onClick={() => { setStoryData(null); setTopic(''); }} className="px-5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">
                        Creane un'altra
                    </button>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryModal;