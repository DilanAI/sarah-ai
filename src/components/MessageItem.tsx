import React, { useState } from 'react';
import { Message } from '../types';
import { CodeBlock } from './CodeBlock';
import { Bot, User, Mic, Volume2, VolumeX, Copy, Check, Terminal } from 'lucide-react';
import { speakText, stopSpeaking } from '../utils/speech';

interface MessageItemProps {
  message: Message;
  voiceRate?: number;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, voiceRate = 1.0 }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);

  const isAssistant = message.role === 'assistant';

  const handleToggleSpeak = () => {
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      speakText(message.content, {
        rate: voiceRate,
        onEnd: () => setIsPlaying(false),
      });
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy message:', e);
    }
  };

  // Helper to parse content into chunks of code blocks and regular markdown text
  const renderContent = (content: string) => {
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Text before the code block
      if (match.index > lastIndex) {
        const textBefore = content.substring(lastIndex, match.index);
        parts.push(renderMarkdownText(textBefore, `text-${lastIndex}`));
      }

      const language = match[1] || 'plaintext';
      const code = match[2] || '';
      parts.push(
        <CodeBlock
          key={`code-${match.index}`}
          language={language}
          code={code}
        />
      );

      lastIndex = match.index + match[0].length;
    }

    // Remaining text after last code block
    if (lastIndex < content.length) {
      const remainingText = content.substring(lastIndex);
      parts.push(renderMarkdownText(remainingText, `text-${lastIndex}`));
    }

    return parts;
  };

  // Basic markdown text styling: headers, lists, inline code, bold
  const renderMarkdownText = (text: string, keyPrefix: string) => {
    const lines = text.split('\n');
    return (
      <div key={keyPrefix} className="space-y-2 leading-relaxed">
        {lines.map((line, idx) => {
          // Empty line
          if (!line.trim()) {
            return <div key={`${keyPrefix}-${idx}`} className="h-1" />;
          }

          // Headers
          if (line.startsWith('### ')) {
            return (
              <h4 key={`${keyPrefix}-${idx}`} className="text-sm font-bold text-slate-100 mt-2 mb-1">
                {formatInline(line.replace('### ', ''))}
              </h4>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h3 key={`${keyPrefix}-${idx}`} className="text-base font-bold text-slate-100 mt-3 mb-1">
                {formatInline(line.replace('## ', ''))}
              </h3>
            );
          }
          if (line.startsWith('# ')) {
            return (
              <h2 key={`${keyPrefix}-${idx}`} className="text-lg font-bold text-slate-100 mt-4 mb-2">
                {formatInline(line.replace('# ', ''))}
              </h2>
            );
          }

          // Bullet list items
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <div key={`${keyPrefix}-${idx}`} className="flex items-start gap-2 pl-2">
                <span className="text-indigo-400 mt-1 select-none text-xs">•</span>
                <span className="flex-1">{formatInline(line.substring(2))}</span>
              </div>
            );
          }

          // Numbered list
          const numMatch = line.match(/^(\d+)\.\s(.*)/);
          if (numMatch) {
            return (
              <div key={`${keyPrefix}-${idx}`} className="flex items-start gap-2 pl-2">
                <span className="text-indigo-400 select-none text-xs font-mono font-medium">
                  {numMatch[1]}.
                </span>
                <span className="flex-1">{formatInline(numMatch[2])}</span>
              </div>
            );
          }

          return <p key={`${keyPrefix}-${idx}`}>{formatInline(line)}</p>;
        })}
      </div>
    );
  };

  // Helper for inline formatting: `code`, **bold**
  const formatInline = (text: string): React.ReactNode => {
    // Split by `inline code`
    const inlineCodeRegex = /`([^`]+)`/g;
    const tokens: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = inlineCodeRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        tokens.push(formatBold(text.substring(lastIndex, match.index)));
      }
      tokens.push(
        <code
          key={`code-${match.index}`}
          className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs text-emerald-300 mx-0.5"
        >
          {match[1]}
        </code>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      tokens.push(formatBold(text.substring(lastIndex)));
    }

    return tokens;
  };

  const formatBold = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-slate-100">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div
      className={`group flex items-start gap-3 py-3 px-2 rounded-xl transition-colors ${
        isAssistant ? 'bg-slate-900/40' : 'bg-transparent'
      }`}
    >
      {/* Role Avatar */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
          isAssistant
            ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white'
            : 'bg-slate-800 text-slate-200 border border-slate-700'
        }`}
      >
        {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>

      {/* Message Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">
              {isAssistant ? 'AI Assistant' : 'You'}
            </span>
            {message.isVoiceInput && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                <Mic className="w-2.5 h-2.5" />
                Spoken
              </span>
            )}
            {message.mode === 'code' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                <Terminal className="w-2.5 h-2.5 text-indigo-400" />
                Code Mode
              </span>
            )}
            <span className="text-[10px] text-slate-500">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Action Toolbar for assistant responses */}
          {isAssistant && (
            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleToggleSpeak}
                className={`p-1.5 rounded text-xs transition-colors ${
                  isPlaying
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title={isPlaying ? 'Stop reading' : 'Read aloud with voice'}
              >
                {isPlaying ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleCopyMessage}
                className="p-1.5 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title="Copy entire response"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        {/* Message Content */}
        <div className="text-slate-300 text-sm overflow-hidden">
          {renderContent(message.content)}
        </div>
      </div>
    </div>
  );
};
