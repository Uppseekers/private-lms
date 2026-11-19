import {
  CounsellingGradeKey,
  CounsellingSchedulerSettings,
  CounsellorPrimaryAvailability,
  DayAvailabilityTiming,
  DayOfWeekName,
  EventItem,
  GradeCounsellingRule,
  StaffMember,
  Student,
  StudentAvailability,
  StudentDateAvailabilityOverride,
} from '@/types';
import { doesValueMatchStaffMember } from '@/lib/staffPermissions';

export const ALL_DAYS_OF_WEEK: DayOfWeekName[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const COUNSELLING_GRADES: CounsellingGradeKey[] = ['7', '8', '9', '10', '11', '12'];

export const DAILY_BANDWIDTH_OPTIONS: Array<3 | 4 | 5 | 6> = [3, 4, 5, 6];
export const PER_DAY_HOURLY_BANDWIDTH_OPTIONS: number[] = [1, 2, 3, 4, 5, 6, 7, 8];

export const DEFAULT_SCHEDULER_SETTINGS: CounsellingSchedulerSettings = {
  id: 'counselling_rules',
  gradeRules: {
    '7': { durationMinutes: 30, frequencyPerMonth: 1 },
    '8': { durationMinutes: 30, frequencyPerMonth: 2 },
    '9': { durationMinutes: 45, frequencyPerMonth: 2 },
    '10': { durationMinutes: 45, frequencyPerMonth: 2 },
    '11': { durationMinutes: 60, frequencyPerMonth: 3 },
    '12': { durationMinutes: 60, frequencyPerMonth: 4 },
  },
  bufferMinutes: 10,
};

export function buildDefaultPrimaryAvailability(): CounsellorPrimaryAvailability {
  const daySchedules = {} as Record<DayOfWeekName, DayAvailabilityTiming>;
  for (const day of ALL_DAYS_OF_WEEK) {
    const isWeekday = day !== 'Saturday' && day !== 'Sunday';
    daySchedules[day] = {
      enabled: isWeekday,
      startTime: '10:00',
      endTime: isWeekday ? '18:00' : '16:00',
      breakStart: isWeekday ? '13:00' : '',
      breakEnd: isWeekday ? '14:00' : '',
    };
  }
  return {
    mode: 'uniform',
    selectedDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    uniformStartTime: '10:00',
    uniformEndTime: '18:00',
    uniformBreakStart: '13:00',
    uniformBreakEnd: '14:00',
    daySchedules,
  };
}

export function normalizeSchedulerSettings(
  raw?: Partial<CounsellingSchedulerSettings> | null
): CounsellingSchedulerSettings {
  const base = DEFAULT_SCHEDULER_SETTINGS;
  const gradeRules = { ...base.gradeRules };
  if (raw?.gradeRules && typeof raw.gradeRules === 'object') {
    for (const g of COUNSELLING_GRADES) {
      const candidate = (raw.gradeRules as Record<string, Partial<GradeCounsellingRule>>)[g];
      if (candidate && typeof candidate === 'object') {
        const durRaw = Number(candidate.durationMinutes);
        const freqRaw = Number(candidate.frequencyPerMonth);
        const durationMinutes: 30 | 45 | 60 =
          durRaw === 30 || durRaw === 45 || durRaw === 60 ? durRaw : base.gradeRules[g].durationMinutes;
        const frequencyPerMonth: 1 | 2 | 3 | 4 =
          freqRaw === 1 || freqRaw === 2 || freqRaw === 3 || freqRaw === 4
            ? freqRaw
            : base.gradeRules[g].frequencyPerMonth;
        gradeRules[g] = { durationMinutes, frequencyPerMonth };
      }
    }
  }
  const bufNum = Number(raw?.bufferMinutes);
  const bufferMinutes = Number.isFinite(bufNum) && bufNum >= 0 && bufNum <= 60 ? Math.round(bufNum) : base.bufferMinutes;

  return {
    id: 'counselling_rules',
    gradeRules,
    bufferMinutes,
    ...(raw?.updatedBy ? { updatedBy: String(raw.updatedBy).slice(0, 200) } : {}),
    ...(raw?.updatedAt ? { updatedAt: String(raw.updatedAt).slice(0, 64) } : {}),
  };
}

export function normalizePrimaryAvailability(
  raw?: Partial<CounsellorPrimaryAvailability> | null
): CounsellorPrimaryAvailability {
  const defaults = buildDefaultPrimaryAvailability();
  if (!raw || typeof raw !== 'object') return defaults;

  const mode: 'uniform' | 'custom' = raw.mode === 'custom' ? 'custom' : 'uniform';
  const validDaySet = new Set<string>(ALL_DAYS_OF_WEEK);
  const selectedDays: DayOfWeekName[] = Array.isArray(raw.selectedDays)
    ? (raw.selectedDays.filter((d) => validDaySet.has(String(d))) as DayOfWeekName[])
    : defaults.selectedDays;

  const uniformStartTime = sanitizeTime24(raw.uniformStartTime, defaults.uniformStartTime);
  const uniformEndTime = sanitizeTime24(raw.uniformEndTime, defaults.uniformEndTime);
  const uniformBreakStart = raw.uniformBreakStart ? sanitizeTime24(raw.uniformBreakStart, '') : '';
  const uniformBreakEnd = raw.uniformBreakEnd ? sanitizeTime24(raw.uniformBreakEnd, '') : '';

  const daySchedules = {} as Record<DayOfWeekName, DayAvailabilityTiming>;
  for (const day of ALL_DAYS_OF_WEEK) {
    const incomingDay = raw.daySchedules?.[day];
    const isSelected = selectedDays.includes(day);
    const rawMaxHours = Number(incomingDay?.maxHours);
    const validMaxHours =
      Number.isFinite(rawMaxHours) && rawMaxHours >= 1 && rawMaxHours <= 12
        ? Math.round(rawMaxHours * 2) / 2
        : undefined;
    daySchedules[day] = {
      enabled: isSelected,
      startTime: sanitizeTime24(incomingDay?.startTime, defaults.daySchedules[day].startTime),
      endTime: sanitizeTime24(incomingDay?.endTime, defaults.daySchedules[day].endTime),
      breakStart: incomingDay?.breakStart ? sanitizeTime24(incomingDay.breakStart, '') : '',
      breakEnd: incomingDay?.breakEnd ? sanitizeTime24(incomingDay.breakEnd, '') : '',
      ...(validMaxHours !== undefined ? { maxHours: validMaxHours } : {}),
    };
  }

  return {
    mode,
    selectedDays,
    uniformStartTime,
    uniformEndTime,
    ...(uniformBreakStart ? { uniformBreakStart } : {}),
    ...(uniformBreakEnd ? { uniformBreakEnd } : {}),
    daySchedules,
    ...(raw.updatedAt ? { updatedAt: String(raw.updatedAt).slice(0, 64) } : {}),
  };
}

export function sanitizePrimaryAvailabilityForFirestore(
  avail: CounsellorPrimaryAvailability
): CounsellorPrimaryAvailability {
  const norm = normalizePrimaryAvailability(avail);
  const cleanSchedules = {} as Record<DayOfWeekName, DayAvailabilityTiming>;
  for (const day of ALL_DAYS_OF_WEEK) {
    const item = norm.daySchedules[day];
    const rawMaxHours = Number(item.maxHours);
    const validMaxHours =
      Number.isFinite(rawMaxHours) && rawMaxHours >= 1 && rawMaxHours <= 12
        ? Math.round(rawMaxHours * 2) / 2
        : undefined;
    cleanSchedules[day] = {
      enabled: norm.selectedDays.includes(day),
      startTime: item.startTime.slice(0, 16),
      endTime: item.endTime.slice(0, 16),
      ...(item.breakStart ? { breakStart: item.breakStart.slice(0, 16) } : {}),
      ...(item.breakEnd ? { breakEnd: item.breakEnd.slice(0, 16) } : {}),
      ...(validMaxHours !== undefined ? { maxHours: validMaxHours } : {}),
    };
  }
  return {
    mode: norm.mode,
    selectedDays: norm.selectedDays.slice(0, 7),
    uniformStartTime: norm.uniformStartTime.slice(0, 16),
    uniformEndTime: norm.uniformEndTime.slice(0, 16),
    ...(norm.uniformBreakStart ? { uniformBreakStart: norm.uniformBreakStart.slice(0, 16) } : {}),
    ...(norm.uniformBreakEnd ? { uniformBreakEnd: norm.uniformBreakEnd.slice(0, 16) } : {}),
    daySchedules: cleanSchedules,
    updatedAt: new Date().toISOString(),
  };
}

export function buildDefaultStudentAvailability(): StudentAvailability {
  const daySchedules = {} as Record<DayOfWeekName, DayAvailabilityTiming>;
  for (const day of ALL_DAYS_OF_WEEK) {
    daySchedules[day] = {
      enabled: day !== 'Sunday',
      startTime: '16:00',
      endTime: '20:00',
    };
  }
  return {
    mode: 'uniform',
    selectedDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    uniformStartTime: '16:00',
    uniformEndTime: '20:00',
    daySchedules,
    dateOverrides: [],
  };
}

export function normalizeStudentAvailability(
  raw?: Partial<StudentAvailability> | null
): StudentAvailability {
  const defaults = buildDefaultStudentAvailability();
  if (!raw || typeof raw !== 'object') return defaults;

  const mode: 'uniform' | 'custom' = raw.mode === 'custom' ? 'custom' : 'uniform';
  const validDaySet = new Set<string>(ALL_DAYS_OF_WEEK);
  const selectedDays: DayOfWeekName[] = Array.isArray(raw.selectedDays)
    ? (raw.selectedDays.filter((d) => validDaySet.has(String(d))) as DayOfWeekName[])
    : defaults.selectedDays;

  const uniformStartTime = sanitizeTime24(raw.uniformStartTime, defaults.uniformStartTime);
  const uniformEndTime = sanitizeTime24(raw.uniformEndTime, defaults.uniformEndTime);

  const daySchedules = {} as Record<DayOfWeekName, DayAvailabilityTiming>;
  for (const day of ALL_DAYS_OF_WEEK) {
    const incomingDay = raw.daySchedules?.[day];
    const isSelected = selectedDays.includes(day);
    daySchedules[day] = {
      enabled: isSelected,
      startTime: sanitizeTime24(incomingDay?.startTime, defaults.daySchedules[day].startTime),
      endTime: sanitizeTime24(incomingDay?.endTime, defaults.daySchedules[day].endTime),
    };
  }

  const dateOverrides: StudentDateAvailabilityOverride[] = Array.isArray(raw.dateOverrides)
    ? raw.dateOverrides
        .filter((ov) => ov && typeof ov === 'object' && typeof ov.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ov.date.trim()))
        .slice(0, 30)
        .map((ov) => ({
          date: ov.date.trim().slice(0, 16),
          startTime: sanitizeTime24(ov.startTime, '16:00'),
          endTime: sanitizeTime24(ov.endTime, '19:00'),
          ...(ov.unavailable ? { unavailable: true } : {}),
        }))
    : [];

  return {
    mode,
    selectedDays,
    uniformStartTime,
    uniformEndTime,
    daySchedules,
    dateOverrides,
    ...(raw.updatedAt ? { updatedAt: String(raw.updatedAt).slice(0, 64) } : {}),
  };
}

export function sanitizeStudentAvailabilityForFirestore(
  avail: StudentAvailability
): StudentAvailability {
  const norm = normalizeStudentAvailability(avail);
  const cleanSchedules = {} as Record<DayOfWeekName, DayAvailabilityTiming>;
  for (const day of ALL_DAYS_OF_WEEK) {
    const item = norm.daySchedules[day];
    cleanSchedules[day] = {
      enabled: norm.selectedDays.includes(day),
      startTime: item.startTime.slice(0, 16),
      endTime: item.endTime.slice(0, 16),
    };
  }
  const cleanOverrides = (norm.dateOverrides || []).slice(0, 30).map((ov) => ({
    date: ov.date.slice(0, 16),
    startTime: ov.startTime.slice(0, 16),
    endTime: ov.endTime.slice(0, 16),
    ...(ov.unavailable ? { unavailable: true } : {}),
  }));
  return {
    mode: norm.mode,
    selectedDays: norm.selectedDays.slice(0, 7),
    uniformStartTime: norm.uniformStartTime.slice(0, 16),
    uniformEndTime: norm.uniformEndTime.slice(0, 16),
    daySchedules: cleanSchedules,
    dateOverrides: cleanOverrides,
    updatedAt: new Date().toISOString(),
  };
}

export function summarizeStudentAvailability(avail?: Partial<StudentAvailability> | null): string {
  const norm = normalizeStudentAvailability(avail);
  const overrideCount = norm.dateOverrides?.length || 0;
  if (norm.selectedDays.length === 0 && overrideCount === 0) {
    return 'No days selected';
  }
  const dayAbbrevs = norm.selectedDays.map((d) => d.slice(0, 3));
  const daysText =
    norm.selectedDays.length === 7
      ? 'Mon–Sun'
      : norm.selectedDays.length === 5 &&
        norm.selectedDays[0] === 'Monday' &&
        norm.selectedDays[4] === 'Friday'
      ? 'Mon–Fri'
      : norm.selectedDays.length === 6 &&
        norm.selectedDays[0] === 'Monday' &&
        norm.selectedDays[5] === 'Saturday'
      ? 'Mon–Sat'
      : dayAbbrevs.join(', ');

  let timeText = '';
  if (norm.mode === 'uniform') {
    timeText = formatTimeRange12h(norm.uniformStartTime, norm.uniformEndTime);
  } else if (norm.selectedDays.length > 0) {
    const distinctRanges = Array.from(
      new Set(
        norm.selectedDays.map((d) => {
          const ds = norm.daySchedules[d];
          return `${ds.startTime}-${ds.endTime}`;
        })
      )
    );
    if (distinctRanges.length === 1) {
      const firstDay = norm.daySchedules[norm.selectedDays[0]];
      timeText = formatTimeRange12h(firstDay.startTime, firstDay.endTime);
    } else {
      timeText = norm.selectedDays
        .map((d) => `${d.slice(0, 3)} ${formatTimeRange12h(norm.daySchedules[d].startTime, norm.daySchedules[d].endTime)}`)
        .slice(0, 2)
        .join(', ') + (norm.selectedDays.length > 2 ? ` +${norm.selectedDays.length - 2}d` : '');
    }
  }

  const parts = [daysText, timeText].filter(Boolean);
  if (overrideCount > 0) {
    parts.push(`${overrideCount} date slot${overrideCount > 1 ? 's' : ''}`);
  }
  return parts.join(' · ');
}

