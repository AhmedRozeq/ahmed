import React, { useState } from 'react';
import { Collocation, StoryResult } from '../types';
import QuoteIcon from './icons/QuoteIcon';
import BookmarkIcon from './icons/BookmarkIcon';
import WandIcon from './icons/WandIcon';
import Tooltip from './Tooltip';
import FileTextIcon from './icons/FileTextIcon';
import TagIcon from './icons/TagIcon';
import { generateStoryForCollocation } from '../services/geminiService';
import InfoIcon from './icons/InfoIcon';
import BookTextIcon from './icons/BookTextIcon';

interface CollocationCardProps {
  collocation: Collocation;
  onSave: () => void;
  onDeepDive: () => void;
  isSaved: boolean;
  onRelatedWordDeepDive: (relatedWord: string) => void;
  cefrLevel: string;
  register: string;
}

const CollocationCard: React.FC<CollocationCardProps> = ({ 
    collocation, 
    onSave, 
    onDeepDive, 
    isSaved, 
    onRelatedWordDeepDive,
    cefrLevel,
    register
}) => {

  const [storyState, setStoryState] = useState<{ isLoading: boolean; content: string | null; error: string | null }>({ isLoading: false, content: null, error: null });

  const handleGenerateStory = async () => {
    setStoryState({ isLoading: true, content: null, error: null });
    try {
      const result: StoryResult = await generateStoryForCollocation(collocation, { cefrLevel, register });
      setStoryState({ isLoading: false, content: result.story, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossibile generare la storia.";
      setStoryState({ isLoading: false, content: null, error: message });
    }
  };

  return (
    <div 
      className="relative glass-panel p-5 rounded-xl transition-all duration-300 hover:shadow-xl hover:border-sky-400/50 flex flex-col h-full"
    >
      {/* Action Buttons */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
        <Tooltip text={isSaved ? "Rimuovi dal deck" : "Aggiungi al deck"}>
          <button
              onClick={(e) => { e.stopPropagation(); onSave(); }}
              className={`p-2 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isSaved 
                  ? 'bg-sky-100/80 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 ring-sky-300' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 ring-slate-300'
              }`}
              aria-label={isSaved ? "Rimuovi dal deck" : "Aggiungi a deck"}
          >
              <BookmarkIcon className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
          </button>
        </Tooltip>
      </div>
      
      <div className="flex-grow flex flex-col">
        {/* Voce */}
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-start gap-3 pr-20">
          <span className="w-7 h-7 flex items-center justify-center bg-sky-100/80 dark:bg-sky-900/40 rounded-lg flex-shrink-0 mt-0.5">
            <QuoteIcon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </span>
          <span>{collocation.voce}</span>
        </h3>
        
        <div className="my-4 border-t border-slate-200/80 dark:border-slate-700/60"></div>

        {/* Spiegazione */}
        <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed flex-grow">
          {collocation.spiegazione}
        </p>

        {/* Frase Originale */}
        <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-700/50">
           <h4 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 text-sm mb-2">
                <FileTextIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                Dal Testo Originale
            </h4>
            <p className="text-slate-500 dark:text-slate-400 italic text-sm pl-6">
              "{collocation.frase_originale}"
            </p>
        </div>
        
        {/* Parole Correlate */}
        {collocation.parole_correlate && collocation.parole_correlate.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-700/50">
            <h4 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 text-sm mb-2">
              <TagIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
              Parole Correlate
            </h4>
            <div className="flex flex-wrap gap-2 pl-6">
              {collocation.parole_correlate.map((word) => (
                 <button 
                    key={word} 
                    onClick={(e) => { e.stopPropagation(); onRelatedWordDeepDive(word); }}
                    className="px-2 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50 rounded-full transition-all duration-200 hover:bg-indigo-200 dark:hover:bg-indigo-900/80 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {word}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Story section */}
        {(storyState.isLoading || storyState.content || storyState.error) && (
            <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-700/50">
                {storyState.isLoading && <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">L'IA sta scrivendo una storia per te...</p>}
                {storyState.error && <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"><InfoIcon className="w-4 h-4" /> {storyState.error}</p>}
                {storyState.content && (
                    <div className="bg-emerald-50/70 dark:bg-emerald-900/30 p-3 rounded-md animate-fade-in border border-emerald-200/60 dark:border-emerald-500/20">
                        <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{storyState.content}"</p>
                    </div>
                )}
            </div>
        )}
      </div>

      <div className="mt-5 pt-4 border-t border-slate-200/60 dark:border-slate-700/50 flex justify-end gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleGenerateStory(); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-500/10 rounded-full hover:bg-emerald-200/70 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
            disabled={storyState.isLoading || !!storyState.content}
            aria-label={`Crea una storia per ${collocation.voce}`}
          >
              <BookTextIcon className="w-4 h-4"/>
              Crea Storia
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDeepDive(); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-sky-700 dark:text-sky-300 bg-sky-100/70 dark:bg-sky-500/10 rounded-full hover:bg-sky-200/70 dark:hover:bg-sky-500/20 transition-colors disabled:opacity-50"
            aria-label={`Approfondisci ${collocation.voce}`}
          >
              <WandIcon className="w-4 h-4"/>
              Approfondisci
          </button>
      </div>

    </div>
  );
};

export default React.memo(CollocationCard);