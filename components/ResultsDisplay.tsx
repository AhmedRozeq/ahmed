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
  onCulturalDeepDive: (collocation: Collocation) => void;
}

const themeColors = ['indigo', 'violet', 'teal', 'rose', 'sky', 'fuchsia', 'lime'];

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
  register,
  onCulturalDeepDive
}) => {
  if (!results || results.length === 0) {
    return (
      <div className="text-center py-10 px-4 bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200">
        <SearchIcon className="w-12 h-12 mx-auto text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">Nessuna collocazione trovata</h3>
        <p className="mt-1 text-sm text-gray-500">Prova a modificare i termini della tua ricerca o analizza un nuovo testo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((group, index) => {
        const isOpen = openThemes.has(group.tema);
        const explanationState = themeExplanations[group.tema];
        const colorName = themeColors[index % themeColors.length];

        return (
          <div key={group.tema} className={`bg-white dark:bg-gray-800/40 rounded-xl border border-gray-200/80 dark:border-gray-700/60 shadow-sm overflow-hidden transition-all duration-300 ${isOpen ? `shadow-lg ring-1 ring-${colorName}-200 dark:ring-${colorName}-800` : ''}`}>
            <div className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-4 p-4 transition-colors duration-300 ${isOpen ? `bg-${colorName}-50/70 dark:bg-${colorName}-900/40` : 'hover:bg-gray-50/70 dark:hover:bg-gray-800/20'}`}>
               <div
                  className="flex items-center gap-4 text-left group cursor-pointer flex-grow"
                  onClick={() => onToggleTheme(group.tema)}
                  aria-expanded={isOpen}
                  aria-controls={`theme-content-${group.tema}`}
               >
                 <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${isOpen ? `bg-${colorName}-500 shadow-inner` : `bg-gray-100 dark:bg-gray-700 group-hover:bg-${colorName}-100 dark:group-hover:bg-${colorName}-800/50`}`}>
                    <ChevronDownIcon className={`w-6 h-6 transition-transform duration-300 ease-in-out flex-shrink-0 ${isOpen ? 'rotate-180 text-white' : `text-gray-500 dark:text-gray-400 group-hover:text-${colorName}-600 dark:group-hover:text-${colorName}-400`}`} />
                 </div>
                 <div>
                    <h3 className={`text-xl font-bold text-gray-800 dark:text-gray-100 group-hover:text-${colorName}-700 dark:group-hover:text-${colorName}-400 transition-colors`}>{group.tema}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{group.collocazioni.length} collocazioni trovate</p>
                 </div>
               </div>
               <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={(e) => { e.stopPropagation(); onExplainTheme(group.tema); }}
                        className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors"
                        disabled={!!explanationState?.isLoading}
                        aria-label={`Spiega il tema ${group.tema}`}
                    >
                        <InfoIcon className="w-5 h-5"/>
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDeepDive(group.tema); }}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold text-${colorName}-700 dark:text-${colorName}-300 bg-${colorName}-100/70 dark:bg-${colorName}-500/10 rounded-full hover:bg-${colorName}-200/70 dark:hover:bg-${colorName}-500/20 transition-colors disabled:opacity-50`}
                        aria-label={`Approfondisci il tema ${group.tema}`}
                    >
                        <WandIcon className="w-4 h-4"/>
                        <span className="hidden sm:inline">Approfondisci</span>
                    </button>
                </div>
            </div>

            {explanationState && (explanationState.isLoading || explanationState.content || explanationState.error) && (
              <div className={`p-4 border-t border-gray-200/80 dark:border-gray-700/60 bg-gray-50/70 dark:bg-gray-900/20 animate-fade-in ${isOpen ? 'block' : 'hidden'}`}>
                  {explanationState.isLoading && <div className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">Caricamento spiegazione...</div>}
                  {explanationState.error && <p className="text-sm text-red-500">{explanationState.error}</p>}
                  {explanationState.content && (
                      <div>
                          <p className="text-base text-gray-700 dark:text-gray-300 mb-2">{explanationState.content.explanation}</p>
                          <div className="flex flex-wrap gap-2">
                              {explanationState.content.related_collocations.map(coll => (
                                  <div key={coll.voce} className="bg-white/60 dark:bg-gray-800/40 p-2 rounded-md border border-gray-200/60 dark:border-gray-700/50 text-sm">
                                      <p className="font-semibold text-gray-800 dark:text-gray-200">{coll.voce}</p>
                                      <p className="text-gray-500 dark:text-gray-400">{coll.spiegazione}</p>
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
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-gray-50/50 dark:bg-gray-900/20">
                    {group.collocazioni.map((collocation) => (
                      <CollocationCard 
                        key={collocation.voce} 
                        collocation={collocation} 
                        themeColor={colorName}
                        onSave={() => onSave(collocation, group.tema)} 
                        onDeepDive={() => onDeepDive(collocation)}
                        onCulturalDeepDive={() => onCulturalDeepDive(collocation)}
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