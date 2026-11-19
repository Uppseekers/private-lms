import React, { useState } from 'react';
import { X, Check, Search, GraduationCap, AlertCircle, Trash2 } from 'lucide-react';
import { UniversityRecord } from '@/data/universitiesData';
import { useDatabase } from '@/context/DatabaseContext';
import { calculateAdmissionStatus } from '@/lib/admissionsEngine';
import { toValidDocId } from '@/lib/firebase';

interface ShortlistToStudentModalProps {
  university: UniversityRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (studentName: string) => void;
}

export const ShortlistToStudentModal: React.FC<ShortlistToStudentModalProps> = ({
  university,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { students, updateStudent, currentUser } = useDatabase();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [category, setCategory] = useState<'Reach' | 'Target' | 'Safety'>('Target');
  const [targetMajor, setTargetMajor] = useState('Computer Science');
  const [selectedRound, setSelectedRound] = useState('Regular Decision (RD)');
  const [counselorNotes, setCounselorNotes] = useState('');
  const [searchStudent, setSearchStudent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingUniKey, setRemovingUniKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !university) return null;

  const status = calculateAdmissionStatus(university);

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
    (s.email && s.email.toLowerCase().includes(searchStudent.toLowerCase())) ||
    (s.intake && s.intake.toLowerCase().includes(searchStudent.toLowerCase())) ||
    (s.school && s.school.toLowerCase().includes(searchStudent.toLowerCase()))
  );

  const selectedStudent = students.find(
    (s) => s.id === selectedStudentId || toValidDocId(s.id, 'STU') === selectedStudentId
  );
  const existingShortlist = Array.isArray(selectedStudent?.shortlist) ? selectedStudent.shortlist : [];

  const handleRemoveExistingShortlist = async (uniId?: string, uniName?: string) => {
    if (!selectedStudent) return;
    const key = uniId || uniName || '';
    setRemovingUniKey(key);
    setErrorMsg('');
    try {
      const nextShortlist = (selectedStudent.shortlist || []).filter((item: any) => {
        if (uniId && item.id) return item.id !== uniId;
        return String(item.name || '').toLowerCase() !== String(uniName || '').toLowerCase();
      });
      const nowDisplay = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      });
      const nextActivities = [
        {
          id: `act_${Date.now()}`,
          date: nowDisplay,
          type: 'UPDATE' as const,
          description: `Counselor removed university from shortlist: ${uniName || 'University'}`,
        },
        ...(Array.isArray(selectedStudent.activities) ? selectedStudent.activities : []),
      ];
      const operationalLogs = Array.isArray(selectedStudent.operationalLogs)
        ? [...selectedStudent.operationalLogs]
        : [];
      operationalLogs.unshift({
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        performedBy: currentUser?.name || 'Counselor',
        role: currentUser?.role || 'COUNSELOR',
        studentId: selectedStudent.id,
        activityType: 'UNIVERSITY_SHORTLIST_REMOVED',
        description: `Removed ${uniName || 'University'} from ${selectedStudent.name}'s shortlist.`,
        resourceName: uniName || 'University',
      });

      await updateStudent({
        ...selectedStudent,
        shortlist: nextShortlist,
        activities: nextActivities,
        operationalLogs,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to remove university from shortlist.');
    } finally {
      setRemovingUniKey(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setErrorMsg('Please select a student from the roster.');
      return;
    }

    const studentToUpdate = students.find(
      (s) => s.id === selectedStudentId || toValidDocId(s.id, 'STU') === selectedStudentId
    );
    if (!studentToUpdate) {
      setErrorMsg('Selected student not found.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const currentShortlist = Array.isArray(studentToUpdate.shortlist) ? [...studentToUpdate.shortlist] : [];

      const existingIdx = currentShortlist.findIndex(
        (item) => String(item.name || '').trim().toLowerCase() === university.name.trim().toLowerCase()
      );

      const newShortlistItem = {
        id:
          existingIdx >= 0 && currentShortlist[existingIdx].id
            ? currentShortlist[existingIdx].id
            : `uni_target_${Date.now()}`,
        name: university.name,
        category,
        deadline: university.regularDeadline || university.earlyDeadline || '2027-01-05',
        status: (existingIdx >= 0 && currentShortlist[existingIdx].status) || ('Considering' as const),
        major: targetMajor || 'Undergraduate Degree',
        round: selectedRound,
        portalLink: university.applyLink || 'https://commonapp.org',
        notes: counselorNotes
          ? `[Counselor Advisory]: ${counselorNotes}`
          : `Added via Counselor Portal for ${university.country} admissions.`,
        requiredDocs:
          existingIdx >= 0 && Array.isArray(currentShortlist[existingIdx].requiredDocs) && currentShortlist[existingIdx].requiredDocs!.length > 0
            ? currentShortlist[existingIdx].requiredDocs
            : [
                { id: 'doc1', name: 'High School Transcripts (9–12)' },
                { id: 'doc2', name: 'Standardized Test Scorecard' },
                { id: 'doc3', name: 'Letters of Recommendation' },
                { id: 'doc4', name: 'Personal Statement / Common App Essay' },
              ],
        attachedDocs:
          existingIdx >= 0 && currentShortlist[existingIdx].attachedDocs
            ? currentShortlist[existingIdx].attachedDocs
            : {},
      };

      if (existingIdx >= 0) {
        currentShortlist[existingIdx] = { ...currentShortlist[existingIdx], ...newShortlistItem };
      } else {
        currentShortlist.push(newShortlistItem);
      }

      const nowDisplay = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      });

      const nextActivities = [
        {
          id: `act_${Date.now()}`,
          date: nowDisplay,
          type: 'UPDATE' as const,
          description: `${existingIdx >= 0 ? 'Updated' : 'Shortlisted'} university: ${university.name} (${category})`,
        },
        ...(Array.isArray(studentToUpdate.activities) ? studentToUpdate.activities : []),
      ];

      const operationalLogs = Array.isArray(studentToUpdate.operationalLogs)
        ? [...studentToUpdate.operationalLogs]
        : [];
      operationalLogs.unshift({
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        performedBy: currentUser?.name || 'Counselor',
        role: currentUser?.role || 'COUNSELOR',
        studentId: studentToUpdate.id,
        activityType: 'UNIVERSITY_SHORTLIST',
        description: `Shortlisted ${university.name} (${category}) with note: "${counselorNotes || 'Target university added during counseling consultation'}"`,
        resourceName: university.name,
      });

      const updatedStudent = {
        ...studentToUpdate,
        shortlist: currentShortlist,
        activities: nextActivities,
        operationalLogs,
      };

      await updateStudent(updatedStudent);
      onSuccess(studentToUpdate.name);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update student shortlist.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
              <span>Add to Student Shortlist</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Syncs in real time to the student profile and student portal.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected University Summary */}
        <div className="px-6 py-3 bg-indigo-50/60 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/40">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                QS #{university.rank} · {university.country}
              </span>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                {university.name}
              </h4>
            </div>
            <div className="text-right tabular-nums">
              <span className="text-xs font-mono font-semibold text-slate-900 dark:text-white">
                ₹{university.tuitionMinInrLakh}–{university.tuitionMaxInrLakh} L/yr
              </span>
              <div className="text-[10px] text-slate-500">
                {status.statusText}
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Student Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Student *
            </label>
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter students by name, email or cohort..."
                value={searchStudent}
                onChange={e => setSearchStudent(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <select
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Choose student from roster ({filteredStudents.length} available) --</option>
              {filteredStudents.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.school || 'High School'} · Intake: {s.intake || 'Fall 2027'} · {(s.shortlist || []).length} shortlisted)
                </option>
              ))}
            </select>
          </div>

          {/* Live Existing Shortlist for Selected Student (with Counselor Remove control) */}
          {selectedStudent && existingShortlist.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                <span className="font-semibold">
                  {selectedStudent.name}&apos;s Current Shortlist ({existingShortlist.length})
                </span>
                <span className="text-slate-400">Live synced</span>
              </div>
              <div className="max-h-28 overflow-y-auto divide-y divide-slate-200/70 dark:divide-slate-700/60">
                {existingShortlist.map((item: any, idx: number) => {
                  const itemKey = item.id || item.name || String(idx);
                  return (
                    <div key={itemKey} className="py-1.5 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <span className="font-medium text-slate-800 dark:text-slate-100 truncate block">
                          {item.name}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {item.category || 'Target'} · {item.major || 'Undergraduate'}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={removingUniKey === itemKey}
                        onClick={() => handleRemoveExistingShortlist(item.id, item.name)}
                        className="px-2 py-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors disabled:opacity-50"
                        title="Remove from student shortlist"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{removingUniKey === itemKey ? 'Removing...' : 'Remove'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category (Reach / Target / Safety) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Target Tier Classification
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Reach', 'Target', 'Safety'] as const).map(tier => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setCategory(tier)}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap shrink-0 ${
                    category === tier
                      ? tier === 'Reach'
                        ? 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                        : tier === 'Target'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                        : 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          {/* Major & Round in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Intended Major
              </label>
              <input
                type="text"
                value={targetMajor}
                onChange={e => setTargetMajor(e.target.value)}
                placeholder="e.g. Computer Science, Economics"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Application Round
              </label>
              <select
                value={selectedRound}
                onChange={e => setSelectedRound(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Regular Decision (RD)">Regular Decision (RD)</option>
                <option value="Early Action (EA)">Early Action (EA)</option>
                <option value="Early Decision (ED / ED II)">Early Decision (ED / ED II)</option>
                <option value="Rolling Admissions">Rolling Admissions</option>
                <option value="Fall 2027 Main Round">Fall 2027 Main Round</option>
                <option value="Plan for 2028 Cycle">Plan for 2028 Cycle</option>
              </select>
            </div>
          </div>

          {/* Counselor & Parent Consultation Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Parent Consultation & Strategy Notes
            </label>
            <textarea
              rows={3}
              value={counselorNotes}
              onChange={e => setCounselorNotes(e.target.value)}
              placeholder="e.g. Discussed with parents: High interest in AI labs. Fits target tuition range. Submit before Jan 1 deadline."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Add to Student List'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
