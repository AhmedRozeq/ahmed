import React, { useState, useCallback } from 'react';
import WandIcon from './icons/WandIcon';
import AccordionItem from './AccordionItem';
import { RelatedCollocation, GroundingChunk, Collocation, ClozeTestResult } from '../types';
import LoadingSpinner from './LoadingSpinner';
import LightbulbIcon from './icons/LightbulbIcon';
import InfoIcon from './icons/InfoIcon';
import ChatIcon from './icons/ChatIcon';
import GlobeIcon from './icons/GlobeIcon';
import ImageIcon from './icons/ImageIcon';
import { generateMnemonicImage, generateClozeTest, generateClozeTestFromText } from '../services/geminiService';
import XCircleIcon from './icons/XCircleIcon';
import EditIcon from './icons/EditIcon';


interface DeepDiveDisplayProps {
  deepDiveItem: string | Collocation;
  content: string | null;
  isLoading: boolean;
  relatedCollocations: RelatedCollocation[] | null;
  isRelatedCollocationsLoading: boolean;
  onTermDeepDive: (item: string) => void;
  relatedCollocationsError?: string | null;
  questions: Array<{ id: string; question: string; answer: string | null; isLoading: boolean; error: string | null; }>;
  onAskQuestion: (question: string) => void;
  webSummary: string | null;
  webExamples: GroundingChunk[] | null;
  isWebExamplesLoading: boolean;
  webExamplesError: string | null;
}

