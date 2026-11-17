import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckSquare, 
  GraduationCap, 
  BookOpen, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  ArrowUpRight, 
  Calendar, 
  User, 
  ExternalLink, 
  FileText, 
  Video, 
  AlertCircle, 
  CheckCircle2, 
  Layers, 
  Filter,
  Maximize2,
  Sparkles,
  ArrowUpDown,
  Building,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Student, Task, ShortlistUniversity, Batch, BatchClassSession, OperationalLog } from '@/types';
import NotificationDetailsModal, { NotificationDetailData } from '@/components/NotificationDetailsModal';
import { useDatabase } from '@/context/DatabaseContext';
import { canStudentAccessEvent } from '@/lib/staffPermissions';

export type ActivityCategory = 'ALL' | 'TASK' | 'UNIVERSITY' | 'BATCH' | 'DEADLINE' | 'GUIDANCE';

export interface ActivityEventItem {
  id: string;
  category: 'TASK' | 'UNIVERSITY' | 'BATCH' | 'DEADLINE' | 'GUIDANCE';
  title: string;
  summary: string;
  description: string;
  timestamp: string;
  dateObj: Date;
  statusBadge?: string;
  statusType?: 'success' | 'warning' | 'urgent' | 'info' | 'neutral';
  performedBy?: string;
  role?: string;
  urgency?: 'URGENT' | 'HIGH' | 'MEDIUM' | 'NORMAL';
  link?: string;
  actionLabel?: string;
  
  // Specific contextual payloads for deep expansion
  task?: Task;
  university?: ShortlistUniversity;
  batch?: Batch;
  batchSession?: BatchClassSession;
  deadlineInfo?: {
    targetName: string;
    dueDate: string;
    daysLeft: number;
    type: 'UNIVERSITY_APPLICATION' | 'TASK_MILESTONE';
    portalLink?: string;
    round?: string;
    category?: string;
  };
  log?: OperationalLog;
  eventSession?: any;
}

interface StudentActivityLogSectionProps {
  student: Student;
  batches: Batch[];
  isStandalonePage?: boolean;
}

