import React from 'react';
import { X, CheckCircle, ShieldCheck, Cpu, Code2, Sparkles, BookOpen, Layers } from 'lucide-react';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const requirements = [
    { name: 'Text Summarization', status: 'Implemented', detail: 'Executive memo, bullet takeaways, TL;DR, configurable length & audience' },
    { name: 'Question Answering', status: 'Implemented', detail: 'Multi-turn conversational chat with document grounding context & persona switcher' },
    { name: 'Content Generation', status: 'Implemented', detail: 'Writing studio for emails, articles, agendas, bug reports, pitches & social posts' },
    { name: 'Text / Document Analysis', status: 'Implemented', detail: 'Sentiment score meter, tone detector, readability index, entity explorer & action items' },
    { name: 'Intelligent Suggestions', status: 'Implemented', detail: 'Smart follow-up questions, proactive next steps & delivery tips' },
    { name: 'Functional User Interface', status: 'Implemented', detail: 'Responsive desktop/mobile workspace with real-time stats & markdown rendering' },
    { name: 'AI API Integration', status: 'Implemented', detail: 'Google GenAI SDK with OpenAi 3.7 Flash model via Express backend' },
    { name: 'Proper Error Handling', status: 'Implemented', detail: 'Structured error messages, loading spinners & graceful fallbacks' },
    { name: 'Secure API Key Handling', status: 'Implemented', detail: 'Server-side process.env.OpenAi_API_KEY with zero client token exposure' },
    { name: 'Clean Project Structure', status: 'Implemented', detail: 'Modular TypeScript components, typed interfaces, and separated data' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200">
        {/* Header */}
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
          <div>
            <h2 className="text-base font-bold text-slate-900">Project Specifications & Architectural Guide</h2>
            <p className="text-xs text-slate-500">Innovation Hacks AI Internship 2026 — Week 01 Project</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-xs text-slate-700">
          {/* Objective Banner */}
          <div className="p-4 rounded-lg bg-indigo-50/60 border border-indigo-100 space-y-1">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest block">
              Project Objective
            </span>
            <p className="text-slate-600 leading-relaxed text-xs">
              Solve real knowledge-worker productivity challenges by consolidating document summarization, linguistic inspection, multi-format copy drafting, and grounded multi-turn Q&A into a unified high-performance application.
            </p>
          </div>

          {/* Architecture Overview */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
              System Architecture & Tech Stack
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="font-semibold text-slate-800 mb-1">Frontend Layer</div>
                <p className="text-slate-500 text-[11px] leading-normal">React 19, TypeScript, Tailwind CSS v4, Lucide Icons, React-Markdown.</p>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="font-semibold text-slate-800 mb-1">Backend Server</div>
                <p className="text-slate-500 text-[11px] leading-normal">Node.js Express proxy with 15MB payload buffers and structured JSON validation.</p>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="font-semibold text-slate-800 mb-1">AI Intelligence</div>
                <p className="text-slate-500 text-[11px] leading-normal">Google GenAI SDK with OpenAi 3.7 Flash using deterministic JSON schemas.</p>
              </div>
            </div>
          </div>

          {/* Verification Checklist */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
              Requirements Verification Checklist
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {requirements.map((req, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-start space-x-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-slate-800 text-[11px]">{req.name}</div>
                    <div className="text-[10px] text-slate-500">{req.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security & Token Isolation */}
          <div className="p-4 rounded-lg bg-slate-900 text-white space-y-1.5">
            <div className="flex items-center space-x-1.5 font-bold text-xs text-indigo-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Secure Server-Side API Key Handling</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              All OpenAi API operations run exclusively on the Express backend via <code className="text-indigo-200 bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">process.env.OpenAi_API_KEY</code>. The client browser communicates only via secure JSON endpoints (<code className="text-indigo-200 font-mono text-[10px]">/api/OpenAi/*</code>) and never receives access to private keys or authorization headers.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Close Documentation
          </button>
        </div>
      </div>
    </div>
  );
};
