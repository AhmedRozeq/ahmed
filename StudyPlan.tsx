import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { SavedCollocation, GeneratedCardData, WeeklyGoal, WeeklyStats } from './types';
import { generateWeeklySummary, generateStudyPlan } from './services/geminiService';
import { calculateStreak } from './utils/streak';
import CalendarIcon from './components/icons/CalendarIcon';
import SparklesIcon from './components/icons/SparklesIcon';
import StudySessionModal from './components/StudySessionModal';
import NewTopicCreator from './components/NewTopicCreator';
import ZapIcon from './components/icons/ZapIcon';
import MegaStudySessionModal from './components/MegaStudySessionModal';
import FlameIcon from './components/icons/FlameIcon';
import MasteryChart from './components/MasteryChart';
import TrendingUpIcon from './components/icons/TrendingUpIcon';
import TargetIcon from './components/icons/TargetIcon';
import BrainIcon from './components/icons/BrainIcon';
import ClipboardListIcon from './components/icons/ClipboardListIcon';
import LoadingSpinner from './components/LoadingSpinner';
import InfoIcon from './components/icons/InfoIcon';
import MarkdownDisplay from './components/MarkdownDisplay';
import { Collocation } from './types';
import CalendarView from './components/CalendarView';


const WEEKLY_GOAL_KEY = 'weeklyGoal';
const WEEKLY_SUMMARY_KEY = 'weeklySummary';

interface StudyPlanProps {
  deck: SavedCollocation[];
  onUpdateDeck: (newDeck: SavedCollocation[]) => void;
  onSessionComplete: (updatedItems: SavedCollocation[]) => void;
  studyHistory: number[];
  cefrLevel: string;
  register: string;
  onDeepDive: (item: Collocation | string) => void;
  onOpenAddCardModal: (topic: string) => void;
}

