import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SavedCollocation, Collocation } from '../types';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';
import TagIcon from './icons/TagIcon';
import QuoteIcon from './icons/QuoteIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import Tooltip from './Tooltip';
import BookTextIcon from './icons/BookTextIcon';
import WandIcon from './icons/WandIcon';
import InfoIcon from './icons/InfoIcon';

interface DeckCardProps {
    item: SavedCollocation;
    onUpdate: (updatedItem: SavedCollocation) => void;
    onDelete: (id: string) => void;
    storyState?: { isLoading: boolean; content: string | null; error: string | null };
    onGenerateStory: () => void;
    onImproveSentence: () => void;
    onDeepDive?: (item: Collocation | string) => void;
}

const srsIntervals = [1, 3, 7, 14, 30]; // Days

const getSrsStageLabel = (item: SavedCollocation): { text: string, color: string } => {
    if (item.srsLevel === 0) return { text: "Nuova", color: "bg-blue-100 text-blue-800" };
    if (item.srsLevel > srsIntervals.length) return { text: "Imparata", color: "bg-emerald-100 text-emerald-800" };

    const now = new Date();
    const reviewDate = new Date(item.nextReviewDate);
    now.setHours(0, 0, 0, 0);
    reviewDate.setHours(0, 0, 0, 0);

    if (reviewDate <= now) return { text: "Da ripassare", color: "bg-amber-100 text-amber-800 animate-pulse" };
    
    const diffTime = reviewDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return { text: "Domani", color: "bg-slate-100 text-slate-600" };
    return { text: `In ${diffDays} giorni`, color: "bg-slate-100 text-slate-600" };
};

