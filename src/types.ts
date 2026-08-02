export interface Activity {
  id: string;
  date?: string;
  type?: 'SESSION' | 'UPLOAD' | 'UPDATE' | 'SYSTEM' | 'VERIFIED' | 'EXTRACURRICULAR' | 'TASK_CREATED' | 'TASK_COMPLETED' | string;
  description?: string;
  title?: string;
  category?: string;
  organization?: string;
  role?: string;
  years?: string;
  hoursPerWeek?: string;
  weeksPerYear?: string;
  verified?: boolean;
  author?: string;
  user?: string;
  studentId?: string;
  studentName?: string;
  link?: string;
}

export interface ShortlistUniversity {
  id: string;
  name: string;
  category: 'Reach' | 'Target' | 'Safety';
  deadline: string;
  status: 'Applying' | 'Considering' | 'Not Applying' | 'Submitted' | 'In Progress';
  major?: string;
  round?: string;
  portalLink?: string;
  requiredDocs?: any[];
  attachedDocs?: Record<string, any>;
}

export interface EssayVersion {
  id?: string;
  version?: string;
  versionNumber?: number;
  content: string;
  date: string;
  author?: string;
  feedback?: string;
  evaluations?: Record<string, 'Needs Work' | 'Satisfactory' | 'Excellent'>;
  inlineComments?: any[];
}

export interface Essay {
  id: string;
  title?: string;
  prompt: string;
  university?: string;
  counselor?: string;
  targetCount?: number;
  wordCount?: number;
  status: 'In Progress' | 'Draft Saved' | 'Under Review' | 'Needs Revision' | 'Approved' | 'Draft';
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
  | 'Administrative / College Prep'
  | 'Post Meeting Action'
  | 'Essays & Applications'
  | 'Document Upload'
  | 'Other';

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
  assignmentType?: string;
  relatedTo?: string;
  pdfUrl?: string;
  pdfFileName?: string;
  assignedBatch?: string;
  studentId?: string;
  studentName?: string;
  createdAt?: string;
  updatedAt?: string;
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

export interface DocumentInfo {
  id: string;
  name: string;
  category?: string;
  type: string;
  uploadedBy?: string;
  target?: string;
  notes?: string;
  status: 'Pending' | 'Verified' | 'Rejected' | 'rejected' | 'pending' | 'verified' | 'draft';
  date: string;
  fileExt?: string;
  fileUrl?: string;
}

export interface OperationalLog {
  id: string;
  timestamp: string;
  performedBy: string;
  role: string;
  studentId?: string;
  activityType: string;
  description: string;
  details?: string;
  link?: string;
  resourceName?: string;
}

export interface SessionRating {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface EventItem {
  id?: string;
  title?: string;
  stream?: string;
  type?: string;
  category?: string;
  date?: string;
  day?: string;
  time?: string;
  duration?: string;
  host?: string;
  organiser?: string;
  attendees?: any;
  students?: any;
  status?: string;
  link?: string;
  location?: string;
}

export interface MeetingMOM {
  id: string;
  authorName: string;
  authorRole: string;
  date: string;
  keyPoints: string;
  studentProgress?: string;
  observations?: string;
  nextSteps?: string;
  followUpActions?: string;
}

export interface MeetingResourceLink {
  id: string;
  title: string;
  description?: string;
  url: string;
  addedBy: string;
  addedAt: string;
}

export interface MeetingTask {
  id: string;
  title: string;
  description: string;
  assignedBy: string;
  assignedToStudentId: string;
  assignedToStudentName: string;
  dateAssigned: string;
  dueDate?: string;
  status: TaskStage;
  externalUrl?: string;
  verified?: boolean;
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
  researchMentor?: string;
  satVerbalMentor?: string;
  satMathMentor?: string;
  school: string;
  major1?: string;
  major2?: string;
  taskSheetLink?: string;
  activities: Activity[];
  extracurriculars?: ExtracurricularActivity[];
  operationalLogs?: OperationalLog[];
  academicScores?: AcademicScore[];
  shortlist: ShortlistUniversity[];
  documents: DocumentInfo[];
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
  subject?: 'SAT' | 'Research' | 'Counselling' | string;
  subSubject?: string;
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
