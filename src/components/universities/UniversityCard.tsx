import React from 'react';
import { 
  GraduationCap, 
  MapPin, 
  ExternalLink, 
  Clock, 
  IndianRupee, 
  AlertTriangle, 
  Check, 
  Plus, 
  Eye, 
  FileText,
  Calendar,
  Layers
} from 'lucide-react';
import { UniversityRecord } from '@/data/universitiesData';
import { calculateAdmissionStatus } from '@/lib/admissionsEngine';
import { cn } from '@/lib/utils';

interface UniversityCardProps {
  university: UniversityRecord;
  isSelectedForCompare: boolean;
  onToggleCompare: (uni: UniversityRecord) => void;
  onViewDetails: (uni: UniversityRecord) => void;
  onShortlistForStudent: (uni: UniversityRecord) => void;
  currencyView: 'inr' | 'local' | 'both';
}

export const UniversityCard: React.FC<UniversityCardProps> = ({
  university,
  isSelectedForCompare,
  onToggleCompare,
  onViewDetails,
  onShortlistForStudent,
  currencyView,
}) => {
  const status = calculateAdmissionStatus(university);

  return (
    <div className={cn(
      "group relative flex flex-col justify-between rounded-xl border bg-white dark:bg-slate-900 transition-all duration-200 hover:shadow-md",
      isSelectedForCompare 
        ? "border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20" 
        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
    )}>
      {/* Top Header Section */}
      <div className="p-5 pb-4">
        {/* Rank & Compare Checkbox row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 tabular-nums">
              <span className="text-slate-500 dark:text-slate-400 font-normal">QS #</span>
              {university.rank}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {university.country}
            </span>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 select-none">
            <input
              type="checkbox"
              checked={isSelectedForCompare}
              onChange={() => onToggleCompare(university)}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="hidden sm:inline">Compare</span>
          </label>
        </div>

        {/* University Name & Campus */}
        <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2 min-h-[2.75rem]">
          {university.name}
        </h3>
        
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{university.campus}</span>
        </div>

        {/* Real-Time Admission Status Badge */}
        <div className={cn(
          "mt-3.5 p-2.5 rounded-lg border text-xs flex flex-col gap-1",
          status.badgeBg,
          status.badgeBorder
        )}>
          <div className="flex items-center justify-between gap-2">
            <span className={cn("font-semibold flex items-center gap-1.5", status.badgeText)}>
              <span className={cn(
                "w-2 h-2 rounded-full shrink-0",
                status.category === 'closed' ? "bg-rose-500" :
                status.category === 'closing_soon' ? "bg-amber-500 animate-pulse" :
                status.category === 'rolling' ? "bg-sky-500" : "bg-emerald-500"
              )} />
              {status.statusText}
            </span>

            {status.daysRemaining !== undefined && (
              <span className={cn(
                "px-2 py-0.5 rounded text-[11px] font-mono font-medium shrink-0",
                status.daysRemaining <= 14 
                  ? "bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200" 
                  : "bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              )}>
                {status.daysRemaining}d left
              </span>
            )}
          </div>
          
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
            {status.subText}
          </p>
        </div>

        {/* Key Information Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          {/* Tuition Min/Max */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-0.5">
              Annual Tuition
            </div>
            {(currencyView === 'inr' || currencyView === 'both') && (
              <div className="font-semibold font-mono text-slate-900 dark:text-white tabular-nums">
                {university.tuitionMinInrLakh > 0 ? (
                  university.tuitionMinInrLakh === university.tuitionMaxInrLakh ? (
                    `₹${university.tuitionMinInrLakh} L`
                  ) : (
                    `₹${university.tuitionMinInrLakh} – ${university.tuitionMaxInrLakh} L`
                  )
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Govt / Free / Nominal</span>
                )}
              </div>
            )}
            {(currencyView === 'local' || (currencyView === 'both' && university.tuitionMinLocal > 0)) && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {university.tuitionMinLocal.toLocaleString()} – {university.tuitionMaxLocal.toLocaleString()} {university.tuitionCurrency}
              </div>
            )}
          </div>

          {/* Application Route & Fee */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-0.5">
              App Route & Fee
            </div>
            <div className="font-medium text-slate-800 dark:text-slate-200 truncate" title={university.applicationRoute}>
              {university.applicationRoute.split('·')[0].trim()}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Fee: {university.appFeeInr !== '-' ? university.appFeeInr : 'Free'}
            </div>
          </div>
        </div>

        {/* Watch-Out Warning (if present) */}
        {university.watchOuts && university.watchOuts !== '—' && (
          <div className="mt-3 text-[11px] p-2 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-lg text-amber-800 dark:text-amber-300/90 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 mt-0.5" />
            <span className="line-clamp-2">
              <strong className="font-medium">Watch-out:</strong> {university.watchOuts}
            </span>
          </div>
        )}

        {/* Why Study Here Preview */}
        <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
          {university.whyStudyHere}
        </p>
      </div>

      {/* Action Footer */}
      <div className="p-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-xl">
        <button
          onClick={() => onViewDetails(university)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors"
        >
          <Eye className="w-3.5 h-3.5 text-slate-500" />
          <span>Parent Details</span>
        </button>

        <button
          onClick={() => onShortlistForStudent(university)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Shortlist</span>
        </button>

        {university.applyLink && (
          <a
            href={university.applyLink}
            target="_blank"
            rel="noopener noreferrer"
            title="Open official admissions portal"
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
};
