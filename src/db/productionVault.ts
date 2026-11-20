import pg from "pg";
import { eq } from "drizzle-orm";
const { Pool } = pg;
import { db, createPool } from "./index.js";
import {
  users,
  studentsData,
  staffData,
  portalSettings,
  launchpadSubjects,
  launchpadChapters,
  launchpadCertificationQuestions,
} from "./schema.js";
import {
  buildDefaultLaunchpadSubjects,
  buildDefaultLaunchpadChapters,
  buildDefaultCertQuestions,
} from "../data/launchpadData.js";

export const SYS_KV_PREFIX = "__SYS_KV__";

export function isSysKvUid(uid?: string | null): boolean {
  return Boolean(uid && String(uid).startsWith(SYS_KV_PREFIX));
}

interface KvEnvelope<T = any> {
  data: T;
  updatedAt: string;
}

const memoryKv = new Map<string, KvEnvelope<any>>();
const liveColumnsByTable = new Map<string, Set<string>>();
let schemaIntrospected = false;
let initPromise: Promise<void> | null = null;

export function hasSqlEnv(): boolean {
  return Boolean(process.env.SQL_HOST && process.env.SQL_DB_NAME && process.env.SQL_USER);
}

export function hasTable(tableName: string): boolean {
  if (!schemaIntrospected) return hasSqlEnv();
  return liveColumnsByTable.has(tableName);
}

export function hasColumn(tableName: string, columnName: string): boolean {
  if (!schemaIntrospected) return hasSqlEnv();
  const cols = liveColumnsByTable.get(tableName);
  return Boolean(cols && cols.has(columnName));
}

