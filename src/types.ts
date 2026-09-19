export type AppMode = 'code' | 'general';

export type ModelId = 'gemini-3.6-flash' | 'gemini-3.6-pro' | 'gemini-3.8-flash' | 'gemini-3.1-pro-preview';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  mode?: AppMode;
  isVoiceInput?: boolean;
  codeLanguage?: string;
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
  mode: AppMode;
}

export interface VoiceSettings {
  autoSpeak: boolean;
  rate: number;
  pitch: number;
  lang: string;
  autoSendOnSilence: boolean;
}

export interface ApiStatus {
  configured: boolean;
  defaultModel: string;
  supportedModels: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}
