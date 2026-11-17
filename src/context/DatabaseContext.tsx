import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
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
  ConversationMessage,
} from '@/types';
import {
  LaunchpadSubject,
  LaunchpadWeekModule,
  LaunchpadCertQuestionRecord,
  LAUNCHPAD_SUBJECTS,
  SUBJECT_1_WEEKS,
  buildDefaultLaunchpadSubjects,
  buildDefaultLaunchpadChapters,
  buildDefaultCertQuestions,
} from '@/data/launchpadData';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import {
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  db,
  auth,
  getProvisionerAuth,
  getFirebaseIdToken,
  normalizeEmail,
  normalizeEmailKey,
  toValidDocId,
  OperationType,
  buildFirestoreErrorInfo,
  testFirestoreConnection,
} from '@/lib/firebase';
import { normalizeTask, normalizeActivity } from '@/lib/taskActivityUtils';
import { isUserAdmin, canStaffAccessAllStudents } from '@/lib/staffPermissions';

type Scope = 'Global Scope' | 'Assigned Scope' | 'Read-Only Scope' | 'Enabled' | 'None' | null;

const BOOTSTRAP_ADMIN_EMAIL = 'uppseekers@gmail.com';

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
  studentIds?: string[];
  location: string;
  notes?: string;
  assignments?: string;
  host?: string;
  organiser?: string;
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
    ],
  },
  {
    id: 'profile',
    title: '1. PROFILE TAB & STUDENT DATABASE CONTROLS',
    items: [
      { id: 'view_roster', name: 'View Student List & Roster', enabled: true, scope: 'Assigned Scope' },
      { id: 'add_student', name: 'Add New Student Profile (+ Onboarding Form)', enabled: false, scope: null },
      { id: 'edit_student', name: 'Edit Student Personal & Academic Details', enabled: true, scope: 'Assigned Scope' },
      { id: 'view_history', name: 'View Student Chronological Activity History', enabled: true, scope: 'Assigned Scope' },
    ],
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
    ],
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
    ],
  },
  {
    id: 'shortlist',
    title: '4. UNIVERSITY SHORTLISTING & READINESS ENGINE',
    items: [
      { id: 'add_uni', name: 'Add / Remove Target Universities', enabled: true, scope: 'Assigned Scope' },
      { id: 'set_deadlines', name: 'Set Application Deadlines & Target Categories', enabled: true, scope: null },
      { id: 'set_docs', name: 'Set & Modify University Required Documents List', enabled: true, scope: null },
      { id: 'override_readiness', name: 'Override Application Readiness Progress (%)', enabled: true, scope: null },
    ],
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
    ],
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
    ],
  },
  {
    id: 'tasks',
    title: '7. TASK & PROJECT MANAGER',
    items: [
      { id: 'assign_tasks', name: 'Assign Tasks (Internships, Research, MOOCs, etc)', enabled: true, scope: 'Assigned Scope' },
      { id: 'set_task_due', name: 'Set Due Dates & Upload Guidelines', enabled: true, scope: null },
      { id: 'review_task', name: 'Review Submitted Proof Docs & External Links', enabled: true, scope: null },
      { id: 'complete_task', name: 'Mark Tasks as "Completed & Verified"', enabled: true, scope: null },
    ],
  },
  {
    id: 'reports',
    title: '8. REPORTS & ANALYTICS CENTER',
    items: [
      { id: 'view_meeting_reports', name: 'View Meeting Notes & Session MOM Reports', enabled: true, scope: 'Assigned Scope' },
      { id: 'view_activity_audit', name: 'View Staff Activity & Operational Audit Logs', enabled: true, scope: 'Assigned Scope' },
      { id: 'export_reports_csv', name: 'Export Reports Data to CSV Spreadsheets', enabled: false, scope: null },
    ],
  },
  {
    id: 'admin',
    title: '9. ADMIN SETTINGS & SYSTEM CONTROLS (Strictly Admin Only)',
    items: [
      { id: 'staff_onboard', name: 'Access Staff Onboarding & Admin Panel', enabled: false, scope: null },
      { id: 'mod_perms', name: 'Modify Access & Permissions Settings', enabled: false, scope: null },
      { id: 'dev_api', name: 'Developer API Keys, Webhooks & System Logs', enabled: false, scope: null },
    ],
  },
  {
    id: 'launchpad',
    title: '10. LAUNCHPAD ACCESS & CURRICULUM CONTROLS',
    items: [
      { id: 'launchpad_student_tab_access', name: 'Tab for Students Access', enabled: true, scope: 'Assigned Scope' },
      { id: 'launchpad_review_exercise_access', name: 'Review Submitted Exercise Access', enabled: true, scope: 'Assigned Scope' },
      { id: 'launchpad_edit_curriculum_access', name: 'Create & Edit Subjects/Chapters Access', enabled: false, scope: 'None' },
    ],
  },
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
  'CATEGORY_MANAGER',
];

