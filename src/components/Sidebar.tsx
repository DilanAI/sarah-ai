import React, { useState } from 'react';
import { Conversation, AppMode, VoiceSettings, ApiStatus } from '../types';
import { Plus, MessageSquare, Trash2, Settings, Volume2, Mic, X, Code2, Sparkles, ShieldCheck, Play } from 'lucide-react';
import { isSpeechRecognitionSupported, isSpeechSynthesisSupported, speakText, stopSpeaking } from '../utils/speech';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  currentMode: AppMode;
  onToggleMode: (mode: AppMode) => void;
  voiceSettings: VoiceSettings;
  onUpdateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  apiStatus: ApiStatus | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  currentMode,
  onToggleMode,
  voiceSettings,
  onUpdateVoiceSettings,
  apiStatus,
}) => {
  const speechRecSupported = isSpeechRecognitionSupported();
  const speechSynSupported = isSpeechSynthesisSupported();
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-xs"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-30 w-72 bg-slate-950 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Header */}
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <button
            onClick={onNewConversation}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
          <button
            onClick={onClose}
            className="md:hidden ml-2 p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile Mode Switcher */}
        <div className="p-3 border-b border-slate-800 md:hidden">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Active Mode
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onToggleMode('code')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium transition-all ${
                currentMode === 'code'
                  ? 'bg-slate-800 text-emerald-300 border border-slate-700'
                  : 'text-slate-400 hover:bg-slate-900'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Code</span>
            </button>
            <button
              onClick={() => onToggleMode('general')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium transition-all ${
                currentMode === 'general'
                  ? 'bg-slate-800 text-indigo-300 border border-slate-700'
                  : 'text-slate-400 hover:bg-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>General</span>
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Recent Conversations
          </div>

          {conversations.length === 0 ? (
            <div className="text-center py-8 px-4 text-xs text-slate-500">
              No previous chats. Start by sending a voice or text prompt!
            </div>
          ) : (
            conversations.map((c) => {
              const isActive = c.id === activeConversationId;
              return (
                <div
                  key={c.id}
                  onClick={() => onSelectConversation(c.id)}
                  className={`group flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-slate-100 font-medium'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span className="truncate">{c.title || 'Untitled Session'}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(c.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Voice & System Settings Panel */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/40 space-y-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-[11px] uppercase tracking-wider">
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Voice & Audio Settings</span>
          </div>

          {/* Locked Samantha Voice Card */}
          {speechSynSupported && (
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
                  <span className="font-semibold text-slate-200 text-xs">Samantha Voice</span>
                </div>
                <button
                  onClick={() => {
                    stopSpeaking();
                    setIsTestingVoice(true);
                    speakText("Hi, I'm Samantha. I'm your AI assistant for coding and conversation.", {
                      rate: voiceSettings.rate,
                      onEnd: () => setIsTestingVoice(false),
                    });
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-pink-950/70 hover:bg-pink-900 text-pink-300 text-[10px] border border-pink-800/60 transition-colors"
                >
                  <Play className="w-2.5 h-2.5 fill-current" />
                  <span>{isTestingVoice ? 'Playing...' : 'Test'}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                All voice playback is exclusively calibrated to Samantha's natural female profile.
              </p>
            </div>
          )}

          {/* Auto speak response switch */}
          <div className="flex items-center justify-between text-slate-300">
            <div className="flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Auto-Read Answers</span>
            </div>
            <input
              type="checkbox"
              checked={voiceSettings.autoSpeak}
              onChange={(e) => onUpdateVoiceSettings({ autoSpeak: e.target.checked })}
              disabled={!speechSynSupported}
              className="accent-indigo-500 w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Speech Rate Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Speech Speed</span>
              <span className="font-mono">{voiceSettings.rate}x</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.4"
              step="0.1"
              value={voiceSettings.rate}
              onChange={(e) => onUpdateVoiceSettings({ rate: parseFloat(e.target.value) })}
              className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Hardware Capability Status */}
          <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[11px]">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1">
                <Mic className="w-3 h-3" /> Voice Input (STT)
              </span>
              <span className={speechRecSupported ? 'text-emerald-400' : 'text-amber-400'}>
                {speechRecSupported ? 'Supported' : 'No WebSpeech'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3 h-3" /> Voice Output (TTS)
              </span>
              <span className={speechSynSupported ? 'text-emerald-400' : 'text-amber-400'}>
                {speechSynSupported ? 'Supported' : 'No WebSpeech'}
              </span>
            </div>
          </div>

          {/* API Key Security Note */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-[10px] leading-relaxed">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};