export interface Activity {
  id: string;
  date: string;
  type: 'SESSION' | 'UPLOAD' | 'UPDATE' | 'SYSTEM' | 'VERIFIED';
  description: string;
}

export interface ShortlistUniversity {
  id: string;
  name: string;
  category: 'Reach' | 'Target' | 'Safety';
  deadline: string;
  status: 'Applying' | 'Considering' | 'Not Applying' | 'Submitted';
  major?: string;
  round?: string;
  portalLink?: string;
  requiredDocs?: string[];
}

export interface EssayVersion {
  id: string;
  version: string;
  content: string;
  date: string;
  feedback?: string;
  evaluations?: Record<string, 'Needs Work' | 'Satisfactory' | 'Excellent'>;
}

export interface Essay {
  id: string;
  prompt: string;
  university?: string;
  status: 'In Progress' | 'Draft Saved' | 'Under Review' | 'Needs Revision' | 'Approved';
  versions: EssayVersion[];
}


export type TaskStage = 'TO_DO' | 'IN_PROGRESS' | 'SUBMITTED_FOR_REVIEW' | 'NEEDS_REVISION' | 'COMPLETED';

export type TaskCategory = 
  | 'Internships'
  | 'Research Projects'
  | 'Competitions & Olympiads'
  | 'Language Proficiency'
  | 'MOOCs & Online Certifications'
  | 'Passion Projects'
  | 'Impact & Community Service Projects'
  | 'Administrative / College Prep';

export interface TaskAttachment {
  id: string;
  fileName: string;
  fileUrl?: string;
  uploadedAt: string;
}

export interface Task {
  id: string;
  name: string;
  category: TaskCategory;
  dueDate: string;
  stage: TaskStage;
  description: string;
  studentNotes?: string;
  externalUrl?: string;
  attachments: TaskAttachment[];
  feedback?: string;
  assignedBy?: string;
}

export interface AcademicScore {
  grade: string;
  score: string;
  isProjected: boolean;
  notes: string;
}

export interface ExtracurricularActivity {
  id: number;
  title: string;
  category: string;
  organization: string;
  startDate: string;
  endDate: string;
  hoursPerWeek: string;
  weeksPerYear: string;
  description: string;
  verified: boolean;
}

export interface Student {
  tasks?: Task[];
  id: string;
  name: string;
  email: string;
  phone: string;
  intake: string;
  countries: string[];
  readiness: number;
  counselor: string;
  school: string;
  activities: Activity[];
  extracurriculars?: ExtracurricularActivity[];
  academicScores?: AcademicScore[];
  shortlist: ShortlistUniversity[];
  documents: { id: string; name: string; type: string; date: string; status: 'Pending' | 'Verified' }[];
  essays: Essay[];
  password?: string;
}

export enum Role {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
}

export interface Batch {
  id: string;
  name: string;
  type: 'Master Batch' | 'Sub-Batch';
  parentBatchId?: string;
  mentors: string[]; // staff IDs or names
  meetingLink: string;
  status: 'Active' | 'Completed' | 'Upcoming';
  capacity: number;
  students: string[]; // student IDs
  completedSessions?: number;
  totalSessions?: number;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  students: string;
  status: 'Active' | 'Suspended';
  password?: string;
}
