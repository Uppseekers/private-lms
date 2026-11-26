import {
  AnalyticsModuleKey,
  AnalyticsWidgetConfig,
  AnalyticsCriterion,
  TargetGradientBand,
  Student,
  StaffMember,
  Batch,
  EventItem,
  LaunchpadEnrollment,
  LaunchpadWeekProgress,
  LaunchpadCertification,
} from '@/types';
import {
  isUserAdmin,
  canStaffAccessAllStudents,
  getScopedStudentsForStaff,
  canStaffAccessEvent,
  doesValueMatchStaffMember,
} from '@/lib/staffPermissions';

export interface AnalyticsMetricOption {
  id: string;
  label: string;
  description: string;
  format: 'number' | 'percent' | 'score';
  unit?: string;
}

export interface AnalyticsFieldOption {
  id: string;
  label: string;
  type: 'string' | 'number' | 'boolean';
  suggestions?: string[];
}

export interface AnalyticsModuleDefinition {
  key: AnalyticsModuleKey;
  label: string;
  shortLabel: string;
  description: string;
  metrics: AnalyticsMetricOption[];
  groupByFields: AnalyticsFieldOption[];
  criteriaFields: AnalyticsFieldOption[];
}

export const DEFAULT_GRADIENT_BANDS: TargetGradientBand[] = [
  { id: 'band_low', label: 'Behind Target', min: 0, max: 50, color: '#ef4444' },
  { id: 'band_mid', label: 'On Track', min: 50, max: 85, color: '#f59e0b' },
  { id: 'band_high', label: 'Exceeding Goal', min: 85, max: 100, color: '#10b981' },
];

export const ANALYTICS_COLOR_PALETTE = [
  '#4f46e5', // Indigo 600
  '#0ea5e9', // Sky 500
  '#10b981', // Emerald 500
  '#f59e0b', // Amber 500
  '#8b5cf6', // Violet 500
  '#ec4899', // Pink 500
  '#14b8a6', // Teal 500
  '#64748b', // Slate 500
];

