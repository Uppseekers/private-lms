import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDatabase } from '@/context/DatabaseContext';
import { Batch } from '@/types';
import { Users, Search, Plus, Video, UserCircle, MoreVertical, Layers, GraduationCap, X, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Batches() {
  const { batches, setBatches, staff, currentUser, students } = useDatabase();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [meetingLink, setMeetingLink] = useState('');
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchType, setNewBatchType] = useState<'Master Batch' | 'Sub-Batch'>('Master Batch');
  const [newBatchCapacity, setNewBatchCapacity] = useState('20');
  const [newBatchTotalSessions, setNewBatchTotalSessions] = useState('10');
  const [newBatchCompletedSessions, setNewBatchCompletedSessions] = useState('0');
  const [newBatchMentor, setNewBatchMentor] = useState('');

  const [selectedBatchForStudents, setSelectedBatchForStudents] = useState<Batch | null>(null);
  const [studentToAdd, setStudentToAdd] = useState('');

  const isAdmin = currentUser.role === 'SYSTEM_ADMIN' || currentUser.role === 'OPERATIONS_LEAD';

  const visibleBatches = batches.filter(batch => {
    if (!isAdmin && !batch.mentors.includes(currentUser.name)) return false;
    
    const matchesSearch = batch.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'All' || batch.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const [newBatchSubject, setNewBatchSubject] = useState<'SAT' | 'Research' | 'Counselling' | 'Other'>('SAT');

  const handleEditBatch = () => {
    if(!editingBatch || !newBatchName) return;
    const updated = {
      ...editingBatch,
      name: newBatchName,
      type: newBatchType,
      subject: newBatchSubject,
      capacity: parseInt(newBatchCapacity),
      totalSessions: parseInt(newBatchTotalSessions),
      completedSessions: parseInt(newBatchCompletedSessions),
      mentors: [newBatchMentor].filter(Boolean),
      meetingLink: meetingLink
    };
    setBatches(batches.map(b => b.id === editingBatch.id ? updated : b));
    setEditingBatch(null);
  };

  const openEditModal = (batch: Batch) => {
    setEditingBatch(batch);
    setNewBatchName(batch.name);
    setNewBatchType(batch.type as any);
    setNewBatchSubject((batch.subject as any) || 'SAT');
    setNewBatchCapacity(batch.capacity.toString());
    setNewBatchTotalSessions((batch.totalSessions || 10).toString());
    setNewBatchCompletedSessions((batch.completedSessions || 0).toString());
    setNewBatchMentor(batch.mentors[0] || '');
    setMeetingLink(batch.meetingLink || '');
  };

  const handleCreateBatch = () => {
    if (!newBatchName.trim()) return;
    const newBatch: Batch = {
      id: 'BATCH-' + Math.floor(Math.random() * 10000),
      name: newBatchName,
      type: newBatchType,
      subject: newBatchSubject,
      capacity: parseInt(newBatchCapacity) || 20,
      totalSessions: parseInt(newBatchTotalSessions) || 10,
      completedSessions: parseInt(newBatchCompletedSessions) || 0,
      mentors: newBatchMentor ? [newBatchMentor] : (isAdmin ? [] : [currentUser.name]),
      students: [],
      meetingLink: meetingLink || ('https://zoom.us/j/' + Math.floor(Math.random() * 1000000000)),
      status: 'Upcoming'
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
  };

  const handleAddStudent = () => {
    if (!selectedBatchForStudents || !studentToAdd) return;
    
    const updatedBatches = batches.map(b => {
      if (b.id === selectedBatchForStudents.id) {
        if (!b.students.includes(studentToAdd)) {
          return { ...b, students: [...b.students, studentToAdd] };
        }
      }
      return b;
    });
    
    setBatches(updatedBatches);
    setSelectedBatchForStudents(null);
    setStudentToAdd('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto w-full">
      {(isCreateModalOpen || editingBatch) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">{editingBatch ? 'Edit Batch' : 'Create New Batch'}</h3>
              <button onClick={() => { setIsCreateModalOpen(false); setEditingBatch(null); }} className="p-2 rounded-full hover:bg-slate-100 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Batch Name</label>
                <input 
                  type="text" 
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm" 
                  placeholder="e.g. Fall 2026 Core"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Batch Subject</label>
                  <select 
                    value={newBatchSubject}
                    onChange={(e: any) => setNewBatchSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-semibold text-indigo-700"
                  >
                    <option value="SAT">SAT</option>
                    <option value="Research">Research</option>
                    <option value="Counselling">Counselling</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Type</label>
                  <select 
                    value={newBatchType}
                    onChange={(e: any) => setNewBatchType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm"
                  >
                    <option value="Master Batch">Master Batch</option>
                    <option value="Sub-Batch">Sub-Batch</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Capacity</label>
                  <input 
                    type="number" 
                    value={newBatchCapacity}
                    onChange={(e) => setNewBatchCapacity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Meeting Link</label>
                  <input 
                    type="text" 
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    placeholder="https://zoom.us/j/..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Total Sessions</label>
                  <input 
                    type="number" 
                    value={newBatchTotalSessions}
                    onChange={(e) => setNewBatchTotalSessions(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Completed Sessions</label>
                  <input 
                    type="number" 
                    value={newBatchCompletedSessions}
                    onChange={(e) => setNewBatchCompletedSessions(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm" 
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Primary Mentor</label>
                <select 
                  value={newBatchMentor}
                  onChange={(e) => setNewBatchMentor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm"
                >
                  <option value="">Select Mentor...</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => { setIsCreateModalOpen(false); setEditingBatch(null); }}>Cancel</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" onClick={editingBatch ? handleEditBatch : handleCreateBatch}>
                {editingBatch ? 'Save Changes' : 'Create Batch'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedBatchForStudents && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Add Student to {selectedBatchForStudents.name}</h3>
              <button onClick={() => setSelectedBatchForStudents(null)} className="p-2 rounded-full hover:bg-slate-100 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Select Student</label>
                <select 
                  value={studentToAdd}
                  onChange={(e) => setStudentToAdd(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm"
                >
                  <option value="">Select Student...</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setSelectedBatchForStudents(null)}>Cancel</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" onClick={handleAddStudent}>Add Student</Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Batches & Cohorts</h2>
          <p className="text-sm text-slate-500 mt-1">Manage master groups and sub-batch distributions.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsCreateModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all hover:shadow">
            <Plus className="w-4 h-4 mr-2" /> Create Batch
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
             <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
             <input 
               type="text" 
               placeholder="Search batches..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
             />
          </div>
          <div className="flex gap-2">
            <select 
              className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
               <option value="All">All Types</option>
               <option value="Master Batch">Master Batch</option>
               <option value="Sub-Batch">Sub-Batch</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Batch Name & Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mentors</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Students</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibleBatches.map((batch) => (
                <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                        batch.type === 'Master Batch' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-purple-50 border-purple-100 text-purple-600'
                      )}>
                        {batch.type === 'Master Batch' ? <Layers className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          {batch.name}
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                            batch.subject === 'SAT' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            batch.subject === 'Research' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            batch.subject === 'Counselling' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          )}>
                            {batch.subject || 'Counselling'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{batch.id} • {batch.type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex -space-x-2">
                      {batch.mentors.map((m, i) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-600" title={m}>
                           {m.charAt(0)}
                        </div>
                      ))}
                      {batch.mentors.length === 0 && <span className="text-sm text-slate-400">Unassigned</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-900">{batch.students.length}</span>
                      <span className="text-xs text-slate-500">/ {batch.capacity} Enrolled</span>
                    </div>
                    <div className="w-32 h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                      <div 
                         className="h-full bg-indigo-500 rounded-full" 
                         style={{ width: `${Math.min(100, (batch.students.length / batch.capacity) * 100)}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-semibold border",
                      batch.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                      batch.status === 'Upcoming' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                      'bg-slate-100 text-slate-600 border-slate-200'
                    )}>
                      {batch.status}
                    </span>
                    <div className="mt-2 text-xs text-slate-500 font-medium">
                      {batch.completedSessions || 0} / {batch.totalSessions || 10} Sessions
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedBatchForStudents(batch)} className="bg-white border-slate-200 hover:bg-slate-50 hover:text-indigo-600">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Students
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          if (batch.meetingLink) {
                            window.open(batch.meetingLink.startsWith('http') ? batch.meetingLink : `https://${batch.meetingLink}`, '_blank');
                          } else {
                            alert('No meeting link set for this batch.');
                          }
                        }}
                        className="bg-white border-slate-200 hover:bg-slate-50 hover:text-indigo-600"
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Join Class
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEditModal(batch)} className="bg-white border-slate-200 hover:bg-slate-50 hover:text-indigo-600">
                        Edit
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleBatches.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No batches found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
