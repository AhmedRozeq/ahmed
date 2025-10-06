import React, { useState, useEffect } from 'react';
import { GeneratedCardData } from '../types';
import { generateCollocationCard } from '../services/geminiService';
import PlusCircleIcon from './icons/PlusCircleIcon';
import LoadingSpinner from './LoadingSpinner';
import InfoIcon from './icons/InfoIcon';

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: string;
  onSave: (cardData: GeneratedCardData & { notes: string; tags: string[] }) => void;
}

const AddCardModal: React.FC<AddCardModalProps> = ({ isOpen, onClose, topic, onSave }) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [status, setStatus] = useState<'loading' | 'confirm' | 'error'>('loading');
  const [generatedData, setGeneratedData] = useState<GeneratedCardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');

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
    if (isOpen && topic) {
      const createCard = async () => {
        setStatus('loading');
        setError(null);
        setGeneratedData(null);
        setNotes('');
        setTags('');
        try {
          const data = await generateCollocationCard(topic);
          setGeneratedData(data);
          setStatus('confirm');
        } catch (err) {
          const message = err instanceof Error ? err.message : "Si è verificato un errore sconosciuto.";
          setError(message);
          setStatus('error');
        }
      };
      createCard();
    }
  }, [isOpen, topic]);

  const handleConfirm = () => {
    if (!generatedData) return;
    const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
    onSave({
        ...generatedData,
        notes,
        tags: tagArray,
    });
    onClose();
  };

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${isOpen ? 'animate-fade-in' : 'animate-fade-out'}`}
      onClick={onClose}
      onAnimationEnd={handleAnimationEnd}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col ${isOpen ? 'animate-scale-in' : 'animate-scale-out'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-200/80 dark:border-slate-700/80 flex-shrink-0">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <PlusCircleIcon className="w-5 h-5 text-emerald-500" />
            Aggiungi al Deck
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label="Chiudi modale"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>
        <div className="p-6 overflow-y-auto">
          {status === 'loading' && <LoadingSpinner message={`Creazione scheda per "${topic}"...`} />}
          {status === 'error' && (
            <div>
              <div className="p-4 bg-red-100/80 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-l-4 border-red-500 rounded-r-md flex items-center gap-3">
                <InfoIcon className="w-6 h-6 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <div className="mt-4 flex justify-end">
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-200/70 dark:bg-slate-700/70 rounded-md hover:bg-slate-300/70 dark:hover:bg-slate-600/70">
                  Chiudi
                </button>
              </div>
            </div>
          )}
          {status === 'confirm' && generatedData && (
            <div className="space-y-4 animate-fade-in">
                <div className="bg-slate-50/70 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{generatedData.voce}</h3>
                  <p className="mt-2 text-base text-slate-600 dark:text-slate-300">{generatedData.spiegazione}</p>
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 italic border-l-2 border-slate-300/80 dark:border-slate-600/80 pl-3">
                    "{generatedData.frase_originale}"
                  </p>
                  <div className="mt-4 text-xs font-semibold uppercase text-sky-700 dark:text-sky-300 bg-sky-100/70 dark:bg-sky-500/10 px-2 py-1 rounded-full inline-block">
                    {generatedData.tema}
                  </div>
                </div>
              
                <div>
                    <label htmlFor="card-notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Note Personali (Opzionale)</label>
                    <textarea id="card-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full p-2 border border-slate-300/80 dark:border-slate-600/80 rounded-md bg-white/60 dark:bg-slate-900/40 focus:ring-2 focus:ring-emerald-500" placeholder="Aggiungi un promemoria o un esempio..."/>
                </div>
                <div>
                    <label htmlFor="card-tags" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tag (Opzionale, separati da virgola)</label>
                    <input id="card-tags" type="text" value={tags} onChange={(e) => setTags(e.target.value)} className="w-full p-2 border border-slate-300/80 dark:border-slate-600/80 rounded-md bg-white/60 dark:bg-slate-900/40 focus:ring-2 focus:ring-emerald-500" placeholder="Es. lavoro, utile, da ripassare"/>
                </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">
                  Annulla
                </button>
                <button onClick={handleConfirm} className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
                  Aggiungi al Deck
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddCardModal;