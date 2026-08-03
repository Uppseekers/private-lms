import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Save, Send, AlertCircle, Plus, CheckCircle2, Clock, MessageSquare, BookOpen, ChevronRight, Wand2, Sparkles, Copy, Check, FileCheck, RefreshCw, X } from 'lucide-react';
import Markdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { useDatabase } from '@/context/DatabaseContext';
import { Student, Essay, EssayVersion, Task, TaskStage } from '@/types';



interface GrammarError {
  id: string;
  category: "spelling" | "punctuation" | "style" | "grammar" | "redundancy";
  message: string;
  matchText: string;
  suggestion?: string;
  index: number;
  length: number;
}

const COMMON_SPELLING_MAP: Record<string, string> = {
  teh: "the",
  recieve: "receive",
  beleive: "believe",
  definately: "definitely",
  seperate: "separate",
  alot: "a lot",
  occured: "occurred",
  tommorrow: "tomorrow",
  embarass: "embarrass",
  accomodate: "accommodate",
  occassion: "occasion",
  independant: "independent",
  goverment: "government",
  writting: "writing",
  truely: "truly",
  maintainance: "maintenance",
  persue: "pursue",
  perfer: "prefer",
  experiance: "experience",
  acheive: "achieve",
  pronounciation: "pronunciation",
  refered: "referred",
  judgement: "judgment",
  unfortunatly: "unfortunately",
  neccessary: "necessary",
  recomended: "recommended",
  successfuly: "successfully",
  dissapoint: "disappoint",
  enviornment: "environment",
  knwoledge: "knowledge",
  oppurtunity: "opportunity",
  passsion: "passion",
  univresity: "university"
};

const FORMAL_CONTRACTIONS_MAP: Record<string, string> = {
  "don't": "do not",
  "can't": "cannot",
  "won't": "will not",
  "isn't": "is not",
  "aren't": "are not",
  "wasn't": "was not",
  "weren't": "were not",
  "haven't": "have not",
  "hasn't": "has not",
  "didn't": "did not",
  "couldn't": "could not",
  "shouldn't": "should not",
  "wouldn't": "would not"
};

const REDUNDANT_PHRASES: Record<string, string> = {
  "due to the fact that": "because",
  "in order to": "to",
  "at this point in time": "currently",
  "first and foremost": "first",
  "in the event that": "if"
};

const ESSAY_CLICHES: Record<string, string> = {
  "at the end of the day": "ultimately",
  "think outside the box": "innovate",
  "since the dawn of time": "historically",
  "makes a world of difference": "significantly impacts",
  "passion for learning": "intellectual curiosity"
};

const ACADEMIC_DICTIONARY = [
  { word: "Spearhead", pos: "verb", def: "To lead an initiative or movement.", synonyms: ["Pioneer", "Initiate", "Lead", "Drive"], example: "I spearheaded a STEM outreach program for local middle schoolers." },
  { word: "Meticulous", pos: "adj", def: "Showing great attention to detail; very careful and precise.", synonyms: ["Thorough", "Rigorous", "Conscientious"], example: "Through meticulous data logging, our team identified key trends." },
  { word: "Resilience", pos: "noun", def: "The capacity to recover quickly from difficulties.", synonyms: ["Tenacity", "Fortitude", "Perseverance"], example: "Overcoming project setbacks fostered deep personal resilience." },
  { word: "Catalyst", pos: "noun", def: "A person or thing that precipitates an event or change.", synonyms: ["Impetus", "Spark", "Driver"], example: "That summer workshop became the catalyst for my interest in AI." },
  { word: "Pivotal", pos: "adj", def: "Of crucial importance in relation to development or success.", synonyms: ["Decisive", "Critical", "Fundamental"], example: "Mentoring younger students was a pivotal moment in my high school career." },
  { word: "Elucidate", pos: "verb", def: "Make something clear; explain.", synonyms: ["Clarify", "Illuminate", "Expound"], example: "I wrote a research summary to elucidate complex physics concepts." },
  { word: "Empower", pos: "verb", def: "Give someone the authority or confidence to do something.", synonyms: ["Enable", "Foster", "Bolster"], example: "We sought to empower underprivileged youths through coding workshops." }
];