const StudyPlan: React.FC<StudyPlanProps> = ({ deck, onUpdateDeck, onSessionComplete, studyHistory, cefrLevel, register, onDeepDive, onOpenAddCardModal }) => {
  const [sessionState, setSessionState] = useState<{
    isOpen: boolean;
    type: 'standard' | 'intelligent' | 'weak_points';
    newItems: SavedCollocation[];
    reviewItems: SavedCollocation[];
    mode: 'flashcard' | 'quiz_multiple_choice' | 'quiz_cloze' | 'mixed';
  }>({ isOpen: false, type: 'standard', newItems: [], reviewItems: [], mode: 'mixed' });
  
  const [sessionConfig, setSessionConfig] = useState({
    newItemsCount: '5',
    reviewItemsCount: '10',
  });

  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoal | null>(null);
  const [goalProgress, setGoalProgress] = useState(0);

  const [summaryState, setSummaryState] = useState<{
    isLoading: boolean;
    content: string | null;
    error: string | null;
    lastGenerated: number | null;
  }>({ isLoading: false, content: null, error: null, lastGenerated: null });

  const [aiPlan, setAiPlan] = useState<{ isLoading: boolean; content: string | null; error: string | null; }>({ isLoading: false, content: null, error: null });


  useEffect(() => {
    const savedGoal = localStorage.getItem(WEEKLY_GOAL_KEY);
    if (savedGoal) {
      const goal = JSON.parse(savedGoal) as WeeklyGoal;
      const weekInMillis = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - Number(goal.startDate) < weekInMillis) {
        setWeeklyGoal({ ...goal, target: Number(goal.target), startDate: Number(goal.startDate) });
      } else {
        localStorage.removeItem(WEEKLY_GOAL_KEY);
      }
    }

    const savedSummary = localStorage.getItem(WEEKLY_SUMMARY_KEY);
    if (savedSummary) {
      setSummaryState(JSON.parse(savedSummary));
    }
  }, []);

  const { allNewItems, allReviewItems } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayTimestamp = now.getTime();

    const allNew = deck
      .filter(item => item.srsLevel === 0)
      .sort((a, b) => a.savedAt - b.savedAt);
      
    const allReview = deck.filter(item => 
      item.srsLevel > 0 && item.nextReviewDate <= todayTimestamp
    );
    return { allNewItems: allNew, allReviewItems: allReview };
  }, [deck]);

  useEffect(() => {
    if (weeklyGoal?.type === 'learn_new') {
      const weekInMillis = 7 * 24 * 60 * 60 * 1000;
      const learnedThisWeek = deck.filter(item => 
        item.srsLevel > 0 && 
        item.savedAt >= weeklyGoal.startDate &&
        item.savedAt < weeklyGoal.startDate + weekInMillis
      ).length;
      setGoalProgress(learnedThisWeek);
    }
  }, [weeklyGoal, deck]);

  const studyStreak = useMemo(() => calculateStreak(studyHistory), [studyHistory]);

  const handleStartSession = (type: 'standard' | 'intelligent' | 'weak_points') => {
    let newItemsForSession: SavedCollocation[] = [];
    let reviewItemsForSession: SavedCollocation[] = [];
    let mode: 'flashcard' | 'quiz_multiple_choice' | 'quiz_cloze' | 'mixed' = 'mixed';
    
    if (type === 'standard') {
      const newCount = sessionConfig.newItemsCount === 'all' ? allNewItems.length : parseInt(sessionConfig.newItemsCount);
      const reviewCount = sessionConfig.reviewItemsCount === 'all' ? allReviewItems.length : parseInt(sessionConfig.reviewItemsCount);
      newItemsForSession = allNewItems.slice(0, newCount);
      reviewItemsForSession = allReviewItems.slice(0, reviewCount);
    } else if (type === 'intelligent') {
      reviewItemsForSession = allReviewItems;
      const newCount = Math.min(5, Math.max(1, Math.floor(allReviewItems.length / 3)), allNewItems.length);
      newItemsForSession = allNewItems.slice(0, newCount);
    } else if (type === 'weak_points') {
      reviewItemsForSession = deck
        .filter(item => item.srsLevel > 0)
        .sort((a, b) => a.srsLevel - b.srsLevel)
        .slice(0, 10);
      mode = 'quiz_multiple_choice';
    }

    if (newItemsForSession.length > 0 || reviewItemsForSession.length > 0) {
      setSessionState({ isOpen: true, type, newItems: newItemsForSession, reviewItems: reviewItemsForSession, mode });
    }
  };
  
  const handleStartCalendarSession = (items: SavedCollocation[]) => {
    if (items && items.length > 0) {
      setSessionState({
        isOpen: true,
        type: 'standard',
        newItems: [],
        reviewItems: items,
        mode: 'mixed',
      });
    }
  };

  const handleSessionCompleteCallback = useCallback((updatedItems: SavedCollocation[]) => {
    onSessionComplete(updatedItems);
    setSessionState(prev => ({ ...prev, isOpen: false }));
  }, [onSessionComplete]);
  
  const handleAddToDeck = useCallback((newItemData: GeneratedCardData & { notes: string; tags: string[] }) => {
    const newCard: SavedCollocation = {
      ...newItemData,
      id: crypto.randomUUID(),
      savedAt: Date.now(),
      srsLevel: 0,
      nextReviewDate: Date.now(),
    };
    onUpdateDeck([...deck, newCard]);
  }, [deck, onUpdateDeck]);
  
  const handleSetGoal = (target: number) => {
    const newGoal: WeeklyGoal = {
      id: crypto.randomUUID(),
      type: 'learn_new',
      target: target,
      startDate: new Date().setHours(0, 0, 0, 0),
    };
    setWeeklyGoal(newGoal);
    localStorage.setItem(WEEKLY_GOAL_KEY, JSON.stringify(newGoal));
  };

  const getWeeklyStats = (): WeeklyStats => {
     const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const reviewsThisWeek = studyHistory.filter(ts => ts >= oneWeekAgo).length;
      const newWordsThisWeek = deck.filter(item => item.srsLevel > 0 && item.savedAt >= oneWeekAgo).length;
      
      const themeCounts = deck.reduce((acc, item) => {
          acc[item.tema] = (acc[item.tema] || 0) + 1;
          return acc;
      }, {} as Record<string, number>);
      
      const topTheme = Object.keys(themeCounts).length > 0 ? Object.entries(themeCounts).sort((a, b) => Number(b[1]) - Number(a[1]))[0][0] : null;

      const sortedByMastery = [...deck].filter(i => i.srsLevel > 0).sort((a, b) => b.srsLevel - a.srsLevel);
      const mostMasteredItem = sortedByMastery[0] || null;
      const needsReviewItem = sortedByMastery.length > 0 ? sortedByMastery[sortedByMastery.length - 1] : null;

      return {
          newWords: newWordsThisWeek,
          reviews: reviewsThisWeek,
          streak: studyStreak,
          topTheme,
          mostMasteredItem,
          needsReviewItem
      };
  }
  
  const handleGenerateSummary = async () => {
    setSummaryState({ isLoading: true, content: null, error: null, lastGenerated: null });
    try {
        const stats = getWeeklyStats();
        const content = await generateWeeklySummary(stats);
        const newState = { isLoading: false, content, error: null, lastGenerated: Date.now() };
        setSummaryState(newState);
        localStorage.setItem(WEEKLY_SUMMARY_KEY, JSON.stringify(newState));
    } catch (err) {
        const message = err instanceof Error ? err.message : "Impossibile generare il riepilogo.";
        setSummaryState({ isLoading: false, content: null, error: message, lastGenerated: null });
    }
  };

   const handleGeneratePlan = async () => {
    setAiPlan({ isLoading: true, content: null, error: null });
    try {
      const stats = getWeeklyStats();
      const plan = await generateStudyPlan(stats);
      setAiPlan({ isLoading: false, content: plan, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossibile generare il piano di studio.";
      setAiPlan({ isLoading: false, content: null, error: message });
    }
  };


  if (deck.length === 0) {
    return (
      <div className="space-y-8">
        <div className="text-center py-20 px-4 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-lg">
            <CalendarIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
            <h2 className="mt-6 text-2xl font-semibold text-gray-800 dark:text-gray-100">Crea il tuo Piano di Studio</h2>
            <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            Salva le collocazioni nel tuo "Deck di Studio" per iniziare a generare un piano di studio personalizzato con ripetizione dilazionata.
            </p>
        </div>
        <NewTopicCreator 
            onAddToDeck={handleAddToDeck} 
            onDeepDive={onDeepDive}
            cefrLevel={cefrLevel} 
            register={register}
            onOpenAddCardModal={onOpenAddCardModal}
        />
      </div>
    );
  }
  
  const progressPercentage = weeklyGoal && weeklyGoal.target > 0 ? Math.min(100, Math.round((goalProgress / weeklyGoal.target) * 100)) : 0;

  return (
    <div className="space-y-8">
      <div className="glass-panel p-4 sm:p-6 rounded-2xl shadow-lg">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Dashboard di Studio</h2>
        <p className="text-gray-600 dark:text-gray-300 mt-1">La tua centrale di comando per l'apprendimento linguistico.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-4 sm:p-6 rounded-xl shadow-lg flex items-center gap-5"><div className="flex-shrink-0 p-4 bg-amber-100 dark:bg-amber-900/30 rounded-full"><CalendarIcon className="w-8 h-8 text-amber-600 dark:text-amber-400" /></div><div><p className="text-4xl font-bold text-gray-800 dark:text-gray-100">{allReviewItems.length}</p><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Voci da Ripassare Oggi</p></div></div>
        <div className="glass-panel p-4 sm:p-6 rounded-xl shadow-lg flex items-center gap-5"><div className="flex-shrink-0 p-4 bg-sky-100 dark:bg-sky-900/30 rounded-full"><SparklesIcon className="w-8 h-8 text-sky-600 dark:text-sky-400" /></div><div><p className="text-4xl font-bold text-gray-800 dark:text-gray-100">{allNewItems.length}</p><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Voci Nuove da Imparare</p></div></div>
        <div className="glass-panel p-4 sm:p-6 rounded-xl shadow-lg flex items-center gap-5"><div className="flex-shrink-0 p-4 bg-rose-100 dark:bg-rose-900/30 rounded-full"><FlameIcon className="w-8 h-8 text-rose-600 dark:text-rose-400" /></div><div><p className="text-4xl font-bold text-gray-800 dark:text-gray-100">{studyStreak}</p><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Giorni di Studio Consecutivi</p></div></div>
      </div>
      
      <div className="glass-panel p-4 sm:p-6 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3 mb-4">
            <ZapIcon className="w-7 h-7 text-indigo-500 dark:text-indigo-400"/>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Azioni di Studio</h3>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Queste azioni aggiorneranno automaticamente il tuo piano di ripasso sul calendario.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button 
                onClick={() => handleStartSession('intelligent')}
                disabled={allReviewItems.length === 0}
                className="relative p-5 text-left bg-amber-50 dark:bg-amber-900/40 border-2 border-amber-200 dark:border-amber-700/80 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-lg"
            >
                {allReviewItems.length > 0 && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-amber-500 text-white text-xs font-bold flex items-center justify-center rounded-full ring-2 ring-white dark:ring-amber-900/40">
                        {allReviewItems.length}
                    </div>
                )}
                <CalendarIcon className="w-8 h-8 text-amber-500 dark:text-amber-400 mb-3" />
                <h4 className="text-lg font-bold text-amber-800 dark:text-amber-200">Ripassa Voci Scadute</h4>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mt-1">{allReviewItems.length > 0 ? `${allReviewItems.length} ${allReviewItems.length === 1 ? 'voce pronta' : 'voci pronte'}` : 'Nessuna voce per oggi'}</p>
            </button>
            <button 
                onClick={() => handleStartSession('standard')}
                disabled={allNewItems.length === 0}
                className="relative p-5 text-left bg-sky-50 dark:bg-sky-900/40 border-2 border-sky-200 dark:border-sky-700/80 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-lg"
            >
                <SparklesIcon className="w-8 h-8 text-sky-500 dark:text-sky-400 mb-3" />
                <h4 className="text-lg font-bold text-sky-800 dark:text-sky-200">Impara Nuove Voci</h4>
                <p className="text-sm font-medium text-sky-700 dark:text-sky-300 mt-1">{allNewItems.length > 0 ? `Inizia con 5 su ${allNewItems.length}` : 'Nessuna nuova voce'}</p>
            </button>
             <button 
                onClick={() => handleStartSession('intelligent')}
                disabled={allNewItems.length === 0 && allReviewItems.length === 0}
                className="relative p-5 text-left bg-indigo-50 dark:bg-indigo-900/40 border-2 border-indigo-200 dark:border-indigo-700/80 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-lg"
            >
                <ZapIcon className="w-8 h-8 text-indigo-500 dark:text-indigo-400 mb-3" />
                <h4 className="text-lg font-bold text-indigo-800 dark:text-indigo-200">Sessione Mista</h4>
                <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mt-1">{allReviewItems.length} ripassi + {Math.min(3, allNewItems.length)} nuove</p>
            </button>
        </div>
      </div>
      
      <div className="glass-panel p-4 sm:p-6 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3 mb-4">
            <TrendingUpIcon className="w-7 h-7 text-emerald-500 dark:text-emerald-400"/>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Obiettivo Settimanale</h3>
        </div>
        {!weeklyGoal ? (
            <div>
                <p className="text-gray-600 dark:text-gray-300 mb-4">Imposta un obiettivo per rimanere motivato! Quante nuove voci vuoi imparare questa settimana?</p>
                <div className="flex items-center gap-2">{[10, 20, 30].map(num => <button key={num} onClick={() => handleSetGoal(num)} className="px-5 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-500/20 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-colors">{num} voci</button>)}</div>
            </div>
        ) : (
            <div>
                <div className="flex justify-between items-center mb-1"><p className="text-sm font-medium text-gray-700 dark:text-gray-200">Imparare {weeklyGoal.target} nuove voci</p><p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{goalProgress} / {weeklyGoal.target} ({progressPercentage}%)</p></div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3"><div className="bg-gradient-to-r from-emerald-400 to-teal-500 h-3 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div></div>
                <button onClick={() => setWeeklyGoal(null)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 mt-3">Annulla obiettivo</button>
            </div>
        )}
      </div>
      
      <div className="glass-panel p-4 sm:p-6 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3 mb-4">
            <CalendarIcon className="w-7 h-7 text-amber-500 dark:text-amber-400"/>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Calendario di Ripasso</h3>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Visualizza le tue prossime sessioni di ripasso e studia le voci per un giorno specifico.</p>
        <CalendarView deck={deck} onStartSession={handleStartCalendarSession} />
      </div>

      <div className="glass-panel p-4 sm:p-6 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <SparklesIcon className="w-7 h-7 text-violet-500 dark:text-violet-400" />
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Piano di Studio Intelligente</h3>
        </div>
        {aiPlan.content ? (
          <div className="animate-fade-in"><MarkdownDisplay content={aiPlan.content} title="Il Tuo Piano Personalizzato"/></div>
        ) : (
          <p className="text-gray-600 dark:text-gray-300 mb-4">Ottieni un piano di studio personalizzato per la prossima settimana, creato dall'IA sulla base dei tuoi progressi.</p>
        )}
        {aiPlan.isLoading && <LoadingSpinner message="Il tuo tutor IA sta preparando il piano..." />}
        {aiPlan.error && <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-l-4 border-red-300 flex items-center gap-2"><InfoIcon className="w-5 h-5" /><span>{aiPlan.error}</span></div>}
        {!aiPlan.isLoading && <button onClick={handleGeneratePlan} className="mt-4 px-5 py-2 text-sm font-semibold text-white bg-violet-600 rounded-md hover:bg-violet-700 flex items-center gap-2 shadow-sm active:scale-95"><SparklesIcon className="w-4 h-4"/>{aiPlan.content ? 'Rigenera Piano' : 'Genera il Mio Piano'}</button>}
      </div>

       <div className="glass-panel p-4 sm:p-6 rounded-2xl shadow-lg">
            <div className="flex items-center gap-3 mb-4">
                <ClipboardListIcon className="w-7 h-7 text-sky-500 dark:text-sky-400"/>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Riepilogo Settimanale IA</h3>
            </div>
            {summaryState.isLoading && <LoadingSpinner message="Il tuo tutor IA sta analizzando i tuoi progressi..." />}
            {summaryState.error && <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-l-4 border-red-300 flex items-center gap-2"><InfoIcon className="w-5 h-5" /><span>{summaryState.error}</span></div>}
            {summaryState.content && <p className="text-gray-700 dark:text-gray-200 bg-sky-50/70 dark:bg-sky-500/10 p-4 rounded-lg border border-sky-200/80 dark:border-sky-500/20">{summaryState.content}</p>}
            {!summaryState.isLoading && <button onClick={handleGenerateSummary} className="mt-4 px-5 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 flex items-center gap-2 shadow-sm active:scale-95"><SparklesIcon className="w-4 h-4"/>Genera/Aggiorna Riepilogo</button>}
      </div>
      
       <div className="p-8 bg-gray-100 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-700 rounded-2xl text-center shadow-inner">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Sessione Standard</h3>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Personalizza e avvia una sessione di studio manuale con le voci pronte.</p>
            <div className="mt-6 flex flex-col sm:flex-row justify-center items-center sm:items-end gap-4">
                <div><label htmlFor="new-items-count" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Voci Nuove</label><select id="new-items-count" value={sessionConfig.newItemsCount} onChange={e => setSessionConfig(s => ({...s, newItemsCount: e.target.value}))} className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500"><option value="5">5</option><option value="10">10</option><option value="15">15</option><option value="all">Tutte ({allNewItems.length})</option></select></div>
                <div><label htmlFor="review-items-count" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Voci da Ripassare</label><select id="review-items-count" value={sessionConfig.reviewItemsCount} onChange={e => setSessionConfig(s => ({...s, reviewItemsCount: e.target.value}))} className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500"><option value="10">10</option><option value="20">20</option><option value="30">30</option><option value="all">Tutte ({allReviewItems.length})</option></select></div>
                <button onClick={() => handleStartSession('standard')} className="w-full sm:w-auto mt-4 sm:mt-0 px-8 py-3 text-base font-semibold text-white bg-gray-700 dark:bg-gray-600 rounded-md hover:bg-gray-800 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95">Inizia Sessione</button>
            </div>
        </div>

      <NewTopicCreator 
        onAddToDeck={handleAddToDeck}
        onDeepDive={onDeepDive}
        cefrLevel={cefrLevel}
        register={register}
        onOpenAddCardModal={onOpenAddCardModal}
      />

      {sessionState.isOpen && (
        <StudySessionModal
            newItems={sessionState.newItems}
            reviewItems={sessionState.reviewItems}
            onClose={() => setSessionState(prev => ({ ...prev, isOpen: false }))}
            onSessionComplete={handleSessionCompleteCallback}
            sessionMode={sessionState.mode}
            cefrLevel={cefrLevel}
            register={register}
        />
      )}
    </div>
  );
};

export default StudyPlan;
