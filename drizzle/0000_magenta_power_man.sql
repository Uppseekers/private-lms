CREATE TABLE "assignment_evaluations" (
	"id" text PRIMARY KEY NOT NULL,
	"source_type" text DEFAULT 'LAUNCHPAD' NOT NULL,
	"student_id" text NOT NULL,
	"student_name" text NOT NULL,
	"subject_id" text NOT NULL,
	"subject_title" text NOT NULL,
	"week_number" integer NOT NULL,
	"chapter_title" text NOT NULL,
	"task_id" text,
	"submission_json" jsonb,
	"status" text DEFAULT 'Submitted' NOT NULL,
	"feedback" text,
	"evaluated_by" text,
	"submitted_at" timestamp DEFAULT now(),
	"evaluated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "batches_data" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"parent_batch_id" text,
	"mentors" jsonb,
	"meeting_link" text,
	"status" text,
	"capacity" integer,
	"students" jsonb,
	"completed_sessions" integer,
	"total_sessions" integer
);
--> statement-breakpoint
CREATE TABLE "events_data" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"date" text NOT NULL,
	"type" text NOT NULL,
	"category" text,
	"attendees" text,
	"status" text,
	"link" text,
	"time" text,
	"duration" text,
	"video_provider" text,
	"zoho_meeting_key" text,
	"host_start_link" text,
	"participant_emails" jsonb
);
--> statement-breakpoint
CREATE TABLE "launchpad_certification_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"subject_id" text NOT NULL,
	"question_type" text NOT NULL,
	"sort_order" integer DEFAULT 1 NOT NULL,
	"payload_json" jsonb,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "launchpad_certifications" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"test_score" integer NOT NULL,
	"passed" boolean DEFAULT false NOT NULL,
	"certificate_code" text NOT NULL,
	"issued_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "launchpad_chapters" (
	"id" text PRIMARY KEY NOT NULL,
	"subject_id" text NOT NULL,
	"week_number" integer NOT NULL,
	"title" text NOT NULL,
	"learning_objectives" jsonb,
	"lecture_json" jsonb,
	"reading_guide_json" jsonb,
	"practical_exercise_json" jsonb,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "launchpad_progress_and_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"week_number" integer NOT NULL,
	"lecture_completed" boolean DEFAULT false NOT NULL,
	"reading_completed" boolean DEFAULT false NOT NULL,
	"exercise_submission_json" jsonb,
	"exercise_completed" boolean DEFAULT false NOT NULL,
	"evaluation_status" text,
	"evaluator_feedback" text,
	"evaluated_by" text,
	"evaluated_at" timestamp,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "launchpad_student_enrollments" (
	"student_id" text PRIMARY KEY NOT NULL,
	"student_email" text,
	"assigned_by" text NOT NULL,
	"assigned_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "launchpad_subject_releases" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"student_email" text,
	"subject_id" text NOT NULL,
	"is_unlocked" boolean DEFAULT false NOT NULL,
	"unlocked_by" text,
	"unlocked_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "launchpad_subjects" (
	"id" text PRIMARY KEY NOT NULL,
	"sort_order" integer DEFAULT 1 NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"accent_hex" text DEFAULT '#4F46E5' NOT NULL,
	"surface_tint" text DEFAULT '#EEF2FF' NOT NULL,
	"icon_key" text DEFAULT 'comm-public-speaking' NOT NULL,
	"custom_icon_url" text,
	"has_curriculum" boolean DEFAULT false NOT NULL,
	"course_goal" text,
	"passing_threshold" integer DEFAULT 75 NOT NULL,
	"certificate_title" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "launchpad_team_permissions" (
	"user_id" text PRIMARY KEY NOT NULL,
	"access_scope" text DEFAULT 'none' NOT NULL,
	"launchpad_student_tab_access" text DEFAULT 'none' NOT NULL,
	"launchpad_review_exercise_access" text DEFAULT 'none' NOT NULL,
	"launchpad_edit_curriculum_access" text DEFAULT 'none' NOT NULL,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"recipient_type" text NOT NULL,
	"recipient_id" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"category" text DEFAULT 'LAUNCHPAD' NOT NULL,
	"link" text NOT NULL,
	"metadata_json" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "portal_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value_json" jsonb,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "staff_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"students" text,
	"status" text
);
--> statement-breakpoint
CREATE TABLE "students_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"phone" text,
	"intake" text,
	"countries" jsonb,
	"readiness" integer,
	"counselor" text,
	"school" text,
	"activities" jsonb,
	"extracurriculars" jsonb,
	"academic_scores" jsonb,
	"shortlist" jsonb,
	"documents" jsonb,
	"essays" jsonb,
	"tasks" jsonb,
	"profile_json" jsonb
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password" text,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "zoho_connections" (
	"staff_key" text PRIMARY KEY NOT NULL,
	"staff_uid" text,
	"staff_email" text,
	"staff_name" text,
	"zoho_email" text,
	"zoho_display_name" text,
	"zsoid" text NOT NULL,
	"zuid" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"token_expires_at" timestamp NOT NULL,
	"accounts_server" text DEFAULT 'https://accounts.zoho.com',
	"meeting_base" text DEFAULT 'https://meeting.zoho.com',
	"connected_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "staff_data" ADD CONSTRAINT "staff_data_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students_data" ADD CONSTRAINT "students_data_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;