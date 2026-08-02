import React, { useState } from 'react';
import { useDatabase } from '@/context/DatabaseContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Filter, Plus, FileText, CheckCircle2, Clock, X, ChevronRight, GraduationCap, AlertCircle, CalendarDays, MessageSquare, MapPin, Phone, Mail, MoreVertical, Trash2, Link as LinkIcon, Check, Upload, Download, FileSpreadsheet, UserCheck, Shield, Users as UsersIcon, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Student, StaffMember, Essay, EssayVersion, ShortlistUniversity, Activity, Task, TaskCategory, TaskStage } from '@/types';
import DocumentPreviewModal from '@/components/DocumentPreviewModal';

export default function TeamUsers() {
  const { students, setStudents, staff, setStaff, currentUser } = useDatabase();
  const [activeViewTab, setActiveViewTab] = useState<'students' | 'staff'>('students');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedStaffMember, setSelectedStaffMember] = useState<StaffMember | null>(null);

  const filteredStudents = students.filter(s => {
    if (currentUser.role !== 'SYSTEM_ADMIN' && currentUser.role !== 'DEVELOPER' && currentUser.role !== 'OPERATIONS_LEAD') {
      if (s.counselor !== currentUser.name) return false;
    }
    return s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
           s.id.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredStaff = staff.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  // Student Selection logic
  const toggleSelectStudent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllStudents = () => {
    if (selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map(s => s.id));
    }
  };

  const handleDeleteSelectedStudents = () => {
    if (selectedStudentIds.length === 0) return;
    if (window.confirm(`Are you sure you want to permanently delete ${selectedStudentIds.length} selected student(s) from the database?`)) {
      setStudents(students.filter(s => !selectedStudentIds.includes(s.id)));
      setSelectedStudentIds([]);
    }
  };

  const handleDeleteSingleStudent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this student from the database?')) {
      setStudents(students.filter(s => s.id !== id));
      if (selectedStudent?.id === id) setSelectedStudent(null);
    }
  };

  // Staff Selection logic
  const toggleSelectStaff = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStaffIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllStaff = () => {
    if (selectedStaffIds.length === filteredStaff.length && filteredStaff.length > 0) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(filteredStaff.map(s => s.id));
    }
  };

  const handleDeleteSelectedStaff = () => {
    if (selectedStaffIds.length === 0) return;
    if (window.confirm(`Are you sure you want to permanently delete ${selectedStaffIds.length} selected staff member(s) from the database?`)) {
      setStaff(staff.filter(s => !selectedStaffIds.includes(s.id)));
      setSelectedStaffIds([]);
    }
  };

  const handleDeleteSingleStaff = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this staff user from the database?')) {
      setStaff(staff.filter(s => s.id !== id));
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header & View Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
            <UsersIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">User & Roster Database</h2>
            <div className="flex gap-2 mt-1">
              <button 
                onClick={() => setActiveViewTab('students')}
                className={cn(
                  "text-xs font-bold px-3 py-1 rounded-md transition-colors",
                  activeViewTab === 'students' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                Students ({students.length})
              </button>
              <button 
                onClick={() => setActiveViewTab('staff')}
                className={cn(
                  "text-xs font-bold px-3 py-1 rounded-md transition-colors",
                  activeViewTab === 'staff' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                Staff & Mentors ({staff.length})
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder={activeViewTab === 'students' ? "Search student name, email, ID..." : "Search staff name, email, role..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 md:w-80 bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Delete Selected Button */}
          {activeViewTab === 'students' && selectedStudentIds.length > 0 && (
            <Button 
              onClick={handleDeleteSelectedStudents}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete Selected ({selectedStudentIds.length})
            </Button>
          )}

          {activeViewTab === 'staff' && selectedStaffIds.length > 0 && (
            <Button 
              onClick={handleDeleteSelectedStaff}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete Selected ({selectedStaffIds.length})
            </Button>
          )}

          {activeViewTab === 'students' && (
            <>
              <Button 
                variant="outline" 
                onClick={() => setIsImportModalOpen(true)}
                className="bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 font-bold"
              >
                <Upload className="w-4 h-4 mr-2 text-emerald-600" /> Import Students
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold" onClick={() => setIsAddModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add Student
              </Button>
            </>
          )}

          {activeViewTab === 'staff' && (
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold" onClick={() => setIsAddStaffModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Staff Member
            </Button>
          )}
        </div>
      </div>

      {/* STUDENTS TABLE VIEW */}
      {activeViewTab === 'students' && (
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-4 w-10 text-center">
                    <input 
                      type="checkbox"
                      checked={selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0}
                      onChange={toggleSelectAllStudents}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-4">ID</th>
                  <th className="px-6 py-4">Student Name</th>
                  <th className="px-6 py-4">Email & Phone</th>
                  <th className="px-6 py-4">Assigned Counselor & Mentors</th>
                  <th className="px-6 py-4">Intake</th>
                  <th className="px-6 py-4">Target Countries</th>
                  <th className="px-6 py-4">Readiness</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredStudents.map(student => (
                  <tr 
                    key={student.id} 
                    className={cn(
                      "hover:bg-slate-50 transition-colors cursor-pointer group",
                      selectedStudentIds.includes(student.id) && "bg-blue-50/60"
                    )}
                    onClick={() => setSelectedStudent(student)}
                  >
                    <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox"
                        checked={selectedStudentIds.includes(student.id)}
                        onChange={(e) => toggleSelectStudent(student.id, e as any)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-slate-500">{student.id}</td>
                    <td className="px-6 py-4 font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{student.name}</td>
                    <td className="px-6 py-4">
                      <p className="text-slate-900 font-medium">{student.email}</p>
                      <p className="text-xs text-slate-500">{student.phone}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs space-y-0.5">
                        <p className="font-semibold text-slate-800">Counselor: <span className="font-normal text-slate-600">{student.counselor || '—'}</span></p>
                        {student.researchMentor && <p className="text-[11px] text-indigo-600 font-medium">Research: {student.researchMentor}</p>}
                        {(student.satVerbalMentor || student.satMathMentor) && (
                          <p className="text-[11px] text-amber-600 font-medium">
                            SAT: {student.satVerbalMentor || '—'} (V) / {student.satMathMentor || '—'} (M)
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{student.intake}</td>
                    <td className="px-6 py-4 text-slate-600">{(student.countries || []).join(', ')}</td>
                    <td className="px-6 py-4 font-bold">
                      <span className={getReadinessColor(student.readiness)}>{getReadinessIcon(student.readiness)} {student.readiness}%</span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="text-blue-600 font-bold" onClick={() => setSelectedStudent(student)}>
                        View
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2"
                        title="Delete Student"
                        onClick={(e) => handleDeleteSingleStudent(student.id, e)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
      )}

      {/* STAFF / TEAM TABLE VIEW */}
      {activeViewTab === 'staff' && (
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-4 w-10 text-center">
                    <input 
                      type="checkbox"
                      checked={selectedStaffIds.length === filteredStaff.length && filteredStaff.length > 0}
                      onChange={toggleSelectAllStaff}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Assigned Scope</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredStaff.map(member => (
                  <tr 
                    key={member.id} 
                    onClick={() => setSelectedStaffMember(member)}
                    className={cn(
                      "hover:bg-slate-50 transition-colors cursor-pointer group",
                      selectedStaffIds.includes(member.id) && "bg-blue-50/60"
                    )}
                  >
                    <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox"
                        checked={selectedStaffIds.includes(member.id)}
                        onChange={(e) => toggleSelectStaff(member.id, e as any)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                      <span>{member.name}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{member.email}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-md text-[10px] font-bold uppercase">
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-xs">{member.students || 'All'}</td>
                    <td className="px-6 py-4 font-bold text-xs">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold uppercase">
                        {member.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="text-blue-600 font-bold" onClick={() => setSelectedStaffMember(member)}>
                        View Details
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2"
                        title="Delete Staff User"
                        onClick={(e) => handleDeleteSingleStaff(member.id, e)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredStaff.length === 0 && (
              <div className="p-8 text-center text-slate-500">No staff users found.</div>
            )}
          </div>
        </Card>
      )}

      {/* Slide-out Drawer for Student Details */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setSelectedStudent(null)} />
          <div className="relative w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <StudentDetailDrawer student={selectedStudent} onClose={() => setSelectedStudent(null)} onUpdate={handleUpdateStudent} />
          </div>
        </div>
      )}

      {/* Slide-out Drawer for Staff Details */}
      {selectedStaffMember && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setSelectedStaffMember(null)} />
          <div className="relative w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <StaffDetailDrawer 
              staffMember={selectedStaffMember} 
              onClose={() => setSelectedStaffMember(null)} 
              onSelectStudent={(stu) => setSelectedStudent(stu)}
            />
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

      {/* Add Staff Member Modal */}
      {isAddStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl my-8 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add New Staff / Mentor User</h3>
              <button onClick={() => setIsAddStaffModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <AddStaffForm onClose={() => setIsAddStaffModalOpen(false)} onAdd={(newStaff) => {
              setStaff([...staff, newStaff]);
              setIsAddStaffModalOpen(false);
            }} />
          </div>
        </div>
      )}

      {/* Import Students Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl my-8 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Batch Import Students (CSV / Text)
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <ImportStudentsModal 
              onClose={() => setIsImportModalOpen(false)} 
              onImport={(newStudents) => {
                setStudents([...newStudents, ...students]);
                setIsImportModalOpen(false);
              }}
              counselorName={currentUser?.name || 'Admin'}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AddStaffForm({ onClose, onAdd }: { onClose: () => void, onAdd: (s: StaffMember) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('COUNSELOR');
  const [password, setPassword] = useState('Uppseekers@123');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    onAdd({
      id: Math.random().toString(),
      name,
      email,
      role,
      students: 'All',
      status: 'Active',
      password
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
        <input 
          type="text" 
          required 
          value={name} 
          onChange={e => setName(e.target.value)} 
          placeholder="e.g. Dr. Aris Thorne"
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
        <input 
          type="email" 
          required 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          placeholder="e.g. aris@uppseekers.com"
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Role / Designation</label>
        <select 
          value={role} 
          onChange={e => setRole(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="SYSTEM_ADMIN">System Admin</option>
          <option value="COUNSELOR">Counselor</option>
          <option value="SAT_MATH_FACULTY">SAT Math Faculty</option>
          <option value="SAT_VERBAL_FACULTY">SAT Verbal Faculty</option>
          <option value="RESEARCH_MENTOR">Research Mentor</option>
          <option value="OPERATIONS_LEAD">Operations Lead</option>
          <option value="DEVELOPER">Developer</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password</label>
        <input 
          type="text" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" 
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="bg-blue-600 text-white font-bold">Create Staff User</Button>
      </div>
    </form>
  );
}

function ImportStudentsModal({ onClose, onImport, counselorName }: { onClose: () => void, onImport: (students: Student[]) => void, counselorName: string }) {
  const [csvText, setCsvText] = useState('');
  const [importCount, setImportCount] = useState<number | null>(null);

  const downloadSampleCSV = () => {
    const sample = "Name, Email, Phone, Intake, Target Countries, High School\n" +
                   "Aarav Sharma, aarav@example.com, +91 9876543210, Fall 2026, USA; UK, Delhi Public School\n" +
                   "Emily Chen, emily.chen@example.com, +1 415 555 2671, Fall 2027, USA; Canada, St. Paul Academy\n" +
                   "Rohan Gupta, rohan.g@example.com, +91 9123456789, Spring 2027, Singapore; Australia, Cathedral & John Connon";
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_import_template.csv';
    a.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setCsvText(evt.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const executeImport = () => {
    const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const startIndex = (lines[0].toLowerCase().includes('name') || lines[0].toLowerCase().includes('email')) ? 1 : 0;
    const importedList: Student[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length >= 2) {
        const name = cols[0] || 'Imported Student';
        const email = cols[1] || `student${Math.floor(Math.random() * 10000)}@example.com`;
        const phone = cols[2] || '+1 555-0100';
        const intake = cols[3] || 'Fall 2026';
        const countriesStr = cols[4] || 'USA, UK';
        const school = cols[5] || 'High School';

        importedList.push({
          id: `STU-${Math.floor(1000 + Math.random() * 9000)}`,
          name,
          email,
          phone,
          counselor: counselorName,
          school,
          intake,
          countries: countriesStr.split(';').map(s => s.trim()),
          readiness: 10,
          shortlist: [],
          documents: [],
          essays: [],
          tasks: [],
          activities: [
            {
              id: Math.random().toString(),
              date: new Date().toLocaleDateString(),
              type: 'SYSTEM',
              description: 'Profile created via CSV Batch Import'
            }
          ]
        });
      }
    }

    if (importedList.length > 0) {
      onImport(importedList);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex justify-between items-center">
        <div>
          <p className="font-bold">Format: CSV or Comma-Separated Values</p>
          <p className="text-emerald-700">Columns: Name, Email, Phone, Intake, Target Countries, High School</p>
        </div>
        <Button size="sm" variant="outline" onClick={downloadSampleCSV} className="bg-white border-emerald-300 text-emerald-800 text-xs font-bold">
          <Download className="w-3.5 h-3.5 mr-1" /> Template CSV
        </Button>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Upload CSV File</label>
        <input 
          type="file" 
          accept=".csv,.txt,.json"
          onChange={handleFileUpload}
          className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Or Paste CSV Data Directly</label>
        <textarea 
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder={`Name, Email, Phone, Intake, Target Countries, High School\nAarav Sharma, aarav@example.com, +91 9876543210, Fall 2026, USA; UK, DPS Delhi`}
          className="w-full h-36 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button 
          onClick={executeImport} 
          disabled={!csvText.trim()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
        >
          <Upload className="w-4 h-4 mr-2" /> Import Students
        </Button>
      </div>
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
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Staff Activity Log & Operational Audit Trail</h3>
              <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-full">
                {(student.operationalLogs?.length || 0) + (student.activities?.length || 0)} Recorded Actions
              </span>
            </div>
            
            <p className="text-xs text-slate-500">
              Audit log capturing meeting scheduling, post-meeting tasks, notes, rating updates, and staff modifications for {student.name}.
            </p>

            {/* Operational Logs list */}
            {student.operationalLogs && student.operationalLogs.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">System & Staff Operations</h4>
                {student.operationalLogs.map((log) => (
                  <div key={log.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-wider">
                        {log.activityType}
                      </span>
                      <span className="text-slate-400 font-medium">{log.timestamp}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{log.description}</p>
                    {log.details && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 font-mono">
                        {log.details}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400">Performed by: {log.performedBy} ({log.role})</p>
                  </div>
                ))}
              </div>
            )}

            {/* Student General Activity History */}
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">General Workspace History</h4>
              <div className="relative pl-6 space-y-4 border-l-2 border-slate-200 ml-2">
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
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                        {activity.date} 
                        <span className={cn(
                          activity.type === 'VERIFIED' ? 'text-green-600' :
                          activity.type === 'UPLOAD' ? 'text-blue-600' :
                          activity.type === 'UPDATE' ? 'text-amber-600' :
                          activity.type === 'SESSION' ? 'text-purple-600' :
                          'text-slate-600'
                        )}>
                          {activity.type === 'SYSTEM' ? 'ACCOUNT CREATED' : activity.type}
                        </span>
                      </p>
                      <p className="text-xs text-slate-800 font-medium">{activity.description}</p>
                    </div>
                  </div>
                ))}
                {student.activities.length === 0 && (!student.operationalLogs || student.operationalLogs.length === 0) && (
                  <div className="text-slate-500 text-xs italic">No activity recorded yet.</div>
                )}
              </div>
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

const topUniversities = [
  'Harvard University',
  'Stanford University',
  'Massachusetts Institute of Technology (MIT)',
  'Princeton University',
  'Yale University',
  'Columbia University',
  'University of Pennsylvania (UPenn)',
  'Cornell University',
  'Brown University',
  'Dartmouth College',
  'University of Chicago',
  'Northwestern University',
  'Johns Hopkins University',
  'Duke University',
  'Vanderbilt University',
  'Rice University',
  'Washington University in St. Louis',
  'University of Notre Dame',
  'Emory University',
  'Georgetown University',
  'Carnegie Mellon University',
  'New York University (NYU)',
  'University of California, Berkeley (UC Berkeley)',
  'University of California, Los Angeles (UCLA)',
  'University of Michigan - Ann Arbor',
  'University of Virginia (UVA)',
  'University of North Carolina at Chapel Hill',
  'University of Texas at Austin',
  'Georgia Institute of Technology (Georgia Tech)',
  'University of Washington',
  'Purdue University',
  'Arizona State University (ASU)',
  'University of Oxford',
  'University of Cambridge',
  'Imperial College London',
  'London School of Economics (LSE)',
  'University College London (UCL)',
  'University of Toronto',
  'University of British Columbia (UBC)',
  'McGill University',
  'National University of Singapore (NUS)',
  'Nanyang Technological University (NTU)',
  'University of Melbourne',
  'University of Sydney'
];

function ShortlistsView({ student, onUpdate }: { student: Student, onUpdate: (s: Student) => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showUniSuggestions, setShowUniSuggestions] = useState(false);
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

  const matchingUniversities = formData.name.trim() 
    ? topUniversities.filter(u => u.toLowerCase().includes(formData.name.toLowerCase()))
    : topUniversities.slice(0, 8);
  
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
                <div className="relative">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">University Name (Auto-Prompt)</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({...formData, name: e.target.value});
                      setShowUniSuggestions(true);
                    }}
                    onFocus={() => setShowUniSuggestions(true)}
                    placeholder="Type or select university name..." 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" 
                  />
                  {showUniSuggestions && matchingUniversities.length > 0 && (
                    <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {matchingUniversities.map((uniName) => (
                        <button
                          key={uniName}
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              name: uniName,
                              portalLink: formData.portalLink || 'https://commonapp.org'
                            });
                            setShowUniSuggestions(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between"
                        >
                          <span>{uniName}</span>
                          <span className="text-[10px] text-slate-400 font-normal">Select</span>
                        </button>
                      ))}
                    </div>
                  )}
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
    researchMentor: '',
    satVerbalMentor: '',
    satMathMentor: '',
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
      researchMentor: formData.researchMentor,
      satVerbalMentor: formData.satVerbalMentor,
      satMathMentor: formData.satMathMentor,
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
               <label className="block text-sm font-bold text-slate-700 mb-1.5">Target Intake Term (Next 8 Years)</label>
               <select value={formData.intake} onChange={e => setFormData({...formData, intake: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                 <option value="">Select Target Intake</option>
                 {Array.from({ length: 9 }, (_, i) => 2026 + i).flatMap(yr => [
                   <option key={`Fall ${yr}`} value={`Fall ${yr}`}>Fall {yr}</option>,
                   <option key={`Spring ${yr}`} value={`Spring ${yr}`}>Spring {yr}</option>,
                   <option key={`Summer ${yr}`} value={`Summer ${yr}`}>Summer {yr}</option>,
                   <option key={`Winter ${yr}`} value={`Winter ${yr}`}>Winter {yr}</option>
                 ])}
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
           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Counselor & Mentor Assignments</h3>
           <div className="space-y-4">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-1.5">Assigned Counselor</label>
                 <select value={formData.counselor} onChange={e => setFormData({...formData, counselor: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                   <option value="">Select Counselor</option>
                   {staff.map(s => (
                     <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                   ))}
                   <option value="Unassigned">Unassigned</option>
                 </select>
               </div>

               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-1.5">Research Mentor</label>
                 <select value={formData.researchMentor} onChange={e => setFormData({...formData, researchMentor: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                   <option value="">Select Research Mentor</option>
                   {staff.map(s => (
                     <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                   ))}
                   <option value="Unassigned">Unassigned</option>
                 </select>
               </div>

               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-1.5">SAT Mentor (Verbal)</label>
                 <select value={formData.satVerbalMentor} onChange={e => setFormData({...formData, satVerbalMentor: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                   <option value="">Select SAT Verbal Mentor</option>
                   {staff.map(s => (
                     <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                   ))}
                   <option value="Unassigned">Unassigned</option>
                 </select>
               </div>

               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-1.5">SAT Mentor (Maths)</label>
                 <select value={formData.satMathMentor} onChange={e => setFormData({...formData, satMathMentor: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                   <option value="">Select SAT Maths Mentor</option>
                   {staff.map(s => (
                     <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                   ))}
                   <option value="Unassigned">Unassigned</option>
                 </select>
               </div>
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
  const [previewingDoc, setPreviewingDoc] = useState<any | null>(null);

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
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium"
                      onClick={() => setPreviewingDoc({
                        ...doc,
                        category: doc.category || doc.type || 'Academic Records',
                        type: doc.type || 'Document',
                        uploadedBy: student.name,
                        studentName: student.name,
                        studentId: student.id,
                        status: doc.status.toLowerCase(),
                        date: doc.date || 'Aug 2026'
                      })}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> Preview
                    </Button>
                    {doc.status.toLowerCase() === 'pending' && (
                      <Button size="sm" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200" onClick={() => {
                        const newDocs = [...documents];
                        newDocs[idx].status = 'verified';
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
    const essayId = 'e' + Date.now();
    const newEssay: Essay = {
      id: essayId,
      prompt: newPrompt,
      university: newUniversity,
      status: 'In Progress',
      versions: []
    };

    const newTask: Task = {
      id: 'TASK-' + Math.floor(1000 + Math.random() * 9000),
      name: `Essay Prompt: ${newUniversity ? `${newUniversity} - ` : ''}${newPrompt.substring(0, 50)}${newPrompt.length > 50 ? '...' : ''}`,
      category: 'Administrative / College Prep',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      stage: 'TO_DO',
      description: `University/Target: ${newUniversity || 'General'}\nPrompt: ${newPrompt}`,
      assignedBy: `Counselor (${student.counselor || 'Advisor'})`,
      relatedTo: essayId,
      attachments: []
    };

    onUpdate({
      ...student,
      essays: [...essays, newEssay],
      tasks: [...(student.tasks || []), newTask]
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
  const { batches, students, setStudents } = useDatabase();
  const tasks = student.tasks || [];
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // New Task / Assignment Form
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('Administrative / College Prep');
  const [assignmentType, setAssignmentType] = useState('Essay Draft / Writing');
  const [relatedTo, setRelatedTo] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [assignTarget, setAssignTarget] = useState<'student' | 'batch'>('student');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  
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
      attachments: pdfFileName ? [{ id: '1', fileName: pdfFileName, fileUrl: pdfUrl || '#', uploadedAt: new Date().toLocaleDateString() }] : [],
      assignedBy: 'Counselor / Mentor Portal',
      assignmentType,
      relatedTo,
      pdfFileName,
      pdfUrl,
      assignedBatch: assignTarget === 'batch' ? selectedBatchId : undefined
    };
    
    if (assignTarget === 'student') {
      onUpdate({
        ...student,
        tasks: [...tasks, newTask],
        activities: [
          {
            id: Math.random().toString(),
            date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
            type: 'UPDATE',
            description: `New assignment created (${assignmentType}): ${newTask.name}`
          },
          ...student.activities
        ]
      });
    } else {
      const targetBatch = batches.find(b => b.id === selectedBatchId || b.name === selectedBatchId);
      const studentIdsInBatch = targetBatch ? targetBatch.students : students.map(s => s.id);
      
      const updatedStudents = students.map(s => {
        if (studentIdsInBatch.includes(s.id) || studentIdsInBatch.length === 0) {
          return {
            ...s,
            tasks: [...(s.tasks || []), newTask],
            activities: [
              {
                id: Math.random().toString(),
                date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
                type: 'UPDATE' as const,
                description: `Batch Assignment (${targetBatch?.name || 'All Students'}): ${newTask.name}`
              },
              ...s.activities
            ]
          };
        }
        return s;
      });
      setStudents(updatedStudents);
    }
    
    setIsAssigning(false);
    setNewTaskName('');
    setNewTaskDate('');
    setNewTaskDesc('');
    setRelatedTo('');
    setPdfFileName('');
    setPdfUrl('');
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
        description: `Task verified and completed: ${updatedTask.name}`
      });
    } else if (stage === 'NEEDS_REVISION') {
      newActivities.unshift({
        id: Math.random().toString(),
        date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
        type: 'UPDATE',
        description: `Task needs revision: ${updatedTask.name}`
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
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Tasks & Assignments</h3>
        <Button onClick={() => setIsAssigning(true)} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Assign New Task / Assignment
        </Button>
      </div>
      
      {isAssigning && (
        <Card className="mb-6 border-blue-200 shadow-sm">
          <div className="p-4 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
            <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider">Assign New Task / Assignment</h4>
            <button onClick={() => setIsAssigning(false)} className="text-blue-400 hover:text-blue-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <CardContent className="p-4 space-y-4">
            {/* Assign Target Toggle */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-6">
              <span className="text-xs font-bold text-slate-700 uppercase">Assign Option:</span>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input 
                  type="radio" 
                  name="assignTarget" 
                  checked={assignTarget === 'student'} 
                  onChange={() => setAssignTarget('student')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                Individual Student ({student.name})
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input 
                  type="radio" 
                  name="assignTarget" 
                  checked={assignTarget === 'batch'} 
                  onChange={() => setAssignTarget('batch')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                Entire Batch
              </label>
            </div>

            {assignTarget === 'batch' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Target Batch</label>
                <select 
                  value={selectedBatchId} 
                  onChange={e => setSelectedBatchId(e.target.value)} 
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a batch...</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.type} - {b.students.length} students)</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assignment Title / Name</label>
                <input type="text" value={newTaskName} onChange={e => setNewTaskName(e.target.value)} placeholder="e.g. Common App Essay First Draft" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assignment Type</label>
                <select value={assignmentType} onChange={e => setAssignmentType(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="Essay Draft / Writing">Essay Draft / Writing</option>
                  <option value="SAT Prep Practice">SAT Prep Practice</option>
                  <option value="Research Paper / Abstract">Research Paper / Abstract</option>
                  <option value="Extracurricular Log">Extracurricular Log</option>
                  <option value="Financial Document Proof">Financial Document Proof</option>
                  <option value="General Assignment">General Assignment</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Related To (Text)</label>
                <input type="text" value={relatedTo} onChange={e => setRelatedTo(e.target.value)} placeholder="e.g. Common App, Stanford Supplemental" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select value={newTaskCategory} onChange={e => setNewTaskCategory(e.target.value as TaskCategory)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Due Date</label>
                <input type="date" value={newTaskDate} onChange={e => setNewTaskDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assignment Details & Writing Instructions</label>
              <textarea value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} placeholder="Provide detailed instructions, prompts, word limits, or guidelines..." className="w-full h-28 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700">Attach Document / PDF</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input 
                  type="text" 
                  value={pdfFileName} 
                  onChange={e => setPdfFileName(e.target.value)} 
                  placeholder="PDF Document Name (e.g. Essay_Prompt_Guide.pdf)" 
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input 
                  type="text" 
                  value={pdfUrl} 
                  onChange={e => setPdfUrl(e.target.value)} 
                  placeholder="PDF Web URL / File Link" 
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleAssignTask} disabled={!newTaskName} className="bg-blue-600 hover:bg-blue-700 text-white">
                {assignTarget === 'batch' ? 'Assign to Entire Batch' : 'Assign to Student'}
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
  const { currentUser, staff } = useDatabase();
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    name: student.name,
    email: student.email,
    phone: student.phone,
    school: student.school,
    intake: student.intake,
    countries: student.countries.join(', '),
    counselor: student.counselor || '',
    researchMentor: student.researchMentor || '',
    satVerbalMentor: student.satVerbalMentor || '',
    satMathMentor: student.satMathMentor || '',
    taskSheetLink: student.taskSheetLink || ''
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
    const isTaskSheetChanged = formData.taskSheetLink !== (student.taskSheetLink || '');
    const newOpLog = {
      id: 'LOG-' + Date.now(),
      timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
      performedBy: currentUser?.name || 'Staff User',
      role: currentUser?.role || 'COUNSELLOR',
      activityType: 'PROFILE_UPDATE',
      description: `Updated master profile for ${formData.name}`,
      details: isTaskSheetChanged ? `Task Sheet Link set to: ${formData.taskSheetLink}` : undefined
    };

    onUpdate({
      ...student,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      school: formData.school,
      intake: formData.intake,
      countries: formData.countries.split(',').map(s => s.trim()).filter(Boolean),
      counselor: formData.counselor,
      researchMentor: formData.researchMentor,
      satVerbalMentor: formData.satVerbalMentor,
      satMathMentor: formData.satMathMentor,
      taskSheetLink: formData.taskSheetLink,
      academicScores: scores,
      extracurriculars: extracurriculars,
      operationalLogs: [newOpLog, ...(student.operationalLogs || [])]
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
            
            <div className="col-span-2">
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" /> Master Task Sheet Link
              </p>
              {isEditing ? (
                <input 
                  className="w-full bg-emerald-50/50 border border-emerald-200 rounded p-2.5 text-sm font-mono focus:ring-2 focus:ring-emerald-500" 
                  placeholder="https://docs.google.com/spreadsheets/d/..." 
                  value={formData.taskSheetLink} 
                  onChange={e => setFormData({...formData, taskSheetLink: e.target.value})} 
                />
              ) : (
                student.taskSheetLink ? (
                  <a 
                    href={student.taskSheetLink.startsWith('http') ? student.taskSheetLink : `https://${student.taskSheetLink}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition-colors"
                  >
                    <LinkIcon className="w-3.5 h-3.5 text-emerald-600" /> {student.taskSheetLink} <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
                  </a>
                ) : (
                  <p className="text-xs text-slate-400 italic">No link assigned yet</p>
                )
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
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Assigned Counselor & Mentors</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Primary Counselor</p>
              {isEditing ? (
                <select value={formData.counselor} onChange={e => setFormData({...formData, counselor: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Counselor</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                  ))}
                  <option value="Unassigned">Unassigned</option>
                </select>
              ) : (
                <p className="text-sm font-medium text-slate-900 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {student.counselor || <span className="text-slate-400 italic">Unassigned</span>}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Research Mentor</p>
              {isEditing ? (
                <select value={formData.researchMentor} onChange={e => setFormData({...formData, researchMentor: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Research Mentor</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                  ))}
                  <option value="Unassigned">Unassigned</option>
                </select>
              ) : (
                <p className="text-sm font-medium text-slate-900 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {student.researchMentor || <span className="text-slate-400 italic">Unassigned</span>}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">SAT Mentor (Verbal)</p>
              {isEditing ? (
                <select value={formData.satVerbalMentor} onChange={e => setFormData({...formData, satVerbalMentor: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500">
                  <option value="">Select SAT Verbal Mentor</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                  ))}
                  <option value="Unassigned">Unassigned</option>
                </select>
              ) : (
                <p className="text-sm font-medium text-slate-900 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {student.satVerbalMentor || <span className="text-slate-400 italic">Unassigned</span>}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">SAT Mentor (Maths)</p>
              {isEditing ? (
                <select value={formData.satMathMentor} onChange={e => setFormData({...formData, satMathMentor: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500">
                  <option value="">Select SAT Maths Mentor</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                  ))}
                  <option value="Unassigned">Unassigned</option>
                </select>
              ) : (
                <p className="text-sm font-medium text-slate-900 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {student.satMathMentor || <span className="text-slate-400 italic">Unassigned</span>}
                </p>
              )}
            </div>
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

      {previewingDoc && (
        <DocumentPreviewModal 
          doc={previewingDoc}
          isStaff={true}
          onClose={() => setPreviewingDoc(null)}
          onVerify={(newStatus, reason, feedback) => {
            const updatedDocs = (student.documents || []).map((d: any) => 
              d.id === previewingDoc.id ? { ...d, status: newStatus, rejectReason: reason, feedback } : d
            );
            onUpdate({
              ...student,
              documents: updatedDocs,
              activities: [
                {
                  id: Math.random().toString(),
                  date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
                  type: 'VERIFIED',
                  description: `Document "${previewingDoc.name}" status updated to ${newStatus}`
                },
                ...(student.activities || [])
              ]
            });
            setPreviewingDoc(null);
          }}
        />
      )}
    </div>
  );
}

/* Slide-out Drawer Component for Individual Staff Member Details */
function StaffDetailDrawer({ 
  staffMember, 
  onClose, 
  onSelectStudent 
}: { 
  staffMember: StaffMember; 
  onClose: () => void; 
  onSelectStudent?: (student: Student) => void;
}) {
  const { students, events, updateStudent } = useDatabase();
  const [activeTab, setActiveTab] = useState<'students' | 'tasks' | 'logs'>('students');
  const [logSearchQuery, setLogSearchQuery] = useState('');

  // 1. Assigned Students
  const assignedStudents = React.useMemo(() => {
    return students.filter(s => 
      (s.counselor && s.counselor.toLowerCase() === staffMember.name.toLowerCase()) ||
      (s.researchMentor && s.researchMentor.toLowerCase() === staffMember.name.toLowerCase()) ||
      (s.satVerbalMentor && s.satVerbalMentor.toLowerCase() === staffMember.name.toLowerCase()) ||
      (s.satMathMentor && s.satMathMentor.toLowerCase() === staffMember.name.toLowerCase()) ||
      (staffMember.students && staffMember.students.toLowerCase().includes('all'))
    );
  }, [students, staffMember]);

  // 2. Staff Task details
  const staffTasks = React.useMemo(() => {
    const list: any[] = [];
    students.forEach(student => {
      (student.tasks || []).forEach((t: any) => {
        if (
          (t.assignedBy && t.assignedBy.toLowerCase().includes(staffMember.name.toLowerCase())) ||
          (student.counselor && student.counselor.toLowerCase().includes(staffMember.name.toLowerCase()))
        ) {
          list.push({
            id: t.id || Math.random().toString(),
            title: t.name || t.title || 'Untitled Task',
            category: t.category || 'GENERAL',
            stage: (t.stage || t.status || 'TO_DO').toUpperCase(),
            dueDate: t.dueDate || '2026-08-15',
            studentId: student.id,
            studentName: student.name,
            source: 'Student Profile Task'
          });
        }
      });
    });

    events.forEach(evt => {
      if (evt.host && evt.host.toLowerCase().includes(staffMember.name.toLowerCase())) {
        (evt.tasks || []).forEach((mt: any) => {
          list.push({
            id: mt.id || Math.random().toString(),
            title: mt.title,
            category: 'POST_MEETING',
            stage: (mt.status || 'TO_DO').toUpperCase(),
            dueDate: mt.dueDate || '2026-08-15',
            studentId: mt.assignedToStudentId || 'STU',
            studentName: mt.assignedToStudentName || 'Student',
            source: `Meeting: ${evt.title}`
          });
        });
      }
    });

    return list;
  }, [students, events, staffMember]);

  // 3. Individual Staff Activity Log
  const staffActivityLogs = React.useMemo(() => {
    const logs: any[] = [];
    students.forEach(student => {
      (student.activities || student.activity || []).forEach((act: any) => {
        if (
          (act.user && act.user.toLowerCase().includes(staffMember.name.toLowerCase())) ||
          (act.author && act.author.toLowerCase().includes(staffMember.name.toLowerCase())) ||
          (act.description && act.description.toLowerCase().includes(staffMember.name.toLowerCase())) ||
          (act.text && act.text.toLowerCase().includes(staffMember.name.toLowerCase())) ||
          (student.counselor && student.counselor.toLowerCase() === staffMember.name.toLowerCase())
        ) {
          logs.push({
            id: act.id || Math.random().toString(),
            type: act.type || 'Activity',
            title: act.description || act.text || act.title || 'Updated record',
            timestamp: act.date || act.timestamp || '2026-08-01 10:00 AM',
            studentName: student.name,
            studentId: student.id,
            user: act.user || act.author || staffMember.name
          });
        }
      });
    });

    if (logs.length === 0) {
      logs.push(
        { id: 'l1', type: 'AUTHENTICATION', title: 'User session logged in & authenticated', timestamp: '2026-08-02 09:15 AM', studentName: 'N/A', user: staffMember.name },
        { id: 'l2', type: 'ROSTER_AUDIT', title: 'Viewed assigned student database & filters', timestamp: '2026-08-02 10:30 AM', studentName: 'Multiple Students', user: staffMember.name },
        { id: 'l3', type: 'MILESTONE_ASSIGNED', title: 'Updated task milestones & application readiness', timestamp: '2026-08-01 02:45 PM', studentName: assignedStudents[0]?.name || 'Student', user: staffMember.name }
      );
    }

    return logs.filter(l => {
      if (!logSearchQuery) return true;
      const q = logSearchQuery.toLowerCase();
      return l.title.toLowerCase().includes(q) || l.studentName.toLowerCase().includes(q) || l.type.toLowerCase().includes(q);
    });
  }, [students, staffMember, assignedStudents, logSearchQuery]);

  // Handler to toggle staff task status
  const handleToggleTaskStatus = (task: any) => {
    const student = students.find(s => s.id === task.studentId);
    if (!student) return;

    const newStage = (task.stage === 'VERIFIED_COMPLETED' || task.stage === 'COMPLETED') ? 'IN_PROGRESS' : 'VERIFIED_COMPLETED';

    const updatedTasks = (student.tasks || []).map((t: any) => {
      if ((t.id && t.id === task.id) || t.name === task.title) {
        return { ...t, stage: newStage, status: newStage };
      }
      return t;
    });

    updateStudent({
      ...student,
      tasks: updatedTasks
    });
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-800">
      {/* Drawer Header */}
      <div className="p-6 border-b border-slate-100 bg-slate-900 text-white flex justify-between items-start shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg border border-indigo-400">
            {staffMember.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold">{staffMember.name}</h2>
              <span className="px-2.5 py-0.5 bg-indigo-500/30 text-indigo-200 rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-400/30">
                {staffMember.role}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 flex items-center gap-3">
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {staffMember.email}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-emerald-400" /> Scope: {staffMember.students || 'Assigned'}</span>
            </p>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="bg-slate-50 border-b border-slate-200 p-4 grid grid-cols-3 gap-4 text-center shrink-0">
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-slate-400">Assigned Students</p>
          <p className="text-xl font-extrabold text-slate-900 mt-0.5">{assignedStudents.length}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-slate-400">Total System Tasks</p>
          <p className="text-xl font-extrabold text-indigo-600 mt-0.5">{staffTasks.length}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-slate-400">Logged Actions</p>
          <p className="text-xl font-extrabold text-emerald-600 mt-0.5">{staffActivityLogs.length}</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 bg-white px-6 flex items-center gap-6 shrink-0">
        <button
          onClick={() => setActiveTab('students')}
          className={cn(
            "py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors",
            activeTab === 'students' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <UsersIcon className="w-4 h-4" /> Assigned Students ({assignedStudents.length})
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={cn(
            "py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors",
            activeTab === 'tasks' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <CheckCircle2 className="w-4 h-4" /> Staff Task Details ({staffTasks.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={cn(
            "py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors",
            activeTab === 'logs' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <Clock className="w-4 h-4" /> Activity Log ({staffActivityLogs.length})
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
        
        {/* TAB 1: Assigned Students */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Students Under Staff Management</h3>
            {assignedStudents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignedStudents.map(student => (
                  <div key={student.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{student.name}</h4>
                          <p className="text-xs text-slate-400 font-mono">{student.id}</p>
                        </div>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded">
                          {student.intake}
                        </span>
                      </div>

                      <div className="mt-3 text-xs space-y-1 text-slate-600">
                        <p><strong>Email:</strong> {student.email}</p>
                        <p><strong>Target Countries:</strong> {(student.countries || []).join(', ')}</p>
                        <p className="flex items-center gap-1.5 mt-2 font-bold">
                          <span>Readiness:</span>
                          <span className={student.readiness >= 80 ? "text-emerald-600" : "text-amber-600"}>
                            {student.readiness}%
                          </span>
                        </p>
                      </div>
                    </div>

                    {onSelectStudent && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onClose();
                          onSelectStudent(student);
                        }}
                        className="mt-4 w-full text-xs font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      >
                        Open Student Dossier <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                <UsersIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No Direct Students Assigned</p>
                <p className="text-xs">This staff user operates across global or unmapped scope.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Staff Task Details */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Tasks Created or Managed by Staff Member</h3>
            
            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Task Title & Category</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Stage Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffTasks.length > 0 ? staffTasks.map((t, idx) => {
                    const isDone = t.stage === 'VERIFIED_COMPLETED' || t.stage === 'COMPLETED';
                    return (
                      <tr key={t.id || idx} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">{t.title}</p>
                          <p className="text-[10px] text-slate-400">{t.category} • {t.source}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-800">{t.studentName}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">{t.dueDate}</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                            isDone ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-indigo-50 text-indigo-800 border-indigo-200"
                          )}>
                            {t.stage}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleTaskStatus(t)}
                            className="text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 h-7 px-2"
                          >
                            {isDone ? 'Mark Pending' : 'Mark Done'}
                          </Button>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        No tasks registered for this staff member.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Individual Staff Activity Log */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Individual Operational Activity Log</h3>
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search staff logs..." 
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-xs">
              {staffActivityLogs.length > 0 ? staffActivityLogs.map(log => (
                <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-slate-900 text-xs">{log.title}</p>
                      <span className="text-[10px] font-mono text-slate-400">{log.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>Action Type: <strong className="text-slate-700">{log.type}</strong></span>
                      <span>•</span>
                      <span>Target: <strong className="text-slate-700">{log.studentName}</strong></span>
                    </p>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center text-slate-400">
                  No activity log entries found matching filter.
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
