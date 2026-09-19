import React, { useState, useEffect, useRef } from 'react';
import { AppMode, ModelId, Message, Conversation, VoiceSettings, ApiStatus } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MessageItem } from './components/MessageItem';
import { PromptStarters } from './components/PromptStarters';
import { VoiceWave } from './components/VoiceWave';
import {
  Send,
  Mic,
  MicOff,
  Square,
  Sparkles,
  Code2,
  AlertCircle,
} from 'lucide-react';
import {
  SpeechInputManager,
  isSpeechRecognitionSupported,
  speakText,
  stopSpeaking,
  isSpeaking,
} from './utils/speech';

const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  autoSpeak: false,
  rate: 1.0,
  pitch: 1.05,
  lang: 'en-US',
  autoSendOnSilence: false,
};

const CODE_LANGUAGES = ['TypeScript', 'Next.js', 'React', 'Python', 'Go', 'Rust', 'SQL', 'Bash'];

export default function App() {
  const [mode, setMode] = useState<AppMode>('code');
  const [selectedModel, setSelectedModel] = useState<ModelId>('gemini-3.6-flash');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('TypeScript');
  const [inputPrompt, setInputPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Voice States
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [speechActive, setSpeechActive] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() => {
    try {
      const saved = localStorage.getItem('ai_voice_settings');
      return saved ? JSON.parse(saved) : DEFAULT_VOICE_SETTINGS;
    } catch {
      return DEFAULT_VOICE_SETTINGS;
    }
  });

  // Sidebar & History States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem('ai_conversations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeConversationId, setActiveConversationId] = useState<string>('');

  // Active messages
  const [messages, setMessages] = useState<Message[]>([]);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const speechManagerRef = useRef<SpeechInputManager | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize and check server status
  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => setApiStatus(data))
      .catch((err) => console.warn('Status check failed:', err));
  }, []);

  // Save voice settings
  useEffect(() => {
    try {
      localStorage.setItem('ai_voice_settings', JSON.stringify(voiceSettings));
    } catch (e) {
      console.warn('Failed to save voice settings:', e);
    }
  }, [voiceSettings]);

  // Save conversations
  useEffect(() => {
    try {
      localStorage.setItem('ai_conversations', JSON.stringify(conversations));
    } catch (e) {
      console.warn('Failed to save conversations:', e);
    }
  }, [conversations]);

  // Track speech audio playing status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setSpeechActive(isSpeaking());
    }, 250);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll on new messages or streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Initialize speech recognition controller instance
  useEffect(() => {
    speechManagerRef.current = new SpeechInputManager();
    return () => {
      speechManagerRef.current?.stop();
    };
  }, []);

  // Handle Voice Toggle
  const toggleVoiceInput = () => {
    if (!isSpeechRecognitionSupported()) {
      setErrorMessage('Speech Recognition is not supported by this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      speechManagerRef.current?.stop();
      setIsListening(false);
    } else {
      stopSpeaking();
      setErrorMessage(null);
      setIsListening(true);
      setVoiceTranscript('');

      speechManagerRef.current?.start(
        (transcript, isFinal) => {
          setVoiceTranscript(transcript);
          setInputPrompt(transcript);

          // Auto-send if user says "send" or "go"
          if (isFinal && /^(send|submit|execute|go|run)$/i.test(transcript.trim())) {
            speechManagerRef.current?.stop();
            setIsListening(false);
            setTimeout(() => {
              handleSendMessage();
            }, 100);
          }
        },
        () => {
          setIsListening(false);
        },
        (err) => {
          console.warn('Speech recognition error:', err);
          setIsListening(false);
          if (err === 'not-allowed') {
            setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser address bar.');
          } else if (err !== 'no-speech') {
            setErrorMessage(`Voice recognition error: ${err}`);
          }
        }
      );
    }
  };

  // Create new conversation
  const handleNewConversation = () => {
    stopSpeaking();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setStreamingContent('');
    setIsGenerating(false);
    setActiveConversationId('');
    setInputPrompt('');
    setErrorMessage(null);
    setIsSidebarOpen(false);
  };

  // Select existing conversation
  const handleSelectConversation = (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      stopSpeaking();
      setActiveConversationId(conv.id);
      setMessages(conv.messages);
      setMode(conv.mode);
      setIsSidebarOpen(false);
      setErrorMessage(null);
    }
  };

  // Delete conversation
  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      handleNewConversation();
    }
  };

  // Clear current chat
  const handleClearChat = () => {
    stopSpeaking();
    setMessages([]);
    setStreamingContent('');
    setErrorMessage(null);
  };

  // Stop Generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    if (streamingContent) {
      const partialMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: streamingContent + '\n\n*(Generation stopped by user)*',
        timestamp: Date.now(),
        mode,
      };
      setMessages((prev) => [...prev, partialMessage]);
      setStreamingContent('');
    }
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend ?? inputPrompt).trim();
    if (!prompt || isGenerating) return;

    // Stop active speech recognition or audio playback
    if (isListening) {
      speechManagerRef.current?.stop();
      setIsListening(false);
    }
    stopSpeaking();

    const wasVoice = Boolean(isListening || voiceTranscript);
    setVoiceTranscript('');
    setInputPrompt('');
    setErrorMessage(null);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
      mode,
      isVoiceInput: wasVoice,
      codeLanguage: mode === 'code' ? selectedLanguage : undefined,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsGenerating(true);
    setStreamingContent('');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          mode,
          model: selectedModel,
          codeLanguage: mode === 'code' ? selectedLanguage : undefined,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to read response stream.');

      const decoder = new TextDecoder();
      let accumulatedText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.replace('data: ', ''));
              if (data.text) {
                accumulatedText += data.text;
                setStreamingContent(accumulatedText);
              }
              if (data.error) {
                throw new Error(data.error);
              }
            } catch (err: any) {
              if (err.message) {
                console.warn('Chunk parse warning:', err);
              }
            }
          }
        }
      }

      // Add final assistant message
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: accumulatedText,
        timestamp: Date.now(),
        mode,
      };

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);
      setStreamingContent('');

      // Auto-read aloud if enabled with Samantha voice
      if (voiceSettings.autoSpeak) {
        speakText(accumulatedText, {
          rate: voiceSettings.rate,
        });
      }

      // Update or create conversation in history
      const title = prompt.length > 35 ? prompt.substring(0, 35) + '...' : prompt;
      if (!activeConversationId) {
        const newId = `conv-${Date.now()}`;
        const newConv: Conversation = {
          id: newId,
          title,
          updatedAt: Date.now(),
          messages: updatedMessages,
          mode,
        };
        setActiveConversationId(newId);
        setConversations((prev) => [newConv, ...prev]);
      } else {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversationId
              ? { ...c, messages: updatedMessages, updatedAt: Date.now() }
              : c
          )
        );
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Request failed:', err);
        setErrorMessage(err.message || 'Failed to complete AI request.');
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  // Textarea auto-resize and Enter shortcut
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 antialiased overflow-hidden">
      {/* Sidebar for conversations and voice settings */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        currentMode={mode}
        onToggleMode={setMode}
        voiceSettings={voiceSettings}
        onUpdateVoiceSettings={(updated) => setVoiceSettings((prev) => ({ ...prev, ...updated }))}
        apiStatus={apiStatus}
      />

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <Header
          mode={mode}
          onToggleMode={setMode}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          apiStatus={apiStatus}
          onClearChat={handleClearChat}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isListening={isListening}
          isSpeaking={speechActive}
          messageCount={messages.length}
        />

        {/* Missing API Key warning banner if applicable */}
        {apiStatus && !apiStatus.configured && (
          <div className="bg-amber-950/60 border-b border-amber-800/80 px-4 py-2 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Gemini API Key Required:</strong> Add your Gemini API key to your .env file to activate live model responses.
              </span>
            </div>
          </div>
        )}

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4">
          {messages.length === 0 ? (
            <PromptStarters mode={mode} onSelectPrompt={(p) => handleSendMessage(p)} />
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((msg) => (
                <MessageItem key={msg.id} message={msg} voiceRate={voiceSettings.rate} />
              ))}

              {/* Live Streaming Message Display */}
              {isGenerating && streamingContent && (
                <MessageItem
                  message={{
                    id: 'streaming-preview',
                    role: 'assistant',
                    content: streamingContent,
                    timestamp: Date.now(),
                    mode,
                  }}
                  voiceRate={voiceSettings.rate}
                />
              )}

              {/* Waiting for response indicator */}
              {isGenerating && !streamingContent && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/40 text-xs text-slate-400">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                  <span>Generating response</span>
                </div>
              )}

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-200 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                  <button
                    onClick={() => setErrorMessage(null)}
                    className="text-rose-400 hover:text-rose-200 text-xs font-mono"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar Section */}
        <div className="border-t border-slate-800 bg-slate-950/90 backdrop-blur-md p-3 sm:p-4">
          <div className="max-w-4xl mx-auto space-y-2">
            {/* Coding Mode Language Tags / Filters */}
            {mode === 'code' && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs text-slate-400 no-scrollbar">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider shrink-0 mr-1">
                  Target Language:
                </span>
                {CODE_LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLanguage(lang)}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-mono transition-colors shrink-0 ${
                      selectedLanguage === lang
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}

            {/* Voice Active Listening Waveform Banner */}
            {isListening && (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-950/50 border border-emerald-800/70 text-emerald-200 text-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <VoiceWave active={true} color="bg-emerald-400" label="Listening to your voice..." />
                  {voiceTranscript && (
                    <span className="italic text-emerald-300 truncate max-w-md">
                      "{voiceTranscript}"
                    </span>
                  )}
                </div>
                <button
                  onClick={toggleVoiceInput}
                  className="px-2.5 py-1 rounded-md bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  Done Speaking
                </button>
              </div>
            )}

            {/* Main Prompt Input Box */}
            <div className="relative rounded-2xl bg-slate-900 border border-slate-800 focus-within:border-indigo-500/80 transition-all shadow-lg">
              <textarea
                ref={textareaRef}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  mode === 'code'
                    ? `Ask a coding question, request refactoring, or tap mic to speak in ${selectedLanguage}...`
                    : 'Ask anything, draft ideas, or tap the microphone to talk...'
                }
                rows={2}
                disabled={isGenerating}
                className="w-full bg-transparent px-4 pt-3 pb-12 text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
              />

              {/* Bottom Action Controls inside textarea */}
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400">
                  {/* Voice Microphone Toggle Button */}
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isListening
                        ? 'bg-rose-600 text-white shadow-lg animate-pulse'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                    title={isListening ? 'Stop listening' : 'Speak using microphone'}
                  >
                    {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-indigo-400" />}
                    <span>{isListening ? 'Recording...' : 'Voice Input'}</span>
                  </button>

                  {/* Mode tag */}
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-500">
                    {mode === 'code' ? <Code2 className="w-3 h-3 text-emerald-400" /> : <Sparkles className="w-3 h-3 text-indigo-400" />}
                    {mode === 'code' ? 'Code Mode' : 'General Mode'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden md:inline text-[11px] text-slate-500 flex items-center gap-1">
                    <span>Press</span>
                    <kbd className="px-1 py-0.5 rounded bg-slate-800 text-[10px] font-mono border border-slate-700">Enter</kbd>
                    <span>to send</span>
                  </span>

                  {isGenerating ? (
                    <button
                      type="button"
                      onClick={handleStopGeneration}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium shadow transition-colors cursor-pointer"
                      title="Stop generating"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      <span>Stop</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendMessage()}
                      disabled={!inputPrompt.trim()}
                      className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-medium shadow transition-colors cursor-pointer"
                    >
                      <span>Send</span>
                      <Send className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}