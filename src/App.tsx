import React, { useState, useEffect } from 'react';
import { ActiveTab, SampleDocument } from './types';
import { SAMPLE_DOCUMENTS } from './data/sampleData';
import { Navbar } from './components/Navbar';
import { SummarizerView } from './components/SummarizerView';
import { AnalyzerView } from './components/AnalyzerView';
import { ContentStudioView } from './components/ContentStudioView';
import { ChatAssistantView } from './components/ChatAssistantView';
import { QuickTransformView } from './components/QuickTransformView';
import { CareerAssistantView } from './components/CareerAssistantView';
import { DocumentationModal } from './components/DocumentationModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('summarizer');
  const [isApiHealthy, setIsApiHealthy] = useState(true);
  const [showDocsModal, setShowDocsModal] = useState(false);

  // Cross-view state transfer (e.g. from Summarizer follow-up into Chat)
  const [chatInitialQuestion, setChatInitialQuestion] = useState('');
  const [chatInitialContext, setChatInitialContext] = useState('');
  const [activeInitialText, setActiveInitialText] = useState('');

  // Check health on load
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setIsApiHealthy(data.status === 'ok');
      })
      .catch((err) => {
        console.warn('API health check warning:', err);
      });
  }, []);

  const handleLoadSample = (sample: SampleDocument) => {
    setActiveTab(sample.targetTab);
    setActiveInitialText(sample.text);

    if (sample.targetTab === 'chat') {
      setChatInitialContext(sample.text);
      setChatInitialQuestion(
        'Summarize the key decisions and deliverables from this document.'
      );
    }
  };

  const handleSendToChat = (question: string, contextDoc: string) => {
    setChatInitialQuestion(question);
    setChatInitialContext(contextDoc);
    setActiveTab('chat');
  };

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden bg-[#F8FAFC] dark:bg-[#090D16] flex flex-col font-sans text-slate-800 dark:text-slate-200 antialiased selection:bg-indigo-500 selection:text-white transition-colors">
      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setActiveInitialText('');
        }}
        onLoadSample={handleLoadSample}
        onOpenDocs={() => setShowDocsModal(true)}
        isApiHealthy={isApiHealthy}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 w-full min-w-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'summarizer' && (
          <SummarizerView
            key={`sum-${activeInitialText.substring(0, 10)}`}
            initialText={activeInitialText}
            samples={SAMPLE_DOCUMENTS}
            onSendToChat={handleSendToChat}
          />
        )}

        {activeTab === 'analyzer' && (
          <AnalyzerView
            key={`ana-${activeInitialText.substring(0, 10)}`}
            initialText={activeInitialText}
            samples={SAMPLE_DOCUMENTS}
            onSendToChat={handleSendToChat}
          />
        )}

        {activeTab === 'generator' && (
          <ContentStudioView
            onSendToChat={handleSendToChat}
          />
        )}

        {activeTab === 'chat' && (
          <ChatAssistantView
            initialQuestion={chatInitialQuestion}
            initialContext={chatInitialContext}
          />
        )}

        {activeTab === 'quick-tools' && (
          <QuickTransformView />
        )}

        {activeTab === 'career' && (
          <CareerAssistantView />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto h-12 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between shrink-0 text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            <span>API: Secure (Server-Side Isolated)</span>
          </div>

          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">
            •
          </span>

          <div className="hidden sm:flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
            <span className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full"></span>
            <span>Innovation Hacks AI Internship 2026</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDocsModal(true)}
            className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-medium transition cursor-pointer"
          >
            Project Specifications
          </button>

          <span className="text-slate-300 dark:text-slate-700">
            •
          </span>

          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest hidden md:inline">
            Week 01 Project — SmartAssist AI
          </span>
        </div>
      </footer>

      {/* Project Documentation Modal */}
      <DocumentationModal
        isOpen={showDocsModal}
        onClose={() => setShowDocsModal(false)}
      />
    </div>
  );
}