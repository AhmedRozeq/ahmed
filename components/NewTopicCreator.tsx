
import React, { useState } from 'react';
import { SavedCollocation, GeneratedCardData } from '../types';
import { generateCollocationCard } from '../services/geminiService';
import PlusCircleIcon from './icons/PlusCircleIcon';
import LoadingSpinner from './LoadingSpinner';
import InfoIcon from './icons/InfoIcon';

interface NewTopicCreatorProps {
  onAddToDeck: (newCard: GeneratedCardData & { notes: string; tags: string[] }) => void;
}

const NewTopicCreator: React.FC<NewTopicCreatorProps> = ({ onAddToDeck }) => {
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'confirm' | 'error'>('idle');
  const [generatedData, setGeneratedData] = useState<GeneratedCardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');

  const handleCreate = async () => {
    if (!topic.trim()) return;
    setStatus('loading');
    setError(null);
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

  const handleConfirm = () => {
    if (!generatedData) return;
    const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
    onAddToDeck({
        ...generatedData,
        notes,
        tags: tagArray,
    });
    resetState();
  };

  const resetState = () => {
    setTopic('');
    setStatus('idle');
    setGeneratedData(null);
    setError(null);
    setNotes('');
    setTags('');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
      <div className="flex items-center gap-3 mb-4">
        <PlusCircleIcon className="w-7 h-7 text-emerald-500" />
        <h2 className="text-2xl font-bold text-slate-800">Nuovo Argomento</h2>
      </div>
      <p className="text-slate-600 mb-6">Aggiungi manualmente una parola o una collocazione al tuo deck di studio. L'IA genererà una scheda per te.</p>

      {status === 'idle' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Es. 'prendere in giro'..."
            className="flex-grow p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow duration-200"
          />
          <button
            onClick={handleCreate}
            disabled={!topic.trim()}
            className="px-6 py-3 font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            Crea Scheda
          </button>
        </div>
      )}

      {status === 'loading' && <LoadingSpinner message="Creazione della scheda in corso..." />}

      {status === 'error' && (
        <div>
          <div className="p-4 bg-red-100 text-red-800 border-l-4 border-red-500 rounded-r-md flex items-center gap-3">
            <InfoIcon className="w-6 h-6 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={resetState} className="mt-4 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-200 rounded-md hover:bg-slate-300">
            Riprova
          </button>
        </div>
      )}

      {status === 'confirm' && generatedData && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 animate-fade-in">
          <h3 className="text-lg font-semibold text-slate-800">{generatedData.voce}</h3>
          <p className="mt-2 text-base text-slate-600">{generatedData.spiegazione}</p>
          <p className="mt-3 text-sm text-slate-500 italic border-l-2 border-slate-300 pl-3">
            "{generatedData.frase_originale}"
          </p>
          <div className="mt-4 text-xs font-semibold uppercase text-sky-700 bg-sky-100 px-2 py-1 rounded-full inline-block">
            {generatedData.tema}
          </div>
          
          <div className="mt-6 space-y-4 border-t border-slate-200 pt-4">
              <div>
                  <label htmlFor="card-notes" className="block text-sm font-medium text-slate-700 mb-1">Note Personali (Opzionale)</label>
                  <textarea id="card-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500" placeholder="Aggiungi un promemoria o un esempio..."/>
              </div>
              <div>
                  <label htmlFor="card-tags" className="block text-sm font-medium text-slate-700 mb-1">Tag (Opzionale)</label>
                  <input id="card-tags" type="text" value={tags} onChange={(e) => setTags(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500" placeholder="Es. lavoro, utile, da ripassare"/>
                  <p className="text-xs text-slate-500 mt-1">Separa i tag con una virgola.</p>
              </div>
          </div>


          <div className="mt-6 flex justify-end gap-3">
            <button onClick={resetState} className="px-5 py-2 text-sm font-semibold text-slate-700 bg-slate-200 rounded-md hover:bg-slate-300">
              Annulla
            </button>
            <button onClick={handleConfirm} className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700">
              Aggiungi al Deck
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewTopicCreator;