import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar, Clock, User, Users, CheckCircle2, AlertCircle, FileText, 
  Download, Filter, Search, X, ChevronDown, ChevronUp, ExternalLink, 
  RefreshCw, Layers, CheckSquare, Sparkles, Printer, FileSpreadsheet, 
  Eye, BookOpen, GraduationCap, Shield, HelpCircle, ArrowUpDown,
  Check, CalendarDays, ListFilter, SlidersHorizontal, BarChart3,
  BookmarkCheck, MessageSquare, ClipboardCheck, ArrowRight, Lock
} from 'lucide-react';
import { useDatabase, EventItem } from '@/context/DatabaseContext';
import { cn } from '@/lib/utils';
import { Student, StaffMember, MeetingMOM, MeetingTask, OperationalLog } from '@/types';
import { isUserAdmin, canStaffAccessAllStudents, isStudentAssignedToStaff, canStaffAccessReports, isStaffCounselor, isStaffMentorOrFaculty } from '@/lib/staffPermissions';

// RFC-4180 compliant CSV export helper
function exportToCSV(filename: string, headers: string[], rows: (string | number | undefined | null)[][]) {
  const escapeCell = (cell: any) => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(','))
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Unified Meeting Row structure for both events & batch class sessions
interface UnifiedMeetingReportItem {
  id: string;
  source: 'EVENT' | 'BATCH_SESSION';
  title: string;
  stream: string;
  date: string;
  time: string;
  duration?: string;
  status: 'Completed' | 'Upcoming' | 'In Progress' | 'Canceled';
  meetingOwnerName: string;
  meetingOwnerRole: string;
  studentId: string;
  studentName: string;
  allStudentNames: string[];
  batchName?: string;
  meetingLink?: string;
  recordingUrl?: string;
  generalNotes?: string;
  moms: MeetingMOM[];
  tasks: MeetingTask[];
  rawDate: Date;
}

// Unified Activity Item structure
interface UnifiedActivityReportItem {
  id: string;
  timestamp: string;
  dateObj: Date;
  performedBy: string;
  role: string;
  studentId: string;
  studentName: string;
  category: 'MEETING_MOM' | 'POST_MEETING_TASK' | 'TASK' | 'ESSAY' | 'DOCUMENT' | 'GUIDANCE' | 'REASSIGNMENT' | 'SHORTLIST' | 'OTHER';
  activityType: string;
  description: string;
  details?: string;
  link?: string;
}