export const ANALYTICS_MODULES: AnalyticsModuleDefinition[] = [
  {
    key: 'students',
    label: 'Students',
    shortLabel: 'Students',
    description: 'Student roster, readiness scores, counselors, target intake, SAT/GPA & curriculum.',
    metrics: [
      { id: 'count', label: 'Total Students', description: 'Count of matching student profiles', format: 'number' },
      { id: 'avg_readiness', label: 'Avg Readiness Score (%)', description: 'Average application readiness across students', format: 'percent', unit: '%' },
      { id: 'avg_sat', label: 'Avg SAT Score', description: 'Average reported SAT Total score (numeric)', format: 'score' },
      { id: 'high_readiness_rate', label: 'Students ≥ 75% Ready (%)', description: 'Percentage of students with readiness ≥ 75%', format: 'percent', unit: '%' },
      { id: 'assigned_counselor_rate', label: 'Counselor Assigned Rate (%)', description: 'Percentage of students mapped to a counselor', format: 'percent', unit: '%' },
    ],
    groupByFields: [
      { id: 'counselor', label: 'Primary Counselor', type: 'string' },
      { id: 'intake', label: 'Target Intake', type: 'string' },
      { id: 'grade', label: 'Grade / Class', type: 'string' },
      { id: 'primaryCountry', label: 'Primary Country', type: 'string' },
      { id: 'curriculum', label: 'Curriculum / Board', type: 'string' },
      { id: 'major1', label: 'Primary Major', type: 'string' },
      { id: 'readinessTier', label: 'Readiness Tier', type: 'string' },
      { id: 'status', label: 'Account Status', type: 'string' },
    ],
    criteriaFields: [
      { id: 'counselor', label: 'Primary Counselor', type: 'string' },
      { id: 'intake', label: 'Target Intake', type: 'string', suggestions: ['Fall 2026', 'Fall 2027', 'Spring 2027'] },
      { id: 'grade', label: 'Grade / Class', type: 'string', suggestions: ['9', '10', '11', '12'] },
      { id: 'primaryCountry', label: 'Primary Country', type: 'string', suggestions: ['USA', 'UK', 'Canada', 'Singapore'] },
      { id: 'curriculum', label: 'Curriculum', type: 'string', suggestions: ['IB Diploma', 'CBSE', 'ISC / ICSE', 'A-Levels / IGCSE'] },
      { id: 'major1', label: 'Primary Major', type: 'string' },
      { id: 'readiness', label: 'Readiness (%)', type: 'number' },
      { id: 'satTotalNum', label: 'SAT Total Score', type: 'number' },
      { id: 'status', label: 'Status', type: 'string', suggestions: ['Active', 'Inactive'] },
    ],
  },
  {
    key: 'tasks',
    label: 'Tasks & Assignments',
    shortLabel: 'Tasks',
    description: 'Student tasks, completion rates, overdue items, categories & workflow stages.',
    metrics: [
      { id: 'count', label: 'Total Tasks', description: 'Count of matching tasks', format: 'number' },
      { id: 'completed_count', label: 'Completed Tasks', description: 'Tasks marked Completed / Approved', format: 'number' },
      { id: 'completion_rate', label: 'Task Completion Rate (%)', description: 'Percentage of tasks completed', format: 'percent', unit: '%' },
      { id: 'overdue_count', label: 'Overdue Tasks', description: 'Open tasks past due date', format: 'number' },
      { id: 'pending_review_count', label: 'Pending Review Tasks', description: 'Submitted tasks awaiting staff review', format: 'number' },
    ],
    groupByFields: [
      { id: 'status', label: 'Task Status', type: 'string' },
      { id: 'category', label: 'Category', type: 'string' },
      { id: 'stage', label: 'Application Stage', type: 'string' },
      { id: 'priority', label: 'Priority', type: 'string' },
      { id: 'counselor', label: 'Student Counselor', type: 'string' },
      { id: 'studentName', label: 'Student Name', type: 'string' },
      { id: 'assignedBy', label: 'Assigned By', type: 'string' },
    ],
    criteriaFields: [
      { id: 'status', label: 'Status', type: 'string', suggestions: ['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'NEEDS_REVISION'] },
      { id: 'category', label: 'Category', type: 'string' },
      { id: 'priority', label: 'Priority', type: 'string', suggestions: ['High', 'Medium', 'Low'] },
      { id: 'counselor', label: 'Student Counselor', type: 'string' },
      { id: 'isOverdue', label: 'Is Overdue', type: 'boolean', suggestions: ['true', 'false'] },
      { id: 'assignedBy', label: 'Assigned By', type: 'string' },
    ],
  },
  {
    key: 'sessions',
    label: 'Sessions & Scheduler',
    shortLabel: 'Sessions',
    description: 'Scheduled classes, 1-on-1 counselling calls, MoM logging coverage & ratings.',
    metrics: [
      { id: 'count', label: 'Total Sessions', description: 'Count of matching sessions', format: 'number' },
      { id: 'completed_count', label: 'Completed Sessions', description: 'Past or Completed sessions', format: 'number' },
      { id: 'mom_logged_count', label: 'Sessions with MoM Logged', description: 'Sessions that have at least one MoM recorded', format: 'number' },
      { id: 'mom_compliance_rate', label: 'MoM Logging Rate (%)', description: 'Percentage of sessions with MoM recorded', format: 'percent', unit: '%' },
      { id: 'avg_rating', label: 'Avg Session Rating (out of 5)', description: 'Average student feedback rating', format: 'score' },
    ],
    groupByFields: [
      { id: 'host', label: 'Host / Counselor', type: 'string' },
      { id: 'stream', label: 'Session Stream', type: 'string' },
      { id: 'status', label: 'Session Status', type: 'string' },
      { id: 'monthLabel', label: 'Session Month', type: 'string' },
      { id: 'videoProvider', label: 'Meeting Provider', type: 'string' },
      { id: 'hasMomLabel', label: 'MoM Recorded', type: 'string' },
    ],
    criteriaFields: [
      { id: 'host', label: 'Host / Counselor', type: 'string' },
      { id: 'stream', label: 'Session Stream', type: 'string', suggestions: ['Counselling (1-on-1)', 'SAT Prep', 'Research', 'Essay Review'] },
      { id: 'status', label: 'Status', type: 'string', suggestions: ['Scheduled', 'Completed', 'Canceled'] },
      { id: 'hasMom', label: 'Has MoM Logged', type: 'boolean', suggestions: ['true', 'false'] },
      { id: 'videoProvider', label: 'Meeting Provider', type: 'string', suggestions: ['zoho', 'manual'] },
    ],
  },
  {
    key: 'shortlist',
    label: 'University Shortlists & Applications',
    shortLabel: 'Universities',
    description: 'Shortlisted universities by Reach/Target/Safety tier, country, status & decisions.',
    metrics: [
      { id: 'count', label: 'Total Shortlisted Universities', description: 'Total university entries across students', format: 'number' },
      { id: 'submitted_count', label: 'Submitted Applications', description: 'Universities marked Submitted or Accepted', format: 'number' },
      { id: 'accepted_count', label: 'Admitted / Offers Received', description: 'Universities with Accepted/Offer status', format: 'number' },
      { id: 'submission_rate', label: 'Application Submission Rate (%)', description: 'Percentage of shortlisted universities submitted', format: 'percent', unit: '%' },
    ],
    groupByFields: [
      { id: 'tier', label: 'Target Tier (Reach/Target/Safety)', type: 'string' },
      { id: 'country', label: 'Country', type: 'string' },
      { id: 'status', label: 'Application Status', type: 'string' },
      { id: 'counselor', label: 'Student Counselor', type: 'string' },
      { id: 'intake', label: 'Student Intake', type: 'string' },
      { id: 'universityName', label: 'University Name', type: 'string' },
    ],
    criteriaFields: [
      { id: 'tier', label: 'Tier', type: 'string', suggestions: ['Reach', 'Target', 'Safety'] },
      { id: 'country', label: 'Country', type: 'string', suggestions: ['USA', 'UK', 'Canada', 'Singapore'] },
      { id: 'status', label: 'Status', type: 'string', suggestions: ['Shortlisted', 'In Progress', 'Submitted', 'Accepted'] },
      { id: 'counselor', label: 'Student Counselor', type: 'string' },
      { id: 'intake', label: 'Target Intake', type: 'string' },
    ],
  },
  {
    key: 'essays',
    label: 'Essays',
    shortLabel: 'Essays',
    description: 'Student essays, review status, counselor pipeline & approval progress.',
    metrics: [
      { id: 'count', label: 'Total Essays', description: 'Count of tracked essay drafts', format: 'number' },
      { id: 'approved_count', label: 'Approved / Final Essays', description: 'Essays marked Final or Approved', format: 'number' },
      { id: 'approval_rate', label: 'Essay Approval Rate (%)', description: 'Percentage of essays finalized', format: 'percent', unit: '%' },
      { id: 'in_review_count', label: 'Essays Awaiting Review', description: 'Drafts currently in review', format: 'number' },
    ],
    groupByFields: [
      { id: 'status', label: 'Essay Status', type: 'string' },
      { id: 'type', label: 'Essay Type', type: 'string' },
      { id: 'counselor', label: 'Student Counselor', type: 'string' },
      { id: 'studentName', label: 'Student Name', type: 'string' },
    ],
    criteriaFields: [
      { id: 'status', label: 'Status', type: 'string', suggestions: ['Draft', 'In Review', 'Approved', 'Final'] },
      { id: 'type', label: 'Type', type: 'string' },
      { id: 'counselor', label: 'Student Counselor', type: 'string' },
    ],
  },
  {
    key: 'documents',
    label: 'Document Vault',
    shortLabel: 'Documents',
    description: 'Vault uploads, verification status, pending items & category breakdown.',
    metrics: [
      { id: 'count', label: 'Total Documents', description: 'Total uploaded documents', format: 'number' },
      { id: 'verified_count', label: 'Verified Documents', description: 'Documents verified by team', format: 'number' },
      { id: 'verification_rate', label: 'Document Verification Rate (%)', description: 'Percentage of vault documents verified', format: 'percent', unit: '%' },
      { id: 'pending_count', label: 'Pending Verification', description: 'Documents waiting for review', format: 'number' },
    ],
    groupByFields: [
      { id: 'status', label: 'Verification Status', type: 'string' },
      { id: 'category', label: 'Document Category', type: 'string' },
      { id: 'counselor', label: 'Student Counselor', type: 'string' },
      { id: 'studentName', label: 'Student Name', type: 'string' },
    ],
    criteriaFields: [
      { id: 'status', label: 'Status', type: 'string', suggestions: ['verified', 'pending', 'rejected', 'draft'] },
      { id: 'category', label: 'Category', type: 'string' },
      { id: 'counselor', label: 'Student Counselor', type: 'string' },
    ],
  },
  {
    key: 'batches',
    label: 'Batches & Cohorts',
    shortLabel: 'Batches',
    description: 'Cohort capacity utilization, student headcount, session completion & subjects.',
    metrics: [
      { id: 'count', label: 'Total Batches', description: 'Count of active/archived batches', format: 'number' },
      { id: 'total_enrolled', label: 'Total Enrolled Seats', description: 'Sum of students enrolled across batches', format: 'number' },
      { id: 'avg_utilization', label: 'Avg Batch Utilization (%)', description: 'Average enrolled students / batch capacity', format: 'percent', unit: '%' },
      { id: 'session_progress_rate', label: 'Avg Session Completion (%)', description: 'Average completed / total sessions', format: 'percent', unit: '%' },
    ],
    groupByFields: [
      { id: 'subject', label: 'Subject', type: 'string' },
      { id: 'type', label: 'Batch Type', type: 'string' },
      { id: 'status', label: 'Batch Status', type: 'string' },
      { id: 'primaryMentor', label: 'Lead Mentor', type: 'string' },
    ],
    criteriaFields: [
      { id: 'subject', label: 'Subject', type: 'string' },
      { id: 'status', label: 'Status', type: 'string', suggestions: ['Active', 'Completed', 'Archived'] },
      { id: 'primaryMentor', label: 'Lead Mentor', type: 'string' },
      { id: 'utilizationPct', label: 'Utilization (%)', type: 'number' },
    ],
  },
  {
    key: 'launchpad',
    label: 'Launchpad',
    shortLabel: 'Launchpad',
    description: 'Launchpad enrollments, week progress completion & certification pass rates.',
    metrics: [
      { id: 'count', label: 'Enrolled Students', description: 'Students enrolled in Launchpad', format: 'number' },
      { id: 'certified_count', label: 'Certified Students', description: 'Students who passed Launchpad certification', format: 'number' },
      { id: 'certification_rate', label: 'Certification Rate (%)', description: 'Percentage of enrolled students certified', format: 'percent', unit: '%' },
      { id: 'avg_weeks_completed', label: 'Avg Weeks Completed', description: 'Average completed Launchpad weeks per student', format: 'score' },
    ],
    groupByFields: [
      { id: 'counselor', label: 'Student Counselor', type: 'string' },
      { id: 'grade', label: 'Grade / Class', type: 'string' },
      { id: 'certStatus', label: 'Certification Status', type: 'string' },
    ],
    criteriaFields: [
      { id: 'counselor', label: 'Student Counselor', type: 'string' },
      { id: 'grade', label: 'Grade / Class', type: 'string' },
      { id: 'certStatus', label: 'Certification Status', type: 'string', suggestions: ['Certified', 'In Progress'] },
      { id: 'weeksCompleted', label: 'Weeks Completed', type: 'number' },
    ],
  },
  {
    key: 'staff',
    label: 'Staff Workload',
    shortLabel: 'Staff',
    description: 'Active team headcount, student caseload per counselor & session load.',
    metrics: [
      { id: 'count', label: 'Total Staff Members', description: 'Count of team members in scope', format: 'number' },
      { id: 'total_caseload', label: 'Total Assigned Students', description: 'Sum of assigned students across staff', format: 'number' },
      { id: 'avg_caseload', label: 'Avg Students per Staff', description: 'Average student caseload per staff member', format: 'score' },
      { id: 'total_sessions_hosted', label: 'Total Sessions Hosted', description: 'Sum of sessions hosted by staff', format: 'number' },
    ],
    groupByFields: [
      { id: 'role', label: 'Staff Role', type: 'string' },
      { id: 'name', label: 'Staff Member', type: 'string' },
      { id: 'status', label: 'Account Status', type: 'string' },
    ],
    criteriaFields: [
      { id: 'role', label: 'Role', type: 'string', suggestions: ['COUNSELOR', 'CATEGORY_MANAGER', 'SAT_MATH_FACULTY', 'SAT_VERBAL_FACULTY', 'RESEARCH_GUIDE'] },
      { id: 'status', label: 'Status', type: 'string', suggestions: ['Active', 'Suspended'] },
      { id: 'assignedStudentCount', label: 'Assigned Student Count', type: 'number' },
    ],
  },
];

export function getModuleDefinition(moduleKey: AnalyticsModuleKey): AnalyticsModuleDefinition {
  return ANALYTICS_MODULES.find((m) => m.key === moduleKey) || ANALYTICS_MODULES[0];
}

export interface AnalyticsPortalDataset {
  currentUser: StaffMember | null;
  permissionsMatrix: Record<string, any>;
  students: Student[];
  staff: StaffMember[];
  batches: Batch[];
  events: EventItem[];
  launchpadEnrollments: LaunchpadEnrollment[];
  launchpadProgress: LaunchpadWeekProgress[];
  launchpadCertifications: LaunchpadCertification[];
}

export interface ComputedKpiResult {
  value: number;
  formattedValue: string;
  unit: string;
  format: 'number' | 'percent' | 'score';
  matchedRecords: number;
  deltaPercent: number | null;
  previousValue: number | null;
}

export interface ComputedChartPoint {
  name: string;
  value: number;
  [seriesKey: string]: string | number;
}

export interface ComputedChartResult {
  data: ComputedChartPoint[];
  seriesKeys: string[];
  matchedRecords: number;
  format: 'number' | 'percent' | 'score';
  unit: string;
  totalValue: number;
}

export interface ComputedTargetMeterResult {
  currentValue: number;
  formattedCurrent: string;
  targetValue: number;
  formattedTarget: string;
  percentOfTarget: number;
  clampedPercent: number;
  activeBand: TargetGradientBand;
  bands: TargetGradientBand[];
  matchedRecords: number;
  unit: string;
}

function parseNumeric(val: any): number | null {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.\-]/g, '');
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseFlexibleDate(val: any): number | null {
  if (!val) return null;
  const s = String(val).trim();
  if (!s) return null;
  if (s.toLowerCase() === 'today') return Date.now();
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : null;
}

function isWithinDateRange(
  dateMs: number | null,
  dateRange: string | undefined,
  shiftPreviousPeriod = false
): boolean {
  if (!dateRange || dateRange === 'all_time') return !shiftPreviousPeriod;
  if (dateMs === null) return false;
  const now = new Date();
  let startMs = 0;
  let endMs = now.getTime();

  if (dateRange === 'this_month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    if (!shiftPreviousPeriod) {
      startMs = startOfMonth;
    } else {
      startMs = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
      endMs = startOfMonth - 1;
    }
  } else if (dateRange === 'last_30_days') {
    const span = 30 * 24 * 60 * 60 * 1000;
    if (!shiftPreviousPeriod) {
      startMs = now.getTime() - span;
    } else {
      startMs = now.getTime() - span * 2;
      endMs = now.getTime() - span;
    }
  } else if (dateRange === 'last_90_days') {
    const span = 90 * 24 * 60 * 60 * 1000;
    if (!shiftPreviousPeriod) {
      startMs = now.getTime() - span;
    } else {
      startMs = now.getTime() - span * 2;
      endMs = now.getTime() - span;
    }
  } else if (dateRange === 'this_year') {
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
    if (!shiftPreviousPeriod) {
      startMs = startOfYear;
    } else {
      startMs = new Date(now.getFullYear() - 1, 0, 1).getTime();
      endMs = startOfYear - 1;
    }
  }

  return dateMs >= startMs && dateMs <= endMs;
}

