import React, { useState } from 'react';
import TranslateIcon from './icons/TranslateIcon';
import VolumeUpIcon from './icons/VolumeUpIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import CheckIcon from './icons/CheckIcon';

interface ArabicTranslationDisplayProps {
  translation: string;
  originalText: string;
}

const ArabicTranslationDisplay: React.FC<ArabicTranslationDisplayProps> = ({ translation, originalText }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(translation).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(translation);
      utterance.lang = 'ar-SA';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="bg-white/50 dark:bg-slate-800/30 backdrop-blur-sm p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-lg animate-fade-in-up">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 rounded-xl">
          <TranslateIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Traduzione Italiano ➔ Arabo</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Italian side */}
        <div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Testo Originale (Italiano)</h3>
          <div className="bg-slate-100/70 dark:bg-slate-900/40 p-4 rounded-lg min-h-[150px] text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/50">
            {originalText}
          </div>
        </div>

        {/* Arabic side */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Traduzione (Arabo)</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                aria-label="Copia traduzione"
              >
                {copied ? <CheckIcon className="w-5 h-5 text-emerald-500" /> : <ClipboardIcon className="w-5 h-5" />}
              </button>
              <button
                onClick={handleSpeak}
                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                aria-label="Ascolta pronuncia"
              >
                <VolumeUpIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div dir="rtl" lang="ar" className="bg-slate-100/70 dark:bg-slate-900/40 p-4 rounded-lg min-h-[150px] text-slate-800 dark:text-slate-200 text-right text-lg border border-slate-200/60 dark:border-slate-700/50" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
            {translation}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArabicTranslationDisplay;