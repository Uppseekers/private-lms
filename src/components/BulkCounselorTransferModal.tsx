import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  X, 
  UserCheck, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Sparkles, 
  Check, 
  AlertCircle,
  Shield,
  ArrowRight,
  UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Student, StaffMember, OperationalLog, Activity } from '@/types';

interface BulkCounselorTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStudentIds: string[];
  students: Student[];
  staff: StaffMember[];
  currentUser: any;
  onConfirmTransfer: (updatedStudents: Student[]) => void;
}

export default function BulkCounselorTransferModal({
  isOpen,
  onClose,
  selectedStudentIds,
  students,
  staff,
  currentUser,
  onConfirmTransfer
}: BulkCounselorTransferModalProps) {
  const [targetCounselor, setTargetCounselor] = useState('');
  const [updateCounselor, setUpdateCounselor] = useState(true);

  const [updateResearchMentor, setUpdateResearchMentor] = useState(false);
  const [targetResearchMentor, setTargetResearchMentor] = useState('');

  const [updateSatMentors, setUpdateSatMentors] = useState(false);
  const [targetSatVerbalMentor, setTargetSatVerbalMentor] = useState('');
  const [targetSatMathMentor, setTargetSatMathMentor] = useState('');

  const [transferReason, setTransferReason] = useState('Bulk counselor transfer in student database');
  const [recordLog, setRecordLog] = useState(true);
  const [isExpandedList, setIsExpandedList] = useState(false);

  if (!isOpen || selectedStudentIds.length === 0) return null;

  const selectedStudents = students.filter(s => selectedStudentIds.includes(s.id));

  // Categorize staff members
  const counselors = (staff || []).filter(s => 
    s.role === 'COUNSELOR' || 
    s.role === 'LEAD_COUNSELOR' || 
    s.role === 'ADMIN' || 
    s.role === 'OPS_LEAD' || 
    s.role === 'APPLICATION_SPECIALIST'
  );

  const researchMentors = (staff || []).filter(s => 
    s.role === 'RESEARCH_MENTOR' || 
    s.role === 'COUNSELOR' || 
    s.role === 'LEAD_COUNSELOR' || 
    s.role === 'ADMIN'
  );

  const satFaculty = (staff || []).filter(s => 
    s.role === 'SAT_FACULTY' || 
    s.role === 'TEACHER' || 
    s.role === 'ADMIN' || 
    s.role === 'COUNSELOR'
  );

  // Helper to count active students per staff member
  const getStudentCount = (staffName: string) => {
    return students.filter(s => 
      s.counselor?.toLowerCase() === staffName.toLowerCase() ||
      s.researchMentor?.toLowerCase() === staffName.toLowerCase() ||
      s.satVerbalMentor?.toLowerCase() === staffName.toLowerCase() ||
      s.satMathMentor?.toLowerCase() === staffName.toLowerCase()
    ).length;
  };

  const handleConfirm = () => {
    if (updateCounselor && !targetCounselor) {
      alert('Please select a target counselor to transfer these students to.');
      return;
    }

    const nowStr = new Date().toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });

    const updatedStudentsList = students.map(student => {
      if (!selectedStudentIds.includes(student.id)) return student;

      const oldCounselor = student.counselor || 'Unassigned';
      const newCounselor = updateCounselor ? targetCounselor : student.counselor;
      const newResearch = updateResearchMentor ? targetResearchMentor : student.researchMentor;
      const newSatVerbal = updateSatMentors ? targetSatVerbalMentor : student.satVerbalMentor;
      const newSatMath = updateSatMentors ? targetSatMathMentor : student.satMathMentor;

      const newLogs: OperationalLog[] = [];
      const newActivities: Activity[] = [];

      if (recordLog) {
        if (updateCounselor && targetCounselor !== oldCounselor) {
          newLogs.push({
            id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            timestamp: nowStr,
            performedBy: currentUser?.name || 'Administrator',
            role: currentUser?.role || 'ADMIN',
            activityType: 'Counselor Transfer',
            description: `Admissions Counselor reassigned from "${oldCounselor}" to "${targetCounselor}". Note: ${transferReason}`
          });

          newActivities.push({
            id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            date: nowStr,
            type: 'SYSTEM',
            description: `Counselor reassigned to ${targetCounselor} (${transferReason})`
          });
        }

        if (updateResearchMentor && targetResearchMentor) {
          newLogs.push({
            id: 'log_res_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            timestamp: nowStr,
            performedBy: currentUser?.name || 'Administrator',
            role: currentUser?.role || 'ADMIN',
            activityType: 'Research Mentor Assigned',
            description: `Assigned research mentor "${targetResearchMentor}".`
          });
        }
      }

      return {
        ...student,
        counselor: newCounselor,
        ...(updateResearchMentor ? { researchMentor: newResearch } : {}),
        ...(updateSatMentors ? { satVerbalMentor: newSatVerbal, satMathMentor: newSatMath } : {}),
        operationalLogs: [...newLogs, ...(student.operationalLogs || [])],
        activities: [...newActivities, ...(student.activities || [])]
      };
    });

    onConfirmTransfer(updatedStudentsList);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 p-6 text-white flex justify-between items-start shrink-0 relative">
          <div className="space-y-1 relative z-10 pr-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-xs border border-white/20">
                Bulk Staff Assignment
              </span>
              <span className="text-xs text-indigo-100 font-semibold">
                {selectedStudentIds.length} Student{selectedStudentIds.length > 1 ? 's' : ''} Selected
              </span>
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-200" /> Transfer Counselor & Mentors
            </h3>
            <p className="text-xs text-indigo-100/90 leading-snug">
              Directly reassign student rosters to a new admissions counselor or advisory guide with instant activity log recording.
            </p>
          </div>

          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm flex-1">
          {/* Selected Students Preview Strip */}
          <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-600" /> Selected Students ({selectedStudents.length})
              </span>
              {selectedStudents.length > 4 && (
                <button
                  type="button"
                  onClick={() => setIsExpandedList(!isExpandedList)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  {isExpandedList ? 'Show Less' : `View All (${selectedStudents.length})`}
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {(isExpandedList ? selectedStudents : selectedStudents.slice(0, 6)).map(s => (
                <div 
                  key={s.id}
                  className="bg-white border border-indigo-200/80 px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs"
                >
                  <span className="font-bold text-slate-800">{s.name}</span>
                  <span className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">
                    (Current: {s.counselor || 'None'})
                  </span>
                </div>
              ))}
              {!isExpandedList && selectedStudents.length > 6 && (
                <span className="px-2 py-1 text-xs text-indigo-600 font-bold self-center">
                  +{selectedStudents.length - 6} more
                </span>
              )}
            </div>
          </div>

          {/* 1. Target Counselor Assignment */}
          <div className="space-y-3 p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={updateCounselor}
                  onChange={(e) => setUpdateCounselor(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-indigo-600" /> Assign Admissions Counselor
                </span>
              </label>
              <span className="text-[11px] font-semibold text-indigo-600">Primary Advisor</span>
            </div>

            {updateCounselor && (
              <div className="space-y-2 pl-6">
                <select
                  value={targetCounselor}
                  onChange={(e) => setTargetCounselor(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                >
                  <option value="">-- Choose Target Counselor --</option>
                  <optgroup label="Active Counselors & Leadership">
                    {(counselors.length > 0 ? counselors : staff).map(st => {
                      const count = getStudentCount(st.name);
                      return (
                        <option key={st.id || st.email} value={st.name}>
                          {st.name} ({st.role?.replace(/_/g, ' ') || 'Counselor'}) — {count} student{count !== 1 ? 's' : ''} currently
                        </option>
                      );
                    })}
                  </optgroup>
                  <optgroup label="Other Mentors & Faculty">
                    {staff.filter(st => !counselors.some(c => c.id === st.id)).map(st => {
                      const count = getStudentCount(st.name);
                      return (
                        <option key={st.id || st.email} value={st.name}>
                          {st.name} ({st.role?.replace(/_/g, ' ') || 'Staff'}) — {count} student{count !== 1 ? 's' : ''}
                        </option>
                      );
                    })}
                  </optgroup>
                </select>
                <p className="text-[11px] text-slate-500">
                  All {selectedStudents.length} student files will be updated with this counselor as their primary advisor.
                </p>
              </div>
            )}
          </div>

          {/* 2. Optional Research Guide Assignment */}
          <div className="space-y-3 p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={updateResearchMentor}
                  onChange={(e) => setUpdateResearchMentor(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-purple-600" /> Assign Research Guide / Mentor (Optional)
                </span>
              </label>
              <span className="text-[11px] font-semibold text-slate-500">Optional</span>
            </div>

            {updateResearchMentor && (
              <div className="space-y-2 pl-6">
                <select
                  value={targetResearchMentor}
                  onChange={(e) => setTargetResearchMentor(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                >
                  <option value="">-- Choose Research Mentor (or leave unassigned) --</option>
                  {(researchMentors.length > 0 ? researchMentors : staff).map(st => (
                    <option key={st.id || st.email} value={st.name}>
                      {st.name} ({st.role?.replace(/_/g, ' ') || 'Mentor'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 3. Optional SAT Faculty Assignment */}
          <div className="space-y-3 p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={updateSatMentors}
                  onChange={(e) => setUpdateSatMentors(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" /> Assign SAT Faculty (Verbal / Math)
                </span>
              </label>
              <span className="text-[11px] font-semibold text-slate-500">Optional</span>
            </div>

            {updateSatMentors && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">SAT Verbal Educator</label>
                  <select
                    value={targetSatVerbalMentor}
                    onChange={(e) => setTargetSatVerbalMentor(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  >
                    <option value="">-- Select Verbal Educator --</option>
                    {(satFaculty.length > 0 ? satFaculty : staff).map(st => (
                      <option key={st.id || st.email} value={st.name}>{st.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">SAT Math Educator</label>
                  <select
                    value={targetSatMathMentor}
                    onChange={(e) => setTargetSatMathMentor(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  >
                    <option value="">-- Select Math Educator --</option>
                    {(satFaculty.length > 0 ? satFaculty : staff).map(st => (
                      <option key={st.id || st.email} value={st.name}>{st.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Transfer Reason & Audit Option */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Transfer Note / Reassignment Reason
            </label>
            <input
              type="text"
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="e.g. Workload rebalancing for Fall 2026 application cycle"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600">
            <input
              type="checkbox"
              checked={recordLog}
              onChange={(e) => setRecordLog(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="font-medium">
              Record this transfer event in each student's operational logs & activity trail
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs font-bold"
          >
            Cancel
          </Button>

          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={updateCounselor && !targetCounselor}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 shadow-2xs disabled:opacity-50"
          >
            <UserCheck className="w-4 h-4" /> Confirm Transfer ({selectedStudentIds.length} Students)
          </Button>
        </div>
      </div>
    </div>
  );
}
