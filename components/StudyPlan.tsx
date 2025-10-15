import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { SavedCollocation, GeneratedCardData, WeeklyGoal, WeeklyStats } from '../types';
import { generateWeeklySummary } from '../services/geminiService';
import { calculateStreak } from '../utils/streak';
import CalendarIcon from './icons/CalendarIcon';
import SparklesIcon from './icons/SparklesIcon';
import StudySessionModal from './StudySessionModal';
import NewTopicCreator from './NewTopicCreator';
import ZapIcon from './icons/ZapIcon';
import FlameIcon from './icons/FlameIcon';
import LoadingSpinner from './LoadingSpinner';
import InfoIcon from './icons/InfoIcon';
import MarkdownDisplay from './MarkdownDisplay';
import { Collocation } from '../types';
import CalendarView from './CalendarView';
import TrendingUpIcon from './icons/TrendingUpIcon';
import ClipboardListIcon from './icons/ClipboardListIcon';

const WEEKLY_GOAL_KEY = 'weeklyGoal';

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
    newItems: SavedCollocation[];
    reviewItems: SavedCollocation[];
    mode: 'flashcard' | 'quiz_multiple_choice' | 'quiz_cloze' | 'mixed';
  }>({ isOpen: false, newItems: [], reviewItems: [], mode: 'mixed' });
  
  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoal | null>(null);
  const [goalProgress, setGoalProgress] = useState(0);
  
  const [summaryState, setSummaryState] = useState<{
    isLoading: boolean;
    content: string | null;
    error: string | null;
  }>({ isLoading: false, content: null, error: null });

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
  
  const handleStartSession = useCallback((
    newItemsForSession: SavedCollocation[],
    reviewItemsForSession: SavedCollocation[],
    mode: 'flashcard' | 'quiz_multiple_choice' | 'quiz_cloze' | 'mixed' = 'mixed'
  ) => {
    if (newItemsForSession.length > 0 || reviewItemsForSession.length > 0) {
      setSessionState({
        isOpen: true,
        newItems: newItemsForSession,
        reviewItems: reviewItemsForSession,
        mode,
      });
    }
  }, []);

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
    setSummaryState({ isLoading: true, content: null, error: null });
    try {
        const stats = getWeeklyStats();
        const content = await generateWeeklySummary(stats);
        setSummaryState({ isLoading: false, content, error: null });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Impossibile generare il riepilogo.";
        setSummaryState({ isLoading: false, content: null, error: message });
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
      <div className="glass-panel p-6 rounded-2xl shadow-lg">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Dashboard di Studio</h2>
        <p className="text-gray-600 dark:text-gray-300 mt-1">La tua centrale di comando per l'apprendimento linguistico.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-xl shadow-lg flex items-center gap-5"><div className="flex-shrink-0 p-4 bg-amber-100 dark:bg-amber-900/30 rounded-full"><CalendarIcon className="w-8 h-8 text-amber-600 dark:text-amber-400" /></div><div><p className="text-4xl font-bold text-gray-800 dark:text-gray-100">{allReviewItems.length}</p><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Voci da Ripassare Oggi</p></div></div>
        <div className="glass-panel p-6 rounded-xl shadow-lg flex items-center gap-5"><div className="flex-shrink-0 p-4 bg-sky-100 dark:bg-sky-900/30 rounded-full"><SparklesIcon className="w-8 h-8 text-sky-600 dark:text-sky-400" /></div><div><p className="text-4xl font-bold text-gray-800 dark:text-gray-100">{allNewItems.length}</p><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Voci Nuove da Imparare</p></div></div>
        <div className="glass-panel p-6 rounded-xl shadow-lg flex items-center gap-5"><div className="flex-shrink-0 p-4 bg-rose-100 dark:bg-rose-900/30 rounded-full"><FlameIcon className="w-8 h-8 text-rose-600 dark:text-rose-400" /></div><div><p className="text-4xl font-bold text-gray-800 dark:text-gray-100">{studyStreak}</p><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Giorni di Studio Consecutivi</p></div></div>
      </div>
      
      <div className="glass-panel p-6 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3 mb-4">
            <ZapIcon className="w-7 h-7 text-indigo-500 dark:text-indigo-400"/>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Azioni di Studio</h3>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Queste azioni aggiorneranno automaticamente il tuo piano di ripasso sul calendario.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button 
                onClick={() => handleStartSession([], allReviewItems)}
                disabled={allReviewItems.length === 0}
                className="p-5 text-left bg-amber-50 dark:bg-amber-900/40 border-2 border-amber-200 dark:border-amber-700/80 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-lg"
            >
                <CalendarIcon className="w-8 h-8 text-amber-500 dark:text-amber-400 mb-3" />
                <h4 className="text-lg font-bold text-amber-800 dark:text-amber-200">Ripassa Voci Scadute</h4>
                <p className="text-2xl font-semibold text-amber-900 dark:text-amber-100 mt-1">{allReviewItems.length} voci</p>
            </button>
            <button 
                onClick={() => handleStartSession(allNewItems.slice(0, 5), [])}
                disabled={allNewItems.length === 0}
                className="p-5 text-left bg-sky-50 dark:bg-sky-900/40 border-2 border-sky-200 dark:border-sky-700/80 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-lg"
            >
                <SparklesIcon className="w-8 h-8 text-sky-500 dark:text-sky-400 mb-3" />
                <h4 className="text-lg font-bold text-sky-800 dark:text-sky-200">Impara Nuove Voci</h4>
                <p className="text-2xl font-semibold text-sky-900 dark:text-sky-100 mt-1">5 voci</p>
            </button>
             <button 
                onClick={() => handleStartSession(allNewItems.slice(0, 3), allReviewItems)}
                disabled={allNewItems.length === 0 && allReviewItems.length === 0}
                className="p-5 text-left bg-indigo-50 dark:bg-indigo-900/40 border-2 border-indigo-200 dark:border-indigo-700/80 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-lg"
            >
                <ZapIcon className="w-8 h-8 text-indigo-500 dark:text-indigo-400 mb-3" />
                <h4 className="text-lg font-bold text-indigo-800 dark:text-indigo-200">Sessione Mista</h4>
                <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mt-1">{allReviewItems.length} ripassi + {Math.min(3, allNewItems.length)} nuove</p>
            </button>
        </div>
      </div>
      
      <div className="glass-panel p-6 rounded-2xl shadow-lg">
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

      <div className="glass-panel p-6 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3 mb-4">
            <CalendarIcon className="w-7 h-7 text-amber-500 dark:text-amber-400"/>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Calendario di Ripasso</h3>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Visualizza le tue prossime sessioni di ripasso e studia le voci per un giorno specifico.</p>
        <CalendarView deck={deck} onStartSession={(items) => handleStartSession([], items, 'mixed')} />
      </div>

       <div className="glass-panel p-6 rounded-2xl shadow-lg">
            <div className="flex items-center gap-3 mb-4">
                <ClipboardListIcon className="w-7 h-7 text-sky-500 dark:text-sky-400"/>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Riepilogo Settimanale IA</h3>
            </div>
            {summaryState.isLoading && <LoadingSpinner message="Il tuo tutor IA sta analizzando i tuoi progressi..." />}
            {summaryState.error && <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-l-4 border-red-300 flex items-center gap-2"><InfoIcon className="w-5 h-5" /><span>{summaryState.error}</span></div>}
            {summaryState.content && <p className="text-gray-700 dark:text-gray-200 bg-sky-50/70 dark:bg-sky-500/10 p-4 rounded-lg border border-sky-200/80 dark:border-sky-500/20">{summaryState.content}</p>}
            {!summaryState.isLoading && <button onClick={handleGenerateSummary} className="mt-4 px-5 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 flex items-center gap-2 shadow-sm active:scale-95"><SparklesIcon className="w-4 h-4"/>Genera/Aggiorna Riepilogo</button>}
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
