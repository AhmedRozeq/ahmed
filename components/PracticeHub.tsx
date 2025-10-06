import React, { useState, useMemo, useCallback } from 'react';
import { SavedCollocation, ClozeTestResult, QuizOptions, StoryResult, Collocation } from '../types';
import { generateClozeTest, generateStoryForCollocation } from '../services/geminiService';
import SearchIcon from './icons/SearchIcon';
import BookmarkIcon from './icons/BookmarkIcon';
import ShuffleIcon from './icons/ShuffleIcon';
import QuickPracticeModal from './QuickPracticeModal';
import TargetIcon from './icons/TargetIcon';
import PracticeQuizModal from './PracticeQuizModal';
import TagIcon from './icons/TagIcon';
import DeckCard from './DeckCard';
import FilterIcon from './icons/FilterIcon';
import StudySessionModal from './StudySessionModal';
import CalendarIcon from './icons/CalendarIcon';
import DownloadIcon from './icons/DownloadIcon';
import KanbanBoard from './KanbanBoard';
import LayoutGridIcon from './icons/LayoutGridIcon';
import ColumnsIcon from './icons/ColumnsIcon';


interface PracticeHubProps {
  deck: SavedCollocation[];
  onUpdateDeck: (newDeck: SavedCollocation[]) => void;
  searchQuery: string;
  onSessionComplete: (updatedItems: SavedCollocation[]) => void;
  onOpenSentenceImprover: (collocation?: SavedCollocation) => void;
  onDeepDive: (item: Collocation | string) => void;
}

type SortByType = 'savedAt_desc' | 'savedAt_asc' | 'srsLevel_asc' | 'srsLevel_desc' | 'voce_asc' | 'voce_desc';

