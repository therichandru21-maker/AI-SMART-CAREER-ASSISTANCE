import React from 'react';
import { 
  FileText, 
  Search, 
  PenTool, 
  MessageSquare, 
  Zap, 
  FolderOpen, 
  BookOpen,
  BriefcaseBusiness
} from 'lucide-react';
import { ActiveTab, SampleDocument } from '../types';
import { SAMPLE_DOCUMENTS } from '../data/sampleData';
import { ThemeToggle } from './ThemeToggle';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onLoadSample: (sample: SampleDocument) => void;
  onOpenDocs: () => void;
  isApiHealthy: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onLoadSample,
  onOpenDocs,
  isApiHealthy,
}) => {
  const tabs = [
    { id: 'summarizer' as ActiveTab, label: 'Text Summarization', icon: FileText },
    { id: 'analyzer' as ActiveTab, label: 'Document Analysis', icon: Search },
    { id: 'generator' as ActiveTab, label: 'Content Generation', icon: PenTool },
    { id: 'chat' as ActiveTab, label: 'Question Answering', icon: MessageSquare },
    { id: 'quick-tools' as ActiveTab, label: 'Quick Tools', icon: Zap },
    { id: 'career' as ActiveTab, label: 'Career Assistant', icon: BriefcaseBusiness },
  ];

  return (
    <header id="app-header" className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 shadow-xs transition-colors">
      {/* Top Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-xs">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">
              SmartAssist <span className="text-indigo-600 dark:text-indigo-400">AI</span>
            </span>
          </div>

          {/* Right Status Badges & Action Controls */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Gemini Live Status Pill */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300">
              {isApiHealthy ? (
                <>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span>gemini-3.7-flash Connected</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  <span>Connecting...</span>
                </>
              )}
            </div>

            {/* Quick Sample Presets Dropdown */}
            <div className="relative group hidden sm:block">
              <button
                id="btn-load-sample"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
                title="Load realistic business and tech samples"
              >
                <FolderOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Samples</span>
              </button>

              <div className="absolute right-0 mt-1 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 hidden group-hover:block hover:block z-50 animate-in fade-in duration-100">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                  Quick-Load Presets
                </div>
                {SAMPLE_DOCUMENTS.map((sample) => (
                  <button
                    key={sample.id}
                    id={`sample-item-${sample.id}`}
                    onClick={() => onLoadSample(sample)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 hover:text-indigo-900 dark:hover:text-indigo-200 text-slate-700 dark:text-slate-300 transition flex flex-col space-y-0.5 cursor-pointer"
                  >
                    <span className="font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                      {sample.title}
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize font-medium">{sample.category}</span>
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{sample.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Project Specs Button */}
            <button
              id="btn-open-docs"
              onClick={onOpenDocs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
              title="View Project Specifications"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden md:inline">Docs</span>
            </button>

            {/* Theme Toggle Button */}
            <ThemeToggle />

            {/* User Avatar */}
            <div className="flex items-center gap-3 text-xs font-medium">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 shadow-2xs"
                alt="User"
              />
            </div>
          </div>
        </div>

        {/* Function Navigation Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-2 border-t border-slate-100 dark:border-slate-800 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

