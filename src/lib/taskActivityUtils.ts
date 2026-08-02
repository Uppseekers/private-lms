import { Task, TaskCategory, TaskStage, Activity, MeetingTask } from '@/types';

/**
 * Standardized Task Stage metadata for UI display, color badges, and filters.
 */
export const TASK_STAGES: { id: TaskStage; label: string; badgeClass: string; colorHex: string }[] = [
  { id: 'TO_DO', label: 'To Do', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200', colorHex: '#64748b' },
  { id: 'IN_PROGRESS', label: 'In Progress', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200', colorHex: '#f59e0b' },
  { id: 'SUBMITTED_FOR_REVIEW', label: 'Submitted for Review', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200', colorHex: '#3b82f6' },
  { id: 'NEEDS_REVISION', label: 'Needs Revision', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200', colorHex: '#f43f5e' },
  { id: 'COMPLETED', label: 'Completed', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200', colorHex: '#10b981' },
];

/**
 * Master list of Task Categories for consistent schema across Student & Team views.
 */
export const TASK_CATEGORIES: TaskCategory[] = [
  'Internships',
  'Research Projects',
  'Competitions & Olympiads',
  'Language Proficiency',
  'MOOCs & Online Certifications',
  'Passion Projects',
  'Impact & Community Service Projects',
  'Administrative / College Prep',
  'Post Meeting Action',
  'Essays & Applications',
  'Document Upload',
  'Other'
];

/**
 * Standard Activity Types for operational logs and timeline entries.
 */
export const ACTIVITY_TYPES = [
  'SESSION',
  'UPLOAD',
  'UPDATE',
  'SYSTEM',
  'VERIFIED',
  'EXTRACURRICULAR',
  'TASK_CREATED',
  'TASK_COMPLETED'
] as const;

export type ActivityType = typeof ACTIVITY_TYPES[number];

/**
 * Normalizes any legacy or variant stage string into a canonical TaskStage.
 */
export function normalizeTaskStage(stage?: string | null): TaskStage {
  if (!stage) return 'TO_DO';
  const clean = String(stage).trim().toUpperCase().replace(/[\s-]/g, '_');

  if (clean === 'COMPLETED' || clean === 'VERIFIED_COMPLETED' || clean === 'DONE') {
    return 'COMPLETED';
  }
  if (clean === 'IN_PROGRESS' || clean === 'PENDING' || clean === 'PROGRESS') {
    return 'IN_PROGRESS';
  }
  if (clean === 'SUBMITTED_FOR_REVIEW' || clean === 'SUBMITTED' || clean === 'REVIEW') {
    return 'SUBMITTED_FOR_REVIEW';
  }
  if (clean === 'NEEDS_REVISION' || clean === 'REVISION' || clean === 'REJECTED') {
    return 'NEEDS_REVISION';
  }
  return 'TO_DO';
}

/**
 * Normalizes any category string or legacy code into a canonical TaskCategory.
 */
export function normalizeTaskCategory(category?: string | null): TaskCategory {
  if (!category) return 'Other';
  const clean = String(category).trim().toUpperCase();

  if (clean === 'ESSAY' || clean === 'ESSAYS' || clean === 'ESSAYS & APPLICATIONS') {
    return 'Essays & Applications';
  }
  if (clean === 'DOCUMENT_UPLOAD' || clean === 'DOCUMENT' || clean === 'DOCUMENTS') {
    return 'Document Upload';
  }
  if (clean.includes('INTERN')) return 'Internships';
  if (clean.includes('RESEARCH')) return 'Research Projects';
  if (clean.includes('COMPETITION') || clean.includes('OLYMPIAD')) return 'Competitions & Olympiads';
  if (clean.includes('LANGUAGE') || clean.includes('SAT') || clean.includes('TOEFL') || clean.includes('IELTS')) return 'Language Proficiency';
  if (clean.includes('MOOC') || clean.includes('CERTIF')) return 'MOOCs & Online Certifications';
  if (clean.includes('PASSION')) return 'Passion Projects';
  if (clean.includes('COMMUNITY') || clean.includes('IMPACT') || clean.includes('SERVICE')) return 'Impact & Community Service Projects';
  if (clean.includes('ADMIN') || clean.includes('PREP') || clean.includes('COLLEGE')) return 'Administrative / College Prep';
  if (clean.includes('MEETING') || clean.includes('POST_MEETING')) return 'Post Meeting Action';

  // Check exact string match from standard categories
  const exact = TASK_CATEGORIES.find(c => c.toLowerCase() === String(category).toLowerCase());
  return exact || 'Other';
}

/**
 * Ensures a Task object adheres strictly to the unified schema.
 */
export function normalizeTask(
  raw: any,
  studentContext?: { studentId?: string; studentName?: string }
): Task {
  const now = new Date().toISOString().split('T')[0];
  const taskId = raw?.id || raw?.taskId || `TSK-${Math.floor(100000 + Math.random() * 900000)}`;

  return {
    id: String(taskId),
    name: String(raw?.name || raw?.title || raw?.taskName || 'Untitled Task').trim(),
    category: normalizeTaskCategory(raw?.category),
    dueDate: String(raw?.dueDate || raw?.date || raw?.deadline || now),
    stage: normalizeTaskStage(raw?.stage || raw?.status),
    description: String(raw?.description || raw?.notes || '').trim(),
    studentNotes: raw?.studentNotes ? String(raw.studentNotes) : undefined,
    externalUrl: raw?.externalUrl ? String(raw.externalUrl) : undefined,
    attachments: Array.isArray(raw?.attachments) ? raw.attachments : [],
    feedback: raw?.feedback ? String(raw.feedback) : undefined,
    assignedBy: String(raw?.assignedBy || raw?.source || raw?.author || 'System Admin').trim(),
    assignmentType: raw?.assignmentType ? String(raw.assignmentType) : undefined,
    relatedTo: raw?.relatedTo ? String(raw.relatedTo) : undefined,
    assignedBatch: raw?.assignedBatch ? String(raw.assignedBatch) : undefined,
    studentId: raw?.studentId || studentContext?.studentId,
    studentName: raw?.studentName || studentContext?.studentName,
    createdAt: raw?.createdAt || now,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Ensures an Activity object adheres strictly to the unified schema.
 */
export function normalizeActivity(
  raw: any,
  studentContext?: { studentId?: string; studentName?: string }
): Activity {
  const dateStr = raw?.date || new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true
  });
  const actId = raw?.id || `ACT-${Math.floor(100000 + Math.random() * 900000)}`;

  return {
    id: String(actId),
    date: dateStr,
    type: String(raw?.type || 'UPDATE').toUpperCase() as any,
    title: raw?.title ? String(raw.title) : undefined,
    description: String(raw?.description || raw?.details || 'System log entry').trim(),
    category: raw?.category ? String(raw.category) : undefined,
    organization: raw?.organization ? String(raw.organization) : undefined,
    role: raw?.role ? String(raw.role) : undefined,
    years: raw?.years ? String(raw.years) : undefined,
    hoursPerWeek: raw?.hoursPerWeek ? String(raw.hoursPerWeek) : undefined,
    weeksPerYear: raw?.weeksPerYear ? String(raw.weeksPerYear) : undefined,
    verified: Boolean(raw?.verified),
    author: raw?.author || raw?.user || studentContext?.studentName || 'System',
    user: raw?.user || raw?.author || studentContext?.studentName || 'System',
    studentId: raw?.studentId || studentContext?.studentId,
    studentName: raw?.studentName || studentContext?.studentName,
    link: raw?.link ? String(raw.link) : undefined,
  };
}

/**
 * Creates a clean Task object.
 */
export function createTask(params: Partial<Task> & { name: string }): Task {
  return normalizeTask(params);
}

/**
 * Creates a clean Activity object.
 */
export function createActivity(params: Partial<Activity> & { description: string }): Activity {
  return normalizeActivity(params);
}

/**
 * Maps a MeetingTask (from meeting minutes/MOM) to a unified Task.
 */
export function mapMeetingTaskToStudentTask(
  meetingTask: MeetingTask,
  studentId?: string,
  studentName?: string
): Task {
  return normalizeTask({
    id: meetingTask.id || `MTSK-${Math.floor(100000 + Math.random() * 900000)}`,
    name: meetingTask.title,
    description: meetingTask.description,
    category: 'Post Meeting Action',
    dueDate: meetingTask.dueDate || new Date().toISOString().split('T')[0],
    stage: meetingTask.status || 'TO_DO',
    assignedBy: meetingTask.assignedBy || 'Counselor',
    externalUrl: meetingTask.externalUrl,
    studentId: meetingTask.assignedToStudentId || studentId,
    studentName: meetingTask.assignedToStudentName || studentName,
  });
}

/**
 * Creates a standard activity record when a task is completed.
 */
export function createTaskCompletionActivity(task: Task, actorName?: string): Activity {
  return createActivity({
    type: 'TASK_COMPLETED',
    title: `Task Completed: ${task.name}`,
    description: `Task "${task.name}" (${task.category}) was marked as COMPLETED.`,
    category: task.category,
    verified: true,
    author: actorName || task.studentName || 'Student',
    studentId: task.studentId,
    studentName: task.studentName,
  });
}

/**
 * Creates a standard activity record when a task is created.
 */
export function createTaskCreatedActivity(task: Task, actorName?: string): Activity {
  return createActivity({
    type: 'TASK_CREATED',
    title: `Task Created: ${task.name}`,
    description: `New task assigned: "${task.name}" due on ${task.dueDate}.`,
    category: task.category,
    author: actorName || task.assignedBy || 'System Admin',
    studentId: task.studentId,
    studentName: task.studentName,
  });
}

/**
 * Upserts a task in an existing student task list to prevent duplicate or corrupted task entries.
 */
export function upsertTaskInStudentTasks(existingTasks: Task[] = [], newOrUpdatedTask: Task): Task[] {
  const normalized = normalizeTask(newOrUpdatedTask);
  const exists = existingTasks.some(t => t.id === normalized.id);
  if (exists) {
    return existingTasks.map(t => (t.id === normalized.id ? normalized : t));
  }
  return [normalized, ...existingTasks];
}

/**
 * Adds an activity log to a student's activity timeline.
 */
export function addActivityToStudent(existingActivities: Activity[] = [], newActivity: Activity): Activity[] {
  const normalized = normalizeActivity(newActivity);
  return [normalized, ...existingActivities];
}