export function getStudentAllowedIntervalsForDate(
  avail: StudentAvailability | undefined | null,
  dateIso: string,
  dayOfWeek: DayOfWeekName
): TimeIntervalMinutes[] {
  const norm = normalizeStudentAvailability(avail);

  // 1. Specific calendar date override takes highest priority
  const dateOverride = (norm.dateOverrides || []).find((ov) => ov.date === dateIso);
  if (dateOverride) {
    if (dateOverride.unavailable) return [];
    const s = parseTimeToMinutes(dateOverride.startTime);
    const e = parseTimeToMinutes(dateOverride.endTime);
    if (s !== null && e !== null && e > s) {
      return [{ start: s, end: e }];
    }
    return [];
  }

  // 2. Weekly day selection & timing mode (honors Student Database default 16:00–20:00 when not customized)
  if (!norm.selectedDays.includes(dayOfWeek)) {
    return [];
  }

  const startStr =
    norm.mode === 'custom' ? norm.daySchedules[dayOfWeek]?.startTime : norm.uniformStartTime;
  const endStr =
    norm.mode === 'custom' ? norm.daySchedules[dayOfWeek]?.endTime : norm.uniformEndTime;
  const s = parseTimeToMinutes(startStr);
  const e = parseTimeToMinutes(endStr);
  if (s === null || e === null || e <= s) return [];
  return [{ start: s, end: e }];
}

export function sanitizeTime24(raw?: string | null, fallback = '10:00'): string {
  if (!raw || typeof raw !== 'string') return fallback;
  const mins = parseTimeToMinutes(raw);
  if (mins === null) return fallback;
  return formatMinutesTo24h(mins);
}

export function parseTimeToMinutes(raw?: string | null): number | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = parseInt(ampmMatch[2], 10);
    const meridiem = ampmMatch[3].toUpperCase();
    if (h < 1 || h > 12 || m < 0 || m > 59) return null;
    if (meridiem === 'AM' && h === 12) h = 0;
    if (meridiem === 'PM' && h !== 12) h += 12;
    return h * 60 + m;
  }

  const h24Match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (h24Match) {
    const h = parseInt(h24Match[1], 10);
    const m = parseInt(h24Match[2], 10);
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    if (h === 24 && m === 0) return 1440;
    return h * 60 + m;
  }

  return null;
}

export function formatMinutesTo24h(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.round(totalMinutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatMinutesTo12h(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.round(totalMinutes)));
  const h24 = Math.floor(clamped / 60);
  const m = clamped % 60;
  const meridiem = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${meridiem}`;
}

export function formatTime24To12h(time24: string): string {
  const mins = parseTimeToMinutes(time24);
  if (mins === null) return time24;
  return formatMinutesTo12h(mins);
}

export function formatTimeRange12h(start24: string, end24: string): string {
  return `${formatTime24To12h(start24)} – ${formatTime24To12h(end24)}`;
}

export interface TimeIntervalMinutes {
  start: number;
  end: number;
}

export interface EffectiveDayWindow {
  day: DayOfWeekName;
  enabled: boolean;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  dayMaxHours?: number;
  intervals: TimeIntervalMinutes[];
  netWindowMinutes: number;
}

export function getEffectiveDayWindow(
  availability: CounsellorPrimaryAvailability,
  day: DayOfWeekName
): EffectiveDayWindow {
  const norm = normalizePrimaryAvailability(availability);
  const enabled = norm.selectedDays.includes(day);
  const source =
    norm.mode === 'uniform'
      ? {
          startTime: norm.uniformStartTime,
          endTime: norm.uniformEndTime,
          breakStart: norm.uniformBreakStart,
          breakEnd: norm.uniformBreakEnd,
          maxHours: undefined,
        }
      : norm.daySchedules[day];

  const startM = parseTimeToMinutes(source.startTime) ?? 600;
  const endM = parseTimeToMinutes(source.endTime) ?? 1080;

  if (!enabled || endM <= startM) {
    return {
      day,
      enabled: false,
      startTime: source.startTime,
      endTime: source.endTime,
      breakStart: source.breakStart,
      breakEnd: source.breakEnd,
      dayMaxHours: source.maxHours,
      intervals: [],
      netWindowMinutes: 0,
    };
  }

  const bStart = parseTimeToMinutes(source.breakStart);
  const bEnd = parseTimeToMinutes(source.breakEnd);
  const intervals: TimeIntervalMinutes[] = [];

  if (bStart !== null && bEnd !== null && bEnd > bStart && bStart < endM && bEnd > startM) {
    const clampedBreakStart = Math.max(startM, bStart);
    const clampedBreakEnd = Math.min(endM, bEnd);
    if (clampedBreakStart > startM) {
      intervals.push({ start: startM, end: clampedBreakStart });
    }
    if (endM > clampedBreakEnd) {
      intervals.push({ start: clampedBreakEnd, end: endM });
    }
  } else {
    intervals.push({ start: startM, end: endM });
  }

  const netWindowMinutes = intervals.reduce((sum, iv) => sum + Math.max(0, iv.end - iv.start), 0);

  return {
    day,
    enabled: netWindowMinutes > 0,
    startTime: source.startTime,
    endTime: source.endTime,
    breakStart: source.breakStart,
    breakEnd: source.breakEnd,
    dayMaxHours: source.maxHours,
    intervals,
    netWindowMinutes,
  };
}

export function summarizePrimaryAvailability(availability?: CounsellorPrimaryAvailability | null): string {
  if (!availability || !Array.isArray(availability.selectedDays) || availability.selectedDays.length === 0) {
    return 'Mon–Fri · 10:00 AM – 06:00 PM';
  }
  const norm = normalizePrimaryAvailability(availability);
  const dayAbbrevs = norm.selectedDays.map((d) => d.slice(0, 3)).join(', ');
  if (norm.mode === 'uniform') {
    return `${dayAbbrevs} · ${formatTimeRange12h(norm.uniformStartTime, norm.uniformEndTime)}`;
  }
  return `${dayAbbrevs} · Custom day-wise timings`;
}

export function summarizeCounsellorHourlyBandwidth(
  availability?: CounsellorPrimaryAvailability | null,
  fallbackDailyHours = 4
): string {
  const safeDefault =
    Number.isFinite(fallbackDailyHours) && fallbackDailyHours >= 1 && fallbackDailyHours <= 12
      ? fallbackDailyHours
      : 4;
  if (!availability) {
    return `${safeDefault} hrs / day`;
  }
  const norm = normalizePrimaryAvailability(availability);
  if (norm.mode === 'custom' && norm.selectedDays.length > 0) {
    const perDayHours = norm.selectedDays.map((d) => ({
      day: d.slice(0, 3),
      hrs: norm.daySchedules[d]?.maxHours ?? safeDefault,
    }));
    const distinct = new Set(perDayHours.map((p) => p.hrs));
    if (distinct.size > 1) {
      return perDayHours.map((p) => `${p.day} ${p.hrs}h`).join(', ');
    }
    return `${perDayHours[0].hrs} hrs / day`;
  }
  return `${safeDefault} hrs / day`;
}

export function resolveStudentGrade(student?: Partial<Student> | null): {
  grade: CounsellingGradeKey;
  isInferred: boolean;
} {
  const extractGradeNumber = (val?: string | null): CounsellingGradeKey | null => {
    if (!val) return null;
    const match = String(val).match(/\b(7|8|9|10|11|12)(?:th|st|nd|rd)?\b/i);
    if (match && COUNSELLING_GRADES.includes(match[1] as CounsellingGradeKey)) {
      return match[1] as CounsellingGradeKey;
    }
    return null;
  };

  const explicit = extractGradeNumber(student?.grade);
  if (explicit) {
    return { grade: explicit, isInferred: false };
  }

  if (Array.isArray(student?.academicScores) && student!.academicScores.length > 0) {
    let highest: number | null = null;
    for (const sc of student!.academicScores) {
      const g = extractGradeNumber(sc?.grade);
      if (g) {
        const num = parseInt(g, 10);
        if (highest === null || num > highest) highest = num;
      }
    }
    if (highest !== null && COUNSELLING_GRADES.includes(String(highest) as CounsellingGradeKey)) {
      return { grade: String(highest) as CounsellingGradeKey, isInferred: true };
    }
  }

  const intakeMatch = String(student?.intake || '').match(/\b(20\d{2})\b/);
  if (intakeMatch) {
    const intakeYear = parseInt(intakeMatch[1], 10);
    const currentYear = new Date().getFullYear();
    const yearsUntilIntake = intakeYear - currentYear;
    if (yearsUntilIntake <= 1) return { grade: '12', isInferred: true };
    if (yearsUntilIntake === 2) return { grade: '11', isInferred: true };
    if (yearsUntilIntake === 3) return { grade: '10', isInferred: true };
    if (yearsUntilIntake === 4) return { grade: '9', isInferred: true };
    if (yearsUntilIntake === 5) return { grade: '8', isInferred: true };
    return { grade: '7', isInferred: true };
  }

  return { grade: '11', isInferred: true };
}

export interface StudentBandwidthRequirement {
  student: Student;
  grade: CounsellingGradeKey;
  isInferredGrade: boolean;
  durationMinutes: 30 | 45 | 60;
  frequencyPerMonth: 1 | 2 | 3 | 4;
  monthlySessionMinutes: number;
  threeMonthTotalSessions: number;
}

export interface CounsellorCapacityReport {
  workingDaysPerWeek: number;
  workingDaysPerMonth: number;
  dailyMaxHoursSelected: number;
  weeklyPrimaryWindowMinutes: number;
  weeklyCappedCounsellingMinutes: number;
  monthlyAvailableMinutes: number;
  monthlyAvailableHours: number;
  requiredMonthlyMinutes: number;
  requiredMonthlyHours: number;
  requiredMonthlySessions: number;
  estimatedMonthlyBufferMinutes: number;
  avgMinutesPerStudent: number;
  maxStudentCapacity: number;
  assignedStudentCount: number;
  openStudentSlots: number;
  isOverloaded: boolean;
  utilizationPercent: number;
  wasCappedByAvailabilityWindow: boolean;
  studentRequirements: StudentBandwidthRequirement[];
  dayBreakdown: Array<{
    day: DayOfWeekName;
    enabled: boolean;
    dayMaxHours: number;
    windowMinutes: number;
    cappedCounsellingMinutes: number;
    timeLabel: string;
  }>;
}

export function calculateCounsellorCapacity(params: {
  availability?: CounsellorPrimaryAvailability | null;
  dailyMaxHours: number;
  assignedStudents: Student[];
  schedulerSettings?: CounsellingSchedulerSettings | null;
}): CounsellorCapacityReport {
  const normAvail = normalizePrimaryAvailability(params.availability);
  const settings = normalizeSchedulerSettings(params.schedulerSettings);
  const safeDailyHours =
    Number.isFinite(params.dailyMaxHours) && params.dailyMaxHours >= 1 && params.dailyMaxHours <= 12
      ? params.dailyMaxHours
      : 4;

  const studentRequirements: StudentBandwidthRequirement[] = params.assignedStudents.map((stu) => {
    const { grade, isInferred } = resolveStudentGrade(stu);
    const rule = settings.gradeRules[grade] || DEFAULT_SCHEDULER_SETTINGS.gradeRules['11'];
    return {
      student: stu,
      grade,
      isInferredGrade: isInferred,
      durationMinutes: rule.durationMinutes,
      frequencyPerMonth: rule.frequencyPerMonth,
      monthlySessionMinutes: rule.durationMinutes * rule.frequencyPerMonth,
      threeMonthTotalSessions: rule.frequencyPerMonth * 3,
    };
  });

  const requiredMonthlyMinutes = studentRequirements.reduce((s, r) => s + r.monthlySessionMinutes, 0);
  const requiredMonthlySessions = studentRequirements.reduce((s, r) => s + r.frequencyPerMonth, 0);

  // Typical session duration used to verify how many sessions fit inside each day's window once buffers are applied
  const avgSessionDuration =
    requiredMonthlySessions > 0
      ? requiredMonthlyMinutes / requiredMonthlySessions
      : (settings.gradeRules['10'].durationMinutes + settings.gradeRules['11'].durationMinutes) / 2;

  let weeklyPrimaryWindowMinutes = 0;
  let weeklyCappedCounsellingMinutes = 0;
  let workingDaysPerWeek = 0;
  let wasCappedByAvailabilityWindow = false;

  const dayBreakdown = ALL_DAYS_OF_WEEK.map((day) => {
    const win = getEffectiveDayWindow(normAvail, day);
    const effectiveDayMaxHours =
      normAvail.mode === 'custom' && typeof win.dayMaxHours === 'number' && win.dayMaxHours >= 1
        ? win.dayMaxHours
        : safeDailyHours;
    const dayMaxMinutes = effectiveDayMaxHours * 60;

    if (!win.enabled || win.netWindowMinutes <= 0) {
      return {
        day,
        enabled: false,
        dayMaxHours: effectiveDayMaxHours,
        windowMinutes: 0,
        cappedCounsellingMinutes: 0,
        timeLabel: 'Off',
      };
    }

    workingDaysPerWeek += 1;
    weeklyPrimaryWindowMinutes += win.netWindowMinutes;

    // Calculate maximum pure session minutes that fit inside both win.intervals AND dayMaxMinutes once inter-session buffers are applied
    let maxTalkMinutesInIntervals = 0;
    for (const iv of win.intervals) {
      const len = iv.end - iv.start;
      if (len >= 30) {
        if (settings.bufferMinutes > 0 && avgSessionDuration > 0) {
          const approxSessions = Math.max(
            1,
            Math.floor((len + settings.bufferMinutes) / (avgSessionDuration + settings.bufferMinutes))
          );
          const bufferOverhead = Math.max(0, approxSessions - 1) * settings.bufferMinutes;
          maxTalkMinutesInIntervals += Math.max(30, len - bufferOverhead);
        } else {
          maxTalkMinutesInIntervals += len;
        }
      }
    }

    const rawDailyCap = Math.min(dayMaxMinutes, win.netWindowMinutes);
    let maxTalkMinutesInDayCap = rawDailyCap;
    if (rawDailyCap >= 30 && settings.bufferMinutes > 0 && avgSessionDuration > 0) {
      const approxCapSessions = Math.max(
        1,
        Math.floor((rawDailyCap + settings.bufferMinutes) / (avgSessionDuration + settings.bufferMinutes))
      );
      const capBufferOverhead = Math.max(0, approxCapSessions - 1) * settings.bufferMinutes;
      maxTalkMinutesInDayCap = Math.max(30, rawDailyCap - capBufferOverhead);
    }

    if (win.netWindowMinutes < dayMaxMinutes) {
      wasCappedByAvailabilityWindow = true;
    }

    const cappedDayMinutes = Math.min(maxTalkMinutesInDayCap, maxTalkMinutesInIntervals);
    weeklyCappedCounsellingMinutes += cappedDayMinutes;

    const breakSuffix =
      win.breakStart && win.breakEnd ? ` (Break ${formatTimeRange12h(win.breakStart, win.breakEnd)})` : '';

    return {
      day,
      enabled: true,
      dayMaxHours: effectiveDayMaxHours,
      windowMinutes: win.netWindowMinutes,
      cappedCounsellingMinutes: cappedDayMinutes,
      timeLabel: `${formatTimeRange12h(win.startTime, win.endTime)}${breakSuffix}`,
    };
  });

  // 4-week monthly cycle aligns cleanly with 1/month, 2/month, 3/month, 4/month and 12-week (3-month) series
  const workingDaysPerMonth = workingDaysPerWeek * 4;
  const monthlyAvailableMinutes = weeklyCappedCounsellingMinutes * 4;
  const monthlyAvailableHours = Math.round((monthlyAvailableMinutes / 60) * 10) / 10;
  const requiredMonthlyHours = Math.round((requiredMonthlyMinutes / 60) * 10) / 10;
  const estimatedMonthlyBufferMinutes = requiredMonthlySessions * settings.bufferMinutes;

  // Weighted average monthly requirement per student (falls back to standard Grade 10/11 average if 0 students assigned)
  const fallbackPerStudentMinutes =
    (settings.gradeRules['9'].durationMinutes * settings.gradeRules['9'].frequencyPerMonth +
      settings.gradeRules['10'].durationMinutes * settings.gradeRules['10'].frequencyPerMonth +
      settings.gradeRules['11'].durationMinutes * settings.gradeRules['11'].frequencyPerMonth +
      settings.gradeRules['12'].durationMinutes * settings.gradeRules['12'].frequencyPerMonth) /
    4;

  const avgMinutesPerStudent =
    studentRequirements.length > 0
      ? requiredMonthlyMinutes / studentRequirements.length
      : fallbackPerStudentMinutes || 120;

  const maxStudentCapacity =
    monthlyAvailableMinutes > 0 && avgMinutesPerStudent > 0
      ? Math.floor(monthlyAvailableMinutes / avgMinutesPerStudent)
      : 0;

  const assignedStudentCount = params.assignedStudents.length;
  const openStudentSlots = maxStudentCapacity - assignedStudentCount;
  const isOverloaded = assignedStudentCount > maxStudentCapacity || requiredMonthlyMinutes > monthlyAvailableMinutes;
  const utilizationPercent =
    monthlyAvailableMinutes > 0
      ? Math.round((requiredMonthlyMinutes / monthlyAvailableMinutes) * 100)
      : assignedStudentCount > 0
      ? 100
      : 0;

  return {
    workingDaysPerWeek,
    workingDaysPerMonth,
    dailyMaxHoursSelected: params.dailyMaxHours,
    weeklyPrimaryWindowMinutes,
    weeklyCappedCounsellingMinutes,
    monthlyAvailableMinutes,
    monthlyAvailableHours,
    requiredMonthlyMinutes,
    requiredMonthlyHours,
    requiredMonthlySessions,
    estimatedMonthlyBufferMinutes,
    avgMinutesPerStudent: Math.round(avgMinutesPerStudent * 10) / 10,
    maxStudentCapacity,
    assignedStudentCount,
    openStudentSlots,
    isOverloaded,
    utilizationPercent,
    wasCappedByAvailabilityWindow,
    studentRequirements,
    dayBreakdown,
  };
}

export interface GeneratedSessionSlot {
  id: string;
  seriesId: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: DayOfWeekName;
  weekIndex: number; // 1..12
  monthCycle: 1 | 2 | 3; // Month 1, 2, or 3
  startTime24: string; // HH:mm
  endTime24: string; // HH:mm
  timeRangeLabel: string; // "10:00 AM – 10:45 AM"
  durationMinutes: 30 | 45 | 60;
  frequencyPerMonth: 1 | 2 | 3 | 4;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentAvailabilityLabel: string;
  grade: CounsellingGradeKey;
  sessionNumber: number; // 1..totalSessionsForStudent
  totalSessionsForStudent: number;
}

export interface UnscheduledOverflowItem {
  studentId: string;
  studentName: string;
  grade: CounsellingGradeKey;
  weekIndex: number;
  reason: string;
}

export interface GeneratedScheduleResult {
  counsellorId: string;
  counsellorName: string;
  counsellorEmail: string;
  startDate: string;
  endDate: string;
  batchRunId: string;
  slots: GeneratedSessionSlot[];
  unscheduled: UnscheduledOverflowItem[];
  totalPlannedSessions: number;
  monthOneSessionsCount: number;
  threeMonthSessionsCount: number;
}

function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseIsoDateLocal(iso: string): Date {
  const parts = iso.split('-').map((n) => parseInt(n, 10));
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
  }
  const fallback = new Date();
  fallback.setHours(12, 0, 0, 0);
  return fallback;
}

function getDayOfWeekFromDate(d: Date): DayOfWeekName {
  const jsDay = d.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  return jsDay === 0 ? 'Sunday' : ALL_DAYS_OF_WEEK[jsDay - 1];
}

export function getDefaultNextMondayIso(): string {
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const jsDay = now.getDay();
  const daysUntilNextMonday = jsDay === 1 ? 0 : jsDay === 0 ? 1 : 8 - jsDay;
  const target = new Date(now);
  target.setDate(now.getDate() + (daysUntilNextMonday === 0 ? 7 : daysUntilNextMonday));
  return toLocalIsoDate(target);
}

function parseEventTimeRangeMinutes(timeStr?: string): TimeIntervalMinutes | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const parts = timeStr.split(/\s*[-–]\s*/);
  if (parts.length < 2) {
    const singleStart = parseTimeToMinutes(parts[0]);
    if (singleStart !== null) return { start: singleStart, end: singleStart + 60 };
    return null;
  }
  const start = parseTimeToMinutes(parts[0]);
  const end = parseTimeToMinutes(parts[1]);
  if (start === null || end === null || end <= start) return null;
  return { start, end };
}

function getTargetWeeksInFourWeekCycle(freq: 1 | 2 | 3 | 4, rotationIndex: number): number[] {
  if (freq === 4) return [0, 1, 2, 3]; // Weekly
  if (freq === 3) {
    // Spaced ~9–10 days apart across 4 weeks
    const patterns = [
      [0, 1, 3],
      [0, 2, 3],
      [0, 1, 2],
      [1, 2, 3],
    ];
    return patterns[rotationIndex % patterns.length];
  }
  if (freq === 2) {
    // Spaced ~14 days apart (Weeks 1 & 3 or Weeks 2 & 4)
    return rotationIndex % 2 === 0 ? [0, 2] : [1, 3];
  }
  // 1/month: distribute evenly across Weeks 1, 2, 3, and 4
  return [rotationIndex % 4];
}

export function isAutoGeneratedCounsellingEvent(ev: EventItem, counsellor?: StaffMember | null): boolean {
  const isAuto = Boolean(ev.seriesId && String(ev.seriesId).startsWith('AUTOSCHED-'));
  if (!isAuto) return false;
  if (!counsellor) return true;
  return (
    doesValueMatchStaffMember(ev.host, counsellor) ||
    doesValueMatchStaffMember(ev.organiser, counsellor)
  );
}

export function generateCounsellorSchedule(params: {
  counsellor: StaffMember;
  availability?: CounsellorPrimaryAvailability | null;
  dailyMaxHours: number;
  assignedStudents: Student[];
  schedulerSettings?: CounsellingSchedulerSettings | null;
  existingEvents?: EventItem[];
  startDateIso?: string;
  ignorePreviousAutoSeries?: boolean;
}): GeneratedScheduleResult {
  const normAvail = normalizePrimaryAvailability(params.availability || params.counsellor.primaryAvailability);
  const settings = normalizeSchedulerSettings(params.schedulerSettings);
  const safeDailyHours =
    Number.isFinite(params.dailyMaxHours) && params.dailyMaxHours >= 1 && params.dailyMaxHours <= 12
      ? params.dailyMaxHours
      : 4;
  const startIso = params.startDateIso || getDefaultNextMondayIso();
  const baseDate = parseIsoDateLocal(startIso);
  const batchRunId = `AUTOSCHED-${toSafeToken(params.counsellor.id || params.counsellor.name)}-${Date.now().toString(36).toUpperCase()}`;

  // Build 84 calendar days (12 weeks = 3 months)
  interface DayLedger {
    dateIso: string;
    dayOfWeek: DayOfWeekName;
    weekZeroIdx: number; // 0..11
    intervals: TimeIntervalMinutes[];
    dailySessionCapMinutes: number;
    usedBandwidthMinutes: number; // Includes session durations + inter-session buffers
    placedSessionCount: number;
    bookedBlocks: Array<{ start: number; end: number; studentId?: string; isExternal?: boolean }>;
  }

  const dayLedgers: DayLedger[] = [];
  const ledgerByDate = new Map<string, DayLedger>();

  for (let offset = 0; offset < 84; offset++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + offset);
    const dateIso = toLocalIsoDate(d);
    const dayOfWeek = getDayOfWeekFromDate(d);
    const win = getEffectiveDayWindow(normAvail, dayOfWeek);
    const effectiveDayMaxHours =
      normAvail.mode === 'custom' && typeof win.dayMaxHours === 'number' && win.dayMaxHours >= 1
        ? win.dayMaxHours
        : safeDailyHours;
    const dayMaxMinutes = effectiveDayMaxHours * 60;
    const ledger: DayLedger = {
      dateIso,
      dayOfWeek,
      weekZeroIdx: Math.floor(offset / 7),
      intervals: win.enabled ? win.intervals : [],
      dailySessionCapMinutes: win.enabled ? Math.min(dayMaxMinutes, win.netWindowMinutes) : 0,
      usedBandwidthMinutes: 0,
      placedSessionCount: 0,
      bookedBlocks: [],
    };
    dayLedgers.push(ledger);
    ledgerByDate.set(dateIso, ledger);
  }

  // Seed existing events on those dates so we never double-book counsellor or student
  for (const ev of params.existingEvents || []) {
    if (ev.status === 'Cancelled') continue;
    if (params.ignorePreviousAutoSeries && isAutoGeneratedCounsellingEvent(ev, params.counsellor)) {
      continue;
    }
    const evDate = ev.date || ev.day;
    if (!evDate || !ledgerByDate.has(evDate)) continue;
    const isCounsellorBusy =
      doesValueMatchStaffMember(ev.host, params.counsellor) ||
      doesValueMatchStaffMember(ev.organiser, params.counsellor);
    if (!isCounsellorBusy && !ev.studentId) continue;

    const range = parseEventTimeRangeMinutes(ev.time);
    if (!range) continue;
    const ledger = ledgerByDate.get(evDate)!;
    ledger.bookedBlocks.push({
      start: range.start,
      end: range.end,
      studentId: isCounsellorBusy ? undefined : ev.studentId,
      isExternal: true,
    });
    if (isCounsellorBusy) {
      const extDuration = Math.max(0, range.end - range.start);
      const bufferCost = ledger.placedSessionCount > 0 ? settings.bufferMinutes : 0;
      ledger.usedBandwidthMinutes += extDuration + bufferCost;
      ledger.placedSessionCount += 1;
    }
  }

  // Compute weekly overlapping minutes between each student's availability and the counsellor's working intervals
  // so Most-Constrained Students (e.g. evening-only 16:00–20:00 students) get placed before all-day flexible students
  const computeWeeklyOverlapMinutes = (student: Student, durationMinutes: number): number => {
    let overlapMins = 0;
    for (const day of ALL_DAYS_OF_WEEK) {
      const cWin = getEffectiveDayWindow(normAvail, day);
      if (!cWin.enabled || cWin.intervals.length === 0) continue;
      const sIntervals = getStudentAllowedIntervalsForDate(student.studentAvailability, '', day);
      for (const civ of cWin.intervals) {
        for (const siv of sIntervals) {
          const start = Math.max(civ.start, siv.start);
          const end = Math.min(civ.end, siv.end);
          if (end - start >= durationMinutes) {
            overlapMins += end - start;
          }
        }
      }
    }
    return overlapMins;
  };

  const enrichedStudents = params.assignedStudents
    .map((student) => {
      const { grade } = resolveStudentGrade(student);
      const rule = settings.gradeRules[grade] || DEFAULT_SCHEDULER_SETTINGS.gradeRules['11'];
      const weeklyOverlapMinutes = computeWeeklyOverlapMinutes(student, rule.durationMinutes);
      return {
        student,
        grade,
        durationMinutes: rule.durationMinutes,
        frequencyPerMonth: rule.frequencyPerMonth,
        weeklyOverlapMinutes,
      };
    })
    .sort((a, b) => {
      // 1. Most constrained overlap window with counsellor first (prevents flexible students from blocking 16:00+ windows)
      if (a.weeklyOverlapMinutes !== b.weeklyOverlapMinutes) {
        return a.weeklyOverlapMinutes - b.weeklyOverlapMinutes;
      }
      // 2. Higher monthly frequency & longer session duration next
      if (b.frequencyPerMonth !== a.frequencyPerMonth) return b.frequencyPerMonth - a.frequencyPerMonth;
      if (b.durationMinutes !== a.durationMinutes) return b.durationMinutes - a.durationMinutes;
      return String(a.student.name || '').localeCompare(String(b.student.name || ''));
    });

  // Track rotation counters per frequency tier so 1/month, 2/month, 3/month students spread evenly across Weeks 1..4
  const rotationCounterByFreq: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const buffer = settings.bufferMinutes;

  // Find earliest valid start minute on a specific DayLedger honoring:
  // 1) Student Availability (days + time window + date overrides)
  // 2) Counsellor Working Hours & Breaks
  // 3) Counsellor Per-Day Hourly Bandwidth Cap (accounting for session duration + inter-session buffer)
  // 4) Buffer separation before & after existing sessions
  const findAvailableSlotOnDay = (
    ledger: DayLedger,
    durationMinutes: number,
    student: Student,
    preferredStartMinute?: number | null
  ): { startMinute: number; studentDayWindowLabel: string } | null => {
    if (ledger.intervals.length === 0) return null;

    const requiredBandwidthIncrement =
      durationMinutes + (ledger.placedSessionCount > 0 ? buffer : 0);
    if (ledger.usedBandwidthMinutes + requiredBandwidthIncrement > ledger.dailySessionCapMinutes) {
      return null;
    }

    // Never schedule the same student twice on the exact same day
    if (ledger.bookedBlocks.some((b) => b.studentId === student.id && !b.isExternal)) return null;

    const studentIntervals = getStudentAllowedIntervalsForDate(
      student.studentAvailability,
      ledger.dateIso,
      ledger.dayOfWeek
    );
    if (studentIntervals.length === 0) {
      return null;
    }

    // Compute exact intersection intervals between Counsellor Working Hours and Student Availability
    const overlapIntervals: TimeIntervalMinutes[] = [];
    for (const civ of ledger.intervals) {
      for (const siv of studentIntervals) {
        const overlapStart = Math.max(civ.start, siv.start);
        const overlapEnd = Math.min(civ.end, siv.end);
        if (overlapEnd - overlapStart >= durationMinutes) {
          overlapIntervals.push({ start: overlapStart, end: overlapEnd });
        }
      }
    }
    if (overlapIntervals.length === 0) {
      return null;
    }

    const studentDayWindowLabel = studentIntervals
      .map((siv) => `${formatMinutesTo12h(siv.start)} – ${formatMinutesTo12h(siv.end)}`)
      .join(', ');

    const isSlotFree = (candStart: number): boolean => {
      const candEnd = candStart + durationMinutes;
      const fitsIntersection = overlapIntervals.some(
        (oiv) => candStart >= oiv.start && candEnd <= oiv.end
      );
      if (!fitsIntersection) return false;

      for (const block of ledger.bookedBlocks) {
        if (block.isExternal && block.studentId && block.studentId !== student.id) {
          continue;
        }
        const effectiveBlockStart = block.start - buffer;
        const effectiveBlockEnd = block.end + buffer;
        if (candStart < effectiveBlockEnd && candEnd > effectiveBlockStart) {
          return false;
        }
      }
      return true;
    };

    if (preferredStartMinute !== null && preferredStartMinute !== undefined && isSlotFree(preferredStartMinute)) {
      return { startMinute: preferredStartMinute, studentDayWindowLabel };
    }

    const step = 5;
    for (const oiv of overlapIntervals) {
      let cursor = oiv.start;
      while (cursor + durationMinutes <= oiv.end) {
        if (isSlotFree(cursor)) {
          return { startMinute: cursor, studentDayWindowLabel };
        }
        cursor += step;
      }
    }
    return null;
  };

  const slots: GeneratedSessionSlot[] = [];
  const unscheduled: UnscheduledOverflowItem[] = [];

  for (const item of enrichedStudents) {
    const { student, grade, durationMinutes, frequencyPerMonth, weeklyOverlapMinutes } = item;
    const rotIdx = rotationCounterByFreq[frequencyPerMonth] || 0;
    rotationCounterByFreq[frequencyPerMonth] = rotIdx + 1;

    const cycleWeeks = getTargetWeeksInFourWeekCycle(frequencyPerMonth, rotIdx);
    const targetWeeks12: number[] = [];
    for (let monthCycle = 0; monthCycle < 3; monthCycle++) {
      for (const w of cycleWeeks) {
        targetWeeks12.push(monthCycle * 4 + w); // 0..11
      }
    }

    const totalSessionsForStudent = targetWeeks12.length;
    const studentSeriesId = `${batchRunId}-${toSafeToken(student.id).slice(0, 24)}`;

    let preferredDayOfWeek: DayOfWeekName | null = null;
    let preferredStartMinute: number | null = null;
    let placedCountForStudent = 0;

    for (let sIdx = 0; sIdx < targetWeeks12.length; sIdx++) {
      const targetWeekZero = targetWeeks12[sIdx];
      const weekDays = dayLedgers.filter(
        (dl) => dl.weekZeroIdx === targetWeekZero && dl.dailySessionCapMinutes >= durationMinutes
      );

      const candidateDays = [...weekDays].sort((a, b) => {
        const aRatio = a.dailySessionCapMinutes > 0 ? a.usedBandwidthMinutes / a.dailySessionCapMinutes : 1;
        const bRatio = b.dailySessionCapMinutes > 0 ? b.usedBandwidthMinutes / b.dailySessionCapMinutes : 1;

        if (preferredDayOfWeek) {
          const aReq = durationMinutes + (a.placedSessionCount > 0 ? buffer : 0);
          const bReq = durationMinutes + (b.placedSessionCount > 0 ? buffer : 0);
          const aPref = a.dayOfWeek === preferredDayOfWeek && a.usedBandwidthMinutes + aReq <= a.dailySessionCapMinutes;
          const bPref = b.dayOfWeek === preferredDayOfWeek && b.usedBandwidthMinutes + bReq <= b.dailySessionCapMinutes;
          if (aPref && !bPref && aRatio <= 0.85) return -1;
          if (bPref && !aPref && bRatio <= 0.85) return 1;
        }
        if (Math.abs(aRatio - bRatio) > 0.001) return aRatio - bRatio;
        return a.dateIso.localeCompare(b.dateIso);
      });

      let chosenDay: DayLedger | null = null;
      let chosenSlot: { startMinute: number; studentDayWindowLabel: string } | null = null;

      for (const candDay of candidateDays) {
        const found = findAvailableSlotOnDay(
          candDay,
          durationMinutes,
          student,
          candDay.dayOfWeek === preferredDayOfWeek ? preferredStartMinute : null
        );
        if (found !== null) {
          chosenDay = candDay;
          chosenSlot = found;
          break;
        }
      }

      // Fallback: if target week is completely full, look in adjacent week within the same 4-week month cycle (ensuring >= 3 days spacing)
      if (!chosenDay || chosenSlot === null) {
        const monthStartWeek = Math.floor(targetWeekZero / 4) * 4;
        const fallbackDays = dayLedgers
          .filter(
            (dl) =>
              dl.weekZeroIdx >= monthStartWeek &&
              dl.weekZeroIdx < monthStartWeek + 4 &&
              dl.weekZeroIdx !== targetWeekZero &&
              dl.dailySessionCapMinutes >= durationMinutes
          )
          .sort((a, b) => a.usedBandwidthMinutes - b.usedBandwidthMinutes);

        for (const fbDay of fallbackDays) {
          const fbTime = parseIsoDateLocal(fbDay.dateIso).getTime();
          const tooClose = slots.some(
            (existing) =>
              existing.studentId === student.id &&
              Math.abs(parseIsoDateLocal(existing.date).getTime() - fbTime) < 3 * 86400000
          );
          if (tooClose) continue;

          const found = findAvailableSlotOnDay(fbDay, durationMinutes, student, null);
          if (found !== null) {
            chosenDay = fbDay;
            chosenSlot = found;
            break;
          }
        }
      }

      if (chosenDay && chosenSlot !== null) {
        const chosenStart = chosenSlot.startMinute;
        if (!preferredDayOfWeek) {
          preferredDayOfWeek = chosenDay.dayOfWeek;
          preferredStartMinute = chosenStart;
        }
        placedCountForStudent += 1;
        const endMinute = chosenStart + durationMinutes;
        const bandwidthCost =
          durationMinutes + (chosenDay.placedSessionCount > 0 ? buffer : 0);
        chosenDay.usedBandwidthMinutes += bandwidthCost;
        chosenDay.placedSessionCount += 1;
        chosenDay.bookedBlocks.push({
          start: chosenStart,
          end: endMinute,
          studentId: student.id,
          isExternal: false,
        });

        const startTime24 = formatMinutesTo24h(chosenStart);
        const endTime24 = formatMinutesTo24h(endMinute);
        const monthCycle = (Math.floor(chosenDay.weekZeroIdx / 4) + 1) as 1 | 2 | 3;

        slots.push({
          id: `EVT-${studentSeriesId}-S${placedCountForStudent}`,
          seriesId: studentSeriesId,
          date: chosenDay.dateIso,
          dayOfWeek: chosenDay.dayOfWeek,
          weekIndex: chosenDay.weekZeroIdx + 1,
          monthCycle,
          startTime24,
          endTime24,
          timeRangeLabel: formatTimeRange12h(startTime24, endTime24),
          durationMinutes,
          frequencyPerMonth,
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email || '',
          studentAvailabilityLabel: chosenSlot.studentDayWindowLabel,
          grade,
          sessionNumber: placedCountForStudent,
          totalSessionsForStudent,
        });
      } else {
        unscheduled.push({
          studentId: student.id,
          studentName: student.name,
          grade,
          weekIndex: targetWeekZero + 1,
          reason:
            weekDays.length === 0
              ? 'No configured Counsellor working days'
              : weeklyOverlapMinutes === 0
              ? `${student.name}'s availability (${summarizeStudentAvailability(student.studentAvailability)}) has no ${durationMinutes}-min overlap with counsellor working hours (${summarizePrimaryAvailability(normAvail)})`
              : `Counsellor daily bandwidth & buffer cap reached inside ${student.name}'s available window (${summarizeStudentAvailability(student.studentAvailability)}) in Week ${targetWeekZero + 1}`,
        });
      }
    }
  }

  // Sort final slots chronologically by Date + Start Time, then re-number each student's sessionNumber sequentially
  slots.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime24.localeCompare(b.startTime24);
  });

  const perStudentCounter = new Map<string, number>();
  const perStudentTotals = new Map<string, number>();
  for (const sl of slots) {
    perStudentTotals.set(sl.studentId, (perStudentTotals.get(sl.studentId) || 0) + 1);
  }
  for (const sl of slots) {
    const nextNum = (perStudentCounter.get(sl.studentId) || 0) + 1;
    perStudentCounter.set(sl.studentId, nextNum);
    sl.sessionNumber = nextNum;
    sl.totalSessionsForStudent = perStudentTotals.get(sl.studentId) || sl.totalSessionsForStudent;
  }

  const endDateObj = new Date(baseDate);
  endDateObj.setDate(baseDate.getDate() + 83);

  return {
    counsellorId: params.counsellor.id,
    counsellorName: params.counsellor.name,
    counsellorEmail: params.counsellor.email,
    startDate: startIso,
    endDate: toLocalIsoDate(endDateObj),
    batchRunId,
    slots,
    unscheduled,
    totalPlannedSessions: slots.length + unscheduled.length,
    monthOneSessionsCount: slots.filter((s) => s.monthCycle === 1).length,
    threeMonthSessionsCount: slots.length,
  };
}

