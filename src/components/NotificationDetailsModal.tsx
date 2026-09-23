import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  X, 
  Bell, 
  Calendar, 
  Clock, 
  CheckSquare, 
  Video, 
  ExternalLink, 
  User, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  BookOpen,
  ArrowRight,
  GraduationCap,
  Users,
  Timer,
  Layers,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export interface NotificationDetailData {
  id: string;
  title: string;
  message: string;
  timestamp?: string;
  time?: string;
  type?: string;
  category?: 'TASK' | 'DEADLINE' | 'UNIVERSITY' | 'BATCH' | 'LECTURE' | 'NOTE' | 'ESSAY' | 'DOCUMENT' | string;
  isRead?: boolean;
  read?: boolean;
  performedBy?: string;
  source?: string;
  link?: string;
  actionText?: string;
  meeting?: any;
  task?: any;
  log?: any;
  doc?: any;
  essay?: any;
  university?: any;
  deadlineInfo?: {
    uni?: any;
    daysLeft?: number;
    deadline?: string;
    round?: string;
  };
  batch?: any;
  note?: any;
  metadata?: any;
}

interface NotificationDetailsModalProps {
  notification: NotificationDetailData | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleRead?: (id: string) => void;
  onNavigate?: (link: string) => void;
}

export default function NotificationDetailsModal({
  notification,
  isOpen,
  onClose,
  onToggleRead,
  onNavigate
}: NotificationDetailsModalProps) {
  const navigate = useNavigate();

  if (!isOpen || !notification) return null;

  const isReadState = notification.read ?? notification.isRead ?? false;
  const timeDisplay = notification.timestamp || notification.time || 'Recently';
  const categoryType = (notification.category || notification.type || 'SYSTEM').toUpperCase();
  
  const handlePrimaryAction = () => {
    if (notification.link) {
      if (onNavigate) {
        onNavigate(notification.link);
      } else {
        navigate(notification.link);
      }
      onClose();
    } else if (notification.meeting?.location) {
      window.open(notification.meeting.location, '_blank');
    } else if (notification.batch?.meetingLink) {
      window.open(notification.batch.meetingLink, '_blank');
    } else {
      onClose();
    }
  };

  const isDeadline = categoryType.includes('DEADLINE') || !!notification.deadlineInfo;
  const isUrgent = categoryType.includes('URGENT') || isDeadline;
  const isMeeting = categoryType.includes('MEET') || categoryType.includes('LECTURE') || !!notification.meeting;
  const isBatch = categoryType.includes('BATCH') || !!notification.batch;
  const isTask = categoryType.includes('TASK') || !!notification.task;
  const isUni = categoryType.includes('UNIVERSITY') || !!notification.university;
  const isCounselor = categoryType.includes('COUNSELOR') || categoryType.includes('NOTE') || !!notification.log;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200/90 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Type Ribbon */}
        <div className={cn(
          "p-6 text-white flex justify-between items-start shrink-0 relative overflow-hidden",
          isDeadline ? "bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700" :
          isUrgent ? "bg-gradient-to-r from-rose-600 to-rose-700" :
          isBatch ? "bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800" :
          isUni ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700" :
          isMeeting ? "bg-gradient-to-r from-blue-600 to-indigo-700" :
          isCounselor ? "bg-gradient-to-r from-purple-600 to-indigo-700" :
          isTask ? "bg-gradient-to-r from-amber-600 to-orange-700" :
          "bg-gradient-to-r from-slate-900 to-indigo-950"
        )}>
          {/* Subtle background glow */}
          <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />

          <div className="space-y-1.5 relative z-10 pr-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-xs border border-white/20">
                {isDeadline ? 'Application Deadline' : 
                 isBatch ? 'Batch Enrolled' : 
                 isUni ? 'University Shortlist' : 
                 isMeeting ? 'Lecture Schedule' : 
                 isTask ? 'Assigned Task' : categoryType}
              </span>
              <span className="text-xs text-white/80 flex items-center gap-1 font-medium">
                <Clock className="w-3 h-3" /> {timeDisplay}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight leading-snug">
              {notification.title}
            </h3>
          </div>

          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors shrink-0 relative z-10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm flex-1">
          {/* Sender / Advisor Attribution */}
          {(notification.performedBy || notification.source) && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Posted / Assigned By</span>
                <span className="text-xs font-bold text-slate-900 block truncate">
                  {notification.performedBy || notification.source}
                </span>
              </div>
            </div>
          )}

          {/* Full Notification Message */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Notice Details</h4>
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-medium">
              {notification.message}
            </div>
          </div>

          {/* APPLICATION DEADLINE CONTEXT CARD */}
          {notification.deadlineInfo && (
            <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                  <Timer className="w-4 h-4 text-rose-600" /> Deadline Countdown
                </span>
                <span className="text-xs font-extrabold text-white bg-rose-600 px-2.5 py-0.5 rounded-full shadow-2xs">
                  {notification.deadlineInfo.daysLeft === 0 
                    ? 'Due Today!' 
                    : `${notification.deadlineInfo.daysLeft} Day(s) Left`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">University & Major</span>
                  <span className="font-bold text-slate-900">
                    {notification.deadlineInfo.uni?.name || 'Target University'}
                  </span>
                  <p className="text-[11px] text-slate-500">{notification.deadlineInfo.uni?.major || 'Application'}</p>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Application Round & Date</span>
                  <span className="font-bold text-rose-900">
                    {notification.deadlineInfo.round || notification.deadlineInfo.uni?.round || 'Regular Decision'}
                  </span>
                  <p className="text-[11px] text-slate-500">{notification.deadlineInfo.deadline || notification.deadlineInfo.uni?.deadline}</p>
                </div>
              </div>

              {notification.deadlineInfo.uni?.portalLink && (
                <div className="pt-2 border-t border-rose-200/60 flex items-center justify-between">
                  <span className="text-xs text-rose-900 font-medium truncate">
                    Submission Portal
                  </span>
                  <a 
                    href={notification.deadlineInfo.uni.portalLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded-lg transition-colors shadow-2xs"
                  >
                    Open Portal <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* UNIVERSITY SHORTLIST CONTEXT CARD */}
          {notification.university && !notification.deadlineInfo && (
            <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-emerald-600" /> University Details
                </span>
                <span className={cn(
                  "text-[10px] font-bold uppercase px-2 py-0.5 rounded-md",
                  notification.university.category === 'Reach' ? 'bg-purple-100 text-purple-800' :
                  notification.university.category === 'Target' ? 'bg-blue-100 text-blue-800' :
                  'bg-emerald-100 text-emerald-800'
                )}>
                  {notification.university.category || 'Target'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">University</span>
                  <span className="font-bold text-slate-900">{notification.university.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Major / Degree</span>
                  <span className="font-bold text-slate-900">{notification.university.major || 'Undergraduate'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Round</span>
                  <span className="font-semibold text-slate-700">{notification.university.round || 'Regular Decision'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Deadline</span>
                  <span className="font-semibold text-slate-700">{notification.university.deadline || 'Pending'}</span>
                </div>
              </div>
            </div>
          )}

          {/* BATCH ENROLLMENT CONTEXT CARD */}
          {notification.batch && (
            <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" /> Batch Enrollment Details
                </span>
                <span className="text-[10px] font-bold uppercase bg-indigo-200/80 text-indigo-900 px-2 py-0.5 rounded-md">
                  {notification.batch.subject || 'Cohort'}
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <p className="font-bold text-slate-900 text-sm">{notification.batch.name}</p>
                {notification.batch.description && (
                  <p className="text-slate-600 leading-relaxed text-xs">{notification.batch.description}</p>
                )}
                <div className="grid grid-cols-2 gap-2 pt-1 text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Schedule</span>
                    <span className="font-semibold">{notification.batch.scheduleDayTime || 'Weekly sessions'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Mentors / Faculty</span>
                    <span className="font-semibold">{(notification.batch.mentors || []).join(', ') || 'Assigned Faculty'}</span>
                  </div>
                </div>
              </div>
              {notification.batch.meetingLink && (
                <div className="pt-2 border-t border-indigo-200/60 flex items-center justify-between">
                  <span className="text-xs text-indigo-900 font-medium truncate">Classroom Link</span>
                  <a 
                    href={notification.batch.meetingLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors shadow-2xs"
                  >
                    Join Class <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* LECTURE / MEETING CONTEXT CARD */}
          {notification.meeting && (
            <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-blue-600" /> Lecture & Class Details
                </span>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                  {notification.meeting.stream || 'Live Lecture'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Scheduled Date & Time</span>
                  <span className="font-bold text-slate-900">{notification.meeting.date || notification.meeting.day} • {notification.meeting.time || 'TBD'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Educator / Host</span>
                  <span className="font-bold text-slate-900">{notification.meeting.host || 'Advisor'}</span>
                </div>
              </div>
              {notification.meeting.location && (
                <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between">
                  <span className="text-xs text-blue-900 font-medium truncate max-w-[280px]">
                    {notification.meeting.location}
                  </span>
                  <a 
                    href={notification.meeting.location} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors shadow-2xs"
                  >
                    Join Lecture <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* TASK CONTEXT CARD */}
          {notification.task && (
            <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-amber-600" /> Action Deliverable / Task
                </span>
                <span className={cn(
                  "text-[10px] font-bold uppercase px-2 py-0.5 rounded-md",
                  notification.task.stage === 'NEEDS_REVISION' ? 'bg-rose-200 text-rose-900' :
                  notification.task.stage === 'COMPLETED' ? 'bg-emerald-200 text-emerald-900' :
                  'bg-amber-200/80 text-amber-900'
                )}>
                  {notification.task.stage?.replace(/_/g, ' ') || 'Action Required'}
                </span>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-900 text-sm">{notification.task.name}</p>
                {notification.task.description && (
                  <p className="text-xs text-slate-600 leading-relaxed">{notification.task.description}</p>
                )}
              </div>
              {notification.task.dueDate && (
                <div className="pt-2 border-t border-amber-200/60 text-xs text-amber-900 font-semibold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Due Date: {notification.task.dueDate}
                </div>
              )}
            </div>
          )}

          {/* COUNSELOR NOTE CONTEXT CARD */}
          {notification.log && (
            <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-purple-600" /> Counselor Guidance Note
                </span>
                <span className="text-[10px] font-bold uppercase bg-purple-200/80 text-purple-900 px-2 py-0.5 rounded-md">
                  {notification.log.activityType || 'Advisory Note'}
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {notification.log.description}
              </p>
              {notification.log.performedBy && (
                <div className="pt-2 border-t border-purple-200/60 text-[11px] text-purple-900 font-semibold">
                  By {notification.log.performedBy} {notification.log.timestamp ? `• ${notification.log.timestamp}` : ''}
                </div>
              )}
            </div>
          )}

          {/* ESSAY CONTEXT CARD */}
          {notification.essay && (
            <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" /> Essay Review
                </span>
                <span className="text-[10px] font-bold uppercase bg-indigo-200/80 text-indigo-900 px-2 py-0.5 rounded-md">
                  {notification.essay.status || 'Draft'}
                </span>
              </div>
              <p className="font-bold text-xs text-slate-900">{notification.essay.title || notification.essay.university}</p>
              {notification.essay.feedback && (
                <p className="text-xs text-slate-600 italic">"{notification.essay.feedback}"</p>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div>
            {onToggleRead && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleRead(notification.id)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                {isReadState ? 'Mark as Unread' : 'Mark as Read'}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs font-bold"
            >
              Close
            </Button>

            {notification.link ? (
              <Button
                size="sm"
                onClick={handlePrimaryAction}
                className={cn(
                  "text-white text-xs font-bold gap-1.5 shadow-2xs",
                  isDeadline ? "bg-rose-600 hover:bg-rose-700" :
                  isBatch ? "bg-purple-600 hover:bg-purple-700" :
                  isUni ? "bg-emerald-600 hover:bg-emerald-700" :
                  "bg-indigo-600 hover:bg-indigo-700"
                )}
              >
                {notification.actionText || 'Go to Section'} <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
