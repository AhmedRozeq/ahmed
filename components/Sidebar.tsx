import React, { useState, useEffect, forwardRef } from 'react';
import { Collocation, RelatedCollocation, GroundingChunk } from '../types';
import DeepDiveDisplay from './DeepDiveDisplay';
import XCircleIcon from './icons/XCircleIcon';
import LoadingSpinner from './LoadingSpinner';
import InfoIcon from './icons/InfoIcon';

interface SidebarProps {
  state: {
    isOpen: boolean;
    item: string | Collocation | null;
    content: string | null;
    isLoading: boolean;
    error: string | null;
    relatedCollocations: { data: RelatedCollocation[] | null; isLoading: boolean; error: string | null; };
    webExamples: { summary: string | null; chunks: GroundingChunk[] | null; isLoading: boolean; error: string | null; };
    questions: Array<{ id: string; question: string; answer: string | null; chunks: GroundingChunk[]; isLoading: boolean; error: string | null; }>;
  };
  onClose: () => void;
  onTermDeepDive: (item: string) => void;
  onAskQuestion: (question: string) => void;
  onConversationalPractice: (item: Collocation | string, context: string | null) => void;
  cefrLevel: string;
  register: string;
}

const Sidebar = forwardRef<HTMLElement, SidebarProps>(({ state, onClose, onTermDeepDive, onAskQuestion, onConversationalPractice, cefrLevel, register }, ref) => {
  const [shouldRender, setShouldRender] = useState(state.isOpen);

  useEffect(() => {
    let timer: number;
    if (state.isOpen) {
      setShouldRender(true);
    } else {
      timer = window.setTimeout(() => setShouldRender(false), 300); // Corrisponde alla durata dell'animazione
    }
    return () => clearTimeout(timer);
  }, [state.isOpen]);

  const animationClass = state.isOpen ? 'animate-slide-in-right' : 'animate-slide-out-right';

  if (!shouldRender) return null;

  return (
    <aside 
        ref={ref}
        className={`fixed top-0 right-0 h-full w-[95vw] max-w-lg z-50 glass-panel shadow-2xl flex flex-col ${animationClass}`}
        role="complementary"
        aria-labelledby="sidebar-title"
    >
      <header className="flex items-center justify-between p-4 border-b border-slate-200/80 dark:border-slate-700/80 flex-shrink-0">
        <h2 id="sidebar-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100 truncate">
          Approfondimento
        </h2>
        <button
          onClick={onClose}
          className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 p-1 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
          aria-label="Chiudi approfondimento"
        >
          <XCircleIcon className="w-6 h-6" />
        </button>
      </header>
      <div className="flex-grow p-6 overflow-y-auto">
        {state.isLoading && (
            <div className="flex flex-col items-center justify-center h-full">
                <LoadingSpinner message="Generazione approfondimento..."/>
            </div>
        )}
        {state.error && (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                 <InfoIcon className="w-12 h-12 text-red-400 mb-4" />
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-300">Si è verificato un errore</h3>
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-3 rounded-md mt-2">{state.error}</p>
            </div>
        )}
        {state.item && (
            <DeepDiveDisplay
                deepDiveItem={state.item}
                content={state.content}
                isLoading={state.isLoading}
                relatedCollocations={state.relatedCollocations.data}
                isRelatedCollocationsLoading={state.relatedCollocations.isLoading}
                relatedCollocationsError={state.relatedCollocations.error}
                onTermDeepDive={onTermDeepDive}
                questions={state.questions}
                onAskQuestion={onAskQuestion}
                webSummary={state.webExamples.summary}
                webExamples={state.webExamples.chunks}
                isWebExamplesLoading={state.webExamples.isLoading}
                webExamplesError={state.webExamples.error}
                onConversationalPractice={onConversationalPractice}
                cefrLevel={cefrLevel}
                register={register}
            />
        )}
      </div>
    </aside>
  );
});

export default Sidebar;