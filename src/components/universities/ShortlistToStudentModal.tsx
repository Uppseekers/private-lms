import React, { useState } from 'react';
import { X, Check, Search, User, GraduationCap, Calendar, FileText, AlertCircle } from 'lucide-react';
import { UniversityRecord } from '@/data/universitiesData';
import { useDatabase } from '@/context/DatabaseContext';
import { calculateAdmissionStatus } from '@/lib/admissionsEngine';

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
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !university) return null;

  const status = calculateAdmissionStatus(university);

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
    (s.email && s.email.toLowerCase().includes(searchStudent.toLowerCase())) ||
    (s.intake && s.intake.toLowerCase().includes(searchStudent.toLowerCase())) ||
    (s.school && s.school.toLowerCase().includes(searchStudent.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setErrorMsg('Please select a student from the roster.');
      return;
    }

    const studentToUpdate = students.find(s => s.id === selectedStudentId);
    if (!studentToUpdate) {
      setErrorMsg('Selected student not found.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const currentShortlist = Array.isArray(studentToUpdate.shortlist) ? [...studentToUpdate.shortlist] : [];
      
      // Check if already in shortlist
      const existingIdx = currentShortlist.findIndex(item => 
        item.name.toLowerCase() === university.name.toLowerCase()
      );

      const newShortlistItem = {
        id: existingIdx >= 0 ? currentShortlist[existingIdx].id : `uni_target_${Date.now()}`,
        name: university.name,
        category,
        deadline: university.regularDeadline || university.earlyDeadline || '2027-01-05',
        status: 'Considering',
        major: targetMajor || 'Undergraduate Degree',
        round: selectedRound,
        portalLink: university.applyLink || 'https://commonapp.org',
        notes: counselorNotes ? `[Counselor Advisory]: ${counselorNotes}` : `Added via Counselor Portal for ${university.country} admissions.`,
        requiredDocs: [
          { id: 'doc1', name: 'High School Transcripts (9–12)' },
          { id: 'doc2', name: 'Standardized Test Scorecard' },
          { id: 'doc3', name: 'Letters of Recommendation' },
          { id: 'doc4', name: 'Personal Statement / Common App Essay' }
        ],
        attachedDocs: {}
      };

      if (existingIdx >= 0) {
        currentShortlist[existingIdx] = { ...currentShortlist[existingIdx], ...newShortlistItem };
      } else {
        currentShortlist.push(newShortlistItem);
      }

      // Add operational log if student supports it
      const operationalLogs = Array.isArray(studentToUpdate.operationalLogs) ? [...studentToUpdate.operationalLogs] : [];
      operationalLogs.unshift({
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        performedBy: currentUser.name || 'Counselor',
        role: currentUser.role || 'COUNSELOR',
        studentId: studentToUpdate.id,
        activityType: 'UNIVERSITY_SHORTLIST',
        description: `Shortlisted ${university.name} (${category}) with note: "${counselorNotes || 'Target university added during counseling consultation'}"`,
        resourceName: university.name
      });

      const updatedStudent = {
        ...studentToUpdate,
        shortlist: currentShortlist,
        operationalLogs
      };

      await updateStudent(updatedStudent);
      onSuccess(studentToUpdate.name);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update student shortlist.');
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
              Assign university to student portfolio with parent consultation notes.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected University Badge */}
        <div className="px-6 py-3 bg-indigo-50/60 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/40">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                QS #{university.rank} · {university.country}
              </span>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                {university.name}
              </h4>
            </div>
            <div className="text-right">
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
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
                  {s.name} ({s.school || 'High School'} · Intake: {s.intake || 'Fall 2027'})
                </option>
              ))}
            </select>
          </div>

          {/* Category (Reach / Target / Safety) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Target Tier Classification
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Reach', 'Target', 'Safety'] as const).map(tier => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setCategory(tier)}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              Parent Consultation & Strategy Notes
            </label>
            <textarea
              rows={3}
              value={counselorNotes}
              onChange={e => setCounselorNotes(e.target.value)}
              placeholder="e.g. Discussed with parents on Nov 5: High interest in AI labs. Parent budget fits ₹55L/yr. Advised submitting before Jan 1 deadline."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
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
