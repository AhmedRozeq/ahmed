import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { SavedCollocation, GeneratedCardData, WeeklyGoal, WeeklyStats } from '../types';
import { generateWeeklySummary, generateStudyPlan } from '../services/geminiService';
import { calculateStreak } from '../utils/streak';
import CalendarIcon from './icons/CalendarIcon';
import SparklesIcon from './icons/SparklesIcon';
import StudySessionModal from './StudySessionModal';
import NewTopicCreator from './NewTopicCreator';
import ZapIcon from './icons/ZapIcon';
import MegaStudySessionModal from './MegaStudySessionModal';
import FlameIcon from './icons/FlameIcon';
import MasteryChart from './MasteryChart';
import TrendingUpIcon from './icons/TrendingUpIcon';
import TargetIcon from './icons/TargetIcon';
import BrainIcon from './icons/BrainIcon';
import ClipboardListIcon from './icons/ClipboardListIcon';
import LoadingSpinner from './LoadingSpinner';
import InfoIcon from './icons/InfoIcon';
import MarkdownDisplay from './MarkdownDisplay';


const WEEKLY_GOAL_KEY = 'weeklyGoal';
const WEEKLY_SUMMARY_KEY = 'weeklySummary';

interface StudyPlanProps {
  deck: SavedCollocation[];
  onUpdateDeck: (newDeck: SavedCollocation[]) => void;
  onSessionComplete: (updatedItems: SavedCollocation[]) => void;
  studyHistory: number[];
}

