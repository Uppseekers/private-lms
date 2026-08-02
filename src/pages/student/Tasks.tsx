import React, { useState } from 'react';
import { useDatabase } from '@/context/DatabaseContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Task, TaskCategory, TaskStage, TaskAttachment } from '@/types';
import { CheckCircle2, Clock, FileText, ChevronRight, Filter, Search, Plus, LayoutGrid, List, Paperclip, X, Upload, Link as LinkIcon, Save, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  TASK_CATEGORIES, 
  createTask, 
  createTaskCreatedActivity, 
  createTaskCompletionActivity, 
  upsertTaskInStudentTasks, 
  addActivityToStudent,
  normalizeTask
} from '@/lib/taskActivityUtils';

const CATEGORIES: TaskCategory[] = TASK_CATEGORIES;

const STAGES: { id: TaskStage, label: string, color: string, icon: any }[] = [
  { id: 'TO_DO', label: '📌 TO-DO', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: Clock },
  { id: 'IN_PROGRESS', label: '🟡 IN PROGRESS', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  { id: 'SUBMITTED_FOR_REVIEW', label: '🔵 SUBMITTED', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle2 },
  { id: 'NEEDS_REVISION', label: '🔴 NEEDS REVISION', color: 'bg-red-100 text-red-700 border-red-200', icon: FileText },
  { id: 'COMPLETED', label: '🟢 COMPLETED', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 }
];


const CreateTaskModal: React.FC<{ onClose: () => void, onCreate: (t: Task) => void }> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Passion Projects');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [externalUrl, setExternalUrl] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;
    const newTask = createTask({
      name,
      category,
      dueDate: dueDate || new Date().toISOString().split('T')[0],
      stage: 'TO_DO',
      description,
      externalUrl: externalUrl.trim() || undefined,
      attachments: [],
      assignedBy: 'Student (Self)'
    });
    onCreate(newTask);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">Create New Task</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-full">
             <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Task Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. Complete 5 LeetCode problems"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Category</label>
            <select 
              value={category} 
              onChange={e => setCategory(e.target.value as TaskCategory)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Due Date</label>
            <input 
              type="date" 
              value={dueDate} 
              onChange={e => setDueDate(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Description / Plan</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              rows={3}
              placeholder="What needs to be done?"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Task Link / Document URL (Optional)</label>
            <input 
              type="url" 
              value={externalUrl} 
              onChange={e => setExternalUrl(e.target.value)} 
              placeholder="https://docs.google.com/... or https://drive.google.com/..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleCreate}>Create Task</Button>
        </div>
      </div>
    </div>
  );
};


export default function StudentTasks() {
  const { students, updateStudent, currentUser } = useDatabase();
  const student = students.find(s => s.id === currentUser?.id || s.email === currentUser?.email) || students[0];
  if (!student) return null;
  const tasks = student.tasks || [];
  
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [activeCategory, setActiveCategory] = useState<TaskCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const filteredTasks = tasks.filter(t => {
    const matchesCat = activeCategory === 'All' || t.category === activeCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const getStageStyle = (stage: TaskStage) => STAGES.find(s => s.id === stage)?.color || 'bg-slate-100 text-slate-700';

  const updateTask = (updatedTask: Task) => {
    const normalized = normalizeTask(updatedTask, { studentId: student.id, studentName: student.name });
    const newTasks = upsertTaskInStudentTasks(tasks, normalized);
    
    // Add activity if completed
    let newActivities = [...(student.activities || [])];
    if (normalized.stage === 'COMPLETED' && (!selectedTask || selectedTask.stage !== 'COMPLETED')) {
      const compAct = createTaskCompletionActivity(normalized, student.name);
      newActivities = addActivityToStudent(newActivities, compAct);
    }

    updateStudent({
      ...student,
      tasks: newTasks,
      activities: newActivities
    });
    setSelectedTask(normalized);
  };

  return (
    <>
      {isCreateModalOpen && (
        <CreateTaskModal 
          onClose={() => setIsCreateModalOpen(false)} 
          onCreate={(newTask) => {
            const normalized = normalizeTask({ ...newTask, studentId: student.id, studentName: student.name });
            const createdAct = createTaskCreatedActivity(normalized, student.name);
            const updatedTasks = upsertTaskInStudentTasks(tasks, normalized);
            const updatedActivities = addActivityToStudent(student.activities, createdAct);
            updateStudent({ ...student, tasks: updatedTasks, activities: updatedActivities });
            setIsCreateModalOpen(false);
          }}
        />
      )}
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Tasks & Projects Manager</h1>
          <p className="text-sm text-slate-500 mt-1">Track your progress and collaborate with your counselor.</p>
        </div>
        <div className="flex items-center gap-4"><Button onClick={() => setIsCreateModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-9"><Plus className="w-4 h-4 mr-2" /> New Task</Button><div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
          <button onClick={() => setViewMode('board')} className={cn("px-3 py-1.5 text-sm font-semibold rounded-md flex items-center gap-2 transition-colors", viewMode === 'board' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            <LayoutGrid className="w-4 h-4" /> Board
          </button>
          <button onClick={() => setViewMode('list')} className={cn("px-3 py-1.5 text-sm font-semibold rounded-md flex items-center gap-2 transition-colors", viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            <List className="w-4 h-4" /> List
          </button>
        </div></div>
      </div>
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory('All')}
            className={cn("px-3 py-1.5 rounded-full text-xs font-bold transition-colors border", activeCategory === 'All' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')}
          >
            All Categories
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn("px-3 py-1.5 rounded-full text-xs font-bold transition-colors border", activeCategory === cat ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 overflow-x-auto pb-4 items-start">
          {STAGES.map(stage => {
            const stageTasks = filteredTasks.filter(t => t.stage === stage.id);
            return (
              <div key={stage.id} className="min-w-[280px] bg-slate-50/50 rounded-xl border border-slate-200 p-4 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h3 className={cn("text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider", stage.color)}>{stage.label} ({stageTasks.length})</h3>
                </div>
                <div className="space-y-3">
                  {stageTasks.map(task => (
                    <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
                  ))}
                  {stageTasks.length === 0 && (
                    <div className="text-center p-4 border border-dashed border-slate-300 rounded-lg text-slate-400 text-xs font-medium">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4">Task Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4">Stage</th>
                  <th className="px-6 py-4">Attachments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredTasks.map(task => (
                  <tr key={task.id} onClick={() => setSelectedTask(task)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{task.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium border border-slate-200">{task.category}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{task.dueDate}</td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider", getStageStyle(task.stage))}>
                        {STAGES.find(s => s.id === task.stage)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1 text-slate-500 font-medium text-xs">
                        <Paperclip className="w-3.5 h-3.5" /> {task.attachments.length} files
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 text-sm">
                      No tasks found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      
      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)} 
          onUpdate={updateTask} 
        />
      )}
    </div>
    </>
  );
}

const TaskCard: React.FC<{ task: Task, onClick: () => void }> = ({ task, onClick }) => {
  const isLocked = task.stage === 'SUBMITTED_FOR_REVIEW' || task.stage === 'COMPLETED';
  
  return (
    <div onClick={onClick} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group">
      <div className="flex justify-between items-start mb-2 gap-2">
        <h4 className="font-bold text-slate-900 text-sm leading-tight group-hover:text-blue-600 transition-colors">{task.name}</h4>
      </div>
      <div className="mb-3">
        <span className="inline-block px-2 py-0.5 bg-slate-50 text-slate-500 rounded text-[10px] font-medium border border-slate-200 truncate max-w-full">
          {task.category}
        </span>
      </div>
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
        <div className="flex flex-col gap-1 text-[10px] text-slate-500 font-medium">
          <span className="flex items-center gap-1">Due: {task.dueDate}</span>
        </div>
        <div className="flex items-center gap-2">
          {task.attachments.length > 0 && (
            <span className="flex items-center gap-0.5 text-slate-400 text-xs"><Paperclip className="w-3 h-3" />{task.attachments.length}</span>
          )}
          {isLocked && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
        </div>
      </div>
    </div>
  );
}

const TaskDetailModal: React.FC<{ task: Task, onClose: () => void, onUpdate: (t: Task) => void }> = ({ task, onClose, onUpdate }) => {
  const [notes, setNotes] = useState(task.studentNotes || '');
  const [url, setUrl] = useState(task.externalUrl || '');
  const [attachments, setAttachments] = useState<TaskAttachment[]>(task.attachments || []);
  const isLocked = task.stage === 'SUBMITTED_FOR_REVIEW' || task.stage === 'COMPLETED';
  const stageInfo = STAGES.find(s => s.id === task.stage);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const newAtt = {
        id: `ATT-${Date.now()}`,
        fileName: file.name,
        fileUrl: event.target?.result as string,
        uploadedAt: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })
      };
      const updated = [...attachments, newAtt];
      setAttachments(updated);
      onUpdate({ ...task, studentNotes: notes, externalUrl: url, attachments: updated });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAttachment = (attId: string) => {
    const updated = attachments.filter(a => a.id !== attId);
    setAttachments(updated);
    onUpdate({ ...task, studentNotes: notes, externalUrl: url, attachments: updated });
  };

  const handleSave = () => {
    onUpdate({ ...task, studentNotes: notes, externalUrl: url, attachments });
  };
  
  const handleSubmit = () => {
    onUpdate({ ...task, studentNotes: notes, externalUrl: url, attachments, stage: 'SUBMITTED_FOR_REVIEW' });
  };
  
  const handleStart = () => {
    onUpdate({ ...task, stage: 'IN_PROGRESS' });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-start shrink-0">
          <div className="space-y-2 pr-8">
             <div className="flex items-center gap-3">
               <span className={cn("px-2.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider", stageInfo?.color)}>
                 {stageInfo?.label}
               </span>
               <span className="px-2.5 py-1 bg-white text-slate-600 rounded-md text-[10px] font-bold border border-slate-200 uppercase tracking-wider">{task.category}</span>
               {task.assignmentType && (
                 <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-md text-[10px] font-bold uppercase tracking-wider">
                   {task.assignmentType}
                 </span>
               )}
               {task.relatedTo && (
                 <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-md text-[10px] font-bold uppercase tracking-wider">
                   Related: {task.relatedTo}
                 </span>
               )}
             </div>
             <h2 className="text-2xl font-bold text-slate-900">{task.name}</h2>
             <div className="flex gap-4 text-xs font-medium text-slate-500">
               <span>Assigned by: {task.assignedBy || 'Counselor'}</span>
               <span>•</span>
               <span>Due: {task.dueDate}</span>
             </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full shrink-0">
             <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
           {/* Instructions */}
           <div>
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
               <FileText className="w-4 h-4" /> Task Details & Writing Instructions
             </h3>
             <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-sm text-slate-700 leading-relaxed space-y-3">
               <p className="whitespace-pre-wrap">{task.description || 'No specific instructions provided.'}</p>
               {(task.pdfFileName || task.pdfUrl) && (
                 <div className="pt-3 border-t border-blue-100 flex items-center justify-between bg-white p-3 rounded-lg border border-blue-200">
                   <div className="flex items-center gap-2">
                     <FileText className="w-4 h-4 text-red-500" />
                     <span className="text-xs font-bold text-slate-800">{task.pdfFileName || 'Attached_Assignment_Doc.pdf'}</span>
                   </div>
                   <a 
                     href={task.pdfUrl || '#'} 
                     target="_blank" 
                     rel="noreferrer"
                     className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-md transition-colors inline-flex items-center gap-1"
                   >
                     View / Download PDF
                   </a>
                 </div>
               )}
             </div>
           </div>
           
           {/* Feedback */}
           {(task.feedback || task.stage === 'NEEDS_REVISION') && (
             <div>
               <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                 <CheckCircle2 className="w-4 h-4" /> Counselor Feedback
               </h3>
               <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
                 {task.feedback || 'Please review and resubmit.'}
               </div>
             </div>
           )}
           
           {/* Student Workspace */}
           <div className={cn("space-y-6", isLocked && "opacity-75 pointer-events-none")}>
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
               <FileText className="w-4 h-4" /> Student Workspace & Progress Notes
             </h3>
             
             <div>
               <label className="block text-xs font-semibold text-slate-700 mb-2">Progress Notes / Implementation Details</label>
               <textarea 
                 value={notes}
                 onChange={e => setNotes(e.target.value)}
                 disabled={isLocked}
                 placeholder="Log your progress, hours spent, or details here..."
                 className="w-full min-h-[120px] bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
               />
             </div>
             
             <div>
               <label className="block text-xs font-semibold text-slate-700 mb-2">Project URL / External Link (Optional)</label>
               <div className="relative">
                 <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input 
                   type="url"
                   value={url}
                   onChange={e => setUrl(e.target.value)}
                   disabled={isLocked}
                   placeholder="https://..."
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                 />
               </div>
             </div>
             
             {/* Attachments */}
             <div>
               <div className="flex justify-between items-center mb-3">
                 <label className="block text-xs font-semibold text-slate-700">Proof Documents & Certificates</label>
                 {!isLocked && (
                   <label className="cursor-pointer inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                      <Plus className="w-3 h-3 mr-1" /> Add File
                      <input type="file" className="hidden" onChange={handleFileUpload} />
                    </label>
                 )}
               </div>
               
               {attachments.length > 0 ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   {attachments.map(att => (
                     <div key={att.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                       <div className="flex items-center gap-2 overflow-hidden">
                         <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                         {att.fileUrl ? (
                            <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline truncate">
                              {att.fileName}
                            </a>
                          ) : (
                            <span className="text-sm font-medium text-slate-700 truncate">{att.fileName}</span>
                          )}
                       </div>
                       {!isLocked && (
                         <button onClick={() => handleRemoveAttachment(att.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                       )}
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-center p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-500 text-sm">
                   No documents attached yet.
                 </div>
               )}
             </div>
           </div>
        </div>
        
        {/* Footer Actions */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0 rounded-b-3xl">
          {isLocked ? (
            <div className="text-sm font-semibold text-slate-500 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              {task.stage === 'COMPLETED' ? 'Task Verified & Completed' : 'Task Locked for Counselor Review'}
            </div>
          ) : (
            <>
              {task.stage === 'TO_DO' ? (
                <div className="w-full flex justify-end">
                  <Button onClick={handleStart} className="bg-blue-600 hover:bg-blue-700 text-white">
                     Start Task
                  </Button>
                </div>
              ) : (
                <>
                  <Button variant="outline" onClick={handleSave} className="bg-white">
                    <Save className="w-4 h-4 mr-2" /> Save Progress
                  </Button>
                  <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Send className="w-4 h-4 mr-2" /> Submit for Review
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
