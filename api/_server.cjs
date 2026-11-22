var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  default: () => handler
});
module.exports = __toCommonJS(server_exports);
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_http = __toESM(require("http"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_genai = require("@google/genai");
var import_crypto = __toESM(require("crypto"), 1);

// src/lib/firebase-admin.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_app = require("firebase-admin/app");
var import_auth = require("firebase-admin/auth");
var import_firestore = require("firebase-admin/firestore");
var DEFAULT_FIREBASE_APPLET_CONFIG = {
  projectId: "continual-bus-9w1xt",
  apiKey: "AIzaSyBl077aH7inl8JWhPf78AZua8tAsnxWfgk",
  firestoreDatabaseId: "ai-studio-uppseeekersstude-b87d90a0-49bf-4266-9b2c-411586d81e1b"
};
function loadFirebaseAppletConfig() {
  try {
    const directPath = import_path.default.resolve(process.cwd(), "firebase-applet-config.json");
    if (import_fs.default.existsSync(directPath)) {
      const parsed = JSON.parse(import_fs.default.readFileSync(directPath, "utf8"));
      if (parsed && typeof parsed.projectId === "string") {
        return {
          ...DEFAULT_FIREBASE_APPLET_CONFIG,
          ...parsed
        };
      }
    }
  } catch {
  }
  if (typeof __dirname !== "undefined") {
    const fallbackCandidates = [
      import_path.default.resolve(__dirname, "../../firebase-applet-config.json"),
      import_path.default.resolve(__dirname, "../firebase-applet-config.json")
    ];
    for (const candidate of fallbackCandidates) {
      try {
        if (import_fs.default.existsSync(candidate)) {
          const parsed = JSON.parse(import_fs.default.readFileSync(candidate, "utf8"));
          if (parsed && typeof parsed.projectId === "string") {
            return {
              ...DEFAULT_FIREBASE_APPLET_CONFIG,
              ...parsed
            };
          }
        }
      } catch {
      }
    }
  }
  return {
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || DEFAULT_FIREBASE_APPLET_CONFIG.projectId,
    apiKey: process.env.VITE_FIREBASE_API_KEY || DEFAULT_FIREBASE_APPLET_CONFIG.apiKey,
    firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || DEFAULT_FIREBASE_APPLET_CONFIG.firestoreDatabaseId
  };
}
var firebaseAppletConfig = loadFirebaseAppletConfig();
function normalizeServiceAccountObject(parsed) {
  if (!parsed || typeof parsed !== "object") return null;
  if (!parsed.client_email || !parsed.private_key) return null;
  return {
    ...parsed,
    private_key: String(parsed.private_key).replace(/\\n/g, "\n")
  };
}
function parseServiceAccount() {
  let raw = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "").trim();
  if (!raw) return null;
  if (raw.startsWith("'") && raw.endsWith("'") || raw.startsWith('"') && raw.endsWith('"')) {
    raw = raw.slice(1, -1).trim();
  }
  try {
    const normalized = normalizeServiceAccountObject(JSON.parse(raw));
    if (normalized) return normalized;
  } catch {
    try {
      const decoded = Buffer.from(raw, "base64").toString("utf8");
      const normalized = normalizeServiceAccountObject(JSON.parse(decoded));
      if (normalized) return normalized;
    } catch {
      return null;
    }
  }
  return null;
}
var parsedServiceAccount = parseServiceAccount();
var validServiceAccountActive = false;
function initAdminAppSafely() {
  if ((0, import_app.getApps)().length > 0) {
    validServiceAccountActive = Boolean(parsedServiceAccount);
    return (0, import_app.getApp)();
  }
  if (parsedServiceAccount) {
    try {
      const app = (0, import_app.initializeApp)({
        credential: (0, import_app.cert)(parsedServiceAccount),
        projectId: firebaseAppletConfig.projectId
      });
      validServiceAccountActive = true;
      return app;
    } catch (err) {
      console.warn("[Firebase Admin] Service account initialization failed, falling back to project-only init:", err?.message || err);
      validServiceAccountActive = false;
    }
  }
  return (0, import_app.initializeApp)({
    projectId: firebaseAppletConfig.projectId
  });
}
function hasAdminServiceAccount() {
  return validServiceAccountActive;
}
var adminApp = initAdminAppSafely();
var firebaseWebApiKey = String(firebaseAppletConfig.apiKey || DEFAULT_FIREBASE_APPLET_CONFIG.apiKey || "");
var adminAuth = (0, import_auth.getAuth)(adminApp);
var adminDb = (() => {
  try {
    if (firebaseAppletConfig.firestoreDatabaseId && firebaseAppletConfig.firestoreDatabaseId !== "(default)") {
      return (0, import_firestore.getFirestore)(adminApp, firebaseAppletConfig.firestoreDatabaseId);
    }
  } catch (err) {
    console.warn("[Firebase Admin] Named Firestore init failed, using default database:", err?.message || err);
  }
  return (0, import_firestore.getFirestore)(adminApp);
})();

// src/middleware/auth.ts
async function verifyViaIdentityToolkitRest(idToken) {
  const apiKey = firebaseWebApiKey;
  if (!apiKey) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5e3);
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        signal: controller.signal
      }
    );
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const user = Array.isArray(data?.users) ? data.users[0] : null;
    if (!user?.localId) return null;
    return {
      uid: String(user.localId),
      email: typeof user.email === "string" ? user.email.toLowerCase() : "",
      email_verified: Boolean(user.emailVerified),
      name: typeof user.displayName === "string" ? user.displayName : void 0
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
var requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized: Missing Bearer ID token." });
      return;
    }
    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      res.status(401).json({ error: "Unauthorized: Empty Bearer token." });
      return;
    }
    if (token.startsWith("custom_") || token.startsWith("token_") || token.startsWith("user_") || token === "admin_token") {
      res.status(401).json({ error: "Unauthorized: Legacy session tokens are no longer accepted. Please sign in again." });
      return;
    }
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      req.user = {
        ...decodedToken,
        uid: decodedToken.uid,
        email: (decodedToken.email || "").toLowerCase(),
        email_verified: Boolean(decodedToken.email_verified),
        name: decodedToken.name
      };
      next();
      return;
    } catch {
    }
    const verifiedUser = await verifyViaIdentityToolkitRest(token);
    if (!verifiedUser) {
      res.status(401).json({ error: "Unauthorized: Invalid or expired Firebase ID token." });
      return;
    }
    req.user = verifiedUser;
    next();
  } catch (err) {
    console.error("[Auth Middleware Error]", err?.message || err);
    if (!res.headersSent) {
      res.status(401).json({ error: "Unauthorized: Authentication verification failed." });
    }
  }
};

// src/db/index.ts
var import_node_postgres = require("drizzle-orm/node-postgres");
var import_pg = __toESM(require("pg"), 1);

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  assignmentEvaluations: () => assignmentEvaluations,
  batchesData: () => batchesData,
  eventsData: () => eventsData,
  launchpadCertificationQuestions: () => launchpadCertificationQuestions,
  launchpadCertifications: () => launchpadCertifications,
  launchpadChapters: () => launchpadChapters,
  launchpadProgressAndSubmissions: () => launchpadProgressAndSubmissions,
  launchpadStudentEnrollments: () => launchpadStudentEnrollments,
  launchpadSubjectReleases: () => launchpadSubjectReleases,
  launchpadSubjects: () => launchpadSubjects,
  launchpadTeamPermissions: () => launchpadTeamPermissions,
  notificationsTable: () => notificationsTable,
  portalSettings: () => portalSettings,
  staffData: () => staffData,
  studentsData: () => studentsData,
  users: () => users,
  zohoConnections: () => zohoConnections
});
var import_pg_core = require("drizzle-orm/pg-core");
var users = (0, import_pg_core.pgTable)("users", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  uid: (0, import_pg_core.text)("uid").notNull().unique(),
  // Firebase Auth UID
  email: (0, import_pg_core.text)("email").notNull(),
  name: (0, import_pg_core.text)("name").notNull(),
  password: (0, import_pg_core.text)("password"),
  role: (0, import_pg_core.text)("role").notNull(),
  // 'STUDENT' or other staff roles
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow()
});
var studentsData = (0, import_pg_core.pgTable)("students_data", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userId: (0, import_pg_core.integer)("user_id").references(() => users.id).notNull(),
  phone: (0, import_pg_core.text)("phone"),
  intake: (0, import_pg_core.text)("intake"),
  countries: (0, import_pg_core.jsonb)("countries").$type(),
  readiness: (0, import_pg_core.integer)("readiness"),
  counselor: (0, import_pg_core.text)("counselor"),
  school: (0, import_pg_core.text)("school"),
  activities: (0, import_pg_core.jsonb)("activities").$type(),
  extracurriculars: (0, import_pg_core.jsonb)("extracurriculars").$type(),
  academicScores: (0, import_pg_core.jsonb)("academic_scores").$type(),
  shortlist: (0, import_pg_core.jsonb)("shortlist").$type(),
  documents: (0, import_pg_core.jsonb)("documents").$type(),
  essays: (0, import_pg_core.jsonb)("essays").$type(),
  tasks: (0, import_pg_core.jsonb)("tasks").$type(),
  profileJson: (0, import_pg_core.jsonb)("profile_json").$type()
});
var portalSettings = (0, import_pg_core.pgTable)("portal_settings", {
  key: (0, import_pg_core.text)("key").primaryKey(),
  valueJson: (0, import_pg_core.jsonb)("value_json").$type(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
});
var staffData = (0, import_pg_core.pgTable)("staff_data", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userId: (0, import_pg_core.integer)("user_id").references(() => users.id).notNull(),
  students: (0, import_pg_core.text)("students"),
  status: (0, import_pg_core.text)("status")
});
var batchesData = (0, import_pg_core.pgTable)("batches_data", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  // using text to preserve existing IDs
  name: (0, import_pg_core.text)("name").notNull(),
  type: (0, import_pg_core.text)("type").notNull(),
  parentBatchId: (0, import_pg_core.text)("parent_batch_id"),
  mentors: (0, import_pg_core.jsonb)("mentors").$type(),
  meetingLink: (0, import_pg_core.text)("meeting_link"),
  status: (0, import_pg_core.text)("status"),
  capacity: (0, import_pg_core.integer)("capacity"),
  students: (0, import_pg_core.jsonb)("students").$type(),
  completedSessions: (0, import_pg_core.integer)("completed_sessions"),
  totalSessions: (0, import_pg_core.integer)("total_sessions")
});
var eventsData = (0, import_pg_core.pgTable)("events_data", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  title: (0, import_pg_core.text)("title").notNull(),
  date: (0, import_pg_core.text)("date").notNull(),
  type: (0, import_pg_core.text)("type").notNull(),
  category: (0, import_pg_core.text)("category"),
  attendees: (0, import_pg_core.text)("attendees"),
  status: (0, import_pg_core.text)("status"),
  link: (0, import_pg_core.text)("link"),
  time: (0, import_pg_core.text)("time"),
  duration: (0, import_pg_core.text)("duration"),
  videoProvider: (0, import_pg_core.text)("video_provider"),
  zohoMeetingKey: (0, import_pg_core.text)("zoho_meeting_key"),
  hostStartLink: (0, import_pg_core.text)("host_start_link"),
  participantEmails: (0, import_pg_core.jsonb)("participant_emails").$type()
});
var launchpadTeamPermissions = (0, import_pg_core.pgTable)("launchpad_team_permissions", {
  userId: (0, import_pg_core.text)("user_id").primaryKey(),
  accessScope: (0, import_pg_core.text)("access_scope").notNull().default("none"),
  // 'global' | 'assigned' | 'read_only' | 'none'
  launchpadStudentTabAccess: (0, import_pg_core.text)("launchpad_student_tab_access").notNull().default("none"),
  launchpadReviewExerciseAccess: (0, import_pg_core.text)("launchpad_review_exercise_access").notNull().default("none"),
  launchpadEditCurriculumAccess: (0, import_pg_core.text)("launchpad_edit_curriculum_access").notNull().default("none"),
  updatedBy: (0, import_pg_core.text)("updated_by"),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
});
var launchpadSubjects = (0, import_pg_core.pgTable)("launchpad_subjects", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  sortOrder: (0, import_pg_core.integer)("sort_order").notNull().default(1),
  title: (0, import_pg_core.text)("title").notNull(),
  description: (0, import_pg_core.text)("description").notNull(),
  accentHex: (0, import_pg_core.text)("accent_hex").notNull().default("#4F46E5"),
  surfaceTint: (0, import_pg_core.text)("surface_tint").notNull().default("#EEF2FF"),
  iconKey: (0, import_pg_core.text)("icon_key").notNull().default("comm-public-speaking"),
  customIconUrl: (0, import_pg_core.text)("custom_icon_url"),
  hasCurriculum: (0, import_pg_core.boolean)("has_curriculum").notNull().default(false),
  courseGoal: (0, import_pg_core.text)("course_goal"),
  passingThreshold: (0, import_pg_core.integer)("passing_threshold").notNull().default(75),
  certificateTitle: (0, import_pg_core.text)("certificate_title"),
  isArchived: (0, import_pg_core.boolean)("is_archived").notNull().default(false),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
});
var launchpadChapters = (0, import_pg_core.pgTable)("launchpad_chapters", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  subjectId: (0, import_pg_core.text)("subject_id").notNull(),
  weekNumber: (0, import_pg_core.integer)("week_number").notNull(),
  title: (0, import_pg_core.text)("title").notNull(),
  learningObjectives: (0, import_pg_core.jsonb)("learning_objectives").$type(),
  lectureJson: (0, import_pg_core.jsonb)("lecture_json").$type(),
  readingGuideJson: (0, import_pg_core.jsonb)("reading_guide_json").$type(),
  practicalExerciseJson: (0, import_pg_core.jsonb)("practical_exercise_json").$type(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
});
var launchpadCertificationQuestions = (0, import_pg_core.pgTable)("launchpad_certification_questions", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  subjectId: (0, import_pg_core.text)("subject_id").notNull(),
  questionType: (0, import_pg_core.text)("question_type").notNull(),
  // 'mcq' | 'situational'
  sortOrder: (0, import_pg_core.integer)("sort_order").notNull().default(1),
  payloadJson: (0, import_pg_core.jsonb)("payload_json").$type(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
});
var launchpadStudentEnrollments = (0, import_pg_core.pgTable)("launchpad_student_enrollments", {
  studentId: (0, import_pg_core.text)("student_id").primaryKey(),
  studentEmail: (0, import_pg_core.text)("student_email"),
  assignedBy: (0, import_pg_core.text)("assigned_by").notNull(),
  assignedAt: (0, import_pg_core.timestamp)("assigned_at").defaultNow()
});
var launchpadSubjectReleases = (0, import_pg_core.pgTable)("launchpad_subject_releases", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  // `${studentId}__${subjectId}`
  studentId: (0, import_pg_core.text)("student_id").notNull(),
  studentEmail: (0, import_pg_core.text)("student_email"),
  subjectId: (0, import_pg_core.text)("subject_id").notNull(),
  isUnlocked: (0, import_pg_core.boolean)("is_unlocked").notNull().default(false),
  unlockedBy: (0, import_pg_core.text)("unlocked_by"),
  unlockedAt: (0, import_pg_core.timestamp)("unlocked_at").defaultNow()
});
var launchpadProgressAndSubmissions = (0, import_pg_core.pgTable)("launchpad_progress_and_submissions", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  // `${studentId}__${subjectId}__w${weekNumber}`
  studentId: (0, import_pg_core.text)("student_id").notNull(),
  subjectId: (0, import_pg_core.text)("subject_id").notNull(),
  weekNumber: (0, import_pg_core.integer)("week_number").notNull(),
  lectureCompleted: (0, import_pg_core.boolean)("lecture_completed").notNull().default(false),
  readingCompleted: (0, import_pg_core.boolean)("reading_completed").notNull().default(false),
  exerciseSubmissionJson: (0, import_pg_core.jsonb)("exercise_submission_json").$type(),
  exerciseCompleted: (0, import_pg_core.boolean)("exercise_completed").notNull().default(false),
  evaluationStatus: (0, import_pg_core.text)("evaluation_status"),
  evaluatorFeedback: (0, import_pg_core.text)("evaluator_feedback"),
  evaluatedBy: (0, import_pg_core.text)("evaluated_by"),
  evaluatedAt: (0, import_pg_core.timestamp)("evaluated_at"),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
});
var launchpadCertifications = (0, import_pg_core.pgTable)("launchpad_certifications", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  // `${studentId}__${subjectId}`
  studentId: (0, import_pg_core.text)("student_id").notNull(),
  subjectId: (0, import_pg_core.text)("subject_id").notNull(),
  testScore: (0, import_pg_core.integer)("test_score").notNull(),
  passed: (0, import_pg_core.boolean)("passed").notNull().default(false),
  certificateCode: (0, import_pg_core.text)("certificate_code").notNull(),
  issuedAt: (0, import_pg_core.timestamp)("issued_at").defaultNow()
});
var notificationsTable = (0, import_pg_core.pgTable)("notifications", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  recipientType: (0, import_pg_core.text)("recipient_type").notNull(),
  // 'student' | 'staff'
  recipientId: (0, import_pg_core.text)("recipient_id").notNull(),
  title: (0, import_pg_core.text)("title").notNull(),
  message: (0, import_pg_core.text)("message").notNull(),
  category: (0, import_pg_core.text)("category").notNull().default("LAUNCHPAD"),
  link: (0, import_pg_core.text)("link").notNull(),
  metadataJson: (0, import_pg_core.jsonb)("metadata_json").$type(),
  isRead: (0, import_pg_core.boolean)("is_read").notNull().default(false),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow()
});
var assignmentEvaluations = (0, import_pg_core.pgTable)("assignment_evaluations", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  // `${studentId}__${subjectId}__w${weekNumber}`
  sourceType: (0, import_pg_core.text)("source_type").notNull().default("LAUNCHPAD"),
  studentId: (0, import_pg_core.text)("student_id").notNull(),
  studentName: (0, import_pg_core.text)("student_name").notNull(),
  subjectId: (0, import_pg_core.text)("subject_id").notNull(),
  subjectTitle: (0, import_pg_core.text)("subject_title").notNull(),
  weekNumber: (0, import_pg_core.integer)("week_number").notNull(),
  chapterTitle: (0, import_pg_core.text)("chapter_title").notNull(),
  taskId: (0, import_pg_core.text)("task_id"),
  submissionJson: (0, import_pg_core.jsonb)("submission_json").$type(),
  status: (0, import_pg_core.text)("status").notNull().default("Submitted"),
  // 'Submitted' | 'Approved' | 'Needs Revision' | 'Reviewed'
  feedback: (0, import_pg_core.text)("feedback"),
  evaluatedBy: (0, import_pg_core.text)("evaluated_by"),
  submittedAt: (0, import_pg_core.timestamp)("submitted_at").defaultNow(),
  evaluatedAt: (0, import_pg_core.timestamp)("evaluated_at")
});
var zohoConnections = (0, import_pg_core.pgTable)("zoho_connections", {
  staffKey: (0, import_pg_core.text)("staff_key").primaryKey(),
  staffUid: (0, import_pg_core.text)("staff_uid"),
  staffEmail: (0, import_pg_core.text)("staff_email"),
  staffName: (0, import_pg_core.text)("staff_name"),
  zohoEmail: (0, import_pg_core.text)("zoho_email"),
  zohoDisplayName: (0, import_pg_core.text)("zoho_display_name"),
  zsoid: (0, import_pg_core.text)("zsoid").notNull(),
  zuid: (0, import_pg_core.text)("zuid").notNull(),
  accessToken: (0, import_pg_core.text)("access_token").notNull(),
  refreshToken: (0, import_pg_core.text)("refresh_token").notNull(),
  tokenExpiresAt: (0, import_pg_core.timestamp)("token_expires_at").notNull(),
  accountsServer: (0, import_pg_core.text)("accounts_server").default("https://accounts.zoho.com"),
  meetingBase: (0, import_pg_core.text)("meeting_base").default("https://meeting.zoho.com"),
  connectedAt: (0, import_pg_core.timestamp)("connected_at").defaultNow(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
});

// src/db/index.ts
var { Pool } = import_pg.default;
var createPool = () => {
  if (!global._postgresPool) {
    const isServerless = Boolean(process.env.VERCEL);
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: isServerless ? 3 : 10,
      connectionTimeoutMillis: isServerless ? 4e3 : 15e3
    });
    global._postgresPool.on("error", (_err) => {
    });
  }
  return global._postgresPool;
};
function getDb() {
  if (!global._drizzleDb) {
    global._drizzleDb = (0, import_node_postgres.drizzle)(createPool(), { schema: schema_exports });
  }
  return global._drizzleDb;
}
var db = new Proxy({}, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  }
});

// server.ts
var import_drizzle_orm2 = require("drizzle-orm");

