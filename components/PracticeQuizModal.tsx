import React, { useState, useMemo, useEffect } from 'react';
import { ClozeTestResult } from '../types';
import LoadingSpinner from './LoadingSpinner';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import InfoIcon from './icons/InfoIcon';

interface PracticeQuizModalProps {
    isOpen: boolean;
    onClose: () => void;
    questions: ClozeTestResult[];
    isGenerating: boolean;
    generationError: string | null;
}

const PracticeQuizModal: React.FC<PracticeQuizModalProps> = ({ isOpen, onClose, questions, isGenerating, generationError }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<string[]>([]);
    const [submitted, setSubmitted] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [shouldRender, setShouldRender] = useState(isOpen);

    useEffect(() => {
        if (isOpen) {
          setShouldRender(true);
          resetQuiz();
        }
    }, [isOpen]);

    const handleAnimationEnd = () => {
        if (!isOpen) {
          setShouldRender(false);
        }
    };


    const score = useMemo(() => {
        return userAnswers.reduce((acc, answer, index) => {
            if (questions[index] && answer?.trim().toLowerCase() === questions[index].correct_answer.trim().toLowerCase()) {
                return acc + 1;
            }
            return acc;
        }, 0);
    }, [userAnswers, questions]);

    const handleAnswer = (answer: string) => {
        if (submitted) return;
        setUserAnswers(prev => {
            const newAnswers = [...prev];
            newAnswers[currentIndex] = answer;
            return newAnswers;
        });
        setSubmitted(true);
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSubmitted(false);
        } else {
            setIsFinished(true);
        }
    };

    const resetQuiz = () => {
        setCurrentIndex(0);
        setUserAnswers([]);
        setSubmitted(false);
        setIsFinished(false);
    };
    
    if (!shouldRender) return null;

    const renderContent = () => {
        if (isGenerating) {
            return <LoadingSpinner message="Generazione del quiz in corso..." />;
        }

        if (generationError) {
            return (
                <div className="p-4 bg-red-100 text-red-800 border-l-4 border-red-500 rounded-r-md flex items-center gap-3">
                    <InfoIcon className="w-6 h-6 flex-shrink-0" />
                    <span>{generationError}</span>
                </div>
            );
        }

        if (isFinished) {
            const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
            return (
                <div className="text-center">
                    <h3 className="text-2xl font-bold text-slate-800">Quiz Completato!</h3>
                    <p className="mt-2 text-lg text-slate-600">
                        Hai risposto correttamente a <span className="font-bold text-sky-600">{score}</span> su <span className="font-bold">{questions.length}</span> domande.
                    </p>
                    <div className="w-full bg-slate-200 rounded-full h-4 my-6">
                        <div className="bg-sky-500 h-4 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                    </div>
                    <p className="font-semibold text-2xl">{percentage}%</p>
                    <div className="mt-8 flex justify-center gap-4">
                        <button onClick={resetQuiz} className="px-5 py-2 text-sm font-semibold text-slate-700 bg-slate-200 rounded-md hover:bg-slate-300">
                            Riprova
                        </button>
                        <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
                            Chiudi
                        </button>
                    </div>
                </div>
            );
        }
        
        const currentQuestion = questions[currentIndex];
        if (currentQuestion) {
            const userAnswer = userAnswers[currentIndex];
            const isCorrect = submitted && userAnswer?.trim().toLowerCase() === currentQuestion.correct_answer.trim().toLowerCase();

            return (
                <div>
                    <p className="text-lg text-slate-700 leading-relaxed mb-6 text-center bg-slate-50 p-4 rounded-md">
                        {currentQuestion.test_sentence}
                    </p>
                    {currentQuestion.quiz_type === 'multiple_choice' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {currentQuestion.options?.map((option, index) => {
                                let buttonClass = 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700';
                                if (submitted) {
                                    const isCorrectOption = option.trim().toLowerCase() === currentQuestion.correct_answer.trim().toLowerCase();
                                    const isSelectedOption = option.trim().toLowerCase() === userAnswer?.trim().toLowerCase();
                                    if (isCorrectOption) {
                                        buttonClass = 'bg-emerald-100 border-emerald-400 text-emerald-800 ring-2 ring-emerald-300';
                                    } else if (isSelectedOption && !isCorrectOption) {
                                        buttonClass = 'bg-red-100 border-red-400 text-red-800';
                                    } else {
                                        buttonClass = 'bg-slate-50 border-slate-200 text-slate-500 opacity-70';
                                    }
                                }
                                return (
                                    <button
                                        key={index}
                                        onClick={() => handleAnswer(option)}
                                        disabled={submitted}
                                        className={`w-full p-3 text-left font-medium border rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:cursor-not-allowed ${buttonClass}`}
                                    >
                                        {option}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <form onSubmit={(e) => { e.preventDefault(); handleAnswer(userAnswer || ''); }}>
                            <input
                                type="text"
                                value={userAnswer || ''}
                                onChange={(e) => setUserAnswers(p => { const n = [...p]; n[currentIndex] = e.target.value; return n; })}
                                disabled={submitted}
                                placeholder="Scrivi la risposta..."
                                className="w-full p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-100"
                            />
                            {!submitted && 
                                <button type="submit" disabled={!userAnswer?.trim()} className="mt-4 w-full px-6 py-2 font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
                                    Verifica
                                </button>
                            }
                        </form>
                    )}
                    {submitted && (
                        <div className="mt-4">
                            <div className={`p-4 rounded-md flex items-center gap-3 ${isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                {isCorrect ? <CheckCircleIcon className="w-6 h-6" /> : <XCircleIcon className="w-6 h-6" />}
                                <div className="font-medium">
                                    {isCorrect ? 'Corretto!' : `Sbagliato. La risposta corretta è:`}
                                    {!isCorrect && <strong className="ml-2">"{currentQuestion.correct_answer}"</strong>}
                                </div>
                            </div>
                            <button onClick={handleNext} className="mt-4 w-full px-6 py-2 font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
                                {currentIndex < questions.length - 1 ? 'Prossima Domanda' : 'Vedi Risultati'}
                            </button>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
         <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${isOpen ? 'animate-fade-in' : 'animate-fade-out'}`} onClick={onClose} onAnimationEnd={handleAnimationEnd} role="dialog" aria-modal="true">
            <div className={`bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col ${isOpen ? 'animate-scale-in' : 'animate-scale-out'}`} onClick={(e) => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-800">Quiz di Pratica</h2>
                    {!isFinished && questions.length > 0 && <span className="font-semibold text-slate-600">{currentIndex + 1} / {questions.length}</span>}
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800 p-1 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                </header>
                <div className="p-6 overflow-y-auto">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default PracticeQuizModal;