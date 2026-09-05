import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Student, StaffMember, Batch, MeetingMOM, SessionRating, MeetingResourceLink, MeetingTask, OperationalLog } from '@/types';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { normalizeTask, normalizeActivity } from '@/lib/taskActivityUtils';
import { safeLocalStorageSet, safeLocalStorageGet, sanitizeStudentsForLocalStorage } from '@/lib/storage';

type Scope = 'Global Scope' | 'Assigned Scope' | 'Read-Only Scope' | null;

export interface PermissionItem {
  id: string;
  name: string;
  enabled: boolean;
  scope: Scope;
}

export interface EventItem {
  id: string;
  day: string;
  time: string;
  duration?: string;
  stream: string;
  title: string;
  batch?: string;
  students: string;
  studentId?: string;
  location: string;
  notes?: string;
  assignments?: string;
  host?: string;
  status?: 'Scheduled' | 'Completed' | 'Cancelled';
  moms?: MeetingMOM[];
  ratings?: SessionRating[];
  resources?: MeetingResourceLink[];
  tasks?: MeetingTask[];
  date?: string;
  isRecurring?: boolean;
  seriesId?: string;
  sessionNumber?: number;
  totalSessionsInSeries?: number;
  recurrenceRule?: string;
}

export interface PermissionCategory {
  id: string;
  title: string;
  items: PermissionItem[];
}

const permissionCategoriesTemplate: PermissionCategory[] = [
  {
    id: 'profile',
    title: '1. PROFILE TAB & STUDENT DATABASE CONTROLS',
    items: [
      { id: 'view_roster', name: 'View Student List & Roster', enabled: true, scope: 'Assigned Scope' },
      { id: 'add_student', name: 'Add New Student Profile (+ Onboarding Form)', enabled: false, scope: null },
      { id: 'edit_student', name: 'Edit Student Personal & Academic Details', enabled: true, scope: 'Assigned Scope' },
      { id: 'view_history', name: 'View Student Chronological Activity History', enabled: true, scope: 'Assigned Scope' },
    ]
  },
  {
    id: 'schedule',
    title: '2. SCHEDULE & CLASSES TAB ENGINE',
    items: [
      { id: 'create_class', name: 'Create & Edit Classes / Sessions', enabled: true, scope: 'Assigned Scope' },
      { id: 'cancel_class', name: 'Cancel / Reschedule Classes', enabled: true, scope: 'Assigned Scope' },
      { id: 'sat_prep', name: 'SAT Prep Sub-Batch Mapping (Maths / Verbal)', enabled: true, scope: null },
      { id: 'log_notes', name: 'Log Session Notes & Attendance Roster', enabled: true, scope: null },
      { id: 'upload_recs', name: 'Upload Class Recordings & Pre-Read Resources', enabled: true, scope: null },
    ]
  },
  {
    id: 'batch',
    title: '3. BATCH ALLOCATOR TAB (Cohort Engine)',
    items: [
      { id: 'create_batch', name: 'Create & Edit Master Batches / Sub-Batches', enabled: false, scope: null },
      { id: 'assign_mentor', name: 'Assign / Swap Mentors & Instructors', enabled: false, scope: null },
      { id: 'config_link', name: 'Configure Default Meeting Link for Cohorts', enabled: false, scope: null },
      { id: 'alloc_students', name: 'Allocate & Transfer Students Between Batches', enabled: false, scope: null },
      { id: 'view_past', name: 'View Past & Completed Cohort Archives', enabled: true, scope: null },
    ]
  },
  {
    id: 'shortlist',
    title: '4. UNIVERSITY SHORTLISTING & READINESS ENGINE',
    items: [
      { id: 'add_uni', name: 'Add / Remove Target Universities', enabled: true, scope: 'Assigned Scope' },
      { id: 'set_deadlines', name: 'Set Application Deadlines & Target Categories', enabled: true, scope: null },
      { id: 'set_docs', name: 'Set & Modify University Required Documents List', enabled: true, scope: null },
      { id: 'override_readiness', name: 'Override Application Readiness Progress (%)', enabled: true, scope: null },
    ]
  },
  {
    id: 'vault',
    title: '5. DOCUMENT VAULT MODULE',
    items: [
      { id: 'view_vault', name: 'View Student Vault Folders & Submissions', enabled: true, scope: 'Assigned Scope' },
      { id: 'upload_files', name: 'Upload Official Files on Behalf of Student', enabled: true, scope: null },
      { id: 'verify_docs', name: 'Verify & Approve Documents (Green Badge)', enabled: true, scope: null },
      { id: 'reject_docs', name: 'Reject Documents & Send Feedback Notice', enabled: true, scope: null },
      { id: 'hide_docs', name: 'Mark File as "Confidential / Hidden from Student"', enabled: true, scope: null },
    ]
  },
  {
    id: 'essays',
    title: '6. AI ESSAY WORKSPACE & REVIEW ENGINE',
    items: [
      { id: 'assign_prompt', name: 'Assign Custom Supplemental Essay Prompts', enabled: true, scope: 'Assigned Scope' },
      { id: 'access_ai', name: 'Access AI Quality, Grammar & Metrics Panel', enabled: true, scope: null },
      { id: 'provide_notes', name: 'Provide Line-by-Line Annotations & Review Notes', enabled: true, scope: null },
      { id: 'lock_canvas', name: 'Lock / Unlock Student Writing Canvas', enabled: true, scope: null },
      { id: 'approve_essay', name: 'Approve Essay as Final', enabled: true, scope: null },
    ]
  },
  {
    id: 'tasks',
    title: '7. TASK & PROJECT MANAGER',
    items: [
      { id: 'assign_tasks', name: 'Assign Tasks (Internships, Research, MOOCs, etc)', enabled: true, scope: 'Assigned Scope' },
      { id: 'set_task_due', name: 'Set Due Dates & Upload Guidelines', enabled: true, scope: null },
      { id: 'review_task', name: 'Review Submitted Proof Docs & External Links', enabled: true, scope: null },
      { id: 'complete_task', name: 'Mark Tasks as "Completed & Verified"', enabled: true, scope: null },
    ]
  },
  {
    id: 'admin',
    title: '8. ADMIN SETTINGS & SYSTEM CONTROLS',
    items: [
      { id: 'staff_onboard', name: 'Access Staff Onboarding & Admin Panel', enabled: false, scope: null },
      { id: 'mod_perms', name: 'Modify Access & Permissions Settings', enabled: false, scope: null },
      { id: 'dev_api', name: 'Developer API Keys, Webhooks & System Logs', enabled: false, scope: null },
    ]
  }
];

const roles = [
  'SYSTEM_ADMIN',
  'COUNSELOR',
  'SAT_MATH_FACULTY',
  'SAT_VERBAL_FACULTY',
  'RESEARCH_GUIDE',
  'UNIVERSITY_MENTOR',
  'OPERATIONS_LEAD',
  'DEVELOPER',
  'CATEGORY_MANAGER'
];

const defaultPermissionsMatrix: Record<string, PermissionCategory[]> = roles.reduce((acc, role) => {
  const clonedTemplate = JSON.parse(JSON.stringify(permissionCategoriesTemplate)) as PermissionCategory[];
  
  if (role === 'SYSTEM_ADMIN' || role === 'DEVELOPER' || role === 'OPERATIONS_LEAD' || role === 'CATEGORY_MANAGER') {
    clonedTemplate.forEach(cat => {
      cat.items.forEach(item => {
        item.enabled = true;
        if (item.scope) item.scope = 'Global Scope';
      });
    });
  }

  acc[role] = clonedTemplate;
  return acc;
}, {} as Record<string, PermissionCategory[]>);

const initialStudents: Student[] = [];

const initialStaff: StaffMember[] = [
  { id: '1', name: 'Admin', email: 'uppseekers@gmail.com', role: 'SYSTEM_ADMIN', students: 'All', status: 'Active', password: 'Uppseekers@1' }
];