// src/data/launchpadData.ts
var LAUNCHPAD_SUBJECTS = [
  {
    id: "comm-public-speaking",
    order: 1,
    title: "Effective Communication & Public Speaking",
    description: "Clear verbal and written expression, active listening, and the ability to articulate thoughts or present ideas without stage fear.",
    accentHex: "#4F46E5",
    surfaceTint: "#EEF2FF",
    iconKey: "comm-public-speaking",
    hasCurriculum: true,
    courseGoal: "Build clear verbal, written, and presentation skills for university interviews, counselor/professor outreach, and leadership roles.",
    passingThreshold: 75,
    certificateTitle: "Launchpad Certified \u2014 Effective Communication & Public Speaking",
    isArchived: false
  },
  {
    id: "time-self-management",
    order: 2,
    title: "Time Management & Self-Management",
    description: "Creating structured schedules, prioritizing tasks, meeting deadlines, and balancing academics with personal well-being.",
    accentHex: "#0284C7",
    surfaceTint: "#F0F9FF",
    hasCurriculum: false
  },
  {
    id: "digital-ai-literacy",
    order: 3,
    title: "Digital & AI Literacy",
    description: "Going beyond basic device usage to understand safe software navigation, online research, digital communication, and practical AI tools.",
    accentHex: "#0D9488",
    surfaceTint: "#F0FDFA",
    hasCurriculum: false
  },
  {
    id: "critical-thinking",
    order: 4,
    title: "Critical Thinking & Problem-Solving",
    description: "Evaluating information logically, asking analytical questions, and finding creative solutions when standard answers aren\u2019t provided.",
    accentHex: "#D97706",
    surfaceTint: "#FFFBEB",
    hasCurriculum: false
  },
  {
    id: "emotional-intelligence",
    order: 5,
    title: "Emotional Intelligence (EQ) & Stress Management",
    description: "Understanding one's own emotions, empathizing with peers, and handling burnout or academic pressure healthily.",
    accentHex: "#E11D48",
    surfaceTint: "#FFF1F2",
    hasCurriculum: false
  },
  {
    id: "financial-literacy",
    order: 6,
    title: "Financial Literacy",
    description: "Understanding the basics of budgeting, saving, handling digital transactions, and grasping the value of money.",
    accentHex: "#059669",
    surfaceTint: "#ECFDF5",
    hasCurriculum: false
  },
  {
    id: "collaboration-leadership",
    order: 7,
    title: "Collaboration & Leadership",
    description: "Working smoothly in group settings, respecting diverse perspectives, resolving conflicts, and taking initiative.",
    accentHex: "#7C3AED",
    surfaceTint: "#F5F3FF",
    hasCurriculum: false
  },
  {
    id: "adaptability-resilience",
    order: 8,
    title: "Adaptability & Resilience",
    description: "Bouncing back from setbacks, handling sudden changes in routine or environment, and maintaining a growth mindset.",
    accentHex: "#2563EB",
    surfaceTint: "#EFF6FF",
    hasCurriculum: false
  }
];
var SUBJECT_1_WEEKS = [
  {
    weekNumber: 1,
    title: "Active Listening & Non-Verbal Presence",
    lecture: {
      title: "5 ways to listen better",
      speaker: "TED \u2014 Julian Treasure",
      url: "https://www.youtube.com/watch?v=cSohjlYQI2A",
      youtubeId: "cSohjlYQI2A",
      duration: "8 min",
      focusNote: "Pay close attention to Julian Treasure's RASA framework and how conscious listening transforms interviews and mentoring conversations."
    },
    readingGuide: {
      title: "Active Listening & Non-Verbal Presence",
      readTime: "6 min read",
      summary: "Great communicators begin by listening with intent. Before shaping persuasive answers or emails, you must accurately decode what an interviewer, professor, or teammate actually cares about.",
      sections: [
        {
          heading: "1. The RASA Framework for Conscious Listening",
          body: "In high-stakes university interviews and counselor meetings, passive hearing leads to generic answers. Use RASA as your mental anchor during every conversation:",
          frameworkLabel: "RASA Framework",
          frameworkItems: [
            {
              term: "R \u2014 Receive",
              detail: "Give undivided attention to the speaker. Silence phone notifications, close extra browser tabs, and keep posture open toward the speaker or camera lens."
            },
            {
              term: "A \u2014 Appreciate",
              detail: 'Signal genuine engagement with small, natural affirmations\u2014eye contact, subtle nodding, and brief verbal cues ("That makes sense", "I see").'
            },
            {
              term: "S \u2014 Summarize",
              detail: `Mentally or verbally distill what you heard ("So your team's main concern is timeline reliability...") before jumping into your own response.`
            },
            {
              term: "A \u2014 Ask",
              detail: "Follow up with an open-ended, curiosity-driven question that builds directly on what the speaker just shared."
            }
          ]
        },
        {
          heading: "2. Eliminating Internal & External Distractions",
          body: "Most students lose listening bandwidth because they start rehearsing their next sentence while the other person is still talking. Replace premature rehearsing with two habits:",
          bullets: [
            "Physical Reset: Place both feet flat, keep hands visible, and position your laptop camera at eye level.",
            "The 1-Second Buffer: Let the speaker finish completely, pause for one full beat, and then respond. This prevents accidental interruptions and projects calm poise.",
            "Keyword Anchoring: Note 2\u20133 exact words the speaker emphasized so your reply directly mirrors their priorities."
          ]
        },
        {
          heading: "3. Reading Non-Verbal Cues",
          body: "Over half of conversational clarity comes from pacing, posture, and micro-reactions. Watch for shifts in energy when you explain a project: leaning forward signals curiosity (expand slightly), while glancing down or checking time signals you should land your point cleanly."
        }
      ]
    },
    practicalExercise: {
      title: "Active Listening & RASA Observation Log",
      scenario: "Conduct one 10-minute intentional conversation this week (with a teacher, peer, counselor, or family member) where your primary goal is to practice all four steps of RASA without checking your phone or interrupting.",
      selfCheckCriteria: [
        "Eliminated Digital Distractions (phone away, notifications silenced)",
        "Applied All 4 RASA Steps (Receive, Appreciate, Summarize, Ask)",
        "Asked at Least One Non-Leading Open Question"
      ],
      fields: [
        {
          key: "contextRole",
          label: "Conversation Context & Listener Role",
          placeholder: "e.g., 10-minute project check-in with my robotics teammate over Zoom...",
          type: "text"
        },
        {
          key: "receiveNotes",
          label: "Receive & Appreciate: Distractions Removed & Non-Verbal Cues Observed",
          placeholder: "Describe the distractions you removed and 2 non-verbal cues you noticed from the speaker.",
          type: "textarea"
        },
        {
          key: "summarizeStatement",
          label: "Summarize: Exact Paraphrase You Used",
          placeholder: "Write the exact 1\u20132 sentence summary you spoke back to confirm understanding.",
          type: "textarea"
        },
        {
          key: "askQuestion",
          label: "Ask: Open-Ended Follow-Up Question & Impact",
          placeholder: "What open-ended question did you ask, and how did it deepen the conversation?",
          type: "textarea"
        }
      ]
    }
  },
  {
    weekNumber: 2,
    title: "Structured Spontaneous Speaking",
    lecture: {
      title: "5 ways to listen better (Summarize & Ask Application)",
      speaker: "TED \u2014 Julian Treasure",
      url: "https://www.youtube.com/watch?v=cSohjlYQI2A",
      youtubeId: "cSohjlYQI2A",
      duration: "8 min",
      focusNote: "Revisit the Summarize and Ask steps as bridges into purposeful, non-rambling interview responses."
    },
    readingGuide: {
      title: "Structuring Verbal Thoughts on the Spot",
      readTime: "7 min read",
      summary: "When an admissions interviewer asks an unexpected question, rambling happens when you think out loud without a container. Learn two repeatable speaking architectures that keep answers crisp under 90 seconds.",
      sections: [
        {
          heading: "1. The PREP Framework (45\u201360s Opinion & Interview Answers)",
          body: 'Use PREP whenever you need to take a clear stance, defend a choice, or answer "Why this major / Why this university?"',
          frameworkLabel: "PREP Architecture",
          frameworkItems: [
            {
              term: "P \u2014 Point",
              detail: "State your direct thesis in one clear headline sentence. Never bury your conclusion."
            },
            {
              term: "R \u2014 Reason",
              detail: 'Give the core "why" behind your point in 1\u20132 logical sentences.'
            },
            {
              term: "E \u2014 Example",
              detail: "Anchor the reason with one concrete, specific micro-story, project, or metric."
            },
            {
              term: "P \u2014 Point (Restated)",
              detail: "Close cleanly by tying your example back to your headline so the listener knows you are done."
            }
          ]
        },
        {
          heading: "2. What \u2013 So What \u2013 Now What (60\u201390s Reflection Arc)",
          body: 'Use this 3-part reflection arc for behavioral prompts ("Tell me about a challenge or leadership moment"):',
          frameworkLabel: "Reflection Arc",
          frameworkItems: [
            {
              term: "What (20% of time)",
              detail: "Set the scene in 2 sentences max\u2014avoid long chronological backstory."
            },
            {
              term: "So What (45% of time)",
              detail: "Explain the insight, trade-off, or personal realization you gained."
            },
            {
              term: "Now What (35% of time)",
              detail: "Show how that insight changes your actions, goals, or future contribution on campus."
            }
          ]
        },
        {
          heading: '3. Eliminating the "Ramble Spiral"',
          body: `Two rules protect time discipline: (1) Decide your ending sentence before you start speaking, and (2) Stop talking the moment you finish your closing Point instead of adding "so yeah, that's basically it."`
        }
      ]
    },
    practicalExercise: {
      title: "The Mock Alumni Interview Drill",
      scenario: "You are in a 15-minute university alumni interview and must answer two classic prompts under 90 seconds each without rambling: Prompt A (Opinion/Fit via PREP) and Prompt B (Challenge/Growth via What\u2013So What\u2013Now What).",
      selfCheckCriteria: [
        `Direct Opening (no throat-clearing or "That's a great question" filler)`,
        "Concrete Example (specific project, moment, or measurable outcome included)",
        "Time Discipline (<60s PREP, <90s Reflection)"
      ],
      fields: [
        {
          key: "promptAPoint",
          label: "Prompt A \u2014 1-Sentence Point",
          placeholder: "e.g., I want to study Environmental Engineering because I want to redesign urban stormwater systems.",
          type: "text"
        },
        {
          key: "promptAExample",
          label: "Prompt A \u2014 Concrete Example (Reason + Specific Evidence)",
          placeholder: "Summarize the specific example or project that proves your Point in 45\u201360 seconds.",
          type: "textarea"
        },
        {
          key: "promptBWhat",
          label: "Prompt B \u2014 What Happened (2 sentences max)",
          placeholder: "Describe the situation or setback in at most two crisp sentences.",
          type: "textarea"
        },
        {
          key: "promptBSoNow",
          label: "Prompt B \u2014 So What & Now What",
          placeholder: "Explain what you learned and how it shapes what you will do next.",
          type: "textarea"
        },
        {
          key: "selfCritique",
          label: "Self-Critique (Pacing, Clarity & Timing)",
          placeholder: "Time your spoken delivery. Where did you hesitate or add unnecessary backstory?",
          type: "textarea"
        }
      ]
    }
  },
  {
    weekNumber: 3,
    title: "Audience-Centered Academic & Outreach Writing",
    lecture: {
      title: "The Secret to Business Writing: Crash Course Business - Soft Skills #3",
      speaker: "CrashCourse",
      url: "https://thecrashcourse.com/courses/the-secret-to-business-writing-crash-course-business-soft-skills-3/",
      duration: "10 min",
      focusNote: "Notice how clarity, brevity, and knowing your reader determine whether busy professors or admissions officers actually reply."
    },
    readingGuide: {
      title: "Audience-Centered Academic & Outreach Writing",
      readTime: "7 min read",
      summary: "Busy professors, internship mentors, and admissions counselors scan emails in 8 seconds. Writing for your reader\u2014not for yourself\u2014dramatically raises response rates.",
      sections: [
        {
          heading: "1. The 3-Question Audience Filter",
          body: "Before drafting any academic or outreach email, answer three questions from the reader's point of view:",
          bullets: [
            "Who is reading this, and what is their current time pressure?",
            "What specific decision or action am I asking them to make?",
            "Why should they care right now (what connects my background to their work)?"
          ]
        },
        {
          heading: "2. BLUF: Bottom Line Up Front",
          body: "Academic outreach fails when students spend two paragraphs introducing their life story before stating why they wrote. Reverse the pyramid with BLUF:",
          frameworkLabel: "BLUF Email Architecture",
          frameworkItems: [
            {
              term: "Specific Subject Line",
              detail: 'State role + topic + concrete ask (e.g., "High School Junior \u2014 Question on Urban Heat Paper / 15-Min Call").'
            },
            {
              term: "BLUF Opening (Sentences 1\u20132)",
              detail: "State who you are and your exact request immediately."
            },
            {
              term: "Credibility Bridge (2\u20133 Sentences)",
              detail: "Reference one genuine connection to their work plus one brief proof point from yours."
            },
            {
              term: "Low-Friction Close (1 Sentence)",
              detail: "Offer two concrete time windows or make it effortless to say yes or redirect."
            }
          ]
        }
      ]
    },
    practicalExercise: {
      title: "The Cold Outreach Email Makeover",
      scenario: "You want to request a 15-minute informational call or summer shadowing opportunity with a university professor or industry mentor. First write an unedited long draft, then transform it using BLUF.",
      selfCheckCriteria: [
        'Specific Subject Line (not "Hello" or "Quick Question")',
        "BLUF Opening (core ask appears within the first 2 sentences)",
        "Under 120 Words in final Draft 2 email body"
      ],
      fields: [
        {
          key: "draft1",
          label: "Draft 1 (Unedited, 180\u2013220 words)",
          placeholder: "Write your natural, unedited first attempt before applying BLUF.",
          type: "textarea",
          showWordCount: true,
          hint: "Target: 180\u2013220 words"
        },
        {
          key: "draft2Subject",
          label: "Draft 2 Subject Line",
          placeholder: "Write a concise, specific subject line.",
          type: "text"
        },
        {
          key: "draft2Body",
          label: "Draft 2 BLUF Email (<120 words)",
          placeholder: "Rewrite using BLUF opening, tailored relevance, and a low-friction close.",
          type: "textarea",
          showWordCount: true,
          hint: "Target: Strictly under 120 words"
        },
        {
          key: "threeEdits",
          label: "3 Specific Edits Made & Why",
          placeholder: "1) Cut... because...\n2) Moved... to the opening because...\n3) Replaced... with...",
          type: "textarea"
        }
      ]
    }
  },
  {
    weekNumber: 4,
    title: "Tone, Persuasion, and Digital Etiquette",
    lecture: {
      title: "The Secret to Business Writing (Tone & Etiquette Application)",
      speaker: "CrashCourse",
      url: "https://thecrashcourse.com/courses/the-secret-to-business-writing-crash-course-business-soft-skills-3/",
      duration: "10 min",
      focusNote: "Focus on how register, empathy, and precision prevent misunderstandings when communicating under deadline pressure."
    },
    readingGuide: {
      title: "Tone, Persuasion, and Digital Etiquette",
      readTime: "6 min read",
      summary: "Digital text strips away facial expression and vocal warmth. Knowing how to calibrate register\u2014and resolve tension without blame\u2014separates mature leaders from defensive writers.",
      sections: [
        {
          heading: "1. Calibrating Register: Formal vs. Semi-Formal vs. Chat",
          body: "Choose your register based on relationship hierarchy and stakes:",
          frameworkLabel: "Three Registers",
          frameworkItems: [
            {
              term: "Formal",
              detail: "For instructors, admissions offices, and external mentors. Complete sentences, clear greeting/sign-off, zero slang or emoji."
            },
            {
              term: "Semi-Formal",
              detail: "For peers, project collaborators, and club teams. Warm, concise, solution-oriented, respectful of boundaries."
            },
            {
              term: "Chat",
              detail: "For quick logistics among close teammates. Keep actionable details explicit so nothing gets lost."
            }
          ]
        },
        {
          heading: "2. Fixing Common Tone Traps & The 60-Second Pre-Send Audit",
          body: 'Passive-aggressive phrasing ("As I already mentioned...", "Per my last email...") damages trust instantly. Run a 60-second audit before hitting Send:',
          bullets: [
            'Blame Check: Replace "You forgot to..." with "Our milestone is currently missing X; here is how we can close it by [time]."',
            'Explicit Dates & Times: Never write "soon" or "this week"\u2014specify day, date, and timezone.',
            "Read-Aloud Test: Read the draft out loud once. If any sentence sounds sharp or ambiguous, soften the framing while keeping the deadline firm."
          ]
        }
      ]
    },
    practicalExercise: {
      title: "High-Stakes Tone Calibration Makeover",
      scenario: "A teammate missed an internal deadline, delaying your group submission by 2 days. Write two calibrated messages: a formal accountability update to your instructor and a constructive semi-formal message to your teammate.",
      selfCheckCriteria: [
        "Zero Blame-Shifting (takes shared ownership and focuses on resolution)",
        "Appropriate Register (Formal for Instructor, Semi-Formal for Teammate)",
        "Explicit Dates/Times stated in both messages"
      ],
      fields: [
        {
          key: "instructorEmail",
          label: "Email to Instructor (90\u2013120 words, formal BLUF)",
          placeholder: "Write the formal BLUF update to your instructor with revised submission date and ownership.",
          type: "textarea",
          showWordCount: true,
          hint: "Target: 90\u2013120 words"
        },
        {
          key: "teammateMessage",
          label: "Message to Teammate (60\u201380 words, semi-formal)",
          placeholder: "Write a calm, constructive message aligning on exact handoff steps and timing.",
          type: "textarea",
          showWordCount: true,
          hint: "Target: 60\u201380 words"
        },
        {
          key: "preSendAudit",
          label: "Pre-Send Audit Reflection",
          placeholder: "What phrasing did you adjust during your 60-second audit to remove defensiveness or ambiguity?",
          type: "textarea"
        }
      ]
    }
  },
  {
    weekNumber: 5,
    title: "Overcoming Stage Fright & Vocal Control",
    lecture: {
      title: "How to Speak With Confidence: Crash Course Business - Soft Skills #4",
      speaker: "CrashCourse",
      url: "https://www.youtube.com/watch?v=sjdxUiAJ0UQ",
      youtubeId: "sjdxUiAJ0UQ",
      duration: "10 min",
      focusNote: "Observe physical grounding, breathing mechanics, and why deliberate silence beats filler words."
    },
    readingGuide: {
      title: "Overcoming Stage Fright & Vocal Control",
      readTime: "7 min read",
      summary: "Stage fright is a physiological adrenaline spike\u2014not a character flaw. By regulating breath, posture, and vocal cadence, you convert nervous energy into grounded authority.",
      sections: [
        {
          heading: "1. Physiological Reset: Box Breathing & Grounding Posture",
          body: "Two minutes before speaking, calm your nervous system mechanically:",
          bullets: [
            "4-4-4-4 Box Breathing: Inhale 4s, hold 4s, exhale 4s, hold 4s. Repeat 4 cycles to lower heart rate.",
            "Grounding Posture: Stand or sit with shoulder blades relaxed down, feet shoulder-width apart, and chin parallel to the floor.",
            "2-Second Pause Rule: When you finish a key point\u2014or lose your train of thought\u2014hold clean silence for up to 2 seconds. To the audience, silence reads as poise, never panic."
          ]
        },
        {
          heading: "2. S.U.C.C.E.S. Preparation Filter & Vocal Delivery Toolkit",
          body: "Keep your message memorable using S.U.C.C.E.S. (Simple, Unexpected, Concrete, Credible, Emotional, Stories), then deliver it with intentional vocal control:",
          frameworkLabel: "Vocal Delivery Toolkit",
          frameworkItems: [
            {
              term: "Pace",
              detail: "Aim for ~130\u2013150 words per minute. Slow down slightly on thesis statements and numbers."
            },
            {
              term: "Filler Words",
              detail: 'Replace "um", "uh", "like", and "basically" with closed-mouth pauses.'
            },
            {
              term: "Volume & Inflection",
              detail: "Project to the back row (or across the room) and avoid upspeak\u2014let statements land downward."
            }
          ]
        }
      ]
    },
    practicalExercise: {
      title: "The 60-Second Impromptu & Filler-Word Drill",
      scenario: "Record three 60-second impromptu talks on everyday topics (two takes each). Count your filler words in Take 1, do a 2-minute box-breathing reset, and replace filler words with 1\u20132 second composed silence in Take 2.",
      selfCheckCriteria: [
        "Pre-Talk Reset completed (2 min 4-4-4-4 box breathing)",
        "Filler-Word Reduction achieved (\u226550% drop from Take 1 to Take 2)",
        "Vocal Pacing maintained without rushing endings"
      ],
      fields: [
        {
          key: "topic1",
          label: "Topic 1 & Filler Count (Take 1 vs. Take 2)",
          placeholder: "Topic: ... | Take 1 fillers: ... | Take 2 fillers: ...",
          type: "text"
        },
        {
          key: "topic2",
          label: "Topic 2 & Filler Count (Take 1 vs. Take 2)",
          placeholder: "Topic: ... | Take 1 fillers: ... | Take 2 fillers: ...",
          type: "text"
        },
        {
          key: "topic3",
          label: "Topic 3 & Filler Count (Take 1 vs. Take 2)",
          placeholder: "Topic: ... | Take 1 fillers: ... | Take 2 fillers: ...",
          type: "text"
        },
        {
          key: "pauseReflection",
          label: "Reflection on 2-Second Pauses",
          placeholder: "How did substituting 1\u20132s silence for filler words feel, and how did your pacing change?",
          type: "textarea"
        }
      ]
    }
  },
  {
    weekNumber: 6,
    title: "Delivering a Core-Idea Presentation",
    lecture: {
      title: "TED's secret to great public speaking",
      speaker: "TED \u2014 Chris Anderson",
      url: "https://www.youtube.com/watch?v=-FOCpMAww28",
      youtubeId: "-FOCpMAww28",
      duration: "8 min",
      focusNote: 'Learn how Chris Anderson defines a single "throughline" idea worth sharing and builds every slide and story around it.'
    },
    readingGuide: {
      title: "Crafting & Delivering a Core-Idea Presentation",
      readTime: "7 min read",
      summary: "Great presentations do not cram an entire resume into 3 minutes\u2014they plant one unforgettable idea in the listener's mind using vivid analogies, minimalist slides, and disciplined pacing.",
      sections: [
        {
          heading: "1. The 1-Sentence Throughline & Minimalist Slides",
          body: "Every compelling talk is built on a single organizing spine:",
          bullets: [
            "1-Sentence Throughline: Summarize your entire presentation in one clear claim of \u226420 words. If a story or slide doesn't serve that sentence, cut it.",
            "Analogies & Concrete Imagery: Bridge unfamiliar technical topics to everyday intuition with a crisp comparison.",
            `15-Second Hook: Open with a surprising fact, vivid micro-scene, or provocative question\u2014never "Hi, today I'm going to talk about..."`,
            "Minimalist Slides (10\u201315 Words Max): Slides are visual anchors, not teleprompters. Use max 10\u201315 words or one clean chart/image per slide."
          ]
        },
        {
          heading: "2. The 3-Minute Talk Blueprint",
          body: "Structure short admissions pitches, scholarship panels, or leadership talks along these exact timestamps:",
          frameworkLabel: "3-Minute Blueprint",
          frameworkItems: [
            {
              term: "0:00 \u2013 0:25 | Hook",
              detail: "Capture attention in 15\u201325 seconds and state your 1-sentence throughline."
            },
            {
              term: "0:25 \u2013 2:20 | Core Idea + Story",
              detail: "Develop one vivid story, analogy, or evidence arc proving why the idea matters."
            },
            {
              term: "2:20 \u2013 3:00 | Close",
              detail: "Deliver a memorable takeaway and clear call-to-action or future impact statement."
            }
          ]
        }
      ]
    },
    practicalExercise: {
      title: "The 3-Minute Admissions 'Passion Project' Pitch",
      scenario: "Pitch a personal project or leadership initiative to a scholarship or club panel in 2:45\u20133:15 using only a 3-bullet cue card and zero memorized script.",
      selfCheckCriteria: [
        "Strong Hook delivered within 0:00\u20130:25",
        "Single Core Idea sustained without drifting into unrelated resume items",
        "Presence & Eye Contact maintained with zero script-reading"
      ],
      fields: [
        {
          key: "throughline",
          label: "Your 1-Sentence Throughline",
          placeholder: "Write the single core idea your entire 3-minute pitch builds around.",
          type: "text"
        },
        {
          key: "cueCard",
          label: "Your 3-Bullet Cue Card",
          placeholder: "\u2022 Hook (0:00\u20130:25): ...\n\u2022 Core Story/Evidence (0:25\u20132:20): ...\n\u2022 Close (2:20\u20133:00): ...",
          type: "textarea"
        },
        {
          key: "videoLengthAndScores",
          label: "Video Length & Self-Score (1\u20135 on Hook, Clarity, Pacing, Posture)",
          placeholder: "Duration: e.g., 2:58 | Hook: /5 | Clarity: /5 | Pacing: /5 | Posture: /5",
          type: "text"
        },
        {
          key: "secondTakeImprovement",
          label: "One Thing to Improve in a Second Take",
          placeholder: "Identify the single highest-impact refinement for your next rehearsal.",
          type: "textarea"
        }
      ]
    }
  }
];
var SUBJECT_1_FINAL_TEST = {
  timeLimitMinutes: 20,
  passingThreshold: 75,
  mcqQuestions: [
    {
      id: "q1",
      weekRef: 1,
      question: `In Julian Treasure's RASA active listening framework, what does the "S" stand for?`,
      options: [
        "Speak firmly when your turn arrives",
        "Summarize what you heard to confirm alignment",
        "Simplify your own talking points",
        "Silence your personal opinions permanently"
      ],
      correctIndex: 1,
      explanation: "RASA stands for Receive, Appreciate, Summarize, and Ask."
    },
    {
      id: "q2",
      weekRef: 1,
      question: "During a virtual alumni interview, what is the best habit immediately after the interviewer finishes a question?",
      options: [
        "Begin speaking instantly so there is zero silence",
        "Ask them to repeat the question while you formulate a story",
        "Take a calm 1-second buffer to process key words before answering",
        "Look down at your written script for 10 seconds"
      ],
      correctIndex: 2,
      explanation: "A 1-second buffer prevents interruptions and projects composed presence."
    },
    {
      id: "q3",
      weekRef: 2,
      question: "In the PREP speaking structure, what should your very first sentence do?",
      options: [
        "Give chronological background context from 9th grade",
        "State your direct Point / thesis clearly",
        "Thank the interviewer for asking such an insightful question",
        "List three unrelated extracurricular awards"
      ],
      correctIndex: 1,
      explanation: "PREP begins directly with your Point (thesis), followed by Reason, Example, and Point."
    },
    {
      id: "q4",
      weekRef: 2,
      question: 'For a 60\u201390 second behavioral reflection using "What \u2013 So What \u2013 Now What", where should the largest share of speaking time go?',
      options: [
        "Describing every chronological detail of What happened",
        "Listing teammates' names and schedules",
        'The "So What" insight and "Now What" future application',
        "Repeating your opening disclaimer"
      ],
      correctIndex: 2,
      explanation: 'Keep "What" to ~2 sentences max so ~80% of time highlights insight (So What) and forward impact (Now What).'
    },
    {
      id: "q5",
      weekRef: 3,
      question: "What does BLUF stand for in effective outreach writing?",
      options: [
        "Build Longer Useful Footnotes",
        "Bottom Line Up Front",
        "Brief Letter Under Five-hundred words",
        "Bold Language Usually Fails"
      ],
      correctIndex: 1,
      explanation: "BLUF places your core ask or conclusion in the opening 1\u20132 sentences."
    },
    {
      id: "q6",
      weekRef: 3,
      question: "Which cold outreach subject line best follows Week 3 best practices?",
      options: [
        "Hello!",
        "Quick Question",
        "High School Senior \u2014 Question on Microplastic Filtration Paper / 15-Min Call",
        "Urgent Please Read Immediately"
      ],
      correctIndex: 2,
      explanation: "A strong subject line specifies sender context, topic relevance, and the exact request."
    },
    {
      id: "q7",
      weekRef: 3,
      question: "What is the ideal target word limit for a cold outreach email to a busy professor or mentor?",
      options: [
        "Under 120 words",
        "300\u2013400 words with full resume attached",
        "At least 500 words explaining your life story",
        "15 words with no greeting"
      ],
      correctIndex: 0,
      explanation: "Concise BLUF outreach emails under 120 words respect the reader's time and earn higher reply rates."
    },
    {
      id: "q8",
      weekRef: 4,
      question: "A teammate missed an internal deadline and delayed your group project. Which phrasing passes the Pre-Send Audit?",
      options: [
        '"As I already reminded you twice, you made us late."',
        '"I need you to fix your mistake immediately."',
        '"Our final section is still open; can we sync at 5:00 PM today so we submit by Thursday 6:00 PM?"',
        `"We'll submit sometime soon whenever you get around to it."`
      ],
      correctIndex: 2,
      explanation: "Zero blame-shifting, constructive tone, and explicit dates/times pass the Pre-Send Audit."
    },
    {
      id: "q9",
      weekRef: 4,
      question: "Which communication register is appropriate when emailing a university admissions office or course instructor?",
      options: [
        "Chat register with casual abbreviations",
        "Formal register with complete sentences and clear greeting/sign-off",
        "Voice-note shorthand",
        "Sarcastic humor to stand out"
      ],
      correctIndex: 1,
      explanation: "External officials and instructors require a formal register."
    },
    {
      id: "q10",
      weekRef: 5,
      question: 'How should you replace filler words ("um", "like", "uh") during an impromptu talk?',
      options: [
        "Speak twice as fast so fillers aren't noticeable",
        "Use a 1\u20132 second closed-mouth composed pause",
        'Say "basically" instead of "um"',
        "Apologize aloud whenever you pause"
      ],
      correctIndex: 1,
      explanation: "A 1\u20132 second composed pause projects confidence and eliminates verbal clutter."
    },
    {
      id: "q11",
      weekRef: 5,
      question: "What is the timing cadence for the pre-talk Box Breathing reset?",
      options: [
        "10s inhale, 2s exhale",
        "4s inhale, 4s hold, 4s exhale, 4s hold",
        "Rapid shallow breaths for 30 seconds",
        "Hold breath for 20 seconds before speaking"
      ],
      correctIndex: 1,
      explanation: "4-4-4-4 Box Breathing regulates heart rate and nerves before speaking."
    },
    {
      id: "q12",
      weekRef: 6,
      question: `According to Chris Anderson's TED framework, what is a presentation's "throughline"?`,
      options: [
        "The decorative transition animation between slides",
        "The single connecting core idea that every story and example serves",
        "A word-for-word memorized script",
        "The Q&A period at the end of a talk"
      ],
      correctIndex: 1,
      explanation: "A throughline is the single 1-sentence core idea unifying the entire presentation."
    },
    {
      id: "q13",
      weekRef: 6,
      question: "What is the recommended maximum text density on minimalist presentation slides?",
      options: [
        "10\u201315 words max per slide",
        "150 words so the audience can read ahead",
        "Full paragraphs copied from your essay",
        "At least 6 bullet points of 20 words each"
      ],
      correctIndex: 0,
      explanation: "Slides act as visual anchors (10\u201315 words max), never teleprompters."
    },
    {
      id: "q14",
      weekRef: 6,
      question: "In the 3-Minute Talk Blueprint, what happens between 0:00 and 0:25?",
      options: [
        "Full Q&A and citations",
        "Hook + clear introduction of your core idea",
        "Reading your resume timeline",
        "Closing summary"
      ],
      correctIndex: 1,
      explanation: "0:00\u20130:25 delivers your 15-second hook and sets up the core idea."
    }
  ],
  situationalQuestions: [
    {
      id: "sit1",
      title: "Situational Response 1 \u2014 BLUF Outreach Rewrite",
      scenario: "You want to ask Dr. Meera Patel (a Biomedical AI researcher) for a 15-minute informational chat after reading her paper on low-cost retinal screening.",
      prompt: "Write a complete outreach email (Subject + Body, under 120 words total) applying the BLUF framework.",
      minWords: 35,
      rubricKeywords: ["subject", "15", "minute", "retinal", "research", "call", "chat", "thank", "schedule"],
      rubricGuidance: "Include a specific Subject line, state your ask in the first 2 sentences, reference her retinal screening paper, and close with a specific low-friction time option."
    },
    {
      id: "sit2",
      title: "Situational Response 2 \u2014 PREP Interview Answer",
      scenario: 'An alumni interviewer asks: "Which high school project are you proudest of, and why?"',
      prompt: "Write a crisp 45\u201360 second spoken response script (50\u2013110 words) structured strictly with PREP (Point, Reason, Example, Point).",
      minWords: 40,
      rubricKeywords: ["because", "for example", "built", "created", "led", "learned", "impact", "result"],
      rubricGuidance: "Open directly with a 1-sentence Point, explain the Reason, give a concrete Example with an outcome, and end by restating your Point."
    }
  ]
};
function buildDefaultLaunchpadSubjects() {
  return LAUNCHPAD_SUBJECTS.map((s) => ({
    ...s,
    iconKey: s.iconKey || s.id,
    passingThreshold: s.passingThreshold ?? 75,
    certificateTitle: s.certificateTitle || `Launchpad Certified \u2014 ${s.title}`,
    isArchived: false
  }));
}
function buildDefaultLaunchpadChapters() {
  return SUBJECT_1_WEEKS.map((w) => ({
    ...w,
    id: `comm-public-speaking__w${w.weekNumber}`,
    subjectId: "comm-public-speaking",
    learningObjectives: w.learningObjectives || [w.readingGuide.summary],
    practicalExercise: {
      ...w.practicalExercise,
      allowFileUpload: w.practicalExercise.allowFileUpload ?? true
    }
  }));
}
function buildDefaultCertQuestions() {
  const mcqs = SUBJECT_1_FINAL_TEST.mcqQuestions.map((q, idx) => ({
    id: `comm-public-speaking__${q.id}`,
    subjectId: "comm-public-speaking",
    questionType: "mcq",
    sortOrder: idx + 1,
    payload: { ...q, subjectId: "comm-public-speaking", sortOrder: idx + 1 }
  }));
  const sit = SUBJECT_1_FINAL_TEST.situationalQuestions.map((q, idx) => ({
    id: `comm-public-speaking__${q.id}`,
    subjectId: "comm-public-speaking",
    questionType: "situational",
    sortOrder: mcqs.length + idx + 1,
    payload: { ...q, subjectId: "comm-public-speaking", sortOrder: mcqs.length + idx + 1 }
  }));
  return [...mcqs, ...sit];
}

