import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { Collocation, ConversationTurn, VoiceScenario } from '../types';
import { encode, decode, decodeAudioData } from '../utils/audio';
import { generateVoiceScenarios, analyzeConversationPerformance } from '../services/geminiService';
import InfoIcon from './icons/InfoIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import StopCircleIcon from './icons/StopCircleIcon';
import LoadingSpinner from './LoadingSpinner';
import UsersIcon from './icons/UsersIcon';
import MarkdownDisplay from './MarkdownDisplay';
import SparklesIcon from './icons/SparklesIcon';
import ClipboardListIcon from './icons/ClipboardListIcon';

interface VoicePracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  collocation: Collocation | null;
  cefrLevel: string;
  register: string;
  context?: string | null;
}

type Stage = 'SCENARIO_SELECTION' | 'SESSION_ACTIVE' | 'SESSION_SUMMARY';
type VoiceStatus = 'IDLE' | 'CONNECTING' | 'LISTENING' | 'SPEAKING' | 'ERROR';

const VoicePracticeModal: React.FC<VoicePracticeModalProps> = ({ isOpen, onClose, collocation, cefrLevel: initialCefrLevel, register: initialRegister, context }) => {
  const [stage, setStage] = useState<Stage>('SCENARIO_SELECTION');
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('IDLE');
  const [transcript, setTranscript] = useState<ConversationTurn[]>([]);
  const [inProgressTranscript, setInProgressTranscript] = useState<{ user?: string, model?: string }>({});
  const [error, setError] = useState<string | null>(null);
  
  const [scenarios, setScenarios] = useState<VoiceScenario[]>([]);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState<VoiceScenario | null>(null);

  const [performanceAnalysis, setPerformanceAnalysis] = useState<{ isLoading: boolean; content: string | null; error: string | null }>({ isLoading: false, content: null, error: null });

  const [localCefrLevel, setLocalCefrLevel] = useState(initialCefrLevel);
  const [localRegister, setLocalRegister] = useState(initialRegister);

  const [shouldRender, setShouldRender] = useState(isOpen);
  
  // Refs for managing live session state and resources
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');
  
  // Ref to track current voice status without causing re-renders/dependency issues
  const voiceStatusRef = useRef(voiceStatus);
  useEffect(() => {
    voiceStatusRef.current = voiceStatus;
  }, [voiceStatus]);

  useEffect(() => {
    if (isOpen) setShouldRender(true);
  }, [isOpen]);

  const handleAnimationEnd = () => {
    if (!isOpen) setShouldRender(false);
  };
  
  const cleanupSession = useCallback(() => {
    sessionPromiseRef.current?.then(session => session.close()).catch(console.error);
    sessionPromiseRef.current = null;
    
    scriptProcessorRef.current?.disconnect();
    mediaStreamSourceRef.current?.disconnect();
    
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());

    if (inputAudioContextRef.current?.state !== 'closed') inputAudioContextRef.current?.close().catch(console.error);
    if (outputAudioContextRef.current?.state !== 'closed') outputAudioContextRef.current?.close().catch(console.error);
    
    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  const handleCloseAndCleanup = useCallback(() => {
    cleanupSession();
    onClose();
  }, [cleanupSession, onClose]);

  const startSession = useCallback(async (scenario: VoiceScenario) => {
    if (voiceStatusRef.current !== 'IDLE' && voiceStatusRef.current !== 'ERROR') return;
    
    setSelectedScenario(scenario);
    setVoiceStatus('CONNECTING');
    setError(null);
    setTranscript([]);
    setStage('SESSION_ACTIVE');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

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
              for (let i = 0; i < inputData.length; i++) { int16[i] = inputData[i] * 32768; }
              const pcmBlob: Blob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              sessionPromiseRef.current?.then((session) => session.sendRealtimeInput({ media: pcmBlob })).catch(console.error);
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
              setInProgressTranscript(prev => ({ ...prev, model: currentOutputTranscriptionRef.current }));
            } else if (message.serverContent?.inputTranscription) {
              currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
              setInProgressTranscript(prev => ({ ...prev, user: currentInputTranscriptionRef.current }));
            }
            if (message.serverContent?.turnComplete) {
                const fullInput = currentInputTranscriptionRef.current.trim();
                const fullOutput = currentOutputTranscriptionRef.current.trim();
                currentInputTranscriptionRef.current = '';
                currentOutputTranscriptionRef.current = '';
                setTranscript(prev => {
                    const newTurns: ConversationTurn[] = [];
                    if (fullInput) newTurns.push({ id: crypto.randomUUID(), speaker: 'user', text: fullInput });
                    if (fullOutput) newTurns.push({ id: crypto.randomUUID(), speaker: 'model', text: fullOutput });
                    return [...prev, ...newTurns];
                });
                setInProgressTranscript({});
            }
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              setVoiceStatus('SPEAKING');
              const outputCtx = outputAudioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.addEventListener('ended', () => {
                audioSourcesRef.current.delete(source);
                if (audioSourcesRef.current.size === 0 && voiceStatusRef.current !== 'ERROR' && voiceStatusRef.current !== 'IDLE') setVoiceStatus('LISTENING');
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              audioSourcesRef.current.add(source);
            }
          },
          onerror: (e: ErrorEvent) => { setError(`Errore: ${e.message}`); setVoiceStatus('ERROR'); },
          onclose: () => { if (voiceStatusRef.current !== 'ERROR') setVoiceStatus('IDLE'); },
        },
        config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {}, outputAudioTranscription: {},
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
            systemInstruction: scenario.system_instruction,
        },
      });
    } catch (err) {
      setError('Impossibile accedere al microfono. Assicurati di aver dato i permessi.');
      setVoiceStatus('ERROR');
    }
  }, []);

  const fetchScenarios = useCallback(async (level: string, reg: string) => {
    if (!collocation) return;
    setIsLoadingScenarios(true);
    setError(null);
    try {
      const result = await generateVoiceScenarios(collocation.voce, level, reg, context);
      setScenarios(result.scenari);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile caricare gli scenari.');
    } finally {
      setIsLoadingScenarios(false);
    }
  }, [collocation, context]);

  useEffect(() => {
    if (isOpen) {
        setShouldRender(true);
        setStage('SCENARIO_SELECTION');
        setVoiceStatus('IDLE');
        setTranscript([]);
        setInProgressTranscript({});
        setError(null);
        setScenarios([]);
        setSelectedScenario(null);
        setPerformanceAnalysis({ isLoading: false, content: null, error: null });
        setLocalCefrLevel(initialCefrLevel);
        setLocalRegister(initialRegister);
    }
    return () => {
        if (!isOpen) {
            cleanupSession();
        }
    };
  }, [isOpen, collocation, initialCefrLevel, initialRegister, cleanupSession]);
  
  useEffect(() => {
    if (isOpen && stage === 'SCENARIO_SELECTION') {
        fetchScenarios(localCefrLevel, localRegister);
    }
  }, [isOpen, stage, localCefrLevel, localRegister, fetchScenarios]);

  useEffect(() => {
    if (context && !isLoadingScenarios && scenarios.length === 1 && stage === 'SCENARIO_SELECTION') {
      startSession(scenarios[0]);
    }
  }, [context, scenarios, isLoadingScenarios, stage, startSession]);
  
  const endSessionAndSummarize = useCallback(() => {
    scriptProcessorRef.current?.disconnect();
    mediaStreamSourceRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    sessionPromiseRef.current?.then(session => session.close()).catch(console.error);
    sessionPromiseRef.current = null;

    const finalTranscript = [...transcript];
    const userInProgress = currentInputTranscriptionRef.current.trim();
    if (userInProgress) finalTranscript.push({ id: crypto.randomUUID(), speaker: 'user', text: userInProgress });
    const modelInProgress = currentOutputTranscriptionRef.current.trim();
    if (modelInProgress) finalTranscript.push({ id: crypto.randomUUID(), speaker: 'model', text: modelInProgress });
    
    setTranscript(finalTranscript);
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';
    setInProgressTranscript({});

    setVoiceStatus('IDLE');
    setStage('SESSION_SUMMARY');
  }, [transcript]);

  const handleAnalyzePerformance = useCallback(async () => {
    if (!selectedScenario) return;
    setPerformanceAnalysis({ isLoading: true, content: null, error: null });
    const userTurns = transcript.filter(turn => turn.speaker === 'user').map(turn => turn.text).join('\n- ');
    if (!userTurns) {
        setPerformanceAnalysis({ isLoading: false, content: null, error: "Non hai detto nulla durante la sessione, quindi non c'è nulla da analizzare." });
        return;
    }
    try {
        const result = await analyzeConversationPerformance(`- ${userTurns}`, selectedScenario.description, localCefrLevel, localRegister);
        setPerformanceAnalysis({ isLoading: false, content: result, error: null });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Impossibile generare l'analisi.";
        setPerformanceAnalysis({ isLoading: false, content: null, error: message });
    }
  }, [transcript, selectedScenario, localCefrLevel, localRegister]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, inProgressTranscript]);

  const getStatusIndicator = () => {
    switch (voiceStatus) {
      case 'CONNECTING': return { text: 'Connessione...', color: 'bg-yellow-500' };
      case 'LISTENING': return { text: 'Ascoltando...', color: 'bg-green-500' };
      case 'SPEAKING': return { text: 'Parlando...', color: 'bg-blue-500' };
      case 'ERROR': return { text: 'Errore', color: 'bg-red-500' };
      default: return { text: 'Inattivo', color: 'bg-slate-500' };
    }
  };
  const { text: statusText, color: statusColor } = getStatusIndicator();

  if (!shouldRender) return null;

  return (
    <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${isOpen ? 'animate-fade-in' : 'animate-fade-out'}`} onClick={handleCloseAndCleanup} role="dialog" aria-modal="true" onAnimationEnd={handleAnimationEnd}>
      <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col ${isOpen ? 'animate-scale-in' : 'animate-scale-out'}`} onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-slate-200/80 dark:border-slate-700/80">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Pratica Conversazione</h2>
          {stage === 'SESSION_ACTIVE' && <div className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${statusColor} transition-colors`}></div><span className="text-sm font-medium text-slate-600 dark:text-slate-300">{statusText}</span></div>}
        </header>

        {stage === 'SCENARIO_SELECTION' ? (
            <div className="flex-grow p-6 overflow-y-auto">
                <h3 className="text-xl font-bold text-center mb-2">{context ? "Pronto a discutere?" : "Scegli uno scenario"}</h3>
                <p className="text-center text-slate-600 dark:text-slate-400 mb-4">
                  {context 
                    ? `Parla con l'IA dell'approfondimento su "${collocation?.voce}".`
                    : `Pratica "${collocation?.voce}" in un contesto realistico.`
                  }
                </p>
                {!context && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 bg-slate-100/70 dark:bg-slate-900/40 rounded-lg border border-slate-200/60 dark:border-slate-700/50">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Livello QCER</label>
                            <select value={localCefrLevel} onChange={e => setLocalCefrLevel(e.target.value)} className="w-full p-2 border border-slate-300/80 dark:border-slate-600/80 rounded-lg bg-white/60 dark:bg-slate-900/40 focus:ring-2 focus:ring-sky-500">
                                <option value="A1">A1</option><option value="A2">A2</option><option value="B1">B1</option><option value="B2">B2</option><option value="C1">C1</option><option value="C2">C2</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Registro</label>
                            <select value={localRegister} onChange={e => setLocalRegister(e.target.value)} className="w-full p-2 border border-slate-300/80 dark:border-slate-600/80 rounded-lg bg-white/60 dark:bg-slate-900/40 focus:ring-2 focus:ring-sky-500">
                                <option value="Neutro">Neutro</option>
                                <option value="Formale">Formale</option>
                                <option value="Informale">Informale</option>
                                <option value="Giornalistico">Giornalistico</option>
                                <option value="Letterario">Letterario</option>
                                <option value="Burocratico">Burocratico</option>
                            </select>
                        </div>
                    </div>
                )}
                {isLoadingScenarios && <LoadingSpinner message={context ? "Preparo la discussione..." : "Creo gli scenari per te..."}/>}
                {error && <div className="p-3 bg-red-100/80 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-sm rounded-md">{error}</div>}
                <div className="space-y-4">
                    {scenarios.map((scenario, index) => (
                        <button key={index} onClick={() => startSession(scenario)} className="w-full text-left p-4 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200/60 dark:border-slate-700/50 hover:bg-sky-50 dark:hover:bg-sky-900/30 hover:border-sky-300 dark:hover:border-sky-700 transition-all transform hover:scale-105">
                            <h4 className="font-bold text-sky-700 dark:text-sky-400 flex items-center gap-2"><UsersIcon className="w-5 h-5"/>{scenario.title}</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{scenario.description}</p>
                        </button>
                    ))}
                </div>
            </div>
        ) : stage === 'SESSION_ACTIVE' ? (
             <>
                <div className="flex-grow p-4 overflow-y-auto bg-slate-50/70 dark:bg-slate-900/40 space-y-4">
                    {transcript.map((turn) => (
                        <div key={turn.id} className={`flex items-start gap-2.5 ${turn.speaker === 'user' ? 'justify-end' : ''}`}>
                        {turn.speaker === 'model' && <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">IA</div>}
                        <div className={`flex flex-col w-full max-w-lg leading-1.5 p-3 border border-slate-200/60 dark:border-slate-700/50 ${turn.speaker === 'model' ? 'bg-white dark:bg-slate-800 rounded-e-xl rounded-es-xl' : 'bg-sky-100 dark:bg-sky-900/40 rounded-s-xl rounded-ee-xl'}`}>
                            <p className="text-sm font-normal text-slate-900 dark:text-slate-100">{turn.text}</p>
                        </div>
                        {turn.speaker === 'user' && <div className="w-8 h-8 rounded-full bg-slate-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">TU</div>}
                        </div>
                    ))}
                    {inProgressTranscript.user && <div className="flex justify-end"><p className="text-sm italic text-slate-500 dark:text-slate-400 p-3 bg-sky-100/50 dark:bg-sky-900/20 rounded-s-xl rounded-ee-xl max-w-lg">{inProgressTranscript.user}</p></div>}
                    {inProgressTranscript.model && <div className="flex justify-start"><p className="text-sm italic text-slate-500 dark:text-slate-400 p-3 bg-white/50 dark:bg-slate-800/50 rounded-e-xl rounded-es-xl max-w-lg">{inProgressTranscript.model}</p></div>}
                    <div ref={transcriptEndRef} />
                </div>
                {error && <div className="p-3 bg-red-100/80 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-sm font-medium flex items-center gap-2"><InfoIcon className="w-5 h-5" />{error}</div>}
                <footer className="p-4 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center">
                    <button onClick={endSessionAndSummarize} className="px-6 py-3 text-base font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-2">
                        <StopCircleIcon className="w-5 h-5"/> Termina Sessione
                    </button>
                </footer>
             </>
        ) : ( // SESSION_SUMMARY stage
            <>
                <div className="flex-grow p-6 overflow-y-auto bg-slate-50/70 dark:bg-slate-900/40 space-y-4">
                    <h3 className="text-xl font-bold text-center mb-4">Riepilogo Sessione</h3>
                    <div className="space-y-4 max-h-60 overflow-y-auto p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700/50">
                        {transcript.map((turn) => (
                             <div key={turn.id} className={`flex items-start gap-2.5 ${turn.speaker === 'user' ? 'justify-end' : ''}`}>
                                {turn.speaker === 'model' && <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">IA</div>}
                                <div className={`flex flex-col w-full max-w-lg leading-1.5 p-3 ${turn.speaker === 'model' ? 'bg-slate-100 dark:bg-slate-700 rounded-e-xl rounded-es-xl' : 'bg-sky-100 dark:bg-sky-900/40 rounded-s-xl rounded-ee-xl'}`}>
                                    <p className="text-sm font-normal text-slate-900 dark:text-slate-100">{turn.text}</p>
                                </div>
                                {turn.speaker === 'user' && <div className="w-8 h-8 rounded-full bg-slate-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">TU</div>}
                            </div>
                        ))}
                    </div>
                    <div className="mt-6">
                        {performanceAnalysis.isLoading && <LoadingSpinner message="Analisi della tua performance in corso..."/>}
                        {performanceAnalysis.error && <div className="p-3 bg-red-100/80 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-sm rounded-md">{performanceAnalysis.error}</div>}
                        {performanceAnalysis.content && (
                            <div className="animate-fade-in">
                                <h4 className="text-lg font-bold mb-2 flex items-center gap-2"><ClipboardListIcon className="w-6 h-6 text-indigo-500"/>Il Tuo Feedback</h4>
                                <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700/50">
                                    <MarkdownDisplay content={performanceAnalysis.content} title="" isEmbedded />
                                </div>
                            </div>
                        )}
                        {!performanceAnalysis.content && !performanceAnalysis.isLoading && !performanceAnalysis.error && (
                            <div className="text-center">
                                <button onClick={handleAnalyzePerformance} className="px-6 py-3 text-base font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-2 mx-auto">
                                <SparklesIcon className="w-5 h-5"/> Analizza la mia Performance
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <footer className="p-4 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center">
                    <button onClick={handleCloseAndCleanup} className="px-6 py-3 text-base font-semibold text-slate-700 dark:text-slate-200 bg-slate-200/80 dark:bg-slate-700/80 rounded-lg hover:bg-slate-300/80 dark:hover:bg-slate-600/80">
                        Chiudi
                    </button>
                </footer>
            </>
        )}
      </div>
    </div>
  );
};

export default VoicePracticeModal;