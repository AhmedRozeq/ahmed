import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ConversationTurn, SavedCollocation, FollowUpQuestion, CreativeSuggestion, ImprovedTextResult } from '../types';
import BrainIcon from './icons/BrainIcon';
import SendHorizonalIcon from './icons/SendHorizonalIcon';
import MarkdownDisplay from './MarkdownDisplay';
import ClipboardIcon from './icons/ClipboardIcon';
import CheckIcon from './icons/CheckIcon';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { encode, decode, decodeAudioData } from '../utils/audio';
import { analyzeUserTextForTutor, getCollaborativeFeedback, analyzeConversationPerformance, improveText } from '../services/geminiService';
import MicrophoneIcon from './icons/MicrophoneIcon';
import StopCircleIcon from './icons/StopCircleIcon';
import InfoIcon from './icons/InfoIcon';
import ChatIcon from './icons/ChatIcon';
import VolumeUpIcon from './icons/VolumeUpIcon';
import Edit3Icon from './icons/Edit3Icon';
import LoadingSpinner from './LoadingSpinner';
import SparklesIcon from './icons/SparklesIcon';
import LightbulbIcon from './icons/LightbulbIcon';
import XIcon from './icons/XIcon';
import GlobeIcon from './icons/GlobeIcon';
import SlashCommandMenu, { Command } from './SlashCommandMenu';
import QuoteIcon from './icons/QuoteIcon';
import ShuffleIcon from './icons/ShuffleIcon';
import TranslateIcon from './icons/TranslateIcon';
import CollocationIcon from './icons/CollocationIcon';
import GrammarIcon from './icons/GrammarIcon';
import BookTextIcon from './icons/BookTextIcon';
import PlusIcon from './icons/PlusIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import ClipboardListIcon from './icons/ClipboardListIcon';
import ExplanationModal from './ExplanationModal';
import ImprovedTextDisplay from './ImprovedTextDisplay';


interface AITutorPageProps {
  history: ConversationTurn[];
  onAsk: (question: string) => void;
  onAskFollowUp: (turnId: string, followUpId: string) => void;
  isLoading: boolean;
  cefrLevel: string;
  setCefrLevel: (level: string) => void;
  register: string;
  setRegister: (register: string) => void;
  suggestions: string[];
  proactiveTopic: SavedCollocation | null;
  onNewConversation: () => void;
  isScrolled: boolean;
}

type AITutorMode = 'text' | 'voice' | 'writing';
type VoiceStatus = 'IDLE' | 'CONNECTING' | 'LISTENING' | 'SPEAKING' | 'ERROR';
type VoiceStage = 'IDLE' | 'ACTIVE' | 'SUMMARY';

