import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { CollocationsResult, ThemeGroup, Collocation, ClozeTestResult, RelatedCollocation, QuizOptions, SavedCollocation, RolePlayResult, DictionaryResult, GroundingChunk, ThemeExplanationResult, DictionaryEntry, CardDeepDiveResult, ImprovedSentenceResult, GeneratedCardData, ConversationTurn, AITutorResponse, FollowUpQuestion, ImprovedTextResult, DeepDiveOptions, CreativeSuggestion, CreativeFeedbackResult } from './types';
import { extractCollocations, generateDeepDive, generateText, generateClozeTest, generateRelatedCollocations, explainTheme, analyzeGrammarOfText, explainText, generateRolePlayScript, answerQuestionAboutCollocation, generateItalianArabicDictionary, getWebExamples, generateCollocationCard, translateItalianToArabic, improveSentence, generateCardDeepDive, generateThemeDeepDive, getTutorResponse, analyzeUserTextForTutor, getCulturalContext, getProactiveTutorIntro, answerTutorFollowUp, improveText, getCollaborativeFeedback } from './services/geminiService';
import { recordStudySession } from './utils/streak';
import ResultsDisplay from './components/ResultsDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import SparklesIcon from './components/icons/SparklesIcon';
import QuoteIcon from './components/icons/QuoteIcon';
import InfoIcon from './components/icons/InfoIcon';
import SearchIcon from './components/icons/SearchIcon';
import QuizModal from './components/QuizModal';
import ConceptMap from './components/ConceptMap';
import ListIcon from './components/icons/ListIcon';
import MapIcon from './components/icons/MapIcon';
import PracticeHub from './components/PracticeHub';
import StudyPlan from './StudyPlan';
import DeckIcon from './components/icons/DeckIcon';
import CalendarIcon from './components/icons/CalendarIcon';
import MarkdownDisplay from './components/MarkdownDisplay';
import Toast from './components/Toast';
import GuideModal from './components/GuideModal';
import HelpCircleIcon from './components/icons/HelpCircleIcon';
import RolePlayModal from './components/RolePlayModal';
import StoryModal from './components/StoryModal';
import SentenceImproverModal from './components/SentenceImproverModal';
import WandIcon from './components/icons/WandIcon';
import MoonIcon from './components/icons/MoonIcon';
import UsersIcon from './components/icons/UsersIcon';
import BookTextIcon from './components/icons/BookTextIcon';
import EditIcon from './components/icons/EditIcon';
import SunIcon from './components/icons/SunIcon';
import CollocationIcon from './components/icons/CollocationIcon';
import XIcon from './components/icons/XIcon';
import GlobeIcon from './components/icons/GlobeIcon';
import WebSearchModal from './components/WebSearchModal';
import ArabicTranslationDisplay from './components/ArabicTranslationDisplay';
import Sidebar from './components/Sidebar';
import GrammarIcon from './components/icons/GrammarIcon';
import DictionaryIcon from './components/icons/DictionaryIcon';
import TranslateIcon from './components/icons/TranslateIcon';
import ExplanationModal from './components/ExplanationModal';
import AddCardModal from './components/AddCardModal';
import AnalysisOptionsModal from './components/AnalysisOptionsModal';
import AITutorPage from './components/AITutorPage';
import BrainIcon from './components/icons/BrainIcon';
import CulturalContextModal from './components/CulturalContextModal';
import VoicePracticeModal from './components/ConversationalPracticeModal';
import DictionaryModal from './components/DictionaryModal';
import ImprovedTextDisplay from './components/ImprovedTextDisplay';
import NewTopicCreator from './components/NewTopicCreator';
import SelectionPopover from './components/SelectionPopover';


const LOCAL_STORAGE_KEY = 'collocationExtractorData_v2';
const DEEP_DIVE_OPTIONS_KEY = 'deepDiveOptions';
const STUDY_DECK_KEY = 'studyDeck';
const STUDY_HISTORY_KEY = 'studyHistory_v1';
const THEME_KEY = 'theme';


type AnalysisType = 'collocation' | 'grammar' | 'dictionary' | 'translation_ita_ara';

