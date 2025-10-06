import React, { useState, useEffect } from 'react';
import SparklesIcon from './icons/SparklesIcon';

interface AnalysisOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (cefrLevel: string, register: string) => void;
  initialCefrLevel: string;
  initialRegister: string;
  title?: string;
  confirmText?: string;
}

const AnalysisOptionsModal: React.FC<AnalysisOptionsModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    initialCefrLevel, 
    initialRegister,
    title = "Opzioni di Analisi",
    confirmText = "Analizza Ora"
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [cefrLevel, setCefrLevel] = useState(initialCefrLevel);
  const [register, setRegister] = useState(initialRegister);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setCefrLevel(initialCefrLevel);
      setRegister(initialRegister);
    }
  }, [isOpen, initialCefrLevel, initialRegister]);

  const handleAnimationEnd = () => {
    if (!isOpen) {
      setShouldRender(false);
    }
  };

  const handleConfirm = () => {
    onConfirm(cefrLevel, register);
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
        className={`bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-lg ${isOpen ? 'animate-scale-in' : 'animate-scale-out'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-200/80 dark:border-slate-700/80">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-sky-500" />
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label="Chiudi modale"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>
        <div className="p-6 space-y-4">
          <p className="text-slate-600 dark:text-slate-300">Scegli il livello di difficoltà e il registro linguistico per la prossima azione.</p>
          <div>
            <label htmlFor="cefr-level-modal" className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Livello QCER (CEFR)</label>
            <select id="cefr-level-modal" value={cefrLevel} onChange={(e) => setCefrLevel(e.target.value)} className="w-full p-2.5 border border-slate-300/80 dark:border-slate-600/80 rounded-lg bg-white/60 dark:bg-slate-900/40 focus:ring-2 focus:ring-sky-500">
                <option value="A1">A1 (Principiante)</option>
                <option value="A2">A2 (Elementare)</option>
                <option value="B1">B1 (Intermedio)</option>
                <option value="B2">B2 (Intermedio-Avanzato)</option>
                <option value="C1">C1 (Avanzato)</option>
                <option value="C2">C2 (Padronanza)</option>
            </select>
          </div>
          <div>
            <label htmlFor="analysis-register-modal" className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Registro Linguistico</label>
            <select id="analysis-register-modal" value={register} onChange={(e) => setRegister(e.target.value)} className="w-full p-2.5 border border-slate-300/80 dark:border-slate-600/80 rounded-lg bg-white/60 dark:bg-slate-900/40 focus:ring-2 focus:ring-sky-500">
                <option value="Neutro">Neutro</option>
                <option value="Formale">Formale</option>
                <option value="Informale">Informale</option>
                <option value="Giornalistico">Giornalistico</option>
                <option value="Letterario">Letterario</option>
            </select>
          </div>
        </div>
        <footer className="p-4 bg-slate-50/70 dark:bg-slate-800/50 border-t border-slate-200/80 dark:border-slate-700/80 flex justify-end gap-3">
            <button
                onClick={onClose}
                className="px-5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
            >
                Annulla
            </button>
            <button
                onClick={handleConfirm}
                className="px-6 py-2 text-sm font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700"
            >
                {confirmText}
            </button>
        </footer>
      </div>
    </div>
  );
};

export default AnalysisOptionsModal;