const DeepDiveDisplay: React.FC<DeepDiveDisplayProps> = ({ deepDiveItem, content, isLoading, relatedCollocations, isRelatedCollocationsLoading, onTermDeepDive, relatedCollocationsError, questions, onAskQuestion, webSummary, webExamples, isWebExamplesLoading, webExamplesError }) => {
  const [userQuestion, setUserQuestion] = useState('');
  const [mnemonicImage, setMnemonicImage] = useState<{ isLoading: boolean; data: string | null; error: string | null; }>({ isLoading: false, data: null, error: null });
  const [quizState, setQuizState] = useState<{
    isLoading: boolean;
    data: ClozeTestResult | null;
    error: string | null;
    userAnswer: string;
    submitted: boolean;
  }>({ isLoading: false, data: null, error: null, userAnswer: '', submitted: false });

  const itemName = typeof deepDiveItem === 'string' ? deepDiveItem : deepDiveItem.voce;
  const itemExplanation = typeof deepDiveItem === 'string' ? null : deepDiveItem.spiegazione;

  const handleGenerateImage = useCallback(() => {
    if (typeof deepDiveItem !== 'string') {
        setMnemonicImage({ isLoading: true, data: null, error: null });
        generateMnemonicImage(deepDiveItem.voce, deepDiveItem.spiegazione)
            .then(imageData => setMnemonicImage({ isLoading: false, data: imageData, error: null }))
            .catch(err => setMnemonicImage({ isLoading: false, data: null, error: err.message }));
    }
  }, [deepDiveItem]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userQuestion.trim()) {
      onAskQuestion(userQuestion.trim());
      setUserQuestion('');
    }
  };
  
  const handleGenerateQuiz = useCallback(() => {
    setQuizState({ isLoading: true, data: null, error: null, userAnswer: '', submitted: false });

    // If there is deep dive content, use it to generate the quiz for both themes and collocations.
    if (content) { 
        generateClozeTestFromText(content, { quizType: 'cloze', cefrLevel: 'B1' })
            .then(data => setQuizState(prev => ({ ...prev, isLoading: false, data })))
            .catch(err => setQuizState(prev => ({ ...prev, isLoading: false, error: err.message })));
    } else if (typeof deepDiveItem === 'object') { // Fallback for a collocation if deep dive content isn't ready
        generateClozeTest(deepDiveItem, { quizType: 'cloze', cefrLevel: 'B1' })
            .then(data => setQuizState(prev => ({ ...prev, isLoading: false, data })))
            .catch(err => setQuizState(prev => ({ ...prev, isLoading: false, error: err.message })));
    } else {
        setQuizState(prev => ({ ...prev, isLoading: false, error: "Contenuto dell'approfondimento non ancora disponibile." }));
    }
  }, [deepDiveItem, content]);

  const handleQuizFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!quizState.data || quizState.submitted) return;
      setQuizState(prev => ({ ...prev, submitted: true }));
  };

  const renderMarkdown = (text: string) => {
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
          <ul key={`ul-${elements.length}`} className="list-disc pl-6 space-y-2 my-4">
            {currentList}
          </ul>
        );
        currentList = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        const itemContent = trimmedLine.substring(2);
        currentList.push(<li key={index} className="text-slate-700 dark:text-slate-300">{parseInline(itemContent)}</li>);
      } else {
        flushList();
        if (trimmedLine) {
          elements.push(
            <p key={index} className="text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
              {parseInline(trimmedLine)}
            </p>
          );
        }
      }
    });

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

  const canGenerateQuiz = (typeof deepDiveItem === 'object') || (typeof deepDiveItem === 'string' && !!content);

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
                        {renderMarkdown(section.content)}
                    </div>
                    </AccordionItem>
                ))
                ) : (
                <div>
                    {renderMarkdown(content)}
                </div>
                )}
            </div>
            
            {itemExplanation && (
              <div className="pt-6 border-t border-slate-200/80 dark:border-slate-700/80">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-3">
                  <ImageIcon className="w-7 h-7 text-purple-500" />
                  <span>Immagine Mnemonica</span>
                </h3>
                {mnemonicImage.isLoading && <LoadingSpinner message="L'IA sta disegnando per te..." />}
                {mnemonicImage.error && (
                  <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-l-4 border-red-500 rounded-r-md flex items-center gap-3">
                    <InfoIcon className="w-6 h-6 flex-shrink-0" />
                    <span>{mnemonicImage.error}</span>
                  </div>
                )}
                {!mnemonicImage.data && !mnemonicImage.isLoading && (
                  <button
                    onClick={handleGenerateImage}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 border border-slate-300/80 dark:border-slate-600 hover:bg-purple-50 dark:hover:bg-slate-600 shadow-sm"
                  >
                    Crea un'immagine per memorizzare
                  </button>
                )}
                {mnemonicImage.data && (
                    <div className="mt-4 animate-fade-in flex flex-col items-center">
                        <img src={`data:image/png;base64,${mnemonicImage.data}`} alt={`Immagine mnemonica per ${itemName}`} className="rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 max-w-sm w-full" />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Immagine generata da IA</p>
                    </div>
                )}
              </div>
            )}

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
                                        className="inline-block mx-2 p-1 w-48 text-center bg-white dark:bg-slate-800 border-b-2 border-sky-500 dark:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300 rounded-sm text-lg text-slate-800 dark:text-slate-200"
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
                                    <div className={`p-3 rounded-md text-center font-medium ${
                                        quizState.userAnswer.trim().toLowerCase() === quizState.data.correct_answer.trim().toLowerCase()
                                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200'
                                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                                    }`}>
                                        {quizState.userAnswer.trim().toLowerCase() === quizState.data.correct_answer.trim().toLowerCase()
                                            ? 'Corretto! Ottimo lavoro.'
                                            : `Risposta non corretta. Quella giusta è: "${quizState.data.correct_answer}"`
                                        }
                                    </div>
                                    <div className="flex justify-end gap-2 mt-4">
                                        <button onClick={handleGenerateQuiz} className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-200/70 dark:bg-slate-700/70 hover:bg-slate-300/70 dark:hover:bg-slate-600/70 rounded-md">
                                            Nuovo Quiz
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        canGenerateQuiz && (
                            <button
                                onClick={handleGenerateQuiz}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-300 border border-slate-300/80 dark:border-slate-600 hover:bg-amber-50 dark:hover:bg-slate-600 shadow-sm"
                            >
                                {typeof deepDiveItem === 'object'
                                    ? "Genera un quiz per questa collocazione"
                                    : "Genera un quiz su questo tema"
                                }
                            </button>
                        )
                    )
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
                        className="flex-grow p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
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