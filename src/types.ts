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
  details?: string;
}

export interface ShortlistUniversity {
  id: string;
  name: string;
  category: 'Reach' | 'Target' | 'Safety';
  deadline: string;
  status: 'Applying' | 'Considering' | 'Not Applying' | 'Submitted' | 'In Progress' | 'Accepted' | 'Waitlisted' | 'Deferred' | 'Rejected' | string;
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
  | 'Launchpad'
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
  submittedAt?: string;
  submissionLink?: string;
  launchpadMeta?: {
    subjectId: string;
    subjectTitle: string;
    weekNumber: number;
    chapterTitle: string;
  };
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
  type?: string;
  date?: string;
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
  id: string;
  title: string;
  stream: string;
  type?: string;
  category?: string;
  date?: string;
  day: string;
  time: string;
  duration?: string;
  host?: string;
  organiser?: string;
  attendees?: any;
  students: string;
  studentId?: string;
  studentIds?: string[];
  batch?: string;
  status?: 'Scheduled' | 'Completed' | 'Cancelled' | string;
  link?: string;
  location: string;
  isRecurring?: boolean;
  seriesId?: string;
  sessionNumber?: number;
  totalSessionsInSeries?: number;
  recurrenceRule?: string;
  notes?: string;
  assignments?: string;
  moms?: MeetingMOM[];
  ratings?: SessionRating[];
  resources?: MeetingResourceLink[];
  tasks?: MeetingTask[];
  videoProvider?: 'zoho' | 'manual' | 'custom' | 'zoho_meeting';
  zohoMeetingKey?: string;
  hostStartLink?: string;
  participantEmails?: string[];
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

export interface PortalCredential {
  id: string;
  title: string;
  category: 'University Portal' | 'Application System' | 'Testing & Scores' | 'Financial Aid & Scholarships' | 'Visa & Embassy' | 'Other' | string;
  websiteUrl?: string;
  username: string;
  password?: string;
  pinOrCode?: string;
  linkedUniversity?: string;
  notes?: string;
  lastUpdated: string;
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
  counselorId?: string;
  counselorEmail?: string;
  counsellor?: string;
  mentor?: string;
  mentorId?: string;
  researchMentor?: string;
  satVerbalMentor?: string;
  satMathMentor?: string;
  universityMentor?: string;
  school: string;
  major1?: string;
  major2?: string;
  targetDegree?: string;
  targetCountry?: string;
  grade?: string;
  studentAvailability?: StudentAvailability;
  taskSheetLink?: string;
  activities: Activity[];
  extracurriculars?: ExtracurricularActivity[];
  operationalLogs?: OperationalLog[];
  academicScores?: AcademicScore[];
  shortlist: ShortlistUniversity[];
  documents: DocumentInfo[];
  essays: Essay[];
  password?: string;
  credentials?: PortalCredential[];
  conversations?: ConversationMessage[];
  uid?: string;
  role?: string;
  status?: string;
  allowedViewerEmails?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ConversationMessage {
  id: string;
  conversationId?: string;
  studentId?: string;
  studentName?: string;
  senderId?: string;
  senderName: string;
  senderRole?: string;
  direction?: 'inbound' | 'outbound' | 'note';
  channel?: 'WhatsApp' | 'Email' | 'Audio Call' | 'Zoom Call' | 'Portal' | string;
  text: string;
  timestamp: string;
  read?: boolean;
  attachments?: { name: string; url?: string }[];
}

export interface Conversation {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  studentPhone?: string;
  counselor?: string;
  channel: 'WhatsApp' | 'Email' | 'Audio Call' | 'Zoom Call' | 'Portal' | string;
  subject?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount?: number;
  status?: 'Open' | 'Resolved' | 'Follow-up' | string;
  messages: ConversationMessage[];
  updatedAt?: string;
}

export enum Role {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
}

export interface BatchClassSession {
  id: string;
  sessionNumber: number;
  title: string;
  topic?: string;
  date: string;
  time?: string;
  status: 'Completed' | 'Upcoming' | 'In Progress' | 'Cancelled';
  meetingLink?: string;
  recordingUrl?: string;
  notes?: string;
  joinedStudentIds: string[]; // student IDs who joined/attended
  absentStudentIds?: string[]; // student IDs who were absent / not joined
  seriesId?: string;
  videoProvider?: 'zoho' | 'manual' | 'custom' | 'zoho_meeting';
  zohoMeetingKey?: string;
  hostStartLink?: string;
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
  sessions?: BatchClassSession[];
  scheduleDayTime?: string;
  description?: string;
}

export type DayOfWeekName =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export interface DayAvailabilityTiming {
  enabled: boolean;
  startTime: string; // "HH:mm" 24-hour format, e.g. "10:00"
  endTime: string;   // "HH:mm" 24-hour format, e.g. "18:00"
  breakStart?: string; // Optional "HH:mm", e.g. "13:00"
  breakEnd?: string;   // Optional "HH:mm", e.g. "14:00"
  maxHours?: number;   // Optional Admin per-day hourly counselling bandwidth (1..12)
}

export interface CounsellorPrimaryAvailability {
  mode: 'uniform' | 'custom';
  selectedDays: DayOfWeekName[];
  uniformStartTime: string;
  uniformEndTime: string;
  uniformBreakStart?: string;
  uniformBreakEnd?: string;
  daySchedules: Record<DayOfWeekName, DayAvailabilityTiming>;
  updatedAt?: string;
}

export interface StudentDateAvailabilityOverride {
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  unavailable?: boolean;
}

export interface StudentAvailability {
  mode: 'uniform' | 'custom';
  selectedDays: DayOfWeekName[];
  uniformStartTime: string;
  uniformEndTime: string;
  daySchedules: Record<DayOfWeekName, DayAvailabilityTiming>;
  dateOverrides?: StudentDateAvailabilityOverride[];
  updatedAt?: string;
}

export type CounsellingGradeKey = '7' | '8' | '9' | '10' | '11' | '12';

export interface GradeCounsellingRule {
  durationMinutes: 30 | 45 | 60;
  frequencyPerMonth: 1 | 2 | 3 | 4;
}

export interface CounsellingSchedulerSettings {
  id: string;
  gradeRules: Record<CounsellingGradeKey, GradeCounsellingRule>;
  bufferMinutes: number;
  updatedBy?: string;
  updatedAt?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  students: string;
  status: 'Active' | 'Suspended';
  password?: string;
  uid?: string;
  primaryAvailability?: CounsellorPrimaryAvailability;
  dailyMaxCounsellingHours?: number;
  updatedAt?: string;
}

export type LaunchpadAccessScope = 'none' | 'assigned' | 'global' | 'read_only';
export type LaunchpadCurriculumEditScope = 'none' | 'read_only' | 'enabled';

export interface LaunchpadTeamPermission {
  userId: string;
  accessScope: LaunchpadAccessScope;
  launchpadStudentTabAccess?: LaunchpadAccessScope;
  launchpadReviewExerciseAccess?: LaunchpadAccessScope;
  launchpadEditCurriculumAccess?: LaunchpadCurriculumEditScope;
  updatedBy?: string;
  updatedAt?: string;
}

export interface LaunchpadEnrollment {
  studentId: string;
  studentEmail?: string;
  assignedBy?: string;
  assignedAt?: string;
}

export interface LaunchpadSubjectRelease {
  id: string;
  studentId: string;
  studentEmail?: string;
  subjectId: string;
  isUnlocked: boolean;
  unlockedBy?: string;
  unlockedAt?: string;
}

export interface LaunchpadWeekProgress {
  id: string;
  studentId: string;
  subjectId: string;
  weekNumber: number;
  lectureCompleted: boolean;
  readingCompleted: boolean;
  exerciseSubmissionJson: {
    fields?: Record<string, string>;
    checklist?: Record<string, boolean>;
    attachmentUrl?: string;
    attachmentName?: string;
    submittedAt?: string;
  } | null;
  exerciseCompleted: boolean;
  evaluationStatus?: 'Submitted' | 'Approved' | 'Needs Revision' | 'Reviewed' | null;
  evaluatorFeedback?: string | null;
  evaluatedBy?: string | null;
  evaluatedAt?: string | null;
  updatedAt?: string;
}

export interface LaunchpadCertification {
  id: string;
  studentId: string;
  subjectId: string;
  testScore: number;
  passed: boolean;
  certificateCode: string;
  issuedAt: string;
}

export interface LaunchpadAssignmentEvaluation {
  id: string;
  sourceType: 'LAUNCHPAD';
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectTitle: string;
  weekNumber: number;
  chapterTitle: string;
  taskId: string;
  submissionJson: {
    fields?: Record<string, string>;
    fieldLabels?: Record<string, string>;
    checklist?: Record<string, boolean>;
    attachmentUrl?: string;
    attachmentName?: string;
    submittedAt?: string;
  } | null;
  status: 'Submitted' | 'Approved' | 'Needs Revision' | 'Reviewed';
  feedback: string | null;
  evaluatedBy: string | null;
  submittedAt: string;
  evaluatedAt: string | null;
}

export interface AppNotification {
  id: string;
  recipientType: 'student' | 'staff';
  recipientId: string;
  title: string;
  message: string;
  category?: string;
  link?: string;
  metadataJson?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}
