import { useDatabase } from '@/context/DatabaseContext';
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar as CalendarIcon, 
  List, 
  Video, 
  FileText, 
  Upload, 
  MessageSquare, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlayCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface ScheduleItem {
  id: number;
  type: string;
  subType?: string;
  title: string;
  date: string;
  time: string;
  batch?: string;
  staff: { name: string; role: string; avatar: string };
  topic?: string;
  agenda?: string;
  meetingReady?: boolean;
  notes?: string;
  milestone?: string;
  progress?: number;
  workspace?: string;
  status?: string;
  recording?: boolean;
  assignments?: string;
}

// Mock Data
const upcomingClasses: ScheduleItem[] = [
  {
    id: 1,
    type: 'Counselling',
    title: 'College Shortlisting & Strategy',
    date: 'Today',
    time: '4:00 PM - 5:00 PM',
    staff: { name: 'Sarah Jenkins', role: 'Lead Counselor', avatar: 'SJ' },
    topic: 'Finalizing ED/EA Choices',
    meetingReady: true,
    notes: 'Please review the attached spreadsheet before our call.',
    assignments: 'Complete the college preferences survey before the meeting.',
  },
  {
    id: 2,
    type: 'SAT Prep',
    subType: 'Maths Class',
    title: 'Advanced Algebra & Functions',
    date: 'Tomorrow',
    time: '5:30 PM - 7:30 PM',
    batch: 'SAT-Spring-2026',
    notes: 'Review the concepts from Chapter 2 and 3.',
    assignments: 'Complete Practice Questions 1-20 on page 45.',
    staff: { name: 'David Chen', role: 'Math Faculty', avatar: 'DC' },
    agenda: 'Practice Set 4 - Digital SAT Question Bank',
    meetingReady: false,
  },
  {
    id: 3,
    type: 'Research Mentoring',
    title: 'Literature Review Finalization',
    date: 'Oct 24, 2026',
    time: '10:00 AM - 11:00 AM',
    staff: { name: 'Dr. Elena Rostova', role: 'Research Mentor, MIT', avatar: 'ER' },
    milestone: 'Literature Review',
    progress: 75,
    workspace: 'https://notion.so/workspace',
  }
];

const pastClasses: ScheduleItem[] = [
  {
    id: 4,
    type: 'SAT Prep',
    subType: 'Verbal Class',
    title: 'Reading Comprehension Strategies',
    date: 'Oct 18, 2026',
    time: '5:30 PM - 7:30 PM',
    batch: 'SAT-Spring-2026',
    staff: { name: 'Amanda Clarke', role: 'Verbal Faculty', avatar: 'AC' },
    status: 'Attended',
    recording: true,
  }
];

