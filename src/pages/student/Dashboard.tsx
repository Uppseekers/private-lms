import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  RadialBarChart, 
  RadialBar 
} from 'recharts';
import { 
  Bell, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  FileText, 
  FolderKanban, 
  MessageSquare, 
  AlertCircle, 
  UserCheck, 
  Filter, 
  ArrowRight,
  ShieldCheck,
  Award,
  BookOpen
} from 'lucide-react';
import { useDatabase } from '@/context/DatabaseContext';
import { cn } from '@/lib/utils';
import { canStudentAccessEvent } from '@/lib/staffPermissions';
import NotificationDetailsModal, { NotificationDetailData } from '@/components/NotificationDetailsModal';

interface ActivityItem {
  id: string;
  category: 'MEETING' | 'TASK' | 'ESSAY' | 'DOCUMENT' | 'COUNSELOR_LOG' | 'STATUS';
  title: string;
  description: string;
  timestamp: string;
  dateObj?: Date;
  statusBadge?: string;
  statusColor?: string;
  meta?: string;
  performedBy?: string;
}

interface NotificationItem extends NotificationDetailData {
  id: string;
  title: string;
  message: string;
  type: 'URGENT' | 'COUNSELOR' | 'SYSTEM' | 'SUCCESS' | string;
  timestamp: string;
  read: boolean;
  link?: string;
  actionText?: string;
  performedBy?: string;
  source?: string;
  meeting?: any;
  task?: any;
  log?: any;
  doc?: any;
  essay?: any;
}

