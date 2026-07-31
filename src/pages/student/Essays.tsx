import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Save, Send, AlertCircle, Plus, CheckCircle2, Clock, MessageSquare, BookOpen, ChevronRight, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDatabase } from '@/context/DatabaseContext';
import { Student, Essay, EssayVersion } from '@/types';



interface GrammarError {
  id: string;
  message: string;
  matchText: string;
  index: number;
  length: number;
}

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
  const [activeErrorId, setActiveErrorId] = useState<string | null>(null);
  
  const [grammarIssues, setGrammarIssues] = useState(0);
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
      // Mock readability based on sentence length and word length
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length || 1;
      const avgWordsPerSentence = words / sentences;
      const readScore = Math.min(98, Math.max(40, 100 - (avgWordsPerSentence - 15) * 2));
      

      // Mock grammar/spelling checks with positions
      const newErrors: GrammarError[] = [];
      let match;
      
      const repeatedRegex = /\b(\w+)\s+\1\b/gi;
      while ((match = repeatedRegex.exec(text)) !== null) {
        newErrors.push({ id: Math.random().toString(), message: `Repeated word: "${match[1]}"`, matchText: match[0], index: match.index, length: match[0].length });
      }
      
      const capsRegex = /(?:^\s*|[.!?]\s+)([a-z])/g;
      while ((match = capsRegex.exec(text)) !== null) {
        newErrors.push({ id: Math.random().toString(), message: `Missing capitalization`, matchText: match[1], index: match.index + match[0].length - 1, length: 1 });
      }
      
      const spellRegex = /\b(teh|recieve|beleive|definately|seperate|alot)\b/gi;
      while ((match = spellRegex.exec(text)) !== null) {
        newErrors.push({ id: Math.random().toString(), message: `Possible misspelling`, matchText: match[0], index: match.index, length: match[0].length });
      }
      
      const puncRegex = /(\s+[,.!?;:])/g;
      while ((match = puncRegex.exec(text)) !== null) {
        newErrors.push({ id: Math.random().toString(), message: `Space before punctuation`, matchText: match[0], index: match.index, length: match[0].length });
      }
      
      // Keep only up to 5 errors
      const topErrors = newErrors.slice(0, 5);
      
      setGrammarErrors(topErrors);
      setGrammarIssues(topErrors.length);
      setIsAnalyzing(false);
    }, 1000);
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
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-blue-500" /> AI Writing Assistant
              </h4>
              {isAnalyzing && <span className="text-[10px] font-bold text-blue-500 uppercase animate-pulse">Analyzing...</span>}
            </div>
            <CardContent className="p-5 space-y-6">
  <div className="pt-4 border-slate-100">
                <h5 className="text-xs font-bold text-slate-700 uppercase mb-3">Live Checks</h5>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    {grammarIssues === 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">Grammar & Spelling</p>
                      <p className="text-xs text-slate-500">
                        {grammarIssues === 0 ? 'No issues found.' : `${grammarIssues} potential issue${grammarIssues > 1 ? 's' : ''} detected.`}
                      </p>
                      {grammarErrors.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {grammarErrors.map((err, i) => (
                            <div 
                              key={err.id} 
                              className={`text-[10px] px-2 py-1.5 rounded cursor-pointer transition-colors ${activeErrorId === err.id ? 'bg-red-100 text-red-900 border border-red-200 shadow-sm' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
                              onClick={() => setActiveErrorId(activeErrorId === err.id ? null : err.id)}
                            >
                              <div className="font-bold flex items-center gap-1">
                                🔴 {err.message}
                              </div>
                              {activeErrorId === err.id && (
                                <div className="mt-1 pt-1 border-t border-red-200/50 text-red-800">
                                  Found at: "{err.matchText}"
                                  <br/>
                                  <span className="opacity-75 italic mt-0.5 block">Review and manually update this in your text if needed.</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    {wordCount > 650 ? (
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    ) : wordCount > 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-200 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-900">Word Count Limit</p>
                      <p className="text-xs text-slate-500">{wordCount > 650 ? 'Over 650 words limit.' : 'Within acceptable range.'}</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h5 className="text-xs font-bold text-slate-700 uppercase mb-3">Live Summary</h5>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                  {content.length > 50 
                    ? "The essay discusses the author's background and identity, focusing on personal growth and technical aspirations."
                    : "Start writing to generate a live summary..."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