const IDEMPOTENT_DDL_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "users" (
    "id" serial PRIMARY KEY NOT NULL,
    "uid" text NOT NULL UNIQUE,
    "email" text NOT NULL,
    "name" text NOT NULL,
    "password" text,
    "role" text NOT NULL,
    "created_at" timestamp DEFAULT now()
  )`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password" text`,
  `CREATE TABLE IF NOT EXISTS "staff_data" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL REFERENCES "users"("id"),
    "students" text,
    "status" text
  )`,
  `CREATE TABLE IF NOT EXISTS "students_data" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL REFERENCES "users"("id"),
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
  )`,
  `ALTER TABLE "students_data" ADD COLUMN IF NOT EXISTS "profile_json" jsonb`,
  `CREATE TABLE IF NOT EXISTS "portal_settings" (
    "key" text PRIMARY KEY NOT NULL,
    "value_json" jsonb,
    "updated_at" timestamp DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "batches_data" (
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
  )`,
  `ALTER TABLE "batches_data" ADD COLUMN IF NOT EXISTS "parent_batch_id" text`,
  `CREATE TABLE IF NOT EXISTS "events_data" (
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
  )`,
  `ALTER TABLE "events_data" ADD COLUMN IF NOT EXISTS "video_provider" text`,
  `ALTER TABLE "events_data" ADD COLUMN IF NOT EXISTS "zoho_meeting_key" text`,
  `ALTER TABLE "events_data" ADD COLUMN IF NOT EXISTS "host_start_link" text`,
  `ALTER TABLE "events_data" ADD COLUMN IF NOT EXISTS "participant_emails" jsonb`,
  `CREATE TABLE IF NOT EXISTS "launchpad_team_permissions" (
    "user_id" text PRIMARY KEY NOT NULL,
    "access_scope" text DEFAULT 'none' NOT NULL,
    "launchpad_student_tab_access" text DEFAULT 'none' NOT NULL,
    "launchpad_review_exercise_access" text DEFAULT 'none' NOT NULL,
    "launchpad_edit_curriculum_access" text DEFAULT 'none' NOT NULL,
    "updated_by" text,
    "updated_at" timestamp DEFAULT now()
  )`,
  `ALTER TABLE "launchpad_team_permissions" ADD COLUMN IF NOT EXISTS "launchpad_student_tab_access" text DEFAULT 'none' NOT NULL`,
  `ALTER TABLE "launchpad_team_permissions" ADD COLUMN IF NOT EXISTS "launchpad_review_exercise_access" text DEFAULT 'none' NOT NULL`,
  `ALTER TABLE "launchpad_team_permissions" ADD COLUMN IF NOT EXISTS "launchpad_edit_curriculum_access" text DEFAULT 'none' NOT NULL`,
  `CREATE TABLE IF NOT EXISTS "launchpad_subjects" (
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
  )`,
  `CREATE TABLE IF NOT EXISTS "launchpad_chapters" (
    "id" text PRIMARY KEY NOT NULL,
    "subject_id" text NOT NULL,
    "week_number" integer NOT NULL,
    "title" text NOT NULL,
    "learning_objectives" jsonb,
    "lecture_json" jsonb,
    "reading_guide_json" jsonb,
    "practical_exercise_json" jsonb,
    "updated_at" timestamp DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "launchpad_certification_questions" (
    "id" text PRIMARY KEY NOT NULL,
    "subject_id" text NOT NULL,
    "question_type" text NOT NULL,
    "sort_order" integer DEFAULT 1 NOT NULL,
    "payload_json" jsonb,
    "updated_at" timestamp DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "launchpad_student_enrollments" (
    "student_id" text PRIMARY KEY NOT NULL,
    "student_email" text,
    "assigned_by" text NOT NULL,
    "assigned_at" timestamp DEFAULT now()
  )`,
  `ALTER TABLE "launchpad_student_enrollments" ADD COLUMN IF NOT EXISTS "student_email" text`,
  `CREATE TABLE IF NOT EXISTS "launchpad_subject_releases" (
    "id" text PRIMARY KEY NOT NULL,
    "student_id" text NOT NULL,
    "student_email" text,
    "subject_id" text NOT NULL,
    "is_unlocked" boolean DEFAULT false NOT NULL,
    "unlocked_by" text,
    "unlocked_at" timestamp DEFAULT now()
  )`,
  `ALTER TABLE "launchpad_subject_releases" ADD COLUMN IF NOT EXISTS "student_email" text`,
  `CREATE TABLE IF NOT EXISTS "launchpad_progress_and_submissions" (
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
  )`,
  `CREATE TABLE IF NOT EXISTS "launchpad_certifications" (
    "id" text PRIMARY KEY NOT NULL,
    "student_id" text NOT NULL,
    "subject_id" text NOT NULL,
    "test_score" integer NOT NULL,
    "passed" boolean DEFAULT false NOT NULL,
    "certificate_code" text NOT NULL,
    "issued_at" timestamp DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "notifications" (
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
  )`,
  `CREATE TABLE IF NOT EXISTS "assignment_evaluations" (
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
  )`,
  `CREATE TABLE IF NOT EXISTS "zoho_connections" (
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
  )`,
];

async function refreshSchemaIntrospection(): Promise<boolean> {
  if (!hasSqlEnv()) return false;
  try {
    const pool = createPool();
    const res = await pool.query(
      `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`
    );
    liveColumnsByTable.clear();
    for (const row of res.rows) {
      const tName = String(row.table_name || "");
      const cName = String(row.column_name || "");
      if (!tName || !cName) continue;
      let set = liveColumnsByTable.get(tName);
      if (!set) {
        set = new Set<string>();
        liveColumnsByTable.set(tName, set);
      }
      set.add(cName);
    }
    schemaIntrospected = true;
    return true;
  } catch (err: any) {
    console.error("[Schema Introspection Error]", err?.message || err);
    return false;
  }
}

