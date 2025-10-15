import React, { useState, useRef } from 'react';
import { SavedCollocation } from '../types';
import TrashIcon from './icons/TrashIcon';
import WandIcon from './icons/WandIcon';
import BookTextIcon from './icons/BookTextIcon';
import SparklesIcon from './icons/SparklesIcon';
import InfoIcon from './icons/InfoIcon';
import Tooltip from './Tooltip';
import VolumeUpIcon from './icons/VolumeUpIcon';
import { speak } from '../utils/audio';
import Edit3Icon from './icons/Edit3Icon';

interface DeckCardProps {
    item: SavedCollocation;
    onUpdate: (updatedItem: SavedCollocation) => void;
    onDelete: (id: string) => void;
    onEdit: (item: SavedCollocation) => void;
    storyState: { isLoading: boolean, content: string | null, error: string | null };
    onGenerateStory: () => void;
    onImproveSentence: () => void;
    onDeepDive: (item: SavedCollocation) => void;
    onVoicePractice: (item: SavedCollocation) => void;
}

const SmallSpinner: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const DeckCard: React.FC<DeckCardProps> = ({
    item,
    onUpdate,
    onDelete,
    onEdit,
    storyState,
    onGenerateStory,
    onImproveSentence,
    onDeepDive,
    onVoicePractice,
}) => {
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [notes, setNotes] = useState(item.notes || '');
    const notesInputRef = useRef<HTMLTextAreaElement>(null);
    const [speakingState, setSpeakingState] = useState(false);

    const handleSpeak = async (text: string) => {
        if (speakingState) {
            window.speechSynthesis.cancel();
            setSpeakingState(false);
            return;
        }
        setSpeakingState(true);
        try {
          await speak(text, 'it-IT');
        } catch (err) {
          console.error("Errore durante la riproduzione dell'audio:", err);
        } finally {
          setSpeakingState(false);
        }
    };

    const handleNotesBlur = () => {
        setIsEditingNotes(false);
        if (notes !== item.notes) {
            onUpdate({ ...item, notes });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            notesInputRef.current?.blur();
        }
    };

    const srsLevelColors = [
        'bg-gray-200 dark:bg-gray-600',
        'bg-red-200 dark:bg-red-800',
        'bg-orange-200 dark:bg-orange-800',
        'bg-yellow-200 dark:bg-yellow-800',
        'bg-lime-200 dark:bg-lime-800',
        'bg-green-200 dark:bg-green-800',
        'bg-emerald-300 dark:bg-emerald-700'
    ];
    
    return (
        <div className="glass-panel p-5 rounded-xl transition-all duration-300 hover:shadow-xl flex flex-col h-full">
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
                <Tooltip text="Modifica scheda">
                    <button
                        onClick={() => onEdit(item)}
                        className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                        <Edit3Icon className="w-5 h-5" />
                    </button>
                </Tooltip>
                <Tooltip text="Elimina dal deck">
                    <button
                        onClick={() => onDelete(item.id)}
                        className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-red-100/60 dark:hover:bg-red-900/40 hover:text-red-600 dark:hover:text-red-400"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </Tooltip>
            </div>
            
            <div className="flex-grow flex flex-col">
                <div className="flex items-start justify-between pr-20">
                    <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{item.voce}</h3>
                         <button
                            onClick={(e) => { e.stopPropagation(); handleSpeak(item.voce); }}
                            disabled={speakingState}
                            className="p-1 rounded-full text-gray-400 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors"
                        >
                            {speakingState ? <SmallSpinner className="w-4 h-4 text-indigo-500" /> : <VolumeUpIcon className="w-4 h-4"/>}
                        </button>
                    </div>
                    <Tooltip text={`Livello SRS: ${item.srsLevel}`}>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className={`w-3 h-3 rounded-full ${i < item.srsLevel ? srsLevelColors[i + 1] : srsLevelColors[0]}`}></div>
                            ))}
                        </div>
                    </Tooltip>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Tema: <span className="font-semibold text-gray-500 dark:text-gray-400">{item.tema}</span></p>

                <div className="my-4 border-t border-gray-200/80 dark:border-gray-700/60"></div>
                <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed flex-grow">{item.spiegazione}</p>

                <div className="mt-4 pt-4 border-t border-gray-200/60 dark:border-gray-700/50">
                    {isEditingNotes ? (
                        <textarea
                            ref={notesInputRef}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            onBlur={handleNotesBlur}
                            onKeyDown={handleKeyDown}
                            className="w-full p-2 text-sm bg-white dark:bg-gray-900/50 border border-indigo-300 dark:border-indigo-700 rounded-md focus:ring-2 focus:ring-indigo-500"
                            placeholder="Aggiungi una nota personale..."
                            rows={2}
                            autoFocus
                        />
                    ) : (
                        <p onClick={() => setIsEditingNotes(true)} className="text-sm text-gray-500 dark:text-gray-400 cursor-text min-h-[40px] p-2 rounded-md hover:bg-gray-100/50 dark:hover:bg-gray-700/30">
                            {item.notes || <span className="italic opacity-70">Aggiungi una nota...</span>}
                        </p>
                    )}
                </div>

                 {(item.tags && item.tags.length > 0) && (
                    <div className="mt-4">
                        <div className="flex flex-wrap gap-2">
                            {item.tags.map(tag => (
                                <span key={tag} className="px-2 py-1 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/50 rounded-full">{tag}</span>
                            ))}
                        </div>
                    </div>
                )}
                
                {(storyState?.isLoading || storyState?.content || storyState?.error) && (
                    <div className="mt-4 pt-4 border-t border-gray-200/60 dark:border-gray-700/50">
                        {storyState.isLoading && <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">L'IA sta scrivendo...</p>}
                        {storyState.error && <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"><InfoIcon className="w-4 h-4" /> {storyState.error}</p>}
                        {storyState.content && (
                            <div className="bg-emerald-50/70 dark:bg-emerald-900/30 p-3 rounded-md animate-fade-in border border-emerald-200/60 dark:border-emerald-500/20">
                                <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{storyState.content}"</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-5 pt-3 border-t border-gray-200/60 dark:border-gray-700/50">
                <div className="flex justify-end items-center gap-1">
                    <Tooltip text="Crea storia">
                        <button onClick={() => onGenerateStory()} disabled={storyState?.isLoading || !!storyState?.content} className="p-2 rounded-full text-gray-500 hover:bg-gray-200/60 dark:text-gray-400 dark:hover:bg-gray-700/60 hover:text-emerald-500 disabled:opacity-50"><BookTextIcon className="w-5 h-5"/></button>
                    </Tooltip>
                    <Tooltip text="Migliora una frase">
                        <button onClick={() => onImproveSentence()} className="p-2 rounded-full text-gray-500 hover:bg-gray-200/60 dark:text-gray-400 dark:hover:bg-gray-700/60 hover:text-purple-500"><SparklesIcon className="w-5 h-5"/></button>
                    </Tooltip>
                    <Tooltip text="Pratica conversazione">
                        <button onClick={() => onVoicePractice(item)} className="p-2 rounded-full text-gray-500 hover:bg-gray-200/60 dark:text-gray-400 dark:hover:bg-gray-700/60 hover:text-sky-500"><VolumeUpIcon className="w-5 h-5"/></button>
                    </Tooltip>
                    <button
                        onClick={() => onDeepDive(item)}
                        className="flex items-center gap-1.5 pl-3 pr-4 py-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100/70 dark:bg-indigo-500/10 rounded-full hover:bg-indigo-200/70 dark:hover:bg-indigo-500/20"
                    >
                        <WandIcon className="w-4 h-4"/>
                        Approfondisci
                    </button>
                </div>
            </div>
        </div>
    );
};

export default React.memo(DeckCard);