const DeckCard: React.FC<DeckCardProps> = ({ item, onUpdate, onDelete, storyState, onGenerateStory, onImproveSentence, onDeepDive }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [notes, setNotes] = useState(item.notes || '');
    const [tags, setTags] = useState((item.tags || []).join(', '));
    const notesTextareaRef = useRef<HTMLTextAreaElement>(null);

    const isDueForReview = useMemo(() => {
        if (item.srsLevel === 0) return false;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return item.nextReviewDate <= now.getTime();
    }, [item.nextReviewDate, item.srsLevel]);

    useEffect(() => {
        if (isEditing && notesTextareaRef.current) {
            notesTextareaRef.current.style.height = 'auto';
            notesTextareaRef.current.style.height = `${notesTextareaRef.current.scrollHeight}px`;
        }
    }, [isEditing, notes]);

    const handleSrsUpdate = (remembered: boolean) => {
        let newSrsLevel: number;
        let nextReview: Date;

        if (remembered) {
            newSrsLevel = item.srsLevel + 1;
            const intervalDays = srsIntervals[item.srsLevel] || srsIntervals[srsIntervals.length - 1];
            nextReview = new Date();
            nextReview.setHours(0, 0, 0, 0);
            nextReview.setDate(nextReview.getDate() + intervalDays);
        } else {
            newSrsLevel = 1; // Reset to level 1, review tomorrow
            nextReview = new Date();
            nextReview.setHours(0, 0, 0, 0);
            nextReview.setDate(nextReview.getDate() + 1);
        }

        onUpdate({
            ...item,
            srsLevel: newSrsLevel,
            nextReviewDate: nextReview.getTime(),
        });
    };


    const handleSave = () => {
        const updatedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
        onUpdate({ ...item, notes, tags: updatedTags });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setNotes(item.notes || '');
        setTags((item.tags || []).join(', '));
        setIsEditing(false);
    };
    
    const progressPercentage = Math.min((item.srsLevel / (srsIntervals.length + 1)) * 100, 100);
    const srsStage = getSrsStageLabel(item);

    return (
        <div onClick={() => onDeepDive && onDeepDive(item)} className="bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-200/80">
                <div className={`h-1.5 rounded-r-full transition-all duration-500 ${isDueForReview ? 'bg-amber-400' : 'bg-sky-500'}`} style={{ width: `${progressPercentage}%` }}></div>
            </div>
             <div className={`p-5 flex-grow flex flex-col transition-opacity duration-300 ${isEditing ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold uppercase text-sky-700 bg-sky-100 px-2 py-1 rounded-full">{item.tema}</span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${srsStage.color}`}>{srsStage.text}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mt-3">{item.voce}</h3>
                <p className="mt-2 text-base text-slate-600 leading-relaxed flex-grow">{item.spiegazione}</p>
                
                {item.notes && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                         <p className="text-sm text-slate-700 whitespace-pre-wrap"><QuoteIcon className="inline-block w-4 h-4 mr-1.5 -mt-1 text-slate-400" />{item.notes}</p>
                    </div>
                )}
                
                {item.tags && item.tags.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2 items-center">
                        <TagIcon className="w-4 h-4 text-slate-400" />
                        {item.tags.map(tag => (
                            <span key={tag} className="text-xs font-medium text-indigo-700 bg-indigo-100 px-2 py-1 rounded-full">{tag}</span>
                        ))}
                    </div>
                )}

                 <div className="mt-4 pt-4 border-t border-slate-200/60 space-y-2">
                    {storyState?.isLoading && <p className="text-sm text-slate-500 animate-pulse">Creo una storia...</p>}
                    {storyState?.error && <p className="text-sm text-red-600 flex items-center gap-1"><InfoIcon className="w-4 h-4" /> {storyState.error}</p>}
                    {storyState?.content && (
                        <div className="bg-slate-100 p-3 rounded-md animate-fade-in">
                            <p className="text-sm text-slate-700 italic">"{storyState.content}"</p>
                        </div>
                    )}
                </div>
            </div>

            {isEditing && (
                <div className="p-5 absolute inset-0 bg-white">
                    <h3 className="text-lg font-bold text-slate-800">{item.voce}</h3>
                    <div className="mt-2 space-y-3">
                        <div>
                            <label htmlFor={`notes-${item.id}`} className="block text-sm font-medium text-slate-700 mb-1">Note Personali</label>
                            <textarea id={`notes-${item.id}`} ref={notesTextareaRef} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg resize-none overflow-hidden focus:ring-2 focus:ring-sky-500" rows={2}/>
                        </div>
                        <div>
                            <label htmlFor={`tags-${item.id}`} className="block text-sm font-medium text-slate-700 mb-1">Tag (separati da virgola)</label>
                            <input id={`tags-${item.id}`} type="text" value={tags} onChange={(e) => setTags(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"/>
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleCancel(); }} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Annulla</button>
                        <button onClick={(e) => { e.stopPropagation(); handleSave(); }} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg">Salva</button>
                    </div>
                </div>
            )}
            
            <div className={`border-t border-slate-100 transition-opacity`}>
                {isDueForReview ? (
                    <div className="grid grid-cols-2">
                         <button onClick={(e) => { e.stopPropagation(); handleSrsUpdate(false); }} className="flex items-center justify-center gap-2 p-3 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition-colors">
                            <XCircleIcon className="w-5 h-5"/> Non ricordo
                        </button>
                         <button onClick={(e) => { e.stopPropagation(); handleSrsUpdate(true); }} className="flex items-center justify-center gap-2 p-3 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                            <CheckCircleIcon className="w-5 h-5"/> Ricordo
                        </button>
                    </div>
                ) : (
                    <div className={`h-12 flex items-center justify-end p-2 gap-1 transition-opacity duration-300 ${isEditing ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}>
                        <Tooltip text="Crea storia">
                             <button onClick={(e) => { e.stopPropagation(); onGenerateStory(); }} disabled={!!storyState?.isLoading || !!storyState?.content} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><BookTextIcon className="w-5 h-5"/></button>
                        </Tooltip>
                         <Tooltip text="Migliora una frase">
                             <button onClick={(e) => { e.stopPropagation(); onImproveSentence(); }} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"><WandIcon className="w-5 h-5"/></button>
                        </Tooltip>
                        <Tooltip text="Modifica note e tag">
                            <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"><EditIcon className="w-5 h-5"/></button>
                        </Tooltip>
                        {confirmDelete ? (
                            <div className="flex gap-2 items-center p-1">
                                <span className="text-sm text-slate-600">Eliminare?</span>
                                <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="px-2 py-1 text-xs text-white bg-red-600 rounded-md hover:bg-red-700">Sì</button>
                                <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }} className="px-2 py-1 text-xs text-slate-700 bg-slate-200 rounded-md hover:bg-slate-300">No</button>
                            </div>
                        ) : (
                            <Tooltip text="Rimuovi">
                                <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }} className="p-2 rounded-full text-slate-500 hover:bg-red-100 hover:text-red-600 transition-colors"><TrashIcon className="w-5 h-5"/></button>
                            </Tooltip>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeckCard;