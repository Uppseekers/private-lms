import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Student, StaffMember, Batch, MeetingMOM, SessionRating, MeetingResourceLink, MeetingTask, OperationalLog } from '@/types';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { normalizeTask, normalizeActivity } from '@/lib/taskActivityUtils';

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
  
  if (role === 'SYSTEM_ADMIN' || role === 'DEVELOPER') {
    clonedTemplate.forEach(cat => {
      cat.items.forEach(item => {
        item.enabled = true;
        if (item.scope) item.scope = 'Global Scope';
      });
    });
  } else if (role === 'OPERATIONS_LEAD') {
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

const initialBatches: Batch[] = [];


const initialEvents: EventItem[] = [];

interface DatabaseContextType {
  students: Student[];
  setStudents: (students: Student[]) => void;
  updateStudent: (student: Student) => void;
  getStudent: (id: string) => Student | undefined;
  staff: StaffMember[];
  setStaff: (staff: StaffMember[]) => void;
  currentUser: StaffMember;
  setCurrentUser: (user: StaffMember) => void;
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
      try { return JSON.parse(saved); } catch (e) {}
    }
    return initialStudents;
  });

  const [staff, setStaffState] = useState<StaffMember[]>(() => {
    const saved = localStorage.getItem('uppseekers_staff_v2');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return initialStaff;
  });
  
  const [permissionsMatrixState, setPermissionsMatrixState] = useState<Record<string, PermissionCategory[]>>(() => {
    const saved = localStorage.getItem('uppseekers_permissions_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const merged = { ...defaultPermissionsMatrix };
        for (const role of Object.keys(parsed)) {
           if (merged[role]) merged[role] = parsed[role];
        }
        return merged;
      } catch(e) {}
    }
    return defaultPermissionsMatrix;
  });

  const [currentUser, setCurrentUser] = useState<StaffMember>(() => {
    return staff.find(s => s.role === 'SYSTEM_ADMIN') || staff[0];
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    // 1. Listen for Students from Firestore
    const unsubStudents = onSnapshot(collection(db, 'students'), async (snapshot) => {
      if (!snapshot.empty) {
        const loaded: Student[] = [];
        snapshot.forEach(docSnap => {
          const s = docSnap.data() as Student;
          if (s.tasks) {
            s.tasks = s.tasks.map(t => normalizeTask(t, { studentId: s.id, studentName: s.name }));
          }
          if (s.activities) {
            s.activities = s.activities.map(a => normalizeActivity(a, { studentId: s.id, studentName: s.name }));
          }
          loaded.push(s);
        });
        setStudentsState(loaded);
        localStorage.setItem('uppseekers_students_v2', JSON.stringify(loaded));
      } else {
        const defaultStudents: Student[] = [
          {
            id: 'STU-101',
            name: 'Aarav Sharma',
            email: 'aarav.sharma@example.com',
            phone: '+91 9876543210',
            intake: 'Fall 2026',
            school: 'Delhi Public School',
            counselor: 'Admin',
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
            counselor: 'Admin',
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
            students: '12 Students',
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
        const defaultBatches: Batch[] = [
          {
            id: 'BATCH-2026-A',
            name: 'Fall 2026 Ivy Cohort A',
            type: 'Master Batch',
            mentors: ['Sarah Jenkins'],
            meetingLink: 'https://zoom.us/j/123456789',
            status: 'Active',
            capacity: 20,
            students: ['STU-101', 'STU-102']
          }
        ];
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
    localStorage.setItem('uppseekers_students_v2', JSON.stringify(newStudents));
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
      localStorage.setItem('uppseekers_students_v2', JSON.stringify(newStudents));
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
    localStorage.setItem('uppseekers_staff_v2', JSON.stringify(newStaff));
    newStaff.forEach(s => {
      if (s.id) {
        setDoc(doc(db, 'staff', s.id), JSON.parse(JSON.stringify(s))).catch(console.error);
      }
    });
  };
  
  const setPermissionsMatrix = (matrix: Record<string, PermissionCategory[]>) => {
    setPermissionsMatrixState(matrix);
    localStorage.setItem('uppseekers_permissions_v2', JSON.stringify(matrix));
  };

  const [events, setEventsState] = useState<EventItem[]>(() => {
    const saved = localStorage.getItem('uppseekers_events_v2');
    if (saved) { try { return JSON.parse(saved); } catch(e) {} }
    return initialEvents;
  });

  const setEvents = async (newEvents: EventItem[]) => {
    const deleted = events.filter(prev => !newEvents.some(n => n.id === prev.id));
    deleted.forEach(d => {
      if (d.id) deleteDoc(doc(db, 'events', d.id)).catch(console.error);
    });
    setEventsState(newEvents);
    localStorage.setItem('uppseekers_events_v2', JSON.stringify(newEvents));
    newEvents.forEach(e => {
      if (e.id) {
        setDoc(doc(db, 'events', e.id), JSON.parse(JSON.stringify(e))).catch(console.error);
      }
    });
    const token = localStorage.getItem('auth_token') || 'custom_user';
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(newEvents)
    }).catch(console.error);
  };

  const [batches, setBatchesState] = useState<Batch[]>(() => {
    const saved = localStorage.getItem('uppseekers_batches_v2');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return initialBatches;
  });

  const setBatches = async (newBatches: Batch[]) => {
    const deleted = batches.filter(prev => !newBatches.some(n => n.id === prev.id));
    deleted.forEach(d => {
      if (d.id) deleteDoc(doc(db, 'batches', d.id)).catch(console.error);
    });
    setBatchesState(newBatches);
    localStorage.setItem('uppseekers_batches_v2', JSON.stringify(newBatches));
    newBatches.forEach(b => {
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
