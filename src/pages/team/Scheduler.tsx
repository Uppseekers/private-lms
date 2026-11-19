import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, Search, Users, Video, Edit, Trash2, X, RefreshCw, 
  FileText, Link as LinkIcon, CheckCircle2, Star, MessageSquare, ClipboardList, Paperclip,
  Repeat, Calendar, CalendarDays, ChevronDown, ChevronUp, Layers, Clock, Sparkles, AlertCircle,
  Copy, Check, ExternalLink, Unplug, Mail, SlidersHorizontal
} from 'lucide-react';
import { useDatabase, EventItem } from '@/context/DatabaseContext';
import { getFirebaseIdToken } from '@/lib/firebase';
import {
  deleteStaffZohoSealedVault,
  saveStaffZohoSealedVault,
  subscribeToZohoOAuthMessages,
  zohoAuthenticatedFetch,
} from '@/lib/zohoClient';
import { cn } from '@/lib/utils';
import { MeetingMOM, MeetingResourceLink, MeetingTask, OperationalLog, BatchClassSession } from '@/types';
import { canStaffAccessAllStudents, isUserAdmin, isStudentAssignedToStaff, canStaffAccessEvent } from '@/lib/staffPermissions';
import { 
  DAY_OF_WEEK_OPTIONS, 
  SCHEDULE_DAY_PRESETS, 
  generateRecurringDates, 
  formatScheduleSummary, 
  addMonthsToDateString,
  formatPreviewDate
} from '@/lib/recurringSchedule';

