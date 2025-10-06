import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SavedCollocation } from '../types';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';
import Tooltip from './Tooltip';
import XCircleIcon from './icons/XCircleIcon';

interface QuickPracticeModalProps {
    deck: SavedCollocation[];
    onClose: () => void;
}

const SESSION_DURATION = 60; // in seconds

const QuickPracticeModal: React.FC<QuickPracticeModalProps> = ({ deck, onClose }) => {
    const shuffledDeck = useMemo(() => [...deck].sort(() => Math.random() - 0.5), [deck]);
    const totalItems = shuffledDeck.length;

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [timeLeft, setTimeLeft] = useState(SESSION_DURATION);
    const [isOpen, setIsOpen] = useState(true); // Internal state for animation

    const currentItem = shuffledDeck[currentIndex];
    
    const handleClose = useCallback(() => {
        setIsOpen(false);
    }, []);

    const handleAnimationEnd = () => {
        if (!isOpen) {
            onClose();
        }
    };


    useEffect(() => {
        if (timeLeft <= 0) return;
        const timerId = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timerId);
    }, [timeLeft]);
    
    const handleNext = useCallback(() => {
        setCurrentIndex(prev => Math.min(prev + 1, totalItems - 1));
        setIsFlipped(false);
    }, [totalItems]);
    
    const handlePrev = useCallback(() => {
        setCurrentIndex(prev => Math.max(prev - 1, 0));
        setIsFlipped(false);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === ' ') {
                e.preventDefault();
                setIsFlipped(f => !f);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleNext();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrev();
            } else if (e.key === 'Escape') {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNext, handlePrev, handleClose]);

    if (!currentItem) {
        return null; 
    }

    const timerPercentage = (timeLeft / SESSION_DURATION) * 100;
    
    return (
        <div 
            className={`fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 ${isOpen ? 'animate-fade-in' : 'animate-fade-out'}`}
            aria-modal="true"
            onAnimationEnd={handleAnimationEnd}
        >
            <div className={`bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col h-[80vh] text-white ring-1 ring-white/10 ${isOpen ? 'animate-scale-in' : 'animate-scale-out'}`}>
                <header className="flex items-center justify-between p-4 border-b border-slate-700/80 flex-shrink-0">
                    <h2 className="text-lg font-semibold text-slate-300">
                        Ripasso Rapido
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="font-semibold text-lg">{currentIndex + 1} / {totalItems}</p>
                        </div>
                        <Tooltip text="Chiudi sessione">
                            <button
                                onClick={handleClose}
                                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-700"
                                aria-label="Chiudi sessione"
                            >
                                <XCircleIcon className="w-6 h-6"/>
                            </button>
                        </Tooltip>
                    </div>
                </header>
                
                <main className="flex-grow p-6 flex flex-col items-center justify-center relative">
                     {timeLeft > 0 ? (
                        <p className="absolute top-4 text-base font-mono text-slate-400">Tempo: {timeLeft}s</p>
                    ) : (
                        <p className="absolute top-4 text-base font-bold text-amber-400 animate-pulse">Tempo Scaduto!</p>
                    )}

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
                                <p className="text-3xl font-bold">{currentItem.voce}</p>
                            </div>
                            {/* Back of the card */}
                            <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-slate-600 rounded-lg flex flex-col justify-center p-6 shadow-lg overflow-y-auto ring-1 ring-white/5">
                                <p className="text-lg text-slate-200 leading-relaxed mb-4">{currentItem.spiegazione}</p>
                                <p className="text-slate-400 italic border-t border-slate-500 pt-3 mt-3">
                                    "{currentItem.frase_originale}"
                                </p>
                            </div>
                        </div>
                    </div>
                </main>
                
                <footer className="p-4 border-t border-slate-700/80 flex-shrink-0">
                    <div className="w-full bg-slate-600 rounded-full h-2.5 mb-4">
                        <div className="bg-sky-500 h-2.5 rounded-full transition-all duration-1000" style={{width: `${timerPercentage}%`}}></div>
                    </div>
                    <div className="flex justify-between items-center">
                        <Tooltip text="Scheda precedente (←)">
                            <button
                                onClick={handlePrev}
                                disabled={currentIndex === 0}
                                className="p-3 rounded-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                aria-label="Scheda precedente"
                            >
                                <ArrowLeftIcon className="w-6 h-6" />
                            </button>
                        </Tooltip>
                        <p className="text-sm text-slate-400 hidden sm:block">Usa 'Spazio' per girare, '←' e '→' per navigare.</p>
                        <Tooltip text="Scheda successiva (→)">
                            <button
                                onClick={handleNext}
                                disabled={currentIndex === totalItems - 1}
                                className="p-3 rounded-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                aria-label="Scheda successiva"
                            >
                                <ArrowRightIcon className="w-6 h-6" />
                            </button>
                        </Tooltip>
                    </div>
                </footer>
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

export default QuickPracticeModal;