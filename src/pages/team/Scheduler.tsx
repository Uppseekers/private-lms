import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, Users, Video, Edit, Trash2, X, RefreshCw } from 'lucide-react';
import { useDatabase } from '@/context/DatabaseContext';

export default function TeamScheduler() {
  const { events, setEvents, currentUser, batches, students } = useDatabase();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [audienceType, setAudienceType] = useState('individual');
  
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
    recurrenceType: 'weekly', // daily, weekly
    recurrenceCount: 1, // How many occurrences
  });
  
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  
  const handleEditEvent = (evt: any) => {
    setEditingEventId(evt.id);
    setFormData({
      stream: evt.stream || evt.type || 'Counselling (1-on-1)',
      title: evt.title || '',
      date: evt.date || '',
      startTime: evt.startTime || evt.time || '10:00',
      endTime: evt.endTime || '11:00',
      location: evt.link || evt.location || '',
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
    }
    setIsModalOpen(true);
  };
  
  const handleOpenModal = () => {
    setEditingEventId(null);
    setFormData({
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
    setStudentSearch('');
    setSelectedBatchId('');
    setAudienceType('individual');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleDelete = (id: string) => {
    setEvents(events.filter((e: any) => e.id !== id));
  };

  const handlePublish = () => {
    if (!formData.title.trim() || !formData.date || !formData.startTime) {
      alert("Please fill required fields (Title, Date, Start Time).");
      return;
    }

    const duration = formData.endTime ? 'TBD' : '1 hr'; // Can calculate exact duration if both are present
    const baseId = 'EVT-' + Math.floor(Math.random() * 100000);
    
    let occurrences = [];
    
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
      duration: duration,
      stream: formData.stream,
      type: formData.stream,
      title: formData.title,
      batch: audienceType === 'batch' ? selectedBatchId : undefined,
      students: audienceType === 'batch' ? (batches.find(b => b.id === selectedBatchId)?.name || 'Batch') : (studentSearch || 'All'),
      location: formData.location || 'https://meet.google.com',
      link: formData.location || 'https://meet.google.com',
      notes: formData.notes,
      assignments: formData.assignments,
      host: currentUser.name || 'Team Counselor',
    }));
    
    setEvents([...events, ...newEvents]);
    handleCloseModal();
  };

  const isAdmin = currentUser.role === 'SYSTEM_ADMIN' || currentUser.role === 'OPERATIONS_LEAD';

  const visibleEvents = events.filter((e: any) => {
    if (isAdmin) return true;
    
    // Check if the current user is the host
    if (e.host === currentUser.name) return true;
    
    // Check if the event is assigned to a batch that the user mentors
    if (e.batch) {
      const batch = batches.find((b: any) => b.id === e.batch);
      if (batch && batch.mentors.includes(currentUser.name)) return true;
    }
    
    // Otherwise, not visible
    return false;
  }).sort((a: any, b: any) => new Date(a.day).getTime() - new Date(b.day).getTime());

  // Filter batches for the dropdown
  const visibleBatches = isAdmin 
    ? batches 
    : batches.filter(b => b.mentors.includes(currentUser.name));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto w-full">
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">{editingEventId ? 'Edit Session' : 'Schedule New Session'}</h3>
              <button onClick={handleCloseModal} className="p-2 rounded-full hover:bg-slate-100 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Audience Type */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Target Audience</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm font-medium">
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
                  <label className="flex items-center gap-2 text-sm font-medium">
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

              {audienceType === 'individual' ? (
                <div className="relative">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                     Select Student (Assigned Database Auto-Prompt)
                   </label>
                   <input 
                     type="text" 
                     className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium" 
                     placeholder="Type student name or email to auto-prompt..."
                     value={studentSearch}
                     onChange={(e) => setStudentSearch(e.target.value)}
                     list="assigned-students-datalist"
                   />
                   <datalist id="assigned-students-datalist">
                     {students.map(s => (
                       <option key={s.id} value={s.name}>
                         {s.email} | {s.school || 'High School'} | Counselor: {s.counselor || 'Unassigned'}
                       </option>
                     ))}
                   </datalist>
                   {studentSearch.trim().length > 0 && (
                     <div className="mt-2 text-xs text-slate-500 flex items-center justify-between bg-blue-50/50 p-2 rounded border border-blue-100">
                       <span>Selected Student Target: <strong className="text-blue-900">{studentSearch}</strong></span>
                       <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold uppercase">1-on-1 Assigned</span>
                     </div>
                   )}
                </div>
              ) : (
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Select Batch</label>
                   <select 
                     className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium"
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
                         [{b.subject || 'General'}] {b.name} ({b.students?.length || 0} students)
                       </option>
                     ))}
                   </select>
                   {selectedBatchId && (() => {
                     const selectedBatch = batches.find(b => b.id === selectedBatchId);
                     if (!selectedBatch) return null;
                     const enrolledNames = students
                       .filter(s => selectedBatch.students?.includes(s.id) || selectedBatch.students?.includes(s.name))
                       .map(s => s.name);
                     return (
                       <div className="mt-2 p-2 bg-indigo-50/60 rounded border border-indigo-100 text-xs text-indigo-900">
                         <strong>Enrolled Students ({enrolledNames.length}):</strong>{' '}
                         {enrolledNames.length > 0 ? enrolledNames.join(', ') : 'No students assigned yet to this batch.'}
                       </div>
                     );
                   })()}
                </div>
              )}

              {/* Event Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Session Title</label>
                  <input 
                    type="text" 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm" 
                    placeholder="e.g. College Shortlisting Review"
                  />
                </div>
                
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Date</label>
                  <input 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm" 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                   <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Start</label>
                      <input 
                        type="time" 
                        value={formData.startTime}
                        onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" 
                      />
                   </div>
                   <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">End</label>
                      <input 
                        type="time" 
                        value={formData.endTime}
                        onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" 
                      />
                   </div>
                </div>
              </div>
              
              {/* Recurrence */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <input 
                    type="checkbox" 
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({...formData, isRecurring: e.target.checked})}
                    className="accent-blue-600 rounded"
                  />
                  Recurring Session <RefreshCw className="w-4 h-4 ml-1 text-slate-400" />
                </label>
                
                {formData.isRecurring && (
                  <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Repeats</label>
                      <select 
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm"
                        value={formData.recurrenceType}
                        onChange={(e) => setFormData({...formData, recurrenceType: e.target.value})}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Occurrences (Max 10)</label>
                      <input 
                        type="number" 
                        min="1"
                        max="10"
                        value={formData.recurrenceCount}
                        onChange={(e) => setFormData({...formData, recurrenceCount: parseInt(e.target.value) || 1})}
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm" 
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Meeting Link / Location</label>
                <input 
                  type="text" 
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm" 
                  placeholder="e.g. Zoom URL"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Pre-Read Notes & Assignments</label>
                <textarea 
                  rows={3} 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm resize-none" 
                  placeholder="Students will see this before joining..."
                ></textarea>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <Button variant="ghost" onClick={handleCloseModal}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" onClick={handlePublish}>
                {editingEventId ? 'Save Changes' : (formData.isRecurring ? 'Schedule Recurring Events' : 'Schedule Event')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Class Scheduler</h2>
          <p className="text-sm text-slate-500 mt-1">Manage 1-on-1s and batch class schedules.</p>
        </div>
        <Button onClick={handleOpenModal} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Schedule Class
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex gap-4">
          <div className="relative flex-1 max-w-md">
             <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
             <input type="text" placeholder="Search events..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
             <option>All Instructors</option>
             <option>My Events</option>
          </select>
        </div>

        <div className="divide-y divide-slate-100">
          {visibleEvents.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No events found.
            </div>
          ) : (
            visibleEvents.map((evt: any) => (
              <div key={evt.id} className="p-6 flex flex-col md:flex-row gap-6 hover:bg-slate-50 transition-colors">
                <div className="w-40 shrink-0">
                  <div className="text-sm font-bold text-slate-900">{evt.day}</div>
                  <div className="text-sm text-slate-500 font-medium">{evt.time}</div>
                  <div className="text-xs text-slate-400 mt-1">{evt.duration}</div>
                </div>
                
                <div className="flex-1 space-y-3">
                  <div>
                    <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-bold uppercase tracking-wider mb-2">
                      {evt.stream}
                    </span>
                    <h4 className="text-lg font-bold text-slate-900">{evt.title}</h4>
                    <div className="text-xs text-slate-500 mt-1">Host: {evt.host || 'Unknown'}</div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
                      <Users className="w-4 h-4 text-slate-400" />
                      {evt.batch && <span className="font-semibold text-slate-900 mr-1">{evt.batch}</span>}
                      {evt.students}
                    </div>
                  </div>
                </div>
                
                <div className="flex md:flex-col items-center md:items-end gap-3 shrink-0 pt-2">
                  <Button 
                    size="sm" 
                    onClick={() => {
                      const link = evt.location || evt.link;
                      if (link) {
                        window.open(link.startsWith('http') ? link : `https://${link}`, '_blank');
                      } else {
                        alert('No meeting link available');
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white w-full shadow-sm"
                  >
                    <Video className="w-4 h-4 mr-2" /> Join
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="bg-white" onClick={() => handleEditEvent(evt)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="bg-white text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(evt.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
