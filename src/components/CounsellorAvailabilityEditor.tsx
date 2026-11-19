import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  CounsellorPrimaryAvailability,
  DayAvailabilityTiming,
  DayOfWeekName,
  StaffMember,
} from '@/types';
import {
  ALL_DAYS_OF_WEEK,
  PER_DAY_HOURLY_BANDWIDTH_OPTIONS,
  formatTimeRange12h,
  getEffectiveDayWindow,
  normalizePrimaryAvailability,
  parseTimeToMinutes,
} from '@/lib/counsellorAutoScheduler';
import { useDatabase } from '@/context/DatabaseContext';
import { Calendar, Check, Clock, Loader2, RotateCcw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CounsellorAvailabilityEditorProps {
  staffMember: StaffMember;
  canEdit?: boolean;
  compact?: boolean;
  onSaved?: (availability: CounsellorPrimaryAvailability, effectiveDailyHours: number) => void;
}

function resolveValidHours(raw?: number): number {
  const num = Number(raw);
  if (Number.isFinite(num) && num >= 1 && num <= 12) {
    return Math.round(num * 2) / 2;
  }
  return 4;
}

export default function CounsellorAvailabilityEditor({
  staffMember,
  canEdit = true,
  compact = false,
  onSaved,
}: CounsellorAvailabilityEditorProps) {
  const { saveStaffPrimaryAvailability, staff } = useDatabase();

  const liveMember = useMemo(() => {
    return staff.find((s) => s.id === staffMember.id) || staffMember;
  }, [staff, staffMember]);

  const [draft, setDraft] = useState<CounsellorPrimaryAvailability>(() =>
    normalizePrimaryAvailability(liveMember.primaryAvailability)
  );
  const [uniformMaxHours, setUniformMaxHours] = useState<number>(() =>
    resolveValidHours(liveMember.dailyMaxCounsellingHours)
  );
  const [hasUniformBreak, setHasUniformBreak] = useState<boolean>(() =>
    Boolean(
      liveMember.primaryAvailability?.uniformBreakStart &&
        liveMember.primaryAvailability?.uniformBreakEnd
    ) || !liveMember.primaryAvailability
  );
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const norm = normalizePrimaryAvailability(liveMember.primaryAvailability);
    setDraft(norm);
    setUniformMaxHours(resolveValidHours(liveMember.dailyMaxCounsellingHours));
    setHasUniformBreak(Boolean(norm.uniformBreakStart && norm.uniformBreakEnd));
  }, [liveMember.id, liveMember.primaryAvailability, liveMember.dailyMaxCounsellingHours]);

  const toggleDay = (day: DayOfWeekName) => {
    if (!canEdit) return;
    setToast(null);
    setDraft((prev) => {
      const exists = prev.selectedDays.includes(day);
      const nextSelected = exists
        ? prev.selectedDays.filter((d) => d !== day)
        : ALL_DAYS_OF_WEEK.filter((d) => d === day || prev.selectedDays.includes(d));
      return {
        ...prev,
        selectedDays: nextSelected,
        daySchedules: {
          ...prev.daySchedules,
          [day]: {
            ...prev.daySchedules[day],
            enabled: !exists,
            maxHours: prev.daySchedules[day]?.maxHours ?? uniformMaxHours,
          },
        },
      };
    });
  };

  const applyPresetDays = (days: DayOfWeekName[]) => {
    if (!canEdit) return;
    setToast(null);
    setDraft((prev) => {
      const nextDaySchedules = { ...prev.daySchedules };
      for (const d of ALL_DAYS_OF_WEEK) {
        nextDaySchedules[d] = {
          ...nextDaySchedules[d],
          enabled: days.includes(d),
          maxHours: nextDaySchedules[d]?.maxHours ?? uniformMaxHours,
        };
      }
      return {
        ...prev,
        selectedDays: days,
        daySchedules: nextDaySchedules,
      };
    });
  };

  const handleModeChange = (mode: 'uniform' | 'custom') => {
    if (!canEdit) return;
    setToast(null);
    setDraft((prev) => {
      if (mode === 'custom' && prev.mode === 'uniform') {
        const seeded = { ...prev.daySchedules };
        for (const d of ALL_DAYS_OF_WEEK) {
          seeded[d] = {
            enabled: prev.selectedDays.includes(d),
            startTime: seeded[d]?.startTime || prev.uniformStartTime,
            endTime: seeded[d]?.endTime || prev.uniformEndTime,
            breakStart:
              seeded[d]?.breakStart !== undefined
                ? seeded[d].breakStart
                : hasUniformBreak
                ? prev.uniformBreakStart || '13:00'
                : '',
            breakEnd:
              seeded[d]?.breakEnd !== undefined
                ? seeded[d].breakEnd
                : hasUniformBreak
                ? prev.uniformBreakEnd || '14:00'
                : '',
            maxHours: seeded[d]?.maxHours ?? uniformMaxHours,
          };
        }
        return { ...prev, mode: 'custom', daySchedules: seeded };
      }
      return { ...prev, mode };
    });
  };

  const updateCustomDayField = (
    day: DayOfWeekName,
    field: keyof DayAvailabilityTiming,
    value: string | boolean | number | undefined
  ) => {
    if (!canEdit) return;
    setToast(null);
    setDraft((prev) => ({
      ...prev,
      daySchedules: {
        ...prev.daySchedules,
        [day]: {
          ...prev.daySchedules[day],
          [field]: value,
        },
      },
    }));
  };

  const validationError = useMemo(() => {
    if (draft.selectedDays.length === 0) {
      return 'Select at least one working day of the week.';
    }
    if (draft.mode === 'uniform') {
      const s = parseTimeToMinutes(draft.uniformStartTime);
      const e = parseTimeToMinutes(draft.uniformEndTime);
      if (s === null || e === null || e <= s) {
        return 'End Time must be later than Start Time.';
      }
      if (hasUniformBreak && (draft.uniformBreakStart || draft.uniformBreakEnd)) {
        const bs = parseTimeToMinutes(draft.uniformBreakStart);
        const be = parseTimeToMinutes(draft.uniformBreakEnd);
        if (bs === null || be === null || be <= bs) {
          return 'Break End Time must be later than Break Start Time.';
        }
        if (bs < s || be > e) {
          return 'Break block must fall within the working Start and End Time.';
        }
      }
    } else {
      for (const day of draft.selectedDays) {
        const item = draft.daySchedules[day];
        const s = parseTimeToMinutes(item.startTime);
        const e = parseTimeToMinutes(item.endTime);
        if (s === null || e === null || e <= s) {
          return `${day}: End Time must be later than Start Time.`;
        }
        if (item.breakStart || item.breakEnd) {
          const bs = parseTimeToMinutes(item.breakStart);
          const be = parseTimeToMinutes(item.breakEnd);
          if (bs === null || be === null || be <= bs) {
            return `${day}: Break End Time must be later than Break Start Time.`;
          }
          if (bs < s || be > e) {
            return `${day}: Break must fall inside ${day}'s working window.`;
          }
        }
      }
    }
    return null;
  }, [draft, hasUniformBreak]);

  const weeklySummary = useMemo(() => {
    const prepared: CounsellorPrimaryAvailability = {
      ...draft,
      uniformBreakStart: hasUniformBreak ? draft.uniformBreakStart || '13:00' : '',
      uniformBreakEnd: hasUniformBreak ? draft.uniformBreakEnd || '14:00' : '',
    };
    let totalWindowMinutes = 0;
    let totalBandwidthMinutes = 0;
    for (const day of ALL_DAYS_OF_WEEK) {
      const win = getEffectiveDayWindow(prepared, day);
      if (win.enabled) {
        totalWindowMinutes += win.netWindowMinutes;
        const dayCapHrs =
          draft.mode === 'custom'
            ? resolveValidHours(draft.daySchedules[day]?.maxHours ?? uniformMaxHours)
            : uniformMaxHours;
        totalBandwidthMinutes += Math.min(dayCapHrs * 60, win.netWindowMinutes);
      }
    }
    return {
      activeDays: draft.selectedDays.length,
      weeklyHours: Math.round((totalWindowMinutes / 60) * 10) / 10,
      weeklyBandwidthHours: Math.round((totalBandwidthMinutes / 60) * 10) / 10,
    };
  }, [draft, hasUniformBreak, uniformMaxHours]);

  const handleSave = async () => {
    if (!canEdit || validationError) return;
    setIsSaving(true);
    setToast(null);
    try {
      const normalizedDaySchedules = { ...draft.daySchedules };
      if (draft.mode === 'custom') {
        for (const d of ALL_DAYS_OF_WEEK) {
          normalizedDaySchedules[d] = {
            ...normalizedDaySchedules[d],
            maxHours: resolveValidHours(normalizedDaySchedules[d]?.maxHours ?? uniformMaxHours),
          };
        }
      }

      const toSave: CounsellorPrimaryAvailability = {
        ...draft,
        uniformBreakStart: hasUniformBreak ? draft.uniformBreakStart || '13:00' : '',
        uniformBreakEnd: hasUniformBreak ? draft.uniformBreakEnd || '14:00' : '',
        daySchedules: normalizedDaySchedules,
      };

      const effectiveDailyHours =
        draft.mode === 'uniform'
          ? uniformMaxHours
          : draft.selectedDays.length > 0
          ? Math.max(
              1,
              Math.min(
                12,
                Math.round(
                  draft.selectedDays.reduce(
                    (sum, d) => sum + resolveValidHours(normalizedDaySchedules[d]?.maxHours ?? uniformMaxHours),
                    0
                  ) / draft.selectedDays.length
                )
              )
            )
          : uniformMaxHours;

      await saveStaffPrimaryAvailability(liveMember.id, toSave, effectiveDailyHours);
      setToast({
        type: 'success',
        message: `Working days, timing mode & per-day hourly bandwidth saved for ${liveMember.name}.`,
      });
      onSaved?.(toSave, effectiveDailyHours);
    } catch (err: any) {
      setToast({
        type: 'error',
        message: err?.message
          ? 'Failed to save counsellor availability. Verify admin permissions and retry.'
          : 'Unable to save availability.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn('bg-white rounded-xl border border-slate-200', compact ? 'p-4 space-y-4' : 'p-6 space-y-6')}>
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Counsellor Working Days, Timing Mode & Per-Day Hourly Width</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            <span>{liveMember.name}</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span className="tabular-nums">
              {weeklySummary.activeDays} working day{weeklySummary.activeDays !== 1 ? 's' : ''}/wk
            </span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span className="tabular-nums font-medium text-indigo-700">
              {weeklySummary.weeklyBandwidthHours} counselling cap hrs/wk
            </span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span className="tabular-nums text-slate-500">
              {weeklySummary.weeklyHours} net window hrs/wk
            </span>
          </p>
        </div>

        {canEdit ? (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => applyPresetDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              Mon–Fri
            </button>
            <button
              type="button"
              onClick={() =>
                applyPresetDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
              }
              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              Mon–Sat
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-500 whitespace-nowrap shrink-0">
            Managed by Admin
          </span>
        )}
      </div>

      {/* 1. Day Selection */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700">
          Working Days of the Week
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {ALL_DAYS_OF_WEEK.map((day) => {
            const checked = draft.selectedDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                disabled={!canEdit}
                onClick={() => toggleDay(day)}
                className={cn(
                  'h-10 px-3 rounded-lg border text-xs font-medium flex items-center justify-between gap-2 transition-colors whitespace-nowrap shrink-0',
                  checked
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                  !canEdit && 'opacity-70 cursor-not-allowed'
                )}
              >
                <span>{day.slice(0, 3)}</span>
                <span
                  className={cn(
                    'w-4 h-4 rounded flex items-center justify-center border',
                    checked ? 'bg-white/20 border-white/40 text-white' : 'border-slate-300 bg-slate-50'
                  )}
                >
                  {checked && <Check className="w-3 h-3" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Timing Mode Toggle */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-semibold text-slate-700">
            Timing Mode & Per-Day Hourly Width
          </label>
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => handleModeChange('uniform')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0',
                draft.mode === 'uniform'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900',
                !canEdit && 'cursor-not-allowed'
              )}
            >
              Same for all selected days
            </button>
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => handleModeChange('custom')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0',
                draft.mode === 'custom'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900',
                !canEdit && 'cursor-not-allowed'
              )}
            >
              Custom day-wise timings & hourly width
            </button>
          </div>
        </div>

        {/* Mode A: Uniform */}
        {draft.mode === 'uniform' && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Start Time ({draft.selectedDays.length} day{draft.selectedDays.length !== 1 ? 's' : ''})
                </label>
                <input
                  type="time"
                  disabled={!canEdit}
                  value={draft.uniformStartTime}
                  onChange={(e) => {
                    setToast(null);
                    setDraft((prev) => ({ ...prev, uniformStartTime: e.target.value }));
                  }}
                  className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-70"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  disabled={!canEdit}
                  value={draft.uniformEndTime}
                  onChange={(e) => {
                    setToast(null);
                    setDraft((prev) => ({ ...prev, uniformEndTime: e.target.value }));
                  }}
                  className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-70"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Per-Day Hourly Counselling Width
                </label>
                <select
                  disabled={!canEdit}
                  value={uniformMaxHours}
                  onChange={(e) => {
                    setToast(null);
                    setUniformMaxHours(Number(e.target.value));
                  }}
                  className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm font-semibold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-70"
                >
                  {PER_DAY_HOURLY_BANDWIDTH_OPTIONS.map((hrs) => (
                    <option key={hrs} value={hrs}>
                      {hrs} {hrs === 1 ? 'hour' : 'hours'} / day
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 space-y-3">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={hasUniformBreak}
                  onChange={(e) => {
                    setToast(null);
                    const checked = e.target.checked;
                    setHasUniformBreak(checked);
                    if (checked && !draft.uniformBreakStart) {
                      setDraft((prev) => ({
                        ...prev,
                        uniformBreakStart: '13:00',
                        uniformBreakEnd: '14:00',
                      }));
                    }
                  }}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span>Include daily break / lunch block (excluded from counselling slots)</span>
              </label>

              {hasUniformBreak && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Break Start</label>
                    <input
                      type="time"
                      disabled={!canEdit}
                      value={draft.uniformBreakStart || '13:00'}
                      onChange={(e) => {
                        setToast(null);
                        setDraft((prev) => ({ ...prev, uniformBreakStart: e.target.value }));
                      }}
                      className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-xs font-mono tabular-nums text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-70"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Break End</label>
                    <input
                      type="time"
                      disabled={!canEdit}
                      value={draft.uniformBreakEnd || '14:00'}
                      onChange={(e) => {
                        setToast(null);
                        setDraft((prev) => ({ ...prev, uniformBreakEnd: e.target.value }));
                      }}
                      className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-xs font-mono tabular-nums text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-70"
                    />
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-500 tabular-nums">
                Active window preview:{' '}
                <strong className="text-slate-800">
                  {formatTimeRange12h(draft.uniformStartTime, draft.uniformEndTime)}
                </strong>
                <span> · Daily counselling cap: </span>
                <strong className="text-indigo-700">{uniformMaxHours} hrs/day</strong>
                {hasUniformBreak && draft.uniformBreakStart && draft.uniformBreakEnd && (
                  <span> · Break {formatTimeRange12h(draft.uniformBreakStart, draft.uniformBreakEnd)}</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Mode B: Custom Day-Wise */}
        {draft.mode === 'custom' && (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="px-4 py-2.5">Day</th>
                    <th className="px-4 py-2.5">Start Time</th>
                    <th className="px-4 py-2.5">End Time</th>
                    <th className="px-4 py-2.5">Per-Day Hourly Width</th>
                    <th className="px-4 py-2.5">Optional Break (Start – End)</th>
                    <th className="px-4 py-2.5 text-right">Effective Daily Cap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {draft.selectedDays.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                        Check one or more days above to configure day-wise timings and hourly bandwidth.
                      </td>
                    </tr>
                  ) : (
                    draft.selectedDays.map((day) => {
                      const row = draft.daySchedules[day];
                      const win = getEffectiveDayWindow(draft, day);
                      const hasDayBreak = Boolean(row.breakStart || row.breakEnd);
                      const dayCapHours = resolveValidHours(row.maxHours ?? uniformMaxHours);
                      const netWindowHrs = Math.round((win.netWindowMinutes / 60) * 10) / 10;
                      const effectiveHrs = Math.min(dayCapHours, netWindowHrs);
                      return (
                        <tr key={day} className="hover:bg-slate-50/70">
                          <td className="px-4 py-2.5 font-semibold text-slate-900">{day}</td>
                          <td className="px-4 py-2.5">
                            <input
                              type="time"
                              disabled={!canEdit}
                              value={row.startTime}
                              onChange={(e) => updateCustomDayField(day, 'startTime', e.target.value)}
                              className="h-8 bg-white border border-slate-200 rounded-md px-2.5 text-xs font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-70"
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            <input
                              type="time"
                              disabled={!canEdit}
                              value={row.endTime}
                              onChange={(e) => updateCustomDayField(day, 'endTime', e.target.value)}
                              className="h-8 bg-white border border-slate-200 rounded-md px-2.5 text-xs font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-70"
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            <select
                              disabled={!canEdit}
                              value={dayCapHours}
                              onChange={(e) =>
                                updateCustomDayField(day, 'maxHours', Number(e.target.value))
                              }
                              className="h-8 bg-white border border-slate-200 rounded-md px-2.5 text-xs font-semibold tabular-nums text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-70"
                            >
                              {PER_DAY_HOURLY_BANDWIDTH_OPTIONS.map((hrs) => (
                                <option key={hrs} value={hrs}>
                                  {hrs} {hrs === 1 ? 'hr' : 'hrs'} / day
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2.5">
                            {hasDayBreak ? (
                              <div className="inline-flex items-center gap-1.5">
                                <input
                                  type="time"
                                  disabled={!canEdit}
                                  value={row.breakStart || '13:00'}
                                  onChange={(e) => updateCustomDayField(day, 'breakStart', e.target.value)}
                                  className="h-8 bg-white border border-slate-200 rounded-md px-2 text-xs font-mono tabular-nums text-slate-800 disabled:opacity-70"
                                />
                                <span className="text-slate-400">–</span>
                                <input
                                  type="time"
                                  disabled={!canEdit}
                                  value={row.breakEnd || '14:00'}
                                  onChange={(e) => updateCustomDayField(day, 'breakEnd', e.target.value)}
                                  className="h-8 bg-white border border-slate-200 rounded-md px-2 text-xs font-mono tabular-nums text-slate-800 disabled:opacity-70"
                                />
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateCustomDayField(day, 'breakStart', '');
                                      updateCustomDayField(day, 'breakEnd', '');
                                    }}
                                    className="text-slate-400 hover:text-red-600 px-1.5 py-1 text-[11px] font-medium"
                                    title="Clear break"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                            ) : canEdit ? (
                              <button
                                type="button"
                                onClick={() => {
                                  updateCustomDayField(day, 'breakStart', '13:00');
                                  updateCustomDayField(day, 'breakEnd', '14:00');
                                }}
                                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
                              >
                                + Add break block
                              </button>
                            ) : (
                              <span className="text-slate-400">None</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                            <span className="font-semibold text-indigo-700">{effectiveHrs} hrs</span>
                            <span className="text-slate-400 ml-1.5">({netWindowHrs}h window)</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Validation or Save Status Feedback */}
      {validationError && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {toast && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-xs',
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          )}
        >
          {toast.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Actions Footer */}
      {canEdit && (
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              const norm = normalizePrimaryAvailability(liveMember.primaryAvailability);
              setDraft(norm);
              setUniformMaxHours(resolveValidHours(liveMember.dailyMaxCounsellingHours));
              setHasUniformBreak(Boolean(norm.uniformBreakStart && norm.uniformBreakEnd));
              setToast(null);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Changes</span>
          </button>

          <Button
            type="button"
            disabled={isSaving || Boolean(validationError)}
            onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 h-9 whitespace-nowrap shrink-0"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                <span>Saving Configuration...</span>
              </>
            ) : (
              <>
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                <span>Save Working Days & Hourly Width</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