export function buildEventItemsFromGeneratedSchedule(params: {
  result: GeneratedScheduleResult;
  counsellor: StaffMember;
  defaultMeetingLink?: string;
}): EventItem[] {
  const cleanHost = (params.counsellor.name || 'Counsellor').trim().slice(0, 160);
  const cleanOrganiser = (params.counsellor.email || cleanHost).trim().slice(0, 160);
  const meetingUrl = (params.defaultMeetingLink || 'https://meet.google.com').trim().slice(0, 500);

  return params.result.slots.map((slot) => {
    const participantEmails = [params.counsellor.email, slot.studentEmail]
      .map((e) => String(e || '').trim().toLowerCase())
      .filter(Boolean);

    return {
      id: toSafeToken(slot.id).slice(0, 120),
      title: `1-on-1 Counselling • ${slot.studentName} (Session #${slot.sessionNumber})`.slice(0, 300),
      stream: 'Counselling (1-on-1)',
      type: 'Counselling',
      category: `Grade ${slot.grade}`,
      day: slot.date,
      date: slot.date,
      time: `${slot.startTime24} - ${slot.endTime24}`,
      duration: `${slot.startTime24} - ${slot.endTime24} (${slot.durationMinutes} min)`,
      host: cleanHost,
      organiser: cleanOrganiser,
      students: slot.studentName.slice(0, 500),
      studentId: slot.studentId,
      status: 'Scheduled',
      location: meetingUrl,
      link: meetingUrl,
      isRecurring: true,
      seriesId: toSafeToken(slot.seriesId).slice(0, 120),
      sessionNumber: slot.sessionNumber,
      totalSessionsInSeries: slot.totalSessionsForStudent,
      recurrenceRule: `Auto-Scheduled • Grade ${slot.grade} (${slot.frequencyPerMonth}/mo · ${slot.durationMinutes}m)`,
      notes: `Auto-scheduled 1-on-1 counselling session (${slot.sessionNumber} of ${slot.totalSessionsForStudent}) for Grade ${slot.grade} cadence.`,
      moms: [],
      ratings: [],
      resources: [],
      tasks: [],
      videoProvider: 'manual',
      participantEmails,
    };
  });
}

