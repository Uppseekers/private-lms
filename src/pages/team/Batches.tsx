import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDatabase } from '@/context/DatabaseContext';
import { Batch, BatchClassSession, Student } from '@/types';
import { 
  Users, Search, Plus, Video, UserCircle, MoreVertical, Layers, GraduationCap, 
  X, UserPlus, Trash2, Edit, CheckCircle2, Clock, Calendar, AlertCircle, 
  BookOpen, UserMinus, CheckSquare, Sparkles, Filter, ExternalLink, CalendarDays
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isUserAdmin } from '@/lib/staffPermissions';

export default function Batches() {
  const { batches, setBatches, staff, currentUser, students } = useDatabase();
  
  // Navigation tabs: 'all' | 'master' | 'sub' | 'sessions' | 'roster'
  const [activeTab, setActiveTab] = useState<'all' | 'master' | 'sub' | 'sessions' | 'roster'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  
  // Selection state for bulk operations
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  
  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [selectedBatchDetail, setSelectedBatchDetail] = useState<Batch | null>(null);
  const [selectedBatchForStudents, setSelectedBatchForStudents] = useState<Batch | null>(null);
  const [studentToAdd, setStudentToAdd] = useState('');
  
  // Form fields
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchType, setNewBatchType] = useState<'Master Batch' | 'Sub-Batch'>('Master Batch');
  const [newBatchSubject, setNewBatchSubject] = useState<'SAT' | 'Research' | 'Counselling' | 'Other'>('SAT');
  const [newBatchCapacity, setNewBatchCapacity] = useState('20');
  const [newBatchTotalSessions, setNewBatchTotalSessions] = useState('10');
  const [newBatchCompletedSessions, setNewBatchCompletedSessions] = useState('0');
  const [newBatchMentor, setNewBatchMentor] = useState('');
  const [newBatchSchedule, setNewBatchSchedule] = useState('Mon, Wed & Fri • 6:00 PM EST');
  const [meetingLink, setMeetingLink] = useState('');
  const [newBatchDescription, setNewBatchDescription] = useState('');

  // Session management modal
  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);
  const [sessionBatchTarget, setSessionBatchTarget] = useState<Batch | null>(null);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [newSessionTopic, setNewSessionTopic] = useState('');
  const [newSessionDate, setNewSessionDate] = useState('');
  const [newSessionTime, setNewSessionTime] = useState('');
  const [newSessionMeetingLink, setNewSessionMeetingLink] = useState('');

  const isAdmin = isUserAdmin(currentUser);

  // Filter batches based on role, tab, search query, and subject filter
  const visibleBatches = batches.filter(batch => {
    // Non-admin can only see batches where they are assigned as mentor
    if (!isAdmin && !batch.mentors.some(m => m.toLowerCase() === (currentUser?.name || '').toLowerCase())) {
      return false;
    }
    
    // Tab filter
    if (activeTab === 'master' && batch.type !== 'Master Batch') return false;
    if (activeTab === 'sub' && batch.type !== 'Sub-Batch') return false;
    
    // Subject filter
    if (subjectFilter !== 'All' && (batch.subject || 'SAT') !== subjectFilter) return false;
    
    // Search query
    const query = searchQuery.toLowerCase();
    const matchesName = batch.name.toLowerCase().includes(query);
    const matchesId = batch.id.toLowerCase().includes(query);
    const matchesMentor = batch.mentors.some(m => m.toLowerCase().includes(query));
    return matchesName || matchesId || matchesMentor;
  });

  // Batch deletion handlers (Admin only)
  const handleDeleteSingleBatch = (batchId: string, batchName?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isAdmin) {
      alert('Only administrators have permission to delete batches.');
      return;
    }
    const nameStr = batchName ? ` "${batchName}"` : '';
    if (window.confirm(`Are you sure you want to permanently delete batch${nameStr}? All associated allocations will be removed.`)) {
      const updated = batches.filter(b => b.id !== batchId);
      setBatches(updated);
      setSelectedBatchIds(prev => prev.filter(id => id !== batchId));
      if (editingBatch?.id === batchId) setEditingBatch(null);
      if (selectedBatchDetail?.id === batchId) setSelectedBatchDetail(null);
      if (selectedBatchForStudents?.id === batchId) setSelectedBatchForStudents(null);
      if (sessionBatchTarget?.id === batchId) setSessionBatchTarget(null);
    }
  };

  const handleDeleteSelectedBatches = () => {
    if (!isAdmin) {
      alert('Only administrators have permission to delete batches.');
      return;
    }
    if (selectedBatchIds.length === 0) return;
    if (window.confirm(`Are you sure you want to permanently delete ${selectedBatchIds.length} selected batch(es)?`)) {
      const updated = batches.filter(b => !selectedBatchIds.includes(b.id));
      setBatches(updated);
      setSelectedBatchIds([]);
      if (editingBatch && selectedBatchIds.includes(editingBatch.id)) setEditingBatch(null);
      if (selectedBatchDetail && selectedBatchIds.includes(selectedBatchDetail.id)) setSelectedBatchDetail(null);
    }
  };

  const toggleSelectBatch = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBatchIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllBatches = () => {
    if (selectedBatchIds.length === visibleBatches.length && visibleBatches.length > 0) {
      setSelectedBatchIds([]);
    } else {
      setSelectedBatchIds(visibleBatches.map(b => b.id));
    }
  };

  // Student allocation handlers (Admin can remove any student from batch)
  const handleRemoveStudentFromBatch = (batchId: string, studentId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isAdmin) {
      alert('Only administrators have permission to remove students from batches.');
      return;
    }
    if (window.confirm('Remove this student from the cohort?')) {
      const updated = batches.map(b => {
        if (b.id === batchId) {
          return { ...b, students: b.students.filter(sId => sId !== studentId) };
        }
        return b;
      });
      setBatches(updated);
      if (selectedBatchDetail?.id === batchId) {
        setSelectedBatchDetail({ ...selectedBatchDetail, students: selectedBatchDetail.students.filter(sId => sId !== studentId) });
      }
      if (selectedBatchForStudents?.id === batchId) {
        setSelectedBatchForStudents({ ...selectedBatchForStudents, students: selectedBatchForStudents.students.filter(sId => sId !== studentId) });
      }
    }
  };

  const handleAddStudent = () => {
    if (!selectedBatchForStudents || !studentToAdd) return;
    const updated = batches.map(b => {
      if (b.id === selectedBatchForStudents.id) {
        if (!b.students.includes(studentToAdd)) {
          return { ...b, students: [...b.students, studentToAdd] };
        }
      }
      return b;
    });
    setBatches(updated);
    if (selectedBatchDetail?.id === selectedBatchForStudents.id) {
      setSelectedBatchDetail({
        ...selectedBatchDetail,
        students: Array.from(new Set([...selectedBatchDetail.students, studentToAdd]))
      });
    }
    setSelectedBatchForStudents(null);
    setStudentToAdd('');
  };

  // Class session handlers
  const handleAddSession = () => {
    if (!sessionBatchTarget || !newSessionTitle.trim()) return;
    const newSession: BatchClassSession = {
      id: 'SES-' + Math.floor(1000 + Math.random() * 9000),
      sessionNumber: (sessionBatchTarget.sessions?.length || 0) + 1,
      title: newSessionTitle.trim(),
      topic: newSessionTopic.trim() || 'Core Curriculum Module',
      date: newSessionDate || new Date().toISOString().split('T')[0],
      time: newSessionTime || '6:00 PM EST',
      status: 'Upcoming',
      meetingLink: newSessionMeetingLink || sessionBatchTarget.meetingLink || 'https://zoom.us',
      joinedStudentIds: []
    };

    const updated = batches.map(b => {
      if (b.id === sessionBatchTarget.id) {
        const existingSessions = b.sessions || [];
        return {
          ...b,
          sessions: [...existingSessions, newSession],
          totalSessions: Math.max(b.totalSessions || 10, existingSessions.length + 1)
        };
      }
      return b;
    });

    setBatches(updated);
    setIsAddSessionModalOpen(false);
    setNewSessionTitle('');
    setNewSessionTopic('');
    setNewSessionDate('');
    setNewSessionTime('');
    setNewSessionMeetingLink('');
  };

  const handleDeleteSession = (batchId: string, sessionId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isAdmin) {
      alert('Only administrators have permission to delete sessions.');
      return;
    }
    if (window.confirm('Are you sure you want to permanently delete this class session record?')) {
      const updated = batches.map(b => {
        if (b.id === batchId) {
          const newSessions = (b.sessions || []).filter(s => s.id !== sessionId);
          return {
            ...b,
            sessions: newSessions,
            completedSessions: newSessions.filter(s => s.status === 'Completed').length
          };
        }
        return b;
      });
      setBatches(updated);
    }
  };

  const handleToggleSessionStatus = (batchId: string, sessionId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Completed' ? 'Upcoming' : 'Completed';
    const updated = batches.map(b => {
      if (b.id === batchId) {
        const newSessions = (b.sessions || []).map(s => {
          if (s.id === sessionId) {
            return { ...s, status: nextStatus as any };
          }
          return s;
        });
        return {
          ...b,
          sessions: newSessions,
          completedSessions: newSessions.filter(s => s.status === 'Completed').length
        };
      }
      return b;
    });
    setBatches(updated);
  };

  // Create batch handler
  const handleCreateBatch = () => {
    if (!newBatchName.trim()) return;
    const batchId = 'BATCH-' + Math.floor(1000 + Math.random() * 9000);
    const newBatch: Batch = {
      id: batchId,
      name: newBatchName.trim(),
      type: newBatchType,
      subject: newBatchSubject,
      capacity: parseInt(newBatchCapacity) || 20,
      totalSessions: parseInt(newBatchTotalSessions) || 10,
      completedSessions: parseInt(newBatchCompletedSessions) || 0,
      mentors: newBatchMentor ? [newBatchMentor] : (isAdmin ? [] : [currentUser?.name || 'Admin']),
      students: [],
      meetingLink: meetingLink.trim() || ('https://zoom.us/j/' + Math.floor(1000000000 + Math.random() * 9000000000)),
      scheduleDayTime: newBatchSchedule.trim(),
      description: newBatchDescription.trim(),
      status: 'Upcoming',
      sessions: [
        {
          id: 'SES-01',
          sessionNumber: 1,
          title: 'Orientation & Diagnostic Assessment',
          topic: 'Diagnostic Framework & Study Plan',
          date: new Date().toISOString().split('T')[0],
          time: '6:00 PM EST',
          status: 'Upcoming',
          meetingLink: meetingLink.trim() || 'https://zoom.us',
          joinedStudentIds: []
        }
      ]
    };
    
    setBatches([...batches, newBatch]);
    setIsCreateModalOpen(false);
    
    setNewBatchName('');
    setNewBatchType('Master Batch');
    setNewBatchSubject('SAT');
    setNewBatchCapacity('20');
    setNewBatchTotalSessions('10');
    setNewBatchCompletedSessions('0');
    setNewBatchMentor('');
    setMeetingLink('');
    setNewBatchSchedule('Mon, Wed & Fri • 6:00 PM EST');
    setNewBatchDescription('');
  };

  // Edit batch handler
  const openEditModal = (batch: Batch, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingBatch(batch);
    setNewBatchName(batch.name);
    setNewBatchType(batch.type as any);
    setNewBatchSubject((batch.subject as any) || 'SAT');
    setNewBatchCapacity(batch.capacity.toString());
    setNewBatchTotalSessions((batch.totalSessions || 10).toString());
    setNewBatchCompletedSessions((batch.completedSessions || 0).toString());
    setNewBatchMentor(batch.mentors[0] || '');
    setMeetingLink(batch.meetingLink || '');
    setNewBatchSchedule(batch.scheduleDayTime || 'Mon, Wed & Fri • 6:00 PM EST');
    setNewBatchDescription(batch.description || '');
  };

  const handleSaveEditedBatch = () => {
    if (!editingBatch || !newBatchName.trim()) return;
    const updated: Batch = {
      ...editingBatch,
      name: newBatchName.trim(),
      type: newBatchType,
      subject: newBatchSubject,
      capacity: parseInt(newBatchCapacity) || 20,
      totalSessions: parseInt(newBatchTotalSessions) || 10,
      completedSessions: parseInt(newBatchCompletedSessions) || 0,
      mentors: newBatchMentor ? [newBatchMentor] : [],
      meetingLink: meetingLink.trim(),
      scheduleDayTime: newBatchSchedule.trim(),
      description: newBatchDescription.trim()
    };
    setBatches(batches.map(b => b.id === editingBatch.id ? updated : b));
    if (selectedBatchDetail?.id === editingBatch.id) {
      setSelectedBatchDetail(updated);
    }
    setEditingBatch(null);
  };

  // Get student helper
  const getStudentById = (studentId: string): Student | undefined => {
    return students.find(s => s.id === studentId || s.email === studentId);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Batches & Cohorts Management</h2>
              {isAdmin ? (
                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold rounded-md uppercase tracking-wider">
                  Admin Full Access & Delete Controls
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold rounded-md uppercase tracking-wider">
                  Mentor View
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Manage master cohorts, sub-batches, class schedules, and student allocations.</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Admin Bulk Delete Button */}
          {isAdmin && selectedBatchIds.length > 0 && (
            <Button 
              onClick={handleDeleteSelectedBatches}
              className="bg-red-600 hover:bg-red-700 text-white font-bold shadow-sm"
              size="sm"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete Selected ({selectedBatchIds.length})
            </Button>
          )}

          {isAdmin && (
            <Button 
              onClick={() => setIsCreateModalOpen(true)} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-bold"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" /> Create New Batch
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              "px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
              activeTab === 'all' ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <Layers className="w-3.5 h-3.5" /> All Batches ({batches.length})
          </button>
          <button
            onClick={() => setActiveTab('master')}
            className={cn(
              "px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
              activeTab === 'master' ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <BookOpen className="w-3.5 h-3.5" /> Master Batches ({batches.filter(b => b.type === 'Master Batch').length})
          </button>
          <button
            onClick={() => setActiveTab('sub')}
            className={cn(
              "px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
              activeTab === 'sub' ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <GraduationCap className="w-3.5 h-3.5" /> Sub-Batches ({batches.filter(b => b.type === 'Sub-Batch').length})
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={cn(
              "px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
              activeTab === 'sessions' ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <CalendarDays className="w-3.5 h-3.5" /> Class Sessions & Attendance
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={cn(
              "px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
              activeTab === 'roster' ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <Users className="w-3.5 h-3.5" /> Student Allocation & Roster
          </button>
        </div>

        {/* Search & Subject Filters */}
        <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search batches, IDs, mentors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">All Subjects</option>
            <option value="SAT">SAT</option>
            <option value="Research">Research</option>
            <option value="Counselling">Counselling</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* TAB 1: ALL / MASTER / SUB BATCHES TABLE VIEW */}
      {(activeTab === 'all' || activeTab === 'master' || activeTab === 'sub') && (
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  {isAdmin && (
                    <th className="px-4 py-4 w-10 text-center">
                      <input 
                        type="checkbox"
                        checked={selectedBatchIds.length === visibleBatches.length && visibleBatches.length > 0}
                        onChange={toggleSelectAllBatches}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        title="Select All Batches"
                      />
                    </th>
                  )}
                  <th className="px-6 py-4">Batch Details</th>
                  <th className="px-6 py-4">Track / Subject</th>
                  <th className="px-6 py-4">Assigned Mentors</th>
                  <th className="px-6 py-4">Enrolled Students</th>
                  <th className="px-6 py-4">Schedule & Progress</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {visibleBatches.map(batch => (
                  <tr 
                    key={batch.id} 
                    className={cn(
                      "hover:bg-slate-50 transition-colors group cursor-pointer",
                      selectedBatchIds.includes(batch.id) && "bg-indigo-50/50"
                    )}
                    onClick={() => setSelectedBatchDetail(batch)}
                  >
                    {isAdmin && (
                      <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox"
                          checked={selectedBatchIds.includes(batch.id)}
                          onChange={(e) => toggleSelectBatch(batch.id, e as any)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-xs font-bold text-xs",
                          batch.type === 'Master Batch' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-purple-50 border-purple-200 text-purple-700'
                        )}>
                          {batch.type === 'Master Batch' ? <Layers className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                            {batch.name}
                            <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              {batch.id}
                            </span>
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">{batch.type} • {batch.scheduleDayTime || 'Schedule Configured'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-bold border",
                        batch.subject === 'SAT' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        batch.subject === 'Research' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        batch.subject === 'Counselling' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      )}>
                        {batch.subject || 'Counselling'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                        {batch.mentors && batch.mentors.length > 0 ? (
                          batch.mentors.map((mentorName, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium border border-slate-200">
                              {mentorName}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">No mentor assigned</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="font-bold text-slate-900">{batch.students.length}</span>
                        <span className="text-xs text-slate-500">/ {batch.capacity} Enrolled</span>
                      </div>
                      <div className="w-32 h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all",
                            (batch.students.length / batch.capacity) >= 1 ? "bg-red-500" :
                            (batch.students.length / batch.capacity) >= 0.8 ? "bg-amber-500" : "bg-indigo-500"
                          )}
                          style={{ width: `${Math.min(100, ((batch.students.length || 0) / (batch.capacity || 20)) * 100)}%` }}
                        />
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                          batch.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          batch.status === 'Upcoming' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        )}>
                          {batch.status || 'Active'}
                        </span>
                        <span className="text-xs text-slate-600 font-medium">
                          {batch.completedSessions || 0} / {batch.totalSessions || 10} Sessions
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                      {/* Join Meeting */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (batch.meetingLink) {
                            window.open(batch.meetingLink.startsWith('http') ? batch.meetingLink : `https://${batch.meetingLink}`, '_blank');
                          } else {
                            alert('No meeting link configured for this batch.');
                          }
                        }}
                        className="text-indigo-600 border-slate-200 hover:bg-indigo-50 text-xs font-bold"
                        title="Join Live Class"
                      >
                        <Video className="w-3.5 h-3.5 mr-1 text-indigo-600" /> Join
                      </Button>

                      {/* Add Students */}
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedBatchForStudents(batch)}
                          className="text-slate-700 border-slate-200 hover:bg-slate-50 text-xs font-medium"
                          title="Add Student to Batch"
                        >
                          <UserPlus className="w-3.5 h-3.5 mr-1 text-slate-600" /> Allocate
                        </Button>
                      )}

                      {/* Edit Batch */}
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => openEditModal(batch, e)}
                          className="text-slate-700 border-slate-200 hover:bg-slate-50 text-xs font-medium"
                          title="Edit Batch"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      )}

                      {/* Admin Delete Batch */}
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteSingleBatch(batch.id, batch.name, e)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2"
                          title="Delete Batch Permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleBatches.length === 0 && (
              <div className="p-12 text-center text-slate-500">
                <Layers className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-700">No batches found.</p>
                <p className="text-xs text-slate-400 mt-1">Try adjusting your search or create a new cohort batch.</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* TAB 2: CLASS SESSIONS & ATTENDANCE TRACKER */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="font-bold text-slate-900">Class Sessions & Live Schedules</h3>
              <p className="text-xs text-slate-500">Track and manage individual sessions, class links, and attendance records for all cohorts.</p>
            </div>
            {isAdmin && (
              <Button 
                onClick={() => {
                  if (batches.length > 0) {
                    setSessionBatchTarget(batches[0]);
                    setIsAddSessionModalOpen(true);
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Schedule New Session
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visibleBatches.map(batch => (
              <Card key={batch.id} className="border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-4 flex flex-row items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-bold text-slate-900">{batch.name}</CardTitle>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 uppercase">
                        {batch.subject || 'Cohort'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {batch.students.length} Students • {batch.sessions?.length || 0} Scheduled Sessions
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSessionBatchTarget(batch);
                          setIsAddSessionModalOpen(true);
                        }}
                        className="text-xs h-7 px-2 border-slate-200 hover:bg-white text-indigo-600 font-bold"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Session
                      </Button>
                    )}
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDeleteSingleBatch(batch.id, batch.name, e)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                        title="Delete Entire Batch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4 flex-1 space-y-3">
                  {batch.sessions && batch.sessions.length > 0 ? (
                    batch.sessions.map((session, sIdx) => (
                      <div 
                        key={session.id || sIdx}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-white hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => handleToggleSessionStatus(batch.id, session.id, session.status)}
                            className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors"
                            title={session.status === 'Completed' ? "Mark as Upcoming" : "Mark as Completed"}
                          >
                            {session.status === 'Completed' ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <Clock className="w-5 h-5 text-amber-500" />
                            )}
                          </button>
                          <div>
                            <p className={cn(
                              "text-xs font-bold text-slate-900",
                              session.status === 'Completed' && "line-through text-slate-400"
                            )}>
                              Session {session.sessionNumber}: {session.title}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {session.topic || 'Class topic'} • {session.date || 'TBD'} at {session.time || '6:00 PM'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {session.meetingLink && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(session.meetingLink?.startsWith('http') ? session.meetingLink : `https://${session.meetingLink}`, '_blank')}
                              className="text-xs h-7 text-indigo-600 hover:bg-indigo-50 px-2 font-bold"
                            >
                              <Video className="w-3 h-3 mr-1" /> Join
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDeleteSession(batch.id, session.id, e)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                              title="Delete Session"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      No sessions created for this batch yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: STUDENT ALLOCATION & ROSTER MATRIX */}
      {activeTab === 'roster' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900">Student Allocation & Enrollment Roster</h3>
              <p className="text-xs text-slate-500">View enrolled students by cohort. Admins can remove students or assign them across batches.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleBatches.map(batch => (
              <Card key={batch.id} className="border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                        {batch.name}
                      </CardTitle>
                      <span className="text-[10px] font-mono text-slate-400">{batch.id}</span>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedBatchForStudents(batch)}
                          className="h-7 text-xs px-2 text-indigo-600 font-bold border-slate-200"
                        >
                          <UserPlus className="w-3 h-3 mr-1" /> Add
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteSingleBatch(batch.id, batch.name, e)}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Delete Batch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4 flex-1 space-y-2">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex justify-between">
                    <span>Enrolled Students ({batch.students.length})</span>
                    <span>Max {batch.capacity}</span>
                  </div>

                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {batch.students.length > 0 ? (
                      batch.students.map(studentId => {
                        const studentObj = getStudentById(studentId);
                        return (
                          <div 
                            key={studentId} 
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100/80 transition-colors"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                {studentObj ? studentObj.name.charAt(0) : 'S'}
                              </div>
                              <div className="truncate">
                                <p className="text-xs font-bold text-slate-900 truncate">
                                  {studentObj ? studentObj.name : studentId}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {studentObj?.email || studentId}
                                </p>
                              </div>
                            </div>

                            {/* Admin Remove Student from Cohort */}
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleRemoveStudentFromBatch(batch.id, studentId, e)}
                                className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                title="Remove student from this cohort"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-6 text-center text-slate-400 text-xs">
                        No students enrolled in this batch yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* CREATE BATCH MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" /> Create New Cohort Batch
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              <div>
                <label className="font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Batch Name</label>
                <input 
                  type="text" 
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="e.g. Fall 2026 Core SAT Alpha"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Subject Track</label>
                  <select 
                    value={newBatchSubject}
                    onChange={(e: any) => setNewBatchSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="SAT">SAT</option>
                    <option value="Research">Research</option>
                    <option value="Counselling">Counselling</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Type</label>
                  <select 
                    value={newBatchType}
                    onChange={(e: any) => setNewBatchType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Master Batch">Master Batch</option>
                    <option value="Sub-Batch">Sub-Batch</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Capacity</label>
                  <input 
                    type="number" 
                    value={newBatchCapacity}
                    onChange={(e) => setNewBatchCapacity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" 
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Total Sessions</label>
                  <input 
                    type="number" 
                    value={newBatchTotalSessions}
                    onChange={(e) => setNewBatchTotalSessions(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" 
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Completed</label>
                  <input 
                    type="number" 
                    value={newBatchCompletedSessions}
                    onChange={(e) => setNewBatchCompletedSessions(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" 
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Assigned Mentor</label>
                <select 
                  value={newBatchMentor}
                  onChange={(e) => setNewBatchMentor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select Mentor...</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Schedule (Days & Times)</label>
                <input 
                  type="text" 
                  value={newBatchSchedule}
                  onChange={(e) => setNewBatchSchedule(e.target.value)}
                  placeholder="e.g. Tue & Thu • 7:00 PM EST"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm" 
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Live Class Meeting Link (Zoom / Meet)</label>
                <input 
                  type="text" 
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://zoom.us/j/..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm" 
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2.5">
              <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold" onClick={handleCreateBatch}>
                Create Batch
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT BATCH MODAL (With Admin Delete Batch Action) */}
      {editingBatch && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Edit className="w-4 h-4 text-indigo-600" /> Edit Cohort Batch ({editingBatch.id})
              </h3>
              <button onClick={() => setEditingBatch(null)} className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              <div>
                <label className="font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Batch Name</label>
                <input 
                  type="text" 
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Subject Track</label>
                  <select 
                    value={newBatchSubject}
                    onChange={(e: any) => setNewBatchSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-indigo-700"
                  >
                    <option value="SAT">SAT</option>
                    <option value="Research">Research</option>
                    <option value="Counselling">Counselling</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Type</label>
                  <select 
                    value={newBatchType}
                    onChange={(e: any) => setNewBatchType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="Master Batch">Master Batch</option>
                    <option value="Sub-Batch">Sub-Batch</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Capacity</label>
                  <input 
                    type="number" 
                    value={newBatchCapacity}
                    onChange={(e) => setNewBatchCapacity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" 
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Total Sessions</label>
                  <input 
                    type="number" 
                    value={newBatchTotalSessions}
                    onChange={(e) => setNewBatchTotalSessions(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" 
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Completed</label>
                  <input 
                    type="number" 
                    value={newBatchCompletedSessions}
                    onChange={(e) => setNewBatchCompletedSessions(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" 
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Assigned Mentor</label>
                <select 
                  value={newBatchMentor}
                  onChange={(e) => setNewBatchMentor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select Mentor...</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Meeting Link</label>
                <input 
                  type="text" 
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm" 
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              {isAdmin ? (
                <Button 
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteSingleBatch(editingBatch.id, editingBatch.name)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Batch
                </Button>
              ) : <div />}

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setEditingBatch(null)}>Cancel</Button>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold" onClick={handleSaveEditedBatch}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD STUDENT TO BATCH MODAL */}
      {selectedBatchForStudents && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900">Allocate Student</h3>
                <p className="text-xs text-slate-500">To {selectedBatchForStudents.name}</p>
              </div>
              <button onClick={() => setSelectedBatchForStudents(null)} className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-600 uppercase tracking-wider mb-2 block">Select Registered Student</label>
                <select 
                  value={studentToAdd}
                  onChange={(e) => setStudentToAdd(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Choose a student from roster...</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id}) - {s.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-[11px]">
                Enrolling the student will link their dashboard schedule and class notifications to this batch.
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setSelectedBatchForStudents(null)}>Cancel</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold" onClick={handleAddStudent}>
                Allocate Student
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE CLASS SESSION MODAL */}
      {isAddSessionModalOpen && sessionBatchTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900">Schedule Class Session</h3>
                <p className="text-xs text-slate-500">For {sessionBatchTarget.name}</p>
              </div>
              <button onClick={() => setIsAddSessionModalOpen(false)} className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-600 uppercase tracking-wider mb-1 block">Session Title</label>
                <input 
                  type="text" 
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                  placeholder="e.g. Reading Comprehension Drill #3"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm" 
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 uppercase tracking-wider mb-1 block">Curriculum Topic</label>
                <input 
                  type="text" 
                  value={newSessionTopic}
                  onChange={(e) => setNewSessionTopic(e.target.value)}
                  placeholder="e.g. Inference & Evidence-based Questions"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 uppercase tracking-wider mb-1 block">Date</label>
                  <input 
                    type="date" 
                    value={newSessionDate}
                    onChange={(e) => setNewSessionDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" 
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 uppercase tracking-wider mb-1 block">Time</label>
                  <input 
                    type="text" 
                    value={newSessionTime}
                    onChange={(e) => setNewSessionTime(e.target.value)}
                    placeholder="6:00 PM EST"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" 
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 uppercase tracking-wider mb-1 block">Meeting Link Override</label>
                <input 
                  type="text" 
                  value={newSessionMeetingLink}
                  onChange={(e) => setNewSessionMeetingLink(e.target.value)}
                  placeholder={sessionBatchTarget.meetingLink || "https://zoom.us/..."}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm" 
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsAddSessionModalOpen(false)}>Cancel</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold" onClick={handleAddSession}>
                Add Session
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH DETAIL DRAWER */}
      {selectedBatchDetail && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setSelectedBatchDetail(null)} />
          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold">
                  {selectedBatchDetail.type === 'Master Batch' ? <Layers className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{selectedBatchDetail.name}</h3>
                  <p className="text-xs text-slate-500">{selectedBatchDetail.id} • {selectedBatchDetail.type} • {selectedBatchDetail.subject}</p>
                </div>
              </div>
              <button onClick={() => setSelectedBatchDetail(null)} className="p-2 rounded-full hover:bg-slate-200 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-sm">
              {/* Batch Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Enrolled</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">
                    {selectedBatchDetail.students.length} / {selectedBatchDetail.capacity}
                  </p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Sessions</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">
                    {selectedBatchDetail.completedSessions || 0} / {selectedBatchDetail.totalSessions || 10}
                  </p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Status</p>
                  <p className="text-lg font-bold text-emerald-600 mt-1">{selectedBatchDetail.status || 'Active'}</p>
                </div>
              </div>

              {/* Mentors */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Assigned Mentors</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedBatchDetail.mentors.length > 0 ? (
                    selectedBatchDetail.mentors.map((m, i) => (
                      <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-800 border border-indigo-100 rounded-lg text-xs font-semibold">
                        {m}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">None assigned</span>
                  )}
                </div>
              </div>

              {/* Meeting Link */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Class Meeting URL</h4>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <Video className="w-4 h-4 text-indigo-600 shrink-0" />
                  <input 
                    readOnly 
                    value={selectedBatchDetail.meetingLink || 'No link set'} 
                    className="bg-transparent text-xs font-mono flex-1 text-slate-700 focus:outline-none"
                  />
                  {selectedBatchDetail.meetingLink && (
                    <Button 
                      size="sm" 
                      onClick={() => window.open(selectedBatchDetail.meetingLink, '_blank')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-7"
                    >
                      Join Class
                    </Button>
                  )}
                </div>
              </div>

              {/* Enrolled Students with Remove action */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Enrolled Students ({selectedBatchDetail.students.length})
                  </h4>
                  {isAdmin && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedBatchForStudents(selectedBatchDetail)}
                      className="text-xs h-7 text-indigo-600 font-bold border-slate-200"
                    >
                      <UserPlus className="w-3.5 h-3.5 mr-1" /> Add Student
                    </Button>
                  )}
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedBatchDetail.students.map(studentId => {
                    const st = getStudentById(studentId);
                    return (
                      <div key={studentId} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{st ? st.name : studentId}</p>
                          <p className="text-[10px] text-slate-500">{st?.email || studentId}</p>
                        </div>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveStudentFromBatch(selectedBatchDetail.id, studentId)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                            title="Remove student from batch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Drawer Footer with Admin Delete Batch */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              {isAdmin ? (
                <Button 
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteSingleBatch(selectedBatchDetail.id, selectedBatchDetail.name)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Cohort Batch
                </Button>
              ) : <div />}

              <div className="flex gap-2">
                {isAdmin && (
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(selectedBatchDetail)}
                    className="text-slate-700 font-medium text-xs"
                  >
                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit Batch
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setSelectedBatchDetail(null)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
