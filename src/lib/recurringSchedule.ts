export interface DayOfWeekOption {
  label: string;
  short: string;
  value: number; // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
  full: string;
}

export const DAY_OF_WEEK_OPTIONS: DayOfWeekOption[] = [
  { label: 'Mon', short: 'M', value: 1, full: 'Monday' },
  { label: 'Tue', short: 'T', value: 2, full: 'Tuesday' },
  { label: 'Wed', short: 'W', value: 3, full: 'Wednesday' },
  { label: 'Thu', short: 'Th', value: 4, full: 'Thursday' },
  { label: 'Fri', short: 'F', value: 5, full: 'Friday' },
  { label: 'Sat', short: 'Sa', value: 6, full: 'Saturday' },
  { label: 'Sun', short: 'Su', value: 0, full: 'Sunday' },
];

export const SCHEDULE_DAY_PRESETS = [
  { label: 'Mon, Wed, Fri', days: [1, 3, 5] },
  { label: 'Tue, Thu', days: [2, 4] },
  { label: 'Weekdays (Mon-Fri)', days: [1, 2, 3, 4, 5] },
  { label: 'Weekends (Sat-Sun)', days: [6, 0] },
  { label: 'Everyday', days: [1, 2, 3, 4, 5, 6, 0] },
];

/**
 * Generates an array of date strings (YYYY-MM-DD) falling between startDate and endDate
 * matching any of the selected days of the week.
 */
export function generateRecurringDates(
  startDateStr: string,
  endDateStr: string,
  selectedDays: number[],
  maxLimit = 150
): string[] {
  if (!startDateStr || !endDateStr || !selectedDays || selectedDays.length === 0) {
    return [];
  }

  const [sY, sM, sD] = startDateStr.split('-').map(Number);
  const [eY, eM, eD] = endDateStr.split('-').map(Number);

  if (!sY || !sM || !sD || !eY || !eM || !eD) return [];

  // Use noon to avoid daylight savings / timezone shift boundaries
  const current = new Date(sY, sM - 1, sD, 12, 0, 0);
  const end = new Date(eY, eM - 1, eD, 12, 0, 0);

  if (current > end) return [];

  const results: string[] = [];
  let steps = 0;

  while (current <= end && results.length < maxLimit && steps < 730) {
    const dayOfWeek = current.getDay();
    if (selectedDays.includes(dayOfWeek)) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      results.push(`${y}-${m}-${d}`);
    }
    current.setDate(current.getDate() + 1);
    steps++;
  }

  return results;
}

/**
 * Formats a clean human-readable schedule string
 * e.g. "Mondays, Wednesdays & Fridays • 18:00 - 19:30"
 */
export function formatScheduleSummary(
  selectedDays: number[],
  startTime: string,
  endTime?: string
): string {
  if (!selectedDays || selectedDays.length === 0) return 'No days selected';

  const orderMap = [1, 2, 3, 4, 5, 6, 0];
  const sorted = [...selectedDays].sort((a, b) => orderMap.indexOf(a) - orderMap.indexOf(b));

  const dayNames = sorted.map(d => {
    const found = DAY_OF_WEEK_OPTIONS.find(opt => opt.value === d);
    return found ? `${found.full}s` : '';
  }).filter(Boolean);

  let daysString = '';
  if (dayNames.length === 1) {
    daysString = dayNames[0];
  } else if (dayNames.length === 2) {
    daysString = `${dayNames[0]} & ${dayNames[1]}`;
  } else if (dayNames.length === 7) {
    daysString = 'Daily (Everyday)';
  } else if (dayNames.length === 5 && sorted.every(d => [1, 2, 3, 4, 5].includes(d))) {
    daysString = 'Weekdays (Mon - Fri)';
  } else {
    const last = dayNames[dayNames.length - 1];
    daysString = `${dayNames.slice(0, -1).join(', ')} & ${last}`;
  }

  const timeString = endTime ? `${startTime} - ${endTime}` : startTime;
  return `${daysString} • ${timeString}`;
}

/**
 * Calculates a future date string (+N months) from a base YYYY-MM-DD string
 */
export function addMonthsToDateString(baseDateStr: string, monthsToAdd: number): string {
  if (!baseDateStr) return '';
  const [y, m, d] = baseDateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  dt.setMonth(dt.getMonth() + monthsToAdd);
  const newY = dt.getFullYear();
  const newM = String(dt.getMonth() + 1).padStart(2, '0');
  const newD = String(dt.getDate()).padStart(2, '0');
  return `${newY}-${newM}-${newD}`;
}

/**
 * Formats a date string for display preview
 */
export function formatPreviewDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d, 12, 0, 0);
    return dt.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}