async function runIdempotentMigrationsIfNeeded(): Promise<void> {
  if (!hasSqlEnv()) return;

  const introspected = await refreshSchemaIntrospection();
  if (!introspected) return;

  const requiredChecks: Array<[string, string]> = [
    ["users", "password"],
    ["students_data", "profile_json"],
    ["portal_settings", "value_json"],
    ["launchpad_subjects", "id"],
    ["launchpad_chapters", "id"],
    ["launchpad_certification_questions", "id"],
    ["launchpad_team_permissions", "launchpad_student_tab_access"],
    ["launchpad_student_enrollments", "student_email"],
    ["launchpad_subject_releases", "student_email"],
    ["launchpad_progress_and_submissions", "id"],
    ["launchpad_certifications", "id"],
    ["notifications", "id"],
    ["assignment_evaluations", "id"],
    ["zoho_connections", "staff_key"],
  ];

  const needsMigration = requiredChecks.some(([tbl, col]) => !hasColumn(tbl, col));
  if (!needsMigration) return;

  const hasAdminCreds = Boolean(process.env.SQL_ADMIN_USER && process.env.SQL_ADMIN_PASSWORD);
  let migrationPool: InstanceType<typeof Pool> | null = null;
  let shouldEndPool = false;

  try {
    if (hasAdminCreds) {
      migrationPool = new Pool({
        host: process.env.SQL_HOST,
        user: process.env.SQL_ADMIN_USER,
        password: process.env.SQL_ADMIN_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 2,
        connectionTimeoutMillis: 15000,
      });
      migrationPool.on("error", () => {});
      shouldEndPool = true;
    } else {
      migrationPool = createPool();
    }

    for (const stmt of IDEMPOTENT_DDL_STATEMENTS) {
      try {
        await migrationPool.query(stmt);
      } catch {
        // Ignore individual DDL errors when SQL_USER lacks DDL permissions; fallback KV handles persistence
      }
    }

    if (hasAdminCreds && process.env.SQL_USER && /^[a-zA-Z0-9_-]+$/.test(process.env.SQL_USER)) {
      const appUserIdent = `"${process.env.SQL_USER}"`;
      await migrationPool
        .query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${appUserIdent}`)
        .catch(() => {});
      await migrationPool
        .query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${appUserIdent}`)
        .catch(() => {});
    }
  } finally {
    if (shouldEndPool && migrationPool) {
      await migrationPool.end().catch(() => {});
    }
  }

  await refreshSchemaIntrospection();
}