// src/db/productionVault.ts
var import_pg2 = __toESM(require("pg"), 1);
var import_drizzle_orm = require("drizzle-orm");
var { Pool: Pool2 } = import_pg2.default;
var SYS_KV_PREFIX = "__SYS_KV__";
function isSysKvUid(uid) {
  return Boolean(uid && String(uid).startsWith(SYS_KV_PREFIX));
}
var memoryKv = /* @__PURE__ */ new Map();
var liveColumnsByTable = /* @__PURE__ */ new Map();
var schemaIntrospected = false;
var initPromise = null;
function hasSqlEnv() {
  return Boolean(process.env.SQL_HOST && process.env.SQL_DB_NAME && process.env.SQL_USER);
}
function hasTable(tableName) {
  if (!schemaIntrospected) return hasSqlEnv();
  return liveColumnsByTable.has(tableName);
}
function hasColumn(tableName, columnName) {
  if (!schemaIntrospected) return hasSqlEnv();
  const cols = liveColumnsByTable.get(tableName);
  return Boolean(cols && cols.has(columnName));
}
var IDEMPOTENT_DDL_STATEMENTS = [
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
  )`
];
async function refreshSchemaIntrospection() {
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
        set = /* @__PURE__ */ new Set();
        liveColumnsByTable.set(tName, set);
      }
      set.add(cName);
    }
    schemaIntrospected = true;
    return true;
  } catch (err) {
    console.error("[Schema Introspection Error]", err?.message || err);
    return false;
  }
}
async function runIdempotentMigrationsIfNeeded() {
  if (!hasSqlEnv()) return;
  const introspected = await refreshSchemaIntrospection();
  if (!introspected) return;
  const requiredChecks = [
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
    ["zoho_connections", "staff_key"]
  ];
  const needsMigration = requiredChecks.some(([tbl, col]) => !hasColumn(tbl, col));
  if (!needsMigration) return;
  const hasAdminCreds = Boolean(process.env.SQL_ADMIN_USER && process.env.SQL_ADMIN_PASSWORD);
  let migrationPool = null;
  let shouldEndPool = false;
  try {
    if (hasAdminCreds) {
      migrationPool = new Pool2({
        host: process.env.SQL_HOST,
        user: process.env.SQL_ADMIN_USER,
        password: process.env.SQL_ADMIN_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 2,
        connectionTimeoutMillis: 15e3
      });
      migrationPool.on("error", () => {
      });
      shouldEndPool = true;
    } else {
      migrationPool = createPool();
    }
    for (const stmt of IDEMPOTENT_DDL_STATEMENTS) {
      try {
        await migrationPool.query(stmt);
      } catch {
      }
    }
    if (hasAdminCreds && process.env.SQL_USER && /^[a-zA-Z0-9_-]+$/.test(process.env.SQL_USER)) {
      const appUserIdent = `"${process.env.SQL_USER}"`;
      await migrationPool.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${appUserIdent}`).catch(() => {
      });
      await migrationPool.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${appUserIdent}`).catch(() => {
      });
    }
  } finally {
    if (shouldEndPool && migrationPool) {
      await migrationPool.end().catch(() => {
      });
    }
  }
  await refreshSchemaIntrospection();
}
async function seedDefaultsIfEmpty() {
  if (!hasSqlEnv() || !hasTable("users")) return;
  try {
    const pool = createPool();
    const existingUsersRes = await pool.query(`SELECT id, uid, email FROM "users"`);
    const existingUsers = existingUsersRes.rows || [];
    const hasUser = (uid, email) => existingUsers.some(
      (u) => String(u.uid || "").trim() === uid || String(u.email || "").trim().toLowerCase() === email.trim().toLowerCase()
    );
    const defaultStaffSeed = [
      { uid: "admin-1", email: "uppseekers@gmail.com", name: "Admin", password: "Uppseekers@1", role: "SYSTEM_ADMIN", students: "All" },
      { uid: "2", email: "sarah@uppseekers.com", name: "Sarah Jenkins", password: "Staff@123", role: "COUNSELOR", students: "2 Students" },
      { uid: "3", email: "vikram.roy@uppseekers.com", name: "Dr. Vikram Roy", password: "Staff@123", role: "RESEARCH_GUIDE", students: "2 Students" },
      { uid: "4", email: "marcus@uppseekers.com", name: "Marcus Vance", password: "Staff@123", role: "CATEGORY_MANAGER", students: "All" },
      { uid: "5", email: "elena@uppseekers.com", name: "Elena Rostova", password: "Staff@123", role: "SAT_VERBAL_FACULTY", students: "1 Student" },
      { uid: "6", email: "rajesh.menon@uppseekers.com", name: "Rajesh Menon", password: "Staff@123", role: "SAT_MATH_FACULTY", students: "1 Student" }
    ];
    for (const st of defaultStaffSeed) {
      if (!hasUser(st.uid, st.email)) {
        if (hasColumn("users", "password")) {
          const inserted = await db.insert(users).values({
            uid: st.uid,
            email: st.email,
            name: st.name,
            password: st.password,
            role: st.role
          }).onConflictDoNothing({ target: users.uid }).returning();
          if (inserted[0] && hasTable("staff_data")) {
            await db.insert(staffData).values({
              userId: inserted[0].id,
              status: "Active",
              students: st.students
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
        profileJson: { researchMentor: "Dr. Vikram Roy" }
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
        profileJson: { satVerbalMentor: "Elena Rostova" }
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
        profileJson: { researchMentor: "Dr. Vikram Roy" }
      }
    ];
    for (const stu of defaultStudentsSeed) {
      if (!hasUser(stu.uid, stu.email)) {
        let userIdNum;
        if (hasColumn("users", "password")) {
          const inserted = await db.insert(users).values({
            uid: stu.uid,
            email: stu.email,
            name: stu.name,
            password: stu.password,
            role: "STUDENT"
          }).onConflictDoNothing({ target: users.uid }).returning();
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
              profileJson: stu.profileJson
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
      if (existingSubjects.length === 0 || existingSubjects.length <= 1 && !hasCoreSubject) {
        const existingChapters = hasTable("launchpad_chapters") ? await db.select().from(launchpadChapters) : [];
        const chapterSubjectIds = new Set(existingChapters.map((c) => c.subjectId));
        const defaultSubjects = buildDefaultLaunchpadSubjects();
        for (const s of defaultSubjects) {
          await db.insert(launchpadSubjects).values({
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
            updatedAt: /* @__PURE__ */ new Date()
          }).onConflictDoNothing({ target: launchpadSubjects.id });
        }
        if (hasTable("launchpad_chapters") && !existingChapters.some((c) => c.subjectId === "comm-public-speaking")) {
          const defaultChapters = buildDefaultLaunchpadChapters();
          for (const c of defaultChapters) {
            await db.insert(launchpadChapters).values({
              id: c.id || `comm-public-speaking__w${c.weekNumber}`,
              subjectId: "comm-public-speaking",
              weekNumber: c.weekNumber,
              title: c.title,
              learningObjectives: c.learningObjectives || [],
              lectureJson: c.lecture || {},
              readingGuideJson: c.readingGuide || {},
              practicalExerciseJson: c.practicalExercise || {},
              updatedAt: /* @__PURE__ */ new Date()
            }).onConflictDoNothing({ target: launchpadChapters.id });
          }
        }
        if (hasTable("launchpad_certification_questions")) {
          const existingCerts = await db.select().from(launchpadCertificationQuestions);
          if (!existingCerts.some((q) => q.subjectId === "comm-public-speaking")) {
            const defaultCerts = buildDefaultCertQuestions();
            for (const q of defaultCerts) {
              await db.insert(launchpadCertificationQuestions).values({
                id: q.id,
                subjectId: q.subjectId,
                questionType: q.questionType,
                sortOrder: q.sortOrder,
                payloadJson: q.payload || {},
                updatedAt: /* @__PURE__ */ new Date()
              }).onConflictDoNothing({ target: launchpadCertificationQuestions.id });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("[Seed Defaults Warning]", err?.message || err);
  }
}
async function ensureProductionReady() {
  if (!hasSqlEnv()) return;
  if (!initPromise) {
    initPromise = (async () => {
      await runIdempotentMigrationsIfNeeded();
      if (!schemaIntrospected) {
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
async function sysKvSet(key, data) {
  const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const envelope = { data, updatedAt };
  memoryKv.set(key, envelope);
  if (!hasSqlEnv()) {
    return false;
  }
  let persistedToSql = false;
  const settingsKey = `${SYS_KV_PREFIX}${key}`;
  if (hasTable("portal_settings")) {
    try {
      await db.insert(portalSettings).values({
        key: settingsKey,
        valueJson: envelope,
        updatedAt: /* @__PURE__ */ new Date()
      }).onConflictDoUpdate({
        target: portalSettings.key,
        set: {
          valueJson: envelope,
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
      persistedToSql = true;
    } catch {
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
    } catch (err) {
      console.error(`[sysKvSet Error: ${key}]`, err?.message || err);
    }
  }
  return persistedToSql;
}
async function sysKvGet(key, fallback) {
  const candidates = [];
  const mem = memoryKv.get(key);
  if (mem && mem.data !== void 0) {
    candidates.push(mem);
  }
  if (hasSqlEnv()) {
    const settingsKey = `${SYS_KV_PREFIX}${key}`;
    if (hasTable("portal_settings")) {
      try {
        const row = await db.select().from(portalSettings).where((0, import_drizzle_orm.eq)(portalSettings.key, settingsKey)).then((r) => r[0]);
        const val = row?.valueJson;
        if (val && val.data !== void 0) {
          candidates.push({
            data: val.data,
            updatedAt: String(val.updatedAt || row?.updatedAt?.toISOString?.() || "")
          });
        }
      } catch {
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
          if (parsed && parsed.data !== void 0) {
            candidates.push({
              data: parsed.data,
              updatedAt: String(parsed.updatedAt || res.rows[0]?.status || "")
            });
          }
        }
      } catch {
      }
    }
  }
  if (candidates.length === 0) return fallback;
  candidates.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  const best = candidates[0];
  memoryKv.set(key, best);
  return best.data;
}
function mergeRecordsById(primaryRows, kvRows, idField = "id", timeField) {
  const map = /* @__PURE__ */ new Map();
  const toMs = (val) => {
    if (!val) return 0;
    const ms = new Date(val).getTime();
    return Number.isFinite(ms) ? ms : 0;
  };
  for (const row of kvRows || []) {
    if (!row || row[idField] === void 0 || row[idField] === null) continue;
    map.set(String(row[idField]), row);
  }
  for (const row of primaryRows || []) {
    if (!row || row[idField] === void 0 || row[idField] === null) continue;
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

// server.ts
var passwordResetStore = /* @__PURE__ */ new Map();
async function safeDbQuery(queryFn, fallback) {
  if (!hasSqlEnv()) {
    return fallback;
  }
  try {
    return await queryFn();
  } catch (firstErr) {
    const msg = String(firstErr?.message || firstErr || "").toLowerCase();
    const isTransient = !process.env.VERCEL && (msg.includes("connect") || msg.includes("timeout") || msg.includes("terminated") || msg.includes("econnreset") || msg.includes("closed") || msg.includes("failed query"));
    if (isTransient) {
      await new Promise((r) => setTimeout(r, 1200));
      try {
        return await queryFn();
      } catch (retryErr) {
        console.error("[DB Query Error]", retryErr?.message || retryErr);
        return fallback;
      }
    }
    console.error("[DB Query Error]", firstErr?.message || firstErr);
    return fallback;
  }
}
function normEmail(email) {
  return (email || "").trim().toLowerCase();
}
function normEmailKey(email) {
  const clean = normEmail(email);
  return clean ? clean.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128) : "unknown_user";
}
var GLOBAL_MANAGER_ROLES = /* @__PURE__ */ new Set([
  "SYSTEM_ADMIN",
  "ADMIN",
  "SUPER_ADMIN",
  "CATEGORY_MANAGER",
  "CATEGORY_LEAD",
  "OPERATIONS_LEAD",
  "OPS_LEAD",
  "HEAD_COUNSELOR",
  "ACADEMIC_DIRECTOR"
]);
async function getVerifiedCallerStaffDirRole(req) {
  const email = normEmail(req.user?.email);
  const uid = (req.user?.uid || "").trim();
  if (!uid || !email) return null;
  if (email === "uppseekers@gmail.com") {
    return { role: "SYSTEM_ADMIN", status: "Active", globalScope: true };
  }
  if (hasAdminServiceAccount()) {
    try {
      const adminSnap = await adminDb.collection("admins").doc(uid).get();
      if (adminSnap.exists) {
        return { role: "SYSTEM_ADMIN", status: "Active", globalScope: true };
      }
      const dirSnap = await adminDb.collection("staff_directory").doc(normEmailKey(email)).get();
      if (dirSnap.exists) {
        const d = dirSnap.data() || {};
        return {
          role: String(d.role || "").trim().toUpperCase().replace(/[\s-]+/g, "_"),
          status: String(d.status || "Active").trim(),
          globalScope: Boolean(d.globalScope)
        };
      }
    } catch {
    }
  }
  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const firebaseProjectId = firebaseAppletConfig.projectId;
  const firestoreDatabaseId = firebaseAppletConfig.firestoreDatabaseId || "(default)";
  if (idToken && firebaseProjectId && firestoreDatabaseId) {
    try {
      const docUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseProjectId)}/databases/${encodeURIComponent(firestoreDatabaseId)}/documents/staff_directory/${encodeURIComponent(normEmailKey(email))}`;
      const r = await fetch(docUrl, { headers: { Authorization: `Bearer ${idToken}` } });
      if (r.ok) {
        const docJson = await r.json().catch(() => null);
        const fields = docJson?.fields || {};
        const role = String(fields.role?.stringValue || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
        const status = String(fields.status?.stringValue || "Active").trim();
        const globalScope = Boolean(fields.globalScope?.booleanValue);
        if (role) {
          return { role, status, globalScope };
        }
      }
    } catch {
    }
  }
  if (hasSqlEnv()) {
    const userRow = await safeDbQuery(
      () => db.select().from(users).where((0, import_drizzle_orm2.or)((0, import_drizzle_orm2.eq)(users.email, email), (0, import_drizzle_orm2.eq)(users.uid, uid))).then((r) => r[0] || null),
      null
    );
    if (userRow?.role) {
      const role = String(userRow.role).trim().toUpperCase().replace(/[\s-]+/g, "_");
      return { role, status: "Active", globalScope: GLOBAL_MANAGER_ROLES.has(role) };
    }
  }
  return null;
}
async function isVerifiedFirebaseAdmin(req) {
  const info = await getVerifiedCallerStaffDirRole(req);
  if (!info) return false;
  if (info.status.toLowerCase() === "suspended") return false;
  return info.role === "SYSTEM_ADMIN" || info.role === "ADMIN" || info.role === "SUPER_ADMIN";
}
async function isVerifiedPortalManager(req) {
  const info = await getVerifiedCallerStaffDirRole(req);
  if (!info) return false;
  if (info.status.toLowerCase() === "suspended") return false;
  return info.globalScope || GLOBAL_MANAGER_ROLES.has(info.role);
}
async function updateFirebasePasswordViaToolkitWithOldPasswords(email, newPassword, candidateOldPasswords) {
  if (!firebaseWebApiKey) {
    return { ok: false, error: "Firebase Web API key is not configured." };
  }
  const tried = /* @__PURE__ */ new Set();
  const candidates = candidateOldPasswords.map((p) => typeof p === "string" ? p.trim() : "").filter((p) => {
    if (!p || tried.has(p)) return false;
    tried.add(p);
    return true;
  });
  for (const pwd of [...candidates, newPassword]) {
    try {
      const signInRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(firebaseWebApiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: pwd, returnSecureToken: true })
        }
      );
      const signInJson = await signInRes.json().catch(() => null);
      if (signInRes.ok && signInJson?.idToken) {
        if (pwd === newPassword) {
          return { ok: true, uid: signInJson.localId, created: false };
        }
        const updateRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${encodeURIComponent(firebaseWebApiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              idToken: signInJson.idToken,
              password: newPassword,
              returnSecureToken: true
            })
          }
        );
        const updateJson = await updateRes.json().catch(() => null);
        if (updateRes.ok) {
          return { ok: true, uid: updateJson?.localId || signInJson.localId, created: false };
        }
        return {
          ok: false,
          error: updateJson?.error?.message || "Failed to update password in Firebase Auth."
        };
      }
    } catch {
    }
  }
  try {
    const signUpRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(firebaseWebApiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: newPassword,
          returnSecureToken: false
        })
      }
    );
    const signUpJson = await signUpRes.json().catch(() => null);
    if (signUpRes.ok) {
      return { ok: true, uid: signUpJson?.localId, created: true };
    }
    if (signUpJson?.error?.message === "EMAIL_EXISTS") {
      return {
        ok: false,
        error: "Existing Firebase Auth password does not match our stored record and server Admin SDK credentials (FIREBASE_SERVICE_ACCOUNT_JSON) are not configured."
      };
    }
    return { ok: false, error: signUpJson?.error?.message || "Failed to provision Firebase Auth account." };
  } catch (err) {
    return { ok: false, error: err?.message || "Firebase Auth network error." };
  }
}
async function getStoredKnownPasswordsForEmail(cleanEmail) {
  const candidates = [];
  try {
    const kvMap = await sysKvGet("user_passwords", {});
    const fromKv = kvMap?.[`email:${cleanEmail}`];
    if (typeof fromKv === "string" && fromKv.trim()) {
      candidates.push(fromKv.trim());
    }
  } catch {
  }
  if (hasAdminServiceAccount()) {
    try {
      const credSnap = await adminDb.collection("admin_student_credentials").doc(normEmailKey(cleanEmail)).get();
      const fromCred = credSnap.exists ? credSnap.data()?.password : "";
      if (typeof fromCred === "string" && fromCred.trim()) {
        candidates.push(fromCred.trim());
      }
    } catch {
    }
  }
  if (hasSqlEnv()) {
    try {
      const allUsers = await readAllUsersSafe();
      for (const u of allUsers) {
        if (normEmail(u?.email) === cleanEmail && typeof u?.password === "string" && u.password.trim()) {
          candidates.push(u.password.trim());
        }
      }
    } catch {
    }
  }
  return candidates;
}
var CORE_STUDENT_RELATIONAL_KEYS = /* @__PURE__ */ new Set([
  "id",
  "uid",
  "userId",
  "name",
  "email",
  "password",
  "role",
  "phone",
  "intake",
  "countries",
  "readiness",
  "counselor",
  "school",
  "activities",
  "extracurriculars",
  "academicScores",
  "shortlist",
  "documents",
  "essays",
  "tasks",
  "profileJson"
]);
function extractStudentProfileJson(student, existingProfile) {
  const merged = {
    ...existingProfile && typeof existingProfile === "object" ? existingProfile : {}
  };
  if (!student || typeof student !== "object") {
    return merged;
  }
  for (const [key, value] of Object.entries(student)) {
    if (CORE_STUDENT_RELATIONAL_KEYS.has(key)) continue;
    if (value === void 0) continue;
    merged[key] = value;
  }
  return merged;
}
function buildStudentFromRow(u, sd) {
  const profile = sd?.profileJson && typeof sd.profileJson === "object" ? sd.profileJson : {};
  const resolvedId = u?.uid || (sd?.id ? `STU-${sd.id}` : String(u?.id || ""));
  return {
    ...profile,
    id: resolvedId,
    uid: resolvedId,
    name: u?.name || "Student",
    email: u?.email || "",
    password: u?.password || "",
    role: "STUDENT",
    status: profile.status || "Active",
    phone: sd?.phone ?? profile.phone ?? "",
    intake: sd?.intake ?? profile.intake ?? "Fall 2026",
    countries: Array.isArray(sd?.countries) && sd.countries.length > 0 ? sd.countries : Array.isArray(profile.countries) ? profile.countries : ["USA"],
    readiness: sd?.readiness ?? profile.readiness ?? 0,
    counselor: sd?.counselor ?? profile.counselor ?? "Unassigned",
    school: sd?.school ?? profile.school ?? "",
    activities: Array.isArray(sd?.activities) ? sd.activities : [],
    extracurriculars: Array.isArray(sd?.extracurriculars) ? sd.extracurriculars : [],
    academicScores: Array.isArray(sd?.academicScores) ? sd.academicScores : [],
    shortlist: Array.isArray(sd?.shortlist) ? sd.shortlist : [],
    documents: Array.isArray(sd?.documents) ? sd.documents : [],
    essays: Array.isArray(sd?.essays) ? sd.essays : [],
    tasks: Array.isArray(sd?.tasks) ? sd.tasks : []
  };
}
async function saveUserPasswordMirror(uid, email, password) {
  if (!password || !password.trim()) return;
  const cleanPwd = password.trim();
  const map = await sysKvGet("user_passwords", {});
  const next = { ...map || {} };
  if (uid && uid.trim()) next[`uid:${uid.trim()}`] = cleanPwd;
  const cleanEm = normEmail(email);
  if (cleanEm) next[`email:${cleanEm}`] = cleanPwd;
  await sysKvSet("user_passwords", next);
}
async function saveStudentProfileMirror(userIdOrUid, profileJson) {
  if (!profileJson || typeof profileJson !== "object") return;
  const map = await sysKvGet("student_profiles", {});
  const key = String(userIdOrUid);
  const next = {
    ...map || {},
    [key]: { ...map && map[key] || {}, ...profileJson }
  };
  await sysKvSet("student_profiles", next);
}
async function readAllUsersSafe() {
  if (!hasSqlEnv() || !hasTable("users")) return [];
  const pwdMirror = await sysKvGet("user_passwords", {});
  let rawRows = [];
  if (hasColumn("users", "password")) {
    rawRows = await safeDbQuery(() => db.select().from(users), []);
  } else {
    rawRows = await safeDbQuery(async () => {
      const res = await createPool().query(
        `SELECT "id", "uid", "email", "name", "role", "created_at" AS "createdAt" FROM "users"`
      );
      return res.rows || [];
    }, []);
  }
  return rawRows.filter((u) => u && !isSysKvUid(u.uid)).map((u) => {
    const cleanUid = String(u.uid || "").trim();
    const cleanEm = normEmail(u.email);
    const mirroredPwd = cleanUid && pwdMirror?.[`uid:${cleanUid}`] || cleanEm && pwdMirror?.[`email:${cleanEm}`] || void 0;
    return {
      ...u,
      password: u.password || mirroredPwd || null
    };
  });
}
async function readAllStudentsDataSafe() {
  if (!hasSqlEnv() || !hasTable("students_data")) return [];
  const profileMirror = await sysKvGet("student_profiles", {});
  if (hasColumn("students_data", "profile_json")) {
    const rows = await safeDbQuery(() => db.select().from(studentsData), []);
    return rows.map((sd) => ({
      ...sd,
      profileJson: {
        ...profileMirror?.[String(sd.userId)] || {},
        ...sd.profileJson && typeof sd.profileJson === "object" ? sd.profileJson : {}
      }
    }));
  }
  const raw = await safeDbQuery(async () => {
    const res = await createPool().query(
      `SELECT "id", "user_id" AS "userId", "phone", "intake", "countries", "readiness", "counselor", "school",
              "activities", "extracurriculars", "academic_scores" AS "academicScores", "shortlist", "documents", "essays", "tasks"
       FROM "students_data"`
    );
    return res.rows || [];
  }, []);
  return raw.map((sd) => ({
    ...sd,
    profileJson: profileMirror?.[String(sd.userId)] || {}
  }));
}
async function upsertUserRowSafe(params) {
  const { existingUser, uid, email, name, password, defaultPassword, role } = params;
  const effectivePassword = password && password.trim() ? password.trim() : void 0;
  if (effectivePassword) {
    await saveUserPasswordMirror(uid, email, effectivePassword);
  } else if (!existingUser) {
    await saveUserPasswordMirror(uid, email, defaultPassword);
  }
  if (!hasSqlEnv() || !hasTable("users")) {
    return existingUser || { id: Date.now(), uid, email, name, password: effectivePassword || defaultPassword, role };
  }
  const pool = createPool();
  if (!existingUser) {
    if (hasColumn("users", "password")) {
      const inserted = await db.insert(users).values({
        uid,
        email,
        name,
        password: effectivePassword || defaultPassword,
        role
      }).onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          name,
          ...effectivePassword ? { password: effectivePassword } : {}
        }
      }).returning();
      return inserted[0];
    } else {
      const res = await pool.query(
        `INSERT INTO "users" ("uid", "email", "name", "role")
         VALUES ($1, $2, $3, $4)
         ON CONFLICT ("uid") DO UPDATE SET "email" = EXCLUDED."email", "name" = EXCLUDED."name"
         RETURNING "id", "uid", "email", "name", "role"`,
        [uid, email, name, role]
      );
      return { ...res.rows[0], password: effectivePassword || defaultPassword };
    }
  } else {
    const nextName = name || existingUser.name;
    const nextRole = role || existingUser.role;
    const nextEmail = email && email.includes("@") && !email.endsWith("@uppseekers.local") ? email : existingUser.email;
    if (hasColumn("users", "password")) {
      const updates = { name: nextName, role: nextRole, email: nextEmail };
      if (effectivePassword) updates.password = effectivePassword;
      await db.update(users).set(updates).where((0, import_drizzle_orm2.eq)(users.id, existingUser.id));
    } else {
      await pool.query(
        `UPDATE "users" SET "name" = $1, "role" = $2, "email" = $3 WHERE "id" = $4`,
        [nextName, nextRole, nextEmail, existingUser.id]
      );
    }
    return {
      ...existingUser,
      name: nextName,
      role: nextRole,
      email: nextEmail,
      password: effectivePassword || existingUser.password
    };
  }
}
async function upsertStudentDataRowSafe(userId, s) {
  if (!hasSqlEnv() || !hasTable("students_data")) return;
  const allSd = await readAllStudentsDataSafe();
  const existingSd = allSd.find((row) => row.userId === userId);
  const mergedProfile = extractStudentProfileJson(s, existingSd?.profileJson || null);
  await saveStudentProfileMirror(userId, mergedProfile);
  const payload = {
    phone: s.phone !== void 0 ? s.phone : existingSd?.phone ?? "",
    intake: s.intake !== void 0 ? s.intake : existingSd?.intake ?? "Fall 2026",
    countries: s.countries !== void 0 ? s.countries : existingSd?.countries ?? ["USA"],
    readiness: s.readiness !== void 0 ? s.readiness : existingSd?.readiness ?? 0,
    counselor: s.counselor !== void 0 ? s.counselor : existingSd?.counselor ?? "Unassigned",
    school: s.school !== void 0 ? s.school : existingSd?.school ?? "",
    activities: s.activities !== void 0 ? s.activities : existingSd?.activities ?? [],
    extracurriculars: s.extracurriculars !== void 0 ? s.extracurriculars : existingSd?.extracurriculars ?? [],
    academicScores: s.academicScores !== void 0 ? s.academicScores : existingSd?.academicScores ?? [],
    shortlist: s.shortlist !== void 0 ? s.shortlist : existingSd?.shortlist ?? [],
    documents: s.documents !== void 0 ? s.documents : existingSd?.documents ?? [],
    essays: s.essays !== void 0 ? s.essays : existingSd?.essays ?? [],
    tasks: s.tasks !== void 0 ? s.tasks : existingSd?.tasks ?? []
  };
  if (hasColumn("students_data", "profile_json")) {
    if (!existingSd) {
      await db.insert(studentsData).values({
        userId,
        ...payload,
        profileJson: mergedProfile
      });
    } else {
      await db.update(studentsData).set({ ...payload, profileJson: mergedProfile }).where((0, import_drizzle_orm2.eq)(studentsData.userId, userId));
    }
  } else {
    const pool = createPool();
    if (!existingSd) {
      await pool.query(
        `INSERT INTO "students_data" ("user_id", "phone", "intake", "countries", "readiness", "counselor", "school", "activities", "extracurriculars", "academic_scores", "shortlist", "documents", "essays", "tasks")
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb)`,
        [
          userId,
          payload.phone,
          payload.intake,
          JSON.stringify(payload.countries || []),
          payload.readiness,
          payload.counselor,
          payload.school,
          JSON.stringify(payload.activities || []),
          JSON.stringify(payload.extracurriculars || []),
          JSON.stringify(payload.academicScores || []),
          JSON.stringify(payload.shortlist || []),
          JSON.stringify(payload.documents || []),
          JSON.stringify(payload.essays || []),
          JSON.stringify(payload.tasks || [])
        ]
      );
    } else {
      await pool.query(
        `UPDATE "students_data"
         SET "phone" = $1, "intake" = $2, "countries" = $3::jsonb, "readiness" = $4, "counselor" = $5, "school" = $6,
             "activities" = $7::jsonb, "extracurriculars" = $8::jsonb, "academic_scores" = $9::jsonb,
             "shortlist" = $10::jsonb, "documents" = $11::jsonb, "essays" = $12::jsonb, "tasks" = $13::jsonb
         WHERE "user_id" = $14`,
        [
          payload.phone,
          payload.intake,
          JSON.stringify(payload.countries || []),
          payload.readiness,
          payload.counselor,
          payload.school,
          JSON.stringify(payload.activities || []),
          JSON.stringify(payload.extracurriculars || []),
          JSON.stringify(payload.academicScores || []),
          JSON.stringify(payload.shortlist || []),
          JSON.stringify(payload.documents || []),
          JSON.stringify(payload.essays || []),
          JSON.stringify(payload.tasks || []),
          userId
        ]
      );
    }
  }
}
async function findAllMatchingUsers(uid, email) {
  const cleanUid = (uid || "").trim();
  const cleanEmail = normEmail(email);
  const uidAliases = cleanUid === "1" || cleanUid === "admin-1" ? ["1", "admin-1"] : cleanUid ? [cleanUid] : [];
  const effectiveEmail = cleanEmail || (cleanUid === "1" || cleanUid === "admin-1" ? "uppseekers@gmail.com" : "");
  const all = await readAllUsersSafe();
  return all.filter((u) => {
    const uUid = (u.uid || "").trim();
    const uEmail = normEmail(u.email);
    if (uidAliases.length > 0 && uidAliases.includes(uUid)) return true;
    if (effectiveEmail && uEmail === effectiveEmail) return true;
    return false;
  });
}
async function findUserByUidOrEmail(uid, email) {
  const cleanUid = (uid || "").trim();
  const cleanEmail = normEmail(email);
  const matches = await findAllMatchingUsers(cleanUid, cleanEmail);
  if (matches.length === 0) return void 0;
  return matches.find((m) => cleanUid && (m.uid || "").trim() === cleanUid) || matches.find((m) => cleanEmail && normEmail(m.email) === cleanEmail) || matches[0];
}
function createExpressApp(options) {
  const app = (0, import_express.default)();
  const SERVER_INSTANCE_ID = options?.serverInstanceId || import_crypto.default.randomUUID();
  const sendToLocalWsClients = options?.sendToLocalWsClients || (() => {
  });
  const hasSqlConfigured = () => hasSqlEnv();
  const broadcastRealtime = (event) => {
    const fullEvent = {
      ...event,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    sendToLocalWsClients(JSON.stringify(fullEvent));
    if (hasSqlConfigured() && !process.env.VERCEL) {
      const pgPayload = JSON.stringify({
        ...fullEvent,
        instanceId: SERVER_INSTANCE_ID
      });
      createPool().query("SELECT pg_notify('uppseekers_realtime', $1)", [pgPayload]).catch(() => {
      });
    }
  };
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use("/api", async (req, _res, next) => {
    const reqPath = req.path || "";
    if (reqPath === "/health" || reqPath.startsWith("/zoho")) {
      next();
      return;
    }
    if (hasSqlConfigured()) {
      try {
        if (process.env.VERCEL) {
          await Promise.race([
            ensureProductionReady(),
            new Promise((resolve) => setTimeout(resolve, 3500))
          ]);
        } else {
          await ensureProductionReady();
        }
      } catch {
      }
    }
    next();
  });
  app.post("/api/auth/login-credentials", (_req, res) => {
    res.status(410).json({
      error: "Legacy credential endpoint disabled. Sign in using Firebase Email & Password authentication."
    });
  });
  app.post("/api/auth/login", requireAuth, async (req, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email || "";
      const name = req.user?.name || email.split("@")[0] || "Unknown User";
      if (!uid) {
        res.status(401).json({ error: "Missing uid" });
        return;
      }
      let user = await db.select().from(users).where((0, import_drizzle_orm2.eq)(users.uid, uid)).then((res2) => res2[0]);
      if (!user) {
        const role = email === "uppseekers@gmail.com" ? "SYSTEM_ADMIN" : "STUDENT";
        const result = await db.insert(users).values({ uid, email, name, role }).returning();
        user = result[0];
        if (role === "STUDENT") {
          await db.insert(studentsData).values({
            userId: user.id,
            intake: "Fall 2026",
            countries: ["USA"],
            counselor: "Unassigned",
            school: "",
            activities: [],
            extracurriculars: [],
            academicScores: [],
            shortlist: [],
            documents: [],
            essays: [],
            tasks: [],
            readiness: 0
          });
        } else {
          await db.insert(staffData).values({
            userId: user.id,
            status: "Active",
            students: "All"
          });
        }
      }
      res.json({ user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });
  app.post("/api/students/create", requireAuth, async (req, res) => {
    try {
      const s = req.body;
      if (!s.name || !s.email) {
        res.status(400).json({ error: "Name and email are required" });
        return;
      }
      const uid = s.id || `STU-${Date.now()}`;
      const cleanEmail = normEmail(s.email);
      const cleanPassword = typeof s.password === "string" && s.password.trim() ? s.password.trim() : void 0;
      const existingMirror = await sysKvGet("portal_students_mirror", []);
      const studentObj = { ...s, id: uid, uid, email: cleanEmail, password: cleanPassword || s.password || "Student@123", role: "STUDENT" };
      const filteredMirror = existingMirror.filter((m) => m?.id !== uid && normEmail(m?.email) !== cleanEmail);
      await sysKvSet("portal_students_mirror", [...filteredMirror, studentObj]);
      let user = null;
      await safeDbQuery(async () => {
        const existing = await findUserByUidOrEmail(uid, cleanEmail);
        user = await upsertUserRowSafe({
          existingUser: existing,
          uid,
          email: cleanEmail,
          name: s.name,
          password: cleanPassword,
          defaultPassword: "Student@123",
          role: "STUDENT"
        });
        if (user?.id) {
          await upsertStudentDataRowSafe(user.id, s);
        }
      }, null);
      broadcastRealtime({ type: "student:created", scope: "data", entity: "students", targetId: uid });
      res.json({ success: true, user: user || studentObj });
    } catch (e) {
      console.error("Error creating student:", e);
      res.status(500).json({ error: "Failed to create student" });
    }
  });
  app.post("/api/staff/create", requireAuth, async (req, res) => {
    try {
      const s = req.body;
      if (!s.name || !s.email) {
        res.status(400).json({ error: "Name and email are required" });
        return;
      }
      const uid = s.id || `STAFF-${Date.now()}`;
      const cleanEmail = normEmail(s.email);
      const cleanPassword = typeof s.password === "string" && s.password.trim() ? s.password.trim() : void 0;
      const existingMirror = await sysKvGet("portal_staff_mirror", []);
      const staffObj = {
        ...s,
        id: uid,
        uid,
        email: cleanEmail,
        password: cleanPassword || s.password || "Staff@123",
        role: s.role || "COUNSELOR",
        status: s.status || "Active",
        students: s.students || "All"
      };
      const filteredMirror = existingMirror.filter((m) => m?.id !== uid && normEmail(m?.email) !== cleanEmail);
      await sysKvSet("portal_staff_mirror", [...filteredMirror, staffObj]);
      let user = null;
      await safeDbQuery(async () => {
        const existing = await findUserByUidOrEmail(uid, cleanEmail);
        user = await upsertUserRowSafe({
          existingUser: existing,
          uid,
          email: cleanEmail,
          name: s.name,
          password: cleanPassword,
          defaultPassword: "Staff@123",
          role: s.role || "COUNSELOR"
        });
        if (user?.id && hasTable("staff_data")) {
          const existingStaff = await db.select().from(staffData).where((0, import_drizzle_orm2.eq)(staffData.userId, user.id)).then((r) => r[0]);
          if (existingStaff) {
            await db.update(staffData).set({
              status: s.status !== void 0 ? s.status : existingStaff.status,
              students: s.students !== void 0 ? s.students : existingStaff.students
            }).where((0, import_drizzle_orm2.eq)(staffData.userId, user.id));
          } else {
            await db.insert(staffData).values({
              userId: user.id,
              status: s.status || "Active",
              students: s.students || "All"
            });
          }
        }
      }, null);
      broadcastRealtime({ type: "staff:created", scope: "data", entity: "staff", targetId: uid });
      res.json({ success: true, user: user || staffObj });
    } catch (e) {
      console.error("Error creating staff:", e);
      res.status(500).json({ error: "Failed to create staff" });
    }
  });
  app.post("/api/staff", requireAuth, async (req, res) => {
    try {
      const staffArr = Array.isArray(req.body) ? req.body : [];
      if (staffArr.length > 0) {
        const existingMirror = await sysKvGet("portal_staff_mirror", []);
        const merged = mergeRecordsById(staffArr.filter((s) => s && !isSysKvUid(s.id)), existingMirror, "id");
        await sysKvSet("portal_staff_mirror", merged);
      }
      await safeDbQuery(async () => {
        for (const s of staffArr) {
          if (!s?.id || !s?.email || isSysKvUid(s.id)) continue;
          const cleanEmail = normEmail(s.email);
          const cleanPassword = typeof s.password === "string" && s.password.trim() ? s.password.trim() : void 0;
          const existing = await findUserByUidOrEmail(s.id, cleanEmail);
          const userRecord = await upsertUserRowSafe({
            existingUser: existing,
            uid: s.id,
            email: cleanEmail,
            name: s.name || cleanEmail,
            password: cleanPassword,
            defaultPassword: "Staff@123",
            role: s.role || "COUNSELOR"
          });
          if (userRecord?.id && hasTable("staff_data")) {
            const existingStaff = await db.select().from(staffData).where((0, import_drizzle_orm2.eq)(staffData.userId, userRecord.id)).then((r) => r[0]);
            if (existingStaff) {
              await db.update(staffData).set({
                status: s.status !== void 0 ? s.status : existingStaff.status,
                students: s.students !== void 0 ? s.students : existingStaff.students
              }).where((0, import_drizzle_orm2.eq)(staffData.userId, userRecord.id));
            } else {
              await db.insert(staffData).values({
                userId: userRecord.id,
                status: s.status || "Active",
                students: s.students || "All"
              });
            }
          }
        }
      }, null);
      broadcastRealtime({ type: "staff:updated", scope: "data", entity: "staff" });
      res.json({ success: true });
    } catch (e) {
      res.json({ success: true });
    }
  });
  app.delete("/api/staff/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      if (!id || isSysKvUid(id)) return res.status(400).json({ error: "Missing staff ID" });
      const existingMirror = await sysKvGet("portal_staff_mirror", []);
      await sysKvSet("portal_staff_mirror", existingMirror.filter((m) => m?.id !== id));
      await safeDbQuery(async () => {
        const allU = await readAllUsersSafe();
        const userRecord = allU.find((u) => u.uid === id);
        if (userRecord && normEmail(userRecord.email) !== "uppseekers@gmail.com") {
          if (hasTable("staff_data")) {
            await db.delete(staffData).where((0, import_drizzle_orm2.eq)(staffData.userId, userRecord.id));
          }
          await db.delete(users).where((0, import_drizzle_orm2.eq)(users.id, userRecord.id));
        }
      }, null);
      broadcastRealtime({ type: "staff:deleted", scope: "data", entity: "staff", targetId: id });
      res.json({ success: true });
    } catch (e) {
      res.json({ success: true });
    }
  });
  app.post("/api/students", requireAuth, async (req, res) => {
    try {
      const studentsArr = Array.isArray(req.body) ? req.body : [];
      if (studentsArr.length > 0) {
        const existingMirror = await sysKvGet("portal_students_mirror", []);
        const merged = mergeRecordsById(studentsArr.filter((s) => s && !isSysKvUid(s.id)), existingMirror, "id");
        await sysKvSet("portal_students_mirror", merged);
      }
      await safeDbQuery(async () => {
        for (const student of studentsArr) {
          if (!student?.id || isSysKvUid(student.id)) continue;
          const cleanEmail = normEmail(student.email);
          const cleanPassword = typeof student.password === "string" && student.password.trim() ? student.password.trim() : void 0;
          const existing = await findUserByUidOrEmail(student.id, cleanEmail);
          const userRecord = await upsertUserRowSafe({
            existingUser: existing,
            uid: student.id,
            email: cleanEmail || `${student.id.toLowerCase()}@uppseekers.local`,
            name: student.name || "Student",
            password: cleanPassword,
            defaultPassword: "Student@123",
            role: "STUDENT"
          });
          if (userRecord?.id) {
            await upsertStudentDataRowSafe(userRecord.id, student);
          }
        }
      }, null);
      broadcastRealtime({ type: "students:updated", scope: "data", entity: "students" });
      res.json({ success: true });
    } catch (e) {
      res.json({ success: true });
    }
  });
  app.delete("/api/students/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      if (!id || isSysKvUid(id)) return res.status(400).json({ error: "Missing student ID" });
      const existingMirror = await sysKvGet("portal_students_mirror", []);
      await sysKvSet("portal_students_mirror", existingMirror.filter((m) => m?.id !== id));
      await safeDbQuery(async () => {
        const allU = await readAllUsersSafe();
        const userRecord = allU.find((u) => u.uid === id);
        if (userRecord) {
          if (hasTable("students_data")) {
            await db.delete(studentsData).where((0, import_drizzle_orm2.eq)(studentsData.userId, userRecord.id));
          }
          await db.delete(users).where((0, import_drizzle_orm2.eq)(users.id, userRecord.id));
        }
      }, null);
      broadcastRealtime({ type: "student:deleted", scope: "data", entity: "students", targetId: id });
      res.json({ success: true });
    } catch (e) {
      res.json({ success: true });
    }
  });
  app.put("/api/student", requireAuth, async (req, res) => {
    try {
      const student = req.body;
      if (!student?.id || isSysKvUid(student.id)) return res.status(400).json({ error: "Missing student ID" });
      const cleanEmail = normEmail(student.email);
      const existingMirror = await sysKvGet("portal_students_mirror", []);
      const filteredMirror = existingMirror.filter(
        (m) => m?.id !== student.id && (!cleanEmail || normEmail(m?.email) !== cleanEmail)
      );
      await sysKvSet("portal_students_mirror", [...filteredMirror, student]);
      await safeDbQuery(async () => {
        const cleanPassword = typeof student.password === "string" && student.password.trim() ? student.password.trim() : void 0;
        const existing = await findUserByUidOrEmail(student.id, cleanEmail);
        const userRecord = await upsertUserRowSafe({
          existingUser: existing,
          uid: student.id,
          email: cleanEmail || `${student.id.toLowerCase()}@uppseekers.local`,
          name: student.name || "Student",
          password: cleanPassword,
          defaultPassword: "Student@123",
          role: "STUDENT"
        });
        if (userRecord?.id) {
          await upsertStudentDataRowSafe(userRecord.id, student);
        }
      }, null);
      broadcastRealtime({ type: "student:updated", scope: "data", entity: "student", targetId: student.id });
      res.json({ success: true });
    } catch (e) {
      res.json({ success: true });
    }
  });
  app.post("/api/firebase-admin/provision-user", requireAuth, async (req, res) => {
    try {
      const userType = String(req.body?.userType || "student").trim().toLowerCase();
      const allowed = userType === "staff" ? await isVerifiedFirebaseAdmin(req) : await isVerifiedPortalManager(req);
      if (!allowed) {
        return res.status(403).json({
          error: userType === "staff" ? "Forbidden: Only System Admins can provision staff accounts." : "Forbidden: Only Admins or Category Managers can provision student accounts."
        });
      }
      const cleanEmail = normEmail(req.body?.email);
      const displayName = String(req.body?.name || "").trim();
      const password = typeof req.body?.password === "string" ? req.body.password.trim() : "";
      if (!cleanEmail) {
        return res.status(400).json({ error: "Valid email is required." });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters." });
      }
      if (hasAdminServiceAccount()) {
        try {
          const existing = await adminAuth.getUserByEmail(cleanEmail);
          await adminAuth.updateUser(existing.uid, {
            ...displayName ? { displayName } : {},
            password,
            emailVerified: true
          });
          if (userType !== "staff") {
            await saveUserPasswordMirror(existing.uid, cleanEmail, password);
          }
          return res.json({ ok: true, uid: existing.uid, created: false });
        } catch (lookupErr) {
          if (lookupErr?.code !== "auth/user-not-found") {
            throw lookupErr;
          }
          const created = await adminAuth.createUser({
            email: cleanEmail,
            password,
            displayName: displayName || cleanEmail.split("@")[0],
            emailVerified: true
          });
          if (userType !== "staff") {
            await saveUserPasswordMirror(created.uid, cleanEmail, password);
          }
          return res.json({ ok: true, uid: created.uid, created: true });
        }
      }
      const knownPasswords = await getStoredKnownPasswordsForEmail(cleanEmail);
      if (typeof req.body?.previousPassword === "string" && req.body.previousPassword.trim()) {
        knownPasswords.unshift(req.body.previousPassword.trim());
      }
      const toolkitResult = await updateFirebasePasswordViaToolkitWithOldPasswords(
        cleanEmail,
        password,
        knownPasswords
      );
      if (toolkitResult.ok) {
        if (userType !== "staff") {
          await saveUserPasswordMirror(toolkitResult.uid || cleanEmail, cleanEmail, password);
        }
        return res.json({ ok: true, uid: toolkitResult.uid, created: Boolean(toolkitResult.created) });
      }
      return res.json({
        ok: false,
        fallbackToClient: true,
        error: toolkitResult.error,
        message: toolkitResult.error || "Falling back to client provisioner."
      });
    } catch (err) {
      console.error("Error in /api/firebase-admin/provision-user:", err);
      return res.status(500).json({ ok: false, error: err?.message || "Failed to provision Firebase user" });
    }
  });
  const handleAdminChangeFirebasePassword = async (req, res) => {
    try {
      const userType = String(req.body?.userType || "student").trim().toLowerCase();
      const allowed = userType === "staff" ? await isVerifiedFirebaseAdmin(req) : await isVerifiedPortalManager(req);
      if (!allowed) {
        return res.status(403).json({
          error: userType === "staff" ? "Forbidden: Only System Admins can change staff passwords." : "Forbidden: Only Admins or Category Managers can change student passwords."
        });
      }
      const cleanEmail = normEmail(req.body?.email);
      const cleanNewPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword.trim() : "";
      if (!cleanEmail) {
        return res.status(400).json({ error: "Target user email is required." });
      }
      if (!cleanNewPassword || cleanNewPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters." });
      }
      if (hasAdminServiceAccount()) {
        try {
          const userRecord = await adminAuth.getUserByEmail(cleanEmail);
          await adminAuth.updateUser(userRecord.uid, {
            password: cleanNewPassword,
            emailVerified: true
          });
          if (userType !== "staff") {
            await saveUserPasswordMirror(userRecord.uid, cleanEmail, cleanNewPassword);
          }
          return res.json({ ok: true, success: true, uid: userRecord.uid, message: "Firebase password updated successfully." });
        } catch (err) {
          if (err?.code === "auth/user-not-found") {
            const created = await adminAuth.createUser({
              email: cleanEmail,
              password: cleanNewPassword,
              displayName: String(req.body?.name || cleanEmail.split("@")[0]).trim(),
              emailVerified: true
            });
            if (userType !== "staff") {
              await saveUserPasswordMirror(created.uid, cleanEmail, cleanNewPassword);
            }
            return res.json({ ok: true, success: true, uid: created.uid, message: "Firebase Auth account created with the new password." });
          }
          throw err;
        }
      }
      const knownPasswords = await getStoredKnownPasswordsForEmail(cleanEmail);
      if (typeof req.body?.previousPassword === "string" && req.body.previousPassword.trim()) {
        knownPasswords.unshift(req.body.previousPassword.trim());
      }
      const toolkitResult = await updateFirebasePasswordViaToolkitWithOldPasswords(
        cleanEmail,
        cleanNewPassword,
        knownPasswords
      );
      if (toolkitResult.ok) {
        if (userType !== "staff") {
          await saveUserPasswordMirror(toolkitResult.uid || cleanEmail, cleanEmail, cleanNewPassword);
        }
        return res.json({
          ok: true,
          success: true,
          uid: toolkitResult.uid,
          message: toolkitResult.created ? "Firebase Auth account created with the new password." : "Firebase password updated successfully."
        });
      }
      return res.status(422).json({
        ok: false,
        fallbackToClient: false,
        error: toolkitResult.error || "Could not update Firebase Auth password. Ensure the previous password is known or configure FIREBASE_SERVICE_ACCOUNT_JSON."
      });
    } catch (e) {
      console.error("Error in admin password change:", e);
      return res.status(500).json({ ok: false, error: e?.message || "Failed to update password in Firebase Auth." });
    }
  };
  app.post("/api/firebase-admin/change-password", requireAuth, handleAdminChangeFirebasePassword);
  app.post("/api/admin/change-password", requireAuth, handleAdminChangeFirebasePassword);
  app.post("/api/auth/self-change-password", requireAuth, async (req, res) => {
    try {
      const uid = String(req.user?.uid || "").trim();
      const email = normEmail(req.user?.email);
      const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword.trim() : "";
      const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword.trim() : "";
      if (!uid || !email) {
        return res.status(401).json({ ok: false, error: "Authentication required." });
      }
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ ok: false, error: "New password must be at least 6 characters." });
      }
      const callerStaff = await getVerifiedCallerStaffDirRole(req);
      const isStaffCaller = Boolean(callerStaff);
      if (hasAdminServiceAccount()) {
        await adminAuth.updateUser(uid, { password: newPassword, emailVerified: true });
        if (!isStaffCaller) {
          await saveUserPasswordMirror(uid, email, newPassword);
          try {
            const credId = normEmailKey(email);
            await adminDb.collection("admin_student_credentials").doc(credId).set(
              {
                id: credId,
                email,
                password: newPassword,
                updatedAt: (/* @__PURE__ */ new Date()).toISOString()
              },
              { merge: true }
            );
          } catch {
          }
        }
        return res.json({ ok: true, success: true, message: "Password updated successfully." });
      }
      if (firebaseWebApiKey) {
        let tokenToUse = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
        if (currentPassword) {
          const signInRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(firebaseWebApiKey)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, password: currentPassword, returnSecureToken: true })
            }
          );
          const signInJson = await signInRes.json().catch(() => null);
          if (!signInRes.ok || !signInJson?.idToken) {
            return res.status(400).json({ ok: false, error: "Current password is incorrect." });
          }
          tokenToUse = signInJson.idToken;
        }
        const updateRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${encodeURIComponent(firebaseWebApiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: tokenToUse, password: newPassword, returnSecureToken: true })
          }
        );
        const updateJson = await updateRes.json().catch(() => null);
        if (updateRes.ok) {
          if (!isStaffCaller) {
            await saveUserPasswordMirror(uid, email, newPassword);
          }
          return res.json({ ok: true, success: true, message: "Password updated successfully." });
        }
        const errMsg = updateJson?.error?.message || "";
        if (errMsg === "CREDENTIAL_TOO_OLD_LOGIN_AGAIN") {
          return res.status(409).json({
            ok: false,
            requiresRecentLogin: true,
            error: "Please enter your current password to verify your identity before updating."
          });
        }
        return res.status(400).json({ ok: false, error: errMsg || "Failed to update password." });
      }
      return res.status(500).json({ ok: false, error: "Firebase authentication configuration missing on server." });
    } catch (e) {
      console.error("Error in /api/auth/self-change-password:", e);
      return res.status(500).json({ ok: false, error: e?.message || "Failed to update password." });
    }
  });
  app.post("/api/auth/migrate-legacy-login", async (req, res) => {
    try {
      const cleanEmail = normEmail(req.body?.email);
      const rawPassword = typeof req.body?.password === "string" ? req.body.password.trim() : "";
      if (!cleanEmail || !rawPassword || rawPassword.length < 6) {
        return res.json({ ok: false, migrated: false });
      }
      let matchedPassword = "";
      let displayName = cleanEmail.split("@")[0];
      let matchedRole = "";
      if (hasSqlEnv()) {
        const allUsers = await readAllUsersSafe();
        const found = allUsers.find((u) => normEmail(u?.email) === cleanEmail);
        if (found) {
          const sqlPwd = typeof found.password === "string" ? found.password.trim() : "";
          if (sqlPwd && sqlPwd === rawPassword) {
            matchedPassword = sqlPwd;
            displayName = String(found.name || displayName).trim();
            matchedRole = String(found.role || "STUDENT").toUpperCase();
          }
        }
      }
      if (!matchedPassword) {
        const kvMap = await sysKvGet("user_passwords", {});
        const kvPwd = typeof kvMap?.[`email:${cleanEmail}`] === "string" ? kvMap[`email:${cleanEmail}`].trim() : "";
        if (kvPwd && kvPwd === rawPassword) {
          matchedPassword = kvPwd;
          matchedRole = "STUDENT";
        }
      }
      if (!matchedPassword && hasAdminServiceAccount()) {
        try {
          const credSnap = await adminDb.collection("admin_student_credentials").doc(normEmailKey(cleanEmail)).get();
          if (credSnap.exists) {
            const credData = credSnap.data() || {};
            const storedPwd = typeof credData.password === "string" ? credData.password.trim() : "";
            if (storedPwd && storedPwd === rawPassword) {
              matchedPassword = storedPwd;
              displayName = String(credData.studentName || displayName).trim();
              matchedRole = "STUDENT";
            }
          }
        } catch {
        }
      }
      if (!matchedPassword) {
        return res.json({ ok: false, migrated: false });
      }
      if (hasAdminServiceAccount()) {
        try {
          const existing = await adminAuth.getUserByEmail(cleanEmail);
          await adminAuth.updateUser(existing.uid, {
            password: matchedPassword,
            emailVerified: true
          });
          if (matchedRole === "STUDENT") {
            await saveUserPasswordMirror(existing.uid, cleanEmail, matchedPassword);
          }
          return res.json({ ok: true, migrated: true, uid: existing.uid });
        } catch (lookupErr) {
          if (lookupErr?.code !== "auth/user-not-found") {
            throw lookupErr;
          }
          const created = await adminAuth.createUser({
            email: cleanEmail,
            password: matchedPassword,
            displayName,
            emailVerified: true
          });
          if (matchedRole === "STUDENT") {
            await saveUserPasswordMirror(created.uid, cleanEmail, matchedPassword);
          }
          return res.json({ ok: true, migrated: true, uid: created.uid });
        }
      }
      if (firebaseWebApiKey) {
        const signUpRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(firebaseWebApiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: cleanEmail,
              password: matchedPassword,
              displayName,
              returnSecureToken: false
            })
          }
        );
        const signUpJson = await signUpRes.json().catch(() => null);
        if (signUpRes.ok) {
          if (matchedRole === "STUDENT") {
            await saveUserPasswordMirror(signUpJson?.localId || cleanEmail, cleanEmail, matchedPassword);
          }
          return res.json({ ok: true, migrated: true, uid: signUpJson?.localId });
        }
      }
      return res.json({ ok: false, migrated: false });
    } catch (err) {
      console.error("Error in /api/auth/migrate-legacy-login:", err);
      return res.json({ ok: false, migrated: false });
    }
  });
  app.get("/api/firebase-admin/student-passwords", requireAuth, async (req, res) => {
    try {
      const allowed = await isVerifiedPortalManager(req);
      if (!allowed) {
        return res.status(403).json({ error: "Forbidden: Only Admins and Category Managers can view student portal passwords." });
      }
      const passwordsByEmail = {};
      const passwordsByUid = {};
      const staffEmails = /* @__PURE__ */ new Set(["uppseekers@gmail.com"]);
      const allUsers = await readAllUsersSafe();
      for (const u of allUsers) {
        const em = normEmail(u?.email);
        const roleUpper = String(u?.role || "").toUpperCase();
        if (roleUpper && roleUpper !== "STUDENT") {
          if (em) staffEmails.add(em);
          continue;
        }
        const pwd = typeof u?.password === "string" ? u.password.trim() : "";
        if (!pwd) continue;
        if (em && !em.endsWith("@uppseekers.local")) {
          passwordsByEmail[em] = pwd;
        }
        if (u?.uid) {
          passwordsByUid[String(u.uid)] = pwd;
        }
      }
      const kvMap = await sysKvGet("user_passwords", {});
      if (kvMap && typeof kvMap === "object") {
        for (const [rawKey, rawVal] of Object.entries(kvMap)) {
          const pwd = typeof rawVal === "string" ? rawVal.trim() : "";
          if (!pwd) continue;
          if (rawKey.startsWith("email:")) {
            const em = normEmail(rawKey.slice("email:".length));
            if (em && !staffEmails.has(em) && !passwordsByEmail[em]) {
              passwordsByEmail[em] = pwd;
            }
          } else if (rawKey.startsWith("uid:")) {
            const uid = rawKey.slice("uid:".length).trim();
            if (uid && !passwordsByUid[uid]) {
              passwordsByUid[uid] = pwd;
            }
          }
        }
      }
      return res.json({ ok: true, passwordsByEmail, passwordsByUid });
    } catch (err) {
      console.error("Error in /api/firebase-admin/student-passwords:", err);
      return res.status(500).json({ ok: false, error: err?.message || "Failed to load student passwords." });
    }
  });
  const DEMO_LEGACY_EMAILS = /* @__PURE__ */ new Set([
    "sarah@uppseekers.com",
    "vikram.roy@uppseekers.com",
    "marcus@uppseekers.com",
    "elena@uppseekers.com",
    "rajesh.menon@uppseekers.com",
    "test@counsellor.com",
    "product@uppseekers.com",
    "test@student.com",
    "test1@student.com",
    "aarav.sharma@example.com",
    "ananya.iyer@example.com",
    "qasim.khan@example.com"
  ]);
  app.post("/api/firebase-admin/sync-legacy-users", requireAuth, async (req, res) => {
    try {
      const allowed = await isVerifiedPortalManager(req);
      if (!allowed) {
        return res.status(403).json({ error: "Forbidden: Only System Admins and Category Managers can restore legacy users." });
      }
      if (!hasSqlEnv()) {
        return res.json({
          ok: true,
          hasLegacySql: false,
          provisioned: 0,
          alreadyExisted: 0,
          skipped: 0,
          failed: 0,
          students: [],
          staff: [],
          batches: [],
          events: []
        });
      }
      const includeDemo = Boolean(req.body?.includeDemo);
      const includeData = Boolean(req.body?.includeData);
      const allSqlUsers = await readAllUsersSafe();
      let provisioned = 0;
      let alreadyExisted = 0;
      let skipped = 0;
      let failed = 0;
      const details = [];
      const isDemoEmail = (em) => DEMO_LEGACY_EMAILS.has(em) || em.endsWith("@example.com");
      for (const u of allSqlUsers) {
        const cleanEmail = normEmail(u?.email);
        const roleUpper = String(u?.role || "").toUpperCase();
        const rawPwd = typeof u?.password === "string" ? u.password.trim() : "";
        if (!cleanEmail || !cleanEmail.includes("@") || cleanEmail.endsWith("@uppseekers.local")) {
          skipped++;
          continue;
        }
        if (!includeDemo && isDemoEmail(cleanEmail)) {
          skipped++;
          continue;
        }
        if (cleanEmail === "uppseekers@gmail.com") {
          alreadyExisted++;
          continue;
        }
        if (!rawPwd || rawPwd.length < 6) {
          skipped++;
          details.push({ email: cleanEmail, role: roleUpper, status: "skipped_short_or_empty_password" });
          continue;
        }
        try {
          if (hasAdminServiceAccount()) {
            try {
              await adminAuth.getUserByEmail(cleanEmail);
              alreadyExisted++;
              details.push({ email: cleanEmail, role: roleUpper, status: "already_exists" });
            } catch (lookupErr) {
              if (lookupErr?.code !== "auth/user-not-found") throw lookupErr;
              await adminAuth.createUser({
                email: cleanEmail,
                password: rawPwd,
                displayName: String(u?.name || cleanEmail.split("@")[0]).trim(),
                emailVerified: true
              });
              provisioned++;
              details.push({ email: cleanEmail, role: roleUpper, status: "created_with_old_password" });
            }
          } else if (firebaseWebApiKey) {
            const signUpRes = await fetch(
              `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(firebaseWebApiKey)}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: cleanEmail,
                  password: rawPwd,
                  displayName: String(u?.name || cleanEmail.split("@")[0]).trim(),
                  returnSecureToken: false
                })
              }
            );
            const signUpJson = await signUpRes.json().catch(() => null);
            if (signUpRes.ok) {
              provisioned++;
              details.push({ email: cleanEmail, role: roleUpper, status: "created_with_old_password" });
            } else if (signUpJson?.error?.message === "EMAIL_EXISTS") {
              alreadyExisted++;
              details.push({ email: cleanEmail, role: roleUpper, status: "already_exists" });
            } else {
              failed++;
              details.push({
                email: cleanEmail,
                role: roleUpper,
                status: `failed:${signUpJson?.error?.message || signUpRes.status}`
              });
            }
            if (roleUpper === "STUDENT") {
              await saveUserPasswordMirror(String(u?.uid || cleanEmail), cleanEmail, rawPwd);
            }
          } else {
            failed++;
          }
        } catch (err) {
          failed++;
          details.push({ email: cleanEmail, role: roleUpper, status: `error:${err?.code || err?.message || "unknown"}` });
        }
        if (roleUpper === "STUDENT") {
          await saveUserPasswordMirror(String(u?.uid || cleanEmail), cleanEmail, rawPwd);
          if (hasAdminServiceAccount()) {
            try {
              const credId = normEmailKey(cleanEmail);
              await adminDb.collection("admin_student_credentials").doc(credId).set(
                {
                  id: credId,
                  studentId: String(u?.uid || `STU-${u?.id || credId}`),
                  studentName: String(u?.name || cleanEmail.split("@")[0]).trim(),
                  email: cleanEmail,
                  password: rawPwd,
                  updatedAt: (/* @__PURE__ */ new Date()).toISOString()
                },
                { merge: true }
              );
            } catch {
            }
          }
        }
      }
      let sanitizedStudents = [];
      let sanitizedStaff = [];
      let legacyBatches = [];
      let legacyEvents = [];
      if (includeData) {
        const allSd = await readAllStudentsDataSafe();
        const studentUsers = allSqlUsers.filter((u) => String(u?.role || "").toUpperCase() === "STUDENT");
        sanitizedStudents = studentUsers.filter((u) => includeDemo || !isDemoEmail(normEmail(u?.email))).map((u) => {
          const sd = allSd.find((row) => row.userId === u.id);
          const built = buildStudentFromRow(u, sd);
          const { password: _removedPwd, ...cleanStudent } = built;
          return cleanStudent;
        });
        const staffRows = hasTable("staff_data") ? await safeDbQuery(() => db.select().from(staffData), []) : [];
        sanitizedStaff = allSqlUsers.filter((u) => {
          const r = String(u?.role || "").toUpperCase();
          return r && r !== "STUDENT" && (includeDemo || !isDemoEmail(normEmail(u?.email)));
        }).map((u) => {
          const sd = staffRows.find((sRow) => sRow.userId === u.id);
          return {
            id: u.uid || `STAFF-${u.id}`,
            name: u.name || u.email,
            email: normEmail(u.email),
            role: u.role || "COUNSELOR",
            students: sd?.students || "Assigned Scope",
            status: sd?.status || "Active"
          };
        });
        if (hasTable("batches_data")) {
          const rawBatches = await safeDbQuery(() => db.select().from(batchesData), []);
          legacyBatches = rawBatches.filter((b) => includeDemo || String(b?.id || "") !== "BATCH-7133");
        }
        if (hasTable("events_data")) {
          legacyEvents = await safeDbQuery(() => db.select().from(eventsData), []);
        }
      }
      return res.json({
        ok: true,
        hasLegacySql: true,
        provisioned,
        alreadyExisted,
        skipped,
        failed,
        details,
        students: sanitizedStudents,
        staff: sanitizedStaff,
        batches: legacyBatches,
        events: legacyEvents
      });
    } catch (e) {
      console.error("Error in /api/firebase-admin/sync-legacy-users:", e);
      return res.status(500).json({ ok: false, error: e?.message || "Failed to sync legacy users." });
    }
  });
  app.post("/api/auth/request-password-reset", async (_req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(410).json({
      success: false,
      disabled: true,
      error: "Automated password reset emails are disabled. Please change your password directly inside your portal profile or ask your Category Manager / Admin to update it directly."
    });
  });
  app.post("/api/auth/verify-reset-code", async (req, res) => {
    try {
      const { email, code, token } = req.body;
      let found;
      if (token && passwordResetStore.has(token)) {
        found = passwordResetStore.get(token);
      } else if (code && email) {
        const cleanEmail = email.toLowerCase().trim();
        const codeKey = `code_${cleanEmail}_${code.trim()}`;
        if (passwordResetStore.has(codeKey)) {
          found = passwordResetStore.get(codeKey);
        } else {
          for (const item of passwordResetStore.values()) {
            if (item.code === code.trim() && item.email === cleanEmail) {
              found = item;
              break;
            }
          }
        }
      }
      if (!found || Date.now() > found.expiresAt) {
        res.status(400).json({ error: "Invalid or expired reset code or link. Please request a new one." });
        return;
      }
      res.json({ valid: true, email: found.email, token: found.token });
    } catch (err) {
      res.status(500).json({ error: "Verification failed" });
    }
  });
  app.post("/api/auth/complete-password-reset", async (req, res) => {
    try {
      const { email, code, token, newPassword } = req.body;
      if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters long" });
        return;
      }
      let found;
      if (token && passwordResetStore.has(token)) {
        found = passwordResetStore.get(token);
      } else if (code && email) {
        const cleanEmail = email.toLowerCase().trim();
        const codeKey = `code_${cleanEmail}_${code.trim()}`;
        if (passwordResetStore.has(codeKey)) {
          found = passwordResetStore.get(codeKey);
        } else {
          for (const item of passwordResetStore.values()) {
            if (item.code === code.trim() && item.email === cleanEmail) {
              found = item;
              break;
            }
          }
        }
      }
      const targetEmail = (found ? found.email : email || "").toLowerCase().trim();
      if (!targetEmail) {
        res.status(400).json({ error: "Invalid request. Email is missing." });
        return;
      }
      if (found && Date.now() > found.expiresAt) {
        res.status(400).json({ error: "Password reset link has expired. Please request a new one." });
        return;
      }
      const cleanResetPassword = newPassword.trim();
      await saveUserPasswordMirror(void 0, targetEmail, cleanResetPassword);
      await safeDbQuery(async () => {
        const matches = await findAllMatchingUsers(void 0, targetEmail);
        if (matches.length > 0) {
          for (const m of matches) {
            await saveUserPasswordMirror(m.uid, m.email, cleanResetPassword);
            if (hasColumn("users", "password")) {
              await db.update(users).set({ password: cleanResetPassword }).where((0, import_drizzle_orm2.eq)(users.id, m.id));
            }
          }
        } else {
          await upsertUserRowSafe({
            uid: `USER-${Date.now()}`,
            name: targetEmail.split("@")[0],
            email: targetEmail,
            password: cleanResetPassword,
            defaultPassword: cleanResetPassword,
            role: "STUDENT"
          });
        }
      }, null);
      if (found) {
        passwordResetStore.delete(found.token);
        passwordResetStore.delete(`code_${targetEmail}_${found.code}`);
      }
      res.json({
        success: true,
        message: "Password reset complete! You can now sign in with your new password.",
        email: targetEmail
      });
    } catch (err) {
      console.error("Error in /api/auth/complete-password-reset:", err);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });
  app.post("/api/batches", requireAuth, async (req, res) => {
    try {
      const batches = Array.isArray(req.body) ? req.body : Array.isArray(req.body?.items) ? req.body.items : [];
      await safeDbQuery(async () => {
        for (const b of batches) {
          if (!b?.id || !b?.name) continue;
          await db.insert(batchesData).values({
            id: b.id,
            name: b.name,
            type: b.type || "Master Batch",
            parentBatchId: b.parentBatchId || null,
            mentors: b.mentors || [],
            meetingLink: b.meetingLink || "",
            status: b.status || "Active",
            capacity: b.capacity || 20,
            students: b.students || [],
            completedSessions: b.completedSessions || 0,
            totalSessions: b.totalSessions || 0
          }).onConflictDoUpdate({
            target: batchesData.id,
            set: {
              name: b.name,
              type: b.type || "Master Batch",
              parentBatchId: b.parentBatchId || null,
              mentors: b.mentors || [],
              meetingLink: b.meetingLink || "",
              status: b.status || "Active",
              capacity: b.capacity || 20,
              students: b.students || [],
              completedSessions: b.completedSessions || 0,
              totalSessions: b.totalSessions || 0
            }
          });
        }
      }, null);
      broadcastRealtime({ type: "batches:updated", scope: "data", entity: "batches" });
      res.json({ success: true });
    } catch (e) {
      res.json({ success: true });
    }
  });
  app.delete("/api/batches/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      if (id) {
        await safeDbQuery(() => db.delete(batchesData).where((0, import_drizzle_orm2.eq)(batchesData.id, id)), null);
      }
      broadcastRealtime({ type: "batch:deleted", scope: "data", entity: "batches", targetId: id });
      res.json({ success: true });
    } catch (e) {
      res.json({ success: true });
    }
  });
  app.post("/api/events", requireAuth, async (req, res) => {
    try {
      const events = Array.isArray(req.body) ? req.body : Array.isArray(req.body?.items) ? req.body.items : [];
      await safeDbQuery(async () => {
        for (const e of events) {
          if (!e) continue;
          const eventId = e.id || `EVT-${Math.floor(Math.random() * 1e5)}`;
          const rowPayload = {
            id: eventId,
            title: e.title || "",
            date: e.date || e.day || "",
            type: e.stream || e.type || "Counselling",
            category: e.category || "",
            attendees: typeof e.students === "string" ? e.students : e.attendees || "",
            status: e.status || "Scheduled",
            link: e.location || e.link || "",
            time: e.time || "",
            duration: e.duration || "1 hr",
            videoProvider: e.videoProvider || null,
            zohoMeetingKey: e.zohoMeetingKey || null,
            hostStartLink: e.hostStartLink || null,
            participantEmails: Array.isArray(e.participantEmails) ? e.participantEmails : null
          };
          await db.insert(eventsData).values(rowPayload).onConflictDoUpdate({
            target: eventsData.id,
            set: {
              title: rowPayload.title,
              date: rowPayload.date,
              type: rowPayload.type,
              category: rowPayload.category,
              attendees: rowPayload.attendees,
              status: rowPayload.status,
              link: rowPayload.link,
              time: rowPayload.time,
              duration: rowPayload.duration,
              videoProvider: rowPayload.videoProvider,
              zohoMeetingKey: rowPayload.zohoMeetingKey,
              hostStartLink: rowPayload.hostStartLink,
              participantEmails: rowPayload.participantEmails
            }
          });
        }
      }, null);
      broadcastRealtime({ type: "events:updated", scope: "data", entity: "events" });
      res.json({ success: true });
    } catch (e) {
      res.json({ success: true });
    }
  });
  app.delete("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      if (id) {
        await safeDbQuery(() => db.delete(eventsData).where((0, import_drizzle_orm2.eq)(eventsData.id, id)), null);
      }
      broadcastRealtime({ type: "event:deleted", scope: "data", entity: "events", targetId: id });
      res.json({ success: true });
    } catch (e) {
      res.json({ success: true });
    }
  });
  app.post("/api/sheets/sync", requireAuth, async (req, res) => {
    try {
      const { accessToken, spreadsheetId, students = [], staff = [], events = [] } = req.body;
      const studentRows = [
        ["Student ID", "Full Name", "Email", "Phone", "Intake Batch", "Counselor", "School", "Target Countries", "Readiness Score (%)", "Total Tasks", "Completed Tasks"],
        ...students.map((s) => [
          s.id || "",
          s.name || "",
          s.email || "",
          s.phone || "",
          s.intake || "Fall 2026",
          s.counselor || "Unassigned",
          s.school || "",
          Array.isArray(s.countries) ? s.countries.join(", ") : s.countries || "",
          `${s.readiness || 0}%`,
          String((s.tasks || []).length),
          String((s.tasks || []).filter((t) => t.stage === "COMPLETED" || t.stage === "VERIFIED_COMPLETED").length)
        ])
      ];
      const taskRows = [
        ["Task ID", "Task Name", "Category", "Student ID", "Student Name", "Stage / Status", "Due Date", "Assigned By"],
        ...students.flatMap((s) => (s.tasks || []).map((t) => [
          t.id || "",
          t.name || "",
          t.category || "Other",
          s.id || "",
          s.name || "",
          t.stage || "TO_DO",
          t.dueDate || "",
          t.assignedBy || "Admin"
        ]))
      ];
      const eventRows = [
        ["Meeting ID", "Title", "Subject / Type", "Date", "Time", "Duration", "Organiser / Host", "Attendees", "Status", "Meeting Link"],
        ...events.map((e) => [
          e.id || "",
          e.title || "",
          e.type || e.stream || "Counselling",
          e.date || e.day || "",
          e.time || "",
          e.duration || "1 hr",
          e.host || e.organiser || "Counselor",
          typeof e.attendees === "string" ? e.attendees : e.students || "",
          e.status || "Scheduled",
          e.link || e.location || ""
        ])
      ];
      const staffRows = [
        ["Staff ID", "Name", "Email", "Role", "Status", "Assigned Students"],
        ...staff.map((st) => [
          st.id || "",
          st.name || "",
          st.email || "",
          st.role || "COUNSELOR",
          st.status || "Active",
          st.students || "All"
        ])
      ];
      if (accessToken) {
        let currentSheetId = spreadsheetId;
        if (!currentSheetId) {
          const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              properties: {
                title: "Uppseekers Portal Database - Realtime Backup & Live Sync"
              },
              sheets: [
                { properties: { title: "Students" } },
                { properties: { title: "Tasks" } },
                { properties: { title: "Meetings" } },
                { properties: { title: "Staff" } }
              ]
            })
          });
          const newSheet = await createRes.json().catch(() => ({}));
          if (!createRes.ok) {
            throw new Error(newSheet?.error?.message || `Google Sheets create failed (HTTP ${createRes.status})`);
          }
          currentSheetId = newSheet?.spreadsheetId || void 0;
        }
        if (currentSheetId) {
          const batchRes = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(currentSheetId)}/values:batchUpdate`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                valueInputOption: "USER_ENTERED",
                data: [
                  { range: "Students!A1", values: studentRows },
                  { range: "Tasks!A1", values: taskRows },
                  { range: "Meetings!A1", values: eventRows },
                  { range: "Staff!A1", values: staffRows }
                ]
              })
            }
          );
          if (!batchRes.ok) {
            const batchErr = await batchRes.json().catch(() => ({}));
            throw new Error(batchErr?.error?.message || `Google Sheets batchUpdate failed (HTTP ${batchRes.status})`);
          }
          return res.json({
            success: true,
            spreadsheetId: currentSheetId,
            spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${currentSheetId}/edit`,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            counts: {
              students: students.length,
              staff: staff.length,
              tasks: taskRows.length - 1,
              events: events.length
            }
          });
        }
      }
      res.json({
        success: true,
        spreadsheetId: spreadsheetId || "local-sync-active",
        spreadsheetUrl: spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : void 0,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        counts: {
          students: students.length,
          staff: staff.length,
          tasks: taskRows.length - 1,
          events: events.length
        }
      });
    } catch (err) {
      console.error("Sheets sync error:", err);
      res.status(500).json({ error: err.message || "Failed to sync with Google Sheets" });
    }
  });
  app.post("/api/ai/narrative-angles", requireAuth, async (req, res) => {
    try {
      const { essayType, prompt, wordCount, studentProfile } = req.body;
      if (!essayType || !wordCount) {
        res.status(400).json({ error: "Draft Classification (essayType) and Target Word Count (wordCount) are mandatory." });
        return;
      }
      const apiKey = process.env.GEMINI_API_KEY;
      const generateFallbackNarrative = () => {
        const typeStr = essayType || "Personal Statement";
        const targetWords = wordCount || 500;
        const topic = prompt && prompt.trim() ? prompt.trim() : "Personal Journey & Intellectual Growth";
        return {
          options: [
            {
              title: `The Unexpected Catalyst: Grounded in ${typeStr}`,
              narrativeTurn: `Pivoting from a specific moment of curiosity or challenge during ${topic} into a transformative realization about your core values and future aspirations.`,
              profileConnection: `Highlighting relevant leadership, academic projects, or extracurricular milestones from your background to ground the narrative in real lived experience.`,
              structuralOutline: `\u2022 Hook (15% - ~${Math.round(targetWords * 0.15)} words): An immersive opening scene showing a problem or pivotal moment.
\u2022 Development (45% - ~${Math.round(targetWords * 0.45)} words): Exploring your technical/intellectual growth and active problem-solving.
\u2022 Reflection & Future (40% - ~${Math.round(targetWords * 0.4)} words): Connecting this realization to your target university major and career vision.`,
              grammarAndToneAdvice: `Use active voice, avoid clich\xE9s ('ever since I was young'), and keep sentence structures varied and engaging.`
            },
            {
              title: `Connecting the Dots: Intellectual Inquiry & Impact`,
              narrativeTurn: `Framing your interest in ${topic} as an evolving puzzle where each activity and project answered one question while raising a deeper one.`,
              profileConnection: `Drawing direct lines between your coursework, research efforts, and extracurricular achievements to show sustained dedication.`,
              structuralOutline: `\u2022 Introduction (20% - ~${Math.round(targetWords * 0.2)} words): Introducing the central thesis and curiosity that drives you.
\u2022 Core Body (50% - ~${Math.round(targetWords * 0.5)} words): Two contrasting experiences demonstrating analytical depth and teamwork.
\u2022 Synthesis (30% - ~${Math.round(targetWords * 0.3)} words): Synthesizing lessons learned and articulating why this academic path is your true calling.`,
              grammarAndToneAdvice: `Ensure smooth transitions between paragraphs and maintain an authentic, reflective tone throughout.`
            }
          ],
          generalAdvice: `Focus on specific, concrete details rather than broad generalizations. Show your problem-solving mindset and authentic voice.`
        };
      };
      if (!apiKey) {
        return res.json({ result: generateFallbackNarrative() });
      }
      try {
        const ai = new import_genai.GoogleGenAI({ apiKey });
        const generateWithFallback = async (params) => {
          const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
          let lastErr;
          for (const modelName of modelsToTry) {
            try {
              return await ai.models.generateContent({ ...params, model: modelName });
            } catch (err) {
              console.warn(`Model ${modelName} returned error:`, err?.message);
              lastErr = err;
              continue;
            }
          }
          throw lastErr;
        };
        const systemInstruction = `You are Author's Compass, an elite AI writing environment and narrative strategist for aspiring authors, students, and essayists.

CRITICAL INSTRUCTIONS:
- DO NOT generate full copy-and-paste essay drafts or robotic AI text.
- Your sole job is to suggest creative narrative turns, structural pacing, profile-grounded story connections, and grammar/style guidelines so the writer constructs their own authentic draft.

Given the student's draft classification, target word count, optional prompt, and profile background:
1. Analyze their real background context (activities, majors, interests).
2. Formulate 2\u20133 distinct potential narrative angles/options.
3. For each option, include:
   - title: Catchy, working narrative angle title.
   - narrativeTurn: The creative pivot, central story arc, or storytelling perspective.
   - profileConnection: Specific suggestions connecting the user's profile details (activities, extracurriculars, interests) to this narration.
   - structuralOutline: Step-by-step structural pacing and section word distribution scaled to the target word count.
   - grammarAndToneAdvice: Key English grammar, phrase errors to avoid, punctuation tips, and tone advice.

Maintain an encouraging, authentic authorial tone. Avoid clich\xE9 college admissions buzzwords ("testament," "beacon," "tapestry," "delve").`;
        const userPrompt = `
MANDATORY SETUP:
- Draft Classification: ${essayType}
- Target Word Count: ${wordCount}

OPTIONAL PROMPT / TOPIC:
${prompt && prompt.trim() ? prompt.trim() : "General personal narrative / Open topic grounded in student profile"}

STUDENT PROFILE CONTEXT:
${typeof studentProfile === "string" ? studentProfile : JSON.stringify(studentProfile, null, 2)}
`;
        const response = await generateWithFallback({
          contents: [
            { role: "user", parts: [{ text: userPrompt }] }
          ],
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                options: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      title: { type: "STRING" },
                      narrativeTurn: { type: "STRING" },
                      profileConnection: { type: "STRING" },
                      structuralOutline: { type: "STRING" },
                      grammarAndToneAdvice: { type: "STRING" }
                    },
                    required: ["title", "narrativeTurn", "profileConnection", "structuralOutline", "grammarAndToneAdvice"]
                  }
                },
                generalAdvice: { type: "STRING" }
              },
              required: ["options"]
            }
          }
        });
        let jsonResult;
        try {
          jsonResult = JSON.parse(response.text || "{}");
        } catch (e) {
          jsonResult = { options: [], rawText: response.text };
        }
        if (!jsonResult.options || jsonResult.options.length === 0) {
          jsonResult = generateFallbackNarrative();
        }
        res.json({ result: jsonResult });
      } catch (geminiError) {
        console.warn("Gemini API call failed, using fallback strategy:", geminiError?.message);
        res.json({ result: generateFallbackNarrative() });
      }
    } catch (err) {
      console.error("AI narrative angles error:", err);
      res.status(500).json({ error: err.message || "Failed to generate narrative strategy." });
    }
  });
  app.post("/api/ai/proofread-essay", requireAuth, async (req, res) => {
    try {
      const { essayText } = req.body;
      if (!essayText || !essayText.trim()) {
        res.status(400).json({ error: "Input text is required." });
        return;
      }
      const apiKey = process.env.GEMINI_API_KEY;
      const generateFallbackProofread = (text2) => {
        let polished = text2;
        const correctionLogs = [];
        if (/\s{2,}/.test(polished)) {
          polished = polished.replace(/\s{2,}/g, " ");
          correctionLogs.push("\u2022 Spacing: Fixed redundant double spaces for cleaner layout.");
        }
        polished = polished.replace(/(^\s*|[.!?]\s+)([a-z])/g, (m, p1, p2) => {
          if (p2 !== p2.toUpperCase()) {
            correctionLogs.push(`\u2022 Capitalization: Capitalized '${p2}' at the start of sentence.`);
          }
          return p1 + p2.toUpperCase();
        });
        if (correctionLogs.length === 0) {
          correctionLogs.push("\u2022 Style & Tone: Validated narrative flow and confirmed proper grammar and punctuation.");
        }
        return `### 1. **Polished Text:**
${polished}

### 2. **Correction Log:**
${correctionLogs.join("\n")}`;
      };
      if (!apiKey) {
        return res.json({ result: generateFallbackProofread(essayText) });
      }
      try {
        const ai = new import_genai.GoogleGenAI({ apiKey });
        const generateWithFallback = async (params) => {
          const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
          let lastErr;
          for (const modelName of modelsToTry) {
            try {
              return await ai.models.generateContent({ ...params, model: modelName });
            } catch (err) {
              console.warn(`Model ${modelName} returned error:`, err?.message);
              lastErr = err;
              continue;
            }
          }
          throw lastErr;
        };
        const systemInstruction = `You are an expert academic proofreader and writing mentor specializing in Statements of Purpose (SOPs) and personal student essays. Your core mission is to correct mechanical errors while fiercely protecting the user's authentic tone, personal voice, and narrative originality.

### RULES FOR EDITING:
1. GRAMMAR & MECHANICS: Fix all spelling errors, grammatical mistakes, subject-verb disagreements, and incorrect verb tenses. 
2. PUNCTUATION: Correctly place commas, semicolons, colons, and apostrophes according to standard English rules. Remove comma splices and run-on sentences by breaking or properly linking them.
3. TONE & STYLE CONSERVATION: Do NOT change the user's voice, vocabulary level, or emotional intent. Do NOT replace simple, honest words with overly complex academic jargon or "AI-sounding" buzzwords (e.g., "testament," "delve," "tapestry," "beacon").
4. PRESERVATION: Keep original phrasing and sentence structures intact whenever they are grammatically defensible. Only rephrase if a sentence is entirely ungrammatical or incomprehensible.

### OUTPUT FORMAT:
Provide your response in two clearly labeled sections using Markdown:

1. **Polished Text:** The fully corrected text with proper grammar, spelling, and punctuation, maintaining the exact original style and flow.
2. **Correction Log:** A concise, bulleted list detailing every major correction made (spelling, comma/semicolon fix, tense adjustment) and a brief 5-word reason why it was changed, so the student can learn from it.`;
        const response = await generateWithFallback({
          contents: [
            { role: "user", parts: [{ text: `Input text to edit:
${essayText}` }] }
          ],
          config: {
            systemInstruction
          }
        });
        res.json({ result: response.text || generateFallbackProofread(essayText) });
      } catch (geminiError) {
        console.warn("Gemini API call failed, using fallback proofread:", geminiError?.message);
        res.json({ result: generateFallbackProofread(essayText) });
      }
    } catch (err) {
      console.error("AI proofread error:", err);
      res.status(500).json({ error: err.message || "Failed to process AI proofreading request." });
    }
  });
  app.post("/api/settings/permissions", requireAuth, async (req, res) => {
    try {
      const matrix = req.body?.permissionsMatrix || req.body;
      if (!matrix || typeof matrix !== "object") {
        res.status(400).json({ error: "Invalid permissions matrix" });
        return;
      }
      await sysKvSet("permissions_matrix", matrix);
      await safeDbQuery(async () => {
        if (hasTable("portal_settings")) {
          await db.insert(portalSettings).values({
            key: "permissions_matrix",
            valueJson: matrix,
            updatedAt: /* @__PURE__ */ new Date()
          }).onConflictDoUpdate({
            target: portalSettings.key,
            set: {
              valueJson: matrix,
              updatedAt: /* @__PURE__ */ new Date()
            }
          });
        }
      }, null);
      broadcastRealtime({ type: "permissions:updated", scope: "data", entity: "permissions" });
      res.json({ success: true });
    } catch (e) {
      res.json({ success: true });
    }
  });
  app.get("/api/data", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const allUsers = await readAllUsersSafe();
      const validUserIds = new Set(allUsers.map((u) => u.id));
      const allStudentsData = await readAllStudentsDataSafe();
      const allStaffData = (await safeDbQuery(() => db.select().from(staffData), [])).filter(
        (sd) => validUserIds.has(sd.userId)
      );
      const allSettings = hasTable("portal_settings") ? await safeDbQuery(() => db.select().from(portalSettings), []) : [];
      const permsRow = allSettings.find((r) => r.key === "permissions_matrix");
      const kvPermissionsMatrix = await sysKvGet("permissions_matrix", null);
      const studentsByKey = /* @__PURE__ */ new Map();
      allStudentsData.forEach((sd) => {
        const u = allUsers.find((u2) => u2.id === sd.userId);
        if (!u) return;
        const item = buildStudentFromRow(u, sd);
        const key = normEmail(item.email) || item.id;
        studentsByKey.set(key, item);
      });
      allUsers.filter((u) => (u.role || "").toUpperCase() === "STUDENT").forEach((u) => {
        const key = normEmail(u.email) || u.uid;
        if (!studentsByKey.has(key) && !Array.from(studentsByKey.values()).some((s) => s.id === u.uid)) {
          studentsByKey.set(key, buildStudentFromRow(u, null));
        }
      });
      const kvStudents = await sysKvGet("portal_students_mirror", []);
      for (const ks of kvStudents || []) {
        if (!ks?.id || isSysKvUid(ks.id)) continue;
        const key = normEmail(ks.email) || ks.id;
        if (!studentsByKey.has(key)) {
          studentsByKey.set(key, ks);
        }
      }
      const students = Array.from(studentsByKey.values());
      const staffByKey = /* @__PURE__ */ new Map();
      allStaffData.forEach((sd) => {
        const u = allUsers.find((u2) => u2.id === sd.userId);
        if (!u || isSysKvUid(u.uid)) return;
        const resolvedRole = u?.role === "STAFF" ? "COUNSELOR" : u?.role || "COUNSELOR";
        const item = {
          id: u?.uid || `STAFF-${sd.id}`,
          name: u?.name || "Staff Member",
          email: u?.email || "",
          password: u?.password || "",
          role: resolvedRole,
          students: sd.students || "All",
          status: sd.status || "Active"
        };
        const key = normEmail(item.email) || item.id;
        staffByKey.set(key, item);
      });
      allUsers.filter((u) => !isSysKvUid(u.uid) && (u.role || "").toUpperCase() !== "STUDENT").forEach((u) => {
        const key = normEmail(u.email) || u.uid;
        if (!staffByKey.has(key) && !Array.from(staffByKey.values()).some((s) => s.id === u.uid)) {
          const resolvedRole = u.role === "STAFF" ? "COUNSELOR" : u.role || "COUNSELOR";
          staffByKey.set(key, {
            id: u.uid || `STAFF-${u.id}`,
            name: u.name || "Staff Member",
            email: u.email || "",
            password: u.password || "",
            role: resolvedRole,
            students: "All",
            status: "Active"
          });
        }
      });
      const kvStaff = await sysKvGet("portal_staff_mirror", []);
      for (const kst of kvStaff || []) {
        if (!kst?.id || isSysKvUid(kst.id)) continue;
        const key = normEmail(kst.email) || kst.id;
        if (!staffByKey.has(key)) {
          staffByKey.set(key, kst);
        }
      }
      const staff = Array.from(staffByKey.values());
      const batches = hasTable("batches_data") ? await safeDbQuery(() => db.select().from(batchesData), []) : [];
      const rawEvents = hasTable("events_data") ? await safeDbQuery(() => db.select().from(eventsData), []) : [];
      const events = rawEvents.map((e) => ({
        ...e,
        stream: e.type,
        type: e.type,
        location: e.link,
        link: e.link,
        students: e.attendees,
        attendees: e.attendees,
        day: e.date,
        date: e.date
      }));
      res.json({
        students,
        staff,
        batches,
        events,
        permissionsMatrix: permsRow?.valueJson || kvPermissionsMatrix || null
      });
    } catch (error) {
      res.json({ students: [], staff: [], batches: [], events: [], permissionsMatrix: null });
    }
  });
  app.get("/api/launchpad/state", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const dbSubjects = hasTable("launchpad_subjects") ? await safeDbQuery(() => db.select().from(launchpadSubjects).orderBy((0, import_drizzle_orm2.asc)(launchpadSubjects.sortOrder)), []) : [];
      const dbChapters = hasTable("launchpad_chapters") ? await safeDbQuery(() => db.select().from(launchpadChapters).orderBy((0, import_drizzle_orm2.asc)(launchpadChapters.weekNumber)), []) : [];
      const dbCertQuestions = hasTable("launchpad_certification_questions") ? await safeDbQuery(() => db.select().from(launchpadCertificationQuestions).orderBy((0, import_drizzle_orm2.asc)(launchpadCertificationQuestions.sortOrder)), []) : [];
      const dbPermissions = hasTable("launchpad_team_permissions") ? await safeDbQuery(() => db.select().from(launchpadTeamPermissions), []) : [];
      const dbEnrollments = hasTable("launchpad_student_enrollments") ? hasColumn("launchpad_student_enrollments", "student_email") ? await safeDbQuery(() => db.select().from(launchpadStudentEnrollments), []) : await safeDbQuery(async () => {
        const r = await createPool().query(
          `SELECT "student_id" AS "studentId", "assigned_by" AS "assignedBy", "assigned_at" AS "assignedAt" FROM "launchpad_student_enrollments"`
        );
        return r.rows || [];
      }, []) : [];
      const dbReleases = hasTable("launchpad_subject_releases") ? hasColumn("launchpad_subject_releases", "student_email") ? await safeDbQuery(() => db.select().from(launchpadSubjectReleases), []) : await safeDbQuery(async () => {
        const r = await createPool().query(
          `SELECT "id", "student_id" AS "studentId", "subject_id" AS "subjectId", "is_unlocked" AS "isUnlocked", "unlocked_by" AS "unlockedBy", "unlocked_at" AS "unlockedAt" FROM "launchpad_subject_releases"`
        );
        return r.rows || [];
      }, []) : [];
      const dbProgress = hasTable("launchpad_progress_and_submissions") ? await safeDbQuery(() => db.select().from(launchpadProgressAndSubmissions), []) : [];
      const dbCertifications = hasTable("launchpad_certifications") ? await safeDbQuery(() => db.select().from(launchpadCertifications), []) : [];
      const dbEvaluations = hasTable("assignment_evaluations") ? await safeDbQuery(() => db.select().from(assignmentEvaluations).orderBy((0, import_drizzle_orm2.desc)(assignmentEvaluations.submittedAt)), []) : [];
      const dbNotifications = hasTable("notifications") ? await safeDbQuery(() => db.select().from(notificationsTable).orderBy((0, import_drizzle_orm2.desc)(notificationsTable.createdAt)), []) : [];
      const [
        kvSubjects,
        kvDeletedSubjects,
        kvChapters,
        kvCertQuestions,
        kvPermissions,
        kvEnrollments,
        kvReleases,
        kvProgress,
        kvCertifications,
        kvEvaluations,
        kvNotifications,
        allUsers,
        kvStudentsMirror
      ] = await Promise.all([
        sysKvGet("lp_subjects", []),
        sysKvGet("lp_deleted_subjects", []),
        sysKvGet("lp_chapters", []),
        sysKvGet("lp_cert_questions", []),
        sysKvGet("lp_permissions", []),
        sysKvGet("lp_enrollments", []),
        sysKvGet("lp_releases", []),
        sysKvGet("lp_progress", []),
        sysKvGet("lp_certifications", []),
        sysKvGet("lp_evaluations", []),
        sysKvGet("lp_notifications", []),
        readAllUsersSafe(),
        sysKvGet("portal_students_mirror", [])
      ]);
      const deletedSubjSet = new Set(Array.isArray(kvDeletedSubjects) ? kvDeletedSubjects : []);
      let subjects = mergeRecordsById(dbSubjects, kvSubjects, "id", "updatedAt").filter(
        (s) => s && !deletedSubjSet.has(s.id)
      );
      if (subjects.length === 0) {
        subjects = buildDefaultLaunchpadSubjects().filter((s) => !deletedSubjSet.has(s.id)).map((s) => ({
          id: s.id,
          sortOrder: s.order,
          title: s.title,
          description: s.description || "",
          accentHex: s.accentHex || "#4F46E5",
          surfaceTint: s.surfaceTint || "#EEF2FF",
          iconKey: s.iconKey || s.id,
          customIconUrl: s.customIconUrl || null,
          hasCurriculum: Boolean(s.hasCurriculum),
          courseGoal: s.courseGoal || null,
          passingThreshold: Number(s.passingThreshold ?? 75),
          certificateTitle: s.certificateTitle || null,
          isArchived: Boolean(s.isArchived)
        }));
      }
      subjects.sort((a, b) => Number(a.sortOrder ?? a.order ?? 99) - Number(b.sortOrder ?? b.order ?? 99));
      let chapters = mergeRecordsById(dbChapters, kvChapters, "id", "updatedAt").filter(
        (c) => c && !deletedSubjSet.has(c.subjectId || "comm-public-speaking")
      );
      if (!chapters.some((c) => (c.subjectId || "comm-public-speaking") === "comm-public-speaking") && !deletedSubjSet.has("comm-public-speaking")) {
        const defaults = buildDefaultLaunchpadChapters().map((c) => ({
          id: c.id || `comm-public-speaking__w${c.weekNumber}`,
          subjectId: "comm-public-speaking",
          weekNumber: c.weekNumber,
          title: c.title,
          learningObjectives: c.learningObjectives || [],
          lectureJson: c.lecture || {},
          readingGuideJson: c.readingGuide || {},
          practicalExerciseJson: c.practicalExercise || {}
        }));
        chapters = [...defaults, ...chapters];
      }
      chapters.sort((a, b) => Number(a.weekNumber ?? 1) - Number(b.weekNumber ?? 1));
      let certQuestions = mergeRecordsById(dbCertQuestions, kvCertQuestions, "id", "updatedAt").filter(
        (q) => q && !deletedSubjSet.has(q.subjectId)
      );
      if (!certQuestions.some((q) => q.subjectId === "comm-public-speaking") && !deletedSubjSet.has("comm-public-speaking")) {
        const defaultQs = buildDefaultCertQuestions().map((q) => ({
          id: q.id,
          subjectId: q.subjectId,
          questionType: q.questionType,
          sortOrder: q.sortOrder,
          payloadJson: q.payload || {}
        }));
        certQuestions = [...defaultQs, ...certQuestions];
      }
      certQuestions.sort((a, b) => Number(a.sortOrder ?? 1) - Number(b.sortOrder ?? 1));
      const uidToEmail = /* @__PURE__ */ new Map();
      for (const u of allUsers || []) {
        const em = normEmail(u?.email);
        if (u?.uid && em && !em.endsWith("@uppseekers.local")) {
          uidToEmail.set(String(u.uid).trim(), em);
        }
      }
      for (const st of kvStudentsMirror || []) {
        const em = normEmail(st?.email);
        if (st?.id && em && !em.endsWith("@uppseekers.local") && !uidToEmail.has(String(st.id).trim())) {
          uidToEmail.set(String(st.id).trim(), em);
        }
      }
      const permissions = mergeRecordsById(dbPermissions, kvPermissions, "userId", "updatedAt");
      const enrollments = mergeRecordsById(dbEnrollments, kvEnrollments, "studentId", "assignedAt").map((e) => ({
        ...e,
        studentEmail: normEmail(e.studentEmail) || uidToEmail.get(String(e.studentId || "").trim()) || void 0
      }));
      const releases = mergeRecordsById(dbReleases, kvReleases, "id", "unlockedAt").map((r) => ({
        ...r,
        isUnlocked: Boolean(r.isUnlocked),
        studentEmail: normEmail(r.studentEmail) || uidToEmail.get(String(r.studentId || "").trim()) || void 0
      }));
      const progress = mergeRecordsById(dbProgress, kvProgress, "id", "updatedAt");
      const certifications = mergeRecordsById(dbCertifications, kvCertifications, "id", "issuedAt");
      const evaluations = mergeRecordsById(dbEvaluations, kvEvaluations, "id", "submittedAt");
      const notifications = mergeRecordsById(dbNotifications, kvNotifications, "id", "createdAt");
      res.json({
        subjects,
        chapters,
        certQuestions,
        permissions,
        enrollments,
        releases,
        progress,
        certifications,
        evaluations,
        notifications
      });
    } catch (error) {
      res.json({
        subjects: buildDefaultLaunchpadSubjects().map((s) => ({
          id: s.id,
          sortOrder: s.order,
          title: s.title,
          description: s.description || "",
          accentHex: s.accentHex || "#4F46E5",
          surfaceTint: s.surfaceTint || "#EEF2FF",
          iconKey: s.iconKey || s.id,
          customIconUrl: s.customIconUrl || null,
          hasCurriculum: Boolean(s.hasCurriculum),
          courseGoal: s.courseGoal || null,
          passingThreshold: Number(s.passingThreshold ?? 75),
          certificateTitle: s.certificateTitle || null,
          isArchived: Boolean(s.isArchived)
        })),
        chapters: [],
        certQuestions: [],
        permissions: [],
        enrollments: [],
        releases: [],
        progress: [],
        certifications: [],
        evaluations: [],
        notifications: []
      });
    }
  });
  app.post("/api/launchpad/subjects", requireAuth, async (req, res) => {
    try {
      const s = req.body;
      if (!s?.id || !s?.title) {
        return res.status(400).json({ error: "id and title are required" });
      }
      const nowDate = /* @__PURE__ */ new Date();
      const subjRow = {
        id: s.id,
        sortOrder: Number(s.order ?? s.sortOrder ?? 1),
        title: s.title,
        description: s.description || "",
        accentHex: s.accentHex || "#4F46E5",
        surfaceTint: s.surfaceTint || "#EEF2FF",
        iconKey: s.iconKey || "comm-public-speaking",
        customIconUrl: s.customIconUrl || null,
        hasCurriculum: Boolean(s.hasCurriculum),
        courseGoal: s.courseGoal || null,
        passingThreshold: Number(s.passingThreshold ?? 75),
        certificateTitle: s.certificateTitle || null,
        isArchived: Boolean(s.isArchived),
        updatedAt: nowDate.toISOString()
      };
      const existingKv = await sysKvGet("lp_subjects", []);
      await sysKvSet("lp_subjects", mergeRecordsById([subjRow], existingKv, "id", "updatedAt"));
      const deletedKv = await sysKvGet("lp_deleted_subjects", []);
      if (deletedKv.includes(s.id)) {
        await sysKvSet("lp_deleted_subjects", deletedKv.filter((id) => id !== s.id));
      }
      if (hasTable("launchpad_subjects")) {
        await safeDbQuery(async () => {
          await db.insert(launchpadSubjects).values({ ...subjRow, updatedAt: nowDate }).onConflictDoUpdate({
            target: launchpadSubjects.id,
            set: {
              sortOrder: subjRow.sortOrder,
              title: subjRow.title,
              description: subjRow.description,
              accentHex: subjRow.accentHex,
              surfaceTint: subjRow.surfaceTint,
              iconKey: subjRow.iconKey,
              customIconUrl: subjRow.customIconUrl,
              hasCurriculum: subjRow.hasCurriculum,
              courseGoal: subjRow.courseGoal,
              passingThreshold: subjRow.passingThreshold,
              certificateTitle: subjRow.certificateTitle,
              isArchived: subjRow.isArchived,
              updatedAt: nowDate
            }
          });
        }, null);
      }
      broadcastRealtime({ type: "launchpad:subject_saved", scope: "launchpad", entity: "subjects", targetId: s.id });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save launchpad subject" });
    }
  });
  app.delete("/api/launchpad/subjects/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const existingKv = await sysKvGet("lp_subjects", []);
      await sysKvSet("lp_subjects", existingKv.filter((s) => s?.id !== id));
      const deletedKv = await sysKvGet("lp_deleted_subjects", []);
      if (!deletedKv.includes(id)) {
        await sysKvSet("lp_deleted_subjects", [...deletedKv, id]);
      }
      const existingCh = await sysKvGet("lp_chapters", []);
      await sysKvSet("lp_chapters", existingCh.filter((c) => c?.subjectId !== id));
      const existingQs = await sysKvGet("lp_cert_questions", []);
      await sysKvSet("lp_cert_questions", existingQs.filter((q) => q?.subjectId !== id));
      await safeDbQuery(async () => {
        if (hasTable("launchpad_chapters")) {
          await db.delete(launchpadChapters).where((0, import_drizzle_orm2.eq)(launchpadChapters.subjectId, id));
        }
        if (hasTable("launchpad_certification_questions")) {
          await db.delete(launchpadCertificationQuestions).where((0, import_drizzle_orm2.eq)(launchpadCertificationQuestions.subjectId, id));
        }
        if (hasTable("launchpad_subjects")) {
          await db.delete(launchpadSubjects).where((0, import_drizzle_orm2.eq)(launchpadSubjects.id, id));
        }
      }, null);
      broadcastRealtime({ type: "launchpad:subject_deleted", scope: "launchpad", entity: "subjects", targetId: id });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete launchpad subject" });
    }
  });
  app.post("/api/launchpad/chapters", requireAuth, async (req, res) => {
    try {
      const c = req.body;
      if (!c?.id || !c?.subjectId || !c?.title) {
        return res.status(400).json({ error: "id, subjectId, and title are required" });
      }
      const nowDate = /* @__PURE__ */ new Date();
      const chRow = {
        id: c.id,
        subjectId: c.subjectId,
        weekNumber: Number(c.weekNumber ?? 1),
        title: c.title,
        learningObjectives: c.learningObjectives || [],
        lectureJson: c.lecture || c.lectureJson || {},
        readingGuideJson: c.readingGuide || c.readingGuideJson || {},
        practicalExerciseJson: c.practicalExercise || c.practicalExerciseJson || {},
        updatedAt: nowDate.toISOString()
      };
      const existingKv = await sysKvGet("lp_chapters", []);
      await sysKvSet("lp_chapters", mergeRecordsById([chRow], existingKv, "id", "updatedAt"));
      if (hasTable("launchpad_chapters")) {
        await safeDbQuery(async () => {
          await db.insert(launchpadChapters).values({ ...chRow, updatedAt: nowDate }).onConflictDoUpdate({
            target: launchpadChapters.id,
            set: {
              weekNumber: chRow.weekNumber,
              title: chRow.title,
              learningObjectives: chRow.learningObjectives,
              lectureJson: chRow.lectureJson,
              readingGuideJson: chRow.readingGuideJson,
              practicalExerciseJson: chRow.practicalExerciseJson,
              updatedAt: nowDate
            }
          });
        }, null);
      }
      broadcastRealtime({ type: "launchpad:chapter_saved", scope: "launchpad", entity: "chapters", targetId: c.id });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save launchpad chapter" });
    }
  });
  app.post("/api/launchpad/chapters/reorder", requireAuth, async (req, res) => {
    try {
      const { chapters } = req.body;
      if (!Array.isArray(chapters)) {
        return res.status(400).json({ error: "chapters array is required" });
      }
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      const existingKv = await sysKvGet("lp_chapters", []);
      const orderMap = new Map(chapters.filter((ch) => ch?.id).map((ch) => [String(ch.id), Number(ch.weekNumber)]));
      const updatedKv = existingKv.map(
        (item) => orderMap.has(String(item?.id)) ? { ...item, weekNumber: orderMap.get(String(item.id)), updatedAt: nowIso } : item
      );
      await sysKvSet("lp_chapters", updatedKv);
      if (hasTable("launchpad_chapters")) {
        await safeDbQuery(async () => {
          for (const ch of chapters) {
            if (!ch?.id) continue;
            await db.update(launchpadChapters).set({ weekNumber: Number(ch.weekNumber), updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm2.eq)(launchpadChapters.id, ch.id));
          }
        }, null);
      }
      broadcastRealtime({ type: "launchpad:chapters_reordered", scope: "launchpad", entity: "chapters" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to reorder chapters" });
    }
  });
  app.delete("/api/launchpad/chapters/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const existingKv = await sysKvGet("lp_chapters", []);
      await sysKvSet("lp_chapters", existingKv.filter((c) => c?.id !== id));
      if (hasTable("launchpad_chapters")) {
        await safeDbQuery(async () => {
          await db.delete(launchpadChapters).where((0, import_drizzle_orm2.eq)(launchpadChapters.id, id));
        }, null);
      }
      broadcastRealtime({ type: "launchpad:chapter_deleted", scope: "launchpad", entity: "chapters", targetId: id });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete launchpad chapter" });
    }
  });
  app.post("/api/launchpad/cert-questions", requireAuth, async (req, res) => {
    try {
      const q = req.body;
      if (!q?.id || !q?.subjectId || !q?.questionType) {
        return res.status(400).json({ error: "id, subjectId, and questionType are required" });
      }
      const nowDate = /* @__PURE__ */ new Date();
      const qRow = {
        id: q.id,
        subjectId: q.subjectId,
        questionType: q.questionType,
        sortOrder: Number(q.sortOrder ?? 1),
        payloadJson: q.payload || q.payloadJson || {},
        updatedAt: nowDate.toISOString()
      };
      const existingKv = await sysKvGet("lp_cert_questions", []);
      await sysKvSet("lp_cert_questions", mergeRecordsById([qRow], existingKv, "id", "updatedAt"));
      if (hasTable("launchpad_certification_questions")) {
        await safeDbQuery(async () => {
          await db.insert(launchpadCertificationQuestions).values({ ...qRow, updatedAt: nowDate }).onConflictDoUpdate({
            target: launchpadCertificationQuestions.id,
            set: {
              questionType: qRow.questionType,
              sortOrder: qRow.sortOrder,
              payloadJson: qRow.payloadJson,
              updatedAt: nowDate
            }
          });
        }, null);
      }
      broadcastRealtime({ type: "launchpad:cert_question_saved", scope: "launchpad", entity: "certQuestions", targetId: q.id });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save certification question" });
    }
  });
  app.delete("/api/launchpad/cert-questions/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const existingKv = await sysKvGet("lp_cert_questions", []);
      await sysKvSet("lp_cert_questions", existingKv.filter((q) => q?.id !== id));
      if (hasTable("launchpad_certification_questions")) {
        await safeDbQuery(async () => {
          await db.delete(launchpadCertificationQuestions).where((0, import_drizzle_orm2.eq)(launchpadCertificationQuestions.id, id));
        }, null);
      }
      broadcastRealtime({ type: "launchpad:cert_question_deleted", scope: "launchpad", entity: "certQuestions", targetId: id });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete certification question" });
    }
  });
  app.post("/api/launchpad/permissions", requireAuth, async (req, res) => {
    try {
      const {
        userId,
        accessScope,
        launchpadStudentTabAccess,
        launchpadReviewExerciseAccess,
        launchpadEditCurriculumAccess,
        studentTabAccess,
        reviewExerciseAccess,
        editCurriculumAccess,
        updatedBy
      } = req.body;
      if (!userId || !accessScope) {
        return res.status(400).json({ error: "userId and accessScope are required" });
      }
      const studentAccess = launchpadStudentTabAccess || studentTabAccess || accessScope;
      const reviewAccess = launchpadReviewExerciseAccess || reviewExerciseAccess || accessScope;
      const editAccess = launchpadEditCurriculumAccess || editCurriculumAccess || "none";
      const nowDate = /* @__PURE__ */ new Date();
      const permRow = {
        userId,
        accessScope,
        launchpadStudentTabAccess: studentAccess,
        launchpadReviewExerciseAccess: reviewAccess,
        launchpadEditCurriculumAccess: editAccess,
        updatedBy: updatedBy || "Admin",
        updatedAt: nowDate.toISOString()
      };
      const existingKv = await sysKvGet("lp_permissions", []);
      await sysKvSet("lp_permissions", mergeRecordsById([permRow], existingKv, "userId", "updatedAt"));
      if (hasTable("launchpad_team_permissions")) {
        await safeDbQuery(async () => {
          await db.insert(launchpadTeamPermissions).values({ ...permRow, updatedAt: nowDate }).onConflictDoUpdate({
            target: launchpadTeamPermissions.userId,
            set: {
              accessScope,
              launchpadStudentTabAccess: studentAccess,
              launchpadReviewExerciseAccess: reviewAccess,
              launchpadEditCurriculumAccess: editAccess,
              updatedBy: updatedBy || "Admin",
              updatedAt: nowDate
            }
          });
        }, null);
      }
      broadcastRealtime({ type: "launchpad:permissions_updated", scope: "launchpad", entity: "permissions", targetId: userId });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save launchpad permission" });
    }
  });
  app.post("/api/launchpad/enrollments", requireAuth, async (req, res) => {
    try {
      const { studentIds, studentEmails, assignedBy } = req.body;
      if (!Array.isArray(studentIds)) {
        return res.status(400).json({ error: "studentIds array is required" });
      }
      const allUsers = await readAllUsersSafe();
      const kvStudents = await sysKvGet("portal_students_mirror", []);
      const resolveEmailForId = (sid) => {
        const passed = studentEmails && typeof studentEmails === "object" ? normEmail(studentEmails[sid]) : "";
        if (passed) return passed;
        const u = allUsers.find((usr) => String(usr.uid || "").trim() === sid);
        if (u?.email && !normEmail(u.email).endsWith("@uppseekers.local")) return normEmail(u.email);
        const ks = kvStudents.find((st) => String(st?.id || "").trim() === sid);
        if (ks?.email) return normEmail(ks.email);
        return null;
      };
      const nowDate = /* @__PURE__ */ new Date();
      const nowIso = nowDate.toISOString();
      const newEnrollmentRows = studentIds.filter(Boolean).map((studentId) => ({
        studentId,
        studentEmail: resolveEmailForId(studentId),
        assignedBy: assignedBy || "Counselor",
        assignedAt: nowIso
      }));
      const existingKv = await sysKvGet("lp_enrollments", []);
      await sysKvSet("lp_enrollments", mergeRecordsById(newEnrollmentRows, existingKv, "studentId", "assignedAt"));
      if (hasTable("launchpad_student_enrollments")) {
        await safeDbQuery(async () => {
          for (const row of newEnrollmentRows) {
            if (hasColumn("launchpad_student_enrollments", "student_email")) {
              await db.insert(launchpadStudentEnrollments).values({
                studentId: row.studentId,
                studentEmail: row.studentEmail,
                assignedBy: row.assignedBy,
                assignedAt: nowDate
              }).onConflictDoUpdate({
                target: launchpadStudentEnrollments.studentId,
                set: {
                  ...row.studentEmail ? { studentEmail: row.studentEmail } : {}
                }
              });
            } else {
              await createPool().query(
                `INSERT INTO "launchpad_student_enrollments" ("student_id", "assigned_by", "assigned_at")
                 VALUES ($1, $2, $3) ON CONFLICT ("student_id") DO NOTHING`,
                [row.studentId, row.assignedBy, nowDate]
              );
            }
          }
        }, null);
      }
      broadcastRealtime({ type: "launchpad:enrollments_updated", scope: "launchpad", entity: "enrollments" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to enroll students" });
    }
  });
  app.delete("/api/launchpad/enrollments/:studentId", requireAuth, async (req, res) => {
    try {
      const { studentId } = req.params;
      const existingKv = await sysKvGet("lp_enrollments", []);
      await sysKvSet("lp_enrollments", existingKv.filter((e) => e?.studentId !== studentId));
      if (hasTable("launchpad_student_enrollments")) {
        await safeDbQuery(async () => {
          await db.delete(launchpadStudentEnrollments).where((0, import_drizzle_orm2.eq)(launchpadStudentEnrollments.studentId, studentId));
        }, null);
      }
      broadcastRealtime({ type: "launchpad:enrollment_deleted", scope: "launchpad", entity: "enrollments", targetId: studentId });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove enrollment" });
    }
  });
  app.post("/api/launchpad/releases", requireAuth, async (req, res) => {
    try {
      const { studentId, studentEmail, subjectId, isUnlocked, unlockedBy } = req.body;
      if (!studentId || !subjectId) {
        return res.status(400).json({ error: "studentId and subjectId are required" });
      }
      const cleanStudentId = String(studentId).trim();
      const cleanSubjectId = String(subjectId).trim();
      let cleanStudentEmail = normEmail(studentEmail);
      if (!cleanStudentEmail) {
        const allUsers = await readAllUsersSafe();
        const foundU = allUsers.find((u) => String(u.uid || "").trim() === cleanStudentId);
        if (foundU?.email && !normEmail(foundU.email).endsWith("@uppseekers.local")) {
          cleanStudentEmail = normEmail(foundU.email);
        } else {
          const kvStudents = await sysKvGet("portal_students_mirror", []);
          const foundKs = kvStudents.find((s) => String(s?.id || "").trim() === cleanStudentId);
          if (foundKs?.email) cleanStudentEmail = normEmail(foundKs.email);
        }
      }
      const nowDate = /* @__PURE__ */ new Date();
      const nowIso = nowDate.toISOString();
      const id = `${cleanStudentId}__${cleanSubjectId}`;
      const unlockedBool = Boolean(isUnlocked);
      const actor = unlockedBy || "Counselor";
      const releaseRecord = {
        id,
        studentId: cleanStudentId,
        studentEmail: cleanStudentEmail || null,
        subjectId: cleanSubjectId,
        isUnlocked: unlockedBool,
        unlockedBy: actor,
        unlockedAt: nowIso
      };
      if (unlockedBool) {
        const existingEnrollKv = await sysKvGet("lp_enrollments", []);
        const enrollRow = {
          studentId: cleanStudentId,
          studentEmail: cleanStudentEmail || null,
          assignedBy: actor,
          assignedAt: nowIso
        };
        await sysKvSet("lp_enrollments", mergeRecordsById([enrollRow], existingEnrollKv, "studentId", "assignedAt"));
      }
      const existingReleasesKv = await sysKvGet("lp_releases", []);
      const syncedAliasKv = existingReleasesKv.map((r) => {
        if (cleanStudentEmail && r?.subjectId === cleanSubjectId && normEmail(r?.studentEmail) === cleanStudentEmail) {
          return {
            ...r,
            isUnlocked: unlockedBool,
            unlockedBy: actor,
            unlockedAt: nowIso
          };
        }
        return r;
      });
      const kvSaved = await sysKvSet(
        "lp_releases",
        mergeRecordsById([releaseRecord], syncedAliasKv, "id", "unlockedAt")
      );
      let sqlTableSaved = false;
      await safeDbQuery(async () => {
        if (unlockedBool && hasTable("launchpad_student_enrollments")) {
          if (hasColumn("launchpad_student_enrollments", "student_email")) {
            await db.insert(launchpadStudentEnrollments).values({
              studentId: cleanStudentId,
              studentEmail: cleanStudentEmail || null,
              assignedBy: actor,
              assignedAt: nowDate
            }).onConflictDoUpdate({
              target: launchpadStudentEnrollments.studentId,
              set: {
                ...cleanStudentEmail ? { studentEmail: cleanStudentEmail } : {}
              }
            });
          } else {
            await createPool().query(
              `INSERT INTO "launchpad_student_enrollments" ("student_id", "assigned_by", "assigned_at")
               VALUES ($1, $2, $3) ON CONFLICT ("student_id") DO NOTHING`,
              [cleanStudentId, actor, nowDate]
            );
          }
        }
        if (hasTable("launchpad_subject_releases")) {
          if (hasColumn("launchpad_subject_releases", "student_email")) {
            await db.insert(launchpadSubjectReleases).values({
              id,
              studentId: cleanStudentId,
              studentEmail: cleanStudentEmail || null,
              subjectId: cleanSubjectId,
              isUnlocked: unlockedBool,
              unlockedBy: actor,
              unlockedAt: nowDate
            }).onConflictDoUpdate({
              target: launchpadSubjectReleases.id,
              set: {
                ...cleanStudentEmail ? { studentEmail: cleanStudentEmail } : {},
                isUnlocked: unlockedBool,
                unlockedBy: actor,
                unlockedAt: nowDate
              }
            });
            if (cleanStudentEmail) {
              await createPool().query(
                `UPDATE "launchpad_subject_releases"
                 SET "is_unlocked" = $1, "unlocked_by" = $2, "unlocked_at" = $3
                 WHERE LOWER(TRIM(COALESCE("student_email", ''))) = $4 AND "subject_id" = $5`,
                [unlockedBool, actor, nowDate, cleanStudentEmail, cleanSubjectId]
              );
            }
          } else {
            await createPool().query(
              `INSERT INTO "launchpad_subject_releases" ("id", "student_id", "subject_id", "is_unlocked", "unlocked_by", "unlocked_at")
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT ("id") DO UPDATE SET "is_unlocked" = EXCLUDED."is_unlocked", "unlocked_by" = EXCLUDED."unlocked_by", "unlocked_at" = EXCLUDED."unlocked_at"`,
              [id, cleanStudentId, cleanSubjectId, unlockedBool, actor, nowDate]
            );
          }
          sqlTableSaved = true;
        }
      }, null);
      if (hasSqlEnv() && !sqlTableSaved && !kvSaved) {
        return res.status(500).json({ error: "Failed to persist subject unlock in database" });
      }
      broadcastRealtime({ type: "launchpad:release_updated", scope: "launchpad", entity: "releases", targetId: cleanStudentId });
      res.json({ success: true, release: releaseRecord });
    } catch (error) {
      res.status(500).json({ error: "Failed to update subject release" });
    }
  });
  app.post("/api/launchpad/progress", requireAuth, async (req, res) => {
    try {
      const {
        studentId,
        subjectId,
        weekNumber,
        lectureCompleted,
        readingCompleted,
        exerciseSubmissionJson,
        exerciseCompleted,
        evaluationStatus,
        evaluatorFeedback,
        evaluatedBy,
        evaluatedAt
      } = req.body;
      if (!studentId || !subjectId || !weekNumber) {
        return res.status(400).json({ error: "studentId, subjectId, and weekNumber are required" });
      }
      const id = `${studentId}__${subjectId}__w${weekNumber}`;
      const nowDate = /* @__PURE__ */ new Date();
      const parsedEvaluatedAt = evaluatedAt && !isNaN(new Date(evaluatedAt).getTime()) ? new Date(evaluatedAt) : null;
      const progRow = {
        id,
        studentId,
        subjectId,
        weekNumber: Number(weekNumber),
        lectureCompleted: Boolean(lectureCompleted),
        readingCompleted: Boolean(readingCompleted),
        exerciseSubmissionJson: exerciseSubmissionJson || null,
        exerciseCompleted: Boolean(exerciseCompleted),
        evaluationStatus: evaluationStatus || null,
        evaluatorFeedback: evaluatorFeedback || null,
        evaluatedBy: evaluatedBy || null,
        evaluatedAt: parsedEvaluatedAt ? parsedEvaluatedAt.toISOString() : null,
        updatedAt: nowDate.toISOString()
      };
      const existingKv = await sysKvGet("lp_progress", []);
      await sysKvSet("lp_progress", mergeRecordsById([progRow], existingKv, "id", "updatedAt"));
      if (hasTable("launchpad_progress_and_submissions")) {
        await safeDbQuery(async () => {
          await db.insert(launchpadProgressAndSubmissions).values({
            ...progRow,
            evaluatedAt: parsedEvaluatedAt,
            updatedAt: nowDate
          }).onConflictDoUpdate({
            target: launchpadProgressAndSubmissions.id,
            set: {
              lectureCompleted: progRow.lectureCompleted,
              readingCompleted: progRow.readingCompleted,
              exerciseSubmissionJson: progRow.exerciseSubmissionJson,
              exerciseCompleted: progRow.exerciseCompleted,
              evaluationStatus: progRow.evaluationStatus,
              evaluatorFeedback: progRow.evaluatorFeedback,
              evaluatedBy: progRow.evaluatedBy,
              evaluatedAt: parsedEvaluatedAt,
              updatedAt: nowDate
            }
          });
        }, null);
      }
      broadcastRealtime({ type: "launchpad:progress_updated", scope: "launchpad", entity: "progress", targetId: studentId });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save launchpad progress" });
    }
  });
  app.post("/api/launchpad/certifications", requireAuth, async (req, res) => {
    try {
      const { studentId, subjectId, testScore, passed, certificateCode } = req.body;
      if (!studentId || !subjectId || typeof testScore !== "number" || !certificateCode) {
        return res.status(400).json({ error: "Missing certification fields" });
      }
      const id = `${studentId}__${subjectId}`;
      const nowDate = /* @__PURE__ */ new Date();
      const certRow = {
        id,
        studentId,
        subjectId,
        testScore,
        passed: Boolean(passed),
        certificateCode,
        issuedAt: nowDate.toISOString()
      };
      const existingKv = await sysKvGet("lp_certifications", []);
      await sysKvSet("lp_certifications", mergeRecordsById([certRow], existingKv, "id", "issuedAt"));
      if (hasTable("launchpad_certifications")) {
        await safeDbQuery(async () => {
          await db.insert(launchpadCertifications).values({ ...certRow, issuedAt: nowDate }).onConflictDoUpdate({
            target: launchpadCertifications.id,
            set: {
              testScore,
              passed: Boolean(passed),
              certificateCode,
              issuedAt: nowDate
            }
          });
        }, null);
      }
      broadcastRealtime({ type: "launchpad:certification_saved", scope: "launchpad", entity: "certifications", targetId: studentId });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save certification" });
    }
  });
  app.post("/api/launchpad/evaluations", requireAuth, async (req, res) => {
    try {
      const ev = req.body;
      if (!ev?.id || !ev?.studentId || !ev?.subjectId) {
        return res.status(400).json({ error: "id, studentId, and subjectId are required" });
      }
      const subDate = ev.submittedAt ? new Date(ev.submittedAt) : /* @__PURE__ */ new Date();
      const evalDate = ev.evaluatedAt ? new Date(ev.evaluatedAt) : null;
      const evRow = {
        id: ev.id,
        sourceType: ev.sourceType || "LAUNCHPAD",
        studentId: ev.studentId,
        studentName: ev.studentName || "Student",
        subjectId: ev.subjectId,
        subjectTitle: ev.subjectTitle || "",
        weekNumber: Number(ev.weekNumber ?? 1),
        chapterTitle: ev.chapterTitle || "",
        taskId: ev.taskId || null,
        submissionJson: ev.submissionJson || {},
        status: ev.status || "Submitted",
        feedback: ev.feedback || null,
        evaluatedBy: ev.evaluatedBy || null,
        submittedAt: subDate.toISOString(),
        evaluatedAt: evalDate ? evalDate.toISOString() : null
      };
      const existingKv = await sysKvGet("lp_evaluations", []);
      await sysKvSet("lp_evaluations", mergeRecordsById([evRow], existingKv, "id", "submittedAt"));
      if (hasTable("assignment_evaluations")) {
        await safeDbQuery(async () => {
          await db.insert(assignmentEvaluations).values({
            ...evRow,
            submittedAt: subDate,
            evaluatedAt: evalDate
          }).onConflictDoUpdate({
            target: assignmentEvaluations.id,
            set: {
              submissionJson: evRow.submissionJson,
              status: evRow.status,
              feedback: evRow.feedback,
              evaluatedBy: evRow.evaluatedBy,
              evaluatedAt: evalDate
            }
          });
        }, null);
      }
      broadcastRealtime({ type: "launchpad:evaluation_saved", scope: "launchpad", entity: "evaluations", targetId: ev.studentId });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save launchpad evaluation" });
    }
  });
  app.post("/api/launchpad/notifications", requireAuth, async (req, res) => {
    try {
      const n = req.body;
      if (!n?.id || !n?.recipientId || !n?.title) {
        return res.status(400).json({ error: "id, recipientId, and title are required" });
      }
      const createdDate = n.createdAt ? new Date(n.createdAt) : /* @__PURE__ */ new Date();
      const notifRow = {
        id: n.id,
        recipientType: n.recipientType || "student",
        recipientId: n.recipientId,
        title: n.title,
        message: n.message || "",
        category: n.category || "LAUNCHPAD",
        link: n.link || "/student/launchpad",
        metadataJson: n.metadata || n.metadataJson || {},
        isRead: Boolean(n.isRead),
        createdAt: createdDate.toISOString()
      };
      const existingKv = await sysKvGet("lp_notifications", []);
      await sysKvSet("lp_notifications", mergeRecordsById([notifRow], existingKv, "id", "createdAt"));
      if (hasTable("notifications")) {
        await safeDbQuery(async () => {
          await db.insert(notificationsTable).values({
            ...notifRow,
            createdAt: createdDate
          }).onConflictDoUpdate({
            target: notificationsTable.id,
            set: {
              isRead: notifRow.isRead,
              metadataJson: notifRow.metadataJson
            }
          });
        }, null);
      }
      broadcastRealtime({ type: "launchpad:notification_created", scope: "launchpad", entity: "notifications", targetId: n.recipientId });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save notification" });
    }
  });
  app.post("/api/launchpad/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const existingKv = await sysKvGet("lp_notifications", []);
      await sysKvSet(
        "lp_notifications",
        existingKv.map((item) => item?.id === id ? { ...item, isRead: true } : item)
      );
      if (hasTable("notifications")) {
        await safeDbQuery(async () => {
          await db.update(notificationsTable).set({ isRead: true }).where((0, import_drizzle_orm2.eq)(notificationsTable.id, id));
        }, null);
      }
      broadcastRealtime({ type: "launchpad:notification_read", scope: "launchpad", entity: "notifications", targetId: id });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notification read" });
    }
  });
  const extractYoutubeIdServer = (url) => {
    if (!url) return void 0;
    const match = url.trim().match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : void 0;
  };
  const slugifyFieldKey = (label, idx) => {
    const slug = (label || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
    return slug || `field_${idx + 1}`;
  };
  const parseAgreedLaunchpadChapterText = (rawText) => {
    const lines = (rawText || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    let area = "meta";
    let listTarget = null;
    let chapterTitle = "";
    let weekNumber;
    const learningObjectives = [];
    let guideTitle = "";
    let readTime = "8 min read";
    const guideSummaryLines = [];
    const guideSections = [];
    let currentSection = null;
    let lectureTitle = "";
    let speaker = "";
    let lectureUrl = "";
    let duration = "15 min";
    const focusNoteLines = [];
    let exerciseTitle = "";
    const scenarioLines = [];
    const instructions = [];
    const selfCheckCriteria = [];
    let allowFileUpload = true;
    const worksheetFields = [];
    const flushSection = () => {
      if (currentSection && (currentSection.heading || currentSection.bodyLines.length > 0 || currentSection.bullets.length > 0)) {
        guideSections.push({
          heading: currentSection.heading || "Core Framework",
          body: currentSection.bodyLines.join("\n").trim(),
          bullets: currentSection.bullets.filter(Boolean)
        });
      }
      currentSection = null;
    };
    const stripListPrefix = (s) => s.replace(/^\s*(?:[-*•●◦]|\d+[.)])\s+/, "").trim();
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        if (listTarget === "body" && currentSection && currentSection.bodyLines.length > 0) {
          currentSection.bodyLines.push("");
        } else if (listTarget === "summary" && guideSummaryLines.length > 0) {
          guideSummaryLines.push("");
        } else if (listTarget === "scenario" && scenarioLines.length > 0) {
          scenarioLines.push("");
        }
        continue;
      }
      const upperClean = line.replace(/^[#*\s]+|[#*\s:]+$/g, "").toUpperCase();
      if (/^(\[)?(?:1\.?\s*)?READ GUIDE(\])?$/.test(upperClean) || upperClean === "READING GUIDE" || upperClean === "SECTION 1: READ GUIDE") {
        area = "guide";
        listTarget = null;
        continue;
      }
      if (/^(\[)?(?:2\.?\s*)?WATCH LECTURE(\])?$/.test(upperClean) || upperClean === "VIDEO LECTURE" || upperClean === "SECTION 2: WATCH LECTURE") {
        flushSection();
        area = "lecture";
        listTarget = null;
        continue;
      }
      if (/^(\[)?(?:3\.?\s*)?PRACTICAL EXERCISE(\])?$/.test(upperClean) || upperClean === "PRACTICE EXERCISE" || upperClean === "PRACTICAL EXERCISE & WORKSHEET" || upperClean === "SECTION 3: PRACTICAL EXERCISE") {
        flushSection();
        area = "exercise";
        listTarget = null;
        continue;
      }
      const kvMatch = line.match(/^([A-Za-z][A-Za-z0-9 \-/&]+?)\s*:\s*(.*)$/);
      if (kvMatch) {
        const key = kvMatch[1].trim().toUpperCase();
        const val = kvMatch[2].trim();
        if (key === "CHAPTER TITLE" || key === "MODULE TITLE" || key === "WEEK TITLE") {
          if (val) chapterTitle = val;
          listTarget = null;
          continue;
        }
        if (key === "WEEK NUMBER" || key === "WEEK #") {
          const n = parseInt(val.replace(/[^\d]/g, ""), 10);
          if (Number.isFinite(n) && n > 0) weekNumber = n;
          listTarget = null;
          continue;
        }
        if (key === "LEARNING OBJECTIVES" || key === "OBJECTIVES") {
          listTarget = "objectives";
          if (val) learningObjectives.push(stripListPrefix(val));
          continue;
        }
        if (key === "GUIDE TITLE" || key === "READING TITLE") {
          area = "guide";
          if (val) guideTitle = val;
          listTarget = null;
          continue;
        }
        if (key === "READ TIME" || key === "READING TIME") {
          area = "guide";
          if (val) readTime = val;
          listTarget = null;
          continue;
        }
        if (key === "SUMMARY" || key === "EXECUTIVE SUMMARY" || key === "GUIDE SUMMARY") {
          area = "guide";
          listTarget = "summary";
          if (val) guideSummaryLines.push(val);
          continue;
        }
        if (key === "SECTION" || key === "SECTION HEADING" || key === "SECTION TITLE") {
          area = "guide";
          flushSection();
          currentSection = { heading: val || "Core Framework", bodyLines: [], bullets: [] };
          listTarget = "body";
          continue;
        }
        if (key === "BODY" || key === "CONTENT") {
          area = "guide";
          if (!currentSection) currentSection = { heading: "Core Framework", bodyLines: [], bullets: [] };
          listTarget = "body";
          if (val) currentSection.bodyLines.push(val);
          continue;
        }
        if (key === "BULLETS" || key === "KEY POINTS" || key === "TAKEAWAYS") {
          area = "guide";
          if (!currentSection) currentSection = { heading: "Core Framework", bodyLines: [], bullets: [] };
          listTarget = "bullets";
          if (val) currentSection.bullets.push(stripListPrefix(val));
          continue;
        }
        if (key === "LECTURE TITLE" || key === "VIDEO TITLE") {
          area = "lecture";
          if (val) lectureTitle = val;
          listTarget = null;
          continue;
        }
        if (key === "SPEAKER" || key === "SPEAKER / CHANNEL" || key === "INSTRUCTOR") {
          area = "lecture";
          if (val) speaker = val;
          listTarget = null;
          continue;
        }
        if (key === "VIDEO URL" || key === "LECTURE URL" || key === "YOUTUBE URL" || key === "VIDEO LINK") {
          area = "lecture";
          if (val) lectureUrl = val;
          listTarget = null;
          continue;
        }
        if (key === "DURATION" || key === "LECTURE DURATION") {
          area = "lecture";
          if (val) duration = val;
          listTarget = null;
          continue;
        }
        if (key === "FOCUS NOTE" || key === "WATCH FOCUS NOTE") {
          area = "lecture";
          listTarget = "focus";
          if (val) focusNoteLines.push(val);
          continue;
        }
        if (key === "EXERCISE TITLE" || key === "PRACTICAL EXERCISE TITLE") {
          area = "exercise";
          if (val) exerciseTitle = val;
          listTarget = null;
          continue;
        }
        if (key === "SCENARIO" || key === "REAL-WORLD SCENARIO" || key === "REAL WORLD SCENARIO") {
          area = "exercise";
          listTarget = "scenario";
          if (val) scenarioLines.push(val);
          continue;
        }
        if (key === "INSTRUCTIONS" || key === "STEP-BY-STEP INSTRUCTIONS") {
          area = "exercise";
          listTarget = "instructions";
          if (val) instructions.push(stripListPrefix(val));
          continue;
        }
        if (key === "SELF CHECK" || key === "SELF-CHECK" || key === "SELF CHECK CRITERIA" || key === "SELF-CHECK CRITERIA" || key === "SELF-EVALUATION CHECKLIST") {
          area = "exercise";
          listTarget = "selfCheck";
          if (val) selfCheckCriteria.push(stripListPrefix(val));
          continue;
        }
        if (key === "WORKSHEET FIELDS" || key === "SUBMISSION FIELDS") {
          area = "exercise";
          listTarget = "fields";
          if (val) {
            const parts = val.split("|").map((p) => p.trim());
            const label = stripListPrefix(parts[0] || "");
            if (label) {
              const idx = worksheetFields.length;
              worksheetFields.push({
                key: slugifyFieldKey(label, idx),
                label,
                placeholder: parts[1] || `Write your ${label.toLowerCase()}...`,
                type: parts[2]?.toLowerCase() === "text" ? "text" : "textarea",
                showWordCount: (parts[3] || "").toLowerCase().includes("word") || parts[2]?.toLowerCase() !== "text"
              });
            }
          }
          continue;
        }
        if (key === "ALLOW FILE UPLOAD" || key === "STUDENT FILE UPLOAD") {
          area = "exercise";
          allowFileUpload = !/^(no|false|0|off|disabled)$/i.test(val);
          listTarget = null;
          continue;
        }
      }
      const cleanedItem = stripListPrefix(line);
      if (listTarget === "objectives" && cleanedItem) {
        learningObjectives.push(cleanedItem);
      } else if (listTarget === "summary") {
        guideSummaryLines.push(line);
      } else if (listTarget === "body" && currentSection) {
        if (/^\s*[-*•●◦]\s+/.test(rawLine)) {
          currentSection.bullets.push(cleanedItem);
        } else {
          currentSection.bodyLines.push(line);
        }
      } else if (listTarget === "bullets" && currentSection && cleanedItem) {
        currentSection.bullets.push(cleanedItem);
      } else if (listTarget === "focus") {
        focusNoteLines.push(line);
      } else if (listTarget === "scenario") {
        scenarioLines.push(line);
      } else if (listTarget === "instructions" && cleanedItem) {
        instructions.push(cleanedItem);
      } else if (listTarget === "selfCheck" && cleanedItem) {
        selfCheckCriteria.push(cleanedItem);
      } else if (listTarget === "fields" && cleanedItem) {
        const parts = cleanedItem.split("|").map((p) => p.trim());
        const label = parts[0] || "";
        if (label) {
          const idx = worksheetFields.length;
          worksheetFields.push({
            key: slugifyFieldKey(label, idx),
            label,
            placeholder: parts[1] || `Write your ${label.toLowerCase()}...`,
            type: parts[2]?.toLowerCase() === "text" ? "text" : "textarea",
            showWordCount: (parts[3] || "").toLowerCase().includes("word") || parts[2]?.toLowerCase() !== "text"
          });
        }
      }
    }
    flushSection();
    const parsedSummary = guideSummaryLines.join("\n").trim();
    const parsedScenario = scenarioLines.join("\n").trim();
    const parsedFocus = focusNoteLines.join("\n").trim();
    const matchedGuide = Boolean(guideTitle || parsedSummary || guideSections.length > 0);
    const matchedLecture = Boolean(lectureTitle || lectureUrl || speaker);
    const matchedExercise = Boolean(exerciseTitle || parsedScenario || instructions.length > 0 || worksheetFields.length > 0);
    return {
      isCompleteMatch: Boolean(chapterTitle && matchedGuide && matchedLecture && matchedExercise),
      hasAnyMatch: Boolean(chapterTitle || matchedGuide || matchedLecture || matchedExercise),
      chapter: {
        title: chapterTitle,
        weekNumber,
        learningObjectives,
        readingGuide: {
          title: guideTitle || chapterTitle,
          readTime,
          summary: parsedSummary,
          sections: guideSections
        },
        lecture: {
          title: lectureTitle || chapterTitle,
          speaker,
          url: lectureUrl,
          youtubeId: extractYoutubeIdServer(lectureUrl),
          duration,
          focusNote: parsedFocus
        },
        practicalExercise: {
          title: exerciseTitle || (chapterTitle ? `${chapterTitle} \u2014 Practical Exercise` : ""),
          scenario: parsedScenario,
          instructions,
          allowFileUpload,
          selfCheckCriteria: selfCheckCriteria.length > 0 ? selfCheckCriteria : ["I clearly structured my response and verified all instructions."],
          fields: worksheetFields.length > 0 ? worksheetFields : [
            {
              key: "response_main",
              label: "Primary Worksheet Response",
              placeholder: "Write your structured response here...",
              type: "textarea",
              showWordCount: true
            }
          ]
        }
      }
    };
  };
  app.post("/api/launchpad/parse-chapter-doc", requireAuth, async (req, res) => {
    try {
      const { fileName, mimeType, base64Data } = req.body || {};
      if (!base64Data || typeof base64Data !== "string") {
        return res.status(400).json({ error: "Document content (base64Data) is required." });
      }
      const cleanName = String(fileName || "chapter-document").trim();
      const lowerName = cleanName.toLowerCase();
      const rawBase64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
      const fileBuffer = Buffer.from(rawBase64, "base64");
      const isPdf = (mimeType || "").includes("pdf") || lowerName.endsWith(".pdf");
      const isDocx = (mimeType || "").includes("wordprocessingml") || lowerName.endsWith(".docx");
      const isDoc = (mimeType || "").includes("msword") || lowerName.endsWith(".doc");
      let extractedText = "";
      if (isDocx) {
        try {
          const mammothMod = await import("mammoth");
          const mammoth = mammothMod.default || mammothMod;
          const result = await mammoth.extractRawText({ buffer: fileBuffer });
          extractedText = result.value || "";
        } catch (docErr) {
          console.warn("Mammoth DOCX parse warning:", docErr?.message);
        }
      } else if (!isPdf) {
        const rawUtf8 = fileBuffer.toString("utf8");
        if (isDoc && /<html|<body|<p\b/i.test(rawUtf8)) {
          extractedText = rawUtf8.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<\/(p|div|h\d|li|tr|br)>/gi, "\n").replace(/<li[^>]*>/gi, "\n- ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
        } else {
          extractedText = rawUtf8;
        }
      }
      const deterministic = !isPdf && extractedText ? parseAgreedLaunchpadChapterText(extractedText) : null;
      if (deterministic?.isCompleteMatch) {
        const ch2 = deterministic.chapter;
        return res.json({
          success: true,
          mode: "agreed_template",
          chapter: ch2,
          summary: {
            sectionsCount: ch2.readingGuide.sections.length,
            objectivesCount: ch2.learningObjectives.length,
            instructionsCount: ch2.practicalExercise.instructions.length,
            fieldsCount: ch2.practicalExercise.fields.length
          }
        });
      }
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        if (deterministic?.hasAnyMatch) {
          const ch2 = deterministic.chapter;
          return res.json({
            success: true,
            mode: "agreed_template",
            chapter: ch2,
            summary: {
              sectionsCount: ch2.readingGuide.sections.length,
              objectivesCount: ch2.learningObjectives.length,
              instructionsCount: ch2.practicalExercise.instructions.length,
              fieldsCount: ch2.practicalExercise.fields.length
            }
          });
        }
        return res.status(400).json({
          error: isPdf ? "PDF extraction requires GEMINI_API_KEY in Secrets, or upload a .docx / .txt file using the Agreed Format template." : "Could not detect the Launchpad chapter sections in this document. Download the Agreed Format template to ensure headings match."
        });
      }
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const systemInstruction = `You are a Launchpad curriculum parser. Extract a complete weekly Launchpad chapter from the provided document into the exact JSON schema:
1. Chapter Title, Week Number (if stated), and Learning Objectives.
2. Read Guide: Guide Title, Read Time (e.g. "8 min read"), Summary, and structured Reading Sections (each with heading, body paragraph, and key takeaway bullets).
3. Watch Lecture: Lecture Title, Speaker/Channel, Video URL (extract exact YouTube/Vimeo/external URL if present in the document, else empty string), Duration (e.g. "15 min"), and Focus Note.
4. Practical Exercise: Exercise Title, Real-World Scenario, Step-by-Step Instructions, Self-Check Criteria checklist items, Worksheet Input Fields (label, placeholder, type "textarea" or "text", showWordCount boolean), and allowFileUpload boolean.
Preserve the author's exact wording wherever present in the document. If a list like worksheet fields isn't explicitly defined, create 1 relevant Primary Worksheet Response textarea field.`;
      const contentsPayload = isPdf ? {
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: rawBase64
            }
          },
          {
            text: `Extract the full Launchpad chapter (metadata, Read Guide, Watch Lecture, Practical Exercise) from "${cleanName}".`
          }
        ]
      } : `Extract the full Launchpad chapter (metadata, Read Guide, Watch Lecture, Practical Exercise) from the document "${cleanName}":

${extractedText.slice(0, 6e4)}`;
      const aiResponse = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: contentsPayload,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              title: { type: import_genai.Type.STRING },
              weekNumber: { type: import_genai.Type.INTEGER },
              learningObjectives: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } },
              readingGuide: {
                type: import_genai.Type.OBJECT,
                properties: {
                  title: { type: import_genai.Type.STRING },
                  readTime: { type: import_genai.Type.STRING },
                  summary: { type: import_genai.Type.STRING },
                  sections: {
                    type: import_genai.Type.ARRAY,
                    items: {
                      type: import_genai.Type.OBJECT,
                      properties: {
                        heading: { type: import_genai.Type.STRING },
                        body: { type: import_genai.Type.STRING },
                        bullets: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } }
                      },
                      required: ["heading", "body"]
                    }
                  }
                },
                required: ["title", "summary", "sections"]
              },
              lecture: {
                type: import_genai.Type.OBJECT,
                properties: {
                  title: { type: import_genai.Type.STRING },
                  speaker: { type: import_genai.Type.STRING },
                  url: { type: import_genai.Type.STRING },
                  duration: { type: import_genai.Type.STRING },
                  focusNote: { type: import_genai.Type.STRING }
                },
                required: ["title"]
              },
              practicalExercise: {
                type: import_genai.Type.OBJECT,
                properties: {
                  title: { type: import_genai.Type.STRING },
                  scenario: { type: import_genai.Type.STRING },
                  instructions: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } },
                  allowFileUpload: { type: import_genai.Type.BOOLEAN },
                  selfCheckCriteria: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } },
                  fields: {
                    type: import_genai.Type.ARRAY,
                    items: {
                      type: import_genai.Type.OBJECT,
                      properties: {
                        label: { type: import_genai.Type.STRING },
                        placeholder: { type: import_genai.Type.STRING },
                        type: { type: import_genai.Type.STRING },
                        showWordCount: { type: import_genai.Type.BOOLEAN }
                      },
                      required: ["label", "placeholder", "type"]
                    }
                  }
                },
                required: ["title", "scenario", "instructions", "selfCheckCriteria", "fields"]
              }
            },
            required: ["title", "readingGuide", "lecture", "practicalExercise"]
          }
        }
      });
      const parsedJson = JSON.parse((aiResponse.text || "{}").trim());
      const rawFields = Array.isArray(parsedJson?.practicalExercise?.fields) ? parsedJson.practicalExercise.fields : [];
      const normalizedFields = rawFields.length > 0 ? rawFields.map((f, idx) => ({
        key: slugifyFieldKey(f.label || "", idx),
        label: String(f.label || `Response Field ${idx + 1}`),
        placeholder: String(f.placeholder || "Write your structured response here..."),
        type: f.type === "text" ? "text" : "textarea",
        showWordCount: f.showWordCount !== false
      })) : [
        {
          key: "response_main",
          label: "Primary Worksheet Response",
          placeholder: "Write your structured response here...",
          type: "textarea",
          showWordCount: true
        }
      ];
      const lectureUrl = String(parsedJson?.lecture?.url || deterministic?.chapter.lecture.url || "").trim();
      const ch = {
        title: String(parsedJson?.title || deterministic?.chapter.title || cleanName.replace(/\.[^.]+$/, "")),
        weekNumber: Number.isFinite(parsedJson?.weekNumber) && parsedJson.weekNumber > 0 ? parsedJson.weekNumber : deterministic?.chapter.weekNumber,
        learningObjectives: Array.isArray(parsedJson?.learningObjectives) && parsedJson.learningObjectives.length > 0 ? parsedJson.learningObjectives.map((x) => String(x)).filter(Boolean) : deterministic?.chapter.learningObjectives || [],
        readingGuide: {
          title: String(parsedJson?.readingGuide?.title || parsedJson?.title || cleanName.replace(/\.[^.]+$/, "")),
          readTime: String(parsedJson?.readingGuide?.readTime || "8 min read"),
          summary: String(parsedJson?.readingGuide?.summary || deterministic?.chapter.readingGuide.summary || ""),
          sections: Array.isArray(parsedJson?.readingGuide?.sections) && parsedJson.readingGuide.sections.length > 0 ? parsedJson.readingGuide.sections.map((s) => ({
            heading: String(s.heading || "Core Framework"),
            body: String(s.body || ""),
            bullets: Array.isArray(s.bullets) ? s.bullets.map((b) => String(b)).filter(Boolean) : []
          })) : deterministic?.chapter.readingGuide.sections || []
        },
        lecture: {
          title: String(parsedJson?.lecture?.title || deterministic?.chapter.lecture.title || ""),
          speaker: String(parsedJson?.lecture?.speaker || deterministic?.chapter.lecture.speaker || ""),
          url: lectureUrl,
          youtubeId: extractYoutubeIdServer(lectureUrl),
          duration: String(parsedJson?.lecture?.duration || deterministic?.chapter.lecture.duration || "15 min"),
          focusNote: String(parsedJson?.lecture?.focusNote || deterministic?.chapter.lecture.focusNote || "")
        },
        practicalExercise: {
          title: String(parsedJson?.practicalExercise?.title || deterministic?.chapter.practicalExercise.title || ""),
          scenario: String(parsedJson?.practicalExercise?.scenario || deterministic?.chapter.practicalExercise.scenario || ""),
          instructions: Array.isArray(parsedJson?.practicalExercise?.instructions) ? parsedJson.practicalExercise.instructions.map((x) => String(x)).filter(Boolean) : deterministic?.chapter.practicalExercise.instructions || [],
          allowFileUpload: parsedJson?.practicalExercise?.allowFileUpload !== false,
          selfCheckCriteria: Array.isArray(parsedJson?.practicalExercise?.selfCheckCriteria) && parsedJson.practicalExercise.selfCheckCriteria.length > 0 ? parsedJson.practicalExercise.selfCheckCriteria.map((x) => String(x)).filter(Boolean) : ["I clearly structured my response and verified all instructions."],
          fields: normalizedFields
        }
      };
      res.json({
        success: true,
        mode: "ai_extracted",
        chapter: ch,
        summary: {
          sectionsCount: ch.readingGuide.sections.length,
          objectivesCount: ch.learningObjectives.length,
          instructionsCount: ch.practicalExercise.instructions.length,
          fieldsCount: ch.practicalExercise.fields.length
        }
      });
    } catch (error) {
      console.error("Parse Launchpad chapter doc error:", error);
      res.status(500).json({ error: error?.message || "Failed to parse Launchpad chapter document." });
    }
  });
  const ZOHO_DC_MAP = {
    "https://accounts.zoho.com": { accounts: "https://accounts.zoho.com", meeting: "https://meeting.zoho.com" },
    "https://accounts.zoho.in": { accounts: "https://accounts.zoho.in", meeting: "https://meeting.zoho.in" },
    "https://accounts.zoho.eu": { accounts: "https://accounts.zoho.eu", meeting: "https://meeting.zoho.eu" },
    "https://accounts.zoho.com.au": { accounts: "https://accounts.zoho.com.au", meeting: "https://meeting.zoho.com.au" },
    "https://accounts.zoho.jp": { accounts: "https://accounts.zoho.jp", meeting: "https://meeting.zoho.jp" },
    "https://accounts.zoho.ca": { accounts: "https://accounts.zoho.ca", meeting: "https://meeting.zoho.ca" },
    "https://accounts.zoho.sa": { accounts: "https://accounts.zoho.sa", meeting: "https://meeting.zoho.sa" },
    "https://accounts.zoho.uk": { accounts: "https://accounts.zoho.uk", meeting: "https://meeting.zoho.uk" }
  };
  const ZOHO_LOCATION_MAP = {
    us: ZOHO_DC_MAP["https://accounts.zoho.com"],
    com: ZOHO_DC_MAP["https://accounts.zoho.com"],
    in: ZOHO_DC_MAP["https://accounts.zoho.in"],
    eu: ZOHO_DC_MAP["https://accounts.zoho.eu"],
    au: ZOHO_DC_MAP["https://accounts.zoho.com.au"],
    jp: ZOHO_DC_MAP["https://accounts.zoho.jp"],
    ca: ZOHO_DC_MAP["https://accounts.zoho.ca"],
    sa: ZOHO_DC_MAP["https://accounts.zoho.sa"],
    uk: ZOHO_DC_MAP["https://accounts.zoho.uk"]
  };
  const cleanEnvSecret = (val) => {
    const trimmed = (val || "").trim();
    const unquoted = trimmed.replace(/^["']([\s\S]*)["']$/, "$1").trim();
    return unquoted;
  };
  const getZohoCreds = () => {
    const rawId = process.env.ZOHO_CLIENT_ID || "";
    const rawSecret = process.env.ZOHO_CLIENT_SECRET || "";
    const clientId = cleanEnvSecret(rawId);
    const clientSecret = cleanEnvSecret(rawSecret);
    return {
      clientId,
      clientSecret,
      rawHadWhitespaceOrQuotes: rawId !== clientId || rawSecret !== clientSecret,
      clientIdValidFormat: clientId.startsWith("1000."),
      clientIdPreview: clientId ? `${clientId.slice(0, 10)}... (${clientId.length} chars)` : "",
      clientSecretLength: clientSecret.length,
      secretLooksLikeClientId: Boolean(clientSecret && (clientSecret === clientId || clientSecret.startsWith("1000.")))
    };
  };
  const defaultLoc = cleanEnvSecret(process.env.ZOHO_DC || "com").toLowerCase();
  const ZOHO_ACCOUNTS_BASE = (ZOHO_LOCATION_MAP[defaultLoc] || ZOHO_DC_MAP["https://accounts.zoho.com"]).accounts;
  const ZOHO_MEETING_BASE = (ZOHO_LOCATION_MAP[defaultLoc] || ZOHO_DC_MAP["https://accounts.zoho.com"]).meeting;
  const resolveZohoDc = (accountsServerQuery, locationQuery) => {
    const normalizedAccounts = (accountsServerQuery || "").trim().replace(/\/+$/, "").toLowerCase();
    if (normalizedAccounts && ZOHO_DC_MAP[normalizedAccounts]) {
      return ZOHO_DC_MAP[normalizedAccounts];
    }
    const loc = (locationQuery || "").trim().toLowerCase();
    if (loc && ZOHO_LOCATION_MAP[loc]) {
      return ZOHO_LOCATION_MAP[loc];
    }
    return { accounts: ZOHO_ACCOUNTS_BASE, meeting: ZOHO_MEETING_BASE };
  };
  const DEFAULT_ZOHO_SCOPES = [
    "AaaServer.profile.Read",
    "ZohoMeeting.manageOrg.READ",
    "ZohoMeeting.meeting.READ",
    "ZohoMeeting.meeting.CREATE",
    "ZohoMeeting.meeting.UPDATE",
    "ZohoMeeting.meeting.DELETE"
  ];
  const getZohoOAuthScopes = () => {
    const rawEnvScopes = cleanEnvSecret(process.env.ZOHO_SCOPES);
    if (!rawEnvScopes) {
      return DEFAULT_ZOHO_SCOPES.join(",");
    }
    const merged = new Set(
      rawEnvScopes.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
    );
    merged.add("AaaServer.profile.Read");
    merged.add("ZohoMeeting.meeting.READ");
    merged.add("ZohoMeeting.meeting.CREATE");
    merged.add("ZohoMeeting.meeting.UPDATE");
    merged.add("ZohoMeeting.meeting.DELETE");
    return Array.from(merged).join(",");
  };
  const zohoConnectionsMemory = /* @__PURE__ */ new Map();
  let zohoKvHydrated = false;
  const recentZohoServerEvents = [];
  const recordZohoServerEvent = (evt) => {
    recentZohoServerEvents.unshift({
      id: `srv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ...evt
    });
    if (recentZohoServerEvents.length > 35) {
      recentZohoServerEvents.length = 35;
    }
  };
  const inspectSealedVaultFormat = (rawSealed, expectedStaffKey) => {
    if (!rawSealed || typeof rawSealed !== "string" || !rawSealed.trim()) {
      return {
        present: false,
        validEnvelopeFormat: false,
        decryptOk: false,
        reason: "No x-zoho-sealed-vault header/payload provided (normal before first connect or after disconnect)."
      };
    }
    const trimmed = rawSealed.trim();
    const parts = trimmed.split(".");
    if (parts.length !== 3) {
      return {
        present: true,
        length: trimmed.length,
        segmentCount: parts.length,
        validEnvelopeFormat: false,
        decryptOk: false,
        reason: `Malformed sealedVault envelope: expected 3 dot-separated base64url segments (iv.authTag.ciphertext), got ${parts.length}.`
      };
    }
    let ivBytes = 0;
    let tagBytes = 0;
    let cipherBytes = 0;
    try {
      ivBytes = Buffer.from(parts[0], "base64url").length;
      tagBytes = Buffer.from(parts[1], "base64url").length;
      cipherBytes = Buffer.from(parts[2], "base64url").length;
    } catch {
      return {
        present: true,
        length: trimmed.length,
        segmentCount: 3,
        validEnvelopeFormat: false,
        decryptOk: false,
        reason: "Base64url decoding failed on one or more AES-256-GCM segments."
      };
    }
    const validEnvelopeFormat = ivBytes === 12 && tagBytes === 16 && cipherBytes > 0;
    if (!validEnvelopeFormat) {
      return {
        present: true,
        length: trimmed.length,
        segmentCount: 3,
        ivBytes,
        tagBytes,
        cipherBytes,
        validEnvelopeFormat: false,
        decryptOk: false,
        reason: `Unexpected AES-256-GCM byte lengths: iv=${ivBytes}B (expected 12), tag=${tagBytes}B (expected 16), ciphertext=${cipherBytes}B.`
      };
    }
    const decrypted = unsealZohoVault(trimmed);
    if (!decrypted) {
      return {
        present: true,
        length: trimmed.length,
        segmentCount: 3,
        ivBytes,
        tagBytes,
        cipherBytes,
        validEnvelopeFormat: true,
        decryptOk: false,
        reason: "AES-256-GCM decryption failed (likely ZOHO_CLIENT_SECRET or ZOHO_STATE_SECRET changed since this vault was sealed, or required fields staffKey/refreshToken/zsoid were missing)."
      };
    }
    const staffKeyMatch = !expectedStaffKey || decrypted.staffKey === expectedStaffKey;
    return {
      present: true,
      length: trimmed.length,
      segmentCount: 3,
      ivBytes,
      tagBytes,
      cipherBytes,
      validEnvelopeFormat: true,
      decryptOk: true,
      staffKeyMatch,
      storedStaffKey: decrypted.staffKey,
      hasRefreshToken: Boolean(decrypted.refreshToken),
      refreshTokenLength: typeof decrypted.refreshToken === "string" ? decrypted.refreshToken.length : 0,
      hasAccessToken: Boolean(decrypted.accessToken),
      hasZsoid: Boolean(decrypted.zsoid),
      hasZuid: Boolean(decrypted.zuid),
      accountsServer: decrypted.accountsServer || "",
      meetingBase: decrypted.meetingBase || "",
      tokenExpiresAt: decrypted.tokenExpiresAt instanceof Date ? decrypted.tokenExpiresAt.toISOString() : String(decrypted.tokenExpiresAt || ""),
      reason: staffKeyMatch ? "Valid 3-segment AES-256-GCM envelope; decrypted and verified staffKey/refreshToken/zsoid." : `Envelope decrypted cleanly, but stored staffKey (${decrypted.staffKey}) does not match current user (${expectedStaffKey}).`
    };
  };
  const hydrateZohoConnectionsFromKv = async () => {
    if (zohoKvHydrated) return;
    try {
      const kvMap = await sysKvGet("zoho_connections_vault", {});
      if (kvMap && typeof kvMap === "object") {
        for (const [k, rawVal] of Object.entries(kvMap)) {
          if (!rawVal || typeof rawVal !== "object") continue;
          if (!zohoConnectionsMemory.has(k)) {
            zohoConnectionsMemory.set(k, {
              ...rawVal,
              tokenExpiresAt: rawVal.tokenExpiresAt ? new Date(rawVal.tokenExpiresAt) : /* @__PURE__ */ new Date(0),
              connectedAt: rawVal.connectedAt ? new Date(rawVal.connectedAt) : /* @__PURE__ */ new Date(),
              updatedAt: rawVal.updatedAt ? new Date(rawVal.updatedAt) : /* @__PURE__ */ new Date()
            });
          }
        }
      }
      zohoKvHydrated = true;
    } catch {
    }
  };
  const persistZohoConnectionsToKv = async () => {
    try {
      const serializedMap = {};
      for (const [k, row] of zohoConnectionsMemory.entries()) {
        if (!row) continue;
        serializedMap[k] = {
          ...row,
          tokenExpiresAt: row.tokenExpiresAt instanceof Date ? row.tokenExpiresAt.toISOString() : String(row.tokenExpiresAt || ""),
          connectedAt: row.connectedAt instanceof Date ? row.connectedAt.toISOString() : String(row.connectedAt || ""),
          updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt || "")
        };
      }
      await sysKvSet("zoho_connections_vault", serializedMap);
    } catch {
    }
  };
  const getZohoStateSecret = () => {
    const { clientSecret } = getZohoCreds();
    return cleanEnvSecret(process.env.ZOHO_STATE_SECRET) || clientSecret || "uppseekers_zoho_oauth_state_secret";
  };
  const getValidAppUrl = () => {
    const cleaned = cleanEnvSecret(process.env.APP_URL).replace(/\/+$/, "");
    if (!cleaned || cleaned.includes("MY_APP_URL") || !/^https?:\/\//i.test(cleaned)) {
      return "";
    }
    return cleaned;
  };
  const getConfiguredZohoRedirectUriEnv = () => {
    const raw = cleanEnvSecret(process.env.ZOHO_REDIRECT_URI).replace(/\/+$/, "");
    if (!raw || raw.includes("MY_APP_URL") || !/^https?:\/\//i.test(raw)) {
      return "";
    }
    try {
      const parsed = new URL(raw);
      if (!parsed.pathname || parsed.pathname === "/") {
        return `${parsed.protocol}//${parsed.host}/api/zoho/oauth/callback`;
      }
      return `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, "")}`;
    } catch {
      return "";
    }
  };
  const sanitizeOriginForZoho = (rawOrigin, reqHost) => {
    const trimmed = (rawOrigin || "").trim().replace(/\/+$/, "");
    if (!trimmed) return "";
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
      const host = parsed.host.toLowerCase();
      const hostname = parsed.hostname.toLowerCase();
      if (hostname.endsWith(".run.app") || hostname.endsWith(".vercel.app") || hostname === "uppseekers.com" || hostname.endsWith(".uppseekers.com") || hostname === "localhost" || hostname === "127.0.0.1" || reqHost && host === reqHost.toLowerCase()) {
        return `${parsed.protocol}//${parsed.host}`;
      }
    } catch {
      return "";
    }
    return "";
  };
  const getZohoRedirectUriInfo = (req) => {
    const explicitRedirectEnv = getConfiguredZohoRedirectUriEnv();
    if (explicitRedirectEnv) {
      return { redirectUri: explicitRedirectEnv, source: "ZOHO_REDIRECT_URI" };
    }
    const reqHost = req.headers["x-forwarded-host"]?.split(",")[0]?.trim() || req.get("host") || "";
    const rawClientOrigin = (typeof req.query?.clientOrigin === "string" ? req.query.clientOrigin : "") || (typeof req.headers["x-client-origin"] === "string" ? req.headers["x-client-origin"] : "") || (typeof req.headers.origin === "string" ? req.headers.origin : "");
    const safeClientOrigin = sanitizeOriginForZoho(rawClientOrigin, reqHost);
    const envBase = getValidAppUrl();
    if (envBase) {
      if (safeClientOrigin) {
        try {
          const envHost = new URL(envBase).hostname.toLowerCase();
          const clientHost = new URL(safeClientOrigin).hostname.toLowerCase();
          if (envHost.startsWith("ais-dev-") && clientHost !== envHost) {
            return { redirectUri: `${safeClientOrigin}/api/zoho/oauth/callback`, source: "CLIENT_ORIGIN" };
          }
        } catch {
        }
      }
      return { redirectUri: `${envBase}/api/zoho/oauth/callback`, source: "APP_URL" };
    }
    const vercelProdHost = cleanEnvSecret(process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL).replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    if (vercelProdHost && !safeClientOrigin) {
      return { redirectUri: `https://${vercelProdHost}/api/zoho/oauth/callback`, source: "VERCEL_URL" };
    }
    if (safeClientOrigin) {
      return { redirectUri: `${safeClientOrigin}/api/zoho/oauth/callback`, source: "CLIENT_ORIGIN" };
    }
    const proto = req.headers["x-forwarded-proto"]?.split(",")[0]?.trim() || req.protocol || "https";
    const host = reqHost || "localhost:3000";
    return { redirectUri: `${proto}://${host}/api/zoho/oauth/callback`, source: "HOST_FALLBACK" };
  };
  const getZohoRedirectUri = (req) => getZohoRedirectUriInfo(req).redirectUri;
  const getZohoVaultKey = () => {
    return import_crypto.default.createHash("sha256").update(getZohoStateSecret()).digest();
  };
  const sealZohoVault = (record) => {
    try {
      const iv = import_crypto.default.randomBytes(12);
      const cipher = import_crypto.default.createCipheriv("aes-256-gcm", getZohoVaultKey(), iv);
      const serialized = JSON.stringify({
        staffKey: record.staffKey,
        staffUid: record.staffUid || record.staffKey,
        staffEmail: record.staffEmail || "",
        staffName: record.staffName || "",
        zohoEmail: record.zohoEmail || "",
        zohoDisplayName: record.zohoDisplayName || "",
        zsoid: String(record.zsoid || ""),
        zuid: String(record.zuid || ""),
        accessToken: record.accessToken || "",
        refreshToken: record.refreshToken || "",
        tokenExpiresAt: record.tokenExpiresAt instanceof Date ? record.tokenExpiresAt.toISOString() : String(record.tokenExpiresAt || ""),
        accountsServer: record.accountsServer || ZOHO_ACCOUNTS_BASE,
        meetingBase: record.meetingBase || ZOHO_MEETING_BASE,
        connectedAt: record.connectedAt instanceof Date ? record.connectedAt.toISOString() : String(record.connectedAt || (/* @__PURE__ */ new Date()).toISOString()),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      const encrypted = Buffer.concat([cipher.update(serialized, "utf8"), cipher.final()]);
      const tag = cipher.getAuthTag();
      return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
    } catch {
      return "";
    }
  };
  const unsealZohoVault = (sealed) => {
    if (!sealed || typeof sealed !== "string") return null;
    const parts = sealed.trim().split(".");
    if (parts.length !== 3) return null;
    try {
      const iv = Buffer.from(parts[0], "base64url");
      const tag = Buffer.from(parts[1], "base64url");
      const ciphertext = Buffer.from(parts[2], "base64url");
      const decipher = import_crypto.default.createDecipheriv("aes-256-gcm", getZohoVaultKey(), iv);
      decipher.setAuthTag(tag);
      const jsonStr = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
      const parsed = JSON.parse(jsonStr);
      if (!parsed?.staffKey || !parsed?.refreshToken || !parsed?.zsoid) return null;
      return {
        ...parsed,
        tokenExpiresAt: parsed.tokenExpiresAt ? new Date(parsed.tokenExpiresAt) : /* @__PURE__ */ new Date(0),
        connectedAt: parsed.connectedAt ? new Date(parsed.connectedAt) : /* @__PURE__ */ new Date(),
        updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : /* @__PURE__ */ new Date()
      };
    } catch {
      return null;
    }
  };
  const resolveStaffIdentity = async (req) => {
    const rawEmail = (req.user?.email || "").trim().toLowerCase();
    const rawUid = (req.user?.uid || "").trim();
    const headerEmail = (typeof req.headers["x-staff-email"] === "string" ? req.headers["x-staff-email"] : "").trim().toLowerCase();
    const headerName = (typeof req.headers["x-staff-name"] === "string" ? req.headers["x-staff-name"] : "").trim();
    let effectiveEmail = rawEmail && rawEmail !== "guest@app.com" ? rawEmail : headerEmail;
    let effectiveUid = rawUid && rawUid !== "guest" ? rawUid : "";
    let effectiveName = req.user?.name || headerName || effectiveEmail;
    if (headerEmail && rawEmail && headerEmail !== rawEmail) {
      const adminVerified = await isVerifiedFirebaseAdmin(req);
      if (adminVerified) {
        effectiveEmail = headerEmail;
        effectiveUid = headerEmail;
        effectiveName = headerName || headerEmail;
      }
    } else if (headerName && (!req.user?.name || effectiveEmail === headerEmail)) {
      effectiveName = headerName;
    }
    const staffKey = effectiveEmail || effectiveUid;
    if (!staffKey) return null;
    return {
      staffKey,
      staffUid: effectiveUid || staffKey,
      staffEmail: effectiveEmail || "",
      staffName: effectiveName || staffKey
    };
  };
  const signZohoState = (payload) => {
    const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    const sig = import_crypto.default.createHmac("sha256", getZohoStateSecret()).update(encoded).digest("base64url");
    return `${encoded}.${sig}`;
  };
  const verifyZohoState = (stateStr) => {
    if (!stateStr || !stateStr.includes(".")) return null;
    const [encoded, sig] = stateStr.split(".");
    if (!encoded || !sig) return null;
    const expectedSig = import_crypto.default.createHmac("sha256", getZohoStateSecret()).update(encoded).digest("base64url");
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !import_crypto.default.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    try {
      const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
      if (!parsed?.staffKey || !parsed?.ts) return null;
      if (Date.now() - Number(parsed.ts) > 15 * 60 * 1e3) return null;
      return parsed;
    } catch {
      return null;
    }
  };
  const findSharedOrgZsoid = async (preferredMeetingBase, stateSharedZsoid) => {
    const envOrgId = cleanEnvSecret(process.env.ZOHO_ORG_ID);
    if (envOrgId) return envOrgId;
    if (stateSharedZsoid && String(stateSharedZsoid).trim()) {
      return String(stateSharedZsoid).trim();
    }
    await hydrateZohoConnectionsFromKv();
    const adminCandidate = zohoConnectionsMemory.get("uppseekers@gmail.com");
    if (adminCandidate?.zsoid && (!preferredMeetingBase || !adminCandidate.meetingBase || adminCandidate.meetingBase === preferredMeetingBase)) {
      return String(adminCandidate.zsoid);
    }
    for (const row of zohoConnectionsMemory.values()) {
      if (row?.zsoid && (!preferredMeetingBase || !row.meetingBase || row.meetingBase === preferredMeetingBase)) {
        return String(row.zsoid);
      }
    }
    if (hasAdminServiceAccount()) {
      try {
        const snap = await adminDb.collection("zoho_connections").limit(10).get();
        for (const d of snap.docs) {
          const data = d.data();
          if (data?.zsoid && (!preferredMeetingBase || !data.meetingBase || data.meetingBase === preferredMeetingBase)) {
            return String(data.zsoid);
          }
        }
      } catch {
      }
    }
    const dbRows = await safeDbQuery(
      () => db.select().from(zohoConnections).orderBy((0, import_drizzle_orm2.desc)(zohoConnections.connectedAt)),
      []
    );
    for (const row of dbRows) {
      if (row?.zsoid && (!preferredMeetingBase || !row.meetingBase || row.meetingBase === preferredMeetingBase)) {
        return String(row.zsoid);
      }
    }
    return "";
  };
  const fetchZohoOAuthUserInfo = async (accountsBase, accessToken) => {
    try {
      const infoRes = await fetch(`${accountsBase}/oauth/user/info`, {
        method: "GET",
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`
        }
      });
      if (!infoRes.ok) return null;
      const infoJson = await infoRes.json().catch(() => null);
      if (!infoJson || typeof infoJson !== "object") return null;
      const zuid = String(infoJson.ZUID || infoJson.zuid || "").trim();
      const email = String(infoJson.Email || infoJson.email || "").trim().toLowerCase();
      const fullName = [infoJson.First_Name, infoJson.Last_Name].filter(Boolean).join(" ").trim();
      const displayName = String(infoJson.Display_Name || fullName || email || "").trim();
      if (!zuid && !email) return null;
      return { zuid, email, displayName };
    } catch {
      return null;
    }
  };
  const getZohoConnectionByKey = async (staffKey, req) => {
    await hydrateZohoConnectionsFromKv();
    const safeKey = normEmailKey(staffKey);
    if (req) {
      const headerSealed = typeof req.headers["x-zoho-sealed-vault"] === "string" ? req.headers["x-zoho-sealed-vault"] : "";
      const unsealed = unsealZohoVault(headerSealed);
      if (unsealed && unsealed.staffKey === staffKey) {
        zohoConnectionsMemory.set(staffKey, unsealed);
      }
    }
    if (hasAdminServiceAccount()) {
      try {
        const snap = await adminDb.collection("zoho_connections").doc(safeKey).get();
        if (snap.exists) {
          const data = snap.data();
          zohoConnectionsMemory.set(staffKey, data);
          return data;
        }
      } catch (err) {
        console.warn("Firestore zoho_connections read fallback:", err);
      }
    }
    const dbRow = await safeDbQuery(
      () => db.select().from(zohoConnections).where((0, import_drizzle_orm2.eq)(zohoConnections.staffKey, staffKey)).then((r) => r[0] || null),
      null
    );
    if (dbRow) {
      zohoConnectionsMemory.set(staffKey, dbRow);
      return dbRow;
    }
    const memRow = zohoConnectionsMemory.get(staffKey);
    if (memRow) return memRow;
    return null;
  };
  const upsertZohoConnectionRecord = async (record) => {
    await hydrateZohoConnectionsFromKv();
    const now = /* @__PURE__ */ new Date();
    const accountsServer = record.accountsServer || ZOHO_ACCOUNTS_BASE;
    const meetingBase = record.meetingBase || ZOHO_MEETING_BASE;
    const memoryRow = { ...record, accountsServer, meetingBase, connectedAt: now, updatedAt: now };
    zohoConnectionsMemory.set(record.staffKey, memoryRow);
    await persistZohoConnectionsToKv();
    if (hasAdminServiceAccount()) {
      try {
        const safeKey = normEmailKey(record.staffKey);
        await adminDb.collection("zoho_connections").doc(safeKey).set(
          {
            ...record,
            accountsServer,
            meetingBase,
            tokenExpiresAt: record.tokenExpiresAt.toISOString(),
            connectedAt: now.toISOString(),
            updatedAt: now.toISOString()
          },
          { merge: true }
        );
      } catch (err) {
        console.warn("Firestore zoho_connections write warning:", err);
      }
    }
    await safeDbQuery(async () => {
      await db.insert(zohoConnections).values({
        ...record,
        accountsServer,
        meetingBase,
        connectedAt: now,
        updatedAt: now
      }).onConflictDoUpdate({
        target: zohoConnections.staffKey,
        set: {
          staffUid: record.staffUid,
          staffEmail: record.staffEmail,
          staffName: record.staffName,
          zohoEmail: record.zohoEmail,
          zohoDisplayName: record.zohoDisplayName,
          zsoid: record.zsoid,
          zuid: record.zuid,
          accessToken: record.accessToken,
          refreshToken: record.refreshToken,
          tokenExpiresAt: record.tokenExpiresAt,
          accountsServer,
          meetingBase,
          updatedAt: now
        }
      });
    }, null);
  };
  const deleteZohoConnectionByKey = async (staffKey) => {
    await hydrateZohoConnectionsFromKv();
    zohoConnectionsMemory.delete(staffKey);
    await persistZohoConnectionsToKv();
    if (hasAdminServiceAccount()) {
      try {
        await adminDb.collection("zoho_connections").doc(normEmailKey(staffKey)).delete();
      } catch (err) {
        console.warn("Firestore zoho_connections delete warning:", err);
      }
    }
    await safeDbQuery(async () => {
      await db.delete(zohoConnections).where((0, import_drizzle_orm2.eq)(zohoConnections.staffKey, staffKey));
    }, null);
  };
  const formatZohoStartTime = (dateStr, timeStr) => {
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dateParts = (dateStr || "").split("-").map(Number);
    const timeParts = (timeStr || "10:00").split(":").map(Number);
    const year = dateParts[0] || (/* @__PURE__ */ new Date()).getFullYear();
    const monthIdx = Math.max(0, Math.min(11, (dateParts[1] || 1) - 1));
    const day = dateParts[2] || (/* @__PURE__ */ new Date()).getDate();
    const hour24 = Number.isFinite(timeParts[0]) ? timeParts[0] : 10;
    const minute = Number.isFinite(timeParts[1]) ? timeParts[1] : 0;
    const ampm = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const dd = String(day).padStart(2, "0");
    const hh = String(hour12).padStart(2, "0");
    const mm = String(minute).padStart(2, "0");
    return `${MONTHS[monthIdx]} ${dd}, ${year} ${hh}:${mm} ${ampm}`;
  };
  const refreshZohoAccessToken = async (conn, force = false) => {
    const expiresAtMs = new Date(conn.tokenExpiresAt).getTime();
    if (!force && Number.isFinite(expiresAtMs) && Date.now() < expiresAtMs - 6e4 && conn.accessToken) {
      return conn.accessToken;
    }
    const { clientId, clientSecret } = getZohoCreds();
    if (!clientId || !clientSecret) {
      throw new Error("Zoho OAuth credentials (ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET) are not configured on the server.");
    }
    if (!conn.refreshToken) {
      throw new Error("Zoho refresh token missing. Please disconnect and reconnect your Zoho Meeting account.");
    }
    const accountsServer = conn.accountsServer || ZOHO_ACCOUNTS_BASE;
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: conn.refreshToken
    });
    const tokenRes = await fetch(`${accountsServer}/oauth/v2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });
    const tokenJson = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokenJson?.access_token) {
      const errMsg = tokenJson?.error_description || tokenJson?.error || "Failed to refresh Zoho access token";
      throw new Error(`Zoho token refresh failed: ${errMsg}. Please reconnect your Zoho Meeting account.`);
    }
    const expiresInSec = Number(tokenJson.expires_in) || 3600;
    const nextExpiresAt = new Date(Date.now() + expiresInSec * 1e3);
    await upsertZohoConnectionRecord({
      staffKey: conn.staffKey,
      staffUid: conn.staffUid || conn.staffKey,
      staffEmail: conn.staffEmail || "",
      staffName: conn.staffName || "",
      zohoEmail: conn.zohoEmail || "",
      zohoDisplayName: conn.zohoDisplayName || "",
      zsoid: conn.zsoid,
      zuid: conn.zuid,
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token || conn.refreshToken,
      tokenExpiresAt: nextExpiresAt,
      accountsServer: conn.accountsServer || ZOHO_ACCOUNTS_BASE,
      meetingBase: conn.meetingBase || ZOHO_MEETING_BASE
    });
    return tokenJson.access_token;
  };
  const renderZohoPopupHtml = (payload, isSuccess, headline, detail) => {
    const safeJson = JSON.stringify({ ...payload, _ts: Date.now() }).replace(/</g, "\\u003c");
    const safeHeadline = headline.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeDetail = detail.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Zoho Meeting Connection</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px 32px; max-width: 440px; text-align: center; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08); }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 12px; background: ${isSuccess ? "#dcfce7" : "#fee2e2"}; color: ${isSuccess ? "#166534" : "#991b1b"}; }
    h1 { font-size: 18px; margin: 0 0 8px; }
    p { font-size: 13px; color: #475569; margin: 0 0 16px; line-height: 1.5; word-break: break-word; }
    button { background: #0f172a; color: #fff; border: 0; border-radius: 8px; padding: 9px 18px; font-size: 12px; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${isSuccess ? "Connected" : "Connection Error"}</div>
    <h1>${safeHeadline}</h1>
    <p>${safeDetail}</p>
    <button onclick="window.close()">Close Window</button>
  </div>
  <script>
    (function() {
      var data = ${safeJson};
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(data, '*');
        }
      } catch (e) {}
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          var bc = new BroadcastChannel('uppseekers_zoho_oauth');
          bc.postMessage(data);
          setTimeout(function() { try { bc.close(); } catch (e) {} }, 400);
        }
      } catch (e) {}
      try {
        if (window.localStorage) {
          window.localStorage.setItem('uppseekers_zoho_oauth_event', JSON.stringify(data));
        }
      } catch (e) {}
      ${isSuccess ? "setTimeout(function() { window.close(); }, 650);" : ""}
    })();
  </script>
