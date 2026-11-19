import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, CheckCircle2, ChevronDown, ChevronUp, RefreshCw, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDatabase } from '@/context/DatabaseContext';
import { isUserAdmin } from '@/lib/staffPermissions';
import {
  COUNSELLING_GRADES,
  DEFAULT_SCHEDULER_SETTINGS,
  normalizeSchedulerSettings,
} from '@/lib/counsellorAutoScheduler';
import { CounsellingGradeKey, CounsellingSchedulerSettings } from '@/types';

interface SuggestedSchedulerRulesCardProps {
  collapsibleForNonAdmin?: boolean;
}

export default function SuggestedSchedulerRulesCard({
  collapsibleForNonAdmin = false,
}: SuggestedSchedulerRulesCardProps) {
  const { schedulerSettings, saveSchedulerSettings, currentUser } = useDatabase();
  const canEditRules = isUserAdmin(currentUser);

  const [isExpanded, setIsExpanded] = useState<boolean>(() =>
    collapsibleForNonAdmin ? canEditRules : true
  );
  const [draft, setDraft] = useState<CounsellingSchedulerSettings>(() =>
    normalizeSchedulerSettings(schedulerSettings)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setDraft(normalizeSchedulerSettings(schedulerSettings));
  }, [schedulerSettings]);

  const updateGradeDuration = (grade: CounsellingGradeKey, durationMinutes: 30 | 45 | 60) => {
    setToast(null);
    setDraft((prev) => ({
      ...prev,
      gradeRules: {
        ...prev.gradeRules,
        [grade]: {
          ...prev.gradeRules[grade],
          durationMinutes,
        },
      },
    }));
  };

  const updateGradeFrequency = (grade: CounsellingGradeKey, frequencyPerMonth: 1 | 2 | 3 | 4) => {
    setToast(null);
    setDraft((prev) => ({
      ...prev,
      gradeRules: {
        ...prev.gradeRules,
        [grade]: {
          ...prev.gradeRules[grade],
          frequencyPerMonth,
        },
      },
    }));
  };

  const handleSaveRules = async () => {
    if (!canEditRules) return;
    setIsSaving(true);
    setToast(null);
    try {
      await saveSchedulerSettings(draft);
      setToast({
        type: 'success',
        message: 'Class-wise counselling frequency, session duration, and buffer rules saved to database.',
      });
    } catch {
      setToast({
        type: 'error',
        message: 'Failed to save class-wise scheduler rules. Verify admin permissions and retry.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setToast(null);
    setDraft(DEFAULT_SCHEDULER_SETTINGS);
  };

  return (
    <Card className="border-slate-200 shadow-xs overflow-hidden bg-white">
      <CardHeader className="bg-slate-50 border-b border-slate-200 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold tracking-wide text-slate-900 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Class-Wise Frequency &amp; Session Time (Grades 7 to 12)</span>
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              {canEditRules
                ? 'Configure class-wise counselling session duration, monthly meeting frequency, and buffer rules applied across all counsellors.'
                : 'Active global class-wise session durations and monthly frequencies configured by System Admin.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                Buffer Between Sessions:
              </label>
              <select
                disabled={!canEditRules}
                value={draft.bufferMinutes}
                onChange={(e) => {
                  setToast(null);
                  setDraft((prev) => ({ ...prev, bufferMinutes: Number(e.target.value) }));
                }}
                className="h-9 bg-white border border-slate-200 rounded-lg px-3 text-xs font-semibold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-600"
              >
                <option value={0}>0 mins (Back-to-back)</option>
                <option value={5}>5 mins</option>
                <option value={10}>10 mins (Recommended)</option>
                <option value={15}>15 mins</option>
              </select>
            </div>

            {collapsibleForNonAdmin && !canEditRules && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="bg-white h-9 text-xs font-medium whitespace-nowrap shrink-0"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5 mr-1.5" />
                    <span>Hide Grade Rules</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5 mr-1.5" />
                    <span>View Grade 7–12 Rules</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {collapsibleForNonAdmin && !canEditRules && !isExpanded && (
          <div className="pt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 tabular-nums">
            {COUNSELLING_GRADES.map((g, idx) => {
              const r = draft.gradeRules[g];
              return (
                <React.Fragment key={g}>
                  {idx > 0 && <span className="text-slate-300" aria-hidden="true">·</span>}
                  <span>
                    <strong className="text-slate-800">Gr {g}:</strong> {r.durationMinutes}m × {r.frequencyPerMonth}/mo
                  </span>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold text-xs">
                <tr>
                  <th className="px-6 py-3.5">Class / Grade</th>
                  <th className="px-6 py-3.5">Preferred Session Duration</th>
                  <th className="px-6 py-3.5">Monthly Meeting Frequency</th>
                  <th className="px-6 py-3.5 text-right">Monthly Counselling / Student</th>
                  <th className="px-6 py-3.5 text-right">3-Month Series Sessions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {COUNSELLING_GRADES.map((grade) => {
                  const rule = draft.gradeRules[grade];
                  const monthlyMins = rule.durationMinutes * rule.frequencyPerMonth;
                  const threeMonthSessions = rule.frequencyPerMonth * 3;
                  return (
                    <tr key={grade} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3.5 font-semibold text-slate-900">Grade {grade}</td>
                      <td className="px-6 py-3.5">
                        <select
                          disabled={!canEditRules}
                          value={rule.durationMinutes}
                          onChange={(e) =>
                            updateGradeDuration(grade, Number(e.target.value) as 30 | 45 | 60)
                          }
                          className="h-9 w-40 bg-white border border-slate-200 rounded-lg px-3 text-xs font-semibold tabular-nums text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-600"
                        >
                          <option value={30}>30 mins</option>
                          <option value={45}>45 mins</option>
                          <option value={60}>60 mins</option>
                        </select>
                      </td>
                      <td className="px-6 py-3.5">
                        <select
                          disabled={!canEditRules}
                          value={rule.frequencyPerMonth}
                          onChange={(e) =>
                            updateGradeFrequency(grade, Number(e.target.value) as 1 | 2 | 3 | 4)
                          }
                          className="h-9 w-40 bg-white border border-slate-200 rounded-lg px-3 text-xs font-semibold tabular-nums text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-600"
                        >
                          <option value={1}>1 session / month</option>
                          <option value={2}>2 sessions / month</option>
                          <option value={3}>3 sessions / month</option>
                          <option value={4}>4 sessions / month</option>
                        </select>
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono tabular-nums text-xs font-semibold text-slate-800">
                        {monthlyMins} mins/mo ({Math.round((monthlyMins / 60) * 100) / 100} hrs)
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono tabular-nums text-xs text-slate-600">
                        {threeMonthSessions} sessions / 12 wks
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 bg-slate-50/60 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              {toast ? (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 font-medium',
                    toast.type === 'success' ? 'text-emerald-700' : 'text-red-700'
                  )}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{toast.message}</span>
                </span>
              ) : schedulerSettings.updatedAt ? (
                <span className="tabular-nums">
                  Last saved: {new Date(schedulerSettings.updatedAt).toLocaleString()}
                  {schedulerSettings.updatedBy ? ` · by ${schedulerSettings.updatedBy}` : ''}
                </span>
              ) : (
                <span>Used automatically by every counsellor&apos;s Capacity Calculator &amp; Schedule Generator.</span>
              )}
            </div>

            {canEditRules && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetDefaults}
                  className="bg-white text-xs h-9 whitespace-nowrap shrink-0"
                >
                  Reset Defaults
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isSaving}
                  onClick={handleSaveRules}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 h-9 whitespace-nowrap shrink-0"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      <span>Saving Rules...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      <span>Save Class-Wise Rules</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