export default function StudentActivityLogSection({
  student,
  batches,
  isStandalonePage = false
}: StudentActivityLogSectionProps) {
  const navigate = useNavigate();
  const { events = [] } = useDatabase();
  const [activeCategory, setActiveCategory] = useState<ActivityCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [expandedEventIds, setExpandedEventIds] = useState<Record<string, boolean>>({});
  const [modalData, setModalData] = useState<NotificationDetailData | null>(null);

  // Helper date parser
  const parseDate = (d?: string | null): Date => {
    if (!d) return new Date();
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) return parsed;
    const ms = Date.parse(d);
    if (!isNaN(ms)) return new Date(ms);
    return new Date();
  };

  // 1. CHRONOLOGICAL EVENT AGGREGATION
  const allEvents = useMemo(() => {
    const list: ActivityEventItem[] = [];
    const now = new Date();

    // A. ASSIGNED TASKS
    const tasks = student?.tasks || [];
    tasks.forEach(t => {
      const taskDate = parseDate(t.createdAt || t.dueDate || t.updatedAt);
      const isComplete = t.stage === 'COMPLETED';
      const isUrgent = t.stage === 'NEEDS_REVISION';
      
      let statusType: 'success' | 'warning' | 'urgent' | 'info' | 'neutral' = 'info';
      if (isComplete) statusType = 'success';
      else if (isUrgent) statusType = 'urgent';
      else if (t.stage === 'IN_PROGRESS') statusType = 'info';
      else statusType = 'neutral';

      list.push({
        id: `task_${t.id}`,
        category: 'TASK',
        title: t.name,
        summary: `Stage: ${t.stage?.replace(/_/g, ' ')} · ${t.category || 'General'} · Due ${t.dueDate || 'No deadline'}`,
        description: t.description || 'Assigned coursework task and prep milestone.',
        timestamp: t.dueDate ? `Due ${t.dueDate}` : 'Active Assignment',
        dateObj: taskDate,
        statusBadge: t.stage?.replace(/_/g, ' '),
        statusType,
        performedBy: t.assignedBy || student?.counselor || 'Advisory Team',
        role: 'Counselor / Mentor',
        task: t,
        link: '/student/tasks',
        actionLabel: 'Open in Task Manager'
      });
    });

    // B. UNIVERSITY APPLICATIONS
    const shortlist = student?.shortlist || [];
    shortlist.forEach(u => {
      const uniDate = parseDate(u.deadline);
      list.push({
        id: `uni_${u.id || u.name}`,
        category: 'UNIVERSITY',
        title: `University Application: ${u.name}`,
        summary: `${u.category || 'Target'} Tier · ${u.round || 'Regular Decision'} · Status: ${u.status || 'Shortlisted'}`,
        description: `Application tracking for ${u.name}. Major: ${u.major || 'Undecided'}. Application round: ${u.round || 'RD'}.${u.deadline ? ` Priority Deadline: ${u.deadline}.` : ''}`,
        timestamp: u.deadline ? `Deadline: ${u.deadline}` : 'Shortlisted',
        dateObj: uniDate,
        statusBadge: u.status || 'Shortlisted',
        statusType: u.status === 'Accepted' ? 'success' : u.status === 'Submitted' ? 'info' : 'neutral',
        performedBy: student?.counselor || 'Admissions Strategy',
        role: 'Lead Counselor',
        university: u,
        link: '/student/universities',
        actionLabel: 'View in Universities'
      });
    });

    // C. BATCH CHANGES & COHORT UPDATES
    const studentBatches = (batches || []).filter(b => 
      b.students?.includes(student?.id) || 
      b.students?.includes(student?.name) ||
      b.students?.includes(student?.email)
    );

    studentBatches.forEach(b => {
      const firstSessionDate = b.sessions && b.sessions.length > 0 ? b.sessions[0].date : null;
      const batchDate = firstSessionDate ? parseDate(firstSessionDate) : new Date();
      list.push({
        id: `batch_enroll_${b.id}`,
        category: 'BATCH',
        title: `Cohort Enrollment: ${b.name}`,
        summary: `${b.type || 'Batch'} · ${b.subject || 'Admissions'} · ${b.scheduleDayTime || 'Scheduled live sessions'}`,
        description: `Enrolled in ${b.name} (${b.type || 'Cohort'}). Mentors: ${(b.mentors || []).join(', ') || 'Faculty Team'}. Schedule: ${b.scheduleDayTime || 'Weekly classes'}.`,
        timestamp: b.scheduleDayTime || (firstSessionDate ? `Sessions from ${firstSessionDate}` : 'Active Cohort'),
        dateObj: batchDate,
        statusBadge: b.status || 'Active Batch',
        statusType: 'info',
        performedBy: (b.mentors && b.mentors[0]) || 'Academic Coordinator',
        role: 'Faculty Mentor',
        batch: b,
        link: '/student/schedules',
        actionLabel: 'View Class Schedule'
      });

      // Also include specific scheduled live sessions / lectures
      (b.sessions || []).forEach(sess => {
        const sessDate = parseDate(sess.date);
        list.push({
          id: `batch_sess_${sess.id}`,
          category: 'BATCH',
          title: `Class Session #${sess.sessionNumber}: ${sess.title}`,
          summary: `${b.name} · ${sess.status} · ${sess.date} ${sess.time || ''}`,
          description: sess.notes || sess.topic || `Scheduled live lecture session for ${b.name}.`,
          timestamp: `${sess.date} ${sess.time ? `at ${sess.time}` : ''}`,
          dateObj: sessDate,
          statusBadge: sess.status,
          statusType: sess.status === 'Completed' ? 'success' : sess.status === 'Upcoming' ? 'info' : 'neutral',
          performedBy: (b.mentors && b.mentors[0]) || 'Educator',
          role: 'Instructor',
          batch: b,
          batchSession: sess,
          link: sess.meetingLink || '/student/schedules',
          actionLabel: sess.meetingLink ? 'Join Live Lecture' : 'View Schedule'
        });
      });
    });

    // D. DEADLINES (Impending application deadlines and critical task milestones)
    shortlist.forEach(u => {
      if (u.deadline) {
        const dDate = new Date(u.deadline);
        const diffDays = Math.ceil((dDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (!isNaN(diffDays)) {
          const isUrgent = diffDays <= 7 && diffDays >= 0;
          list.push({
            id: `deadline_uni_${u.id || u.name}`,
            category: 'DEADLINE',
            title: `Application Deadline: ${u.name}`,
            summary: diffDays < 0 
              ? `Passed ${Math.abs(diffDays)} days ago (${u.deadline})` 
              : diffDays === 0 
              ? 'Due Today!' 
              : `${diffDays} days remaining (${u.deadline})`,
            description: `Official application deadline for ${u.name} (${u.round || 'Regular Decision'}). Complete and submit your Common App, supplement essays, transcripts, and financial verification documents prior to the cutoff.`,
            timestamp: diffDays < 0 ? `Passed (${u.deadline})` : diffDays === 0 ? 'Today!' : `${diffDays}d left`,
            dateObj: dDate,
            statusBadge: diffDays < 0 ? 'Closed' : diffDays === 0 ? 'Due Today' : `${diffDays} Days Left`,
            statusType: diffDays <= 7 && diffDays >= 0 ? 'urgent' : diffDays > 7 ? 'warning' : 'neutral',
            urgency: diffDays <= 3 && diffDays >= 0 ? 'URGENT' : diffDays <= 14 && diffDays >= 0 ? 'HIGH' : 'NORMAL',
            performedBy: student?.counselor || 'Admissions Strategy',
            role: 'Application System',
            university: u,
            deadlineInfo: {
              targetName: u.name,
              dueDate: u.deadline,
              daysLeft: diffDays,
              type: 'UNIVERSITY_APPLICATION',
              portalLink: u.portalLink,
              round: u.round,
              category: u.category
            },
            link: '/student/universities',
            actionLabel: 'Open Application Portal'
          });
        }
      }
    });

    tasks.forEach(t => {
      if (t.dueDate && t.stage !== 'COMPLETED') {
        const tDate = new Date(t.dueDate);
        const diffDays = Math.ceil((tDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (!isNaN(diffDays)) {
          list.push({
            id: `deadline_task_${t.id}`,
            category: 'DEADLINE',
            title: `Task Due Date: ${t.name}`,
            summary: diffDays < 0 
              ? `Overdue by ${Math.abs(diffDays)} day(s)` 
              : diffDays === 0 
              ? 'Due Today!' 
              : `${diffDays} days left to submit`,
            description: `Task milestone deadline for "${t.name}". Category: ${t.category || 'General'}. Ensure work is submitted for review before the deadline.`,
            timestamp: diffDays < 0 ? `Overdue (${t.dueDate})` : diffDays === 0 ? 'Due Today' : `${diffDays}d left`,
            dateObj: tDate,
            statusBadge: diffDays < 0 ? 'Overdue' : diffDays === 0 ? 'Today' : `${diffDays}d remaining`,
            statusType: diffDays <= 3 ? 'urgent' : 'warning',
            urgency: diffDays <= 3 ? 'URGENT' : 'MEDIUM',
            performedBy: t.assignedBy || 'Advisor',
            role: 'Assignment Due Date',
            task: t,
            deadlineInfo: {
              targetName: t.name,
              dueDate: t.dueDate,
              daysLeft: diffDays,
              type: 'TASK_MILESTONE'
            },
            link: '/student/tasks',
            actionLabel: 'Submit Task Deliverable'
          });
        }
      }
    });

    // E. COUNSELOR GUIDANCE & OPERATIONAL LOGS
    const operationalLogs = student?.operationalLogs || [];
    operationalLogs.forEach(log => {
      // Filter out noisy personal profile fields
      const lower = `${log.activityType || ''} ${log.description || ''}`.toLowerCase();
      const isProfileNoise = lower.includes('phone number') || lower.includes('email updated') || lower.includes('password');
      if (!isProfileNoise) {
        const logDate = parseDate(log.timestamp);
        list.push({
          id: log.id || `log_${Math.random()}`,
          category: 'GUIDANCE',
          title: log.activityType || 'Counselor Update',
          summary: `${log.performedBy || 'Counselor'} · ${log.timestamp || 'Recent update'}`,
          description: log.description || 'Admissions guidance log recorded by advisory team.',
          timestamp: log.timestamp || 'Recorded',
          dateObj: logDate,
          statusBadge: log.activityType || 'Guidance Log',
          statusType: 'info',
          performedBy: log.performedBy || student?.counselor || 'Counselor',
          role: log.role || 'Admissions Counselor',
          log: log
        });
      }
    });

    // F. COUNSELLOR SESSIONS & MINUTES OF MEETING (MOM)
    const studentEvents = (events || []).filter(e => canStudentAccessEvent(e, student, batches));
    studentEvents.forEach(evt => {
      const eDate = parseDate(evt.day || evt.date);
      const hasMOM = Array.isArray(evt.moms) && evt.moms.length > 0;
      const momSummary = hasMOM ? evt.moms[0].keyPoints || evt.moms[0].studentProgress : '';
      list.push({
        id: `meeting_evt_${evt.id}`,
        category: 'GUIDANCE',
        title: `Counsellor Meeting: ${evt.title}`,
        summary: `${evt.day || evt.date} ${evt.time ? `at ${evt.time}` : ''} · Host: ${evt.host || 'Counsellor'}${hasMOM ? ' · MOM Recorded' : ''}`,
        description: evt.notes || momSummary || `Session with ${evt.host || 'Counsellor'} on ${evt.stream || 'Admissions Strategy'}.`,
        timestamp: `${evt.day || evt.date} ${evt.time || ''}`,
        dateObj: eDate,
        statusBadge: hasMOM ? 'MOM Recorded' : (evt.status || 'Scheduled'),
        statusType: hasMOM ? 'success' : 'info',
        performedBy: evt.host || student?.counselor || 'Counsellor',
        role: 'Admissions Counsellor',
        eventSession: evt,
        link: evt.location || '/student/schedules',
        actionLabel: evt.location ? 'Join Meeting / Notes' : 'View Schedule'
      });
    });

    return list;
  }, [student, batches, events]);

  // 2. FILTERING & SEARCH
  const filteredEvents = useMemo(() => {
    return allEvents.filter(event => {
      // Category filter
      if (activeCategory !== 'ALL' && event.category !== activeCategory) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = event.title.toLowerCase().includes(q);
        const matchesSummary = event.summary.toLowerCase().includes(q);
        const matchesDesc = event.description.toLowerCase().includes(q);
        const matchesPerformer = (event.performedBy || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesSummary && !matchesDesc && !matchesPerformer) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const timeA = a.dateObj.getTime();
      const timeB = b.dateObj.getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [allEvents, activeCategory, searchQuery, sortOrder]);

  // Category counts
  const categoryCounts = useMemo(() => {
    return {
      ALL: allEvents.length,
      TASK: allEvents.filter(e => e.category === 'TASK').length,
      UNIVERSITY: allEvents.filter(e => e.category === 'UNIVERSITY').length,
      BATCH: allEvents.filter(e => e.category === 'BATCH').length,
      DEADLINE: allEvents.filter(e => e.category === 'DEADLINE').length,
      GUIDANCE: allEvents.filter(e => e.category === 'GUIDANCE').length
    };
  }, [allEvents]);

  // Toggle expand for a single event
  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedEventIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Toggle all expand
  const areAllExpanded = useMemo(() => {
    if (filteredEvents.length === 0) return false;
    return filteredEvents.every(e => expandedEventIds[e.id]);
  }, [filteredEvents, expandedEventIds]);

  const toggleExpandAll = () => {
    if (areAllExpanded) {
      setExpandedEventIds({});
    } else {
      const next: Record<string, boolean> = {};
      filteredEvents.forEach(e => {
        next[e.id] = true;
      });
      setExpandedEventIds(next);
    }
  };

  // Open rich detail modal
  const handleOpenModal = (event: ActivityEventItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    setModalData({
      id: event.id,
      title: event.title,
      message: event.description,
      timestamp: event.timestamp,
      category: event.category === 'TASK' ? 'TASK' :
                event.category === 'UNIVERSITY' ? 'UNIVERSITY' :
                event.category === 'BATCH' ? 'BATCH' :
                event.category === 'DEADLINE' ? 'DEADLINE' : 'NOTE',
      type: event.urgency === 'URGENT' ? 'URGENT' : 'COUNSELOR',
      task: event.task,
      university: event.university,
      batch: event.batch,
      deadlineInfo: event.deadlineInfo ? {
        uni: event.university || { name: event.deadlineInfo.targetName, deadline: event.deadlineInfo.dueDate },
        daysLeft: event.deadlineInfo.daysLeft,
        deadline: event.deadlineInfo.dueDate,
        round: event.deadlineInfo.round
      } : undefined,
      log: event.log,
      link: event.link,
      actionText: event.actionLabel
    });
  };

  return (
    <div className={cn("space-y-4", isStandalonePage ? "max-w-7xl mx-auto" : "")}>
      {/* SECTION HEADER BAR */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Clock className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Activity Log
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                ({filteredEvents.length} chronological update{filteredEvents.length !== 1 ? 's' : ''})
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Real-time timeline tracking assigned tasks, university applications, batch changes, deadlines, and guidance updates. Click any event to expand complete details.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
              title="Toggle sorting direction"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
            </button>

            <button
              onClick={toggleExpandAll}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2.5 py-1.5 rounded-lg border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-100 flex items-center gap-1.5 transition-colors"
            >
              {areAllExpanded ? 'Collapse All' : 'Expand All'}
            </button>

            {!isStandalonePage && (
              <button
                onClick={() => navigate('/student/activity-log')}
                className="text-xs font-bold text-slate-700 hover:text-indigo-600 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-200 bg-white hover:bg-indigo-50/30 flex items-center gap-1 transition-colors"
              >
                <span>Full Page</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* SEARCH & CATEGORY FILTER TABS */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Functional filter tabs */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-0.5">
            {[
              { key: 'ALL', label: 'All Updates', icon: Clock },
              { key: 'TASK', label: 'Assigned Tasks', icon: CheckSquare },
              { key: 'UNIVERSITY', label: 'University Applications', icon: GraduationCap },
              { key: 'BATCH', label: 'Batch Changes', icon: BookOpen },
              { key: 'DEADLINE', label: 'Deadlines', icon: AlertCircle },
              { key: 'GUIDANCE', label: 'Guidance & Notes', icon: Sparkles }
            ].map(tab => {
              const count = categoryCounts[tab.key as ActivityCategory];
              const IconComponent = tab.icon;
              const isActive = activeCategory === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveCategory(tab.key as ActivityCategory)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 shrink-0",
                    isActive
                      ? "bg-slate-900 text-white shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  )}
                >
                  <IconComponent className={cn("w-3.5 h-3.5", isActive ? "text-white" : "text-slate-400")} />
                  <span>{tab.label}</span>
                  <span className={cn(
                    "text-[10px] ml-0.5 font-bold",
                    isActive ? "text-white/80" : "text-slate-400"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search updates by name, mentor, program..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* EVENT TIMELINE STREAM */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center space-y-2">
            <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center mx-auto">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700">No activity log updates match your current filter</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try switching category tabs or clearing your search query to view all chronological events.
            </p>
            {(activeCategory !== 'ALL' || searchQuery) && (
              <button
                onClick={() => {
                  setActiveCategory('ALL');
                  setSearchQuery('');
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 pt-1"
              >
                Reset all filters
              </button>
            )}
          </div>
        ) : (
          filteredEvents.map(event => {
            const isExpanded = !!expandedEventIds[event.id];

            return (
              <div
                key={event.id}
                onClick={() => toggleExpand(event.id)}
                className={cn(
                  "bg-white rounded-2xl border transition-all cursor-pointer overflow-hidden text-left group",
                  isExpanded
                    ? "border-indigo-300 shadow-sm ring-1 ring-indigo-500/10"
                    : "border-slate-200 hover:border-slate-300 hover:shadow-2xs"
                )}
              >
                {/* Event Summary Bar */}
                <div className="p-4 flex items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    {/* Category Icon */}
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 transition-colors",
                      event.category === 'TASK' ? "bg-indigo-50 text-indigo-600" :
                      event.category === 'UNIVERSITY' ? "bg-blue-50 text-blue-600" :
                      event.category === 'BATCH' ? "bg-purple-50 text-purple-600" :
                      event.category === 'DEADLINE' ? (event.urgency === 'URGENT' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600") :
                      "bg-emerald-50 text-emerald-600"
                    )}>
                      {event.category === 'TASK' && <CheckSquare className="w-4 h-4" />}
                      {event.category === 'UNIVERSITY' && <GraduationCap className="w-4 h-4" />}
                      {event.category === 'BATCH' && <BookOpen className="w-4 h-4" />}
                      {event.category === 'DEADLINE' && <AlertCircle className="w-4 h-4" />}
                      {event.category === 'GUIDANCE' && <Sparkles className="w-4 h-4" />}
                    </div>

                    {/* Title & Quiet Unboxed Metadata */}
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                          {event.title}
                        </h4>
                        
                        {/* Status Label (Clean text metadata with subtle indicator) */}
                        {event.statusBadge && (
                          <span className={cn(
                            "text-[11px] font-semibold flex items-center gap-1",
                            event.statusType === 'urgent' ? "text-rose-600" :
                            event.statusType === 'warning' ? "text-amber-600" :
                            event.statusType === 'success' ? "text-emerald-600" :
                            "text-slate-600"
                          )}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {event.statusBadge}
                          </span>
                        )}
                      </div>

                      {/* Clean Unboxed Metadata with Typographic Separator */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        <span>{event.summary}</span>
                        {event.performedBy && (
                          <>
                            <span aria-hidden="true" className="text-slate-300">·</span>
                            <span>By {event.performedBy}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions & Expand Chevron */}
                  <div className="flex items-center gap-2 shrink-0 pt-0.5 sm:pt-0">
                    <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                      {event.timestamp}
                    </span>

                    <button
                      onClick={(e) => toggleExpand(event.id, e)}
                      className={cn(
                        "p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors",
                        isExpanded ? "bg-slate-100 text-slate-700" : ""
                      )}
                      aria-label={isExpanded ? "Collapse details" : "Expand details"}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* EXPANDED DETAILS ACCORDION VIEW */}
                {isExpanded && (
                  <div 
                    className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-3.5 animate-in fade-in duration-150"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Event Description */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/70 space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Event Summary & Guidance
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                        {event.description}
                      </p>
                    </div>

                    {/* Full Counsellor Guidance / Log Details */}
                    {event.log?.details && (
                      <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-200 space-y-1.5">
                        <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider block">
                          Full Counsellor Notes & Observations
                        </span>
                        <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans bg-white p-3 rounded-lg border border-indigo-100">
                          {event.log.details}
                        </p>
                      </div>
                    )}

                    {/* Counsellor Meeting Notes & Minutes of Meeting (MOM) */}
                    {event.eventSession && (
                      <div className="space-y-3 pt-1">
                        {event.eventSession.notes && (
                          <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-200 space-y-1.5">
                            <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                              <FileText className="w-4 h-4 text-indigo-600" />
                              <span>Session Discussion Notes</span>
                            </span>
                            <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans bg-white p-3 rounded-lg border border-indigo-100">
                              {event.eventSession.notes}
                            </div>
                          </div>
                        )}

                        {Array.isArray(event.eventSession.moms) && event.eventSession.moms.length > 0 && (
                          <div className="space-y-2.5">
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Minutes of Meeting (MOM Report)</span>
                            </span>
                            {event.eventSession.moms.map((mom: any, mIdx: number) => (
                              <div key={mIdx} className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-200 space-y-2.5 text-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-1.5">
                                  <span className="font-bold text-emerald-950">
                                    Documented by {mom.authorName || event.eventSession.host || 'Counsellor'} ({mom.authorRole || 'Counsellor'})
                                  </span>
                                  {mom.date && <span className="text-slate-500 font-medium">{mom.date}</span>}
                                </div>
                                {mom.keyPoints && (
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">1. Key Discussion Points:</span>
                                    <p className="text-slate-800 font-sans whitespace-pre-wrap bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed">{mom.keyPoints}</p>
                                  </div>
                                )}
                                {mom.studentProgress && (
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">2. Student Progress & Achievements:</span>
                                    <p className="text-slate-800 font-sans whitespace-pre-wrap bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed">{mom.studentProgress}</p>
                                  </div>
                                )}
                                {mom.observations && (
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">3. Observations & Concerns:</span>
                                    <p className="text-slate-800 font-sans whitespace-pre-wrap bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed">{mom.observations}</p>
                                  </div>
                                )}
                                {mom.nextSteps && (
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">4. Recommended Next Steps:</span>
                                    <p className="text-slate-800 font-sans whitespace-pre-wrap bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed">{mom.nextSteps}</p>
                                  </div>
                                )}
                                {mom.followUpActions && (
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">5. Follow-Up Action Items:</span>
                                    <p className="text-slate-800 font-sans whitespace-pre-wrap bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed">{mom.followUpActions}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {Array.isArray(event.eventSession.tasks) && event.eventSession.tasks.length > 0 && (
                          <div className="space-y-2 pt-1">
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                              <CheckSquare className="w-4 h-4 text-indigo-600" />
                              <span>Assigned Post-Meeting Tasks ({event.eventSession.tasks.length})</span>
                            </span>
                            <div className="grid grid-cols-1 gap-1.5">
                              {event.eventSession.tasks.map((task: any, tIdx: number) => (
                                <div key={tIdx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                  <div>
                                    <p className="font-bold text-slate-900">{task.title}</p>
                                    {task.description && <p className="text-slate-600 mt-0.5 leading-relaxed">{task.description}</p>}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {task.dueDate && (
                                      <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                                        Due: {task.dueDate}
                                      </span>
                                    )}
                                    <span className={cn(
                                      "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                                      task.status === 'DONE' ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-700'
                                    )}>
                                      {task.status || 'PENDING'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* A. CONTEXT SPECIFIC: TASK DETAILS */}
                    {event.task && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Current Stage</span>
                          <p className="text-xs font-bold text-slate-800 mt-0.5">{event.task.stage?.replace(/_/g, ' ')}</p>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Category</span>
                          <p className="text-xs font-semibold text-slate-800 mt-0.5">{event.task.category || 'General'}</p>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Due Date</span>
                          <p className="text-xs font-semibold text-slate-800 mt-0.5">{event.task.dueDate || 'Flexible'}</p>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Assigned By</span>
                          <p className="text-xs font-semibold text-slate-800 mt-0.5">{event.task.assignedBy || 'Advisor'}</p>
                        </div>
                      </div>
                    )}

                    {/* Task Deliverable / Attachments */}
                    {event.task && (event.task.pdfFileName || (event.task.attachments && event.task.attachments.length > 0)) && (
                      <div className="bg-white p-3 rounded-xl border border-slate-200/70 space-y-1.5">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Attachments & Deliverable Reference</span>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {event.task.pdfFileName && (
                            <a
                              href={event.task.pdfUrl || '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 bg-indigo-50/70 px-2.5 py-1 rounded-lg border border-indigo-100"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>{event.task.pdfFileName}</span>
                              <ExternalLink className="w-3 h-3 ml-0.5" />
                            </a>
                          )}
                          {(event.task.attachments || []).map(att => (
                            <a
                              key={att.id}
                              href={att.fileUrl || '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-slate-700 hover:text-slate-900 font-medium flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg"
                            >
                              <FileText className="w-3.5 h-3.5 text-slate-500" />
                              <span>{att.fileName}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* B. CONTEXT SPECIFIC: UNIVERSITY APPLICATION */}
                    {event.university && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Admission Tier</span>
                          <p className="text-xs font-bold text-slate-800 mt-0.5">{event.university.category || 'Target'}</p>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Application Round</span>
                          <p className="text-xs font-semibold text-slate-800 mt-0.5">{event.university.round || 'Regular Decision'}</p>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Target Major</span>
                          <p className="text-xs font-semibold text-slate-800 mt-0.5">{event.university.major || 'Undecided'}</p>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Status</span>
                          <p className="text-xs font-semibold text-slate-800 mt-0.5">{event.university.status || 'Shortlisted'}</p>
                        </div>
                      </div>
                    )}

                    {/* University Required Documents Checklist */}
                    {event.university && event.university.requiredDocs && event.university.requiredDocs.length > 0 && (
                      <div className="bg-white p-3 rounded-xl border border-slate-200/70 space-y-1.5">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Application Document Checklist</span>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {event.university.requiredDocs.map((docItem: any, idx: number) => {
                            const docName = typeof docItem === 'string' ? docItem : docItem?.name || `Document #${idx + 1}`;
                            return (
                              <span key={idx} className="text-xs bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md text-slate-700 flex items-center gap-1 font-medium">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>{docName}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* C. CONTEXT SPECIFIC: BATCH & COHORT */}
                    {event.batch && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Batch Type</span>
                          <p className="text-xs font-bold text-slate-800 mt-0.5">{event.batch.type || 'Cohort'}</p>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Assigned Mentors</span>
                          <p className="text-xs font-semibold text-slate-800 mt-0.5">{(event.batch.mentors || []).join(', ') || 'Faculty Team'}</p>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Weekly Schedule</span>
                          <p className="text-xs font-semibold text-slate-800 mt-0.5">{event.batch.scheduleDayTime || 'Live Sessions'}</p>
                        </div>
                      </div>
                    )}

                    {/* Batch class session details */}
                    {event.batchSession && (
                      <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100 space-y-1.5">
                        <span className="text-[10px] text-purple-900 font-bold uppercase flex items-center gap-1">
                          <Video className="w-3.5 h-3.5 text-purple-600" /> Lecture Session Info
                        </span>
                        <p className="text-xs text-purple-950 font-semibold">{event.batchSession.title}</p>
                        <p className="text-xs text-purple-800">{event.batchSession.date} {event.batchSession.time ? `at ${event.batchSession.time}` : ''}</p>
                        {event.batchSession.meetingLink && (
                          <div className="pt-1">
                            <a
                              href={event.batchSession.meetingLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold text-purple-700 hover:text-purple-900 underline inline-flex items-center gap-1"
                            >
                              Join Lecture Meeting Link <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* D. CONTEXT SPECIFIC: DEADLINE COUNTDOWN */}
                    {event.deadlineInfo && (
                      <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
                            Milestone Countdown
                          </span>
                          <p className="text-xs font-semibold text-amber-950">
                            Target: {event.deadlineInfo.targetName}
                          </p>
                          <p className="text-xs text-amber-800">
                            Due Date: <strong className="font-bold">{event.deadlineInfo.dueDate}</strong>
                          </p>
                        </div>
                        <div className="text-left sm:text-right shrink-0">
                          <span className={cn(
                            "text-sm font-extrabold px-3 py-1 rounded-lg inline-block",
                            event.deadlineInfo.daysLeft < 0 ? "bg-slate-200 text-slate-700" :
                            event.deadlineInfo.daysLeft <= 3 ? "bg-rose-600 text-white" :
                            event.deadlineInfo.daysLeft <= 14 ? "bg-amber-500 text-white" :
                            "bg-indigo-600 text-white"
                          )}>
                            {event.deadlineInfo.daysLeft < 0 ? 'Passed' : event.deadlineInfo.daysLeft === 0 ? 'Due Today' : `${event.deadlineInfo.daysLeft} Days Left`}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Card Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleOpenModal(event, e)}
                          className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
                        >
                          <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Detailed Modal View</span>
                        </button>
                      </div>

                      {event.link && (
                        <button
                          onClick={() => {
                            if (event.link?.startsWith('http')) {
                              window.open(event.link, '_blank');
                            } else {
                              navigate(event.link!);
                            }
                          }}
                          className="text-xs font-bold text-white bg-slate-900 hover:bg-indigo-600 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <span>{event.actionLabel || 'View Section'}</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* POPUP MODAL FOR DEEP DIVE VIEW */}
      <NotificationDetailsModal
        isOpen={!!modalData}
        notification={modalData}
        onClose={() => setModalData(null)}
        onNavigate={(path) => {
          setModalData(null);
          navigate(path);
        }}
      />
    </div>
  );
}
