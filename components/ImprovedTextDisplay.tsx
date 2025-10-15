import React from 'react';
import { ImprovedTextResult } from '../types';
import MarkdownDisplay from './MarkdownDisplay';
import SparklesIcon from './icons/SparklesIcon';

interface ImprovedTextDisplayProps {
  result: ImprovedTextResult;
}

const ImprovedTextDisplay: React.FC<ImprovedTextDisplayProps> = ({ result }) => {
  return (
    <div className="bg-white/50 dark:bg-slate-800/30 backdrop-blur-sm p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-lg animate-fade-in-up">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/40 dark:to-violet-900/40 rounded-xl">
          <SparklesIcon className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Miglioramento del Testo</h2>
          <p className="text-base text-slate-600 dark:text-slate-300 mt-1">Ecco la versione riscritta del tuo testo con le spiegazioni delle modifiche.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Testo Migliorato</h3>
          <div className="bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-lg border border-slate-200/60 dark:border-slate-700/50">
            <p className="text-base text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{result.improved_text}</p>
          </div>
        </div>
        <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Spiegazione delle Modifiche</h3>
             <div className="bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-lg border border-slate-200/60 dark:border-slate-700/50">
                <MarkdownDisplay content={result.explanation_of_changes} title="" isEmbedded />
            </div>
        </div>
      </div>
    </div>
  );
};

export default ImprovedTextDisplay;
