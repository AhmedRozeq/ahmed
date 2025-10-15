import React, { useState, useCallback, useMemo } from 'react';
import WandIcon from './icons/WandIcon';
import AccordionItem from './AccordionItem';
import { RelatedCollocation, GroundingChunk, Collocation, ClozeTestResult } from '../types';
import LoadingSpinner from './LoadingSpinner';
import LightbulbIcon from './icons/LightbulbIcon';
import InfoIcon from './icons/InfoIcon';
import ChatIcon from './icons/ChatIcon';
import GlobeIcon from './icons/GlobeIcon';
import ImageIcon from './icons/ImageIcon';
import { generateMnemonicImage, generateClozeTestFromText, generateAdditionalExample } from '../services/geminiService';
import XCircleIcon from './icons/XCircleIcon';
import EditIcon from './icons/EditIcon';
import BookTextIcon from './icons/BookTextIcon';
import UsersIcon from './icons/UsersIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';


interface DeepDiveDisplayProps {
  deepDiveItem: string | Collocation;
  content: string | null;
  isLoading: boolean;
  relatedCollocations: RelatedCollocation[] | null;
  isRelatedCollocationsLoading: boolean;
  onTermDeepDive: (item: string) => void;
  relatedCollocationsError?: string | null;
  questions: Array<{ id: string; question: string; answer: string | null; chunks: GroundingChunk[]; isLoading: boolean; error: string | null; }>;
  onAskQuestion: (question: string) => void;
  webSummary: string | null;
  webExamples: GroundingChunk[] | null;
  isWebExamplesLoading: boolean;
  webExamplesError: string | null;
  onConversationalPractice: (item: Collocation | string, context: string | null) => void;
  cefrLevel: string;
  register: string;
}

const InteractiveToolCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick?: () => void;
    children?: React.ReactNode;
    isDisabled?: boolean;
}> = ({ title, description, icon, onClick, children, isDisabled }) => {
    const content = (
        <div className="w-full text-left">
            <div className="flex items-center gap-4">
                {icon}
                <div>
                    <h4 className="font-semibold text-slate-700 dark:text-slate-200">{title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
                </div>
            </div>
            {children && <div className="mt-3">{children}</div>}
        </div>
    );
    if (onClick) {
        return (
            <button 
                onClick={onClick}
                disabled={isDisabled}
                className="p-3 bg-slate-100 dark:bg-slate-900/40 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-900/70 transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-100 dark:disabled:hover:bg-slate-900/40"
            >
                {content}
            </button>
        )
    }
    return <div className="p-3 bg-slate-100 dark:bg-slate-900/40 rounded-lg">{content}</div>
}

const DeepDiveDisplay: React.FC<DeepDiveDisplayProps> = ({ deepDiveItem, content, isLoading, relatedCollocations, isRelatedCollocationsLoading, onTermDeepDive, relatedCollocationsError, questions, onAskQuestion, webSummary, webExamples, isWebExamplesLoading, webExamplesError, onConversationalPractice, cefrLevel, register }) => {
  const [userQuestion, setUserQuestion] = useState('');
  const [mnemonicImage, setMnemonicImage] = useState<{ isLoading: boolean; data: string | null; error: string | null; }>({ isLoading: false, data: null, error: null });
  const [additionalExamples, setAdditionalExamples] = useState<{ isLoading: boolean; content: string[]; error: string | null; }>({ isLoading: false, content: [], error: null });
  const [quizState, setQuizState] = useState<{
    isLoading: boolean;
    data: ClozeTestResult | null;
    error: string | null;
    userAnswer: string;
    submitted: boolean;
  }>({ isLoading: false, data: null, error: null, userAnswer: '', submitted: false });

  const itemName = typeof deepDiveItem === 'string' ? deepDiveItem : deepDiveItem.voce;
  const itemExplanation = typeof deepDiveItem === 'string' ? null : deepDiveItem.spiegazione;
  const isDictionaryEntry = typeof deepDiveItem === 'object' && 'traduzione_arabo' in deepDiveItem;

  const handleGenerateImage = useCallback(() => {
    if (typeof deepDiveItem !== 'string') {
        setMnemonicImage({ isLoading: true, data: null, error: null });
        generateMnemonicImage(deepDiveItem.voce, deepDiveItem.spiegazione)
            .then(imageData => setMnemonicImage({ isLoading: false, data: imageData, error: null }))
            .catch(err => setMnemonicImage({ isLoading: false, data: null, error: err.message }));
    }
  }, [deepDiveItem]);

  const handleGenerateExample = useCallback(async () => {
    if (typeof deepDiveItem !== 'string') {
        setAdditionalExamples(prev => ({ ...prev, isLoading: true }));
        try {
            const example = await generateAdditionalExample(deepDiveItem, { cefrLevel, register });
            setAdditionalExamples(prev => ({ isLoading: false, content: [...prev.content, example], error: null }));
        } catch (err: any) {
            setAdditionalExamples(prev => ({ ...prev, isLoading: false, error: err.message, content: prev.content }));
        }
    }
  }, [deepDiveItem, cefrLevel, register]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userQuestion.trim()) {
      onAskQuestion(userQuestion.trim());
      setUserQuestion('');
    }
  };
  
  const handleGenerateQuiz = useCallback(() => {
    if (!content) {
        setQuizState({ isLoading: false, data: null, error: "Contenuto dell'approfondimento non disponibile per generare un quiz.", userAnswer: '', submitted: false });
        return;
    }
    setQuizState({ isLoading: true, data: null, error: null, userAnswer: '', submitted: false });

    generateClozeTestFromText(content, { quizType: 'cloze', cefrLevel, register })
        .then(data => setQuizState(prev => ({ ...prev, isLoading: false, data })))
        .catch(err => setQuizState(prev => ({ ...prev, isLoading: false, error: err.message })));
  }, [content, cefrLevel, register]);


  const handleQuizFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!quizState.data || quizState.submitted) return;
      setQuizState(prev => ({ ...prev, submitted: true }));
  };

  const renderMarkdown = (text: string, isBilingual: boolean) => {
    const parseInline = (line: string) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold text-slate-900 dark:text-slate-100">{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    };

    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: React.ReactNode[] = [];

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc pl-6 space-y-3 my-4">
            {currentList}
          </ul>
        );
        currentList = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
        const isArabicPair = isBilingual && nextLine.startsWith('AR:');
        const arabicText = isArabicPair ? nextLine.substring(3).trim() : null;

        if (isArabicPair) {
            i++;
        }

        if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
          const itemContent = trimmedLine.substring(2);
          currentList.push(
            <li key={i} className="text-slate-700 dark:text-slate-300">
              {parseInline(itemContent)}
              {arabicText && (
                <div dir="rtl" className="text-right text-slate-600 dark:text-slate-400 mt-1" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
                  {parseInline(arabicText)}
                </div>
              )}
            </li>
          );
        } else {
          flushList();
          if (trimmedLine) {
            elements.push(
              <div key={i} className="mb-4">
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {parseInline(trimmedLine)}
                </p>
                {arabicText && (
                  <p dir="rtl" className="text-right text-slate-600 dark:text-slate-400 leading-relaxed mt-1" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
                    {parseInline(arabicText)}
                  </p>
                )}
              </div>
            );
          }
        }
    }
    
    flushList();
    return elements;
  };

  const sections = React.useMemo(() => {
    if (!content) return [];
    return content
      .split(/\n?### /)
      .filter(part => part.trim() !== '')
      .map(part => {
        const lines = part.trim().split('\n');
        const title = lines[0].trim();
        const body = lines.slice(1).join('\n').trim();
        return { title, content: body };
      })
      .filter(section => section.content);
  }, [content]);

  return (
    <div className="animate-fade-in relative">
      <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 mb-6 truncate">
        <span className="truncate">Su: <span className="text-sky-600 dark:text-sky-400">"{itemName}"</span></span>
      </h2>

      {isLoading && <LoadingSpinner message="Caricamento approfondimento..."/>}
      {!isLoading && content && (
        <div className="space-y-8">
            <div className="space-y-3">
                {sections.length > 0 ? (
                sections.map((section, index) => (
                    <AccordionItem key={index} title={section.title} startOpen={index === 0}>
                        <div>
                            {renderMarkdown(section.content, isDictionaryEntry)}
                        </div>
                    </AccordionItem>
                ))
                ) : (
                    <div>{renderMarkdown(content, isDictionaryEntry)}</div>
                )}
            </div>

            <div className="pt-6 border-t border-slate-200/80 dark:border-slate-700/80">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-3">
                    <WandIcon className="w-7 h-7 text-purple-500" />
                    <span>Strumenti Interattivi</span>
                </h3>
                <div className="space-y-3">
                    {itemExplanation && (
                        <InteractiveToolCard title="Immagine Mnemonica" description="Crea un'immagine per memorizzare" icon={<div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-md"><ImageIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" /></div>} onClick={handleGenerateImage} isDisabled={!!mnemonicImage.data}>
                            {mnemonicImage.isLoading && <div className="py-2"><LoadingSpinner size="sm" message="L'IA sta disegnando..." details={null}/></div>}
                            {mnemonicImage.error && <div className="text-xs text-red-500">{mnemonicImage.error}</div>}
                            {mnemonicImage.data && <img src={`data:image/png;base64,${mnemonicImage.data}`} alt={`Immagine mnemonica per ${itemName}`} className="rounded-lg shadow-md border border-slate-200 dark:border-slate-700 max-w-xs w-full mt-2" />}
                        </InteractiveToolCard>
                    )}
                     {itemExplanation && (
                        <InteractiveToolCard title="Esempi Aggiuntivi" description="Genera una nuova frase d'esempio" icon={<div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-md"><BookTextIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /></div>} onClick={handleGenerateExample} isDisabled={additionalExamples.isLoading}>
                            {additionalExamples.isLoading && <div className="py-2"><LoadingSpinner size="sm" message="Genero esempio..." details={null}/></div>}
                            {additionalExamples.error && <div className="text-xs text-red-500">{additionalExamples.error}</div>}
                            {additionalExamples.content.length > 0 && (
                                <div className="space-y-2 mt-2">
                                    {additionalExamples.content.map((ex, i) => (
                                        <p key={i} className="text-slate-600 dark:text-slate-300 italic text-sm bg-slate-50/80 dark:bg-slate-900/30 p-2 rounded-md border border-slate-200/60 dark:border-slate-700/60">"{ex}"</p>
                                    ))}
                                </div>
                            )}
                        </InteractiveToolCard>
                    )}
                    <InteractiveToolCard title="Pratica Conversazione Vocale" description="Metti in pratica ciò che hai imparato con il tutor IA" icon={<div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-md"><ChatIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /></div>}>
                         <div className="flex flex-wrap gap-3 mt-2">
                            <button onClick={() => onConversationalPractice(deepDiveItem, content)} className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 border border-slate-300/80 dark:border-slate-600 hover:bg-indigo-50 dark:hover:bg-slate-600 shadow-sm">
                                <BookTextIcon className="w-4 h-4" /> Discuti il Testo
                            </button>
                            <button onClick={() => onConversationalPractice(deepDiveItem, null)} className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 border border-slate-300/80 dark:border-slate-600 hover:bg-sky-50 dark:hover:bg-slate-600 shadow-sm">
                                <UsersIcon className="w-4 h-4" /> Simula un Role-Play
                            </button>
                        </div>
                    </InteractiveToolCard>
                </div>
            </div>
            
            <div className="pt-6 border-t border-slate-200/80 dark:border-slate-700/80">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-3">
                    <EditIcon className="w-7 h-7 text-amber-500" />
                    <span>Mettiti alla Prova</span>
                </h3>
                {quizState.isLoading && <LoadingSpinner message="Preparo il quiz..." />}
                {quizState.error && (
                    <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-l-4 border-red-500 rounded-r-md flex items-center gap-3">
                        <InfoIcon className="w-6 h-6 flex-shrink-0" />
                        <span>{quizState.error}</span>
                        <button onClick={handleGenerateQuiz} className="ml-auto px-3 py-1 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-200/70 dark:bg-slate-700/70 hover:bg-slate-300/70 dark:hover:bg-slate-600/70 rounded-md">Riprova</button>
                    </div>
                )}
                {!quizState.isLoading && !quizState.error && (
                    quizState.data ? (
                        <div className="animate-fade-in space-y-4">
                            <form onSubmit={handleQuizFormSubmit}>
                                <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed text-center bg-slate-50/80 dark:bg-slate-900/30 p-4 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                                    {quizState.data.test_sentence.split('___')[0]}
                                    <input
                                        type="text"
                                        value={quizState.userAnswer}
                                        onChange={(e) => setQuizState(p => ({ ...p, userAnswer: e.target.value }))}
                                        disabled={quizState.submitted}
                                        className="inline-block mx-2 p-1 w-48 text-center bg-transparent border-0 border-b-2 border-sky-500 dark:border-sky-400 focus:outline-none focus:ring-0 focus:border-sky-400 dark:focus:border-sky-300 text-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
                                        placeholder="risposta"
                                        autoFocus
                                    />
                                    {quizState.data.test_sentence.split('___')[1]}
                                </p>
                                {!quizState.submitted && (
                                    <div className="flex justify-end mt-4">
                                        <button
                                            type="submit"
                                            disabled={!quizState.userAnswer.trim()}
                                            className="px-6 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-slate-400 disabled:cursor-not-allowed"
                                        >
                                            Verifica
                                        </button>
                                    </div>
                                )}
                            </form>
                            {quizState.submitted && (
                                <div className="mt-4">
                                    {(() => {
                                        const isCorrect = quizState.userAnswer.trim().toLowerCase() === quizState.data.correct_answer.trim().toLowerCase();
                                        return (
                                            <div className={`p-3 rounded-md text-center font-medium flex items-center justify-center gap-2 ${
                                                isCorrect
                                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200'
                                                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                                            }`}>
                                                {isCorrect ? <CheckCircleIcon className="w-5 h-5"/> : <XCircleIcon className="w-5 h-5"/>}
                                                <span>
                                                {isCorrect
                                                    ? 'Corretto! Ottimo lavoro.'
                                                    : `Sbagliato. La risposta giusta è: "${quizState.data.correct_answer}"`
                                                }
                                                </span>
                                            </div>
                                        )
                                    })()}
                                    <div className="flex justify-end gap-2 mt-4">
                                        <button onClick={handleGenerateQuiz} className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-200/70 dark:bg-slate-700/70 hover:bg-slate-300/70 dark:hover:bg-slate-600/70 rounded-md">
                                            Nuovo Quiz
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={handleGenerateQuiz}
                            disabled={!content}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-300 border border-slate-300/80 dark:border-slate-600 hover:bg-amber-50 dark:hover:bg-slate-600 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Genera un quiz sull'approfondimento
                        </button>
                    )
                )}
            </div>

            <div className="pt-6 border-t border-slate-200/80 dark:border-slate-700/80">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-3">
                <GlobeIcon className="w-7 h-7 text-teal-500" />
                <span>Esempi dal Web</span>
                </h3>
                {isWebExamplesLoading && <LoadingSpinner message="Cerco esempi attuali..." />}
                {webExamplesError && (
                <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-l-4 border-red-500 rounded-r-md flex items-center gap-3">
                    <InfoIcon className="w-6 h-6 flex-shrink-0" />
                    <span>{webExamplesError}</span>
                </div>
                )}
                {!isWebExamplesLoading && webSummary && (
                    <p className="text-slate-700 dark:text-slate-300 mb-4 bg-slate-50/80 dark:bg-slate-900/30 p-4 rounded-lg border border-slate-200/60 dark:border-slate-700/60">{webSummary}</p>
                )}
                {!isWebExamplesLoading && webExamples && webExamples.length > 0 && (
                <div className="space-y-3">
                    {webExamples.map((item, index) => (
                    <a
                        key={index}
                        href={item.web.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block bg-white dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200/80 dark:border-slate-700/80 hover:shadow-md hover:border-teal-300 dark:hover:border-teal-600 transition-all hover:bg-teal-50/50 dark:hover:bg-teal-900/20"
                    >
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">{item.web.title || "Fonte Web"}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate group-hover:text-teal-600 dark:group-hover:text-teal-500">{item.web.uri}</p>
                    </a>
                    ))}
                </div>
                )}
                 {!isWebExamplesLoading && !webExamplesError && (!webSummary && (!webExamples || webExamples.length === 0)) && (
                    <p className="text-slate-500 dark:text-slate-400">Nessun esempio web trovato.</p>
                 )}
            </div>
            
            <div className="pt-6 border-t border-slate-200/80 dark:border-slate-700/80">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-3">
                  <ChatIcon className="w-7 h-7 text-violet-500" />
                  <span>Fai una Domanda</span>
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">Hai un dubbio? Chiedi all'IA di rispondere basandosi sull'approfondimento qui sopra.</p>
                
                <form onSubmit={handleFormSubmit} className="flex gap-3 items-center">
                    <input
                        type="text"
                        value={userQuestion}
                        onChange={(e) => setUserQuestion(e.target.value)}
                        placeholder="Es. 'Qual è un sinonimo di...?'"
                        className="flex-grow p-3 bg-white/60 dark:bg-gray-900/40 border border-gray-300/80 dark:border-gray-700/60 rounded-lg shadow-inner focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        aria-label="Fai una domanda sull'approfondimento"
                    />
                    <button 
                        type="submit"
                        disabled={!userQuestion.trim()}
                        className="px-5 py-3 font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        Chiedi
                    </button>
                </form>
                
                {questions.length > 0 && (
                  <div className="mt-6 space-y-4">
                    {questions.map(q => (
                      <div key={q.id} className="bg-slate-50/70 dark:bg-slate-900/30 p-4 rounded-lg border border-slate-200/60 dark:border-slate-700/60 animate-fade-in">
                        <p className="font-semibold text-slate-700 dark:text-slate-200">D: {q.question}</p>
                        <div className="mt-2 pl-4 border-l-2 border-slate-300 dark:border-slate-600">
                          {q.isLoading && (
                              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                  <span>L'IA sta pensando...</span>
                              </div>
                          )}
                          {q.error && (
                              <div className="text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 p-2 rounded-md flex items-start gap-2 text-sm">
                                  <InfoIcon className="w-4 h-4 mt-px flex-shrink-0"/>
                                  <span>{q.error}</span>
                              </div>
                          )}
                          {q.answer && <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{q.answer}</p>}
                          {q.chunks && q.chunks.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                                <h5 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Fonti Web:</h5>
                                <ul className="space-y-1">
                                    {q.chunks.map((chunk, index) => (
                                        <li key={index} className="text-sm">
                                            <a 
                                                href={chunk.web.uri} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-sky-600 dark:text-sky-400 hover:underline flex items-start gap-2 group"
                                            >
                                                <GlobeIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400 group-hover:text-sky-500 transition-colors" />
                                                <span className="truncate">{chunk.web.title || chunk.web.uri}</span>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(DeepDiveDisplay);