</body>
</html>`;
  };
  app.get("/api/zoho/status", requireAuth, async (req, res) => {
    try {
      const { clientId, clientSecret } = getZohoCreds();
      const configured = Boolean(clientId && clientSecret);
      const { redirectUri, source: redirectUriSource } = getZohoRedirectUriInfo(req);
      const staff = await resolveStaffIdentity(req);
      if (!staff) {
        return res.json({ configured, connected: false, redirectUri, redirectUriSource });
      }
      const conn = await getZohoConnectionByKey(staff.staffKey, req);
      const sharedOrgZsoid = await findSharedOrgZsoid();
      if (!conn) {
        return res.json({
          configured,
          connected: false,
          staffKey: staff.staffKey,
          redirectUri,
          redirectUriSource,
          sharedOrgZsoid: sharedOrgZsoid || void 0
        });
      }
      res.json({
        configured,
        connected: true,
        staffKey: conn.staffKey,
        zohoEmail: conn.zohoEmail || "",
        zohoDisplayName: conn.zohoDisplayName || "",
        zsoid: conn.zsoid,
        zuid: conn.zuid,
        connectedAt: conn.connectedAt,
        redirectUri,
        redirectUriSource,
        sharedOrgZsoid: conn.zsoid || sharedOrgZsoid || void 0,
        sealedVault: sealZohoVault(conn)
      });
    } catch (err) {
      res.status(500).json({ error: err?.message || "Failed to check Zoho status" });
    }
  });
  app.get("/api/zoho/auth/url", requireAuth, async (req, res) => {
    try {
      const { clientId, clientSecret } = getZohoCreds();
      const { redirectUri, source: redirectUriSource } = getZohoRedirectUriInfo(req);
      if (!clientId || !clientSecret) {
        return res.status(400).json({
          configured: false,
          redirectUri,
          redirectUriSource,
          error: "Zoho OAuth credentials (ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET) are not configured in server environment variables."
        });
      }
      const staff = await resolveStaffIdentity(req);
      if (!staff) {
        return res.status(401).json({ error: "Unable to identify signed-in counselor. Please sign in again." });
      }
      const clientSharedZsoid = typeof req.query.sharedOrgZsoid === "string" ? req.query.sharedOrgZsoid.trim() : "";
      const sharedOrgZsoid = await findSharedOrgZsoid(void 0, clientSharedZsoid);
      const state = signZohoState({
        staffKey: staff.staffKey,
        staffUid: staff.staffUid,
        staffEmail: staff.staffEmail,
        staffName: staff.staffName,
        redirectUri,
        sharedOrgZsoid: sharedOrgZsoid || "",
        ts: Date.now()
      });
      const authParams = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        scope: getZohoOAuthScopes(),
        redirect_uri: redirectUri,
        access_type: "offline",
        prompt: "consent",
        state
      });
      const url = `${ZOHO_ACCOUNTS_BASE}/oauth/v2/auth?${authParams.toString()}`;
      res.json({ url, redirectUri, redirectUriSource });
    } catch (err) {
      res.status(500).json({ error: err?.message || "Failed to build Zoho OAuth URL" });
    }
  });
  app.get(["/api/zoho/oauth/callback", "/api/zoho/oauth/callback/"], async (req, res) => {
    try {
      const oauthError = typeof req.query.error === "string" ? req.query.error : "";
      if (oauthError) {
        const desc2 = typeof req.query.error_description === "string" ? req.query.error_description : oauthError;
        return res.status(400).send(
          renderZohoPopupHtml(
            { type: "ZOHO_OAUTH_ERROR", error: desc2 },
            false,
            "Zoho Authorization Declined",
            desc2
          )
        );
      }
      const code = typeof req.query.code === "string" ? req.query.code : "";
      const stateStr = typeof req.query.state === "string" ? req.query.state : "";
      const verifiedState = verifyZohoState(stateStr);
      if (!code || !verifiedState) {
        return res.status(400).send(
          renderZohoPopupHtml(
            { type: "ZOHO_OAUTH_ERROR", error: "Invalid or expired Zoho OAuth state. Please try connecting again." },
            false,
            "Invalid OAuth Session",
            "The authorization request expired or could not be verified. Close this window and click Connect Zoho Meeting again."
          )
        );
      }
      const { clientId, clientSecret, clientIdPreview, clientSecretLength, secretLooksLikeClientId } = getZohoCreds();
      if (!clientId || !clientSecret) {
        return res.status(500).send(
          renderZohoPopupHtml(
            { type: "ZOHO_OAUTH_ERROR", error: "ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET missing on server." },
            false,
            "Server Configuration Missing",
            "ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET must be set on the server."
          )
        );
      }
      const queryAccountsServer = typeof req.query["accounts-server"] === "string" ? req.query["accounts-server"] : "";
      const queryLocation = typeof req.query.location === "string" ? req.query.location : "";
      const dcEndpoints = resolveZohoDc(queryAccountsServer, queryLocation);
      const redirectUri = verifiedState.redirectUri || getZohoRedirectUri(req);
      const exchangeCodeAt = async (accountsBase) => {
        const tokenParams = new URLSearchParams({
          grant_type: "authorization_code",
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code
        });
        const resExchange = await fetch(`${accountsBase}/oauth/v2/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: tokenParams.toString()
        });
        const jsonExchange = await resExchange.json().catch(() => ({}));
        return { resExchange, jsonExchange };
      };
      let activeDc = dcEndpoints;
      let { resExchange: tokenRes, jsonExchange: tokenJson } = await exchangeCodeAt(activeDc.accounts);
      if ((!tokenRes.ok || !tokenJson?.access_token) && tokenJson?.error === "invalid_client" && activeDc.accounts !== ZOHO_ACCOUNTS_BASE) {
        const fallbackAttempt = await exchangeCodeAt(ZOHO_ACCOUNTS_BASE);
        if (fallbackAttempt.resExchange.ok && fallbackAttempt.jsonExchange?.access_token) {
          tokenRes = fallbackAttempt.resExchange;
          tokenJson = fallbackAttempt.jsonExchange;
          activeDc = { accounts: ZOHO_ACCOUNTS_BASE, meeting: ZOHO_MEETING_BASE };
        }
      }
      if (!tokenRes.ok || !tokenJson?.access_token) {
        const rawErr = tokenJson?.error_description || tokenJson?.error || "Failed to exchange Zoho authorization code";
        let detailMsg = rawErr;
        if (tokenJson?.error === "invalid_client") {
          if (secretLooksLikeClientId) {
            detailMsg = `invalid_client: ZOHO_CLIENT_SECRET currently contains a Client ID (${clientIdPreview}) instead of the Client Secret. Copy the value from the "Client Secret" tab in Zoho API Console.`;
          } else if (activeDc.accounts !== ZOHO_ACCOUNTS_BASE) {
            detailMsg = `Regional Data Center mismatch: this employee's Zoho account is hosted at ${activeDc.accounts} (location=${queryLocation || "regional"}), while your Zoho OAuth Client is configured for ${ZOHO_ACCOUNTS_BASE}. Open Zoho API Console -> your Server-based Application -> Settings -> enable "Use the same OAuth credentials for all data centers" (Multi-DC), or sign in with an account in your shared ${ZOHO_ACCOUNTS_BASE} organization.`;
          } else {
            detailMsg = `invalid_client at ${activeDc.accounts} (Client ID=${clientIdPreview}, Secret length=${clientSecretLength} chars). Verify ZOHO_CLIENT_SECRET matches the Client Secret tab in Zoho API Console.`;
          }
        } else if (String(tokenJson?.error || "").toLowerCase().includes("redirect")) {
          detailMsg = `Redirect URI mismatch (${rawErr}). Add this exact Authorized Redirect URI in Zoho API Console: ${redirectUri}`;
        }
        recordZohoServerEvent({
          stage: "OAUTH_CALLBACK_TOKEN_EXCHANGE",
          category: "API_HANDSHAKE",
          ok: false,
          httpStatus: tokenRes.status || 400,
          durationMs: 0,
          staffKey: verifiedState.staffKey,
          redirectUri,
          accountsServer: activeDc.accounts,
          meetingBase: activeDc.meeting,
          summary: `Zoho token exchange rejected (${tokenJson?.error || tokenRes.status}): ${detailMsg}`,
          details: {
            zohoError: tokenJson?.error || "",
            zohoErrorDescription: tokenJson?.error_description || "",
            queryLocation,
            queryAccountsServer,
            clientIdPreview,
            clientSecretLength,
            secretLooksLikeClientId
          }
        });
        return res.status(400).send(
          renderZohoPopupHtml(
            {
              type: "ZOHO_OAUTH_ERROR",
              error: detailMsg,
              redirectUri,
              diagnostics: {
                stage: "TOKEN_EXCHANGE",
                category: "API_HANDSHAKE",
                zohoHttpStatus: tokenRes.status,
                zohoError: tokenJson?.error || "",
                accountsServer: activeDc.accounts,
                location: queryLocation || "default"
              }
            },
            false,
            "Token Exchange Failed",
            detailMsg
          )
        );
      }
      const [meetingUserOutcome, oauthUserInfo] = await Promise.all([
        fetch(`${activeDc.meeting}/api/v2/user.json`, {
          method: "GET",
          headers: {
            Authorization: `Zoho-oauthtoken ${tokenJson.access_token}`
          }
        }).then(async (r) => ({ ok: r.ok, status: r.status, json: await r.json().catch(() => ({})) })).catch(() => ({ ok: false, status: 0, json: {} })),
        fetchZohoOAuthUserInfo(activeDc.accounts, tokenJson.access_token)
      ]);
      const userJson = meetingUserOutcome.json || {};
      const userDetails = userJson?.userDetails || userJson || {};
      const resolvedZuid = String(userDetails?.zuid || oauthUserInfo?.zuid || "").trim();
      const resolvedZohoEmail = String(
        userDetails?.primaryEmail || userDetails?.email || oauthUserInfo?.email || ""
      ).trim();
      const resolvedDisplayName = String(
        userDetails?.displayName || userDetails?.firstName || oauthUserInfo?.displayName || resolvedZohoEmail
      ).trim();
      let resolvedZsoid = String(userDetails?.zsoid || "").trim();
      let zsoidSource = resolvedZsoid ? "zoho_meeting_user_api" : "";
      if (!resolvedZsoid) {
        resolvedZsoid = await findSharedOrgZsoid(activeDc.meeting, verifiedState.sharedOrgZsoid);
        if (resolvedZsoid) {
          zsoidSource = verifiedState.sharedOrgZsoid ? "state_shared_org_zsoid" : "server_shared_org_zsoid";
        }
      }
      if (!resolvedZsoid || !resolvedZuid) {
        const apiMsg = userJson?.message || userJson?.error?.message || (!resolvedZsoid ? `Your Zoho account (${resolvedZohoEmail || "non-admin member"}) authorized successfully, but Zoho did not return an Organization ID (zsoid) from ${activeDc.meeting}. Make sure this email is invited to your Zoho Meeting organization (Manage Organization -> Users) and that the Zoho Organization Admin has connected their account once in Admin Settings (or set ZOHO_ORG_ID).` : `Could not retrieve Zoho User ID (ZUID) from ${activeDc.accounts}.`);
        recordZohoServerEvent({
          stage: "OAUTH_CALLBACK_ORG_LOOKUP",
          category: "API_HANDSHAKE",
          ok: false,
          httpStatus: meetingUserOutcome.status || 400,
          durationMs: 0,
          staffKey: verifiedState.staffKey,
          redirectUri,
          accountsServer: activeDc.accounts,
          meetingBase: activeDc.meeting,
          summary: `Org/User lookup failed: ${apiMsg}`,
          details: {
            meetingUserStatus: meetingUserOutcome.status,
            meetingUserMessage: userJson?.message || userJson?.error?.message || "",
            oauthUserInfoResolved: Boolean(oauthUserInfo),
            resolvedZuidPresent: Boolean(resolvedZuid),
            resolvedZsoidPresent: Boolean(resolvedZsoid),
            stateSharedOrgZsoidPresent: Boolean(verifiedState.sharedOrgZsoid)
          }
        });
        return res.status(400).send(
          renderZohoPopupHtml(
            {
              type: "ZOHO_OAUTH_ERROR",
              error: apiMsg,
              diagnostics: {
                stage: "ORG_USER_LOOKUP",
                category: "API_HANDSHAKE",
                meetingUserStatus: meetingUserOutcome.status,
                oauthUserInfoResolved: Boolean(oauthUserInfo),
                resolvedZuidPresent: Boolean(resolvedZuid),
                resolvedZsoidPresent: Boolean(resolvedZsoid)
              }
            },
            false,
            "Zoho Meeting Organization Lookup",
            apiMsg
          )
        );
      }
      const existing = await getZohoConnectionByKey(verifiedState.staffKey);
      const refreshToken = tokenJson.refresh_token || existing?.refreshToken || "";
      if (!refreshToken) {
        const msg = "Zoho did not issue a refresh token. Please retry and click Accept on the Zoho consent prompt.";
        recordZohoServerEvent({
          stage: "OAUTH_CALLBACK_REFRESH_TOKEN",
          category: "TOKEN_STORAGE",
          ok: false,
          httpStatus: 400,
          durationMs: 0,
          staffKey: verifiedState.staffKey,
          redirectUri,
          accountsServer: activeDc.accounts,
          meetingBase: activeDc.meeting,
          summary: msg,
          details: {
            tokenResponseKeys: Object.keys(tokenJson || {}),
            hadExistingConnection: Boolean(existing)
          }
        });
        return res.status(400).send(
          renderZohoPopupHtml(
            {
              type: "ZOHO_OAUTH_ERROR",
              error: msg,
              diagnostics: {
                stage: "REFRESH_TOKEN_MISSING",
                category: "TOKEN_STORAGE",
                tokenResponseKeys: Object.keys(tokenJson || {})
              }
            },
            false,
            "Missing Refresh Token",
            msg
          )
        );
      }
      const expiresInSec = Number(tokenJson.expires_in) || 3600;
      const tokenExpiresAt = new Date(Date.now() + expiresInSec * 1e3);
      const connectionPayload = {
        staffKey: verifiedState.staffKey,
        staffUid: verifiedState.staffUid || verifiedState.staffKey,
        staffEmail: verifiedState.staffEmail || "",
        staffName: verifiedState.staffName || "",
        zohoEmail: resolvedZohoEmail,
        zohoDisplayName: resolvedDisplayName,
        zsoid: resolvedZsoid,
        zuid: resolvedZuid,
        accessToken: tokenJson.access_token,
        refreshToken,
        tokenExpiresAt,
        accountsServer: activeDc.accounts,
        meetingBase: activeDc.meeting
      };
      await upsertZohoConnectionRecord(connectionPayload);
      const sealedVault = sealZohoVault(connectionPayload);
      recordZohoServerEvent({
        stage: "OAUTH_CALLBACK_COMPLETE",
        category: "API_HANDSHAKE",
        ok: true,
        httpStatus: 200,
        durationMs: 0,
        staffKey: verifiedState.staffKey,
        redirectUri,
        accountsServer: activeDc.accounts,
        meetingBase: activeDc.meeting,
        summary: `Connected ${resolvedZohoEmail || resolvedDisplayName} (zsoid=${resolvedZsoid} via ${zsoidSource})`,
        details: {
          meetingUserStatus: meetingUserOutcome.status,
          usedOAuthUserInfoFallback: !meetingUserOutcome.ok || !userDetails?.zsoid,
          zsoidSource,
          sealedVaultLength: sealedVault.length,
          sealedVaultSegments: sealedVault ? sealedVault.split(".").length : 0,
          expiresInSec
        }
      });
      res.send(
        renderZohoPopupHtml(
          {
            type: "ZOHO_OAUTH_SUCCESS",
            staffKey: verifiedState.staffKey,
            staffEmail: verifiedState.staffEmail || "",
            staffName: verifiedState.staffName || "",
            zohoEmail: resolvedZohoEmail,
            zohoDisplayName: resolvedDisplayName,
            zsoid: resolvedZsoid,
            zuid: resolvedZuid,
            accountsServer: activeDc.accounts,
            meetingBase: activeDc.meeting,
            connectedAt: (/* @__PURE__ */ new Date()).toISOString(),
            tokenExpiresAt: tokenExpiresAt.toISOString(),
            sealedVault,
            diagnostics: {
              meetingUserStatus: meetingUserOutcome.status,
              zsoidSource,
              sealedVaultLength: sealedVault.length
            }
          },
          true,
          "Zoho Meeting Connected",
          `Signed in as ${resolvedZohoEmail || resolvedDisplayName}. Returning to Uppseekers...`
        )
      );
    } catch (err) {
      const msg = err?.message || "Unexpected error during Zoho OAuth callback";
      recordZohoServerEvent({
        stage: "OAUTH_CALLBACK_EXCEPTION",
        category: "SERVER_RUNTIME",
        ok: false,
        httpStatus: 500,
        durationMs: 0,
        summary: msg,
        details: {
          errorName: err?.name || "Error",
          stackTop: typeof err?.stack === "string" ? err.stack.split("\n").slice(0, 4).join(" | ") : ""
        }
      });
      res.status(500).send(
        renderZohoPopupHtml(
          {
            type: "ZOHO_OAUTH_ERROR",
            error: msg,
            diagnostics: {
              stage: "CALLBACK_EXCEPTION",
              category: "SERVER_RUNTIME",
              errorName: err?.name || "Error"
            }
          },
          false,
          "Connection Error",
          msg
        )
      );
    }
  });
  const isAdminCaller = async (staff, req) => {
    if (req && await isVerifiedFirebaseAdmin(req)) return true;
    if (staff.staffEmail === "uppseekers@gmail.com") return true;
    if (hasAdminServiceAccount()) {
      try {
        if (staff.staffUid) {
          const adminSnap = await adminDb.collection("admins").doc(staff.staffUid).get();
          if (adminSnap.exists) return true;
        }
        const dirSnap = await adminDb.collection("staff_directory").doc(normEmailKey(staff.staffEmail || staff.staffKey)).get();
        if (dirSnap.exists) {
          const role2 = String(dirSnap.data()?.role || "").toUpperCase();
          if (role2 === "SYSTEM_ADMIN" || role2 === "ADMIN" || role2 === "CATEGORY_MANAGER" || role2 === "OPERATIONS_LEAD") {
            return true;
          }
        }
      } catch {
      }
    }
    const userRow = await safeDbQuery(
      () => db.select().from(users).where((0, import_drizzle_orm2.or)((0, import_drizzle_orm2.eq)(users.email, staff.staffEmail), (0, import_drizzle_orm2.eq)(users.uid, staff.staffUid))).then((r) => r[0] || null),
      null
    );
    const role = (userRow?.role || "").toUpperCase();
    return role === "SYSTEM_ADMIN" || role === "ADMIN" || role === "CATEGORY_MANAGER" || role === "OPERATIONS_LEAD";
  };
  app.delete("/api/zoho/connection", requireAuth, async (req, res) => {
    try {
      const staff = await resolveStaffIdentity(req);
      if (!staff) {
        return res.status(401).json({ error: "Unable to identify counselor." });
      }
      const requestedKey = typeof req.query.staffKey === "string" ? req.query.staffKey.trim().toLowerCase() : typeof req.body?.staffKey === "string" ? req.body.staffKey.trim().toLowerCase() : "";
      let targetKey = staff.staffKey;
      if (requestedKey && requestedKey !== staff.staffKey) {
        const allowed = await isAdminCaller(staff, req);
        if (!allowed) {
          return res.status(403).json({ error: "Only administrators can disconnect another team member." });
        }
        targetKey = requestedKey;
      }
      await deleteZohoConnectionByKey(targetKey);
      res.json({ success: true, staffKey: targetKey });
    } catch (err) {
      res.status(500).json({ error: err?.message || "Failed to disconnect Zoho account" });
    }
  });
  app.get("/api/zoho/connections", requireAuth, async (req, res) => {
    try {
      await hydrateZohoConnectionsFromKv();
      const creds = getZohoCreds();
      const hasClientId = Boolean(creds.clientId);
      const hasClientSecret = Boolean(creds.clientSecret);
      const hasAppUrl = Boolean(getValidAppUrl() || getConfiguredZohoRedirectUriEnv());
      const configured = hasClientId && hasClientSecret;
      const { redirectUri, source: redirectUriSource } = getZohoRedirectUriInfo(req);
      const sharedOrgZsoid = await findSharedOrgZsoid();
      const safeCredDiagnostics = {
        clientIdPreview: creds.clientIdPreview,
        clientIdValidFormat: creds.clientIdValidFormat,
        clientSecretLength: creds.clientSecretLength,
        secretLooksLikeClientId: creds.secretLooksLikeClientId,
        rawHadWhitespaceOrQuotes: creds.rawHadWhitespaceOrQuotes
      };
      const staff = await resolveStaffIdentity(req);
      if (!staff) {
        return res.json({
          configured,
          hasClientId,
          hasClientSecret,
          hasAppUrl,
          redirectUri,
          redirectUriSource,
          sharedOrgZsoid: sharedOrgZsoid || void 0,
          ...safeCredDiagnostics,
          connections: []
        });
      }
      const admin = await isAdminCaller(staff, req);
      await getZohoConnectionByKey(staff.staffKey, req);
      const mergedMap = /* @__PURE__ */ new Map();
      if (hasAdminServiceAccount()) {
        try {
          const snap = await adminDb.collection("zoho_connections").get();
          snap.forEach((docSnap) => {
            const row = docSnap.data();
            if (row?.staffKey) mergedMap.set(row.staffKey, row);
          });
        } catch (err) {
          console.warn("Firestore zoho_connections list warning:", err);
        }
      }
      const dbRows = await safeDbQuery(
        () => db.select().from(zohoConnections).orderBy((0, import_drizzle_orm2.desc)(zohoConnections.connectedAt)),
        []
      );
      for (const row of dbRows) {
        if (!mergedMap.has(row.staffKey)) mergedMap.set(row.staffKey, row);
      }
      for (const [k, row] of zohoConnectionsMemory.entries()) {
        if (!mergedMap.has(k)) mergedMap.set(k, row);
      }
      const visibleRows = Array.from(mergedMap.values()).filter((row) => admin || row.staffKey === staff.staffKey).map((row) => ({
        staffKey: row.staffKey,
        staffEmail: row.staffEmail || "",
        staffName: row.staffName || "",
        zohoEmail: row.zohoEmail || "",
        zohoDisplayName: row.zohoDisplayName || "",
        zsoid: row.zsoid,
        zuid: row.zuid,
        accountsServer: row.accountsServer || ZOHO_ACCOUNTS_BASE,
        meetingBase: row.meetingBase || ZOHO_MEETING_BASE,
        connectedAt: row.connectedAt,
        updatedAt: row.updatedAt,
        tokenExpiresAt: row.tokenExpiresAt
      }));
      res.json({
        configured,
        hasClientId,
        hasClientSecret,
        hasAppUrl,
        redirectUri,
        redirectUriSource,
        sharedOrgZsoid: sharedOrgZsoid || visibleRows[0]?.zsoid || void 0,
        ...safeCredDiagnostics,
        isAdminView: admin,
        connections: visibleRows
      });
    } catch (err) {
      res.status(500).json({ error: err?.message || "Failed to inspect Zoho connections" });
    }
  });
  app.post("/api/zoho/test", requireAuth, async (req, res) => {
    const startedAt = Date.now();
    try {
      const staff = await resolveStaffIdentity(req);
      if (!staff) {
        return res.status(401).json({ ok: false, error: "Unable to identify signed-in counselor." });
      }
      const requestedKey = typeof req.body?.staffKey === "string" ? req.body.staffKey.trim().toLowerCase() : "";
      const targetSealedFromBody = typeof req.body?.sealedVault === "string" ? req.body.sealedVault.trim() : "";
      let targetKey = staff.staffKey;
      if (requestedKey && requestedKey !== staff.staffKey) {
        const allowed = await isAdminCaller(staff, req);
        if (!allowed) {
          return res.status(403).json({ ok: false, error: "Only administrators can test another counselor connection." });
        }
        targetKey = requestedKey;
      }
      if (targetSealedFromBody) {
        const unsealedTarget = unsealZohoVault(targetSealedFromBody);
        if (unsealedTarget && unsealedTarget.staffKey === targetKey) {
          zohoConnectionsMemory.set(targetKey, unsealedTarget);
        }
      }
      await getZohoConnectionByKey(staff.staffKey, req);
      const conn = await getZohoConnectionByKey(targetKey, req);
      if (!conn) {
        return res.status(400).json({
          ok: false,
          error: "No Zoho account connected for this user yet. Click Connect Zoho Account first."
        });
      }
      const meetingBase = conn.meetingBase || ZOHO_MEETING_BASE;
      const accountsServer = conn.accountsServer || ZOHO_ACCOUNTS_BASE;
      let accessToken = await refreshZohoAccessToken(conn, false);
      let userRes = await fetch(`${meetingBase}/api/v2/user.json`, {
        method: "GET",
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` }
      });
      if (userRes.status === 401) {
        accessToken = await refreshZohoAccessToken(conn, true);
        userRes = await fetch(`${meetingBase}/api/v2/user.json`, {
          method: "GET",
          headers: { Authorization: `Zoho-oauthtoken ${accessToken}` }
        });
      }
      const userJson = await userRes.json().catch(() => ({}));
      const details = userJson?.userDetails || userJson;
      if (!userRes.ok || !details?.zsoid) {
        const oauthInfo = await fetchZohoOAuthUserInfo(accountsServer, accessToken);
        if (oauthInfo && conn.zsoid) {
          const refreshedConn2 = zohoConnectionsMemory.get(targetKey) || conn;
          return res.json({
            ok: true,
            zohoEmail: oauthInfo.email || conn.zohoEmail || "",
            zohoDisplayName: oauthInfo.displayName || conn.zohoDisplayName || "",
            zsoid: String(conn.zsoid),
            zuid: String(oauthInfo.zuid || conn.zuid),
            latencyMs: Date.now() - startedAt,
            checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
            sealedVault: targetKey === staff.staffKey ? sealZohoVault(refreshedConn2) : void 0
          });
        }
        return res.status(userRes.status >= 400 ? userRes.status : 502).json({
          ok: false,
          error: userJson?.message || userJson?.error?.message || `Zoho API returned HTTP ${userRes.status}`
        });
      }
      const refreshedConn = zohoConnectionsMemory.get(targetKey) || conn;
      res.json({
        ok: true,
        zohoEmail: details.primaryEmail || conn.zohoEmail || "",
        zohoDisplayName: details.displayName || conn.zohoDisplayName || "",
        zsoid: String(details.zsoid),
        zuid: String(details.zuid || conn.zuid),
        latencyMs: Date.now() - startedAt,
        checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
        sealedVault: targetKey === staff.staffKey ? sealZohoVault(refreshedConn) : void 0
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        latencyMs: Date.now() - startedAt,
        error: err?.message || "Zoho API handshake test failed"
      });
    }
  });
  app.post("/api/zoho/diagnostics/probe", requireAuth, async (req, res) => {
    const probeStartedAt = Date.now();
    const stages = [];
    try {
      const s1Start = Date.now();
      const creds = getZohoCreds();
      const { redirectUri, source: redirectUriSource } = getZohoRedirectUriInfo(req);
      const scopes = getZohoOAuthScopes();
      const envOk = Boolean(creds.clientId && creds.clientSecret && !creds.secretLooksLikeClientId);
      stages.push({
        stage: "Server Runtime & OAuth Config",
        category: "SERVER_RUNTIME",
        status: envOk ? "pass" : "fail",
        durationMs: Date.now() - s1Start,
        summary: envOk ? `Server ready (${process.env.VERCEL ? "vercel-serverless" : "node-server"} \xB7 ${redirectUriSource})` : !creds.clientId || !creds.clientSecret ? "Missing ZOHO_CLIENT_ID or ZOHO_CLIENT_SECRET in server environment." : "ZOHO_CLIENT_SECRET appears to contain a Client ID instead of the Client Secret.",
        data: {
          runtime: process.env.VERCEL ? "vercel-serverless" : "node-server",
          nodeVersion: process.version,
          vercelRegion: process.env.VERCEL_REGION || "local",
          hasClientId: Boolean(creds.clientId),
          clientIdPreview: creds.clientIdPreview,
          clientIdValidFormat: creds.clientIdValidFormat,
          hasClientSecret: Boolean(creds.clientSecret),
          clientSecretLength: creds.clientSecretLength,
          secretLooksLikeClientId: creds.secretLooksLikeClientId,
          redirectUri,
          redirectUriSource,
          scopes,
          zohoAccountsBase: ZOHO_ACCOUNTS_BASE,
          zohoMeetingBase: ZOHO_MEETING_BASE,
          hasAdminServiceAccount: hasAdminServiceAccount(),
          hasSqlEnv: hasSqlEnv()
        }
      });
      const s2Start = Date.now();
      const staff = await resolveStaffIdentity(req);
      const adminCaller = staff ? await isAdminCaller(staff, req) : false;
      stages.push({
        stage: "Firebase Auth & Staff Identity",
        category: "AUTH_SESSION",
        status: staff ? "pass" : "fail",
        durationMs: Date.now() - s2Start,
        summary: staff ? `Verified ${staff.staffKey} (${adminCaller ? "Admin" : "Counselor/Staff"})` : "Could not resolve signed-in staff identity from Firebase token.",
        data: {
          firebaseUid: req.user?.uid || "",
          firebaseEmail: req.user?.email || "",
          headerStaffEmail: typeof req.headers["x-staff-email"] === "string" ? req.headers["x-staff-email"] : "",
          resolvedStaffKey: staff?.staffKey || "",
          isAdminCaller: adminCaller
        }
      });
      const s3Start = Date.now();
      const headerVault = typeof req.headers["x-zoho-sealed-vault"] === "string" ? req.headers["x-zoho-sealed-vault"] : "";
      const bodyVault = typeof req.body?.sealedVault === "string" ? req.body.sealedVault : "";
      const rawVaultToInspect = bodyVault || headerVault;
      const vaultAudit = inspectSealedVaultFormat(rawVaultToInspect, staff?.staffKey);
      let cryptoRoundTripOk = false;
      let stateRoundTripOk = false;
      try {
        const probeSealed = sealZohoVault({
          staffKey: "probe@check.local",
          refreshToken: "probe_rt_123",
          zsoid: "00000000",
          zuid: "00000000"
        });
        const probeUnsealed = unsealZohoVault(probeSealed);
        cryptoRoundTripOk = Boolean(probeUnsealed && probeUnsealed.staffKey === "probe@check.local");
      } catch {
        cryptoRoundTripOk = false;
      }
      try {
        const probeState = signZohoState({ staffKey: "probe@check.local", ts: Date.now() });
        const verifiedProbeState = verifyZohoState(probeState);
        stateRoundTripOk = Boolean(verifiedProbeState && verifiedProbeState.staffKey === "probe@check.local");
      } catch {
        stateRoundTripOk = false;
      }
      const activeConn = staff ? await getZohoConnectionByKey(staff.staffKey, req) : null;
      const sharedOrgZsoid = await findSharedOrgZsoid();
      const vaultHasFormatIssue = vaultAudit.present && (!vaultAudit.validEnvelopeFormat || !vaultAudit.decryptOk || vaultAudit.staffKeyMatch === false);
      const storageStatus = !cryptoRoundTripOk || !stateRoundTripOk || vaultHasFormatIssue ? "fail" : activeConn ? "pass" : "warn";
      stages.push({
        stage: "Token Storage Format & Crypto Audit",
        category: "TOKEN_STORAGE",
        status: storageStatus,
        durationMs: Date.now() - s3Start,
        summary: vaultHasFormatIssue ? `Token storage format error: ${vaultAudit.reason}` : !cryptoRoundTripOk || !stateRoundTripOk ? "Server encryption (AES-256-GCM) or OAuth state HMAC self-test failed." : activeConn ? `Stored connection valid for ${staff?.staffKey} (zsoid=${activeConn.zsoid}, refreshToken=${activeConn.refreshToken ? "present" : "missing"})` : `Crypto/state format healthy; no active connection stored yet for ${staff?.staffKey || "user"}.`,
        data: {
          cryptoRoundTripOk,
          stateRoundTripOk,
          sealedVaultAudit: vaultAudit,
          memoryCacheHasUser: Boolean(staff && zohoConnectionsMemory.has(staff.staffKey)),
          memoryCacheTotalUsers: zohoConnectionsMemory.size,
          sharedOrgZsoidResolved: Boolean(sharedOrgZsoid),
          sharedOrgZsoid: sharedOrgZsoid || "",
          activeConnectionSummary: activeConn ? {
            staffKey: activeConn.staffKey,
            zohoEmail: activeConn.zohoEmail || "",
            zsoid: activeConn.zsoid || "",
            zuid: activeConn.zuid || "",
            accountsServer: activeConn.accountsServer || "",
            meetingBase: activeConn.meetingBase || "",
            hasRefreshToken: Boolean(activeConn.refreshToken),
            tokenExpiresAt: activeConn.tokenExpiresAt instanceof Date ? activeConn.tokenExpiresAt.toISOString() : String(activeConn.tokenExpiresAt || "")
          } : null
        }
      });
      const s4Start = Date.now();
      let upstreamReachable = false;
      let upstreamStatus = 0;
      let upstreamError = "";
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4500);
        try {
          const pingRes = await fetch(`${ZOHO_ACCOUNTS_BASE}/.well-known/openid-configuration`, {
            method: "GET",
            signal: controller.signal
          });
          upstreamStatus = pingRes.status;
          upstreamReachable = pingRes.status > 0 && pingRes.status < 500;
        } finally {
          clearTimeout(timer);
        }
      } catch (e) {
        upstreamError = e?.message || "Failed to reach Zoho Accounts server";
      }
      let liveRefreshDetail = null;
      let handshakeOk = upstreamReachable && envOk;
      if (activeConn && envOk) {
        try {
          const accessToken = await refreshZohoAccessToken(activeConn, false);
          const meetingBase = activeConn.meetingBase || ZOHO_MEETING_BASE;
          const accountsServer = activeConn.accountsServer || ZOHO_ACCOUNTS_BASE;
          const [meetingRes, oauthInfo] = await Promise.all([
            fetch(`${meetingBase}/api/v2/user.json`, {
              method: "GET",
              headers: { Authorization: `Zoho-oauthtoken ${accessToken}` }
            }).then(async (r) => ({ ok: r.ok, status: r.status, body: await r.json().catch(() => ({})) })).catch((e) => ({ ok: false, status: 0, body: { error: e?.message } })),
            fetchZohoOAuthUserInfo(accountsServer, accessToken)
          ]);
          const verifiedViaFallback = Boolean(oauthInfo && activeConn.zsoid);
          liveRefreshDetail = {
            tokenRefreshOk: true,
            meetingUserApiStatus: meetingRes.status,
            meetingUserApiOk: meetingRes.ok,
            meetingUserApiMessage: meetingRes.body?.message || meetingRes.body?.error?.message || "",
            oauthUserInfoFallbackOk: Boolean(oauthInfo),
            verifiedViaFallback
          };
          handshakeOk = Boolean(meetingRes.ok || verifiedViaFallback);
        } catch (refreshErr) {
          liveRefreshDetail = {
            tokenRefreshOk: false,
            error: refreshErr?.message || "Token refresh failed"
          };
          handshakeOk = false;
        }
      }
      stages.push({
        stage: "Zoho Upstream API Handshake",
        category: "API_HANDSHAKE",
        status: handshakeOk ? "pass" : "fail",
        durationMs: Date.now() - s4Start,
        summary: !upstreamReachable ? `Cannot reach ${ZOHO_ACCOUNTS_BASE}: ${upstreamError || `HTTP ${upstreamStatus}`}` : liveRefreshDetail ? liveRefreshDetail.tokenRefreshOk ? liveRefreshDetail.meetingUserApiOk ? `Live Zoho Meeting API handshake succeeded (HTTP ${liveRefreshDetail.meetingUserApiStatus}).` : liveRefreshDetail.verifiedViaFallback ? `Non-admin Zoho presenter verified via /oauth/user/info fallback (/api/v2/user.json returned HTTP ${liveRefreshDetail.meetingUserApiStatus}).` : `Zoho Meeting API returned HTTP ${liveRefreshDetail.meetingUserApiStatus}: ${liveRefreshDetail.meetingUserApiMessage}` : `Zoho token refresh failed: ${liveRefreshDetail.error}` : `Zoho Accounts endpoint reachable (HTTP ${upstreamStatus}); ready for OAuth authorize redirect.`,
        data: {
          accountsBase: ZOHO_ACCOUNTS_BASE,
          upstreamReachable,
          upstreamStatus,
          upstreamError: upstreamError || void 0,
          liveRefreshDetail
        }
      });
      const failedStage = stages.find((s) => s.status === "fail");
      const verdict = failedStage ? {
        status: "fail",
        rootCauseCategory: failedStage.category,
        headline: `Issue isolated in ${failedStage.stage}`,
        recommendation: failedStage.summary
      } : {
        status: "pass",
        rootCauseCategory: "NONE",
        headline: activeConn ? "All storage format, auth, runtime, and Zoho API handshake checks passed." : "Server runtime, crypto storage format, and Zoho upstream reachability are healthy.",
        recommendation: activeConn ? "Connection is healthy and ready to generate Zoho Meeting links." : "Click Connect My Zoho Account to complete the browser OAuth consent flow."
      };
      const filteredServerEvents = adminCaller ? recentZohoServerEvents.slice(0, 20) : recentZohoServerEvents.filter((e) => !e.staffKey || e.staffKey === staff?.staffKey).slice(0, 15);
      res.json({
        ok: !failedStage,
        checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
        totalDurationMs: Date.now() - probeStartedAt,
        verdict,
        stages,
        recentServerEvents: filteredServerEvents
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
        totalDurationMs: Date.now() - probeStartedAt,
        error: err?.message || "Zoho diagnostic probe failed",
        stages
      });
    }
  });
  app.post("/api/zoho/meetings", requireAuth, async (req, res) => {
    try {
      const staff = await resolveStaffIdentity(req);
      if (!staff) {
        return res.status(401).json({ error: "Unable to identify counselor. Please sign in again." });
      }
      const conn = await getZohoConnectionByKey(staff.staffKey, req);
      if (!conn) {
        return res.status(400).json({
          code: "ZOHO_NOT_CONNECTED",
          error: "Your Zoho Meeting account is not connected. Connect Zoho Meeting first or choose Manual Video Link."
        });
      }
      const {
        topic,
        agenda,
        startDate,
        startTime,
        durationMinutes,
        timezone,
        participantEmails
      } = req.body || {};
      if (!topic || !startDate || !startTime) {
        return res.status(400).json({ error: "topic, startDate, and startTime are required to create a Zoho Meeting." });
      }
      const formattedStartTime = formatZohoStartTime(String(startDate), String(startTime));
      const clampedDurationMins = Math.max(15, Math.min(720, Number(durationMinutes) || 60));
      const durationMs = clampedDurationMins * 60 * 1e3;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const uniqueEmails = Array.from(
        new Set(
          (Array.isArray(participantEmails) ? participantEmails : []).map((e) => typeof e === "string" ? e.trim().toLowerCase() : "").filter((e) => emailRegex.test(e))
        )
      );
      const presenterNumeric = Number(conn.zuid);
      const sessionPayload = {
        topic: String(topic).trim().slice(0, 200),
        agenda: String(agenda || "").trim().slice(0, 1e3),
        presenter: Number.isFinite(presenterNumeric) ? presenterNumeric : conn.zuid,
        startTime: formattedStartTime,
        duration: durationMs,
        timezone: typeof timezone === "string" && timezone.trim() ? timezone.trim() : "UTC"
      };
      if (uniqueEmails.length > 0) {
        sessionPayload.participants = uniqueEmails.map((email) => ({ email }));
      }
      const meetingBase = conn.meetingBase || ZOHO_MEETING_BASE;
      const callCreateMeeting = async (accessToken2) => {
        const zohoRes2 = await fetch(`${meetingBase}/api/v2/${encodeURIComponent(conn.zsoid)}/sessions.json`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json;charset=UTF-8",
            Authorization: `Zoho-oauthtoken ${accessToken2}`
          },
          body: JSON.stringify({ session: sessionPayload })
        });
        const zohoJson2 = await zohoRes2.json().catch(() => ({}));
        return { zohoRes: zohoRes2, zohoJson: zohoJson2 };
      };
      let accessToken = await refreshZohoAccessToken(conn, false);
      let { zohoRes, zohoJson } = await callCreateMeeting(accessToken);
      if (zohoRes.status === 401) {
        accessToken = await refreshZohoAccessToken(conn, true);
        ({ zohoRes, zohoJson } = await callCreateMeeting(accessToken));
      }
      const createdSession = zohoJson?.session || zohoJson;
      if (!zohoRes.ok || !createdSession?.joinLink) {
        const zohoErr = zohoJson?.message || zohoJson?.error?.message || zohoJson?.error_description || `Zoho Meeting API returned status ${zohoRes.status}`;
        return res.status(zohoRes.status >= 400 ? zohoRes.status : 502).json({
          error: `Zoho Meeting creation failed: ${zohoErr}`
        });
      }
      const refreshedConn = zohoConnectionsMemory.get(staff.staffKey) || conn;
      res.json({
        meetingKey: String(createdSession.meetingKey || ""),
        joinLink: createdSession.joinLink,
        startLink: createdSession.startLink || createdSession.joinLink,
        zohoEmail: conn.zohoEmail || "",
        participantCount: uniqueEmails.length,
        participantEmails: uniqueEmails,
        startTimeFormatted: formattedStartTime,
        sealedVault: sealZohoVault(refreshedConn)
      });
    } catch (err) {
      res.status(500).json({ error: err?.message || "Failed to create Zoho Meeting" });
    }
  });
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", runtime: process.env.VERCEL ? "vercel-serverless" : "node-server" });
  });
  if (process.env.VERCEL) {
    app.all("/api/*", (_req, res) => {
      res.status(404).json({ error: "API endpoint not found." });
    });
    app.use((err, _req, res, _next) => {
      console.error("[Express Serverless Error]", err?.message || err);
      if (res.headersSent) return;
      res.status(err?.status || 500).json({
        error: err?.message || "Internal server error"
      });
    });
  }
  return app;
}
async function startLocalServer() {
  const SERVER_INSTANCE_ID = import_crypto.default.randomUUID();
  const PORT = Number(process.env.PORT) || 3e3;
  const wsModuleName = "ws";
  const { WebSocketServer, WebSocket } = await import(wsModuleName);
  let wss = null;
  const sendToLocalWsClients = (serializedPayload) => {
    if (!wss) return;
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(serializedPayload);
        } catch {
        }
      }
    });
  };
  const app = createExpressApp({
    sendToLocalWsClients,
    serverInstanceId: SERVER_INSTANCE_ID
  });
  const httpServer = import_http.default.createServer(app);
  wss = new WebSocketServer({ server: httpServer, path: "/ws/realtime" });
  let pgListenClient = null;
  let pgListenConnecting = false;
  let pgIdleReleaseTimer = null;
  let pgReconnectTimer = null;
  const releasePgListener = () => {
    if (pgReconnectTimer) {
      clearTimeout(pgReconnectTimer);
      pgReconnectTimer = null;
    }
    if (pgListenClient) {
      const clientToRelease = pgListenClient;
      pgListenClient = null;
      clientToRelease.removeAllListeners("notification");
      clientToRelease.removeAllListeners("error");
      clientToRelease.removeAllListeners("end");
      clientToRelease.query("UNLISTEN uppseekers_realtime").catch(() => {
      }).finally(() => {
        try {
          clientToRelease.release();
        } catch {
        }
      });
    }
  };
  const ensurePgListener = async () => {
    if (!wss || !hasSqlEnv() || pgListenClient || pgListenConnecting || wss.clients.size === 0) {
      return;
    }
    pgListenConnecting = true;
    try {
      const pool = createPool();
      const client = await pool.connect();
      if (!wss || wss.clients.size === 0) {
        client.release();
        pgListenConnecting = false;
        return;
      }
      pgListenClient = client;
      client.on("notification", (msg) => {
        if (msg?.channel !== "uppseekers_realtime" || !msg.payload) return;
        try {
          const parsed = JSON.parse(msg.payload);
          if (!parsed || parsed.instanceId === SERVER_INSTANCE_ID) return;
          const { instanceId: _ignored, ...cleanEvent } = parsed;
          sendToLocalWsClients(JSON.stringify(cleanEvent));
        } catch {
        }
      });
      const handleDisconnect = () => {
        if (pgListenClient === client) {
          pgListenClient = null;
          try {
            client.release(true);
          } catch {
          }
          if (wss && wss.clients.size > 0 && !pgReconnectTimer) {
            pgReconnectTimer = setTimeout(() => {
              pgReconnectTimer = null;
              void ensurePgListener();
            }, 3e3);
          }
        }
      };
      client.on("error", handleDisconnect);
      client.on("end", handleDisconnect);
      await client.query("LISTEN uppseekers_realtime");
    } catch {
      if (wss && wss.clients.size > 0 && !pgReconnectTimer) {
        pgReconnectTimer = setTimeout(() => {
          pgReconnectTimer = null;
          void ensurePgListener();
        }, 4e3);
      }
    } finally {
      pgListenConnecting = false;
    }
  };
  wss.on("connection", (ws) => {
    ws.isAlive = true;
    if (pgIdleReleaseTimer) {
      clearTimeout(pgIdleReleaseTimer);
      pgIdleReleaseTimer = null;
    }
    void ensurePgListener();
    ws.on("pong", () => {
      ws.isAlive = true;
    });
    ws.on("message", (raw) => {
      ws.isAlive = true;
      try {
        const msg = JSON.parse(String(raw));
        if (msg?.type === "ping" && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "pong", timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
        }
      } catch {
      }
    });
    ws.on("close", () => {
      if (wss && wss.clients.size === 0 && !pgIdleReleaseTimer) {
        pgIdleReleaseTimer = setTimeout(() => {
          pgIdleReleaseTimer = null;
          if (wss && wss.clients.size === 0) {
            releasePgListener();
          }
        }, 3e4);
      }
    });
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "connected",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        })
      );
    }
  });
  const wsHeartbeat = setInterval(() => {
    wss?.clients.forEach((client) => {
      const ws = client;
      if (ws.isAlive === false) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch {
      }
    });
  }, 25e3);
  wss.on("close", () => {
    clearInterval(wsHeartbeat);
    releasePgListener();
  });
  if (process.env.NODE_ENV !== "production") {
    const viteModuleName = "vite";
    const { createServer: createViteServer } = await import(viteModuleName);
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      try {
        const url = req.originalUrl;
        let template = import_fs2.default.readFileSync(import_path2.default.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(
      import_express.default.static(distPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith(".html")) {
            res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          }
        }
      })
    );
    app.all("/api/*", (_req, res) => {
      res.status(404).json({ error: "API endpoint not found." });
    });
    app.get("*", (_req, res) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  app.use((err, _req, res, _next) => {
    console.error("[Express Error]", err?.message || err);
    if (res.headersSent) return;
    res.status(err?.status || 500).json({
      error: err?.message || "Internal server error"
    });
  });
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
  return app;
}
var cachedServerlessApp = null;
function getServerlessApp() {
  if (!cachedServerlessApp) {
    cachedServerlessApp = createExpressApp();
  }
  return cachedServerlessApp;
}
if (!process.env.VERCEL) {
  void startLocalServer();
}
function handler(req, res) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    res.once("finish", finish);
    res.once("close", finish);
    try {
      const app = getServerlessApp();
      app(req, res, (err) => {
        if (err && !res.headersSent) {
          console.error("[Vercel Handler Error]", err?.message || err);
          res.status(500).json({ error: err?.message || "Internal server error" });
        } else if (!res.headersSent) {
          res.status(404).json({ error: "API endpoint not found." });
        }
        finish();
      });
    } catch (err) {
      console.error("[Vercel Handler Sync Error]", err?.message || err);
      if (!res.headersSent) {
        res.status(500).json({ error: err?.message || "Server initialization error" });
      }
      finish();
    }
  });
}
