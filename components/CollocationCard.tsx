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
import GlobeIcon from './icons/GlobeIcon';
import VolumeUpIcon from './icons/VolumeUpIcon';
import { speak } from '../utils/audio';

interface CollocationCardProps {
  collocation: Collocation;
  onSave: () => void;
  onDeepDive: () => void;
  onCulturalDeepDive: () => void;
  isSaved: boolean;
  onRelatedWordDeepDive: (relatedWord: string) => void;
  cefrLevel: string;
  register: string;
  themeColor?: string;
}

const SmallSpinner: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const CollocationCard: React.FC<CollocationCardProps> = ({ 
    collocation, 
    onSave, 
    onDeepDive,
    onCulturalDeepDive, 
    isSaved, 
    onRelatedWordDeepDive,
    cefrLevel,
    register,
    themeColor = 'sky'
}) => {

  const [storyState, setStoryState] = useState<{ isLoading: boolean; content: string | null; error: string | null }>({ isLoading: false, content: null, error: null });
  const [speakingState, setSpeakingState] = useState({ it: false, ar: false });
  const isDictionaryEntry = !!collocation.traduzione_arabo;

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

  const handleSpeak = async (text: string, lang: 'it-IT' | 'ar-SA', langKey: 'it' | 'ar') => {
    if (speakingState.it || speakingState.ar) {
        window.speechSynthesis.cancel();
        const wasCurrentlySpeaking = speakingState[langKey];
        setSpeakingState({ it: false, ar: false });
        if (wasCurrentlySpeaking) return;
    }

    setSpeakingState(prev => ({ ...prev, [langKey]: true }));
    try {
      await speak(text, lang);
    } catch (err) {
      console.error("Errore durante la riproduzione dell'audio:", err);
    } finally {
      setSpeakingState(prev => ({ ...prev, [langKey]: false }));
    }
  };


  return (
    <div 
      className={`relative glass-panel p-5 rounded-xl transition-all duration-300 hover:shadow-xl hover:border-gray-300/50 dark:hover:border-gray-600/50 flex flex-col h-full border-l-4 border-l-${themeColor}-500`}
    >
      {/* Action Buttons */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
        <Tooltip text={isSaved ? "Rimuovi dal deck" : "Aggiungi al deck"}>
          <button
              onClick={(e) => { e.stopPropagation(); onSave(); }}
              className={`p-2 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isSaved 
                  ? 'bg-amber-100/80 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 ring-amber-300' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 ring-gray-300'
              }`}
              aria-label={isSaved ? "Rimuovi dal deck" : "Aggiungi a deck"}
          >
              <BookmarkIcon className="w-5 h-5" isSaved={isSaved} />
          </button>
        </Tooltip>
      </div>
      
      <div className="flex-grow flex flex-col">
        {/* Voce */}
        <h3 className={`text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3 pr-20`}>
          <span className={`w-7 h-7 flex items-center justify-center bg-gray-100 dark:bg-gray-900/40 rounded-lg flex-shrink-0 mt-0.5`}>
            <QuoteIcon className={`w-4 h-4 text-gray-500`} />
          </span>
          <span>{collocation.voce}</span>
          <button
            onClick={(e) => { e.stopPropagation(); handleSpeak(collocation.voce, 'it-IT', 'it'); }}
            disabled={speakingState.it}
            className="p-1 rounded-full text-gray-400 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors"
            aria-label={`Ascolta la pronuncia di ${collocation.voce}`}
          >
            {speakingState.it ? <SmallSpinner className="w-4 h-4 text-indigo-500" /> : <VolumeUpIcon className="w-4 h-4"/>}
          </button>
        </h3>
        
        <div className="my-4 border-t border-gray-200/80 dark:border-gray-700/60"></div>

        {/* Spiegazione */}
        <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed flex-grow">
          {collocation.spiegazione}
        </p>

        {/* Frase Originale */}
        <div className="mt-4 pt-4 border-t border-gray-200/60 dark:border-gray-700/50">
           <h4 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 text-sm mb-2">
                <FileTextIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                {isDictionaryEntry ? 'Esempio Italiano' : 'Dal Testo Originale'}
            </h4>
            <p className="text-gray-500 dark:text-gray-400 italic text-sm pl-6">
              "{collocation.frase_originale}"
            </p>
        </div>
        
        {/* ARABIC SECTION */}
        {isDictionaryEntry && collocation.traduzione_arabo && (
            <>
                <div className="my-4 border-t-4 border-double border-teal-200/80 dark:border-teal-800/60"></div>
                <div className="space-y-3" dir="rtl">
                    <div className="flex items-center justify-end gap-3">
                        <button onClick={(e) => { e.stopPropagation(); handleSpeak(collocation.traduzione_arabo!, 'ar-SA', 'ar'); }} disabled={speakingState.ar} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-700/60">
                            {speakingState.ar ? <SmallSpinner className="w-5 h-5 text-teal-500" /> : <VolumeUpIcon className="w-5 h-5"/>}
                        </button>
                        <h3 className="text-xl font-bold text-teal-600 dark:text-teal-400" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
                            {collocation.traduzione_arabo}
                        </h3>
                    </div>
                    <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed text-right" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
                        {collocation.definizione_arabo}
                    </p>
                    <div className="pt-3 border-t border-gray-200/60 dark:border-gray-700/50">
                        <h4 className="font-semibold text-gray-700 dark:text-gray-200 text-sm mb-1 text-right" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
                           مثال
                        </h4>
                        <p className="text-gray-500 dark:text-gray-400 italic text-sm text-right" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
                            "{collocation.esempio_arabo}"
                        </p>
                    </div>
                    {collocation.pronuncia_arabo && <p className="text-xs text-gray-400 dark:text-gray-500 text-right">{collocation.pronuncia_arabo}</p>}
                </div>
            </>
        )}

        {/* Parole Correlate */}
        {!isDictionaryEntry && collocation.parole_correlate && collocation.parole_correlate.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200/60 dark:border-gray-700/50">
            <h4 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 text-sm mb-2">
              <TagIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              Parole Correlate
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 pl-6">
              {collocation.parole_correlate.map((relatedWord) => (
                 <div key={relatedWord.parola}>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRelatedWordDeepDive(relatedWord.parola); }}
                        className="px-2 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50 rounded-full transition-all duration-200 hover:bg-indigo-200 dark:hover:bg-indigo-900/80 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                        {relatedWord.parola}
                    </button>
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-1 ml-1">
                        <span className="font-semibold not-italic text-gray-400 dark:text-gray-500">Es:</span> "{relatedWord.esempio}"
                    </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contesto Culturale */}
        {isDictionaryEntry && collocation.contesto_culturale && (
            <div className="mt-4 pt-4 border-t border-gray-200/60 dark:border-gray-700/50">
                <h4 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 text-sm mb-2">
                <GlobeIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                Contesto Culturale
                </h4>
                <p className="text-gray-500 dark:text-gray-400 text-sm pl-6">
                {collocation.contesto_culturale}
                </p>
            </div>
        )}

        {/* Story section */}
        {!isDictionaryEntry && (storyState.isLoading || storyState.content || storyState.error) && (
            <div className="mt-4 pt-4 border-t border-gray-200/60 dark:border-gray-700/50">
                {storyState.isLoading && <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">L'IA sta scrivendo una storia per te...</p>}
                {storyState.error && <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"><InfoIcon className="w-4 h-4" /> {storyState.error}</p>}
                {storyState.content && (
                    <div className="bg-emerald-50/70 dark:bg-emerald-900/30 p-3 rounded-md animate-fade-in border border-emerald-200/60 dark:border-emerald-500/20">
                        <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{storyState.content}"</p>
                    </div>
                )}
            </div>
        )}
      </div>

      <div className="mt-5 pt-3 border-t border-gray-200/60 dark:border-gray-700/50">
        <div className="flex justify-end items-center gap-1">
          {!isDictionaryEntry && (
            <Tooltip text="Crea una storia">
              <button
                  onClick={(e) => { e.stopPropagation(); handleGenerateStory(); }}
                  className="p-2 rounded-full text-gray-500 hover:bg-gray-200/60 hover:text-emerald-600 transition-colors dark:text-gray-400 dark:hover:bg-gray-700/60 dark:hover:text-emerald-400 disabled:opacity-50"
                  disabled={storyState.isLoading || !!storyState.content}
                  aria-label={`Crea una storia per ${collocation.voce}`}
              >
                  <BookTextIcon className="w-5 h-5"/>
              </button>
            </Tooltip>
          )}
          <Tooltip text="Approfondimento Culturale">
            <button
              onClick={(e) => { e.stopPropagation(); onCulturalDeepDive(); }}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-200/60 hover:text-teal-600 transition-colors dark:text-gray-400 dark:hover:bg-gray-700/60 dark:hover:text-teal-400"
              aria-label={`Approfondimento culturale per ${collocation.voce}`}
            >
                <GlobeIcon className="w-5 h-5"/>
            </button>
          </Tooltip>
          <button
            onClick={(e) => { e.stopPropagation(); onDeepDive(); }}
            className={`flex items-center gap-1.5 pl-3 pr-4 py-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100/70 dark:bg-indigo-500/10 rounded-full hover:bg-indigo-200/70 dark:hover:bg-indigo-500/20 transition-colors disabled:opacity-50 active:scale-95`}
            aria-label={`Approfondisci ${collocation.voce}`}
          >
              <WandIcon className="w-4 h-4"/>
              Approfondisci
          </button>
        </div>
      </div>

    </div>
  );
};

export default React.memo(CollocationCard);