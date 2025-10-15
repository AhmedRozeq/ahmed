import React, { useState, useEffect } from 'react';
import { SavedCollocation } from '../types';
import SparklesIcon from './icons/SparklesIcon';

interface EditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedCard: SavedCollocation) => void;
  card: SavedCollocation;
}

const EditCardModal: React.FC<EditCardModalProps> = ({ isOpen, onClose, onSave, card }) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [formData, setFormData] = useState({
    voce: '',
    spiegazione: '',
    frase_originale: '',
    tema: '',
    notes: '',
    tags: '',
  });

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setFormData({
        voce: card.voce,
        spiegazione: card.spiegazione,
        frase_originale: card.frase_originale,
        tema: card.tema,
        notes: card.notes || '',
        tags: (card.tags || []).join(', '),
      });
    }
  }, [isOpen, card]);

  const handleAnimationEnd = () => {
    if (!isOpen) {
      setShouldRender(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    const updatedCard: SavedCollocation = {
      ...card,
      ...formData,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
    };
    onSave(updatedCard);
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
        className={`bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col ${isOpen ? 'animate-scale-in' : 'animate-scale-out'}`}
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-200/80 dark:border-slate-700/80">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-indigo-500" />
            Modifica Scheda
          </h2>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Chiudi modale">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>
        <div className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Voce</label>
            <input type="text" name="voce" value={formData.voce} onChange={handleChange} className="w-full mt-1 p-2 text-lg font-bold bg-white/60 dark:bg-gray-900/40 border border-gray-300/80 dark:border-gray-700/60 rounded-lg shadow-inner focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Spiegazione</label>
            <textarea name="spiegazione" value={formData.spiegazione} onChange={handleChange} className="w-full mt-1 p-2 bg-white/60 dark:bg-gray-900/40 border border-gray-300/80 dark:border-gray-700/60 rounded-lg shadow-inner focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200" rows={3}/>
          </div>
           <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Frase d'esempio</label>
            <textarea name="frase_originale" value={formData.frase_originale} onChange={handleChange} className="w-full mt-1 p-2 bg-white/60 dark:bg-gray-900/40 border border-gray-300/80 dark:border-gray-700/60 rounded-lg shadow-inner focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200" rows={2}/>
          </div>
           <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Tema</label>
            <input type="text" name="tema" value={formData.tema} onChange={handleChange} className="w-full mt-1 p-2 bg-white/60 dark:bg-gray-900/40 border border-gray-300/80 dark:border-gray-700/60 rounded-lg shadow-inner focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Note</label>
            <input type="text" name="notes" value={formData.notes} onChange={handleChange} className="w-full mt-1 p-2 bg-white/60 dark:bg-gray-900/40 border border-gray-300/80 dark:border-gray-700/60 rounded-lg shadow-inner focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"/>
          </div>
           <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Tag (separati da virgola)</label>
            <input type="text" name="tags" value={formData.tags} onChange={handleChange} className="w-full mt-1 p-2 bg-white/60 dark:bg-gray-900/40 border border-gray-300/80 dark:border-gray-700/60 rounded-lg shadow-inner focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"/>
          </div>
        </div>
        <footer className="p-4 bg-slate-50/70 dark:bg-slate-800/50 border-t border-slate-200/80 dark:border-slate-700/80 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">Annulla</button>
          <button onClick={handleSave} className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Salva Modifiche</button>
        </footer>
      </div>
    </div>
  );
};

export default EditCardModal;