import React, { useState } from 'react';
import {
  PenTool,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Download,
  Mail,
  FileText,
  Calendar,
  Bug,
  Rocket,
  Share2,
  Code,
  Lightbulb,
  Clock,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ContentGenRequest, ContentGenResponse } from '../types';
import { StatsBar } from './StatsBar';

interface ContentStudioViewProps {
  onSendToChat?: (question: string, contextDoc: string) => void;
}

export const ContentStudioView: React.FC<ContentStudioViewProps> = ({
  onSendToChat,
}) => {
  const [template, setTemplate] =
    useState<ContentGenRequest['template']>('email');

  const [topic, setTopic] = useState('');
  const [keyPoints, setKeyPoints] = useState('');

  const [tone, setTone] =
    useState<ContentGenRequest['tone']>('professional');

  const [length, setLength] =
    useState<ContentGenRequest['length']>('standard');

  const [audience, setAudience] =
    useState('Enterprise Executives & Stakeholders');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] =
    useState<ContentGenResponse | null>(null);

  const [copied, setCopied] = useState(false);

  const templates = [
    {
      id: 'email',
      label: 'Business Email',
      icon: Mail,
      desc: 'Polished client/team correspondence',
    },
    {
      id: 'article',
      label: 'Article / Post',
      icon: FileText,
      desc: 'Structured blog or thought piece',
    },
    {
      id: 'agenda',
      label: 'Meeting Agenda',
      icon: Calendar,
      desc: 'Timed objectives & preparation',
    },
    {
      id: 'bug_report',
      label: 'Bug Report',
      icon: Bug,
      desc: 'Detailed reproduction & severity',
    },
    {
      id: 'pitch',
      label: 'Pitch Deck',
      icon: Rocket,
      desc: 'Problem, solution, ROI & CTA',
    },
    {
      id: 'social_post',
      label: 'Social / LinkedIn',
      icon: Share2,
      desc: 'Hook, value points & hashtags',
    },
    {
      id: 'code',
      label: 'Code Spec',
      icon: Code,
      desc: 'Architecture, clean code & docs',
    },
    {
      id: 'freeform',
      label: 'Custom Freeform',
      icon: PenTool,
      desc: 'Flexible creative drafting',
    },
  ];

  const quickTopicSuggestions: Record<
    string,
    {
      topic: string;
      keyPoints: string;
      audience: string;
    }
  > = {
    email: {
      topic:
        'Request budget approval for Q4 Cloud Infrastructure scaling',
      keyPoints:
        '- 35% user growth requiring 2 extra GPU inference clusters\n- Estimated cost: $12,400/month\n- Projected payback period: 3 months with 99.99% SLA guarantee',
      audience: 'Chief Financial Officer & VP Infrastructure',
    },

    article: {
      topic:
        'The Shift to Hybrid AI Workflows in Enterprise Productivity for 2026',
      keyPoints:
        '- Real-time multi-turn agents vs batch summarizers\n- Security boundaries: Server-side token isolation\n- Measuring tangible productivity ROI in knowledge worker hours',
      audience: 'Product Managers & Engineering Leaders',
    },

    agenda: {
      topic:
        'Weekly Product Strategy & Sprint Prioritization Sync',
      keyPoints:
        '- Review last sprint velocity and QA blockers (15 min)\n- Walkthrough AI Smart Assistant UX overhaul (20 min)\n- Q4 feature roadmap vote & assignments (25 min)',
      audience: 'Core Engineering & Design Team',
    },

    bug_report: {
      topic:
        'Memory leak and socket reconnect loop on mobile client disconnect',
      keyPoints:
        '- Occurs when network transitions from WiFi to LTE\n- CPU spike to 95% on background daemon\n- Steps: launch app, toggle airplane mode 3 times',
      audience: 'Backend & Mobile Infrastructure Engineers',
    },

    pitch: {
      topic:
        'AI Smart Assistant: Unified Knowledge Worker Co-Pilot',
      keyPoints:
        '- Problem: 4.2 hours wasted daily manually parsing memos and writing updates\n- Solution: Instant summarization, deep document inspection, and template studio\n- Business Model: $29/seat/mo B2B SaaS with 82% margin',
      audience:
        'Early Stage Venture Capitalists & Angel Investors',
    },

    social_post: {
      topic:
        'Announcing our new AI Smart Assistant platform powered by OpenAI',
      keyPoints:
        '- Fast response times for deep document analysis\n- 100% server-side token security\n- Open source template for developer productivity',
      audience:
        'Software Engineers, Founders & AI Enthusiasts',
    },

    code: {
      topic:
        'TypeScript middleware for caching OpenAI API responses with TTL and hash keys',
      keyPoints:
        '- In-memory LRU cache or Redis support\n- SHA-256 hash generation of prompt & system instruction\n- Cache-Control headers and cache hit telemetry',
      audience:
        'Senior Fullstack TypeScript Developers',
    },

    freeform: {
      topic:
        'Write a persuasive memo proposing a 4-day work week pilot program',
      keyPoints:
        '- Productivity data from UK and Japanese trials\n- Clear KPI metrics for client satisfaction and feature delivery\n- 6-month trial with bi-weekly retrospectives',
      audience:
        'Executive Committee & HR Leadership',
    },
  };

  const loadSuggestion = (templateKey: string) => {
    const sug = quickTopicSuggestions[templateKey];

    if (sug) {
      setTopic(sug.topic);
      setKeyPoints(sug.keyPoints);
      setAudience(sug.audience);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please provide a topic or prompt.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload: ContentGenRequest = {
        template,
        topic,
        keyPoints,
        tone,
        length,
        audience,
      };

      /*
       * Backend route remains /api/OpenAi/generate for compatibility
       * with the existing server route.
       *
       * The backend itself should use OpenAI.
       */
      const res = await fetch('/api/OpenAi/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res
          .json()
          .catch(() => ({
            error: 'Generation failed',
          }));

        throw new Error(
          errData.error ||
            `Server responded with status ${res.status}`
        );
      }

      const data: ContentGenResponse = await res.json();

      setGeneratedResult(data);
    } catch (err: any) {
      console.error('Content Generation Error:', err);

      setError(
        err.message ||
          'Failed to generate content.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyContent = () => {
    if (!generatedResult) return;

    navigator.clipboard.writeText(
      generatedResult.content
    );

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const downloadMarkdown = () => {
    if (!generatedResult) return;

    const blob = new Blob(
      [generatedResult.content],
      {
        type: 'text/markdown',
      }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');

    a.href = url;

    a.download =
      `${template}-content-${Date.now()}.md`;

    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="content-studio-view"
      className="space-y-6"
    >
      {/* Top Header & Actions */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Content Generation
          </h2>

          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Generate high-impact business correspondence,
            articles, meeting agendas, and technical specs
            with OpenAI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadSuggestion(template)}
            className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5"
          >
            <Lightbulb className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />

            <span>Sample Prompt</span>
          </button>

          <button
            id="btn-generate-content"
            onClick={handleGenerate}
            disabled={
              isLoading ||
              !topic.trim()
            }
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-lg text-sm font-medium shadow-xs shadow-indigo-200 dark:shadow-none transition cursor-pointer flex items-center gap-1.5 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />

                <span>
                  Drafting with OpenAI...
                </span>
              </>
            ) : (
              <span>
                Generate Content
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Template Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {templates.map((t) => {
          const Icon = t.icon;

          const isSelected =
            template === t.id;

          return (
            <button
              key={t.id}
              onClick={() => {
                setTemplate(t.id as any);

                if (!topic) {
                  loadSuggestion(t.id);
                }
              }}
              className={`p-2.5 rounded-lg border text-left flex flex-col items-center justify-center text-center space-y-1.5 transition cursor-pointer ${
                isSelected
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-semibold shadow-2xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isSelected
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              />

              <span className="text-xs leading-tight">
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Form Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col space-y-3 transition-colors">

            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Directives & Parameters
              </span>

              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium capitalize">
                Template:{' '}
                {template.replace('_', ' ')}
              </span>
            </div>

            {/* Topic */}
            <div>
              <label
                htmlFor="topic-input"
                className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1"
              >
                Topic & Core Directive
              </label>

              <input
                id="topic-input"
                type="text"
                value={topic}
                onChange={(e) =>
                  setTopic(e.target.value)
                }
                placeholder="e.g. Request budget approval for Q4 Cloud Infrastructure scaling..."
                className="w-full text-xs text-slate-800 dark:text-slate-100 bg-slate-50/60 dark:bg-slate-800/60 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
              />
            </div>

            {/* Key Points */}
            <div>
              <label
                htmlFor="keypoints-input"
                className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1"
              >
                Key Points / Requirements
                (Optional)
              </label>

              <textarea
                id="keypoints-input"
                value={keyPoints}
                onChange={(e) =>
                  setKeyPoints(e.target.value)
                }
                placeholder={
                  '- 20% latency reduction\n- New SOC2 compliance cert\n- Action item: Schedule client training'
                }
                rows={4}
                className="w-full text-xs text-slate-800 dark:text-slate-100 bg-slate-50/60 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono resize-y"
              />
            </div>

            {/* Customization */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">

              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                Tone & Target Audience
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs">

                {/* Tone */}
                <div>
                  <label
                    htmlFor="tone-select"
                    className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1"
                  >
                    Tone & Persona
                  </label>

                  <select
                    id="tone-select"
                    value={tone}
                    onChange={(e: any) =>
                      setTone(e.target.value)
                    }
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="professional">
                      Professional & Authoritative
                    </option>

                    <option value="persuasive">
                      Persuasive & Compelling
                    </option>

                    <option value="casual">
                      Friendly & Conversational
                    </option>

                    <option value="enthusiastic">
                      Enthusiastic & High-Energy
                    </option>

                    <option value="technical">
                      Technical & Precision-Focused
                    </option>

                    <option value="urgent">
                      Urgent & Direct
                    </option>
                  </select>
                </div>

                {/* Length */}
                <div>
                  <label
                    htmlFor="content-length-select"
                    className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1"
                  >
                    Length
                  </label>

                  <select
                    id="content-length-select"
                    value={length}
                    onChange={(e: any) =>
                      setLength(e.target.value)
                    }
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="concise">
                      Concise & Snappy
                    </option>

                    <option value="standard">
                      Standard (~350 words)
                    </option>

                    <option value="in-depth">
                      In-Depth & Comprehensive
                    </option>
                  </select>
                </div>
              </div>

              {/* Audience */}
              <div>
                <label
                  htmlFor="content-audience-input"
                  className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1"
                >
                  Target Audience
                </label>

                <input
                  id="content-audience-input"
                  type="text"
                  value={audience}
                  onChange={(e) =>
                    setAudience(e.target.value)
                  }
                  placeholder="e.g. Enterprise Clients, Developers, Investors"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-7 space-y-4">

          {/* Empty State */}
          {!generatedResult &&
            !isLoading && (
              <div className="bg-white dark:bg-slate-900 rounded-xl p-10 border border-slate-200 dark:border-slate-800 shadow-xs text-center flex flex-col items-center justify-center min-h-[400px] transition-colors">

                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                  <PenTool className="w-6 h-6" />
                </div>

                <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                  Content Studio Ready
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                  Select a template above or click
                  "Sample Prompt" to generate emails,
                  agendas, or technical specs using
                  OpenAI.
                </p>
              </div>
            )}

          {/* Loading */}
          {isLoading && (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 min-h-[400px] flex flex-col justify-center transition-colors">

              <div className="flex items-center space-x-3 text-indigo-600 dark:text-indigo-400">
                <RefreshCw className="w-4 h-4 animate-spin" />

                <span className="text-xs font-semibold tracking-wide uppercase">
                  Composing content with OpenAI...
                </span>
              </div>

              <div className="space-y-3 animate-pulse">
                <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded w-2/3"></div>

                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full"></div>

                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-5/6"></div>

                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-4/5"></div>

                <div className="h-24 bg-slate-50 dark:bg-slate-800/50 rounded-lg w-full"></div>
              </div>
            </div>
          )}

          {/* Generated Result */}
          {generatedResult &&
            !isLoading && (
              <div className="space-y-4 animate-in fade-in duration-200">

                {/* Title & Metadata */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors">

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {generatedResult.title}
                      </h3>

                      <div className="flex items-center space-x-3 mt-1 text-[11px] text-slate-500 dark:text-slate-400">

                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />

                          <span>
                            {generatedResult.estimatedReadingTime}
                          </span>
                        </span>

                        <span>•</span>

                        <span className="capitalize">
                          {template.replace('_', ' ')}
                        </span>

                        <span>•</span>

                        <span className="capitalize">
                          {tone} tone
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">

                      <button
                        onClick={copyContent}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}

                        <span>
                          {copied
                            ? 'Copied'
                            : 'Copy'}
                        </span>
                      </button>

                      <button
                        onClick={downloadMarkdown}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />

                        <span>
                          Export .md
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Markdown */}
                  <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans prose-sm dark:prose-invert max-w-none bg-slate-50/50 dark:bg-slate-800/40 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                    <ReactMarkdown>
                      {generatedResult.content}
                    </ReactMarkdown>
                  </div>

                  <StatsBar
                    text={
                      generatedResult.content
                    }
                  />
                </div>

                {/* Tips & Tags */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  {/* Expert Tips */}
                  {generatedResult.tips &&
                    generatedResult.tips.length >
                      0 && (
                      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 transition-colors">

                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block">
                          Delivery & Impact Tips
                        </span>

                        <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">

                          {generatedResult.tips.map(
                            (tip, i) => (
                              <li
                                key={i}
                                className="flex items-start space-x-1.5"
                              >
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                                  •
                                </span>

                                <span className="leading-relaxed">
                                  {tip}
                                </span>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}

                  {/* Tags */}
                  {generatedResult.tags &&
                    generatedResult.tags.length >
                      0 && (
                      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 transition-colors">

                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block">
                          Suggested Tags
                        </span>

                        <div className="flex flex-wrap gap-1.5">
                          {generatedResult.tags.map(
                            (tag, i) => (
                              <span
                                key={i}
                                className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                              >
                                #
                                {tag.replace(
                                  /^#/,
                                  ''
                                )}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};