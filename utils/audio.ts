export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


// Speech Synthesis enhancement to find better "AI" voices from the browser

let voices: SpeechSynthesisVoice[] = [];
let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

// Populates voices. It's asynchronous on some browsers.
const loadVoices = (): Promise<SpeechSynthesisVoice[]> => {
    return new Promise((resolve) => {
        // Guard against SSR or non-browser environments
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            resolve([]);
            return;
        }
        
        voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            resolve(voices);
            return;
        }
        
        window.speechSynthesis.onvoiceschanged = () => {
            voices = window.speechSynthesis.getVoices();
            resolve(voices);
        };
    });
};

// Singleton promise to ensure voices are loaded only once
const getVoices = (): Promise<SpeechSynthesisVoice[]> => {
    if (!voicesPromise) {
        voicesPromise = loadVoices();
    }
    return voicesPromise;
};

// Finds the best available voice for a given language, prioritizing "premium" voices
const findBestVoice = (lang: string): SpeechSynthesisVoice | null => {
    if (voices.length === 0) return null;

    const langCode = lang.split('-')[0];
    const langVoices = voices.filter(voice => voice.lang.startsWith(langCode));
    if (langVoices.length === 0) return null;
    
    // Prioritize voices with "Google", "Neural", or "Online" in their name as they are often higher quality
    const premiumVoice = langVoices.find(voice => 
        voice.name.includes('Google') || 
        voice.name.toLowerCase().includes('neural') ||
        !voice.localService // Prefer online voices
    );
    if (premiumVoice) return premiumVoice;

    // Try to find a voice that matches the exact language-country code
    const exactLangVoice = langVoices.find(voice => voice.lang === lang);
    if (exactLangVoice) return exactLangVoice;
    
    // Fallback to the first available voice for the language
    return langVoices[0];
};

/**
 * Speaks the given text using the best available browser voice for the language.
 * This aims for a more natural, "AI-like" pronunciation.
 * @param text The text to speak.
 * @param lang The language code ('it-IT' or 'ar-SA').
 */
export const speak = async (text: string, lang: 'it-IT' | 'ar-SA'): Promise<void> => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) {
        throw new Error("Sintesi vocale non supportata dal browser.");
    }
    
    await getVoices(); // Ensure voices are loaded

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;

    const voice = findBestVoice(lang);
    if (voice) {
        utterance.voice = voice;
    } else {
        console.warn(`Nessuna voce di alta qualità trovata per ${lang}. Verrà usata la voce di default.`);
    }

    // Adjust parameters for clarity and a more natural pace
    utterance.pitch = 1;
    utterance.rate = lang === 'ar-SA' ? 0.8 : 0.95;
    utterance.volume = 1;
    
    return new Promise((resolve, reject) => {
        utterance.onend = () => resolve();
        utterance.onerror = (event) => {
            console.error("SpeechSynthesis Error", event.error);
            reject(new Error(`Errore di sintesi vocale: ${event.error}`));
        };

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    });
};