function matchesCriterion(record: Record<string, any>, c: AnalyticsCriterion): boolean {
  const raw = record[c.field];
  const strVal = raw === undefined || raw === null ? '' : String(raw).trim();
  const targetStr = String(c.value ?? '').trim();

  switch (c.operator) {
    case 'is_empty':
      return strVal === '' || strVal.toLowerCase() === 'unassigned' || strVal.toLowerCase() === 'not set';
    case 'is_not_empty':
      return strVal !== '' && strVal.toLowerCase() !== 'unassigned' && strVal.toLowerCase() !== 'not set';
    case 'equals':
      return strVal.toLowerCase() === targetStr.toLowerCase();
    case 'not_equals':
      return strVal.toLowerCase() !== targetStr.toLowerCase();
    case 'contains':
      return strVal.toLowerCase().includes(targetStr.toLowerCase());
    case 'gte': {
      const n1 = parseNumeric(raw);
      const n2 = parseNumeric(targetStr);
      return n1 !== null && n2 !== null && n1 >= n2;
    }
    case 'lte': {
      const n1 = parseNumeric(raw);
      const n2 = parseNumeric(targetStr);
      return n1 !== null && n2 !== null && n1 <= n2;
    }
    default:
      return true;
  }
}

function applyCriteria(
  records: Record<string, any>[],
  criteria: AnalyticsCriterion[] | undefined,
  logic: 'AND' | 'OR' | undefined
): Record<string, any>[] {
  const active = (criteria || []).filter((c) => c && c.field);
  if (active.length === 0) return records;
  const mode = logic === 'OR' ? 'OR' : 'AND';
  return records.filter((rec) =>
    mode === 'AND'
      ? active.every((c) => matchesCriterion(rec, c))
      : active.some((c) => matchesCriterion(rec, c))
  );
}

