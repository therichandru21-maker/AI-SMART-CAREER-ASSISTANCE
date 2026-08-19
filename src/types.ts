export type ActiveTab = 'summarizer' | 'analyzer' | 'generator' | 'chat' | 'quick-tools' | 'career';

export interface SummarizeRequest {
  text: string;
  format?: 'executive' | 'bullets' | 'tldr' | 'action-items' | 'detailed';
  length?: 'short' | 'medium' | 'detailed';
  targetAudience?: 'general' | 'executives' | 'technical' | 'students';
  imagePart?: {
    mimeType: string;
    data: string;
  };
}

export interface SummarizeResponse {
  tldr: string;
  keyPoints: string[];
  executiveSummary: string;
  actionItems: string[];
  suggestedQuestions: string[];
  readingTimeMinutes: number;
  wordCount: number;
  originalWordCount: number;
  reductionPercentage: number;
}

export interface EntityItem {
  name: string;
  type: string;
  description: string;
}

export interface ImprovementSuggestion {
  original: string;
  suggested: string;
  explanation: string;
  type: 'grammar' | 'clarity' | 'tone' | 'conciseness';
}

export interface AnalysisResponse {
  overallTone: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  sentimentScore: number; // 0 - 100
  readabilityLevel: string; // e.g. "Grade 9 (Accessible to general public)"
  readingTimeMinutes: number;
  keyTopics: string[];
  entities: EntityItem[];
  actionItems: { task: string; priority: 'high' | 'medium' | 'low'; owner?: string }[];
  strengths: string[];
  suggestions: ImprovementSuggestion[];
  insights: string;
}

export interface ContentGenRequest {
  template: 'email' | 'article' | 'agenda' | 'bug_report' | 'pitch' | 'social_post' | 'code' | 'freeform';
  topic: string;
  keyPoints?: string;
  tone?: 'professional' | 'persuasive' | 'casual' | 'enthusiastic' | 'technical' | 'urgent';
  length?: 'concise' | 'standard' | 'in-depth';
  audience?: string;
}

export interface ContentGenResponse {
  title: string;
  content: string;
  tags: string[];
  tips: string[];
  estimatedReadingTime: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedFollowUps?: string[];
  attachedFileName?: string;
  isStreaming?: boolean;
}

export interface QuickTransformRequest {
  text: string;
  action: 'fix_grammar' | 'bulletify' | 'make_formal' | 'simplify_eli5' | 'translate_es' | 'translate_fr' | 'translate_de' | 'translate_ja' | 'to_table' | 'extract_checklist';
}

export interface SampleDocument {
  id: string;
  title: string;
  category: string;
  description: string;
  text: string;
  targetTab: ActiveTab;
}
