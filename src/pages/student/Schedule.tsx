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
  PlayCircle,
  Star,
  Link as LinkIcon,
  ClipboardList,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SessionRating } from '@/types';

export default function StudentSchedule() {
  const { currentUser, events, setEvents, batches } = useDatabase();
  const student = currentUser as any;

  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [horizon, setHorizon] = useState<'upcoming' | 'past' | 'canceled'>('upcoming');
  const [activeStream, setActiveStream] = useState('All Streams');

  // Rating modal/state
  const [ratingEventId, setRatingEventId] = useState<string | null>(null);
  const [selectedMeetingModal, setSelectedMeetingModal] = useState<any | null>(null);
  const [starCount, setStarCount] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState<string>('');
  
  const streams = ['All Streams', 'Counselling (1-on-1)', 'SAT Prep', 'Research Mentoring'];

  // Match events relevant to this student
  const studentBatches = batches.filter(b => b.students?.includes(student?.id) || b.students?.includes(student?.name));
  const studentBatchNames = studentBatches.map(b => b.name);

  const studentEvents = events.filter((e: any) => {
    if (e.studentId && e.studentId === student.id) return true;
    if (e.students && (e.students.toLowerCase().includes(student.name?.toLowerCase() || '') || e.students === 'All')) return true;
    if (e.batch && studentBatchNames.includes(e.batch)) return true;
    return true; // Default show relevant calendar items
  });

  const formattedEvents = studentEvents.map((e: any) => ({
    ...e,
    id: e.id,
    type: e.stream || e.type || 'Counselling (1-on-1)',
    title: e.title || 'Scheduled Session',
    date: e.day || e.date || 'Today',
    time: e.time || '4:00 PM - 5:00 PM',
    staff: e.host ? { name: e.host, role: 'Mentor', avatar: e.host.slice(0, 2).toUpperCase() } : { name: 'Staff Counselor', role: 'Counselor', avatar: 'SC' },
    link: e.location || e.link || 'https://meet.google.com',
    location: e.location || e.link || 'https://meet.google.com'
  }));

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

  const upcomingClassesFiltered = formattedEvents.filter(e => !isEventInPast(e) && e.status !== 'Canceled');
  const pastClassesFiltered = formattedEvents.filter(e => isEventInPast(e));
  const canceledClassesFiltered = formattedEvents.filter(e => e.status === 'Canceled');

  const displayedClasses = horizon === 'upcoming' ? upcomingClassesFiltered : (horizon === 'past' ? pastClassesFiltered : canceledClassesFiltered);
  const filteredClasses = displayedClasses.filter(c => activeStream === 'All Streams' || c.type === activeStream);

  // Calendar View State & Month calculations
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const formatYMD = (y: number, m: number, d: number) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const todayYMD = new Date().toISOString().split('T')[0];

  const getEventsForDate = (dateStr: string) => {
    return filteredClasses.filter((cls) => {
      if (cls.date === dateStr) return true;
      if (cls.date === 'Today' && dateStr === todayYMD) return true;
      try {
        const clsD = new Date(cls.date);
        if (!isNaN(clsD.getTime())) {
          const formatted = clsD.toISOString().split('T')[0];
          return formatted === dateStr;
        }
      } catch (e) {}
      return false;
    });
  };

  const handleSaveRating = () => {
    if (!ratingEventId) return;
    const newRating: SessionRating = {
      id: 'RAT-' + Date.now(),
      userId: student.id || 'STD',
      userName: student.name || 'Student',
      userRole: 'STUDENT',
      rating: starCount,
      comment: ratingComment,
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };

    const updatedEvents = events.map((e: any) => {
      if (e.id === ratingEventId) {
        return {
          ...e,
          ratings: [newRating, ...(e.ratings || []).filter((r: any) => r.userId !== student.id)]
        };
      }
      return e;
    });

    setEvents(updatedEvents);
    setRatingEventId(null);
    setRatingComment('');
    alert('Thank you! Your feedback and star rating have been submitted.');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Controls */}
      <div className="flex flex-col gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Horizon Tabs */}
          <div className="flex bg-slate-100/70 p-1 rounded-xl">
            {['upcoming', 'past', 'canceled'].map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h as any)}
                className={cn(
                  "px-5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all",
                  horizon === h ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                {h}
              </button>
            ))}
          </div>

          {/* View Switcher */}
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100/70 p-1 rounded-xl">
              <button
                onClick={() => setView('list')}
                className={cn("p-1.5 rounded-lg transition-all", view === 'list' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('calendar')}
                className={cn("p-1.5 rounded-lg transition-all", view === 'calendar' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
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
                "px-3 py-1 rounded-full text-xs font-semibold transition-all border",
                activeStream === stream 
                  ? "bg-slate-900 text-white border-slate-900" 
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              {stream}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar or List View */}
      {view === 'calendar' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
          {/* Month Nav Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={prevMonth} className="h-8 w-8 p-0">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={nextMonth} className="h-8 w-8 p-0">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday} className="h-8 px-3 text-xs font-semibold">
                Today
              </Button>
            </div>

            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {monthNames[month]} {year}
            </h2>

            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-blue-600">{filteredClasses.length}</span> {horizon} sessions
            </div>
          </div>

          {/* Calendar Grid Header */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-slate-400 font-bold text-[11px] uppercase tracking-wider py-1">
            {daysOfWeek.map(day => (
              <div key={day} className="py-1">{day}</div>
            ))}
          </div>

          {/* Calendar Grid Cells */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Previous month padding days */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => {
              const pDay = daysInPrevMonth - firstDayIndex + idx + 1;
              return (
                <div key={`prev-${idx}`} className="min-h-[90px] sm:min-h-[110px] p-1.5 sm:p-2 bg-slate-50/50 rounded-xl border border-slate-100/60 opacity-40">
                  <span className="text-[11px] font-semibold text-slate-400">{pDay}</span>
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const cellYMD = formatYMD(year, month, dayNum);
              const isToday = cellYMD === todayYMD;
              const dayEvents = getEventsForDate(cellYMD);

              return (
                <div 
                  key={`curr-${dayNum}`}
                  className={cn(
                    "min-h-[90px] sm:min-h-[110px] p-1.5 sm:p-2 rounded-xl border transition-all flex flex-col justify-between overflow-hidden",
                    isToday ? "bg-blue-50/40 border-blue-400 ring-2 ring-blue-500/20" : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                  )}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={cn(
                      "text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full",
                      isToday ? "bg-blue-600 text-white" : "text-slate-700"
                    )}>
                      {dayNum}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-extrabold text-blue-600 bg-blue-100 px-1.5 py-0.2 rounded-full">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-[75px] scrollbar-thin">
                    {dayEvents.map(cls => (
                      <div 
                        key={cls.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMeetingModal(cls);
                        }}
                        title={`${cls.title} (${cls.time}) - Click for details`}
                        className="p-1 sm:p-1.5 bg-blue-600/90 hover:bg-blue-700 text-white rounded-lg text-[10px] cursor-pointer shadow-xs transition-transform hover:scale-[1.02] truncate"
                      >
                        <p className="font-bold truncate leading-tight">{cls.title}</p>
                        <p className="text-[9px] text-blue-100 truncate mt-0.5">{cls.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Next month padding days */}
            {Array.from({ length: (7 - ((firstDayIndex + daysInMonth) % 7)) % 7 }).map((_, idx) => (
              <div key={`next-${idx}`} className="min-h-[90px] sm:min-h-[110px] p-1.5 sm:p-2 bg-slate-50/50 rounded-xl border border-slate-100/60 opacity-40">
                <span className="text-[11px] font-semibold text-slate-400">{idx + 1}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Schedule List */
        <div className="space-y-4">
          {filteredClasses.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
              <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-900 mb-1">No {horizon} classes found</h3>
              <p className="text-slate-500 text-xs">Check back later or switch tabs to view other meetings.</p>
            </div>
          ) : (
                filteredClasses.map((cls) => (
                  <div 
                    key={cls.id} 
                    onClick={() => setSelectedMeetingModal(cls)}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                            {cls.type}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">{cls.date} • {cls.time}</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                          {cls.title}
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all" />
                        </h3>
                        <p className="text-xs text-slate-500">Host: {cls.staff.name} ({cls.staff.role})</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                        {horizon === 'upcoming' && (
                          <Button 
                            size="sm" 
                            onClick={() => {
                              const meetingUrl = cls.location || cls.link || 'https://meet.google.com';
                              window.open(meetingUrl.startsWith('http') ? meetingUrl : `https://${meetingUrl}`, '_blank');
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3 font-semibold shadow-sm"
                          >
                            <Video className="w-3.5 h-3.5 mr-1.5" />
                            Join Call
                          </Button>
                        )}

                        {horizon === 'past' && (
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRatingEventId(cls.id);
                              const existing = cls.ratings?.find((r: any) => r.userId === student.id);
                              if (existing) {
                                setStarCount(existing.rating);
                                setRatingComment(existing.comment || '');
                              } else {
                                setStarCount(5);
                                setRatingComment('');
                              }
                            }}
                            className="bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 text-xs h-8 px-3 font-semibold"
                          >
                            <Star className="w-3.5 h-3.5 mr-1 fill-amber-500 text-amber-500" />
                            {cls.ratings?.some((r: any) => r.userId === student.id) ? 'Edit Rating' : 'Rate Session'}
                          </Button>
                        )}
                      </div>
                    </div>

                {/* Pre-read notes or agenda if available */}
                {cls.notes && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                     <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Pre-Read Notes</p>
                     <p className="text-slate-600">{cls.notes}</p>
                  </div>
                )}

                {/* Display Meeting Notes (MOM) if recorded by mentor */}
                {cls.moms && cls.moms.length > 0 && (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <p className="font-bold text-slate-900 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-blue-600" /> Session Minutes of Meeting (MOM)
                    </p>
                    {cls.moms.map((m: any) => (
                      <div key={m.id} className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                        <p className="font-medium text-slate-800">"{m.keyPoints}"</p>
                        {m.nextSteps && <p className="text-blue-900 text-[11px] font-semibold mt-1">Next Steps: {m.nextSteps}</p>}
                        <p className="text-[10px] text-slate-400">Added by {m.authorName} ({m.authorRole}) • {m.date}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Display Shared Mentor Links */}
                {cls.resources && cls.resources.length > 0 && (
                  <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 space-y-2 text-xs">
                    <p className="font-bold text-emerald-900 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <LinkIcon className="w-3.5 h-3.5 text-emerald-600" /> Attached Mentor Resources & Links
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {cls.resources.map((r: any) => (
                        <a 
                          key={r.id} 
                          href={r.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="bg-white p-2.5 rounded-lg border border-emerald-200 flex justify-between items-center hover:bg-emerald-50/40 transition-colors"
                        >
                          <div>
                            <p className="font-bold text-emerald-800 truncate">{r.title}</p>
                            {r.description && <p className="text-[10px] text-slate-500 truncate">{r.description}</p>}
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-2" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Display Post-Meeting Tasks */}
                {cls.tasks && cls.tasks.length > 0 && (
                  <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100 space-y-2 text-xs">
                    <p className="font-bold text-purple-900 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <ClipboardList className="w-3.5 h-3.5 text-purple-600" /> Follow-Up Tasks Assigned
                    </p>
                    <div className="space-y-1.5">
                      {cls.tasks.map((t: any) => (
                        <div key={t.id} className="bg-white p-2.5 rounded-lg border border-purple-200 flex justify-between items-center">
                          <div>
                            <p className="font-bold text-slate-900">{t.title}</p>
                            <p className="text-[10px] text-slate-500">Due: {t.dueDate} • Assigned by {t.assignedBy}</p>
                          </div>
                          <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded uppercase">
                            {t.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* RATING MODAL */}
      {ratingEventId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">Rate Completed Meeting</h3>
            
            <div className="space-y-2 text-center py-2">
              <p className="text-xs text-slate-500">How helpful was this session for your college application roadmap?</p>
              <div className="flex justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} onClick={() => setStarCount(star)} className="focus:outline-none transition-transform hover:scale-110">
                    <Star className={`w-8 h-8 ${star <= starCount ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                  </button>
                ))}
              </div>
              <p className="text-xs font-bold text-amber-700">
                {starCount === 5 ? 'Excellent & Actionable' : starCount === 4 ? 'Very Helpful' : starCount === 3 ? 'Satisfactory' : starCount === 2 ? 'Needs Improvement' : 'Unsatisfactory'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Feedback or Key Takeaways (Optional)</label>
              <textarea 
                value={ratingComment} 
                onChange={e => setRatingComment(e.target.value)} 
                rows={3} 
                placeholder="Share what worked well or what you would like to cover in the next call..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-500 resize-none" 
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="ghost" size="sm" onClick={() => setRatingEventId(null)} className="text-xs">Cancel</Button>
              <Button size="sm" onClick={handleSaveRating} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4">
                Submit Rating
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MEETING DETAILS MODAL */}
      {selectedMeetingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-full border border-blue-400/30">
                  {selectedMeetingModal.type || selectedMeetingModal.stream}
                </span>
                <h3 className="text-xl font-bold mt-2 text-white">{selectedMeetingModal.title}</h3>
                <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                  <span>Host: <strong>{selectedMeetingModal.staff?.name || selectedMeetingModal.host}</strong></span>
                  <span>•</span>
                  <span>{selectedMeetingModal.date} ({selectedMeetingModal.time})</span>
                </p>
              </div>
              <button 
                onClick={() => setSelectedMeetingModal(null)} 
                className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
              {/* Join Call Link */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Meeting Link & Video Room</h4>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {isEventInPast(selectedMeetingModal) 
                      ? 'This scheduled call session has concluded.' 
                      : 'Click to launch Google Meet / Video call directly'}
                  </p>
                </div>
                {isEventInPast(selectedMeetingModal) ? (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-200 text-slate-600 border border-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" /> Call Ended
                  </span>
                ) : (
                  <Button 
                    onClick={() => {
                      const meetingUrl = selectedMeetingModal.location || selectedMeetingModal.link || 'https://meet.google.com';
                      window.open(meetingUrl.startsWith('http') ? meetingUrl : `https://${meetingUrl}`, '_blank');
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                  >
                    <Video className="w-4 h-4 mr-1.5" /> Join Call
                  </Button>
                )}
              </div>

              {/* Pre-read Notes / Agenda */}
              {selectedMeetingModal.notes && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Pre-Read Agenda & Notes</h4>
                  <p className="text-slate-700 leading-relaxed">{selectedMeetingModal.notes}</p>
                </div>
              )}

              {/* Minutes of Meeting */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" /> Recorded Minutes of Meeting (MOM)
                </h4>
                {selectedMeetingModal.moms && selectedMeetingModal.moms.length > 0 ? (
                  selectedMeetingModal.moms.map((m: any) => (
                    <div key={m.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                      <p className="font-semibold text-slate-800 text-xs">"{m.keyPoints}"</p>
                      {m.nextSteps && <p className="text-blue-900 font-bold text-[11px]">Next Steps: {m.nextSteps}</p>}
                      <p className="text-[10px] text-slate-400">Added by {m.authorName} ({m.authorRole}) • {m.date}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic text-center py-4 bg-slate-50 rounded-xl">No MOM recorded yet for this call.</p>
                )}
              </div>

              {/* Post Meeting Tasks */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-purple-600" /> Post-Meeting Follow-Up Tasks
                </h4>
                {selectedMeetingModal.tasks && selectedMeetingModal.tasks.length > 0 ? (
                  selectedMeetingModal.tasks.map((t: any) => (
                    <div key={t.id} className="bg-purple-50/50 border border-purple-200 rounded-xl p-3.5 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{t.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Due: {t.dueDate} • Assigned by {t.assignedBy}</p>
                        {t.externalUrl && (
                          <a href={t.externalUrl} target="_blank" rel="noopener noreferrer" className="text-purple-700 font-semibold text-[11px] flex items-center gap-1 mt-1 hover:underline">
                            <ExternalLink className="w-3 h-3" /> View Task Link
                          </a>
                        )}
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 uppercase">
                        {t.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic text-center py-4 bg-slate-50 rounded-xl">No follow-up tasks assigned for this call.</p>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button onClick={() => setSelectedMeetingModal(null)} className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-6">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
