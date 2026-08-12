import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, Search, Users, Video, Edit, Trash2, X, RefreshCw, 
  FileText, Link as LinkIcon, CheckCircle2, Star, MessageSquare, ClipboardList, Paperclip 
} from 'lucide-react';
import { useDatabase } from '@/context/DatabaseContext';
import { cn } from '@/lib/utils';
import { MeetingMOM, MeetingResourceLink, MeetingTask, OperationalLog } from '@/types';

export default function TeamScheduler() {
  const { events, setEvents, currentUser, batches, students, updateStudent } = useDatabase();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [audienceType, setAudienceType] = useState('individual');
  
  // Post-session modal state
  const [activeSessionModalEvt, setActiveSessionModalEvt] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'mom' | 'tasks' | 'resources' | 'ratings'>('mom');

  // MOM form
  const [momKeyPoints, setMomKeyPoints] = useState('');
  const [momProgress, setMomProgress] = useState('');
  const [momObservations, setMomObservations] = useState('');
  const [momNextSteps, setMomNextSteps] = useState('');
  const [momFollowUp, setMomFollowUp] = useState('');

  // Task form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState<any>('Administrative / College Prep');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskUrl, setTaskUrl] = useState('');

  // Resource link form
  const [resTitle, setResTitle] = useState('');
  const [resDesc, setResDesc] = useState('');
  const [resUrl, setResUrl] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    stream: 'Counselling (1-on-1)',
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    notes: '',
    assignments: '',
    isRecurring: false,
    recurrenceType: 'weekly',
    recurrenceCount: 1,
  });
  
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [horizonFilter, setHorizonFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  const isEventInPast = (e: any): boolean => {
    if (e.status === 'Completed') return true;
    if (e.status === 'Canceled') return false;
    const dateStr = e.day || e.date;
    if (!dateStr || dateStr.toLowerCase() === 'today') return false;
    try {
      const evtDate = new Date(dateStr);
      if (!isNaN(evtDate.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const evtMidnight = new Date(evtDate);
        evtMidnight.setHours(0, 0, 0, 0);
        if (evtMidnight.getTime() < today.getTime()) return true;
      }
    } catch(err) {}
    return false;
  };

  // 1. ROLE-BASED STUDENT VISIBILITY FOR SCHEDULING
  const isAdmin = currentUser.role === 'SYSTEM_ADMIN' || currentUser.role === 'OPERATIONS_LEAD' || currentUser.role === 'DEVELOPER' || currentUser.students === 'All';

  const assignedStudents = students.filter(s => {
    if (isAdmin) return true;
    const roleUpper = (currentUser.role || '').toUpperCase();
    if (roleUpper.includes('COUNSELOR') || roleUpper.includes('COUNSELLOR')) {
      return s.counselor === currentUser.name;
    }
    if (roleUpper.includes('RESEARCH')) {
      return s.researchMentor === currentUser.name;
    }
    if (roleUpper.includes('SAT') || roleUpper.includes('VERBAL') || roleUpper.includes('MATH')) {
      return s.satVerbalMentor === currentUser.name || s.satMathMentor === currentUser.name;
    }
    return s.counselor === currentUser.name ||
           s.researchMentor === currentUser.name ||
           s.satVerbalMentor === currentUser.name ||
           s.satMathMentor === currentUser.name;
  });

  const visibleBatches = isAdmin 
    ? batches 
    : batches.filter(b => b.mentors.includes(currentUser.name));

  const visibleEvents = events.filter((e: any) => {
    if (isAdmin) return true;
    if (e.host === currentUser.name) return true;
    if (e.batch) {
      const batch = batches.find((b: any) => b.id === e.batch);
      if (batch && batch.mentors.includes(currentUser.name)) return true;
    }
    return false;
  }).filter((e: any) => {
    if (horizonFilter === 'upcoming') {
      if (isEventInPast(e)) return false;
    } else if (horizonFilter === 'past') {
      if (!isEventInPast(e)) return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (e.title || '').toLowerCase().includes(q) || 
           (e.students || '').toLowerCase().includes(q) ||
           (e.stream || '').toLowerCase().includes(q);
  }).sort((a: any, b: any) => new Date(a.day || a.date).getTime() - new Date(b.day || b.date).getTime());

  const handleOpenModal = () => {
    setEditingEventId(null);
    setFormData({
      stream: 'Counselling (1-on-1)',
      title: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '10:00',
      endTime: '11:00',
      location: 'https://meet.google.com',
      notes: '',
      assignments: '',
      isRecurring: false,
      recurrenceType: 'weekly',
      recurrenceCount: 1,
    });
    setSelectedStudentId(assignedStudents[0]?.id || '');
    setSelectedBatchId('');
    setAudienceType('individual');
    setIsModalOpen(true);
  };

  const handleEditEvent = (evt: any) => {
    setEditingEventId(evt.id);
    setFormData({
      stream: evt.stream || 'Counselling (1-on-1)',
      title: evt.title || '',
      date: evt.date || evt.day || '',
      startTime: (evt.time || '10:00').split(' - ')[0] || '10:00',
      endTime: (evt.time || '11:00').split(' - ')[1] || '11:00',
      location: evt.location || evt.link || '',
      notes: evt.notes || '',
      assignments: evt.assignments || '',
      isRecurring: false,
      recurrenceType: 'weekly',
      recurrenceCount: 1
    });
    if (evt.batch) {
      setAudienceType('batch');
      setSelectedBatchId(evt.batch);
    } else {
      setAudienceType('individual');
      if (evt.studentId) setSelectedStudentId(evt.studentId);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this class event?')) {
      setEvents(events.filter((e: any) => e.id !== id));
    }
  };

  const handlePublish = () => {
    if (!formData.title.trim() || !formData.date || !formData.startTime) {
      alert("Please fill required fields (Title, Date, Start Time).");
      return;
    }

    const targetStudent = students.find(s => s.id === selectedStudentId);
    const targetBatch = batches.find(b => b.id === selectedBatchId);
    const studentLabel = audienceType === 'batch' 
      ? (targetBatch?.name || 'Batch Cohort') 
      : (targetStudent ? targetStudent.name : 'All Assigned Students');

    const duration = formData.endTime ? `${formData.startTime} - ${formData.endTime}` : '1 hr';
    const baseId = 'EVT-' + Math.floor(Math.random() * 100000);
    
    let occurrences: string[] = [];
    if (formData.isRecurring) {
      const count = Math.max(1, Math.min(10, formData.recurrenceCount));
      let currentDate = new Date(formData.date);
      for (let i = 0; i < count; i++) {
        occurrences.push(new Date(currentDate).toISOString().split('T')[0]);
        if (formData.recurrenceType === 'daily') {
          currentDate.setDate(currentDate.getDate() + 1);
        } else if (formData.recurrenceType === 'weekly') {
          currentDate.setDate(currentDate.getDate() + 7);
        }
      }
    } else {
      occurrences.push(formData.date);
    }
    
    const newEvents = occurrences.map((dateStr, idx) => ({
      id: baseId + '-' + idx,
      day: dateStr,
      date: dateStr,
      time: formData.startTime + (formData.endTime ? ` - ${formData.endTime}` : ''),
      duration: '1 hr',
      stream: formData.stream,
      title: formData.title,
      batch: audienceType === 'batch' ? selectedBatchId : undefined,
      students: studentLabel,
      studentId: audienceType === 'individual' ? selectedStudentId : undefined,
      location: formData.location || 'https://meet.google.com',
      notes: formData.notes,
      assignments: formData.assignments,
      host: currentUser.name || 'Staff Mentor',
      status: 'Scheduled' as const,
      moms: [],
      ratings: [],
      resources: [],
      tasks: []
    }));
    
    setEvents([...events, ...newEvents]);

    // Push Operational Log if individual student target
    if (audienceType === 'individual' && targetStudent) {
      const logEntry: OperationalLog = {
        id: 'LOG-' + Date.now(),
        timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
        performedBy: currentUser.name || 'Staff Member',
        role: currentUser.role || 'MENTOR',
        studentId: targetStudent.id,
        activityType: 'Meeting Scheduled',
        description: `Scheduled meeting "${formData.title}" on ${formData.date} at ${formData.startTime}`,
        link: formData.location
      };
      updateStudent({
        ...targetStudent,
        operationalLogs: [logEntry, ...(targetStudent.operationalLogs || [])]
      });
    }

    handleCloseModal();
  };

  // POST-SESSION ACTIONS
  const handleAddMOM = () => {
    if (!momKeyPoints.trim() || !activeSessionModalEvt) return;
    const newMom: MeetingMOM = {
      id: 'MOM-' + Date.now(),
      authorName: currentUser.name || 'Staff Member',
      authorRole: currentUser.role || 'MENTOR',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      keyPoints: momKeyPoints,
      studentProgress: momProgress,
      observations: momObservations,
      nextSteps: momNextSteps,
      followUpActions: momFollowUp
    };

    const updatedEvents = events.map((e: any) => {
      if (e.id === activeSessionModalEvt.id) {
        return {
          ...e,
          status: 'Completed',
          moms: [newMom, ...(e.moms || [])]
        };
      }
      return e;
    });

    setEvents(updatedEvents);
    setActiveSessionModalEvt((prev: any) => ({
      ...prev,
      status: 'Completed',
      moms: [newMom, ...(prev?.moms || [])]
    }));

    // Log operational activity if single student
    if (activeSessionModalEvt.studentId) {
      const targetStudent = students.find(s => s.id === activeSessionModalEvt.studentId);
      if (targetStudent) {
        const logEntry: OperationalLog = {
          id: 'LOG-' + Date.now(),
          timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
          performedBy: currentUser.name || 'Staff Member',
          role: currentUser.role || 'MENTOR',
          studentId: targetStudent.id,
          activityType: 'Meeting Notes / MOM Added',
          description: `Added session MOM for "${activeSessionModalEvt.title}": ${momKeyPoints.substring(0, 80)}...`
        };
        updateStudent({
          ...targetStudent,
          operationalLogs: [logEntry, ...(targetStudent.operationalLogs || [])]
        });
      }
    }

    setMomKeyPoints('');
    setMomProgress('');
    setMomObservations('');
    setMomNextSteps('');
    setMomFollowUp('');
  };

  const handleAddPostMeetingTask = () => {
    if (!taskTitle.trim() || !activeSessionModalEvt) return;

    let targetStudent = activeSessionModalEvt.studentId ? students.find(s => s.id === activeSessionModalEvt.studentId) : null;
    const studentIdToAssign = targetStudent ? targetStudent.id : (selectedStudentId || assignedStudents[0]?.id || '');
    if (!targetStudent) {
      targetStudent = students.find(s => s.id === studentIdToAssign);
    }

    const newTask: MeetingTask = {
      id: 'MTASK-' + Date.now(),
      title: taskTitle,
      description: taskDesc,
      assignedBy: currentUser.name || 'Staff Member',
      assignedToStudentId: studentIdToAssign,
      assignedToStudentName: targetStudent?.name || 'Student',
      dateAssigned: new Date().toISOString().split('T')[0],
      dueDate: taskDueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'TO_DO',
      externalUrl: taskUrl
    };

    const updatedEvents = events.map((e: any) => {
      if (e.id === activeSessionModalEvt.id) {
        return {
          ...e,
          tasks: [newTask, ...(e.tasks || [])]
        };
      }
      return e;
    });

    setEvents(updatedEvents);
    setActiveSessionModalEvt((prev: any) => ({
      ...prev,
      tasks: [newTask, ...(prev?.tasks || [])]
    }));

    if (targetStudent) {
      const studentTask = {
        id: 'TASK-' + Date.now(),
        name: taskTitle,
        category: taskCategory,
        dueDate: newTask.dueDate || '',
        stage: 'TO_DO' as const,
        description: taskDesc,
        assignedBy: `${currentUser.name} (${currentUser.role || 'Mentor'})`,
        externalUrl: taskUrl,
        attachments: []
      };

      const logEntry: OperationalLog = {
        id: 'LOG-' + Date.now(),
        timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
        performedBy: currentUser.name || 'Staff Member',
        role: currentUser.role || 'MENTOR',
        studentId: targetStudent.id,
        activityType: 'Post-Meeting Task Assigned',
        description: `Assigned task "${taskTitle}" (Due: ${newTask.dueDate}) after session "${activeSessionModalEvt.title}"`,
        link: taskUrl
      };

      updateStudent({
        ...targetStudent,
        tasks: [studentTask, ...(targetStudent.tasks || [])],
        operationalLogs: [logEntry, ...(targetStudent.operationalLogs || [])]
      });
    }

    setTaskTitle('');
    setTaskDesc('');
    setTaskDueDate('');
    setTaskUrl('');
  };

  const handleAddMentorResource = () => {
    if (!resTitle.trim() || !resUrl.trim() || !activeSessionModalEvt) return;
    const newRes: MeetingResourceLink = {
      id: 'RES-' + Date.now(),
      title: resTitle,
      description: resDesc,
      url: resUrl,
      addedBy: currentUser.name || 'Staff Member',
      addedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };

    const updatedEvents = events.map((e: any) => {
      if (e.id === activeSessionModalEvt.id) {
        return {
          ...e,
          resources: [newRes, ...(e.resources || [])]
        };
      }
      return e;
    });

    setEvents(updatedEvents);
    setActiveSessionModalEvt((prev: any) => ({
      ...prev,
      resources: [newRes, ...(prev?.resources || [])]
    }));

    if (activeSessionModalEvt.studentId) {
      const targetStudent = students.find(s => s.id === activeSessionModalEvt.studentId);
      if (targetStudent) {
        const logEntry: OperationalLog = {
          id: 'LOG-' + Date.now(),
          timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
          performedBy: currentUser.name || 'Staff Member',
          role: currentUser.role || 'MENTOR',
          studentId: targetStudent.id,
          activityType: 'Resource Link Shared',
          description: `Shared resource link "${resTitle}" for session "${activeSessionModalEvt.title}"`,
          link: resUrl,
          resourceName: resTitle
        };
        updateStudent({
          ...targetStudent,
          operationalLogs: [logEntry, ...(targetStudent.operationalLogs || [])]
        });
      }
    }

    setResTitle('');
    setResDesc('');
    setResUrl('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Class Scheduler</h2>
          <p className="text-xs text-slate-500 mt-0.5">Role-based student visibility, session notes, ratings, and follow-up assignments.</p>
        </div>
        <Button onClick={handleOpenModal} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-lg font-semibold shadow-sm">
          <Plus className="w-4 h-4 mr-1.5" /> Schedule Class
        </Button>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">{editingEventId ? 'Edit Session' : 'Schedule New Session'}</h3>
              <button onClick={handleCloseModal} className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Audience Type */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Target Audience</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="audience" 
                      value="individual" 
                      checked={audienceType === 'individual'}
                      onChange={() => setAudienceType('individual')}
                      className="accent-blue-600"
                    />
                    Individual Student
                  </label>
                  <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="audience" 
                      value="batch" 
                      checked={audienceType === 'batch'}
                      onChange={() => setAudienceType('batch')}
                      className="accent-blue-600"
                    />
                    Batch / Cohort
                  </label>
                </div>
              </div>

              {/* Student or Batch Select */}
              {audienceType === 'individual' ? (
                <div>
                   <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                     Assigned Student (Role Visibility Filtered)
                   </label>
                   {assignedStudents.length > 0 ? (
                     <select 
                       value={selectedStudentId}
                       onChange={e => setSelectedStudentId(e.target.value)}
                       className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
                     >
                       {assignedStudents.map(s => (
                         <option key={s.id} value={s.id}>
                           {s.name} ({s.school || 'High School'}) • Counselor: {s.counselor || 'None'}
                         </option>
                       ))}
                     </select>
                   ) : (
                     <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                       No students are assigned to your staff role ({currentUser.role}). Contact Admin to assign students.
                     </div>
                   )}
                </div>
              ) : (
                <div>
                   <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Select Batch</label>
                   <select 
                     className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900"
                     value={selectedBatchId}
                     onChange={(e) => {
                       const bId = e.target.value;
                       setSelectedBatchId(bId);
                       const foundBatch = batches.find(b => b.id === bId);
                       if (foundBatch) {
                         let matchedStream = 'Counselling (1-on-1)';
                         if (foundBatch.subject === 'SAT') matchedStream = 'SAT Prep';
                         else if (foundBatch.subject === 'Research') matchedStream = 'Research Mentoring';
                         else if (foundBatch.subject === 'Counselling') matchedStream = 'Counselling (1-on-1)';
                         setFormData(prev => ({
                           ...prev,
                           stream: matchedStream,
                           location: foundBatch.meetingLink || prev.location
                         }));
                       }
                     }}
                   >
                     <option value="" disabled>Select a batch...</option>
                     {visibleBatches.map(b => (
                       <option key={b.id} value={b.id}>
                         [{b.subject || 'General'}] {b.name} ({b.students?.length || 0} enrolled)
                       </option>
                     ))}
                   </select>
                </div>
              )}

              {/* Session Stream & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Session Category / Stream</label>
                  <select 
                    value={formData.stream}
                    onChange={(e) => setFormData({...formData, stream: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium"
                  >
                    <option value="Counselling (1-on-1)">Counselling (1-on-1)</option>
                    <option value="Research Mentoring">Research Mentoring</option>
                    <option value="SAT Verbal Prep">SAT Verbal Prep</option>
                    <option value="SAT Maths Prep">SAT Maths Prep</option>
                    <option value="Essay Workshop">Essay Workshop</option>
                    <option value="General Strategy">General Strategy</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Session Title *</label>
                  <input 
                    type="text" 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g. Brainstorming Common App Draft"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Date & Times */}
              <div className="grid grid-cols-3 gap-3">
                 <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Date *</label>
                    <input 
                      type="date" 
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium" 
                    />
                 </div>
                 <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Start Time *</label>
                    <input 
                      type="time" 
                      value={formData.startTime}
                      onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium" 
                    />
                 </div>
                 <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">End Time</label>
                    <input 
                      type="time" 
                      value={formData.endTime}
                      onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium" 
                    />
                 </div>
              </div>

              {/* Location Link */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Google Meet / Zoom URL</label>
                <input 
                  type="text" 
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs" 
                  placeholder="https://meet.google.com/..."
                />
              </div>

              {/* Pre-Read Notes */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Pre-Read Agenda / Notes for Student</label>
                <textarea 
                  rows={2} 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs resize-none" 
                  placeholder="Items student should review prior to call..."
                ></textarea>
              </div>
            </div>
            
            <div className="px-6 py-3 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 shrink-0">
              <Button variant="ghost" size="sm" onClick={handleCloseModal} className="text-xs">Cancel</Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4" onClick={handlePublish}>
                {editingEventId ? 'Save Changes' : 'Schedule Session'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH & FILTERS */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[200px]">
           <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
           <input 
             type="text" 
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             placeholder="Filter sessions by student name, title, stream..." 
             className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" 
           />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setHorizonFilter('all')}
              className={cn("px-2.5 py-1 text-xs font-semibold rounded-md transition-colors", horizonFilter === 'all' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              All
            </button>
            <button 
              onClick={() => setHorizonFilter('upcoming')}
              className={cn("px-2.5 py-1 text-xs font-semibold rounded-md transition-colors", horizonFilter === 'upcoming' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Upcoming
            </button>
            <button 
              onClick={() => setHorizonFilter('past')}
              className={cn("px-2.5 py-1 text-xs font-semibold rounded-md transition-colors", horizonFilter === 'past' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Past Sessions
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium px-2 hidden sm:block">
            Showing <strong className="text-slate-900">{visibleEvents.length}</strong> sessions
          </div>
        </div>
      </div>

      {/* EVENTS LIST */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
        {visibleEvents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No scheduled classes or meetings found matching filter.
          </div>
        ) : (
          visibleEvents.map((evt: any) => {
            const inPast = isEventInPast(evt);
            return (
            <div key={evt.id} className="p-4 sm:p-5 flex flex-col md:flex-row gap-4 justify-between items-start hover:bg-slate-50/50 transition-colors">
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                    {evt.stream}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    inPast ? 'bg-slate-100 text-slate-700' : evt.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {inPast ? 'Past / Completed' : (evt.status || 'Scheduled')}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">{evt.day || evt.date} • {evt.time}</span>
                </div>

                <h4 className="text-base font-bold text-slate-900">{evt.title}</h4>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <strong>Student / Target:</strong> {evt.students}
                  </span>
                  <span>• <strong>Host:</strong> {evt.host || 'Staff'}</span>
                </div>

                {/* MOM / Resource Summary if attached */}
                {((evt.moms && evt.moms.length > 0) || (evt.resources && evt.resources.length > 0) || (evt.tasks && evt.tasks.length > 0) || (evt.ratings && evt.ratings.length > 0)) && (
                  <div className="pt-2 flex flex-wrap gap-2 text-[11px]">
                    {evt.moms?.length > 0 && (
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium flex items-center gap-1">
                        <FileText className="w-3 h-3 text-blue-600" /> {evt.moms.length} MOM Notes
                      </span>
                    )}
                    {evt.tasks?.length > 0 && (
                      <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100 font-medium flex items-center gap-1">
                        <ClipboardList className="w-3 h-3 text-purple-600" /> {evt.tasks.length} Post-Meeting Tasks
                      </span>
                    )}
                    {evt.resources?.length > 0 && (
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100 font-medium flex items-center gap-1">
                        <Paperclip className="w-3 h-3 text-emerald-600" /> {evt.resources.length} Links Shared
                      </span>
                    )}
                    {evt.ratings?.length > 0 && (
                      <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100 font-medium flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> Avg Rating: {(evt.ratings.reduce((acc: number, r: any) => acc + r.rating, 0) / evt.ratings.length).toFixed(1)}/5 ({evt.ratings.length})
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
                {inPast ? (
                  <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" /> Call Ended
                  </span>
                ) : (
                  <Button 
                    size="sm"
                    onClick={() => {
                      const link = evt.location || evt.link;
                      if (link) window.open(link.startsWith('http') ? link : `https://${link}`, '_blank');
                      else alert('No video meeting link specified.');
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-3 font-medium"
                  >
                    <Video className="w-3.5 h-3.5 mr-1" /> Join Call
                  </Button>
                )}

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setActiveSessionModalEvt(evt);
                    setActiveTab('mom');
                  }}
                  className="bg-white text-xs h-8 px-3 font-semibold text-blue-700 border-blue-200 hover:bg-blue-50"
                >
                  <FileText className="w-3.5 h-3.5 mr-1" /> Meeting Notes & Tasks
                </Button>

                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800" onClick={() => handleEditEvent(evt)}>
                  <Edit className="w-3.5 h-3.5" />
                </Button>

                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(evt.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
          })
        )}
      </div>

      {/* POST-SESSION ACTIONS MODAL */}
      {activeSessionModalEvt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-start shrink-0">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-400/30">
                  {activeSessionModalEvt.stream}
                </span>
                <h3 className="text-lg font-bold mt-1 text-white">{activeSessionModalEvt.title}</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Target: <strong>{activeSessionModalEvt.students}</strong> • Date: {activeSessionModalEvt.day || activeSessionModalEvt.date}
                </p>
              </div>
              <button onClick={() => setActiveSessionModalEvt(null)} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 px-4 pt-2 shrink-0 gap-2 items-center justify-between">
              <div className="flex gap-2">
                <button 
                  onClick={() => setActiveTab('mom')}
                  className={`pb-2.5 px-3 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${activeTab === 'mom' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                >
                  <FileText className="w-3.5 h-3.5" /> Meeting Notes (MOM)
                </button>
                <button 
                  onClick={() => setActiveTab('tasks')}
                  className={`pb-2.5 px-3 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${activeTab === 'tasks' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                >
                  <ClipboardList className="w-3.5 h-3.5" /> Post-Meeting Tasks
                </button>
                <button 
                  onClick={() => setActiveTab('ratings')}
                  className={`pb-2.5 px-3 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${activeTab === 'ratings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                >
                  <Star className="w-3.5 h-3.5 text-amber-500" /> Ratings ({activeSessionModalEvt.ratings?.length || 0})
                </button>
              </div>

              {/* Direct Schedule Next Meeting Action Button */}
              <Button
                size="sm"
                onClick={() => {
                  const studentName = activeSessionModalEvt.students;
                  setActiveSessionModalEvt(null);
                  handleOpenModal();
                  setFormData(prev => ({
                    ...prev,
                    title: `Follow-up Session with ${studentName || 'Student'}`,
                    notes: `Follow-up on action items from ${activeSessionModalEvt.title}`
                  }));
                }}
                className="mb-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold h-7 px-3 flex items-center gap-1 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" /> Schedule Next Meeting
              </Button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* TAB 1: MOM */}
              {activeTab === 'mom' && (
                <div className="space-y-6">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Add Meeting Notes / Minutes of Meeting (MOM)</h4>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Key Discussion Points *</label>
                      <textarea value={momKeyPoints} onChange={e => setMomKeyPoints(e.target.value)} rows={2} placeholder="Summary of main discussion topics during the meeting..." className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Student Progress Notes</label>
                        <input value={momProgress} onChange={e => setMomProgress(e.target.value)} placeholder="e.g. Common App draft is 80% finished" className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Mentor Observations</label>
                        <input value={momObservations} onChange={e => setMomObservations(e.target.value)} placeholder="e.g. Needs focus on essay hook and tone" className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Next Steps</label>
                        <input value={momNextSteps} onChange={e => setMomNextSteps(e.target.value)} placeholder="e.g. Complete 2nd draft by Friday" className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Follow-up Actions</label>
                        <input value={momFollowUp} onChange={e => setMomFollowUp(e.target.value)} placeholder="e.g. Schedule follow-up line review next Tuesday" className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs" />
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button size="sm" onClick={handleAddMOM} disabled={!momKeyPoints.trim()} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4">
                        Save Session MOM
                      </Button>
                    </div>
                  </div>

                  {/* MOM History */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Recorded Session MOM History</h4>
                    {activeSessionModalEvt.moms && activeSessionModalEvt.moms.length > 0 ? (
                      activeSessionModalEvt.moms.map((m: MeetingMOM) => (
                        <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-sm">
                          <div className="flex justify-between items-center text-slate-500 text-[11px] border-b border-slate-100 pb-2">
                            <span>Recorded by <strong>{m.authorName}</strong> ({m.authorRole})</span>
                            <span>{m.date}</span>
                          </div>
                          <p className="text-slate-800 font-medium text-xs leading-relaxed">"{m.keyPoints}"</p>
                          {(m.studentProgress || m.observations) && (
                            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2 rounded border border-slate-100 mt-2">
                              {m.studentProgress && <div><strong className="text-slate-700">Progress:</strong> {m.studentProgress}</div>}
                              {m.observations && <div><strong className="text-slate-700">Observations:</strong> {m.observations}</div>}
                            </div>
                          )}
                          {(m.nextSteps || m.followUpActions) && (
                            <div className="text-[11px] text-blue-900 bg-blue-50/50 p-2 rounded border border-blue-100 flex flex-wrap gap-4">
                              {m.nextSteps && <div><strong>Next Steps:</strong> {m.nextSteps}</div>}
                              {m.followUpActions && <div><strong>Follow-up:</strong> {m.followUpActions}</div>}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 italic text-center py-4 bg-slate-50 rounded-lg">No MOM recorded for this session yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: POST-MEETING TASKS */}
              {activeTab === 'tasks' && (
                <div className="space-y-6">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Assign Follow-up Task Post-Meeting</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Task Title *</label>
                        <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="e.g. Revise Supplemental Essay #2" className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Category</label>
                        <select value={taskCategory} onChange={e => setTaskCategory(e.target.value as any)} className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs">
                          {[
                            'Internships', 'Research Projects', 'Competitions & Olympiads', 
                            'Language Proficiency', 'MOOCs & Online Certifications', 
                            'Passion Projects', 'Impact & Community Service Projects', 
                            'Administrative / College Prep', 'Post Meeting Action', 'Other'
                          ].map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Due Date</label>
                        <input type="date" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Task Link / Resource URL</label>
                        <input value={taskUrl} onChange={e => setTaskUrl(e.target.value)} placeholder="https://drive.google.com/..." className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Task Description & Guidelines</label>
                      <textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} rows={2} placeholder="Detail action items agreed during call..." className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs resize-none" />
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button size="sm" onClick={handleAddPostMeetingTask} disabled={!taskTitle.trim()} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4">
                        Assign Follow-up Task
                      </Button>
                    </div>
                  </div>

                  {/* Tasks List */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Tasks Assigned for this Meeting</h4>
                    {activeSessionModalEvt.tasks && activeSessionModalEvt.tasks.length > 0 ? (
                      activeSessionModalEvt.tasks.map((t: MeetingTask) => (
                        <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center">
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{t.title}</p>
                            <p className="text-[11px] text-slate-500">{t.description}</p>
                            <p className="text-[10px] text-slate-400 mt-1">Assigned by {t.assignedBy} • Due: {t.dueDate}</p>
                          </div>
                          <span className="bg-slate-100 text-slate-700 font-bold px-2 py-1 rounded text-[10px] uppercase">
                            {t.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 italic text-center py-4 bg-slate-50 rounded-lg">No post-meeting tasks assigned yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: MENTOR LINKS & RESOURCES */}
              {activeTab === 'resources' && (
                <div className="space-y-6">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Attach Mentor Resource Link / Document</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Resource Title *</label>
                        <input value={resTitle} onChange={e => setResTitle(e.target.value)} placeholder="e.g. Research Methodology Template" className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Resource URL (Google Drive, Doc, Link) *</label>
                        <input value={resUrl} onChange={e => setResUrl(e.target.value)} placeholder="https://docs.google.com/..." className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Brief Description / Notes</label>
                      <input value={resDesc} onChange={e => setResDesc(e.target.value)} placeholder="Instructions on how to use this reference material..." className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs" />
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button size="sm" onClick={handleAddMentorResource} disabled={!resTitle.trim() || !resUrl.trim()} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4">
                        Share Resource Link
                      </Button>
                    </div>
                  </div>

                  {/* Shared Resources */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Shared Mentor Links & Documents</h4>
                    {activeSessionModalEvt.resources && activeSessionModalEvt.resources.length > 0 ? (
                      activeSessionModalEvt.resources.map((r: MeetingResourceLink) => (
                        <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center shadow-sm">
                          <div>
                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-600 hover:underline text-xs flex items-center gap-1">
                              <LinkIcon className="w-3.5 h-3.5" /> {r.title}
                            </a>
                            {r.description && <p className="text-[11px] text-slate-600 mt-0.5">{r.description}</p>}
                            <p className="text-[10px] text-slate-400 mt-1">Shared by {r.addedBy} on {r.addedAt}</p>
                          </div>
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => window.open(r.url, '_blank')}>
                            Open Link
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 italic text-center py-4 bg-slate-50 rounded-lg">No mentor resource links shared for this session yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: RATINGS */}
              {activeTab === 'ratings' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Participant Ratings & Feedback</h4>
                  {activeSessionModalEvt.ratings && activeSessionModalEvt.ratings.length > 0 ? (
                    activeSessionModalEvt.ratings.map((r: any) => (
                      <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-900 text-xs">{r.userName} ({r.userRole})</span>
                          <div className="flex gap-0.5 text-amber-500">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star key={star} className={`w-3.5 h-3.5 ${star <= r.rating ? 'fill-amber-500 text-amber-500' : 'text-slate-200'}`} />
                            ))}
                          </div>
                        </div>
                        {r.comment && <p className="text-slate-600 text-xs italic">"{r.comment}"</p>}
                        <p className="text-[10px] text-slate-400">{r.createdAt}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 italic text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No ratings submitted for this meeting yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