const initialBatches: Batch[] = [
  {
    id: 'BATCH-2026-IVY',
    name: 'Fall 2026 Ivy League Sprint',
    type: 'Master Batch',
    subject: 'Counselling',
    mentors: ['Sarah Jenkins', 'Admin'],
    meetingLink: 'https://meet.google.com/ivy-sprint-2026',
    status: 'Active',
    capacity: 15,
    students: ['STU-101', 'STU-102', 'STU-103'],
    totalSessions: 10,
    completedSessions: 6,
    scheduleDayTime: 'Tuesdays & Thursdays • 6:00 PM - 7:30 PM IST',
    description: 'Comprehensive college strategy cohort focusing on Top 20 US admissions, Common App prompts, and recommendation positioning.',
    sessions: [
      {
        id: 'SES-01',
        sessionNumber: 1,
        title: 'Orientation & Core Narrative Strategy',
        topic: 'Deconstructing holistic admissions & spike formation',
        date: '2026-07-15',
        time: '18:00 - 19:30',
        status: 'Completed',
        meetingLink: 'https://meet.google.com/ivy-sprint-2026',
        recordingUrl: 'https://drive.google.com/file/d/rec-session-1',
        notes: 'Covered individual student profile diagnostic worksheets.',
        joinedStudentIds: ['STU-101', 'STU-102', 'STU-103'],
        absentStudentIds: []
      },
      {
        id: 'SES-02',
        sessionNumber: 2,
        title: 'Common App Personal Statement Deep Dive',
        topic: 'Selecting impactful prompts & structuring the central narrative',
        date: '2026-07-22',
        time: '18:00 - 19:30',
        status: 'Completed',
        meetingLink: 'https://meet.google.com/ivy-sprint-2026',
        recordingUrl: 'https://drive.google.com/file/d/rec-session-2',
        notes: 'Live brainstorming of essay hooks for all cohort members.',
        joinedStudentIds: ['STU-101', 'STU-102', 'STU-103'],
        absentStudentIds: []
      },
      {
        id: 'SES-03',
        sessionNumber: 3,
        title: 'Extracurricular Framing & Spike Project Strategy',
        topic: 'Maximizing Common App 150-char activity descriptions',
        date: '2026-07-29',
        time: '18:00 - 19:30',
        status: 'Completed',
        meetingLink: 'https://meet.google.com/ivy-sprint-2026',
        recordingUrl: 'https://drive.google.com/file/d/rec-session-3',
        notes: 'Reviewed tier-1 initiative documentation.',
        joinedStudentIds: ['STU-101', 'STU-103'],
        absentStudentIds: ['STU-102']
      },
      {
        id: 'SES-04',
        sessionNumber: 4,
        title: 'Recommendation Strategy & Brag Sheet Workshop',
        topic: 'Guiding counselor and teacher recommendation focus areas',
        date: '2026-08-05',
        time: '18:00 - 19:30',
        status: 'Completed',
        meetingLink: 'https://meet.google.com/ivy-sprint-2026',
        notes: 'Templates provided for academic references.',
        joinedStudentIds: ['STU-101', 'STU-102', 'STU-103'],
        absentStudentIds: []
      },
      {
        id: 'SES-05',
        sessionNumber: 5,
        title: 'University Shortlisting: Reach, Target & Safety Balancing',
        topic: 'Formulating strategic Early Decision (ED) / Early Action (EA) list',
        date: '2026-08-12',
        time: '18:00 - 19:30',
        status: 'Completed',
        meetingLink: 'https://meet.google.com/ivy-sprint-2026',
        notes: 'Finalized balanced 10-university portfolios.',
        joinedStudentIds: ['STU-101', 'STU-102'],
        absentStudentIds: ['STU-103']
      },
      {
        id: 'SES-06',
        sessionNumber: 6,
        title: 'Supplemental Essay Workshop: "Why Us" Essays',
        topic: 'Specific institutional research & avoiding generic praise',
        date: '2026-08-19',
        time: '18:00 - 19:30',
        status: 'Completed',
        meetingLink: 'https://meet.google.com/ivy-sprint-2026',
        notes: 'Live peer review of Columbia and Stanford drafts.',
        joinedStudentIds: ['STU-101', 'STU-102', 'STU-103'],
        absentStudentIds: []
      },
      {
        id: 'SES-07',
        sessionNumber: 7,
        title: 'Supplemental Essay Workshop: Community & Diversity Prompts',
        topic: 'Authentic voice and cultural identity narratives',
        date: '2026-08-26',
        time: '18:00 - 19:30',
        status: 'Upcoming',
        meetingLink: 'https://meet.google.com/ivy-sprint-2026',
        joinedStudentIds: [],
        absentStudentIds: []
      },
      {
        id: 'SES-08',
        sessionNumber: 8,
        title: 'Financial Aid, CSS Profile & International Scholarships',
        topic: 'ISFAA, CSS Profile, institutional merit scholarships documentation',
        date: '2026-09-02',
        time: '18:00 - 19:30',
        status: 'Upcoming',
        meetingLink: 'https://meet.google.com/ivy-sprint-2026',
        joinedStudentIds: [],
        absentStudentIds: []
      },
      {
        id: 'SES-09',
        sessionNumber: 9,
        title: 'Alumni Interview Prep & Mock Interviews',
        topic: 'Handling behavioral questions and asking insightful interviewer questions',
        date: '2026-09-09',
        time: '18:00 - 19:30',
        status: 'Upcoming',
        meetingLink: 'https://meet.google.com/ivy-sprint-2026',
        joinedStudentIds: [],
        absentStudentIds: []
      },
      {
        id: 'SES-10',
        sessionNumber: 10,
        title: 'Final Portal Submission & Quality Audit Review',
        topic: 'Pre-submission checklist, PDF preview verification, error checking',
        date: '2026-09-16',
        time: '18:00 - 19:30',
        status: 'Upcoming',
        meetingLink: 'https://meet.google.com/ivy-sprint-2026',
        joinedStudentIds: [],
        absentStudentIds: []
      }
    ]
  },
  {
    id: 'BATCH-2026-SAT',
    name: 'Digital SAT 1500+ Masterclass',
    type: 'Sub-Batch',
    subject: 'SAT',
    mentors: ['Priya Nair', 'Admin'],
    meetingLink: 'https://meet.google.com/sat-1500-prep',
    status: 'Active',
    capacity: 20,
    students: ['STU-101', 'STU-102'],
    totalSessions: 12,
    completedSessions: 8,
    scheduleDayTime: 'Mondays & Wednesdays • 5:00 PM - 7:00 PM IST',
    description: 'Intensive digital SAT diagnostic and question breakdown targeting 750+ in Math and 750+ in Reading & Writing.',
    sessions: [
      {
        id: 'SAT-01',
        sessionNumber: 1,
        title: 'Digital SAT Interface & Adaptive Testing Mechanics',
        topic: 'Desmos built-in calculator mastery & time management',
        date: '2026-07-08',
        time: '17:00 - 19:00',
        status: 'Completed',
        meetingLink: 'https://meet.google.com/sat-1500-prep',
        joinedStudentIds: ['STU-101', 'STU-102'],
        absentStudentIds: []
      },
      {
        id: 'SAT-02',
        sessionNumber: 2,
        title: 'Advanced Algebra & Nonlinear Systems',
        topic: 'Quadratics, discriminant shortcuts, polynomial factor theorem',
        date: '2026-07-15',
        time: '17:00 - 19:00',
        status: 'Completed',
        meetingLink: 'https://meet.google.com/sat-1500-prep',
        joinedStudentIds: ['STU-101', 'STU-102'],
        absentStudentIds: []
      },
      {
        id: 'SAT-03',
        sessionNumber: 3,
        title: 'Information and Ideas: Textual Evidence Questions',
        topic: 'Data interpretation and science passage passage analysis',
        date: '2026-07-22',
        time: '17:00 - 19:00',
        status: 'Completed',
        meetingLink: 'https://meet.google.com/sat-1500-prep',
        joinedStudentIds: ['STU-101'],
        absentStudentIds: ['STU-102']
      },
      {
        id: 'SAT-04',
        sessionNumber: 4,
        title: 'Craft and Structure: Vocabulary in Context',
        topic: 'Connotation matching & high-frequency digital SAT lexicon',
        date: '2026-07-29',
        time: '17:00 - 19:00',
        status: 'Completed',
        meetingLink: 'https://meet.google.com/sat-1500-prep',
        joinedStudentIds: ['STU-101', 'STU-102'],
        absentStudentIds: []
      },
      {
        id: 'SAT-05',
        sessionNumber: 5,
        title: 'Advanced Geometry & Trigonometry Formulas',
        topic: 'Circle theorems, unit circle, radian angle conversions',
        date: '2026-08-05',
        time: '17:00 - 19:00',
        status: 'Completed',
        meetingLink: 'https://meet.google.com/sat-1500-prep',
        joinedStudentIds: ['STU-101', 'STU-102'],
        absentStudentIds: []
      },
      {
        id: 'SAT-06',
        sessionNumber: 6,
        title: 'Standard English Conventions: Sentence Boundaries & Modifiers',
        topic: 'Dangling modifiers, colon/semicolon rules, punctuation precision',
        date: '2026-08-12',
        time: '17:00 - 19:00',
        status: 'Completed',
        meetingLink: 'https://meet.google.com/sat-1500-prep',
        joinedStudentIds: ['STU-101', 'STU-102'],
        absentStudentIds: []
      },
      {
        id: 'SAT-07',
        sessionNumber: 7,
        title: 'Problem Solving & Data Analysis: Complex Statistics',
        topic: 'Standard deviation, confidence intervals, exponential growth rates',
        date: '2026-08-19',
        time: '17:00 - 19:00',
        status: 'Completed',
        meetingLink: 'https://meet.google.com/sat-1500-prep',
        joinedStudentIds: ['STU-101', 'STU-102'],
        absentStudentIds: []
      },
      {
        id: 'SAT-08',
        sessionNumber: 8,
        title: 'Expression of Ideas: Rhetorical Synthesis & Transitions',
        topic: 'Bullet-point synthesis prompts and logical transition matching',
        date: '2026-08-26',
        time: '17:00 - 19:00',
        status: 'Completed',
        meetingLink: 'https://meet.google.com/sat-1500-prep',
        joinedStudentIds: ['STU-101', 'STU-102'],
        absentStudentIds: []
      },
      {
        id: 'SAT-09',
        sessionNumber: 9,
        title: 'Full-Length Practice Test 5 Simulation & Diagnostic Review',
        topic: 'Module-by-module error analysis and pacing optimization',
        date: '2026-09-02',
        time: '17:00 - 19:00',
        status: 'Upcoming',
        meetingLink: 'https://meet.google.com/sat-1500-prep',
        joinedStudentIds: [],
        absentStudentIds: []
      }
    ]
  },
  {
    id: 'BATCH-2026-RESEARCH',
    name: 'STEM & Independent Research Portfolio Cohort',
    type: 'Sub-Batch',
    subject: 'Research',
    mentors: ['Dr. Vikram Roy', 'Admin'],
    meetingLink: 'https://meet.google.com/research-cohort-2026',
    status: 'Active',
    capacity: 10,
    students: ['STU-103'],
    totalSessions: 8,
    completedSessions: 3,
    scheduleDayTime: 'Saturdays • 11:00 AM - 1:00 PM IST',
    description: 'Mentorship on formulating independent academic research proposals, literature reviews, and journal submission readiness.',
    sessions: [
      {
        id: 'RES-01',
        sessionNumber: 1,
        title: 'Literature Review & Academic Database Mining',
        topic: 'Navigating IEEE Xplore, JSTOR, arXiv and scoping hypotheses',
        date: '2026-08-01',
        time: '11:00 - 13:00',
        status: 'Completed',
        meetingLink: 'https://meet.google.com/research-cohort-2026',
        joinedStudentIds: ['STU-103'],
        absentStudentIds: []
      },
      {
        id: 'RES-02',
        sessionNumber: 2,
        title: 'Methodology Frameworks & Experimental Design',
        topic: 'Structuring algorithmic pipelines and statistical validity',
        date: '2026-08-08',
        time: '11:00 - 13:00',
        status: 'Completed',
        meetingLink: 'https://meet.google.com/research-cohort-2026',
        joinedStudentIds: ['STU-103'],
        absentStudentIds: []
      },
      {
        id: 'RES-03',
        sessionNumber: 3,
        title: 'Data Collection & Preliminary Findings Analysis',
        topic: 'Handling outliers, regression models, and figure generation in Python',
        date: '2026-08-15',
        time: '11:00 - 13:00',
        status: 'Completed',
        meetingLink: 'https://meet.google.com/research-cohort-2026',
        joinedStudentIds: ['STU-103'],
        absentStudentIds: []
      },
      {
        id: 'RES-04',
        sessionNumber: 4,
        title: 'Paper Drafting: Introduction & Related Works',
        topic: 'Citing conventions in LaTeX and academic formatting',
        date: '2026-08-22',
        time: '11:00 - 13:00',
        status: 'Upcoming',
        meetingLink: 'https://meet.google.com/research-cohort-2026',
        joinedStudentIds: [],
        absentStudentIds: []
      }
    ]
  }
];


const initialEvents: EventItem[] = [];

interface DatabaseContextType {
  students: Student[];
  setStudents: (students: Student[]) => void;
  updateStudent: (student: Student) => void;
  getStudent: (id: string) => Student | undefined;
  staff: StaffMember[];
  setStaff: (staff: StaffMember[]) => void;
  currentUser: StaffMember;
  setCurrentUser: (user: StaffMember | ((prev: StaffMember) => StaffMember)) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
  permissionsMatrix: Record<string, PermissionCategory[]>;
  setPermissionsMatrix: (matrix: Record<string, PermissionCategory[]>) => void;
  roles: string[];
  batches: Batch[];
  events: EventItem[];
  setEvents: (events: EventItem[]) => void;
  setBatches: (batches: Batch[]) => void;
  initializeData: (token: string) => Promise<any>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const DatabaseProvider = ({ children }: { children: ReactNode }) => {
  const [students, setStudentsState] = useState<Student[]>(() => {
    const saved = localStorage.getItem('uppseekers_students_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return initialStudents;
  });

  const [staff, setStaffState] = useState<StaffMember[]>(() => {
    const saved = localStorage.getItem('uppseekers_staff_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return initialStaff;
  });
  
  const [permissionsMatrixState, setPermissionsMatrixState] = useState<Record<string, PermissionCategory[]>>(() => {
    const saved = localStorage.getItem('uppseekers_permissions_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const merged = { ...defaultPermissionsMatrix };
        if (parsed && typeof parsed === 'object') {
          for (const role of Object.keys(parsed)) {
             if (merged[role] && Array.isArray(parsed[role])) merged[role] = parsed[role];
          }
        }
        // Ensure CATEGORY_MANAGER and Admin roles always retain Global Scope
        if (merged['CATEGORY_MANAGER'] && Array.isArray(merged['CATEGORY_MANAGER'])) {
          merged['CATEGORY_MANAGER'].forEach(cat => {
            if (cat && Array.isArray(cat.items)) {
              cat.items.forEach(item => {
                if (item) {
                  item.enabled = true;
                  if (item.scope) item.scope = 'Global Scope';
                }
              });
            }
          });
        }
        return merged;
      } catch(e) {}
    }
    return defaultPermissionsMatrix;
  });

  const [currentUser, setCurrentUserState] = useState<StaffMember>(() => {
    const savedUser = localStorage.getItem('uppseekers_current_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && (parsed.email || parsed.id)) return parsed;
      } catch (e) {}
    }
    return initialStaff.find(s => s.role === 'SYSTEM_ADMIN') || initialStaff[0];
  });

  const [isAuthenticated, setIsAuthenticatedState] = useState<boolean>(() => {
    const token = localStorage.getItem('auth_token');
    const savedEmail = localStorage.getItem('auth_user_email');
    const savedUser = localStorage.getItem('uppseekers_current_user');
    if (token || savedEmail || savedUser) return true;
    return true; // Default persistent session
  });

  const setCurrentUser = (userOrFn: React.SetStateAction<StaffMember>) => {
    setCurrentUserState(prev => {
      const nextUser = typeof userOrFn === 'function' ? userOrFn(prev) : userOrFn;
      if (nextUser) {
        localStorage.setItem('uppseekers_current_user', JSON.stringify(nextUser));
        if (nextUser.email) localStorage.setItem('auth_user_email', nextUser.email);
        if (!localStorage.getItem('auth_token')) {
          localStorage.setItem('auth_token', `custom_${nextUser.id || '1'}_${nextUser.email || 'user'}`);
        }
      }
      return nextUser;
    });
  };

  const setIsAuthenticated = (val: boolean) => {
    setIsAuthenticatedState(val);
    if (!val) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user_email');
      localStorage.removeItem('uppseekers_current_user');
    } else {
      if (!localStorage.getItem('auth_token')) {
        localStorage.setItem('auth_token', `custom_${currentUser?.id || '1'}_${currentUser?.email || 'admin'}`);
      }
    }
  };

  useEffect(() => {
    // 1. Listen for Students from Firestore
    const unsubStudents = onSnapshot(collection(db, 'students'), async (snapshot) => {
      if (!snapshot.empty) {
        const loaded: Student[] = [];
        snapshot.forEach(docSnap => {
          const s = docSnap.data() as Student;
          if (s.phone && typeof s.phone === 'string' && s.phone.includes('|')) {
            s.phone = s.phone.split('|')[0].trim();
          }
          if (s.tasks) {
            s.tasks = s.tasks.map(t => normalizeTask(t, { studentId: s.id, studentName: s.name }));
          }
          if (s.activities) {
            s.activities = s.activities.map(a => normalizeActivity(a, { studentId: s.id, studentName: s.name }));
          }
          loaded.push(s);
        });
        setStudentsState(loaded);
        safeLocalStorageSet('uppseekers_students_v2', sanitizeStudentsForLocalStorage(loaded));
      } else {
        const defaultStudents: Student[] = [
          {
            id: 'STU-101',
            name: 'Aarav Sharma',
            email: 'aarav.sharma@example.com',
            phone: '+91 9876543210',
            intake: 'Fall 2026',
            school: 'Delhi Public School',
            counselor: 'Sarah Jenkins',
            researchMentor: 'Dr. Vikram Roy',
            readiness: 75,
            countries: ['USA', 'UK'],
            password: 'Student@123',
            activities: [],
            shortlist: [],
            documents: [],
            essays: []
          },
          {
            id: 'STU-102',
            name: 'Ananya Iyer',
            email: 'ananya.iyer@example.com',
            phone: '+91 9812345678',
            intake: 'Fall 2026',
            school: 'The Doon School',
            counselor: 'Sarah Jenkins',
            satVerbalMentor: 'Elena Rostova',
            readiness: 50,
            countries: ['USA', 'Canada'],
            password: 'Student@123',
            activities: [],
            shortlist: [],
            documents: [],
            essays: []
          },
          {
            id: 'STU-103',
            name: 'Qasim Khan',
            email: 'qasim.khan@example.com',
            phone: '+91 9988776655',
            intake: 'Fall 2026',
            school: 'St. Xavier High School',
            counselor: 'Admin',
            researchMentor: 'Dr. Vikram Roy',
            readiness: 85,
            countries: ['USA', 'UK'],
            password: 'Student@123',
            activities: [],
            shortlist: [
              {
                id: 'UNI-Q1',
                name: 'Columbia University',
                category: 'Reach',
                deadline: '2026-11-01',
                status: 'In Progress',
                major: 'Computer Science & AI',
                round: 'Early Decision (ED)'
              }
            ],
            documents: [
              {
                id: 'DOC-Q1',
                name: 'Qasim_Grade_11_Transcript.pdf',
                category: 'Academic Records',
                type: 'High School Transcript',
                uploadedBy: 'Qasim Khan',
                status: 'pending',
                date: 'Aug 1, 2026',
                fileExt: 'pdf'
              },
              {
                id: 'DOC-Q2',
                name: 'Qasim_SAT_Official_Scorecard.pdf',
                category: 'Standardized Tests',
                type: 'SAT Official Score Report',
                uploadedBy: 'Qasim Khan',
                status: 'verified',
                date: 'Jul 28, 2026',
                fileExt: 'pdf'
              }
            ],
            essays: [
              {
                id: 'ESS-Q1',
                title: 'Common App Personal Statement',
                prompt: 'Discuss an accomplishment, event, or realization that sparked a period of personal growth and a new understanding of yourself or others.',
                wordCount: 580,
                targetCount: 650,
                university: 'Common App / Columbia University',
                status: 'Under Review',
                counselor: 'Admin',
                versions: [
                  {
                    versionNumber: 1,
                    date: 'Aug 1, 2026',
                    author: 'Qasim Khan',
                    content: 'Growing up surrounded by the bustling energy of my city, I realized early on that technology is not just lines of code—it is an amplifier of human capability. My journey into algorithmic problem solving began when I noticed local small vendors struggling to manage inventory during peak festive seasons...'
                  }
                ]
              },
              {
                id: 'ESS-Q2',
                title: 'Why Columbia Supplemental Essay',
                prompt: 'Why are you drawn to study at Columbia University and what unique perspectives will you contribute?',
                wordCount: 235,
                targetCount: 250,
                university: 'Columbia University',
                status: 'Needs Revision',
                counselor: 'Admin',
                versions: [
                  {
                    versionNumber: 1,
                    date: 'Jul 30, 2026',
                    author: 'Qasim Khan',
                    content: 'Columbia\'s Core Curriculum offers a profound foundation in humanistic inquiry alongside cutting-edge computer science research at the Data Science Institute. I am particularly eager to participate in undergraduate research focused on scalable artificial intelligence for social impact...'
                  }
                ]
              }
            ],
            tasks: [
              normalizeTask({
                id: 'TSK-Q1',
                name: 'Complete Common App Personal Essay Draft 2',
                category: 'Essays & Applications',
                stage: 'IN_PROGRESS',
                dueDate: '2026-08-10',
                assignedBy: 'Admin (SYSTEM_ADMIN)',
                description: 'Refine introduction and address counselor comments regarding local vendor story.'
              }, { studentId: 'STU-103', studentName: 'Qasim Khan' }),
              normalizeTask({
                id: 'TSK-Q2',
                name: 'Upload Grade 12 Mid-Term Marksheet',
                category: 'Document Upload',
                stage: 'TO_DO',
                dueDate: '2026-08-15',
                assignedBy: 'Admin (SYSTEM_ADMIN)',
                description: 'Obtain stamped PDF transcript from high school administration.'
              }, { studentId: 'STU-103', studentName: 'Qasim Khan' })
            ]
          }
        ];
        setStudentsState(defaultStudents);
        localStorage.setItem('uppseekers_students_v2', JSON.stringify(defaultStudents));
        for (const s of defaultStudents) {
          try {
            await setDoc(doc(db, 'students', s.id), JSON.parse(JSON.stringify(s)));
          } catch (e: any) {
            // Ignore if database is not created in Firebase console
            if (!e?.message?.includes('not found') && e?.code !== 'not-found') {
              console.warn('Student seed sync skipped:', e?.message || e);
            }
          }
        }
      }
    }, (err) => {
      if (!err?.message?.includes('not found') && (err as any)?.code !== 'not-found') {
        console.warn('Firestore students listener:', err?.message || err);
      }
    });

    // 2. Listen for Staff from Firestore
    const unsubStaff = onSnapshot(collection(db, 'staff'), async (snapshot) => {
      if (!snapshot.empty) {
        const loaded: StaffMember[] = [];
        snapshot.forEach(docSnap => loaded.push(docSnap.data() as StaffMember));
        setStaffState(loaded);
        localStorage.setItem('uppseekers_staff_v2', JSON.stringify(loaded));
      } else {
        const defaultStaff: StaffMember[] = [
          {
            id: '1',
            name: 'Admin',
            email: 'uppseekers@gmail.com',
            role: 'SYSTEM_ADMIN',
            students: 'All',
            status: 'Active',
            password: 'Uppseekers@1'
          },
          {
            id: '2',
            name: 'Sarah Jenkins',
            email: 'sarah@uppseekers.com',
            role: 'COUNSELOR',
            students: '2 Students',
            status: 'Active',
            password: 'Staff@123'
          },
          {
            id: '3',
            name: 'Dr. Vikram Roy',
            email: 'vikram.roy@uppseekers.com',
            role: 'RESEARCH_GUIDE',
            students: '2 Students',
            status: 'Active',
            password: 'Staff@123'
          },
          {
            id: '4',
            name: 'Marcus Vance',
            email: 'marcus@uppseekers.com',
            role: 'CATEGORY_MANAGER',
            students: 'All',
            status: 'Active',
            password: 'Staff@123'
          }
        ];
        setStaffState(defaultStaff);
        localStorage.setItem('uppseekers_staff_v2', JSON.stringify(defaultStaff));
        for (const st of defaultStaff) {
          try {
            await setDoc(doc(db, 'staff', st.id), JSON.parse(JSON.stringify(st)));
          } catch (e: any) {
            if (!e?.message?.includes('not found') && e?.code !== 'not-found') {
              console.warn('Staff seed sync skipped:', e?.message || e);
            }
          }
        }
      }
    }, (err) => {
      if (!err?.message?.includes('not found') && (err as any)?.code !== 'not-found') {
        console.warn('Firestore staff listener:', err?.message || err);
      }
    });

    // 3. Listen for Batches from Firestore
    const unsubBatches = onSnapshot(collection(db, 'batches'), async (snapshot) => {
      if (!snapshot.empty) {
        const loaded: Batch[] = [];
        snapshot.forEach(docSnap => loaded.push(docSnap.data() as Batch));
        setBatchesState(loaded);
        localStorage.setItem('uppseekers_batches_v2', JSON.stringify(loaded));
      } else {
        const defaultBatches: Batch[] = initialBatches;
        for (const b of defaultBatches) {
          try {
            await setDoc(doc(db, 'batches', b.id), JSON.parse(JSON.stringify(b)));
          } catch (e: any) {
            if (!e?.message?.includes('not found') && e?.code !== 'not-found') {
              console.warn('Batch seed sync skipped:', e?.message || e);
            }
          }
        }
      }
    }, (err) => {
      if (!err?.message?.includes('not found') && (err as any)?.code !== 'not-found') {
        console.warn('Firestore batches listener:', err?.message || err);
      }
    });

    // 4. Listen for Events from Firestore
    const unsubEvents = onSnapshot(collection(db, 'events'), async (snapshot) => {
      if (!snapshot.empty) {
        const loaded: EventItem[] = [];
        snapshot.forEach(docSnap => loaded.push(docSnap.data() as EventItem));
        setEventsState(loaded);
        localStorage.setItem('uppseekers_events_v2', JSON.stringify(loaded));
      } else {
        const defaultEvents: EventItem[] = [
          {
            id: 'EVT-01',
            title: 'SAT Math Practice Test & Review',
            day: 'Monday',
            time: '17:00',
            duration: '2 hrs',
            stream: 'SAT Prep',
            students: '15 Students',
            location: 'Zoom Room Alpha'
          }
        ];
        for (const ev of defaultEvents) {
          try {
            await setDoc(doc(db, 'events', ev.id), JSON.parse(JSON.stringify(ev)));
          } catch (e: any) {
            if (!e?.message?.includes('not found') && e?.code !== 'not-found') {
              console.warn('Event seed sync skipped:', e?.message || e);
            }
          }
        }
      }
    }, (err) => {
      if (!err?.message?.includes('not found') && (err as any)?.code !== 'not-found') {
        console.warn('Firestore events listener:', err?.message || err);
      }
    });

    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      const savedEmail = localStorage.getItem('auth_user_email');
      
      if (savedEmail || token) {
        setIsAuthenticated(true);
      }
      
      await initializeData(token || '');
    };
    checkAuth();

    return () => {
      unsubStudents();
      unsubStaff();
      unsubBatches();
      unsubEvents();
    };
  }, []);

  const setStudents = (newStudents: Student[]) => {
    const deleted = students.filter(prev => !newStudents.some(n => n.id === prev.id));
    deleted.forEach(d => {
      if (d.id) deleteDoc(doc(db, 'students', d.id)).catch(console.error);
    });
    setStudentsState(newStudents);
    safeLocalStorageSet('uppseekers_students_v2', sanitizeStudentsForLocalStorage(newStudents));
    newStudents.forEach(s => {
      if (s.id) {
        setDoc(doc(db, 'students', s.id), JSON.parse(JSON.stringify(s))).catch(console.error);
      }
    });
    const token = localStorage.getItem('auth_token');
    fetch('/api/students', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || ''}`
      },
      body: JSON.stringify(newStudents)
    }).catch(console.error);
  };


function calculateReadiness(student: Student): number {
  let totalPoints = 0;
  let possiblePoints = 0;

  // 1. Shortlist & Required Docs Progress (25 points)
  if (student.shortlist && student.shortlist.length > 0) {
    let totalReqDocs = 0;
    let attachedCount = 0;
    student.shortlist.forEach((uni: any) => {
      const reqs = uni.requiredDocs || [];
      totalReqDocs += reqs.length;
      if (uni.attachedDocs) {
        attachedCount += Object.keys(uni.attachedDocs).length;
      }
    });
    const uniProgress = totalReqDocs > 0 ? (attachedCount / totalReqDocs) : 0.5;
    totalPoints += uniProgress * 25;
    possiblePoints += 25;
  } else {
    possiblePoints += 25;
  }

  // 2. Essays (25 points)
  if (student.essays && student.essays.length > 0) {
    const approved = student.essays.filter(e => e.status?.toLowerCase() === 'approved').length;
    totalPoints += (approved / student.essays.length) * 25;
    possiblePoints += 25;
  } else {
    possiblePoints += 25;
  }

  // 3. Tasks (25 points)
  if (student.tasks && student.tasks.length > 0) {
    const completed = student.tasks.filter(t => t.stage === 'COMPLETED').length;
    totalPoints += (completed / student.tasks.length) * 25;
    possiblePoints += 25;
  } else {
    possiblePoints += 25;
  }

  // 4. Vault Documents (25 points)
  if (student.documents && student.documents.length > 0) {
    const verified = student.documents.filter(d => d.status?.toLowerCase() === 'verified').length;
    totalPoints += (verified / student.documents.length) * 25;
    possiblePoints += 25;
  } else {
    possiblePoints += 25;
  }

  const calculated = Math.round(totalPoints);
  if (calculated === 0 && (!student.essays?.length && !student.tasks?.length && !student.documents?.length && !student.shortlist?.length)) {
    return student.readiness || 0;
  }

  return calculated;
}

  const updateStudent = async (updatedStudent: Student) => {
    if (!updatedStudent.id) {
      updatedStudent.id = 'STU-1002';
    }
    if (updatedStudent.phone && typeof updatedStudent.phone === 'string' && updatedStudent.phone.includes('|')) {
      updatedStudent.phone = updatedStudent.phone.split('|')[0].trim();
    }
    if (updatedStudent.tasks) {
      updatedStudent.tasks = updatedStudent.tasks.map(t => normalizeTask(t, { studentId: updatedStudent.id, studentName: updatedStudent.name }));
    }
    if (updatedStudent.activities) {
      updatedStudent.activities = updatedStudent.activities.map(a => normalizeActivity(a, { studentId: updatedStudent.id, studentName: updatedStudent.name }));
    }
    updatedStudent.readiness = calculateReadiness(updatedStudent);

    setStudentsState(prev => {
      const exists = prev.some(s => s.id === updatedStudent.id || s.email === updatedStudent.email);
      const newStudents = exists 
        ? prev.map(s => (s.id === updatedStudent.id || s.email === updatedStudent.email) ? updatedStudent : s)
        : [...prev, updatedStudent];
      safeLocalStorageSet('uppseekers_students_v2', sanitizeStudentsForLocalStorage(newStudents));
      return newStudents;
    });

    setCurrentUser(prev => {
      if (prev && (prev.id === updatedStudent.id || prev.email === updatedStudent.email)) {
        return { ...prev, ...updatedStudent };
      }
      return prev;
    });

    if (updatedStudent.id) {
      setDoc(doc(db, 'students', updatedStudent.id), JSON.parse(JSON.stringify(updatedStudent))).catch(err => {
        console.warn('Firestore setDoc error for student:', err);
      });
    }

    const token = localStorage.getItem('auth_token') || 'custom_user';
    fetch('/api/student', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(updatedStudent)
    }).catch(console.error);
  };

  const getStudent = (id: string) => students.find(s => s.id === id);

  const setStaff = (newStaff: StaffMember[]) => {
    const deleted = staff.filter(prev => !newStaff.some(n => n.id === prev.id));
    deleted.forEach(d => {
      if (d.id) deleteDoc(doc(db, 'staff', d.id)).catch(console.error);
    });
    setStaffState(newStaff);
    safeLocalStorageSet('uppseekers_staff_v2', newStaff);
    newStaff.forEach(s => {
      if (s.id) {
        setDoc(doc(db, 'staff', s.id), JSON.parse(JSON.stringify(s))).catch(console.error);
      }
    });
  };
  
  const setPermissionsMatrix = (matrix: Record<string, PermissionCategory[]>) => {
    setPermissionsMatrixState(matrix);
    safeLocalStorageSet('uppseekers_permissions_v2', matrix);
  };

  const [events, setEventsState] = useState<EventItem[]>(() => {
    const saved = localStorage.getItem('uppseekers_events_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch(e) {}
    }
    return initialEvents;
  });

  const setEvents = async (newEvents: EventItem[]) => {
    const validNewEvents = Array.isArray(newEvents) ? newEvents : [];
    const currentEvents = Array.isArray(events) ? events : [];
    const deleted = currentEvents.filter(prev => !validNewEvents.some(n => n.id === prev.id));
    deleted.forEach(d => {
      if (d.id) deleteDoc(doc(db, 'events', d.id)).catch(console.error);
    });
    setEventsState(validNewEvents);
    safeLocalStorageSet('uppseekers_events_v2', validNewEvents);
    validNewEvents.forEach(e => {
      if (e.id) {
        setDoc(doc(db, 'events', e.id), JSON.parse(JSON.stringify(e))).catch(console.error);
      }
    });
    const token = localStorage.getItem('auth_token') || 'custom_user';
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(validNewEvents)
    }).catch(console.error);
  };

  const [batches, setBatchesState] = useState<Batch[]>(() => {
    const saved = localStorage.getItem('uppseekers_batches_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return initialBatches;
  });

  const setBatches = async (newBatches: Batch[]) => {
    const validNewBatches = Array.isArray(newBatches) ? newBatches : [];
    const currentBatches = Array.isArray(batches) ? batches : [];
    const deleted = currentBatches.filter(prev => !validNewBatches.some(n => n.id === prev.id));
    deleted.forEach(d => {
      if (d.id) deleteDoc(doc(db, 'batches', d.id)).catch(console.error);
    });
    setBatchesState(validNewBatches);
    safeLocalStorageSet('uppseekers_batches_v2', validNewBatches);
    validNewBatches.forEach(b => {
      if (b.id) {
        setDoc(doc(db, 'batches', b.id), JSON.parse(JSON.stringify(b))).catch(console.error);
      }
    });
    const token = localStorage.getItem('auth_token') || 'custom_user';
    fetch('/api/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(newBatches)
    }).catch(console.error);
  };


  const initializeData = async (token: string) => {
    try {
      const response = await fetch('/api/data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.students && data.students.length > 0) {
          setStudentsState(data.students);
          localStorage.setItem('uppseekers_students_v2', JSON.stringify(data.students));
        }
        if (data.staff && data.staff.length > 0) {
          setStaffState(data.staff);
          localStorage.setItem('uppseekers_staff_v2', JSON.stringify(data.staff));
        }
        if (data.batches && data.batches.length > 0) {
          setBatchesState(data.batches);
          localStorage.setItem('uppseekers_batches_v2', JSON.stringify(data.batches));
        }
        if (data.events && data.events.length > 0) {
          setEventsState(data.events);
          localStorage.setItem('uppseekers_events_v2', JSON.stringify(data.events));
        }
        return data;
      }
    } catch (e) {
      console.error('Failed to initialize data from server', e);
    }
    return null;
  };

  return (
    <DatabaseContext.Provider value={{ students, setStudents, updateStudent, getStudent, staff, setStaff, currentUser, setCurrentUser, isAuthenticated, setIsAuthenticated, permissionsMatrix: permissionsMatrixState, setPermissionsMatrix, roles, batches, setBatches, events, setEvents, initializeData }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (context === undefined) throw new Error('useDatabase must be used within a DatabaseProvider');
  return context;
};
