import React, { useState } from 'react';
import {
  BriefcaseBusiness,
  CheckCircle2,
  AlertTriangle,
  Target,
  Lightbulb,
  Map,
  Upload,
  Loader2,
  FileText,
} from 'lucide-react';

interface CareerResult {
  jobSummary: string;
  requiredSkills: string[];
  matchingSkills: string[];
  missingSkills: string[];
  matchPercentage: number;
  matchReason: string;
  recommendations: string[];
  roadmap: string[];
}

export const CareerAssistantView: React.FC = () => {
  const [jobDescription, setJobDescription] = useState('');
  const [profile, setProfile] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<CareerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const analyze = async () => {
    setError('');
    setResult(null);
    if (!jobDescription.trim()) {
      setError('Please enter a job or internship description.');
      return;
    }
    if (!profile.trim() && !file) {
      setError('Please enter a candidate profile or upload a resume/project file.');
      return;
    }

    setLoading(true);
    try {
      let fileData: { name: string; mimeType: string; data: string } | undefined;
      if (file) {
        const buffer = await file.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        fileData = {
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          data: btoa(binary),
        };
      }

      const response = await fetch('/api/gemini/career-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription,
          profile,
          file: fileData,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Career analysis failed.');
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-6 sm:p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <BriefcaseBusiness className="w-7 h-7" />
          <h1 className="text-2xl sm:text-3xl font-bold">AI Career Assistant</h1>
        </div>
        <p className="text-indigo-100 max-w-3xl">
          Compare a job or internship with your real profile and project evidence, identify skill gaps,
          and turn the analysis into a practical preparation roadmap.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h2 className="font-bold text-lg mb-3">📖 Job / Internship Description</h2>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="w-full h-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Paste the complete job description..."
          />
        </section>

        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h2 className="font-bold text-lg mb-3">👤 Candidate Profile</h2>
          <textarea
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            className="w-full h-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Skills, education, projects, experience..."
          />
          <label className="mt-3 flex items-center gap-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
            <Upload className="w-5 h-5 text-indigo-500" />
            <div className="min-w-0">
              <div className="text-sm font-semibold">Upload Resume / Project</div>
              <div className="text-xs text-slate-500">PDF, DOCX, TXT or ZIP</div>
              {file && <div className="text-xs text-indigo-500 mt-1 truncate">{file.name}</div>}
            </div>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt,.zip"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
        </section>
      </div>

      <button
        onClick={analyze}
        disabled={loading}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold px-6 py-3 transition"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Target className="w-5 h-5" />}
        {loading ? 'Analyzing...' : 'Analyze Career Match'}
      </button>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-4 text-sm">{error}</div>
      )}

      {result && (
        <div className="space-y-6">
          <section className="grid md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center">
              <div className="text-xs uppercase tracking-widest text-slate-500">Match Score</div>
              <div className="text-5xl font-black mt-2 text-indigo-600">{result.matchPercentage}%</div>
              <div className="text-xs text-slate-500 mt-2">Evidence-based estimate</div>
            </div>
            <div className="md:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <h3 className="font-bold mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> Why this score?</h3>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{result.matchReason}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h2 className="text-xl font-bold mb-3">📋 Job Summary</h2>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{result.jobSummary}</p>
          </section>

          <section className="grid lg:grid-cols-2 gap-6">
            <SkillCard title="Matching Skills" items={result.matchingSkills} icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />} />
            <SkillCard title="Missing / Weak Skills" items={result.missingSkills} icon={<AlertTriangle className="w-5 h-5 text-amber-500" />} />
          </section>

          <section className="grid lg:grid-cols-2 gap-6">
            <ListCard title="Required Skills" items={result.requiredSkills} icon={<Target className="w-5 h-5 text-indigo-500" />} />
            <ListCard title="Recommendations" items={result.recommendations} icon={<Lightbulb className="w-5 h-5 text-yellow-500" />} />
          </section>

          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Map className="w-5 h-5 text-indigo-500" /> Preparation Roadmap</h2>
            <div className="space-y-3">
              {result.roadmap.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-7 h-7 shrink-0 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center text-xs font-bold">{i + 1}</div>
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{step}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

const SkillCard = ({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) => (
  <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">{icon}{title}</h2>
    <div className="space-y-2">
      {items.length ? items.map((x, i) => <div key={i} className="text-sm px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800">{x}</div>) : <div className="text-sm text-slate-500">None identified.</div>}
    </div>
  </section>
);

const ListCard = ({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) => (
  <SkillCard title={title} items={items} icon={icon} />
);
