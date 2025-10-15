import React, { useState, useCallback, useMemo, FC } from 'react';
import { GeneratedCardData, MindMapResult, Collocation, SuggestCollocationsResult, ThematicDeckResult, MindMapNode } from '../types';
import { generateLanguageMindMap, generateCollocationCard, suggestCollocationsFromConcept, generateThematicDeck } from '../services/geminiService';
import PlusCircleIcon from './icons/PlusCircleIcon';
import LoadingSpinner from './LoadingSpinner';
import SparklesIcon from './icons/SparklesIcon';
import CollocationIcon from './icons/CollocationIcon';
import ShuffleIcon from './icons/ShuffleIcon';
import BrainIcon from './icons/BrainIcon';
import ZapIcon from './icons/ZapIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import LightbulbIcon from './icons/LightbulbIcon';
import DeckIcon from './icons/DeckIcon';
import WandIcon from './icons/WandIcon';

interface CreativeLabProps {
  onAddToDeck: (newCard: GeneratedCardData & { notes: string; tags: string[] }) => void;
  onDeepDive: (item: Collocation | string) => void;
  cefrLevel: string;
  register: string;
  onOpenAddCardModal: (topic: string) => void;
}

interface ExplorationLevel {
    concept: string;
    results: MindMapResult['nodi'];
}

const nodeInfo: Record<string, { label: string; icon: FC<any>, iconClass: string }> = {
    collocazione: { label: 'Collocazioni', icon: CollocationIcon, iconClass: 'text-sky-500' },
    sinonimo: { label: 'Sinonimi', icon: ShuffleIcon, iconClass: 'text-emerald-500' },
    concetto_correlato: { label: 'Concetti Correlati', icon: BrainIcon, iconClass: 'text-amber-500' },
    antonimo: { label: 'Antonimi', icon: ZapIcon, iconClass: 'text-rose-500' },
};