const AITutorPage: React.FC<AITutorPageProps> = ({ history, onAsk, onAskFollowUp, isLoading, cefrLevel, setCefrLevel, register, setRegister, suggestions, proactiveTopic, onNewConversation, isScrolled }) => {
  const [question, setQuestion] = useState('');
  const [copiedTurnId, setCopiedTurnId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [mode, setMode] = useState<AITutorMode>('text');
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('IDLE');
  const [voiceStage, setVoiceStage] = useState<VoiceStage>('IDLE');
  const [liveTranscript, setLiveTranscript] = useState<ConversationTurn[]>([]);
  const [inProgressTranscript, setInProgressTranscript] = useState<{ user?: string, model?: string }>({});
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [performanceAnalysis, setPerformanceAnalysis] = useState<{ isLoading: boolean; content: string | null; error: string | null; }>({ isLoading: false, content: null, error: null });

  
  const [writingText, setWritingText] = useState('Scrivi qui il tuo testo e chiedi all\'IA di collaborare per migliorarlo. Prova a scrivere una breve email o la descrizione di una foto.');
  const [isProactiveBannerVisible, setIsProactiveBannerVisible] = useState(true);

  // Unified Writing State
  const [creativeSuggestions, setCreativeSuggestions] = useState<CreativeSuggestion[]>([]);
  const [isCreativeLoading, setIsCreativeLoading] = useState(false);
  const [creativeError, setCreativeError] = useState<string | null>(null);
  
  const [activeModal, setActiveModal] = useState<'full_analysis' | 'auto_improve' | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string|null>(null);
  const [modalContent, setModalContent] = useState<string | ImprovedTextResult | null>(null);


  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const liveTranscriptEndRef = useRef<HTMLDivElement>(null);

  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');
  const voiceStatusRef = useRef(voiceStatus);
  useEffect(() => {
    voiceStatusRef.current = voiceStatus;
  }, [voiceStatus]);

  const [commandMenu, setCommandMenu] = useState({ isOpen: false, filter: '', selectedIndex: 0 });

  const commands = useMemo((): Command[] => [
    { name: 'correggi', description: 'Correggi e analizza un testo', icon: Edit3Icon, action: () => setMode('writing') },
    { name: 'spiega', description: 'Spiega una parola o un concetto', icon: LightbulbIcon, prefix: 'Spiega in dettaglio: ' },
    { name: 'collocazione', description: 'Trova collocazioni per una parola', icon: CollocationIcon, prefix: 'Quali sono le collocazioni più comuni per: ' },
    { name: 'esempio', description: 'Crea una frase di esempio', icon: QuoteIcon, prefix: 'Crea una frase di esempio con: ' },
    { name: 'sinonimi', description: 'Trova sinonimi per una parola', icon: ShuffleIcon, prefix: 'Quali sono dei sinonimi per: ' },
    { name: 'grammatica', description: 'Analizza la grammatica di una frase', icon: GrammarIcon, prefix: 'Analizza la grammatica di questa frase: ' },
    { name: 'storia', description: 'Crea una breve storia', icon: BookTextIcon, prefix: 'Crea una breve storia che includa: ' },
    { name: 'contesto', description: 'Spiega il contesto culturale', icon: GlobeIcon, prefix: 'Spiega il contesto culturale di: ' },
    { name: 'traduci', description: 'Traduci in arabo', icon: TranslateIcon, prefix: 'Traduci in arabo: ' },
  ], [setMode]);

  const filteredCommands = useMemo(() => {
    if (!commandMenu.filter) return commands;
    return commands.filter(cmd => cmd.name.startsWith(commandMenu.filter));
  }, [commands, commandMenu.filter]);


  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  useEffect(() => {
    liveTranscriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveTranscript, inProgressTranscript]);
  
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        const scrollHeight = textareaRef.current.scrollHeight;
        textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [question]);

  useEffect(() => {
    if (proactiveTopic) {
        setIsProactiveBannerVisible(true);
    }
  }, [proactiveTopic]);

  const endSession = useCallback(() => {
    sessionPromiseRef.current?.then(session => session.close()).catch(console.error);
    sessionPromiseRef.current = null;
    
    scriptProcessorRef.current?.disconnect();
    mediaStreamSourceRef.current?.disconnect();
    scriptProcessorRef.current = null;
    mediaStreamSourceRef.current = null;
    
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;

    if (inputAudioContextRef.current?.state !== 'closed') inputAudioContextRef.current?.close().catch(console.error);
    if (outputAudioContextRef.current?.state !== 'closed') outputAudioContextRef.current?.close().catch(console.error);
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    
    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    setVoiceStatus('IDLE');
  }, []);

  useEffect(() => {
    if (mode !== 'voice') {
      endSession();
    }
    // Cleanup on component unmount
    return () => endSession();
  }, [mode, endSession]);


  const startSession = useCallback(async () => {
    if (voiceStatusRef.current !== 'IDLE' && voiceStatusRef.current !== 'ERROR') return;

    setVoiceStatus('CONNECTING');
    setVoiceError(null);
    setLiveTranscript([{
        id: 'system-start',
        speaker: 'system',
        text: `Avvio della sessione di conversazione...`
    }]);
    setVoiceStage('ACTIVE');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const systemInstruction = `Sei un amichevole e paziente tutor di lingua italiana. Il tuo compito è avere una conversazione naturale con l'utente. Parla chiaramente e a un ritmo moderato. Adatta il tuo linguaggio al livello QCER ${cefrLevel} e al registro ${register}. Se l'utente commette un errore, non correggerlo direttamente, ma riformula la sua frase correttamente nella tua risposta successiva per fornire un esempio. Inizia la conversazione salutando l'utente e chiedendogli come sta o di cosa vorrebbe parlare.`;

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setVoiceStatus('LISTENING');
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            mediaStreamSourceRef.current = source;
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;
            
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              }).catch(console.error);
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              currentOutputTranscriptionRef.current += text;
              setInProgressTranscript(prev => ({ ...prev, model: currentOutputTranscriptionRef.current }));
            } else if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              currentInputTranscriptionRef.current += text;
              setInProgressTranscript(prev => ({ ...prev, user: currentInputTranscriptionRef.current }));
            }
            if (message.serverContent?.turnComplete) {
                const fullInput = currentInputTranscriptionRef.current.trim();
                const fullOutput = currentOutputTranscriptionRef.current.trim();
                currentInputTranscriptionRef.current = '';
                currentOutputTranscriptionRef.current = '';

                setLiveTranscript(prev => {
                    const newTurns: ConversationTurn[] = [];
                    if (fullInput) newTurns.push({ id: crypto.randomUUID(), speaker: 'user', text: fullInput });
                    if (fullOutput) newTurns.push({ id: crypto.randomUUID(), speaker: 'model', text: fullOutput, format: 'markdown' });
                    return [...prev, ...newTurns];
                });
                setInProgressTranscript({});
            }

            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              setVoiceStatus('SPEAKING');
              const outputAudioContext = outputAudioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
              const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContext, 24000, 1);
              const source = outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContext.destination);
              source.addEventListener('ended', () => {
                audioSourcesRef.current.delete(source);
                if (audioSourcesRef.current.size === 0 && voiceStatusRef.current !== 'ERROR' && voiceStatusRef.current !== 'IDLE') {
                  setVoiceStatus('LISTENING');
                }
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              audioSourcesRef.current.add(source);
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            setVoiceError(`Si è verificato un errore: ${e.message}`);
            setVoiceStatus('ERROR');
          },
          onclose: (e: CloseEvent) => {
            if (voiceStatusRef.current !== 'ERROR') {
              setVoiceStatus('IDLE');
            }
          },
        },
        config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            systemInstruction,
        },
      });
    } catch (err) {
      console.error('Failed to get user media or start session', err);
      setVoiceError('Impossibile accedere al microfono. Assicurati di aver dato i permessi necessari.');
      setVoiceStatus('ERROR');
    }
  }, [cefrLevel, register]);
  
  const handleAnalyzePerformance = useCallback(async () => {
    setPerformanceAnalysis({ isLoading: true, content: null, error: null });
    const userTurns = liveTranscript.filter(turn => turn.speaker === 'user').map(turn => turn.text).join('\n- ');
    const systemInstruction = `Sei un amichevole e paziente tutor di lingua italiana... (Contesto della conversazione).`; // Use the full instruction here

    if (!userTurns) {
        setPerformanceAnalysis({ isLoading: false, content: null, error: "Non hai detto nulla durante la sessione, quindi non c'è nulla da analizzare." });
        return;
    }

    try {
        const result = await analyzeConversationPerformance(`- ${userTurns}`, systemInstruction, cefrLevel, register);
        setPerformanceAnalysis({ isLoading: false, content: result, error: null });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Impossibile generare l'analisi.";
        setPerformanceAnalysis({ isLoading: false, content: null, error: message });
    }
  }, [liveTranscript, cefrLevel, register]);

  const endSessionAndSummarize = useCallback(() => {
    endSession();
    
    setVoiceStage('SUMMARY');

    // Add any remaining in-progress transcripts
    const finalTranscript = [...liveTranscript];
    if (currentInputTranscriptionRef.current.trim()) {
        finalTranscript.push({ id: 'final_user', speaker: 'user', text: currentInputTranscriptionRef.current.trim() });
    }
    if (currentOutputTranscriptionRef.current.trim()) {
        finalTranscript.push({ id: 'final_model', speaker: 'model', text: currentOutputTranscriptionRef.current.trim() });
    }
    setLiveTranscript(finalTranscript);

    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';
    setInProgressTranscript({});
  }, [endSession, liveTranscript]);

  const handleStartNewVoiceSession = () => {
    setLiveTranscript([]);
    setPerformanceAnalysis({ isLoading: false, content: null, error: null });
    setVoiceStage('IDLE');
  };

  const handleSubmit = (e: React.FormEvent, customQuestion?: string) => {
    e.preventDefault();
    const query = customQuestion || question.trim();
    if (query && !isLoading) {
      onAsk(query);
      setQuestion('');
    }
  };

  const handleCopy = (text: string, turnId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedTurnId(turnId);
      setTimeout(() => setCopiedTurnId(null), 2000);
    });
  };
  
  // --- Unified Writing Mode handlers ---
  const handleGetCreativeFeedback = async () => {
    if (!writingText.trim()) return;
    setIsCreativeLoading(true);
    setCreativeError(null);
    setCreativeSuggestions([]);
    try {
        const result = await getCollaborativeFeedback(writingText, { cefrLevel, register });
        setCreativeSuggestions(result.suggestions.map(s => ({...s, id: crypto.randomUUID()})));
    } catch (err) {
        const message = err instanceof Error ? err.message : "Impossibile analizzare il testo.";
        setCreativeError(message);
    } finally {
        setIsCreativeLoading(false);
    }
  };

  const handleGetFullAnalysis = async () => {
    if (!writingText.trim()) return;
    setModalLoading(true);
    setModalError(null);
    setModalContent(null);
    setActiveModal('full_analysis');
    try {
        const result = await analyzeUserTextForTutor(writingText, cefrLevel);
        setModalContent(result);
    } catch(err) {
        setModalError(err instanceof Error ? err.message : "Impossibile analizzare il testo.");
    } finally {
        setModalLoading(false);
    }
  };
  
  const handleAutoImprove = async () => {
    if (!writingText.trim()) return;
    setModalLoading(true);
    setModalError(null);
    setModalContent(null);
    setActiveModal('auto_improve');
    try {
        const result = await improveText(writingText, { cefrLevel, register });
        setModalContent(result);
    } catch(err) {
        setModalError(err instanceof Error ? err.message : "Impossibile migliorare il testo.");
    } finally {
        setModalLoading(false);
    }
  };
  
  const applySuggestion = (suggestion: CreativeSuggestion) => {
    setWritingText(prev => prev.replace(suggestion.original_snippet, suggestion.suggested_change));
    setCreativeSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  };
  
  const dismissSuggestion = (suggestionId: string) => {
    setCreativeSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };
  // --- End of Unified Writing Mode handlers ---


  const { text: statusText, color: statusColor } = useMemo(() => {
    switch (voiceStatus) {
      case 'CONNECTING': return { text: 'Connessione...', color: 'bg-yellow-500' };
      case 'LISTENING': return { text: 'In ascolto...', color: 'bg-green-500' };
      case 'SPEAKING': return { text: 'Parlando...', color: 'bg-sky-500' };
      case 'ERROR': return { text: 'Errore', color: 'bg-red-500' };
      default: return { text: 'Inattivo', color: 'bg-gray-500' };
    }
  }, [voiceStatus]);

  const handleQuestionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setQuestion(value);

    if (value.startsWith('/') && !value.includes(' ')) {
      setCommandMenu({ isOpen: true, filter: value.substring(1), selectedIndex: 0 });
    } else {
      setCommandMenu({ isOpen: false, filter: '', selectedIndex: 0 });
    }
  };

  const handleSelectCommand = (command: Command) => {
    if (command.action) {
      command.action();
    } else if (command.prefix) {
      setQuestion(command.prefix);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
    setCommandMenu({ isOpen: false, filter: '', selectedIndex: 0 });
    setQuestion(command.prefix || '');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (commandMenu.isOpen && filteredCommands.length > 0) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCommandMenu(prev => ({ ...prev, selectedIndex: (prev.selectedIndex - 1 + filteredCommands.length) % filteredCommands.length }));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCommandMenu(prev => ({ ...prev, selectedIndex: (prev.selectedIndex + 1) % filteredCommands.length }));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelectCommand(filteredCommands[commandMenu.selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setCommandMenu({ isOpen: false, filter: '', selectedIndex: 0 });
      }
    } else {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as any);
      }
    }
  };

  const getSuggestionIcon = (type: CreativeSuggestion['type']) => {
    switch (type) {
      case 'collocazione': return <CollocationIcon className="w-5 h-5 text-sky-500" />;
      case 'grammatica': return <GrammarIcon className="w-5 h-5 text-red-500" />;
      case 'stile': return <SparklesIcon className="w-5 h-5 text-amber-500" />;
      case 'chiarezza': return <LightbulbIcon className="w-5 h-5 text-emerald-500" />;
      default: return <InfoIcon className="w-5 h-5 text-gray-500" />;
    }
  };
  
  const headerHeight = isScrolled ? 112 : 144;
  const bottomPadding = 48;
  const totalVerticalOffset = headerHeight + bottomPadding;

  return (
    <div 
      className="flex flex-col glass-panel rounded-2xl shadow-lg animate-fade-in-up"
      style={{ height: `calc(100vh - ${totalVerticalOffset}px)` }}
    >
        <header className="flex-shrink-0 p-4 border-b border-gray-200/80 dark:border-gray-700/60 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
                <BrainIcon className="w-8 h-8 text-indigo-500" />
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Tutor IA</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Il tuo assistente linguistico personale.</p>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
                 <div className="flex items-center gap-1 bg-gray-200/70 dark:bg-gray-700/60 p-1 rounded-lg">
                    <button onClick={() => setMode('text')} className={`px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-2 transition-colors ${mode === 'text' ? 'bg-white dark:bg-gray-800/80 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-600/50'}`}><ChatIcon className="w-5 h-5"/>Testo</button>
                    <button onClick={() => setMode('voice')} className={`px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-2 transition-colors ${mode === 'voice' ? 'bg-white dark:bg-gray-800/80 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-600/50'}`}><VolumeUpIcon className="w-5 h-5"/>Voce</button>
                    <button onClick={() => setMode('writing')} className={`px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-2 transition-colors ${mode === 'writing' ? 'bg-white dark:bg-gray-800/80 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-600/50'}`}><Edit3Icon className="w-5 h-5"/>Assistente Scrittura</button>
                </div>
                <div className="flex flex-wrap justify-center sm:justify-end items-center gap-2">
                    <select value={cefrLevel} onChange={(e) => setCefrLevel(e.target.value)} className="p-2 border border-gray-300/80 dark:border-gray-600/80 rounded-lg bg-white/60 dark:bg-gray-900/40 text-sm focus:ring-2 focus:ring-indigo-500">
                        <option value="A1">Livello A1</option><option value="A2">Livello A2</option><option value="B1">Livello B1</option><option value="B2">Livello B2</option><option value="C1">Livello C1</option><option value="C2">Livello C2</option>
                    </select>
                    <select value={register} onChange={(e) => setRegister(e.target.value)} className="p-2 border border-gray-300/80 dark:border-gray-600/80 rounded-lg bg-white/60 dark:bg-gray-900/40 text-sm focus:ring-2 focus:ring-indigo-500">
                        <option value="Neutro">Registro Neutro</option>
                        <option value="Formale">Registro Formale</option>
                        <option value="Informale">Registro Informale</option>
                        <option value="Giornalistico">Registro Giornalistico</option>
                        <option value="Letterario">Registro Letterario</option>
                        <option value="Burocratico">Registro Burocratico</option>
                    </select>
                    <button
                        onClick={onNewConversation}
                        className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white/60 dark:bg-gray-700/50 rounded-lg border border-gray-300/80 dark:border-gray-600/80 hover:bg-gray-100/60 dark:hover:bg-gray-600/50 flex items-center gap-2 shadow-sm transition-all"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Nuova
                    </button>
                </div>
            </div>
        </header>

        {proactiveTopic && isProactiveBannerVisible && mode === 'text' && (
            <div className="flex-shrink-0 p-3 bg-sky-50 dark:bg-sky-900/40 border-b border-t border-gray-200/80 dark:border-gray-700/60 animate-fade-in flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <LightbulbIcon className="w-6 h-6 text-sky-500 flex-shrink-0" />
                    <p className="text-sm font-medium text-sky-800 dark:text-sky-200">
                        Sessione Proattiva: Ripassiamo insieme <strong className="font-semibold">"{proactiveTopic.voce}"</strong>!
                    </p>
                </div>
                <button onClick={() => setIsProactiveBannerVisible(false)} className="p-1 rounded-full text-sky-600 dark:text-sky-300 hover:bg-sky-200/50 dark:hover:bg-sky-800/50" aria-label="Chiudi banner">
                    <XIcon className="w-4 h-4" />
                </button>
            </div>
        )}

        {mode === 'text' ? (
            <>
                <div className="flex-grow p-4 overflow-y-auto space-y-6">
                  {history.map((turn) => {
                    const answeredFollowUps = turn.followUps?.filter(fu => fu.answer !== null || fu.error !== null) || [];
                    const suggestedFollowUps = turn.followUps?.filter(fu => fu.answer === null && fu.error === null) || [];

                    return (
                        <div key={turn.id} className={`flex items-start gap-3 group ${turn.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {turn.speaker === 'model' && (<div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0"><BrainIcon className="w-5 h-5"/></div>)}
                          <div className={`relative flex flex-col max-w-6xl leading-1.5 p-3.5 ${ turn.speaker === 'model' ? 'bg-white dark:bg-gray-700/50 rounded-e-xl rounded-es-xl shadow-sm text-left' : turn.speaker === 'user' ? 'bg-indigo-100 dark:bg-indigo-900/40 rounded-s-xl rounded-ee-xl' : 'bg-yellow-50 dark:bg-yellow-900/20 text-center w-full max-w-full rounded-lg' }`}>
                              {turn.speaker === 'model' && (<button onClick={() => handleCopy(turn.text, turn.id)} className="absolute top-2 right-2 p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-600/50 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none" aria-label="Copia testo">{copiedTurnId === turn.id ? <CheckIcon className="w-4 h-4 text-emerald-500" /> : <ClipboardIcon className="w-4 h-4" />}</button>)}
                              {turn.format === 'markdown' ? ( <div className="prose prose-sm dark:prose-invert max-w-none text-left w-full text-gray-800 dark:text-gray-200 pr-8"><MarkdownDisplay content={turn.text} title="" isEmbedded /></div>) 
                              : (<p className={`text-base font-normal whitespace-pre-wrap ${ turn.speaker !== 'system' ? 'pr-8': ''} ${ turn.speaker === 'system' ? 'text-yellow-800 dark:text-yellow-300 italic' : 'text-gray-800 dark:text-gray-200' }`}>{turn.text}</p>)}

                              {turn.speaker === 'model' && turn.chunks && turn.chunks.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-gray-200/60 dark:border-gray-700/60">
                                      <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5"><GlobeIcon className="w-4 h-4"/>Fonti Web</h5>
                                      <ul className="space-y-1">{turn.chunks.map((chunk, index) => (
                                          <li key={index} className="text-sm"><a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-sky-600 dark:text-sky-400 hover:underline truncate block">{chunk.web.title || chunk.web.uri}</a></li>
                                      ))}</ul>
                                  </div>
                              )}
                              
                              {turn.speaker === 'model' && turn.followUps && turn.followUps.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-200/60 dark:border-gray-700/60 space-y-4">
                                  {answeredFollowUps.map(fu => (
                                    <div key={fu.id} className="pl-4 border-l-2 border-indigo-200 dark:border-indigo-800 animate-fade-in">
                                      <p className="font-semibold text-sm text-gray-700 dark:text-gray-300">D: {fu.question}</p>
                                      <div className="mt-2">
                                        {fu.isLoading && <p className="text-sm text-gray-500 animate-pulse">L'IA sta pensando...</p>}
                                        {fu.error && <p className="text-sm text-red-500">{fu.error}</p>}
                                        {fu.answer && (
                                          <>
                                            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{fu.answer}</p>
                                            {fu.chunks && fu.chunks.length > 0 && (
                                              <div className="mt-2 pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
                                                <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5"><GlobeIcon className="w-3 h-3"/>Fonti</h5>
                                                <ul className="space-y-0.5">{fu.chunks.map((chunk, index) => (
                                                  <li key={index} className="text-xs"><a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-sky-600 dark:text-sky-400 hover:underline truncate block">{chunk.web.title || chunk.web.uri}</a></li>
                                                ))}</ul>
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                  {suggestedFollowUps.length > 0 && (
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Potresti anche chiedere:</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {suggestedFollowUps.map(fu => (
                                          <button
                                            key={fu.id}
                                            onClick={() => onAskFollowUp(turn.id, fu.id)}
                                            disabled={fu.isLoading || isLoading}
                                            className="px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-lg hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60 flex-shrink-0 disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
                                          >
                                            {fu.isLoading && <svg className="animate-spin h-4 w-4 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>}
                                            {fu.question}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                          </div>
                           {turn.speaker === 'user' && (<div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">TU</div>)}
                        </div>
                    )
                  })}
                  <div ref={chatEndRef}></div>
                </div>

                <footer className="relative p-4 border-t border-gray-200/80 dark:border-gray-700/60 flex-shrink-0 space-y-3">
                    {commandMenu.isOpen && filteredCommands.length > 0 && (
                        <SlashCommandMenu
                            commands={filteredCommands}
                            selectedIndex={commandMenu.selectedIndex}
                            onSelect={handleSelectCommand}
                            onHover={index => setCommandMenu(prev => ({ ...prev, selectedIndex: index }))}
                        />
                    )}
                    {suggestions.length > 0 && !isLoading && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-2">{suggestions.map((prompt, index) => (<button key={index} onClick={(e) => handleSubmit(e, prompt)} disabled={isLoading} className="px-3 py-1 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-full hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60 flex-shrink-0 disabled:opacity-50">{prompt}</button>))}</div>
                    )}
                    <form onSubmit={handleSubmit} className="flex items-end gap-3">
                        <textarea ref={textareaRef} value={question} onChange={handleQuestionChange} onKeyDown={handleKeyDown} placeholder="Fai una domanda o digita '/' per i comandi..." className="w-full p-3 border border-gray-300/80 dark:border-gray-600/80 rounded-lg bg-white/60 dark:bg-gray-900/40 focus:ring-2 focus:ring-indigo-500 resize-none max-h-32" rows={1} disabled={isLoading}/>
                        <button type="submit" disabled={!question.trim() || isLoading} className="p-3 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed flex-shrink-0" aria-label="Invia domanda">{isLoading ? <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <SendHorizonalIcon className="w-6 h-6" />}</button>
                    </form>
                </footer>
            </>
        ) : mode === 'voice' ? (
             <div className="flex-grow flex flex-col overflow-y-auto bg-gray-50/50 dark:bg-gray-900/30">
                {voiceStage === 'IDLE' && (
                    <div className="flex-grow flex flex-col items-center justify-center p-6 text-center">
                        <VolumeUpIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4"/>
                        <h3 className="text-xl font-bold">Pratica la tua conversazione</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm">Avvia una sessione vocale con l'IA per migliorare la tua pronuncia e fluidità. Alla fine riceverai un feedback sulla tua performance.</p>
                        <button onClick={startSession} className="mt-8 px-6 py-3 text-base font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 flex items-center gap-2 shadow-md hover:shadow-lg transition-all transform hover:scale-105">
                            <MicrophoneIcon className="w-5 h-5"/>
                            Inizia Conversazione
                        </button>
                    </div>
                )}
                {voiceStage === 'ACTIVE' && (
                    <>
                        <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                            {liveTranscript.map((turn) => (
                                <div key={turn.id} className={`flex items-start gap-2.5 ${turn.speaker === 'user' ? 'justify-end' : ''}`}>
                                {turn.speaker === 'model' && <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0"><BrainIcon className="w-5 h-5"/></div>}
                                <div className={`flex flex-col w-full max-w-lg leading-1.5 p-3 border border-gray-200/60 dark:border-gray-700/50 ${turn.speaker === 'model' ? 'bg-white dark:bg-gray-700/50 rounded-e-xl rounded-es-xl' : turn.speaker === 'user' ? 'bg-indigo-100 dark:bg-indigo-900/40 rounded-s-xl rounded-ee-xl' : 'bg-yellow-50 dark:bg-yellow-900/20'}`}>
                                    <p className={`text-sm font-normal ${ turn.speaker === 'system' ? 'text-yellow-800 dark:text-yellow-300 italic' : 'text-gray-800 dark:text-gray-200'}`}>{turn.text}</p>
                                </div>
                                {turn.speaker === 'user' && <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">TU</div>}
                                </div>
                            ))}
                            {inProgressTranscript.user && <div className="flex justify-end"><p className="text-sm italic text-gray-500 dark:text-gray-400 p-3 bg-indigo-100/50 dark:bg-indigo-900/20 rounded-s-xl rounded-ee-xl max-w-lg">{inProgressTranscript.user}</p></div>}
                            {inProgressTranscript.model && <div className="flex justify-start"><p className="text-sm italic text-gray-500 dark:text-gray-400 p-3 bg-white/50 dark:bg-gray-700/50 rounded-e-xl rounded-es-xl max-w-lg">{inProgressTranscript.model}</p></div>}
                            <div ref={liveTranscriptEndRef} />
                        </div>
                        <footer className="flex-shrink-0 p-4 border-t border-gray-200/80 dark:border-gray-700/60 flex flex-col items-center justify-center gap-3">
                            <div className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${statusColor} transition-colors animate-pulse`}></div><span className="text-sm font-medium text-gray-600 dark:text-gray-300">{statusText}</span></div>
                            {voiceError && <div className="p-2 bg-red-100/80 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-sm font-medium flex items-center gap-2 rounded-md"><InfoIcon className="w-5 h-5" />{voiceError}</div>}
                            <button onClick={endSessionAndSummarize} className="px-6 py-3 text-base font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-2"><StopCircleIcon className="w-5 h-5"/> Termina Sessione</button>
                        </footer>
                    </>
                )}
                {voiceStage === 'SUMMARY' && (
                     <div className="flex-grow flex flex-col p-4 overflow-y-auto">
                        <h3 className="text-xl font-bold text-center mb-4 flex-shrink-0">Riepilogo Sessione Vocale</h3>
                        <div className="space-y-4 flex-grow overflow-y-auto p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200/60 dark:border-gray-700/50">
                            {liveTranscript.map((turn) => (
                                 <div key={turn.id} className={`flex items-start gap-2.5 ${turn.speaker === 'user' ? 'justify-end' : ''}`}>
                                    {turn.speaker === 'model' && <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0"><BrainIcon className="w-5 h-5"/></div>}
                                    <div className={`flex flex-col w-full max-w-lg leading-1.5 p-3 ${turn.speaker === 'model' ? 'bg-gray-100 dark:bg-gray-700 rounded-e-xl rounded-es-xl' : 'bg-indigo-100 dark:bg-indigo-900/40 rounded-s-xl rounded-ee-xl'}`}>
                                        <p className="text-sm font-normal text-gray-800 dark:text-gray-200">{turn.text}</p>
                                    </div>
                                    {turn.speaker === 'user' && <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">TU</div>}
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex-shrink-0">
                            {performanceAnalysis.isLoading && <LoadingSpinner message="Analisi della tua performance..."/>}
                            {performanceAnalysis.error && <div className="p-3 bg-red-100/80 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-sm rounded-md">{performanceAnalysis.error}</div>}
                            {performanceAnalysis.content && (
                                <div className="animate-fade-in">
                                    <h4 className="text-lg font-bold mb-2 flex items-center gap-2"><ClipboardListIcon className="w-6 h-6 text-indigo-500"/>Il Tuo Feedback</h4>
                                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200/60 dark:border-gray-700/50 max-h-60 overflow-y-auto">
                                        <MarkdownDisplay content={performanceAnalysis.content} title="" isEmbedded />
                                    </div>
                                </div>
                            )}
                            {!performanceAnalysis.content && !performanceAnalysis.isLoading && !performanceAnalysis.error && (
                                <div className="text-center">
                                    <button onClick={handleAnalyzePerformance} className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-2 mx-auto"><SparklesIcon className="w-4 h-4"/> Analizza Performance</button>
                                </div>
                            )}
                        </div>
                        <footer className="flex-shrink-0 p-4 mt-4 border-t border-gray-200/80 dark:border-gray-700/60 flex items-center justify-center gap-4">
                             <button onClick={() => setMode('text')} className="px-5 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-200/80 dark:bg-gray-700/80 rounded-lg hover:bg-gray-300/80 dark:hover:bg-gray-600/80">Torna alla Chat</button>
                             <button onClick={handleStartNewVoiceSession} className="px-5 py-2 text-sm font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700">Nuova Sessione Vocale</button>
                        </footer>
                    </div>
                )}
            </div>
        ) : ( // writing mode
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/30">
                <div className="flex flex-col">
                    <h3 className="text-lg font-bold mb-2 flex items-center gap-2 flex-shrink-0">
                        <Edit3Icon className="w-5 h-5 text-gray-500"/>
                        Il Tuo Testo
                    </h3>
                    <textarea 
                        value={writingText}
                        onChange={(e) => setWritingText(e.target.value)}
                        className="w-full flex-grow p-3 border border-gray-300/80 dark:border-gray-600/80 rounded-lg bg-white/60 dark:bg-gray-900/40 focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                     <div className="flex-shrink-0 mt-2 space-y-2">
                        <button
                            onClick={handleGetCreativeFeedback}
                            disabled={isCreativeLoading || !writingText.trim()}
                            className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                        >
                            {isCreativeLoading ? 'Analizzo...' : 'Ottieni Suggerimenti'}
                            <SparklesIcon className="w-4 h-4"/>
                        </button>
                         <div className="flex items-center gap-2">
                            <button onClick={handleGetFullAnalysis} className="flex-1 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white/60 dark:bg-gray-700/50 rounded-md border border-gray-300/80 dark:border-gray-600/80 hover:bg-gray-100/60 dark:hover:bg-gray-600/50">Analisi Completa</button>
                            <button onClick={handleAutoImprove} className="flex-1 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white/60 dark:bg-gray-700/50 rounded-md border border-gray-300/80 dark:border-gray-600/80 hover:bg-gray-100/60 dark:hover:bg-gray-600/50">Migliora Automaticamente</button>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col">
                     <h3 className="text-lg font-bold mb-2 flex items-center gap-2 flex-shrink-0">
                        <LightbulbIcon className="w-5 h-5 text-gray-500"/>
                        Suggerimenti dall'IA
                    </h3>
                    <div className="w-full flex-grow p-3 border border-dashed border-gray-300/80 dark:border-gray-600/80 rounded-lg bg-gray-100/50 dark:bg-gray-800/30 overflow-y-auto space-y-3">
                        {isCreativeLoading && <LoadingSpinner message="L'IA sta pensando..."/>}
                        {creativeError && <div className="p-2 text-sm text-red-600">{creativeError}</div>}
                        {!isCreativeLoading && creativeSuggestions.length === 0 && <p className="text-sm text-center text-gray-500 pt-10">I suggerimenti per migliorare il tuo testo appariranno qui.</p>}
                        {creativeSuggestions.map(sugg => (
                            <div key={sugg.id} className="p-3 bg-white dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm animate-fade-in">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    {getSuggestionIcon(sugg.type)}
                                    {sugg.type}
                                </div>
                                <div className="mt-2 text-sm space-y-2">
                                    <p className="text-gray-500 dark:text-gray-400 line-through">"{sugg.original_snippet}"</p>
                                    <p className="font-semibold text-gray-800 dark:text-gray-200">"{sugg.suggested_change}"</p>
                                </div>
                                <p className="mt-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/50 p-2 rounded-md">{sugg.explanation}</p>
                                <div className="flex justify-end gap-2 mt-3">
                                    <button onClick={() => dismissSuggestion(sugg.id)} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Rifiuta suggerimento"><XCircleIcon className="w-5 h-5 text-red-500"/></button>
                                    <button onClick={() => applySuggestion(sugg)} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Applica suggerimento"><CheckCircleIcon className="w-5 h-5 text-emerald-500"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {activeModal === 'full_analysis' && (
            <ExplanationModal 
                isOpen={true} 
                onClose={() => setActiveModal(null)} 
                item={writingText.substring(0, 30) + '...'}
                type="grammar"
                cefrLevel={cefrLevel}
                register={register}
            />
        )}

        {activeModal === 'auto_improve' && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setActiveModal(null)}>
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
                    <header className="flex items-center justify-between p-4 border-b border-slate-200/80 dark:border-slate-700/80">
                        <h2 className="text-lg font-semibold">Miglioramento Automatico</h2>
                        <button onClick={() => setActiveModal(null)}><XIcon className="w-5 h-5" /></button>
                    </header>
                    <div className="p-6 overflow-y-auto">
                        {modalLoading && <LoadingSpinner message="Miglioramento in corso..." />}
                        {modalError && <p className="text-red-500">{modalError}</p>}
                        {modalContent && typeof modalContent !== 'string' && <ImprovedTextDisplay result={modalContent} />}
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};

export default AITutorPage;