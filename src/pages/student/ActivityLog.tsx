import React from 'react';
import { useDatabase } from '@/context/DatabaseContext';
import StudentActivityLogSection from '@/components/student/StudentActivityLogSection';
import { Clock, ShieldAlert } from 'lucide-react';

export default function StudentActivityLog() {
  const { currentUser, students, batches } = useDatabase();

  const student = students.find(s => 
    (currentUser?.id && s.id === currentUser.id) || 
    (currentUser?.email && s.email?.toLowerCase() === currentUser.email?.toLowerCase())
  ) || students[0] || (currentUser as any);

  if (!student) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md mx-auto my-12 space-y-3">
        <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">Student Profile Not Found</h3>
        <p className="text-xs text-slate-500">
          Please sign in as a student or select a student from the team dashboard to view activity updates.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Activity Log & Chronological Updates
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Complete chronological audit trail for assigned tasks, university applications, batch changes, upcoming deadlines, and counselor guidance notes. Click any event to expand detailed context.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Student</span>
            <span className="text-xs font-bold text-slate-800">{student.name}</span>
          </div>
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold border border-indigo-100 shadow-2xs">
            {student.name ? student.name.charAt(0) : 'S'}
          </div>
        </div>
      </div>

      {/* FULL ACTIVITY LOG SECTION */}
      <StudentActivityLogSection 
        student={student} 
        batches={batches} 
        isStandalonePage={true} 
      />
    </div>
  );
}