export default function StudentDashboard() {
  const { currentUser, events, batches, students } = useDatabase();
  const [activityFilter, setActivityFilter] = useState<'ALL' | 'MEETING' | 'TASK' | 'ESSAY' | 'COUNSELOR_LOG'>('ALL');
  const [notificationFilter, setNotificationFilter] = useState<'ALL' | 'UNREAD' | 'URGENT'>('ALL');
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<NotificationDetailData | null>(null);

  const student = students.find(s => 
    (currentUser?.id && s.id === currentUser.id) || 
    (currentUser?.email && s.email?.toLowerCase() === currentUser.email?.toLowerCase())
  ) || (currentUser as any);
  const tasks = student?.tasks || [];
  const shortlist = student?.shortlist || [];
  const essays = student?.essays || [];
  const documents = student?.documents || [];
  const operationalLogs = student?.operationalLogs || [];
  const profileActivities = student?.activities || [];

  const studentBatches = batches.filter(b => b.students?.includes(student?.id) || b.students?.includes(student?.name));
  const studentEvents = events.filter(e => canStudentAccessEvent(e, student, batches));

  // --- 1. TASK BREAKDOWN DATA ---
  const completedTasks = tasks.filter((t: any) => t.stage === 'COMPLETED').length;
  const inProgressTasks = tasks.filter((t: any) => t.stage === 'IN_PROGRESS').length;
  const pendingTasks = tasks.filter((t: any) => t.stage === 'TO_DO').length;
  const needsRevisionTasks = tasks.filter((t: any) => t.stage === 'NEEDS_REVISION').length;

  const taskData = [];
  if (completedTasks > 0) taskData.push({ name: 'Completed', value: completedTasks, color: '#10b981' });
  if (inProgressTasks > 0) taskData.push({ name: 'In Progress', value: inProgressTasks, color: '#3b82f6' });
  if (pendingTasks > 0) taskData.push({ name: 'Pending', value: pendingTasks, color: '#f59e0b' });
  if (needsRevisionTasks > 0) taskData.push({ name: 'Needs Revision', value: needsRevisionTasks, color: '#ef4444' });

  if (taskData.length === 0) {
    taskData.push({ name: 'No Tasks', value: 1, color: '#e2e8f0' });
  }

  // --- 2. DEADLINE COUNTDOWN DATA ---
  const now = new Date();
  const upcomingDeadlines: { date: Date; name: string }[] = [];

  shortlist.forEach((uni: any) => {
    if (uni.deadline) {
      const d = new Date(uni.deadline);
      if (!isNaN(d.getTime())) upcomingDeadlines.push({ date: d, name: uni.name });
    }
  });

  tasks.forEach((t: any) => {
    if (t.dueDate && t.stage !== 'COMPLETED') {
      const d = new Date(t.dueDate);
      if (!isNaN(d.getTime())) upcomingDeadlines.push({ date: d, name: t.name });
    }
  });

  const futureDeadlines = upcomingDeadlines.filter(item => item.date.getTime() >= now.getTime());
  futureDeadlines.sort((a, b) => a.date.getTime() - b.date.getTime());

  let daysLeft = 0;
  let targetLabel = 'No upcoming deadlines';

  if (futureDeadlines.length > 0) {
    const closest = futureDeadlines[0];
    const diffMs = closest.date.getTime() - now.getTime();
    daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    targetLabel = `Next: ${closest.name}`;
  } else {
    daysLeft = 30;
    targetLabel = 'Target Intake Prep';
  }

  const countdownData = [
    { name: 'Remaining', value: daysLeft, fill: '#3b82f6' },
    { name: 'Total', value: 100, fill: '#f1f5f9' }
  ];

  const currentBatch = studentBatches.length > 0 ? studentBatches[0].name : 'Not Assigned';

  // --- 3. CONSOLIDATED ACTIVITY FEED ---
  const consolidatedActivities: ActivityItem[] = useMemo(() => {
    const feed: ActivityItem[] = [];

    // Counselor & Staff Operational Logs
    operationalLogs.forEach((log: any) => {
      feed.push({
        id: log.id || 'log_' + Math.random(),
        category: 'COUNSELOR_LOG',
        title: log.activityType || 'Counselor Log',
        description: log.description || 'Counselor recorded an activity.',
        timestamp: log.timestamp || 'Recent',
        performedBy: log.performedBy || 'Counselor',
        statusBadge: log.attendees || log.role || 'Staff',
        statusColor: 'bg-indigo-100 text-indigo-800'
      });
    });

    // Profile activities
    profileActivities.forEach((act: any) => {
      if (act.type === 'Whatsapp Chat' || act.type === 'Audio Call' || act.type === 'Zoho/Zoom Call' || act.type === 'Task' || act.type === 'Essay') {
        feed.push({
          id: act.id || 'act_' + Math.random(),
          category: 'COUNSELOR_LOG',
          title: `${act.type} (${act.attendees || 'Counselor Log'})`,
          description: act.description,
          timestamp: act.timestamp || act.date || 'Recently',
          performedBy: act.performedBy || 'Counselor',
          statusBadge: act.attendees || 'Logged',
          statusColor: 'bg-purple-100 text-purple-800'
        });
      }
    });

    // Meetings
    studentEvents.forEach((evt: any) => {
      feed.push({
        id: evt.id,
        category: 'MEETING',
        title: evt.title || 'Counseling Session',
        description: `${evt.date || 'Scheduled'} at ${evt.time || 'TBD'} (${evt.location || 'Zoom'})`,
        timestamp: evt.date || 'Upcoming Meeting',
        performedBy: evt.host || 'Counselor',
        statusBadge: evt.status || 'Scheduled',
        statusColor: 'bg-blue-100 text-blue-800'
      });
    });

    // Tasks Stages
    tasks.forEach((t: any) => {
      feed.push({
        id: t.id,
        category: 'TASK',
        title: `Task: ${t.name}`,
        description: `Stage: ${t.stage?.replace('_', ' ')} | Category: ${t.category || 'General'}`,
        timestamp: t.dueDate ? `Due: ${t.dueDate}` : 'Active Task',
        statusBadge: t.stage,
        statusColor: t.stage === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                     t.stage === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                     t.stage === 'NEEDS_REVISION' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
      });
    });

    // Essays Activity
    essays.forEach((e: any) => {
      feed.push({
        id: e.id,
        category: 'ESSAY',
        title: `Essay: ${e.title}`,
        description: `Status: ${e.status} | Versions: ${e.versions?.length || 1} draft(s)`,
        timestamp: e.updatedAt || 'Recent Essay',
        statusBadge: e.status || 'Drafting',
        statusColor: 'bg-purple-100 text-purple-800'
      });
    });

    // Documents Vault
    documents.forEach((d: any) => {
      feed.push({
        id: d.id,
        category: 'DOCUMENT',
        title: `Document: ${d.name}`,
        description: `Verification Status: ${d.status || 'Uploaded'}`,
        timestamp: d.uploadedAt || 'Uploaded',
        statusBadge: d.status || 'Uploaded',
        statusColor: d.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
      });
    });

    // Enrolled Batches
    studentBatches.forEach((b: any) => {
      feed.push({
        id: 'batch_feed_' + b.id,
        category: 'COUNSELOR_LOG',
        title: `Enrolled in Batch: ${b.name}`,
        description: `Subject: ${b.subject || 'Cohort'} • Schedule: ${b.scheduleDayTime || 'Weekly live classes'} • Mentors: ${(b.mentors || []).join(', ') || 'Faculty'}`,
        timestamp: 'Active Cohort',
        performedBy: (b.mentors && b.mentors[0]) || 'Academic Coordinator',
        statusBadge: b.status || 'Active Batch',
        statusColor: 'bg-indigo-100 text-indigo-800'
      });
    });

    // Shortlisted Universities
    shortlist.forEach((u: any) => {
      feed.push({
        id: 'uni_feed_' + (u.id || u.name),
        category: 'COUNSELOR_LOG',
        title: `University Shortlisted: ${u.name}`,
        description: `Admissions Tier: ${u.category || 'Target'} • Major: ${u.major || 'Program'} • Round: ${u.round || 'RD'}${u.deadline ? ` • Deadline: ${u.deadline}` : ''}`,
        timestamp: u.deadline ? `Deadline ${u.deadline}` : 'Shortlisted',
        performedBy: student?.counselor || 'Admissions Strategy',
        statusBadge: u.category || 'Target',
        statusColor: u.category === 'Reach' ? 'bg-purple-100 text-purple-800' : u.category === 'Target' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
      });
    });

    return feed;
  }, [operationalLogs, profileActivities, studentEvents, tasks, essays, documents, studentBatches, shortlist, student]);

  const filteredActivities = consolidatedActivities.filter(a => {
    if (activityFilter === 'ALL') return true;
    if (activityFilter === 'COUNSELOR_LOG') return a.category === 'COUNSELOR_LOG';
    return a.category === activityFilter;
  });

  // --- 4. GENERATE REAL-TIME NOTIFICATIONS ---
  const generatedNotifications: NotificationItem[] = useMemo(() => {
    const list: NotificationItem[] = [];

    // Helper: Filter out ANY profile-related modification logs
    const isProfileChangeLog = (item: any) => {
      const text = `${item.activityType || ''} ${item.description || ''} ${item.title || ''}`.toLowerCase();
      return text.includes('profile') || 
             text.includes('contact') || 
             text.includes('phone') || 
             text.includes('email') || 
             text.includes('personal') || 
             text.includes('gpa') || 
             text.includes('curriculum') || 
             text.includes('intake') || 
             text.includes('extracurricular');
    };

    // 1. APPLICATION DEADLINES & LESS DAYS IN APPLICATION
    shortlist.forEach((uni: any, idx: number) => {
      if (uni.deadline) {
        const deadlineDate = new Date(uni.deadline);
        const diffDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
        if (!isNaN(diffDays) && diffDays >= 0 && diffDays <= 60) {
          list.push({
            id: 'notif_deadline_' + (uni.id || idx),
            title: `Application Deadline Alert: ${uni.name} (${diffDays === 0 ? 'Due Today!' : `${diffDays} days left`})`,
            message: `Only ${diffDays} day(s) left until the ${uni.round || 'Application'} deadline for ${uni.name} on ${uni.deadline}. Ensure all essays, transcripts, and required documents are finalized!`,
            type: diffDays <= 7 ? 'URGENT' : 'WARNING',
            category: 'DEADLINE',
            timestamp: diffDays === 0 ? 'Due Today!' : `${diffDays}d left`,
            read: readNotificationIds.includes('notif_deadline_' + (uni.id || idx)),
            link: '/student/universities',
            actionText: 'Review University Application',
            university: uni,
            deadlineInfo: {
              uni,
              daysLeft: diffDays,
              deadline: uni.deadline,
              round: uni.round
            },
            performedBy: student?.counselor || 'Admissions Strategy'
          });
        }
      }
    });

    // 2. ASSIGNED TASKS / ASKS (Revision required, overdue, due soon, newly assigned)
    tasks.forEach((t: any) => {
      if (t.stage === 'NEEDS_REVISION') {
        list.push({
          id: 'notif_task_rev_' + t.id,
          title: `Task Revision Required: ${t.name}`,
          message: `Your counselor requested revision on "${t.name}". Please open the task manager to review feedback notes, revise your deliverable, and resubmit.\n\nDescription: ${t.description || 'No description provided'}\nDue Date: ${t.dueDate || 'Immediate action'}\nCategory: ${t.category || 'Roadmap'}`,
          type: 'URGENT',
          category: 'TASK',
          timestamp: 'Revision Needed',
          read: readNotificationIds.includes('notif_task_rev_' + t.id),
          link: '/student/tasks',
          actionText: 'Open in Task Manager',
          task: t,
          performedBy: t.assignedBy || student?.counselor || 'Admissions Counselor'
        });
      } else if (t.dueDate) {
        const d = new Date(t.dueDate);
        const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 3600 * 24));
        if (diffDays < 0 && t.stage !== 'COMPLETED') {
          list.push({
            id: 'notif_task_overdue_' + t.id,
            title: `Overdue Task: ${t.name}`,
            message: `Task "${t.name}" was scheduled for ${t.dueDate} (${Math.abs(diffDays)} day(s) overdue). Please complete and submit your deliverable as soon as possible.`,
            type: 'URGENT',
            category: 'TASK',
            timestamp: `Overdue (${Math.abs(diffDays)}d)`,
            read: readNotificationIds.includes('notif_task_overdue_' + t.id),
            link: '/student/tasks',
            actionText: 'Open in Task Manager',
            task: t,
            performedBy: t.assignedBy || student?.counselor || 'Admissions Counselor'
          });
        } else if (diffDays >= 0 && diffDays <= 7 && t.stage !== 'COMPLETED') {
          list.push({
            id: 'notif_task_due_' + t.id,
            title: diffDays === 0 ? `Task Due Today: ${t.name}` : `Task Due Soon: ${t.name}`,
            message: `Task "${t.name}" is scheduled for completion on ${t.dueDate} (${diffDays === 0 ? 'Due Today!' : `Due in ${diffDays} day(s)`}). Category: ${t.category || 'Roadmap'}. Complete and submit on time.`,
            type: diffDays <= 2 ? 'URGENT' : 'WARNING',
            category: 'TASK',
            timestamp: diffDays === 0 ? 'Today' : `Due in ${diffDays}d`,
            read: readNotificationIds.includes('notif_task_due_' + t.id),
            link: '/student/tasks',
            actionText: 'Open in Task Manager',
            task: t,
            performedBy: t.assignedBy || student?.counselor || 'Admissions Counselor'
          });
        } else if (t.stage === 'TO_DO' || t.stage === 'IN_PROGRESS') {
          list.push({
            id: 'notif_task_active_' + t.id,
            title: `Assigned Task: ${t.name}`,
            message: `Deliverable "${t.name}" is currently active under ${t.category || 'Roadmap'}. Description: ${t.description || 'Deliverable assigned by your counselor.'}${t.dueDate ? ` | Target Date: ${t.dueDate}` : ''}`,
            type: 'INFO',
            category: 'TASK',
            timestamp: 'Active Task',
            read: readNotificationIds.includes('notif_task_active_' + t.id),
            link: '/student/tasks',
            actionText: 'Open in Task Manager',
            task: t,
            performedBy: t.assignedBy || student?.counselor || 'Admissions Counselor'
          });
        }
      } else if (t.stage === 'TO_DO' || t.stage === 'IN_PROGRESS') {
        list.push({
          id: 'notif_task_open_' + t.id,
          title: `Assigned Task: ${t.name}`,
          message: `Deliverable "${t.name}" is assigned to you under ${t.category || 'Roadmap'}. Description: ${t.description || 'Deliverable assigned by your counselor.'}`,
          type: 'INFO',
          category: 'TASK',
          timestamp: 'To Do',
          read: readNotificationIds.includes('notif_task_open_' + t.id),
          link: '/student/tasks',
          actionText: 'Open in Task Manager',
          task: t,
          performedBy: t.assignedBy || student?.counselor || 'Admissions Counselor'
        });
      }
    });

    // 3. BATCH ADDITIONS / NEW BATCH ENROLLED
    studentBatches.forEach((b: any) => {
      list.push({
        id: 'notif_batch_' + b.id,
        title: `New Batch Enrolled: ${b.name}`,
        message: `You have been enrolled into cohort batch "${b.name}" (${b.subject || 'Cohort Program'}).\nSchedule: ${b.scheduleDayTime || 'Weekly live sessions'}\nAssigned Mentors: ${(b.mentors || []).join(', ') || 'Faculty'}`,
        type: 'INFO',
        category: 'BATCH',
        timestamp: 'Enrolled',
        read: readNotificationIds.includes('notif_batch_' + b.id),
        link: '/student/schedules',
        actionText: 'View Batch Schedule',
        batch: b,
        performedBy: (b.mentors && b.mentors[0]) || 'Academic Team'
      });
    });

    // 4. LECTURE SCHEDULE & UPCOMING SESSIONS
    studentEvents.forEach((evt: any) => {
      list.push({
        id: 'notif_evt_' + evt.id,
        title: `Lecture Schedule: ${evt.title}`,
        message: `Scheduled Lecture: "${evt.title}"\nDate: ${evt.date || evt.day || 'Upcoming'}\nTime: ${evt.time || 'TBD'}\nInstructor: ${evt.host || 'Advisor'}\nFormat: ${evt.stream || '1-on-1 Class'}${evt.location ? `\nMeeting Link: ${evt.location}` : ''}`,
        type: 'SYSTEM',
        category: 'LECTURE',
        timestamp: evt.date || 'Scheduled',
        read: readNotificationIds.includes('notif_evt_' + evt.id),
        link: '/student/schedules',
        actionText: 'Open Schedule & Join Lecture',
        meeting: evt,
        performedBy: evt.host || 'Counselor / Faculty'
      });
    });

    // 5. SHORTLISTED UNIVERSITIES
    shortlist.slice(0, 3).forEach((uni: any, idx: number) => {
      list.push({
        id: 'notif_uni_' + (uni.id || idx),
        title: `University Shortlist: ${uni.name}`,
        message: `${uni.name} is on your ${uni.category || 'Target'} college shortlist for ${uni.major || 'Degree Program'}. Round: ${uni.round || 'Regular Decision'}. Deadline: ${uni.deadline || 'TBD'}. Click below to verify required application documents and submission portals.`,
        type: 'INFO',
        category: 'UNIVERSITY',
        timestamp: `${uni.category || 'Target'} List`,
        read: readNotificationIds.includes('notif_uni_' + (uni.id || idx)),
        link: '/student/universities',
        actionText: 'Open Universities List',
        university: uni,
        performedBy: student?.counselor || 'Lead Counselor'
      });
    });

    // 6. COUNSELOR & MENTOR GUIDANCE NOTES (STRICTLY NO PROFILE MODIFICATION LOGS)
    operationalLogs
      .filter((log: any) => !isProfileChangeLog(log))
      .slice(0, 4)
      .forEach((log: any) => {
        list.push({
          id: 'notif_log_' + log.id,
          title: `Counselor Guidance: ${log.activityType || 'Advisory Note'}`,
          message: log.description || 'Your counselor recorded new guidance and action items on your admissions timeline.',
          type: 'COUNSELOR',
          category: 'NOTE',
          timestamp: log.timestamp || 'Recently',
          read: readNotificationIds.includes('notif_log_' + log.id),
          log: log,
          performedBy: log.performedBy || student?.counselor || 'Lead Counselor'
        });
      });

    // 7. ESSAY REVIEW UPDATES
    essays.forEach((es: any) => {
      if (es.status === 'Needs Revision' || es.status === 'Approved') {
        list.push({
          id: 'notif_essay_' + es.id,
          title: `Essay Review: ${es.university || es.title || 'College Essay'}`,
          message: `Your draft "${es.title || es.university}" has been updated to "${es.status}". Open Essay Vault to examine detailed paragraph annotations and counselor feedback.`,
          type: es.status === 'Needs Revision' ? 'URGENT' : 'SUCCESS',
          category: 'ESSAY',
          timestamp: es.status,
          read: readNotificationIds.includes('notif_essay_' + es.id),
          link: '/student/essays',
          actionText: 'Open Essay Vault',
          essay: es,
          performedBy: student?.counselor || 'Essay Reviewer'
        });
      }
    });

    // 8. DOCUMENT VERIFICATION UPDATES
    documents.forEach((dc: any) => {
      if (dc.status === 'VERIFIED' || dc.status === 'REJECTED') {
        list.push({
          id: 'notif_doc_' + dc.id,
          title: `Document ${dc.status === 'VERIFIED' ? 'Verified' : 'Action Needed'}: ${dc.name}`,
          message: `Your uploaded document "${dc.name}" (${dc.category || 'General'}) is marked as ${dc.status}. ${dc.feedback ? `Counselor Notes: ${dc.feedback}` : ''}`,
          type: dc.status === 'VERIFIED' ? 'SUCCESS' : 'URGENT',
          category: 'DOCUMENT',
          timestamp: dc.status,
          read: readNotificationIds.includes('notif_doc_' + dc.id),
          link: '/student/vault',
          actionText: 'Open Document Vault',
          doc: dc,
          performedBy: student?.counselor || 'Verification Officer'
        });
      }
    });

    return list;
  }, [tasks, operationalLogs, studentEvents, essays, documents, shortlist, studentBatches, readNotificationIds, now, student]);

  const filteredNotifications = generatedNotifications.filter(n => {
    if (notificationFilter === 'UNREAD') return !n.read;
    if (notificationFilter === 'URGENT') return n.type === 'URGENT';
    return true;
  });

  const unreadCount = generatedNotifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setReadNotificationIds(generatedNotifications.map(n => n.id));
  };

  const toggleRead = (id: string) => {
    if (readNotificationIds.includes(id)) {
      setReadNotificationIds(readNotificationIds.filter(i => i !== id));
    } else {
      setReadNotificationIds([...readNotificationIds, id]);
    }
  };

  const handleOpenNotificationDetails = (n: NotificationItem) => {
    if (!readNotificationIds.includes(n.id)) {
      setReadNotificationIds(prev => [...prev, n.id]);
    }
    setSelectedNotification(n);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Welcome back, {student?.name || 'Student'}! 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track your tasks, counselor meetings, essay reviews, document verifications, and application timeline.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block space-y-1">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Assigned Mentorship Team</span>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md font-semibold text-[11px] flex items-center gap-1" title="Lead Counselor">
                <span>🎓</span> <strong className="font-bold">{student?.counselor || 'Counselor Unassigned'}</strong>
              </span>
              {(student?.researchMentor || (student as any)?.researchGuide) && (
                <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md font-semibold text-[11px] flex items-center gap-1" title="Research Guide">
                  <span>🔬</span> <strong className="font-bold">{student?.researchMentor || (student as any)?.researchGuide}</strong>
                </span>
              )}
              {(student?.satVerbalMentor || student?.satMathMentor || student?.satMentor) && (
                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md font-semibold text-[11px] flex items-center gap-1" title="SAT Faculty">
                  <span>📐</span> <strong className="font-bold">{student?.satVerbalMentor && student?.satMathMentor ? `${student.satVerbalMentor} (V) & ${student.satMathMentor} (M)` : student?.satVerbalMentor || student?.satMathMentor || student?.satMentor}</strong>
                </span>
              )}
            </div>
          </div>
          <div className="w-11 h-11 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-bold border border-indigo-100 shadow-2xs">
            {student?.name ? student.name.charAt(0) : 'S'}
          </div>
        </div>
      </div>

      {/* NOTIFICATION CENTER AT TOP OF DASHBOARD */}
      <Card className="border-indigo-100/80 shadow-sm bg-gradient-to-br from-indigo-50/40 via-white to-white overflow-hidden">
        <CardHeader className="pb-3 border-b border-indigo-100/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  Notifications & Counselor Action Items
                  {unreadCount > 0 && (
                    <span className="bg-rose-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-2xs">
                      {unreadCount} Unread
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  Real-time alerts, document verification updates, upcoming meetings, and counselor assignments.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2">
              <div className="flex gap-1 bg-slate-100/80 p-1 rounded-xl">
                {(['ALL', 'UNREAD', 'URGENT'] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setNotificationFilter(filter)}
                    className={cn(
                      "px-3 py-1 text-xs font-bold rounded-lg transition-all",
                      notificationFilter === filter 
                        ? "bg-white text-indigo-700 shadow-2xs" 
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {filter === 'ALL' ? 'All' : filter === 'UNREAD' ? 'Unread' : 'Urgent'}
                  </button>
                ))}
              </div>

              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={markAllAsRead} 
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 h-8 px-2.5"
                >
                  Mark all read
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs italic bg-white/50 rounded-xl border border-dashed border-slate-200">
              No notifications matching your filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredNotifications.map(n => (
                <div 
                  key={n.id} 
                  onClick={() => handleOpenNotificationDetails(n)}
                  className={cn(
                    "p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 relative hover:shadow-md group text-left",
                    n.read 
                      ? "bg-slate-50/70 border-slate-200/80 opacity-85 hover:opacity-100" 
                      : "bg-white border-indigo-200 shadow-2xs hover:border-indigo-400 ring-1 ring-indigo-500/10"
                  )}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className={cn(
                      "font-bold text-[10px] uppercase px-2 py-0.5 rounded-full tracking-wider",
                      n.category === 'DEADLINE' ? "bg-rose-100 text-rose-800 border border-rose-200" :
                      n.category === 'BATCH' ? "bg-indigo-100 text-indigo-800 border border-indigo-200" :
                      n.category === 'LECTURE' ? "bg-blue-100 text-blue-800 border border-blue-200" :
                      n.category === 'UNIVERSITY' ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                      n.category === 'TASK' ? (n.type === 'URGENT' ? "bg-rose-100 text-rose-800 border border-rose-200" : "bg-amber-100 text-amber-800 border border-amber-200") :
                      n.category === 'NOTE' ? "bg-purple-100 text-purple-800 border border-purple-200" :
                      n.type === 'URGENT' ? "bg-rose-100 text-rose-800" :
                      n.type === 'SUCCESS' ? "bg-emerald-100 text-emerald-800" :
                      n.type === 'COUNSELOR' ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                    )}>
                      {n.category === 'DEADLINE' ? 'Deadline Alert' :
                       n.category === 'BATCH' ? 'Batch Enrolled' :
                       n.category === 'LECTURE' ? 'Lecture Schedule' :
                       n.category === 'UNIVERSITY' ? 'Shortlist' :
                       n.category === 'TASK' ? (n.type === 'URGENT' ? 'Task Action' : 'Assigned Task') :
                       n.category === 'NOTE' ? 'Guidance Note' : n.type}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{n.timestamp}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center justify-between gap-2 group-hover:text-indigo-600 transition-colors">
                    <span className="truncate">{n.title}</span>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />}
                  </h4>
                  <p className="text-xs text-slate-600 leading-snug line-clamp-2">{n.message}</p>
                  <div className="pt-1.5 flex items-center justify-between text-[11px] text-indigo-600 font-bold border-t border-slate-100">
                    <span className="flex items-center gap-1 group-hover:underline">Click to view all details</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* TOP ROW STATS & CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Task Breakdown Chart */}
        <Card className="flex flex-col border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-indigo-600" /> Task Stage Breakdown
            </CardTitle>
            <CardDescription className="text-xs">Active task distribution by stage</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[220px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={taskData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {taskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Deadline Countdown Chart */}
        <Card className="flex flex-col border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" /> Application Countdown
            </CardTitle>
            <CardDescription className="text-xs">Days remaining until nearest milestone</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[220px] flex flex-col items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart 
                cx="50%" 
                cy="50%" 
                innerRadius="70%" 
                outerRadius="100%" 
                barSize={18} 
                data={countdownData}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar
                  background
                  dataKey="value"
                  cornerRadius={10}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center mt-6 text-center px-4">
              <span className="text-3xl font-extrabold text-slate-900">{daysLeft}</span>
              <span className="text-xs text-slate-500 font-medium">Days Left</span>
              <span className="text-[11px] text-blue-600 font-bold truncate max-w-[180px] mt-0.5">{targetLabel}</span>
            </div>
          </CardContent>
        </Card>

        {/* Summary Quick Metrics */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Application Summary
            </CardTitle>
            <CardDescription className="text-xs">Quick status overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-1">
            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-600 font-medium text-xs flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" /> Current Batch
              </span>
              <span className="font-bold text-xs text-slate-900">{currentBatch}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-600 font-medium text-xs flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5 text-slate-400" /> Tasks
              </span>
              <span className="font-bold text-xs text-slate-900">{tasks.length} Total ({completedTasks} Done)</span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-600 font-medium text-xs flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-slate-400" /> Shortlisted Univs
              </span>
              <span className="font-bold text-xs text-slate-900">{shortlist.length} Universities</span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-600 font-medium text-xs flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" /> Essays
              </span>
              <span className="font-bold text-xs text-emerald-600">{essays.length} Tracked</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ACTIVITIES FEED STREAM (Full Width) */}
      <Card className="border-slate-200 shadow-sm flex flex-col">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" /> Student Activities & Counselor Updates
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time activity trail covering meetings, task stages, essay progress, document status, and counselor logs.
              </CardDescription>
            </div>

            {/* Activity Filter Buttons */}
            <div className="flex flex-wrap gap-1">
              {(['ALL', 'MEETING', 'TASK', 'ESSAY', 'COUNSELOR_LOG'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setActivityFilter(f)}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors uppercase tracking-wider",
                    activityFilter === f ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {f === 'COUNSELOR_LOG' ? 'Counselor' : f}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 max-h-[550px] overflow-y-auto">
          {filteredActivities.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs italic">
              No recorded activities found for this category.
            </div>
          ) : (
            <div className="relative pl-6 space-y-5 border-l-2 border-indigo-100 ml-2">
              {filteredActivities.map(act => (
                <div key={act.id} className="relative group">
                  {/* Icon indicator bullet */}
                  <span className={cn(
                    "absolute -left-[31px] w-3.5 h-3.5 rounded-full ring-4 ring-white flex items-center justify-center",
                    act.category === 'MEETING' ? 'bg-blue-600' :
                    act.category === 'TASK' ? 'bg-indigo-600' :
                    act.category === 'ESSAY' ? 'bg-purple-600' :
                    act.category === 'DOCUMENT' ? 'bg-emerald-600' : 'bg-amber-600'
                  )} />

                  <div className="bg-slate-50 hover:bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm transition-all space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider",
                          act.statusColor || "bg-slate-200 text-slate-800"
                        )}>
                          {act.category.replace('_', ' ')}
                        </span>
                        {act.statusBadge && (
                          <span className="text-[10px] font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700">
                            {act.statusBadge}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-slate-400">{act.timestamp}</span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900">{act.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{act.description}</p>

                    {act.performedBy && (
                      <p className="text-[10px] text-slate-400 pt-1">
                        Action by: <span className="font-semibold text-slate-600">{act.performedBy}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Details Modal */}
      <NotificationDetailsModal
        isOpen={!!selectedNotification}
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
        onToggleRead={(id) => toggleRead(id)}
      />
    </div>
  );
}