export function buildScopedModuleRows(
  moduleKey: AnalyticsModuleKey,
  dataset: AnalyticsPortalDataset
): { rows: Record<string, any>[]; isGlobalScope: boolean } {
  const {
    currentUser,
    permissionsMatrix,
    students,
    staff,
    batches,
    events,
    launchpadEnrollments,
    launchpadProgress,
    launchpadCertifications,
  } = dataset;

  const isGlobalScope = Boolean(
    isUserAdmin(currentUser) || canStaffAccessAllStudents(currentUser, permissionsMatrix)
  );

  const scopedStudents = isGlobalScope
    ? students
    : getScopedStudentsForStaff(students, currentUser, permissionsMatrix, batches);
  const scopedStudentIds = new Set(scopedStudents.map((s) => s.id));

  const scopedBatches = isGlobalScope
    ? batches
    : batches.filter(
        (b) =>
          (Array.isArray(b.mentors) && b.mentors.some((m) => doesValueMatchStaffMember(m, currentUser))) ||
          (Array.isArray(b.students) && b.students.some((sid) => scopedStudentIds.has(sid)))
      );

  const scopedEvents = events.filter((evt) =>
    canStaffAccessEvent(evt, currentUser, students, batches, permissionsMatrix)
  );

  if (moduleKey === 'students') {
    const rows = scopedStudents.map((s) => {
      const readiness = Number.isFinite(Number(s.readiness)) ? Number(s.readiness) : 0;
      const tier =
        readiness >= 80 ? '80–100% Ready' : readiness >= 50 ? '50–79% On Track' : '0–49% Early Stage';
      const primaryCountry =
        s.primaryCountry || s.targetCountry || (Array.isArray(s.countries) && s.countries[0]) || 'Unspecified';
      return {
        id: s.id,
        name: s.name || 'Student',
        counselor: s.counselor?.trim() || 'Unassigned',
        intake: s.intake?.trim() || 'Unspecified',
        grade: s.grade ? `Grade ${s.grade}` : 'Unspecified',
        primaryCountry,
        curriculum: s.curriculum?.trim() || 'Unspecified',
        major1: s.major1?.trim() || 'Unspecified',
        readiness,
        readinessTier: tier,
        satTotalNum: parseNumeric(s.satTotal),
        status: s.status || 'Active',
        _dateMs: parseFlexibleDate(s.createdAt || s.updatedAt),
      };
    });
    return { rows, isGlobalScope };
  }

  if (moduleKey === 'tasks') {
    const nowMs = Date.now();
    const rows: Record<string, any>[] = [];
    scopedStudents.forEach((s) => {
      (s.tasks || []).forEach((t: any) => {
        const statusUpper = String(t.status || 'PENDING').toUpperCase();
        const isCompleted = statusUpper === 'COMPLETED' || statusUpper === 'APPROVED';
        const dueMs = parseFlexibleDate(t.dueDate);
        const isOverdue = !isCompleted && dueMs !== null && dueMs < nowMs;
        rows.push({
          id: t.id || `${s.id}_${t.title}`,
          title: t.title || 'Task',
          status: statusUpper,
          isCompleted,
          isOverdue,
          isPendingReview: statusUpper === 'SUBMITTED' || statusUpper === 'IN_REVIEW',
          category: t.category || 'General',
          stage: t.stage || 'General',
          priority: t.priority || 'Medium',
          counselor: s.counselor?.trim() || 'Unassigned',
          studentName: s.name || 'Student',
          assignedBy: t.assignedBy || 'Team',
          _dateMs: parseFlexibleDate(t.createdAt || t.dueDate || s.updatedAt),
        });
      });
    });
    return { rows, isGlobalScope };
  }

  if (moduleKey === 'sessions') {
    const rows = scopedEvents.map((e: any) => {
      const dateMs = parseFlexibleDate(e.day || e.date);
      const monthLabel = dateMs
        ? new Date(dateMs).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : 'Unscheduled';
      const momsCount = Array.isArray(e.moms) ? e.moms.length : 0;
      const ratingsList = Array.isArray(e.ratings) ? e.ratings : [];
      const avgRating =
        ratingsList.length > 0
          ? ratingsList.reduce((acc: number, r: any) => acc + Number(r.rating || 0), 0) / ratingsList.length
          : null;
      const isCompleted =
        String(e.status || '').toLowerCase() === 'completed' ||
        (dateMs !== null && dateMs < Date.now() && String(e.status || '').toLowerCase() !== 'canceled');
      return {
        id: e.id,
        title: e.title || 'Session',
        host: e.host?.trim() || e.organiser?.trim() || 'Unassigned',
        stream: e.stream?.trim() || 'General',
        status: e.status || (isCompleted ? 'Completed' : 'Scheduled'),
        isCompleted,
        hasMom: momsCount > 0,
        hasMomLabel: momsCount > 0 ? 'MoM Logged' : 'Missing MoM',
        videoProvider: e.videoProvider || (e.zohoMeetingKey ? 'zoho' : 'manual'),
        monthLabel,
        avgRating,
        _dateMs: dateMs,
      };
    });
    return { rows, isGlobalScope };
  }

  if (moduleKey === 'shortlist') {
    const rows: Record<string, any>[] = [];
    scopedStudents.forEach((s) => {
      (s.shortlist || []).forEach((u: any) => {
        const statusStr = String(u.status || 'Shortlisted');
        const statusLower = statusStr.toLowerCase();
        rows.push({
          id: u.id || `${s.id}_${u.name}`,
          universityName: u.name || 'University',
          tier: u.tier || u.category || 'Target',
          country: u.country || s.primaryCountry || 'Unspecified',
          status: statusStr,
          isSubmitted: statusLower.includes('submit') || statusLower.includes('accept') || statusLower.includes('admit'),
          isAccepted: statusLower.includes('accept') || statusLower.includes('admit') || statusLower.includes('offer'),
          counselor: s.counselor?.trim() || 'Unassigned',
          intake: s.intake?.trim() || 'Unspecified',
          studentName: s.name || 'Student',
          _dateMs: parseFlexibleDate(u.deadline || s.updatedAt),
        });
      });
    });
    return { rows, isGlobalScope };
  }

  if (moduleKey === 'essays') {
    const rows: Record<string, any>[] = [];
    scopedStudents.forEach((s) => {
      (s.essays || []).forEach((es: any) => {
        const statusStr = String(es.status || 'Draft');
        const statusLower = statusStr.toLowerCase();
        rows.push({
          id: es.id || `${s.id}_${es.title}`,
          title: es.title || 'Essay',
          status: statusStr,
          type: es.type || es.category || 'Personal Statement',
          isApproved: statusLower.includes('approv') || statusLower.includes('final'),
          isInReview: statusLower.includes('review') || statusLower.includes('submit'),
          counselor: s.counselor?.trim() || 'Unassigned',
          studentName: s.name || 'Student',
          _dateMs: parseFlexibleDate(es.updatedAt || es.lastModified || s.updatedAt),
        });
      });
    });
    return { rows, isGlobalScope };
  }

  if (moduleKey === 'documents') {
    const rows: Record<string, any>[] = [];
    scopedStudents.forEach((s) => {
      (s.documents || []).forEach((d: any) => {
        const statusStr = String(d.status || 'pending').toLowerCase();
        rows.push({
          id: d.id || `${s.id}_${d.name}`,
          name: d.name || 'Document',
          status: statusStr,
          category: d.category || 'General',
          isVerified: statusStr === 'verified',
          isPending: statusStr === 'pending',
          counselor: s.counselor?.trim() || 'Unassigned',
          studentName: s.name || 'Student',
          _dateMs: parseFlexibleDate(d.date || s.updatedAt),
        });
      });
    });
    return { rows, isGlobalScope };
  }

  if (moduleKey === 'batches') {
    const rows = scopedBatches.map((b) => {
      const enrolled = Array.isArray(b.students) ? b.students.length : 0;
      const cap = Math.max(1, Number(b.capacity || enrolled || 1));
      const utilizationPct = Math.min(100, Math.round((enrolled / cap) * 100));
      const totalSess = Number(b.totalSessions || 0);
      const compSess = Number(b.completedSessions || 0);
      const sessionPct = totalSess > 0 ? Math.min(100, Math.round((compSess / totalSess) * 100)) : 0;
      return {
        id: b.id,
        name: b.name || 'Batch',
        subject: b.subject || 'General',
        type: b.type || 'Cohort',
        status: b.status || 'Active',
        primaryMentor: (Array.isArray(b.mentors) && b.mentors[0]) || 'Unassigned',
        enrolledCount: enrolled,
        utilizationPct,
        sessionPct,
        _dateMs: parseFlexibleDate((b as any).updatedAt),
      };
    });
    return { rows, isGlobalScope };
  }

  if (moduleKey === 'launchpad') {
    const scopedEnr = launchpadEnrollments.filter((enr) => isGlobalScope || scopedStudentIds.has(enr.studentId));
    const studentById = new Map(students.map((s) => [s.id, s]));
    const rows = scopedEnr.map((enr) => {
      const stu = studentById.get(enr.studentId);
      const stuProgress = launchpadProgress.filter(
        (p) => p.studentId === enr.studentId && (p.lectureCompleted || p.exerciseCompleted)
      );
      const stuCert = launchpadCertifications.find((c) => c.studentId === enr.studentId && c.passed);
      return {
        id: enr.studentId,
        studentName: stu?.name || enr.studentId,
        counselor: stu?.counselor?.trim() || 'Unassigned',
        grade: stu?.grade ? `Grade ${stu.grade}` : 'Unspecified',
        weeksCompleted: stuProgress.length,
        isCertified: Boolean(stuCert),
        certStatus: stuCert ? 'Certified' : 'In Progress',
        _dateMs: parseFlexibleDate(enr.assignedAt),
      };
    });
    return { rows, isGlobalScope };
  }

  // staff workload module
  const scopedStaff = isGlobalScope
    ? staff
    : staff.filter((st) => currentUser && (st.id === currentUser.id || st.email?.toLowerCase() === currentUser.email?.toLowerCase()));

  const rows = scopedStaff.map((st) => {
    const caseload = scopedStudents.filter(
      (s) =>
        (s.counselorId && s.counselorId === st.id) ||
        (s.counselor && doesValueMatchStaffMember(s.counselor, st)) ||
        (s.researchMentor && doesValueMatchStaffMember(s.researchMentor, st)) ||
        (s.satMathMentor && doesValueMatchStaffMember(s.satMathMentor, st)) ||
        (s.satVerbalMentor && doesValueMatchStaffMember(s.satVerbalMentor, st))
    ).length;
    const hosted = scopedEvents.filter(
      (e) =>
        (e.host && doesValueMatchStaffMember(e.host, st)) ||
        (e.organiser && doesValueMatchStaffMember(e.organiser, st))
    ).length;
    return {
      id: st.id,
      name: st.name || 'Staff',
      role: st.role || 'STAFF',
      status: st.status || 'Active',
      assignedStudentCount: caseload,
      hostedSessionCount: hosted,
      _dateMs: parseFlexibleDate((st as any).updatedAt),
    };
  });
  return { rows, isGlobalScope };
}

