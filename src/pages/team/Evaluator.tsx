import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDatabase } from '@/context/DatabaseContext';
import { 
  FileText, Search, Filter, CheckCircle2, AlertCircle, Clock, 
  MessageSquare, Edit3, Save, Lock, Unlock, ArrowRight, X, Sparkles, 
  GraduationCap, User, Check, RefreshCw, Send, Star, Layers, History,
  CheckSquare, Paperclip, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Student, Essay, EssayVersion, Task, TaskStage } from '@/types';
import { getScopedStudentsForStaff } from '@/lib/staffPermissions';

interface ExtendedSubmission {
  id: string;
  submissionType: 'ESSAY' | 'TASK';
  title: string;
  category: string;
  targetOrUni: string;
  studentName: string;
  studentId: string;
  counselor?: string;
  studentEmail?: string;
  status: string;
  submissionDate: string;
  content?: string;
  promptOrDesc?: string;
  attachments?: any[];
  feedback?: string;
  rawEssay?: Essay;
  rawTask?: Task;
}

export default function Evaluator() {
  const { students, updateStudent, currentUser, permissionsMatrix } = useDatabase();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentFilter, setSelectedStudentFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [submissionTypeTab, setSubmissionTypeTab] = useState<'ALL' | 'ESSAY' | 'TASK'>('ALL');
  
  // Active Editor Modal State for Essays
  const [activeEssaySubmission, setActiveEssaySubmission] = useState<ExtendedSubmission | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [mentorComment, setMentorComment] = useState('');
  const [evaluationStatus, setEvaluationStatus] = useState<'Under Review' | 'Needs Revision' | 'Approved' | 'Draft'>('Under Review');
  const [commentsList, setCommentsList] = useState<{ id: string; author: string; date: string; text: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Active Task Review Modal State
  const [activeTaskSubmission, setActiveTaskSubmission] = useState<ExtendedSubmission | null>(null);
  const [taskReviewStage, setTaskReviewStage] = useState<TaskStage>('SUBMITTED_FOR_REVIEW');
  const [taskFeedback, setTaskFeedback] = useState('');

  // Scoped student list based on staff permissions
  const scopedStudents = getScopedStudentsForStaff(students, currentUser, permissionsMatrix);

  // Flatten all submissions (essays + tasks) from scoped students
  const allSubmissions: ExtendedSubmission[] = scopedStudents.flatMap(student => {
    const essayItems: ExtendedSubmission[] = (student.essays || []).map(essay => {
      const displayTitle = essay.title || essay.prompt || 'Untitled Essay';
      const displayPrompt = essay.prompt || essay.title || 'Application Essay Prompt';
      const displayUniversity = essay.university || 'General Application';
      const subDate = (essay.versions && essay.versions.length > 0) ? essay.versions[0].date : ((essay as any).submittedDate || (essay as any).lastUpdated || 'Aug 2026');
      
      const versions = essay.versions || [];
      const versionWithContent = versions.find(v => v && typeof v.content === 'string' && v.content.trim().length > 0);
      const latestVersion = versionWithContent || (versions.length > 0 ? versions[0] : null);

      return {
        id: `essay_${essay.id}`,
        submissionType: 'ESSAY',
        title: displayTitle,
        category: 'College Essay',
        targetOrUni: displayUniversity,
        studentName: student.name,
        studentId: student.id,
        counselor: student.counselor,
        studentEmail: student.email,
        status: essay.status || 'Under Review',
        submissionDate: subDate || 'Recent',
        content: latestVersion?.content || '',
        promptOrDesc: displayPrompt,
        rawEssay: essay
      };
    });

    const taskItems: ExtendedSubmission[] = (student.tasks || []).map(task => {
      let statusLabel = 'Under Review';
      if (task.stage === 'COMPLETED') statusLabel = 'Approved';
      else if (task.stage === 'NEEDS_REVISION') statusLabel = 'Needs Revision';
      else if (task.stage === 'IN_PROGRESS') statusLabel = 'In Progress';
      else if (task.stage === 'TO_DO') statusLabel = 'To Do';

      return {
        id: `task_${task.id}`,
        submissionType: 'TASK',
        title: task.name || 'Untitled Task',
        category: task.category || 'Assignment',
        targetOrUni: task.relatedTo || 'Counselor Task',
        studentName: student.name,
        studentId: student.id,
        counselor: student.counselor,
        studentEmail: student.email,
        status: statusLabel,
        submissionDate: task.dueDate || 'Ongoing',
        promptOrDesc: task.description || '',
        attachments: task.attachments || [],
        feedback: task.feedback || '',
        rawTask: task
      };
    });

    return [...essayItems, ...taskItems];
  });

  // Filtered queue
  const filteredSubmissions = allSubmissions.filter(sub => {
    if (submissionTypeTab !== 'ALL' && sub.submissionType !== submissionTypeTab) {
      return false;
    }

    const q = searchQuery.toLowerCase();
    const titleText = (sub.title || '').toLowerCase();
    const promptText = (sub.promptOrDesc || '').toLowerCase();
    const targetText = (sub.targetOrUni || '').toLowerCase();
    const studentText = (sub.studentName || '').toLowerCase();
    const categoryText = (sub.category || '').toLowerCase();

    const matchesSearch = !q || 
      studentText.includes(q) || 
      titleText.includes(q) || 
      promptText.includes(q) ||
      targetText.includes(q) ||
      categoryText.includes(q);

    const matchesStudent = selectedStudentFilter === 'ALL' || sub.studentId === selectedStudentFilter;
    const matchesStatus = selectedStatusFilter === 'ALL' || sub.status === selectedStatusFilter;

    return matchesSearch && matchesStudent && matchesStatus;
  });

  const underReviewCount = allSubmissions.filter(e => e.status === 'Under Review' || e.status === 'Submitted For Review').length;
  const needsRevisionCount = allSubmissions.filter(e => e.status === 'Needs Revision').length;
  const approvedCount = allSubmissions.filter(e => e.status === 'Approved' || e.status === 'Completed').length;
  const essaysCount = allSubmissions.filter(e => e.submissionType === 'ESSAY').length;
  const tasksCount = allSubmissions.filter(e => e.submissionType === 'TASK').length;

  const handleOpenSubmission = (sub: ExtendedSubmission) => {
    if (sub.submissionType === 'ESSAY' && sub.rawEssay) {
      setActiveEssaySubmission(sub);
      const essay = sub.rawEssay;
      const versions = essay.versions || [];
      const versionWithContent = versions.find(v => v && typeof v.content === 'string' && v.content.trim().length > 0);
      const latestVersion = versionWithContent || (versions.length > 0 ? versions[0] : null);

      setEditedContent(latestVersion?.content || '');
      setEvaluationStatus(essay.status as any || 'Under Review');
      setMentorComment('');
      setCommentsList(latestVersion?.inlineComments || []);
      setSaveSuccess(false);
    } else if (sub.submissionType === 'TASK' && sub.rawTask) {
      setActiveTaskSubmission(sub);
      setTaskReviewStage(sub.rawTask.stage || 'SUBMITTED_FOR_REVIEW');
      setTaskFeedback(sub.rawTask.feedback || '');
      setSaveSuccess(false);
    }
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

  const handleSaveEssayEvaluation = () => {
    if (!activeEssaySubmission || !activeEssaySubmission.rawEssay) return;
    setIsSaving(true);

    const targetStudent = students.find(s => s.id === activeEssaySubmission.studentId);
    if (!targetStudent) {
      setIsSaving(false);
      return;
    }

    const currentVersions = activeEssaySubmission.rawEssay.versions || [];
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
      if (e.id === activeEssaySubmission.rawEssay?.id) {
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
      description: `Evaluated "${activeEssaySubmission.title}" for ${targetStudent.name}. Status set to "${evaluationStatus}" (${wordCount} words).`
    };

    updateStudent({
      ...targetStudent,
      essays: updatedEssays,
      operationalLogs: [logEntry, ...(targetStudent.operationalLogs || [])]
    });

    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setActiveEssaySubmission(null);
      }, 1000);
    }, 500);
  };

  const handleSaveTaskEvaluation = () => {
    if (!activeTaskSubmission || !activeTaskSubmission.rawTask) return;
    setIsSaving(true);

    const targetStudent = students.find(s => s.id === activeTaskSubmission.studentId);
    if (!targetStudent) {
      setIsSaving(false);
      return;
    }

    const updatedTasks = (targetStudent.tasks || []).map(t => {
      if (t.id === activeTaskSubmission.rawTask?.id) {
        return {
          ...t,
          stage: taskReviewStage,
          feedback: taskFeedback
        };
      }
      return t;
    });

    const logEntry = {
      id: 'LOG-' + Date.now(),
      timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
      performedBy: currentUser.name || 'Evaluator',
      role: currentUser.role || 'MENTOR',
      studentId: targetStudent.id,
      activityType: 'Task Evaluated',
      description: `Evaluated Task "${activeTaskSubmission.title}" for ${targetStudent.name}. Stage updated to "${taskReviewStage.replace(/_/g, ' ')}".`
    };

    const newActivities = [...(targetStudent.activities || [])];
    if (taskReviewStage === 'COMPLETED') {
      newActivities.unshift({
        id: 'ACT-' + Date.now(),
        date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
        type: 'VERIFIED',
        description: `Task verified and completed by counselor: ${activeTaskSubmission.title}`
      });
    } else if (taskReviewStage === 'NEEDS_REVISION') {
      newActivities.unshift({
        id: 'ACT-' + Date.now(),
        date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
        type: 'UPDATE',
        description: `Task revision requested by counselor: ${activeTaskSubmission.title}`
      });
    }

    updateStudent({
      ...targetStudent,
      tasks: updatedTasks,
      activities: newActivities,
      operationalLogs: [logEntry, ...(targetStudent.operationalLogs || [])]
    });

    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setActiveTaskSubmission(null);
      }, 1000);
    }, 500);
  };

  const getPendingDays = (dateStr: string) => {
    try {
      const subDate = new Date(dateStr);
      if (isNaN(subDate.getTime())) return 1;
      const diffTime = Math.max(0, Date.now() - subDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (e) {
      return 1;
    }
  };

  const getStatusBadge = (status?: string) => {
    const s = status || 'Under Review';
    if (s === 'Approved' || s === 'Completed') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {s}</span>;
    }
    if (s === 'Needs Revision') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200"><AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Needs Revision</span>;
    }
    if (s === 'Draft' || s === 'To Do') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200"><FileText className="w-3.5 h-3.5 text-slate-500" /> {s}</span>;
    }
    if (s === 'In Progress') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200"><Clock className="w-3.5 h-3.5 text-blue-600" /> In Progress</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3.5 h-3.5 text-amber-600" /> Under Review</span>;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto w-full pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Edit3 className="w-8 h-8 text-indigo-600" />
            Assignment Evaluator & Submission Review
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review student essays and submitted assignments, evaluate drafts, provide mentor feedback, and update statuses live.
          </p>
        </div>

        {/* Quick Stats Pills */}
        <div className="flex items-center gap-2 flex-wrap">
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
        {/* Tab Toggle: All / Essays / Tasks */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50/70 px-4 pt-3 gap-2 overflow-x-auto">
          <button
            onClick={() => setSubmissionTypeTab('ALL')}
            className={cn(
              "px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2",
              submissionTypeTab === 'ALL' 
                ? "bg-white text-indigo-700 border-indigo-600 shadow-2xs" 
                : "text-slate-600 border-transparent hover:text-slate-900"
            )}
          >
            <Layers className="w-4 h-4" /> All Submissions ({allSubmissions.length})
          </button>
          <button
            onClick={() => setSubmissionTypeTab('ESSAY')}
            className={cn(
              "px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2",
              submissionTypeTab === 'ESSAY' 
                ? "bg-white text-indigo-700 border-indigo-600 shadow-2xs" 
                : "text-slate-600 border-transparent hover:text-slate-900"
            )}
          >
            <FileText className="w-4 h-4 text-purple-600" /> Essays & Writing ({essaysCount})
          </button>
          <button
            onClick={() => setSubmissionTypeTab('TASK')}
            className={cn(
              "px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2",
              submissionTypeTab === 'TASK' 
                ? "bg-white text-indigo-700 border-indigo-600 shadow-2xs" 
                : "text-slate-600 border-transparent hover:text-slate-900"
            )}
          >
            <CheckSquare className="w-4 h-4 text-emerald-600" /> Tasks & Assignments ({tasksCount})
          </button>
        </div>

        <div className="p-4 sm:p-6 bg-white border-b border-slate-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1">
             <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
             <input
               type="text"
               placeholder="Search by student, assignment title, prompt, category or university..."
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
              <option value="ALL">All Students ({scopedStudents.length})</option>
              {scopedStudents.map(s => (
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
              <option value="Approved">Approved / Completed</option>
              <option value="In Progress">In Progress</option>
              <option value="To Do">To Do</option>
            </select>
          </div>
        </div>

        {/* Submissions Queue Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4">Student Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Assignment / Essay Title & Target</th>
                <th className="px-6 py-4">Submission / Due Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredSubmissions.length > 0 ? filteredSubmissions.map((sub, idx) => {
                const pendingDays = getPendingDays(sub.submissionDate);
                return (
                  <tr key={sub.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                          {sub.studentName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{sub.studentName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{sub.studentId}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider",
                        sub.submissionType === 'ESSAY' ? "bg-purple-50 text-purple-700 border border-purple-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      )}>
                        {sub.submissionType === 'ESSAY' ? <FileText className="w-3 h-3" /> : <CheckSquare className="w-3 h-3" />}
                        {sub.submissionType === 'ESSAY' ? 'Essay' : 'Task'}
                      </span>
                    </td>

                    <td className="px-6 py-4 max-w-xs">
                      <div className="font-bold text-slate-900 text-sm truncate">{sub.title}</div>
                      <div className="text-xs text-indigo-600 font-medium mt-0.5">{sub.targetOrUni}</div>
                      {sub.promptOrDesc && <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">{sub.promptOrDesc}</div>}
                    </td>

                    <td className="px-6 py-4 text-xs font-medium text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{sub.submissionDate}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {getStatusBadge(sub.status)}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Button 
                        onClick={() => handleOpenSubmission(sub)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 shadow-sm flex items-center gap-1.5 ml-auto"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> 
                        {sub.submissionType === 'ESSAY' ? 'Open Editor' : 'Review Task'} 
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
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
      {activeEssaySubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-6xl h-[94vh] max-h-[920px] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            
            {/* Modal Top Navigation Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between gap-4 shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 font-extrabold text-sm">
                  {activeEssaySubmission.studentName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white truncate">{activeEssaySubmission.title}</h2>
                    <span className="text-[11px] bg-indigo-900/80 text-indigo-200 px-2.5 py-0.5 rounded-full font-semibold border border-indigo-700">
                      {activeEssaySubmission.targetOrUni || 'Target University'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>Student: <strong className="text-slate-200">{activeEssaySubmission.studentName}</strong> ({activeEssaySubmission.studentId})</span>
                    <span>•</span>
                    <span>Counselor: <strong className="text-slate-200">{activeEssaySubmission.counselor || 'Admin'}</strong></span>
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
                  onClick={handleSaveEssayEvaluation}
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 shadow-md flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Syncing...' : 'Save & Sync Student Profile'}
                </Button>

                <button 
                  onClick={() => setActiveEssaySubmission(null)} 
                  className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Prompt Banner */}
            {activeEssaySubmission.promptOrDesc && (
              <div className="bg-indigo-50/80 border-b border-indigo-100 px-6 py-3 text-xs text-indigo-950 flex items-start gap-2.5 shrink-0">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-indigo-900">Official Essay Prompt: </strong>
                  <span>{activeEssaySubmission.promptOrDesc}</span>
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
                    editedContent.trim().split(/\s+/).filter(Boolean).length > (activeEssaySubmission.rawEssay?.targetCount || 650) ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-700 border-slate-200"
                  )}>
                    Word Count: <strong>{editedContent.trim() ? editedContent.trim().split(/\s+/).filter(Boolean).length : 0}</strong> / {activeEssaySubmission.rawEssay?.targetCount || 650} target
                  </span>
                </div>

                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  placeholder="Paste or write student essay text here..."
                  className="flex-1 w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-serif leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[360px]"
                />

                <p className="text-[11px] text-slate-400 italic">
                  Note: Edits made in this draft workspace will be saved as a new version under {activeEssaySubmission.studentName}'s student profile.
                </p>
              </div>

              {/* Right Column: Mentor Review & Evaluation Panel */}
              <div className="w-full md:w-96 bg-slate-50 p-6 flex flex-col overflow-y-auto space-y-6">
                
                {/* Status Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Evaluation Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Under Review', 'Needs Revision', 'Approved', 'Draft'] as const).map(status => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setEvaluationStatus(status)}
                        className={cn(
                          "py-2 px-3 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between",
                          evaluationStatus === status 
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs" 
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        <span>{status}</span>
                        {evaluationStatus === status && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Add Mentor Feedback / Inline Comment */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-600" /> Add Feedback / Mentor Note
                  </label>
                  <div className="space-y-2">
                    <textarea
                      value={mentorComment}
                      onChange={(e) => setMentorComment(e.target.value)}
                      placeholder="Write feedback, revision suggestions, or strengths..."
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-24"
                    />
                    <Button 
                      onClick={handleAddComment}
                      disabled={!mentorComment.trim()}
                      size="sm"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold h-8 rounded-lg flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3 h-3" /> Post Feedback Note
                    </Button>
                  </div>
                </div>

                {/* Feedback History & Inline Comments */}
                <div className="space-y-3 flex-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block flex items-center justify-between">
                    <span>Feedback Stream ({commentsList.length})</span>
                    <History className="w-3.5 h-3.5 text-slate-400" />
                  </label>

                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {commentsList.length > 0 ? commentsList.map((cmt, i) => (
                      <div key={cmt.id || i} className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1 shadow-2xs">
                        <div className="flex justify-between items-center text-slate-400 text-[10px] font-semibold">
                          <span className="text-indigo-600 font-bold">{cmt.author}</span>
                          <span>{cmt.date}</span>
                        </div>
                        <p className="text-slate-700 font-medium leading-relaxed">{cmt.text}</p>
                      </div>
                    )) : (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                        No feedback notes yet. Add one above.
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* Interactive Task Evaluation Modal */}
      {activeTaskSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            
            {/* Top Bar */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between gap-4 shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-400/40 flex items-center justify-center text-emerald-300 font-extrabold text-sm">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white truncate">{activeTaskSubmission.title}</h2>
                    <span className="text-[11px] bg-emerald-900/80 text-emerald-200 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-700">
                      {activeTaskSubmission.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>Student: <strong className="text-slate-200">{activeTaskSubmission.studentName}</strong> ({activeTaskSubmission.studentId})</span>
                    <span>•</span>
                    <span>Due: <strong className="text-slate-200">{activeTaskSubmission.submissionDate}</strong></span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {saveSuccess && (
                  <span className="bg-emerald-500/20 text-emerald-300 text-xs px-3 py-1 rounded-full border border-emerald-500/40 font-bold flex items-center gap-1.5 animate-in fade-in">
                    <Check className="w-4 h-4" /> Task Evaluated & Synced!
                  </span>
                )}

                <Button 
                  onClick={handleSaveTaskEvaluation}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 shadow-md flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Evaluation'}
                </Button>

                <button 
                  onClick={() => setActiveTaskSubmission(null)} 
                  className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Task Details Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50">
              {/* Instructions / Description */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Assignment Instructions / Details</span>
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {activeTaskSubmission.promptOrDesc || 'No written instructions attached.'}
                </p>
                {activeTaskSubmission.targetOrUni && (
                  <p className="text-xs text-indigo-600 font-semibold pt-1">
                    Related To: {activeTaskSubmission.targetOrUni}
                  </p>
                )}
              </div>

              {/* Attachments */}
              {activeTaskSubmission.attachments && activeTaskSubmission.attachments.length > 0 && (
                <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-slate-500" /> Attached Documents & Reference Files ({activeTaskSubmission.attachments.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {activeTaskSubmission.attachments.map((file, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-800">
                        <span className="truncate">{file}</span>
                        <span className="text-[10px] text-blue-600 font-bold uppercase">Attached</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stage Selector */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Set Task Evaluation Stage</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: 'COMPLETED' as TaskStage, label: 'Approved & Completed', color: 'bg-emerald-600 text-white' },
                    { key: 'NEEDS_REVISION' as TaskStage, label: 'Needs Revision', color: 'bg-rose-600 text-white' },
                    { key: 'IN_PROGRESS' as TaskStage, label: 'In Progress', color: 'bg-blue-600 text-white' },
                    { key: 'TO_DO' as TaskStage, label: 'To Do (Pending)', color: 'bg-slate-700 text-white' }
                  ].map(stage => (
                    <button
                      key={stage.key}
                      type="button"
                      onClick={() => setTaskReviewStage(stage.key)}
                      className={cn(
                        "p-3 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center justify-center gap-1",
                        taskReviewStage === stage.key
                          ? `${stage.color} shadow-xs border-transparent`
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      <span>{stage.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Counselor Feedback & Revision Instructions */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-600" /> Counselor Evaluation Feedback / Revision Instructions
                </span>
                <textarea
                  value={taskFeedback}
                  onChange={(e) => setTaskFeedback(e.target.value)}
                  placeholder="Enter detailed review feedback, marks, notes, or required next steps for the student..."
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-28"
                />
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

