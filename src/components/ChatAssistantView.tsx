import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Sparkles, 
  RefreshCw, 
  User, 
  Bot, 
  Copy, 
  Check, 
  Trash2, 
  Download, 
  FileText, 
  Sliders, 
  Paperclip, 
  CornerDownLeft,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../types';

interface ChatAssistantViewProps {
  initialQuestion?: string;
  initialContext?: string;
}

export const ChatAssistantView: React.FC<ChatAssistantViewProps> = ({
  initialQuestion = '',
  initialContext = '',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `Hello! I am your **AI Smart Assistant** powered by Gemini 3.7 Flash.

I can help you with:
- **Answering questions** about complex documents, strategy, or code
- **Synthesizing insights** from long articles, transcripts, and reports
- **Brainstorming solutions**, drafting architecture specs, and prioritizing action items
- **Refining prose**, grammar, and executive rhetoric

*How can I accelerate your productivity today?*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedFollowUps: [
        'How do I architect a scalable AI summarizer pipeline?',
        'What are the key KPIs for measuring knowledge worker productivity?',
        'Can you analyze a sample meeting transcript and extract high-priority action items?',
      ],
    },
  ]);

  const [inputQuestion, setInputQuestion] = useState(initialQuestion);
  const [contextDoc, setContextDoc] = useState(initialContext);
  const [showContextDrawer, setShowContextDrawer] = useState(Boolean(initialContext));
  const [persona, setPersona] = useState<string>('smart_assistant');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (initialQuestion) {
      setInputQuestion(initialQuestion);
    }
    if (initialContext) {
      setContextDoc(initialContext);
      setShowContextDrawer(true);
    }
  }, [initialQuestion, initialContext]);

  const personas = [
    { id: 'smart_assistant', label: 'Smart Assistant', desc: 'Balanced, clear & actionable co-pilot' },
    { id: 'tech_lead', label: 'Tech Lead & Architect', desc: 'Deep systems design & code best practices' },
    { id: 'executive_coach', label: 'Executive Strategist', desc: 'Business value, ROI & C-suite clarity' },
    { id: 'research_analyst', label: 'Research Analyst', desc: 'Evidence-based breakdown & rigorous logic' },
    { id: 'copy_editor', label: 'Master Copy Editor', desc: 'Stylistic precision & rhetoric polish' },
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputQuestion;
    if (!query.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachedFileName: contextDoc ? 'Context Document Attached' : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuestion('');
    setIsLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/gemini/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          history: historyPayload,
          contextDocument: contextDoc,
          persona,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Q&A request failed' }));
        throw new Error(errData.error || `Error status: ${res.status}`);
      }

      const data = await res.json();
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.content || 'I processed your request.',
        timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedFollowUps: data.suggestedFollowUps || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error(err);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Error communicating with Gemini:** ${err.message || 'Please check your connection.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: 'Chat history cleared. How else can I assist you with your productivity workflows?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedFollowUps: [
          'Draft a high-priority customer escalation response email',
          'Summarize the core architectural benefits of Gemini 3.7 Flash',
          'Create a 5-step checklist for enterprise product launch',
        ],
      },
    ]);
  };

  const exportChat = () => {
    const transcript = messages
      .map((m) => `### ${m.role === 'user' ? 'User' : 'AI Assistant'} (${m.timestamp})\n\n${m.content}\n\n---\n`)
      .join('\n');

    const blob = new Blob([`# AI Smart Assistant Chat Transcript\n*Exported on ${new Date().toLocaleString()}*\n\n${transcript}`], {
      type: 'text/markdown',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-transcript-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="chat-assistant-view" className="space-y-6">
      {/* Top Header & Actions */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Conversational Assistant</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Multi-turn reasoning, grounded document Q&A, and customized persona consultation.
          </p>
        </div>

        {/* Persona Selector & Action Tools */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Persona select */}
          <div className="flex items-center space-x-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg">
            <Sliders className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            <select
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              className="bg-transparent text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              {personas.map((p) => (
                <option key={p.id} value={p.id} className="dark:bg-slate-900 dark:text-slate-200">
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Context Button */}
          <button
            onClick={() => setShowContextDrawer(!showContextDrawer)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium flex items-center space-x-1.5 transition cursor-pointer ${
              contextDoc
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Paperclip className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            <span>{contextDoc ? 'Doc Grounded' : 'Ground with Doc'}</span>
          </button>

          {/* Export Transcript */}
          <button
            onClick={exportChat}
            className="p-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition cursor-pointer"
            title="Export conversation as Markdown"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Clear History */}
          <button
            onClick={clearChat}
            className="p-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 border border-slate-200 dark:border-slate-800 transition cursor-pointer"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Document Grounding Drawer */}
      {showContextDrawer && (
        <div className="bg-indigo-50/50 dark:bg-indigo-950/40 rounded-xl p-4 border border-indigo-100 dark:border-indigo-900/60 space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Reference Document Context (Grounding Source)</span>
            </span>
            {contextDoc && (
              <button
                onClick={() => setContextDoc('')}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-red-500 dark:hover:text-red-400 transition cursor-pointer"
              >
                Clear Context
              </button>
            )}
          </div>
          <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
            Paste any reference text or report below. The assistant will ground its responses and citations in this document.
          </p>
          <textarea
            value={contextDoc}
            onChange={(e) => setContextDoc(e.target.value)}
            placeholder="Paste reference document or notes here for grounded Q&A..."
            rows={3}
            className="w-full text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono resize-y"
          />
        </div>
      )}

      {/* Main Chat Stream Viewport */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col h-[540px] overflow-hidden transition-colors">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id} className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white ${
                    isUser ? 'bg-slate-800 dark:bg-slate-700' : 'bg-indigo-600'
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                {/* Message Bubble Container */}
                <div className={`space-y-1.5 max-w-[85%] sm:max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center space-x-2 text-[10px] text-slate-400 dark:text-slate-500">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{isUser ? 'You' : 'AI Assistant'}</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                    {msg.attachedFileName && (
                      <span className="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium">
                        +Doc Context
                      </span>
                    )}
                  </div>

                  <div
                    className={`p-4 rounded-xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-slate-900 dark:bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-800 rounded-tl-none'
                    }`}
                  >
                    <div className="prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>

                  {/* Message Tools & Follow-Up Suggestions for Assistant */}
                  {!isUser && (
                    <div className="space-y-2 pt-1">
                      {/* Copy Action */}
                      <button
                        onClick={() => copyMessage(msg.content, msg.id)}
                        className="text-[11px] text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center space-x-1 transition cursor-pointer"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>

                      {/* Follow-Up Suggestion Pills */}
                      {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                            Suggested Inquiries:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.suggestedFollowUps.map((followUp, i) => (
                              <button
                                key={i}
                                onClick={() => handleSendMessage(followUp)}
                                className="text-[11px] px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300 text-slate-600 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700 transition flex items-center space-x-1 cursor-pointer text-left"
                              >
                                <span>{followUp}</span>
                                <ArrowRight className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500 shrink-0" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-start space-x-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 text-white">
                <Bot className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl rounded-tl-none border border-slate-100 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center space-x-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                <span>Formulating response with Gemini 3.7 Flash...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 transition-colors">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2"
          >
            <input
              id="chat-query-input"
              type="text"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              placeholder="Ask anything, request code, or explore document details..."
              disabled={isLoading}
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 rounded-lg px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100 dark:disabled:bg-slate-850 font-medium"
            />
            <button
              id="btn-send-chat"
              type="submit"
              disabled={isLoading || !inputQuestion.trim()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs shadow-indigo-200 dark:shadow-none flex items-center space-x-1.5 transition cursor-pointer disabled:cursor-not-allowed"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
