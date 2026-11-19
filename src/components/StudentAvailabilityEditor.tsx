import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DayAvailabilityTiming,
  DayOfWeekName,
  Student,
  StudentAvailability,
  StudentDateAvailabilityOverride,
} from '@/types';
import {
  ALL_DAYS_OF_WEEK,
  formatTimeRange12h,
  normalizeStudentAvailability,
  parseTimeToMinutes,
} from '@/lib/counsellorAutoScheduler';
import { useDatabase } from '@/context/DatabaseContext';
import {
  AlertCircle,
  Calendar,
  CalendarPlus,
  Check,
  Clock,
  Loader2,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudentAvailabilityEditorProps {
  student?: Student;
  value?: StudentAvailability;
  onChangeDraft?: (availability: StudentAvailability) => void;
  canEdit?: boolean;
  compact?: boolean;
  onSaved?: (availability: StudentAvailability) => void;
}

export default function StudentAvailabilityEditor({
  student,
  value,
  onChangeDraft,
  canEdit = true,
  compact = false,
  onSaved,
}: StudentAvailabilityEditorProps) {
  const { saveStudentAvailability, students } = useDatabase();

  const liveStudent = useMemo(() => {
    if (!student) return undefined;
    return students.find((s) => s.id === student.id) || student;
  }, [students, student]);

  const sourceAvailability = value ?? liveStudent?.studentAvailability;
  const isDraftOnlyMode = Boolean(onChangeDraft && !liveStudent);

  const [draft, setDraft] = useState<StudentAvailability>(() =>
    normalizeStudentAvailability(sourceAvailability)
  );
  const [newOverrideDate, setNewOverrideDate] = useState('');
  const [newOverrideStart, setNewOverrideStart] = useState('16:00');
  const [newOverrideEnd, setNewOverrideEnd] = useState('19:00');
  const [newOverrideUnavailable, setNewOverrideUnavailable] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!isDraftOnlyMode) {
      setDraft(normalizeStudentAvailability(liveStudent?.studentAvailability));
    }
  }, [isDraftOnlyMode, liveStudent?.id, liveStudent?.studentAvailability]);

  const updateDraft = (updater: (prev: StudentAvailability) => StudentAvailability) => {
    setToast(null);
    setDraft((prev) => {
      const next = updater(prev);
      onChangeDraft?.(next);
      return next;
    });
  };

  const toggleDay = (day: DayOfWeekName) => {
    if (!canEdit) return;
    updateDraft((prev) => {
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
          },
        },
      };
    });
  };

  const applyPresetDays = (days: DayOfWeekName[]) => {
    if (!canEdit) return;
    updateDraft((prev) => {
      const nextSchedules = { ...prev.daySchedules };
      for (const d of ALL_DAYS_OF_WEEK) {
        nextSchedules[d] = {
          ...nextSchedules[d],
          enabled: days.includes(d),
        };
      }
      return {
        ...prev,
        selectedDays: days,
        daySchedules: nextSchedules,
      };
    });
  };

  const handleModeChange = (mode: 'uniform' | 'custom') => {
    if (!canEdit) return;
    updateDraft((prev) => {
      if (mode === 'custom' && prev.mode === 'uniform') {
        const seeded = { ...prev.daySchedules };
        for (const d of ALL_DAYS_OF_WEEK) {
          seeded[d] = {
            enabled: prev.selectedDays.includes(d),
            startTime: prev.uniformStartTime || seeded[d]?.startTime || '16:00',
            endTime: prev.uniformEndTime || seeded[d]?.endTime || '20:00',
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
    val: string | boolean
  ) => {
    if (!canEdit) return;
    updateDraft((prev) => ({
      ...prev,
      daySchedules: {
        ...prev.daySchedules,
        [day]: {
          ...prev.daySchedules[day],
          [field]: val,
        },
      },
    }));
  };

  const handleAddDateOverride = () => {
    if (!canEdit || !newOverrideDate) return;
    if (!newOverrideUnavailable) {
      const s = parseTimeToMinutes(newOverrideStart);
      const e = parseTimeToMinutes(newOverrideEnd);
      if (s === null || e === null || e <= s) {
        setToast({
          type: 'error',
          message: 'Specific date End Time must be later than Start Time.',
        });
        return;
      }
    }
    const nextItem: StudentDateAvailabilityOverride = {
      date: newOverrideDate,
      startTime: newOverrideStart,
      endTime: newOverrideEnd,
      ...(newOverrideUnavailable ? { unavailable: true } : {}),
    };
    updateDraft((prev) => {
      const filtered = (prev.dateOverrides || []).filter((ov) => ov.date !== newOverrideDate);
      const sorted = [...filtered, nextItem]
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 30);
      return {
        ...prev,
        dateOverrides: sorted,
      };
    });
    setNewOverrideDate('');
    setNewOverrideUnavailable(false);
  };

  const handleRemoveDateOverride = (dateIso: string) => {
    if (!canEdit) return;
    updateDraft((prev) => ({
      ...prev,
      dateOverrides: (prev.dateOverrides || []).filter((ov) => ov.date !== dateIso),
    }));
  };

  const validationError = useMemo(() => {
    if (draft.selectedDays.length === 0 && (!draft.dateOverrides || draft.dateOverrides.length === 0)) {
      return 'Select at least one preferred day of the week or add a specific date slot.';
    }
    if (draft.mode === 'uniform' && draft.selectedDays.length > 0) {
      const s = parseTimeToMinutes(draft.uniformStartTime);
      const e = parseTimeToMinutes(draft.uniformEndTime);
      if (s === null || e === null || e <= s) {
        return 'End Time must be later than Start Time.';
      }
    }
    if (draft.mode === 'custom') {
      for (const day of draft.selectedDays) {
        const row = draft.daySchedules[day];
        const s = parseTimeToMinutes(row.startTime);
        const e = parseTimeToMinutes(row.endTime);
        if (s === null || e === null || e <= s) {
          return `${day}: End Time must be later than Start Time.`;
        }
      }
    }
    return null;
  }, [draft]);

  const handleSave = async () => {
    if (!canEdit || validationError || !liveStudent) return;
    setIsSaving(true);
    setToast(null);
    try {
      await saveStudentAvailability(liveStudent.id, draft);
      setToast({
        type: 'success',
        message: `Student availability saved to database for ${liveStudent.name}.`,
      });
      onSaved?.(draft);
    } catch {
      setToast({
        type: 'error',
        message: 'Failed to save student availability. Check permissions and retry.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200',
        compact ? 'p-4 space-y-4' : 'p-6 space-y-6'
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Student Counselling Availability</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {liveStudent ? (
              <>
                <span className="font-medium text-slate-700">{liveStudent.name}</span>
                <span className="mx-1.5" aria-hidden="true">·</span>
              </>
            ) : null}
            <span className="tabular-nums">
              {draft.selectedDays.length} day{draft.selectedDays.length !== 1 ? 's' : ''}/wk selected
            </span>
            {draft.dateOverrides && draft.dateOverrides.length > 0 && (
              <>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {draft.dateOverrides.length} specific date slot{draft.dateOverrides.length !== 1 ? 's' : ''}
                </span>
              </>
            )}
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => applyPresetDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              Weekdays
            </button>
            <button
              type="button"
              onClick={() => applyPresetDays(['Saturday', 'Sunday'])}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              Weekends
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
        )}
      </div>

      {/* 1. Choose Available Days */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700">
          1. Choose Preferred Days of the Week
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
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                  !canEdit && 'opacity-70 cursor-not-allowed'
                )}
              >
                <span>{day.slice(0, 3)}</span>
                <span
                  className={cn(
                    'w-4 h-4 rounded flex items-center justify-center border',
                    checked
                      ? 'bg-white/20 border-white/40 text-white'
                      : 'border-slate-300 bg-slate-50'
                  )}
                >
                  {checked && <Check className="w-3 h-3" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Timing Mode: Same Time Slot for All Days vs Day-Wise Custom Time */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-semibold text-slate-700">
            2. Time Slot Mode
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
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Same time slot for all days
            </button>
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => handleModeChange('custom')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0',
                draft.mode === 'custom'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Day-wise custom time
            </button>
          </div>
        </div>

        {draft.mode === 'uniform' && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Available From (applies to {draft.selectedDays.length} selected day{draft.selectedDays.length !== 1 ? 's' : ''})
                </label>
                <input
                  type="time"
                  disabled={!canEdit}
                  value={draft.uniformStartTime}
                  onChange={(e) => {
                    const nextStart = e.target.value;
                    updateDraft((prev) => {
                      const nextSchedules = { ...prev.daySchedules };
                      for (const d of ALL_DAYS_OF_WEEK) {
                        nextSchedules[d] = { ...nextSchedules[d], startTime: nextStart };
                      }
                      return { ...prev, uniformStartTime: nextStart, daySchedules: nextSchedules };
                    });
                  }}
                  className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Available Until
                </label>
                <input
                  type="time"
                  disabled={!canEdit}
                  value={draft.uniformEndTime}
                  onChange={(e) => {
                    const nextEnd = e.target.value;
                    updateDraft((prev) => {
                      const nextSchedules = { ...prev.daySchedules };
                      for (const d of ALL_DAYS_OF_WEEK) {
                        nextSchedules[d] = { ...nextSchedules[d], endTime: nextEnd };
                      }
                      return { ...prev, uniformEndTime: nextEnd, daySchedules: nextSchedules };
                    });
                  }}
                  className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-500 tabular-nums">
                Active student slot: <strong className="text-slate-800">{formatTimeRange12h(draft.uniformStartTime, draft.uniformEndTime)}</strong>
              </p>
              {canEdit && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      updateDraft((prev) => {
                        const nextSchedules = { ...prev.daySchedules };
                        for (const d of ALL_DAYS_OF_WEEK) {
                          nextSchedules[d] = { ...nextSchedules[d], startTime: '16:00', endTime: '20:00' };
                        }
                        return { ...prev, uniformStartTime: '16:00', uniformEndTime: '20:00', daySchedules: nextSchedules };
                      })
                    }
                    className="px-2 py-1 text-[11px] font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    After School (4 PM – 8 PM)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateDraft((prev) => {
                        const nextSchedules = { ...prev.daySchedules };
                        for (const d of ALL_DAYS_OF_WEEK) {
                          nextSchedules[d] = { ...nextSchedules[d], startTime: '10:00', endTime: '20:00' };
                        }
                        return { ...prev, uniformStartTime: '10:00', uniformEndTime: '20:00', daySchedules: nextSchedules };
                      })
                    }
                    className="px-2 py-1 text-[11px] font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    Full Day (10 AM – 8 PM)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {draft.mode === 'custom' && (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="px-4 py-2.5">Selected Day</th>
                    <th className="px-4 py-2.5">Start Time</th>
                    <th className="px-4 py-2.5">End Time</th>
                    <th className="px-4 py-2.5 text-right">Time Window</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {draft.selectedDays.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                        Select one or more days above to configure day-wise time slots.
                      </td>
                    </tr>
                  ) : (
                    draft.selectedDays.map((day) => {
                      const row = draft.daySchedules[day];
                      return (
                        <tr key={day} className="hover:bg-slate-50/70">
                          <td className="px-4 py-2.5 font-semibold text-slate-900">{day}</td>
                          <td className="px-4 py-2.5">
                            <input
                              type="time"
                              disabled={!canEdit}
                              value={row.startTime}
                              onChange={(e) =>
                                updateCustomDayField(day, 'startTime', e.target.value)
                              }
                              className="h-8 bg-white border border-slate-200 rounded-md px-2.5 text-xs font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            <input
                              type="time"
                              disabled={!canEdit}
                              value={row.endTime}
                              onChange={(e) =>
                                updateCustomDayField(day, 'endTime', e.target.value)
                              }
                              className="h-8 bg-white border border-slate-200 rounded-md px-2.5 text-xs font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-600">
                            {formatTimeRange12h(row.startTime, row.endTime)}
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

      {/* 3. Specific Date-Wise Time Slots / Overrides (Optional) */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <div>
          <label className="block text-xs font-semibold text-slate-700">
            3. Date-Wise Specific Time Slots (Optional)
          </label>
          <p className="text-xs text-slate-500 mt-0.5">
            Add specific calendar dates if the student has special availability or exam unavailability on particular dates.
          </p>
        </div>

        {canEdit && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Date</label>
              <input
                type="date"
                value={newOverrideDate}
                onChange={(e) => setNewOverrideDate(e.target.value)}
                className="h-9 bg-white border border-slate-200 rounded-lg px-2.5 text-xs font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {!newOverrideUnavailable && (
              <>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">From</label>
                  <input
                    type="time"
                    value={newOverrideStart}
                    onChange={(e) => setNewOverrideStart(e.target.value)}
                    className="h-9 bg-white border border-slate-200 rounded-lg px-2.5 text-xs font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Until</label>
                  <input
                    type="time"
                    value={newOverrideEnd}
                    onChange={(e) => setNewOverrideEnd(e.target.value)}
                    className="h-9 bg-white border border-slate-200 rounded-lg px-2.5 text-xs font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            <label className="inline-flex items-center gap-2 h-9 px-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={newOverrideUnavailable}
                onChange={(e) => setNewOverrideUnavailable(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span>Unavailable all day</span>
            </label>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!newOverrideDate}
              onClick={handleAddDateOverride}
              className="bg-white h-9 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              <CalendarPlus className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              <span>Add Date Slot</span>
            </Button>
          </div>
        )}

        {draft.dateOverrides && draft.dateOverrides.length > 0 && (
          <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden bg-white">
            {draft.dateOverrides.map((ov) => (
              <div
                key={ov.date}
                className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 tabular-nums">
                  <span className="font-mono font-semibold text-slate-900">{ov.date}</span>
                  <span className="text-slate-300" aria-hidden="true">·</span>
                  {ov.unavailable ? (
                    <span className="text-red-700 font-medium">Unavailable on this date</span>
                  ) : (
                    <span className="font-mono text-slate-700">
                      {formatTimeRange12h(ov.startTime, ov.endTime)}
                    </span>
                  )}
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleRemoveDateOverride(ov.date)}
                    className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                    title="Remove date override"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Validation & Toast Feedback */}
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

      {/* Save Footer (when editing an existing student in database) */}
      {canEdit && !isDraftOnlyMode && liveStudent && (
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              setDraft(normalizeStudentAvailability(liveStudent.studentAvailability));
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
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 h-9 whitespace-nowrap shrink-0"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                <span>Saving Availability...</span>
              </>
            ) : (
              <>
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                <span>Save Student Availability</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