const StudyPlan: React.FC<StudyPlanProps> = ({ deck, onUpdateDeck, onSessionComplete, studyHistory }) => {
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
      
      // FIX: Explicitly cast values to Number during sort to prevent type errors in some TypeScript environments.
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
        <div className="text-center py-20 px-4 bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-lg">
            <CalendarIcon className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600" />
            <h2 className="mt-6 text-2xl font-semibold text-slate-800 dark:text-slate-100">Crea il tuo Piano di Studio</h2>
            <p className="mt-2 text-base text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            Salva le collocazioni nel tuo "Deck di Studio" per iniziare a generare un piano di studio personalizzato con ripetizione dilazionata.
            </p>
        </div>
        <NewTopicCreator onAddToDeck={handleAddToDeck} />
      </div>
    );
  }
  
  const progressPercentage = weeklyGoal && weeklyGoal.target > 0 ? Math.min(100, Math.round((goalProgress / weeklyGoal.target) * 100)) : 0;

  return (
    <div className="space-y-8">
      <div className="glass-panel p-6 rounded-2xl shadow-lg">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Dashboard di Studio</h2>
        <p className="text-slate-600 dark:text-slate-300 mt-1">La tua centrale di comando per l'apprendimento linguistico.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-xl shadow-lg flex items-center gap-5"><div className="flex-shrink-0 p-4 bg-amber-100 dark:bg-amber-900/30 rounded-full"><CalendarIcon className="w-8 h-8 text-amber-600 dark:text-amber-400" /></div><div><p className="text-4xl font-bold text-slate-800 dark:text-slate-100">{allReviewItems.length}</p><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Voci da Ripassare Oggi</p></div></div>
        <div className="glass-panel p-6 rounded-xl shadow-lg flex items-center gap-5"><div className="flex-shrink-0 p-4 bg-sky-100 dark:bg-sky-900/30 rounded-full"><SparklesIcon className="w-8 h-8 text-sky-600 dark:text-sky-400" /></div><div><p className="text-4xl font-bold text-slate-800 dark:text-slate-100">{allNewItems.length}</p><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Voci Nuove da Imparare</p></div></div>
        <div className="glass-panel p-6 rounded-xl shadow-lg flex items-center gap-5"><div className="flex-shrink-0 p-4 bg-red-100 dark:bg-red-900/30 rounded-full"><FlameIcon className="w-8 h-8 text-red-600 dark:text-red-400" /></div><div><p className="text-4xl font-bold text-slate-800 dark:text-slate-100">{studyStreak}</p><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Giorni di Studio Consecutivi</p></div></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-900/50 dark:via-slate-800/50 dark:to-purple-900/50 border-2 border-indigo-200 dark:border-indigo-700/50 rounded-2xl text-center shadow-lg flex flex-col items-center justify-center">
              <BrainIcon className="w-10 h-10 text-indigo-500 dark:text-indigo-400 mb-3" />
              <h3 className="text-2xl font-bold text-indigo-800 dark:text-indigo-200">Sessione Intelligente</h3>
              <p className="text-indigo-700 dark:text-indigo-300 mt-2 mb-4 flex-grow">Lascia che l'IA crei la sessione di studio ottimale per te, bilanciando ripassi e nuovi concetti.</p>
              <button onClick={() => handleStartSession('intelligent')} className="w-full px-8 py-3 font-semibold text-white bg-gradient-to-br from-indigo-500 to-purple-600 rounded-md shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5">Avvia Sessione Intelligente</button>
          </div>
          <div className="p-6 bg-gradient-to-br from-rose-50 via-white to-amber-50 dark:from-rose-900/50 dark:via-slate-800/50 dark:to-amber-900/50 border-2 border-rose-200 dark:border-rose-700/50 rounded-2xl text-center shadow-lg flex flex-col items-center justify-center">
              <TargetIcon className="w-10 h-10 text-rose-500 dark:text-rose-400 mb-3" />
              <h3 className="text-2xl font-bold text-rose-800 dark:text-rose-200">Attacca Punti Deboli</h3>
              <p className="text-rose-700 dark:text-rose-300 mt-2 mb-4 flex-grow">Concentrati sulle 10 collocazioni che conosci meno con una sessione di quiz mirata.</p>
              <button onClick={() => handleStartSession('weak_points')} className="w-full px-8 py-3 font-semibold text-white bg-gradient-to-br from-rose-500 to-amber-600 rounded-md shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5">Avvia Quiz Mirato</button>
          </div>
      </div>
      
      <div className="glass-panel p-6 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3 mb-4">
            <TrendingUpIcon className="w-7 h-7 text-emerald-500 dark:text-emerald-400"/>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Obiettivo Settimanale</h3>
        </div>
        {!weeklyGoal ? (
            <div>
                <p className="text-slate-600 dark:text-slate-300 mb-4">Imposta un obiettivo per rimanere motivato! Quante nuove voci vuoi imparare questa settimana?</p>
                <div className="flex items-center gap-2">{[10, 20, 30].map(num => <button key={num} onClick={() => handleSetGoal(num)} className="px-5 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-500/20 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-colors">{num} voci</button>)}</div>
            </div>
        ) : (
            <div>
                <div className="flex justify-between items-center mb-1"><p className="text-sm font-medium text-slate-700 dark:text-slate-200">Imparare {weeklyGoal.target} nuove voci</p><p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{goalProgress} / {weeklyGoal.target} ({progressPercentage}%)</p></div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3"><div className="bg-gradient-to-r from-emerald-400 to-teal-500 h-3 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div></div>
                <button onClick={() => setWeeklyGoal(null)} className="text-xs text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 mt-3">Annulla obiettivo</button>
            </div>
        )}
      </div>

      <div className="glass-panel p-6 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <SparklesIcon className="w-7 h-7 text-violet-500 dark:text-violet-400" />
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Piano di Studio Intelligente</h3>
        </div>
        {aiPlan.content ? (
          <div className="animate-fade-in"><MarkdownDisplay content={aiPlan.content} title="Il Tuo Piano Personalizzato"/></div>
        ) : (
          <p className="text-slate-600 dark:text-slate-300 mb-4">Ottieni un piano di studio personalizzato per la prossima settimana, creato dall'IA sulla base dei tuoi progressi.</p>
        )}
        {aiPlan.isLoading && <LoadingSpinner message="Il tuo tutor IA sta preparando il piano..." />}
        {aiPlan.error && <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-l-4 border-red-300 flex items-center gap-2"><InfoIcon className="w-5 h-5" /><span>{aiPlan.error}</span></div>}
        {!aiPlan.isLoading && <button onClick={handleGeneratePlan} className="mt-4 px-5 py-2 text-sm font-semibold text-white bg-violet-600 rounded-md hover:bg-violet-700 flex items-center gap-2 shadow-sm"><SparklesIcon className="w-4 h-4"/>{aiPlan.content ? 'Rigenera Piano' : 'Genera il Mio Piano'}</button>}
      </div>

       <div className="glass-panel p-6 rounded-2xl shadow-lg">
            <div className="flex items-center gap-3 mb-4">
                <ClipboardListIcon className="w-7 h-7 text-sky-500 dark:text-sky-400"/>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Riepilogo Settimanale IA</h3>
            </div>
            {summaryState.isLoading && <LoadingSpinner message="Il tuo tutor IA sta analizzando i tuoi progressi..." />}
            {summaryState.error && <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-l-4 border-red-300 flex items-center gap-2"><InfoIcon className="w-5 h-5" /><span>{summaryState.error}</span></div>}
            {summaryState.content && <p className="text-slate-700 dark:text-slate-200 bg-sky-50/70 dark:bg-sky-500/10 p-4 rounded-lg border border-sky-200/80 dark:border-sky-500/20">{summaryState.content}</p>}
            {!summaryState.isLoading && <button onClick={handleGenerateSummary} className="mt-4 px-5 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 flex items-center gap-2 shadow-sm"><SparklesIcon className="w-4 h-4"/>Genera/Aggiorna Riepilogo</button>}
      </div>
      
       <div className="p-8 bg-slate-100 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-center shadow-inner">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Sessione Standard</h3>
            <p className="text-slate-600 dark:text-slate-300 mt-2">Personalizza e avvia una sessione di studio manuale con le voci pronte.</p>
            <div className="mt-6 flex flex-col sm:flex-row justify-center items-center sm:items-end gap-4">
                <div><label htmlFor="new-items-count" className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">Voci Nuove</label><select id="new-items-count" value={sessionConfig.newItemsCount} onChange={e => setSessionConfig(s => ({...s, newItemsCount: e.target.value}))} className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-sky-500 focus:border-sky-500"><option value="5">5</option><option value="10">10</option><option value="15">15</option><option value="all">Tutte ({allNewItems.length})</option></select></div>
                <div><label htmlFor="review-items-count" className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">Voci da Ripassare</label><select id="review-items-count" value={sessionConfig.reviewItemsCount} onChange={e => setSessionConfig(s => ({...s, reviewItemsCount: e.target.value}))} className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-sky-500 focus:border-sky-500"><option value="10">10</option><option value="20">20</option><option value="30">30</option><option value="all">Tutte ({allReviewItems.length})</option></select></div>
                <button onClick={() => handleStartSession('standard')} className="w-full sm:w-auto mt-4 sm:mt-0 px-8 py-3 text-base font-semibold text-white bg-slate-700 dark:bg-slate-600 rounded-md hover:bg-slate-800 dark:hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5">Inizia Sessione</button>
            </div>
        </div>

      <NewTopicCreator onAddToDeck={handleAddToDeck} />

      {sessionState.isOpen && (
        <StudySessionModal
            newItems={sessionState.newItems}
            reviewItems={sessionState.reviewItems}
            onClose={() => setSessionState(prev => ({ ...prev, isOpen: false }))}
            onSessionComplete={handleSessionCompleteCallback}
            sessionMode={sessionState.mode}
        />
      )}
    </div>
  );
};

export default StudyPlan;
