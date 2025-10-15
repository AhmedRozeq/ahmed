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
import Edit3Icon from './icons/Edit3Icon';
import EditCardModal from './EditCardModal';


interface PracticeHubProps {
  deck: SavedCollocation[];
  onUpdateDeck: (newDeck: SavedCollocation[]) => void;
  searchQuery: string;
  onSessionComplete: (updatedItems: SavedCollocation[]) => void;
  onOpenSentenceImprover: (collocation?: SavedCollocation) => void;
  onDeepDive: (item: Collocation | string) => void;
  cefrLevel: string;
  register: string;
  onRenameTheme: (oldName: string, newName: string) => void;
  onVoicePractice: (item: Collocation | string) => void;
}

type SortByType = 'savedAt_desc' | 'savedAt_asc' | 'srsLevel_asc' | 'srsLevel_desc' | 'voce_asc' | 'voce_desc';

const PracticeHub: React.FC<PracticeHubProps> = ({ deck, onUpdateDeck, searchQuery, onSessionComplete, onOpenSentenceImprover, onDeepDive, cefrLevel, register, onRenameTheme, onVoicePractice }) => {
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showOnlyForReview, setShowOnlyForReview] = useState(false);
  const [sortBy, setSortBy] = useState<SortByType>('savedAt_desc');
  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid');
  const [editingTheme, setEditingTheme] = useState<string | null>(null);
  const [newThemeName, setNewThemeName] = useState('');
  const [editingCard, setEditingCard] = useState<SavedCollocation | null>(null);

  const [isQuickPracticeActive, setIsQuickPracticeActive] = useState(false);
  
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizGenerationError, setQuizGenerationError] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<ClozeTestResult[]>([]);
  const [quizConfig, setQuizConfig] = useState({
    numQuestions: 5,
    quizType: 'multiple_choice' as 'cloze' | 'multiple_choice',
    cefrLevel: cefrLevel,
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
  
  const handleStartRename = (theme: string) => {
    setEditingTheme(theme);
    setNewThemeName(theme);
  };

  const handleRenameConfirm = (oldName: string) => {
    if (newThemeName.trim() && newThemeName.trim() !== oldName) {
        onRenameTheme(oldName, newThemeName.trim());
    }
    setEditingTheme(null);
  };

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
  
  const handleEditCard = (card: SavedCollocation) => {
    setEditingCard(card);
  };
  
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
            register: register,
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
        const result: StoryResult = await generateStoryForCollocation(item, {cefrLevel, register});
        setStories(prev => ({ ...prev, [item.id]: { isLoading: false, content: result.story, error: null } }));
    } catch (err) {
        const message = err instanceof Error ? err.message : "Impossibile generare la storia.";
        setStories(prev => ({ ...prev, [item.id]: { isLoading: false, content: null, error: message } }));
    }
  }, [cefrLevel, register]);

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
      <div className="text-center py-20 px-4 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-lg">
        <div className="flex items-center justify-center w-20 h-20 bg-sky-100 dark:bg-sky-900/40 rounded-full mx-auto">
            <BookmarkIcon className="w-10 h-10 text-sky-500 dark:text-sky-400" />
        </div>
        <h2 className="mt-6 text-2xl font-bold text-gray-800 dark:text-gray-100">Il tuo Deck di Studio è vuoto</h2>
        <p className="mt-2 text-base text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
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
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Deck di Studio ({deck.length} voci)</h2>
                <p className="text-gray-600 dark:text-gray-300 mt-1">Cerca, filtra e ripassa le collocazioni che hai salvato.</p>
            </div>
             <div className="flex items-center gap-2 flex-wrap">
                 <button onClick={() => handleExport('json')} disabled={filteredDeck.length === 0} className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700/50 rounded-md border border-gray-300 dark:border-gray-600/80 hover:bg-gray-50 dark:hover:bg-gray-600/50 flex items-center gap-2 shadow-sm disabled:opacity-50"><DownloadIcon className="w-4 h-4" />Esporta JSON</button>
                 <button onClick={() => handleExport('csv')} disabled={filteredDeck.length === 0} className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700/50 rounded-md border border-gray-300 dark:border-gray-600/80 hover:bg-gray-50 dark:hover:bg-gray-600/50 flex items-center gap-2 shadow-sm disabled:opacity-50"><DownloadIcon className="w-4 h-4" />Esporta CSV</button>
                <button
                    onClick={() => setIsQuickPracticeActive(true)}
                    disabled={deck.length === 0}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg hover:from-indigo-600 hover:to-violet-700 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed"
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
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Zona Pratica</h3>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Mettiti alla prova con un quiz o una sessione di studio mirata basata sulle voci del tuo deck (o sui risultati filtrati).</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="p-4 border border-gray-200/80 dark:border-gray-700/80 rounded-lg bg-gray-50/50 dark:bg-gray-900/20">
                <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Quiz Mirato</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                    <div className="sm:col-span-1"><label htmlFor="num-questions" className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Domande</label><select id="num-questions" value={quizConfig.numQuestions} onChange={e => setQuizConfig(s => ({...s, numQuestions: parseInt(e.target.value)}))} className="w-full p-2 text-sm bg-white/60 dark:bg-gray-900/40 border border-gray-300/80 dark:border-gray-700/60 rounded-lg shadow-inner focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"><option value="5">5</option><option value="10">10</option><option value="20">20</option><option value={filteredDeck.length}>Tutte ({filteredDeck.length})</option></select></div>
                    <div className="sm:col-span-1"><label htmlFor="quiz-type-practice" className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Tipo Quiz</label><select id="quiz-type-practice" value={quizConfig.quizType} onChange={e => setQuizConfig(s => ({...s, quizType: e.target.value as any}))} className="w-full p-2 text-sm bg-white/60 dark:bg-gray-900/40 border border-gray-300/80 dark:border-gray-700/60 rounded-lg shadow-inner focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"><option value="multiple_choice">Scelta Multipla</option><option value="cloze">Completamento</option></select></div>
                    <button onClick={handleGenerateQuiz} disabled={isGeneratingQuiz || filteredDeck.length === 0} className="w-full sm:col-span-1 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-sm transition-all transform hover:-translate-y-0.5 disabled:bg-gray-400">
                        {isGeneratingQuiz ? 'Genero...' : "Avvia Quiz"}
                    </button>
                </div>
            </div>
             <div className="p-4 border border-gray-200/80 dark:border-gray-700/80 rounded-lg bg-gray-50/50 dark:bg-gray-900/20">
                <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Sessione di Ripasso Tematica</h4>
                <button onClick={() => setIsSessionModalOpen(true)} disabled={reviewableItemsInFilter.length === 0} className="w-full px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 flex items-center justify-center gap-2 shadow-sm transition-all transform hover:-translate-y-0.5 disabled:bg-gray-400">
                    <CalendarIcon className="w-4 h-4"/>
                    {`Avvia Ripasso (${reviewableItemsInFilter.length} voci)`}
                </button>
                 <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">Avvia una sessione SRS solo con le voci di ripasso risultanti dai filtri attuali.</p>
            </div>
        </div>
      </div>
      
      <div className="glass-panel p-6 rounded-2xl shadow-lg space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          <div>
            <label htmlFor="sort-deck" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Ordina Per</label>
            <select id="sort-deck" value={sortBy} onChange={e => setSortBy(e.target.value as SortByType)} className="w-full p-2.5 bg-white/60 dark:bg-gray-900/40 border border-gray-300/80 dark:border-gray-700/60 rounded-lg shadow-inner focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200">
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
              <label htmlFor="review-filter" className="text-sm font-medium text-gray-600 dark:text-gray-300 cursor-pointer">Mostra solo da ripassare</label>
              <button id="review-filter" role="switch" aria-checked={showOnlyForReview} onClick={() => setShowOnlyForReview(!showOnlyForReview)} className={`${showOnlyForReview ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}><span className={`${showOnlyForReview ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}/></button>
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 text-right">Vista</span>
              <div className="flex items-center gap-1 bg-gray-200/70 dark:bg-gray-700/60 p-1 rounded-lg">
                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-gray-800/80 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-600/50'}`} aria-label="Vista a griglia"><LayoutGridIcon className="w-5 h-5"/></button>
                <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white dark:bg-gray-800/80 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-600/50'}`} aria-label="Vista Kanban"><ColumnsIcon className="w-5 h-5"/></button>
              </div>
            </div>
          </div>
        </div>
        {allThemes.length > 0 && <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2"><FilterIcon className="w-4 h-4" /> Filtra per Tema</label><div className="flex flex-wrap items-center gap-2"><button key="all-themes" onClick={() => setSelectedThemes([])} className={`px-3 py-1 text-xs font-semibold rounded-full ${selectedThemes.length === 0 ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>Tutti</button>{allThemes.map(theme => (editingTheme === theme ? (<input key={`${theme}-input`} type="text" value={newThemeName} onChange={e => setNewThemeName(e.target.value)} onBlur={() => handleRenameConfirm(theme)} onKeyDown={e => { if (e.key === 'Enter') handleRenameConfirm(theme); if (e.key === 'Escape') { setEditingTheme(null); setNewThemeName(''); } }} autoFocus className="px-3 py-1 text-xs font-semibold rounded-full bg-white dark:bg-gray-800 border-2 border-indigo-500 focus:outline-none"/>) : (<div key={theme} className="relative group"><button onClick={() => handleThemeToggle(theme)} className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${selectedThemes.includes(theme) ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>{theme}</button><button onClick={(e) => { e.stopPropagation(); handleStartRename(theme); }} className="absolute -top-1 -right-1 p-0.5 bg-white dark:bg-gray-800 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100" aria-label={`Rinomina tema ${theme}`}><Edit3Icon className="w-3 h-3 text-gray-500" /></button></div>)))}</div></div>}
        {allTags.length > 0 && <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2"><TagIcon className="w-4 h-4 text-gray-500" /> Filtra per Tag</label><div className="flex flex-wrap items-center gap-2"><button key="all-tags" onClick={() => setSelectedTags([])} className={`px-3 py-1 text-xs font-semibold rounded-full ${selectedTags.length === 0 ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>Tutti</button>{allTags.map(tag => <button key={tag} onClick={() => handleTagToggle(tag)} className={`px-3 py-1 text-xs font-semibold rounded-full ${selectedTags.includes(tag) ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>{tag}</button>)}</div></div>}
      </div>

      {filteredDeck.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredDeck.map((item, index) => (
                  <div key={item.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}>
                      <DeckCard
                          item={item}
                          onUpdate={handleUpdateCard}
                          onDelete={handleRemoveCard}
                          onEdit={handleEditCard}
                          storyState={stories[item.id]}
                          onGenerateStory={() => handleGenerateStory(item)}
                          onImproveSentence={() => onOpenSentenceImprover(item)}
                          onDeepDive={onDeepDive}
                          onVoicePractice={() => onVoicePractice(item)}
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
                onVoicePractice={onVoicePractice}
            />
        )
      ) : (
         <div className="text-center py-16 px-4 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-200/80 dark:border-gray-700/80 animate-fade-in">
            <SearchIcon className="w-12 h-12 mx-auto text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">Nessun risultato trovato</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Prova a modificare la ricerca o i filtri.</p>
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
            cefrLevel={cefrLevel}
            register={register}
        />
      )}
      {editingCard && (
        <EditCardModal
            isOpen={!!editingCard}
            onClose={() => setEditingCard(null)}
            card={editingCard}
            onSave={(updatedCard) => {
                handleUpdateCard(updatedCard);
                setEditingCard(null);
            }}
        />
      )}
    </div>
  );
};

export default PracticeHub;