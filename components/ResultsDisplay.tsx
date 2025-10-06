import React from 'react';
import { ThemeGroup, Collocation, RelatedExample, ThemeExplanationResult, CardDeepDiveResult } from '../types';
import CollocationCard from './CollocationCard';
import WandIcon from './icons/WandIcon';
import SearchIcon from './icons/SearchIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import LoadingSpinner from './LoadingSpinner';
import InfoIcon from './icons/InfoIcon';
import DeepDiveDisplay from './DeepDiveDisplay'; // Assuming this can be used inline
import XCircleIcon from './icons/XCircleIcon';

interface ResultsDisplayProps {
  results: ThemeGroup[];
  onDeepDive: (item: string | Collocation) => void;
  onSave: (collocation: Collocation, theme: string) => void;
  savedCollocationsSet: Set<string>;
  themeExplanations: Record<string, { isLoading: boolean; content: ThemeExplanationResult | null; error: string | null }>;
  openThemes: Set<string>;
  onToggleTheme: (theme: string) => void;
  onExplainTheme: (theme: string) => void;
  onToggleInlineDeepDive: (voce: string) => void;
  inlineDeepDives: Record<string, { isLoading: boolean; content: CardDeepDiveResult | null; error: string | null; isOpen: boolean; }>;
  cefrLevel: string;
  register: string;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ 
  results, 
  onDeepDive,
  onSave,
  savedCollocationsSet,
  themeExplanations,
  openThemes,
  onToggleTheme,
  onExplainTheme,
  onToggleInlineDeepDive,
  inlineDeepDives,
  cefrLevel,
  register
}) => {
  if (!results || results.length === 0) {
    return (
      <div className="text-center py-10 px-4 bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200">
        <SearchIcon className="w-12 h-12 mx-auto text-slate-400" />
        <h3 className="mt-4 text-lg font-medium text-slate-900">Nessuna collocazione trovata</h3>
        <p className="mt-1 text-sm text-slate-500">Prova a modificare i termini della tua ricerca o analizza un nuovo testo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((group) => {
        const isOpen = openThemes.has(group.tema);
        const explanationState = themeExplanations[group.tema];

        return (
          <div key={group.tema} className={`bg-white dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm overflow-hidden transition-all duration-300 ${isOpen ? 'shadow-lg ring-1 ring-sky-200 dark:ring-sky-800' : ''}`}>
            <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 transition-colors duration-300 ${isOpen ? 'bg-sky-50/70 dark:bg-sky-900/40' : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/20'}`}>
               <div
                  className="flex items-center gap-4 text-left group w-full cursor-pointer"
                  onClick={() => onToggleTheme(group.tema)}
                  aria-expanded={isOpen}
                  aria-controls={`theme-content-${group.tema}`}
               >
                 <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${isOpen ? 'bg-sky-500 shadow-inner' : 'bg-slate-100 dark:bg-slate-700 group-hover:bg-sky-100 dark:group-hover:bg-sky-800/50'}`}>
                    <ChevronDownIcon className={`w-6 h-6 transition-transform duration-300 ease-in-out flex-shrink-0 ${isOpen ? 'rotate-180 text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400'}`} />
                 </div>
                 <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors">{group.tema}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{group.collocazioni.length} collocazioni trovate</p>
                 </div>
               </div>
               <div className="flex items-center gap-2 mt-4 sm:mt-0 sm:ml-4 flex-shrink-0">
                    <button
                        onClick={(e) => { e.stopPropagation(); onExplainTheme(group.tema); }}
                        className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                        disabled={!!explanationState?.isLoading}
                        aria-label={`Spiega il tema ${group.tema}`}
                    >
                        <InfoIcon className="w-5 h-5"/>
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDeepDive(group.tema); }}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-sky-700 dark:text-sky-300 bg-sky-100/70 dark:bg-sky-500/10 rounded-full hover:bg-sky-200/70 dark:hover:bg-sky-500/20 transition-colors disabled:opacity-50"
                        aria-label={`Approfondisci il tema ${group.tema}`}
                    >
                        <WandIcon className="w-4 h-4"/>
                        Approfondisci
                    </button>
                </div>
            </div>

            {explanationState && !explanationState.isLoading && (
              <div className={`p-4 border-t border-slate-200/80 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-900/20 animate-fade-in ${isOpen ? 'block' : 'hidden'}`}>
                  {explanationState.error && <p className="text-sm text-red-500">{explanationState.error}</p>}
                  {explanationState.content && (
                      <div>
                          <p className="text-base text-slate-700 dark:text-slate-300 mb-2">{explanationState.content.explanation}</p>
                          <div className="flex flex-wrap gap-2">
                              {explanationState.content.related_collocations.map(coll => (
                                  <div key={coll.voce} className="bg-white/60 dark:bg-slate-800/40 p-2 rounded-md border border-slate-200/60 dark:border-slate-700/50 text-sm">
                                      <p className="font-semibold text-slate-800 dark:text-slate-200">{coll.voce}</p>
                                      <p className="text-slate-500 dark:text-slate-400">{coll.spiegazione}</p>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
              </div>
            )}

            <div
              id={`theme-content-${group.tema}`}
              className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
                <div className="overflow-hidden">
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/50 dark:bg-slate-900/20">
                    {group.collocazioni.map((collocation) => (
                      <CollocationCard 
                        key={collocation.voce} 
                        collocation={collocation} 
                        onSave={() => onSave(collocation, group.tema)} 
                        onDeepDive={() => onDeepDive(collocation)}
                        isSaved={savedCollocationsSet.has(collocation.voce)}
                        onRelatedWordDeepDive={(word) => onDeepDive(word)}
                        cefrLevel={cefrLevel}
                        register={register}
                      />
                    ))}
                  </div>
                </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ResultsDisplay;