const App = () => {
  const location = useLocation();
  const activeTab = location.pathname.substring(1) || 'extractor';

  // Main state
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingExample, setIsGeneratingExample] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cefrLevel, setCefrLevel] = useState('B1');
  const [analysisRegister, setAnalysisRegister] = useState('Neutro');
  const [analysisType, setAnalysisType] = useState<AnalysisType>('collocation');
  const [searchQuery, setSearchQuery] = useState('');

  // Results state
  const [results, setResults] = useState<CollocationsResult | null>(null);
  const [grammarAnalysis, setGrammarAnalysis] = useState<string | null>(null);
  const [arabicTranslation, setArabicTranslation] = useState<string | null>(null);
  
  // View state
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    return (savedTheme === 'dark' || (savedTheme === null && window.matchMedia('(prefers-color-scheme: dark)').matches)) ? 'dark' : 'light';
  });
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  // Deep dive states
  const initialDeepDiveSubState = { data: null, isLoading: false, error: null };
    const initialSidebarState = {
        isOpen: false,
        item: null,
        content: null,
        isLoading: false,
        error: null,
        relatedCollocations: { ...initialDeepDiveSubState, data: [] },
        webExamples: { summary: null, chunks: null, isLoading: false, error: null },
        questions: [],
    };

    const [sidebarState, setSidebarState] = useState<{
        isOpen: boolean;
        item: Collocation | string | null;
        content: string | null;
        isLoading: boolean;
        error: string | null;
        relatedCollocations: { data: RelatedCollocation[] | null; isLoading: boolean; error: string | null; };
        webExamples: { summary: string | null; chunks: GroundingChunk[] | null; isLoading: boolean; error: string | null; };
        questions: Array<{ id: string; question: string; answer: string | null; chunks: GroundingChunk[]; isLoading: boolean; error: string | null; }>;
    }>(initialSidebarState);
  
  // Study Deck
  const [studyDeck, setStudyDeck] = useState<SavedCollocation[]>([]);
  const savedCollocationsSet = useMemo(() => new Set(studyDeck.map(c => c.voce)), [studyDeck]);
  
  const reviewCount = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayTimestamp = now.getTime();
    return studyDeck.filter(item => item.srsLevel > 0 && item.nextReviewDate <= todayTimestamp).length;
  }, [studyDeck]);

  // Study History & Plan
  const [studyHistory, setStudyHistory] = useState<number[]>([]);

  // AI Tutor State
  const [aiTutorHistory, setAiTutorHistory] = useState<ConversationTurn[]>([]);
  const [isTutorLoading, setIsTutorLoading] = useState(false);
  const [tutorCefrLevel, setTutorCefrLevel] = useState('B1');
  const [tutorRegister, setTutorRegister] = useState('Neutro');
  const [proactiveTopic, setProactiveTopic] = useState<SavedCollocation | null>(null);
  const [aiTutorSuggestions, setAiTutorSuggestions] = useState<string[]>([
    "Spiega la differenza tra 'sapere' e 'conoscere'",
    "Crea una frase con 'nonostante'",
    "Correggi questa frase: 'Lui ha andato al mercato.'"
  ]);

  // Modals state
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalData, setModalData] = useState<any>(null);
  const [isWebSearchModalOpen, setIsWebSearchModalOpen] = useState(false);
  const [isAnalysisOptionsModalOpen, setIsAnalysisOptionsModalOpen] = useState(false);
  const [optionsModalTrigger, setOptionsModalTrigger] = useState<'analyze' | 'example' | 'web_search' | null>(null);
  
  // UI State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [openThemes, setOpenThemes] = useState<Set<string>>(new Set());
  const [themeExplanations, setThemeExplanations] = useState<Record<string, { isLoading: boolean; content: ThemeExplanationResult | null; error: string | null }>>({});
  const [inlineDeepDives, setInlineDeepDives] = useState<Record<string, { isOpen: boolean; isLoading: boolean; content: CardDeepDiveResult | null; error: string | null; }>>({});
  const [selectionPopover, setSelectionPopover] = useState<{
    visible: boolean;
    top: number;
    left: number;
    text: string;
  }>({ visible: false, top: 0, left: 0, text: '' });


  // Refs
  const mainContentRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);

  // Selection popover logic
  useEffect(() => {
    const handleMouseUp = (event: MouseEvent) => {
        if ((event.target as HTMLElement).closest('.selection-popover-container, [role="dialog"], .react-flow__attribution')) {
            return;
        }

        const selection = window.getSelection();
        if (selection && !selection.isCollapsed && selection.toString().trim().length > 2) {
            const text = selection.toString().trim();
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            if (rect.width > 0) {
                 const isMobile = window.innerWidth < 768; // Tailwind's 'md' breakpoint
                 setSelectionPopover({
                    visible: true,
                    top: isMobile ? rect.bottom + window.scrollY : rect.top + window.scrollY,
                    left: rect.left + window.scrollX + rect.width / 2,
                    text: text,
                });
            }
        } else {
            setSelectionPopover(prev => prev.visible ? { ...prev, visible: false } : prev);
        }
    };
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
        document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleExplainSelection = (type: 'explanation' | 'grammar') => {
    if (!selectionPopover.text) return;
    setModalData({ item: selectionPopover.text, type, cefrLevel, register: analysisRegister });
    setActiveModal('explanation');
    setSelectionPopover({ visible: false, top: 0, left: 0, text: '' });
  };

  const handleDictionarySelection = () => {
    if (!selectionPopover.text) return;
    setModalData({ item: selectionPopover.text, cefrLevel, register: analysisRegister });
    setActiveModal('dictionary');
    setSelectionPopover({ visible: false, top: 0, left: 0, text: '' });
  };

  const handleAddToDeckSelection = () => {
    if (!selectionPopover.text) return;
    setModalData({ topic: selectionPopover.text });
    setActiveModal('add_card');
    setSelectionPopover({ visible: false, top: 0, left: 0, text: '' });
  };


  // Scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
        const currentScrollY = window.scrollY;

        if (currentScrollY > lastScrollY.current && currentScrollY > 150) {
            setIsHeaderVisible(false); // Hide on scroll down
        } else {
            setIsHeaderVisible(true); // Show on scroll up
        }
        
        lastScrollY.current = currentScrollY;
        setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const savedDeck = localStorage.getItem(STUDY_DECK_KEY);
      if (savedDeck) setStudyDeck(JSON.parse(savedDeck));

      const savedHistory = localStorage.getItem(STUDY_HISTORY_KEY);
      if (savedHistory) setStudyHistory(JSON.parse(savedHistory));

      document.documentElement.classList.toggle('dark', theme === 'dark');

    } catch (e) {
      console.error("Failed to load data from local storage", e);
      setToast({ message: "Errore nel caricamento dei dati salvati.", type: 'error' });
    }
  }, [theme]);

  // Save data to localStorage on change
  const useDebouncedEffect = (callback: () => void, deps: any[], delay: number) => {
    useEffect(() => {
      const handler = setTimeout(() => {
        callback();
      }, delay);
      return () => clearTimeout(handler);
    }, [...deps, delay]);
  };

  useDebouncedEffect(() => localStorage.setItem(STUDY_DECK_KEY, JSON.stringify(studyDeck)), [studyDeck], 500);
  useDebouncedEffect(() => localStorage.setItem(STUDY_HISTORY_KEY, JSON.stringify(studyHistory)), [studyHistory], 500);
  useDebouncedEffect(() => localStorage.setItem(THEME_KEY, theme), [theme], 200);

  // Handlers
  const performAnalysis = useCallback(async (level: string, register: string) => {
    if (!text.trim()) {
      setError("Il campo di testo non può essere vuoto.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setResults(null);
    setGrammarAnalysis(null);
    setArabicTranslation(null);
    
    try {
      switch (analysisType) {
        case 'collocation':
          const collocationResult = await extractCollocations(text, level);
          setResults(collocationResult);
          if(collocationResult.dizionario.length > 0) {
              setOpenThemes(new Set([collocationResult.dizionario[0].tema]));
          }
          break;
        case 'grammar':
          const grammarResult = await analyzeGrammarOfText(text, { cefrLevel: level, register: register });
          setGrammarAnalysis(grammarResult);
          break;
        case 'dictionary':
          const dictionaryData = await generateItalianArabicDictionary(text, { cefrLevel: level, register: register });
          const transformedResult: CollocationsResult = {
            dizionario: dictionaryData.dizionario_tematico.map(themeGroup => ({
              tema: themeGroup.tema,
              collocazioni: themeGroup.voci.map(entry => ({
                voce: entry.termine_italiano,
                spiegazione: entry.definizione_italiano,
                frase_originale: entry.esempio_italiano,
                traduzione_arabo: entry.traduzione_arabo,
                definizione_arabo: entry.definizione_arabo,
                esempio_arabo: entry.esempio_arabo,
                pronuncia_arabo: entry.pronuncia_arabo,
                contesto_culturale: entry.contesto_culturale,
              }))
            }))
          };
          setResults(transformedResult);
          if (transformedResult.dizionario.length > 0) {
            setOpenThemes(new Set([transformedResult.dizionario[0].tema]));
          }
          break;
        case 'translation_ita_ara':
          const translationResult = await translateItalianToArabic(text, level, register);
          setArabicTranslation(translationResult);
          break;
      }
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err: any) {
      setError(err.message || "Si è verificato un errore sconosciuto.");
      setToast({ message: err.message || "Si è verificato un errore.", type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [text, analysisType]);
  
  const generateExampleTextWithOptions = useCallback(async (level: string, register: string) => {
    setIsGeneratingExample(true);
    setError(null);
    try {
        const generatedText = await generateText({ cefrLevel: level, register: register, useSearch: true });
        setText(generatedText);
        setToast({ message: "Testo di esempio generato!", type: 'success' });
    } catch (err: any) {
        setError(err.message || "Impossibile generare il testo di esempio.");
        setToast({ message: err.message || "Errore nella generazione del testo.", type: 'error' });
    } finally {
        setIsGeneratingExample(false);
    }
  }, []);

  const handleAnalyzeClick = () => {
    if (!text.trim()) {
        setError("Il campo di testo non può essere vuoto.");
        return;
    }
    setOptionsModalTrigger('analyze');
    setIsAnalysisOptionsModalOpen(true);
  };
  
  const handleConfirmAnalysis = (level: string, register: string) => {
    setIsAnalysisOptionsModalOpen(false);
    
    if (optionsModalTrigger === 'analyze') {
        setCefrLevel(level);
        setAnalysisRegister(register);
        performAnalysis(level, register);
    } else if (optionsModalTrigger === 'example') {
        generateExampleTextWithOptions(level, register);
    } else if (optionsModalTrigger === 'web_search') {
        setCefrLevel(level);
        setAnalysisRegister(register);
        setIsWebSearchModalOpen(true);
    }
    setOptionsModalTrigger(null);
  };

  const handleSaveCollocation = useCallback((collocation: Collocation, theme: string) => {
    if (savedCollocationsSet.has(collocation.voce)) {
      setStudyDeck(prev => prev.filter(c => c.voce !== collocation.voce));
      setToast({ message: `"${collocation.voce}" rimosso dal deck.`, type: 'success' });
    } else {
      const newSavedItem: SavedCollocation = {
        ...collocation,
        id: crypto.randomUUID(),
        tema: theme,
        savedAt: Date.now(),
        srsLevel: 0,
        nextReviewDate: Date.now(),
      };
      setStudyDeck(prev => [...prev, newSavedItem].sort((a,b) => b.savedAt - a.savedAt));
      setToast({ message: `"${collocation.voce}" aggiunto al deck!`, type: 'success' });
    }
  }, [savedCollocationsSet]);
  
   const handleUpdateDeck = useCallback((newDeck: SavedCollocation[]) => {
      setStudyDeck(newDeck);
  }, []);

  const handleSessionComplete = useCallback((updatedItems: SavedCollocation[]) => {
      setStudyDeck(prevDeck => {
          const updatedMap = new Map(updatedItems.map(item => [item.id, item]));
          return prevDeck.map(item => updatedMap.get(item.id) || item);
      });
      setStudyHistory(prevHistory => recordStudySession(prevHistory));
      setToast({ message: "Sessione completata! Ottimo lavoro.", type: "success" });
  }, []);

  const handleDeepDiveRequest = useCallback((item: string | Collocation) => {
    const isThemeFromResults = typeof item === 'string' && results?.dizionario.some(group => group.tema === item);

    if (isThemeFromResults) {
        setModalData({ theme: item });
        setActiveModal('theme_deep_dive_options');
    } else {
        setModalData({ collocation: item });
        setActiveModal('collocation_deep_dive_options');
    }
  }, [results]);

  const handleConfirmCollocationDeepDive = useCallback(async (level: string, register: string) => {
    const item = modalData?.collocation;
    if (!item) return;

    setActiveModal(null);
    const itemName = typeof item === 'string' ? item : item.voce;

    setSidebarState({
      ...initialSidebarState,
      isOpen: true,
      item: item,
      isLoading: true,
      relatedCollocations: { ...initialSidebarState.relatedCollocations, isLoading: true },
      webExamples: { ...initialSidebarState.webExamples, isLoading: true },
    });
  
    try {
      const itemContext = typeof item === 'object' ? item : undefined;
      const content = await generateDeepDive(itemName, { cefrLevel: level, register: register, itemContext });
      setSidebarState(prev => ({ ...prev, content, isLoading: false }));
    } catch (err: any) {
      setSidebarState(prev => ({ ...prev, error: err.message, isLoading: false }));
    }
  
    generateRelatedCollocations(itemName, { cefrLevel: level, register: register })
      .then(data => setSidebarState(prev => ({ ...prev, relatedCollocations: { data, isLoading: false, error: null } })))
      .catch(err => setSidebarState(prev => ({ ...prev, relatedCollocations: { data: null, isLoading: false, error: err.message } })));
  
    getWebExamples(itemName)
      .then(data => setSidebarState(prev => ({ ...prev, webExamples: { ...data, isLoading: false, error: null } })))
      .catch(err => setSidebarState(prev => ({ ...prev, webExamples: { summary: null, chunks: null, isLoading: false, error: err.message } })));
  
  }, [modalData]);

const handleConfirmThemeDeepDive = useCallback(async (level: string, register: string) => {
    const themeName = modalData?.theme;
    if (!themeName || !results) return;

    setActiveModal(null);

    const themeGroup = results.dizionario.find(g => g.tema === themeName);
    if (!themeGroup) return;

    setSidebarState({
        ...initialSidebarState,
        isOpen: true,
        item: themeName,
        isLoading: true,
    });

    try {
        const content = await generateThemeDeepDive(themeName, themeGroup.collocazioni, { cefrLevel: level, register: register });
        setSidebarState(prev => ({ ...prev, content, isLoading: false }));
    } catch (err: any) {
        setSidebarState(prev => ({ ...prev, error: err.message, isLoading: false }));
    }
}, [modalData, results]);

const handleCloseSidebar = useCallback(() => {
    const closeTimer = setTimeout(() => {
         setSidebarState(initialSidebarState);
    }, 300); // match animation duration
    
    setSidebarState(prev => ({...prev, isOpen: false}));

    return () => clearTimeout(closeTimer);
}, []);

const handleAskSidebarQuestion = useCallback(async (question: string) => {
    if (!sidebarState.content) return;
    const questionId = crypto.randomUUID();
    setSidebarState(prev => ({ ...prev, questions: [...prev.questions, { id: questionId, question, answer: null, chunks: [], isLoading: true, error: null }] }));

    try {
      const result = await answerQuestionAboutCollocation(sidebarState.content, question);
      setSidebarState(prev => ({ ...prev, questions: prev.questions.map(q => q.id === questionId ? { ...q, answer: result.answer, chunks: result.chunks, isLoading: false } : q) }));
    } catch (err: any) {
      setSidebarState(prev => ({ ...prev, questions: prev.questions.map(q => q.id === questionId ? { ...q, error: err.message, isLoading: false } : q) }));
    }
}, [sidebarState.content]);

  const handleToggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  const handleConfirmPractice = (level: string, register: string) => {
    if (!modalData?.topic) return;
    const tempCollocation = {
        voce: modalData.topic,
        spiegazione: `Una conversazione su "${modalData.topic}"`,
        frase_originale: '',
    };
    setActiveModal(null); // Close options modal
    // A small delay to allow modal to close before opening the next one
    setTimeout(() => {
        setModalData({ collocation: tempCollocation, cefrLevel: level, register: register });
        setActiveModal('voice_practice');
    }, 150);
  };


  const handleUseExample = useCallback(() => {
    setOptionsModalTrigger('example');
    setIsAnalysisOptionsModalOpen(true);
  }, []);
  
  const handleClearText = () => {
    setText('');
    setResults(null);
    setGrammarAnalysis(null);
    setArabicTranslation(null);
    setError(null);
  };
  
  const handleTextFromWeb = (generatedText: string) => {
    setText(generatedText);
    setIsWebSearchModalOpen(false);
    setToast({ message: "Testo generato dal web caricato!", type: 'success' });
  };
  
  const handleOpenWebSearch = () => {
    setOptionsModalTrigger('web_search');
    setIsAnalysisOptionsModalOpen(true);
  };

  const filteredResults = useMemo(() => {
    if (!results) {
      return null;
    }
    if (!searchQuery) {
      return results.dizionario;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    return results.dizionario
      .map(themeGroup => ({
        ...themeGroup,
        collocazioni: themeGroup.collocazioni.filter(
          c =>
            c.voce.toLowerCase().includes(lowerCaseQuery) ||
            c.spiegazione.toLowerCase().includes(lowerCaseQuery)
        ),
      }))
      .filter(themeGroup => themeGroup.collocazioni.length > 0);
  }, [results, searchQuery]);

  const handleExplainThemeCallback = useCallback(async (themeName: string) => {
    setThemeExplanations(prev => ({ ...prev, [themeName]: { isLoading: true, content: null, error: null } }));
    try {
      const content = await explainTheme(themeName);
      setThemeExplanations(prev => ({ ...prev, [themeName]: { isLoading: false, content, error: null } }));
    } catch (err: any) {
      setThemeExplanations(prev => ({ ...prev, [themeName]: { isLoading: false, content: null, error: err.message } }));
    }
  }, []);
  
  const handleSaveFromModal = useCallback((cardData: GeneratedCardData & { notes: string; tags: string[] }) => {
    const newSavedItem: SavedCollocation = {
      ...cardData,
      id: crypto.randomUUID(),
      savedAt: Date.now(),
      srsLevel: 0,
      nextReviewDate: Date.now(),
      notes: cardData.notes,
      tags: cardData.tags,
    };
    if (savedCollocationsSet.has(newSavedItem.voce)) {
      setToast({ message: `"${newSavedItem.voce}" è già nel deck.`, type: 'error' });
      return;
    }
    setStudyDeck(prev => [...prev, newSavedItem].sort((a,b) => b.savedAt - a.savedAt));
    setToast({ message: `"${newSavedItem.voce}" aggiunto al deck!`, type: 'success' });
  }, [savedCollocationsSet]);
  
  const handleToggleInlineDeepDiveCallback = useCallback(async (voce: string) => {
    setInlineDeepDives(prev => {
      const existing = prev[voce];
      if (existing?.isOpen) {
        return { ...prev, [voce]: { ...existing, isOpen: false } };
      }
      
      const shouldFetch = !existing || (!existing.isLoading && !existing.content);
      if (shouldFetch) {
        generateCardDeepDive(voce)
          .then(content => setInlineDeepDives(p => ({ ...p, [voce]: { ...p[voce], isLoading: false, content, error: null } })))
          .catch(error => setInlineDeepDives(p => ({ ...p, [voce]: { ...p[voce], isLoading: false, content: null, error: error.message } })));
      }
      
      return { ...prev, [voce]: { ...existing, isOpen: true, isLoading: shouldFetch } };
    });
  }, []);

  const handleOpenSentenceImprover = (collocation?: SavedCollocation) => {
    setModalData({ initialTargetCollocation: collocation?.voce });
    setActiveModal('sentence_improver');
  };

  const handleQuizRequest = (collocation: Collocation) => {
    setModalData(collocation);
    setActiveModal('quiz_request');
  };

  const handleRolePlayRequest = (collocation: Collocation) => {
    setModalData(collocation);
    setActiveModal('roleplay_request');
  };
  
  const handleOpenDialogueGenerator = () => {
    setModalData(null);
    setActiveModal('roleplay_request');
  };

  const handleOpenStoryCreator = () => {
    setModalData(null);
    setActiveModal('story_creator');
  };

  const handleOpenQuickQuiz = () => {
    setModalData(null);
    setActiveModal('quiz_request');
  };

  const handleRenameTheme = useCallback((oldName: string, newName: string) => {
    if (!newName || oldName === newName) return;

    // Update results
    setResults(prevResults => {
        if (!prevResults) return null;
        const newDizionario = prevResults.dizionario.map(group => 
            group.tema === oldName ? { ...group, tema: newName } : group
        );
        return { dizionario: newDizionario };
    });

    // Update study deck
    setStudyDeck(prevDeck => 
        prevDeck.map(item => 
            item.tema === oldName ? { ...item, tema: newName } : item
        )
    );

    // Update open themes set
    setOpenThemes(prevOpen => {
        if (prevOpen.has(oldName)) {
            const newOpen = new Set(prevOpen);
            newOpen.delete(oldName);
            newOpen.add(newName);
            return newOpen;
        }
        return prevOpen;
    });

    setToast({ message: `Tema "${oldName}" rinominato in "${newName}".`, type: 'success' });
}, []);

const handleCulturalDeepDiveRequest = useCallback((collocation: Collocation) => {
    setModalData(collocation);
    setActiveModal('cultural_context');
}, []);

const handleVoicePracticeRequest = useCallback((item: Collocation | string, context?: string | null) => {
    const collocation: Collocation = typeof item === 'string'
      ? { voce: item, spiegazione: `Una conversazione su "${item}"`, frase_originale: '', parole_correlate: [] }
      : item;
      
    setModalData({ 
        collocation,
        context: context,
        cefrLevel: cefrLevel,
        register: analysisRegister 
    });
    setActiveModal('voice_practice');
}, [cefrLevel, analysisRegister]);

const handleAskTutor = useCallback(async (question: string) => {
    const userTurn: ConversationTurn = { id: crypto.randomUUID(), speaker: 'user', text: question };
    
    setAiTutorSuggestions([]);

    const loadingTurn: ConversationTurn = { id: 'loading', speaker: 'system', text: 'Il tutor sta pensando...' };
    const currentHistory = [...aiTutorHistory, userTurn];
    setAiTutorHistory([...currentHistory, loadingTurn]);
    setIsTutorLoading(true);

    try {
      const response: AITutorResponse = await getTutorResponse(aiTutorHistory, question, tutorCefrLevel, tutorRegister);
      const modelTurn: ConversationTurn = {
        id: crypto.randomUUID(),
        speaker: 'model',
        text: response.response,
        format: 'markdown',
        chunks: response.chunks,
        followUps: response.suggestions.map(q => ({
          id: crypto.randomUUID(),
          question: q,
          answer: null,
          chunks: [],
          isLoading: false,
          error: null,
        })),
      };
      setAiTutorHistory(prev => [...prev.filter(t => t.id !== 'loading'), modelTurn]);
      setAiTutorSuggestions([]); // Suggestions are now in the turn
    } catch (err: any) {
      const errorTurn: ConversationTurn = { id: crypto.randomUUID(), speaker: 'system', text: `Errore: ${err.message}` };
      setAiTutorHistory(prev => [...prev.filter(t => t.id !== 'loading'), errorTurn]);
      setAiTutorSuggestions([
          "Spiega la differenza tra 'sapere' e 'conoscere'",
          "Crea una frase con 'nonostante'",
          "Correggi questa frase: 'Lui ha andato al mercato.'"
      ]);
      setToast({ message: err.message, type: 'error' });
    } finally {
      setIsTutorLoading(false);
    }
}, [aiTutorHistory, tutorCefrLevel, tutorRegister]);

const handleNewTutorConversation = useCallback(() => {
    setAiTutorHistory([]);
}, []);

const handleAskTutorFollowUp = useCallback(async (turnId: string, followUpId: string) => {
    const parentTurn = aiTutorHistory.find(t => t.id === turnId);
    const followUp = parentTurn?.followUps?.find(f => f.id === followUpId);

    if (!parentTurn || !followUp || followUp.isLoading || followUp.answer) return;

    // Set loading state
    setAiTutorHistory(prev => prev.map(turn => {
        if (turn.id === turnId) {
            return {
                ...turn,
                followUps: (turn.followUps || []).map(fu => 
                    fu.id === followUpId 
                    ? { ...fu, isLoading: true, error: null } 
                    : fu
                )
            };
        }
        return turn;
    }));

    try {
        const result = await answerTutorFollowUp(parentTurn.text, followUp.question);
        
        // Update with result
        setAiTutorHistory(prev => prev.map(turn => {
            if (turn.id === turnId) {
                return {
                    ...turn,
                    followUps: (turn.followUps || []).map(fu => 
                        fu.id === followUpId 
                        ? { ...fu, answer: result.answer, chunks: result.chunks, isLoading: false } 
                        : fu
                    )
                };
            }
            return turn;
        }));
    } catch (err: any) {
        // Update with error
        setAiTutorHistory(prev => prev.map(turn => {
            if (turn.id === turnId) {
                return {
                    ...turn,
                    followUps: (turn.followUps || []).map(fu => 
                        fu.id === followUpId 
                        ? { ...fu, error: err.message, isLoading: false } 
                        : fu
                    )
                };
            }
            return turn;
        }));
        setToast({ message: err.message, type: 'error' });
    }
}, [aiTutorHistory]);

const handleOpenAddCardModal = useCallback((topic: string) => {
    setModalData({ topic });
    setActiveModal('add_card');
}, []);

useEffect(() => {
    if (activeTab !== 'tutor') {
      setProactiveTopic(null);
    }
}, [activeTab]);


  const AnalysisTypeButton = ({ type, label, icon: Icon }: { type: AnalysisType, label: string, icon: React.FC<any> }) => (
    <button
        onClick={() => setAnalysisType(type)}
        className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-200 dark:focus:ring-offset-gray-800 ${
            analysisType === type
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-md'
                : 'bg-transparent text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50'
        }`}
    >
        <Icon className="w-5 h-5" />
        <span>{label}</span>
    </button>
  );
  
  const practicalTools = [
    { label: 'Migliora Frase', subtitle: 'Riscrivi per naturalezza', icon: SparklesIcon, action: () => handleOpenSentenceImprover(), color: 'from-purple-500 to-violet-500' },
    { label: 'Genera Dialogo', subtitle: 'Crea scenari d\'uso', icon: UsersIcon, action: handleOpenDialogueGenerator, color: 'from-sky-500 to-indigo-500' },
    { label: 'Crea Storia', subtitle: 'Contestualizza con un racconto', icon: BookTextIcon, action: handleOpenStoryCreator, color: 'from-emerald-500 to-green-500' },
    { label: 'Quiz Veloce', subtitle: 'Testa la tua conoscenza', icon: EditIcon, action: handleOpenQuickQuiz, color: 'from-amber-500 to-red-500' }
  ];

  let modalTitle = 'Opzioni di Analisi';
  let modalConfirmText = 'Analizza Ora';
  if (optionsModalTrigger === 'example') {
    modalTitle = 'Opzioni di Generazione';
    modalConfirmText = 'Genera Esempio';
  } else if (optionsModalTrigger === 'web_search') {
    modalTitle = 'Opzioni di Ricerca';
    modalConfirmText = 'Continua';
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-colors duration-300">
      
      {toast && <div className="fixed top-5 right-5 z-[100]"><Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /></div>}

      <div className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${isScrolled ? 'bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-md' : ''} ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className={`max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-300 ${sidebarState.isOpen ? 'lg:pr-[34rem]' : ''}`}>
            <header className={`flex justify-between items-center border-b border-gray-200/80 dark:border-gray-700/60 transition-all duration-300 ${isScrolled ? 'py-2' : 'py-4'}`}>
                <div className="flex items-center gap-4">
                    <SparklesIcon className="w-8 h-8"/>
                    <h1 className={`font-bold hidden sm:block bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-400 dark:to-purple-400 transition-all duration-300 ${isScrolled ? 'text-lg' : 'text-xl'}`}>Estrattore di Collocazioni</h1>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                    <button onClick={() => setActiveModal('guide')} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors"><HelpCircleIcon className="w-6 h-6"/></button>
                    <button onClick={handleToggleTheme} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors">
                        {theme === 'light' ? <MoonIcon className="w-6 h-6"/> : <SunIcon className="w-6 h-6"/>}
                    </button>
                </div>
            </header>
            <nav className={`flex items-center gap-2 transition-all duration-300 ${isScrolled ? 'py-2' : 'py-3'}`}>
                {[
                    { path: '/', label: 'Estrattore', icon: SearchIcon },
                    { path: '/tutor', label: 'Tutor IA', icon: BrainIcon },
                    { path: '/deck', label: 'Deck di Studio', icon: DeckIcon },
                    { path: '/plan', label: 'Piano di Studio', icon: CalendarIcon }
                ].map(({ path, label, icon: Icon }) => (
                     <NavLink key={path} to={path} className={({ isActive }) => `relative px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-colors duration-200 ${isActive ? 'bg-indigo-600 text-white shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/60'}`}>
                        <Icon className="w-5 h-5" />
                        <span>{label}</span>
                        {(path === '/deck' || path === '/plan') && reviewCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full ring-2 ring-gray-50 dark:ring-gray-900">
                                {reviewCount > 9 ? '9+' : reviewCount}
                            </span>
                        )}
                     </NavLink>
                ))}
            </nav>
        </div>
      </div>
      
      <main className={`transition-all duration-300 ease-in-out ${sidebarState.isOpen ? 'lg:pr-[34rem]' : ''} ${isScrolled ? 'pt-28' : 'pt-36'}`}>
        <div className={`${activeTab === 'tutor' ? 'max-w-none' : 'max-w-screen-2xl'} mx-auto px-4 sm:px-6 lg:px-8 pb-12 transition-all duration-300`}>
            <div ref={mainContentRef} className="transition-opacity duration-300">
                <Routes>
                    <Route path="/" element={
                        <div className="space-y-8">
                             <div className="glass-panel p-4 sm:p-6 rounded-2xl shadow-lg">
                                <h2 className="text-3xl font-bold mb-4">Laboratorio Linguistico</h2>
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row items-center gap-2 sm:justify-end">
                                            <button onClick={handleOpenWebSearch} className="w-full sm:w-auto px-4 py-2 text-sm font-semibold bg-indigo-100/70 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200/70 dark:hover:bg-indigo-500/20 rounded-lg flex items-center justify-center gap-2 transition-colors"><GlobeIcon className="w-4 h-4"/> Cerca Web</button>
                                            <button onClick={handleUseExample} disabled={isGeneratingExample} className="w-full sm:w-auto px-4 py-2 text-sm font-semibold bg-gray-200/80 dark:bg-gray-700/70 hover:bg-gray-300/80 dark:hover:bg-gray-600/70 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait">
                                                {isGeneratingExample ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <QuoteIcon className="w-4 h-4"/>}
                                                {isGeneratingExample ? 'Genero...' : 'Esempio'}
                                            </button>
                                            <button onClick={handleClearText} className="w-full sm:w-auto px-4 py-2 text-sm font-semibold bg-gray-200/80 dark:bg-gray-700/70 hover:bg-gray-300/80 dark:hover:bg-gray-600/70 rounded-lg flex items-center justify-center gap-2"><XIcon className="w-4 h-4"/> Pulisci</button>
                                    </div>
                                    <textarea
                                        value={text}
                                        onChange={(e) => setText(e.target.value)}
                                        placeholder="Incolla qui il tuo testo in italiano..."
                                        className="w-full h-48 p-4 bg-white/60 dark:bg-gray-900/40 border border-gray-300/80 dark:border-gray-700/60 rounded-lg shadow-inner focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-y"
                                    ></textarea>
                                    <div>
                                        <p className="block text-sm font-medium mb-2">Scegli il tipo di analisi</p>
                                        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-gray-200/70 dark:bg-gray-800/60 p-1">
                                            <AnalysisTypeButton type="collocation" label="Collocazioni" icon={CollocationIcon} />
                                            <AnalysisTypeButton type="grammar" label="Grammatica" icon={GrammarIcon} />
                                            <AnalysisTypeButton type="dictionary" label="Dizionario ITA-ARA" icon={DictionaryIcon} />
                                            <AnalysisTypeButton type="translation_ita_ara" label="Traduci ITA➔ARA" icon={TranslateIcon} />
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                         <button
                                            onClick={handleAnalyzeClick}
                                            disabled={isLoading || !text.trim()}
                                            className="px-8 py-3 text-base font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/30"
                                        >
                                            {isLoading ? "Analizzando..." : "Analizza"}
                                            {!isLoading && <SparklesIcon className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                             </div>

                            <div className="glass-panel p-4 sm:p-6 rounded-2xl shadow-lg animate-fade-in-up">
                                <div className="flex items-center gap-3 mb-4">
                                    <WandIcon className="w-7 h-7 text-violet-500 dark:text-violet-400"/>
                                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Strumenti Pratici</h3>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 mb-6">
                                    Usa gli strumenti basati sull'IA per affinare le tue competenze linguistiche.
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {practicalTools.map(({ label, subtitle, icon: Icon, action, color }) => (
                                        <button
                                            key={label}
                                            onClick={action}
                                            className={`p-5 text-left text-white bg-gradient-to-br ${color} rounded-xl flex flex-col justify-between h-40 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 active:scale-95`}
                                        >
                                            <Icon className="w-8 h-8 opacity-80" />
                                            <div>
                                                <span className="text-base font-semibold">{label}</span>
                                                <span className="block text-xs opacity-80 mt-1 font-normal">{subtitle}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                             {error && <div className="p-4 bg-red-100/80 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-l-4 border-red-500 rounded-r-md flex items-center gap-3"><InfoIcon className="w-6 h-6 flex-shrink-0" /><span>{error}</span></div>}

                            <div ref={resultsRef} className="space-y-8">
                                {isLoading && <div className="p-10"><LoadingSpinner message="L'IA sta lavorando per te..." /></div>}
                                
                                {grammarAnalysis && <MarkdownDisplay content={grammarAnalysis} title="Analisi Grammaticale" />}
                                {arabicTranslation && <ArabicTranslationDisplay translation={arabicTranslation} originalText={text} />}

                                {results && results.dizionario.length > 0 && (
                                    <div>
                                        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                                            <h2 className="text-3xl font-bold">Risultati dell'Analisi</h2>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'bg-gray-200/70 dark:bg-gray-700/60 hover:bg-gray-300/70 dark:hover:bg-gray-600/60 text-gray-600 dark:text-gray-300'}`}><ListIcon className="w-5 h-5"/></button>
                                                <button onClick={() => setViewMode('map')} className={`p-2 rounded-lg ${viewMode === 'map' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'bg-gray-200/70 dark:bg-gray-700/60 hover:bg-gray-300/70 dark:hover:bg-gray-600/60 text-gray-600 dark:text-gray-300'}`}><MapIcon className="w-5 h-5"/></button>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <SearchIcon className="absolute top-3.5 left-4 w-5 h-5 text-gray-400" />
                                            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cerca tra i risultati..." className="w-full p-3 pl-11 mb-6 bg-white/60 dark:bg-gray-900/40 border border-gray-300/80 dark:border-gray-700/60 rounded-lg shadow-inner focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"/>
                                        </div>
                                        {viewMode === 'list' ? (
                                            <ResultsDisplay 
                                                results={filteredResults as ThemeGroup[]}
                                                onDeepDive={handleDeepDiveRequest}
                                                onSave={handleSaveCollocation}
                                                savedCollocationsSet={savedCollocationsSet}
                                                themeExplanations={themeExplanations}
                                                openThemes={openThemes}
                                                onToggleTheme={(theme) => setOpenThemes(prev => { const next = new Set(prev); next.has(theme) ? next.delete(theme) : next.add(theme); return next; })}
                                                onExplainTheme={handleExplainThemeCallback}
                                                onToggleInlineDeepDive={handleToggleInlineDeepDiveCallback}
                                                inlineDeepDives={inlineDeepDives}
                                                cefrLevel={cefrLevel}
                                                register={analysisRegister}
                                                onCulturalDeepDive={handleCulturalDeepDiveRequest}
                                            />
                                        ) : (
                                            <ConceptMap results={filteredResults as ThemeGroup[]} onThemeDeepDive={handleDeepDiveRequest} onCollocationDeepDive={(voce) => handleDeepDiveRequest(results!.dizionario.flatMap(g => g.collocazioni).find(c => c.voce === voce)!)} onQuiz={handleQuizRequest} onRolePlay={handleRolePlayRequest} onRenameTheme={handleRenameTheme} />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    } />
                    <Route path="/tutor" element={
                        <AITutorPage
                            history={aiTutorHistory}
                            onAsk={handleAskTutor}
                            onAskFollowUp={handleAskTutorFollowUp}
                            isLoading={isTutorLoading}
                            cefrLevel={tutorCefrLevel}
                            setCefrLevel={setTutorCefrLevel}
                            register={tutorRegister}
                            setRegister={setTutorRegister}
                            suggestions={aiTutorSuggestions}
                            proactiveTopic={proactiveTopic}
                            onNewConversation={handleNewTutorConversation}
                            isScrolled={isScrolled}
                        />
                    } />
                    <Route path="/deck" element={
                        <PracticeHub deck={studyDeck} onUpdateDeck={handleUpdateDeck} searchQuery={searchQuery} onSessionComplete={handleSessionComplete} onOpenSentenceImprover={handleOpenSentenceImprover} onDeepDive={handleDeepDiveRequest} cefrLevel={cefrLevel} register={analysisRegister} onRenameTheme={handleRenameTheme} onVoicePractice={handleVoicePracticeRequest} />
                    } />
                    <Route path="/plan" element={
                        <StudyPlan deck={studyDeck} onUpdateDeck={handleUpdateDeck} onSessionComplete={handleSessionComplete} studyHistory={studyHistory} cefrLevel={cefrLevel} register={analysisRegister} onDeepDive={handleDeepDiveRequest} onOpenAddCardModal={handleOpenAddCardModal} />
                    } />
                </Routes>
            </div>
        </div>
      </main>
      
      {selectionPopover.visible && (
        <SelectionPopover
            top={selectionPopover.top}
            left={selectionPopover.left}
            onExplain={() => handleExplainSelection('explanation')}
            onGrammar={() => handleExplainSelection('grammar')}
            onDictionary={handleDictionarySelection}
            onAddToDeck={handleAddToDeckSelection}
        />
      )}

      <Sidebar
        ref={sidebarRef}
        state={sidebarState}
        onClose={handleCloseSidebar}
        onTermDeepDive={handleDeepDiveRequest}
        onAskQuestion={handleAskSidebarQuestion}
        onConversationalPractice={handleVoicePracticeRequest}
        cefrLevel={cefrLevel}
        register={analysisRegister}
      />
      
      {activeModal === 'explanation' && modalData?.item && (
        <ExplanationModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            item={modalData.item}
            type={modalData.type}
            cefrLevel={modalData.cefrLevel}
            register={modalData.register}
        />
      )}
      {activeModal === 'dictionary' && modalData?.item && (
        <DictionaryModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            item={modalData.item}
            cefrLevel={modalData.cefrLevel}
            register={modalData.register}
            onSave={(entry) => handleSaveCollocation({ 
                voce: entry.termine_italiano, 
                spiegazione: entry.definizione_italiano, 
                frase_originale: entry.esempio_italiano,
                traduzione_arabo: entry.traduzione_arabo,
                definizione_arabo: entry.definizione_arabo,
                esempio_arabo: entry.esempio_arabo,
                pronuncia_arabo: entry.pronuncia_arabo,
                contesto_culturale: entry.contesto_culturale,
            }, 'Dizionario')}
            savedCollocationsSet={savedCollocationsSet}
        />
      )}
      {activeModal === 'add_card' && (
          <AddCardModal
              isOpen={true}
              onClose={() => setActiveModal(null)}
              topic={modalData.topic}
              onSave={handleSaveFromModal}
              cefrLevel={cefrLevel}
              register={analysisRegister}
          />
      )}
      {isAnalysisOptionsModalOpen && (
        <AnalysisOptionsModal
            isOpen={isAnalysisOptionsModalOpen}
            onClose={() => { setIsAnalysisOptionsModalOpen(false); setOptionsModalTrigger(null); }}
            onConfirm={handleConfirmAnalysis}
            initialCefrLevel={cefrLevel}
            initialRegister={analysisRegister}
            title={modalTitle}
            confirmText={modalConfirmText}
        />
      )}
      {activeModal === 'theme_deep_dive_options' && modalData?.theme && (
        <AnalysisOptionsModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            onConfirm={handleConfirmThemeDeepDive}
            initialCefrLevel={cefrLevel}
            initialRegister={analysisRegister}
            title={`Opzioni per "${modalData.theme}"`}
            confirmText="Genera Approfondimento"
        />
      )}
      {activeModal === 'collocation_deep_dive_options' && modalData?.collocation && (
        <AnalysisOptionsModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            onConfirm={handleConfirmCollocationDeepDive}
            initialCefrLevel={cefrLevel}
            initialRegister={analysisRegister}
            title={`Opzioni per "${typeof modalData.collocation === 'string' ? modalData.collocation : modalData.collocation.voce}"`}
            confirmText="Genera Approfondimento"
        />
      )}
      {activeModal === 'practice_options' && (
        <AnalysisOptionsModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            onConfirm={handleConfirmPractice}
            initialCefrLevel={cefrLevel}
            initialRegister={analysisRegister}
            title="Opzioni Pratica Conversazione"
            confirmText="Avvia"
        />
      )}
      {activeModal === 'voice_practice' && modalData?.collocation && (
        <VoicePracticeModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            collocation={modalData.collocation}
            cefrLevel={modalData.cefrLevel}
            register={modalData.register}
            context={modalData.context}
        />
      )}
      {activeModal === 'cultural_context' && modalData && (
        <CulturalContextModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            expression={modalData.voce}
        />
      )}
      {activeModal === 'quiz_request' && <QuizModal isOpen={true} onClose={() => setActiveModal(null)} collocation={modalData} initialCefrLevel={cefrLevel} initialRegister={analysisRegister} />}
      {activeModal === 'guide' && <GuideModal isOpen={true} onClose={() => setActiveModal(null)} />}
      {activeModal === 'roleplay_request' && <RolePlayModal isOpen={true} onClose={() => setActiveModal(null)} collocation={modalData} initialCefrLevel={cefrLevel} initialRegister={analysisRegister} />}
      {activeModal === 'story_creator' && <StoryModal isOpen={true} onClose={() => setActiveModal(null)} collocation={modalData} initialCefrLevel={cefrLevel} initialRegister={analysisRegister} />}
      {activeModal === 'sentence_improver' && <SentenceImproverModal isOpen={true} onClose={() => setActiveModal(null)} initialTargetCollocation={modalData?.initialTargetCollocation} cefrLevel={cefrLevel} />}
      {isWebSearchModalOpen && <WebSearchModal isOpen={isWebSearchModalOpen} onClose={() => setIsWebSearchModalOpen(false)} onTextGenerated={handleTextFromWeb} cefrLevel={cefrLevel} register={analysisRegister}/>}
    </div>
  );
};

export default App;
