import React, { useState } from 'react';
import {
  Zap,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  ArrowRight,
  Languages,
  Table,
  CheckSquare,
  Smile,
  Briefcase,
  List,
  Wrench,
  ArrowLeftRight
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { QuickTransformRequest } from '../types';
import { StatsBar } from './StatsBar';

export const QuickTransformView: React.FC = () => {
  const [inputText, setInputText] = useState(
    `hey team, we was reviewing the server logs yesterday and noticed that when user logins from mobile they get error 500 about 4% of the times. we should probably fix this before next sprint and also update the database schema so customers dont complain.`
  );

  const [selectedAction, setSelectedAction] =
    useState<QuickTransformRequest['action']>('fix_grammar');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const tools: {
    id: QuickTransformRequest['action'];
    label: string;
    icon: any;
    desc: string;
    category: string;
  }[] = [
    {
      id: 'fix_grammar',
      label: 'Fix Grammar & Typos',
      icon: Wrench,
      desc: 'Correct syntax, punctuation and spelling',
      category: 'Polish'
    },
    {
      id: 'bulletify',
      label: 'Convert to Bullets',
      icon: List,
      desc: 'Transform messy paragraphs into structured lists',
      category: 'Structure'
    },
    {
      id: 'make_formal',
      label: 'Make Formal & Executive',
      icon: Briefcase,
      desc: 'Elevate tone for corporate leadership',
      category: 'Tone'
    },
    {
      id: 'simplify_eli5',
      label: "Explain Like I'm 5",
      icon: Smile,
      desc: 'Simplify complex jargon into plain English',
      category: 'Clarity'
    },
    {
      id: 'to_table',
      label: 'Convert to Markdown Table',
      icon: Table,
      desc: 'Structure comparisons or raw data into a table',
      category: 'Structure'
    },
    {
      id: 'extract_checklist',
      label: 'Extract Action Checklist',
      icon: CheckSquare,
      desc: 'Isolate actionable todos with checkboxes',
      category: 'Action'
    },
    {
      id: 'translate_es',
      label: 'Translate: Spanish',
      icon: Languages,
      desc: 'Accurate and natural Spanish translation',
      category: 'Translate'
    },
    {
      id: 'translate_fr',
      label: 'Translate: French',
      icon: Languages,
      desc: 'Fluent French translation',
      category: 'Translate'
    },
    {
      id: 'translate_de',
      label: 'Translate: German',
      icon: Languages,
      desc: 'Professional German translation',
      category: 'Translate'
    },
    {
      id: 'translate_ja',
      label: 'Translate: Japanese',
      icon: Languages,
      desc: 'Polite Japanese translation',
      category: 'Translate'
    }
  ];

  const handleTransform = async (
    actionToRun?: QuickTransformRequest['action']
  ) => {
    const action = actionToRun || selectedAction;

    if (!inputText.trim()) {
      setError('Please provide text to transform.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSelectedAction(action);

    try {
      const res = await fetch('/api/OpenAi/transform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: inputText,
          action
        })
      });

      if (!res.ok) {
        const errData = await res
          .json()
          .catch(() => ({
            error: 'Transformation failed'
          }));

        throw new Error(
          errData.error ||
            `Server responded with status ${res.status}`
        );
      }

      const data = await res.json();
      setResultText(data.transformedText);
    } catch (err: any) {
      console.error(err);
      setError(
        err.message || 'Transformation failed.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyResult = () => {
    if (!resultText) return;

    navigator.clipboard.writeText(resultText);
    setCopied(true);

    setTimeout(() => setCopied(false), 2000);
  };

  const applyAsInput = () => {
    if (!resultText) return;

    setInputText(resultText);
    setResultText(null);
  };

  return (
    <div
      id="quick-transform-view"
      className="w-full min-w-0 max-w-full space-y-6 overflow-x-hidden"
    >
      {/* Top Header & Actions */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 min-w-0">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Text Transformation
          </h2>

          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5 break-words">
            One-click utility tools to refine, restructure, format, and translate content.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {inputText && (
            <button
              onClick={() => {
                setInputText('');
                setResultText(null);
              }}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Clear
            </button>
          )}

          <button
            onClick={() => handleTransform(selectedAction)}
            disabled={isLoading || !inputText.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-lg text-sm font-medium shadow-xs shadow-indigo-200 dark:shadow-none transition cursor-pointer flex items-center gap-1.5 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Transforming...</span>
              </>
            ) : (
              <span>Run Transformation</span>
            )}
          </button>
        </div>
      </header>

      {/* Tool Selector Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 min-w-0">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isSelected = selectedAction === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => handleTransform(tool.id)}
              className={`min-w-0 p-3 rounded-lg border text-left flex flex-col justify-between space-y-2 transition cursor-pointer ${
                isSelected
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-semibold shadow-2xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium'
              }`}
            >
              <div className="flex items-center justify-between gap-2 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isSelected
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                />

                <span
                  className={`min-w-0 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded ${
                    isSelected
                      ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {tool.category}
                </span>
              </div>

              <div className="min-w-0">
                <div className="text-xs break-words">
                  {tool.label}
                </div>

                <div
                  className={`text-[10px] line-clamp-1 mt-0.5 ${
                    isSelected
                      ? 'text-indigo-600/80 dark:text-indigo-300/80'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {tool.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Input / Output Transformation Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
        {/* Input Pane */}
        <div className="lg:col-span-6 min-w-0 space-y-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col space-y-3 transition-colors min-w-0">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800 min-w-0">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest shrink-0">
                Source Content
              </span>

              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium text-right break-words min-w-0">
                Action:{' '}
                {tools.find(
                  (t) => t.id === selectedAction
                )?.label}
              </span>
            </div>

            <textarea
              id="quick-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste any text to transform instantly..."
              rows={10}
              className="w-full min-w-0 max-w-full text-xs text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono leading-relaxed resize-y"
            />

            <StatsBar text={inputText} />

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 break-words [overflow-wrap:anywhere]">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Output Pane */}
        <div className="lg:col-span-6 min-w-0 space-y-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3 min-h-[380px] flex flex-col transition-colors min-w-0">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800 min-w-0">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest shrink-0">
                Transformed Output
              </span>

              {resultText && (
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={applyAsInput}
                    className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center space-x-1 transition cursor-pointer font-medium"
                    title="Move output to input for chaining transformations"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                    <span>Use as Input</span>
                  </button>

                  <button
                    onClick={copyResult}
                    className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center space-x-1 transition cursor-pointer font-medium"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}

                    <span>
                      {copied ? 'Copied' : 'Copy'}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Content Display */}
            <div className="flex-1 flex flex-col justify-center min-w-0 max-w-full overflow-hidden">
              {!resultText && !isLoading && (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500 space-y-2">
                  <Zap className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600" />

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Select any transformation tool above to execute.
                  </p>
                </div>
              )}

              {isLoading && (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-600 dark:text-indigo-400" />

                  <p className="text-xs font-medium">
                    Transforming syntax with OpenAi...
                  </p>
                </div>
              )}

              {resultText && !isLoading && (
                <div className="space-y-3 animate-in fade-in duration-150 min-w-0 max-w-full">
                  <div className="w-full min-w-0 max-w-full max-h-[300px] overflow-y-auto overflow-x-auto p-4 rounded-lg bg-slate-50/50 dark:bg-slate-800/40 text-xs text-slate-800 dark:text-slate-100 leading-relaxed font-sans border border-slate-100 dark:border-slate-800">
                    <div className="w-full min-w-0 max-w-full whitespace-normal break-words [overflow-wrap:anywhere]">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => (
                            <p className="whitespace-normal break-words [overflow-wrap:anywhere] max-w-full">
                              {children}
                            </p>
                          ),

                          li: ({ children }) => (
                            <li className="whitespace-normal break-words [overflow-wrap:anywhere]">
                              {children}
                            </li>
                          ),

                          pre: ({ children }) => (
                            <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words">
                              {children}
                            </pre>
                          ),

                          table: ({ children }) => (
                            <div className="max-w-full overflow-x-auto">
                              <table className="w-full">
                                {children}
                              </table>
                            </div>
                          )
                        }}
                      >
                        {resultText}
                      </ReactMarkdown>
                    </div>
                  </div>

                  <StatsBar text={resultText} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};