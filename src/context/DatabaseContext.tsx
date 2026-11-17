import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Student,
  StaffMember,
  Batch,
  MeetingMOM,
  SessionRating,
  MeetingResourceLink,
  MeetingTask,
  OperationalLog,
  LaunchpadAccessScope,
  LaunchpadCurriculumEditScope,
  LaunchpadTeamPermission,
  LaunchpadEnrollment,
  LaunchpadSubjectRelease,
  LaunchpadWeekProgress,
  LaunchpadCertification,
  AppNotification,
  LaunchpadAssignmentEvaluation,
  Task,
  Conversation,
  ConversationMessage
} from '@/types';
import {
  LaunchpadSubject,
  LaunchpadWeekModule,
  LaunchpadCertQuestionRecord,
  LAUNCHPAD_SUBJECTS,
  SUBJECT_1_WEEKS,
  buildDefaultLaunchpadSubjects,
  buildDefaultLaunchpadChapters,
  buildDefaultCertQuestions
} from '@/data/launchpadData';
import { collection, doc, setDoc, updateDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { db, auth, googleAuthProvider, OperationType, handleFirestoreError, testFirestoreConnection } from '@/lib/firebase';
import { normalizeTask, normalizeActivity } from '@/lib/taskActivityUtils';
import { safeLocalStorageSet, safeLocalStorageGet, sanitizeStudentsForLocalStorage } from '@/lib/storage';

type Scope = 'Global Scope' | 'Assigned Scope' | 'Read-Only Scope' | 'Enabled' | 'None' | null;

const LAUNCHPAD_DELETED_SUBJECTS_KEY = 'uppseekers_launchpad_deleted_subjects_v1';

function getDeletedLaunchpadSubjectIds(): string[] {
  const saved = safeLocalStorageGet<string[]>(LAUNCHPAD_DELETED_SUBJECTS_KEY, []);
  return Array.isArray(saved) ? saved : [];
}

function mergeLaunchpadSubjectsWithDefaults(
  incoming: LaunchpadSubject[],
  deletedIds: string[] = getDeletedLaunchpadSubjectIds()
): LaunchpadSubject[] {
  const deletedSet = new Set(deletedIds);
  const byId = new Map<string, LaunchpadSubject>();
  buildDefaultLaunchpadSubjects().forEach((s) => {
    if (!deletedSet.has(s.id)) {
      byId.set(s.id, s);
    }
  });
  incoming.forEach((s) => {
    if (s && s.id && !deletedSet.has(s.id)) {
      const base = byId.get(s.id);
      byId.set(s.id, base ? { ...base, ...s, hasCurriculum: Boolean(base.hasCurriculum || s.hasCurriculum) } : s);
    }
  });
  return Array.from(byId.values()).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

function mergeLaunchpadChaptersWithDefaults(
  incoming: LaunchpadWeekModule[],
  deletedIds: string[] = getDeletedLaunchpadSubjectIds()
): LaunchpadWeekModule[] {
  const deletedSet = new Set(deletedIds);
  const filteredIncoming = incoming.filter(
    (c) => c && !deletedSet.has(c.subjectId || 'comm-public-speaking')
  );
  const hasSubject1InIncoming = filteredIncoming.some(
    (c) => (c.subjectId || 'comm-public-speaking') === 'comm-public-speaking'
  );
  if (!hasSubject1InIncoming && !deletedSet.has('comm-public-speaking')) {
    return [...buildDefaultLaunchpadChapters(), ...filteredIncoming].sort(
      (a, b) => a.weekNumber - b.weekNumber
    );
  }
  return filteredIncoming;
}

function mergeLaunchpadCertQuestionsWithDefaults(
  incoming: LaunchpadCertQuestionRecord[],
  deletedIds: string[] = getDeletedLaunchpadSubjectIds()
): LaunchpadCertQuestionRecord[] {
  const deletedSet = new Set(deletedIds);
  const filteredIncoming = incoming.filter((q) => q && !deletedSet.has(q.subjectId));
  const hasSubject1Cert = filteredIncoming.some(
    (q) => q.subjectId === 'comm-public-speaking'
  );
  if (!hasSubject1Cert && !deletedSet.has('comm-public-speaking')) {
    return [...buildDefaultCertQuestions(), ...filteredIncoming];
  }
  return filteredIncoming;
}

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
  videoProvider?: 'zoho' | 'manual' | 'custom' | 'zoho_meeting';
  zohoMeetingKey?: string;
  hostStartLink?: string;
  participantEmails?: string[];
}

export interface PermissionCategory {
  id: string;
  title: string;
  items: PermissionItem[];
}

const permissionCategoriesTemplate: PermissionCategory[] = [
  {
    id: 'tab_visibility',
    title: '0. SIDEBAR TAB VISIBILITY CONTROLS',
    items: [
      { id: 'tab_dashboard', name: 'Dashboard Tab', enabled: true, scope: null },
      { id: 'tab_launchpad', name: 'Launchpad Tab', enabled: true, scope: null },
      { id: 'tab_batches', name: 'Batches & Cohorts Tab', enabled: true, scope: null },
      { id: 'tab_scheduler', name: 'Class Scheduler Tab', enabled: true, scope: null },
      { id: 'tab_vault', name: 'Document Center Tab', enabled: true, scope: null },
      { id: 'tab_evaluator', name: 'Assignment Evaluator Tab', enabled: true, scope: null },
      { id: 'tab_users', name: 'Student Database Tab', enabled: true, scope: null },
      { id: 'tab_reports', name: 'Reports Tab', enabled: true, scope: null },
      { id: 'tab_universities', name: 'Universities Tab', enabled: true, scope: null },
      { id: 'tab_settings', name: 'Admin Settings Tab', enabled: false, scope: null },
    ]
  },
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
    id: 'reports',
    title: '8. REPORTS & ANALYTICS CENTER',
    items: [
      { id: 'view_meeting_reports', name: 'View Meeting Notes & Session MOM Reports', enabled: true, scope: 'Assigned Scope' },
      { id: 'view_activity_audit', name: 'View Staff Activity & Operational Audit Logs', enabled: true, scope: 'Assigned Scope' },
      { id: 'export_reports_csv', name: 'Export Reports Data to CSV Spreadsheets', enabled: false, scope: null },
    ]
  },
  {
    id: 'admin',
    title: '9. ADMIN SETTINGS & SYSTEM CONTROLS (Strictly Admin Only)',
    items: [
      { id: 'staff_onboard', name: 'Access Staff Onboarding & Admin Panel', enabled: false, scope: null },
      { id: 'mod_perms', name: 'Modify Access & Permissions Settings', enabled: false, scope: null },
      { id: 'dev_api', name: 'Developer API Keys, Webhooks & System Logs', enabled: false, scope: null },
    ]
  },
  {
    id: 'launchpad',
    title: '10. LAUNCHPAD ACCESS & CURRICULUM CONTROLS',
    items: [
      { id: 'launchpad_student_tab_access', name: 'Tab for Students Access', enabled: true, scope: 'Assigned Scope' },
      { id: 'launchpad_review_exercise_access', name: 'Review Submitted Exercise Access', enabled: true, scope: 'Assigned Scope' },
      { id: 'launchpad_edit_curriculum_access', name: 'Create & Edit Subjects/Chapters Access', enabled: false, scope: 'None' },
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
  
  if (role === 'SYSTEM_ADMIN') {
    clonedTemplate.forEach(cat => {
      cat.items.forEach(item => {
        item.enabled = true;
        if (item.id === 'launchpad_edit_curriculum_access') {
          item.scope = 'Enabled';
        } else if (item.scope) {
          item.scope = 'Global Scope';
        }
      });
    });
  } else if (role === 'CATEGORY_MANAGER') {
    // Category Manager has global scope across all operational modules (reports included),
    // but STRICTLY NO admin tab or system control access!
    clonedTemplate.forEach(cat => {
      if (cat.id === 'admin') {
        cat.items.forEach(item => {
          item.enabled = false;
          if (item.scope) item.scope = null;
        });
      } else if (cat.id === 'tab_visibility') {
        cat.items.forEach(item => {
          item.enabled = item.id !== 'tab_settings';
        });
      } else {
        cat.items.forEach(item => {
          item.enabled = true;
          if (item.id === 'launchpad_edit_curriculum_access') {
            item.scope = 'Enabled';
          } else if (item.scope) {
            item.scope = 'Global Scope';
          }
        });
      }
    });
  } else if (role === 'OPERATIONS_LEAD') {
    clonedTemplate.forEach(cat => {
      if (cat.id === 'admin') {
        cat.items.forEach(item => {
          item.enabled = false;
          if (item.scope) item.scope = null;
        });
      } else if (cat.id === 'tab_visibility') {
        cat.items.forEach(item => {
          item.enabled = item.id !== 'tab_settings';
        });
      } else {
        cat.items.forEach(item => {
          item.enabled = true;
          if (item.id === 'launchpad_edit_curriculum_access') {
            item.scope = 'Enabled';
          } else if (item.scope) {
            item.scope = 'Global Scope';
          }
        });
      }
    });
  } else if (role === 'DEVELOPER') {
    clonedTemplate.forEach(cat => {
      if (cat.id === 'admin') {
        cat.items.forEach(item => {
          item.enabled = item.id === 'dev_api';
        });
      } else if (cat.id === 'tab_visibility') {
        cat.items.forEach(item => {
          item.enabled = item.id !== 'tab_settings';
        });
      } else {
        cat.items.forEach(item => {
          item.enabled = true;
          if (item.id === 'launchpad_edit_curriculum_access') {
            item.scope = 'Enabled';
          } else if (item.scope) {
            item.scope = 'Global Scope';
          }
        });
      }
    });
  } else if (role === 'COUNSELOR') {
    // Counselor has access to assigned students' activity, reports, and Launchpad student/review tabs
    clonedTemplate.forEach(cat => {
      if (cat.id === 'admin') {
        cat.items.forEach(item => {
          item.enabled = false;
          if (item.scope) item.scope = null;
        });
      } else if (cat.id === 'tab_visibility') {
        cat.items.forEach(item => {
          item.enabled = item.id !== 'tab_settings';
        });
      } else if (cat.id === 'reports') {
        cat.items.forEach(item => {
          item.enabled = true;
          if (item.scope) item.scope = 'Assigned Scope';
        });
      } else if (cat.id === 'launchpad') {
        cat.items.forEach(item => {
          if (item.id === 'launchpad_edit_curriculum_access') {
            item.enabled = false;
            item.scope = 'None';
          } else {
            item.enabled = true;
            item.scope = 'Assigned Scope';
          }
        });
      }
    });
  } else if (['RESEARCH_GUIDE', 'SAT_MATH_FACULTY', 'SAT_VERBAL_FACULTY', 'UNIVERSITY_MENTOR'].includes(role)) {
    // Research Mentor and SAT Educators do not have access to reports or Launchpad by default
    clonedTemplate.forEach(cat => {
      if (cat.id === 'admin' || cat.id === 'reports') {
        cat.items.forEach(item => {
          item.enabled = false;
          if (item.scope) item.scope = null;
        });
      } else if (cat.id === 'tab_visibility') {
        cat.items.forEach(item => {
          item.enabled = !['tab_settings', 'tab_reports', 'tab_launchpad'].includes(item.id);
        });
      } else if (cat.id === 'launchpad') {
        cat.items.forEach(item => {
          item.enabled = false;
          item.scope = 'None';
        });
      }
    });
  } else {
    // All faculty/counselors/mentors have admin strictly disabled
    clonedTemplate.forEach(cat => {
      if (cat.id === 'admin') {
        cat.items.forEach(item => {
          item.enabled = false;
          if (item.scope) item.scope = null;
        });
      } else if (cat.id === 'tab_visibility') {
        cat.items.forEach(item => {
          item.enabled = item.id !== 'tab_settings';
        });
      }
    });
  }

  acc[role] = clonedTemplate;
  return acc;
}, {} as Record<string, PermissionCategory[]>);

const initialStudents: Student[] = [
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
    activities: [
      {
        id: 'act_init_1',
        type: 'SYSTEM',
        date: 'Jul 15, 2026',
        description: 'Student account created & intake profile activated for Aarav Sharma',
        details: 'Candidate assigned to Sarah Jenkins. Target Degree: Undergraduate Computer Science.',
        author: 'Admissions Desk'
      },
      {
        id: 'act_init_2',
        type: 'VERIFIED',
        date: 'Jul 20, 2026',
        description: 'Initial academic diagnostic and profile review completed by Sarah Jenkins',
        details: 'Verified readiness score of 75%. Comprehensive strategy roadmap established for Fall 2026 admissions cycle.',
        author: 'Sarah Jenkins'
      }
    ],
    operationalLogs: [
      {
        id: 'log_init_1',
        activityType: 'COUNSELOR_UPDATE',
        description: 'Initial Ivy League Strategy Alignment Session completed with student and parents.',
        details: 'Discussed Early Decision choices (Stanford vs Columbia). Aarav demonstrated strong passion for AI alignment research. Assigned follow-up tasks to draft Common App personal narrative focusing on local inventory algorithmic tool.',
        performedBy: 'Sarah Jenkins',
        role: 'COUNSELOR',
        timestamp: 'Aug 2, 2026 at 5:30 PM'
      },
      {
        id: 'log_init_2',
        activityType: 'DOCUMENT_REVIEW',
        description: 'Grade 11 & 12 Academic Transcripts and Predicted Scores verified.',
        details: 'Transcripts audited: Math (98%), Physics (96%), Chemistry (95%), English (94%). All coursework meets rigorous standards for Top 20 STEM undergraduate programs.',
        performedBy: 'Sarah Jenkins',
        role: 'COUNSELOR',
        timestamp: 'Jul 25, 2026 at 4:15 PM'
      }
    ],
    shortlist: [
      {
        id: 'UNI-A1',
        name: 'Stanford University',
        category: 'Reach',
        deadline: '2026-11-01',
        status: 'In Progress',
        major: 'Computer Science',
        round: 'Restrictive Early Action (REA)'
      },
      {
        id: 'UNI-A2',
        name: 'University of Michigan',
        category: 'Target',
        deadline: '2026-11-01',
        status: 'In Progress',
        major: 'Computer Science Engineering',
        round: 'Early Action (EA)'
      }
    ],
    documents: [
      {
        id: 'DOC-A1',
        name: 'Aarav_Grade_11_Transcript.pdf',
        category: 'Academic Records',
        type: 'High School Transcript',
        uploadedBy: 'Aarav Sharma',
        status: 'verified',
        date: 'Jul 20, 2026',
        fileExt: 'pdf'
      }
    ],
    essays: [
      {
        id: 'ESS-A1',
        title: 'Common App Personal Statement',
        prompt: 'Discuss an accomplishment, event, or realization that sparked personal growth.',
        wordCount: 620,
        targetCount: 650,
        university: 'Common App',
        status: 'Under Review',
        counselor: 'Sarah Jenkins',
        versions: [
          {
            versionNumber: 1,
            date: 'Aug 2, 2026',
            author: 'Aarav Sharma',
            content: 'Growing up surrounded by the bustling energy of my city, I realized early on that technology is not just lines of code—it is an amplifier of human capability...'
          }
        ]
      }
    ],
    tasks: [
      {
        id: 'TSK-A1',
        name: 'Draft Common App Personal Statement Version 2',
        category: 'Essays & Applications',
        stage: 'IN_PROGRESS',
        dueDate: '2026-08-15',
        assignedBy: 'Sarah Jenkins (COUNSELOR)',
        description: 'Incorporate counselor feedback on opening paragraph hook and algorithmic impact.',
        attachments: []
      }
    ]
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
    readiness: 65,
    countries: ['USA', 'Canada'],
    password: 'Student@123',
    activities: [
      {
        id: 'act_init_3',
        type: 'SYSTEM',
        date: 'Jul 18, 2026',
        description: 'Student account created & intake profile activated for Ananya Iyer',
        details: 'Target: Economics & Quantitative Finance.',
        author: 'Admissions Desk'
      }
    ],
    operationalLogs: [
      {
        id: 'log_init_3',
        activityType: 'COUNSELOR_UPDATE',
        description: 'Target University Strategy & Curriculum Balance meeting completed.',
        details: 'Review of economics electives and AP Micro/Macro preparations. Student is on track with SAT Verbal practice sessions.',
        performedBy: 'Sarah Jenkins',
        role: 'COUNSELOR',
        timestamp: 'Aug 1, 2026 at 3:00 PM'
      }
    ],
    shortlist: [],
    documents: [],
    essays: [],
    tasks: []
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
    activities: [
      {
        id: 'act_init_4',
        type: 'SYSTEM',
        date: 'Jul 10, 2026',
        description: 'Student account created & intake profile activated for Qasim Khan',
        details: 'Target: Computer Science & AI at Ivy League institutions.',
        author: 'Admissions Desk'
      }
    ],
    operationalLogs: [
      {
        id: 'log_init_4',
        activityType: 'COUNSELOR_UPDATE',
        description: 'Columbia ED Strategic Application Review & Essay Deep-Dive',
        details: 'Conducted detailed line-by-line review of Why Columbia supplemental essay. Guided Qasim to connect his Data Science Institute goals with existing faculty research.',
        performedBy: 'Admin',
        role: 'SYSTEM_ADMIN',
        timestamp: 'Aug 3, 2026 at 6:00 PM'
      }
    ],
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
      }
    ],
    essays: [],
    tasks: []
  }
];

const initialStaff: StaffMember[] = [
  { id: '1', name: 'Admin', email: 'uppseekers@gmail.com', role: 'SYSTEM_ADMIN', students: 'All', status: 'Active', password: 'Uppseekers@1' },
  { id: '2', name: 'Sarah Jenkins', email: 'sarah@uppseekers.com', role: 'COUNSELOR', students: '2 Students', status: 'Active', password: 'Staff@123' },
  { id: '3', name: 'Dr. Vikram Roy', email: 'vikram.roy@uppseekers.com', role: 'RESEARCH_GUIDE', students: '2 Students', status: 'Active', password: 'Staff@123' },
  { id: '4', name: 'Marcus Vance', email: 'marcus@uppseekers.com', role: 'CATEGORY_MANAGER', students: 'All', status: 'Active', password: 'Staff@123' },
  { id: '5', name: 'Elena Rostova', email: 'elena@uppseekers.com', role: 'SAT_VERBAL_FACULTY', students: '1 Student', status: 'Active', password: 'Staff@123' },
  { id: '6', name: 'Rajesh Menon', email: 'rajesh.menon@uppseekers.com', role: 'SAT_MATH_FACULTY', students: '1 Student', status: 'Active', password: 'Staff@123' }
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


const initialEvents: EventItem[] = [
  {
    id: 'EVT-01',
    title: 'SAT Math: Advanced Trigonometric Functions & Circle Theorems',
    date: '2026-08-14',
    day: 'Friday',
    time: '17:00 - 18:30',
    duration: '90 mins',
    stream: 'SAT Prep',
    host: 'Rajesh Menon',
    students: 'Aarav Sharma',
    studentId: 'STU-101',
    location: 'https://meet.google.com/sat-math-101',
    status: 'Completed',
    notes: 'Covered Hard-level Trigonometric identities, Unit Circle radians conversion, and exponential regressions.',
    moms: [
      {
        id: 'MOM-01',
        authorName: 'Rajesh Menon',
        authorRole: 'SAT_MATH_FACULTY',
        date: '2026-08-14',
        keyPoints: 'Covered Hard-level Trigonometric identities, Unit Circle radians conversion, and exponential regressions with calculator techniques.',
        studentProgress: 'Aarav demonstrated strong conceptual grasp, solving 8/10 hard-tier trigonometric grid-ins accurately. Pacing improved to 1.1 min per question.',
        observations: 'Hesitates on complex quadratic systems with ambiguous geometric constraints.',
        nextSteps: 'Complete 25 practice grid-in questions and review Desmos graphing shortcuts.',
        followUpActions: 'Review error log during next Wednesday practice session.'
      }
    ],
    tasks: [
      {
        id: 'MT-01',
        title: 'Solve 25 Advanced Grid-in Trigonometry Problems',
        description: 'Target Bluebook question bank Module 2 hard-tier trigonometry and circular arc calculations.',
        assignedBy: 'Rajesh Menon (SAT_MATH_FACULTY)',
        assignedToStudentId: 'STU-101',
        assignedToStudentName: 'Aarav Sharma',
        dateAssigned: '2026-08-14',
        dueDate: '2026-08-20',
        status: 'COMPLETED',
        externalUrl: 'https://bluebook.collegeboard.org'
      },
      {
        id: 'MT-02',
        title: 'Review Desmos Graphing Shortcuts for Circle Equations',
        description: 'Practice rapid regression matching for circle radius and center coordinates.',
        assignedBy: 'Rajesh Menon (SAT_MATH_FACULTY)',
        assignedToStudentId: 'STU-101',
        assignedToStudentName: 'Aarav Sharma',
        dateAssigned: '2026-08-14',
        dueDate: '2026-08-22',
        status: 'IN_PROGRESS'
      }
    ]
  },
  {
    id: 'EVT-02',
    title: 'Ivy League Early Admissions Strategy & College List Balancing',
    date: '2026-08-18',
    day: 'Tuesday',
    time: '15:00 - 16:00',
    duration: '60 mins',
    stream: 'Counselling (1-on-1)',
    host: 'Sarah Jenkins',
    students: 'Aarav Sharma',
    studentId: 'STU-101',
    location: 'https://meet.google.com/counseling-aarav',
    status: 'Completed',
    notes: 'Strategic review of Reach/Target/Safety distribution. Finalized Stanford REA vs Columbia ED choice.',
    moms: [
      {
        id: 'MOM-02',
        authorName: 'Sarah Jenkins',
        authorRole: 'COUNSELOR',
        date: '2026-08-18',
        keyPoints: 'Finalized Early Decision (ED) vs Early Action (EA) strategy. Balanced 10 target institutions across US and UK.',
        studentProgress: 'Aarav has assembled all Grade 9-11 marksheets. Profile readiness index is at 75%.',
        observations: 'Extracurricular list lacks quantifiable leadership impact metrics in 150-char descriptions.',
        nextSteps: 'Refine Top 5 Common App activities using the Action Verb + Context + Numerical Impact formula.',
        followUpActions: 'Share Brag Sheet with High School Counselor by next Friday.'
      }
    ],
    tasks: [
      {
        id: 'MT-03',
        title: 'Rewrite Common App Top 5 Activities with Quantified Impact',
        description: 'Focus on robotics club founder role: members recruited, funding raised, and competition rankings.',
        assignedBy: 'Sarah Jenkins (COUNSELOR)',
        assignedToStudentId: 'STU-101',
        assignedToStudentName: 'Aarav Sharma',
        dateAssigned: '2026-08-18',
        dueDate: '2026-08-25',
        status: 'COMPLETED'
      },
      {
        id: 'MT-04',
        title: 'Submit Counselor Recommendation Brag Sheet Draft',
        description: 'Provide 3 key teacher anecdotes and personal challenges overcome for high school counselor reference.',
        assignedBy: 'Sarah Jenkins (COUNSELOR)',
        assignedToStudentId: 'STU-101',
        assignedToStudentName: 'Aarav Sharma',
        dateAssigned: '2026-08-18',
        dueDate: '2026-08-28',
        status: 'IN_PROGRESS'
      }
    ]
  },
  {
    id: 'EVT-03',
    title: 'Digital SAT Reading: Rhetorical Synthesis & Tone Inferences',
    date: '2026-08-21',
    day: 'Friday',
    time: '18:00 - 19:30',
    duration: '90 mins',
    stream: 'SAT Prep',
    host: 'Elena Rostova',
    students: 'Ananya Iyer',
    studentId: 'STU-102',
    location: 'https://meet.google.com/sat-verbal-ananya',
    status: 'Completed',
    notes: 'Drilled bulleted rhetorical synthesis questions and transition word matching.',
    moms: [
      {
        id: 'MOM-03',
        authorName: 'Elena Rostova',
        authorRole: 'SAT_VERBAL_FACULTY',
        date: '2026-08-21',
        keyPoints: 'Deconstructed 15 bulleted synthesis prompts from past exams. Reviewed transition words (nevertheless, furthermore, accordingly).',
        studentProgress: 'Ananya reached 90% accuracy on transitions. Overall verbal section estimated at 720-740.',
        observations: 'Needs caution on double-negative questions and dual science passage author perspectives.',
        nextSteps: 'Complete 3 dual passage reading drills with strict 12-minute time constraints.',
        followUpActions: 'Review Error Log prior to full practice test next Sunday.'
      }
    ],
    tasks: [
      {
        id: 'MT-05',
        title: 'Complete 3 Dual-Passage Reading Drills under 12 Min Timer',
        description: 'Focus on conflicting scientific hypothesis passages in Khan Academy Level 4 bank.',
        assignedBy: 'Elena Rostova (SAT_VERBAL_FACULTY)',
        assignedToStudentId: 'STU-102',
        assignedToStudentName: 'Ananya Iyer',
        dateAssigned: '2026-08-21',
        dueDate: '2026-08-27',
        status: 'COMPLETED'
      },
      {
        id: 'MT-06',
        title: 'Submit Diagnostic Test 3 Verbal Section Error Log',
        description: 'Categorize missed questions by reason (vocabulary, timing, misread stem) with correct explanations.',
        assignedBy: 'Elena Rostova (SAT_VERBAL_FACULTY)',
        assignedToStudentId: 'STU-102',
        assignedToStudentName: 'Ananya Iyer',
        dateAssigned: '2026-08-21',
        dueDate: '2026-08-30',
        status: 'NEEDS_REVISION'
      }
    ]
  },
  {
    id: 'EVT-04',
    title: 'STEM Research Paper: Algorithmic Pipeline & Statistical Validity',
    date: '2026-08-24',
    day: 'Monday',
    time: '11:00 - 12:30',
    duration: '90 mins',
    stream: 'Research Mentorship',
    host: 'Dr. Vikram Roy',
    students: 'Qasim Khan',
    studentId: 'STU-103',
    location: 'https://meet.google.com/research-qasim',
    status: 'Completed',
    notes: 'Examined statistical models for local inventory optimization algorithm. Scoped IEEE conference submission.',
    moms: [
      {
        id: 'MOM-04',
        authorName: 'Dr. Vikram Roy',
        authorRole: 'RESEARCH_GUIDE',
        date: '2026-08-24',
        keyPoints: 'Reviewed Qasim’s inventory optimization algorithm draft. Refined target journal and IEEE high school track submission requirements.',
        studentProgress: 'Literature review is thorough with 18 high-impact citations in IEEE format.',
        observations: 'Empirical evaluation needs comparison against baseline simulated supply chain models.',
        nextSteps: 'Write Python benchmark script comparing proposed heuristic against standard greedy baseline.',
        followUpActions: 'Review draft methodology section during next Monday call.'
      }
    ],
    tasks: [
      {
        id: 'MT-07',
        title: 'Write Python Benchmark Script for Supply Chain Algorithm',
        description: 'Run 1,000 synthetic simulations and generate error distribution histograms in matplotlib.',
        assignedBy: 'Dr. Vikram Roy (RESEARCH_GUIDE)',
        assignedToStudentId: 'STU-103',
        assignedToStudentName: 'Qasim Khan',
        dateAssigned: '2026-08-24',
        dueDate: '2026-09-01',
        status: 'IN_PROGRESS',
        externalUrl: 'https://github.com/qasim/supply-chain-opt'
      },
      {
        id: 'MT-08',
        title: 'Draft Methodology Section in LaTeX for IEEE Review',
        description: 'Formalize pseudocode algorithm and prove computational complexity O(n log n).',
        assignedBy: 'Dr. Vikram Roy (RESEARCH_GUIDE)',
        assignedToStudentId: 'STU-103',
        assignedToStudentName: 'Qasim Khan',
        dateAssigned: '2026-08-24',
        dueDate: '2026-09-05',
        status: 'TO_DO'
      }
    ]
  },
  {
    id: 'EVT-05',
    title: 'Common App Personal Statement Deep Dive & Emotional Arc',
    date: '2026-09-02',
    day: 'Wednesday',
    time: '16:00 - 17:00',
    duration: '60 mins',
    stream: 'Counselling (1-on-1)',
    host: 'Admin',
    students: 'Qasim Khan',
    studentId: 'STU-103',
    location: 'https://meet.google.com/admissions-qasim',
    status: 'Completed',
    notes: 'Reviewed Common App Personal Statement Draft 2. Re-worked opening paragraph to establish deeper emotional stakes.',
    moms: [
      {
        id: 'MOM-05',
        authorName: 'Admin',
        authorRole: 'SYSTEM_ADMIN',
        date: '2026-09-02',
        keyPoints: 'Live line-by-line review of Draft 2. Refined opening hook regarding local merchant supply challenges.',
        studentProgress: 'Word count trimmed from 710 to 645 words. Central narrative voice is vivid and distinct.',
        observations: 'Conclusion needed clearer forward-looking tie-in to Columbia University’s engineering ethos.',
        nextSteps: 'Integrate counselor feedback into Draft 3 and request final proofreading review.',
        followUpActions: 'Set essay status to Approved once conclusion revisions are complete.'
      }
    ],
    tasks: [
      {
        id: 'MT-09',
        title: 'Address Conclusion Transition on Common App Personal Statement',
        description: 'Revise final 80 words to connect technical curiosity directly to collegiate aspirations.',
        assignedBy: 'Admin (SYSTEM_ADMIN)',
        assignedToStudentId: 'STU-103',
        assignedToStudentName: 'Qasim Khan',
        dateAssigned: '2026-09-02',
        dueDate: '2026-09-08',
        status: 'COMPLETED'
      }
    ]
  },
  {
    id: 'EVT-06',
    title: 'Brown University Early Decision & Financial Aid Review',
    date: '2026-09-28',
    day: 'Monday',
    time: '17:00 - 18:00',
    duration: '60 mins',
    stream: 'Counselling (1-on-1)',
    host: 'Sarah Jenkins',
    students: 'Ananya Iyer',
    studentId: 'STU-102',
    location: 'https://meet.google.com/counseling-ananya',
    status: 'Scheduled',
    notes: 'Scheduled review of CSS Profile requirements, Brown Open Curriculum supplement, and ISFAA international forms.',
    moms: [],
    tasks: []
  }
];

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
  launchpadPermissions: LaunchpadTeamPermission[];
  setLaunchpadPermission: (
    userId: string,
    accessScope: LaunchpadAccessScope,
    updatedBy?: string,
    granular?: {
      launchpadStudentTabAccess?: LaunchpadAccessScope;
      launchpadReviewExerciseAccess?: LaunchpadAccessScope;
      launchpadEditCurriculumAccess?: LaunchpadCurriculumEditScope;
    }
  ) => void;
  launchpadSubjects: LaunchpadSubject[];
  saveLaunchpadSubject: (subject: LaunchpadSubject) => void;
  deleteLaunchpadSubject: (subjectId: string) => void;
  launchpadChapters: LaunchpadWeekModule[];
  saveLaunchpadChapter: (chapter: LaunchpadWeekModule) => void;
  reorderLaunchpadChapters: (subjectId: string, orderedChapterIds: string[]) => void;
  deleteLaunchpadChapter: (chapterId: string, subjectId: string) => void;
  launchpadCertQuestions: LaunchpadCertQuestionRecord[];
  saveLaunchpadCertQuestion: (question: LaunchpadCertQuestionRecord) => void;
  deleteLaunchpadCertQuestion: (questionId: string) => void;
  launchpadEnrollments: LaunchpadEnrollment[];
  assignStudentsToLaunchpad: (studentIds: string[], assignedBy: string) => void;
  removeStudentFromLaunchpad: (studentId: string) => void;
  launchpadSubjectReleases: LaunchpadSubjectRelease[];
  toggleLaunchpadSubjectRelease: (studentId: string, subjectId: string, isUnlocked: boolean, unlockedBy?: string) => void;
  launchpadProgress: LaunchpadWeekProgress[];
  saveLaunchpadWeekProgress: (progressItem: LaunchpadWeekProgress) => void;
  markLaunchpadWeekInProgress: (studentId: string, subjectId: string, weekNumber: number) => void;
  submitLaunchpadPracticalExercise: (params: {
    studentId: string;
    subjectId: string;
    weekNumber: number;
    progressItem: LaunchpadWeekProgress;
  }) => void;
  launchpadCertifications: LaunchpadCertification[];
  saveLaunchpadCertification: (cert: LaunchpadCertification) => void;
  launchpadEvaluations: LaunchpadAssignmentEvaluation[];
  evaluateLaunchpadSubmission: (params: {
    evalId: string;
    status: 'Submitted' | 'Approved' | 'Needs Revision' | 'Reviewed';
    feedback: string;
    evaluatorName: string;
  }) => void;
  appNotifications: AppNotification[];
  addAppNotification: (notif: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'> & { id?: string }) => void;
  markAppNotificationRead: (notifId: string) => void;
  firestoreStatus: 'idle' | 'connected' | 'permission-denied' | 'error';
  signInWithGoogle: () => Promise<{ role: string; user: any }>;
  signOutAll: () => Promise<void>;
  conversations: Conversation[];
  sendConversationMessage: (params: {
    studentId: string;
    studentName: string;
    conversationId?: string;
    text: string;
    channel?: string;
    direction?: 'outbound' | 'inbound' | 'note';
  }) => Promise<void>;
}

export const getDefaultOperationalLogsForStudent = (studentId: string, studentName: string, counselor?: string): OperationalLog[] => {
  if (studentId === 'STU-101') {
    return [
      {
        id: 'LOG-101-1',
        timestamp: '2026-08-14 06:45 PM',
        performedBy: 'Rajesh Menon',
        role: 'SAT_MATH_FACULTY',
        studentId: 'STU-101',
        activityType: 'Meeting Notes / MOM Logged',
        description: 'Added session MOM for "SAT Math: Advanced Trigonometric Functions & Circle Theorems": Unit Circle radians conversion and exponential regressions with calculator techniques.',
        details: 'Student Progress: Aarav solved 8/10 hard-tier trigonometric grid-ins accurately. Pacing improved to 1.1 min per question.'
      },
      {
        id: 'LOG-101-2',
        timestamp: '2026-08-14 06:50 PM',
        performedBy: 'Rajesh Menon',
        role: 'SAT_MATH_FACULTY',
        studentId: 'STU-101',
        activityType: 'Post-Meeting Task Assigned',
        description: 'Assigned post-meeting task "Solve 25 Advanced Grid-in Trigonometry Problems" (Due: 2026-08-20)',
        details: 'Assigned via Bluebook question bank Module 2 hard-tier trigonometry drills.'
      },
      {
        id: 'LOG-101-3',
        timestamp: '2026-08-18 04:15 PM',
        performedBy: 'Sarah Jenkins',
        role: 'COUNSELOR',
        studentId: 'STU-101',
        activityType: 'Meeting Notes / MOM Logged',
        description: 'Added session MOM for "Ivy League Early Admissions Strategy & College List Balancing": Finalized Early Decision (ED) vs Early Action (EA) strategy.',
        details: 'Student Progress: Common App profile assembled. 10 target institutions balanced across US and UK.'
      },
      {
        id: 'LOG-101-4',
        timestamp: '2026-08-18 04:20 PM',
        performedBy: 'Sarah Jenkins',
        role: 'COUNSELOR',
        studentId: 'STU-101',
        activityType: 'Post-Meeting Task Assigned',
        description: 'Assigned post-meeting task "Rewrite Common App Top 5 Activities with Quantified Impact" (Due: 2026-08-25)',
        details: 'Focus on robotics club founder role: members recruited, funding raised, and competition rankings.'
      },
      {
        id: 'LOG-101-5',
        timestamp: '2026-08-19 11:30 AM',
        performedBy: 'Sarah Jenkins',
        role: 'COUNSELOR',
        studentId: 'STU-101',
        activityType: 'Document Approved',
        description: 'Approved & verified official transcript "Aarav_Grade_11_Transcript.pdf" after school seal verification.',
        details: 'Document status set to Verified in Document Vault.'
      },
      {
        id: 'LOG-101-6',
        timestamp: '2026-08-20 02:00 PM',
        performedBy: 'Marcus Vance',
        role: 'CATEGORY_MANAGER',
        studentId: 'STU-101',
        activityType: 'Counselor Reassigned',
        description: 'Primary Counselor transferred from Unassigned to Sarah Jenkins following Fall 2026 intake onboarding.'
      }
    ];
  } else if (studentId === 'STU-102') {
    return [
      {
        id: 'LOG-102-1',
        timestamp: '2026-08-21 07:45 PM',
        performedBy: 'Elena Rostova',
        role: 'SAT_VERBAL_FACULTY',
        studentId: 'STU-102',
        activityType: 'Meeting Notes / MOM Logged',
        description: 'Added session MOM for "Digital SAT Reading: Rhetorical Synthesis & Tone Inferences": Deconstructed 15 bulleted synthesis prompts.',
        details: 'Student accuracy reached 90% on transitions. Verbal section estimated at 720-740.'
      },
      {
        id: 'LOG-102-2',
        timestamp: '2026-08-21 07:50 PM',
        performedBy: 'Elena Rostova',
        role: 'SAT_VERBAL_FACULTY',
        studentId: 'STU-102',
        activityType: 'Post-Meeting Task Assigned',
        description: 'Assigned post-meeting task "Complete 3 Dual-Passage Reading Drills under 12 Min Timer" (Due: 2026-08-27)',
        details: 'Focus on conflicting scientific hypothesis passages in Khan Academy Level 4 bank.'
      },
      {
        id: 'LOG-102-3',
        timestamp: '2026-08-23 03:30 PM',
        performedBy: 'Sarah Jenkins',
        role: 'COUNSELOR',
        studentId: 'STU-102',
        activityType: 'Counselor Guidance Note',
        description: 'Logged admissions advisory roadmap note: Recommended Brown University Early Decision due to Open Curriculum fit.',
        details: 'Discussed interdisciplinary neuroscience and creative writing course combinations.'
      },
      {
        id: 'LOG-102-4',
        timestamp: '2026-08-25 05:00 PM',
        performedBy: 'Sarah Jenkins',
        role: 'COUNSELOR',
        studentId: 'STU-102',
        activityType: 'Essay Evaluated',
        description: 'Evaluated Brown University supplemental essay draft: "Why Brown Open Curriculum". Scored rubric: 22/25.',
        details: 'Strong intellectual vitality demonstrated. Suggested deepening the third paragraph.'
      }
    ];
  } else if (studentId === 'STU-103') {
    return [
      {
        id: 'LOG-103-1',
        timestamp: '2026-08-24 12:45 PM',
        performedBy: 'Dr. Vikram Roy',
        role: 'RESEARCH_GUIDE',
        studentId: 'STU-103',
        activityType: 'Meeting Notes / MOM Logged',
        description: 'Added session MOM for "STEM Research Paper: Algorithmic Pipeline & Statistical Validity": Scoped IEEE conference submission.',
        details: 'Literature review is thorough with 18 high-impact citations in IEEE format.'
      },
      {
        id: 'LOG-103-2',
        timestamp: '2026-08-24 12:50 PM',
        performedBy: 'Dr. Vikram Roy',
        role: 'RESEARCH_GUIDE',
        studentId: 'STU-103',
        activityType: 'Post-Meeting Task Assigned',
        description: 'Assigned post-meeting task "Write Python Benchmark Script for Supply Chain Algorithm" (Due: 2026-09-01)',
        details: 'Run 1,000 synthetic simulations and generate error distribution histograms in matplotlib.'
      },
      {
        id: 'LOG-103-3',
        timestamp: '2026-09-02 05:15 PM',
        performedBy: 'Admin',
        role: 'SYSTEM_ADMIN',
        studentId: 'STU-103',
        activityType: 'Meeting Notes / MOM Logged',
        description: 'Added session MOM for "Common App Personal Statement Deep Dive & Emotional Arc": Live line-by-line review of Draft 2.',
        details: 'Central narrative voice is vivid and distinct. Word count trimmed from 710 to 645 words.'
      },
      {
        id: 'LOG-103-4',
        timestamp: '2026-09-02 05:20 PM',
        performedBy: 'Admin',
        role: 'SYSTEM_ADMIN',
        studentId: 'STU-103',
        activityType: 'Post-Meeting Task Assigned',
        description: 'Assigned post-meeting task "Address Conclusion Transition on Common App Personal Statement" (Due: 2026-09-08)',
        details: 'Revise final 80 words to connect technical curiosity directly to collegiate aspirations.'
      },
      {
        id: 'LOG-103-5',
        timestamp: '2026-09-03 10:00 AM',
        performedBy: 'Admin',
        role: 'SYSTEM_ADMIN',
        studentId: 'STU-103',
        activityType: 'Document Approved',
        description: 'Approved & verified official transcript "Qasim_Grade_11_Transcript.pdf" from St. Xavier High School.',
        details: 'Grade 11 score of 93.8% verified.'
      }
    ];
  }

  return [
    {
      id: `LOG-${studentId}-1`,
      timestamp: '2026-08-01 10:00 AM',
      performedBy: counselor || 'Sarah Jenkins',
      role: 'COUNSELOR',
      studentId,
      activityType: 'Counselor Guidance Note',
      description: `Initiated Fall 2026 admissions roadmap for ${studentName}. Verified preliminary academic credentials.`
    }
  ];
};

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const DatabaseProvider = ({ children }: { children: ReactNode }) => {
  const [students, setStudentsState] = useState<Student[]>(() => {
    const saved = localStorage.getItem('uppseekers_students_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(s => {
            const defaultLogs = getDefaultOperationalLogsForStudent(s.id, s.name, s.counselor);
            return {
              ...s,
              intake: s.intake || 'Fall 2026',
              tasks: s.tasks || [],
              activities: s.activities || [],
              documents: s.documents || [],
              shortlist: s.shortlist || [],
              countries: s.countries || [],
              operationalLogs: (s.operationalLogs && s.operationalLogs.length > 0) ? s.operationalLogs : defaultLogs
            };
          });
        }
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
  
  const mergePermissionsWithDefaults = (parsed: any): Record<string, PermissionCategory[]> => {
    const merged: Record<string, PermissionCategory[]> = JSON.parse(JSON.stringify(defaultPermissionsMatrix));
    if (parsed && typeof parsed === 'object') {
      for (const role of Object.keys(merged)) {
        const parsedCategories = parsed[role];
        if (Array.isArray(parsedCategories)) {
          const templateCats = JSON.parse(JSON.stringify(defaultPermissionsMatrix[role])) as PermissionCategory[];
          const updatedCats = templateCats.map(tCat => {
            const foundCat = parsedCategories.find((c: any) => c.id === tCat.id);
            if (!foundCat) {
              if (tCat.id === 'tab_visibility') {
                const findSavedItem = (catId: string, itemId: string) => {
                  const cat = parsedCategories.find((c: any) => c.id === catId);
                  return cat?.items?.find((i: any) => i.id === itemId);
                };
                const derivedItems = tCat.items.map(tItem => {
                  if (tItem.id === 'tab_settings') return { ...tItem, enabled: role === 'SYSTEM_ADMIN' };
                  if (tItem.id === 'tab_batches') {
                    const it = findSavedItem('batch', 'view_past');
                    return it ? { ...tItem, enabled: Boolean(it.enabled) } : tItem;
                  }
                  if (tItem.id === 'tab_scheduler') {
                    const it = findSavedItem('schedule', 'create_class');
                    return it ? { ...tItem, enabled: Boolean(it.enabled) } : tItem;
                  }
                  if (tItem.id === 'tab_vault') {
                    const it = findSavedItem('vault', 'view_vault');
                    return it ? { ...tItem, enabled: Boolean(it.enabled) } : tItem;
                  }
                  if (tItem.id === 'tab_evaluator') {
                    const it = findSavedItem('tasks', 'assign_tasks');
                    return it ? { ...tItem, enabled: Boolean(it.enabled) } : tItem;
                  }
                  if (tItem.id === 'tab_users') {
                    const it = findSavedItem('profile', 'view_roster');
                    return it ? { ...tItem, enabled: Boolean(it.enabled) } : tItem;
                  }
                  if (tItem.id === 'tab_reports') {
                    const it = findSavedItem('reports', 'view_meeting_reports');
                    return it ? { ...tItem, enabled: Boolean(it.enabled) } : tItem;
                  }
                  if (tItem.id === 'tab_universities') {
                    const it = findSavedItem('shortlist', 'add_uni');
                    return it ? { ...tItem, enabled: Boolean(it.enabled) } : tItem;
                  }
                  if (tItem.id === 'tab_launchpad') {
                    const tabIt = findSavedItem('launchpad', 'launchpad_student_tab_access');
                    const editIt = findSavedItem('launchpad', 'launchpad_edit_curriculum_access');
                    if (tabIt || editIt) {
                      return { ...tItem, enabled: Boolean(tabIt?.enabled || editIt?.enabled) };
                    }
                  }
                  return tItem;
                });
                return { ...tCat, items: derivedItems };
              }
              return tCat;
            }
            const updatedItems = tCat.items.map(tItem => {
              const foundItem = foundCat.items?.find((i: any) => i.id === tItem.id);
              if (foundItem) {
                return { ...tItem, enabled: foundItem.enabled, scope: foundItem.scope };
              }
              return tItem;
            });
            return { ...tCat, items: updatedItems };
          });
          merged[role] = updatedCats;
        }
      }
    }

    for (const [roleName, catList] of Object.entries(merged)) {
      if (roleName !== 'SYSTEM_ADMIN') {
        const adminCat = catList.find(c => c.id === 'admin');
        if (adminCat) {
          adminCat.items.forEach(item => {
            item.enabled = false;
            if (item.scope) item.scope = null;
          });
        }
        const tabVisCat = catList.find(c => c.id === 'tab_visibility');
        const settingsTab = tabVisCat?.items.find(i => i.id === 'tab_settings');
        if (settingsTab) {
          settingsTab.enabled = false;
        }
      } else {
        const tabVisCat = catList.find(c => c.id === 'tab_visibility');
        const settingsTab = tabVisCat?.items.find(i => i.id === 'tab_settings');
        if (settingsTab) {
          settingsTab.enabled = true;
        }
      }
      if (['RESEARCH_GUIDE', 'SAT_MATH_FACULTY', 'SAT_VERBAL_FACULTY', 'UNIVERSITY_MENTOR'].includes(roleName)) {
        const reportsCat = catList.find(c => c.id === 'reports');
        if (reportsCat) {
          reportsCat.items.forEach(item => {
            item.enabled = false;
            item.scope = null;
          });
        }
      }
    }

    if (merged['CATEGORY_MANAGER'] && Array.isArray(merged['CATEGORY_MANAGER'])) {
      merged['CATEGORY_MANAGER'].forEach(cat => {
        if (cat && cat.id !== 'admin' && cat.id !== 'tab_visibility' && Array.isArray(cat.items)) {
          cat.items.forEach(item => {
            if (item) {
              item.enabled = true;
              if (item.id === 'launchpad_edit_curriculum_access') {
                item.scope = 'Enabled';
              } else if (item.scope) {
                item.scope = 'Global Scope';
              }
            }
          });
        }
      });
    }

    return merged;
  };

  const [permissionsMatrixState, setPermissionsMatrixState] = useState<Record<string, PermissionCategory[]>>(() => {
    const saved = localStorage.getItem('uppseekers_permissions_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const merged = mergePermissionsWithDefaults(parsed);
        safeLocalStorageSet('uppseekers_permissions_v2', merged);
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

  const [firebaseUser, setFirebaseUser] = useState<User | null>(() => auth.currentUser);
  const [isFirebaseAuthReady, setIsFirebaseAuthReady] = useState(false);
  const [firestoreStatus, setFirestoreStatus] = useState<'idle' | 'connected' | 'permission-denied' | 'error'>('idle');

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setIsFirebaseAuthReady(true);
      if (!user) {
        setFirestoreStatus('idle');
      }
    });
    return () => unsubAuth();
  }, []);

  const signInWithGoogle = async (): Promise<{ role: string; user: any }> => {
    const cred = await signInWithPopup(auth, googleAuthProvider);
    const fbUser = cred.user;
    const cleanEmail = (fbUser.email || '').trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error('Google account did not return a verified email address.');
    }

    // 1. Primary Admin check
    if (cleanEmail === 'uppseekers@gmail.com') {
      const existingAdmin = staff.find(s => s.email?.toLowerCase().trim() === cleanEmail);
      const adminUser: StaffMember = existingAdmin || {
        id: '1',
        name: fbUser.displayName || 'Admin',
        email: 'uppseekers@gmail.com',
        role: 'SYSTEM_ADMIN',
        students: 'All',
        status: 'Active',
      };
      localStorage.setItem('auth_user_email', adminUser.email);
      localStorage.setItem('auth_token', `custom_${adminUser.id}_${adminUser.email}`);
      setCurrentUser(adminUser);
      setIsAuthenticated(true);
      setFirestoreStatus('connected');
      return { role: adminUser.role, user: adminUser };
    }

    // 2. Match staff locally or in Firestore
    let matchedStaff: StaffMember | undefined = staff.find(
      s => s.email?.toLowerCase().trim() === cleanEmail
    );
    if (!matchedStaff) {
      try {
        const snap = await getDocs(query(collection(db, 'staff'), where('email', '==', cleanEmail)));
        snap.forEach(d => {
          if (!matchedStaff) {
            const data = d.data() as StaffMember;
            matchedStaff = { ...data, id: data.id || d.id };
          }
        });
      } catch (err) {
        console.warn('Firestore staff lookup warning during Google sign-in:', err);
      }
    }

    if (matchedStaff) {
      localStorage.setItem('auth_user_email', matchedStaff.email);
      localStorage.setItem('auth_token', `custom_${matchedStaff.id}_${matchedStaff.email}`);
      setCurrentUser(matchedStaff);
      setIsAuthenticated(true);
      setFirestoreStatus('connected');
      return { role: matchedStaff.role || 'COUNSELOR', user: matchedStaff };
    }

    // 3. Match student locally or in Firestore
    let matchedStudent: Student | undefined = students.find(
      s => s.email?.toLowerCase().trim() === cleanEmail
    );
    if (!matchedStudent) {
      try {
        const snap = await getDocs(query(collection(db, 'students'), where('email', '==', cleanEmail)));
        snap.forEach(d => {
          if (!matchedStudent) {
            const data = d.data() as Student;
            matchedStudent = { ...data, id: data.id || d.id };
          }
        });
      } catch (err) {
        console.warn('Firestore student lookup warning during Google sign-in:', err);
      }
    }

    if (matchedStudent) {
      const studentSessionUser = {
        ...matchedStudent,
        role: 'STUDENT',
        status: 'Active',
      } as any;
      localStorage.setItem('auth_user_email', matchedStudent.email);
      localStorage.setItem('auth_token', `custom_${matchedStudent.id}_${matchedStudent.email}`);
      setCurrentUser(studentSessionUser);
      setIsAuthenticated(true);
      setFirestoreStatus('connected');
      return { role: 'STUDENT', user: studentSessionUser };
    }

    throw new Error(`No staff or student account found for ${cleanEmail}. Please sign in with your registered email or contact an administrator.`);
  };

  const signOutAll = async (): Promise<void> => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user_email');
    localStorage.removeItem('uppseekers_current_user');
    await signOut(auth).catch(() => {});
    setIsAuthenticatedState(false);
    setFirestoreStatus('idle');
  };

  const canSyncDocToFirestore = (colName: string, docData?: any) => {
    const fbUser = auth.currentUser;
    if (!fbUser || !fbUser.emailVerified) return false;
    const fbEmail = (fbUser.email || '').trim().toLowerCase();
    if (fbEmail === 'uppseekers@gmail.com') return true;
    if ((colName === 'students' || colName === 'staff') && docData?.email) {
      return String(docData.email).trim().toLowerCase() === fbEmail;
    }
    return false;
  };

  const stripLargeStringsAndUndefined = (val: any): any => {
    if (val === undefined) return undefined;
    if (val === null) return null;
    if (typeof val === 'string') {
      if (val.startsWith('data:') && val.length > 20000) {
        return '[stored-in-cloudsql]';
      }
      return val;
    }
    if (Array.isArray(val)) {
      return val
        .map((item) => stripLargeStringsAndUndefined(item))
        .filter((item) => item !== undefined);
    }
    if (typeof val === 'object') {
      const cleaned: Record<string, any> = {};
      for (const [k, v] of Object.entries(val)) {
        const nextVal = stripLargeStringsAndUndefined(v);
        if (nextVal !== undefined) {
          cleaned[k] = nextVal;
        }
      }
      return cleaned;
    }
    return val;
  };

  const sanitizeFirestoreDocId = (docId: string): string => {
    return String(docId || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  };

  const sanitizeFirestorePayload = (colName: string, safeId: string, raw: any): Record<string, any> | null => {
    if (!raw || typeof raw !== 'object' || !safeId) return null;
    const base = stripLargeStringsAndUndefined(raw) as Record<string, any>;

    if (colName === 'students') {
      const allowedKeys = [
        'id', 'name', 'email', 'phone', 'intake', 'school', 'counselor',
        'researchMentor', 'satMathMentor', 'satVerbalMentor', 'universityMentor',
        'readiness', 'countries', 'password', 'activities', 'operationalLogs',
        'shortlist', 'documents', 'essays', 'tasks', 'extracurriculars',
        'academicScores', 'targetDegree', 'targetCountry', 'uid', 'role', 'status'
      ];
      const out: Record<string, any> = {};
      for (const key of allowedKeys) {
        if (base[key] !== undefined && base[key] !== null) {
          out[key] = base[key];
        }
      }
      out.id = safeId;
      out.name = String(base.name || 'Student').trim().slice(0, 200) || 'Student';
      const rawEmail = String(base.email || '').trim();
      out.email = (rawEmail.length >= 3 ? rawEmail : 'student@uppseekers.com').slice(0, 200);

      if ('phone' in out) {
        if (typeof out.phone === 'string') out.phone = out.phone.slice(0, 60);
        else delete out.phone;
      }
      if ('intake' in out) {
        if (typeof out.intake === 'string') out.intake = out.intake.slice(0, 60);
        else delete out.intake;
      }
      if ('school' in out) {
        if (typeof out.school === 'string') out.school = out.school.slice(0, 200);
        else delete out.school;
      }
      if ('counselor' in out) {
        if (typeof out.counselor === 'string') out.counselor = out.counselor.slice(0, 160);
        else delete out.counselor;
      }
      if ('readiness' in out) {
        const num = Number(out.readiness);
        out.readiness = Number.isFinite(num) ? num : 0;
      }
      if ('countries' in out) {
        if (Array.isArray(out.countries)) out.countries = out.countries.slice(0, 20);
        else delete out.countries;
      }
      return out;
    }

    if (colName === 'staff') {
      const allowedKeys = ['id', 'name', 'email', 'role', 'students', 'status', 'password', 'uid'];
      const out: Record<string, any> = {};
      for (const key of allowedKeys) {
        if (base[key] !== undefined && base[key] !== null) {
          out[key] = base[key];
        }
      }
      out.id = safeId;
      out.name = String(base.name || 'Staff Member').trim().slice(0, 200) || 'Staff Member';
      const rawEmail = String(base.email || '').trim();
      out.email = (rawEmail.length >= 3 ? rawEmail : 'staff@uppseekers.com').slice(0, 200);

      if ('role' in out) {
        if (typeof out.role === 'string') out.role = out.role.slice(0, 60);
        else delete out.role;
      }
      if ('status' in out) {
        if (typeof out.status === 'string') out.status = out.status.slice(0, 40);
        else delete out.status;
      }
      if ('students' in out) {
        if (Array.isArray(out.students)) out.students = out.students.join(', ').slice(0, 120);
        else if (typeof out.students === 'string') out.students = out.students.slice(0, 120);
        else delete out.students;
      }
      return out;
    }

    if (colName === 'batches') {
      const allowedKeys = [
        'id', 'name', 'type', 'subject', 'mentors', 'meetingLink', 'status',
        'capacity', 'students', 'totalSessions', 'completedSessions',
        'scheduleDayTime', 'description', 'sessions', 'parentBatchId'
      ];
      const out: Record<string, any> = {};
      for (const key of allowedKeys) {
        if (base[key] !== undefined && base[key] !== null) {
          out[key] = base[key];
        }
      }
      out.id = safeId;
      out.name = String(base.name || 'Cohort Batch').trim().slice(0, 200) || 'Cohort Batch';
      if ('type' in out) {
        if (typeof out.type === 'string') out.type = out.type.slice(0, 60);
        else delete out.type;
      }
      if ('mentors' in out) {
        if (Array.isArray(out.mentors)) out.mentors = out.mentors.slice(0, 50);
        else delete out.mentors;
      }
      if ('students' in out) {
        if (Array.isArray(out.students)) out.students = out.students.slice(0, 500);
        else delete out.students;
      }
      return out;
    }

    if (colName === 'events') {
      const allowedKeys = [
        'id', 'day', 'time', 'duration', 'stream', 'title', 'batch', 'students',
        'studentId', 'location', 'notes', 'assignments', 'host', 'status',
        'moms', 'ratings', 'resources', 'tasks', 'date', 'isRecurring',
        'seriesId', 'sessionNumber', 'totalSessionsInSeries', 'recurrenceRule',
        'videoProvider', 'zohoMeetingKey', 'hostStartLink', 'participantEmails',
        'type', 'category', 'attendees', 'link'
      ];
      const out: Record<string, any> = {};
      for (const key of allowedKeys) {
        if (base[key] !== undefined && base[key] !== null) {
          out[key] = base[key];
        }
      }
      out.id = safeId;
      out.title = String(base.title || 'Scheduled Session').trim().slice(0, 300) || 'Scheduled Session';
      if ('participantEmails' in out) {
        if (Array.isArray(out.participantEmails)) out.participantEmails = out.participantEmails.slice(0, 200);
        else delete out.participantEmails;
      }
      return out;
    }

    if (colName === 'launchpad') {
      return {
        items: Array.isArray(base.items) ? base.items.slice(0, 2000) : [],
        updatedAt: String(base.updatedAt || new Date().toISOString()).slice(0, 64),
      };
    }

    return base;
  };

  const syncDocToFirestore = async (colName: string, docId: string, data: any) => {
    if (!canSyncDocToFirestore(colName, data)) return;
    const safeId = sanitizeFirestoreDocId(docId);
    if (!safeId) return;
    const sanitized = sanitizeFirestorePayload(colName, safeId, data);
    if (!sanitized) return;

    const fbEmail = (auth.currentUser?.email || '').trim().toLowerCase();
    const isBootstrapAdmin = fbEmail === 'uppseekers@gmail.com';

    try {
      if (!isBootstrapAdmin) {
        if (colName === 'students') {
          const selfStudentPatch: Record<string, any> = {};
          for (const k of ['tasks', 'essays', 'documents', 'activities'] as const) {
            if (sanitized[k] !== undefined) {
              selfStudentPatch[k] = sanitized[k];
            }
          }
          if (Object.keys(selfStudentPatch).length === 0) return;
          await updateDoc(doc(db, 'students', safeId), selfStudentPatch);
          return;
        }
        if (colName === 'staff') {
          if (typeof sanitized.password === 'string' && sanitized.password.length > 0) {
            await updateDoc(doc(db, 'staff', safeId), { password: sanitized.password });
          }
          return;
        }
        return;
      }

      await setDoc(doc(db, colName, safeId), JSON.parse(JSON.stringify(sanitized)));
    } catch (err: any) {
      if (!isBootstrapAdmin && (err?.code === 'not-found' || String(err?.message || '').includes('No document to update'))) {
        return;
      }
      handleFirestoreError(err, OperationType.WRITE, `${colName}/${safeId}`);
    }
  };

  const deleteDocFromFirestore = async (colName: string, docId: string) => {
    const fbUser = auth.currentUser;
    if (!fbUser || !fbUser.emailVerified) return;
    if ((fbUser.email || '').trim().toLowerCase() !== 'uppseekers@gmail.com') return;
    try {
      await deleteDoc(doc(db, colName, docId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${colName}/${docId}`);
    }
  };

  // Hydrate portal state from Cloud SQL backend on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      const savedEmail = localStorage.getItem('auth_user_email');

      if (savedEmail || token) {
        setIsAuthenticated(true);
      }

      await initializeData(token || '');
    };
    checkAuth();
  }, []);

  // Cloud SQL (/api/data & /api/launchpad/state) is the single authoritative source of truth across all devices.
  // Only verify Firestore connectivity if a verified Firebase session exists, without letting partial Firestore docs overwrite Cloud SQL state.
  useEffect(() => {
    if (!isFirebaseAuthReady || !firebaseUser || !firebaseUser.emailVerified) {
      return;
    }
    testFirestoreConnection();
    setFirestoreStatus('connected');
  }, [isFirebaseAuthReady, firebaseUser]);

  const setStudents = (newStudents: Student[]) => {
    const token = localStorage.getItem('auth_token') || 'custom_user';
    const deleted = students.filter(prev => !newStudents.some(n => n.id === prev.id));
    deleted.forEach(d => {
      if (d.id) {
        void deleteDocFromFirestore('students', d.id);
        fetch(`/api/students/${encodeURIComponent(d.id)}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(console.error);
      }
    });
    setStudentsState(newStudents);
    safeLocalStorageSet('uppseekers_students_v2', sanitizeStudentsForLocalStorage(newStudents));
    newStudents.forEach(s => {
      if (s.id) {
        void syncDocToFirestore('students', s.id, s);
      }
    });
    fetch('/api/students', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
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
      const targetEmail = (updatedStudent.email || '').trim().toLowerCase();
      const exists = prev.some(
        s => s.id === updatedStudent.id || (targetEmail && (s.email || '').trim().toLowerCase() === targetEmail)
      );
      const newStudents = exists 
        ? prev.map(s =>
            s.id === updatedStudent.id || (targetEmail && (s.email || '').trim().toLowerCase() === targetEmail)
              ? updatedStudent
              : s
          )
        : [...prev, updatedStudent];
      safeLocalStorageSet('uppseekers_students_v2', sanitizeStudentsForLocalStorage(newStudents));
      return newStudents;
    });

    setCurrentUser(prev => {
      if (
        prev &&
        (prev.id === updatedStudent.id ||
          (prev.email && updatedStudent.email && prev.email.trim().toLowerCase() === updatedStudent.email.trim().toLowerCase()))
      ) {
        return { ...prev, ...updatedStudent };
      }
      return prev;
    });

    if (updatedStudent.id) {
      void syncDocToFirestore('students', updatedStudent.id, updatedStudent);
    }

    const token = localStorage.getItem('auth_token') || 'custom_user';
    try {
      await fetch('/api/student', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updatedStudent)
      });
    } catch (err) {
      console.error('Failed to sync student profile to server:', err);
    }
  };

  const getStudent = (id: string) => students.find(s => s.id === id);

  const setStaff = (newStaff: StaffMember[]) => {
    const token = localStorage.getItem('auth_token') || 'custom_user';
    const deleted = staff.filter(prev => !newStaff.some(n => n.id === prev.id));
    deleted.forEach(d => {
      if (d.id) {
        void deleteDocFromFirestore('staff', d.id);
        fetch(`/api/staff/${encodeURIComponent(d.id)}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(console.error);
      }
    });
    setStaffState(newStaff);
    safeLocalStorageSet('uppseekers_staff_v2', newStaff);
    newStaff.forEach(s => {
      if (s.id) {
        void syncDocToFirestore('staff', s.id, s);
      }
    });
    fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(newStaff)
    }).catch(console.error);
  };
  
  const setPermissionsMatrix = (matrix: Record<string, PermissionCategory[]>) => {
    setPermissionsMatrixState(matrix);
    safeLocalStorageSet('uppseekers_permissions_v2', matrix);
    const token = localStorage.getItem('auth_token') || 'custom_user';
    fetch('/api/settings/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ permissionsMatrix: matrix })
    }).catch(console.error);
  };

  const [events, setEventsState] = useState<EventItem[]>(() => {
    const saved = localStorage.getItem('uppseekers_events_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 2) return parsed;
      } catch(e) {}
    }
    return initialEvents;
  });

  const setEvents = async (newEvents: EventItem[]) => {
    const validNewEvents = Array.isArray(newEvents) ? newEvents : [];
    const currentEvents = Array.isArray(events) ? events : [];
    const deleted = currentEvents.filter(prev => !validNewEvents.some(n => n.id === prev.id));
    deleted.forEach(d => {
      if (d.id) void deleteDocFromFirestore('events', d.id);
    });
    setEventsState(validNewEvents);
    safeLocalStorageSet('uppseekers_events_v2', validNewEvents);
    validNewEvents.forEach(e => {
      if (e.id) {
        void syncDocToFirestore('events', e.id, e);
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
      if (d.id) void deleteDocFromFirestore('batches', d.id);
    });
    setBatchesState(validNewBatches);
    safeLocalStorageSet('uppseekers_batches_v2', validNewBatches);
    validNewBatches.forEach(b => {
      if (b.id) {
        void syncDocToFirestore('batches', b.id, b);
      }
    });
    const token = localStorage.getItem('auth_token') || 'custom_user';
    fetch('/api/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(newBatches)
    }).catch(console.error);
  };


  // Launchpad Module States (Optimistic LocalStorage + Firestore + Cloud SQL)
  const [launchpadPermissions, setLaunchpadPermissionsState] = useState<LaunchpadTeamPermission[]>(() => {
    const saved = safeLocalStorageGet<LaunchpadTeamPermission[]>('uppseekers_launchpad_perms_v1', []);
    return Array.isArray(saved) ? saved : [];
  });

  const [launchpadSubjects, setLaunchpadSubjectsState] = useState<LaunchpadSubject[]>(() => {
    const saved = safeLocalStorageGet<LaunchpadSubject[]>('uppseekers_launchpad_subjects_v1', []);
    return mergeLaunchpadSubjectsWithDefaults(Array.isArray(saved) ? saved : []);
  });

  const [launchpadChapters, setLaunchpadChaptersState] = useState<LaunchpadWeekModule[]>(() => {
    const saved = safeLocalStorageGet<LaunchpadWeekModule[]>('uppseekers_launchpad_chapters_v1', []);
    return mergeLaunchpadChaptersWithDefaults(Array.isArray(saved) ? saved : []);
  });

  const [launchpadCertQuestions, setLaunchpadCertQuestionsState] = useState<LaunchpadCertQuestionRecord[]>(() => {
    const saved = safeLocalStorageGet<LaunchpadCertQuestionRecord[]>('uppseekers_launchpad_cert_qs_v1', []);
    return mergeLaunchpadCertQuestionsWithDefaults(Array.isArray(saved) ? saved : []);
  });

  const [launchpadEnrollments, setLaunchpadEnrollmentsState] = useState<LaunchpadEnrollment[]>(() => {
    const saved = safeLocalStorageGet<LaunchpadEnrollment[]>('uppseekers_launchpad_enrollments_v1', []);
    return Array.isArray(saved) ? saved : [];
  });

  const [launchpadSubjectReleases, setLaunchpadSubjectReleasesState] = useState<LaunchpadSubjectRelease[]>(() => {
    const saved = safeLocalStorageGet<LaunchpadSubjectRelease[]>('uppseekers_launchpad_releases_v1', []);
    return Array.isArray(saved) ? saved : [];
  });

  const [launchpadProgress, setLaunchpadProgressState] = useState<LaunchpadWeekProgress[]>(() => {
    const saved = safeLocalStorageGet<LaunchpadWeekProgress[]>('uppseekers_launchpad_progress_v1', []);
    return Array.isArray(saved) ? saved : [];
  });

  const [launchpadCertifications, setLaunchpadCertificationsState] = useState<LaunchpadCertification[]>(() => {
    const saved = safeLocalStorageGet<LaunchpadCertification[]>('uppseekers_launchpad_certs_v1', []);
    return Array.isArray(saved) ? saved : [];
  });

  const [launchpadEvaluations, setLaunchpadEvaluationsState] = useState<LaunchpadAssignmentEvaluation[]>(() => {
    const saved = safeLocalStorageGet<LaunchpadAssignmentEvaluation[]>('uppseekers_launchpad_evals_v1', []);
    return Array.isArray(saved) ? saved : [];
  });

  const [appNotifications, setAppNotificationsState] = useState<AppNotification[]>(() => {
    const saved = safeLocalStorageGet<AppNotification[]>('uppseekers_notifications_v1', []);
    return Array.isArray(saved) ? saved : [];
  });

  const [conversations, setConversationsState] = useState<Conversation[]>(() => {
    const saved = safeLocalStorageGet<Conversation[]>('uppseekers_conversations_v1', []);
    return Array.isArray(saved) ? saved : [];
  });

  const sendConversationMessage = async ({
    studentId,
    studentName,
    conversationId,
    text,
    channel = 'Portal',
    direction = 'outbound',
  }: {
    studentId: string;
    studentName: string;
    conversationId?: string;
    text: string;
    channel?: string;
    direction?: 'outbound' | 'inbound' | 'note';
  }) => {
    const now = new Date().toISOString();
    const convId = conversationId || `CONV-${studentId}`;
    const newMsg: ConversationMessage = {
      id: `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      conversationId: convId,
      studentId,
      studentName,
      senderId: currentUser?.id || '1',
      senderName: currentUser?.name || 'Team Member',
      senderRole: currentUser?.role || 'COUNSELOR',
      direction,
      channel,
      text,
      timestamp: now,
      read: true,
    };

    setConversationsState(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const existingIdx = safePrev.findIndex(c => c.id === convId || c.studentId === studentId);
      let next: Conversation[];
      if (existingIdx >= 0) {
        const existing = safePrev[existingIdx];
        const updated: Conversation = {
          ...existing,
          lastMessage: text,
          lastMessageAt: now,
          updatedAt: now,
          messages: [...(existing.messages || []), newMsg],
        };
        next = safePrev.map((c, i) => (i === existingIdx ? updated : c));
      } else {
        const created: Conversation = {
          id: convId,
          studentId,
          studentName,
          channel,
          lastMessage: text,
          lastMessageAt: now,
          updatedAt: now,
          status: 'Open',
          messages: [newMsg],
        };
        next = [created, ...safePrev];
      }
      safeLocalStorageSet('uppseekers_conversations_v1', next);
      return next;
    });

    const targetStudent = students.find(s => s.id === studentId);
    if (targetStudent) {
      const existingMsgs = Array.isArray(targetStudent.conversations) ? targetStudent.conversations : [];
      updateStudent({
        ...targetStudent,
        conversations: [...existingMsgs, newMsg],
      });
    }
  };

  const addAppNotification = (notif: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'> & { id?: string }) => {
    const now = new Date().toISOString();
    const record: AppNotification = {
      id: notif.id || `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      recipientType: notif.recipientType,
      recipientId: notif.recipientId,
      title: notif.title,
      message: notif.message,
      category: notif.category || 'LAUNCHPAD',
      link: notif.link,
      metadataJson: notif.metadataJson || {},
      isRead: false,
      createdAt: now,
    };
    setAppNotificationsState(prev => {
      const next = [record, ...prev.filter(n => n.id !== record.id)].slice(0, 150);
      safeLocalStorageSet('uppseekers_notifications_v1', next);
      void syncDocToFirestore('launchpad', 'notifications', { items: next, updatedAt: now });
      return next;
    });
    const token = localStorage.getItem('auth_token') || 'custom_user';
    fetch('/api/launchpad/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(record)
    }).catch(console.error);
  };

  const markAppNotificationRead = (notifId: string) => {
    const now = new Date().toISOString();
    setAppNotificationsState(prev => {
      const next = prev.map(n => n.id === notifId ? { ...n, isRead: true } : n);
      safeLocalStorageSet('uppseekers_notifications_v1', next);
      void syncDocToFirestore('launchpad', 'notifications', { items: next, updatedAt: now });
      return next;
    });
    const token = localStorage.getItem('auth_token') || 'custom_user';
    fetch(`/api/launchpad/notifications/${encodeURIComponent(notifId)}/read`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    }).catch(console.error);
  };

  const setLaunchpadPermission = (
    userId: string,
    accessScope: LaunchpadAccessScope,
    updatedBy?: string,
    granular?: {
      launchpadStudentTabAccess?: LaunchpadAccessScope;
      launchpadReviewExerciseAccess?: LaunchpadAccessScope;
      launchpadEditCurriculumAccess?: LaunchpadCurriculumEditScope;
    }
  ) => {
    const now = new Date().toISOString();
    const record: LaunchpadTeamPermission = {
      userId,
      accessScope,
      launchpadStudentTabAccess: granular?.launchpadStudentTabAccess ?? accessScope,
      launchpadReviewExerciseAccess: granular?.launchpadReviewExerciseAccess ?? accessScope,
      launchpadEditCurriculumAccess: granular?.launchpadEditCurriculumAccess ?? 'none',
      updatedBy: updatedBy || 'Admin',
      updatedAt: now
    };
    setLaunchpadPermissionsState(prev => {
      const exists = prev.some(p => p.userId === userId);
      const next = exists
        ? prev.map(p => p.userId === userId ? { ...p, ...record } : p)
        : [...prev, record];
      safeLocalStorageSet('uppseekers_launchpad_perms_v1', next);
      void syncDocToFirestore('launchpad', 'permissions', { items: next, updatedAt: now });
      return next;
    });
    const token = localStorage.getItem('auth_token') || 'custom_user';
    fetch('/api/launchpad/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(record)
    }).catch(console.error);
  };

  const saveLaunchpadSubject = (subject: LaunchpadSubject) => {
    const now = new Date().toISOString();
    const deletedIds = getDeletedLaunchpadSubjectIds().filter((id) => id !== subject.id);
    safeLocalStorageSet(LAUNCHPAD_DELETED_SUBJECTS_KEY, deletedIds);
    const normalized: LaunchpadSubject = {
      ...subject,
      iconKey: subject.iconKey || subject.id,
      passingThreshold: subject.passingThreshold ?? 75,
      certificateTitle: subject.certificateTitle || `Launchpad Certified — ${subject.title}`,
      isArchived: Boolean(subject.isArchived),
    };
    setLaunchpadSubjectsState(prev => {
      const exists = prev.some(s => s.id === normalized.id);
      const next = exists
        ? prev.map(s => s.id === normalized.id ? normalized : s)
        : [...prev, normalized];
      const sorted = [...next].sort((a, b) => a.order - b.order);
      safeLocalStorageSet('uppseekers_launchpad_subjects_v1', sorted);
      void syncDocToFirestore('launchpad', 'subjects', { items: sorted, updatedAt: now });
      return sorted;
    });
    const token = localStorage.getItem('auth_token') || 'custom_user';
    fetch('/api/launchpad/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(normalized)
    }).catch(console.error);
  };

  const deleteLaunchpadSubject = (subjectId: string) => {
    const now = new Date().toISOString();
    const deletedIds = Array.from(new Set([...getDeletedLaunchpadSubjectIds(), subjectId]));
    safeLocalStorageSet(LAUNCHPAD_DELETED_SUBJECTS_KEY, deletedIds);
    setLaunchpadSubjectsState(prev => {
      const next = prev.filter(s => s.id !== subjectId);
      safeLocalStorageSet('uppseekers_launchpad_subjects_v1', next);
      void syncDocToFirestore('launchpad', 'subjects', { items: next, updatedAt: now });
      return next;
    });
    setLaunchpadChaptersState(prev => {
      const next = prev.filter(c => c.subjectId !== subjectId);
      safeLocalStorageSet('uppseekers_launchpad_chapters_v1', next);
      void syncDocToFirestore('launchpad', 'chapters', { items: next, updatedAt: now });
      return next;
    });
    setLaunchpadCertQuestionsState(prev => {
      const next = prev.filter(q => q.subjectId !== subjectId);
      safeLocalStorageSet('uppseekers_launchpad_cert_qs_v1', next);
      void syncDocToFirestore('launchpad', 'certQuestions', { items: next, updatedAt: now });
      return next;
    });
    const token = localStorage.getItem('auth_token') || 'custom_user';
    fetch(`/api/launchpad/subjects/${encodeURIComponent(subjectId)}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }).catch(console.error);
  };

  const saveLaunchpadChapter = (chapter: LaunchpadWeekModule) => {
    const now = new Date().toISOString();
    const subjectId = chapter.subjectId || 'comm-public-speaking';
    const chapterId = chapter.id || `${subjectId}__w${chapter.weekNumber}__${Date.now()}`;
    const normalized: LaunchpadWeekModule = { ...chapter, id: chapterId, subjectId };

    setLaunchpadChaptersState(prev => {
      const exists = prev.some(c => c.id === chapterId);
      const next = exists
        ? prev.map(c => c.id === chapterId ? normalized : c)
        : [...prev, normalized];
      const sorted = [...next].sort((a, b) => a.weekNumber - b.weekNumber);
      safeLocalStorageSet('uppseekers_launchpad_chapters_v1', sorted);
      void syncDocToFirestore('launchpad', 'chapters', { items: sorted, updatedAt: now });
      return sorted;
    });

    // Ensure subject is marked hasCurriculum = true
    const parentSubject = launchpadSubjects.find(s => s.id === subjectId);
    if (parentSubject && !parentSubject.hasCurriculum) {
      saveLaunchpadSubject({ ...parentSubject, hasCurriculum: true });
    }

    const token = localStorage.getItem('auth_token') || 'custom_user';
    fetch('/api/launchpad/chapters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(normalized)
    }).catch(console.error);
  };

  const reorderLaunchpadChapters = (subjectId: string, orderedChapterIds: string[]) => {
    const now = new Date().toISOString();
    const reorderedUpdates: { id: string; weekNumber: number }[] = [];
    setLaunchpadChaptersState(prev => {
      const next = prev.map(ch => {
        if ((ch.subjectId || 'comm-public-speaking') !== subjectId) return ch;
        const idx = orderedChapterIds.indexOf(ch.id || `${subjectId}__w${ch.weekNumber}`);
        if (idx === -1) return ch;
        const newWeek = idx + 1;
        if (ch.id) reorderedUpdates.push({ id: ch.id, weekNumber: newWeek });
        return { ...ch, weekNumber: newWeek };
      });
      const sorted = [...next].sort((a, b) => a.weekNumber - b.weekNumber);
      safeLocalStorageSet('uppseekers_launchpad_chapters_v1', sorted);
      void syncDocToFirestore('launchpad', 'chapters', { items: sorted, updatedAt: now });
      return sorted;
    });
    const token = localStorage.getItem('auth_token') || 'custom_user';
    fetch('/api/launchpad/chapters/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ chapters: reorderedUpdates })
    }).catch(console.error);
  };

  const deleteLaunchpadChapter = (chapterId: string, subjectId: string) => {
    const now = new Date().toISOString();
    setLaunchpadChaptersState(prev => {
      const filtered = prev.filter(c => c.id !== chapterId);
      // Re-number remaining weeks cleanly for this subject
      let weekSeq = 1;
      const renumbered = filtered.map(c => {
        if ((c.subjectId || 'comm-public-speaking') !== subjectId) return c;
        return { ...c, weekNumber: weekSeq++ };
      });
      safeLocalStorageSet('uppseekers_launchpad_chapters_v1', renumbered);
      void syncDocToFirestore('launchpad', 'chapters', { items: renumbered, updatedAt: now });
      return renumbered;
    });
    const token = localStorage.getItem('auth_token') || 'custom_user';
    fetch(`/api/launchpad/chapters/${encodeURIComponent(chapterId)}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }).catch(console.error);
  };

  const saveLaunchpadCertQuestion = (question: LaunchpadCertQuestionRecord) => {
    const now = new Date().toISOString();
    setLaunchpadCertQuestionsState(prev => {
      const exists = prev.some(q => q.id === question.id);
      const next = exists
        ? prev.map(q => q.id === question.id ? question : q)
        : [...prev, question];
      const sorted = [...next].sort((a, b) => a.sortOrder - b.sortOrder);
      safeLocalStorageSet('uppseekers_launchpad_cert_qs_v1', sorted);
      void syncDocToFirestore('launchpad', 'certQuestions', { items: sorted, updatedAt: now });
      return sorted;
    });
    const token = localStorage.getItem('auth_token') || 'custom_user';
    fetch('/api/launchpad/cert-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(question)
    }).catch(console.error);
  };

  const deleteLaunchpadCertQuestion = (questionId: string) => {
    const now = new Date().toISOString();
    setLaunchpadCertQuestionsState(prev => {
      const next = prev.filter(q => q.id !== questionId);
      safeLocalStorageSet('uppseekers_launchpad_cert_qs_v1', next);
      void syncDocToFirestore('launchpad', 'certQuestions', { items: next, updatedAt: now });
      return next;
    });
    const token = localStorage.getItem('auth_token') || 'custom_user';
    fetch(`/api/launchpad/cert-questions/${encodeURIComponent(questionId)}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }).catch(console.error);
  };

  const assignStudentsToLaunchpad = (studentIds: string[], assignedBy: string) => {
    const now = new Date().toISOString();
    setLaunchpadEnrollmentsState(prev => {
      const existingIds = new Set(prev.map(e => e.studentId));
      const additions: LaunchpadEnrollment[] = studentIds
        .filter(id => !existingIds.has(id))
        .map(studentId => ({ studentId, assignedBy, assignedAt: now }));
      const next = [...prev, ...additions];
      safeLocalStorageSet('uppseekers_launchpad_enrollments_v1', next);
      void syncDocToFirestore('launchpad', 'enrollments', { items: next, updatedAt: now });
      return next;
    });
    const token = localStorage.getItem('auth_token') || 'custom_user';
    fetch('/api/launchpad/enrollments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ studentIds, assignedBy })
    }).catch(console.error);
  };

  const removeStudentFromLaunchpad = (studentId: string) => {
    const now = new Date().toISOString();
    setLaunchpadEnrollmentsState(prev => {
      const next = prev.filter(e => e.studentId !== studentId);
      safeLocalStorageSet('uppseekers_launchpad_enrollments_v1', next);
      void syncDocToFirestore('launchpad', 'enrollments', { items: next, updatedAt: now });
      return next;
    });
    const token = localStorage.getItem('auth_token') || 'custom_user';
    fetch(`/api/launchpad/enrollments/${encodeURIComponent(studentId)}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }).catch(console.error);
  };

  const buildLaunchpadTaskId = (studentId: string, subjectId: string, weekNumber: number) =>
    `LP-TASK-${studentId}-${subjectId}-W${weekNumber}`;

  const toggleLaunchpadSubjectRelease = (studentId: string, subjectId: string, isUnlocked: boolean, unlockedBy?: string) => {
    const now = new Date().toISOString();
    const id = `${studentId}__${subjectId}`;
    setLaunchpadSubjectReleasesState(prev => {
      const exists = prev.some(r => r.id === id);
      const item: LaunchpadSubjectRelease = {
        id,
        studentId,
        subjectId,
        isUnlocked,
        unlockedBy: unlockedBy || 'Counselor',
        unlockedAt: now
      };
      const next = exists ? prev.map(r => r.id === id ? item : r) : [...prev, item];
      safeLocalStorageSet('uppseekers_launchpad_releases_v1', next);
      void syncDocToFirestore('launchpad', 'releases', { items: next, updatedAt: now });
      return next;
    });
    const token = localStorage.getItem('auth_token') || 'custom_user';
    fetch('/api/launchpad/releases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ studentId, subjectId, isUnlocked, unlockedBy: unlockedBy || 'Counselor' })
    }).catch(console.error);

    // Trigger Student Notification + Auto-Create Week 1 To-Do Task when unlocked
    if (isUnlocked) {
      const subject = launchpadSubjects.find(s => s.id === subjectId) || LAUNCHPAD_SUBJECTS.find(s => s.id === subjectId);
      const subjectTitle = subject?.title || 'Launchpad Subject';
      const subjectChapters = launchpadChapters
        .filter(c => (c.subjectId || 'comm-public-speaking') === subjectId)
        .sort((a, b) => a.weekNumber - b.weekNumber);
      const week1 = subjectChapters[0] || (subjectId === 'comm-public-speaking' ? SUBJECT_1_WEEKS[0] : undefined);
      const week1Title = week1?.title || 'Week 1 Module';

      addAppNotification({
        recipientType: 'student',
        recipientId: studentId,
        category: 'LAUNCHPAD',
        title: 'New Launchpad Subject Unlocked',
        message: `New Launchpad Subject Unlocked: ${subjectTitle} is now available.`,
        link: `/student/launchpad?subject=${encodeURIComponent(subjectId)}&week=1`,
        metadataJson: { subjectId, subjectTitle, weekNumber: 1, unlockedBy: unlockedBy || 'Counselor' }
      });

      const student = students.find(s => s.id === studentId);
      if (student) {
        const w1TaskId = buildLaunchpadTaskId(studentId, subjectId, 1);
        const existingTasks = Array.isArray(student.tasks) ? student.tasks : [];
        const hasWeek1Task = existingTasks.some(t => t.id === w1TaskId);
        if (!hasWeek1Task) {
          const newTask: Task = normalizeTask({
            id: w1TaskId,
            name: `${subjectTitle} — Week 1: ${week1Title}`,
            category: 'Launchpad',
            stage: 'TO_DO',
            dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            assignedBy: unlockedBy || student.counselor || 'Launchpad Counselor',
            description: `Launchpad Week 1: Read Guide, Watch Lecture, and submit the Practical Exercise for "${week1Title}".`,
            launchpadMeta: {
              subjectId,
              subjectTitle,
              weekNumber: 1,
              chapterTitle: week1Title,
            }
          }, { studentId: student.id, studentName: student.name });
          updateStudent({
            ...student,
            tasks: [newTask, ...existingTasks]
          });
        }
      }
    }
  };

  const saveLaunchpadWeekProgress = (progressItem: LaunchpadWeekProgress) => {
    const now = new Date().toISOString();
    const id = progressItem.id || `${progressItem.studentId}__${progressItem.subjectId}__w${progressItem.weekNumber}`;
    const nextItem: LaunchpadWeekProgress = { ...progressItem, id, updatedAt: now };
    setLaunchpadProgressState(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const exists = safePrev.some(p => p.id === id);
      const next = exists ? safePrev.map(p => p.id === id ? nextItem : p) : [...safePrev, nextItem];
      safeLocalStorageSet('uppseekers_launchpad_progress_v1', next);
      void syncDocToFirestore('launchpad', 'progress', { items: next, updatedAt: now });
      return next;
    });
    const token = localStorage.getItem('auth_token') || 'custom_user';
    fetch('/api/launchpad/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(nextItem)
    }).catch(console.error);
  };

  const markLaunchpadWeekInProgress = (studentId: string, subjectId: string, weekNumber: number) => {
    const student = students.find(s => s.id === studentId);
    if (!student || !Array.isArray(student.tasks)) return;
    const taskId = buildLaunchpadTaskId(studentId, subjectId, weekNumber);
    const matchingTask = student.tasks.find(
      t => t.id === taskId || (t.launchpadMeta?.subjectId === subjectId && t.launchpadMeta?.weekNumber === weekNumber)
    );
    if (matchingTask && matchingTask.stage === 'TO_DO') {
      const updatedTasks = student.tasks.map(t =>
        t.id === matchingTask.id ? { ...t, stage: 'IN_PROGRESS' as const } : t
      );
      updateStudent({ ...student, tasks: updatedTasks });
    }
  };

  const submitLaunchpadPracticalExercise = ({
    studentId,
    subjectId,
    weekNumber,
    progressItem
  }: {
    studentId: string;
    subjectId: string;
    weekNumber: number;
    progressItem: LaunchpadWeekProgress;
  }) => {
    const now = new Date().toISOString();
    const subject = launchpadSubjects.find(s => s.id === subjectId) || LAUNCHPAD_SUBJECTS.find(s => s.id === subjectId);
    const subjectTitle = subject?.title || 'Launchpad Subject';
    const subjectChapters = launchpadChapters
      .filter(c => (c.subjectId || 'comm-public-speaking') === subjectId)
      .sort((a, b) => a.weekNumber - b.weekNumber);
    const currentChapter = subjectChapters.find(c => c.weekNumber === weekNumber);
    const chapterTitle = currentChapter?.title || `Week ${weekNumber}`;

    // 1. Save progress with Submitted evaluation status
    const enrichedProgress: LaunchpadWeekProgress = {
      ...progressItem,
      exerciseCompleted: true,
      evaluationStatus: 'Submitted',
      updatedAt: now
    };
    saveLaunchpadWeekProgress(enrichedProgress);

    // 2. Sync Task Manager: move current week to SUBMITTED_FOR_REVIEW & queue next week in TO_DO
    const student = students.find(s => s.id === studentId);
    const currentTaskId = buildLaunchpadTaskId(studentId, subjectId, weekNumber);
    if (student) {
      const existingTasks = Array.isArray(student.tasks) ? [...student.tasks] : [];
      const idx = existingTasks.findIndex(
        t => t.id === currentTaskId || (t.launchpadMeta?.subjectId === subjectId && t.launchpadMeta?.weekNumber === weekNumber)
      );
      const attachmentUrl = progressItem.exerciseSubmissionJson?.attachmentUrl || '';
      const attachmentName = progressItem.exerciseSubmissionJson?.attachmentName || '';
      if (idx !== -1) {
        existingTasks[idx] = {
          ...existingTasks[idx],
          stage: 'SUBMITTED_FOR_REVIEW',
          submittedAt: now,
          submissionLink: attachmentUrl || existingTasks[idx].submissionLink,
          attachments: attachmentName
            ? [{ id: `ATT-${Date.now()}`, fileName: attachmentName, fileUrl: attachmentUrl, uploadedAt: now }]
            : existingTasks[idx].attachments,
        };
      } else {
        existingTasks.unshift(
          normalizeTask({
            id: currentTaskId,
            name: `${subjectTitle} — Week ${weekNumber}: ${chapterTitle}`,
            category: 'Launchpad',
            stage: 'SUBMITTED_FOR_REVIEW',
            dueDate: new Date().toISOString().split('T')[0],
            assignedBy: student.counselor || 'Launchpad Counselor',
            submittedAt: now,
            submissionLink: attachmentUrl || undefined,
            description: `Practical exercise submission for ${subjectTitle} Week ${weekNumber}.`,
            launchpadMeta: { subjectId, subjectTitle, weekNumber, chapterTitle }
          }, { studentId: student.id, studentName: student.name })
        );
      }

      // Queue next week's TO_DO task if a subsequent chapter exists
      const nextChapter = subjectChapters.find(c => c.weekNumber > weekNumber);
      if (nextChapter) {
        const nextTaskId = buildLaunchpadTaskId(studentId, subjectId, nextChapter.weekNumber);
        const alreadyHasNext = existingTasks.some(
          t => t.id === nextTaskId || (t.launchpadMeta?.subjectId === subjectId && t.launchpadMeta?.weekNumber === nextChapter.weekNumber)
        );
        if (!alreadyHasNext) {
          existingTasks.unshift(
            normalizeTask({
              id: nextTaskId,
              name: `${subjectTitle} — Week ${nextChapter.weekNumber}: ${nextChapter.title}`,
              category: 'Launchpad',
              stage: 'TO_DO',
              dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
              assignedBy: student.counselor || 'Launchpad Counselor',
              description: `Launchpad Week ${nextChapter.weekNumber}: Read Guide, Watch Lecture, and submit the Practical Exercise for "${nextChapter.title}".`,
              launchpadMeta: {
                subjectId,
                subjectTitle,
                weekNumber: nextChapter.weekNumber,
                chapterTitle: nextChapter.title
              }
            }, { studentId: student.id, studentName: student.name })
          );
        }
      }

      updateStudent({ ...student, tasks: existingTasks });
    }

    // 3. Route submission into Assignment Evaluator queue
    const evalId = `${studentId}__${subjectId}__w${weekNumber}`;
    const fieldLabels: Record<string, string> = {};
    currentChapter?.practicalExercise?.fields?.forEach(f => {
      fieldLabels[f.key] = f.label;
    });
    const evaluationRecord: LaunchpadAssignmentEvaluation = {
      id: evalId,
      sourceType: 'LAUNCHPAD',
      studentId,
      studentName: student?.name || 'Student',
      subjectId,
      subjectTitle,
      weekNumber,
      chapterTitle,
      taskId: currentTaskId,
      submissionJson: {
        ...(progressItem.exerciseSubmissionJson || {}),
        fieldLabels,
        submittedAt: now,
      },
      status: 'Submitted',
      feedback: null,
      evaluatedBy: null,
      submittedAt: now,
      evaluatedAt: null,
    };

    setLaunchpadEvaluationsState(prev => {
      const exists = prev.some(e => e.id === evalId);
      const next = exists
        ? prev.map(e => e.id === evalId ? evaluationRecord : e)
        : [evaluationRecord, ...prev];
      safeLocalStorageSet('uppseekers_launchpad_evals_v1', next);
      void syncDocToFirestore('launchpad', 'evaluations', { items: next, updatedAt: now });
      return next;
    });

    const token = localStorage.getItem('auth_token') || 'custom_user';
    fetch('/api/launchpad/evaluations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(evaluationRecord)
    }).catch(console.error);

    // 4. Send Counselor / Team Notification
    const assignedStaff = staff.find(
      st => student?.counselor && st.name.toLowerCase() === student.counselor.toLowerCase()
    );
    addAppNotification({
      recipientType: 'staff',
      recipientId: assignedStaff?.id || 'ALL_COUNSELORS',
      category: 'LAUNCHPAD',
      title: 'Launchpad Exercise Submitted',
      message: `${student?.name || 'Student'} submitted ${subjectTitle} — Week ${weekNumber} Exercise`,
      link: `/team/evaluator?tab=LAUNCHPAD&evalId=${encodeURIComponent(evalId)}`,
      metadataJson: {
        evalId,
        studentId,
        studentName: student?.name || 'Student',
        counselorName: student?.counselor || '',
        subjectId,
        subjectTitle,
        weekNumber
      }
    });
  };

  const evaluateLaunchpadSubmission = ({
    evalId,
    status,
    feedback,
    evaluatorName
  }: {
    evalId: string;
    status: 'Submitted' | 'Approved' | 'Needs Revision' | 'Reviewed';
    feedback: string;
    evaluatorName: string;
  }) => {
    const now = new Date().toISOString();
    const targetEval = launchpadEvaluations.find(e => e.id === evalId);
    if (!targetEval) return;

    const updatedEval: LaunchpadAssignmentEvaluation = {
      ...targetEval,
      status,
      feedback,
      evaluatedBy: evaluatorName,
      evaluatedAt: now
    };

    setLaunchpadEvaluationsState(prev => {
      const next = prev.map(e => e.id === evalId ? updatedEval : e);
      safeLocalStorageSet('uppseekers_launchpad_evals_v1', next);
      void syncDocToFirestore('launchpad', 'evaluations', { items: next, updatedAt: now });
      return next;
    });

    const token = localStorage.getItem('auth_token') || 'custom_user';
    fetch('/api/launchpad/evaluations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(updatedEval)
    }).catch(console.error);

    // Sync back to Launchpad week progress
    const safeProgress = Array.isArray(launchpadProgress) ? launchpadProgress : [];
    const existingProg = safeProgress.find(
      p => p.studentId === targetEval.studentId && p.subjectId === targetEval.subjectId && p.weekNumber === targetEval.weekNumber
    );
    saveLaunchpadWeekProgress({
      id: evalId,
      studentId: targetEval.studentId,
      subjectId: targetEval.subjectId,
      weekNumber: targetEval.weekNumber,
      lectureCompleted: existingProg?.lectureCompleted ?? false,
      readingCompleted: existingProg?.readingCompleted ?? false,
      exerciseSubmissionJson: existingProg?.exerciseSubmissionJson ?? targetEval.submissionJson ?? null,
      exerciseCompleted: status !== 'Needs Revision' ? true : (existingProg?.exerciseCompleted ?? true),
      evaluationStatus: status,
      evaluatorFeedback: feedback,
      evaluatedBy: evaluatorName,
      evaluatedAt: now,
    });

    // Sync back to Student's Task Manager item
    const student = students.find(s => s.id === targetEval.studentId);
    if (student && Array.isArray(student.tasks)) {
      const nextStage: Task['stage'] =
        status === 'Needs Revision'
          ? 'NEEDS_REVISION'
          : status === 'Approved' || status === 'Reviewed'
          ? 'COMPLETED'
          : 'SUBMITTED_FOR_REVIEW';
      const taskId = buildLaunchpadTaskId(targetEval.studentId, targetEval.subjectId, targetEval.weekNumber);
      const updatedTasks = student.tasks.map(t => {
        if (
          t.id === taskId ||
          t.id === targetEval.taskId ||
          (t.launchpadMeta?.subjectId === targetEval.subjectId && t.launchpadMeta?.weekNumber === targetEval.weekNumber)
        ) {
          return {
            ...t,
            stage: nextStage,
            feedback: feedback || t.feedback,
          };
        }
        return t;
      });
      updateStudent({ ...student, tasks: updatedTasks });
    }

    // Notify student of counselor evaluation
    addAppNotification({
      recipientType: 'student',
      recipientId: targetEval.studentId,
      category: 'LAUNCHPAD',
      title: `Launchpad Exercise ${status}`,
      message: `${targetEval.subjectTitle} — Week ${targetEval.weekNumber} was marked "${status}" by ${evaluatorName}.`,
      link: `/student/launchpad?subject=${encodeURIComponent(targetEval.subjectId)}&week=${targetEval.weekNumber}`,
      metadataJson: {
        evalId,
        subjectId: targetEval.subjectId,
        weekNumber: targetEval.weekNumber,
        status,
        feedback
      }
    });
  };

  const saveLaunchpadCertification = (cert: LaunchpadCertification) => {
    const now = new Date().toISOString();
    const id = cert.id || `${cert.studentId}__${cert.subjectId}`;
    const nextCert: LaunchpadCertification = { ...cert, id, issuedAt: cert.issuedAt || now };
    setLaunchpadCertificationsState(prev => {
      const exists = prev.some(c => c.id === id);
      const next = exists ? prev.map(c => c.id === id ? nextCert : c) : [...prev, nextCert];
      safeLocalStorageSet('uppseekers_launchpad_certs_v1', next);
      void syncDocToFirestore('launchpad', 'certifications', { items: next, updatedAt: now });
      return next;
    });
    const token = localStorage.getItem('auth_token') || 'custom_user';
    fetch('/api/launchpad/certifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(nextCert)
    }).catch(console.error);
  };

  const initializeData = async (token: string) => {
    try {
      const response = await fetch('/api/data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Also hydrate Launchpad state from Cloud SQL if available
      fetch('/api/launchpad/state', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.ok ? r.json() : null).then(lpData => {
        if (lpData) {
          if (Array.isArray(lpData.subjects)) {
            const mappedSubjects: LaunchpadSubject[] = lpData.subjects.map((s: any) => ({
              id: s.id,
              order: s.sortOrder ?? s.order ?? 1,
              title: s.title,
              description: s.description || '',
              accentHex: s.accentHex || '#4F46E5',
              surfaceTint: s.surfaceTint || '#EEF2FF',
              iconKey: s.iconKey || 'comm-public-speaking',
              customIconUrl: s.customIconUrl || undefined,
              hasCurriculum: Boolean(s.hasCurriculum),
              courseGoal: s.courseGoal || undefined,
              passingThreshold: s.passingThreshold ?? 75,
              certificateTitle: s.certificateTitle || undefined,
              isArchived: Boolean(s.isArchived),
            }));
            const mergedSubjects = mergeLaunchpadSubjectsWithDefaults(mappedSubjects);
            setLaunchpadSubjectsState(mergedSubjects);
            safeLocalStorageSet('uppseekers_launchpad_subjects_v1', mergedSubjects);
          }
          if (Array.isArray(lpData.chapters)) {
            const mappedChapters: LaunchpadWeekModule[] = lpData.chapters.map((c: any) => ({
              id: c.id,
              subjectId: c.subjectId,
              weekNumber: c.weekNumber,
              title: c.title,
              learningObjectives: c.learningObjectives || [],
              lecture: c.lectureJson || c.lecture || { title: '', speaker: '', url: '', duration: '', focusNote: '' },
              readingGuide: c.readingGuideJson || c.readingGuide || { title: c.title, readTime: '5 min read', summary: '', sections: [] },
              practicalExercise: c.practicalExerciseJson || c.practicalExercise || { title: '', scenario: '', selfCheckCriteria: [], fields: [] },
            }));
            const mergedChapters = mergeLaunchpadChaptersWithDefaults(mappedChapters);
            setLaunchpadChaptersState(mergedChapters);
            safeLocalStorageSet('uppseekers_launchpad_chapters_v1', mergedChapters);
          }
          if (Array.isArray(lpData.certQuestions)) {
            const mappedQs: LaunchpadCertQuestionRecord[] = lpData.certQuestions.map((q: any) => ({
              id: q.id,
              subjectId: q.subjectId,
              questionType: q.questionType,
              sortOrder: q.sortOrder ?? 1,
              payload: q.payloadJson || q.payload || {},
            }));
            const mergedQs = mergeLaunchpadCertQuestionsWithDefaults(mappedQs);
            setLaunchpadCertQuestionsState(mergedQs);
            safeLocalStorageSet('uppseekers_launchpad_cert_qs_v1', mergedQs);
          }
          if (Array.isArray(lpData.permissions) && lpData.permissions.length > 0) {
            setLaunchpadPermissionsState(lpData.permissions);
            safeLocalStorageSet('uppseekers_launchpad_perms_v1', lpData.permissions);
          }
          if (Array.isArray(lpData.enrollments) && lpData.enrollments.length > 0) {
            setLaunchpadEnrollmentsState(lpData.enrollments);
            safeLocalStorageSet('uppseekers_launchpad_enrollments_v1', lpData.enrollments);
          }
          if (Array.isArray(lpData.releases) && lpData.releases.length > 0) {
            setLaunchpadSubjectReleasesState(lpData.releases);
            safeLocalStorageSet('uppseekers_launchpad_releases_v1', lpData.releases);
          }
          if (Array.isArray(lpData.progress) && lpData.progress.length > 0) {
            setLaunchpadProgressState(lpData.progress);
            safeLocalStorageSet('uppseekers_launchpad_progress_v1', lpData.progress);
          }
          if (Array.isArray(lpData.certifications) && lpData.certifications.length > 0) {
            setLaunchpadCertificationsState(lpData.certifications);
            safeLocalStorageSet('uppseekers_launchpad_certs_v1', lpData.certifications);
          }
          if (Array.isArray(lpData.evaluations) && lpData.evaluations.length > 0) {
            setLaunchpadEvaluationsState(lpData.evaluations);
            safeLocalStorageSet('uppseekers_launchpad_evals_v1', lpData.evaluations);
          }
          if (Array.isArray(lpData.notifications) && lpData.notifications.length > 0) {
            const mappedNotifs: AppNotification[] = lpData.notifications.map((n: any) => ({
              id: n.id,
              recipientType: n.recipientType,
              recipientId: n.recipientId,
              title: n.title,
              message: n.message,
              category: n.category || 'LAUNCHPAD',
              link: n.link || '/student/launchpad',
              metadataJson: n.metadataJson || n.metadata || {},
              isRead: Boolean(n.isRead),
              createdAt: n.createdAt || new Date().toISOString(),
            }));
            setAppNotificationsState(mappedNotifs);
            safeLocalStorageSet('uppseekers_notifications_v1', mappedNotifs);
          }
        }
      }).catch(() => {});

      if (response.ok) {
        const data = await response.json();
        let hydratedStudents: Student[] = [];
        let hydratedStaff: StaffMember[] = [];

        if (Array.isArray(data.students) && data.students.length > 0) {
          hydratedStudents = data.students.map((raw: any) => {
            const s = { ...raw } as Student;
            if (!s.intake) s.intake = 'Fall 2026';
            if (!Array.isArray(s.tasks)) s.tasks = [];
            if (!Array.isArray(s.activities)) s.activities = [];
            if (!Array.isArray(s.documents)) s.documents = [];
            if (!Array.isArray(s.shortlist)) s.shortlist = [];
            if (!Array.isArray(s.countries)) s.countries = ['USA'];
            if (!s.operationalLogs || s.operationalLogs.length === 0) {
              s.operationalLogs = getDefaultOperationalLogsForStudent(s.id, s.name, s.counselor);
            }
            if (s.phone && typeof s.phone === 'string' && s.phone.includes('|')) {
              s.phone = s.phone.split('|')[0].trim();
            }
            s.tasks = s.tasks.map((t) => normalizeTask(t, { studentId: s.id, studentName: s.name }));
            s.activities = s.activities.map((a) => normalizeActivity(a, { studentId: s.id, studentName: s.name }));
            return s;
          });
          setStudentsState(hydratedStudents);
          safeLocalStorageSet('uppseekers_students_v2', sanitizeStudentsForLocalStorage(hydratedStudents));
        }

        if (Array.isArray(data.staff) && data.staff.length > 0) {
          hydratedStaff = data.staff;
          setStaffState(hydratedStaff);
          safeLocalStorageSet('uppseekers_staff_v2', hydratedStaff);
        }

        if (Array.isArray(data.batches) && data.batches.length > 0) {
          setBatchesState(data.batches);
          safeLocalStorageSet('uppseekers_batches_v2', data.batches);
        }

        if (Array.isArray(data.events) && data.events.length > 0) {
          setEventsState(data.events);
          safeLocalStorageSet('uppseekers_events_v2', data.events);
        }

        if (data.permissionsMatrix && typeof data.permissionsMatrix === 'object') {
          const mergedPerms = mergePermissionsWithDefaults(data.permissionsMatrix);
          setPermissionsMatrixState(mergedPerms);
          safeLocalStorageSet('uppseekers_permissions_v2', mergedPerms);
        }

        // Sync active currentUser session with fresh server profile/role data
        setCurrentUser(prev => {
          if (!prev) return prev;
          const prevEmail = (prev.email || '').trim().toLowerCase();
          const prevId = (prev.id || '').trim();
          const isPrevStudent = (prev.role || '').toUpperCase() === 'STUDENT';

          if (isPrevStudent && hydratedStudents.length > 0) {
            const matchedStu = hydratedStudents.find(
              s =>
                (prevId && s.id === prevId) ||
                (prevEmail && (s.email || '').trim().toLowerCase() === prevEmail)
            );
            if (matchedStu) {
              return {
                ...prev,
                ...matchedStu,
                role: 'STUDENT',
                status: 'Active',
              } as any;
            }
          } else if (!isPrevStudent && hydratedStaff.length > 0) {
            const matchedStaff = hydratedStaff.find(
              st =>
                (prevId && (st.id === prevId || (prevId === '1' && st.id === 'admin-1') || (prevId === 'admin-1' && st.id === '1'))) ||
                (prevEmail && (st.email || '').trim().toLowerCase() === prevEmail)
            );
            if (matchedStaff) {
              return { ...prev, ...matchedStaff };
            }
          }
          return prev;
        });

        return data;
      }
    } catch (e) {
      console.error('Failed to initialize data from server', e);
    }
    return null;
  };

  return (
    <DatabaseContext.Provider value={{
      students,
      setStudents,
      updateStudent,
      getStudent,
      staff,
      setStaff,
      currentUser,
      setCurrentUser,
      isAuthenticated,
      setIsAuthenticated,
      permissionsMatrix: permissionsMatrixState,
      setPermissionsMatrix,
      roles,
      batches,
      setBatches,
      events,
      setEvents,
      initializeData,
      launchpadPermissions: Array.isArray(launchpadPermissions) ? launchpadPermissions : [],
      setLaunchpadPermission,
      launchpadSubjects: Array.isArray(launchpadSubjects) ? launchpadSubjects : [],
      saveLaunchpadSubject,
      deleteLaunchpadSubject,
      launchpadChapters: Array.isArray(launchpadChapters) ? launchpadChapters : [],
      saveLaunchpadChapter,
      reorderLaunchpadChapters,
      deleteLaunchpadChapter,
      launchpadCertQuestions: Array.isArray(launchpadCertQuestions) ? launchpadCertQuestions : [],
      saveLaunchpadCertQuestion,
      deleteLaunchpadCertQuestion,
      launchpadEnrollments: Array.isArray(launchpadEnrollments) ? launchpadEnrollments : [],
      assignStudentsToLaunchpad,
      removeStudentFromLaunchpad,
      launchpadSubjectReleases: Array.isArray(launchpadSubjectReleases) ? launchpadSubjectReleases : [],
      toggleLaunchpadSubjectRelease,
      launchpadProgress: Array.isArray(launchpadProgress) ? launchpadProgress : [],
      saveLaunchpadWeekProgress,
      markLaunchpadWeekInProgress,
      submitLaunchpadPracticalExercise,
      launchpadCertifications: Array.isArray(launchpadCertifications) ? launchpadCertifications : [],
      saveLaunchpadCertification,
      launchpadEvaluations: Array.isArray(launchpadEvaluations) ? launchpadEvaluations : [],
      evaluateLaunchpadSubmission,
      appNotifications: Array.isArray(appNotifications) ? appNotifications : [],
      addAppNotification,
      markAppNotificationRead,
      firestoreStatus,
      signInWithGoogle,
      signOutAll,
      conversations: Array.isArray(conversations) ? conversations : [],
      sendConversationMessage
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (context === undefined) throw new Error('useDatabase must be used within a DatabaseProvider');
  return context;
};
