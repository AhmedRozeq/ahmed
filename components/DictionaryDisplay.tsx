import React from 'react';
import { DictionaryResult, DictionaryEntry } from '../types';
import BookOpenIcon from './icons/BookOpenIcon';
import VolumeUpIcon from './icons/VolumeUpIcon';
import QuoteIcon from './icons/QuoteIcon';
import GlobeIcon from './icons/GlobeIcon';
import BookmarkIcon from './icons/BookmarkIcon';

interface DictionaryDisplayProps {
  result: DictionaryResult;
  onSave: (entry: DictionaryEntry) => void;
  savedCollocationsSet: Set<string>;
}

const DictionaryDisplay: React.FC<DictionaryDisplayProps> = ({ result, onSave, savedCollocationsSet }) => {
  
  const handleSpeak = (text: string, lang: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-lg animate-fade-in-up">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-xl">
            <BookOpenIcon className="w-8 h-8 text-teal-600" />
        </div>
        <div>
            <h2 className="text-3xl font-bold text-slate-800">Dizionario Approfondito Italiano-Arabo</h2>
            <p className="text-base text-slate-600 mt-1">Termini chiave estratti dal testo con traduzioni e contesti.</p>
        </div>
      </div>

      <div className="space-y-8">
        {result.dizionario_approfondito.map((entry, index) => {
          const isSaved = savedCollocationsSet.has(entry.termine_italiano);
          return (
            <div key={index} className="bg-gradient-to-br from-white via-slate-50 to-cyan-50/20 p-5 rounded-2xl border border-slate-200/80 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b-2 border-slate-200/80">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-bold text-sky-700">{entry.termine_italiano}</h3>
                  <button 
                    onClick={() => onSave(entry)}
                    aria-label={isSaved ? "Rimuovi dal deck" : "Aggiungi al deck"}
                    className={`p-2 rounded-full transition-colors ${isSaved ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'}`}
                  >
                    <BookmarkIcon className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                  </button>
                </div>
                <div className="flex items-center gap-3 text-right" dir="rtl">
                  <h4 className="text-2xl font-bold text-teal-600" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>{entry.traduzione_arabo}</h4>
                  <button 
                    onClick={() => handleSpeak(entry.traduzione_arabo, 'ar-SA')}
                    className="p-2 rounded-full text-slate-500 hover:bg-slate-200 hover:text-teal-600 transition-colors"
                    aria-label="Ascolta pronuncia araba"
                  >
                    <VolumeUpIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                
                {/* Italian side */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                      <div className="p-2 bg-sky-100 rounded-lg mt-1"><BookOpenIcon className="w-5 h-5 text-sky-600"/></div>
                      <div>
                          <h5 className="font-semibold text-slate-700">Definizione</h5>
                          <p className="text-base text-slate-600 mt-1">{entry.definizione_italiano}</p>
                      </div>
                  </div>
                  <div className="flex items-start gap-3">
                       <div className="p-2 bg-sky-100 rounded-lg mt-1"><QuoteIcon className="w-5 h-5 text-sky-600"/></div>
                      <div>
                          <h5 className="font-semibold text-slate-700">Esempio</h5>
                          <p className="text-base text-slate-800 mt-1 italic">"{entry.esempio_italiano}"</p>
                      </div>
                  </div>
                </div>

                {/* Arabic side */}
                <div className="space-y-4 text-right" dir="rtl">
                   <div className="flex items-start gap-3">
                      <div className="p-2 bg-teal-100 rounded-lg mt-1"><BookOpenIcon className="w-5 h-5 text-teal-600"/></div>
                      <div className="flex-1">
                          <h5 className="font-semibold text-slate-700">التعريف</h5>
                          <p className="text-base text-slate-600 mt-1" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>{entry.definizione_arabo}</p>
                      </div>
                  </div>
                   <div className="flex items-start gap-3">
                      <div className="p-2 bg-teal-100 rounded-lg mt-1"><QuoteIcon className="w-5 h-5 text-teal-600"/></div>
                      <div className="flex-1">
                          <h5 className="font-semibold text-slate-700">مثال</h5>
                          <p className="text-base text-slate-800 mt-1 italic" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>"{entry.esempio_arabo}"</p>
                      </div>
                  </div>
                </div>

              </div>

              <div className="mt-5 pt-4 border-t border-slate-200/80">
                  <div className="flex items-start gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg mt-1"><GlobeIcon className="w-5 h-5 text-indigo-600"/></div>
                      <div>
                          <h5 className="font-semibold text-slate-700">Contesto e Uso</h5>
                          <p className="text-base text-slate-600 mt-1">{entry.contesto_culturale}</p>
                      </div>
                  </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-200/80 flex justify-end">
                  <div className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                      <span className="font-semibold">Pronuncia:</span> <span className="italic tracking-wide">{entry.pronuncia_arabo}</span>
                  </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default DictionaryDisplay;