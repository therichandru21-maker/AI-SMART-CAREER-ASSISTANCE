import React from 'react';
import { AlignLeft, Clock, Hash, Zap } from 'lucide-react';

interface StatsBarProps {
  text: string;
  className?: string;
}

export const StatsBar: React.FC<StatsBarProps> = ({ text, className = '' }) => {
  const characters = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.ceil(words / 200));
  const estimatedTokens = Math.ceil(characters / 4);

  return (
    <div className={`flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 ${className}`}>
      <span className="flex items-center space-x-1">
        <AlignLeft className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        <span><strong className="font-semibold text-slate-700 dark:text-slate-200">{words.toLocaleString()}</strong> words</span>
      </span>
      <span className="text-slate-300 dark:text-slate-700">•</span>
      <span className="flex items-center space-x-1">
        <Hash className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        <span><strong className="font-semibold text-slate-700 dark:text-slate-200">{characters.toLocaleString()}</strong> chars</span>
      </span>
      <span className="text-slate-300 dark:text-slate-700">•</span>
      <span className="flex items-center space-x-1">
        <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        <span>~<strong className="font-semibold text-slate-700 dark:text-slate-200">{readingTime}</strong> min read</span>
      </span>
      <span className="text-slate-300 dark:text-slate-700">•</span>
      <span className="flex items-center space-x-1 text-indigo-600 dark:text-indigo-400">
        <Zap className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
        <span>~{estimatedTokens.toLocaleString()} tokens</span>
      </span>
    </div>
  );
};
