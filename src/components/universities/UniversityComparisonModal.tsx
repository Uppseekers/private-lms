import React from 'react';
import { X, Check, AlertTriangle, ExternalLink, IndianRupee, Printer, ArrowRight } from 'lucide-react';
import { UniversityRecord } from '@/data/universitiesData';
import { calculateAdmissionStatus } from '@/lib/admissionsEngine';
import { cn } from '@/lib/utils';

interface UniversityComparisonModalProps {
  universities: UniversityRecord[];
  isOpen: boolean;
  onClose: () => void;
  onRemoveUni: (id: string) => void;
  onShortlistUni: (uni: UniversityRecord) => void;
}

export const UniversityComparisonModal: React.FC<UniversityComparisonModalProps> = ({
  universities,
  isOpen,
  onClose,
  onRemoveUni,
  onShortlistUni,
}) => {
  if (!isOpen || universities.length === 0) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-6xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Side-by-Side University Comparison</span>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                {universities.length} Universities Selected
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Evaluating global admission deadlines, parent financial requirements (₹ Lakhs), and program fit.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print Matrix</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Comparison Table */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-6">
          <div className="min-w-[760px]">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-48 p-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 sticky left-0 z-10">
                    Criterion
                  </th>
                  {universities.map(u => (
                    <th key={u.id} className="p-4 text-left border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 min-w-[240px] max-w-[280px]">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            QS #{u.rank}
                          </span>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1 leading-snug">
                            {u.name}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {u.country} · {u.campus}
                          </p>
                        </div>
                        <button
                          onClick={() => onRemoveUni(u.id)}
                          title="Remove from comparison"
                          className="text-slate-400 hover:text-rose-500 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => onShortlistUni(u)}
                        className="mt-3 w-full py-1.5 text-xs font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                      >
                        Shortlist for Student
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {/* 1. Real-Time Admission Status */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-3 font-semibold text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800">
                    Admission Status (Real-Time)
                  </td>
                  {universities.map(u => {
                    const status = calculateAdmissionStatus(u);
                    return (
                      <td key={u.id} className="p-3">
                        <div className={cn("p-2 rounded-lg border", status.badgeBg, status.badgeBorder)}>
                          <div className={cn("font-bold text-xs flex items-center gap-1.5", status.badgeText)}>
                            <span className={cn(
                              "w-2 h-2 rounded-full shrink-0",
                              status.category === 'closed' ? "bg-rose-500" :
                              status.category === 'closing_soon' ? "bg-amber-500" :
                              status.category === 'rolling' ? "bg-sky-500" : "bg-emerald-500"
                            )} />
                            {status.statusText}
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                            {status.subText}
                          </p>
                          <span className="inline-block mt-1 font-mono text-[10px] text-slate-500">
                            {status.cycleRecommendation}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* 2. Deadlines breakdown */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-3 font-semibold text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800">
                    Deadlines (Early / Regular)
                  </td>
                  {universities.map(u => (
                    <td key={u.id} className="p-3 space-y-1">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Early Round:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{u.earlyDeadline || 'None'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Regular Round:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{u.regularDeadline || 'None'}</span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* 3. Tuition Fee (INR) */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 bg-slate-50/30 dark:bg-slate-800/20">
                  <td className="p-3 font-semibold text-slate-700 dark:text-slate-300 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800">
                    Tuition / Year (₹ Lakhs)
                  </td>
                  {universities.map(u => (
                    <td key={u.id} className="p-3 font-mono">
                      {u.tuitionMinInrLakh > 0 ? (
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          ₹{u.tuitionMinInrLakh} – ₹{u.tuitionMaxInrLakh} Lakhs/yr
                        </div>
                      ) : (
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          Tuition-Free / Govt Subsidized
                        </div>
                      )}
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Native: {u.tuitionMinLocal.toLocaleString()} – {u.tuitionMaxLocal.toLocaleString()} {u.tuitionCurrency}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* 4. Application Fee */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-3 font-semibold text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800">
                    Application Fee
                  </td>
                  {universities.map(u => (
                    <td key={u.id} className="p-3 font-mono">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {u.appFeeInr !== '-' ? u.appFeeInr : 'Free'}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        {u.appFeeLocal > 0 ? `${u.appFeeLocal} ${u.feeCurrency}` : 'No Fee'}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* 5. Application Route */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-3 font-semibold text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800">
                    Application Route
                  </td>
                  {universities.map(u => (
                    <td key={u.id} className="p-3 text-slate-700 dark:text-slate-300">
                      {u.applicationRoute}
                    </td>
                  ))}
                </tr>

                {/* 6. Parent Watch-Outs */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 bg-amber-50/20 dark:bg-amber-950/10">
                  <td className="p-3 font-semibold text-amber-800 dark:text-amber-300 sticky left-0 bg-amber-50/40 dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800">
                    Crucial Watch-Outs
                  </td>
                  {universities.map(u => (
                    <td key={u.id} className="p-3">
                      {u.watchOuts && u.watchOuts !== '—' ? (
                        <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 text-xs">
                          {u.watchOuts}
                        </div>
                      ) : (
                        <span className="text-slate-400">Standard criteria</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* 7. Why Study Here */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-3 font-semibold text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800">
                    Why Study Here
                  </td>
                  {universities.map(u => (
                    <td key={u.id} className="p-3 text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
                      {u.whyStudyHere}
                    </td>
                  ))}
                </tr>

                {/* 8. Core Mission */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-3 font-semibold text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800">
                    Core Mission
                  </td>
                  {universities.map(u => (
                    <td key={u.id} className="p-3 text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                      {u.coreMission}
                    </td>
                  ))}
                </tr>

                {/* 9. Direct Application Portal */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-3 font-semibold text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800">
                    Apply Portal
                  </td>
                  {universities.map(u => (
                    <td key={u.id} className="p-3">
                      {u.applyLink ? (
                        <a
                          href={u.applyLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                        >
                          <span>Official Portal</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-slate-400">Direct admission</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Tip: You can compare up to 4 universities simultaneously. Click <span className="font-semibold text-slate-700 dark:text-slate-300">Shortlist for Student</span> to add directly to an enrolled student’s academic plan.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};