function aggregateMetric(
  moduleKey: AnalyticsModuleKey,
  metricId: string,
  rows: Record<string, any>[]
): number {
  const n = rows.length;
  if (n === 0) return 0;

  if (metricId === 'count') return n;

  if (moduleKey === 'students') {
    if (metricId === 'avg_readiness') {
      return Math.round((rows.reduce((a, r) => a + Number(r.readiness || 0), 0) / n) * 10) / 10;
    }
    if (metricId === 'avg_sat') {
      const satRows = rows.filter((r) => typeof r.satTotalNum === 'number' && r.satTotalNum >= 400);
      if (satRows.length === 0) return 0;
      return Math.round(satRows.reduce((a, r) => a + r.satTotalNum, 0) / satRows.length);
    }
    if (metricId === 'high_readiness_rate') {
      const hi = rows.filter((r) => Number(r.readiness || 0) >= 75).length;
      return Math.round((hi / n) * 1000) / 10;
    }
    if (metricId === 'assigned_counselor_rate') {
      const assigned = rows.filter((r) => r.counselor && r.counselor !== 'Unassigned').length;
      return Math.round((assigned / n) * 1000) / 10;
    }
  }

  if (moduleKey === 'tasks') {
    if (metricId === 'completed_count') return rows.filter((r) => r.isCompleted).length;
    if (metricId === 'completion_rate') {
      return Math.round((rows.filter((r) => r.isCompleted).length / n) * 1000) / 10;
    }
    if (metricId === 'overdue_count') return rows.filter((r) => r.isOverdue).length;
    if (metricId === 'pending_review_count') return rows.filter((r) => r.isPendingReview).length;
  }

  if (moduleKey === 'sessions') {
    if (metricId === 'completed_count') return rows.filter((r) => r.isCompleted).length;
    if (metricId === 'mom_logged_count') return rows.filter((r) => r.hasMom).length;
    if (metricId === 'mom_compliance_rate') {
      return Math.round((rows.filter((r) => r.hasMom).length / n) * 1000) / 10;
    }
    if (metricId === 'avg_rating') {
      const rated = rows.filter((r) => typeof r.avgRating === 'number');
      if (rated.length === 0) return 0;
      return Math.round((rated.reduce((a, r) => a + r.avgRating, 0) / rated.length) * 10) / 10;
    }
  }

  if (moduleKey === 'shortlist') {
    if (metricId === 'submitted_count') return rows.filter((r) => r.isSubmitted).length;
    if (metricId === 'accepted_count') return rows.filter((r) => r.isAccepted).length;
    if (metricId === 'submission_rate') {
      return Math.round((rows.filter((r) => r.isSubmitted).length / n) * 1000) / 10;
    }
  }

  if (moduleKey === 'essays') {
    if (metricId === 'approved_count') return rows.filter((r) => r.isApproved).length;
    if (metricId === 'approval_rate') {
      return Math.round((rows.filter((r) => r.isApproved).length / n) * 1000) / 10;
    }
    if (metricId === 'in_review_count') return rows.filter((r) => r.isInReview).length;
  }

  if (moduleKey === 'documents') {
    if (metricId === 'verified_count') return rows.filter((r) => r.isVerified).length;
    if (metricId === 'verification_rate') {
      return Math.round((rows.filter((r) => r.isVerified).length / n) * 1000) / 10;
    }
    if (metricId === 'pending_count') return rows.filter((r) => r.isPending).length;
  }

  if (moduleKey === 'batches') {
    if (metricId === 'total_enrolled') return rows.reduce((a, r) => a + Number(r.enrolledCount || 0), 0);
    if (metricId === 'avg_utilization') {
      return Math.round((rows.reduce((a, r) => a + Number(r.utilizationPct || 0), 0) / n) * 10) / 10;
    }
    if (metricId === 'session_progress_rate') {
      return Math.round((rows.reduce((a, r) => a + Number(r.sessionPct || 0), 0) / n) * 10) / 10;
    }
  }

  if (moduleKey === 'launchpad') {
    if (metricId === 'certified_count') return rows.filter((r) => r.isCertified).length;
    if (metricId === 'certification_rate') {
      return Math.round((rows.filter((r) => r.isCertified).length / n) * 1000) / 10;
    }
    if (metricId === 'avg_weeks_completed') {
      return Math.round((rows.reduce((a, r) => a + Number(r.weeksCompleted || 0), 0) / n) * 10) / 10;
    }
  }

  if (moduleKey === 'staff') {
    if (metricId === 'total_caseload') return rows.reduce((a, r) => a + Number(r.assignedStudentCount || 0), 0);
    if (metricId === 'avg_caseload') {
      return Math.round((rows.reduce((a, r) => a + Number(r.assignedStudentCount || 0), 0) / n) * 10) / 10;
    }
    if (metricId === 'total_sessions_hosted') {
      return rows.reduce((a, r) => a + Number(r.hostedSessionCount || 0), 0);
    }
  }

  return n;
}

