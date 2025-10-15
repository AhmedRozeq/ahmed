import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SavedCollocation, ClozeTestResult, Collocation } from '../types';
import { generateClozeTest, generateAdditionalExample } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import InfoIcon from './icons/InfoIcon';
import VolumeUpIcon from './icons/VolumeUpIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import WandIcon from './icons/WandIcon';

interface StudySessionModalProps {
    newItems: SavedCollocation[];
    reviewItems: SavedCollocation[];
    onClose: () => void;
    onSessionComplete: (updatedItems: SavedCollocation[]) => void;
    sessionMode: 'flashcard' | 'quiz_multiple_choice' | 'quiz_cloze' | 'mixed';
    cefrLevel: string;
    register: string;
}

const srsIntervals = [1, 3, 7, 14, 30];

const StudySessionModal: React.FC<StudySessionModalProps> = ({ newItems, reviewItems, onClose, onSessionComplete, sessionMode, cefrLevel, register }) => {
    const sessionQueue = useMemo(() => [...reviewItems, ...newItems], [newItems, reviewItems]);
    const totalItems = sessionQueue.length;

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [updatedItems, setUpdatedItems] = useState<SavedCollocation[]>([]);
    const [isOpen, setIsOpen] = useState(true);
    
    const [quizState, setQuizState] = useState<{
        isLoading: boolean;
        data: ClozeTestResult | null;
        error: string | null;
        isSubmitted: boolean;
        userAnswer: string;
    }>({ isLoading: false, data: null, error: null, isSubmitted: false, userAnswer: '' });
    
    const [extraExample, setExtraExample] = useState<{ isLoading: boolean; content: string | null; error: string | null }>({ isLoading: false, content: null, error: null });
    const currentItem = sessionQueue[currentIndex];

    const showQuizForCurrentItem = useMemo(() => {
        if (!currentItem) return false;
        if (sessionMode.startsWith('quiz')) return true;
        if (sessionMode === 'mixed' && currentItem.srsLevel > 0 && currentIndex % 3 !== 0) return true;
        return false;
    }, [sessionMode, currentItem, currentIndex]);

    const handleClose = useCallback(() => {
        setIsOpen(false);
    }, []);

    const handleAnimationEnd = () => {
        if (!isOpen) {
            onClose();
        }
    };

    // Effect to handle session completion when all items have been processed
    useEffect(() => {
        if (currentIndex >= totalItems && totalItems > 0) {
            onSessionComplete(updatedItems);
            handleClose();
        }
    }, [currentIndex, totalItems, updatedItems, onSessionComplete, handleClose]);


    const handleSpeak = (text: string) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'it-IT';
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
        }
    };
    
    const loadQuizForItem = useCallback(async (item: SavedCollocation) => {
        if (!item) return;
        setQuizState({ isLoading: true, data: null, error: null, isSubmitted: false, userAnswer: '' });
        try {
            const quizType = sessionMode === 'quiz_cloze' ? 'cloze' : 'multiple_choice';
            const data = await generateClozeTest(item, { quizType, cefrLevel, register });
            setQuizState(prev => ({ ...prev, isLoading: false, data }));
        } catch (err) {
            console.error("Errore during il caricamento del quiz per la sessione di studio:", err);
            const message = err instanceof Error ? err.message : "Impossibile caricare il quiz.";
            setQuizState(prev => ({ ...prev, isLoading: false, error: message }));
        }
    }, [sessionMode, cefrLevel, register]);

    const advanceSession = useCallback(() => {
        setCurrentIndex(prev => prev + 1);
    }, []);
    
    const handleProgress = useCallback((remembered: boolean) => {
        if (!currentItem) return;

        let updatedItem: SavedCollocation;

        if (remembered) {
            const newSrsLevel = currentItem.srsLevel + 1;
            const intervalDays = srsIntervals[currentItem.srsLevel] || srsIntervals[srsIntervals.length - 1];
            const nextReview = new Date();
            nextReview.setHours(0,0,0,0);
            nextReview.setDate(nextReview.getDate() + intervalDays);
            updatedItem = { ...currentItem, srsLevel: newSrsLevel, nextReviewDate: nextReview.getTime() };
        } else {
             if (currentItem.srsLevel === 0) {
                // If it's a new card and they get it wrong, it stays as a new card
                updatedItem = { ...currentItem };
            } else {
                // If it's a review card and they get it wrong, reset level to 1 for review tomorrow
                const nextReview = new Date();
                nextReview.setHours(0,0,0,0);
                nextReview.setDate(nextReview.getDate() + 1);
                updatedItem = { ...currentItem, srsLevel: 1, nextReviewDate: nextReview.getTime() };
            }
        }
        
        setUpdatedItems(prev => [...prev.filter(i => i.id !== updatedItem.id), updatedItem]);
        advanceSession();
    }, [currentItem, advanceSession]);

    useEffect(() => {
        setIsFlipped(false);
        setExtraExample({ isLoading: false, content: null, error: null });
        if (currentItem && showQuizForCurrentItem) {
            loadQuizForItem(currentItem);
        } else {
            setQuizState({ isLoading: false, data: null, error: null, isSubmitted: false, userAnswer: '' });
        }
    }, [currentIndex, currentItem, showQuizForCurrentItem, loadQuizForItem]);


    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleClose();
                return;
            }
            if (!showQuizForCurrentItem) {
                if (e.key === ' ') {
                    e.preventDefault();
                    setIsFlipped(f => !f);
                }
                if (isFlipped) {
                    if (e.key === '1' || e.key.toLowerCase() === 'j') {
                        handleProgress(false);
                    } else if (e.key === '2' || e.key.toLowerCase() === 'k') {
                        handleProgress(true);
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showQuizForCurrentItem, isFlipped, handleProgress, handleClose]);
    
    const handleQuizSubmit = (answer: string) => {
        if (!quizState.data) return;
        setQuizState(prev => ({...prev, isSubmitted: true, userAnswer: answer}));
    };

    const handleNextAfterQuiz = () => {
        if (!quizState.data) return;
        const isCorrect = quizState.userAnswer.trim().toLowerCase() === quizState.data.correct_answer.trim().toLowerCase();
        handleProgress(isCorrect);
    };

    const handleGetExtraExample = async () => {
        if (!currentItem) return;
        setExtraExample({ isLoading: true, content: null, error: null });
        try {
            const example = await generateAdditionalExample(currentItem, { cefrLevel, register });
            setExtraExample({ isLoading: false, content: example, error: null });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Impossibile caricare l'esempio.";
            setExtraExample({ isLoading: false, content: null, error: message });
        }
    }

    const renderCard = () => (
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
                    {/* Front of the card */}
                    <div className="absolute w-full h-full backface-hidden bg-slate-700 rounded-lg flex flex-col items-center justify-center p-6 text-center shadow-lg ring-1 ring-white/5">
                        <span className="text-sm font-semibold uppercase text-sky-400 bg-sky-900/50 px-2 py-1 rounded-full mb-4">{currentItem.tema}</span>
                        <div className="flex items-center gap-4">
                            <p className="text-4xl font-bold">{currentItem.voce}</p>
                            <button onClick={(e) => { e.stopPropagation(); handleSpeak(currentItem.voce); }} className="p-2 rounded-full text-slate-300 hover:bg-slate-600 hover:text-white transition-colors"><VolumeUpIcon className="w-6 h-6"/></button>
                        </div>
                    </div>
                    {/* Back of the card */}
                    <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-slate-600 rounded-lg flex flex-col p-6 shadow-lg overflow-y-auto ring-1 ring-white/5">
                        <div className="flex-grow">
                            <p className="text-xl text-slate-200 leading-relaxed mb-4">{currentItem.spiegazione}</p>
                            <p className="text-slate-400 italic border-t border-slate-500 pt-3 mt-3">
                                "{currentItem.frase_originale}"
                            </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-700/50 flex-shrink-0">
                            <button onClick={(e) => { e.stopPropagation(); handleGetExtraExample(); }} disabled={extraExample.isLoading} className="flex items-center gap-2 text-sm text-sky-300 hover:text-sky-200 disabled:opacity-50">
                                {extraExample.isLoading ? (
                                    <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Caricamento...</>
                                ) : (
                                    <><WandIcon className="w-4 h-4"/> Altro Esempio</>
                                )}
                            </button>
                            {extraExample.content && <p className="text-slate-300 italic mt-2 animate-fade-in">"{extraExample.content}"</p>}
                            {extraExample.error && <p className="text-red-400 text-xs mt-2">{extraExample.error}</p>}
                        </div>
                    </div>
                </div>
            </div>
             <p className="text-center text-slate-400 text-xs mt-4">
                {isFlipped 
                    ? "Scorciatoie: '1' o 'J' (Non ricordo), '2' o 'K' (Ricordo)"
                    : "Scorciatoia: 'Spazio' per girare la scheda"
                }
            </p>
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

    const renderQuiz = () => {
        if (quizState.isLoading) return <main className="flex-grow flex items-center justify-center"><LoadingSpinner message="Preparo la domanda..." /></main>;
        if (quizState.error) return <main className="flex-grow flex items-center justify-center p-6"><div className="p-4 bg-red-900/50 text-red-300 border-l-4 border-red-500 rounded-r-md flex items-center gap-3"><InfoIcon className="w-6 h-6 flex-shrink-0" /><span>{quizState.error}</span></div></main>;
        if (!quizState.data) return null;

        const isCorrect = quizState.isSubmitted && quizState.userAnswer.trim().toLowerCase() === quizState.data.correct_answer.trim().toLowerCase();

        return (
            <>
            <main className="flex-grow p-6 flex flex-col items-center justify-center">
                <div className="text-center w-full">
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <p className="text-xl text-slate-300 leading-relaxed text-center bg-slate-700 p-4 rounded-md">
                            {quizState.data.test_sentence}
                        </p>
                        <button onClick={() => handleSpeak(quizState.data.test_sentence.replace(/___/g, ''))} className="p-2 rounded-full text-slate-300 hover:bg-slate-600 hover:text-white transition-colors"><VolumeUpIcon className="w-6 h-6"/></button>
                    </div>

                    {quizState.data.quiz_type === 'multiple_choice' ? (
                        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {quizState.data.options?.map((option, index) => {
                                let buttonClass = 'bg-slate-600 hover:bg-slate-500';
                                if (quizState.isSubmitted) {
                                    const isCorrectOption = option.trim().toLowerCase() === quizState.data.correct_answer.trim().toLowerCase();
                                    const isSelectedOption = option.trim().toLowerCase() === quizState.userAnswer.trim().toLowerCase();
                                    if (isCorrectOption) buttonClass = 'bg-emerald-700 ring-2 ring-emerald-400';
                                    else if (isSelectedOption && !isCorrectOption) buttonClass = 'bg-red-800';
                                    else buttonClass = 'bg-slate-700 opacity-60';
                                }
                                return <button key={index} onClick={() => handleQuizSubmit(option)} disabled={quizState.isSubmitted} className={`w-full p-4 text-left font-medium rounded-md transition-all duration-200 ${buttonClass}`}>{option}</button>;
                            })}
                        </div>
                    ) : (
                        <form className="w-full" onSubmit={(e) => { e.preventDefault(); handleQuizSubmit(quizState.userAnswer); }}>
                            <input type="text" value={quizState.userAnswer} onChange={(e) => setQuizState(p => ({...p, userAnswer: e.target.value}))} disabled={quizState.isSubmitted} placeholder="Scrivi la risposta..." className="w-full p-3 bg-slate-700 border border-slate-500 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-800" />
                            {!quizState.isSubmitted && <button type="submit" disabled={!quizState.userAnswer.trim()} className="mt-4 w-full py-3 font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-600">Verifica</button>}
                        </form>
                    )}
                </div>
            </main>
            <footer className="p-4 border-t border-slate-700/80">
                {quizState.isSubmitted && (
                    <div className="flex flex-col items-center gap-4">
                        <div className={`p-3 rounded-md flex items-center gap-3 w-full justify-center ${isCorrect ? 'bg-emerald-900/50 text-emerald-300' : 'bg-red-900/50 text-red-300'}`}>
                            {isCorrect ? <CheckCircleIcon className="w-6 h-6" /> : <XCircleIcon className="w-6 h-6" />}
                            <div className="font-medium">{isCorrect ? 'Corretto!' : `Sbagliato. La risposta è: "${quizState.data.correct_answer}"`}</div>
                        </div>
                        <button onClick={handleNextAfterQuiz} className="w-full py-4 text-lg font-bold bg-sky-600/90 hover:bg-sky-500 rounded-lg transition-colors">Prossima</button>
                    </div>
                )}
            </footer>
            </>
        );
    };

    if (!currentItem) {
        return null;
    }
    
    return (
        <div 
            className={`fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 ${isOpen ? 'animate-fade-in' : 'animate-fade-out'}`}
            aria-modal="true"
            onAnimationEnd={handleAnimationEnd}
        >
            <div className={`bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col h-[80vh] text-white ring-1 ring-white/10 ${isOpen ? 'animate-scale-in' : 'animate-scale-out'}`}>
                <header className="flex items-center justify-between p-4 border-b border-slate-700/80">
                    <h2 className="text-lg font-semibold text-slate-300">
                        Sessione di Studio
                    </h2>
                    <div className="text-right">
                        <p className="font-semibold text-lg">{currentIndex + 1} / {totalItems}</p>
                        <p className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${currentItem.srsLevel === 0 ? "bg-sky-500/20 text-sky-300" : "bg-amber-500/20 text-amber-300"}`}>
                            {currentItem.srsLevel === 0 ? "Nuova" : "Ripasso"}
                        </p>
                    </div>
                </header>
                
                {showQuizForCurrentItem ? renderQuiz() : renderCard()}
                
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

export default StudySessionModal;