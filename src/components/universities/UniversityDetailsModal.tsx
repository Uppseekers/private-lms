import React from 'react';
import { 
  X, 
  ExternalLink, 
  Printer, 
  MapPin, 
  IndianRupee, 
  AlertTriangle, 
  Clock, 
  Plus, 
  Building2, 
  Compass, 
  GraduationCap, 
  FileCheck 
} from 'lucide-react';
import { UniversityRecord } from '@/data/universitiesData';
import { calculateAdmissionStatus } from '@/lib/admissionsEngine';
import { cn } from '@/lib/utils';

interface UniversityDetailsModalProps {
  university: UniversityRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onShortlist: (uni: UniversityRecord) => void;
}

export const UniversityDetailsModal: React.FC<UniversityDetailsModalProps> = ({
  university,
  isOpen,
  onClose,
  onShortlist,
}) => {
  if (!isOpen || !university) return null;

  const status = calculateAdmissionStatus(university);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold px-3 py-1 rounded-lg bg-indigo-600 text-white tabular-nums">
              QS #{university.rank}
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {university.name}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{university.campus} · {university.country}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              title="Print Parent Briefing Card"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Print Briefing</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Real-Time Admission Status Banner */}
          <div className={cn(
            "p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3",
            status.badgeBg,
            status.badgeBorder
          )}>
            <div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "w-2.5 h-2.5 rounded-full shrink-0",
                  status.category === 'closed' ? "bg-rose-500" :
                  status.category === 'closing_soon' ? "bg-amber-500 animate-pulse" :
                  status.category === 'rolling' ? "bg-sky-500" : "bg-emerald-500"
                )} />
                <span className={cn("font-bold text-sm", status.badgeText)}>
                  {status.statusText}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300">
                  {status.cycleRecommendation}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                {status.subText}
              </p>
            </div>

            {university.applyLink && (
              <a
                href={university.applyLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 transition-colors shadow-sm"
              >
                <span>Official Apply Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Parent Financial & Application Snapshot */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
                Annual Tuition (INR)
              </span>
              <div className="text-base font-bold font-mono text-slate-900 dark:text-white">
                {university.tuitionMinInrLakh > 0 ? (
                  university.tuitionMinInrLakh === university.tuitionMaxInrLakh ? (
                    `₹${university.tuitionMinInrLakh} Lakhs/yr`
                  ) : (
                    `₹${university.tuitionMinInrLakh} – ${university.tuitionMaxInrLakh} Lakhs`
                  )
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400">Govt / Free</span>
                )}
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                {university.tuitionMinLocal.toLocaleString()} – {university.tuitionMaxLocal.toLocaleString()} {university.tuitionCurrency}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
                Application Fee
              </span>
              <div className="text-base font-bold font-mono text-slate-900 dark:text-white">
                {university.appFeeInr !== '-' ? university.appFeeInr : 'No App Fee'}
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                {university.appFeeLocal > 0 ? `${university.appFeeLocal} ${university.feeCurrency}` : 'Waived / Free'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
                Application Window
              </span>
              <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {university.applicationWindow || 'Check Intake'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                {university.applicationRoute}
              </div>
            </div>
          </div>

          {/* Deadlines Section */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Admissions Deadlines
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <span className="font-semibold text-slate-500 block mb-0.5">Early Round / Priority:</span>
                <span className="font-medium text-slate-900 dark:text-white text-sm">
                  {university.earlyDeadline || 'None / Not Applicable'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <span className="font-semibold text-slate-500 block mb-0.5">Regular Round / UCAS Date:</span>
                <span className="font-medium text-slate-900 dark:text-white text-sm">
                  {university.regularDeadline || 'None / Rolling'}
                </span>
              </div>
            </div>
          </div>

          {/* Watch-Outs Alert Box (Parent Priority) */}
          {university.watchOuts && university.watchOuts !== '—' && (
            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Parent Advisory & Application Watch-Outs</span>
              </div>
              <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                {university.watchOuts}
              </p>
            </div>
          )}

          {/* Why Study Here */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              <span>Why Study Here (Academic & Career Value)</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              {university.whyStudyHere}
            </p>
          </div>

          {/* Core Mission & Vision */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Core Mission</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {university.coreMission}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-indigo-500" />
                <span>Strategic Vision</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {university.vision}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Close
          </button>

          <button
            onClick={() => {
              onClose();
              onShortlist(university);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Shortlist for Student</span>
          </button>
        </div>
      </div>
    </div>
  );
};