export default function TeamScheduler() {
  const { events, setEvents, currentUser, batches, setBatches, students, updateStudent, permissionsMatrix } = useDatabase();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [audienceType, setAudienceType] = useState('individual');
  const [scheduleMode, setScheduleMode] = useState<'single' | 'recurring'>('single');
  const [showAllPreviewDates, setShowAllPreviewDates] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<any | null>(null);
  
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
  const todayStr = new Date().toISOString().split('T')[0];
  const defaultTimezone = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
    } catch {
      return 'America/New_York';
    }
  })();

  const [formData, setFormData] = useState({
    stream: 'Counselling (1-on-1)',
    title: '',
    date: todayStr,
    startDate: todayStr,
    endDate: addMonthsToDateString(todayStr, 2),
    selectedDays: [1, 3, 5] as number[], // Mon, Wed, Fri
    startTime: '18:00',
    endTime: '19:00',
    durationMinutes: 60,
    timezone: defaultTimezone,
    location: 'https://meet.google.com',
    notes: '',
    assignments: '',
    titleNumbering: true,
  });
  
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [horizonFilter, setHorizonFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  // Zoho Meeting Integration State
  const [zohoStatus, setZohoStatus] = useState<{
    loading: boolean;
    configured: boolean;
    connected: boolean;
    zohoEmail?: string;
    zohoDisplayName?: string;
    redirectUri?: string;
  }>({ loading: true, configured: true, connected: false });
  const [videoMode, setVideoMode] = useState<'zoho' | 'manual'>('manual');
  const [isConnectingZoho, setIsConnectingZoho] = useState(false);
  const [isCreatingZohoMeeting, setIsCreatingZohoMeeting] = useState(false);
  const [zohoBanner, setZohoBanner] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);

  const fetchZohoStatus = async () => {
    try {
      setZohoStatus(prev => ({ ...prev, loading: true }));
      const { data } = await zohoAuthenticatedFetch('/api/zoho/status', { method: 'GET' }, currentUser);
      setZohoStatus({
        loading: false,
        configured: data.configured !== false,
        connected: Boolean(data.connected),
        zohoEmail: data.zohoEmail || '',
        zohoDisplayName: data.zohoDisplayName || '',
        redirectUri: data.redirectUri || '',
      });
    } catch {
      setZohoStatus(prev => ({ ...prev, loading: false, connected: false }));
    }
  };

  useEffect(() => {
    fetchZohoStatus();
  }, [currentUser?.id, currentUser?.email]);

  useEffect(() => {
    return subscribeToZohoOAuthMessages((payload) => {
      if (payload.type === 'ZOHO_OAUTH_SUCCESS') {
        setIsConnectingZoho(false);
        setModalError(null);
        void saveStaffZohoSealedVault(payload, currentUser?.email, currentUser?.name).then(() => {
          fetchZohoStatus();
        });
        setZohoStatus(prev => ({
          ...prev,
          loading: false,
          connected: true,
          zohoEmail: payload.zohoEmail || prev.zohoEmail,
          zohoDisplayName: payload.zohoDisplayName || prev.zohoDisplayName,
        }));
        setZohoBanner({
          type: 'success',
          message: `Connected Zoho Meeting account (${payload.zohoEmail || payload.zohoDisplayName || 'Verified'}).`,
        });
        setVideoMode('zoho');
      } else if (payload.type === 'ZOHO_OAUTH_ERROR') {
        setIsConnectingZoho(false);
        const msg = payload.error || 'Zoho authorization did not complete.';
        if (payload.redirectUri) {
          setZohoStatus(prev => ({ ...prev, redirectUri: payload.redirectUri }));
        }
        setZohoBanner({ type: 'error', message: msg });
        if (isModalOpen) setModalError(msg);
      }
    });
  }, [isModalOpen, currentUser?.id, currentUser?.email]);

  const handleConnectZoho = async () => {
    setZohoBanner(null);
    setModalError(null);
    setIsConnectingZoho(true);
    try {
      const { ok, status, data } = await zohoAuthenticatedFetch('/api/zoho/auth/url', { method: 'GET' }, currentUser);
      if (data.redirectUri) {
        setZohoStatus(prev => ({ ...prev, redirectUri: data.redirectUri }));
      }
      if (!ok || !data.url) {
        const errMsg =
          data.error ||
          (status === 401
            ? 'Your login session expired. Please sign out and sign back in, then click Connect Zoho Meeting.'
            : `Unable to start Zoho OAuth flow (HTTP ${status}).`);
        setZohoStatus(prev => ({ ...prev, configured: data.configured !== false, redirectUri: data.redirectUri || prev.redirectUri }));
        setZohoBanner({ type: 'error', message: errMsg });
        if (isModalOpen) setModalError(errMsg);
        setIsConnectingZoho(false);
        return;
      }

      const width = 620;
      const height = 720;
      const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
      const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
      const popup = window.open(
        data.url,
        'zoho_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );
      if (!popup || popup.closed) {
        const msg = 'Popup blocked by browser. Please allow popups for this site and click Connect Zoho Meeting again.';
        setZohoBanner({ type: 'error', message: msg });
        if (isModalOpen) setModalError(msg);
        setIsConnectingZoho(false);
        return;
      }

      const pollTimer = window.setInterval(() => {
        if (popup.closed) {
          window.clearInterval(pollTimer);
          setIsConnectingZoho(false);
          window.setTimeout(() => {
            void fetchZohoStatus();
          }, 400);
        }
      }, 500);
    } catch (err: any) {
      const msg = err?.message || 'Network error while connecting Zoho Meeting.';
      setZohoBanner({ type: 'error', message: msg });
      if (isModalOpen) setModalError(msg);
      setIsConnectingZoho(false);
    }
  };

  const handleDisconnectZoho = async () => {
    try {
      await zohoAuthenticatedFetch('/api/zoho/connection', { method: 'DELETE' }, currentUser);
      await deleteStaffZohoSealedVault(currentUser?.email);
      setZohoStatus(prev => ({ ...prev, connected: false, zohoEmail: '', zohoDisplayName: '' }));
      if (videoMode === 'zoho') setVideoMode('manual');
      setZohoBanner({ type: 'info', message: 'Disconnected your Zoho Meeting account.' });
    } catch {
      setZohoBanner({ type: 'error', message: 'Failed to disconnect Zoho Meeting account.' });
    }
  };

  const computeDurationMinutes = (start: string, end: string): number => {
    const [sh, sm] = (start || '18:00').split(':').map(Number);
    const [eh, em] = (end || '19:00').split(':').map(Number);
    if (!Number.isFinite(sh) || !Number.isFinite(sm) || !Number.isFinite(eh) || !Number.isFinite(em)) {
      return 60;
    }
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff <= 0) diff += 24 * 60;
    return Math.max(15, Math.min(720, diff));
  };

  const computeEndTimeFromDuration = (start: string, mins: number): string => {
    const [sh, sm] = (start || '18:00').split(':').map(Number);
    if (!Number.isFinite(sh) || !Number.isFinite(sm)) return '19:00';
    const total = (sh * 60 + sm + mins) % (24 * 60);
    const hh = String(Math.floor(total / 60)).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const TIMEZONE_OPTIONS = Array.from(new Set([
    defaultTimezone,
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Singapore',
    'UTC',
  ]));

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
  const hasGlobalScope = isUserAdmin(currentUser) || canStaffAccessAllStudents(currentUser, permissionsMatrix);

  const assignedStudents = students.filter(s => {
    if (hasGlobalScope) return true;
    return isStudentAssignedToStaff(s, currentUser, permissionsMatrix, batches);
  });

  const visibleBatches = hasGlobalScope 
    ? batches 
    : batches.filter(b => b.mentors.some(m => m.toLowerCase() === (currentUser?.name || '').toLowerCase()));

  const visibleEvents = events.filter((e: any) => {
    return canStaffAccessEvent(e, currentUser, students, batches, permissionsMatrix);
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

  const handleOpenModal = (preselectedBatchId?: string) => {
    setEditingEventId(null);
    setModalError(null);
    const today = new Date().toISOString().split('T')[0];
    const targetBatch = preselectedBatchId ? batches.find(b => b.id === preselectedBatchId) : null;

    setFormData({
      stream: targetBatch?.subject === 'SAT' ? 'SAT Verbal Prep' : (targetBatch?.subject === 'Research' ? 'Research Mentoring' : 'Counselling (1-on-1)'),
      title: targetBatch ? `${targetBatch.name} Class Session` : '',
      date: today,
      startDate: today,
      endDate: addMonthsToDateString(today, 2),
      selectedDays: [1, 3, 5],
      startTime: '18:00',
      endTime: '19:00',
      durationMinutes: 60,
      timezone: defaultTimezone,
      location: targetBatch?.meetingLink || 'https://meet.google.com',
      notes: '',
      assignments: '',
      titleNumbering: true,
    });
    setVideoMode(zohoStatus.connected ? 'zoho' : 'manual');
    setShowAllPreviewDates(false);

    if (preselectedBatchId) {
      setAudienceType('batch');
      setSelectedBatchId(preselectedBatchId);
      setScheduleMode('recurring');
    } else {
      setSelectedStudentId(assignedStudents[0]?.id || '');
      setSelectedBatchId('');
      setAudienceType('individual');
      setScheduleMode('single');
    }
    setIsModalOpen(true);
  };

  useEffect(() => {
    const batchIdParam = searchParams.get('batchId');
    if (batchIdParam && batches.length > 0) {
      handleOpenModal(batchIdParam);
    }
  }, [searchParams, batches]);

  const handleEditEvent = (evt: any) => {
    setEditingEventId(evt.id);
    setModalError(null);
    const isRec = !!(evt.isRecurring || evt.seriesId);
    setScheduleMode(isRec ? 'recurring' : 'single');
    const parsedStart = (evt.time || '18:00').split(' - ')[0] || '18:00';
    const parsedEnd = (evt.time || '19:00').split(' - ')[1] || computeEndTimeFromDuration(parsedStart, 60);
    setFormData({
      stream: evt.stream || 'Counselling (1-on-1)',
      title: evt.title || '',
      date: evt.date || evt.day || new Date().toISOString().split('T')[0],
      startDate: evt.date || evt.day || new Date().toISOString().split('T')[0],
      endDate: addMonthsToDateString(evt.date || evt.day || new Date().toISOString().split('T')[0], 2),
      selectedDays: [1, 3, 5],
      startTime: parsedStart,
      endTime: parsedEnd,
      durationMinutes: computeDurationMinutes(parsedStart, parsedEnd),
      timezone: defaultTimezone,
      location: evt.location || evt.link || '',
      notes: evt.notes || '',
      assignments: evt.assignments || '',
      titleNumbering: true,
    });
    setVideoMode(evt.videoProvider === 'zoho' && !evt.location ? 'zoho' : 'manual');
    setShowAllPreviewDates(false);
    if (evt.batch) {
      setAudienceType('batch');
      setSelectedBatchId(evt.batch);
    } else {
      setAudienceType('individual');
      if (evt.studentId) setSelectedStudentId(evt.studentId);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEventId(null);
    setModalError(null);
  };

  const handleDeleteClick = (evt: any) => {
    if (evt.seriesId) {
      setEventToDelete(evt);
    } else {
      if (window.confirm('Are you sure you want to permanently delete this class event?')) {
        setEvents(events.filter((e: any) => e.id !== evt.id));
      }
    }
  };

  const handleDeleteSingleSession = () => {
    if (!eventToDelete) return;
    setEvents(events.filter((e: any) => e.id !== eventToDelete.id));
    setEventToDelete(null);
  };

  const handleDeleteEntireSeries = () => {
    if (!eventToDelete || !eventToDelete.seriesId) return;
    const targetSeriesId = eventToDelete.seriesId;
    setEvents(events.filter((e: any) => e.seriesId !== targetSeriesId));
    
    // Also remove series from batch sessions if linked
    if (eventToDelete.batch) {
      setBatches(batches.map(b => {
        if (b.id === eventToDelete.batch && b.sessions) {
          const updatedSessions = b.sessions.filter(s => s.seriesId !== targetSeriesId);
          return {
            ...b,
            sessions: updatedSessions,
            totalSessions: Math.max(updatedSessions.length, 1)
          };
        }
        return b;
      }));
    }
    setEventToDelete(null);
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const resolveSelectedParticipants = () => {
    if (audienceType === 'individual') {
      const targetStudent = students.find(s => s.id === selectedStudentId);
      const email = (targetStudent?.email || '').trim().toLowerCase();
      return {
        emails: emailRegex.test(email) ? [email] : [],
        missingNames: targetStudent && !emailRegex.test(email) ? [targetStudent.name] : [],
        totalStudents: targetStudent ? 1 : 0,
      };
    }
    const targetBatch = batches.find(b => b.id === selectedBatchId);
    const enrolledIds = targetBatch?.students || [];
    const emails: string[] = [];
    const missingNames: string[] = [];
    enrolledIds.forEach(entry => {
      const matched = students.find(
        s => s.id === entry || s.email?.toLowerCase() === String(entry).toLowerCase() || s.name?.toLowerCase() === String(entry).toLowerCase()
      );
      const candidateEmail = (matched?.email || (emailRegex.test(String(entry)) ? String(entry) : '')).trim().toLowerCase();
      if (emailRegex.test(candidateEmail)) {
        if (!emails.includes(candidateEmail)) emails.push(candidateEmail);
      } else if (matched?.name) {
        missingNames.push(matched.name);
      }
    });
    return {
      emails,
      missingNames,
      totalStudents: enrolledIds.length,
    };
  };

  const participantResolution = resolveSelectedParticipants();

  const handlePublish = async () => {
    setModalError(null);

    if (!formData.title.trim()) {
      setModalError("Please enter a session title.");
      return;
    }

    if (scheduleMode === 'single') {
      if (!formData.date || !formData.startTime) {
        setModalError("Please specify Date and Start Time.");
        return;
      }
    } else {
      if (!formData.startDate || !formData.endDate || formData.selectedDays.length === 0) {
        setModalError("Please specify From Date, To Date, and at least one Day of the Week.");
        return;
      }
    }

    if (audienceType === 'individual') {
      if (!selectedStudentId) {
        setModalError("Please select the student who will attend this session.");
        return;
      }
    } else {
      if (!selectedBatchId) {
        setModalError("Please select the batch cohort for this session.");
        return;
      }
    }

    const occurrences = scheduleMode === 'recurring'
      ? generateRecurringDates(formData.startDate, formData.endDate, formData.selectedDays)
      : [formData.date];

    if (scheduleMode === 'recurring' && occurrences.length === 0) {
      setModalError("No meeting dates fell within the selected date range and days of the week. Please check that From Date is before To Date and at least one selected day matches.");
      return;
    }

    const targetStudent = students.find(s => s.id === selectedStudentId);
    const targetBatch = batches.find(b => b.id === selectedBatchId);
    const studentLabel = audienceType === 'batch' 
      ? (targetBatch?.name || 'Batch Cohort') 
      : (targetStudent ? targetStudent.name : '');

    const durationMinutes = formData.durationMinutes || computeDurationMinutes(formData.startTime, formData.endTime);
    const durationStr = formData.endTime
      ? `${formData.startTime} - ${formData.endTime} (${durationMinutes} min)`
      : `${durationMinutes} min`;

    let locationLink = formData.location.trim() || 'https://meet.google.com';
    let hostStartLink: string | undefined;
    let zohoMeetingKey: string | undefined;
    let videoProvider: 'zoho' | 'manual' = 'manual';
    let invitedParticipantEmails: string[] | undefined;

    // Provision Automated Zoho Meeting (1 meeting for single OR entire recurring series)
    if (videoMode === 'zoho') {
      if (!zohoStatus.connected) {
        setModalError("Connect your Zoho Meeting account first, or switch to Manual Video Link.");
        return;
      }
      setIsCreatingZohoMeeting(true);
      try {
        const { ok, data } = await zohoAuthenticatedFetch(
          '/api/zoho/meetings',
          {
            method: 'POST',
            body: JSON.stringify({
              topic: formData.title.trim(),
              agenda: formData.notes.trim(),
              startDate: occurrences[0],
              startTime: formData.startTime,
              durationMinutes,
              timezone: formData.timezone || defaultTimezone,
              participantEmails: participantResolution.emails,
            }),
          },
          currentUser
        );
        if (!ok || !data.joinLink) {
          setModalError(data.error || 'Could not create Zoho Meeting. Check your connection or switch to Manual Video Link.');
          setIsCreatingZohoMeeting(false);
          return;
        }
        locationLink = data.joinLink;
        hostStartLink = data.startLink || data.joinLink;
        zohoMeetingKey = data.meetingKey || undefined;
        videoProvider = 'zoho';
        invitedParticipantEmails = Array.isArray(data.participantEmails) ? data.participantEmails : participantResolution.emails;
      } catch (err: any) {
        setModalError(err?.message || 'Network error while creating Zoho Meeting.');
        setIsCreatingZohoMeeting(false);
        return;
      }
      setIsCreatingZohoMeeting(false);
    }

    // 1. EDIT EXISTING EVENT
    if (editingEventId) {
      setEvents(events.map((e: any) => {
        if (e.id === editingEventId) {
          return {
            ...e,
            title: formData.title,
            stream: formData.stream,
            day: formData.date,
            date: formData.date,
            time: formData.startTime + (formData.endTime ? ` - ${formData.endTime}` : ''),
            duration: durationStr,
            location: locationLink,
            notes: formData.notes,
            assignments: formData.assignments,
            batch: audienceType === 'batch' ? selectedBatchId : undefined,
            studentId: audienceType === 'individual' ? selectedStudentId : undefined,
            students: studentLabel,
            videoProvider: videoProvider === 'zoho' ? 'zoho' : (e.videoProvider || 'manual'),
            zohoMeetingKey: zohoMeetingKey || e.zohoMeetingKey,
            hostStartLink: hostStartLink || e.hostStartLink,
            participantEmails: invitedParticipantEmails || e.participantEmails,
          };
        }
        return e;
      }));
      handleCloseModal();
      return;
    }

    // 2. RECURRING SERIES CREATION (Date Range & Days of Week)
    if (scheduleMode === 'recurring') {
      const seriesId = 'SERIES-' + Date.now();
      const recurrenceSummary = formatScheduleSummary(formData.selectedDays, formData.startTime, formData.endTime);

      const newEvents: EventItem[] = occurrences.map((dateStr, idx) => {
        const sessionTitle = formData.titleNumbering 
          ? (audienceType === 'batch' ? `${formData.title} • Lecture #${idx + 1}` : `${formData.title} (Session #${idx + 1})`)
          : formData.title;

        return {
          id: `EVT-${Date.now()}-${idx}`,
          day: dateStr,
          date: dateStr,
          time: formData.startTime + (formData.endTime ? ` - ${formData.endTime}` : ''),
          duration: durationStr,
          stream: formData.stream,
          title: sessionTitle,
          batch: audienceType === 'batch' ? selectedBatchId : undefined,
          students: studentLabel,
          studentId: audienceType === 'individual' ? selectedStudentId : undefined,
          location: locationLink, // Single persistent meeting join link across all instances
          notes: formData.notes,
          assignments: formData.assignments,
          host: currentUser?.name || 'Staff Mentor',
          status: 'Scheduled' as const,
          isRecurring: true,
          seriesId,
          sessionNumber: idx + 1,
          totalSessionsInSeries: occurrences.length,
          recurrenceRule: recurrenceSummary,
          videoProvider,
          zohoMeetingKey,
          hostStartLink,
          participantEmails: invitedParticipantEmails,
          moms: [],
          ratings: [],
          resources: [],
          tasks: []
        };
      });

      setEvents([...events, ...newEvents]);

      // If scheduled for a batch, ALSO synchronize directly into the batch's sessions and metadata!
      if (audienceType === 'batch' && targetBatch) {
        const existingSessions = targetBatch.sessions || [];
        const startSessionNum = existingSessions.length;

        const newBatchSessions: BatchClassSession[] = occurrences.map((dateStr, idx) => ({
          id: 'SES-' + Math.floor(1000 + Math.random() * 9000),
          sessionNumber: startSessionNum + idx + 1,
          title: formData.titleNumbering ? `${formData.title} - Lecture #${startSessionNum + idx + 1}` : formData.title,
          topic: formData.notes?.slice(0, 100) || `${formData.stream} Core Curriculum Module`,
          date: dateStr,
          time: formData.startTime + (formData.endTime ? ` - ${formData.endTime}` : ''),
          status: 'Upcoming' as const,
          meetingLink: locationLink, // SAME meeting link
          joinedStudentIds: [],
          seriesId,
          videoProvider,
          zohoMeetingKey,
          hostStartLink,
        }));

        const updatedBatch = {
          ...targetBatch,
          sessions: [...existingSessions, ...newBatchSessions],
          totalSessions: Math.max(targetBatch.totalSessions || 10, existingSessions.length + newBatchSessions.length),
          scheduleDayTime: recurrenceSummary,
          meetingLink: targetBatch.meetingLink || locationLink
        };

        setBatches(batches.map(b => b.id === targetBatch.id ? updatedBatch : b));
      }

      // If scheduled for individual student, add operational log
      if (audienceType === 'individual' && targetStudent) {
        const logEntry: OperationalLog = {
          id: 'LOG-' + Date.now(),
          timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
          performedBy: currentUser?.name || 'Staff Member',
          role: currentUser?.role || 'MENTOR',
          studentId: targetStudent.id,
          activityType: 'Meeting Scheduled',
          description: `Scheduled recurring ${videoProvider === 'zoho' ? 'Zoho Meeting ' : ''}series (${occurrences.length} sessions) "${formData.title}" from ${formData.startDate} to ${formData.endDate} (${recurrenceSummary})`,
          link: locationLink
        };
        updateStudent({
          ...targetStudent,
          operationalLogs: [logEntry, ...(targetStudent.operationalLogs || [])]
        });
      }

    } else {
      // 3. SINGLE SESSION CREATION
      const baseId = 'EVT-' + Math.floor(Math.random() * 100000);
      const singleEvent: EventItem = {
        id: baseId,
        day: formData.date,
        date: formData.date,
        time: formData.startTime + (formData.endTime ? ` - ${formData.endTime}` : ''),
        duration: durationStr,
        stream: formData.stream,
        title: formData.title,
        batch: audienceType === 'batch' ? selectedBatchId : undefined,
        students: studentLabel,
        studentId: audienceType === 'individual' ? selectedStudentId : undefined,
        location: locationLink,
        notes: formData.notes,
        assignments: formData.assignments,
        host: currentUser?.name || 'Staff Mentor',
        status: 'Scheduled' as const,
        videoProvider,
        zohoMeetingKey,
        hostStartLink,
        participantEmails: invitedParticipantEmails,
        moms: [],
        ratings: [],
        resources: [],
        tasks: []
      };

      setEvents([...events, singleEvent]);

      if (audienceType === 'batch' && targetBatch) {
        const existingSessions = targetBatch.sessions || [];
        const newBatchSession: BatchClassSession = {
          id: 'SES-' + Math.floor(1000 + Math.random() * 9000),
          sessionNumber: existingSessions.length + 1,
          title: formData.title,
          topic: formData.notes?.slice(0, 100) || `${formData.stream} Session`,
          date: formData.date,
          time: formData.startTime + (formData.endTime ? ` - ${formData.endTime}` : ''),
          status: 'Upcoming' as const,
          meetingLink: locationLink,
          joinedStudentIds: [],
          videoProvider,
          zohoMeetingKey,
          hostStartLink,
        };
        const updatedBatch = {
          ...targetBatch,
          sessions: [...existingSessions, newBatchSession],
          totalSessions: Math.max(targetBatch.totalSessions || 10, existingSessions.length + 1),
          meetingLink: targetBatch.meetingLink || locationLink
        };
        setBatches(batches.map(b => b.id === targetBatch.id ? updatedBatch : b));
      }

      if (audienceType === 'individual' && targetStudent) {
        const logEntry: OperationalLog = {
          id: 'LOG-' + Date.now(),
          timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
          performedBy: currentUser?.name || 'Staff Member',
          role: currentUser?.role || 'MENTOR',
          studentId: targetStudent.id,
          activityType: 'Meeting Scheduled',
          description: `Scheduled ${videoProvider === 'zoho' ? 'Zoho Meeting ' : ''}meeting "${formData.title}" on ${formData.date} at ${formData.startTime}`,
          link: locationLink
        };
        updateStudent({
          ...targetStudent,
          operationalLogs: [logEntry, ...(targetStudent.operationalLogs || [])]
        });
      }
    }

    if (videoProvider === 'zoho') {
      setZohoBanner({
        type: 'success',
        message: `Zoho Meeting created for "${formData.title}" (${invitedParticipantEmails?.length || 0} participant email${invitedParticipantEmails?.length === 1 ? '' : 's'} invited).`,
      });
    }
    handleCloseModal();
  };

  // POST-SESSION ACTIONS
  const handleAddMOM = () => {
    if (!momKeyPoints.trim() || !activeSessionModalEvt) return;
    const newMom: MeetingMOM = {
      id: 'MOM-' + Date.now(),
      authorName: currentUser?.name || 'Staff Member',
      authorRole: currentUser?.role || 'MENTOR',
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
          performedBy: currentUser?.name || 'Staff Member',
          role: currentUser?.role || 'MENTOR',
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
      assignedBy: currentUser?.name || 'Staff Member',
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
        assignedBy: `${currentUser?.name || 'Staff Member'} (${currentUser?.role || 'Mentor'})`,
        externalUrl: taskUrl,
        attachments: []
      };

      const logEntry: OperationalLog = {
        id: 'LOG-' + Date.now(),
        timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
        performedBy: currentUser?.name || 'Staff Member',
        role: currentUser?.role || 'MENTOR',
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
      addedBy: currentUser?.name || 'Staff Member',
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
          performedBy: currentUser?.name || 'Staff Member',
          role: currentUser?.role || 'MENTOR',
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
          <p className="text-xs text-slate-500 mt-0.5">Role-based student visibility, Zoho Meeting automation, session notes, and follow-up assignments.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {zohoStatus.loading ? (
            <span className="text-xs text-slate-400 px-2">Checking Zoho...</span>
          ) : zohoStatus.connected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-semibold text-emerald-900 truncate max-w-[200px]" title={zohoStatus.zohoEmail || 'Connected'}>
                Zoho: {zohoStatus.zohoEmail || zohoStatus.zohoDisplayName || 'Connected'}
              </span>
              <button
                type="button"
                onClick={handleDisconnectZoho}
                title="Disconnect Zoho Meeting account"
                className="text-slate-500 hover:text-red-600 transition-colors pl-1 border-l border-emerald-200 flex items-center gap-1 font-medium"
              >
                <Unplug className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleConnectZoho}
              disabled={isConnectingZoho}
              className="text-xs border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold h-9 px-3"
            >
              {isConnectingZoho ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Connecting Zoho...
                </>
              ) : (
                <>
                  <Video className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                  Connect Zoho Meeting
                </>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => navigate('/team/capacity-scheduler')}
            className="text-xs border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-800 px-3.5 py-2 rounded-lg font-semibold h-9 whitespace-nowrap shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4 mr-1.5 text-indigo-600" />
            Capacity Scheduler
          </Button>
          <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-lg font-semibold shadow-sm h-9 whitespace-nowrap shrink-0">
            <Plus className="w-4 h-4 mr-1.5" /> Schedule Class
          </Button>
        </div>
      </div>

      {/* ZOHO STATUS / CALLBACK BANNER */}
      {zohoBanner && (
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-xs flex items-start justify-between gap-3",
            zohoBanner.type === 'success'
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : zohoBanner.type === 'error'
              ? "bg-red-50 border-red-200 text-red-900"
              : "bg-slate-50 border-slate-200 text-slate-700"
          )}
        >
          <div className="space-y-1">
            <p className="font-semibold">{zohoBanner.message}</p>
            {zohoBanner.type === 'error' && zohoStatus.redirectUri && (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <p className="text-[11px] opacity-85 font-mono break-all">
                  Redirect Callback URL: {zohoStatus.redirectUri}
                </p>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(zohoStatus.redirectUri || '').catch(() => {})}
                  className="px-2 py-0.5 rounded bg-white/80 border border-red-200 text-[10px] font-semibold hover:bg-white"
                >
                  Copy URI
                </button>
              </div>
            )}
          </div>
          <button onClick={() => setZohoBanner(null)} className="opacity-60 hover:opacity-100 p-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
                       No students are assigned to your staff role ({currentUser?.role || 'Staff'}). Contact Admin to assign students.
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

              {/* Schedule Type Selection (Single vs Recurring Range) */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Session Frequency & Type</label>
                <div className="bg-slate-100/80 p-1 rounded-xl flex items-center gap-1 border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setScheduleMode('single')}
                    className={cn(
                      "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                      scheduleMode === 'single' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    <Calendar className="w-3.5 h-3.5" /> Single Session
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleMode('recurring')}
                    className={cn(
                      "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                      scheduleMode === 'recurring' ? "bg-white text-indigo-700 shadow-sm border border-indigo-100" : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    <Repeat className="w-3.5 h-3.5 text-indigo-600" /> Recurring Series (Date Range & Days)
                  </button>
                </div>
              </div>

              {/* Date & Times Configuration */}
              {scheduleMode === 'single' ? (
                /* SINGLE SESSION DATE INPUTS */
                <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 block">Date *</label>
                      <input 
                        type="date" 
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium tabular-nums" 
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 block">Start Time *</label>
                      <input 
                        type="time" 
                        value={formData.startTime}
                        onChange={(e) => {
                          const nextStart = e.target.value;
                          const nextEnd = computeEndTimeFromDuration(nextStart, formData.durationMinutes || 60);
                          setFormData({ ...formData, startTime: nextStart, endTime: nextEnd });
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium tabular-nums" 
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 block">End Time</label>
                      <input 
                        type="time" 
                        value={formData.endTime}
                        onChange={(e) => {
                          const nextEnd = e.target.value;
                          setFormData({
                            ...formData,
                            endTime: nextEnd,
                            durationMinutes: computeDurationMinutes(formData.startTime, nextEnd),
                          });
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium tabular-nums" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 block">Duration</label>
                      <div className="flex flex-wrap gap-1.5">
                        {[30, 45, 60, 90, 120].map(mins => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => setFormData(p => ({
                              ...p,
                              durationMinutes: mins,
                              endTime: computeEndTimeFromDuration(p.startTime, mins),
                            }))}
                            className={cn(
                              "px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors tabular-nums",
                              formData.durationMinutes === mins
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                            )}
                          >
                            {mins}m
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 block">Timezone</label>
                      <select
                        value={formData.timezone}
                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                      >
                        {TIMEZONE_OPTIONS.map(tz => (
                          <option key={tz} value={tz}>{tz}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                /* RECURRING DATE RANGE & DAYS OF WEEK CONFIGURATION */
                <div className="space-y-4 bg-indigo-50/40 p-4 rounded-xl border border-indigo-100/80">
                  {/* Date Range: From Date to To Date */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-indigo-600" /> Date Range (From Date to Date) *
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, endDate: addMonthsToDateString(p.startDate || todayStr, 1) }))}
                          className="px-2 py-0.5 text-[10px] font-bold bg-white text-indigo-700 hover:bg-indigo-50 rounded border border-indigo-200"
                        >
                          +1 Mo
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, endDate: addMonthsToDateString(p.startDate || todayStr, 2) }))}
                          className="px-2 py-0.5 text-[10px] font-bold bg-white text-indigo-700 hover:bg-indigo-50 rounded border border-indigo-200"
                        >
                          +2 Mo
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, endDate: addMonthsToDateString(p.startDate || todayStr, 3) }))}
                          className="px-2 py-0.5 text-[10px] font-bold bg-white text-indigo-700 hover:bg-indigo-50 rounded border border-indigo-200"
                        >
                          +3 Mo
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold mb-1 block">From Start Date</span>
                        <input 
                          type="date" 
                          value={formData.startDate}
                          onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                          className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800" 
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold mb-1 block">To End Date</span>
                        <input 
                          type="date" 
                          value={formData.endDate}
                          min={formData.startDate}
                          onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                          className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Days of the Week Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider">
                        Days of the Week *
                      </label>
                      <div className="flex items-center gap-1">
                        {SCHEDULE_DAY_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setFormData(p => ({ ...p, selectedDays: preset.days }))}
                            className={cn(
                              "px-2 py-0.5 text-[10px] font-semibold rounded border transition-colors",
                              JSON.stringify(formData.selectedDays.slice().sort()) === JSON.stringify(preset.days.slice().sort())
                                ? "bg-indigo-600 text-white border-indigo-600 font-bold"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            )}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                      {DAY_OF_WEEK_OPTIONS.map((day) => {
                        const isSelected = formData.selectedDays.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => {
                              setFormData(p => {
                                const exists = p.selectedDays.includes(day.value);
                                const nextDays = exists 
                                  ? p.selectedDays.filter(d => d !== day.value)
                                  : [...p.selectedDays, day.value].sort();
                                return { ...p, selectedDays: nextDays };
                              });
                            }}
                            className={cn(
                              "py-2 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center border",
                              isSelected
                                ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                                : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
                            )}
                          >
                            <span>{day.short}</span>
                            <span className="text-[9px] font-normal opacity-80 mt-0.5">{isSelected ? '✓' : '+'}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Range & Duration */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider mb-1 block">Class Start Time *</label>
                      <input 
                        type="time" 
                        value={formData.startTime}
                        onChange={(e) => {
                          const nextStart = e.target.value;
                          const nextEnd = computeEndTimeFromDuration(nextStart, formData.durationMinutes || 60);
                          setFormData({ ...formData, startTime: nextStart, endTime: nextEnd });
                        }}
                        className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-2 text-xs font-medium tabular-nums" 
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider mb-1 block">Class End Time</label>
                      <input 
                        type="time" 
                        value={formData.endTime}
                        onChange={(e) => {
                          const nextEnd = e.target.value;
                          setFormData({
                            ...formData,
                            endTime: nextEnd,
                            durationMinutes: computeDurationMinutes(formData.startTime, nextEnd),
                          });
                        }}
                        className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-2 text-xs font-medium tabular-nums" 
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider mb-1 block">Timezone</label>
                      <select
                        value={formData.timezone}
                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                        className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-800"
                      >
                        {TIMEZONE_OPTIONS.map(tz => (
                          <option key={tz} value={tz}>{tz}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider mr-1">Duration:</span>
                    {[30, 45, 60, 90, 120].map(mins => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setFormData(p => ({
                          ...p,
                          durationMinutes: mins,
                          endTime: computeEndTimeFromDuration(p.startTime, mins),
                        }))}
                        className={cn(
                          "px-2.5 py-0.5 rounded text-[10px] font-bold border transition-colors tabular-nums",
                          formData.durationMinutes === mins
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-slate-600 border-indigo-200 hover:bg-indigo-50"
                        )}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>

                  {/* Numbering Option */}
                  <div className="flex items-center gap-2 pt-1">
                    <input 
                      type="checkbox" 
                      id="titleNumbering"
                      checked={formData.titleNumbering}
                      onChange={(e) => setFormData(p => ({ ...p, titleNumbering: e.target.checked }))}
                      className="accent-indigo-600 w-4 h-4 rounded"
                    />
                    <label htmlFor="titleNumbering" className="text-xs text-slate-700 font-medium cursor-pointer">
                      Auto-number session titles (e.g. <em>{formData.title || 'Session'} • Lecture #1, #2...</em>)
                    </label>
                  </div>

                  {/* Live Recurring Calculation Card */}
                  {(() => {
                    const occurrences = generateRecurringDates(formData.startDate, formData.endDate, formData.selectedDays);
                    const scheduleSummary = formatScheduleSummary(formData.selectedDays, formData.startTime, formData.endTime);
                    return (
                      <div className="bg-white rounded-xl p-3 border border-indigo-200 shadow-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-indigo-600" />
                            <span className="font-bold text-slate-900 text-xs">Series Schedule Preview</span>
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[11px] font-bold",
                            occurrences.length > 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          )}>
                            {occurrences.length} Sessions Total
                          </span>
                        </div>

                        <p className="text-xs text-indigo-900 font-semibold">{scheduleSummary}</p>
                        <p className="text-[11px] text-slate-500">
                          Date Range: <strong>{formatPreviewDate(formData.startDate)}</strong> to <strong>{formatPreviewDate(formData.endDate)}</strong>
                        </p>

                        {/* Interactive preview pills */}
                        {occurrences.length > 0 && (
                          <div className="pt-1 border-t border-slate-100">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mb-1.5">
                              <span>Generated Class Dates:</span>
                              {occurrences.length > 6 && (
                                <button
                                  type="button"
                                  onClick={() => setShowAllPreviewDates(!showAllPreviewDates)}
                                  className="text-indigo-600 font-bold hover:underline"
                                >
                                  {showAllPreviewDates ? 'Show Less' : `View All ${occurrences.length}`}
                                </button>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                              {(showAllPreviewDates ? occurrences : occurrences.slice(0, 6)).map((d, i) => (
                                <span key={d} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono border border-slate-200">
                                  #{i + 1}: {formatPreviewDate(d)}
                                </span>
                              ))}
                              {!showAllPreviewDates && occurrences.length > 6 && (
                                <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                                  +{occurrences.length - 6} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Video Conferencing Mode (Auto-create Zoho Meeting vs Manual Link) */}
              <div className="space-y-3 rounded-xl border border-slate-200 p-3.5 bg-slate-50/50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Video Conferencing
                  </label>
                  <div className="flex bg-slate-200/70 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => { setVideoMode('zoho'); setModalError(null); }}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1",
                        videoMode === 'zoho' ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      <Video className="w-3 h-3" /> Auto-create Zoho Meeting
                    </button>
                    <button
                      type="button"
                      onClick={() => { setVideoMode('manual'); setModalError(null); }}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all",
                        videoMode === 'manual' ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      Manual Video Link
                    </button>
                  </div>
                </div>

                {videoMode === 'zoho' ? (
                  <div className="space-y-2.5">
                    {zohoStatus.connected ? (
                      <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Host Zoho Account: <span className="font-bold">{zohoStatus.zohoEmail || zohoStatus.zohoDisplayName}</span>
                          </span>
                          <span className="text-slate-500 tabular-nums">
                            {formData.durationMinutes || 60} min • {formData.timezone}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          {scheduleMode === 'recurring'
                            ? 'One persistent Zoho Meeting will be created automatically and applied across every session in this recurring series.'
                            : 'A dedicated Zoho Meeting room will be created automatically with your selected date, time, duration, and agenda.'}
                        </p>

                        {/* Participant Emails Preview */}
                        <div className="pt-2 border-t border-slate-100 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-blue-600" />
                              Zoho Participant Invites ({participantResolution.emails.length})
                            </span>
                            {participantResolution.missingNames.length > 0 && (
                              <span className="text-amber-700 font-medium">
                                {participantResolution.missingNames.length} missing email
                              </span>
                            )}
                          </div>
                          {participantResolution.emails.length > 0 ? (
                            <p className="text-[11px] text-slate-500 font-mono break-all">
                              {participantResolution.emails.join(', ')}
                            </p>
                          ) : (
                            <p className="text-[11px] text-amber-700">
                              No valid student email found for the selected target. Meeting will still be created without email invites.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <p className="font-bold text-amber-950 text-xs">Your Zoho Meeting account is not connected</p>
                          <p className="text-[11px] text-amber-800">
                            Connect your Zoho account once to auto-create Zoho Meetings, or switch to Manual Video Link.
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleConnectZoho}
                          disabled={isConnectingZoho}
                          className="bg-slate-900 hover:bg-slate-800 text-white text-xs shrink-0 h-8 px-3"
                        >
                          {isConnectingZoho ? 'Connecting...' : 'Connect Zoho Now'}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                        Google Meet / Zoom URL (Persistent Link)
                      </label>
                      <span className="text-[10px] text-indigo-600 font-medium">Same meeting for all sessions</span>
                    </div>
                    <input 
                      type="text" 
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800" 
                      placeholder="https://meet.google.com/..."
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Students and mentors will join using this exact meeting link for every session in this series.
                    </p>
                  </div>
                )}
              </div>

              {/* Pre-Read Notes */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Pre-Read Agenda / Notes for Students (Synced to Zoho Agenda)</label>
                <textarea 
                  rows={2} 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs resize-none" 
                  placeholder="Items students should review prior to call..."
                ></textarea>
              </div>

              {modalError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}
            </div>
            
            <div className="px-6 py-3 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 shrink-0">
              <Button variant="ghost" size="sm" onClick={handleCloseModal} disabled={isCreatingZohoMeeting} className="text-xs">Cancel</Button>
              <Button size="sm" disabled={isCreatingZohoMeeting} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4" onClick={handlePublish}>
                {isCreatingZohoMeeting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Creating Zoho Meeting...
                  </>
                ) : editingEventId ? 'Save Changes' : (scheduleMode === 'recurring' ? 'Create Recurring Series' : 'Schedule Session')}
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
                  {evt.isRecurring && (
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-bold uppercase tracking-wider border border-purple-200 flex items-center gap-1">
                      <Repeat className="w-3 h-3 text-purple-600" /> Session #{evt.sessionNumber || 1} of {evt.totalSessionsInSeries || '?'}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    inPast ? 'bg-slate-100 text-slate-700' : evt.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {inPast ? 'Past / Completed' : (evt.status || 'Scheduled')}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">{evt.day || evt.date} • {evt.time}</span>
                </div>

                <h4 className="text-base font-bold text-slate-900">{evt.title}</h4>

                {evt.recurrenceRule && (
                  <p className="text-[11px] text-purple-700 font-medium flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-purple-500" />
                    <span>Series: {evt.recurrenceRule}</span>
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <strong>Student / Target:</strong> {evt.students}
                  </span>
                  <span>• <strong>Host:</strong> {evt.host || 'Staff'}</span>
                  {evt.videoProvider === 'zoho' && (
                    <span className="text-blue-700 font-semibold flex items-center gap-1">
                      • <Video className="w-3.5 h-3.5" /> Zoho Meeting
                      {Array.isArray(evt.participantEmails) && evt.participantEmails.length > 0 && (
                        <span className="text-slate-500 font-normal">({evt.participantEmails.length} invited)</span>
                      )}
                    </span>
                  )}
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
                ) : (() => {
                  const rawHostOrJoin = evt.hostStartLink || evt.location || evt.link;
                  const joinHref = evt.location || evt.link;
                  const normalizedHref = rawHostOrJoin
                    ? (rawHostOrJoin.startsWith('http') ? rawHostOrJoin : `https://${rawHostOrJoin}`)
                    : '';
                  return normalizedHref ? (
                    <div className="flex items-center gap-1.5">
                      <a
                        href={normalizedHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-3 font-medium transition-colors"
                      >
                        <Video className="w-3.5 h-3.5 mr-1.5" />
                        {evt.hostStartLink ? 'Host Zoho Call' : 'Join Call'}
                      </a>
                      {joinHref && (
                        <button
                          type="button"
                          title="Copy participant join link"
                          onClick={() => {
                            const fullJoin = joinHref.startsWith('http') ? joinHref : `https://${joinHref}`;
                            navigator.clipboard?.writeText(fullJoin).catch(() => {});
                            setCopiedEventId(evt.id);
                            window.setTimeout(() => setCopiedEventId(prev => (prev === evt.id ? null : prev)), 2000);
                          }}
                          className="h-8 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs flex items-center gap-1"
                        >
                          {copiedEventId === evt.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 px-2">No link</span>
                  );
                })()}

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

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" 
                  onClick={() => handleDeleteClick(evt)}
                  title={evt.seriesId ? "Delete Session or Series" : "Delete Session"}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
          })
        )}
      </div>

      {/* RECURRING SERIES DELETE CONFIRMATION MODAL */}
      {eventToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-red-50/50">
              <div className="flex items-center gap-2 text-red-600 font-bold">
                <AlertCircle className="w-5 h-5" />
                <span>Delete Recurring Session</span>
              </div>
              <button onClick={() => setEventToDelete(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-800 text-sm">
                "{eventToDelete.title}"
              </p>
              <p>
                This meeting is part of a recurring series (Session #{eventToDelete.sessionNumber || 1} of {eventToDelete.totalSessionsInSeries || 'multiple'}).
              </p>
              <p className="text-slate-500">
                Would you like to delete only this individual session on <strong>{eventToDelete.day || eventToDelete.date}</strong>, or delete all sessions in this recurring series?
              </p>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={handleDeleteSingleSession}
                className="w-full text-slate-700 border-slate-300 hover:bg-slate-100 text-xs font-semibold"
              >
                Delete Only This Session ({eventToDelete.day || eventToDelete.date})
              </Button>
              <Button
                onClick={handleDeleteEntireSeries}
                className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                Delete Entire Series (All {eventToDelete.totalSessionsInSeries || ''} Sessions)
              </Button>
              <Button
                variant="ghost"
                onClick={() => setEventToDelete(null)}
                className="w-full text-xs text-slate-500"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* POST-SESSION ACTIONS MODAL */}
      {activeSessionModalEvt && canStaffAccessEvent(activeSessionModalEvt, currentUser, students, batches, permissionsMatrix) && (
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
                          <a
                            href={r.url.startsWith('http') ? r.url : `https://${r.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 px-3 text-xs font-medium h-7 text-slate-700"
                          >
                            Open Link
                          </a>
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