export default function StudentSchedule() {
  const { currentUser, events, batches } = useDatabase();
  const student = currentUser as any;

  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [horizon, setHorizon] = useState<'upcoming' | 'past' | 'canceled'>('upcoming');
  const [activeStream, setActiveStream] = useState('All Streams');
  
  const streams = ['All Streams', 'Counselling', 'SAT Prep', 'Research Mentoring'];

  // Calculate actual events for this student
  const studentBatches = batches.filter(b => b.students?.includes(student?.id) || b.students?.includes(student?.name));
  
  const formattedEvents = events.map((e: any) => ({
    ...e,
    id: e.id,
    type: e.stream || e.type || 'Counselling',
    title: e.title || 'Scheduled Session',
    date: e.day || e.date || 'Today',
    time: e.time || '4:00 PM - 5:00 PM',
    staff: e.staff || { name: e.host || 'Counselor', role: 'Counselor', avatar: (e.host || 'CU').slice(0, 2).toUpperCase() },
    meetingReady: true,
    link: e.location || e.link || 'https://meet.google.com',
    location: e.location || e.link || 'https://meet.google.com'
  }));

  const allClasses = formattedEvents.length > 0 ? formattedEvents : upcomingClasses.map(c => ({ ...c, link: 'https://meet.google.com', location: 'https://meet.google.com' }));

  const upcomingClassesFiltered = allClasses.filter(e => e.status !== 'Completed' && e.status !== 'Canceled');
  const pastClassesFiltered = allClasses.filter(e => e.status === 'Completed');
  const canceledClassesFiltered = allClasses.filter(e => e.status === 'Canceled');

  const displayedClasses = horizon === 'upcoming' ? upcomingClassesFiltered : (horizon === 'past' ? pastClassesFiltered : canceledClassesFiltered);

  const filteredClasses = displayedClasses.filter(c => activeStream === 'All Streams' || c.type === activeStream);

  if (allClasses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <CalendarIcon className="h-8 w-8 text-slate-400" />
        </div>
        <h2 className="text-2xl font-semibold text-slate-800">No Schedule Available</h2>
        <p className="text-slate-500 max-w-md">
          You don't have any classes or meetings scheduled yet. Check back later once your counselor assigns them.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Top Controls */}
      <div className="flex flex-col gap-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Horizon Tabs */}
          <div className="flex bg-slate-100/50 p-1 rounded-xl">
            {['upcoming', 'past', 'canceled'].map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h as any)}
                className={cn(
                  "px-6 py-2 rounded-lg text-sm font-semibold capitalize transition-all",
                  horizon === h ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {h}
              </button>
            ))}
          </div>

          {/* Date Range & View Switcher */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900"><ChevronLeft className="w-4 h-4" /></Button>
              <span className="text-sm font-semibold text-slate-700 px-2">October 2026</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900"><ChevronRight className="w-4 h-4" /></Button>
            </div>
            
            <div className="flex bg-slate-100/50 p-1 rounded-xl">
              <button
                onClick={() => setView('list')}
                className={cn("p-2 rounded-lg transition-all", view === 'list' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('calendar')}
                className={cn("p-2 rounded-lg transition-all", view === 'calendar' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
              >
                <CalendarIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Stream Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {streams.map(stream => (
            <button
              key={stream}
              onClick={() => setActiveStream(stream)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold transition-all border",
                activeStream === stream 
                  ? "bg-slate-900 text-white border-slate-900" 
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              {stream}
            </button>
          ))}
        </div>
      </div>

      {/* Schedule List */}
      <div className="space-y-6">
        {filteredClasses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 border-dashed">
            <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">No classes found</h3>
            <p className="text-slate-500 text-sm">You don't have any {horizon} sessions for the selected filters.</p>
          </div>
        ) : (
          filteredClasses.map((cls) => (
            <div key={cls.id} className="flex flex-col md:flex-row gap-6 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 relative overflow-hidden">
              {/* Left sidebar time indicator */}
              <div className="md:w-48 flex-shrink-0 flex flex-col md:border-r border-slate-100 pr-6">
                 <span className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2">{cls.date}</span>
                 <span className="text-slate-900 font-bold text-lg">{cls.time.split(' - ')[0]}</span>
                 <span className="text-slate-400 text-sm">{cls.time.split(' - ')[1]}</span>
              </div>

              {/* Main Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn(
                        "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                        cls.type === 'Counselling' && "bg-blue-50 text-blue-700",
                        cls.type === 'SAT Prep' && "bg-amber-50 text-amber-700",
                        cls.type === 'Research Mentoring' && "bg-purple-50 text-purple-700"
                      )}>
                        {cls.type}
                      </span>
                      {cls.subType && (
                         <span className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                           {cls.subType}
                         </span>
                      )}
                      {cls.batch && (
                         <span className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-slate-200 text-slate-500">
                           {cls.batch}
                         </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 truncate">{cls.title}</h3>
                  </div>
                  
                  {/* Action Buttons */}
                  {horizon === 'upcoming' && (
                    <div className="flex gap-2">
                      {cls.type === 'Counselling' && (
                        <Button variant="outline" size="sm" className="bg-white border-slate-200 text-slate-600 hover:text-red-600">
                          Reschedule
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        onClick={() => {
                          const meetingUrl = cls.location || cls.link || 'https://meet.google.com';
                          window.open(meetingUrl.startsWith('http') ? meetingUrl : `https://${meetingUrl}`, '_blank');
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Join Meeting
                      </Button>
                    </div>
                  )}
                  {horizon === 'past' && cls.recording && (
                    <Button variant="outline" size="sm" className="bg-white border-slate-200 text-slate-600">
                      <PlayCircle className="w-4 h-4 mr-2" /> Watch Recording
                    </Button>
                  )}
                </div>

                {/* Body Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-2xl">
                  
                  {/* Left Col: Staff & Info */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-500">
                        {cls.staff.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{cls.staff.name}</p>
                        <p className="text-xs text-slate-500">{cls.staff.role}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 text-blue-600"><MessageSquare className="w-4 h-4" /></Button>
                    </div>

                    {cls.type === 'Research Mentoring' && (
                      <div>
                         <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Milestone Progress</p>
                         <p className="text-sm font-semibold text-slate-900 mb-2">{cls.milestone}</p>
                         <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                           <div className="bg-purple-500 h-full rounded-full" style={{ width: `${cls.progress}%` }}></div>
                         </div>
                      </div>
                    )}
                  </div>

                  {/* Right Col: Agendas & Files */}
                  <div className="space-y-3">
                    {cls.topic && (
                      <div>
                         <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Session Topic</p>
                         <p className="text-sm font-medium text-slate-700">{cls.topic}</p>
                      </div>
                    )}
                    {cls.agenda && (
                      <div>
                         <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Agenda & Pre-reads</p>
                         <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                            <FileText className="w-4 h-4 text-blue-500" />
                            <span className="text-xs font-medium text-slate-700 truncate">{cls.agenda}</span>
                         </div>
                      </div>
                    )}
                    {cls.workspace && (
                      <div>
                         <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Shared Workspace</p>
                         <a href="#" className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline">
                            <ExternalLink className="w-4 h-4" /> Open Notion Board
                         </a>
                      </div>
                    )}
                    {horizon === 'upcoming' && cls.type === 'Counselling' && (
                      <div>
                         <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Deliverables</p>
                         <div className="flex items-center gap-2 p-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:bg-white cursor-pointer">
                           <Upload className="w-4 h-4" />
                           <span className="text-xs font-medium">Upload drafts (.pdf, .docx)</span>
                         </div>
                      </div>
                    )}
                    {horizon === 'past' && cls.status && (
                       <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status</p>
                          <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-sm">
                            <CheckCircle2 className="w-4 h-4" /> {cls.status}
                          </div>
                       </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