const defaultPermissionsMatrix: Record<string, PermissionCategory[]> = roles.reduce((acc, role) => {
  const clonedTemplate = JSON.parse(JSON.stringify(permissionCategoriesTemplate)) as PermissionCategory[];

  if (role === 'SYSTEM_ADMIN') {
    clonedTemplate.forEach((cat) => {
      cat.items.forEach((item) => {
        item.enabled = true;
        if (item.id === 'launchpad_edit_curriculum_access') {
          item.scope = 'Enabled';
        } else if (item.scope) {
          item.scope = 'Global Scope';
        }
      });
    });
  } else if (role === 'CATEGORY_MANAGER' || role === 'OPERATIONS_LEAD') {
    clonedTemplate.forEach((cat) => {
      if (cat.id === 'admin') {
        cat.items.forEach((item) => {
          item.enabled = false;
          if (item.scope) item.scope = null;
        });
      } else if (cat.id === 'tab_visibility') {
        cat.items.forEach((item) => {
          item.enabled = item.id !== 'tab_settings';
        });
      } else {
        cat.items.forEach((item) => {
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
    clonedTemplate.forEach((cat) => {
      if (cat.id === 'admin') {
        cat.items.forEach((item) => {
          item.enabled = item.id === 'dev_api';
        });
      } else if (cat.id === 'tab_visibility') {
        cat.items.forEach((item) => {
          item.enabled = item.id !== 'tab_settings';
        });
      } else {
        cat.items.forEach((item) => {
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
    clonedTemplate.forEach((cat) => {
      if (cat.id === 'admin') {
        cat.items.forEach((item) => {
          item.enabled = false;
          if (item.scope) item.scope = null;
        });
      } else if (cat.id === 'tab_visibility') {
        cat.items.forEach((item) => {
          item.enabled = item.id !== 'tab_settings';
        });
      } else if (cat.id === 'reports') {
        cat.items.forEach((item) => {
          item.enabled = true;
          if (item.scope) item.scope = 'Assigned Scope';
        });
      } else if (cat.id === 'launchpad') {
        cat.items.forEach((item) => {
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
    clonedTemplate.forEach((cat) => {
      if (cat.id === 'admin' || cat.id === 'reports') {
        cat.items.forEach((item) => {
          item.enabled = false;
          if (item.scope) item.scope = null;
        });
      } else if (cat.id === 'tab_visibility') {
        cat.items.forEach((item) => {
          item.enabled = !['tab_settings', 'tab_reports', 'tab_launchpad'].includes(item.id);
        });
      } else if (cat.id === 'launchpad') {
        cat.items.forEach((item) => {
          item.enabled = false;
          item.scope = 'None';
        });
      }
    });
  } else {
    clonedTemplate.forEach((cat) => {
      if (cat.id === 'admin') {
        cat.items.forEach((item) => {
          item.enabled = false;
          if (item.scope) item.scope = null;
        });
      } else if (cat.id === 'tab_visibility') {
        cat.items.forEach((item) => {
          item.enabled = item.id !== 'tab_settings';
        });
      }
    });
  }

  acc[role] = clonedTemplate;
  return acc;
}, {} as Record<string, PermissionCategory[]>);

export const getDefaultOperationalLogsForStudent = (
  studentId: string,
  studentName: string,
  counselor?: string
): OperationalLog[] => {
  return [
    {
      id: `LOG-${studentId}-1`,
      timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      performedBy: counselor || 'Admissions Team',
      role: 'COUNSELOR',
      studentId,
      activityType: 'Counselor Guidance Note',
      description: `Portal profile initialized for ${studentName}.`,
    },
  ];
};

function stripUndefinedAndNulls(obj: any): any {
  if (obj === undefined || obj === null) return undefined;
  if (typeof obj === 'string') {
    if (obj.startsWith('data:') && obj.length > 40000) {
      return '';
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(stripUndefinedAndNulls).filter((v) => v !== undefined);
  }
  if (typeof obj === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'password') continue; // NEVER persist plaintext passwords
      const cleaned = stripUndefinedAndNulls(v);
      if (cleaned !== undefined) {
        out[k] = cleaned;
      }
    }
    return out;
  }
  return obj;
}

function stripPasswordField<T extends Record<string, any>>(record: T): T {
  if (!record || typeof record !== 'object') return record;
  const { password: _removed, ...rest } = record;
  return rest as T;
}

export interface ProvisionUserResult {
  ok: boolean;
  uid?: string;
  method?: 'admin_sdk' | 'client_provisioner' | 'reset_email';
  error?: string;
}

export interface PasswordResetResult {
  ok: boolean;
  mode?: 'direct' | 'reset_email';
  error?: string;
}

interface DatabaseContextType {
  students: Student[];
  setStudents: (students: Student[]) => void;
  updateStudent: (student: Student) => Promise<void>;
  getStudent: (id: string) => Student | undefined;
  staff: StaffMember[];
  setStaff: (staff: StaffMember[]) => void;
  currentUser: StaffMember | null;
  setCurrentUser: (user: StaffMember | null | ((prev: StaffMember | null) => StaffMember | null)) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
  isFirebaseAuthReady: boolean;
  authError: string | null;
  clearAuthError: () => void;
  permissionsMatrix: Record<string, PermissionCategory[]>;
  setPermissionsMatrix: (matrix: Record<string, PermissionCategory[]>) => void;
  roles: string[];
  batches: Batch[];
  events: EventItem[];
  setEvents: (events: EventItem[]) => Promise<void>;
  setBatches: (batches: Batch[]) => Promise<void>;
  initializeData: () => Promise<void>;
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
  saveLaunchpadSubject: (subject: LaunchpadSubject) => Promise<void>;
  deleteLaunchpadSubject: (subjectId: string) => Promise<void>;
  launchpadChapters: LaunchpadWeekModule[];
  saveLaunchpadChapter: (chapter: LaunchpadWeekModule) => Promise<void>;
  reorderLaunchpadChapters: (subjectId: string, orderedChapterIds: string[]) => Promise<void>;
  deleteLaunchpadChapter: (chapterId: string, subjectId: string) => Promise<void>;
  launchpadCertQuestions: LaunchpadCertQuestionRecord[];
  saveLaunchpadCertQuestion: (question: LaunchpadCertQuestionRecord) => Promise<void>;
  deleteLaunchpadCertQuestion: (questionId: string) => Promise<void>;
  launchpadEnrollments: LaunchpadEnrollment[];
  assignStudentsToLaunchpad: (studentIds: string[], assignedBy: string) => Promise<void>;
  removeStudentFromLaunchpad: (studentId: string) => Promise<void>;
  launchpadSubjectReleases: LaunchpadSubjectRelease[];
  toggleLaunchpadSubjectRelease: (
    studentId: string,
    subjectId: string,
    isUnlocked: boolean,
    unlockedBy?: string,
    studentEmail?: string
  ) => Promise<boolean>;
  launchpadProgress: LaunchpadWeekProgress[];
  saveLaunchpadWeekProgress: (progressItem: LaunchpadWeekProgress) => Promise<void>;
  markLaunchpadWeekInProgress: (studentId: string, subjectId: string, weekNumber: number) => void;
  submitLaunchpadPracticalExercise: (params: {
    studentId: string;
    subjectId: string;
    weekNumber: number;
    progressItem: LaunchpadWeekProgress;
  }) => Promise<void>;
  launchpadCertifications: LaunchpadCertification[];
  saveLaunchpadCertification: (cert: LaunchpadCertification) => Promise<void>;
  launchpadEvaluations: LaunchpadAssignmentEvaluation[];
  evaluateLaunchpadSubmission: (params: {
    evalId: string;
    status: 'Submitted' | 'Approved' | 'Needs Revision' | 'Reviewed';
    feedback: string;
    evaluatorName: string;
  }) => Promise<void>;
  appNotifications: AppNotification[];
  addAppNotification: (notif: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'> & { id?: string }) => Promise<void>;
  markAppNotificationRead: (notifId: string) => Promise<void>;
  firestoreStatus: 'idle' | 'connected' | 'permission-denied' | 'error';
  provisionPortalUser: (params: {
    name: string;
    email: string;
    password: string;
    role: string;
    userType: 'student' | 'staff';
  }) => Promise<ProvisionUserResult>;
  resetPortalUserPassword: (params: {
    email: string;
    name?: string;
    newPassword?: string;
    userType?: 'student' | 'staff';
  }) => Promise<PasswordResetResult>;
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

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

function calculateReadiness(student: Student): number {
  let totalPoints = 0;
  let possiblePoints = 0;

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
    const uniProgress = totalReqDocs > 0 ? attachedCount / totalReqDocs : 0.5;
    totalPoints += uniProgress * 25;
    possiblePoints += 25;
  } else {
    possiblePoints += 25;
  }

  if (student.essays && student.essays.length > 0) {
    const approved = student.essays.filter((e) => e.status?.toLowerCase() === 'approved').length;
    totalPoints += (approved / student.essays.length) * 25;
    possiblePoints += 25;
  } else {
    possiblePoints += 25;
  }

  if (student.tasks && student.tasks.length > 0) {
    const completed = student.tasks.filter((t) => t.stage === 'COMPLETED').length;
    totalPoints += (completed / student.tasks.length) * 25;
    possiblePoints += 25;
  } else {
    possiblePoints += 25;
  }

  if (student.documents && student.documents.length > 0) {
    const verified = student.documents.filter((d) => d.status?.toLowerCase() === 'verified').length;
    totalPoints += (verified / student.documents.length) * 25;
    possiblePoints += 25;
  } else {
    possiblePoints += 25;
  }

  const calculated = Math.round(totalPoints);
  if (
    calculated === 0 &&
    !student.essays?.length &&
    !student.tasks?.length &&
    !student.documents?.length &&
    !student.shortlist?.length
  ) {
    return student.readiness || 0;
  }

  return calculated;
}

export const DatabaseProvider = ({ children }: { children: ReactNode }) => {
  const [students, setStudentsState] = useState<Student[]>([]);
  const [staff, setStaffState] = useState<StaffMember[]>([]);
  const [batches, setBatchesState] = useState<Batch[]>([]);
  const [events, setEventsState] = useState<EventItem[]>([]);
  const [conversations, setConversationsState] = useState<Conversation[]>([]);

  const [permissionsMatrixState, setPermissionsMatrixState] =
    useState<Record<string, PermissionCategory[]>>(defaultPermissionsMatrix);

  const [launchpadPermissions, setLaunchpadPermissionsState] = useState<LaunchpadTeamPermission[]>([]);
  const [launchpadSubjects, setLaunchpadSubjectsState] = useState<LaunchpadSubject[]>(() =>
    buildDefaultLaunchpadSubjects()
  );
  const [launchpadChapters, setLaunchpadChaptersState] = useState<LaunchpadWeekModule[]>(() =>
    buildDefaultLaunchpadChapters()
  );
  const [launchpadCertQuestions, setLaunchpadCertQuestionsState] = useState<LaunchpadCertQuestionRecord[]>(() =>
    buildDefaultCertQuestions()
  );
  const [launchpadEnrollments, setLaunchpadEnrollmentsState] = useState<LaunchpadEnrollment[]>([]);
  const [launchpadSubjectReleases, setLaunchpadSubjectReleasesState] = useState<LaunchpadSubjectRelease[]>([]);
  const [launchpadProgress, setLaunchpadProgressState] = useState<LaunchpadWeekProgress[]>([]);
  const [launchpadCertifications, setLaunchpadCertificationsState] = useState<LaunchpadCertification[]>([]);
  const [launchpadEvaluations, setLaunchpadEvaluationsState] = useState<LaunchpadAssignmentEvaluation[]>([]);
  const [appNotifications, setAppNotificationsState] = useState<AppNotification[]>([]);

  const [currentUser, setCurrentUserState] = useState<StaffMember | null>(null);
  const [isAuthenticated, setIsAuthenticatedState] = useState<boolean>(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(() => auth.currentUser);
  const [isFirebaseAuthReady, setIsFirebaseAuthReady] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [firestoreStatus, setFirestoreStatus] = useState<'idle' | 'connected' | 'permission-denied' | 'error'>('idle');

  const seededCatalogRef = useRef<boolean>(false);

  const setCurrentUser = (
    userOrFn: StaffMember | null | ((prev: StaffMember | null) => StaffMember | null)
  ) => {
    setCurrentUserState((prev) => (typeof userOrFn === 'function' ? userOrFn(prev) : userOrFn));
  };

  const setIsAuthenticated = (val: boolean) => {
    setIsAuthenticatedState(val);
  };

  const clearAuthError = () => setAuthError(null);

  const mergePermissionsWithDefaults = (parsed: any): Record<string, PermissionCategory[]> => {
    const merged: Record<string, PermissionCategory[]> = JSON.parse(JSON.stringify(defaultPermissionsMatrix));
    if (parsed && typeof parsed === 'object') {
      for (const role of Object.keys(merged)) {
        const parsedCategories = parsed[role];
        if (Array.isArray(parsedCategories)) {
          const templateCats = JSON.parse(JSON.stringify(defaultPermissionsMatrix[role])) as PermissionCategory[];
          const updatedCats = templateCats.map((tCat) => {
            const foundCat = parsedCategories.find((c: any) => c.id === tCat.id);
            if (!foundCat) {
              if (tCat.id === 'tab_visibility') {
                const findSavedItem = (catId: string, itemId: string) => {
                  const cat = parsedCategories.find((c: any) => c.id === catId);
                  return cat?.items?.find((i: any) => i.id === itemId);
                };
                const derivedItems = tCat.items.map((tItem) => {
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
            const updatedItems = tCat.items.map((tItem) => {
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
        const adminCat = catList.find((c) => c.id === 'admin');
        if (adminCat) {
          adminCat.items.forEach((item) => {
            item.enabled = false;
            if (item.scope) item.scope = null;
          });
        }
        const tabVisCat = catList.find((c) => c.id === 'tab_visibility');
        const settingsTab = tabVisCat?.items.find((i) => i.id === 'tab_settings');
        if (settingsTab) {
          settingsTab.enabled = false;
        }
      } else {
        const tabVisCat = catList.find((c) => c.id === 'tab_visibility');
        const settingsTab = tabVisCat?.items.find((i) => i.id === 'tab_settings');
        if (settingsTab) {
          settingsTab.enabled = true;
        }
      }
      if (['RESEARCH_GUIDE', 'SAT_MATH_FACULTY', 'SAT_VERBAL_FACULTY', 'UNIVERSITY_MENTOR'].includes(roleName)) {
        const reportsCat = catList.find((c) => c.id === 'reports');
        if (reportsCat) {
          reportsCat.items.forEach((item) => {
            item.enabled = false;
            item.scope = null;
          });
        }
      }
    }

    if (merged['CATEGORY_MANAGER'] && Array.isArray(merged['CATEGORY_MANAGER'])) {
      merged['CATEGORY_MANAGER'].forEach((cat) => {
        if (cat && cat.id !== 'admin' && cat.id !== 'tab_visibility' && Array.isArray(cat.items)) {
          cat.items.forEach((item) => {
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

  // Compute authorized viewer emails (always includes bootstrap admin, global-access staff, assigned staff, and student)
  const getGlobalStaffEmails = (
    staffList: StaffMember[] = staff,
    matrix: Record<string, PermissionCategory[]> = permissionsMatrixState
  ): string[] => {
    const set = new Set<string>([BOOTSTRAP_ADMIN_EMAIL]);
    for (const st of staffList || []) {
      const em = normalizeEmail(st?.email);
      if (!em) continue;
      if (String(st.status || 'Active').toLowerCase() === 'suspended') continue;
      if (isUserAdmin(st) || canStaffAccessAllStudents(st, matrix)) {
        set.add(em);
      }
    }
    return Array.from(set);
  };

  const computeStudentViewerEmails = (
    student?: Partial<Student> | null,
    staffList: StaffMember[] = staff,
    matrix: Record<string, PermissionCategory[]> = permissionsMatrixState,
    batchesList: Batch[] = batches
  ): string[] => {
    const emails = new Set<string>(getGlobalStaffEmails(staffList, matrix));
    const stuEmail = normalizeEmail(student?.email);
    if (stuEmail) emails.add(stuEmail);

    const assignedNamesOrIds = [
      student?.counselor,
      student?.researchMentor,
      student?.satMathMentor,
      student?.satVerbalMentor,
      (student as any)?.universityMentor,
    ]
      .map((v) => String(v || '').trim().toLowerCase())
      .filter(Boolean);

    for (const st of staffList || []) {
      const stEmail = normalizeEmail(st?.email);
      if (!stEmail) continue;
      const stName = String(st?.name || '').trim().toLowerCase();
      const stId = String(st?.id || '').trim().toLowerCase();
      if (
        assignedNamesOrIds.some(
          (val) => val === stName || val === stEmail || val === stId || (stName.length > 2 && val.includes(stName))
        )
      ) {
        emails.add(stEmail);
      }
    }

    // Include mentors from batches that contain this student
    const stuId = String(student?.id || '').trim();
    for (const b of batchesList || []) {
      const inBatch =
        Array.isArray(b.students) &&
        b.students.some((sid) => sid === stuId || normalizeEmail(sid) === stuEmail);
      if (inBatch && Array.isArray(b.mentors)) {
        for (const m of b.mentors) {
          const cleanM = String(m || '').trim().toLowerCase();
          const matchedStaff = (staffList || []).find(
            (st) =>
              normalizeEmail(st.email) === cleanM ||
              String(st.name || '').trim().toLowerCase() === cleanM ||
              String(st.id || '').trim().toLowerCase() === cleanM
          );
          if (matchedStaff?.email) emails.add(normalizeEmail(matchedStaff.email));
        }
      }
    }

    return Array.from(emails).slice(0, 50);
  };

  const computeAllStaffViewerEmails = (staffList: StaffMember[] = staff, extraEmail?: string): string[] => {
    const set = new Set<string>([BOOTSTRAP_ADMIN_EMAIL]);
    if (extraEmail && normalizeEmail(extraEmail)) set.add(normalizeEmail(extraEmail));
    for (const st of staffList || []) {
      const em = normalizeEmail(st?.email);
      if (em) set.add(em);
    }
    return Array.from(set).slice(0, 50);
  };

  const computeBatchViewerEmails = (
    batch: Batch,
    staffList: StaffMember[] = staff,
    studentsList: Student[] = students,
    matrix: Record<string, PermissionCategory[]> = permissionsMatrixState
  ): string[] => {
    const set = new Set<string>(getGlobalStaffEmails(staffList, matrix));
    if (Array.isArray(batch.mentors)) {
      for (const m of batch.mentors) {
        const cleanM = String(m || '').trim().toLowerCase();
        const st = staffList.find(
          (item) =>
            normalizeEmail(item.email) === cleanM ||
            String(item.name || '').trim().toLowerCase() === cleanM ||
            String(item.id || '').trim().toLowerCase() === cleanM
        );
        if (st?.email) set.add(normalizeEmail(st.email));
      }
    }
    if (Array.isArray(batch.students)) {
      for (const sid of batch.students) {
        const cleanSid = String(sid || '').trim().toLowerCase();
        const stu = studentsList.find(
          (item) =>
            String(item.id || '').trim().toLowerCase() === cleanSid ||
            normalizeEmail(item.email) === cleanSid ||
            String(item.name || '').trim().toLowerCase() === cleanSid
        );
        if (stu?.email) set.add(normalizeEmail(stu.email));
      }
    }
    return Array.from(set).slice(0, 500);
  };

  const computeEventViewerEmails = (
    ev: EventItem,
    staffList: StaffMember[] = staff,
    studentsList: Student[] = students,
    batchesList: Batch[] = batches,
    matrix: Record<string, PermissionCategory[]> = permissionsMatrixState
  ): string[] => {
    const set = new Set<string>(getGlobalStaffEmails(staffList, matrix));
    const hostLower = String(ev.host || ev.organiser || '').trim().toLowerCase();
    if (hostLower) {
      const matchedHost = staffList.find(
        (st) =>
          normalizeEmail(st.email) === hostLower ||
          String(st.name || '').trim().toLowerCase() === hostLower
      );
      if (matchedHost?.email) set.add(normalizeEmail(matchedHost.email));
    }
    if (Array.isArray(ev.participantEmails)) {
      ev.participantEmails.forEach((em) => {
        const clean = normalizeEmail(em);
        if (clean) set.add(clean);
      });
    }
    if (ev.studentId) {
      const stu = studentsList.find((s) => s.id === ev.studentId);
      if (stu) {
        computeStudentViewerEmails(stu, staffList, matrix, batchesList).forEach((e) => set.add(e));
      }
    }
    if (Array.isArray(ev.studentIds)) {
      ev.studentIds.forEach((sid) => {
        const stu = studentsList.find((s) => s.id === sid);
        if (stu) {
          computeStudentViewerEmails(stu, staffList, matrix, batchesList).forEach((e) => set.add(e));
        }
      });
    }
    if (ev.batch || ev.students) {
      const targetBatchName = String(ev.batch || ev.students || '').trim().toLowerCase();
      const matchedBatch = batchesList.find(
        (b) =>
          String(b.id || '').trim().toLowerCase() === targetBatchName ||
          String(b.name || '').trim().toLowerCase() === targetBatchName
      );
      if (matchedBatch) {
        computeBatchViewerEmails(matchedBatch, staffList, studentsList, matrix).forEach((e) => set.add(e));
      } else if (typeof ev.students === 'string' && ev.students.trim()) {
        const stuNameLower = ev.students.trim().toLowerCase();
        studentsList
          .filter((s) => s.name && stuNameLower.includes(s.name.trim().toLowerCase()))
          .forEach((stu) => {
            computeStudentViewerEmails(stu, staffList, matrix, batchesList).forEach((e) => set.add(e));
          });
      }
    }
    return Array.from(set).slice(0, 500);
  };

  // Seed default Launchpad catalog & portal settings into Firestore once for Bootstrap Admin
  const ensureBootstrappedAdminRecords = async (fbUser: User) => {
    const authEmail = normalizeEmail(fbUser.email);
    const now = new Date().toISOString();
    const adminKey = normalizeEmailKey(authEmail);

    await setDoc(doc(db, 'admins', fbUser.uid), {
      uid: fbUser.uid,
      email: authEmail,
      role: 'SYSTEM_ADMIN',
    });

    await setDoc(doc(db, 'staff_directory', adminKey), {
      id: adminKey,
      staffId: 'admin-1',
      email: authEmail,
      name: fbUser.displayName || 'System Admin',
      role: 'SYSTEM_ADMIN',
      status: 'Active',
      students: 'All',
      updatedAt: now,
    });

    const staffDocRef = doc(db, 'staff', 'admin-1');
    const existingAdminStaff = await getDoc(staffDocRef);
    if (!existingAdminStaff.exists()) {
      await setDoc(staffDocRef, {
        id: 'admin-1',
        uid: fbUser.uid,
        name: fbUser.displayName || 'System Admin',
        email: authEmail,
        role: 'SYSTEM_ADMIN',
        students: 'All',
        status: 'Active',
        allowedViewerEmails: [BOOTSTRAP_ADMIN_EMAIL],
        updatedAt: now,
      });
    }

    const permsRef = doc(db, 'portal_settings', 'permissions_matrix');
    const permsSnap = await getDoc(permsRef);
    if (!permsSnap.exists()) {
      await setDoc(permsRef, {
        id: 'permissions_matrix',
        matrix: defaultPermissionsMatrix,
        updatedBy: authEmail,
        updatedAt: now,
      });
    }

    if (!seededCatalogRef.current) {
      seededCatalogRef.current = true;
      try {
        const existingSubjSnap = await getDocs(
          query(collection(db, 'launchpad_subjects'), where('portalScope', '==', 'verified_portal'))
        );
        if (existingSubjSnap.empty) {
          const defaultSubjs = buildDefaultLaunchpadSubjects();
          for (const s of defaultSubjs) {
            const safeId = toValidDocId(s.id, 'subj');
            await setDoc(
              doc(db, 'launchpad_subjects', safeId),
              stripUndefinedAndNulls({
                ...s,
                id: safeId,
                portalScope: 'verified_portal',
                updatedAt: now,
              })
            );
          }
          const defaultChaps = buildDefaultLaunchpadChapters();
          for (const ch of defaultChaps) {
            const safeId = toValidDocId(ch.id || `${ch.subjectId || 'comm-public-speaking'}__w${ch.weekNumber}`, 'chap');
            await setDoc(
              doc(db, 'launchpad_chapters', safeId),
              stripUndefinedAndNulls({
                ...ch,
                id: safeId,
                subjectId: ch.subjectId || 'comm-public-speaking',
                portalScope: 'verified_portal',
                updatedAt: now,
              })
            );
          }
          const defaultQs = buildDefaultCertQuestions();
          for (const q of defaultQs) {
            const safeId = toValidDocId(q.id, 'cq');
            await setDoc(
              doc(db, 'launchpad_cert_questions', safeId),
              stripUndefinedAndNulls({
                ...q,
                id: safeId,
                portalScope: 'verified_portal',
                updatedAt: now,
              })
            );
          }
        }
      } catch (seedErr) {
        console.warn('Launchpad catalog initial seed skipped/deferred:', seedErr);
      }
    }
  };

  useEffect(() => {
    void testFirestoreConnection();
  }, []);

  // Resolve verified Firebase user into Staff or Student profile from Firestore
  useEffect(() => {
    let cancelled = false;
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (!user || !user.emailVerified) {
        if (!cancelled) {
          setIsAuthenticatedState(false);
          setCurrentUserState(null);
          setStudentsState([]);
          setStaffState([]);
          setBatchesState([]);
          setEventsState([]);
          setConversationsState([]);
          setLaunchpadEnrollmentsState([]);
          setLaunchpadSubjectReleasesState([]);
          setLaunchpadProgressState([]);
          setLaunchpadCertificationsState([]);
          setLaunchpadEvaluationsState([]);
          setAppNotificationsState([]);
          setLaunchpadPermissionsState([]);
          setFirestoreStatus('idle');
          setIsFirebaseAuthReady(true);
        }
        return;
      }

      const authEmail = normalizeEmail(user.email);
      setAuthError(null);

      try {
        const tokenResult = await user.getIdTokenResult();
        if (!tokenResult.claims.email_verified) {
          await user.getIdToken(true);
        }

        if (authEmail === BOOTSTRAP_ADMIN_EMAIL) {
          await ensureBootstrappedAdminRecords(user);
          if (cancelled) return;
          const staffSnap = await getDoc(doc(db, 'staff', 'admin-1'));
          const resolvedAdmin: StaffMember = staffSnap.exists()
            ? stripPasswordField({ ...(staffSnap.data() as StaffMember), id: staffSnap.id, email: authEmail })
            : {
                id: 'admin-1',
                name: user.displayName || 'System Admin',
                email: authEmail,
                role: 'SYSTEM_ADMIN',
                students: 'All',
                status: 'Active',
              };
          setCurrentUserState(resolvedAdmin);
          setIsAuthenticatedState(true);
          setFirestoreStatus('connected');
          setIsFirebaseAuthReady(true);
          return;
        }

        // Non-bootstrapped user: check /admins/{uid} & /staff_directory/{emailKey}
        const emailKey = normalizeEmailKey(authEmail);
        const [adminSnap, dirSnap] = await Promise.all([
          getDoc(doc(db, 'admins', user.uid)).catch(() => null),
          getDoc(doc(db, 'staff_directory', emailKey)).catch(() => null),
        ]);

        if (cancelled) return;

        if ((adminSnap && adminSnap.exists()) || (dirSnap && dirSnap.exists())) {
          const dirData = dirSnap?.exists() ? (dirSnap.data() as any) : null;
          if (dirData && String(dirData.status || 'Active').toLowerCase() === 'suspended') {
            setAuthError('Your staff account is suspended. Please contact your administrator.');
            await signOut(auth).catch(() => {});
            setIsFirebaseAuthReady(true);
            return;
          }

          let matchedStaff: StaffMember | null = null;
          try {
            const staffQ = query(collection(db, 'staff'), where('email', '==', authEmail));
            const staffSnap = await getDocs(staffQ);
            staffSnap.forEach((d) => {
              if (!matchedStaff) {
                matchedStaff = stripPasswordField({ ...(d.data() as StaffMember), id: d.id });
              }
            });
          } catch {
            // Fallback to staff_directory data if staff query fails
          }

          if (cancelled) return;

          const staffProfile: StaffMember = matchedStaff || {
            id: dirData?.staffId || user.uid,
            name: dirData?.name || user.displayName || authEmail.split('@')[0],
            email: authEmail,
            role: dirData?.role || (adminSnap?.exists() ? 'SYSTEM_ADMIN' : 'COUNSELOR'),
            students: dirData?.students || 'Assigned Scope',
            status: dirData?.status || 'Active',
          };

          if (String(staffProfile.status || 'Active').toLowerCase() === 'suspended') {
            setAuthError('Your staff account is suspended. Please contact your administrator.');
            await signOut(auth).catch(() => {});
            setIsFirebaseAuthReady(true);
            return;
          }

          setCurrentUserState(staffProfile);
          setIsAuthenticatedState(true);
          setFirestoreStatus('connected');
          setIsFirebaseAuthReady(true);
          return;
        }

        // Check /students where email == authEmail
        const stuQ = query(collection(db, 'students'), where('email', '==', authEmail));
        const stuSnap = await getDocs(stuQ);
        if (cancelled) return;

        let matchedStudent: Student | null = null;
        stuSnap.forEach((d) => {
          if (!matchedStudent) {
            matchedStudent = stripPasswordField({ ...(d.data() as Student), id: d.id });
          }
        });

        if (matchedStudent) {
          const stu = matchedStudent as Student;
          if (String((stu as any).status || 'Active').toLowerCase() === 'suspended') {
            setAuthError('Your student account is suspended. Please contact your counselor.');
            await signOut(auth).catch(() => {});
            setIsFirebaseAuthReady(true);
            return;
          }
          setCurrentUserState({
            ...(stu as any),
            role: 'STUDENT',
            status: (stu as any).status || 'Active',
          });
          setIsAuthenticatedState(true);
          setFirestoreStatus('connected');
          setIsFirebaseAuthReady(true);
          return;
        }

        setAuthError(
          `No portal profile was found for ${authEmail}. Please ask your administrator to add your profile before signing in.`
        );
        await signOut(auth).catch(() => {});
        setIsFirebaseAuthReady(true);
      } catch (err: any) {
        if (cancelled) return;
        console.error('Firebase profile resolution error:', err);
        setAuthError(err?.message || 'Unable to load portal profile from Firestore.');
        setFirestoreStatus(err?.code === 'permission-denied' ? 'permission-denied' : 'error');
        setIsFirebaseAuthReady(true);
      }
    });

    return () => {
      cancelled = true;
      unsubAuth();
    };
  }, []);

  // Live role-scoped Firestore onSnapshot listeners
  useEffect(() => {
    if (!isAuthenticated || !firebaseUser || !firebaseUser.emailVerified || !currentUser) {
      return;
    }

    const authEmail = normalizeEmail(firebaseUser.email || currentUser.email);
    const isBootAdmin = authEmail === BOOTSTRAP_ADMIN_EMAIL;
    const isStudent = (currentUser.role || '').toUpperCase() === 'STUDENT';
    const isStaff = !isStudent;

    const handleSnapErr = (path: string) => (err: any) => {
      const info = buildFirestoreErrorInfo(err, OperationType.LIST, path);
      console.warn('Firestore snapshot listener warning:', JSON.stringify(info));
      if (err?.code === 'permission-denied') {
        setFirestoreStatus('permission-denied');
      }
    };

    const unsubs: (() => void)[] = [];

    // 1. Students
    const studentsQuery = isBootAdmin
      ? collection(db, 'students')
      : isStaff
      ? query(collection(db, 'students'), where('allowedViewerEmails', 'array-contains', authEmail))
      : query(collection(db, 'students'), where('email', '==', authEmail));

    unsubs.push(
      onSnapshot(
        studentsQuery,
        (snap) => {
          const list: Student[] = [];
          snap.forEach((d) => {
            const raw = stripPasswordField({ ...(d.data() as Student), id: d.id });
            if (!raw.intake) raw.intake = 'Fall 2026';
            if (!Array.isArray(raw.tasks)) raw.tasks = [];
            if (!Array.isArray(raw.activities)) raw.activities = [];
            if (!Array.isArray(raw.documents)) raw.documents = [];
            if (!Array.isArray(raw.shortlist)) raw.shortlist = [];
            if (!Array.isArray(raw.countries)) raw.countries = ['USA'];
            if (!Array.isArray(raw.operationalLogs) || raw.operationalLogs.length === 0) {
              raw.operationalLogs = getDefaultOperationalLogsForStudent(raw.id, raw.name, raw.counselor);
            }
            raw.tasks = raw.tasks.map((t) => normalizeTask(t, { studentId: raw.id, studentName: raw.name }));
            raw.activities = raw.activities.map((a) =>
              normalizeActivity(a, { studentId: raw.id, studentName: raw.name })
            );
            list.push(raw);
          });
          setStudentsState(list);
          setFirestoreStatus('connected');

          if (isStudent) {
            const selfStu = list.find((s) => normalizeEmail(s.email) === authEmail) || list[0];
            if (selfStu) {
              setCurrentUserState((prev) =>
                prev
                  ? {
                      ...prev,
                      ...selfStu,
                      role: 'STUDENT',
                      status: (selfStu as any).status || 'Active',
                    }
                  : prev
              );
            }
          }
        },
        handleSnapErr('students')
      )
    );

    // 2. Staff & Permissions Matrix (for staff roles)
    if (isStaff) {
      const staffQuery = isBootAdmin
        ? collection(db, 'staff')
        : query(collection(db, 'staff'), where('allowedViewerEmails', 'array-contains', authEmail));
      unsubs.push(
        onSnapshot(
          staffQuery,
          (snap) => {
            const list: StaffMember[] = [];
            snap.forEach((d) => {
              list.push(stripPasswordField({ ...(d.data() as StaffMember), id: d.id }));
            });
            setStaffState(list);
            const selfStaff = list.find((st) => normalizeEmail(st.email) === authEmail);
            if (selfStaff) {
              setCurrentUserState((prev) => (prev ? { ...prev, ...selfStaff } : selfStaff));
            }
          },
          handleSnapErr('staff')
        )
      );

      unsubs.push(
        onSnapshot(
          doc(db, 'portal_settings', 'permissions_matrix'),
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as any;
              if (data?.matrix && typeof data.matrix === 'object') {
                setPermissionsMatrixState(mergePermissionsWithDefaults(data.matrix));
              }
            }
          },
          handleSnapErr('portal_settings/permissions_matrix')
        )
      );

      const lpPermQuery = isBootAdmin
        ? collection(db, 'launchpad_team_permissions')
        : query(collection(db, 'launchpad_team_permissions'), where('userEmail', '==', authEmail));
      unsubs.push(
        onSnapshot(
          lpPermQuery,
          (snap) => {
            const list: LaunchpadTeamPermission[] = [];
            snap.forEach((d) => {
              list.push(d.data() as LaunchpadTeamPermission);
            });
            setLaunchpadPermissionsState(list);
          },
          handleSnapErr('launchpad_team_permissions')
        )
      );
    }

    // 3. Batches
    const batchesQuery = isBootAdmin
      ? collection(db, 'batches')
      : query(collection(db, 'batches'), where('allowedViewerEmails', 'array-contains', authEmail));
    unsubs.push(
      onSnapshot(
        batchesQuery,
        (snap) => {
          const list: Batch[] = [];
          snap.forEach((d) => list.push({ ...(d.data() as Batch), id: d.id }));
          setBatchesState(list);
        },
        handleSnapErr('batches')
      )
    );

    // 4. Events
    const eventsQuery = isBootAdmin
      ? collection(db, 'events')
      : query(collection(db, 'events'), where('allowedViewerEmails', 'array-contains', authEmail));
    unsubs.push(
      onSnapshot(
        eventsQuery,
        (snap) => {
          const list: EventItem[] = [];
          snap.forEach((d) => list.push({ ...(d.data() as EventItem), id: d.id }));
          setEventsState(list);
        },
        handleSnapErr('events')
      )
    );

    // 5. Conversations
    const convQuery = isBootAdmin
      ? collection(db, 'conversations')
      : isStaff
      ? query(collection(db, 'conversations'), where('allowedViewerEmails', 'array-contains', authEmail))
      : query(collection(db, 'conversations'), where('studentEmail', '==', authEmail));
    unsubs.push(
      onSnapshot(
        convQuery,
        (snap) => {
          const list: Conversation[] = [];
          snap.forEach((d) => list.push({ ...(d.data() as Conversation), id: d.id }));
          setConversationsState(list);
        },
        handleSnapErr('conversations')
      )
    );

    // 6. Launchpad Catalog (verified_portal)
    unsubs.push(
      onSnapshot(
        query(collection(db, 'launchpad_subjects'), where('portalScope', '==', 'verified_portal')),
        (snap) => {
          const list: LaunchpadSubject[] = [];
          snap.forEach((d) => list.push({ ...(d.data() as LaunchpadSubject), id: d.id }));
          if (list.length > 0) {
            list.sort((a, b) => Number(a.order ?? 99) - Number(b.order ?? 99));
            setLaunchpadSubjectsState(list);
          } else {
            setLaunchpadSubjectsState(buildDefaultLaunchpadSubjects());
          }
        },
        handleSnapErr('launchpad_subjects')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'launchpad_chapters'), where('portalScope', '==', 'verified_portal')),
        (snap) => {
          const list: LaunchpadWeekModule[] = [];
          snap.forEach((d) => list.push({ ...(d.data() as LaunchpadWeekModule), id: d.id }));
          if (list.length > 0) {
            list.sort((a, b) => Number(a.weekNumber ?? 1) - Number(b.weekNumber ?? 1));
            setLaunchpadChaptersState(list);
          } else {
            setLaunchpadChaptersState(buildDefaultLaunchpadChapters());
          }
        },
        handleSnapErr('launchpad_chapters')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'launchpad_cert_questions'), where('portalScope', '==', 'verified_portal')),
        (snap) => {
          const list: LaunchpadCertQuestionRecord[] = [];
          snap.forEach((d) => list.push({ ...(d.data() as LaunchpadCertQuestionRecord), id: d.id }));
          if (list.length > 0) {
            list.sort((a, b) => Number(a.sortOrder ?? 1) - Number(b.sortOrder ?? 1));
            setLaunchpadCertQuestionsState(list);
          } else {
            setLaunchpadCertQuestionsState(buildDefaultCertQuestions());
          }
        },
        handleSnapErr('launchpad_cert_questions')
      )
    );

    // 7. Launchpad Enrollments, Releases, Progress, Certifications, Evaluations, Notifications
    const enrollmentsQ = isBootAdmin
      ? collection(db, 'launchpad_enrollments')
      : isStaff
      ? query(collection(db, 'launchpad_enrollments'), where('allowedViewerEmails', 'array-contains', authEmail))
      : query(collection(db, 'launchpad_enrollments'), where('studentEmail', '==', authEmail));
    unsubs.push(
      onSnapshot(
        enrollmentsQ,
        (snap) => {
          const list: LaunchpadEnrollment[] = [];
          snap.forEach((d) => list.push(d.data() as LaunchpadEnrollment));
          setLaunchpadEnrollmentsState(list);
        },
        handleSnapErr('launchpad_enrollments')
      )
    );

    const releasesQ = isBootAdmin
      ? collection(db, 'launchpad_releases')
      : isStaff
      ? query(collection(db, 'launchpad_releases'), where('allowedViewerEmails', 'array-contains', authEmail))
      : query(collection(db, 'launchpad_releases'), where('studentEmail', '==', authEmail));
    unsubs.push(
      onSnapshot(
        releasesQ,
        (snap) => {
          const list: LaunchpadSubjectRelease[] = [];
          snap.forEach((d) => list.push({ ...(d.data() as LaunchpadSubjectRelease), id: d.id }));
          setLaunchpadSubjectReleasesState(list);
        },
        handleSnapErr('launchpad_releases')
      )
    );

    const progressQ = isBootAdmin
      ? collection(db, 'launchpad_progress')
      : isStaff
      ? query(collection(db, 'launchpad_progress'), where('allowedViewerEmails', 'array-contains', authEmail))
      : query(collection(db, 'launchpad_progress'), where('studentEmail', '==', authEmail));
    unsubs.push(
      onSnapshot(
        progressQ,
        (snap) => {
          const list: LaunchpadWeekProgress[] = [];
          snap.forEach((d) => list.push({ ...(d.data() as LaunchpadWeekProgress), id: d.id }));
          setLaunchpadProgressState(list);
        },
        handleSnapErr('launchpad_progress')
      )
    );

    const certsQ = isBootAdmin
      ? collection(db, 'launchpad_certifications')
      : isStaff
      ? query(collection(db, 'launchpad_certifications'), where('allowedViewerEmails', 'array-contains', authEmail))
      : query(collection(db, 'launchpad_certifications'), where('studentEmail', '==', authEmail));
    unsubs.push(
      onSnapshot(
        certsQ,
        (snap) => {
          const list: LaunchpadCertification[] = [];
          snap.forEach((d) => list.push({ ...(d.data() as LaunchpadCertification), id: d.id }));
          setLaunchpadCertificationsState(list);
        },
        handleSnapErr('launchpad_certifications')
      )
    );

    const evalsQ = isBootAdmin
      ? collection(db, 'assignment_evaluations')
      : isStaff
      ? query(collection(db, 'assignment_evaluations'), where('allowedViewerEmails', 'array-contains', authEmail))
      : query(collection(db, 'assignment_evaluations'), where('studentEmail', '==', authEmail));
    unsubs.push(
      onSnapshot(
        evalsQ,
        (snap) => {
          const list: LaunchpadAssignmentEvaluation[] = [];
          snap.forEach((d) => list.push({ ...(d.data() as LaunchpadAssignmentEvaluation), id: d.id }));
          list.sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));
          setLaunchpadEvaluationsState(list);
        },
        handleSnapErr('assignment_evaluations')
      )
    );

    const notifsQ = isBootAdmin
      ? collection(db, 'notifications')
      : query(collection(db, 'notifications'), where('allowedViewerEmails', 'array-contains', authEmail));
    unsubs.push(
      onSnapshot(
        notifsQ,
        (snap) => {
          const list: AppNotification[] = [];
          snap.forEach((d) => list.push({ ...(d.data() as AppNotification), id: d.id }));
          list.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
          setAppNotificationsState(list);
        },
        handleSnapErr('notifications')
      )
    );

    return () => {
      unsubs.forEach((u) => {
        try {
          u();
        } catch {
          // Ignore unsubscribe errors
        }
      });
    };
  }, [isAuthenticated, firebaseUser?.uid, firebaseUser?.email, currentUser?.role]);

  // Provision Firebase Email/Password user when Admin creates Student or Staff
  const provisionPortalUser = async ({
    name,
    email,
    password,
  }: {
    name: string;
    email: string;
    password: string;
    role: string;
    userType: 'student' | 'staff';
  }): Promise<ProvisionUserResult> => {
    const cleanEmail = normalizeEmail(email);
    const cleanPwd = (password || '').trim() || 'Uppseekers@123';
    if (!cleanEmail) return { ok: false, error: 'Email is required.' };
    if (cleanPwd.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };

    try {
      const idToken = await getFirebaseIdToken();
      if (idToken) {
        const res = await fetch('/api/firebase-admin/provision-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ email: cleanEmail, name, password: cleanPwd }),
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.ok) {
          return { ok: true, uid: json.uid, method: 'admin_sdk' };
        }
        if (json && !json.fallbackToClient && res.status >= 400) {
          return { ok: false, error: json.error || 'Failed to provision user.' };
        }
      }
    } catch {
      // Fall through to client provisioner
    }

    // Fallback: Secondary in-memory Firebase Auth provisioner (never signs out current admin)
    try {
      const provAuth = getProvisionerAuth();
      const cred = await createUserWithEmailAndPassword(provAuth, cleanEmail, cleanPwd);
      if (name) {
        await updateProfile(cred.user, { displayName: name }).catch(() => {});
      }
      await sendEmailVerification(cred.user).catch(() => {});
      await signOut(provAuth).catch(() => {});
      return { ok: true, uid: cred.user.uid, method: 'client_provisioner' };
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') {
        try {
          await sendPasswordResetEmail(auth, cleanEmail);
          return { ok: true, method: 'reset_email' };
        } catch (resetErr: any) {
          return { ok: false, error: resetErr?.message || 'Account already exists in Firebase Auth.' };
        }
      }
      return { ok: false, error: err?.message || 'Failed to provision Firebase Auth account.' };
    }
  };

  // Admin password reset via Admin SDK or Firebase Reset Email
  const resetPortalUserPassword = async ({
    email,
    name,
    newPassword,
    userType,
  }: {
    email: string;
    name?: string;
    newPassword?: string;
    userType?: 'student' | 'staff';
  }): Promise<PasswordResetResult> => {
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) return { ok: false, error: 'Email address is required.' };

    if (newPassword && newPassword.trim().length >= 6) {
      try {
        const idToken = await getFirebaseIdToken();
        if (idToken) {
          const res = await fetch('/api/firebase-admin/change-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              email: cleanEmail,
              name,
              newPassword: newPassword.trim(),
              userType,
            }),
          });
          const json = await res.json().catch(() => null);
          if (res.ok && json?.ok) {
            return { ok: true, mode: 'direct' };
          }
        }
      } catch {
        // Fallback to Firebase password reset email below
      }
    }

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      return { ok: true, mode: 'reset_email' };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Failed to send Firebase password reset email.' };
    }
  };

  const signOutAll = async (): Promise<void> => {
    await signOut(auth).catch(() => {});
    setIsAuthenticatedState(false);
    setCurrentUserState(null);
    setFirestoreStatus('idle');
  };

  // Firestore Student sanitization & write helpers
  const buildStudentDocPayload = (raw: Student, safeId: string): Record<string, any> => {
    const cleanEmail = normalizeEmail(raw.email) || 'student@uppseekers.com';
    const cleaned = stripUndefinedAndNulls(stripPasswordField(raw));
    const allowedKeys = [
      'id', 'name', 'email', 'phone', 'intake', 'school', 'counselor',
      'researchMentor', 'satMathMentor', 'satVerbalMentor', 'universityMentor',
      'readiness', 'countries', 'activities', 'operationalLogs',
      'shortlist', 'documents', 'essays', 'tasks', 'extracurriculars',
      'academicScores', 'credentials', 'conversations', 'taskSheetLink',
      'major1', 'major2', 'targetDegree', 'targetCountry', 'uid', 'role', 'status',
    ];
    const out: Record<string, any> = {};
    for (const k of allowedKeys) {
      if (cleaned[k] !== undefined) out[k] = cleaned[k];
    }
    out.id = safeId;
    out.name = String(cleaned.name || 'Student').trim().slice(0, 200) || 'Student';
    out.email = cleanEmail.slice(0, 200);
    if (typeof out.phone === 'string') out.phone = out.phone.slice(0, 60);
    if (typeof out.intake === 'string') out.intake = out.intake.slice(0, 60);
    if (typeof out.school === 'string') out.school = out.school.slice(0, 200);
    if (typeof out.counselor === 'string') out.counselor = out.counselor.slice(0, 160);
    if (typeof out.researchMentor === 'string') out.researchMentor = out.researchMentor.slice(0, 160);
    if (typeof out.satMathMentor === 'string') out.satMathMentor = out.satMathMentor.slice(0, 160);
    if (typeof out.satVerbalMentor === 'string') out.satVerbalMentor = out.satVerbalMentor.slice(0, 160);
    if (typeof out.universityMentor === 'string') out.universityMentor = out.universityMentor.slice(0, 160);
    if (typeof out.taskSheetLink === 'string') out.taskSheetLink = out.taskSheetLink.slice(0, 500);
    if (typeof out.major1 === 'string') out.major1 = out.major1.slice(0, 160);
    if (typeof out.major2 === 'string') out.major2 = out.major2.slice(0, 160);
    if (typeof out.targetDegree === 'string') out.targetDegree = out.targetDegree.slice(0, 120);
    if (typeof out.targetCountry === 'string') out.targetCountry = out.targetCountry.slice(0, 120);
    out.readiness = Number.isFinite(Number(out.readiness)) ? Number(out.readiness) : 0;
    if (Array.isArray(out.countries)) out.countries = out.countries.slice(0, 20).map((c: any) => String(c));
    out.allowedViewerEmails = computeStudentViewerEmails({ ...raw, id: safeId, email: cleanEmail });
    out.updatedAt = new Date().toISOString();
    return out;
  };

  const writeStudentToFirestore = async (student: Student) => {
    const fbUser = auth.currentUser;
    if (!fbUser || !fbUser.emailVerified) return;
    const safeId = toValidDocId(student.id, 'STU');
    const isStudentSelf =
      (currentUser?.role || '').toUpperCase() === 'STUDENT' ||
      (normalizeEmail(fbUser.email) !== BOOTSTRAP_ADMIN_EMAIL &&
        normalizeEmail(fbUser.email) === normalizeEmail(student.email) &&
        !isUserAdmin(currentUser) &&
        !staff.some((st) => normalizeEmail(st.email) === normalizeEmail(fbUser.email)));

    const payload = buildStudentDocPayload(student, safeId);

    try {
      if (isStudentSelf) {
        const selfAllowedKeys = [
          'tasks', 'essays', 'documents', 'activities', 'shortlist',
          'extracurriculars', 'academicScores', 'credentials', 'operationalLogs',
          'phone', 'school', 'major1', 'major2', 'targetDegree', 'targetCountry', 'updatedAt',
        ] as const;
        const patch: Record<string, any> = {};
        for (const k of selfAllowedKeys) {
          if (payload[k] !== undefined) patch[k] = payload[k];
        }
        await updateDoc(doc(db, 'students', safeId), patch);
      } else {
        const existingRef = doc(db, 'students', safeId);
        const snap = await getDoc(existingRef);
        if (!snap.exists() || isUserAdmin(currentUser)) {
          await setDoc(existingRef, payload);
        } else {
          // Staff updates only staff-mutable fields
          const staffMutableKeys = [
            'name', 'phone', 'intake', 'school', 'counselor', 'researchMentor',
            'satMathMentor', 'satVerbalMentor', 'universityMentor', 'readiness',
            'countries', 'activities', 'operationalLogs', 'shortlist', 'documents',
            'essays', 'tasks', 'extracurriculars', 'academicScores', 'major1',
            'major2', 'targetDegree', 'targetCountry', 'allowedViewerEmails', 'updatedAt',
          ] as const;
          const patch: Record<string, any> = {};
          for (const k of staffMutableKeys) {
            if (payload[k] !== undefined) patch[k] = payload[k];
          }
          await updateDoc(existingRef, patch);
        }
      }
    } catch (err) {
      console.error('Firestore student write error:', buildFirestoreErrorInfo(err, OperationType.WRITE, `students/${safeId}`));
    }
  };

  const setStudents = (newStudents: Student[]) => {
    const cleanList = newStudents.map((s) => stripPasswordField(s));
    const deleted = students.filter((prev) => !cleanList.some((n) => n.id === prev.id));
    setStudentsState(cleanList);

    deleted.forEach((d) => {
      if (d.id && isUserAdmin(currentUser)) {
        const safeId = toValidDocId(d.id, 'STU');
        void deleteDoc(doc(db, 'students', safeId)).catch((err) =>
          console.error('Delete student error:', err)
        );
      }
    });

    // Sync added or changed students
    cleanList.forEach((s) => {
      const prev = students.find((p) => p.id === s.id);
      if (!prev || JSON.stringify(prev) !== JSON.stringify(s)) {
        void writeStudentToFirestore(s);
      }
    });
  };

  const updateStudent = async (updatedStudent: Student): Promise<void> => {
    const clean = stripPasswordField({ ...updatedStudent });
    if (!clean.id) {
      clean.id = `STU-${Date.now()}`;
    }
    if (clean.phone && typeof clean.phone === 'string' && clean.phone.includes('|')) {
      clean.phone = clean.phone.split('|')[0].trim();
    }
    if (clean.tasks) {
      clean.tasks = clean.tasks.map((t) => normalizeTask(t, { studentId: clean.id, studentName: clean.name }));
    }
    if (clean.activities) {
      clean.activities = clean.activities.map((a) =>
        normalizeActivity(a, { studentId: clean.id, studentName: clean.name })
      );
    }
    clean.readiness = calculateReadiness(clean);

    setStudentsState((prev) => {
      const targetEmail = normalizeEmail(clean.email);
      const exists = prev.some(
        (s) => s.id === clean.id || (targetEmail && normalizeEmail(s.email) === targetEmail)
      );
      return exists
        ? prev.map((s) =>
            s.id === clean.id || (targetEmail && normalizeEmail(s.email) === targetEmail) ? clean : s
          )
        : [...prev, clean];
    });

    setCurrentUserState((prev) => {
      if (
        prev &&
        (prev.id === clean.id ||
          (prev.email && clean.email && normalizeEmail(prev.email) === normalizeEmail(clean.email)))
      ) {
        return { ...prev, ...clean };
      }
      return prev;
    });

    await writeStudentToFirestore(clean);
  };

  const getStudent = (id: string) => students.find((s) => s.id === id);

  const setStaff = (newStaff: StaffMember[]) => {
    const cleanList = newStaff.map((st) => stripPasswordField(st));
    const deleted = staff.filter((prev) => !cleanList.some((n) => n.id === prev.id));
    setStaffState(cleanList);

    const viewerEmails = computeAllStaffViewerEmails(cleanList);
    const now = new Date().toISOString();

    if (isUserAdmin(currentUser)) {
      deleted.forEach((d) => {
        if (d.id && normalizeEmail(d.email) !== BOOTSTRAP_ADMIN_EMAIL) {
          const safeId = toValidDocId(d.id, 'STAFF');
          void deleteDoc(doc(db, 'staff', safeId)).catch((err) =>
            console.error('Delete staff error:', err)
          );
          if (d.email) {
            void deleteDoc(doc(db, 'staff_directory', normalizeEmailKey(d.email))).catch((err) =>
              console.error('Delete staff_directory error:', err)
            );
          }
        }
      });

      cleanList.forEach((st) => {
        const safeId = toValidDocId(st.id || `STAFF-${Date.now()}`, 'STAFF');
        const cleanEmail = normalizeEmail(st.email);
        if (!cleanEmail) return;
        const statusNorm = String(st.status || 'Active').toLowerCase() === 'suspended' ? 'Suspended' : 'Active';

        const staffPayload = stripUndefinedAndNulls({
          id: safeId,
          uid: (st as any).uid,
          name: String(st.name || cleanEmail).trim().slice(0, 200),
          email: cleanEmail.slice(0, 200),
          role: String(st.role || 'COUNSELOR').slice(0, 60),
          students: String(st.students || 'All').slice(0, 120),
          status: statusNorm,
          allowedViewerEmails: Array.from(new Set([...viewerEmails, cleanEmail])).slice(0, 50),
          updatedAt: now,
        });

        const dirId = normalizeEmailKey(cleanEmail);
        const dirPayload = {
          id: dirId,
          staffId: safeId,
          email: cleanEmail,
          name: staffPayload.name,
          role: staffPayload.role,
          status: statusNorm,
          students: staffPayload.students,
          updatedAt: now,
        };

        void setDoc(doc(db, 'staff', safeId), staffPayload).catch((err) =>
          console.error('Firestore staff write error:', buildFirestoreErrorInfo(err, OperationType.WRITE, `staff/${safeId}`))
        );
        void setDoc(doc(db, 'staff_directory', dirId), dirPayload).catch((err) =>
          console.error('Firestore staff_directory write error:', buildFirestoreErrorInfo(err, OperationType.WRITE, `staff_directory/${dirId}`))
        );
      });
    }
  };

  const setPermissionsMatrix = (matrix: Record<string, PermissionCategory[]>) => {
    setPermissionsMatrixState(matrix);
    if (!isUserAdmin(currentUser)) return;
    const now = new Date().toISOString();
    void setDoc(doc(db, 'portal_settings', 'permissions_matrix'), {
      id: 'permissions_matrix',
      matrix: stripUndefinedAndNulls(matrix),
      updatedBy: normalizeEmail(currentUser?.email) || BOOTSTRAP_ADMIN_EMAIL,
      updatedAt: now,
    }).catch((err) =>
      console.error('Permissions matrix write error:', buildFirestoreErrorInfo(err, OperationType.WRITE, 'portal_settings/permissions_matrix'))
    );
  };

  const setEvents = async (newEvents: EventItem[]): Promise<void> => {
    const validNew = Array.isArray(newEvents) ? newEvents : [];
    const deleted = events.filter((prev) => !validNew.some((n) => n.id === prev.id));
    setEventsState(validNew);

    const now = new Date().toISOString();
    await Promise.all([
      ...deleted
        .filter((d) => d.id)
        .map((d) =>
          deleteDoc(doc(db, 'events', toValidDocId(d.id, 'EVT'))).catch((err) =>
            console.error('Delete event error:', err)
          )
        ),
      ...validNew.map(async (ev) => {
        const prev = events.find((p) => p.id === ev.id);
        if (prev && JSON.stringify(prev) === JSON.stringify(ev)) return;
        const safeId = toValidDocId(ev.id || `EVT-${Date.now()}`, 'EVT');
        const allowedViewerEmails = computeEventViewerEmails(ev);
        const payload = stripUndefinedAndNulls({
          ...ev,
          id: safeId,
          title: String(ev.title || 'Scheduled Session').trim().slice(0, 300),
          allowedViewerEmails,
          updatedAt: now,
        });
        try {
          await setDoc(doc(db, 'events', safeId), payload);
        } catch (err) {
          console.error('Firestore event write error:', buildFirestoreErrorInfo(err, OperationType.WRITE, `events/${safeId}`));
        }
      }),
    ]);
  };

  const setBatches = async (newBatches: Batch[]): Promise<void> => {
    const validNew = Array.isArray(newBatches) ? newBatches : [];
    const deleted = batches.filter((prev) => !validNew.some((n) => n.id === prev.id));
    setBatchesState(validNew);

    const now = new Date().toISOString();
    await Promise.all([
      ...deleted
        .filter((d) => d.id)
        .map((d) =>
          deleteDoc(doc(db, 'batches', toValidDocId(d.id, 'BATCH'))).catch((err) =>
            console.error('Delete batch error:', err)
          )
        ),
      ...validNew.map(async (b) => {
        const prev = batches.find((p) => p.id === b.id);
        if (prev && JSON.stringify(prev) === JSON.stringify(b)) return;
        const safeId = toValidDocId(b.id || `BATCH-${Date.now()}`, 'BATCH');
        const allowedViewerEmails = computeBatchViewerEmails(b);
        const payload = stripUndefinedAndNulls({
          ...b,
          id: safeId,
          name: String(b.name || 'Cohort Batch').trim().slice(0, 200),
          allowedViewerEmails,
          updatedAt: now,
        });
        try {
          await setDoc(doc(db, 'batches', safeId), payload);
        } catch (err) {
          console.error('Firestore batch write error:', buildFirestoreErrorInfo(err, OperationType.WRITE, `batches/${safeId}`));
        }
      }),
    ]);
  };

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
    const convId = toValidDocId(conversationId || `CONV-${studentId}`, 'CONV');
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

    const targetStudent = students.find((s) => s.id === studentId);
    const existing = conversations.find((c) => c.id === convId || c.studentId === studentId);
    const nextConv: Conversation = existing
      ? {
          ...existing,
          id: convId,
          lastMessage: text,
          lastMessageAt: now,
          updatedAt: now,
          messages: [...(existing.messages || []), newMsg],
        }
      : {
          id: convId,
          studentId,
          studentName,
          studentEmail: normalizeEmail(targetStudent?.email) || undefined,
          channel,
          lastMessage: text,
          lastMessageAt: now,
          updatedAt: now,
          status: 'Open',
          messages: [newMsg],
        };

    setConversationsState((prev) => {
      const exists = prev.some((c) => c.id === convId);
      return exists ? prev.map((c) => (c.id === convId ? nextConv : c)) : [nextConv, ...prev];
    });

    const convPayload = stripUndefinedAndNulls({
      ...nextConv,
      studentEmail: normalizeEmail(nextConv.studentEmail || targetStudent?.email) || undefined,
      allowedViewerEmails: computeStudentViewerEmails(targetStudent),
    });

    try {
      await setDoc(doc(db, 'conversations', convId), convPayload);
    } catch (err) {
      console.error('Firestore conversation write error:', buildFirestoreErrorInfo(err, OperationType.WRITE, `conversations/${convId}`));
    }

    if (targetStudent) {
      const existingMsgs = Array.isArray(targetStudent.conversations) ? targetStudent.conversations : [];
      await updateStudent({
        ...targetStudent,
        conversations: [...existingMsgs, newMsg],
      });
    }
  };

  const addAppNotification = async (
    notif: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'> & { id?: string }
  ): Promise<void> => {
    const now = new Date().toISOString();
    const safeId = toValidDocId(
      notif.id || `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      'NOTIF'
    );

    const matchedStu =
      notif.recipientType === 'student'
        ? students.find((s) => s.id === notif.recipientId || normalizeEmail(s.email) === normalizeEmail(notif.recipientId))
        : students.find((s) => s.id === notif.metadataJson?.studentId);
    const matchedStaffRec =
      notif.recipientType === 'staff'
        ? staff.find((st) => st.id === notif.recipientId || normalizeEmail(st.email) === normalizeEmail(notif.recipientId))
        : undefined;

    const recipientEmail =
      normalizeEmail(notif.metadataJson?.studentEmail) ||
      normalizeEmail(matchedStu?.email) ||
      normalizeEmail(matchedStaffRec?.email) ||
      undefined;

    const viewerEmails = new Set<string>(getGlobalStaffEmails());
    if (notif.recipientType === 'student') {
      computeStudentViewerEmails(matchedStu).forEach((em) => viewerEmails.add(em));
      if (recipientEmail) viewerEmails.add(recipientEmail);
    } else {
      if (matchedStaffRec?.email) viewerEmails.add(normalizeEmail(matchedStaffRec.email));
      if (notif.recipientId === 'ALL_COUNSELORS') {
        staff.forEach((st) => {
          if (st.email) viewerEmails.add(normalizeEmail(st.email));
        });
      }
      if (matchedStu) {
        computeStudentViewerEmails(matchedStu).forEach((em) => viewerEmails.add(em));
      }
    }

    const record: AppNotification = {
      id: safeId,
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

    setAppNotificationsState((prev) => [record, ...prev.filter((n) => n.id !== safeId)].slice(0, 150));

    const payload = stripUndefinedAndNulls({
      ...record,
      recipientEmail,
      allowedViewerEmails: Array.from(viewerEmails).slice(0, 50),
    });

    try {
      await setDoc(doc(db, 'notifications', safeId), payload);
    } catch (err) {
      console.error('Firestore notification write error:', buildFirestoreErrorInfo(err, OperationType.WRITE, `notifications/${safeId}`));
    }
  };

  const markAppNotificationRead = async (notifId: string): Promise<void> => {
    const safeId = toValidDocId(notifId, 'NOTIF');
    setAppNotificationsState((prev) => prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n)));
    try {
      await updateDoc(doc(db, 'notifications', safeId), { isRead: true });
    } catch (err) {
      console.error('Firestore notification mark-read error:', buildFirestoreErrorInfo(err, OperationType.UPDATE, `notifications/${safeId}`));
    }
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
    const safeId = toValidDocId(userId, 'lpperm');
    const matchedStaff = staff.find((st) => st.id === userId || normalizeEmail(st.email) === normalizeEmail(userId));
    const userEmail = normalizeEmail(matchedStaff?.email) || (userId.includes('@') ? normalizeEmail(userId) : undefined);

    const record: LaunchpadTeamPermission = {
      userId,
      accessScope,
      launchpadStudentTabAccess: granular?.launchpadStudentTabAccess ?? accessScope,
      launchpadReviewExerciseAccess: granular?.launchpadReviewExerciseAccess ?? accessScope,
      launchpadEditCurriculumAccess: granular?.launchpadEditCurriculumAccess ?? 'none',
      updatedBy: updatedBy || currentUser?.name || 'Admin',
      updatedAt: now,
    };

    setLaunchpadPermissionsState((prev) => {
      const exists = prev.some((p) => p.userId === userId);
      return exists ? prev.map((p) => (p.userId === userId ? { ...p, ...record } : p)) : [...prev, record];
    });

    if (isUserAdmin(currentUser)) {
      void setDoc(
        doc(db, 'launchpad_team_permissions', safeId),
        stripUndefinedAndNulls({ ...record, userEmail })
      ).catch((err) =>
        console.error('Firestore launchpad_team_permissions error:', buildFirestoreErrorInfo(err, OperationType.WRITE, `launchpad_team_permissions/${safeId}`))
      );
    }
  };

  const saveLaunchpadSubject = async (subject: LaunchpadSubject): Promise<void> => {
    const now = new Date().toISOString();
    const safeId = toValidDocId(subject.id, 'subj');
    const normalized: LaunchpadSubject = {
      ...subject,
      id: safeId,
      iconKey: subject.iconKey || safeId,
      passingThreshold: subject.passingThreshold ?? 75,
      certificateTitle: subject.certificateTitle || `Launchpad Certified — ${subject.title}`,
      isArchived: Boolean(subject.isArchived),
    };

    setLaunchpadSubjectsState((prev) => {
      const exists = prev.some((s) => s.id === safeId);
      const next = exists ? prev.map((s) => (s.id === safeId ? normalized : s)) : [...prev, normalized];
      return [...next].sort((a, b) => a.order - b.order);
    });

    try {
      await setDoc(
        doc(db, 'launchpad_subjects', safeId),
        stripUndefinedAndNulls({
          ...normalized,
          portalScope: 'verified_portal',
          updatedAt: now,
        })
      );
    } catch (err) {
      console.error('Firestore saveLaunchpadSubject error:', buildFirestoreErrorInfo(err, OperationType.WRITE, `launchpad_subjects/${safeId}`));
    }
  };

  const deleteLaunchpadSubject = async (subjectId: string): Promise<void> => {
    const safeSubjId = toValidDocId(subjectId, 'subj');
    const chaptersToDelete = launchpadChapters.filter((c) => c.subjectId === subjectId);
    const qsToDelete = launchpadCertQuestions.filter((q) => q.subjectId === subjectId);

    setLaunchpadSubjectsState((prev) => prev.filter((s) => s.id !== subjectId && s.id !== safeSubjId));
    setLaunchpadChaptersState((prev) => prev.filter((c) => c.subjectId !== subjectId && c.subjectId !== safeSubjId));
    setLaunchpadCertQuestionsState((prev) => prev.filter((q) => q.subjectId !== subjectId && q.subjectId !== safeSubjId));

    try {
      await deleteDoc(doc(db, 'launchpad_subjects', safeSubjId));
      await Promise.all([
        ...chaptersToDelete
          .filter((c) => c.id)
          .map((c) => deleteDoc(doc(db, 'launchpad_chapters', toValidDocId(c.id!, 'chap'))).catch(() => {})),
        ...qsToDelete
          .filter((q) => q.id)
          .map((q) => deleteDoc(doc(db, 'launchpad_cert_questions', toValidDocId(q.id, 'cq'))).catch(() => {})),
      ]);
    } catch (err) {
      console.error('Firestore deleteLaunchpadSubject error:', err);
    }
  };

  const saveLaunchpadChapter = async (chapter: LaunchpadWeekModule): Promise<void> => {
    const now = new Date().toISOString();
    const subjectId = chapter.subjectId || 'comm-public-speaking';
    const chapterId = toValidDocId(
      chapter.id || `${subjectId}__w${chapter.weekNumber}__${Date.now()}`,
      'chap'
    );
    const normalized: LaunchpadWeekModule = { ...chapter, id: chapterId, subjectId };

    setLaunchpadChaptersState((prev) => {
      const exists = prev.some((c) => c.id === chapterId);
      const next = exists ? prev.map((c) => (c.id === chapterId ? normalized : c)) : [...prev, normalized];
      return [...next].sort((a, b) => a.weekNumber - b.weekNumber);
    });

    const parentSubject = launchpadSubjects.find((s) => s.id === subjectId);
    if (parentSubject && !parentSubject.hasCurriculum) {
      void saveLaunchpadSubject({ ...parentSubject, hasCurriculum: true });
    }

    try {
      await setDoc(
        doc(db, 'launchpad_chapters', chapterId),
        stripUndefinedAndNulls({
          ...normalized,
          portalScope: 'verified_portal',
          updatedAt: now,
        })
      );
    } catch (err) {
      console.error('Firestore saveLaunchpadChapter error:', buildFirestoreErrorInfo(err, OperationType.WRITE, `launchpad_chapters/${chapterId}`));
    }
  };

  const reorderLaunchpadChapters = async (subjectId: string, orderedChapterIds: string[]): Promise<void> => {
    const now = new Date().toISOString();
    const updatedChapters: LaunchpadWeekModule[] = [];

    setLaunchpadChaptersState((prev) => {
      const next = prev.map((ch) => {
        if ((ch.subjectId || 'comm-public-speaking') !== subjectId) return ch;
        const idx = orderedChapterIds.indexOf(ch.id || `${subjectId}__w${ch.weekNumber}`);
        if (idx === -1) return ch;
        const updated = { ...ch, weekNumber: idx + 1 };
        updatedChapters.push(updated);
        return updated;
      });
      return [...next].sort((a, b) => a.weekNumber - b.weekNumber);
    });

    await Promise.all(
      updatedChapters.map((ch) => {
        const safeId = toValidDocId(ch.id || `${subjectId}__w${ch.weekNumber}`, 'chap');
        return setDoc(
          doc(db, 'launchpad_chapters', safeId),
          stripUndefinedAndNulls({
            ...ch,
            id: safeId,
            portalScope: 'verified_portal',
            updatedAt: now,
          })
        ).catch((err) => console.error('Reorder chapter write error:', err));
      })
    );
  };

  const deleteLaunchpadChapter = async (chapterId: string, subjectId: string): Promise<void> => {
    const now = new Date().toISOString();
    const safeId = toValidDocId(chapterId, 'chap');
    const renumberedUpdates: LaunchpadWeekModule[] = [];

    setLaunchpadChaptersState((prev) => {
      const filtered = prev.filter((c) => c.id !== chapterId && c.id !== safeId);
      let weekSeq = 1;
      return filtered.map((c) => {
        if ((c.subjectId || 'comm-public-speaking') !== subjectId) return c;
        const nextWeek = weekSeq++;
        if (c.weekNumber !== nextWeek) {
          const updated = { ...c, weekNumber: nextWeek };
          renumberedUpdates.push(updated);
          return updated;
        }
        return c;
      });
    });

    try {
      await deleteDoc(doc(db, 'launchpad_chapters', safeId));
      await Promise.all(
        renumberedUpdates.map((ch) => {
          const chId = toValidDocId(ch.id || `${subjectId}__w${ch.weekNumber}`, 'chap');
          return setDoc(
            doc(db, 'launchpad_chapters', chId),
            stripUndefinedAndNulls({ ...ch, id: chId, portalScope: 'verified_portal', updatedAt: now })
          ).catch(() => {});
        })
      );
    } catch (err) {
      console.error('Firestore deleteLaunchpadChapter error:', err);
    }
  };

  const saveLaunchpadCertQuestion = async (question: LaunchpadCertQuestionRecord): Promise<void> => {
    const now = new Date().toISOString();
    const safeId = toValidDocId(question.id, 'cq');
    const normalized = { ...question, id: safeId };

    setLaunchpadCertQuestionsState((prev) => {
      const exists = prev.some((q) => q.id === safeId);
      const next = exists ? prev.map((q) => (q.id === safeId ? normalized : q)) : [...prev, normalized];
      return [...next].sort((a, b) => a.sortOrder - b.sortOrder);
    });

    try {
      await setDoc(
        doc(db, 'launchpad_cert_questions', safeId),
        stripUndefinedAndNulls({
          ...normalized,
          portalScope: 'verified_portal',
          updatedAt: now,
        })
      );
    } catch (err) {
      console.error('Firestore saveLaunchpadCertQuestion error:', buildFirestoreErrorInfo(err, OperationType.WRITE, `launchpad_cert_questions/${safeId}`));
    }
  };

  const deleteLaunchpadCertQuestion = async (questionId: string): Promise<void> => {
    const safeId = toValidDocId(questionId, 'cq');
    setLaunchpadCertQuestionsState((prev) => prev.filter((q) => q.id !== questionId && q.id !== safeId));
    try {
      await deleteDoc(doc(db, 'launchpad_cert_questions', safeId));
    } catch (err) {
      console.error('Firestore deleteLaunchpadCertQuestion error:', err);
    }
  };

  const assignStudentsToLaunchpad = async (studentIds: string[], assignedBy: string): Promise<void> => {
    const now = new Date().toISOString();
    const additions: LaunchpadEnrollment[] = [];

    studentIds.forEach((sid) => {
      const safeId = toValidDocId(sid, 'STU');
      if (launchpadEnrollments.some((e) => e.studentId === safeId || e.studentId === sid)) return;
      const stu = students.find((s) => s.id === sid || s.id === safeId);
      additions.push({
        studentId: safeId,
        studentEmail: normalizeEmail(stu?.email) || undefined,
        assignedBy,
        assignedAt: now,
      });
    });

    if (additions.length > 0) {
      setLaunchpadEnrollmentsState((prev) => [...prev, ...additions]);
    }

    await Promise.all(
      additions.map((enr) => {
        const stu = students.find((s) => s.id === enr.studentId || normalizeEmail(s.email) === enr.studentEmail);
        return setDoc(
          doc(db, 'launchpad_enrollments', enr.studentId),
          stripUndefinedAndNulls({
            ...enr,
            allowedViewerEmails: computeStudentViewerEmails(stu),
          })
        ).catch((err) =>
          console.error('Firestore enrollment write error:', buildFirestoreErrorInfo(err, OperationType.WRITE, `launchpad_enrollments/${enr.studentId}`))
        );
      })
    );
  };

  const removeStudentFromLaunchpad = async (studentId: string): Promise<void> => {
    const safeId = toValidDocId(studentId, 'STU');
    setLaunchpadEnrollmentsState((prev) => prev.filter((e) => e.studentId !== studentId && e.studentId !== safeId));
    try {
      await deleteDoc(doc(db, 'launchpad_enrollments', safeId));
    } catch (err) {
      console.error('Firestore removeStudentFromLaunchpad error:', err);
    }
  };

  const buildLaunchpadTaskId = (studentId: string, subjectId: string, weekNumber: number) =>
    `LP-TASK-${studentId}-${subjectId}-W${weekNumber}`;

  const toggleLaunchpadSubjectRelease = async (
    studentId: string,
    subjectId: string,
    isUnlocked: boolean,
    unlockedBy?: string,
    studentEmail?: string
  ): Promise<boolean> => {
    const now = new Date().toISOString();
    const safeStudentId = toValidDocId(studentId, 'STU');
    const safeSubjectId = toValidDocId(subjectId, 'subj');
    const docId = toValidDocId(`${safeStudentId}__${safeSubjectId}`, 'rel');

    const matchedStudent = students.find(
      (s) => s.id === studentId || s.id === safeStudentId || (studentEmail && normalizeEmail(s.email) === normalizeEmail(studentEmail))
    );
    const cleanEmail = normalizeEmail(studentEmail || matchedStudent?.email) || undefined;
    const actor = unlockedBy || currentUser?.name || 'Counselor';
    const viewerEmails = computeStudentViewerEmails({
      ...matchedStudent,
      id: safeStudentId,
      email: cleanEmail,
    });

    const previousReleasesSnapshot = [...launchpadSubjectReleases];
    const releaseRecord: LaunchpadSubjectRelease = {
      id: docId,
      studentId: safeStudentId,
      studentEmail: cleanEmail,
      subjectId: safeSubjectId,
      isUnlocked: Boolean(isUnlocked),
      unlockedBy: actor,
      unlockedAt: now,
    };

    // Optimistic state update
    setLaunchpadSubjectReleasesState((prev) => {
      const exists = prev.some((r) => r.id === docId || (r.studentId === studentId && r.subjectId === subjectId));
      return exists
        ? prev.map((r) =>
            r.id === docId || (r.studentId === studentId && r.subjectId === subjectId) ? releaseRecord : r
          )
        : [...prev, releaseRecord];
    });

    try {
      // Persist directly to Firestore (no Cloud SQL /api/launchpad/releases dependency)
      await setDoc(
        doc(db, 'launchpad_releases', docId),
        stripUndefinedAndNulls({
          ...releaseRecord,
          allowedViewerEmails: viewerEmails,
        })
      );

      if (isUnlocked) {
        const alreadyEnrolled = launchpadEnrollments.some(
          (e) => e.studentId === safeStudentId || e.studentId === studentId
        );
        if (!alreadyEnrolled) {
          const enrollment: LaunchpadEnrollment = {
            studentId: safeStudentId,
            studentEmail: cleanEmail,
            assignedBy: actor,
            assignedAt: now,
          };
          setLaunchpadEnrollmentsState((prev) => [...prev, enrollment]);
          await setDoc(
            doc(db, 'launchpad_enrollments', safeStudentId),
            stripUndefinedAndNulls({
              ...enrollment,
              allowedViewerEmails: viewerEmails,
            })
          );
        }
      }
    } catch (err) {
      console.error(
        'Firestore Launchpad release save failed:',
        buildFirestoreErrorInfo(err, OperationType.WRITE, `launchpad_releases/${docId}`)
      );
      setLaunchpadSubjectReleasesState(previousReleasesSnapshot);
      return false;
    }

    if (isUnlocked) {
      const subject =
        launchpadSubjects.find((s) => s.id === subjectId || s.id === safeSubjectId) ||
        LAUNCHPAD_SUBJECTS.find((s) => s.id === subjectId);
      const subjectTitle = subject?.title || 'Launchpad Subject';
      const subjectChapters = launchpadChapters
        .filter((c) => (c.subjectId || 'comm-public-speaking') === subjectId)
        .sort((a, b) => a.weekNumber - b.weekNumber);
      const week1 = subjectChapters[0] || (subjectId === 'comm-public-speaking' ? SUBJECT_1_WEEKS[0] : undefined);
      const week1Title = week1?.title || 'Week 1 Module';

      void addAppNotification({
        recipientType: 'student',
        recipientId: safeStudentId,
        category: 'LAUNCHPAD',
        title: 'New Launchpad Subject Unlocked',
        message: `New Launchpad Subject Unlocked: ${subjectTitle} is now available.`,
        link: `/student/launchpad?subject=${encodeURIComponent(subjectId)}&week=1`,
        metadataJson: {
          subjectId,
          subjectTitle,
          weekNumber: 1,
          unlockedBy: actor,
          studentEmail: cleanEmail,
        },
      });

      if (matchedStudent) {
        const w1TaskId = buildLaunchpadTaskId(matchedStudent.id, subjectId, 1);
        const existingTasks = Array.isArray(matchedStudent.tasks) ? matchedStudent.tasks : [];
        if (!existingTasks.some((t) => t.id === w1TaskId)) {
          const newTask: Task = normalizeTask(
            {
              id: w1TaskId,
              name: `${subjectTitle} — Week 1: ${week1Title}`,
              category: 'Launchpad',
              stage: 'TO_DO',
              dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
              assignedBy: actor || matchedStudent.counselor || 'Launchpad Counselor',
              description: `Launchpad Week 1: Read Guide, Watch Lecture, and submit the Practical Exercise for "${week1Title}".`,
              launchpadMeta: {
                subjectId,
                subjectTitle,
                weekNumber: 1,
                chapterTitle: week1Title,
              },
            },
            { studentId: matchedStudent.id, studentName: matchedStudent.name }
          );
          await updateStudent({
            ...matchedStudent,
            tasks: [newTask, ...existingTasks],
          });
        }
      }
    }

    return true;
  };

  const saveLaunchpadWeekProgress = async (progressItem: LaunchpadWeekProgress): Promise<void> => {
    const now = new Date().toISOString();
    const safeStudentId = toValidDocId(progressItem.studentId, 'STU');
    const safeSubjectId = toValidDocId(progressItem.subjectId, 'subj');
    const safeId = toValidDocId(
      progressItem.id || `${safeStudentId}__${safeSubjectId}__w${progressItem.weekNumber}`,
      'prog'
    );
    const matchedStu = students.find((s) => s.id === progressItem.studentId || s.id === safeStudentId);
    const studentEmail = normalizeEmail(matchedStu?.email || currentUser?.email) || undefined;
    const nextItem: LaunchpadWeekProgress = {
      ...progressItem,
      id: safeId,
      studentId: safeStudentId,
      subjectId: safeSubjectId,
      updatedAt: now,
    };

    setLaunchpadProgressState((prev) => {
      const exists = prev.some((p) => p.id === safeId);
      return exists ? prev.map((p) => (p.id === safeId ? nextItem : p)) : [...prev, nextItem];
    });

    const isStudentSelf = (currentUser?.role || '').toUpperCase() === 'STUDENT';
    const payload = stripUndefinedAndNulls({
      ...nextItem,
      studentEmail,
      allowedViewerEmails: computeStudentViewerEmails({ ...matchedStu, id: safeStudentId, email: studentEmail }),
    });

    try {
      const ref = doc(db, 'launchpad_progress', safeId);
      const snap = await getDoc(ref);
      if (snap.exists() && isStudentSelf) {
        const studentPatch: Record<string, any> = {
          lectureCompleted: Boolean(nextItem.lectureCompleted),
          readingCompleted: Boolean(nextItem.readingCompleted),
          exerciseCompleted: Boolean(nextItem.exerciseCompleted),
          updatedAt: now,
        };
        if (nextItem.exerciseSubmissionJson !== undefined) {
          studentPatch.exerciseSubmissionJson = payload.exerciseSubmissionJson;
        }
        if (nextItem.evaluationStatus !== undefined) {
          studentPatch.evaluationStatus = nextItem.evaluationStatus;
        }
        await updateDoc(ref, studentPatch);
      } else {
        await setDoc(ref, payload);
      }
    } catch (err) {
      console.error('Firestore saveLaunchpadWeekProgress error:', buildFirestoreErrorInfo(err, OperationType.WRITE, `launchpad_progress/${safeId}`));
    }
  };

  const markLaunchpadWeekInProgress = (studentId: string, subjectId: string, weekNumber: number) => {
    const student = students.find((s) => s.id === studentId);
    if (!student || !Array.isArray(student.tasks)) return;
    const taskId = buildLaunchpadTaskId(studentId, subjectId, weekNumber);
    const matchingTask = student.tasks.find(
      (t) => t.id === taskId || (t.launchpadMeta?.subjectId === subjectId && t.launchpadMeta?.weekNumber === weekNumber)
    );
    if (matchingTask && matchingTask.stage === 'TO_DO') {
      const updatedTasks = student.tasks.map((t) =>
        t.id === matchingTask.id ? { ...t, stage: 'IN_PROGRESS' as const } : t
      );
      void updateStudent({ ...student, tasks: updatedTasks });
    }
  };

  const submitLaunchpadPracticalExercise = async ({
    studentId,
    subjectId,
    weekNumber,
    progressItem,
  }: {
    studentId: string;
    subjectId: string;
    weekNumber: number;
    progressItem: LaunchpadWeekProgress;
  }): Promise<void> => {
    const now = new Date().toISOString();
    const subject =
      launchpadSubjects.find((s) => s.id === subjectId) || LAUNCHPAD_SUBJECTS.find((s) => s.id === subjectId);
    const subjectTitle = subject?.title || 'Launchpad Subject';
    const subjectChapters = launchpadChapters
      .filter((c) => (c.subjectId || 'comm-public-speaking') === subjectId)
      .sort((a, b) => a.weekNumber - b.weekNumber);
    const currentChapter = subjectChapters.find((c) => c.weekNumber === weekNumber);
    const chapterTitle = currentChapter?.title || `Week ${weekNumber}`;

    const enrichedProgress: LaunchpadWeekProgress = {
      ...progressItem,
      exerciseCompleted: true,
      evaluationStatus: 'Submitted',
      updatedAt: now,
    };
    await saveLaunchpadWeekProgress(enrichedProgress);

    const student = students.find((s) => s.id === studentId);
    const currentTaskId = buildLaunchpadTaskId(studentId, subjectId, weekNumber);
    if (student) {
      const existingTasks = Array.isArray(student.tasks) ? [...student.tasks] : [];
      const idx = existingTasks.findIndex(
        (t) =>
          t.id === currentTaskId ||
          (t.launchpadMeta?.subjectId === subjectId && t.launchpadMeta?.weekNumber === weekNumber)
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
          normalizeTask(
            {
              id: currentTaskId,
              name: `${subjectTitle} — Week ${weekNumber}: ${chapterTitle}`,
              category: 'Launchpad',
              stage: 'SUBMITTED_FOR_REVIEW',
              dueDate: new Date().toISOString().split('T')[0],
              assignedBy: student.counselor || 'Launchpad Counselor',
              submittedAt: now,
              submissionLink: attachmentUrl || undefined,
              description: `Practical exercise submission for ${subjectTitle} Week ${weekNumber}.`,
              launchpadMeta: { subjectId, subjectTitle, weekNumber, chapterTitle },
            },
            { studentId: student.id, studentName: student.name }
          )
        );
      }

      const nextChapter = subjectChapters.find((c) => c.weekNumber > weekNumber);
      if (nextChapter) {
        const nextTaskId = buildLaunchpadTaskId(studentId, subjectId, nextChapter.weekNumber);
        const alreadyHasNext = existingTasks.some(
          (t) =>
            t.id === nextTaskId ||
            (t.launchpadMeta?.subjectId === subjectId && t.launchpadMeta?.weekNumber === nextChapter.weekNumber)
        );
        if (!alreadyHasNext) {
          existingTasks.unshift(
            normalizeTask(
              {
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
                  chapterTitle: nextChapter.title,
                },
              },
              { studentId: student.id, studentName: student.name }
            )
          );
        }
      }

      await updateStudent({ ...student, tasks: existingTasks });
    }

    const safeStudentId = toValidDocId(studentId, 'STU');
    const safeSubjectId = toValidDocId(subjectId, 'subj');
    const evalId = toValidDocId(`${safeStudentId}__${safeSubjectId}__w${weekNumber}`, 'eval');
    const fieldLabels: Record<string, string> = {};
    currentChapter?.practicalExercise?.fields?.forEach((f) => {
      fieldLabels[f.key] = f.label;
    });

    const studentEmail = normalizeEmail(student?.email || currentUser?.email) || undefined;
    const evaluationRecord: LaunchpadAssignmentEvaluation = {
      id: evalId,
      sourceType: 'LAUNCHPAD',
      studentId: safeStudentId,
      studentName: student?.name || currentUser?.name || 'Student',
      subjectId: safeSubjectId,
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

    setLaunchpadEvaluationsState((prev) => {
      const exists = prev.some((e) => e.id === evalId);
      return exists ? prev.map((e) => (e.id === evalId ? evaluationRecord : e)) : [evaluationRecord, ...prev];
    });

    const evalPayload = stripUndefinedAndNulls({
      ...evaluationRecord,
      studentEmail,
      allowedViewerEmails: computeStudentViewerEmails({ ...student, id: safeStudentId, email: studentEmail }),
    });

    try {
      const ref = doc(db, 'assignment_evaluations', evalId);
      const snap = await getDoc(ref);
      const isStudentSelf = (currentUser?.role || '').toUpperCase() === 'STUDENT';
      if (snap.exists() && isStudentSelf) {
        await updateDoc(ref, {
          submissionJson: evalPayload.submissionJson,
          status: 'Submitted',
          submittedAt: now,
          chapterTitle,
          taskId: currentTaskId,
        });
      } else {
        await setDoc(ref, evalPayload);
      }
    } catch (err) {
      console.error('Firestore evaluation submit error:', buildFirestoreErrorInfo(err, OperationType.WRITE, `assignment_evaluations/${evalId}`));
    }

    const assignedStaff = staff.find(
      (st) => student?.counselor && st.name.toLowerCase() === student.counselor.toLowerCase()
    );
    await addAppNotification({
      recipientType: 'staff',
      recipientId: assignedStaff?.id || 'ALL_COUNSELORS',
      category: 'LAUNCHPAD',
      title: 'Launchpad Exercise Submitted',
      message: `${student?.name || 'Student'} submitted ${subjectTitle} — Week ${weekNumber} Exercise`,
      link: `/team/evaluator?tab=LAUNCHPAD&evalId=${encodeURIComponent(evalId)}`,
      metadataJson: {
        evalId,
        studentId: safeStudentId,
        studentName: student?.name || 'Student',
        studentEmail,
        counselorName: student?.counselor || '',
        subjectId: safeSubjectId,
        subjectTitle,
        weekNumber,
      },
    });
  };

  const evaluateLaunchpadSubmission = async ({
    evalId,
    status,
    feedback,
    evaluatorName,
  }: {
    evalId: string;
    status: 'Submitted' | 'Approved' | 'Needs Revision' | 'Reviewed';
    feedback: string;
    evaluatorName: string;
  }): Promise<void> => {
    const now = new Date().toISOString();
    const targetEval = launchpadEvaluations.find((e) => e.id === evalId);
    if (!targetEval) return;

    const safeEvalId = toValidDocId(evalId, 'eval');
    const updatedEval: LaunchpadAssignmentEvaluation = {
      ...targetEval,
      id: safeEvalId,
      status,
      feedback,
      evaluatedBy: evaluatorName,
      evaluatedAt: now,
    };

    setLaunchpadEvaluationsState((prev) => prev.map((e) => (e.id === evalId ? updatedEval : e)));

    const student = students.find((s) => s.id === targetEval.studentId);
    const studentEmail = normalizeEmail(student?.email) || undefined;

    try {
      await setDoc(
        doc(db, 'assignment_evaluations', safeEvalId),
        stripUndefinedAndNulls({
          ...updatedEval,
          studentEmail,
          allowedViewerEmails: computeStudentViewerEmails({ ...student, id: targetEval.studentId, email: studentEmail }),
        })
      );
    } catch (err) {
      console.error('Firestore evaluateLaunchpadSubmission error:', buildFirestoreErrorInfo(err, OperationType.WRITE, `assignment_evaluations/${safeEvalId}`));
    }

    const existingProg = launchpadProgress.find(
      (p) =>
        p.studentId === targetEval.studentId &&
        p.subjectId === targetEval.subjectId &&
        p.weekNumber === targetEval.weekNumber
    );
    await saveLaunchpadWeekProgress({
      id: safeEvalId,
      studentId: targetEval.studentId,
      subjectId: targetEval.subjectId,
      weekNumber: targetEval.weekNumber,
      lectureCompleted: existingProg?.lectureCompleted ?? false,
      readingCompleted: existingProg?.readingCompleted ?? false,
      exerciseSubmissionJson: existingProg?.exerciseSubmissionJson ?? targetEval.submissionJson ?? null,
      exerciseCompleted: status !== 'Needs Revision' ? true : existingProg?.exerciseCompleted ?? true,
      evaluationStatus: status,
      evaluatorFeedback: feedback,
      evaluatedBy: evaluatorName,
      evaluatedAt: now,
    });

    if (student && Array.isArray(student.tasks)) {
      const nextStage: Task['stage'] =
        status === 'Needs Revision'
          ? 'NEEDS_REVISION'
          : status === 'Approved' || status === 'Reviewed'
          ? 'COMPLETED'
          : 'SUBMITTED_FOR_REVIEW';
      const taskId = buildLaunchpadTaskId(targetEval.studentId, targetEval.subjectId, targetEval.weekNumber);
      const updatedTasks = student.tasks.map((t) => {
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
      await updateStudent({ ...student, tasks: updatedTasks });
    }

    await addAppNotification({
      recipientType: 'student',
      recipientId: targetEval.studentId,
      category: 'LAUNCHPAD',
      title: `Launchpad Exercise ${status}`,
      message: `${targetEval.subjectTitle} — Week ${targetEval.weekNumber} was marked "${status}" by ${evaluatorName}.`,
      link: `/student/launchpad?subject=${encodeURIComponent(targetEval.subjectId)}&week=${targetEval.weekNumber}`,
      metadataJson: {
        evalId: safeEvalId,
        subjectId: targetEval.subjectId,
        weekNumber: targetEval.weekNumber,
        status,
        feedback,
        studentEmail,
      },
    });
  };

  const saveLaunchpadCertification = async (cert: LaunchpadCertification): Promise<void> => {
    const now = new Date().toISOString();
    const safeStudentId = toValidDocId(cert.studentId, 'STU');
    const safeSubjectId = toValidDocId(cert.subjectId, 'subj');
    const safeId = toValidDocId(cert.id || `${safeStudentId}__${safeSubjectId}`, 'cert');
    const nextCert: LaunchpadCertification = {
      ...cert,
      id: safeId,
      studentId: safeStudentId,
      subjectId: safeSubjectId,
      issuedAt: cert.issuedAt || now,
    };

    setLaunchpadCertificationsState((prev) => {
      const exists = prev.some((c) => c.id === safeId);
      return exists ? prev.map((c) => (c.id === safeId ? nextCert : c)) : [...prev, nextCert];
    });

    const stu = students.find((s) => s.id === cert.studentId || s.id === safeStudentId);
    const studentEmail = normalizeEmail(stu?.email || currentUser?.email) || undefined;

    try {
      await setDoc(
        doc(db, 'launchpad_certifications', safeId),
        stripUndefinedAndNulls({
          ...nextCert,
          studentEmail,
          allowedViewerEmails: computeStudentViewerEmails({ ...stu, id: safeStudentId, email: studentEmail }),
        })
      );
    } catch (err) {
      console.error('Firestore saveLaunchpadCertification error:', buildFirestoreErrorInfo(err, OperationType.WRITE, `launchpad_certifications/${safeId}`));
    }
  };

  const initializeData = async (): Promise<void> => {
    // Firestore onSnapshot streams keep state synchronized automatically once authenticated.
  };

  return (
    <DatabaseContext.Provider
      value={{
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
        isFirebaseAuthReady,
        authError,
        clearAuthError,
        permissionsMatrix: permissionsMatrixState,
        setPermissionsMatrix,
        roles,
        batches,
        events,
        setEvents,
        setBatches,
        initializeData,
        launchpadPermissions,
        setLaunchpadPermission,
        launchpadSubjects,
        saveLaunchpadSubject,
        deleteLaunchpadSubject,
        launchpadChapters,
        saveLaunchpadChapter,
        reorderLaunchpadChapters,
        deleteLaunchpadChapter,
        launchpadCertQuestions,
        saveLaunchpadCertQuestion,
        deleteLaunchpadCertQuestion,
        launchpadEnrollments,
        assignStudentsToLaunchpad,
        removeStudentFromLaunchpad,
        launchpadSubjectReleases,
        toggleLaunchpadSubjectRelease,
        launchpadProgress,
        saveLaunchpadWeekProgress,
        markLaunchpadWeekInProgress,
        submitLaunchpadPracticalExercise,
        launchpadCertifications,
        saveLaunchpadCertification,
        launchpadEvaluations,
        evaluateLaunchpadSubmission,
        appNotifications,
        addAppNotification,
        markAppNotificationRead,
        firestoreStatus,
        provisionPortalUser,
        resetPortalUserPassword,
        signOutAll,
        conversations,
        sendConversationMessage,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (context === undefined) throw new Error('useDatabase must be used within a DatabaseProvider');
  return context;
};
