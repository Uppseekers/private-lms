import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDatabase } from '@/context/DatabaseContext';
import { 
  FileText, Search, Filter, CheckCircle2, AlertCircle, Clock, 
  MessageSquare, Edit3, Save, Lock, Unlock, ArrowRight, X, Sparkles, 
  GraduationCap, User, Check, RefreshCw, Send, Star, Layers, History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Student, Essay, EssayVersion } from '@/types';

interface ExtendedEssay extends Essay {
  studentName: string;
  studentId: string;
  counselor?: string;
  studentEmail?: string;
}

export default function Evaluator() {
  const { students, updateStudent, currentUser } = useDatabase();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentFilter, setSelectedStudentFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  
  // Active Editor Modal State
  const [activeEssay, setActiveEssay] = useState<ExtendedEssay | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [mentorComment, setMentorComment] = useState('');
  const [evaluationStatus, setEvaluationStatus] = useState<'Under Review' | 'Needs Revision' | 'Approved' | 'Draft'>('Under Review');
  const [commentsList, setCommentsList] = useState<{ id: string; author: string; date: string; text: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Flatten all essays from all students
  const allEssays: ExtendedEssay[] = students.flatMap(student => 
    (student.essays || []).map(essay => ({
      ...essay,
      studentName: student.name,
      studentId: student.id,
      counselor: student.counselor,
      studentEmail: student.email
    }))
  );

  // Filtered queue
  const filteredEssays = allEssays.filter(essay => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
      essay.studentName.toLowerCase().includes(q) || 
      essay.title.toLowerCase().includes(q) || 
      (essay.prompt && essay.prompt.toLowerCase().includes(q)) ||
      (essay.university && essay.university.toLowerCase().includes(q));

    const matchesStudent = selectedStudentFilter === 'ALL' || essay.studentId === selectedStudentFilter;
    const matchesStatus = selectedStatusFilter === 'ALL' || essay.status === selectedStatusFilter;

    return matchesSearch && matchesStudent && matchesStatus;
  });

  const underReviewCount = allEssays.filter(e => e.status === 'Under Review').length;
  const needsRevisionCount = allEssays.filter(e => e.status === 'Needs Revision').length;
  const approvedCount = allEssays.filter(e => e.status === 'Approved').length;

  const handleOpenEditor = (essay: ExtendedEssay) => {
    setActiveEssay(essay);
    const latestVersion = essay.versions && essay.versions.length > 0 ? essay.versions[essay.versions.length - 1] : null;
    setEditedContent(latestVersion?.content || '');
    setEvaluationStatus(essay.status as any || 'Under Review');
    setMentorComment('');
    setCommentsList(latestVersion?.inlineComments || [
      {
        id: '1',
        author: essay.counselor || 'Counselor',
        date: 'Aug 1, 2026',
        text: 'Strong opening hook! Ensure the transition between the local vendor story and your computational interest feels natural.'
      }
    ]);
    setSaveSuccess(false);
  };

  const handleAddComment = () => {
    if (!mentorComment.trim()) return;
    const newComment = {
      id: 'CMT-' + Date.now(),
      author: currentUser.name || 'Counselor',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      text: mentorComment.trim()
    };
    setCommentsList([newComment, ...commentsList]);
    setMentorComment('');
  };

  const handleSaveEvaluation = () => {
    if (!activeEssay) return;
    setIsSaving(true);

    const targetStudent = students.find(s => s.id === activeEssay.studentId);
    if (!targetStudent) {
      setIsSaving(false);
      return;
    }

    const currentVersions = activeEssay.versions || [];
    const latestVersionNum = currentVersions.length > 0 ? Math.max(...currentVersions.map(v => v.versionNumber || 1)) : 1;

    // Create a new version entry
    const newVersion: EssayVersion = {
      versionNumber: latestVersionNum + 1,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      author: currentUser.name || 'Mentor Evaluator',
      content: editedContent,
      inlineComments: commentsList
    };

    const wordCount = editedContent.trim() ? editedContent.trim().split(/\s+/).length : 0;

    const updatedEssays = (targetStudent.essays || []).map(e => {
      if (e.id === activeEssay.id) {
        return {
          ...e,
          status: evaluationStatus,
          wordCount: wordCount,
          versions: [newVersion, ...currentVersions]
        };
      }
      return e;
    });

    const logEntry = {
      id: 'LOG-' + Date.now(),
      timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
      performedBy: currentUser.name || 'Evaluator',
      role: currentUser.role || 'MENTOR',
      studentId: targetStudent.id,
      activityType: 'Essay Evaluated',
      description: `Evaluated "${activeEssay.title}" for ${targetStudent.name}. Status set to "${evaluationStatus}" (${wordCount} words).`
    };

    updateStudent({
      ...targetStudent,
      essays: updatedEssays,
      operationalLogs: [logEntry, ...(targetStudent.operationalLogs || [])]
    });

    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 600);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto w-full pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Edit3 className="w-8 h-8 text-indigo-600" />
            Assignment Evaluator & Essay Review
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review student submissions, edit essay drafts, provide mentor feedback, and update statuses live.
          </p>
        </div>

        {/* Quick Stats Pills */}
        <div className="flex items-center gap-2">
          <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-800 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Under Review: <span className="font-bold">{underReviewCount}</span>
          </div>
          <div className="bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Needs Revision: <span className="font-bold">{needsRevisionCount}</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Approved: <span className="font-bold">{approvedCount}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 bg-white border-b border-slate-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1">
             <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
             <input
               type="text"
               placeholder="Search by student, essay title, prompt or university..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
             />
          </div>

          {/* Student Filter */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <select
              value={selectedStudentFilter}
              onChange={(e) => setSelectedStudentFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Students ({students.length})</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="Under Review">Under Review</option>
              <option value="Needs Revision">Needs Revision</option>
              <option value="Approved">Approved</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>

        {/* Essays Queue Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4">Assignment / Essay Title & Target</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredEssays.length > 0 ? filteredEssays.map((essay, idx) => (
                <tr key={essay.id || idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 text-base">{essay.title}</div>
                    <div className="text-xs text-indigo-600 font-medium mt-0.5">{essay.university || 'College Application Essay'}</div>
                    {essay.prompt && <div className="text-[11px] text-slate-400 truncate max-w-md mt-0.5">{essay.prompt}</div>}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <Button 
                      onClick={() => handleOpenEditor(essay)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 shadow-sm flex items-center gap-1.5 ml-auto"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Open Editor <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={2} className="px-6 py-12 text-center text-slate-500">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3 opacity-80" />
                    <p className="font-bold text-slate-800 text-base">No Matching Submissions</p>
                    <p className="text-xs text-slate-500 mt-1">Try resetting search filters or select a different student.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Interactive Essay Editor Modal */}
      {activeEssay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-6xl h-[94vh] max-h-[920px] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            
            {/* Modal Top Navigation Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between gap-4 shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 font-extrabold text-sm">
                  {activeEssay.studentName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white truncate">{activeEssay.title}</h2>
                    <span className="text-[11px] bg-indigo-900/80 text-indigo-200 px-2.5 py-0.5 rounded-full font-semibold border border-indigo-700">
                      {activeEssay.university || 'Target University'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>Student: <strong className="text-slate-200">{activeEssay.studentName}</strong> ({activeEssay.studentId})</span>
                    <span>•</span>
                    <span>Counselor: <strong className="text-slate-200">{activeEssay.counselor || 'Admin'}</strong></span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {saveSuccess && (
                  <span className="bg-emerald-500/20 text-emerald-300 text-xs px-3 py-1 rounded-full border border-emerald-500/40 font-bold flex items-center gap-1.5 animate-in fade-in">
                    <Check className="w-4 h-4" /> Changes Saved & Synced!
                  </span>
                )}

                <Button 
                  onClick={handleSaveEvaluation}
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 shadow-md flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Syncing...' : 'Save & Sync Student Profile'}
                </Button>

                <button 
                  onClick={() => setActiveEssay(null)} 
                  className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Prompt Banner */}
            {activeEssay.prompt && (
              <div className="bg-indigo-50/80 border-b border-indigo-100 px-6 py-3 text-xs text-indigo-950 flex items-start gap-2.5 shrink-0">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-indigo-900">Official Essay Prompt: </strong>
                  <span>{activeEssay.prompt}</span>
                </div>
              </div>
            )}

            {/* Main Split Layout: Editor Textarea + Evaluator Feedback Panel */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50">
              
              {/* Left Column: Essay Content Editor */}
              <div className="flex-1 p-6 flex flex-col overflow-y-auto border-r border-slate-200 bg-white space-y-4">
                <div className="flex justify-between items-center text-xs text-slate-500 font-semibold border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-2 text-slate-800 font-bold">
                    <FileText className="w-4 h-4 text-indigo-600" /> Live Draft Workspace
                  </span>
                  <span className={cn(
                    "font-mono px-2 py-0.5 rounded border text-[11px]",
                    editedContent.trim().split(/\s+/).filter(Boolean).length > (activeEssay.targetCount || 650) ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-700 border-slate-200"
                  )}>
                    Word Count: <strong>{editedContent.trim() ? editedContent.trim().split(/\s+/).filter(Boolean).length : 0}</strong> / {activeEssay.targetCount || 650} target
                  </span>
                </div>

                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  placeholder="Paste or write student essay text here..."
                  className="flex-1 w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-serif leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[360px]"
                />

                <p className="text-[11px] text-slate-400 italic">
                  Note: Edits made in this draft workspace will be saved as a new version under {activeEssay.studentName}'s student profile.
                </p>
              </div>

              {/* Right Column: Mentor Review & Evaluation Panel */}
              <div className="w-full md:w-96 bg-white p-6 flex flex-col justify-between overflow-y-auto shrink-0 space-y-6">
                <div className="space-y-6">
                  
                  {/* Status Decision Picker */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">1. Evaluation Decision</h3>
                    <div className="grid grid-cols-1 gap-2.5 text-xs">
                      <label className={cn(
                        "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors",
                        evaluationStatus === 'Under Review' ? "bg-amber-50 border-amber-300 font-bold text-amber-900" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                      )}>
                        <div className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name="evalStatus" 
                            checked={evaluationStatus === 'Under Review'}
                            onChange={() => setEvaluationStatus('Under Review')}
                            className="text-amber-600 focus:ring-amber-500"
                          />
                          <span>Under Review</span>
                        </div>
                        <Clock className="w-4 h-4 text-amber-600" />
                      </label>

                      <label className={cn(
                        "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors",
                        evaluationStatus === 'Needs Revision' ? "bg-rose-50 border-rose-300 font-bold text-rose-900" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                      )}>
                        <div className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name="evalStatus" 
                            checked={evaluationStatus === 'Needs Revision'}
                            onChange={() => setEvaluationStatus('Needs Revision')}
                            className="text-rose-600 focus:ring-rose-500"
                          />
                          <span>Needs Revision</span>
                        </div>
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                      </label>

                      <label className={cn(
                        "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors",
                        evaluationStatus === 'Approved' ? "bg-emerald-50 border-emerald-300 font-bold text-emerald-900" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                      )}>
                        <div className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name="evalStatus" 
                            checked={evaluationStatus === 'Approved'}
                            onChange={() => setEvaluationStatus('Approved')}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Approved & Finalized</span>
                        </div>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </label>
                    </div>
                  </div>

                  {/* Comments & Line Feedback */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. Mentor Line Feedback & Notes</h3>
                    
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={mentorComment}
                        onChange={(e) => setMentorComment(e.target.value)}
                        placeholder="Add a mentor comment..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                      />
                      <Button onClick={handleAddComment} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0">
                        <Send className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                      {commentsList.map(c => (
                        <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                          <div className="flex justify-between items-center text-[10px] text-slate-400">
                            <strong className="text-slate-700">{c.author}</strong>
                            <span>{c.date}</span>
                          </div>
                          <p className="text-slate-800 leading-snug">{c.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Save CTA */}
                <div className="pt-4 border-t border-slate-100">
                  <Button 
                    onClick={handleSaveEvaluation}
                    disabled={isSaving}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 shadow-md"
                  >
                    {isSaving ? 'Updating Student Profile...' : 'Save Evaluation & Update Profile'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
