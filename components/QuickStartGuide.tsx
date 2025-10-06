import React from 'react';
import SparklesIcon from './icons/SparklesIcon';
import SearchIcon from './icons/SearchIcon';
import DeckIcon from './icons/DeckIcon';
import HelpCircleIcon from './icons/HelpCircleIcon';

const QuickStartGuide: React.FC = () => {
  return (
    <div className="bg-white/50 dark:bg-slate-800/30 backdrop-blur-lg border border-slate-200/80 dark:border-slate-700/50 rounded-2xl shadow-lg p-6 sm:p-10 animate-fade-in-up">
      <div className="text-center">
        <div className="inline-block p-4 bg-sky-100/80 dark:bg-sky-500/10 rounded-full">
            <HelpCircleIcon className="w-12 h-12 text-sky-600 dark:text-sky-400" />
        </div>
        <h2 className="mt-4 text-3xl font-bold text-slate-800 dark:text-slate-100">Pronto a Iniziare?</h2>
        <p className="mt-2 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          Inizia la tua avventura linguistica. Ecco come funziona questo strumento.
        </p>
      </div>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-6 bg-white/60 dark:bg-slate-900/30 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-center transform transition-transform duration-300 hover:-translate-y-2">
           <div className="flex items-center justify-center w-16 h-16 mx-auto bg-sky-100 dark:bg-sky-900/50 rounded-full border-2 border-sky-200 dark:border-sky-500/20 shadow-inner">
            <span className="text-3xl font-bold text-sky-600 dark:text-sky-400">1</span>
          </div>
          <h3 className="mt-6 text-xl font-semibold text-slate-800 dark:text-slate-100">Analizza</h3>
          <p className="mt-2 text-base text-slate-500 dark:text-slate-400">
            Incolla un testo e lascia che l'IA estragga le collocazioni, analizzi la grammatica, o crei un dizionario.
          </p>
        </div>
        <div className="p-6 bg-white/60 dark:bg-slate-900/30 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-center transform transition-transform duration-300 hover:-translate-y-2">
          <div className="flex items-center justify-center w-16 h-16 mx-auto bg-sky-100 dark:bg-sky-900/50 rounded-full border-2 border-sky-200 dark:border-sky-500/20 shadow-inner">
            <span className="text-3xl font-bold text-sky-600 dark:text-sky-400">2</span>
          </div>
          <h3 className="mt-6 text-xl font-semibold text-slate-800 dark:text-slate-100">Esplora</h3>
          <p className="mt-2 text-base text-slate-500 dark:text-slate-400">
            Naviga tra i risultati, approfondisci ogni dettaglio, fai quiz e usa la selezione del testo per analisi mirate.
          </p>
        </div>
        <div className="p-6 bg-white/60 dark:bg-slate-900/30 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-center transform transition-transform duration-300 hover:-translate-y-2">
          <div className="flex items-center justify-center w-16 h-16 mx-auto bg-sky-100 dark:bg-sky-900/50 rounded-full border-2 border-sky-200 dark:border-sky-500/20 shadow-inner">
            <span className="text-3xl font-bold text-sky-600 dark:text-sky-400">3</span>
          </div>
          <h3 className="mt-6 text-xl font-semibold text-slate-800 dark:text-slate-100">Studia</h3>
          <p className="mt-2 text-base text-slate-500 dark:text-slate-400">
            Salva le voci più utili nel tuo Deck, organizza il tuo studio con il Piano e ripassa con sessioni intelligenti.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuickStartGuide;