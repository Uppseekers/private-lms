import { Student, StaffMember, Task, EventItem } from '@/types';

export interface SyncDataPayload {
  spreadsheetId?: string;
  students: Student[];
  staff: StaffMember[];
  tasks: Task[];
  events: EventItem[];
}

export interface SyncResult {
  success: boolean;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  timestamp: string;
  counts: {
    students: number;
    staff: number;
    tasks: number;
    events: number;
  };
  message?: string;
}

/**
 * Formats student objects into spreadsheet row arrays.
 */
export function formatStudentsForSheet(students: Student[]): string[][] {
  const header = [
    'Student ID',
    'Full Name',
    'Email',
    'Phone',
    'Intake Batch',
    'Counselor / Mentor',
    'School / College',
    'Target Countries',
    'Readiness Score (%)',
    'Total Tasks',
    'Completed Tasks',
    'Essays Count',
    'Shortlist Count'
  ];

  const rows = students.map(s => {
    const tasks = s.tasks || [];
    const completedTasks = tasks.filter(t => t.stage === 'COMPLETED').length;
    const countries = Array.isArray(s.countries) ? s.countries.join(', ') : (s.countries || '');

    return [
      s.id || '',
      s.name || '',
      s.email || '',
      s.phone || '',
      s.intake || 'Fall 2026',
      s.counselor || 'Unassigned',
      s.school || '',
      countries,
      `${s.readiness || 0}%`,
      String(tasks.length),
      String(completedTasks),
      String((s.essays || []).length),
      String((s.shortlist || []).length)
    ];
  });

  return [header, ...rows];
}

/**
 * Formats task objects into spreadsheet row arrays.
 */
export function formatTasksForSheet(students: Student[]): string[][] {
  const header = [
    'Task ID',
    'Task Name',
    'Category',
    'Assigned Student ID',
    'Student Name',
    'Stage / Status',
    'Due Date',
    'Assigned By',
    'Description'
  ];

  const rows: string[][] = [];

  students.forEach(s => {
    (s.tasks || []).forEach(t => {
      rows.push([
        t.id || '',
        t.name || '',
        t.category || 'Other',
        s.id || '',
        s.name || '',
        t.stage || 'TO_DO',
        t.dueDate || '',
        t.assignedBy || 'Admin',
        t.description || ''
      ]);
    });
  });

  return [header, ...rows];
}

/**
 * Formats meetings / events into spreadsheet row arrays.
 */
export function formatEventsForSheet(events: EventItem[]): string[][] {
  const header = [
    'Meeting ID',
    'Title',
    'Subject Stream',
    'Date',
    'Time',
    'Duration',
    'Organiser / Host',
    'Attendees / Batch',
    'Status',
    'Meeting Link'
  ];

  const rows = events.map(e => [
    e.id || '',
    e.title || '',
    e.type || e.stream || 'Counselling',
    e.date || e.day || '',
    e.time || '',
    e.duration || '1 hr',
    e.host || e.organiser || 'Counselor',
    typeof e.attendees === 'string' ? e.attendees : (e.students || ''),
    e.status || 'Scheduled',
    e.link || e.location || ''
  ]);

  return [header, ...rows];
}

/**
 * Converts formatted string 2D array into a CSV string.
 */
export function exportToCSV(filename: string, rows: string[][]): void {
  const csvContent = rows
    .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * LocalStorage keys for Google Sheets integration settings.
 */
export const SHEETS_STORAGE_KEY = 'uppseekers_google_sheet_id';
export const AUTO_SYNC_STORAGE_KEY = 'uppseekers_google_sheet_autosync';
export const LAST_SYNC_STORAGE_KEY = 'uppseekers_google_sheet_lastsync';