const PracticeHub: React.FC<PracticeHubProps> = ({ deck, onUpdateDeck, searchQuery, onSessionComplete, onOpenSentenceImprover, onDeepDive }) => {
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showOnlyForReview, setShowOnlyForReview] = useState(false);
  const [sortBy, setSortBy] = useState<SortByType>('savedAt_desc');
  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid');

  const [isQuickPracticeActive, setIsQuickPracticeActive] = useState(false);
  
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizGenerationError, setQuizGenerationError] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<ClozeTestResult[]>([]);
  const [quizConfig, setQuizConfig] = useState({
    numQuestions: 5,
    quizType: 'multiple_choice' as 'cloze' | 'multiple_choice',
    cefrLevel: '',
  });
  
  const [stories, setStories] = useState<Record<string, {isLoading: boolean, content: string | null, error: string | null}>>({});

  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);


  const allThemes = useMemo(() => {
    const themes = new Set(deck.map(item => item.tema));
    return Array.from(themes).sort();
  }, [deck]);

  const allTags = useMemo(() => {
    const tags = new Set(deck.flatMap(item => item.tags || []));
    return Array.from(tags).sort();
  }, [deck]);

  const handleThemeToggle = useCallback((themeToToggle: string) => {
    setSelectedThemes(currentThemes =>
      currentThemes.includes(themeToToggle)
        ? currentThemes.filter(theme => theme !== themeToToggle)
        : [...currentThemes, themeToToggle]
    );
  }, []);

  const handleTagToggle = useCallback((tagToToggle: string) => {
    setSelectedTags(currentTags =>
      currentTags.includes(tagToToggle)
        ? currentTags.filter(tag => tag !== tagToToggle)
        : [...currentTags, tagToToggle]
    );
  }, []);

  const filteredDeck = useMemo(() => {
    const lowercasedQuery = searchQuery.toLowerCase();
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayTimestamp = now.getTime();

    const filtered = deck.filter(item => {
      const matchesQuery = searchQuery.trim() === '' ||
        item.voce.toLowerCase().includes(lowercasedQuery) ||
        item.spiegazione.toLowerCase().includes(lowercasedQuery) ||
        (item.notes || '').toLowerCase().includes(lowercasedQuery);
      
      const matchesTheme = selectedThemes.length === 0 || selectedThemes.includes(item.tema);
      
      const itemTags = item.tags || [];
      const matchesTags = selectedTags.length === 0 || selectedTags.some(tag => itemTags.includes(tag));

      const isDueForReview = item.nextReviewDate <= todayTimestamp;
      const matchesReviewFilter = !showOnlyForReview || isDueForReview;

      return matchesQuery && matchesTheme && matchesTags && matchesReviewFilter;
    });

    return filtered.sort((a, b) => {
        switch (sortBy) {
            case 'savedAt_asc': return a.savedAt - b.savedAt;
            case 'srsLevel_asc': return a.srsLevel - b.srsLevel;
            case 'srsLevel_desc': return b.srsLevel - a.srsLevel;
            case 'voce_asc': return a.voce.localeCompare(b.voce);
            case 'voce_desc': return b.voce.localeCompare(a.voce);
            case 'savedAt_desc':
            default: return b.savedAt - a.savedAt;
        }
    });

  }, [deck, searchQuery, selectedThemes, selectedTags, showOnlyForReview, sortBy]);
  
  const reviewableItemsInFilter = useMemo(() => {
      return filteredDeck.filter(item => item.srsLevel > 0 && item.nextReviewDate <= Date.now());
  }, [filteredDeck]);

  const handleUpdateCard = useCallback((updatedItem: SavedCollocation) => {
    const newDeck = deck.map(item => item.id === updatedItem.id ? updatedItem : item);
    onUpdateDeck(newDeck);
  }, [deck, onUpdateDeck]);

  const handleRemoveCard = useCallback((idToRemove: string) => {
    onUpdateDeck(deck.filter(item => item.id !== idToRemove));
  }, [deck, onUpdateDeck]);
  
  const handleGenerateQuiz = async () => {
    setIsGeneratingQuiz(true);
    setQuizGenerationError(null);
    setQuizQuestions([]);
    setIsQuizModalOpen(true);

    const itemsToQuiz = [...filteredDeck]
      .sort(() => 0.5 - Math.random())
      .slice(0, quizConfig.numQuestions);

    if (itemsToQuiz.length === 0) {
        setQuizGenerationError("Nessuna collocazione trovata per i filtri selezionati. Impossibile generare il quiz.");
        setIsGeneratingQuiz(false);
        return;
    }

    try {
        const quizOptions: QuizOptions = {
            quizType: quizConfig.quizType,
            cefrLevel: quizConfig.cefrLevel,
        };
        const promises = itemsToQuiz.map(collocation => generateClozeTest(collocation, quizOptions));
        const results = await Promise.all(promises);
        setQuizQuestions(results);
    } catch (err) {
        console.error("Errore durante la generazione del quiz per la pratica:", err);
        const message = err instanceof Error ? err.message : "Errore sconosciuto durante la generazione del quiz.";
        setQuizGenerationError(message);
    } finally {
        setIsGeneratingQuiz(false);
    }
  };

  const handleGenerateStory = useCallback(async (item: SavedCollocation) => {
    setStories(prev => ({ ...prev, [item.id]: { isLoading: true, content: null, error: null } }));
    try {
        const result: StoryResult = await generateStoryForCollocation(item);
        setStories(prev => ({ ...prev, [item.id]: { isLoading: false, content: result.story, error: null } }));
    } catch (err) {
        const message = err instanceof Error ? err.message : "Impossibile generare la storia.";
        setStories(prev => ({ ...prev, [item.id]: { isLoading: false, content: null, error: message } }));
    }
  }, []);

  const handleExport = (format: 'json' | 'csv') => {
    const data = filteredDeck;
    if (data.length === 0) return;

    let fileContent = '';
    let mimeType = '';
    let fileName = '';

    if (format === 'json') {
      fileContent = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
      fileName = 'collocazioni_deck.json';
    } else {
      const headers = ['id', 'voce', 'spiegazione', 'frase_originale', 'tema', 'savedAt', 'srsLevel', 'nextReviewDate', 'cefrLevel', 'register', 'notes', 'tags'];
      const csvRows = [headers.join(',')];

      const escapeCsvField = (field: any): string => {
        if (field === null || field === undefined) return '';
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
          return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
      };

      data.forEach(item => {
        const row = headers.map(header => {
            if (header === 'tags') {
                return escapeCsvField((item.tags || []).join(';'));
            }
            return escapeCsvField(item[header as keyof SavedCollocation]);
        });
        csvRows.push(row.join(','));
      });

      fileContent = csvRows.join('\n');
      mimeType = 'text/csv';
      fileName = 'collocazioni_deck.csv';
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  if (deck.length === 0 && searchQuery.trim() === '') {
    return (
      <div className="text-center py-20 px-4 bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-lg">
        <div className="flex items-center justify-center w-20 h-20 bg-sky-100 dark:bg-sky-900/40 rounded-full mx-auto">
            <BookmarkIcon className="w-10 h-10 text-sky-500 dark:text-sky-400" />
        </div>
        <h2 className="mt-6 text-2xl font-bold text-slate-800 dark:text-slate-100">Il tuo Deck di Studio è vuoto</h2>
        <p className="mt-2 text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          Torna all'<b>Estrattore</b> per analizzare un testo e salvare le tue prime collocazioni. Inizieranno ad apparire qui, pronte per essere studiate!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="glass-panel p-6 rounded-2xl shadow-lg space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Deck di Studio ({deck.length} voci)</h2>
                <p className="text-slate-600 dark:text-slate-300 mt-1">Cerca, filtra e ripassa le collocazioni che hai salvato.</p>
            </div>
             <div className="flex items-center gap-2 flex-wrap">
                 <button onClick={() => handleExport('json')} disabled={filteredDeck.length === 0} className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700/50 rounded-md border border-slate-300 dark:border-slate-600/80 hover:bg-slate-50 dark:hover:bg-slate-600/50 flex items-center gap-2 shadow-sm disabled:opacity-50"><DownloadIcon className="w-4 h-4" />Esporta JSON</button>
                 <button onClick={() => handleExport('csv')} disabled={filteredDeck.length === 0} className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700/50 rounded-md border border-slate-300 dark:border-slate-600/80 hover:bg-slate-50 dark:hover:bg-slate-600/50 flex items-center gap-2 shadow-sm disabled:opacity-50"><DownloadIcon className="w-4 h-4" />Esporta CSV</button>
                <button
                    onClick={() => setIsQuickPracticeActive(true)}
                    disabled={deck.length === 0}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg hover:from-indigo-600 hover:to-purple-700 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed"
                >
                    <ShuffleIcon className="w-4 h-4" />
                    Ripasso Rapido
                </button>
            </div>
        </div>
      </div>
      
      <div className="glass-panel p-6 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3 mb-4">
            <TargetIcon className="w-7 h-7 text-sky-500 dark:text-sky-400"/>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Zona Pratica</h3>
        </div>
        <p className="text-slate-600 dark:text-slate-300 mb-6">Mettiti alla prova con un quiz o una sessione di studio mirata basata sulle voci del tuo deck (o sui risultati filtrati).</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="p-4 border border-slate-200/80 dark:border-slate-700/80 rounded-lg bg-slate-50/50 dark:bg-slate-900/20">
                <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">Quiz Mirato</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                    <div className="sm:col-span-1"><label htmlFor="num-questions" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Domande</label><select id="num-questions" value={quizConfig.numQuestions} onChange={e => setQuizConfig(s => ({...s, numQuestions: parseInt(e.target.value)}))} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-900 text-sm"><option value="5">5</option><option value="10">10</option><option value="20">20</option><option value={filteredDeck.length}>Tutte ({filteredDeck.length})</option></select></div>
                    <div className="sm:col-span-1"><label htmlFor="quiz-type-practice" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Tipo Quiz</label><select id="quiz-type-practice" value={quizConfig.quizType} onChange={e => setQuizConfig(s => ({...s, quizType: e.target.value as any}))} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-900 text-sm"><option value="multiple_choice">Scelta Multipla</option><option value="cloze">Completamento</option></select></div>
                    <button onClick={handleGenerateQuiz} disabled={isGeneratingQuiz || filteredDeck.length === 0} className="w-full sm:col-span-1 px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 flex items-center justify-center gap-2 shadow-sm transition-all transform hover:-translate-y-0.5 disabled:bg-slate-400">
                        {isGeneratingQuiz ? 'Genero...' : "Avvia Quiz"}
                    </button>
                </div>
            </div>
             <div className="p-4 border border-slate-200/80 dark:border-slate-700/80 rounded-lg bg-slate-50/50 dark:bg-slate-900/20">
                <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">Sessione di Ripasso Tematica</h4>
                <button onClick={() => setIsSessionModalOpen(true)} disabled={reviewableItemsInFilter.length === 0} className="w-full px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-sm transition-all transform hover:-translate-y-0.5 disabled:bg-slate-400">
                    <CalendarIcon className="w-4 h-4"/>
                    {`Avvia Ripasso (${reviewableItemsInFilter.length} voci)`}
                </button>
                 <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">Avvia una sessione SRS solo con le voci di ripasso risultanti dai filtri attuali.</p>
            </div>
        </div>
      </div>
      
      <div className="glass-panel p-6 rounded-2xl shadow-lg space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          <div>
            <label htmlFor="sort-deck" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Ordina Per</label>
            <select id="sort-deck" value={sortBy} onChange={e => setSortBy(e.target.value as SortByType)} className="w-full p-2.5 border border-slate-300/80 dark:border-slate-600/80 rounded-lg bg-white/60 dark:bg-slate-900/40">
                <option value="savedAt_desc">Più Recenti</option>
                <option value="savedAt_asc">Meno Recenti</option>
                <option value="srsLevel_desc">Da Ripassare (Difficili)</option>
                <option value="srsLevel_asc">Imparate (Facili)</option>
                <option value="voce_asc">Alfabetico (A-Z)</option>
                <option value="voce_desc">Alfabetico (Z-A)</option>
            </select>
          </div>
          <div className="flex items-end justify-between h-full">
            <div className="flex items-center gap-3">
              <label htmlFor="review-filter" className="text-sm font-medium text-slate-600 dark:text-slate-300 cursor-pointer">Mostra solo da ripassare</label>
              <button id="review-filter" role="switch" aria-checked={showOnlyForReview} onClick={() => setShowOnlyForReview(!showOnlyForReview)} className={`${showOnlyForReview ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}><span className={`${showOnlyForReview ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}/></button>
            </div>
            <div>
              <span className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 text-right">Vista</span>
              <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-700/60 p-1 rounded-lg">
                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-slate-800/80 shadow text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-600/50'}`} aria-label="Vista a griglia"><LayoutGridIcon className="w-5 h-5"/></button>
                <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white dark:bg-slate-800/80 shadow text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-600/50'}`} aria-label="Vista Kanban"><ColumnsIcon className="w-5 h-5"/></button>
              </div>
            </div>
          </div>
        </div>
        {allThemes.length > 0 && <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2"><FilterIcon className="w-4 h-4" /> Filtra per Tema</label><div className="flex flex-wrap items-center gap-2">{[<button key="all-themes" onClick={() => setSelectedThemes([])} className={`px-3 py-1 text-xs font-semibold rounded-full ${selectedThemes.length === 0 ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>Tutti</button>, ...allThemes.map(theme => <button key={theme} onClick={() => handleThemeToggle(theme)} className={`px-3 py-1 text-xs font-semibold rounded-full ${selectedThemes.includes(theme) ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>{theme}</button>)]}</div></div>}
        {allTags.length > 0 && <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2"><TagIcon className="w-4 h-4 text-slate-500" /> Filtra per Tag</label><div className="flex flex-wrap items-center gap-2">{[<button key="all-tags" onClick={() => setSelectedTags([])} className={`px-3 py-1 text-xs font-semibold rounded-full ${selectedTags.length === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>Tutti</button>, ...allTags.map(tag => <button key={tag} onClick={() => handleTagToggle(tag)} className={`px-3 py-1 text-xs font-semibold rounded-full ${selectedTags.includes(tag) ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>{tag}</button>)]}</div></div>}
      </div>

      {filteredDeck.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDeck.map((item, index) => (
                  <div key={item.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}>
                      <DeckCard
                          item={item}
                          onUpdate={handleUpdateCard}
                          onDelete={handleRemoveCard}
                          storyState={stories[item.id]}
                          onGenerateStory={() => handleGenerateStory(item)}
                          onImproveSentence={() => onOpenSentenceImprover(item)}
                          onDeepDive={onDeepDive}
                      />
                  </div>
              ))}
          </div>
        ) : (
            <KanbanBoard 
                deck={filteredDeck}
                onUpdateDeck={onUpdateDeck}
                onUpdateCard={handleUpdateCard}
                onRemoveCard={handleRemoveCard}
                stories={stories}
                onGenerateStory={handleGenerateStory}
                onOpenSentenceImprover={onOpenSentenceImprover}
                onDeepDive={onDeepDive}
            />
        )
      ) : (
         <div className="text-center py-16 px-4 bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-200/80 dark:border-slate-700/80 animate-fade-in">
            <SearchIcon className="w-12 h-12 mx-auto text-slate-400" />
            <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">Nessun risultato trovato</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Prova a modificare la ricerca o i filtri.</p>
        </div>
      )}
      {isQuickPracticeActive && (
        <QuickPracticeModal
            deck={deck}
            onClose={() => setIsQuickPracticeActive(false)}
        />
      )}
      <PracticeQuizModal
        isOpen={isQuizModalOpen}
        onClose={() => setIsQuizModalOpen(false)}
        questions={quizQuestions}
        isGenerating={isGeneratingQuiz}
        generationError={quizGenerationError}
      />
      {isSessionModalOpen && (
        <StudySessionModal
            newItems={[]}
            reviewItems={reviewableItemsInFilter}
            onClose={() => setIsSessionModalOpen(false)}
            onSessionComplete={onSessionComplete}
            sessionMode="mixed"
        />
      )}
    </div>
  );
};

export default PracticeHub;