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
});
