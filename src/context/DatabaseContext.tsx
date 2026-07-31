import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Student, StaffMember } from '@/types';

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
  duration: string;
  stream: string;
  title: string;
  batch?: string;
  students: string;
  location: string;
  notes?: string;
  assignments?: string;
  host?: string;
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
  'RESEARCH_MENTOR',
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

import { Batch } from '@/types';

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
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      // Always fetch latest Cloud SQL data on app startup
      await initializeData(token || '');
      
      if (token) {
        try {
          const response = await fetch('/api/auth/login-credentials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              email: token.split('_')[2] || '', 
              password: 'Uppseekers@1' 
            })
          }).catch(() => null);

          if (response && response.ok) {
            const { user } = await response.json();
            if (user) {
              setCurrentUser(user);
              setIsAuthenticated(true);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
    };
    checkAuth();
  }, []);

  const setStudents = (newStudents: Student[]) => {
    setStudentsState(newStudents);
    localStorage.setItem('uppseekers_students_v2', JSON.stringify(newStudents));
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
  let score = 0;
  let totalWeight = 0;
  
  // Essays (40%)
  if (student.essays && student.essays.length > 0) {
    const approved = student.essays.filter(e => e.status === 'Approved').length;
    score += (approved / student.essays.length) * 40;
  }
  totalWeight += 40;
  
  // Tasks (30%)
  if (student.tasks && student.tasks.length > 0) {
    const completed = student.tasks.filter(t => t.stage === 'COMPLETED').length;
    score += (completed / student.tasks.length) * 30;
  }
  totalWeight += 30;
  
  // Documents (30%)
  if (student.documents && student.documents.length > 0) {
    const verified = student.documents.filter(d => d.status === 'Verified').length;
    score += (verified / student.documents.length) * 30;
  }
  totalWeight += 30;
  
  // Fallback for new students
  if (totalWeight === 100 && score === 0 && (!student.essays?.length && !student.tasks?.length && !student.documents?.length)) {
     return student.readiness || 0;
  }
  
  return Math.round(score);
}

  const updateStudent = async (updatedStudent: Student) => {
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

    const token = localStorage.getItem('auth_token') || 'custom_user';
    fetch('/api/student', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(updatedStudent)
    }).catch(console.error);
  };

  const getStudent = (id: string) => students.find(s => s.id === id);

  const setStaff = (newStaff: StaffMember[]) => {
    setStaffState(newStaff);
    localStorage.setItem('uppseekers_staff_v2', JSON.stringify(newStaff));
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
    setEventsState(newEvents);
    localStorage.setItem('uppseekers_events_v2', JSON.stringify(newEvents));
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
    setBatchesState(newBatches);
    localStorage.setItem('uppseekers_batches_v2', JSON.stringify(newBatches));
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