export function formatMetricValue(value: number, format: 'number' | 'percent' | 'score', customUnit?: string): string {
  if (!Number.isFinite(value)) return '0';
  if (format === 'percent') {
    return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
  }
  if (format === 'score') {
    const formatted = Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
    return customUnit ? `${formatted} ${customUnit}` : formatted;
  }
  const formatted = Math.round(value).toLocaleString();
  return customUnit ? `${formatted} ${customUnit}` : formatted;
}

export function computeKpiWidget(
  widget: AnalyticsWidgetConfig,
  dataset: AnalyticsPortalDataset,
  overrideDateRange?: string
): ComputedKpiResult {
  const modDef = getModuleDefinition(widget.module);
  const metricMeta = modDef.metrics.find((m) => m.id === widget.metric) || modDef.metrics[0];
  const { rows } = buildScopedModuleRows(widget.module, dataset);
  const activeRange = overrideDateRange && overrideDateRange !== 'widget_default' ? overrideDateRange : widget.dateRange || 'all_time';

  const criteriaFiltered = applyCriteria(rows, widget.criteria, widget.criteriaLogic);
  const currentRows = criteriaFiltered.filter((r) => isWithinDateRange(r._dateMs, activeRange, false));
  const value = aggregateMetric(widget.module, metricMeta.id, currentRows);

  let previousValue: number | null = null;
  let deltaPercent: number | null = null;
  if (activeRange !== 'all_time') {
    const prevRows = criteriaFiltered.filter((r) => isWithinDateRange(r._dateMs, activeRange, true));
    previousValue = aggregateMetric(widget.module, metricMeta.id, prevRows);
    if (previousValue > 0) {
      deltaPercent = Math.round(((value - previousValue) / previousValue) * 1000) / 10;
    } else if (value > 0) {
      deltaPercent = 100;
    } else {
      deltaPercent = 0;
    }
  }

  return {
    value,
    formattedValue: formatMetricValue(value, metricMeta.format, widget.targetUnit || metricMeta.unit),
    unit: widget.targetUnit || metricMeta.unit || '',
    format: metricMeta.format,
    matchedRecords: currentRows.length,
    deltaPercent,
    previousValue,
  };
}

