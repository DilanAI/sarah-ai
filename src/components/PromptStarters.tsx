import React from 'react';
import { AppMode } from '../types';
import { Code2, Sparkles, Cpu, Bug, FileCode, Wand2, Lightbulb, MessageSquare } from 'lucide-react';

interface PromptStartersProps {
  mode: AppMode;
  onSelectPrompt: (prompt: string, targetMode?: AppMode) => void;
}

export const PromptStarters: React.FC<PromptStartersProps> = ({ mode, onSelectPrompt }) => {
  const codeStarters = [
    {
      icon: <FileCode className="w-4 h-4 text-emerald-400" />,
      title: 'Next.js 15 API Route',
      prompt: 'Write a secure Next.js 15 App Router API route with rate limiting, input validation using Zod, and error handling.',
      tag: 'Next.js / TypeScript',
    },
    {
      icon: <Bug className="w-4 h-4 text-amber-400" />,
      title: 'Debug & Refactor',
      prompt: 'Analyze this code snippet for memory leaks, race conditions, and performance bottlenecks, then provide an optimized refactored version.',
      tag: 'Optimization',
    },
    {
      icon: <Cpu className="w-4 h-4 text-cyan-400" />,
      title: 'Write Unit Tests',
      prompt: 'Generate comprehensive unit tests covering edge cases, happy paths, and error scenarios using Vitest or Jest.',
      tag: 'Testing',
    },
    {
      icon: <Code2 className="w-4 h-4 text-indigo-400" />,
      title: 'Database Schema & Queries',
      prompt: 'Design a clean, normalized relational PostgreSQL schema with indexes and type-safe Drizzle ORM definitions for a multi-tenant app.',
      tag: 'Architecture',
    },
  ];

  const generalStarters = [
    {
      icon: <Lightbulb className="w-4 h-4 text-amber-400" />,
      title: 'Brainstorm Solutions',
      prompt: 'Give me 5 innovative product ideas and architectural strategies to solve slow AI API latency.',
      tag: 'Strategy',
    },
    {
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
      title: 'Deep Concept Explanation',
      prompt: 'Explain the difference between Server Actions and Route Handlers in Next.js with practical pros and cons.',
      tag: 'Learning',
    },
    {
      icon: <Wand2 className="w-4 h-4 text-pink-400" />,
      title: 'Draft Executive Summary',
      prompt: 'Draft an executive briefing summarizing why server-side API key proxying is required for enterprise web apps.',
      tag: 'Communication',
    },
    {
      icon: <MessageSquare className="w-4 h-4 text-blue-400" />,
      title: 'Open Dialogue',
      prompt: 'Help me plan the step-by-step roadmap for launching my AI SaaS application from prototype to production.',
      tag: 'Planning',
    },
  ];

  const starters = mode === 'code' ? codeStarters : generalStarters;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 mb-3">
        {mode === 'code' ? (
          <>
            <Code2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Coding & Engineering Mode</span>
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>General Knowledge & Reasoning Mode</span>
          </>
        )}
      </div>

      <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 mb-2">
        {mode === 'code' ? 'Ready to build, refactor, and debug' : 'What would you like to explore today?'}
      </h2>
      <p className="text-sm text-slate-400 max-w-lg mx-auto mb-6">
        Ask via text or tap the microphone to speak naturally. Select a starter prompt below or enter your own query.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
        {starters.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelectPrompt(item.prompt)}
            className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-slate-800 border border-slate-700/80 group-hover:scale-105 transition-transform">
                  {item.icon}
                </div>
                <span className="text-xs font-semibold text-slate-200 group-hover:text-white">
                  {item.title}
                </span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                {item.tag}
              </span>
            </div>
            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {item.prompt}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
