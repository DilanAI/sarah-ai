import React from 'react';
import { AppMode, ModelId, ApiStatus } from '../types';
import { Code2, Sparkles, Trash2, Mic, Volume2, Cpu, PanelLeft, CheckCircle2, AlertCircle } from 'lucide-react';

interface HeaderProps {
  mode: AppMode;
  onToggleMode: (newMode: AppMode) => void;
  selectedModel: ModelId;
  onSelectModel: (model: ModelId) => void;
  apiStatus: ApiStatus | null;
  onClearChat: () => void;
  onToggleSidebar: () => void;
  isListening: boolean;
  isSpeaking: boolean;
  messageCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  onToggleMode,
  selectedModel,
  onSelectModel,
  apiStatus,
  onClearChat,
  onToggleSidebar,
  isListening,
  isSpeaking,
  messageCount,
}) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 flex items-center justify-between z-10 shrink-0">
      {/* Left: Sidebar toggle + App Branding */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800 transition-colors"
          title="Toggle history & settings"
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center text-white shadow-sm font-bold text-xs">
            AI
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5 leading-none">
             Dilan's AI Studio
              {apiStatus?.configured ? (
                <span title="Gemini API Key Active" className="flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </span>
              ) : (
                <span title="API Key not configured in secrets" className="flex items-center">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                </span>
              )}
            </h1>
            
          </div>
        </div>
      </div>

      {/* Center: Mode Switcher (Code vs General) */}
      <div className="hidden md:flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800">
        <button
          onClick={() => onToggleMode('code')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            mode === 'code'
              ? 'bg-slate-800 text-emerald-300 shadow-sm border border-slate-700/80'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Coding Mode</span>
        </button>
        <button
          onClick={() => onToggleMode('general')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            mode === 'general'
              ? 'bg-slate-800 text-indigo-300 shadow-sm border border-slate-700/80'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>General Mode</span>
        </button>
      </div>

      {/* Right: Model picker, Voice status badges, Clear chat */}
      <div className="flex items-center gap-2">
        {/* Model dropdown */}
        <div className="relative flex items-center">
          <Cpu className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
          <select
              value={selectedModel}
              onChange={(e) => onSelectModel(e.target.value as ModelId)}
              className="pl-7 pr-6 py-1 text-xs rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 focus:outline-none focus:border-indigo-500 transition-colors font-mono appearance-none cursor-pointer"
            >
              <option value="gemini-3.6-flash">Flash (Fast )</option>
              <option value="gemini-3.6-pro">Pro (Advanced)</option>
              
              <option value="gemini-3.1-pro-preview">ProMax(Deep)</option>
            </select>
        </div>

        {/* Live Audio Activity Indicators */}
        {isListening && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-[11px] animate-pulse">
            <Mic className="w-3 h-3" />
            <span className="hidden sm:inline">Listening</span>
          </div>
        )}
        {isSpeaking && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-700 text-indigo-300 text-[11px] animate-pulse">
            <Volume2 className="w-3 h-3" />
            <span className="hidden sm:inline">Speaking</span>
          </div>
        )}

        {/* Clear chat button */}
        {messageCount > 0 && (
          <button
            onClick={onClearChat}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-slate-900 border border-slate-800 transition-colors"
            title="Clear current conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