export default function TeamReports() {
  const { events, students, staff, batches, currentUser, permissionsMatrix } = useDatabase();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'MEETINGS' | 'ACTIVITIES'>('MEETINGS');

  // Permission scoping and RBAC from permissionsMatrix
  const rolePerms = permissionsMatrix ? permissionsMatrix[currentUser?.role || ''] : undefined;
  const reportsCategory = rolePerms?.find(c => c.id === 'reports');
  const viewMeetingsItem = reportsCategory?.items.find(i => i.id === 'view_meeting_reports');
  const viewActivitiesItem = reportsCategory?.items.find(i => i.id === 'view_activity_audit');
  const exportCsvItem = reportsCategory?.items.find(i => i.id === 'export_reports_csv');

  const isAdmin = isUserAdmin(currentUser);
  const isCounselor = isStaffCounselor(currentUser);
  const isMentorOrFaculty = isStaffMentorOrFaculty(currentUser);
  const hasReportsAccess = canStaffAccessReports(currentUser, permissionsMatrix);

  // Research mentors, SAT educators & faculty strictly have NO access to reports at all
  const canViewMeetings = hasReportsAccess && (isAdmin || (viewMeetingsItem ? viewMeetingsItem.enabled : true));
  const canViewActivities = hasReportsAccess && (isAdmin || (viewActivitiesItem ? viewActivitiesItem.enabled : true));
  const canExportCsv = hasReportsAccess && (isAdmin || (exportCsvItem ? exportCsvItem.enabled : false));

  const meetingsScope = viewMeetingsItem?.scope || 'Assigned Scope';
  const activitiesScope = viewActivitiesItem?.scope || 'Assigned Scope';

  // Counselors MUST have access ONLY for their assigned students' activity and meetings
  const hasGlobalMeetingScope = !isCounselor && (isAdmin || meetingsScope === 'Global Scope' || canStaffAccessAllStudents(currentUser, permissionsMatrix));
  const hasGlobalActivityScope = !isCounselor && (isAdmin || activitiesScope === 'Global Scope' || canStaffAccessAllStudents(currentUser, permissionsMatrix));
  const hasGlobalScope = hasGlobalMeetingScope || hasGlobalActivityScope;

  // Accessible students list for dropdown filters
  const accessibleStudents = (isAdmin || hasGlobalScope)
    ? students
    : students.filter(s => isStudentAssignedToStaff(s, currentUser, permissionsMatrix));

  // Auto switch tab if one is restricted
  React.useEffect(() => {
    if (!canViewMeetings && canViewActivities && activeTab === 'MEETINGS') {
      setActiveTab('ACTIVITIES');
    } else if (canViewMeetings && !canViewActivities && activeTab === 'ACTIVITIES') {
      setActiveTab('MEETINGS');
    }
  }, [canViewMeetings, canViewActivities, activeTab]);

  // -------------------------------------------------------------
  // TAB 1: MEETINGS REPORT STATE & FILTERS
  // -------------------------------------------------------------
  const [meetingSearch, setMeetingSearch] = useState('');
  const [meetingOwnerFilter, setMeetingOwnerFilter] = useState('ALL');
  const [meetingRoleFilter, setMeetingRoleFilter] = useState('ALL');
  const [meetingStudentFilter, setMeetingStudentFilter] = useState('ALL');
  const [meetingStreamFilter, setMeetingStreamFilter] = useState('ALL');
  const [meetingStatusFilter, setMeetingStatusFilter] = useState('ALL');
  const [meetingDateFilter, setMeetingDateFilter] = useState<'ALL' | 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'PAST' | 'UPCOMING'>('ALL');
  const [hasTasksFilter, setHasTasksFilter] = useState<'ALL' | 'HAS_TASKS' | 'NO_TASKS'>('ALL');
  const [hasMomsFilter, setHasMomsFilter] = useState<'ALL' | 'HAS_MOMS' | 'NO_MOMS'>('ALL');
  const [expandedMeetingIds, setExpandedMeetingIds] = useState<string[]>([]);
  const [inspectingMeeting, setInspectingMeeting] = useState<UnifiedMeetingReportItem | null>(null);

  // -------------------------------------------------------------
  // TAB 2: STAFF ACTIVITIES REPORT STATE & FILTERS
  // -------------------------------------------------------------
  const [activitySearch, setActivitySearch] = useState('');
  const [activityStaffFilter, setActivityStaffFilter] = useState('ALL');
  const [activityRoleFilter, setActivityRoleFilter] = useState('ALL');
  const [activityTypeFilter, setActivityTypeFilter] = useState('ALL');
  const [activityStudentFilter, setActivityStudentFilter] = useState('ALL');
  const [activityDateFilter, setActivityDateFilter] = useState<'ALL' | 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH'>('ALL');

  // -------------------------------------------------------------
  // 1. COMPILE UNIFIED MEETING DATA
  // -------------------------------------------------------------
  const allMeetings = useMemo<UnifiedMeetingReportItem[]>(() => {
    const list: UnifiedMeetingReportItem[] = [];

    // 1A. Pull from Events
    (events || []).forEach(evt => {
      // Find student info
      let student = students.find(s => s.id === evt.studentId);
      if (!student && evt.students && typeof evt.students === 'string') {
        student = students.find(s => s.name?.toLowerCase().includes(evt.students.toLowerCase()));
      }

      // Determine date & status
      const dateStr = evt.date || (evt.day && evt.day.match(/^\d{4}-\d{2}-\d{2}$/) ? evt.day : '2026-08-15');
      const rawDate = new Date(dateStr);

      // Determine meeting owner
      const hostName = evt.host || 'Staff Member';
      const staffMatch = staff.find(st => st.name?.toLowerCase() === hostName.toLowerCase());
      const hostRole = staffMatch ? staffMatch.role : (evt.stream?.includes('SAT') ? 'SAT_FACULTY' : 'COUNSELOR');

      // Status
      let computedStatus: 'Completed' | 'Upcoming' | 'In Progress' | 'Canceled' = 'Completed';
      if (evt.status === 'Cancelled' || (evt.status as any) === 'Canceled') {
        computedStatus = 'Canceled';
      } else if (evt.status === 'Completed') {
        computedStatus = 'Completed';
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (!isNaN(rawDate.getTime()) && rawDate.getTime() > today.getTime()) {
          computedStatus = 'Upcoming';
        } else {
          computedStatus = 'Completed';
        }
      }

      const tasksList: MeetingTask[] = evt.tasks || [];
      const momsList: MeetingMOM[] = evt.moms || [];

      list.push({
        id: evt.id || `evt_${Math.random()}`,
        source: 'EVENT',
        title: evt.title || 'Counseling Session',
        stream: evt.stream || 'Counselling (1-on-1)',
        date: dateStr,
        time: evt.time || '17:00 - 18:00',
        duration: evt.duration || '60 mins',
        status: computedStatus,
        meetingOwnerName: hostName,
        meetingOwnerRole: hostRole,
        studentId: student ? student.id : (evt.studentId || 'N/A'),
        studentName: student ? student.name : (evt.students || 'Assigned Student'),
        allStudentNames: student ? [student.name] : (evt.students ? [evt.students] : ['Students']),
        batchName: evt.batch || undefined,
        meetingLink: evt.location?.startsWith('http') ? evt.location : undefined,
        generalNotes: evt.notes,
        moms: momsList,
        tasks: tasksList,
        rawDate: isNaN(rawDate.getTime()) ? new Date() : rawDate
      });
    });

    // 1B. Pull from Batches (Master Cohorts and Sub-Batches)
    (batches || []).forEach(batch => {
      const batchMentors = batch.mentors || ['Staff Member'];
      const primaryMentor = batchMentors[0] || 'Staff Mentor';
      const staffMatch = staff.find(st => st.name?.toLowerCase() === primaryMentor.toLowerCase());
      const mentorRole = staffMatch ? staffMatch.role : (batch.subject === 'SAT' ? 'SAT_FACULTY' : (batch.subject === 'Research' ? 'RESEARCH_GUIDE' : 'COUNSELOR'));

      const enrolledStudents = students.filter(s => (batch.students || []).includes(s.id));
      const studentNames = enrolledStudents.map(s => s.name);

      (batch.sessions || []).forEach(sess => {
        const dateStr = sess.date || '2026-08-01';
        const rawDate = new Date(dateStr);
        const isCompleted = sess.status === 'Completed';

        // Check if there is already a matching event with this title & date to avoid duplication
        const duplicate = list.some(m => m.title === sess.title && m.date === dateStr);
        if (!duplicate) {
          const sessionNotes = sess.notes || sess.topic || '';
          const mockMom: MeetingMOM[] = sessionNotes ? [{
            id: `MOM_SESS_${sess.id}`,
            authorName: primaryMentor,
            authorRole: mentorRole,
            date: dateStr,
            keyPoints: `Class Topic: ${sess.topic || sess.title}. Notes: ${sessionNotes}`,
            studentProgress: `Cohort Attendance: ${(sess.joinedStudentIds || []).length} / ${(batch.students || []).length} students present.`,
            observations: 'Group lecture format with live interactive Q&A.',
            nextSteps: 'Complete assigned module homework and session exercises.'
          }] : [];

          list.push({
            id: `BATCH_${batch.id}_${sess.id}`,
            source: 'BATCH_SESSION',
            title: sess.title || `${batch.name} - Session ${sess.sessionNumber}`,
            stream: batch.subject || batch.type || 'Cohort Class',
            date: dateStr,
            time: sess.time || '18:00 - 19:30',
            duration: '90 mins',
            status: isCompleted ? 'Completed' : 'Upcoming',
            meetingOwnerName: primaryMentor,
            meetingOwnerRole: mentorRole,
            studentId: enrolledStudents[0]?.id || 'BATCH',
            studentName: studentNames.length > 0 ? (studentNames.length > 2 ? `${studentNames[0]}, ${studentNames[1]} +${studentNames.length - 2} more` : studentNames.join(', ')) : `${(batch.students || []).length} Students`,
            allStudentNames: studentNames.length > 0 ? studentNames : [`${(batch.students || []).length} Students`],
            batchName: batch.name,
            meetingLink: sess.meetingLink || batch.meetingLink,
            recordingUrl: sess.recordingUrl,
            generalNotes: sessionNotes,
            moms: mockMom,
            tasks: [],
            rawDate: isNaN(rawDate.getTime()) ? new Date() : rawDate
          });
        }
      });
    });

    // Sort descending by date
    return list.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
  }, [events, batches, students, staff]);

  // Scoped meetings if staff has restricted scope
  const scopedMeetings = useMemo(() => {
    if (hasGlobalMeetingScope) return allMeetings;
    return allMeetings.filter(m => {
      if (m.meetingOwnerName.toLowerCase() === currentUser.name?.toLowerCase()) return true;
      const studentMatch = students.find(s => s.id === m.studentId);
      if (studentMatch && isStudentAssignedToStaff(studentMatch, currentUser, permissionsMatrix)) return true;
      return false;
    });
  }, [allMeetings, hasGlobalMeetingScope, currentUser, students, permissionsMatrix]);

  // Filtered meetings
  const filteredMeetings = useMemo(() => {
    return scopedMeetings.filter(m => {
      // 1. Search Query
      if (meetingSearch.trim()) {
        const q = meetingSearch.toLowerCase().trim();
        const matchesTitle = m.title.toLowerCase().includes(q);
        const matchesStudent = m.studentName.toLowerCase().includes(q) || m.allStudentNames.some(name => name.toLowerCase().includes(q));
        const matchesOwner = m.meetingOwnerName.toLowerCase().includes(q);
        const matchesBatch = m.batchName?.toLowerCase().includes(q) || false;
        const matchesMoms = m.moms.some(mom => 
          mom.keyPoints.toLowerCase().includes(q) || 
          mom.studentProgress?.toLowerCase().includes(q) || 
          mom.observations?.toLowerCase().includes(q) || 
          mom.nextSteps?.toLowerCase().includes(q)
        );
        const matchesTasks = m.tasks.some(t => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
        if (!matchesTitle && !matchesStudent && !matchesOwner && !matchesBatch && !matchesMoms && !matchesTasks) {
          return false;
        }
      }

      // 2. Meeting Owner
      if (meetingOwnerFilter !== 'ALL') {
        if (m.meetingOwnerName.toLowerCase() !== meetingOwnerFilter.toLowerCase()) return false;
      }

      // 3. Meeting Role
      if (meetingRoleFilter !== 'ALL') {
        if (m.meetingOwnerRole.toUpperCase() !== meetingRoleFilter.toUpperCase()) return false;
      }

      // 4. Student Filter
      if (meetingStudentFilter !== 'ALL') {
        if (m.studentId !== meetingStudentFilter && !m.allStudentNames.some(name => {
          const s = students.find(st => st.id === meetingStudentFilter);
          return s && s.name.toLowerCase() === name.toLowerCase();
        })) {
          return false;
        }
      }

      // 5. Stream Filter
      if (meetingStreamFilter !== 'ALL') {
        if (!m.stream.toLowerCase().includes(meetingStreamFilter.toLowerCase())) return false;
      }

      // 6. Status Filter
      if (meetingStatusFilter !== 'ALL') {
        if (m.status.toLowerCase() !== meetingStatusFilter.toLowerCase()) return false;
      }

      // 7. Tasks Filter
      if (hasTasksFilter === 'HAS_TASKS' && m.tasks.length === 0) return false;
      if (hasTasksFilter === 'NO_TASKS' && m.tasks.length > 0) return false;

      // 8. MOMs Filter
      if (hasMomsFilter === 'HAS_MOMS' && m.moms.length === 0) return false;
      if (hasMomsFilter === 'NO_MOMS' && m.moms.length > 0) return false;

      // 9. Date Range Filter
      if (meetingDateFilter !== 'ALL') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const evtTime = m.rawDate.getTime();
        const diffDays = Math.floor((today.getTime() - evtTime) / (1000 * 60 * 60 * 24));

        if (meetingDateFilter === 'TODAY' && diffDays !== 0) return false;
        if (meetingDateFilter === 'LAST_7_DAYS' && (diffDays < 0 || diffDays > 7)) return false;
        if (meetingDateFilter === 'LAST_30_DAYS' && (diffDays < 0 || diffDays > 30)) return false;
        if (meetingDateFilter === 'THIS_MONTH') {
          if (m.rawDate.getMonth() !== today.getMonth() || m.rawDate.getFullYear() !== today.getFullYear()) return false;
        }
        if (meetingDateFilter === 'PAST' && m.status !== 'Completed') return false;
        if (meetingDateFilter === 'UPCOMING' && m.status !== 'Upcoming') return false;
      }

      return true;
    });
  }, [scopedMeetings, meetingSearch, meetingOwnerFilter, meetingRoleFilter, meetingStudentFilter, meetingStreamFilter, meetingStatusFilter, hasTasksFilter, hasMomsFilter, meetingDateFilter, students]);

  // -------------------------------------------------------------
  // 2. COMPILE UNIFIED STAFF ACTIVITIES DATA
  // -------------------------------------------------------------
  const allActivities = useMemo<UnifiedActivityReportItem[]>(() => {
    const list: UnifiedActivityReportItem[] = [];

    // Helper to parse date strings
    const parseTime = (dateStr: string): Date => {
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d;
      } catch (e) {}
      return new Date('2026-08-01');
    };

    // 2A. From student.operationalLogs (the canonical operational audit trail)
    students.forEach(student => {
      (student.operationalLogs || []).forEach(log => {
        let cat: UnifiedActivityReportItem['category'] = 'OTHER';
        const typeStr = (log.activityType || '').toLowerCase();
        if (typeStr.includes('mom') || typeStr.includes('meeting note')) cat = 'MEETING_MOM';
        else if (typeStr.includes('post-meeting') || typeStr.includes('post meeting')) cat = 'POST_MEETING_TASK';
        else if (typeStr.includes('task')) cat = 'TASK';
        else if (typeStr.includes('essay') || typeStr.includes('canvas')) cat = 'ESSAY';
        else if (typeStr.includes('document') || typeStr.includes('vault')) cat = 'DOCUMENT';
        else if (typeStr.includes('guidance') || typeStr.includes('note') || typeStr.includes('counselor guidance')) cat = 'GUIDANCE';
        else if (typeStr.includes('reassigned') || typeStr.includes('transfer') || typeStr.includes('counselor')) cat = 'REASSIGNMENT';
        else if (typeStr.includes('shortlist') || typeStr.includes('university')) cat = 'SHORTLIST';

        list.push({
          id: log.id || `log_${Math.random()}`,
          timestamp: log.timestamp || '2026-08-01 10:00 AM',
          dateObj: parseTime(log.timestamp),
          performedBy: log.performedBy || 'Staff Member',
          role: log.role || 'STAFF',
          studentId: student.id,
          studentName: student.name,
          category: cat,
          activityType: log.activityType || 'Operational Update',
          description: log.description || 'Record updated by staff',
          details: log.details,
          link: log.link
        });
      });

      // 2B. From Tasks assigned by staff
      (student.tasks || []).forEach(task => {
        if (task.assignedBy && !task.assignedBy.toLowerCase().includes('student')) {
          const authorParts = task.assignedBy.split('(');
          const name = authorParts[0].trim();
          const role = authorParts[1] ? authorParts[1].replace(')', '').trim() : 'MENTOR';

          list.push({
            id: `task_act_${task.id}`,
            timestamp: task.dueDate ? `Due: ${task.dueDate}` : 'Active Task',
            dateObj: parseTime(task.dueDate || '2026-08-15'),
            performedBy: name || 'Staff Member',
            role: role || 'MENTOR',
            studentId: student.id,
            studentName: student.name,
            category: 'TASK',
            activityType: 'Task / Milestone Assigned',
            description: `Assigned milestone task "${task.name}" (${task.category || 'General'}) with stage [${task.stage || 'TO_DO'}].`,
            details: task.description,
            link: task.externalUrl
          });
        }
      });

      // 2C. From Verified / Reviewed Documents
      (student.documents || []).forEach(doc => {
        if (doc.status?.toLowerCase() === 'verified' || doc.status?.toLowerCase() === 'rejected') {
          list.push({
            id: `doc_act_${doc.id}`,
            timestamp: doc.date || '2026-08-01',
            dateObj: parseTime(doc.date || '2026-08-01'),
            performedBy: student.counselor || 'Admissions Counselor',
            role: 'COUNSELOR',
            studentId: student.id,
            studentName: student.name,
            category: 'DOCUMENT',
            activityType: doc.status?.toLowerCase() === 'verified' ? 'Document Approved' : 'Document Revision Requested',
            description: `${doc.status === 'verified' ? 'Approved & verified' : 'Requested revision on'} official file: "${doc.name}" (${doc.category || doc.type || 'Records'}).`,
            details: doc.notes || (doc as any).feedback,
            link: doc.fileUrl
          });
        }
      });

      // 2D. From Essay Reviews
      (student.essays || []).forEach(essay => {
        if (essay.status === 'Under Review' || essay.status === 'Approved' || essay.status === 'Needs Revision') {
          list.push({
            id: `essay_act_${essay.id}`,
            timestamp: '2026-08-20',
            dateObj: parseTime('2026-08-20'),
            performedBy: essay.counselor || student.counselor || 'Admissions Counselor',
            role: 'COUNSELOR',
            studentId: student.id,
            studentName: student.name,
            category: 'ESSAY',
            activityType: 'Essay Evaluated',
            description: `Evaluated draft for "${essay.prompt?.substring(0, 60)}..." [Status: ${essay.status}]. Target: ${essay.university || 'Common App'}.`,
            details: (essay as any).feedback || `Current word count: ${essay.wordCount || 0} / ${essay.targetCount || 650}.`
          });
        }
      });
    });

    // 2E. Also synthesize MOM entries from events so staff meeting notes appear directly in the activity audit
    (events || []).forEach(evt => {
      (evt.moms || []).forEach(mom => {
        let student = students.find(s => s.id === evt.studentId);
        if (!student && evt.students) {
          student = students.find(s => s.name?.toLowerCase().includes(evt.students.toLowerCase()));
        }

        list.push({
          id: `mom_act_${mom.id}`,
          timestamp: mom.date || '2026-08-15',
          dateObj: parseTime(mom.date || '2026-08-15'),
          performedBy: mom.authorName || evt.host || 'Staff Member',
          role: mom.authorRole || 'COUNSELOR',
          studentId: student ? student.id : (evt.studentId || 'N/A'),
          studentName: student ? student.name : (evt.students || 'Student'),
          category: 'MEETING_MOM',
          activityType: 'Meeting Notes / MOM Logged',
          description: `Logged official Minutes of Meeting for session "${evt.title}": ${mom.keyPoints.substring(0, 100)}...`,
          details: `Observations: ${mom.observations || 'N/A'} | Next Steps: ${mom.nextSteps || 'N/A'} | Progress: ${mom.studentProgress || 'N/A'}`
        });
      });

      // Post meeting tasks
      (evt.tasks || []).forEach(task => {
        list.push({
          id: `evt_task_act_${task.id}`,
          timestamp: task.dateAssigned || '2026-08-15',
          dateObj: parseTime(task.dateAssigned || '2026-08-15'),
          performedBy: task.assignedBy || evt.host || 'Staff Member',
          role: 'STAFF',
          studentId: task.assignedToStudentId || 'N/A',
          studentName: task.assignedToStudentName || 'Student',
          category: 'POST_MEETING_TASK',
          activityType: 'Post-Meeting Task Assigned',
          description: `Assigned post-meeting action item "${task.title}" (Due: ${task.dueDate || 'TBD'}) after session "${evt.title}".`,
          details: task.description,
          link: task.externalUrl
        });
      });
    });

    // Deduplicate by ID
    const seen = new Set<string>();
    const unique = list.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    // Sort descending by date
    return unique.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
  }, [students, events]);

  // Scoped activities
  const scopedActivities = useMemo(() => {
    if (hasGlobalActivityScope) return allActivities;
    return allActivities.filter(a => {
      if (a.performedBy.toLowerCase() === currentUser.name?.toLowerCase()) return true;
      const studentMatch = students.find(s => s.id === a.studentId);
      if (studentMatch && isStudentAssignedToStaff(studentMatch, currentUser, permissionsMatrix)) return true;
      return false;
    });
  }, [allActivities, hasGlobalActivityScope, currentUser, students, permissionsMatrix]);

  // Filtered activities
  const filteredActivities = useMemo(() => {
    return scopedActivities.filter(a => {
      // 1. Search Query
      if (activitySearch.trim()) {
        const q = activitySearch.toLowerCase().trim();
        const matchesStaff = a.performedBy.toLowerCase().includes(q);
        const matchesStudent = a.studentName.toLowerCase().includes(q) || a.studentId.toLowerCase().includes(q);
        const matchesType = a.activityType.toLowerCase().includes(q);
        const matchesDesc = a.description.toLowerCase().includes(q);
        const matchesDetails = a.details?.toLowerCase().includes(q) || false;
        if (!matchesStaff && !matchesStudent && !matchesType && !matchesDesc && !matchesDetails) {
          return false;
        }
      }

      // 2. Staff Member Filter
      if (activityStaffFilter !== 'ALL') {
        if (a.performedBy.toLowerCase() !== activityStaffFilter.toLowerCase()) return false;
      }

      // 3. Staff Role Filter
      if (activityRoleFilter !== 'ALL') {
        if (a.role.toUpperCase() !== activityRoleFilter.toUpperCase()) return false;
      }

      // 4. Activity Category / Type
      if (activityTypeFilter !== 'ALL') {
        if (a.category !== activityTypeFilter && a.activityType.toLowerCase() !== activityTypeFilter.toLowerCase()) {
          return false;
        }
      }

      // 5. Student Filter
      if (activityStudentFilter !== 'ALL') {
        if (a.studentId !== activityStudentFilter) return false;
      }

      // 6. Date Range Filter
      if (activityDateFilter !== 'ALL') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const actTime = a.dateObj.getTime();
        const diffDays = Math.floor((today.getTime() - actTime) / (1000 * 60 * 60 * 24));

        if (activityDateFilter === 'TODAY' && diffDays !== 0) return false;
        if (activityDateFilter === 'LAST_7_DAYS' && (diffDays < 0 || diffDays > 7)) return false;
        if (activityDateFilter === 'LAST_30_DAYS' && (diffDays < 0 || diffDays > 30)) return false;
        if (activityDateFilter === 'THIS_MONTH') {
          if (a.dateObj.getMonth() !== today.getMonth() || a.dateObj.getFullYear() !== today.getFullYear()) return false;
        }
      }

      return true;
    });
  }, [scopedActivities, activitySearch, activityStaffFilter, activityRoleFilter, activityTypeFilter, activityStudentFilter, activityDateFilter]);

  // -------------------------------------------------------------
  // METRICS COMPUTATIONS
  // -------------------------------------------------------------
  const meetingStats = useMemo(() => {
    const total = filteredMeetings.length;
    const completed = filteredMeetings.filter(m => m.status === 'Completed').length;
    const totalMoms = filteredMeetings.reduce((acc, m) => acc + m.moms.length, 0);
    const totalTasks = filteredMeetings.reduce((acc, m) => acc + m.tasks.length, 0);
    const completedTasks = filteredMeetings.reduce((acc, m) => acc + m.tasks.filter(t => t.status === 'COMPLETED').length, 0);
    const taskRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    return { total, completed, totalMoms, totalTasks, taskRate };
  }, [filteredMeetings]);

  const activityStats = useMemo(() => {
    const total = filteredActivities.length;
    const staffSet = new Set(filteredActivities.map(a => a.performedBy));
    const studentSet = new Set(filteredActivities.map(a => a.studentId));
    const momCount = filteredActivities.filter(a => a.category === 'MEETING_MOM').length;
    const taskCount = filteredActivities.filter(a => a.category === 'POST_MEETING_TASK' || a.category === 'TASK').length;
    return { total, activeStaffCount: staffSet.size, impactedStudents: studentSet.size, momCount, taskCount };
  }, [filteredActivities]);

  // -------------------------------------------------------------
  // CSV DOWNLOAD HANDLERS
  // -------------------------------------------------------------
  const handleDownloadMeetingReportCSV = () => {
    const headers = [
      'Meeting ID',
      'Meeting Title',
      'Stream / Type',
      'Date',
      'Time',
      'Duration',
      'Meeting Status',
      'Meeting Owner / Host',
      'Owner Role',
      'Student Name(s)',
      'Student ID',
      'Batch Name',
      'Meeting Notes (MOM Key Points)',
      'Student Progress & Performance',
      'Observations',
      'Next Steps & Action Items',
      'Post-Meeting Tasks Count',
      'Post-Meeting Tasks Details (Title | Due Date | Status | Assigned By)',
      'Meeting Link',
      'Recording URL'
    ];

    const rows = filteredMeetings.map(m => {
      const allMomKeyPoints = m.moms.map(mom => mom.keyPoints).join(' | ');
      const allMomProgress = m.moms.map(mom => mom.studentProgress).filter(Boolean).join(' | ');
      const allMomObs = m.moms.map(mom => mom.observations).filter(Boolean).join(' | ');
      const allMomNextSteps = m.moms.map(mom => mom.nextSteps).filter(Boolean).join(' | ');

      const formattedTasks = m.tasks.map((t, idx) => 
        `[Task ${idx + 1}: "${t.title}" | Due: ${t.dueDate || 'N/A'} | Status: ${t.status} | Assigned By: ${t.assignedBy} | For: ${t.assignedToStudentName}]`
      ).join('; ');

      return [
        m.id,
        m.title,
        m.stream,
        m.date,
        m.time,
        m.duration || '60 mins',
        m.status,
        m.meetingOwnerName,
        m.meetingOwnerRole,
        m.allStudentNames.join('; '),
        m.studentId,
        m.batchName || 'N/A',
        allMomKeyPoints || m.generalNotes || 'N/A',
        allMomProgress || 'N/A',
        allMomObs || 'N/A',
        allMomNextSteps || 'N/A',
        m.tasks.length,
        formattedTasks || 'None',
        m.meetingLink || 'N/A',
        m.recordingUrl || 'N/A'
      ];
    });

    const timestamp = new Date().toISOString().split('T')[0];
    exportToCSV(`Meeting_Reports_and_Notes_${timestamp}.csv`, headers, rows);
  };

  const handleDownloadActivityReportCSV = () => {
    const headers = [
      'Activity ID',
      'Timestamp / Date',
      'Performed By (Staff Name)',
      'Staff Role',
      'Student Name',
      'Student ID',
      'Activity Category',
      'Activity Type',
      'Description',
      'Details / Feedback Notes',
      'Reference Link'
    ];

    const rows = filteredActivities.map(a => [
      a.id,
      a.timestamp,
      a.performedBy,
      a.role,
      a.studentName,
      a.studentId,
      a.category,
      a.activityType,
      a.description,
      a.details || 'N/A',
      a.link || 'N/A'
    ]);

    const timestamp = new Date().toISOString().split('T')[0];
    exportToCSV(`Staff_Activity_Audit_Report_${timestamp}.csv`, headers, rows);
  };

  // Toggle inline accordion expansion
  const toggleMeetingExpand = (id: string) => {
    setExpandedMeetingIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const expandAllMeetings = () => {
    setExpandedMeetingIds(filteredMeetings.map(m => m.id));
  };

  const collapseAllMeetings = () => {
    setExpandedMeetingIds([]);
  };

  // Helper badge color
  const getRoleBadgeClass = (role: string) => {
    const r = role.toUpperCase();
    if (r.includes('ADMIN')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (r.includes('COUNSELOR')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (r.includes('RESEARCH')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (r.includes('VERBAL')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (r.includes('MATH')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getActivityCategoryBadgeClass = (cat: UnifiedActivityReportItem['category']) => {
    switch (cat) {
      case 'MEETING_MOM':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'POST_MEETING_TASK':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'TASK':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'ESSAY':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'DOCUMENT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'REASSIGNMENT':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'SHORTLIST':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Top Header Banner */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <FileSpreadsheet className="w-5 h-5" />
                </span>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Reports & Analytics Center</h1>
                {!hasGlobalScope && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    Scoped to Assigned Students
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Centralized reporting for meeting notes (MOM), post-meeting deliverables, and counselor/mentor/educator activity audit trails.
              </p>
            </div>

            {/* Primary Tab Switcher */}
            {(canViewMeetings || canViewActivities) && (
              <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 self-start md:self-auto shadow-inner">
                {canViewMeetings && (
                  <button
                    onClick={() => setActiveTab('MEETINGS')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                      activeTab === 'MEETINGS'
                        ? "bg-white text-blue-700 shadow-xs border border-slate-200/60"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <CalendarDays className="w-4 h-4 text-blue-600" />
                    <span>Meeting & Session Reports</span>
                    <span className="ml-1 text-[10px] font-black px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800">
                      {scopedMeetings.length}
                    </span>
                  </button>
                )}

                {canViewActivities && (
                  <button
                    onClick={() => setActiveTab('ACTIVITIES')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                      activeTab === 'ACTIVITIES'
                        ? "bg-white text-indigo-700 shadow-xs border border-slate-200/60"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>Staff Activity & Updates</span>
                    <span className="ml-1 text-[10px] font-black px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800">
                      {scopedActivities.length}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        {!canViewMeetings && !canViewActivities && (
          <div className="max-w-xl mx-auto my-16 p-8 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Reports Access Restricted</h2>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Reports viewing permissions have been turned off for your role (<strong>{currentUser?.role}</strong>) in the Admin Settings Control Center. Please contact your system administrator to update your role permissions.
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: MEETING & SESSION REPORTS (WITH NOTES & POST-MEETING TASKS)        */}
        {/* ========================================================================= */}
        {canViewMeetings && activeTab === 'MEETINGS' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Card className="bg-white border-slate-200 shadow-xs">
                <CardContent className="p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filtered Meetings</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{meetingStats.total}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Across all mentors & batches</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-xs">
                <CardContent className="p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Conducted Sessions</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1">{meetingStats.completed}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Completed & verified</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-xs">
                <CardContent className="p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Meeting MOMs Logged</p>
                  <p className="text-2xl font-black text-blue-600 mt-1">{meetingStats.totalMoms}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Detailed notes & progress</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-xs">
                <CardContent className="p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Post-Meeting Tasks</p>
                  <p className="text-2xl font-black text-amber-600 mt-1">{meetingStats.totalTasks}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Student deliverables generated</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-xs col-span-2 sm:col-span-1">
                <CardContent className="p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Task Completion Rate</p>
                  <p className="text-2xl font-black text-indigo-600 mt-1">{meetingStats.taskRate}%</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Milestone verification rate</p>
                </CardContent>
              </Card>
            </div>

            {/* Filter Controls Card */}
            <Card className="bg-white border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={meetingSearch}
                    onChange={e => setMeetingSearch(e.target.value)}
                    placeholder="Search by student name, meeting title, mentor/educator name, task title, notes..."
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  {meetingSearch && (
                    <button onClick={() => setMeetingSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filter Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
                  {/* Meeting Owner / Mentor */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Meeting Owner
                    </label>
                    <select
                      value={meetingOwnerFilter}
                      onChange={e => setMeetingOwnerFilter(e.target.value)}
                      className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="ALL">All Owners / Staff</option>
                      {staff.map(st => (
                        <option key={st.id} value={st.name}>{st.name} ({st.role})</option>
                      ))}
                    </select>
                  </div>

                  {/* Owner Role */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Staff Role
                    </label>
                    <select
                      value={meetingRoleFilter}
                      onChange={e => setMeetingRoleFilter(e.target.value)}
                      className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="ALL">All Roles</option>
                      <option value="COUNSELOR">Counselor</option>
                      <option value="RESEARCH_GUIDE">Research Mentor</option>
                      <option value="SAT_MATH_FACULTY">SAT Math Faculty</option>
                      <option value="SAT_VERBAL_FACULTY">SAT Verbal Faculty</option>
                      <option value="SYSTEM_ADMIN">System Admin</option>
                    </select>
                  </div>

                  {/* Student Filter */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Student
                    </label>
                    <select
                      value={meetingStudentFilter}
                      onChange={e => setMeetingStudentFilter(e.target.value)}
                      className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="ALL">All Accessible Students</option>
                      {accessibleStudents.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                      ))}
                    </select>
                  </div>

                  {/* Stream Filter */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Stream / Type
                    </label>
                    <select
                      value={meetingStreamFilter}
                      onChange={e => setMeetingStreamFilter(e.target.value)}
                      className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="ALL">All Streams</option>
                      <option value="Counselling">Counselling (1-on-1)</option>
                      <option value="SAT">SAT Prep</option>
                      <option value="Research">Research Mentorship</option>
                      <option value="Cohort">Cohort / Batch Class</option>
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Meeting Status
                    </label>
                    <select
                      value={meetingStatusFilter}
                      onChange={e => setMeetingStatusFilter(e.target.value)}
                      className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="Completed">Completed</option>
                      <option value="Upcoming">Upcoming</option>
                      <option value="Canceled">Canceled</option>
                    </select>
                  </div>

                  {/* Date Filter */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Date Range
                    </label>
                    <select
                      value={meetingDateFilter}
                      onChange={e => setMeetingDateFilter(e.target.value as any)}
                      className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="ALL">All Time</option>
                      <option value="TODAY">Today</option>
                      <option value="LAST_7_DAYS">Last 7 Days</option>
                      <option value="LAST_30_DAYS">Last 30 Days</option>
                      <option value="THIS_MONTH">This Month</option>
                      <option value="PAST">Past Meetings</option>
                      <option value="UPCOMING">Upcoming</option>
                    </select>
                  </div>
                </div>

                {/* Additional Quick Toggles */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Content Filters:</span>
                    <button
                      onClick={() => setHasTasksFilter(prev => prev === 'HAS_TASKS' ? 'ALL' : 'HAS_TASKS')}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 border",
                        hasTasksFilter === 'HAS_TASKS' 
                          ? "bg-amber-50 text-amber-800 border-amber-300" 
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                      <span>Has Post-Meeting Tasks</span>
                    </button>

                    <button
                      onClick={() => setHasMomsFilter(prev => prev === 'HAS_MOMS' ? 'ALL' : 'HAS_MOMS')}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 border",
                        hasMomsFilter === 'HAS_MOMS' 
                          ? "bg-blue-50 text-blue-800 border-blue-300" 
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Has Meeting Notes / MOM</span>
                    </button>

                    {(meetingSearch || meetingOwnerFilter !== 'ALL' || meetingRoleFilter !== 'ALL' || meetingStudentFilter !== 'ALL' || meetingStreamFilter !== 'ALL' || meetingStatusFilter !== 'ALL' || meetingDateFilter !== 'ALL' || hasTasksFilter !== 'ALL' || hasMomsFilter !== 'ALL') && (
                      <button
                        onClick={() => {
                          setMeetingSearch('');
                          setMeetingOwnerFilter('ALL');
                          setMeetingRoleFilter('ALL');
                          setMeetingStudentFilter('ALL');
                          setMeetingStreamFilter('ALL');
                          setMeetingStatusFilter('ALL');
                          setMeetingDateFilter('ALL');
                          setHasTasksFilter('ALL');
                          setHasMomsFilter('ALL');
                        }}
                        className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1 ml-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Reset Filters
                      </button>
                    )}
                  </div>

                  {/* Expand / Collapse Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={expandAllMeetings}
                      className="text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:underline"
                    >
                      Expand All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      onClick={collapseAllMeetings}
                      className="text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:underline"
                    >
                      Collapse All
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Bar & Download CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-600">
                Showing <strong className="text-slate-900 font-black">{filteredMeetings.length}</strong> of{' '}
                <strong className="text-slate-900 font-black">{scopedMeetings.length}</strong> recorded sessions
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  onClick={() => window.print()}
                  variant="outline"
                  size="sm"
                  className="text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Print Summary</span>
                </Button>

                {canExportCsv ? (
                  <Button
                    onClick={handleDownloadMeetingReportCSV}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Meeting Report (CSV)</span>
                  </Button>
                ) : (
                  <div title="CSV Export disabled by Admin in Admin Settings Control Center">
                    <Button
                      disabled
                      className="bg-slate-100 text-slate-400 border border-slate-200 font-bold text-xs shadow-none flex items-center gap-2 cursor-not-allowed"
                    >
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Download Report (CSV Locked)</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Meeting Reports List / Table */}
            <div className="space-y-4">
              {filteredMeetings.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 p-8">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-800">No meeting reports match your filters</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Try clearing the keyword search, selecting a wider date range, or switching to "All Owners".
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 text-xs font-bold"
                    onClick={() => {
                      setMeetingSearch('');
                      setMeetingOwnerFilter('ALL');
                      setMeetingRoleFilter('ALL');
                      setMeetingStudentFilter('ALL');
                      setMeetingDateFilter('ALL');
                      setHasTasksFilter('ALL');
                      setHasMomsFilter('ALL');
                    }}
                  >
                    Clear All Filters
                  </Button>
                </div>
              ) : (
                filteredMeetings.map((meeting) => {
                  const isExpanded = expandedMeetingIds.includes(meeting.id);
                  const hasMoms = meeting.moms.length > 0;
                  const hasTasks = meeting.tasks.length > 0;

                  return (
                    <Card
                      key={meeting.id}
                      className={cn(
                        "bg-white border-slate-200 transition-all shadow-xs overflow-hidden",
                        isExpanded ? "ring-2 ring-blue-500/20 border-blue-300" : "hover:border-slate-300"
                      )}
                    >
                      {/* Top Header Card Bar */}
                      <div className="p-4 sm:p-5">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* Left Column: Meeting Title, Date & Time, Stream */}
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                meeting.status === 'Completed' 
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                  : (meeting.status === 'Upcoming' ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-600 border-slate-200")
                              )}>
                                {meeting.status}
                              </span>

                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {meeting.stream}
                              </span>

                              {meeting.batchName && (
                                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 truncate max-w-[200px]">
                                  Cohort: {meeting.batchName}
                                </span>
                              )}
                            </div>

                            <h3 className="text-base font-extrabold text-slate-900 tracking-tight leading-snug">
                              {meeting.title}
                            </h3>

                            {/* Meeting Metadata Separated by Dots */}
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 font-medium">
                              <span className="flex items-center gap-1.5 text-slate-700 font-bold">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {meeting.date}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {meeting.time} ({meeting.duration || '60 mins'})
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1.5 font-bold text-slate-800">
                                <User className="w-3.5 h-3.5 text-blue-500" />
                                Student: {meeting.studentName}
                              </span>
                            </div>
                          </div>

                          {/* Middle: Meeting Owner & Badges */}
                          <div className="flex flex-wrap items-center gap-3 lg:border-l lg:border-slate-100 lg:pl-5 shrink-0">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400">Meeting Owner</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-black text-slate-900">{meeting.meetingOwnerName}</span>
                                <span className={cn(
                                  "text-[9px] font-extrabold px-2 py-0.5 rounded border",
                                  getRoleBadgeClass(meeting.meetingOwnerRole)
                                )}>
                                  {meeting.meetingOwnerRole}
                                </span>
                              </div>
                            </div>

                            {/* Post-Meeting Summary Badges */}
                            <div className="flex items-center gap-2">
                              {hasMoms ? (
                                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                                  <span>{meeting.moms.length} MOM Notes</span>
                                </span>
                              ) : (
                                <span className="text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                                  No MOM Logged
                                </span>
                              )}

                              {hasTasks ? (
                                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1.5">
                                  <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                                  <span>{meeting.tasks.length} Post-Meeting Tasks</span>
                                </span>
                              ) : (
                                <span className="text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                                  0 Tasks
                                </span>
                              )}
                            </div>

                            {/* Accordion Toggle Button */}
                            <Button
                              onClick={() => toggleMeetingExpand(meeting.id)}
                              variant="ghost"
                              size="sm"
                              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-1"
                            >
                              <span>{isExpanded ? 'Hide Details' : 'View MOM & Tasks'}</span>
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Accordion Body */}
                      {isExpanded && (
                        <div className="bg-slate-50/70 border-t border-slate-200/80 p-5 space-y-5 animate-in fade-in-50 duration-200">
                          {/* 1. Meeting MOM / Notes Section */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                <span>Minutes of Meeting & Discussion Notes</span>
                              </h4>
                              {meeting.meetingLink && (
                                <a
                                  href={meeting.meetingLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  <span>Meeting Link</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>

                            {meeting.moms.length > 0 ? (
                              <div className="space-y-3">
                                {meeting.moms.map((mom, idx) => (
                                  <div key={mom.id || idx} className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5">
                                    <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                                      <span className="font-bold text-slate-900">
                                        Recorded by {mom.authorName} ({mom.authorRole})
                                      </span>
                                      <span className="text-slate-400 font-medium">{mom.date}</span>
                                    </div>

                                    {/* Key Points */}
                                    <div>
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Key Discussion Points</p>
                                      <p className="text-xs text-slate-800 font-medium mt-0.5 leading-relaxed">{mom.keyPoints}</p>
                                    </div>

                                    {/* Student Progress */}
                                    {mom.studentProgress && (
                                      <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Student Progress & Diagnostic Evaluation</p>
                                        <p className="text-xs text-slate-800 font-medium mt-0.5 leading-relaxed">{mom.studentProgress}</p>
                                      </div>
                                    )}

                                    {/* Observations & Next Steps Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                      {mom.observations && (
                                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Counselor Observations</p>
                                          <p className="text-xs text-slate-700 mt-1">{mom.observations}</p>
                                        </div>
                                      )}

                                      {mom.nextSteps && (
                                        <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                                          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Next Steps & Action Plan</p>
                                          <p className="text-xs text-slate-800 mt-1 font-medium">{mom.nextSteps}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="bg-white p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                                {meeting.generalNotes ? (
                                  <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">General Session Notes</p>
                                    <p className="text-xs text-slate-700 font-medium">{meeting.generalNotes}</p>
                                  </div>
                                ) : (
                                  <p>No detailed minutes or notes logged for this session.</p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* 2. Post-Meeting Tasks Section */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                                <CheckSquare className="w-4 h-4 text-amber-600" />
                                <span>Post-Meeting Action Tasks ({meeting.tasks.length})</span>
                              </h4>
                            </div>

                            {meeting.tasks.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {meeting.tasks.map((task, tIdx) => (
                                  <div key={task.id || tIdx} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <h5 className="text-xs font-bold text-slate-900 leading-snug">{task.title}</h5>
                                      <span className={cn(
                                        "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border shrink-0",
                                        task.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                        (task.status === 'IN_PROGRESS' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                        (task.status === 'NEEDS_REVISION' ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"))
                                      )}>
                                        {task.status}
                                      </span>
                                    </div>

                                    {task.description && (
                                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                                        {task.description}
                                      </p>
                                    )}

                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                                      <span className="font-bold text-slate-700">
                                        For: {task.assignedToStudentName || meeting.studentName}
                                      </span>
                                      <span className="text-amber-700 font-bold">
                                        Due: {task.dueDate || 'No due date'}
                                      </span>
                                    </div>

                                    {task.externalUrl && (
                                      <a
                                        href={task.externalUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-[10px] text-blue-600 font-bold hover:underline"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        <span>Submission / Reference Link</span>
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="bg-white p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                                No post-meeting action tasks generated for this session.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: STAFF ACTIVITIES REPORT (COUNSELOR, MENTOR, AND EDUCATORS)         */}
        {/* ========================================================================= */}
        {canViewActivities && activeTab === 'ACTIVITIES' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Card className="bg-white border-slate-200 shadow-xs">
                <CardContent className="p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filtered Updates</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{activityStats.total}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Chronological actions</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-xs">
                <CardContent className="p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Staff Members</p>
                  <p className="text-2xl font-black text-indigo-600 mt-1">{activityStats.activeStaffCount}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Counselors, mentors & faculty</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-xs">
                <CardContent className="p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Students Impacted</p>
                  <p className="text-2xl font-black text-blue-600 mt-1">{activityStats.impactedStudents}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Distinct student profiles</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-xs">
                <CardContent className="p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Meeting MOMs Logged</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1">{activityStats.momCount}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Session review notes</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-xs col-span-2 sm:col-span-1">
                <CardContent className="p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tasks & Deliverables</p>
                  <p className="text-2xl font-black text-amber-600 mt-1">{activityStats.taskCount}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Assigned action items</p>
                </CardContent>
              </Card>
            </div>

            {/* Filter Controls Card */}
            <Card className="bg-white border-slate-200 shadow-xs">
              <CardContent className="p-4 space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={activitySearch}
                    onChange={e => setActivitySearch(e.target.value)}
                    placeholder="Search by keywords, staff name, student name, update details, feedback notes..."
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  {activitySearch && (
                    <button onClick={() => setActivitySearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filter Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
                  {/* Staff Member */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Staff Member
                    </label>
                    <select
                      value={activityStaffFilter}
                      onChange={e => setActivityStaffFilter(e.target.value)}
                      className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="ALL">All Staff Members</option>
                      {staff.map(st => (
                        <option key={st.id} value={st.name}>{st.name} ({st.role})</option>
                      ))}
                    </select>
                  </div>

                  {/* Staff Role */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Staff Role
                    </label>
                    <select
                      value={activityRoleFilter}
                      onChange={e => setActivityRoleFilter(e.target.value)}
                      className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="ALL">All Roles</option>
                      <option value="COUNSELOR">Counselor</option>
                      <option value="RESEARCH_GUIDE">Research Mentor</option>
                      <option value="SAT_MATH_FACULTY">SAT Math Faculty</option>
                      <option value="SAT_VERBAL_FACULTY">SAT Verbal Faculty</option>
                      <option value="CATEGORY_MANAGER">Category Manager</option>
                      <option value="SYSTEM_ADMIN">System Admin</option>
                    </select>
                  </div>

                  {/* Activity Type Category */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Activity Category
                    </label>
                    <select
                      value={activityTypeFilter}
                      onChange={e => setActivityTypeFilter(e.target.value)}
                      className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="ALL">All Activity Categories</option>
                      <option value="MEETING_MOM">Meeting Notes / MOM Logged</option>
                      <option value="POST_MEETING_TASK">Post-Meeting Task Assigned</option>
                      <option value="TASK">Task / Milestone Assigned</option>
                      <option value="ESSAY">Essay Reviewed & Evaluated</option>
                      <option value="DOCUMENT">Document Approved / Verified</option>
                      <option value="GUIDANCE">Counselor Guidance Note</option>
                      <option value="REASSIGNMENT">Counselor Reassigned / Transferred</option>
                      <option value="SHORTLIST">University Shortlist Update</option>
                    </select>
                  </div>

                  {/* Student Filter */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Student
                    </label>
                    <select
                      value={activityStudentFilter}
                      onChange={e => setActivityStudentFilter(e.target.value)}
                      className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="ALL">All Accessible Students</option>
                      {accessibleStudents.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                      ))}
                    </select>
                  </div>

                  {/* Date Filter */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Date Range
                    </label>
                    <select
                      value={activityDateFilter}
                      onChange={e => setActivityDateFilter(e.target.value as any)}
                      className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="ALL">All Time</option>
                      <option value="TODAY">Today</option>
                      <option value="LAST_7_DAYS">Last 7 Days</option>
                      <option value="LAST_30_DAYS">Last 30 Days</option>
                      <option value="THIS_MONTH">This Month</option>
                    </select>
                  </div>
                </div>

                {/* Reset button if filtered */}
                {(activitySearch || activityStaffFilter !== 'ALL' || activityRoleFilter !== 'ALL' || activityTypeFilter !== 'ALL' || activityStudentFilter !== 'ALL' || activityDateFilter !== 'ALL') && (
                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() => {
                        setActivitySearch('');
                        setActivityStaffFilter('ALL');
                        setActivityRoleFilter('ALL');
                        setActivityTypeFilter('ALL');
                        setActivityStudentFilter('ALL');
                        setActivityDateFilter('ALL');
                      }}
                      className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Reset All Activity Filters
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Bar & Download CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-600">
                Showing <strong className="text-slate-900 font-black">{filteredActivities.length}</strong> of{' '}
                <strong className="text-slate-900 font-black">{scopedActivities.length}</strong> staff activity records
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  onClick={() => window.print()}
                  variant="outline"
                  size="sm"
                  className="text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Print Audit Log</span>
                </Button>

                {canExportCsv ? (
                  <Button
                    onClick={handleDownloadActivityReportCSV}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Activity Log (CSV)</span>
                  </Button>
                ) : (
                  <div title="CSV Export disabled by Admin in Admin Settings Control Center">
                    <Button
                      disabled
                      className="bg-slate-100 text-slate-400 border border-slate-200 font-bold text-xs shadow-none flex items-center gap-2 cursor-not-allowed"
                    >
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Download Log (CSV Locked)</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Activity Stream Table / Card Feed */}
            <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5">Timestamp</th>
                      <th className="px-5 py-3.5">Staff Member (Performed By)</th>
                      <th className="px-5 py-3.5">Student</th>
                      <th className="px-5 py-3.5">Activity Category</th>
                      <th className="px-5 py-3.5 min-w-[300px]">Description & Details</th>
                      <th className="px-5 py-3.5 text-right">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredActivities.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                          No staff activity logs match your filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredActivities.map((act) => (
                        <tr key={act.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Timestamp */}
                          <td className="px-5 py-3.5 text-slate-500 font-medium">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {act.timestamp}
                            </span>
                          </td>

                          {/* Staff Member */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xs border border-slate-200">
                                {act.performedBy.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-900 leading-tight">{act.performedBy}</p>
                                <span className={cn(
                                  "text-[9px] font-bold px-1.5 py-0.2 rounded border",
                                  getRoleBadgeClass(act.role)
                                )}>
                                  {act.role}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Student */}
                          <td className="px-5 py-3.5">
                            <p className="font-bold text-slate-900">{act.studentName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{act.studentId}</p>
                          </td>

                          {/* Category Badge */}
                          <td className="px-5 py-3.5">
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5",
                              getActivityCategoryBadgeClass(act.category)
                            )}>
                              {act.activityType}
                            </span>
                          </td>

                          {/* Description & Details */}
                          <td className="px-5 py-3.5 whitespace-normal max-w-md">
                            <p className="text-xs font-bold text-slate-900 leading-snug">{act.description}</p>
                            {act.details && (
                              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                {act.details}
                              </p>
                            )}
                          </td>

                          {/* Link / Action */}
                          <td className="px-5 py-3.5 text-right">
                            {act.link ? (
                              <a
                                href={act.link}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                              >
                                <span>View File</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-[11px] text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