export function computeChartWidget(
  widget: AnalyticsWidgetConfig,
  dataset: AnalyticsPortalDataset,
  overrideDateRange?: string
): ComputedChartResult {
  const modDef = getModuleDefinition(widget.module);
  const metricMeta = modDef.metrics.find((m) => m.id === widget.metric) || modDef.metrics[0];
  const groupField = widget.groupBy || modDef.groupByFields[0]?.id || 'status';
  const secondaryField = widget.secondaryGroupBy && widget.secondaryGroupBy !== groupField ? widget.secondaryGroupBy : '';
  const activeRange = overrideDateRange && overrideDateRange !== 'widget_default' ? overrideDateRange : widget.dateRange || 'all_time';

  const { rows } = buildScopedModuleRows(widget.module, dataset);
  const filtered = applyCriteria(rows, widget.criteria, widget.criteriaLogic).filter((r) =>
    isWithinDateRange(r._dateMs, activeRange, false)
  );

  const buckets = new Map<string, Record<string, any>[]>();
  filtered.forEach((r) => {
    const rawKey = r[groupField];
    const key = rawKey === undefined || rawKey === null || String(rawKey).trim() === '' ? 'Unspecified' : String(rawKey).trim();
    const list = buckets.get(key) || [];
    list.push(r);
    buckets.set(key, list);
  });

  const seriesSet = new Set<string>();
  let points: ComputedChartPoint[] = [];

  for (const [groupName, groupRows] of buckets.entries()) {
    const totalVal = aggregateMetric(widget.module, metricMeta.id, groupRows);
    const point: ComputedChartPoint = { name: groupName, value: totalVal };
    if (secondaryField) {
      const subBuckets = new Map<string, Record<string, any>[]>();
      groupRows.forEach((r) => {
        const rawSub = r[secondaryField];
        const subKey = rawSub === undefined || rawSub === null || String(rawSub).trim() === '' ? 'Other' : String(rawSub).trim();
        seriesSet.add(subKey);
        const subList = subBuckets.get(subKey) || [];
        subList.push(r);
        subBuckets.set(subKey, subList);
      });
      for (const [subKey, subRows] of subBuckets.entries()) {
        point[subKey] = aggregateMetric(widget.module, metricMeta.id, subRows);
      }
    }
    points.push(point);
  }

  // Ensure every point has 0 for every secondary series key for stacked charts
  const seriesKeys = secondaryField ? Array.from(seriesSet).slice(0, 8) : ['value'];
  if (secondaryField) {
    points = points.map((pt) => {
      const next = { ...pt };
      seriesKeys.forEach((sk) => {
        if (next[sk] === undefined) next[sk] = 0;
      });
      return next;
    });
  }

  const sortMode = widget.sortBy || 'value_desc';
  if (sortMode === 'value_desc') {
    points.sort((a, b) => b.value - a.value);
  } else if (sortMode === 'value_asc') {
    points.sort((a, b) => a.value - b.value);
  } else {
    points.sort((a, b) => a.name.localeCompare(b.name));
  }

  const maxItems = widget.limit && widget.limit > 0 ? widget.limit : 10;
  points = points.slice(0, maxItems);

  const totalValue = points.reduce((sum, p) => sum + Number(p.value || 0), 0);

  return {
    data: points,
    seriesKeys,
    matchedRecords: filtered.length,
    format: metricMeta.format,
    unit: metricMeta.unit || '',
    totalValue,
  };
}

