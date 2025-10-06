import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SavedCollocation, ClozeTestResult } from '../types';
import { generateClozeTest } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import InfoIcon from './icons/InfoIcon';

interface MegaStudySessionModalProps {
    newItems: SavedCollocation[];
    reviewItems: SavedCollocation[];
    quizPool: SavedCollocation[];
    onClose: () => void;
    onSessionComplete: (updatedItems: SavedCollocation[]) => void;
    quizType: 'cloze' | 'multiple_choice';
}

type Stage = 'learning' | 'reviewing' | 'quizzing' | 'summary';
const STAGES: Stage[] = ['learning', 'reviewing', 'quizzing', 'summary'];
const STAGE_LABELS: Record<Stage, string> = {
    learning: 'Apprendimento',
    reviewing: 'Ripasso',
    quizzing: 'Quiz',
    summary: 'Riepilogo',
};

const srsIntervals = [1, 3, 7, 14, 30];

const MegaStudySessionModal: React.FC<MegaStudySessionModalProps> = ({ newItems, reviewItems, quizPool, onClose, onSessionComplete, quizType }) => {
    const [stage, setStage] = useState<Stage>('learning');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isOpen, setIsOpen] = useState(true);

    const [updatedItems, setUpdatedItems] = useState<SavedCollocation[]>([]);
    const [reviewStats, setReviewStats] = useState({ correct: 0, incorrect: 0 });

    const [quizQuestions, setQuizQuestions] = useState<(ClozeTestResult & { originalItem: SavedCollocation })[]>([]);
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
    const [quizGenerationError, setQuizGenerationError] = useState<string | null>(null);
    const [quizAnswers, setQuizAnswers] = useState<(string | null)[]>([]);
    const [isQuizAnswerSubmitted, setIsQuizAnswerSubmitted] = useState(false);
    
    const handleClose = useCallback(() => {
        setIsOpen(false);
    }, []);

    const handleAnimationEnd = () => {
        if (!isOpen) {
            onClose();
        }
    };

    const currentItems = useMemo(() => {
        if (stage === 'learning') return newItems;
        if (stage === 'reviewing') return reviewItems;
        if (stage === 'quizzing') return quizQuestions;
        return [];
    }, [stage, newItems, reviewItems, quizQuestions]);

    useEffect(() => {
        if (stage === 'learning' && newItems.length === 0) {
            setStage('reviewing');
            setCurrentIndex(0);
        } else if (stage === 'reviewing' && reviewItems.length === 0) {
            setStage('quizzing');
            setCurrentIndex(0);
        }
    }, [stage, newItems, reviewItems]);

    const generateQuiz = useCallback(async () => {
        if (quizPool.length === 0) {
            setStage('summary');
            return;
        }
        setIsGeneratingQuiz(true);
        setQuizGenerationError(null);
        try {
            const promises = quizPool.map(async (item) => {
                const question = await generateClozeTest(item, { quizType, cefrLevel: 'B1' });
                return { ...question, originalItem: item };
            });
            const generatedQuestions = await Promise.all(promises);
            setQuizQuestions(generatedQuestions);
        } catch (error) {
            console.error("Failed to generate quiz", error);
            const message = error instanceof Error ? error.message : "Si è verificato un errore imprevisto durante la generazione del quiz.";
            setQuizGenerationError(message);
        } finally {
            setIsGeneratingQuiz(false);
        }
    }, [quizPool, quizType]);

    useEffect(() => {
        if (stage === 'quizzing' && quizQuestions.length === 0) {
            generateQuiz();
        }
    }, [stage, quizQuestions.length, generateQuiz]);

    const handleProgress = (remembered: boolean) => {
        const item = currentItems[currentIndex] as SavedCollocation;
        if (!item) return;
    
        let updatedItem: SavedCollocation;
        if (remembered) {
            const newSrsLevel = item.srsLevel + 1;
            const intervalDays = srsIntervals[item.srsLevel] || srsIntervals[srsIntervals.length - 1];
            const nextReview = new Date();
            nextReview.setHours(0, 0, 0, 0);
            nextReview.setDate(nextReview.getDate() + intervalDays);
            updatedItem = { ...item, srsLevel: newSrsLevel, nextReviewDate: nextReview.getTime() };
            if (stage === 'reviewing') setReviewStats(s => ({...s, correct: s.correct + 1}));
        } else {
            if (item.srsLevel === 0) {
                updatedItem = { ...item };
            } else {
                const nextReview = new Date();
                nextReview.setHours(0, 0, 0, 0);
                nextReview.setDate(nextReview.getDate() + 1);
                updatedItem = { ...item, srsLevel: 1, nextReviewDate: nextReview.getTime() };
            }
            if (stage === 'reviewing') setReviewStats(s => ({...s, incorrect: s.incorrect + 1}));
        }
        setUpdatedItems(prev => [...prev.filter(i => i.id !== updatedItem.id), updatedItem]);
    
        if (currentIndex < currentItems.length - 1) {
            setCurrentIndex(i => i + 1);
            setIsFlipped(false);
        } else {
            const currentStageIndex = STAGES.indexOf(stage);
            setStage(STAGES[currentStageIndex + 1]);
            setCurrentIndex(0);
            setIsFlipped(false);
        }
    };
    
    const handleQuizAnswer = (answer: string) => {
        if (isQuizAnswerSubmitted) return;
        setQuizAnswers(prev => {
            const newAnswers = [...prev];
            newAnswers[currentIndex] = answer;
            return newAnswers;
        });
        setIsQuizAnswerSubmitted(true);
    };

    const handleNextQuizQuestion = () => {
        if (currentIndex < quizQuestions.length - 1) {
            setCurrentIndex(i => i + 1);
            setIsQuizAnswerSubmitted(false);
        } else {
            setStage('summary');
            setCurrentIndex(0);
        }
    };

    const quizScore = useMemo(() => {
        return quizAnswers.reduce((acc, answer, index) => {
            if (quizQuestions[index] && answer?.trim().toLowerCase() === quizQuestions[index].correct_answer.trim().toLowerCase()) {
                return acc + 1;
            }
            return acc;
        }, 0);
    }, [quizAnswers, quizQuestions]);

    const renderCard = () => {
        const item = currentItems[currentIndex] as SavedCollocation;
        if (!item) return null;
        return (
            <>
                <main className="flex-grow p-6 flex flex-col items-center justify-center">
                    <div className="w-full h-72 perspective-1000">
                        <div 
                            className={`relative w-full h-full transform-style-3d transition-transform duration-500 ${isFlipped ? 'rotate-y-180' : ''}`}
                            onClick={() => setIsFlipped(!isFlipped)}
                             role="button"
                             tabIndex={0}
                             aria-label="Gira la scheda"
                        >
                            <div className="absolute w-full h-full backface-hidden bg-slate-700 rounded-lg flex flex-col items-center justify-center p-6 text-center shadow-lg ring-1 ring-white/5">
                                <span className="text-sm font-semibold uppercase text-sky-400 bg-sky-900/50 px-2 py-1 rounded-full mb-4">{item.tema}</span>
                                <p className="text-4xl font-bold">{item.voce}</p>
                            </div>
                            <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-slate-600 rounded-lg flex flex-col justify-center p-6 shadow-lg overflow-y-auto ring-1 ring-white/5">
                                <p className="text-xl text-slate-200 leading-relaxed mb-4">{item.spiegazione}</p>
                                <p className="text-slate-400 italic border-t border-slate-500 pt-3 mt-3">"{item.frase_originale}"</p>
                            </div>
                        </div>
                    </div>
                </main>
                <footer className="p-4 border-t border-slate-700/80">
                    {isFlipped ? (
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => handleProgress(false)} className="w-full py-4 text-lg font-bold bg-red-800/80 hover:bg-red-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-red-500">Non ricordo</button>
                            <button onClick={() => handleProgress(true)} className="w-full py-4 text-lg font-bold bg-emerald-700/80 hover:bg-emerald-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-emerald-500">Ricordo</button>
                        </div>
                    ) : (
                        <button onClick={() => setIsFlipped(true)} className="w-full py-4 text-lg font-bold bg-sky-600/90 hover:bg-sky-500 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-400">Mostra Risposta</button>
                    )}
                </footer>
            </>
        );
    };

    const renderQuiz = () => {
        if (isGeneratingQuiz) return <div className="flex-grow flex items-center justify-center"><LoadingSpinner message="Generazione del quiz in corso..." /></div>;
        
        if (quizGenerationError) {
            return (
                <main className="flex-grow p-6 flex flex-col items-center justify-center text-center">
                    <InfoIcon className="w-12 h-12 text-red-400 mb-4" />
                    <h3 className="text-xl font-bold text-red-300">Errore nella Generazione del Quiz</h3>
                    <p className="mt-2 text-slate-400 max-w-md">{quizGenerationError}</p>
                    <div className="mt-6 flex gap-4">
                        <button onClick={generateQuiz} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">Riprova</button>
                        <button onClick={() => setStage('summary')} className="px-4 py-2 text-sm font-semibold text-slate-300 bg-slate-700 rounded-md hover:bg-slate-600">Salta Quiz</button>
                    </div>
                </main>
            );
        }
        
        const question = currentItems[currentIndex] as (ClozeTestResult & { originalItem: SavedCollocation });
        if (!question) return <div className="flex-grow flex items-center justify-center">Fine del quiz.</div>;
        
        const userAnswer = quizAnswers[currentIndex];
        const isCorrect = isQuizAnswerSubmitted && userAnswer?.trim().toLowerCase() === question.correct_answer.trim().toLowerCase();

        return (
            <>
                <main className="flex-grow p-6 flex flex-col items-center justify-center">
                    <p className="text-xl text-slate-300 leading-relaxed mb-6 text-center bg-slate-700 p-4 rounded-md w-full">{question.test_sentence}</p>
                    <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {question.options?.map((option, index) => {
                            let buttonClass = 'bg-slate-600 hover:bg-slate-500';
                            if (isQuizAnswerSubmitted) {
                                const isCorrectOption = option.trim().toLowerCase() === question.correct_answer.trim().toLowerCase();
                                const isSelectedOption = option.trim().toLowerCase() === userAnswer?.trim().toLowerCase();
                                if (isCorrectOption) buttonClass = 'bg-emerald-700 ring-2 ring-emerald-400';
                                else if (isSelectedOption && !isCorrectOption) buttonClass = 'bg-red-800';
                                else buttonClass = 'bg-slate-700 opacity-60';
                            }
                            return <button key={index} onClick={() => handleQuizAnswer(option)} disabled={isQuizAnswerSubmitted} className={`w-full p-4 text-left font-medium rounded-md transition-all duration-200 ${buttonClass}`}>{option}</button>
                        })}
                    </div>
                </main>
                <footer className="p-4 border-t border-slate-700/80">
                    {isQuizAnswerSubmitted && (
                        <div className="flex flex-col items-center gap-4">
                            <div className={`p-3 rounded-md flex items-center gap-3 w-full justify-center ${isCorrect ? 'bg-emerald-900/50 text-emerald-300' : 'bg-red-900/50 text-red-300'}`}>
                                {isCorrect ? <CheckCircleIcon className="w-6 h-6" /> : <XCircleIcon className="w-6 h-6" />}
                                <div className="font-medium">{isCorrect ? 'Corretto!' : `Sbagliato. La risposta è: "${question.correct_answer}"`}</div>
                            </div>
                            <button onClick={handleNextQuizQuestion} className="w-full py-3 text-lg font-bold bg-sky-600/90 hover:bg-sky-500 rounded-lg transition-colors">
                                {currentIndex < quizQuestions.length - 1 ? 'Prossima' : 'Vedi Riepilogo'}
                            </button>
                        </div>
                    )}
                </footer>
            </>
        )
    };
    
    const renderSummary = () => {
        const difficultItems = updatedItems
            .filter(item => {
                if (reviewItems.some(reviewItem => reviewItem.id === item.id) && item.srsLevel === 1) {
                    return true;
                }

                if (newItems.some(newItem => newItem.id === item.id) && item.srsLevel === 0) {
                    return true;
                }

                const quizQuestionIndex = quizQuestions.findIndex(q => q.originalItem.id === item.id);
                if (quizQuestionIndex > -1) {
                    const answer = quizAnswers[quizQuestionIndex];
                    const correctAnswer = quizQuestions[quizQuestionIndex].correct_answer;
                    if (answer === null || answer === undefined || answer.trim().toLowerCase() !== correctAnswer.trim().toLowerCase()) {
                        return true;
                    }
                }
                return false;
            })
            .filter((item, index, self) => index === self.findIndex(t => t.id === item.id))
            .slice(0, 5);

        return (
            <main className="flex-grow p-6 flex flex-col items-center justify-center text-center">
                <CheckCircleIcon className="w-16 h-16 text-emerald-400 mb-4" />
                <h3 className="text-3xl font-bold">Mega-sessione Completata!</h3>
                <div className="my-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center w-full max-w-lg">
                    <div className="bg-slate-700 p-4 rounded-lg"><p className="text-2xl font-bold text-sky-400">{newItems.length}</p><p className="text-sm text-slate-400">Voci Nuove</p></div>
                    <div className="bg-slate-700 p-4 rounded-lg"><p className="text-2xl font-bold text-amber-400">{reviewItems.length}</p><p className="text-sm text-slate-400">Voci Ripassate</p></div>
                    <div className="bg-slate-700 p-4 rounded-lg"><p className="text-2xl font-bold text-emerald-400">{quizQuestions.length > 0 ? `${quizScore}/${quizQuestions.length}` : 'N/A'}</p><p className="text-sm text-slate-400">Punteggio Quiz</p></div>
                </div>
                {difficultItems.length > 0 && (
                    <div className="mt-4 text-left w-full max-w-lg">
                        <h4 className="font-semibold text-slate-300">Voci da rivedere:</h4>
                        <ul className="list-disc list-inside bg-slate-700/50 p-3 rounded-md mt-2 text-slate-300">
                            {difficultItems.map(item => <li key={item.id}>{item.voce}</li>)}
                        </ul>
                    </div>
                )}
                <button onClick={() => { onSessionComplete(updatedItems); handleClose(); }} className="mt-8 w-full max-w-xs py-3 text-lg font-bold bg-sky-600/90 hover:bg-sky-500 rounded-lg transition-colors">
                    Fine Sessione
                </button>
            </main>
        );
    };

    const renderStage = () => {
        switch (stage) {
            case 'learning':
            case 'reviewing':
                return renderCard();
            case 'quizzing':
                return renderQuiz();
            case 'summary':
                return renderSummary();
            default:
                return null;
        }
    };

    const stageIndex = STAGES.indexOf(stage);

    return (
         <div className={`fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 ${isOpen ? 'animate-fade-in' : 'animate-fade-out'}`} aria-modal="true" onAnimationEnd={handleAnimationEnd}>
            <div className={`bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col h-[90vh] text-white ring-1 ring-white/10 ${isOpen ? 'animate-scale-in' : 'animate-scale-out'}`}>
                <header className="p-4 border-b border-slate-700/80">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xl font-semibold text-slate-300">Mega-sessione di Studio</h2>
                         <button onClick={handleClose} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-700"><XCircleIcon className="w-6 h-6"/></button>
                    </div>
                    <div className="w-full flex items-center gap-2">
                        {STAGES.map((s, i) => (
                             <div key={s} className="flex-1 text-center">
                                 <p className={`text-sm font-semibold ${i <= stageIndex ? 'text-sky-400' : 'text-slate-500'}`}>{STAGE_LABELS[s]}</p>
                                 <div className={`h-1 mt-1 rounded-full ${i <= stageIndex ? 'bg-sky-500' : 'bg-slate-600'}`}></div>
                             </div>
                        ))}
                    </div>
                     <div className="text-right text-sm text-slate-400 mt-2 h-5">
                        {stage !== 'summary' && stage !== 'quizzing' && `${currentIndex + 1} / ${currentItems.length}`}
                        {stage === 'quizzing' && !isGeneratingQuiz && `${currentIndex + 1} / ${quizQuestions.length}`}
                     </div>
                </header>
                {renderStage()}
            </div>
             <style>{`
                .perspective-1000 { perspective: 1000px; }
                .transform-style-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
            `}</style>
        </div>
    );
};

export default MegaStudySessionModal;