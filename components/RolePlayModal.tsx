import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import InfoIcon from './icons/InfoIcon';
import { RolePlayResult, Collocation } from '../types';
import { generateRolePlayScript } from '../services/geminiService';
import UsersIcon from './icons/UsersIcon';

interface RolePlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  collocation: Collocation | null;
  initialCefrLevel: string;
  initialRegister: string;
}

const RolePlayModal: React.FC<RolePlayModalProps> = ({ isOpen, onClose, collocation, initialCefrLevel, initialRegister }) => {
  const [shouldRender, setShouldRender] = useState(isOpen);

  // Internal state
  const [rolePlayData, setRolePlayData] = useState<RolePlayResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [cefrLevel, setCefrLevel] = useState(initialCefrLevel);
  const [register, setRegister] = useState(initialRegister);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Reset state on open
      setRolePlayData(null);
      setIsLoading(false);
      setError(null);
      setActiveTab(0);
      setTopic(collocation?.voce || '');
      setCefrLevel(initialCefrLevel);
      setRegister(initialRegister);

      if (collocation) {
        handleGenerate(collocation, { cefrLevel: initialCefrLevel, register: initialRegister });
      }
    }
  }, [isOpen, collocation, initialCefrLevel, initialRegister]);

  const handleAnimationEnd = () => {
    if (!isOpen) {
      setShouldRender(false);
    }
  };

  const handleGenerate = async (item: Collocation | string, options: { cefrLevel: string; register: string }) => {
    setIsLoading(true);
    setError(null);
    setRolePlayData(null);
    
    const collocationForApi: Collocation = typeof item === 'string' 
      ? { voce: item, spiegazione: `Una conversazione su "${item}"`, frase_originale: '' }
      : item;

    try {
      const data = await generateRolePlayScript(collocationForApi, options);
      setRolePlayData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Si è verificato un errore sconosciuto.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!shouldRender) return null;

  const renderContent = () => {
    if (rolePlayData && rolePlayData.scenari.length > 0) {
      const currentScenario = rolePlayData.scenari[activeTab];
      const dialogueLines = currentScenario.dialogo.split('\n')
        .filter(line => line.trim() !== '')
        .map((line, index) => {
          const parts = line.split(/:\s*(.*)/s);
          return {
            id: `${activeTab}-${index}`,
            speaker: parts[0]?.trim() || 'Narratore',
            line: parts[1]?.trim() || '',
          };
        });

      return (
        <div className="animate-fade-in">
          <div className="flex items-center border-b border-slate-200 dark:border-slate-700 mb-6 -mx-6 px-6">
            {rolePlayData.scenari.map((scenario, index) => (
              <button key={index} onClick={() => setActiveTab(index)} className={`px-4 py-3 text-sm font-semibold transition-colors duration-200 focus:outline-none ${activeTab === index ? 'border-b-2 border-sky-500 text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                Scenario {index + 1}
              </button>
            ))}
          </div>
          <div key={activeTab} className="animate-fade-in-up">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{currentScenario.titolo}</h3>
            <p className="mt-2 text-base text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-md border border-slate-200/80 dark:border-slate-600/60"><strong className="font-semibold text-slate-700 dark:text-slate-200">Contesto:</strong> {currentScenario.contesto}</p>
            <div className="mt-5 pt-5 border-t border-slate-200/80 dark:border-slate-700/80"><h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Dialogo:</h4><div className="space-y-4">{dialogueLines.map(({ id, speaker, line }) => (<div key={id} className="p-4 rounded-lg border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-900/30 shadow-sm"><p className="font-bold text-base text-sky-700 dark:text-sky-400">{speaker}</p><p className="mt-1 text-slate-800 dark:text-slate-200 text-base leading-relaxed">{line}</p></div>))}</div></div>
          </div>
        </div>
      );
    }
    return null;
  };
  
  const renderRequestForm = () => (
     <div className="space-y-4">
        <p className="text-slate-600 dark:text-slate-300">Inserisci una collocazione o un argomento per generare un dialogo di esempio.</p>
        <div>
            <label htmlFor="topic-input-dialogue" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Collocazione/Argomento</label>
            <input id="topic-input-dialogue" type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Es. 'rompere il ghiaccio'" className="w-full p-2.5 border border-slate-300/80 dark:border-slate-600/80 rounded-lg bg-white/60 dark:bg-slate-900/40 focus:ring-2 focus:ring-sky-500"/>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label htmlFor="cefr-level-dialogue" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Livello</label>
                <select id="cefr-level-dialogue" value={cefrLevel} onChange={e => setCefrLevel(e.target.value)} className="w-full p-2.5 border border-slate-300/80 dark:border-slate-600/80 rounded-lg bg-white/60 dark:bg-slate-900/40 focus:ring-2 focus:ring-sky-500">
                    <option value="A1">A1 (Principiante)</option>
                    <option value="A2">A2 (Elementare)</option>
                    <option value="B1">B1 (Intermedio)</option>
                    <option value="B2">B2 (Intermedio-Avanzato)</option>
                    <option value="C1">C1 (Avanzato)</option>
                    <option value="C2">C2 (Padronanza)</option>
                </select>
            </div>
            <div>
                <label htmlFor="register-dialogue" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Registro</label>
                <select id="register-dialogue" value={register} onChange={e => setRegister(e.target.value)} className="w-full p-2.5 border border-slate-300/80 dark:border-slate-600/80 rounded-lg bg-white/60 dark:bg-slate-900/40 focus:ring-2 focus:ring-sky-500">
                    <option value="Neutro">Neutro</option>
                    <option value="Formale">Formale</option>
                    <option value="Informale">Informale</option>
                    <option value="Giornalistico">Giornalistico</option>
                    <option value="Letterario">Letterario</option>
                    <option value="Burocratico">Burocratico</option>
                </select>
            </div>
        </div>
        <div className="flex justify-end pt-2">
            <button onClick={() => handleGenerate(topic, { cefrLevel, register })} disabled={!topic.trim()} className="px-6 py-2 text-base font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:bg-slate-400">Genera Dialogo</button>
        </div>
    </div>
  );

  return (
    <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${isOpen ? 'animate-fade-in' : 'animate-fade-out'}`} onClick={onClose} onAnimationEnd={handleAnimationEnd} role="dialog" aria-modal="true">
      <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col ${isOpen ? 'animate-scale-in' : 'animate-scale-out'}`} onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-slate-200/80 dark:border-slate-700/80 flex-shrink-0">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 truncate flex items-center gap-3"><UsersIcon className="w-6 h-6 text-sky-500" />Simulazione di Dialogo</h2>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Chiudi modale"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </header>
        <div className="p-6 overflow-y-auto bg-slate-50/50 dark:bg-slate-800/50">
          {isLoading && <LoadingSpinner message="Creazione dei dialoghi..." />}
          {error && <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-l-4 border-red-500 rounded-r-md flex items-center gap-3"><InfoIcon className="w-6 h-6 flex-shrink-0" /><span>{error}</span></div>}
          {!isLoading && !error && (rolePlayData ? renderContent() : renderRequestForm())}
        </div>
      </div>
    </div>
  );
};

export default RolePlayModal;