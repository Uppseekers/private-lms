import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Save, Send, AlertCircle, Plus, CheckCircle2, Clock, MessageSquare, BookOpen, ChevronRight, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDatabase } from '@/context/DatabaseContext';
import { Student, Essay, EssayVersion } from '@/types';



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
    updateStudent({
      ...student,
      essays: updatedEssays,
      activities: [
        {
          id: Math.random().toString(),
          date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
          type: 'SYSTEM',
          description: `Started a new blank essay document`
        },
        ...(student.activities || [])
      ]
    });
    setSelectedEssay(newEssay);
  };

  const handleSaveDraft = (essayId: string, content: string) => {
    if (!student) return;
    const newEssays = essays.map(e => {
      if (e.id === essayId) {
        const newVersion: EssayVersion = {
          id: `v${e.versions.length + 1}.0`,
          version: `v${e.versions.length + 1}.0`,
          content,
          date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })
        };
        return {
          ...e,
          status: 'Draft Saved' as const,
          versions: [newVersion, ...e.versions]
        };
      }
      return e;
    });
    
    updateStudent({
      ...student,
      essays: newEssays,
      activities: [
        {
          id: Math.random().toString(),
          date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
          type: 'UPDATE',
          description: `Draft saved for ${newEssays.find(e => e.id === essayId)?.prompt}`
        },
        ...(student.activities || [])
      ]
    });
  };

  const handleSubmit = (essayId: string) => {
    if (!student) return;
    const newEssays = essays.map(e => {
      if (e.id === essayId) {
        return { ...e, status: 'Under Review' as const };
      }
      return e;
    });
    
    updateStudent({
      ...student,
      essays: newEssays,
      activities: [
        {
          id: Math.random().toString(),
          date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
          type: 'UPLOAD',
          description: `Essay submitted for review: ${newEssays.find(e => e.id === essayId)?.prompt}`
        },
        ...(student.activities || [])
      ]
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
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search Prompt / University..." className="w-64 bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <Button onClick={handleCreateNewDocument} className="bg-blue-600 hover:bg-blue-700 text-white">
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
  
  const [aiTab, setAiTab] = useState<'checks' | 'dictionary'>('checks');
  const [dictionarySearch, setDictionarySearch] = useState('');

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
            
            <div className="flex-1 relative bg-white overflow-hidden">
              <div 
                id="highlight-overlay"
                className="absolute inset-0 w-full h-full p-8 font-serif text-lg leading-relaxed text-slate-800 whitespace-pre-wrap break-words overflow-auto pointer-events-none z-10"
                aria-hidden="true"
                style={{ scrollbarWidth: 'none' /* hide scrollbar so it doesn't cover textarea scrollbar */ }}
              >
                {renderHighlightedText()}
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onScroll={handleScroll}
                disabled={isReadOnly}
                placeholder="Start writing your essay here..."
                className={`absolute inset-0 w-full h-full p-8 resize-none focus:outline-none focus:ring-0 font-serif text-lg leading-relaxed disabled:bg-slate-50 disabled:text-slate-600 z-0 bg-transparent caret-slate-800 ${grammarErrors.length > 0 ? 'text-transparent' : 'text-slate-800'}`}
              />
              {isReadOnly && (
                <div className="absolute inset-0 bg-slate-50/50 flex items-center justify-center backdrop-blur-[1px] pointer-events-none">
                  <div className="bg-white/90 px-4 py-2 rounded-lg shadow-sm border border-slate-200 text-sm font-bold text-slate-600 uppercase tracking-wider">
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
                  className={cn("px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5", aiTab === 'checks' ? "bg-white text-blue-700 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900")}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Live Checks ({grammarIssues})
                </button>
                <button 
                  onClick={() => setAiTab('dictionary')} 
                  className={cn("px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5", aiTab === 'dictionary' ? "bg-white text-indigo-700 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900")}
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
