// Web Speech API interfaces
interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as unknown as IWindow;
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
}

export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.speechSynthesis);
}

export class SpeechInputManager {
  private recognition: any = null;
  private isListening: boolean = false;
  private onResultCallback?: (transcript: string, isFinal: boolean) => void;
  private onEndCallback?: () => void;
  private onErrorCallback?: (error: string) => void;

  constructor() {
    if (typeof window === 'undefined') return;
    this.initRecognition();
  }

  private initRecognition(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as unknown as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      return false;
    }

    // Abort and clean up prior instance if existing
    if (this.recognition) {
      try {
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    try {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const combined = finalTranscript || interimTranscript;
        if (combined && this.onResultCallback) {
          this.onResultCallback(combined, Boolean(finalTranscript));
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        this.isListening = false;
        if (this.onErrorCallback) {
          this.onErrorCallback(event.error);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.onEndCallback) {
          this.onEndCallback();
        }
      };

      return true;
    } catch (err) {
      console.warn('Failed to initialize speech recognition:', err);
      return false;
    }
  }

  public start(
    onResult: (transcript: string, isFinal: boolean) => void,
    onEnd?: () => void,
    onError?: (error: string) => void
  ) {
    // Re-initialize a fresh recognition instance on every start to prevent stale/frozen states
    const initialized = this.initRecognition();

    if (!initialized || !this.recognition) {
      onError?.('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    this.onResultCallback = onResult;
    this.onEndCallback = onEnd;
    this.onErrorCallback = onError;

    try {
      this.isListening = true;
      this.recognition.start();
    } catch (e: any) {
      this.isListening = false;
      console.warn('Recognition start caught error:', e);
      if (e?.name === 'InvalidStateError') {
        // Retry with freshly spawned instance
        this.initRecognition();
        try {
          this.recognition.start();
          this.isListening = true;
        } catch (retryErr: any) {
          onError?.(retryErr?.message || 'Could not start microphone');
        }
      } else {
        onError?.(e?.message || 'Could not start microphone');
      }
    }
  }

  public stop() {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        try {
          this.recognition.abort();
        } catch {}
      }
    }
  }

  public get active(): boolean {
    return this.isListening;
  }

  public isSupported(): boolean {
    return Boolean(this.recognition || (typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)));
  }
}

// Backward-compatible alias
export const VoiceRecognitionController = SpeechInputManager;

// Text to speech helpers
let currentUtterance: SpeechSynthesisUtterance | null = null;

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSynthesisSupported()) return [];
  return window.speechSynthesis.getVoices();
}

export function getSamanthaVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechSynthesisSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // 1. Direct match for Samantha
  const samantha = voices.find((v) => /samantha/i.test(v.name));
  if (samantha) return samantha;

  // 2. Windows / Chrome natural female fallback (Zira, Jenny, Google US English) if Samantha is not installed locally
  const naturalFemale = voices.find(
    (v) =>
      (/zira|jenny|aria|victoria|karen|female|google us english/i.test(v.name)) &&
      v.lang.startsWith('en')
  );
  if (naturalFemale) return naturalFemale;

  // 3. Any English voice
  const englishVoice = voices.find((v) => v.lang.startsWith('en'));
  return englishVoice || voices[0] || null;
}

export function getFemaleVoice(): SpeechSynthesisVoice | null {
  return getSamanthaVoice();
}

export function speakText(
  text: string,
  options?: { rate?: number; pitch?: number; lang?: string; onEnd?: () => void }
) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  if (!isSpeechSynthesisSupported()) return;

  stopSpeaking();

  // Strip markdown code blocks and syntax for cleaner speech playback
  const cleanedText = text
    .replace(/```[\s\S]*?```/g, ' Code snippet omitted for audio. ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[#*_~>]/g, '')
    .trim();

  if (!cleanedText) return;

  const utterance = new SpeechSynthesisUtterance(cleanedText);
  utterance.rate = options?.rate ?? 1.0;
  utterance.pitch = 1.05; // Tuned for Samantha's signature warm natural cadence
  utterance.lang = options?.lang ?? 'en-US';

  // Exclusively bind Samantha's voice
  const voice = getSamanthaVoice();
  if (voice) {
    utterance.voice = voice;
  }

  utterance.onend = () => {
    currentUtterance = null;
    options?.onEnd?.();
  };

  utterance.onerror = () => {
    currentUtterance = null;
    options?.onEnd?.();
  };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
}

export function isSpeaking(): boolean {
  if (!isSpeechSynthesisSupported()) return false;
  return window.speechSynthesis.speaking;
}