const CreativeLab: React.FC<CreativeLabProps> = ({ onAddToDeck, onDeepDive, cefrLevel, register, onOpenAddCardModal }) => {
    // Shared state
    const [cardCreationState, setCardCreationState] = useState<Record<string, { isLoading: boolean }>>({});
    const [singleCardTopic, setSingleCardTopic] = useState('');

    // Conceptual Explorer State
    const [explorerConcept, setExplorerConcept] = useState('');
    const [isExplorerLoading, setIsExplorerLoading] = useState(false);
    const [explorerError, setExplorerError] = useState<string | null>(null);
    const [explorationStack, setExplorationStack] = useState<ExplorationLevel[]>([]);

    // Collocation Suggester State
    const [suggesterIdea, setSuggesterIdea] = useState('');
    const [isSuggesterLoading, setIsSuggesterLoading] = useState(false);
    const [suggesterError, setSuggesterError] = useState<string | null>(null);
    const [suggesterResult, setSuggesterResult] = useState<SuggestCollocationsResult | null>(null);

    // Thematic Deck Generator State
    const [deckTheme, setDeckTheme] = useState('');
    const [isDeckLoading, setIsDeckLoading] = useState(false);
    const [deckError, setDeckError] = useState<string | null>(null);
    const [deckResult, setDeckResult] = useState<ThematicDeckResult | null>(null);
    
    // Shared options
    const [localCefrLevel, setLocalCefrLevel] = useState(cefrLevel);
    const [localRegister, setLocalRegister] = useState(register);

    const handleQuickAdd = useCallback(async (voce: string) => {
        setCardCreationState(prev => ({ ...prev, [voce]: { isLoading: true } }));
        try {
            const cardData = await generateCollocationCard(voce, { cefrLevel: localCefrLevel, register: localRegister });
            onAddToDeck({ ...cardData, notes: '', tags: [] });
        } catch (e) {
            console.error(e); // TODO: Show toast
        } finally {
            setCardCreationState(prev => ({ ...prev, [voce]: { isLoading: false } }));
        }
    }, [localCefrLevel, localRegister, onAddToDeck]);
    
    const handleSingleCardSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (singleCardTopic.trim()) {
            onOpenAddCardModal(singleCardTopic.trim());
            setSingleCardTopic('');
        }
    };

    // --- Conceptual Explorer Logic ---
    const startExploration = useCallback(async (newConcept: string, resetStack: boolean = false) => {
        setIsExplorerLoading(true);
        setExplorerError(null);
        
        const currentStack = resetStack ? [] : explorationStack;

        try {
            const result = await generateLanguageMindMap(newConcept, { cefrLevel: localCefrLevel, register: localRegister });
            setExplorationStack([...currentStack, { concept: newConcept, results: result.nodi }]);
        } catch (err) {
            setExplorerError(err instanceof Error ? err.message : "Si è verificato un errore.");
        } finally {
            setIsExplorerLoading(false);
        }
    }, [localCefrLevel, localRegister, explorationStack]);

    const handleExplorerSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (explorerConcept.trim()) {
            startExploration(explorerConcept.trim(), true);
        }
    };
    
    // --- Collocation Suggester Logic ---
    const handleSuggesterSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!suggesterIdea.trim()) return;
        setIsSuggesterLoading(true);
        setSuggesterError(null);
        setSuggesterResult(null);
        try {
            const result = await suggestCollocationsFromConcept(suggesterIdea, { cefrLevel: localCefrLevel, register: localRegister });
            setSuggesterResult(result);
        } catch (err) {
            setSuggesterError(err instanceof Error ? err.message : "Si è verificato un errore.");
        } finally {
            setIsSuggesterLoading(false);
        }
    }, [suggesterIdea, localCefrLevel, localRegister]);

    // --- Thematic Deck Generator Logic ---
    const handleDeckSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deckTheme.trim()) return;
        setIsDeckLoading(true);
        setDeckError(null);
        setDeckResult(null);
        try {
            const result = await generateThematicDeck(deckTheme, { cefrLevel: localCefrLevel, register: localRegister });
            setDeckResult(result);
        } catch (err) {
            setDeckError(err instanceof Error ? err.message : "Si è verificato un errore.");
        } finally {
            setIsDeckLoading(false);
        }
    }, [deckTheme, localCefrLevel, localRegister]);

    const currentExploration = explorationStack.length > 0 ? explorationStack[explorationStack.length - 1] : null;

    const groupedExplorerResults = useMemo<Record<string, MindMapNode[]>>(() => {
        if (!currentExploration || !Array.isArray(currentExploration.results)) return {};
        return currentExploration.results.reduce((acc, node) => {
            if (!acc[node.tipo]) {
                acc[node.tipo] = [];
            }
            acc[node.tipo].push(node);
            return acc;
        }, {} as Record<string, MindMapNode[]>);
    }, [currentExploration]);

    const ActionButtons: FC<{voce: string}> = ({ voce }) => (
        <div className="flex items-center gap-1">
            <button onClick={() => onDeepDive(voce)} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-sky-500 transition-colors" aria-label="Approfondisci"><WandIcon className="w-4 h-4"/></button>
            <button onClick={() => handleQuickAdd(voce)} disabled={cardCreationState[voce]?.isLoading} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-emerald-500 transition-colors disabled:opacity-50" aria-label="Aggiungi al deck">
                {cardCreationState[voce]?.isLoading ? <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" fill="currentColor"></path></svg> : <PlusCircleIcon className="w-4 h-4"/>}
            </button>
        </div>
    );

    return (
        <div className="glass-panel p-6 rounded-2xl shadow-lg">
            <div className="flex items-start gap-4 mb-6">
                <div className="p-2 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 rounded-xl mt-1">
                    <SparklesIcon className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Laboratorio Creativo</h2>
                    <p className="text-slate-600 dark:text-slate-300">Esplora la lingua, trova le parole giuste e crea nuove schede di studio.</p>
                </div>
            </div>
            
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Livello QCER (per tutti gli strumenti)</label>
                    <select value={localCefrLevel} onChange={e => setLocalCefrLevel(e.target.value)} className="w-full p-2 bg-white/60 dark:bg-gray-900/40 border border-gray-300/80 dark:border-gray-700/60 rounded-lg shadow-inner focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200">
                        <option value="A1">A1</option><option value="A2">A2</option><option value="B1">B1</option><option value="B2">B2</option><option value="C1">C1</option><option value="C2">C2</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Registro Linguistico (per tutti gli strumenti)</label>
                    <select value={localRegister} onChange={e => setLocalRegister(e.target.value)} className="w-full p-2 bg-white/60 dark:bg-gray-900/40 border border-gray-300/80 dark:border-gray-700/60 rounded-lg shadow-inner focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200">
                        <option value="Neutro">Neutro</option>
                        <option value="Formale">Formale</option>
                        <option value="Informale">Informale</option>
                        <option value="Giornalistico">Giornalistico</option>
                        <option value="Letterario">Letterario</option>
                        <option value="Burocratico">Burocratico</option>
                    </select>
                </div>
            </div>

            <div className="my-6 p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/30 dark:to-teal-900/30">
                <h3 className="font-bold text-lg flex items-center gap-2 mb-2 text-emerald-800 dark:text-emerald-200">
                    <SparklesIcon className="w-5 h-5"/>
                    Crea Scheda Veloce
                </h3>
                <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-3">Inserisci una parola o collocazione e l'IA creerà una scheda di studio completa per te.</p>
                <form onSubmit={handleSingleCardSubmit} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={singleCardTopic}
                        onChange={e => setSingleCardTopic(e.target.value)}
                        placeholder="Es. 'prendere una decisione'"
                        className="w-full p-2 text-sm bg-white/60 dark:bg-gray-900/40 border border-gray-300/80 dark:border-gray-700/60 rounded-lg shadow-inner focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"/>
                    <button
                        type="submit"
                        className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                        disabled={!singleCardTopic.trim()}>
                        Crea
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Conceptual Explorer */}
                <div className="bg-white/50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex flex-col">
                    <h3 className="font-bold text-lg flex items-center gap-2 mb-3"><BrainIcon className="w-6 h-6 text-amber-500" /> Esploratore Concettuale</h3>
                    <form onSubmit={handleExplorerSubmit} className="flex gap-2">
                        <input type="text" value={explorerConcept} onChange={e => setExplorerConcept(e.target.value)} placeholder="Parola o concetto..." className="w-full p-2 text-sm bg-white/60 dark:bg-gray-900/40 border border-gray-300/80 dark:border-gray-700/60 rounded-lg shadow-inner focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"/>
                        <button type="submit" className="px-3 py-2 text-sm font-semibold text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:bg-slate-400"><ChevronRightIcon className="w-5 h-5"/></button>
                    </form>
                    <div className="mt-3 flex-grow min-h-[150px]">
                        {isExplorerLoading && <div className="flex justify-center items-center h-full"><LoadingSpinner size="sm" message={null} details={null} /></div>}
                        {explorerError && <p className="text-xs text-red-500 p-2">{explorerError}</p>}
                        {explorationStack.length > 0 && (
                             <div className="text-sm space-y-3">
                                 <div className="flex flex-wrap items-center gap-1 text-xs">
                                     {explorationStack.map((level, index) => (
                                         <React.Fragment key={index}>
                                             <button onClick={() => setExplorationStack(explorationStack.slice(0, index + 1))} className="hover:underline text-slate-600 dark:text-slate-400">{level.concept}</button>
                                             {index < explorationStack.length - 1 && <ChevronRightIcon className="w-3 h-3 text-slate-400" />}
                                         </React.Fragment>
                                     ))}
                                 </div>
                                 <div className="space-y-3">
                                     {Object.entries(groupedExplorerResults).map(([tipo, nodi]) => {
                                         const info = nodeInfo[tipo];
                                         if (!info || !Array.isArray(nodi) || nodi.length === 0) return null;
                                         const Icon = info.icon;
                                         return (
                                             <div key={tipo}>
                                                 <h5 className={`font-semibold flex items-center gap-1.5 text-xs uppercase tracking-wider ${info.iconClass}`}><Icon className="w-4 h-4"/>{info.label}</h5>
                                                 <ul className="mt-1 space-y-1">
                                                     {nodi.map(item => (
                                                         <li key={item.voce} className="flex justify-between items-center bg-slate-100 dark:bg-slate-900/30 p-1.5 rounded-md">
                                                             <button onClick={() => startExploration(item.voce, false)} className="text-slate-700 dark:text-slate-300 hover:underline text-left">{item.voce}</button>
                                                             <ActionButtons voce={item.voce} />
                                                         </li>
                                                     ))}
                                                 </ul>
                                             </div>
                                         );
                                     })}
                                 </div>
                             </div>
                        )}
                        {!isExplorerLoading && explorationStack.length === 0 && <div className="text-center text-xs text-slate-500 pt-10">Inizia inserendo un concetto.</div>}
                    </div>
                </div>

                {/* Collocation Suggester */}
                 <div className="bg-white/50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex flex-col">
                    <h3 className="font-bold text-lg flex items-center gap-2 mb-3"><LightbulbIcon className="w-6 h-6 text-sky-500" /> Suggeritore di Collocazioni</h3>
                    <form onSubmit={handleSuggesterSubmit}>
                        <textarea value={suggesterIdea} onChange={e => setSuggesterIdea(e.target.value)} placeholder="Descrivi un'idea o contesto..." className="w-full p-2 text-sm bg-white/60 dark:bg-gray-900/40 border border-gray-300/80 dark:border-gray-700/60 rounded-lg shadow-inner focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500" rows={2}/>
                        <button type="submit" disabled={isSuggesterLoading} className="w-full mt-2 px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400 flex items-center justify-center">
                            {isSuggesterLoading ? <><svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" fill="currentColor"></path></svg> Cerco...</> : 'Suggerisci'}
                        </button>
                    </form>
                    <div className="mt-3 flex-grow min-h-[150px]">
                        {isSuggesterLoading && <div className="flex justify-center items-center h-full"><LoadingSpinner size="sm" message={null} details={null} /></div>}
                        {suggesterError && <p className="text-xs text-red-500 p-2">{suggesterError}</p>}
                        {suggesterResult && suggesterResult.suggestions && Array.isArray(suggesterResult.suggestions) && (
                             <ul className="text-sm space-y-1">
                                {suggesterResult.suggestions.map(sugg => (
                                    <li key={sugg} className="flex justify-between items-center bg-slate-100 dark:bg-slate-900/30 p-1.5 rounded-md">
                                        <button onClick={() => { setExplorerConcept(sugg); startExploration(sugg, true); }} className="text-slate-700 dark:text-slate-300 hover:underline text-left">{sugg}</button>
                                        <ActionButtons voce={sugg} />
                                    </li>
                                ))}
                            </ul>
                        )}
                         {!isSuggesterLoading && !suggesterResult && <div className="text-center text-xs text-slate-500 pt-10">Scrivi un'idea per trovare collocazioni.</div>}
                    </div>
                </div>

                {/* Thematic Deck Generator */}
                <div className="bg-white/50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex flex-col">
                    <h3 className="font-bold text-lg flex items-center gap-2 mb-3"><DeckIcon className="w-6 h-6 text-emerald-500" /> Generatore Deck Tematico</h3>
                    <form onSubmit={handleDeckSubmit}>
                        <input type="text" value={deckTheme} onChange={e => setDeckTheme(e.target.value)} placeholder="Scrivi un tema..." className="w-full p-2 text-sm bg-white/60 dark:bg-gray-900/40 border border-gray-300/80 dark:border-gray-700/60 rounded-lg shadow-inner focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"/>
                        <button type="submit" disabled={isDeckLoading} className="w-full mt-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:bg-slate-400 flex items-center justify-center">
                             {isDeckLoading ? <><svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" fill="currentColor"></path></svg> Creo...</> : 'Genera Deck'}
                        </button>
                    </form>
                    <div className="mt-3 flex-grow min-h-[150px]">
                        {isDeckLoading && <div className="flex justify-center items-center h-full"><LoadingSpinner size="sm" message={null} details={null} /></div>}
                        {deckError && <p className="text-xs text-red-500 p-2">{deckError}</p>}
                        {deckResult && deckResult.deck && Array.isArray(deckResult.deck) && (
                            <div className="text-sm space-y-2 max-h-60 overflow-y-auto">
                                {deckResult.deck.map(card => (
                                    <div key={card.voce} className="bg-slate-100 dark:bg-slate-900/40 p-2 rounded-md flex justify-between items-start gap-2">
                                        <div className="flex-grow">
                                            <p className="font-semibold text-slate-800 dark:text-slate-200">{card.voce}</p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400">{card.spiegazione}</p>
                                        </div>
                                        <button onClick={() => onAddToDeck({ ...card, notes: '', tags: [] })} className="p-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/80 flex-shrink-0" aria-label="Aggiungi al deck">
                                            <PlusCircleIcon className="w-5 h-5"/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {!isDeckLoading && !deckResult && <div className="text-center text-xs text-slate-500 pt-10">Inserisci un tema per generare 5-7 schede.</div>}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CreativeLab;