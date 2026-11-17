import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name').notNull(),
  password: text('password'),
  role: text('role').notNull(), // 'STUDENT' or other staff roles
  createdAt: timestamp('created_at').defaultNow(),
});

export const studentsData = pgTable('students_data', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  phone: text('phone'),
  intake: text('intake'),
  countries: jsonb('countries').$type<string[]>(),
  readiness: integer('readiness'),
  counselor: text('counselor'),
  school: text('school'),
  activities: jsonb('activities').$type<any[]>(),
  extracurriculars: jsonb('extracurriculars').$type<any[]>(),
  academicScores: jsonb('academic_scores').$type<any[]>(),
  shortlist: jsonb('shortlist').$type<any[]>(),
  documents: jsonb('documents').$type<any[]>(),
  essays: jsonb('essays').$type<any[]>(),
  tasks: jsonb('tasks').$type<any[]>(),
  profileJson: jsonb('profile_json').$type<Record<string, any>>(),
});

export const portalSettings = pgTable('portal_settings', {
  key: text('key').primaryKey(),
  valueJson: jsonb('value_json').$type<Record<string, any>>(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const staffData = pgTable('staff_data', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  students: text('students'),
  status: text('status'),
});

export const batchesData = pgTable('batches_data', {
  id: text('id').primaryKey(), // using text to preserve existing IDs
  name: text('name').notNull(),
  type: text('type').notNull(),
  parentBatchId: text('parent_batch_id'),
  mentors: jsonb('mentors').$type<string[]>(),
  meetingLink: text('meeting_link'),
  status: text('status'),
  capacity: integer('capacity'),
  students: jsonb('students').$type<string[]>(),
  completedSessions: integer('completed_sessions'),
  totalSessions: integer('total_sessions'),
});

export const eventsData = pgTable('events_data', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  date: text('date').notNull(),
  type: text('type').notNull(),
  category: text('category'),
  attendees: text('attendees'),
  status: text('status'),
  link: text('link'),
  time: text('time'),
  duration: text('duration'),
  videoProvider: text('video_provider'),
  zohoMeetingKey: text('zoho_meeting_key'),
  hostStartLink: text('host_start_link'),
  participantEmails: jsonb('participant_emails').$type<string[]>(),
});

export const launchpadTeamPermissions = pgTable('launchpad_team_permissions', {
  userId: text('user_id').primaryKey(),
  accessScope: text('access_scope').notNull().default('none'), // 'global' | 'assigned' | 'read_only' | 'none'
  launchpadStudentTabAccess: text('launchpad_student_tab_access').notNull().default('none'),
  launchpadReviewExerciseAccess: text('launchpad_review_exercise_access').notNull().default('none'),
  launchpadEditCurriculumAccess: text('launchpad_edit_curriculum_access').notNull().default('none'),
  updatedBy: text('updated_by'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const launchpadSubjects = pgTable('launchpad_subjects', {
  id: text('id').primaryKey(),
  sortOrder: integer('sort_order').notNull().default(1),
  title: text('title').notNull(),
  description: text('description').notNull(),
  accentHex: text('accent_hex').notNull().default('#4F46E5'),
  surfaceTint: text('surface_tint').notNull().default('#EEF2FF'),
  iconKey: text('icon_key').notNull().default('comm-public-speaking'),
  customIconUrl: text('custom_icon_url'),
  hasCurriculum: boolean('has_curriculum').notNull().default(false),
  courseGoal: text('course_goal'),
  passingThreshold: integer('passing_threshold').notNull().default(75),
  certificateTitle: text('certificate_title'),
  isArchived: boolean('is_archived').notNull().default(false),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const launchpadChapters = pgTable('launchpad_chapters', {
  id: text('id').primaryKey(),
  subjectId: text('subject_id').notNull(),
  weekNumber: integer('week_number').notNull(),
  title: text('title').notNull(),
  learningObjectives: jsonb('learning_objectives').$type<string[]>(),
  lectureJson: jsonb('lecture_json').$type<Record<string, any>>(),
  readingGuideJson: jsonb('reading_guide_json').$type<Record<string, any>>(),
  practicalExerciseJson: jsonb('practical_exercise_json').$type<Record<string, any>>(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const launchpadCertificationQuestions = pgTable('launchpad_certification_questions', {
  id: text('id').primaryKey(),
  subjectId: text('subject_id').notNull(),
  questionType: text('question_type').notNull(), // 'mcq' | 'situational'
  sortOrder: integer('sort_order').notNull().default(1),
  payloadJson: jsonb('payload_json').$type<Record<string, any>>(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const launchpadStudentEnrollments = pgTable('launchpad_student_enrollments', {
  studentId: text('student_id').primaryKey(),
  studentEmail: text('student_email'),
  assignedBy: text('assigned_by').notNull(),
  assignedAt: timestamp('assigned_at').defaultNow(),
});

export const launchpadSubjectReleases = pgTable('launchpad_subject_releases', {
  id: text('id').primaryKey(), // `${studentId}__${subjectId}`
  studentId: text('student_id').notNull(),
  studentEmail: text('student_email'),
  subjectId: text('subject_id').notNull(),
  isUnlocked: boolean('is_unlocked').notNull().default(false),
  unlockedBy: text('unlocked_by'),
  unlockedAt: timestamp('unlocked_at').defaultNow(),
});

export const launchpadProgressAndSubmissions = pgTable('launchpad_progress_and_submissions', {
  id: text('id').primaryKey(), // `${studentId}__${subjectId}__w${weekNumber}`
  studentId: text('student_id').notNull(),
  subjectId: text('subject_id').notNull(),
  weekNumber: integer('week_number').notNull(),
  lectureCompleted: boolean('lecture_completed').notNull().default(false),
  readingCompleted: boolean('reading_completed').notNull().default(false),
  exerciseSubmissionJson: jsonb('exercise_submission_json').$type<Record<string, any>>(),
  exerciseCompleted: boolean('exercise_completed').notNull().default(false),
  evaluationStatus: text('evaluation_status'),
  evaluatorFeedback: text('evaluator_feedback'),
  evaluatedBy: text('evaluated_by'),
  evaluatedAt: timestamp('evaluated_at'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const launchpadCertifications = pgTable('launchpad_certifications', {
  id: text('id').primaryKey(), // `${studentId}__${subjectId}`
  studentId: text('student_id').notNull(),
  subjectId: text('subject_id').notNull(),
  testScore: integer('test_score').notNull(),
  passed: boolean('passed').notNull().default(false),
  certificateCode: text('certificate_code').notNull(),
  issuedAt: timestamp('issued_at').defaultNow(),
});

export const notificationsTable = pgTable('notifications', {
  id: text('id').primaryKey(),
  recipientType: text('recipient_type').notNull(), // 'student' | 'staff'
  recipientId: text('recipient_id').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  category: text('category').notNull().default('LAUNCHPAD'),
  link: text('link').notNull(),
  metadataJson: jsonb('metadata_json').$type<Record<string, any>>(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const assignmentEvaluations = pgTable('assignment_evaluations', {
  id: text('id').primaryKey(), // `${studentId}__${subjectId}__w${weekNumber}`
  sourceType: text('source_type').notNull().default('LAUNCHPAD'),
  studentId: text('student_id').notNull(),
  studentName: text('student_name').notNull(),
  subjectId: text('subject_id').notNull(),
  subjectTitle: text('subject_title').notNull(),
  weekNumber: integer('week_number').notNull(),
  chapterTitle: text('chapter_title').notNull(),
  taskId: text('task_id'),
  submissionJson: jsonb('submission_json').$type<Record<string, any>>(),
  status: text('status').notNull().default('Submitted'), // 'Submitted' | 'Approved' | 'Needs Revision' | 'Reviewed'
  feedback: text('feedback'),
  evaluatedBy: text('evaluated_by'),
  submittedAt: timestamp('submitted_at').defaultNow(),
  evaluatedAt: timestamp('evaluated_at'),
});

export const zohoConnections = pgTable('zoho_connections', {
  staffKey: text('staff_key').primaryKey(),
  staffUid: text('staff_uid'),
  staffEmail: text('staff_email'),
  staffName: text('staff_name'),
  zohoEmail: text('zoho_email'),
  zohoDisplayName: text('zoho_display_name'),
  zsoid: text('zsoid').notNull(),
  zuid: text('zuid').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  tokenExpiresAt: timestamp('token_expires_at').notNull(),
  accountsServer: text('accounts_server').default('https://accounts.zoho.com'),
  meetingBase: text('meeting_base').default('https://meeting.zoho.com'),
  connectedAt: timestamp('connected_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
