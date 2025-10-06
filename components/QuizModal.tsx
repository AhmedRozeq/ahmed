import React, { useState, useEffect, useRef } from 'react';
import LoadingSpinner from './LoadingSpinner';
import InfoIcon from './icons/InfoIcon';
import { ClozeTestResult, Collocation, QuizOptions } from '../types';
import { generateClozeTest } from '../services/geminiService';
import EditIcon from './icons/EditIcon';

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  collocation: Collocation | null;
  initialCefrLevel: string;
  initialRegister: string;
}

const QuizModal: React.FC<QuizModalProps> = ({ isOpen, onClose, collocation, initialCefrLevel, initialRegister }) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  
  // Internal state
  const [quizData, setQuizData] = useState<ClozeTestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [topic, setTopic] = useState('');
  const [quizOptions, setQuizOptions] = useState<QuizOptions>({ quizType: 'multiple_choice', cefrLevel: initialCefrLevel, register: initialRegister });
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Reset state on open
      setQuizData(null);
      setIsLoading(false);
      setError(null);
      setUserAnswer('');
      setSubmitted(false);
      setTopic(collocation?.voce || '');
      setQuizOptions({ quizType: 'multiple_choice', cefrLevel: initialCefrLevel, register: initialRegister });

      if (collocation) {
        handleGenerateQuiz(collocation);
      }
    }
  }, [isOpen, collocation, initialCefrLevel, initialRegister]);

  useEffect(() => {
     if (quizData && quizData.quiz_type === 'cloze') {
        setTimeout(() => inputRef.current?.focus(), 100);
     }
  }, [quizData]);


  const handleAnimationEnd = () => {
    if (!isOpen) {
      setShouldRender(false);
    }
  };

  const handleGenerateQuiz = async (item: Collocation | string) => {
    setIsLoading(true);
    setError(null);
    setQuizData(null);
    
    const collocationForApi: Collocation = typeof item === 'string' 
      ? { voce: item, spiegazione: '', frase_originale: '' }
      : item;

    try {
      const data = await generateClozeTest(collocationForApi, quizOptions);
      setQuizData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Si è verificato un errore sconosciuto.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!shouldRender) return null;

  const getButtonClass = (option: string) => {
    if (!submitted) return 'bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200';
    const isCorrect = option.trim().toLowerCase() === quizData?.correct_answer.trim().toLowerCase();
    const isSelected = option.trim().toLowerCase() === userAnswer.trim().toLowerCase();
    if (isCorrect) return 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-400 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-300';
    if (isSelected && !isCorrect) return 'bg-red-100 dark:bg-red-900/40 border-red-400 text-red-800 dark:text-red-200';
    return 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 opacity-70';
  };

  const handleSubmission = (answer: string) => {
    if (!quizData || submitted) return;
    setSubmitted(true);
    setUserAnswer(answer);
  };

  const renderQuizContent = () => {
    if (!quizData) return null;
    const feedback = submitted 
      ? (userAnswer.trim().toLowerCase() === quizData.correct_answer.trim().toLowerCase()
        ? { type: 'correct', message: 'Corretto! Ottimo lavoro.' }
        : { type: 'incorrect', message: `Risposta non corretta. Quella giusta è: "${quizData.correct_answer}"` })
      : null;

    return (
      <div className="animate-fade-in">
        <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed mb-6 text-center bg-slate-50 dark:bg-slate-700/50 p-4 rounded-md border border-slate-200/60 dark:border-slate-600/60">
          {quizData.test_sentence.split('___')[0]}
          <span className="font-bold text-sky-600 dark:text-sky-400 mx-1">___</span>
          {quizData.test_sentence.split('___')[1]}
        </p>
        
        {quizData.quiz_type === 'multiple_choice' ? (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quizData.options?.map((option, index) => (
              <button key={index} onClick={() => handleSubmission(option)} disabled={submitted} className={`w-full p-3 text-left font-medium border rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:cursor-not-allowed ${getButtonClass(option)}`}>
                {option}
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handleSubmission(userAnswer); }}>
            <input ref={inputRef} type="text" value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} disabled={submitted} placeholder="Scrivi qui la parte mancante..." className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-sky-500 dark:bg-slate-900 dark:text-slate-100 transition-shadow duration-200 disabled:bg-slate-100 dark:disabled:bg-slate-800" />
            {!submitted && <div className="flex justify-end mt-4"><button type="submit" disabled={!userAnswer.trim()} className="px-6 py-2 text-base font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">Verifica</button></div>}
          </form>
        )}
        {feedback && (
          <div className={`mt-6 p-4 rounded-md text-center font-medium ${feedback.type === 'correct' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'}`}>
            {feedback.message}
          </div>
        )}
      </div>
    );
  };

  const renderRequestForm = () => (
    <div className="space-y-4">
        <p className="text-slate-600 dark:text-slate-300">Inserisci una collocazione per generare un quiz personalizzato.</p>
        <div>
            <label htmlFor="topic-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Collocazione</label>
            <input id="topic-input" type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Es. 'andare d'accordo'" className="w-full p-2.5 border border-slate-300/80 dark:border-slate-600/80 rounded-lg bg-white/60 dark:bg-slate-900/40 focus:ring-2 focus:ring-sky-500"/>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
                 <label htmlFor="quiz-type" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo di Quiz</label>
                 <select id="quiz-type" value={quizOptions.quizType} onChange={e => setQuizOptions(o => ({...o, quizType: e.target.value as any}))} className="w-full p-2.5 border border-slate-300/80 dark:border-slate-600/80 rounded-lg bg-white/60 dark:bg-slate-900/40 focus:ring-2 focus:ring-sky-500">
                    <option value="multiple_choice">Scelta Multipla</option>
                    <option value="cloze">Completamento</option>
                 </select>
            </div>
             <div>
                 <label htmlFor="cefr-level-quiz" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Livello</label>
                 <select id="cefr-level-quiz" value={quizOptions.cefrLevel} onChange={e => setQuizOptions(o => ({...o, cefrLevel: e.target.value}))} className="w-full p-2.5 border border-slate-300/80 dark:border-slate-600/80 rounded-lg bg-white/60 dark:bg-slate-900/40 focus:ring-2 focus:ring-sky-500">
                    <option value="A1">A1 (Principiante)</option>
                    <option value="A2">A2 (Elementare)</option>
                    <option value="B1">B1 (Intermedio)</option>
                    <option value="B2">B2 (Intermedio-Avanzato)</option>
                    <option value="C1">C1 (Avanzato)</option>
                    <option value="C2">C2 (Padronanza)</option>
                 </select>
            </div>
            <div>
                <label htmlFor="register-quiz" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Registro</label>
                <select id="register-quiz" value={quizOptions.register} onChange={e => setQuizOptions(o => ({...o, register: e.target.value}))} className="w-full p-2.5 border border-slate-300/80 dark:border-slate-600/80 rounded-lg bg-white/60 dark:bg-slate-900/40 focus:ring-2 focus:ring-sky-500">
                    <option value="Neutro">Neutro</option>
                    <option value="Formale">Formale</option>
                    <option value="Informale">Informale</option>
                    <option value="Giornalistico">Giornalistico</option>
                    <option value="Letterario">Letterario</option>
                </select>
            </div>
        </div>
        <div className="flex justify-end pt-2">
            <button onClick={() => handleGenerateQuiz(topic)} disabled={!topic.trim()} className="px-6 py-2 text-base font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:bg-slate-400">Genera Quiz</button>
        </div>
    </div>
  );

  return (
    <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${isOpen ? 'animate-fade-in' : 'animate-fade-out'}`} onClick={onClose} onAnimationEnd={handleAnimationEnd} role="dialog" aria-modal="true">
      <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col ${isOpen ? 'animate-scale-in' : 'animate-scale-out'}`} onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-slate-200/80 dark:border-slate-700/80 flex-shrink-0">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 truncate flex items-center gap-2">
            <EditIcon className="w-5 h-5 text-amber-500" />
            Mettiti alla Prova
          </h2>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Chiudi modale"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </header>
        <div className="p-6 overflow-y-auto">
          {isLoading && <LoadingSpinner message="Preparo il quiz..." />}
          {error && <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-l-4 border-red-500 rounded-r-md flex items-center gap-3"><InfoIcon className="w-6 h-6" /><span>{error}</span></div>}
          {!isLoading && !error && (quizData ? renderQuizContent() : renderRequestForm())}
        </div>
      </div>
    </div>
  );
};

export default QuizModal;