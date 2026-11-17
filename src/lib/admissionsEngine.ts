import { UniversityRecord } from '../data/universitiesData';

export type AdmissionCategory = 'open' | 'closing_soon' | 'rolling' | 'closed';

export interface AdmissionStatusResult {
  statusText: string;
  subText: string;
  category: AdmissionCategory;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  daysRemaining?: number;
  activeRoundLabel?: string;
  cycleRecommendation: string;
  isClosedFor2027: boolean;
}

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

/**
 * Extracts a Date object from messy string deadlines like "1 Nov 2026", "~5 Jan 2027", "15 Oct 2026"
 */
export function parseDeadlineDate(dateStr: string): Date | null {
  if (!dateStr || dateStr === '—' || dateStr.toLowerCase().includes('n/a')) return null;

  // Pattern: "1 Nov 2026", "15 Oct 2026", "~14 Jan 2027", "30 Nov 2026", "31 May"
  const dayMonthYearMatch = dateStr.match(/(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?/);
  if (dayMonthYearMatch) {
    const day = parseInt(dayMonthYearMatch[1], 10);
    const monthKey = dayMonthYearMatch[2].toLowerCase().slice(0, 4);
    const m = MONTH_MAP[monthKey] ?? MONTH_MAP[monthKey.slice(0, 3)];
    const year = dayMonthYearMatch[3] ? parseInt(dayMonthYearMatch[3], 10) : 2027;

    if (m !== undefined && !isNaN(day) && !isNaN(year)) {
      return new Date(year, m, day, 23, 59, 59);
    }
  }

  // Month + Year only (e.g. "~Nov 2026", "~Feb 2027")
  const monthYearMatch = dateStr.match(/([A-Za-z]+)\s+(\d{4})/);
  if (monthYearMatch) {
    const monthKey = monthYearMatch[1].toLowerCase().slice(0, 4);
    const m = MONTH_MAP[monthKey] ?? MONTH_MAP[monthKey.slice(0, 3)];
    const year = parseInt(monthYearMatch[2], 10);
    if (m !== undefined && !isNaN(year)) {
      // Treat as last day of that month
      return new Date(year, m + 1, 0, 23, 59, 59);
    }
  }

  return null;
}

/**
 * Calculates real-time admission status for a university based on current date
 */
export function calculateAdmissionStatus(
  uni: UniversityRecord,
  referenceDate: Date = new Date()
): AdmissionStatusResult {
  const earlyStr = (uni.earlyDeadline || '').toLowerCase();
  const regularStr = (uni.regularDeadline || '').toLowerCase();
  const routeStr = (uni.applicationRoute || '').toLowerCase();
  const name = uni.name.toLowerCase();

  const earlyDate = parseDeadlineDate(uni.earlyDeadline);
  const regDate = parseDeadlineDate(uni.regularDeadline);

  // 1. Oxbridge Single October Deadline (Oxford / Cambridge)
  const isOxbridge = name.includes('oxford') || name.includes('cambridge');
  if (isOxbridge && earlyDate) {
    if (referenceDate > earlyDate) {
      return {
        statusText: 'Closed for 2027 — Plan 2028',
        subText: 'UCAS single deadline was 15 Oct 2026. Next admissions cycle opens Sept 2027 for 2028 intake.',
        category: 'closed',
        badgeBg: 'bg-rose-50 dark:bg-rose-950/40',
        badgeText: 'text-rose-700 dark:text-rose-400',
        badgeBorder: 'border-rose-200 dark:border-rose-800',
        cycleRecommendation: 'Plan for 2028 Intake (11th Graders)',
        isClosedFor2027: true,
      };
    }
  }

  // 2. Rolling Admissions (Australia, New Zealand, Select Programs)
  const isRolling = 
    earlyStr.includes('rolling') || 
    regularStr.includes('rolling') || 
    routeStr.includes('rolling') ||
    uni.applicationWindow.toLowerCase().includes('year-round');

  if (isRolling) {
    return {
      statusText: 'Rolling Admissions Open',
      subText: 'Continuous evaluation for Feb & July 2027 intakes. Early application yields better visa/scholarship outcomes.',
      category: 'rolling',
      badgeBg: 'bg-sky-50 dark:bg-sky-950/40',
      badgeText: 'text-sky-700 dark:text-sky-400',
      badgeBorder: 'border-sky-200 dark:border-sky-800',
      cycleRecommendation: 'Feb & July 2027 Intakes',
      isClosedFor2027: false,
      activeRoundLabel: 'Rolling',
    };
  }

  // 3. US Early Action / Restrictive Early Action / Early Decision checks
  const isREA = earlyStr.includes('restrictive early action') || earlyStr.includes('single-choice');
  const isED = earlyStr.includes('early decision') || earlyStr.includes('ed i');
  const isED1and2 = earlyStr.includes('ed ii');
  const isEA = earlyStr.includes('early action');

  const earlyPassed = earlyDate ? referenceDate > earlyDate : false;
  const regPassed = regDate ? referenceDate > regDate : false;

  // Days calculations
  const calculateDaysLeft = (targetDate: Date): number => {
    const diffMs = targetDate.getTime() - referenceDate.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  };

  // Case A: Both deadlines have passed
  if (regDate && regPassed) {
    return {
      statusText: 'Closed for 2027 — Plan 2028',
      subText: `Regular deadline passed on ${regDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
      category: 'closed',
      badgeBg: 'bg-rose-50 dark:bg-rose-950/40',
      badgeText: 'text-rose-700 dark:text-rose-400',
      badgeBorder: 'border-rose-200 dark:border-rose-800',
      cycleRecommendation: 'Plan for 2028 Intake',
      isClosedFor2027: true,
    };
  }

  // Case B: Early deadline has passed, but Regular Decision is currently open!
  if (earlyPassed && regDate && !regPassed) {
    const daysLeft = calculateDaysLeft(regDate);
    const isClosingSoon = daysLeft <= 25;

    let roundName = 'EA';
    if (isREA) roundName = 'REA';
    else if (isED1and2) roundName = 'ED I';
    else if (isED) roundName = 'ED';

    let statusText = `${roundName} Closed · RD Open`;
    if (isED1and2 && earlyStr.includes('ed ii')) {
      statusText = 'ED I Closed · ED II & RD Open';
    }

    return {
      statusText,
      subText: `Regular Decision closes ${regDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} (${daysLeft} days remaining).`,
      category: isClosingSoon ? 'closing_soon' : 'open',
      badgeBg: isClosingSoon ? 'bg-amber-50 dark:bg-amber-950/40' : 'bg-emerald-50 dark:bg-emerald-950/40',
      badgeText: isClosingSoon ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400',
      badgeBorder: isClosingSoon ? 'border-amber-200 dark:border-amber-800' : 'border-emerald-200 dark:border-emerald-800',
      daysRemaining: daysLeft,
      activeRoundLabel: 'Regular Decision',
      cycleRecommendation: 'Active for Fall 2027 Intake',
      isClosedFor2027: false,
    };
  }

  // Case C: Early deadline is still open!
  if (earlyDate && !earlyPassed) {
    const daysLeft = calculateDaysLeft(earlyDate);
    const isClosingSoon = daysLeft <= 14;

    let roundName = 'Early Action';
    if (isREA) roundName = 'Restrictive Early Action';
    else if (isED) roundName = 'Early Decision';

    return {
      statusText: `${roundName} Open · RD Open`,
      subText: `${roundName} closes ${earlyDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} (${daysLeft} days left).`,
      category: isClosingSoon ? 'closing_soon' : 'open',
      badgeBg: isClosingSoon ? 'bg-amber-50 dark:bg-amber-950/40' : 'bg-emerald-50 dark:bg-emerald-950/40',
      badgeText: isClosingSoon ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400',
      badgeBorder: isClosingSoon ? 'border-amber-200 dark:border-amber-800' : 'border-emerald-200 dark:border-emerald-800',
      daysRemaining: daysLeft,
      activeRoundLabel: roundName,
      cycleRecommendation: 'Active for Fall 2027 Intake',
      isClosedFor2027: false,
    };
  }

  // Case D: Single Regular Deadline (e.g., UC Berkeley, UCLA, Univ of Washington, European & Asian Universities)
  if (regDate && !regPassed) {
    const daysLeft = calculateDaysLeft(regDate);
    const isClosingSoon = daysLeft <= 25;

    let label = 'Application Open';
    if (uni.name.includes('California') || regularStr.includes('30 nov')) {
      label = `UC Filing Window Open (${daysLeft}d left)`;
    } else if (uni.name.includes('Washington')) {
      label = `Priority Filing Open (${daysLeft}d left)`;
    } else {
      label = `Regular Round Open (${daysLeft}d left)`;
    }

    return {
      statusText: label,
      subText: `Final deadline: ${regDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
      category: isClosingSoon ? 'closing_soon' : 'open',
      badgeBg: isClosingSoon ? 'bg-amber-50 dark:bg-amber-950/40' : 'bg-emerald-50 dark:bg-emerald-950/40',
      badgeText: isClosingSoon ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400',
      badgeBorder: isClosingSoon ? 'border-amber-200 dark:border-amber-800' : 'border-emerald-200 dark:border-emerald-800',
      daysRemaining: daysLeft,
      activeRoundLabel: 'Regular Round',
      cycleRecommendation: 'Fall 2027 Intake',
      isClosedFor2027: false,
    };
  }

  // Default Fallback
  return {
    statusText: 'Applications Open for 2027',
    subText: `Application window: ${uni.applicationWindow || 'Check portal'}. Regular intake 2027.`,
    category: 'open',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
    badgeBorder: 'border-emerald-200 dark:border-emerald-800',
    cycleRecommendation: 'Intake 2027',
    isClosedFor2027: false,
  };
}