export function exportGeneratedScheduleToCsv(
  result: GeneratedScheduleResult,
  slotsOverride?: GeneratedSessionSlot[]
): void {
  const rows = slotsOverride ?? result.slots;
  const escapeCsvCell = (val: string | number | undefined | null): string => {
    const str = val === undefined || val === null ? '' : String(val);
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = [
    'Date',
    'Day',
    'Time Slot',
    'Start Time (24h)',
    'End Time (24h)',
    'Duration (Mins)',
    'Student Name',
    'Student Availability Window',
    'Student Email',
    'Grade',
    'Monthly Frequency',
    'Session #',
    'Total 3-Month Sessions',
    'Counsellor',
  ];

  const csvLines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((slot) =>
      [
        slot.date,
        slot.dayOfWeek,
        slot.timeRangeLabel,
        slot.startTime24,
        slot.endTime24,
        slot.durationMinutes,
        slot.studentName,
        slot.studentAvailabilityLabel,
        slot.studentEmail,
        `Grade ${slot.grade}`,
        `${slot.frequencyPerMonth}/month`,
        slot.sessionNumber,
        slot.totalSessionsForStudent,
        result.counsellorName,
      ]
        .map(escapeCsvCell)
        .join(',')
    ),
  ];

  const bom = '\uFEFF';
  const blob = new Blob([bom + csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = toSafeToken(result.counsellorName || 'counsellor').toLowerCase();
  a.href = url;
  a.download = `counsellor_schedule_${safeName}_${result.startDate}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toSafeToken(raw: string): string {
  const cleaned = String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-');
  return cleaned || 'ITEM';
}