export default function StudentEssays() {
  const { currentUser, students, updateStudent } = useDatabase();
  const student = students.find(s => s.id === currentUser.id || s.email === currentUser.email) || (currentUser as any);
  const essays = student?.essays || [];
  const [selectedEssay, setSelectedEssay] = useState<Essay | null>(null);
  const [isProofreaderOpen, setIsProofreaderOpen] = useState(false);
  const [proofreaderInitialText, setProofreaderInitialText] = useState('');

  const syncTaskForEssay = (currentTasks: Task[] = [], essay: Essay, status: Essay['status']): Task[] => {
    let stage: TaskStage = 'IN_PROGRESS';
    if (status === 'Under Review') stage = 'SUBMITTED_FOR_REVIEW';
    if (status === 'Needs Revision') stage = 'NEEDS_REVISION';
    if (status === 'Approved') stage = 'COMPLETED';

    const existingIdx = currentTasks.findIndex(t => 
      t.relatedTo === essay.id || t.name.toLowerCase().includes(essay.prompt.toLowerCase().substring(0, 20))
    );

    if (existingIdx >= 0) {
      const updated = [...currentTasks];
      updated[existingIdx] = {
        ...updated[existingIdx],
        stage
      };
      return updated;
    } else {
      const newTask: Task = {
        id: 'TASK-' + Math.floor(1000 + Math.random() * 9000),
        name: `Essay: ${essay.university ? `${essay.university} - ` : ''}${essay.prompt.substring(0, 50)}${essay.prompt.length > 50 ? '...' : ''}`,
        category: 'Administrative / College Prep',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        stage,
        description: `University/Target: ${essay.university || 'General'}\nPrompt: ${essay.prompt}`,
        assignedBy: 'Essay Writing Tool',
        relatedTo: essay.id,
        attachments: []
      };
      return [...currentTasks, newTask];
    }
  };

  const handleCreateNewDocument = () => {
    if (!student) return;
    const newEssay: Essay = {
      id: 'e_' + Date.now(),
      prompt: 'Untitled Essay / Blank Document',
      university: 'General',
      status: 'In Progress',
      versions: [
        {
          id: 'v1.0',
          version: 'v1.0',
          content: '',
          date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })
        }
      ]
    };

    const updatedEssays = [newEssay, ...(student.essays || [])];
    const updatedTasks = syncTaskForEssay(student.tasks || [], newEssay, 'In Progress');

    updateStudent({
      ...student,
      essays: updatedEssays,
      tasks: updatedTasks
    });
    setSelectedEssay(newEssay);
  };

  const handleSaveDraft = (essayId: string, content: string) => {
    if (!student) return;
    let targetEssay: Essay | null = null;
    const newEssays = essays.map(e => {
      if (e.id === essayId) {
        const newVersion: EssayVersion = {
          id: `v${e.versions.length + 1}.0`,
          version: `v${e.versions.length + 1}.0`,
          content,
          date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })
        };
        const updated = {
          ...e,
          status: 'Draft Saved' as const,
          versions: [newVersion, ...e.versions]
        };
        targetEssay = updated;
        return updated;
      }
      return e;
    });
    
    const updatedTasks = targetEssay 
      ? syncTaskForEssay(student.tasks || [], targetEssay, 'Draft Saved')
      : (student.tasks || []);

    updateStudent({
      ...student,
      essays: newEssays,
      tasks: updatedTasks
    });
  };

  const handleSubmit = (essayId: string) => {
    if (!student) return;
    let targetEssay: Essay | null = null;
    const newEssays = essays.map(e => {
      if (e.id === essayId) {
        const updated = { ...e, status: 'Under Review' as const };
        targetEssay = updated;
        return updated;
      }
      return e;
    });
    
    const updatedTasks = targetEssay 
      ? syncTaskForEssay(student.tasks || [], targetEssay, 'Under Review')
      : (student.tasks || []);

    updateStudent({
      ...student,
      essays: newEssays,
      tasks: updatedTasks
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Essay Workspace</h2>
          <p className="text-sm text-slate-500">Draft, review, and finalize your university application essays.</p>
        </div>
      </div>

            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="flex gap-4">
          <select className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>All Prompts</option>
            <option>Common App</option>
            <option>Supplemental</option>
          </select>
          <select className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Sort by Deadline</option>
            <option>Sort by Status</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search Prompt / University..." className="w-64 bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <Button onClick={() => { setProofreaderInitialText(''); setIsProofreaderOpen(true); }} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold shadow-sm">
            <Sparkles className="w-4 h-4 mr-2" /> AI SOP & Essay Proofreader
          </Button>
          <Button onClick={handleCreateNewDocument} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
            <Plus className="w-4 h-4 mr-2" /> New Document
          </Button>
        </div>
      </div>
      
      {selectedEssay ? (
        <EssayEditor 
          essay={essays.find(e => e.id === selectedEssay.id)!} 
          onClose={() => setSelectedEssay(null)}
          onSave={handleSaveDraft}
          onSubmit={handleSubmit}
        />
      ) : (
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4">Prompt / Task</th>
                  <th className="px-6 py-4">University</th>
                  <th className="px-6 py-4">Deadline</th>
                  <th className="px-6 py-4">Word Count</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {essays.map(essay => {
                  const currentContent = essay.versions.length > 0 ? essay.versions[0].content : '';
                  const words = currentContent.trim().split(/\s+/).filter(w => w.length > 0).length;
                  return (
                    <tr key={essay.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => setSelectedEssay(essay)}>
                      <td className="px-6 py-4 max-w-xs truncate font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                        {essay.prompt}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {essay.university || 'Common App (General)'}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {essay.university === 'Columbia University' ? 'Nov 01' : 'Jan 01'}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {words} / 650
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={essay.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                          {essay.status === 'In Progress' || essay.status === 'Draft Saved' || essay.status === 'Needs Revision' ? 'Write' : 'View'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {isProofreaderOpen && (
        <AiProofreaderModal 
          initialText={proofreaderInitialText}
          onClose={() => setIsProofreaderOpen(false)}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Essay['status'] }) {
  switch(status) {
    case 'In Progress': return <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">In Progress</span>;
    case 'Draft Saved': return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">Draft Saved</span>;
    case 'Under Review': return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">🟡 Under Review</span>;
    case 'Needs Revision': return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">🔴 Needs Revision</span>;
    case 'Approved': return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">🟢 Approved</span>;
  }
}

function EssayEditor({ essay, onClose, onSave, onSubmit }: { essay: Essay, onClose: () => void, onSave: (id: string, content: string) => void, onSubmit: (id: string) => void }) {
  const latestVersion = essay.versions[0];
  const [content, setContent] = useState(latestVersion?.content || '');
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Live Analysis Mock State
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [charNoSpaces, setCharNoSpaces] = useState(0);
  const [symbolsCount, setSymbolsCount] = useState(0);
  const [grammarErrors, setGrammarErrors] = useState<GrammarError[]>([]);
  const grammarIssues = grammarErrors.length;
  const [activeErrorId, setActiveErrorId] = useState<string | null>(null);
  
  const [aiTab, setAiTab] = useState<'checks' | 'proofreader' | 'dictionary'>('checks');
  const [dictionarySearch, setDictionarySearch] = useState('');
  const [aiProofreadResult, setAiProofreadResult] = useState('');
  const [isAiProofreading, setIsAiProofreading] = useState(false);
  const [aiProofreadError, setAiProofreadError] = useState('');
  const [aiCopied, setAiCopied] = useState(false);

  const handleRunAiMentor = async () => {
    if (!content.trim()) return;
    setIsAiProofreading(true);
    setAiProofreadError('');
    try {
      const token = localStorage.getItem('auth_token') || 'custom_demo_token';
      const res = await fetch('/api/ai/proofread-essay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ essayText: content })
      });
      const contentType = res.headers.get('content-type');
      let data: any = {};
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `Server returned status ${res.status}`);
      }
      if (!res.ok) throw new Error(data.error || 'Proofreading failed');
      setAiProofreadResult(data.result);
    } catch (err: any) {
      setAiProofreadError(err.message || 'An error occurred during proofreading.');
    } finally {
      setIsAiProofreading(false);
    }
  };

  const extractPolishedTextFromMarkdown = (markdown: string) => {
    const match = markdown.match(/###?\s*1\.\s*\*\*Polished Text:\*\*\s*([\s\S]*?)(?=###?\s*2\.\s*\*\*Correction Log:\*\*|$)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    if (markdown.includes('**Correction Log:**')) {
      return markdown.split('**Correction Log:**')[0].replace(/###?\s*1\.\s*\*\*Polished Text:\*\*/i, '').trim();
    }
    return markdown;
  };

  const handleApplyPolishedToDraft = () => {
    if (!aiProofreadResult) return;
    const polished = extractPolishedTextFromMarkdown(aiProofreadResult);
    if (window.confirm("Replace your current draft with the polished text?")) {
      setContent(polished);
    }
  };

  const handleFixError = (err: GrammarError) => {
    if (!err.suggestion) return;
    const regex = new RegExp(err.matchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const newText = content.replace(regex, err.suggestion);
    setContent(newText);
  };
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const isReadOnly = essay.status === 'Under Review' || essay.status === 'Approved';
  const hasChanges = content !== (latestVersion?.content || '');

  useEffect(() => {
    const text = content || '';
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const chars = text.length;
    const noSpaces = text.replace(/\s/g, '').length;
    
    setWordCount(words);
    setCharCount(chars);
    setCharNoSpaces(noSpaces);
    const symbols = (text.match(/[^a-zA-Z0-9\s]/g) || []).length;
    setSymbolsCount(symbols);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsAnalyzing(true);

    typingTimeoutRef.current = setTimeout(() => {
      const newErrors: GrammarError[] = [];
      let match;

      // 1. Common misspellings
      for (const [wrong, right] of Object.entries(COMMON_SPELLING_MAP)) {
        const regex = new RegExp(`\\b${wrong}\\b`, "gi");
        while ((match = regex.exec(text)) !== null) {
          newErrors.push({
            id: Math.random().toString(),
            category: "spelling",
            message: `Spelling: "${match[0]}" → "${right}"`,
            matchText: match[0],
            suggestion: right,
            index: match.index,
            length: match[0].length
          });
        }
      }

      // 2. Informal contractions
      for (const [informal, formal] of Object.entries(FORMAL_CONTRACTIONS_MAP)) {
        const regex = new RegExp(`\\b${informal.replace("'", "\x27")}\\b`, "gi");
        while ((match = regex.exec(text)) !== null) {
          newErrors.push({
            id: Math.random().toString(),
            category: "style",
            message: `Informal contraction: "${match[0]}" → use formal "${formal}"`,
            matchText: match[0],
            suggestion: formal,
            index: match.index,
            length: match[0].length
          });
        }
      }

      // 3. Redundant phrases
      for (const [wordy, concise] of Object.entries(REDUNDANT_PHRASES)) {
        const regex = new RegExp(`\\b${wordy}\\b`, "gi");
        while ((match = regex.exec(text)) !== null) {
          newErrors.push({
            id: Math.random().toString(),
            category: "redundancy",
            message: `Wordiness: "${match[0]}" → simplify to "${concise}"`,
            matchText: match[0],
            suggestion: concise,
            index: match.index,
            length: match[0].length
          });
        }
      }

      // 4. Clichés
      for (const [cliche, better] of Object.entries(ESSAY_CLICHES)) {
        const regex = new RegExp(`\\b${cliche}\\b`, "gi");
        while ((match = regex.exec(text)) !== null) {
          newErrors.push({
            id: Math.random().toString(),
            category: "style",
            message: `Overused cliché: "${match[0]}" → try "${better}"`,
            matchText: match[0],
            suggestion: better,
            index: match.index,
            length: match[0].length
          });
        }
      }

      // 5. Repeated words
      const repeatedRegex = /\b(\w+)\s+\1\b/gi;
      while ((match = repeatedRegex.exec(text)) !== null) {
        newErrors.push({
          id: Math.random().toString(),
          category: "grammar",
          message: `Repeated word: "${match[1]}"`,
          matchText: match[0],
          suggestion: match[1],
          index: match.index,
          length: match[0].length
        });
      }

      // 6. Space before punctuation
      const puncRegex = /(\s+[,.!?;:])/g;
      while ((match = puncRegex.exec(text)) !== null) {
        newErrors.push({
          id: Math.random().toString(),
          category: "punctuation",
          message: "Unnecessary space before punctuation mark",
          matchText: match[0],
          suggestion: match[0].trim(),
          index: match.index,
          length: match[0].length
        });
      }

      const topErrors = newErrors.slice(0, 10);
      setGrammarErrors(topErrors);
      setIsAnalyzing(false);
    }, 800);
  }, [content]);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const overlay = document.getElementById('highlight-overlay');
    if (overlay) {
      overlay.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const renderHighlightedText = () => {
    if (!grammarErrors.length || !content) return content;
    
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // Sort errors by index
    const sortedErrors = [...grammarErrors].sort((a, b) => a.index - b.index);
    
    sortedErrors.forEach((err) => {
        if (err.index >= lastIndex) {
            elements.push(content.substring(lastIndex, err.index));
            elements.push(
                <span 
                    key={err.id} 
                    className={`border-b-2 cursor-pointer pointer-events-auto transition-colors ${activeErrorId === err.id ? 'bg-red-200 border-red-500' : 'bg-red-100/50 border-red-400'}`}
                    onClick={() => setActiveErrorId(activeErrorId === err.id ? null : err.id)}
                >
                    {content.substring(err.index, err.index + err.length)}
                </span>
            );
            lastIndex = err.index + err.length;
        }
    });
    
    elements.push(content.substring(lastIndex));
    return elements;
  };

  const handleSave = () => {
    onSave(essay.id, content);
  };

  const handleSubmit = () => {
    onSubmit(essay.id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Drafting: {essay.university || 'General Form'}</h3>
          <p className="text-xs text-slate-500">{essay.prompt}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="flex flex-col h-[600px] shadow-md border-slate-200">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0 rounded-t-xl">
               <div className="flex items-center gap-4">
                 <StatusBadge status={essay.status} />
                 {essay.versions.length > 0 && <span className="text-xs font-bold text-slate-400 uppercase">Version: {latestVersion.version}</span>}
               </div>
               <div className="text-xs font-medium text-slate-500 flex items-center gap-2">
                 <BookOpen className="w-4 h-4 text-slate-400" />
                 {wordCount} / 650 words • {charCount} chars • {charNoSpaces} without spaces • {symbolsCount} symbols
               </div>
            </div>
            
            <div className="flex-1 relative bg-white overflow-hidden p-2">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isReadOnly}
                placeholder="Start writing your essay here..."
                className="w-full h-full p-6 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-serif text-lg leading-relaxed text-slate-800 bg-white border border-slate-200 rounded-xl disabled:bg-slate-50 disabled:text-slate-600 shadow-inner"
              />
              {isReadOnly && (
                <div className="absolute inset-0 bg-slate-50/70 flex items-center justify-center backdrop-blur-[1px] pointer-events-none rounded-xl">
                  <div className="bg-white px-4 py-2 rounded-lg shadow-md border border-slate-200 text-sm font-bold text-slate-700 uppercase tracking-wider">
                    Editor Locked ({essay.status})
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end gap-3 rounded-b-xl">
              <Button variant="outline" onClick={() => {
                if (window.confirm('Start a new blank draft? This will not delete your previous versions.')) {
                  setContent('');
                }
              }} disabled={isReadOnly} className="bg-white">
                Start Fresh
              </Button>
              <Button variant="outline" onClick={handleSave} disabled={isReadOnly || (!hasChanges && essay.status === 'Draft Saved')} className="bg-white">
                <Save className="w-4 h-4 mr-2" />
                {hasChanges ? 'Save Draft' : 'Saved'}
              </Button>
              <div className="relative group">
                <Button onClick={handleSubmit} disabled={isReadOnly || wordCount === 0 || essay.status === 'Under Review' || hasChanges || essay.status === 'In Progress'} className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                  <Send className="w-4 h-4 mr-2" />
                  Submit for Review
                </Button>
                {(hasChanges || essay.status === 'In Progress') && !isReadOnly && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    Save a draft first to enable submission
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {latestVersion?.feedback && (
            <Card className="border-amber-200 shadow-sm overflow-hidden">
              <div className="bg-amber-50 p-4 border-b border-amber-100">
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Counselor Feedback
                </h4>
              </div>
              <CardContent className="p-5 bg-white">
                <p className="text-sm text-slate-700 italic">"{latestVersion.feedback}"</p>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>From: Sarah Jenkins</span>
                  <span>{latestVersion.date}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-sm border-slate-200">
            <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex bg-slate-200/60 p-0.5 rounded-lg text-xs font-semibold">
                <button 
                  onClick={() => setAiTab('checks')} 
                  className={cn("px-2.5 py-1.5 rounded-md transition-all flex items-center gap-1", aiTab === 'checks' ? "bg-white text-blue-700 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900")}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Checks ({grammarIssues})
                </button>
                <button 
                  onClick={() => setAiTab('proofreader')} 
                  className={cn("px-2.5 py-1.5 rounded-md transition-all flex items-center gap-1", aiTab === 'proofreader' ? "bg-white text-purple-700 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900")}
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  AI Mentor
                </button>
                <button 
                  onClick={() => setAiTab('dictionary')} 
                  className={cn("px-2.5 py-1.5 rounded-md transition-all flex items-center gap-1", aiTab === 'dictionary' ? "bg-white text-indigo-700 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900")}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Dictionary
                </button>
              </div>
              {isAnalyzing && <span className="text-[10px] font-bold text-blue-500 uppercase animate-pulse">Analyzing...</span>}
            </div>

            <CardContent className="p-4">
              {aiTab === 'checks' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Grammar & Tone Audit</span>
                    {grammarErrors.length > 0 && (
                      <button 
                        onClick={() => {
                          grammarErrors.forEach(err => handleFixError(err));
                        }}
                        className="text-[11px] font-semibold text-blue-600 hover:underline"
                      >
                        Fix All ({grammarErrors.length})
                      </button>
                    )}
                  </div>

                  {grammarErrors.length === 0 ? (
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>Great job! No grammar, spelling, or formal tone errors detected in this draft.</span>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                      {grammarErrors.map((err) => (
                        <div key={err.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <span className={cn(
                                "w-2 h-2 rounded-full shrink-0",
                                err.category === 'spelling' ? 'bg-red-500' :
                                err.category === 'style' ? 'bg-purple-500' :
                                err.category === 'redundancy' ? 'bg-amber-500' : 'bg-blue-500'
                              )} />
                              {err.message}
                            </span>
                          </div>
                          {err.suggestion && (
                            <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-100 text-slate-700">
                              <span>Suggest: <strong className="text-emerald-700">{err.suggestion}</strong></span>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleFixError(err)} 
                                className="h-6 text-[10px] px-2 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-bold"
                              >
                                Auto Fix
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Word Count Limit</span>
                      <span className={cn("font-bold", wordCount > 650 ? "text-red-600" : "text-emerald-600")}>
                        {wordCount} / 650
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all", wordCount > 650 ? "bg-red-500" : "bg-emerald-500")}
                        style={{ width: `${Math.min(100, (wordCount / 650) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : aiTab === 'proofreader' ? (
                <div className="space-y-3">
                  <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span>AI Academic Proofreader & Mentor</span>
                    </div>
                    <p className="text-[11px] text-purple-700 leading-relaxed">
                      Corrects mechanical errors, run-ons & commas while strictly preserving your authentic student voice and narrative tone.
                    </p>
                    <Button 
                      onClick={handleRunAiMentor} 
                      disabled={isAiProofreading || !content.trim()} 
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 shadow-sm"
                    >
                      {isAiProofreading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Proofreading Draft...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                          Run Proofreader on Draft
                        </>
                      )}
                    </Button>
                  </div>

                  {aiProofreadError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                      {aiProofreadError}
                    </div>
                  )}

                  {aiProofreadResult ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Analysis Results</span>
                        <div className="flex gap-1.5">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              navigator.clipboard.writeText(aiProofreadResult);
                              setAiCopied(true);
                              setTimeout(() => setAiCopied(false), 2000);
                            }}
                            className="h-6 text-[10px] px-2 font-bold"
                          >
                            {aiCopied ? <Check className="w-3 h-3 text-green-600 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                            {aiCopied ? 'Copied' : 'Copy'}
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={handleApplyPolishedToDraft} 
                            className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                          >
                            <FileCheck className="w-3 h-3 mr-1" /> Apply
                          </Button>
                        </div>
                      </div>

                      <div className="max-h-[300px] overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 prose prose-xs max-w-none text-slate-800">
                        <Markdown>{aiProofreadResult}</Markdown>
                      </div>
                    </div>
                  ) : (
                    !isAiProofreading && (
                      <div className="p-4 text-center text-slate-400 text-xs space-y-1">
                        <p className="font-semibold text-slate-500">Ready to audit your essay draft.</p>
                        <p className="text-[11px] text-slate-400">Click "Run Proofreader on Draft" to receive polished text & a detailed correction log.</p>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search academic vocabulary..." 
                      value={dictionarySearch}
                      onChange={(e) => setDictionarySearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                    {ACADEMIC_DICTIONARY.filter(item => 
                      item.word.toLowerCase().includes(dictionarySearch.toLowerCase()) ||
                      item.def.toLowerCase().includes(dictionarySearch.toLowerCase()) ||
                      item.synonyms.some(s => s.toLowerCase().includes(dictionarySearch.toLowerCase()))
                    ).map((entry, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">{entry.word}</span>
                          <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{entry.pos}</span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{entry.def}</p>
                        <div className="pt-1 flex flex-wrap gap-1">
                          <span className="text-[10px] text-slate-400 font-medium mr-1">Synonyms:</span>
                          {entry.synonyms.map((syn, sIdx) => (
                            <button 
                              key={sIdx}
                              onClick={() => {
                                setContent(prev => prev ? `${prev} ${syn}` : syn);
                              }}
                              className="text-[10px] bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 px-1.5 py-0.5 rounded transition-colors"
                              title="Click to insert into essay"
                            >
                              + {syn}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

interface NarrativeOption {
  title: string;
  narrativeTurn: string;
  profileConnection: string;
  structuralOutline: string;
  grammarAndToneAdvice: string;
}

export function AiProofreaderModal({ 
  initialText = '', 
  onClose, 
  onApplyText 
}: { 
  initialText?: string; 
  onClose: () => void; 
  onApplyText?: (polishedText: string) => void;
}) {
  const { students, currentUser } = useDatabase();
  const currentStudent = students.find(s => s.id === currentUser?.id || s.email === currentUser?.email) || students[0];

  const [activeTab, setActiveTab] = useState<'narrative' | 'proofread'>('narrative');

  // Narrative Strategist State (Sequential Setup)
  const [essayCategory, setEssayCategory] = useState<'A Common App / Main Personal Essay' | 'A Supplementary Essay (e.g., "Why Us", Major Interest, Community)' | 'A General Essay / Article / Statement of Purpose' | ''>('');
  const [promptTopic, setPromptTopic] = useState('');
  const [targetWordCount, setTargetWordCount] = useState('650');
  const [narrativeOptions, setNarrativeOptions] = useState<NarrativeOption[]>([]);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [generalAdvice, setGeneralAdvice] = useState('');
  const [narrativeRawResult, setNarrativeRawResult] = useState('');
  const [isNarrativeLoading, setIsNarrativeLoading] = useState(false);
  const [narrativeError, setNarrativeError] = useState('');

  // Proofreader State
  const [inputText, setInputText] = useState(initialText);
  const [isLoading, setIsLoading] = useState(false);
  const [resultMarkdown, setResultMarkdown] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerateNarrativeAngles = async () => {
    if (!essayCategory || !targetWordCount.trim()) return;
    setIsNarrativeLoading(true);
    setNarrativeError('');
    setNarrativeOptions([]);
    setSelectedOptionIndex(null);
    setNarrativeRawResult('');
    try {
      const token = localStorage.getItem('auth_token') || 'custom_demo_token';
      const studentProfileContext = currentStudent ? {
        name: currentStudent.name,
        major: currentStudent.major1 || currentStudent.major2 || 'Undecided',
        countries: currentStudent.countries,
        activities: currentStudent.activities,
        extracurriculars: currentStudent.extracurriculars
      } : "High school senior aspiring for university study";

      const res = await fetch('/api/ai/narrative-angles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          essayType: essayCategory,
          prompt: promptTopic,
          wordCount: targetWordCount,
          studentProfile: studentProfileContext
        })
      });

      const contentType = res.headers.get('content-type');
      let data: any = {};
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `Server returned status ${res.status}`);
      }
      if (!res.ok) throw new Error(data.error || 'Failed to generate narrative angles.');
      
      if (data.result && Array.isArray(data.result.options) && data.result.options.length > 0) {
        setNarrativeOptions(data.result.options);
        setSelectedOptionIndex(0);
        if (data.result.generalAdvice) setGeneralAdvice(data.result.generalAdvice);
      } else if (typeof data.result === 'string') {
        setNarrativeRawResult(data.result);
      } else if (data.result && data.result.rawText) {
        setNarrativeRawResult(data.result.rawText);
      }
    } catch (err: any) {
      setNarrativeError(err.message || 'Error formulating narrative strategy.');
    } finally {
      setIsNarrativeLoading(false);
    }
  };

  const handleApplySelectedOption = (opt: NarrativeOption) => {
    const formattedGuide = `/* NARRATIVE STRATEGY GUIDE */
Category: ${essayCategory}
Target Words: ${targetWordCount}
Working Title: ${opt.title}

SUGGESTED NARRATIVE TURN:
${opt.narrativeTurn}

PROFILE CONNECTION SUGGESTIONS:
${opt.profileConnection}

STRUCTURAL OUTLINE & PACING:
${opt.structuralOutline}

GRAMMAR & TONE GUIDELINES:
${opt.grammarAndToneAdvice}

--------------------------------------------------
[Write your draft below using the strategy above]
`;
    if (onApplyText) {
      onApplyText(formattedGuide);
      onClose();
    } else {
      setInputText(formattedGuide);
      setActiveTab('proofread');
    }
  };

  const handleProofread = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const token = localStorage.getItem('auth_token') || 'custom_demo_token';
      const res = await fetch('/api/ai/proofread-essay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ essayText: inputText })
      });

      const contentType = res.headers.get('content-type');
      let data: any = {};
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `Server returned status ${res.status}`);
      }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to proofread essay.');
      }
      setResultMarkdown(data.result);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during AI proofreading.');
    } finally {
      setIsLoading(false);
    }
  };

  const extractPolishedText = (markdown: string) => {
    const match = markdown.match(/###?\s*1\.\s*\*\*Polished Text:\*\*\s*([\s\S]*?)(?=###?\s*2\.\s*\*\*Correction Log:\*\*|$)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    if (markdown.includes('**Correction Log:**')) {
      return markdown.split('**Correction Log:**')[0].replace(/###?\s*1\.\s*\*\*Polished Text:\*\*/i, '').trim();
    }
    return markdown;
  };

  const handleApply = () => {
    if (!onApplyText || !resultMarkdown) return;
    const polished = extractPolishedText(resultMarkdown);
    onApplyText(polished);
    onClose();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl my-8 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-2.5 rounded-xl text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Author's Compass: Elite AI Writing Environment & Mentor</h3>
              <p className="text-xs text-slate-500">Formulate narrative strategies, connect profile details, and refine grammar without pre-generated AI text.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit text-xs font-bold">
          <button
            onClick={() => setActiveTab('narrative')}
            className={cn(
              "px-4 py-2 rounded-lg transition-all flex items-center gap-2",
              activeTab === 'narrative' ? "bg-white text-purple-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            1. Narrative Strategist (Setup & Angles)
          </button>
          <button
            onClick={() => setActiveTab('proofread')}
            className={cn(
              "px-4 py-2 rounded-lg transition-all flex items-center gap-2",
              activeTab === 'proofread' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Wand2 className="w-4 h-4 text-indigo-600" />
            2. Proofreader & Style Mentor
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'narrative' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sequential Setup Form */}
            <div className="lg:col-span-5 space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider bg-purple-50 px-2 py-0.5 rounded border border-purple-100">Draft Setup</span>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">Configure Essay Context</h4>
                </div>
              </div>

              {/* Step 1: Draft Classification & Constraints (Mandatory) */}
              <div className="space-y-3 p-3 bg-white border border-purple-100 rounded-xl shadow-xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <span className="bg-purple-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px]">1</span>
                    Step 1: Draft Classification & Constraints
                  </label>
                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider bg-red-50 px-1.5 py-0.5 rounded">Mandatory</span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-600">Select Classification:</span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      'A Common App / Main Personal Essay',
                      'A Supplementary Essay (e.g., "Why Us", Major Interest, Community)',
                      'A General Essay / Article / Statement of Purpose'
                    ].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setEssayCategory(cat as any)}
                        className={cn(
                          "text-left p-2.5 rounded-lg text-xs font-semibold border transition-all flex items-center justify-between",
                          essayCategory === cat 
                            ? "border-purple-600 bg-purple-50 text-purple-900 shadow-xs" 
                            : "border-slate-200 bg-slate-50/50 text-slate-700 hover:border-purple-200"
                        )}
                      >
                        <span className="line-clamp-2">{cat}</span>
                        {essayCategory === cat && <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 ml-1" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-600">Your target word count:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={targetWordCount}
                      onChange={(e) => setTargetWordCount(e.target.value)}
                      placeholder="e.g., 650 words, 250 words"
                      className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      {['250', '500', '650'].map(wc => (
                        <button
                          key={wc}
                          type="button"
                          onClick={() => setTargetWordCount(`${wc} words`)}
                          className={cn(
                            "px-2 py-1 rounded text-[10px] font-bold border transition-colors",
                            targetWordCount.includes(wc) 
                              ? "bg-purple-600 text-white border-purple-600" 
                              : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                          )}
                        >
                          {wc}w
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Prompt (Optional) */}
              <div className="space-y-2 p-3 bg-white border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="bg-slate-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px]">2</span>
                    Step 2: Prompt
                  </label>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Optional</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Please share: The exact prompt or central topic you wish to address.</p>
                <textarea
                  value={promptTopic}
                  onChange={(e) => setPromptTopic(e.target.value)}
                  placeholder="Paste prompt or topic here (optional, e.g. 'Describe a topic, idea, or concept you find so engaging that it makes you lose all track of time...')"
                  className="w-full h-20 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* Action */}
              <Button
                onClick={handleGenerateNarrativeAngles}
                disabled={isNarrativeLoading || !essayCategory || !targetWordCount.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-2.5 shadow-md"
              >
                {isNarrativeLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Synthesizing Strategy...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" /> Suggest Narrative Turns & Profile Connections
                  </>
                )}
              </Button>
            </div>

            {/* Narrative Angles Display & Selection */}
            <div className="lg:col-span-7 space-y-3 flex flex-col">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Suggested Narrative Turns & Profile Connections
                </label>
                {selectedOptionIndex !== null && narrativeOptions[selectedOptionIndex] && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      const opt = narrativeOptions[selectedOptionIndex];
                      handleCopy(`TITLE: ${opt.title}\n\nNARRATIVE TURN:\n${opt.narrativeTurn}\n\nPROFILE CONNECTION:\n${opt.profileConnection}\n\nSTRUCTURAL OUTLINE:\n${opt.structuralOutline}\n\nGRAMMAR & TONE:\n${opt.grammarAndToneAdvice}`);
                    }} 
                    className="h-7 text-[11px] font-bold"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-600 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    {copied ? 'Copied Strategy' : 'Copy Strategy'}
                  </Button>
                )}
              </div>

              <div className="w-full h-[460px] p-4 bg-slate-50 border border-slate-200 rounded-2xl overflow-y-auto space-y-4">
                {isNarrativeLoading ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-3 text-purple-600">
                    <Sparkles className="w-8 h-8 animate-pulse" />
                    <p className="font-semibold text-slate-600 text-xs">Analyzing profile background & synthesizing narrative turns...</p>
                  </div>
                ) : narrativeError ? (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                    {narrativeError}
                  </div>
                ) : narrativeOptions.length > 0 ? (
                  <div className="space-y-4">
                    {generalAdvice && (
                      <div className="p-3 bg-purple-50/80 border border-purple-100 rounded-xl text-xs text-purple-900 flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Authorial Strategy Overview: </span>
                          {generalAdvice}
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      {narrativeOptions.map((opt, idx) => {
                        const isSelected = selectedOptionIndex === idx;
                        return (
                          <div
                            key={idx}
                            onClick={() => setSelectedOptionIndex(idx)}
                            className={cn(
                              "p-4 rounded-xl border-2 transition-all cursor-pointer space-y-3 bg-white relative",
                              isSelected 
                                ? "border-purple-600 bg-purple-50/10 shadow-md ring-2 ring-purple-500/20" 
                                : "border-slate-200 hover:border-purple-300 hover:bg-slate-50/50"
                            )}
                          >
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                                  isSelected ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-700"
                                )}>
                                  Option {idx + 1}
                                </span>
                                <h5 className="font-bold text-sm text-slate-900">{opt.title}</h5>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOptionIndex(idx);
                                }}
                                className={cn(
                                  "text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1 transition-all",
                                  isSelected 
                                    ? "bg-purple-600 text-white shadow-xs" 
                                    : "bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-purple-700"
                                )}
                              >
                                {isSelected ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Selected Option
                                  </>
                                ) : (
                                  "Select Option"
                                )}
                              </button>
                            </div>

                            {/* Narrative Turn */}
                            <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-lg text-xs text-purple-950">
                              <span className="font-bold text-purple-900 block mb-1">💡 Suggested Narrative Turn:</span>
                              <p className="leading-relaxed">{opt.narrativeTurn}</p>
                            </div>

                            {/* Profile Connection */}
                            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg text-xs text-blue-950">
                              <span className="font-bold text-blue-900 block mb-1">👤 Profile Details Connection:</span>
                              <p className="leading-relaxed">{opt.profileConnection}</p>
                            </div>

                            {/* Outline */}
                            <div className="text-xs text-slate-600">
                              <span className="font-bold text-slate-800">Structural Outline & Pacing: </span>
                              <div className="mt-1 p-2 bg-slate-50 border border-slate-100 rounded-lg font-mono text-[11px] whitespace-pre-line text-slate-700">
                                {opt.structuralOutline}
                              </div>
                            </div>

                            {/* Grammar & Tone Advice */}
                            <div className="p-2.5 bg-amber-50/70 border border-amber-200/60 rounded-lg text-xs text-amber-900">
                              <span className="font-bold text-amber-900 block mb-0.5">✍️ English Grammar & Style Notes:</span>
                              <p className="leading-relaxed text-[11px]">{opt.grammarAndToneAdvice}</p>
                            </div>

                            {/* Apply Button */}
                            <div className="pt-1 flex justify-end">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOptionIndex(idx);
                                  handleApplySelectedOption(opt);
                                }}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8"
                              >
                                <FileCheck className="w-3.5 h-3.5 mr-1" /> Use Strategy & Start Writing
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : narrativeRawResult ? (
                  <div className="prose prose-xs max-w-none text-slate-800 space-y-4">
                    <Markdown>{narrativeRawResult}</Markdown>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6 space-y-2">
                    <BookOpen className="w-8 h-8 text-slate-300" />
                    <p className="font-medium text-slate-500">Complete Mandatory Step 1 on the left.</p>
                    <p className="text-[11px] text-slate-400">Author's Compass will analyze your profile and synthesize 2–3 custom narrative turns and profile connections.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Input Side */}
            <div className="space-y-3 flex flex-col">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Original SOP / Essay Text</label>
                <span className="text-[11px] text-slate-400 font-medium">
                  {inputText.trim().split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste your Statement of Purpose (SOP) or personal essay draft here..."
                className="w-full h-80 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-serif leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
              <Button 
                onClick={handleProofread} 
                disabled={isLoading || !inputText.trim()} 
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-2.5 w-full shadow-md"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Analyzing Mechanics & Voice...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" /> Proofread & Mentoring Analysis
                  </>
                )}
              </Button>
            </div>

            {/* Output Side */}
            <div className="space-y-3 flex flex-col">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Polished Text & Correction Log</label>
                {resultMarkdown && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleCopy(resultMarkdown)} className="h-7 text-[11px] font-bold">
                      {copied ? <Check className="w-3.5 h-3.5 text-green-600 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                      {copied ? 'Copied' : 'Copy Response'}
                    </Button>
                    {onApplyText && (
                      <Button size="sm" onClick={handleApply} className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                        <FileCheck className="w-3.5 h-3.5 mr-1" /> Apply to Editor
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="w-full h-80 p-4 bg-slate-50 border border-slate-200 rounded-xl overflow-y-auto text-xs leading-relaxed text-slate-800">
                {isLoading ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-3 text-purple-600">
                    <Sparkles className="w-8 h-8 animate-pulse" />
                    <p className="font-semibold text-slate-600">Reviewing grammar, punctuation & narrative voice...</p>
                  </div>
                ) : errorMessage ? (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs space-y-1">
                    <p className="font-bold">Error Processing Request</p>
                    <p>{errorMessage}</p>
                  </div>
                ) : resultMarkdown ? (
                  <div className="prose prose-xs max-w-none text-slate-800 space-y-4">
                    <Markdown>{resultMarkdown}</Markdown>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6 space-y-2">
                    <Sparkles className="w-8 h-8 text-slate-300" />
                    <p className="font-medium text-slate-500">No proofreading results yet.</p>
                    <p className="text-[11px] text-slate-400">Paste your text on the left and click "Proofread & Mentoring Analysis".</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
