import React, { useState, useMemo, DragEvent } from 'react';
import { SavedCollocation, Collocation } from '../types';
import DeckCard from './DeckCard';

const KANBAN_COLUMNS = ['Da Studiare', 'In Studio', 'Appreso'] as const;
type KanbanStatus = typeof KANBAN_COLUMNS[number];

const getKanbanStatus = (item: SavedCollocation): KanbanStatus => {
    if (item.srsLevel <= 1) return 'Da Studiare';
    if (item.srsLevel <= 4) return 'In Studio';
    return 'Appreso';
};

const getSrsLevelForStatus = (status: KanbanStatus): number => {
    switch (status) {
        case 'Da Studiare': return 1;
        case 'In Studio': return 3;
        case 'Appreso': return 5;
        default: return 0;
    }
};

interface KanbanBoardProps {
    deck: SavedCollocation[];
    onUpdateDeck: (newDeck: SavedCollocation[]) => void;
    onUpdateCard: (updatedItem: SavedCollocation) => void;
    onRemoveCard: (id: string) => void;
    stories: Record<string, {isLoading: boolean, content: string | null, error: string | null}>;
    onGenerateStory: (item: SavedCollocation) => void;
    onOpenSentenceImprover: (collocation?: SavedCollocation) => void;
    onDeepDive: (item: Collocation | string) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ deck, onUpdateDeck, onUpdateCard, onRemoveCard, stories, onGenerateStory, onOpenSentenceImprover, onDeepDive }) => {
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<KanbanStatus | null>(null);

    const columns = useMemo(() => {
        const boardColumns: Record<KanbanStatus, SavedCollocation[]> = {
            'Da Studiare': [],
            'In Studio': [],
            'Appreso': [],
        };
        deck.forEach(item => {
            const status = getKanbanStatus(item);
            boardColumns[status].push(item);
        });
        // Sort items within each column by save date
        for (const key in boardColumns) {
            boardColumns[key as KanbanStatus].sort((a, b) => b.savedAt - a.savedAt);
        }
        return boardColumns;
    }, [deck]);

    const handleDragStart = (e: DragEvent<HTMLDivElement>, item: SavedCollocation) => {
        setDraggedItemId(item.id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>, status: KanbanStatus) => {
        e.preventDefault();
        if (status !== dragOverColumn) {
            setDragOverColumn(status);
        }
    };
    
    const handleDragLeave = () => {
        setDragOverColumn(null);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>, status: KanbanStatus) => {
        e.preventDefault();
        const itemId = draggedItemId;
        if (!itemId) return;

        const itemToMove = deck.find(item => item.id === itemId);
        if (!itemToMove || getKanbanStatus(itemToMove) === status) {
            setDraggedItemId(null);
            setDragOverColumn(null);
            return;
        }

        const newSrsLevel = getSrsLevelForStatus(status);
        const intervalDays = newSrsLevel === 1 ? 1 : newSrsLevel === 3 ? 7 : 30;
        const nextReview = new Date();
        nextReview.setHours(0, 0, 0, 0);
        nextReview.setDate(nextReview.getDate() + intervalDays);

        const updatedItem = {
            ...itemToMove,
            srsLevel: newSrsLevel,
            nextReviewDate: nextReview.getTime(),
        };

        const newDeck = deck.map(item => (item.id === updatedItem.id ? updatedItem : item));
        onUpdateDeck(newDeck);
        
        setDraggedItemId(null);
        setDragOverColumn(null);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            {KANBAN_COLUMNS.map(status => (
                <div 
                    key={status}
                    onDragOver={(e) => handleDragOver(e, status)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, status)}
                    className={`bg-slate-100/70 dark:bg-slate-800/50 p-4 rounded-xl transition-colors duration-300 ${dragOverColumn === status ? 'bg-sky-100 dark:bg-sky-900/40 ring-2 ring-sky-400' : ''}`}
                >
                    <div className="flex justify-between items-center mb-4 px-2">
                         <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200">{status}</h3>
                         <span className="text-sm font-semibold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full px-2.5 py-0.5">{columns[status].length}</span>
                    </div>
                    <div className="space-y-4 h-full min-h-[300px]">
                        {columns[status].map(item => (
                            <div 
                                key={item.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, item)}
                                className={`cursor-grab active:cursor-grabbing transition-opacity duration-300 ${draggedItemId === item.id ? 'opacity-40 scale-95' : 'opacity-100'}`}
                            >
                                 <DeckCard
                                    item={item}
                                    onUpdate={onUpdateCard}
                                    onDelete={onRemoveCard}
                                    storyState={stories[item.id]}
                                    onGenerateStory={() => onGenerateStory(item)}
                                    onImproveSentence={() => onOpenSentenceImprover(item)}
                                    onDeepDive={onDeepDive}
                                />
                            </div>
                        ))}
                         {dragOverColumn === status && columns[status].length === 0 && (
                            <div className="w-full h-24 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex items-center justify-center">
                                <span className="text-slate-400 dark:text-slate-500">Rilascia qui</span>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default KanbanBoard;