export function computeTargetMeterWidget(
  widget: AnalyticsWidgetConfig,
  dataset: AnalyticsPortalDataset,
  overrideDateRange?: string
): ComputedTargetMeterResult {
  const kpi = computeKpiWidget(widget, dataset, overrideDateRange);
  const targetValue = typeof widget.targetValue === 'number' && widget.targetValue > 0 ? widget.targetValue : 100;
  const percentOfTarget = Math.round((kpi.value / targetValue) * 1000) / 10;
  const clampedPercent = Math.max(0, Math.min(100, percentOfTarget));

  const bands: TargetGradientBand[] =
    Array.isArray(widget.gradientBands) && widget.gradientBands.length > 0
      ? [...widget.gradientBands].sort((a, b) => a.min - b.min)
      : DEFAULT_GRADIENT_BANDS;

  const activeBand =
    bands.find((b) => clampedPercent >= b.min && clampedPercent <= b.max) ||
    (clampedPercent >= (bands[bands.length - 1]?.max ?? 100) ? bands[bands.length - 1] : bands[0]);

  return {
    currentValue: kpi.value,
    formattedCurrent: kpi.formattedValue,
    targetValue,
    formattedTarget: formatMetricValue(targetValue, kpi.format, widget.targetUnit || kpi.unit),
    percentOfTarget,
    clampedPercent,
    activeBand,
    bands,
    matchedRecords: kpi.matchedRecords,
    unit: widget.targetUnit || kpi.unit || '',
  };
}

export function buildStarterAnalyticsWidgets(): Omit<AnalyticsWidgetConfig, 'id' | 'createdBy' | 'updatedBy' | 'createdAt' | 'updatedAt'>[] {
  return [
    {
      title: 'Total Active Students',
      description: 'Students currently within your portal scope.',
      componentType: 'kpi',
      visualStyle: 'standard',
      module: 'students',
      metric: 'count',
      criteriaLogic: 'AND',
      criteria: [],
      dateRange: 'all_time',
      width: 'sm',
      order: 0,
      portalScope: 'verified_staff',
    },
    {
      title: 'Average Application Readiness',
      description: 'Mean readiness score across scoped students.',
      componentType: 'kpi',
      visualStyle: 'scorecard',
      module: 'students',
      metric: 'avg_readiness',
      criteriaLogic: 'AND',
      criteria: [],
      dateRange: 'all_time',
      width: 'sm',
      order: 1,
      portalScope: 'verified_staff',
    },
    {
      title: 'MoM Logging Compliance Target',
      description: 'Percentage of counselling & class sessions with recorded MoM.',
      componentType: 'target_meter',
      visualStyle: 'gauge',
      module: 'sessions',
      metric: 'mom_compliance_rate',
      targetValue: 90,
      targetUnit: '%',
      gradientBands: [
        { id: 'b1', label: 'Needs Attention', min: 0, max: 50, color: '#ef4444' },
        { id: 'b2', label: 'Improving', min: 50, max: 85, color: '#f59e0b' },
        { id: 'b3', label: 'On Target', min: 85, max: 100, color: '#10b981' },
      ],
      criteriaLogic: 'AND',
      criteria: [],
      dateRange: 'all_time',
      width: 'sm',
      order: 2,
      portalScope: 'verified_staff',
    },
    {
      title: 'Students by Primary Counselor',
      description: 'Active student distribution across assigned counselors.',
      componentType: 'chart',
      visualStyle: 'column',
      module: 'students',
      metric: 'count',
      groupBy: 'counselor',
      sortBy: 'value_desc',
      limit: 10,
      criteriaLogic: 'AND',
      criteria: [],
      dateRange: 'all_time',
      width: 'md',
      order: 3,
      portalScope: 'verified_staff',
    },
    {
      title: 'Shortlisted Universities by Tier & Status',
      description: 'Reach, Target, and Safety university pipeline grouped by application status.',
      componentType: 'chart',
      visualStyle: 'stacked_column',
      module: 'shortlist',
      metric: 'count',
      groupBy: 'tier',
      secondaryGroupBy: 'status',
      sortBy: 'value_desc',
      limit: 8,
      criteriaLogic: 'AND',
      criteria: [],
      dateRange: 'all_time',
      width: 'md',
      order: 4,
      portalScope: 'verified_staff',
    },
    {
      title: 'Task Completion Rate Target',
      description: 'Progress toward 85% student task completion goal.',
      componentType: 'target_meter',
      visualStyle: 'progress_bar',
      module: 'tasks',
      metric: 'completion_rate',
      targetValue: 85,
      targetUnit: '%',
      gradientBands: [
        { id: 't1', label: 'At Risk', min: 0, max: 45, color: '#ef4444' },
        { id: 't2', label: 'In Progress', min: 45, max: 80, color: '#f59e0b' },
        { id: 't3', label: 'Goal Met', min: 80, max: 100, color: '#10b981' },
      ],
      criteriaLogic: 'AND',
      criteria: [],
      dateRange: 'all_time',
      width: 'md',
      order: 5,
      portalScope: 'verified_staff',
    },
    {
      title: 'Students by Target Intake',
      description: 'Cohort breakdown across upcoming admission intakes.',
      componentType: 'chart',
      visualStyle: 'donut',
      module: 'students',
      metric: 'count',
      groupBy: 'intake',
      sortBy: 'value_desc',
      limit: 8,
      criteriaLogic: 'AND',
      criteria: [],
      dateRange: 'all_time',
      width: 'md',
      order: 6,
      portalScope: 'verified_staff',
    },
  ];
}
