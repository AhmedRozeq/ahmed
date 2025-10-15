import React, { useState, useEffect } from 'react';
import { GeneratedCardData } from '../types';
import { generateAdditionalExample } from '../services/geminiService';
import ShuffleIcon from './icons/ShuffleIcon';
import SparklesIcon from './icons/SparklesIcon';

interface EditableCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cardData: GeneratedCardData & { notes: string; tags: string[] }) => void;
  initialData: GeneratedCardData;
  cefrLevel: string;
  register: string;
}

const EditableCardModal: React.FC<EditableCardModalProps> = ({ isOpen, onClose, onSave, initialData, cefrLevel, register }) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [editableData, setEditableData] = useState({ ...initialData, notes: '', tags: '' });
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setEditableData({ ...initialData, notes: '', tags: '' });
    }
  }, [isOpen, initialData]);

  const handleAnimationEnd = () => {
    if (!isOpen) {
      setShouldRender(false);
    }
  };

  const handleRegenerateExample = async () => {
    setIsRegenerating(true);
    try {
      const newExample = await generateAdditionalExample(
        {
          voce: editableData.voce,
          spiegazione: editableData.spiegazione,
          frase_originale: editableData.frase_originale,
        },
        { cefrLevel, register }
      );
      setEditableData(prev => ({ ...prev, frase_originale: newExample }));
    } catch (e) {
      console.error("Failed to regenerate example", e);
      // Optionally show a small error toast/message here
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSave = () => {
    const tagArray = editableData.tags.split(',').map(t => t.trim()).filter(Boolean);
    onSave({ ...editableData, tags: tagArray });
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
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-200/80 dark:border-slate-700/80">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-emerald-500" />
            Rivedi e Salva Scheda
          </h2>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Chiudi modale">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>
        <div className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Voce</label>
            <input type="text" value={editableData.voce} onChange={e => setEditableData(p => ({ ...p, voce: e.target.value }))} className="w-full mt-1 p-2 text-lg font-bold bg-white/80 dark:bg-slate-700/50 border border-slate-300/80 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-emerald-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Spiegazione</label>
            <textarea value={editableData.spiegazione} onChange={e => setEditableData(p => ({ ...p, spiegazione: e.target.value }))} className="w-full mt-1 p-2 bg-white/80 dark:bg-slate-700/50 border border-slate-300/80 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-emerald-500" rows={3}/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Frase d'esempio</label>
            <div className="flex items-start gap-2 mt-1">
              <textarea value={editableData.frase_originale} onChange={e => setEditableData(p => ({ ...p, frase_originale: e.target.value }))} className="w-full p-2 bg-white/80 dark:bg-slate-700/50 border border-slate-300/80 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-emerald-500" rows={2}/>
              <button onClick={handleRegenerateExample} disabled={isRegenerating} className="p-2.5 rounded-md bg-white/80 dark:bg-slate-700/50 border border-slate-300/80 dark:border-slate-600 hover:bg-slate-100/80 dark:hover:bg-slate-600/50 disabled:opacity-50" aria-label="Rigenera esempio">
                {isRegenerating ? <svg className="animate-spin h-5 w-5 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg> : <ShuffleIcon className="w-5 h-5 text-sky-500"/>}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Tema</label>
            <input type="text" value={editableData.tema} onChange={e => setEditableData(p => ({ ...p, tema: e.target.value }))} className="w-full mt-1 p-2 bg-white/80 dark:bg-slate-700/50 border border-slate-300/80 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-emerald-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Note (Opzionale)</label>
            <input type="text" value={editableData.notes} onChange={e => setEditableData(p => ({ ...p, notes: e.target.value }))} className="w-full mt-1 p-2 bg-white/80 dark:bg-slate-700/50 border border-slate-300/80 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-emerald-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Tag (Opzionale, separati da virgola)</label>
            <input type="text" value={editableData.tags} onChange={e => setEditableData(p => ({ ...p, tags: e.target.value }))} className="w-full mt-1 p-2 bg-white/80 dark:bg-slate-700/50 border border-slate-300/80 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-emerald-500"/>
          </div>
        </div>
        <footer className="p-4 bg-slate-50/70 dark:bg-slate-800/50 border-t border-slate-200/80 dark:border-slate-700/80 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">Annulla</button>
          <button onClick={handleSave} className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">Salva nel Deck</button>
        </footer>
      </div>
    </div>
  );
};

export default EditableCardModal;
