import React, { useState } from 'react';
import { useDatabase } from '@/context/DatabaseContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Filter, Plus, FileText, CheckCircle2, Clock, X, ChevronRight, GraduationCap, AlertCircle, CalendarDays, MessageSquare, MapPin, Phone, Mail, MoreVertical, Trash2, Link as LinkIcon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Student, Essay, EssayVersion, ShortlistUniversity, Activity, Task, TaskCategory, TaskStage } from '@/types';








export default function TeamUsers() {
  const { students, setStudents, currentUser } = useDatabase();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const filteredStudents = students.filter(s => {
    // If not SYSTEM_ADMIN or DEVELOPER, filter by counselor name
    if (currentUser.role !== 'SYSTEM_ADMIN' && currentUser.role !== 'DEVELOPER' && currentUser.role !== 'OPERATIONS_LEAD') {
      if (s.counselor !== currentUser.name) return false;
    }
    return s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
           s.id.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getReadinessColor = (percent: number) => {
    if (percent >= 90) return 'text-green-600';
    if (percent >= 50) return 'text-amber-500';
    return 'text-red-500';
  };
  
  const getReadinessIcon = (percent: number) => {
    if (percent >= 90) return '🟢';
    if (percent >= 50) return '🟡';
    return '🔴';
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    setStudents(students.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    setSelectedStudent(updatedStudent);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Central Student Database</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search Name, Email, or Student ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-80 bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button variant="outline" className="bg-white text-slate-700">
            <Filter className="w-4 h-4 mr-2" /> Filters
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add New Student
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Student Name</th>
                <th className="px-6 py-4">Email & Phone</th>
                <th className="px-6 py-4">Intake</th>
                <th className="px-6 py-4">Target Countries</th>
                <th className="px-6 py-4">Readiness</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => setSelectedStudent(student)}>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{student.id}</td>
                  <td className="px-6 py-4 font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{student.name}</td>
                  <td className="px-6 py-4">
                    <p className="text-slate-900 font-medium">{student.email}</p>
                    <p className="text-xs text-slate-500">{student.phone}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{student.intake}</td>
                  <td className="px-6 py-4 text-slate-600">{(student.countries || []).join(', ')}</td>
                  <td className="px-6 py-4 font-bold">
                    <span className={getReadinessColor(student.readiness)}>{getReadinessIcon(student.readiness)} {student.readiness}%</span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button variant="ghost" size="sm" className="text-blue-600" onClick={(e) => { e.stopPropagation(); setSelectedStudent(student); }}>View</Button>
                    <Button variant="ghost" size="sm" className="text-slate-400 p-1" onClick={(e) => e.stopPropagation()}><MoreVertical className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStudents.length === 0 && (
            <div className="p-8 text-center text-slate-500">No students found matching your search.</div>
          )}
        </div>
      </Card>

      {/* Slide-out Drawer for Student Details */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setSelectedStudent(null)} />
          <div className="relative w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <StudentDetailDrawer student={selectedStudent} onClose={() => setSelectedStudent(null)} onUpdate={handleUpdateStudent} />
          </div>
        </div>
      )}

      {/* Add New Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl my-8">
            <AddStudentModal onClose={() => setIsAddModalOpen(false)} onSave={(newStudent) => {
               setStudents([newStudent, ...students]);
               setIsAddModalOpen(false);
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

function StudentDetailDrawer({ student, onClose, onUpdate }: { student: Student, onClose: () => void, onUpdate: (s: Student) => void }) {
  const [activeTab, setActiveTab] = useState('Profile Details');

  return (
    <>
      <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Student Profile</p>
          <h2 className="text-xl font-bold text-slate-900">{student.name} <span className="text-slate-400 font-medium">({student.id})</span></h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex border-b border-slate-200 px-6 bg-white shrink-0 overflow-x-auto scrollbar-hide">
        {['Profile Details', 'Shortlists', 'Document Vault', 'Essays', 'Tasks & Projects', 'Activity'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "py-3 px-4 text-sm font-bold transition-colors whitespace-nowrap border-b-2",
              activeTab === tab
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
        
{activeTab === 'Profile Details' && (
  <ProfileDetailsView student={student} onUpdate={onUpdate} />
)}


        {activeTab === 'Shortlists' && (
          <ShortlistsView student={student} onUpdate={onUpdate} />
        )}

                {activeTab === 'Tasks & Projects' && (
          <TasksView student={student} onUpdate={onUpdate} />
        )}
        
        {activeTab === 'Activity' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Chronological Activity History & Audit Trail</h3>
            
            <div className="relative pl-6 space-y-6 border-l-2 border-slate-100 ml-3">
              {student.activities.map((activity) => (
                <div key={activity.id} className="relative">
                  <span className={cn(
                    "absolute -left-[31px] w-3 h-3 rounded-full ring-4 ring-white",
                    activity.type === 'VERIFIED' ? 'bg-green-500' :
                    activity.type === 'UPLOAD' ? 'bg-blue-500' :
                    activity.type === 'UPDATE' ? 'bg-amber-500' :
                    activity.type === 'SESSION' ? 'bg-purple-500' :
                    'bg-slate-400'
                  )} />
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                      {activity.date} 
                      <span className={cn(
                        activity.type === 'VERIFIED' ? 'text-green-600' :
                        activity.type === 'UPLOAD' ? 'text-blue-600' :
                        activity.type === 'UPDATE' ? 'text-amber-600' :
                        activity.type === 'SESSION' ? 'text-purple-600' :
                        'text-slate-600'
                      )}>
                        {activity.type === 'SYSTEM' ? 'ACCOUNT CREATED' : activity.type + (activity.type === 'UPLOAD' ? 'ED' : activity.type === 'UPDATE' ? 'D' : activity.type === 'SESSION' ? ' ATTENDED' : '')}
                      </span>
                    </p>
                    <p className="text-sm text-slate-700 font-medium">{activity.description}</p>
                  </div>
                </div>
              ))}
              {student.activities.length === 0 && (
                <div className="text-slate-500 text-sm">No activity recorded yet.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'Document Vault' && (
          <VaultView student={student} onUpdate={onUpdate} />
        )}

        {activeTab === 'Essays' && (
          <EssaysView student={student} onUpdate={onUpdate} />
        )}
      </div>
    </>
  );
}

const mockRequiredDocsList = [
  { id: 'app', name: 'Common App Form' },
  { id: 'fee', name: 'Application Fee / Waiver' },
  { id: 'essay', name: 'Personal Essay' },
  { id: 'supp', name: 'Supplemental Essays' },
  { id: 'transcript', name: 'High School Transcript' },
  { id: 'lor1', name: 'LOR 1 (Teacher)' },
  { id: 'lor2', name: 'LOR 2 (Counselor)' },
  { id: 'test', name: 'Test Scores (SAT/ACT)' },
  { id: 'portfolio', name: 'Portfolio (Optional)' },
  { id: 'doc6', name: 'Internships' },
  { id: 'doc7', name: 'Research Projects' },
  { id: 'doc8', name: 'Passion Projects' },
  { id: 'doc9', name: 'Impact Project / Community Service' },
  { id: 'doc10', name: 'MOOCs & Online Certifications' },
  { id: 'doc11', name: 'Competitions & Olympiads' },
  { id: 'doc12', name: 'Financial Bank Statement / Affidavit' }
];

function ShortlistsView({ student, onUpdate }: { student: Student, onUpdate: (s: Student) => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    category: 'Reach' | 'Target' | 'Safety';
    major: string;
    round: string;
    deadline: string;
    portalLink: string;
    requiredDocs: string[];
  }>({
    name: '',
    category: 'Target',
    major: '',
    round: 'Regular Decision (RD)',
    deadline: '',
    portalLink: '',
    requiredDocs: []
  });
  
  const handleAdd = () => {
    if (!formData.name.trim()) return;
    
    const newUni: ShortlistUniversity = {
      id: Math.random().toString(),
      name: formData.name,
      category: formData.category,
      deadline: formData.deadline || 'TBD',
      status: 'Considering',
      major: formData.major,
      round: formData.round,
      portalLink: formData.portalLink,
      requiredDocs: formData.requiredDocs
    };
    
    onUpdate({
      ...student,
      shortlist: [...student.shortlist, newUni],
      activities: [
        {
          id: Math.random().toString(),
          date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
          type: 'UPDATE',
          description: `University added to shortlist: ${newUni.name} (${formData.category})`
        },
        ...student.activities
      ]
    });
    
    setIsModalOpen(false);
    setFormData({
      name: '',
      category: 'Target',
      major: '',
      round: 'Regular Decision (RD)',
      deadline: '',
      portalLink: '',
      requiredDocs: []
    });
  };

  const handleRemove = (id: string) => {
    const uni = student.shortlist.find(u => u.id === id);
    if (!uni) return;
    
    onUpdate({
      ...student,
      shortlist: student.shortlist.filter(u => u.id !== id),
      activities: [
        {
          id: Math.random().toString(),
          date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
          type: 'UPDATE',
          description: `University removed from shortlist: ${uni.name}`
        },
        ...student.activities
      ]
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">University Shortlist</h3>
      </div>
      
      <Card>
        <CardContent className="p-4 flex justify-between items-center bg-slate-50 border-b border-slate-100">
          <div className="flex gap-4 items-center">
            <h4 className="text-sm font-semibold text-slate-700">Tracking {student.shortlist.length} Universities</h4>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Add Target University
          </Button>
        </CardContent>
        <div className="p-0">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-3">University</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Deadline</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {student.shortlist.map(uni => (
                <tr key={uni.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3">
                    <p className="font-bold text-slate-900 flex items-center gap-2">{uni.name} {uni.portalLink && <a href={uni.portalLink} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700"><LinkIcon className="w-3.5 h-3.5" /></a>}</p>
                    {(uni.major || uni.round) && (
                      <p className="text-xs text-slate-500 mt-1">{uni.major}{uni.major && uni.round ? ' • ' : ''}{uni.round}</p>
                    )}
                    {uni.requiredDocs && uni.requiredDocs.length > 0 && (
                      <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">{uni.requiredDocs.length} Docs Required</p>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-bold",
                      uni.category === 'Reach' ? 'bg-red-100 text-red-700' :
                      uni.category === 'Target' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    )}>
                      {uni.category}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-600 font-medium flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5 text-slate-400" /> {uni.deadline}
                  </td>
                  <td className="px-6 py-3">
                    <span className={cn(
                      "text-xs font-bold uppercase tracking-wider",
                      uni.status === 'Submitted' ? 'text-green-600' :
                      uni.status === 'Applying' ? 'text-amber-600' :
                      'text-slate-500'
                    )}>
                      {uni.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button onClick={() => handleRemove(uni.id)} className="text-slate-400 hover:text-red-500 p-1 rounded-full transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {student.shortlist.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">
                    No universities added to shortlist yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Add Target University</h3>
                  <p className="text-xs text-slate-500 font-medium">For {student.name}</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full">
                 <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-8 flex-1 overflow-y-auto">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">University Name</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Columbia University" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Target Category</label>
                  <div className="flex gap-3">
                    {['Reach', 'Target', 'Safety'].map((cat) => (
                      <label key={cat} className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors text-sm font-semibold ${
                        formData.category === cat 
                          ? (cat === 'Reach' ? "bg-red-50 border-red-200 text-red-700" : cat === 'Target' ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-green-50 border-green-200 text-green-700") 
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}>
                        <input 
                          type="radio" 
                          name="category" 
                          value={cat}
                          checked={formData.category === cat}
                          onChange={(e) => setFormData({...formData, category: e.target.value as any})}
                          className="sr-only"
                        />
                        <span className={`w-2 h-2 rounded-full ${
                          cat === 'Reach' ? "bg-red-500" : cat === 'Target' ? "bg-amber-500" : "bg-green-500"
                        }`} />
                        {cat}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Intended Major / Program</label>
                  <input 
                    type="text" 
                    value={formData.major}
                    onChange={(e) => setFormData({...formData, major: e.target.value})}
                    placeholder="e.g. B.S. in Computer Science" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Application Round</label>
                  <select 
                    value={formData.round}
                    onChange={(e) => setFormData({...formData, round: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  >
                    <option>Early Decision (ED)</option>
                    <option>Early Action (EA)</option>
                    <option>Regular Decision (RD)</option>
                    <option>Rolling</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Application Deadline</label>
                  <input 
                    type="datetime-local" 
                    value={formData.deadline}
                    onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Application Portal Link</label>
                  <div className="relative">
                    <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="url" 
                      value={formData.portalLink}
                      onChange={(e) => setFormData({...formData, portalLink: e.target.value})}
                      placeholder="https://commonapp.org" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" 
                    />
                  </div>
                </div>
              </div>
              
              {/* Requirements Checklist */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Checklist of Required Documents</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {mockRequiredDocsList.map((doc) => (
                    <label 
                      key={doc.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        formData.requiredDocs.includes(doc.id) 
                          ? "bg-blue-50/50 border-blue-200" 
                          : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input 
                        type="checkbox"
                        checked={formData.requiredDocs.includes(doc.id)}
                        onChange={(e) => {
                          const newDocs = e.target.checked
                            ? [...formData.requiredDocs, doc.id]
                            : formData.requiredDocs.filter(id => id !== doc.id);
                          setFormData({...formData, requiredDocs: newDocs});
                        }}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                        formData.requiredDocs.includes(doc.id) ? "bg-blue-600 text-white" : "bg-slate-100 border border-slate-300"
                      }`}>
                        {formData.requiredDocs.includes(doc.id) && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <span className={`text-sm font-medium ${
                        formData.requiredDocs.includes(doc.id) ? "text-blue-900" : "text-slate-700"
                      }`}>{doc.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-100 p-4 sm:p-6 flex justify-end gap-3 rounded-b-3xl z-10">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-700">Cancel</Button>
              <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                Save Shortlist Target
              </Button>
            </div>
          </div>
        </div>
      )}
</div>
  );
}

function AddStudentModal({ onClose, onSave }: { onClose: () => void, onSave: (s: Student) => void }) {
  const { staff } = useDatabase();
  const newId = `STU-2026-${Math.floor(Math.random() * 1000).toString().padStart(4, '0')}`;
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    intake: '',
    countries: [],
    school: '',
    counselor: '',
    sendInvite: true,
    password: ''
  });
  
  const [showToast, setShowToast] = useState(false);

  const handleSave = () => {
    if(!formData.name || !formData.email) return; // basic validation
    
    // Generate a secure random password (8 chars)
    const generatedPassword = formData.password || Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 10);

    const newStudent: Student = {
      id: newId,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      intake: formData.intake,
      countries: formData.countries,
      school: formData.school,
      counselor: formData.counselor,
      readiness: 0,
      password: generatedPassword,
      activities: [
        {
          id: '1',
          date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
          type: 'SYSTEM',
          description: formData.sendInvite ? 'Student profile created. Invitation email sent.' : 'Student profile created.'
        }
      ],
      shortlist: [],
      documents: [],
    essays: []
  };

    if (formData.sendInvite) {
      // Send student to Cloud SQL DB
      fetch('/api/students/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify(newStudent)
      }).catch(console.error);

      setShowToast(true);
      setTimeout(() => {
        onSave(newStudent);
      }, 1500);
    } else {
      fetch('/api/students/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify(newStudent)
      }).catch(console.error);

      onSave(newStudent);
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[90vh] relative">
      {showToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl font-medium flex items-center gap-2 animate-in slide-in-from-top-4 fade-in duration-300">
          <CheckCircle2 className="w-5 h-5" />
          Invitation email sent to {formData.email}!
        </div>
      )}
      
      <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Add New Student</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full border border-slate-200">
           <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 overflow-y-auto space-y-8 bg-white">
        <section>
           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Basic Information</h3>
           <div className="grid grid-cols-2 gap-6">
             <div className="col-span-2 sm:col-span-1">
               <label className="block text-sm font-bold text-slate-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
               <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Rahul Gupta" />
             </div>
             <div className="col-span-2 sm:col-span-1">
               <label className="block text-sm font-bold text-slate-700 mb-1.5">System Student ID</label>
               <input type="text" disabled value={newId} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-500" />
             </div>
             <div className="col-span-2">
               <label className="block text-sm font-bold text-slate-700 mb-1.5">Password (Optional)</label>
               <input type="text" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Auto-generate if empty" />
             </div>
           </div>
        </section>

        <section>
           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Contact Details</h3>
           <div className="grid grid-cols-2 gap-6">
             <div className="col-span-2 sm:col-span-1">
               <label className="block text-sm font-bold text-slate-700 mb-1.5">Email Address <span className="text-red-500">*</span></label>
               <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="student@example.com" />
             </div>
             <div className="col-span-2 sm:col-span-1">
               <label className="block text-sm font-bold text-slate-700 mb-1.5">Phone Number</label>
               <div className="flex">
                 <select className="bg-slate-50 border border-slate-200 border-r-0 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-24">
                   <option>+91</option>
                   <option>+1</option>
                   <option>+44</option>
                 </select>
                 <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="flex-1 bg-white border border-slate-200 rounded-r-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="98765 43210" />
               </div>
             </div>
           </div>
        </section>

        <section>
           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Academic Targets & Preferences</h3>
           <div className="grid grid-cols-2 gap-6">
             <div className="col-span-2 sm:col-span-1">
               <label className="block text-sm font-bold text-slate-700 mb-1.5">Target Intake Term</label>
               <select value={formData.intake} onChange={e => setFormData({...formData, intake: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                 <option value="">Select Target Intake</option>
                 <option>Fall 2026</option>
                 <option>Spring 2027</option>
                 <option>Fall 2027</option>
               </select>
             </div>
             <div className="col-span-2 sm:col-span-1">
               <label className="block text-sm font-bold text-slate-700 mb-1.5">High School Name & City</label>
               <input type="text" value={formData.school} onChange={e => setFormData({...formData, school: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. DPS R.K. Puram" />
             </div>
             <div className="col-span-2">
               <label className="block text-sm font-bold text-slate-700 mb-2">Preferred Target Countries</label>
               <div className="flex flex-wrap gap-3">
                 {['USA', 'UK', 'Canada', 'Australia', 'Singapore', 'Europe'].map(country => (
                   <label key={country} className="flex items-center gap-2 cursor-pointer">
                     <input type="checkbox" checked={formData.countries.includes(country)} onChange={(e) => {
                       if (e.target.checked) setFormData({...formData, countries: [...formData.countries, country]});
                       else setFormData({...formData, countries: formData.countries.filter(c => c !== country)});
                     }} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                     <span className="text-sm font-medium text-slate-700">{country}</span>
                   </label>
                 ))}
               </div>
             </div>
           </div>
        </section>

        <section>
           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Assignments & Initial Access</h3>
           <div className="space-y-4">
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-1.5">Assigned Counselor</label>
               <select value={formData.counselor} onChange={e => setFormData({...formData, counselor: e.target.value})} className="w-full sm:w-1/2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                 <option value="">Select Counselor</option>
                 {staff.map(s => (
                   <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                 ))}
                 <option value="Unassigned">Unassigned</option>
               </select>
             </div>
             <div>
               <label className="flex items-start gap-3 cursor-pointer p-4 border border-blue-100 bg-blue-50 rounded-xl">
                 <input type="checkbox" checked={formData.sendInvite} onChange={e => setFormData({...formData, sendInvite: e.target.checked})} className="mt-0.5 w-4 h-4 text-blue-600 rounded border-blue-300 focus:ring-blue-500" />
                 <div>
                   <span className="text-sm font-bold text-blue-900 block mb-0.5">Send Portal Invitation</span>
                   <span className="text-xs text-blue-700">Send an auto-login and welcome email to the student immediately upon creation.</span>
                 </div>
               </label>
             </div>
           </div>
        </section>
      </div>

      <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl mt-auto">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8" onClick={handleSave} disabled={showToast}>
          {showToast ? 'Sending...' : 'Save & Create Student'}
        </Button>
      </div>
    </div>
  );
}

function VaultView({ student, onUpdate }: { student: Student, onUpdate: (s: Student) => void }) {
  const documents = student.documents || [];
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      const newDoc = { id: Math.random().toString(), name: 'New_Document_Scanned.pdf', type: 'Other', date: 'Just now', status: 'Pending' as const };
      onUpdate({
        ...student,
        documents: [newDoc, ...documents],
        activities: [
          {
            id: Math.random().toString(),
            date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
            type: 'UPLOAD',
            description: 'New document uploaded: New_Document_Scanned.pdf'
          },
          ...student.activities
        ]
      });
      setIsUploading(false);
      onUpdate({
        ...student,
        activities: [
          {
            id: Math.random().toString(),
            date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
            type: 'UPLOAD',
            description: 'New document uploaded: New_Document_Scanned.pdf'
          },
          ...student.activities
        ]
      });
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Document Vault</h3>
        <div className="flex gap-2">
          <Button onClick={handleUpload} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" disabled={isUploading}>
            {isUploading ? 'Uploading...' : <><Plus className="w-4 h-4 mr-2" /> Upload Document</>}
          </Button>
        </div>
      </div>
      
      <Card>
        <div className="p-0">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-3">Document Name</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {documents.map((doc, idx) => (
                <tr key={doc.id || idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" /> {doc.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Uploaded on {doc.date}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{doc.type}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      doc.status === 'Verified' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    )}>
                      {doc.status === 'Verified' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <Button variant="ghost" size="sm" className="text-slate-600">Preview</Button>
                    {doc.status === 'Pending' && (
                      <Button size="sm" className="bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800" onClick={() => {
                        const newDocs = [...documents];
                        newDocs[idx].status = 'Verified';
                        onUpdate({
                          ...student,
                          documents: newDocs,
                          activities: [
                            {
                              id: Math.random().toString(),
                              date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
                              type: 'VERIFIED',
                              description: `Document verified: ${doc.name}`
                            },
                            ...student.activities
                          ]
                        });
                      }}>Verify</Button>
                    )}
                  </td>
                </tr>
              ))}
              {documents.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500 text-sm">
                    No documents uploaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      
    </div>
  );
}


function EssaysView({ student, onUpdate }: { student: Student, onUpdate: (s: Student) => void }) {
  const essays = student.essays || [];
  const [selectedEssayId, setSelectedEssayId] = useState<string | null>(null);
  const selectedEssay = essays.find(e => e.id === selectedEssayId) || null;
  const [feedback, setFeedback] = useState('');
  const [evaluations, setEvaluations] = useState<Record<string, 'Needs Work' | 'Satisfactory' | 'Excellent'>>({});
  
  const EVAL_PARAMS = [
    'Personal Insight', 'Reflective Narrative', 'Prompt Alignment',
    'Engaging Hook', 'Structural Flow', 'Word Count', 'Authentic Tone'
  ];
  const [isAssigning, setIsAssigning] = useState(false);
  const [newPrompt, setNewPrompt] = useState('');
  const [newUniversity, setNewUniversity] = useState('');

  const handleAssignPrompt = () => {
    if (!newPrompt) return;
    const newEssay: Essay = {
      id: 'e' + Date.now(),
      prompt: newPrompt,
      university: newUniversity,
      status: 'In Progress',
      versions: []
    };
    onUpdate({
      ...student,
      essays: [...essays, newEssay],
      activities: [
        {
          id: Math.random().toString(),
          date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
          type: 'SYSTEM',
          description: `Counselor assigned new prompt: ${newPrompt}`
        },
        ...student.activities
      ]
    });
    setIsAssigning(false);
    setNewPrompt('');
    setNewUniversity('');
  };

  const getStatusBadge = (status: Essay['status']) => {
    switch(status) {
      case 'In Progress': return <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">In Progress</span>;
      case 'Draft Saved': return <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">🟡 Draft Saved</span>;
      case 'Under Review': return <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">🟡 Under Review</span>;
      case 'Needs Revision': return <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">🔴 Needs Revision</span>;
      case 'Approved': return <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">🟢 Approved</span>;
    }
  };

  const handleStatusChange = (essay: Essay, newStatus: Essay['status'], extraFeedback?: string) => {
    const updatedEssay = { ...essay, status: newStatus };
    if (extraFeedback || Object.keys(evaluations).length > 0) {
      updatedEssay.versions = [...updatedEssay.versions];
      if (updatedEssay.versions.length > 0) {
        updatedEssay.versions[0] = {
           ...updatedEssay.versions[0],
           feedback: extraFeedback || updatedEssay.versions[0].feedback,
           evaluations: { ...updatedEssay.versions[0].evaluations, ...evaluations }
        };
      }
    }

    const newEssays = essays.map(e => e.id === essay.id ? updatedEssay : e);
    
    onUpdate({
      ...student,
      essays: newEssays,
      activities: [
        {
          id: Math.random().toString(),
          date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
          type: 'UPDATE',
          description: `Essay status updated to ${newStatus}: ${essay.prompt}`
        },
        ...student.activities
      ]
    });
    
    if (selectedEssayId === essay.id) {
      setFeedback('');
    }
  };

  if (selectedEssay) {
    const latestVersion = selectedEssay.versions[0];
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedEssayId(null)} className="text-slate-400 hover:text-slate-600 p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Essay Review Center</h3>
            <p className="text-xs text-slate-500">{student.name} • {selectedEssay.university || 'General Essay'}</p>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-6">
          <div className="col-span-3 space-y-4">
            <Card className="flex flex-col h-[500px]">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                 <div>
                   <p className="text-xs font-bold text-slate-500 uppercase">Draft Preview ({latestVersion?.version || 'N/A'})</p>
                   <p className="text-sm font-bold text-slate-900 mt-1">{selectedEssay.prompt}</p>
                 </div>
                 {getStatusBadge(selectedEssay.status)}
              </div>
              <div className="p-6 flex-1 overflow-y-auto font-serif text-slate-800 leading-relaxed whitespace-pre-wrap bg-white">
                {latestVersion?.content || 'No content provided yet.'}
              </div>
            </Card>
          </div>
          
          <div className="col-span-2 space-y-4">
            <Card className="h-full flex flex-col">
               <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0">
                 <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Counselor Review Panel</h4>
               </div>
               <div className="p-4 flex-1 flex flex-col gap-4">
                 {(latestVersion?.feedback || latestVersion?.evaluations) && (
                   <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 space-y-4">
                     <p className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Previous Feedback</p>
                     {latestVersion.evaluations && Object.keys(latestVersion.evaluations).length > 0 && (
                       <div className="grid grid-cols-2 gap-2 mt-2">
                         {Object.entries(latestVersion.evaluations).map(([k, v]) => (
                           <div key={k} className="flex justify-between items-center text-xs bg-white/50 p-1.5 rounded">
                             <span className="font-semibold text-amber-900">{k}</span>
                             <span className={v === 'Excellent' ? 'text-green-700 font-bold' : v === 'Satisfactory' ? 'text-amber-700 font-bold' : 'text-red-700 font-bold'}>
                               {v === 'Excellent' ? '🟢' : v === 'Satisfactory' ? '🟡' : '🔴'} {v}
                             </span>
                           </div>
                         ))}
                       </div>
                     )}
                     {latestVersion.feedback && <p className="text-sm text-amber-900 italic mt-2">"{latestVersion.feedback}"</p>}
                   </div>
                 )}
                 
                 {(selectedEssay.status === 'Under Review' || selectedEssay.status === 'Draft Saved') && (
                   <div className="flex-1 flex flex-col mt-4 gap-4">
                     <div className="space-y-3">
                       <label className="block text-xs font-bold text-slate-700 uppercase">Core Evaluation Parameters</label>
                       {EVAL_PARAMS.map(param => (
                         <div key={param} className="flex items-center justify-between bg-white border border-slate-200 rounded p-2">
                           <span className="text-xs font-semibold text-slate-700">{param}</span>
                           <div className="flex gap-1">
                             <button onClick={() => setEvaluations(prev => ({...prev, [param]: 'Needs Work'}))} className={`px-2 py-1 text-[10px] rounded ${evaluations[param] === 'Needs Work' ? 'bg-red-100 text-red-700 font-bold' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>🔴 Needs Work</button>
                             <button onClick={() => setEvaluations(prev => ({...prev, [param]: 'Satisfactory'}))} className={`px-2 py-1 text-[10px] rounded ${evaluations[param] === 'Satisfactory' ? 'bg-amber-100 text-amber-700 font-bold' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>🟡 Satisfactory</button>
                             <button onClick={() => setEvaluations(prev => ({...prev, [param]: 'Excellent'}))} className={`px-2 py-1 text-[10px] rounded ${evaluations[param] === 'Excellent' ? 'bg-green-100 text-green-700 font-bold' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>🟢 Excellent</button>
                           </div>
                         </div>
                       ))}
                     </div>
                     <div className="flex flex-col flex-1">
                       <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Action Items / General Feedback</label>
                     <textarea 
                       value={feedback}
                       onChange={e => setFeedback(e.target.value)}
                       className="w-full flex-1 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[150px]"
                       placeholder="Leave feedback for the student..."
                     />
                     </div>
                   </div>
                 )}

                 {selectedEssay.status === 'Under Review' && (
                    <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100">
                      <Button className="flex-1 bg-white border border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleStatusChange(selectedEssay, 'Needs Revision', feedback)}>
                        Request Revisions
                      </Button>
                      <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleStatusChange(selectedEssay, 'Approved', feedback)}>
                        Approve as Final
                      </Button>
                    </div>
                 )}
                 {selectedEssay.status === 'Needs Revision' && (
                    <div className="mt-auto pt-4 border-t border-slate-100">
                       <p className="text-sm text-slate-500 text-center">Waiting for student to upload new draft.</p>
                    </div>
                 )}
               </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Essays & Supplementals</h3>
        <Button onClick={() => setIsAssigning(true)} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Assign Prompt
        </Button>
      </div>
      
      {isAssigning && (
        <Card className="mb-6 border-blue-200 shadow-sm">
          <div className="p-4 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
            <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider">Assign New Prompt</h4>
            <button onClick={() => setIsAssigning(false)} className="text-blue-400 hover:text-blue-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <CardContent className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">University (Optional)</label>
              <input type="text" value={newUniversity} onChange={e => setNewUniversity(e.target.value)} placeholder="e.g. Stanford University" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Prompt / Guidelines</label>
              <textarea value={newPrompt} onChange={e => setNewPrompt(e.target.value)} placeholder="Enter the prompt or specific instructions..." className="w-full h-24 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleAssignPrompt} disabled={!newPrompt} className="bg-blue-600 hover:bg-blue-700 text-white">
                Send to Student Workspace
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {essays.map(essay => (
          <Card key={essay.id} className="cursor-pointer hover:border-blue-300 transition-colors" onClick={() => { setSelectedEssayId(essay.id); setEvaluations({}); setFeedback(''); }}>
            <CardContent className="p-5 flex flex-col h-full">
               <div className="flex justify-between items-start mb-4">
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">
                   {essay.university || 'General Form'}
                 </span>
                 {getStatusBadge(essay.status)}
               </div>
               
               <h4 className="font-bold text-slate-900 mb-2 line-clamp-2">{essay.prompt}</h4>
               
               <div className="mt-auto pt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-50">
                 <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> {essay.versions.length > 0 ? essay.versions[0].version : 'No versions'}</span>
                 <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {essay.versions.length > 0 ? essay.versions[0].date : 'N/A'}</span>
               </div>
            </CardContent>
          </Card>
        ))}
        {essays.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-200">
             No essays have been assigned to this student yet.
          </div>
        )}
      </div>
    </div>
  );
}

const TASK_CATEGORIES: TaskCategory[] = [
  'Internships', 'Research Projects', 'Competitions & Olympiads', 
  'Language Proficiency', 'MOOCs & Online Certifications', 
  'Passion Projects', 'Impact & Community Service Projects', 
  'Administrative / College Prep'
];

function TasksView({ student, onUpdate }: { student: Student, onUpdate: (s: Student) => void }) {
  const tasks = student.tasks || [];
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // New Task Form
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('Administrative / College Prep');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  
  // Feedback Form
  const [feedback, setFeedback] = useState('');
  
  const selectedTask = tasks.find(t => t.id === selectedTaskId);
  
  const handleAssignTask = () => {
    if (!newTaskName) return;
    const newTask: Task = {
      id: Math.random().toString(),
      name: newTaskName,
      category: newTaskCategory,
      dueDate: newTaskDate || 'TBD',
      stage: 'TO_DO',
      description: newTaskDesc,
      attachments: [],
      assignedBy: 'Counselor (Team Portal)'
    };
    
    onUpdate({
      ...student,
      tasks: [...tasks, newTask],
      activities: [
        {
          id: Math.random().toString(),
          date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
          type: 'UPDATE',
          description: `New task assigned: \${newTask.name}`
        },
        ...student.activities
      ]
    });
    
    setIsAssigning(false);
    setNewTaskName('');
    setNewTaskDate('');
    setNewTaskDesc('');
  };
  
  const handleReview = (stage: TaskStage) => {
    if (!selectedTask) return;
    
    const updatedTask = { ...selectedTask, stage, feedback };
    const newTasks = tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
    
    const newActivities = [...student.activities];
    if (stage === 'COMPLETED') {
      newActivities.unshift({
        id: Math.random().toString(),
        date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
        type: 'VERIFIED',
        description: `Task verified and completed: \${updatedTask.name}`
      });
    } else if (stage === 'NEEDS_REVISION') {
      newActivities.unshift({
        id: Math.random().toString(),
        date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
        type: 'UPDATE',
        description: `Task needs revision: \${updatedTask.name}`
      });
    }
    
    onUpdate({
      ...student,
      tasks: newTasks,
      activities: newActivities
    });
    
    setFeedback('');
    setSelectedTaskId(null);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Tasks & Projects</h3>
        <Button onClick={() => setIsAssigning(true)} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Assign New Task
        </Button>
      </div>
      
      {isAssigning && (
        <Card className="mb-6 border-blue-200 shadow-sm">
          <div className="p-4 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
            <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider">Assign New Task / Project</h4>
            <button onClick={() => setIsAssigning(false)} className="text-blue-400 hover:text-blue-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Task Name</label>
                <input type="text" value={newTaskName} onChange={e => setNewTaskName(e.target.value)} placeholder="e.g. Complete Coursera Module" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select value={newTaskCategory} onChange={e => setNewTaskCategory(e.target.value as TaskCategory)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Due Date</label>
              <input type="date" value={newTaskDate} onChange={e => setNewTaskDate(e.target.value)} className="w-full max-w-[200px] bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Detailed Guidelines / Instructions</label>
              <textarea value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} placeholder="Enter instructions, templates, or reference links..." className="w-full h-24 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleAssignTask} disabled={!newTaskName} className="bg-blue-600 hover:bg-blue-700 text-white">
                Assign to Student
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card className="overflow-hidden border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4">Task Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Stage</th>
                <th className="px-6 py-4">Docs</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {tasks.map(task => (
                <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900">{task.name}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium border border-slate-200">{task.category}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5 text-slate-400" /> {task.dueDate}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider", 
                      task.stage === 'TO_DO' ? 'bg-slate-100 text-slate-700' :
                      task.stage === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' :
                      task.stage === 'SUBMITTED_FOR_REVIEW' ? 'bg-blue-100 text-blue-700' :
                      task.stage === 'NEEDS_REVISION' ? 'bg-red-100 text-red-700' :
                      'bg-green-100 text-green-700'
                    )}>
                      {task.stage.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-600">
                     {task.attachments.length} Files
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50" onClick={() => { setSelectedTaskId(task.id); setFeedback(task.feedback || ''); }}>
                      {task.stage === 'SUBMITTED_FOR_REVIEW' ? 'Review' : 'View'}
                    </Button>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm">
                    No tasks have been assigned yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      {/* Review & Approval Drawer / Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-start shrink-0">
              <div className="space-y-2">
                 <h2 className="text-2xl font-bold text-slate-900">{selectedTask.name}</h2>
                 <div className="flex gap-4 text-xs font-medium text-slate-500">
                   <span className="px-2 py-0.5 bg-white border border-slate-200 rounded">{selectedTask.category}</span>
                   <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5"/> Due: {selectedTask.dueDate}</span>
                 </div>
              </div>
              <button onClick={() => setSelectedTaskId(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full shrink-0">
                 <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
               <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                 <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Instructions Given</h4>
                 <p className="text-sm text-slate-700">{selectedTask.description}</p>
               </div>
               
               <div className="space-y-4">
                 <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Student Submission & Progress</h3>
                 
                 <div>
                   <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Student Notes</label>
                   <div className="text-sm text-slate-900 bg-white border border-slate-200 rounded-lg p-3 min-h-[60px]">
                     {selectedTask.studentNotes || <span className="text-slate-400 italic">No notes provided</span>}
                   </div>
                 </div>
                 
                 {selectedTask.externalUrl && (
                   <div>
                     <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">External Link</label>
                     <a href={selectedTask.externalUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                       <LinkIcon className="w-4 h-4"/> {selectedTask.externalUrl}
                     </a>
                   </div>
                 )}
                 
                 <div>
                   <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Attached Proof Documents</label>
                   {selectedTask.attachments.length > 0 ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                       {selectedTask.attachments.map(att => (
                         <div key={att.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                           <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                           <div className="overflow-hidden">
                             <p className="text-sm font-medium text-slate-900 truncate">{att.fileName}</p>
                             <p className="text-[10px] text-slate-500">Uploaded {att.uploadedAt}</p>
                           </div>
                           <Button variant="ghost" size="sm" className="ml-auto text-blue-600 h-8">View</Button>
                         </div>
                       ))}
                     </div>
                   ) : (
                     <div className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-4 text-center italic">
                       No files attached.
                     </div>
                   )}
                 </div>
               </div>
               
               {/* Review Section */}
               <div className="pt-4 border-t border-slate-200">
                 <h3 className="text-sm font-bold text-slate-900 mb-3">Counselor Feedback & Decision</h3>
                 <textarea 
                   value={feedback}
                   onChange={e => setFeedback(e.target.value)}
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[100px]"
                   placeholder="Add constructive notes, inline suggestions, or feedback..."
                 />
               </div>
            </div>
            
            <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0 rounded-b-3xl">
              <Button variant="outline" className="bg-white border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleReview('NEEDS_REVISION')}>
                Request Revision
              </Button>
              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleReview('COMPLETED')}>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Approve & Verify
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



function ProfileDetailsView({ student, onUpdate }: { student: Student, onUpdate: (s: Student) => void }) {
  const { currentUser } = useDatabase();
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    name: student.name,
    email: student.email,
    phone: student.phone,
    school: student.school,
    intake: student.intake,
    countries: student.countries.join(', ')
  });

  const defaultScores = [
    { grade: 'Grade 8', score: '', isProjected: false, notes: '' },
    { grade: 'Grade 9', score: '', isProjected: false, notes: '' },
    { grade: 'Grade 10', score: '', isProjected: false, notes: '' },
    { grade: 'Grade 11', score: '', isProjected: true, notes: '' },
    { grade: 'Grade 12', score: '', isProjected: true, notes: '' },
  ];

  const [scores, setScores] = useState<any[]>(student.academicScores || defaultScores);
  const [extracurriculars, setExtracurriculars] = useState<any[]>(student.extracurriculars || []);

  const handleSave = () => {
    onUpdate({
      ...student,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      school: formData.school,
      intake: formData.intake,
      countries: formData.countries.split(',').map(s => s.trim()),
      academicScores: scores,
      extracurriculars: extracurriculars
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Master Details</h3>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} size="sm" variant="outline" className="bg-white">Edit Profile</Button>
        ) : (
          <div className="flex gap-2">
             <Button onClick={() => setIsEditing(false)} size="sm" variant="ghost">Cancel</Button>
             <Button onClick={handleSave} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">Save Changes</Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-y-6 gap-x-8">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Student Name</p>
              {isEditing ? (
                <input className="w-full border rounded p-2 text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              ) : (
                <p className="text-sm font-medium text-slate-900">{student.name}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">High School</p>
              {isEditing ? (
                <input className="w-full border rounded p-2 text-sm" value={formData.school} onChange={e => setFormData({...formData, school: e.target.value})} />
              ) : (
                <p className="text-sm font-medium text-slate-900">{student.school}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Contact Details</p>
              {isEditing ? (
                <div className="space-y-2">
                  <input className="w-full border rounded p-2 text-sm" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  <input className="w-full border rounded p-2 text-sm" placeholder="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-900">{student.email}</p>
                  <p className="text-sm font-medium text-slate-900">{student.phone}</p>
                </>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Target Strategy</p>
              {isEditing ? (
                <div className="space-y-2">
                  <input className="w-full border rounded p-2 text-sm" placeholder="Intake (e.g. Fall 2026)" value={formData.intake} onChange={e => setFormData({...formData, intake: e.target.value})} />
                  <input className="w-full border rounded p-2 text-sm" placeholder="Countries (comma separated)" value={formData.countries} onChange={e => setFormData({...formData, countries: e.target.value})} />
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-900">Intake: {student.intake}</p>
                  <p className="text-sm font-medium text-slate-900">Countries: {student.countries.join(', ')}</p>
                </>
              )}
            </div>
            {currentUser && currentUser.role !== 'STUDENT' && student.password && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Login Credentials</p>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-900 font-medium"><span className="text-slate-500">Email:</span> {student.email}</p>
                  <p className="text-sm text-slate-900 font-medium"><span className="text-slate-500">Password:</span> <span className="font-mono">{student.password}</span></p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Class Scores (Grade 8-12)</h3>
          <div className="space-y-4">
            {scores.map((score, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-4 items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="col-span-2 font-semibold text-sm text-slate-700">{score.grade}</div>
                <div className="col-span-3">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Score</label>
                  {isEditing ? (
                    <input className="w-full border rounded p-1.5 text-sm" placeholder="e.g. 95% or 3.8/4" value={score.score} onChange={e => {
                      const newScores = [...scores]; newScores[idx].score = e.target.value; setScores(newScores);
                    }} />
                  ) : (
                    <div className="text-sm font-medium">{score.score || '—'}</div>
                  )}
                </div>
                <div className="col-span-2 flex items-center mt-4">
                  {isEditing ? (
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={score.isProjected} onChange={e => {
                        const newScores = [...scores]; newScores[idx].isProjected = e.target.checked; setScores(newScores);
                      }} /> Projected
                    </label>
                  ) : (
                    score.isProjected ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">Projected</span> : null
                  )}
                </div>
                <div className="col-span-5">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Notes (Best 3 subjects etc)</label>
                  {isEditing ? (
                    <input className="w-full border rounded p-1.5 text-sm" placeholder="e.g. Best 3: Math, Physics, CS" value={score.notes} onChange={e => {
                      const newScores = [...scores]; newScores[idx].notes = e.target.value; setScores(newScores);
                    }} />
                  ) : (
                    <div className="text-xs text-slate-600 truncate">{score.notes || '—'}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Profile Activities & Extracurriculars</h3>
            {isEditing && (
              <Button size="sm" variant="outline" onClick={() => setExtracurriculars([...extracurriculars, { id: Date.now(), title: '', category: '', verified: false }])}>
                Add Activity
              </Button>
            )}
          </div>
          <div className="space-y-4">
            {extracurriculars.length === 0 ? (
               <p className="text-sm text-slate-500">No activities recorded yet.</p>
            ) : (
              extracurriculars.map((act, idx) => (
                <div key={act.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {isEditing ? (
                    <div className="space-y-3">
                      <input className="w-full border rounded p-2 text-sm font-bold" placeholder="Role / Title (e.g. Founder)" value={act.title} onChange={e => {
                        const n = [...extracurriculars]; n[idx].title = e.target.value; setExtracurriculars(n);
                      }} />
                      <div className="grid grid-cols-2 gap-3">
                        <input className="border rounded p-2 text-sm" placeholder="Category (e.g. Leadership)" value={act.category} onChange={e => {
                          const n = [...extracurriculars]; n[idx].category = e.target.value; setExtracurriculars(n);
                        }} />
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={act.verified} onChange={e => {
                            const n = [...extracurriculars]; n[idx].verified = e.target.checked; setExtracurriculars(n);
                          }} /> Verified by Counselor
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-900">{act.title || 'Untitled Activity'}</h4>
                          <p className="text-xs text-slate-500 mt-1">{act.category || 'Uncategorized'}</p>
                        </div>
                        {act.verified && <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-1 rounded uppercase">Verified</span>}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