async function seedDefaultsIfEmpty(): Promise<void> {
  if (!hasSqlEnv() || !hasTable("users")) return;

  try {
    const pool = createPool();
    const existingUsersRes = await pool.query(`SELECT id, uid, email FROM "users"`);
    const existingUsers = existingUsersRes.rows || [];
    const hasUser = (uid: string, email: string) =>
      existingUsers.some(
        (u: any) =>
          String(u.uid || "").trim() === uid ||
          String(u.email || "").trim().toLowerCase() === email.trim().toLowerCase()
      );

    const defaultStaffSeed = [
      { uid: "admin-1", email: "uppseekers@gmail.com", name: "Admin", password: "Uppseekers@1", role: "SYSTEM_ADMIN", students: "All" },
      { uid: "2", email: "sarah@uppseekers.com", name: "Sarah Jenkins", password: "Staff@123", role: "COUNSELOR", students: "2 Students" },
      { uid: "3", email: "vikram.roy@uppseekers.com", name: "Dr. Vikram Roy", password: "Staff@123", role: "RESEARCH_GUIDE", students: "2 Students" },
      { uid: "4", email: "marcus@uppseekers.com", name: "Marcus Vance", password: "Staff@123", role: "CATEGORY_MANAGER", students: "All" },
      { uid: "5", email: "elena@uppseekers.com", name: "Elena Rostova", password: "Staff@123", role: "SAT_VERBAL_FACULTY", students: "1 Student" },
      { uid: "6", email: "rajesh.menon@uppseekers.com", name: "Rajesh Menon", password: "Staff@123", role: "SAT_MATH_FACULTY", students: "1 Student" },
    ];

    for (const st of defaultStaffSeed) {
      if (!hasUser(st.uid, st.email)) {
        if (hasColumn("users", "password")) {
          const inserted = await db
            .insert(users)
            .values({
              uid: st.uid,
              email: st.email,
              name: st.name,
              password: st.password,
              role: st.role,
            })
            .onConflictDoNothing({ target: users.uid })
            .returning();
          if (inserted[0] && hasTable("staff_data")) {
            await db.insert(staffData).values({
              userId: inserted[0].id,
              status: "Active",
              students: st.students,
            });
          }
        } else {
          const ins = await pool.query(
            `INSERT INTO "users" ("uid", "email", "name", "role") VALUES ($1, $2, $3, $4) ON CONFLICT ("uid") DO NOTHING RETURNING id`,
            [st.uid, st.email, st.name, st.role]
          );
          if (ins.rows[0] && hasTable("staff_data")) {
            await pool.query(
              `INSERT INTO "staff_data" ("user_id", "status", "students") VALUES ($1, $2, $3)`,
              [ins.rows[0].id, "Active", st.students]
            );
          }
        }
      }
    }

    const defaultStudentsSeed = [
      {
        uid: "STU-101",
        name: "Aarav Sharma",
        email: "aarav.sharma@example.com",
        phone: "+91 9876543210",
        intake: "Fall 2026",
        school: "Delhi Public School",
        counselor: "Sarah Jenkins",
        readiness: 75,
        countries: ["USA", "UK"],
        password: "Student@123",
        profileJson: { researchMentor: "Dr. Vikram Roy" },
      },
      {
        uid: "STU-102",
        name: "Ananya Iyer",
        email: "ananya.iyer@example.com",
        phone: "+91 9812345678",
        intake: "Fall 2026",
        school: "The Doon School",
        counselor: "Sarah Jenkins",
        readiness: 65,
        countries: ["USA", "Canada"],
        password: "Student@123",
        profileJson: { satVerbalMentor: "Elena Rostova" },
      },
      {
        uid: "STU-103",
        name: "Qasim Khan",
        email: "qasim.khan@example.com",
        phone: "+91 9988776655",
        intake: "Fall 2026",
        school: "St. Xavier High School",
        counselor: "Admin",
        readiness: 85,
        countries: ["USA", "UK"],
        password: "Student@123",
        profileJson: { researchMentor: "Dr. Vikram Roy" },
      },
    ];

    for (const stu of defaultStudentsSeed) {
      if (!hasUser(stu.uid, stu.email)) {
        let userIdNum: number | undefined;
        if (hasColumn("users", "password")) {
          const inserted = await db
            .insert(users)
            .values({
              uid: stu.uid,
              email: stu.email,
              name: stu.name,
              password: stu.password,
              role: "STUDENT",
            })
            .onConflictDoNothing({ target: users.uid })
            .returning();
          userIdNum = inserted[0]?.id;
        } else {
          const ins = await pool.query(
            `INSERT INTO "users" ("uid", "email", "name", "role") VALUES ($1, $2, $3, 'STUDENT') ON CONFLICT ("uid") DO NOTHING RETURNING id`,
            [stu.uid, stu.email, stu.name]
          );
          userIdNum = ins.rows[0]?.id;
        }
        if (userIdNum && hasTable("students_data")) {
          if (hasColumn("students_data", "profile_json")) {
            await db.insert(studentsData).values({
              userId: userIdNum,
              phone: stu.phone,
              intake: stu.intake,
              countries: stu.countries,
              readiness: stu.readiness,
              counselor: stu.counselor,
              school: stu.school,
              activities: [],
              extracurriculars: [],
              academicScores: [],
              shortlist: [],
              documents: [],
              essays: [],
              tasks: [],
              profileJson: stu.profileJson,
            });
          } else {
            await pool.query(
              `INSERT INTO "students_data" ("user_id", "phone", "intake", "countries", "readiness", "counselor", "school", "activities", "extracurriculars", "academic_scores", "shortlist", "documents", "essays", "tasks")
               VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)`,
              [userIdNum, stu.phone, stu.intake, JSON.stringify(stu.countries), stu.readiness, stu.counselor, stu.school]
            );
          }
        }
      }
    }

    if (hasTable("launchpad_subjects")) {
      const existingSubjects = await db.select().from(launchpadSubjects);
      const hasCoreSubject = existingSubjects.some((s) => s.id === "comm-public-speaking");
      if (existingSubjects.length === 0 || (existingSubjects.length <= 1 && !hasCoreSubject)) {
        const existingChapters = hasTable("launchpad_chapters")
          ? await db.select().from(launchpadChapters)
          : [];
        const chapterSubjectIds = new Set(existingChapters.map((c) => c.subjectId));
        const defaultSubjects = buildDefaultLaunchpadSubjects();
        for (const s of defaultSubjects) {
          await db
            .insert(launchpadSubjects)
            .values({
              id: s.id,
              sortOrder: s.order,
              title: s.title,
              description: s.description || "",
              accentHex: s.accentHex || "#4F46E5",
              surfaceTint: s.surfaceTint || "#EEF2FF",
              iconKey: s.iconKey || s.id,
              customIconUrl: s.customIconUrl || null,
              hasCurriculum: Boolean(s.hasCurriculum) || chapterSubjectIds.has(s.id),
              courseGoal: s.courseGoal || null,
              passingThreshold: Number(s.passingThreshold ?? 75),
              certificateTitle: s.certificateTitle || null,
              isArchived: Boolean(s.isArchived),
              updatedAt: new Date(),
            })
            .onConflictDoNothing({ target: launchpadSubjects.id });
        }

        if (
          hasTable("launchpad_chapters") &&
          !existingChapters.some((c) => c.subjectId === "comm-public-speaking")
        ) {
          const defaultChapters = buildDefaultLaunchpadChapters();
          for (const c of defaultChapters) {
            await db
              .insert(launchpadChapters)
              .values({
                id: c.id || `comm-public-speaking__w${c.weekNumber}`,
                subjectId: "comm-public-speaking",
                weekNumber: c.weekNumber,
                title: c.title,
                learningObjectives: c.learningObjectives || [],
                lectureJson: c.lecture || {},
                readingGuideJson: c.readingGuide || {},
                practicalExerciseJson: c.practicalExercise || {},
                updatedAt: new Date(),
              })
              .onConflictDoNothing({ target: launchpadChapters.id });
          }
        }

        if (hasTable("launchpad_certification_questions")) {
          const existingCerts = await db.select().from(launchpadCertificationQuestions);
          if (!existingCerts.some((q) => q.subjectId === "comm-public-speaking")) {
            const defaultCerts = buildDefaultCertQuestions();
            for (const q of defaultCerts) {
              await db
                .insert(launchpadCertificationQuestions)
                .values({
                  id: q.id,
                  subjectId: q.subjectId,
                  questionType: q.questionType,
                  sortOrder: q.sortOrder,
                  payloadJson: q.payload || {},
                  updatedAt: new Date(),
                })
                .onConflictDoNothing({ target: launchpadCertificationQuestions.id });
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.error("[Seed Defaults Warning]", err?.message || err);
  }
}

export async function ensureProductionReady(): Promise<void> {
  if (!hasSqlEnv()) return;
  if (!initPromise) {
    initPromise = (async () => {
      await runIdempotentMigrationsIfNeeded();
      if (!schemaIntrospected) {
        // Allow next incoming request to retry cleanly if DB was waking up
        initPromise = null;
        return;
      }
      await seedDefaultsIfEmpty();
    })().catch((err) => {
      console.error("[Production Init Warning]", err?.message || err);
      initPromise = null;
    });
  }
  await initPromise;
}

/**
 * Day-1 PostgreSQL Key-Value Vault + portal_settings + Memory Mirror.
 * Guaranteed to persist across Cloud Run instances even if Production Cloud SQL
 * lacks newer tables/columns and SQL_ADMIN_USER is not injected at runtime.
 */
export async function sysKvSet<T>(key: string, data: T): Promise<boolean> {
  const updatedAt = new Date().toISOString();
  const envelope: KvEnvelope<T> = { data, updatedAt };
  memoryKv.set(key, envelope);

  if (!hasSqlEnv()) {
    return false;
  }

  let persistedToSql = false;
  const settingsKey = `${SYS_KV_PREFIX}${key}`;

  if (hasTable("portal_settings")) {
    try {
      await db
        .insert(portalSettings)
        .values({
          key: settingsKey,
          valueJson: envelope as any,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: portalSettings.key,
          set: {
            valueJson: envelope as any,
            updatedAt: new Date(),
          },
        });
      persistedToSql = true;
    } catch {
      // Fall through to Day-1 users + staff_data table vault
    }
  }

  if (hasTable("users") && hasTable("staff_data")) {
    try {
      const pool = createPool();
      const sysUid = `${SYS_KV_PREFIX}${key}`;
      const sysEmail = `__sys_kv_${key.toLowerCase()}@internal.uppseekers`;
      const serialized = JSON.stringify(envelope);

      const userRes = await pool.query(
        `INSERT INTO "users" ("uid", "email", "name", "role")
         VALUES ($1, $2, $3, $4)
         ON CONFLICT ("uid") DO UPDATE SET "email" = EXCLUDED."email"
         RETURNING id`,
        [sysUid, sysEmail, SYS_KV_PREFIX, SYS_KV_PREFIX]
      );
      const userId = userRes.rows[0]?.id;
      if (userId) {
        const existingStaff = await pool.query(
          `SELECT id FROM "staff_data" WHERE "user_id" = $1 LIMIT 1`,
          [userId]
        );
        if (existingStaff.rows[0]?.id) {
          await pool.query(
            `UPDATE "staff_data" SET "students" = $1, "status" = $2 WHERE "id" = $3`,
            [serialized, updatedAt, existingStaff.rows[0].id]
          );
        } else {
          await pool.query(
            `INSERT INTO "staff_data" ("user_id", "students", "status") VALUES ($1, $2, $3)`,
            [userId, serialized, updatedAt]
          );
        }
        persistedToSql = true;
      }
    } catch (err: any) {
      console.error(`[sysKvSet Error: ${key}]`, err?.message || err);
    }
  }

  return persistedToSql;
}

export async function sysKvGet<T>(key: string, fallback: T): Promise<T> {
  const candidates: KvEnvelope<T>[] = [];
  const mem = memoryKv.get(key);
  if (mem && mem.data !== undefined) {
    candidates.push(mem);
  }

  if (hasSqlEnv()) {
    const settingsKey = `${SYS_KV_PREFIX}${key}`;
    if (hasTable("portal_settings")) {
      try {
        const row = await db
          .select()
          .from(portalSettings)
          .where(eq(portalSettings.key, settingsKey))
          .then((r) => r[0]);
        const val = row?.valueJson as any;
        if (val && val.data !== undefined) {
          candidates.push({
            data: val.data as T,
            updatedAt: String(val.updatedAt || row?.updatedAt?.toISOString?.() || ""),
          });
        }
      } catch {
        // Ignore and check Day-1 staff_data vault
      }
    }

    if (hasTable("users") && hasTable("staff_data")) {
      try {
        const pool = createPool();
        const sysUid = `${SYS_KV_PREFIX}${key}`;
        const res = await pool.query(
          `SELECT sd."students", sd."status"
           FROM "users" u
           INNER JOIN "staff_data" sd ON sd."user_id" = u."id"
           WHERE u."uid" = $1
           ORDER BY sd."id" DESC
           LIMIT 1`,
          [sysUid]
        );
        const rawJson = res.rows[0]?.students;
        if (typeof rawJson === "string" && rawJson.startsWith("{")) {
          const parsed = JSON.parse(rawJson);
          if (parsed && parsed.data !== undefined) {
            candidates.push({
              data: parsed.data as T,
              updatedAt: String(parsed.updatedAt || res.rows[0]?.status || ""),
            });
          }
        }
      } catch {
        // Ignore parse/query errors
      }
    }
  }

  if (candidates.length === 0) return fallback;
  candidates.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  const best = candidates[0];
  memoryKv.set(key, best);
  return best.data;
}

export function mergeRecordsById<T extends Record<string, any>>(
  primaryRows: T[],
  kvRows: T[],
  idField: keyof T = "id",
  timeField?: keyof T
): T[] {
  const map = new Map<string, T>();
  const toMs = (val: any): number => {
    if (!val) return 0;
    const ms = new Date(val).getTime();
    return Number.isFinite(ms) ? ms : 0;
  };

  for (const row of kvRows || []) {
    if (!row || row[idField] === undefined || row[idField] === null) continue;
    map.set(String(row[idField]), row);
  }

  for (const row of primaryRows || []) {
    if (!row || row[idField] === undefined || row[idField] === null) continue;
    const key = String(row[idField]);
    const existing = map.get(key);
    if (!existing || !timeField) {
      map.set(key, existing ? { ...existing, ...row } : row);
    } else {
      const rowTime = toMs(row[timeField]);
      const existingTime = toMs(existing[timeField]);
      if (rowTime >= existingTime) {
        map.set(key, { ...existing, ...row });
      } else {
        map.set(key, { ...row, ...existing });
      }
    }
  }

  return Array.from(map.values());
}
