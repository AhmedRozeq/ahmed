import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { Collocation, ConversationTurn } from '../types';
import { encode, decode, decodeAudioData } from '../utils/audio';
import InfoIcon from './icons/InfoIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import StopCircleIcon from './icons/StopCircleIcon';

interface ConversationalPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  collocation: Collocation | null;
  isWindow?: boolean;
}

type Status = 'IDLE' | 'CONNECTING' | 'LISTENING' | 'SPEAKING' | 'ERROR';

const ConversationalPracticeModal: React.FC<ConversationalPracticeModalProps> = ({ isOpen, onClose, collocation, isWindow = false }) => {
  const [status, setStatus] = useState<Status>('IDLE');
  const [transcript, setTranscript] = useState<ConversationTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    }
  }, [isOpen]);

  const handleAnimationEnd = () => {
    if (!isOpen) {
      setShouldRender(false);
    }
  };


  useEffect(() => {
    if (isOpen && shouldRender) {
      startSession();
    } else {
      endSession();
    }
    return () => endSession();
  }, [isOpen, shouldRender]);
  
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const startSession = useCallback(async () => {
    if (!collocation || status !== 'IDLE') return;

    setStatus('CONNECTING');
    setError(null);
    setTranscript([{
        id: 'system-start',
        speaker: 'system',
        text: `Inizia una conversazione per praticare: "${collocation.voce}"`
    }]);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setStatus('LISTENING');
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            mediaStreamSourceRef.current = source;
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              currentOutputTranscriptionRef.current += text;
            } else if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              currentInputTranscriptionRef.current += text;
            }
            if (message.serverContent?.turnComplete) {
                const fullInput = currentInputTranscriptionRef.current.trim();
                const fullOutput = currentOutputTranscriptionRef.current.trim();
                setTranscript(prev => {
                    const newTurns: ConversationTurn[] = [];
                    if (fullInput) newTurns.push({ id: crypto.randomUUID(), speaker: 'user', text: fullInput });
                    if (fullOutput) newTurns.push({ id: crypto.randomUUID(), speaker: 'model', text: fullOutput });
                    return [...prev, ...newTurns];
                });
                currentInputTranscriptionRef.current = '';
                currentOutputTranscriptionRef.current = '';
            }

            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              setStatus('SPEAKING');
              const outputAudioContext = outputAudioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
              const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContext, 24000, 1);
              const source = outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContext.destination);
              source.addEventListener('ended', () => {
                audioSourcesRef.current.delete(source);
                if (audioSourcesRef.current.size === 0) {
                  setStatus('LISTENING');
                }
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              audioSourcesRef.current.add(source);
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            setError(`Si è verificato un errore: ${e.message}`);
            setStatus('ERROR');
          },
          onclose: (e: CloseEvent) => {
            setStatus('IDLE');
          },
        },
        config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            systemInstruction: `Sei un amichevole tutor di lingua italiana. Inizia una conversazione con l'utente in italiano. L'utente vuole praticare l'espressione "${collocation.voce}". Crea uno scenario naturale e incoraggia l'utente a usare questa espressione. Mantieni le tue risposte concise e parla chiaramente. Inizia salutando e introducendo lo scenario.`,
        },
      });
    } catch (err) {
      console.error('Failed to get user media or start session', err);
      setError('Impossibile accedere al microfono. Assicurati di aver dato i permessi necessari.');
      setStatus('ERROR');
    }
  }, [collocation, status]);

  const endSession = useCallback(() => {
    sessionPromiseRef.current?.then(session => session.close());
    sessionPromiseRef.current = null;
    
    scriptProcessorRef.current?.disconnect();
    mediaStreamSourceRef.current?.disconnect();
    scriptProcessorRef.current = null;
    mediaStreamSourceRef.current = null;
    
    inputAudioContextRef.current?.close().catch(console.error);
    outputAudioContextRef.current?.close().catch(console.error);
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    
    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    setStatus('IDLE');
  }, []);

  const getStatusIndicator = () => {
    switch (status) {
      case 'CONNECTING': return { text: 'Connessione...', color: 'bg-yellow-500' };
      case 'LISTENING': return { text: 'Ascoltando...', color: 'bg-green-500' };
      case 'SPEAKING': return { text: 'Parlando...', color: 'bg-blue-500' };
      case 'ERROR': return { text: 'Errore', color: 'bg-red-500' };
      default: return { text: 'Inattivo', color: 'bg-slate-500' };
    }
  };
  const { text: statusText, color: statusColor } = getStatusIndicator();

  if (!shouldRender) return null;

  const content = (
    <div className={`bg-white shadow-2xl w-full flex flex-col ${isWindow ? 'h-full' : `rounded-lg max-w-2xl max-h-[90vh] ${isOpen ? 'animate-scale-in' : 'animate-scale-out'}`}`} onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Pratica Conversazione</h2>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${statusColor} transition-colors`}></div>
            <span className="text-sm font-medium text-slate-600">{statusText}</span>
          </div>
        </header>
        <div className="flex-grow p-4 overflow-y-auto bg-slate-50 space-y-4">
          {transcript.map((turn) => (
            <div key={turn.id} className={`flex items-start gap-2.5 ${turn.speaker === 'user' ? 'justify-end' : ''}`}>
              {turn.speaker === 'model' && <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">IA</div>}
              <div className={`flex flex-col w-full max-w-[320px] leading-1.5 p-3 border-slate-200 ${turn.speaker === 'model' ? 'bg-white rounded-e-xl rounded-es-xl' : turn.speaker === 'user' ? 'bg-sky-100 rounded-s-xl rounded-ee-xl' : 'bg-yellow-50 text-center w-full max-w-full'}`}>
                <p className={`text-sm font-normal ${turn.speaker === 'system' ? 'text-yellow-700 italic' : 'text-slate-900'}`}>{turn.text}</p>
              </div>
              {turn.speaker === 'user' && <div className="w-8 h-8 rounded-full bg-slate-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">TU</div>}
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>
        {error && <div className="p-3 bg-red-100 text-red-800 text-sm font-medium flex items-center gap-2"><InfoIcon className="w-5 h-5" />{error}</div>}
        <footer className="p-4 border-t border-slate-200 flex items-center justify-center">
            {status === 'IDLE' || status === 'ERROR' ? (
                 <button onClick={startSession} className="px-6 py-3 text-base font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 flex items-center gap-2">
                    <MicrophoneIcon className="w-5 h-5"/>
                    Inizia Sessione
                </button>
            ) : (
                 <button onClick={onClose} className="px-6 py-3 text-base font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-2">
                    <StopCircleIcon className="w-5 h-5"/>
                    Termina Sessione
                </button>
            )}
        </footer>
    </div>
  );

  if (isWindow) {
    return content;
  }

  return (
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${isOpen ? 'animate-fade-in' : 'animate-fade-out'}`}
      onClick={onClose} role="dialog" aria-modal="true"
      onAnimationEnd={handleAnimationEnd}
    >
      {content}
    </div>
  );
};

export default ConversationalPracticeModal;