import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  RefreshCw, 
  Copy, 
  Check, 
  CheckSquare, 
  Square, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  Tag, 
  Gauge, 
  FileSearch,
  BookOpen,
  ArrowRight,
  Filter
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { AnalysisResponse, SampleDocument } from '../types';
import { FileUploader } from './FileUploader';
import { StatsBar } from './StatsBar';

interface AnalyzerViewProps {
  initialText?: string;
  samples: SampleDocument[];
  onSendToChat?: (question: string, contextDoc: string) => void;
}

export const AnalyzerView: React.FC<AnalyzerViewProps> = ({
  initialText = '',
  samples,
  onSendToChat,
}) => {
  const [inputText, setInputText] = useState(initialText);
  const [attachedFile, setAttachedFile] = useState<{ name: string; mimeType?: string; data?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Record<number, boolean>>({});
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!inputText.trim() && !attachedFile?.data) {
      setError('Please provide text or upload a document to inspect.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          imagePart: attachedFile?.data && attachedFile.mimeType ? {
            mimeType: attachedFile.mimeType,
            data: attachedFile.data,
          } : undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Analysis failed' }));
        throw new Error(errData.error || `Server error: ${res.status}`);
      }

      const data: AnalysisResponse = await res.json();
      setAnalysis(data);
      setCompletedTasks({});
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to complete document analysis.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTask = (index: number) => {
    setCompletedTasks(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleExportJSON = () => {
    if (!analysis) return;
    const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document-analysis-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Sentiment color logic
  const getSentimentBadge = (sentiment: string, score: number) => {
    if (score >= 65 || sentiment === 'positive') {
      return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Positive', bar: 'bg-emerald-500' };
    }
    if (score <= 35 || sentiment === 'negative') {
      return { bg: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Negative / Critical', bar: 'bg-rose-500' };
    }
    return { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Neutral / Balanced', bar: 'bg-amber-500' };
  };

  const entityTypes = analysis?.entities 
    ? Array.from(new Set(analysis.entities.map(e => e.type)))
    : [];

  const filteredEntities = analysis?.entities.filter(e => 
    entityFilter === 'all' || e.type === entityFilter
  ) || [];

  return (
    <div id="analyzer-view" className="space-y-6">
      {/* Top Header & Actions */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Document Analysis</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Evaluate tone, sentiment, readability index, named entities, and actionable directives.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {inputText && (
            <button
              onClick={() => {
                setInputText('');
                setAttachedFile(null);
                setAnalysis(null);
              }}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Clear
            </button>
          )}
          <button
            id="btn-run-analysis"
            onClick={handleAnalyze}
            disabled={isLoading || (!inputText.trim() && !attachedFile?.data)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-lg text-sm font-medium shadow-xs shadow-indigo-200 dark:shadow-none transition cursor-pointer flex items-center gap-1.5 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Analyzing...</span>
              </>
            ) : (
              <span>Run Analysis</span>
            )}
          </button>
        </div>
      </header>

      {/* Quick Test Presets Pill Bar */}
      <div className="flex flex-wrap items-center gap-2 pb-1">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Quick Presets:</span>
        {samples.map((sample) => (
          <button
            key={sample.id}
            onClick={() => {
              setInputText(sample.text);
              setAttachedFile(null);
              setAnalysis(null);
            }}
            className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-300 text-slate-600 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-800 transition cursor-pointer"
          >
            {sample.title}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Source */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col space-y-3 transition-colors">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Source Input
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                {inputText.trim() ? `${inputText.trim().split(/\s+/).length} Words` : 'Empty'}
              </span>
            </div>

            {/* Document Uploader */}
            <FileUploader
              onFileLoaded={(content, fileName, imgPart) => {
                if (content) setInputText(content);
                setAttachedFile({ name: fileName, ...imgPart });
              }}
              onClearFile={() => setAttachedFile(null)}
              attachedFileName={attachedFile?.name}
            />

            {/* Textarea */}
            <textarea
              id="analyzer-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste content to inspect sentiment, grammar, style, key entities, and action directives..."
              rows={12}
              className="w-full text-xs text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono leading-relaxed resize-y"
            />

            <StatsBar text={inputText} />

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Analysis Dashboard */}
        <div className="lg:col-span-7 space-y-4">
          {!analysis && !isLoading && (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-10 border border-slate-200 dark:border-slate-800 shadow-xs text-center flex flex-col items-center justify-center min-h-[420px] transition-colors">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                <FileSearch className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Ready for Document Analysis</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                Provide text or select a preset to generate deep linguistic, sentiment, entity, and operational metrics.
              </p>
              <button
                onClick={() => {
                  if (samples[1]) {
                    setInputText(samples[1].text);
                    setAttachedFile(null);
                  }
                }}
                className="mt-4 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-300 text-xs font-medium border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              >
                Load Sample & Test
              </button>
            </div>
          )}

          {isLoading && (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 min-h-[420px] flex flex-col justify-center transition-colors">
              <div className="flex items-center space-x-3 text-indigo-600 dark:text-indigo-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-xs font-semibold tracking-wide uppercase">Inspecting linguistic structure with Gemini...</span>
              </div>
              <div className="space-y-3 animate-pulse">
                <div className="grid grid-cols-3 gap-3">
                  <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                  <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                  <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                </div>
                <div className="h-28 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                <div className="h-36 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
              </div>
            </div>
          )}

          {analysis && !isLoading && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Metric Gauges Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Sentiment Meter */}
                {(() => {
                  const badge = getSentimentBadge(analysis.sentiment, analysis.sentimentScore);
                  return (
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 transition-colors">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <span>Sentiment Meter</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="text-xl font-bold text-slate-900 dark:text-white">{analysis.sentimentScore}%</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">Score (0-100)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${badge.bar}`} style={{ width: `${analysis.sentimentScore}%` }}></div>
                      </div>
                    </div>
                  );
                })()}

                {/* Overall Tone */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1 transition-colors">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span>Linguistic Tone</span>
                    <Gauge className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-1">{analysis.overallTone}</div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Voice & formality style</p>
                </div>

                {/* Readability Score */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1 transition-colors">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span>Readability Level</span>
                    <BookOpen className="w-3.5 h-3.5 text-purple-500" />
                  </div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-1">{analysis.readabilityLevel}</div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Complexity assessment</p>
                </div>
              </div>

              {/* Strategic Insights Card in Deep Indigo */}
              <div className="bg-indigo-900 dark:bg-indigo-950/80 text-white rounded-xl p-5 shadow-xl space-y-2 relative overflow-hidden border dark:border-indigo-900/50">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Executive Insights & Dynamics</span>
                    </span>
                    <button
                      onClick={handleExportJSON}
                      className="text-xs text-indigo-200 hover:text-white flex items-center space-x-1 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export JSON</span>
                    </button>
                  </div>
                  <p className="text-xs text-indigo-100 leading-relaxed">{analysis.insights}</p>
                </div>
                <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-indigo-500 rounded-full blur-[80px] opacity-20 pointer-events-none"></div>
              </div>

              {/* Key Topics & Strengths */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Core Topics */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5 transition-colors">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block">
                    Key Topics & Themes
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.keyTopics.map((topic, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-100 dark:border-indigo-900/40">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Key Strengths */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5 transition-colors">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block">
                    Document Strengths
                  </span>
                  <ul className="space-y-1.5">
                    {analysis.strengths.map((strength, i) => (
                      <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Named Entity & Concept Explorer */}
              {analysis.entities && analysis.entities.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Extracted Entities ({filteredEntities.length})
                    </span>
                    
                    {/* Entity Filter Pills */}
                    {entityTypes.length > 1 && (
                      <div className="flex flex-wrap items-center gap-1 text-[11px]">
                        <span className="text-slate-400 dark:text-slate-500 flex items-center mr-1">
                          <Filter className="w-3 h-3 mr-0.5" /> Filter:
                        </span>
                        <button
                          onClick={() => setEntityFilter('all')}
                          className={`px-2 py-0.5 rounded cursor-pointer ${
                            entityFilter === 'all' ? 'bg-indigo-600 text-white font-medium' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          All
                        </button>
                        {entityTypes.map((type) => (
                          <button
                            key={type}
                            onClick={() => setEntityFilter(type)}
                            className={`px-2 py-0.5 rounded cursor-pointer ${
                              entityFilter === type ? 'bg-indigo-600 text-white font-medium' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                    {filteredEntities.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium capitalize border dark:border-indigo-800/40">
                            {item.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Items Interactive Checklist */}
              {analysis.actionItems && analysis.actionItems.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Extracted Action Items & Directives
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {Object.values(completedTasks).filter(Boolean).length} / {analysis.actionItems.length} Done
                    </span>
                  </div>

                  <div className="space-y-2">
                    {analysis.actionItems.map((item, idx) => {
                      const isDone = Boolean(completedTasks[idx]);
                      const priorityColor = item.priority === 'high' 
                        ? 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/50' 
                        : item.priority === 'medium'
                        ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';

                      return (
                        <div 
                          key={idx} 
                          onClick={() => toggleTask(idx)}
                          className={`p-3 rounded-lg border flex items-start space-x-3 transition cursor-pointer ${
                            isDone ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60' : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                          }`}
                        >
                          <button type="button" className="mt-0.5 text-indigo-600 dark:text-indigo-400 focus:outline-none cursor-pointer">
                            {isDone ? <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Square className="w-4 h-4 text-slate-400" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-medium ${isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                                {item.task}
                              </span>
                              <div className="flex items-center space-x-1.5 ml-2">
                                {item.owner && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium">
                                    @{item.owner}
                                  </span>
                                )}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase border ${priorityColor}`}>
                                  {item.priority}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Grammar & Style Improvement Suggestions */}
              {analysis.suggestions && analysis.suggestions.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Writing Polish & Optimization Suggestions
                    </span>
                  </div>

                  <div className="space-y-3">
                    {analysis.suggestions.map((sug, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {sug.type}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">{sug.explanation}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded bg-red-50/60 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 text-red-900 dark:text-red-300">
                            <span className="text-[10px] font-bold text-red-500 block mb-0.5">Original:</span>
                            "{sug.original}"
                          </div>
                          <div className="p-2 rounded bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300">
                            <span className="text-[10px] font-bold text-emerald-600 block mb-0.5">Suggested Revision:</span>
                            "{sug.suggested}"
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
