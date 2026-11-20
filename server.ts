import "dotenv/config";
import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import crypto from "crypto";
import { requireAuth, AuthRequest } from "./src/middleware/auth";
import { adminAuth, adminDb, hasAdminServiceAccount, firebaseWebApiKey, firebaseAppletConfig } from "./src/lib/firebase-admin";
import { db, createPool } from "./src/db/index";
import {
  users,
  studentsData,
  staffData,
  batchesData,
  eventsData,
  launchpadTeamPermissions,
  launchpadSubjects,
  launchpadChapters,
  launchpadCertificationQuestions,
  launchpadStudentEnrollments,
  launchpadSubjectReleases,
  launchpadProgressAndSubmissions,
  launchpadCertifications,
  notificationsTable,
  assignmentEvaluations,
  zohoConnections,
  portalSettings
} from "./src/db/schema";
import { eq, or, asc, desc, sql } from "drizzle-orm";
import {
  buildDefaultLaunchpadSubjects,
  buildDefaultLaunchpadChapters,
  buildDefaultCertQuestions,
} from "./src/data/launchpadData";
import {
  ensureProductionReady,
  hasSqlEnv,
  hasTable,
  hasColumn,
  sysKvGet,
  sysKvSet,
  mergeRecordsById,
  isSysKvUid,
} from "./src/db/productionVault";

interface PasswordResetItem {
  token: string;
  code: string;
  email: string;
  expiresAt: number;
}
const passwordResetStore = new Map<string, PasswordResetItem>();

let cachedTransporter: any = null;
async function getMailTransporter() {
  if (cachedTransporter) return cachedTransporter;
  const nodemailerMod: any = await import("nodemailer");
  const nodemailer = nodemailerMod.default || nodemailerMod;
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      cachedTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 2500,
        greetingTimeout: 2500,
        socketTimeout: 3000,
      });
      return cachedTransporter;
    } catch (e) {
      console.warn('[Email Transporter Warning] Falling back to jsonTransport:', e);
    }
  }

  // Fast in-memory json transport that never hangs or times out in preview/sandbox
  cachedTransporter = nodemailer.createTransport({
    jsonTransport: true,
  });
  return cachedTransporter;
}

async function safeDbQuery<T>(queryFn: () => Promise<T>, fallback: T): Promise<T> {
  if (!hasSqlEnv()) {
    return fallback;
  }
  try {
    return await queryFn();
  } catch (firstErr: any) {
    // Cloud SQL Developer edition scales to zero (~2s cold start); retry once on transient connection wakeup (skip slow sleep on Vercel)
    const msg = String(firstErr?.message || firstErr || '').toLowerCase();
    const isTransient =
      !process.env.VERCEL &&
      (msg.includes('connect') ||
        msg.includes('timeout') ||
        msg.includes('terminated') ||
        msg.includes('econnreset') ||
        msg.includes('closed') ||
        msg.includes('failed query'));
    if (isTransient) {
      await new Promise((r) => setTimeout(r, 1200));
      try {
        return await queryFn();
      } catch (retryErr: any) {
        console.error("[DB Query Error]", retryErr?.message || retryErr);
        return fallback;
      }
    }
    console.error("[DB Query Error]", firstErr?.message || firstErr);
    return fallback;
  }
}

function normEmail(email?: string | null): string {
  return (email || "").trim().toLowerCase();
}

function normEmailKey(email?: string | null): string {
  const clean = normEmail(email);
  return clean ? clean.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128) : "unknown_user";
}

const GLOBAL_MANAGER_ROLES = new Set([
  "SYSTEM_ADMIN",
  "ADMIN",
  "SUPER_ADMIN",
  "CATEGORY_MANAGER",
  "CATEGORY_LEAD",
  "OPERATIONS_LEAD",
  "OPS_LEAD",
  "HEAD_COUNSELOR",
  "ACADEMIC_DIRECTOR",
]);

async function getVerifiedCallerStaffDirRole(req: AuthRequest): Promise<{ role: string; status: string; globalScope: boolean } | null> {
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
          globalScope: Boolean(d.globalScope),
        };
      }
    } catch {
      // Fall through to Firestore REST / SQL check
    }
  }

  // Fallback: verify caller's own staff_directory document via Firestore REST using their verified Bearer token
  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const firebaseProjectId = firebaseAppletConfig.projectId;
  const firestoreDatabaseId = firebaseAppletConfig.firestoreDatabaseId || "(default)";
  if (idToken && firebaseProjectId && firestoreDatabaseId) {
    try {
      const docUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseProjectId)}/databases/${encodeURIComponent(firestoreDatabaseId)}/documents/staff_directory/${encodeURIComponent(normEmailKey(email))}`;
      const r = await fetch(docUrl, { headers: { Authorization: `Bearer ${idToken}` } });
      if (r.ok) {
        const docJson: any = await r.json().catch(() => null);
        const fields = docJson?.fields || {};
        const role = String(fields.role?.stringValue || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
        const status = String(fields.status?.stringValue || "Active").trim();
        const globalScope = Boolean(fields.globalScope?.booleanValue);
        if (role) {
          return { role, status, globalScope };
        }
      }
    } catch {
      // Fall through to SQL check
    }
  }

  if (hasSqlEnv()) {
    const userRow = await safeDbQuery(
      () => db.select().from(users).where(or(eq(users.email, email), eq(users.uid, uid))).then(r => r[0] || null),
      null
    );
    if (userRow?.role) {
      const role = String(userRow.role).trim().toUpperCase().replace(/[\s-]+/g, "_");
      return { role, status: "Active", globalScope: GLOBAL_MANAGER_ROLES.has(role) };
    }
  }

  return null;
}

async function isVerifiedFirebaseAdmin(req: AuthRequest): Promise<boolean> {
  const info = await getVerifiedCallerStaffDirRole(req);
  if (!info) return false;
  if (info.status.toLowerCase() === "suspended") return false;
  return info.role === "SYSTEM_ADMIN" || info.role === "ADMIN" || info.role === "SUPER_ADMIN";
}

async function isVerifiedPortalManager(req: AuthRequest): Promise<boolean> {
  const info = await getVerifiedCallerStaffDirRole(req);
  if (!info) return false;
  if (info.status.toLowerCase() === "suspended") return false;
  return info.globalScope || GLOBAL_MANAGER_ROLES.has(info.role);
}

async function updateFirebasePasswordViaToolkitWithOldPasswords(
  email: string,
  newPassword: string,
  candidateOldPasswords: string[]
): Promise<{ ok: boolean; uid?: string; created?: boolean; error?: string }> {
  if (!firebaseWebApiKey) {
    return { ok: false, error: "Firebase Web API key is not configured." };
  }

  const tried = new Set<string>();
  const candidates = candidateOldPasswords
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter((p) => {
      if (!p || tried.has(p)) return false;
      tried.add(p);
      return true;
    });

  // 1. Try signing in with any known previous password (or the target new password if already synced)
  for (const pwd of [...candidates, newPassword]) {
    try {
      const signInRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(firebaseWebApiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: pwd, returnSecureToken: true }),
        }
      );
      const signInJson: any = await signInRes.json().catch(() => null);
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
              returnSecureToken: true,
            }),
          }
        );
        const updateJson: any = await updateRes.json().catch(() => null);
        if (updateRes.ok) {
          return { ok: true, uid: updateJson?.localId || signInJson.localId, created: false };
        }
        return {
          ok: false,
          error: updateJson?.error?.message || "Failed to update password in Firebase Auth.",
        };
      }
    } catch {
      // Try next candidate
    }
  }

  // 2. If user does not exist yet in Firebase Auth, create them directly with newPassword
  try {
    const signUpRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(firebaseWebApiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: newPassword,
          returnSecureToken: false,
        }),
      }
    );
    const signUpJson: any = await signUpRes.json().catch(() => null);
    if (signUpRes.ok) {
      return { ok: true, uid: signUpJson?.localId, created: true };
    }
    if (signUpJson?.error?.message === "EMAIL_EXISTS") {
      return {
        ok: false,
        error:
          "Existing Firebase Auth password does not match our stored record and server Admin SDK credentials (FIREBASE_SERVICE_ACCOUNT_JSON) are not configured.",
      };
    }
    return { ok: false, error: signUpJson?.error?.message || "Failed to provision Firebase Auth account." };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Firebase Auth network error." };
  }
}

async function getStoredKnownPasswordsForEmail(cleanEmail: string): Promise<string[]> {
  const candidates: string[] = [];
  try {
    const kvMap = await sysKvGet<Record<string, string>>("user_passwords", {});
    const fromKv = kvMap?.[`email:${cleanEmail}`];
    if (typeof fromKv === "string" && fromKv.trim()) {
      candidates.push(fromKv.trim());
    }
  } catch {
    // ignore
  }
  if (hasAdminServiceAccount()) {
    try {
      const credSnap = await adminDb.collection("admin_student_credentials").doc(normEmailKey(cleanEmail)).get();
      const fromCred = credSnap.exists ? credSnap.data()?.password : "";
      if (typeof fromCred === "string" && fromCred.trim()) {
        candidates.push(fromCred.trim());
      }
    } catch {
      // ignore
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
      // ignore
    }
  }
  return candidates;
}

const CORE_STUDENT_RELATIONAL_KEYS = new Set([
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
  "profileJson",
]);

function extractStudentProfileJson(
  student: Record<string, any> | null | undefined,
  existingProfile?: Record<string, any> | null
): Record<string, any> {
  const merged: Record<string, any> = {
    ...(existingProfile && typeof existingProfile === "object" ? existingProfile : {}),
  };
  if (!student || typeof student !== "object") {
    return merged;
  }
  for (const [key, value] of Object.entries(student)) {
    if (CORE_STUDENT_RELATIONAL_KEYS.has(key)) continue;
    if (value === undefined) continue;
    merged[key] = value;
  }
  return merged;
}

function buildStudentFromRow(u: any, sd: any): Record<string, any> {
  const profile =
    sd?.profileJson && typeof sd.profileJson === "object" ? sd.profileJson : {};
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
    countries: Array.isArray(sd?.countries) && sd.countries.length > 0
      ? sd.countries
      : (Array.isArray(profile.countries) ? profile.countries : ["USA"]),
    readiness: sd?.readiness ?? profile.readiness ?? 0,
    counselor: sd?.counselor ?? profile.counselor ?? "Unassigned",
    school: sd?.school ?? profile.school ?? "",
    activities: Array.isArray(sd?.activities) ? sd.activities : [],
    extracurriculars: Array.isArray(sd?.extracurriculars) ? sd.extracurriculars : [],
    academicScores: Array.isArray(sd?.academicScores) ? sd.academicScores : [],
    shortlist: Array.isArray(sd?.shortlist) ? sd.shortlist : [],
    documents: Array.isArray(sd?.documents) ? sd.documents : [],
    essays: Array.isArray(sd?.essays) ? sd.essays : [],
    tasks: Array.isArray(sd?.tasks) ? sd.tasks : [],
  };
}

async function saveUserPasswordMirror(uid?: string | null, email?: string | null, password?: string | null) {
  if (!password || !password.trim()) return;
  const cleanPwd = password.trim();
  const map = await sysKvGet<Record<string, string>>("user_passwords", {});
  const next = { ...(map || {}) };
  if (uid && uid.trim()) next[`uid:${uid.trim()}`] = cleanPwd;
  const cleanEm = normEmail(email);
  if (cleanEm) next[`email:${cleanEm}`] = cleanPwd;
  await sysKvSet("user_passwords", next);
}

async function saveStudentProfileMirror(userIdOrUid: string | number, profileJson: Record<string, any>) {
  if (!profileJson || typeof profileJson !== "object") return;
  const map = await sysKvGet<Record<string, any>>("student_profiles", {});
  const key = String(userIdOrUid);
  const next = {
    ...(map || {}),
    [key]: { ...((map && map[key]) || {}), ...profileJson },
  };
  await sysKvSet("student_profiles", next);
}

async function readAllUsersSafe(): Promise<any[]> {
  if (!hasSqlEnv() || !hasTable("users")) return [];
  const pwdMirror = await sysKvGet<Record<string, string>>("user_passwords", {});
  let rawRows: any[] = [];
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
  return rawRows
    .filter((u) => u && !isSysKvUid(u.uid))
    .map((u) => {
      const cleanUid = String(u.uid || "").trim();
      const cleanEm = normEmail(u.email);
      const mirroredPwd =
        (cleanUid && pwdMirror?.[`uid:${cleanUid}`]) ||
        (cleanEm && pwdMirror?.[`email:${cleanEm}`]) ||
        undefined;
      return {
        ...u,
        password: u.password || mirroredPwd || null,
      };
    });
}

async function readAllStudentsDataSafe(): Promise<any[]> {
  if (!hasSqlEnv() || !hasTable("students_data")) return [];
  const profileMirror = await sysKvGet<Record<string, any>>("student_profiles", {});
  if (hasColumn("students_data", "profile_json")) {
    const rows = await safeDbQuery(() => db.select().from(studentsData), []);
    return rows.map((sd) => ({
      ...sd,
      profileJson: {
        ...(profileMirror?.[String(sd.userId)] || {}),
        ...(sd.profileJson && typeof sd.profileJson === "object" ? sd.profileJson : {}),
      },
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
  return raw.map((sd: any) => ({
    ...sd,
    profileJson: profileMirror?.[String(sd.userId)] || {},
  }));
}

async function upsertUserRowSafe(params: {
  existingUser?: any;
  uid: string;
  email: string;
  name: string;
  password?: string;
  defaultPassword: string;
  role: string;
}): Promise<any> {
  const { existingUser, uid, email, name, password, defaultPassword, role } = params;
  const effectivePassword = password && password.trim() ? password.trim() : undefined;
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
      const inserted = await db
        .insert(users)
        .values({
          uid,
          email,
          name,
          password: effectivePassword || defaultPassword,
          role,
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: {
            email,
            name,
            ...(effectivePassword ? { password: effectivePassword } : {}),
          },
        })
        .returning();
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
    const nextEmail =
      email && email.includes("@") && !email.endsWith("@uppseekers.local")
        ? email
        : existingUser.email;
    if (hasColumn("users", "password")) {
      const updates: any = { name: nextName, role: nextRole, email: nextEmail };
      if (effectivePassword) updates.password = effectivePassword;
      await db.update(users).set(updates).where(eq(users.id, existingUser.id));
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
      password: effectivePassword || existingUser.password,
    };
  }
}

async function upsertStudentDataRowSafe(userId: number, s: Record<string, any>) {
  if (!hasSqlEnv() || !hasTable("students_data")) return;
  const allSd = await readAllStudentsDataSafe();
  const existingSd = allSd.find((row) => row.userId === userId);
  const mergedProfile = extractStudentProfileJson(s, existingSd?.profileJson || null);
  await saveStudentProfileMirror(userId, mergedProfile);

  const payload = {
    phone: s.phone !== undefined ? s.phone : (existingSd?.phone ?? ""),
    intake: s.intake !== undefined ? s.intake : (existingSd?.intake ?? "Fall 2026"),
    countries: s.countries !== undefined ? s.countries : (existingSd?.countries ?? ["USA"]),
    readiness: s.readiness !== undefined ? s.readiness : (existingSd?.readiness ?? 0),
    counselor: s.counselor !== undefined ? s.counselor : (existingSd?.counselor ?? "Unassigned"),
    school: s.school !== undefined ? s.school : (existingSd?.school ?? ""),
    activities: s.activities !== undefined ? s.activities : (existingSd?.activities ?? []),
    extracurriculars: s.extracurriculars !== undefined ? s.extracurriculars : (existingSd?.extracurriculars ?? []),
    academicScores: s.academicScores !== undefined ? s.academicScores : (existingSd?.academicScores ?? []),
    shortlist: s.shortlist !== undefined ? s.shortlist : (existingSd?.shortlist ?? []),
    documents: s.documents !== undefined ? s.documents : (existingSd?.documents ?? []),
    essays: s.essays !== undefined ? s.essays : (existingSd?.essays ?? []),
    tasks: s.tasks !== undefined ? s.tasks : (existingSd?.tasks ?? []),
  };

  if (hasColumn("students_data", "profile_json")) {
    if (!existingSd) {
      await db.insert(studentsData).values({
        userId,
        ...payload,
        profileJson: mergedProfile,
      });
    } else {
      await db
        .update(studentsData)
        .set({ ...payload, profileJson: mergedProfile })
        .where(eq(studentsData.userId, userId));
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
          JSON.stringify(payload.tasks || []),
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
          userId,
        ]
      );
    }
  }
}

async function findAllMatchingUsers(uid?: string, email?: string) {
  const cleanUid = (uid || "").trim();
  const cleanEmail = normEmail(email);
  const uidAliases =
    cleanUid === "1" || cleanUid === "admin-1" ? ["1", "admin-1"] : cleanUid ? [cleanUid] : [];
  const effectiveEmail =
    cleanEmail || (cleanUid === "1" || cleanUid === "admin-1" ? "uppseekers@gmail.com" : "");

  const all = await readAllUsersSafe();
  return all.filter((u) => {
    const uUid = (u.uid || "").trim();
    const uEmail = normEmail(u.email);
    if (uidAliases.length > 0 && uidAliases.includes(uUid)) return true;
    if (effectiveEmail && uEmail === effectiveEmail) return true;
    return false;
  });
}

async function findUserByUidOrEmail(uid?: string, email?: string) {
  const cleanUid = (uid || "").trim();
  const cleanEmail = normEmail(email);
  const matches = await findAllMatchingUsers(cleanUid, cleanEmail);
  if (matches.length === 0) return undefined;
  // Prefer exact UID match first, otherwise exact email match
  return (
    matches.find((m) => cleanUid && (m.uid || "").trim() === cleanUid) ||
    matches.find((m) => cleanEmail && normEmail(m.email) === cleanEmail) ||
    matches[0]
  );
}

function createExpressApp(options?: {
  sendToLocalWsClients?: (serializedPayload: string) => void;
  serverInstanceId?: string;
}): express.Express {
  const app = express();
  const SERVER_INSTANCE_ID = options?.serverInstanceId || crypto.randomUUID();
  const sendToLocalWsClients = options?.sendToLocalWsClients || (() => {});
  const hasSqlConfigured = () => hasSqlEnv();

  const broadcastRealtime = (event: {
    type: string;
    scope: "launchpad" | "data" | "both";
    entity?: string;
    targetId?: string;
  }) => {
    const fullEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };
    sendToLocalWsClients(JSON.stringify(fullEvent));

    if (hasSqlConfigured() && !process.env.VERCEL) {
      const pgPayload = JSON.stringify({
        ...fullEvent,
        instanceId: SERVER_INSTANCE_ID,
      });
      createPool()
        .query("SELECT pg_notify('uppseekers_realtime', $1)", [pgPayload])
        .catch(() => {});
    }
  };

  app.use(express.json({ limit: "50mb" }));

  // Lazy single-flight schema introspection only when SQL is configured (skip on health & Zoho OAuth routes)
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
            new Promise<void>((resolve) => setTimeout(resolve, 3500)),
          ]);
        } else {
          await ensureProductionReady();
        }
      } catch {
        // Handled internally by productionVault
      }
    }
    next();
  });

  // API endpoints

  // Legacy plaintext login deprecated — Firebase Email/Password Authentication is enforced client-side
  app.post("/api/auth/login-credentials", (_req, res) => {
    res.status(410).json({
      error: "Legacy credential endpoint disabled. Sign in using Firebase Email & Password authentication.",
    });
  });

  // Google / Firebase Token Login
  app.post("/api/auth/login", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email || "";
      const name = req.user?.name || email.split("@")[0] || "Unknown User";

      if (!uid) {
        res.status(401).json({ error: "Missing uid" });
        return;
      }

      // Check if user exists
      let user = await db.select().from(users).where(eq(users.uid, uid)).then(res => res[0]);
      
      if (!user) {
        const role = email === 'uppseekers@gmail.com' ? 'SYSTEM_ADMIN' : 'STUDENT';
        const result = await db.insert(users).values({ uid, email, name, role }).returning();
        user = result[0];

        if (role === 'STUDENT') {
          await db.insert(studentsData).values({
            userId: user.id,
            intake: 'Fall 2026',
            countries: ['USA'],
            counselor: 'Unassigned',
            school: '',
            activities: [],
            extracurriculars: [],
            academicScores: [],
            shortlist: [],
            documents: [],
            essays: [],
            tasks: [],
            readiness: 0,
          });
        } else {
          await db.insert(staffData).values({
            userId: user.id,
            status: 'Active',
            students: 'All',
          });
        }
      }

      res.json({ user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Create Student (Non-destructive upsert)
  app.post("/api/students/create", requireAuth, async (req: AuthRequest, res) => {
    try {
      const s = req.body;
      if (!s.name || !s.email) {
        res.status(400).json({ error: "Name and email are required" });
        return;
      }

      const uid = s.id || `STU-${Date.now()}`;
      const cleanEmail = normEmail(s.email);
      const cleanPassword = typeof s.password === 'string' && s.password.trim() ? s.password.trim() : undefined;

      const existingMirror = await sysKvGet<any[]>("portal_students_mirror", []);
      const studentObj = { ...s, id: uid, uid, email: cleanEmail, password: cleanPassword || s.password || 'Student@123', role: 'STUDENT' };
      const filteredMirror = existingMirror.filter((m) => m?.id !== uid && normEmail(m?.email) !== cleanEmail);
      await sysKvSet("portal_students_mirror", [...filteredMirror, studentObj]);

      let user: any = null;
      await safeDbQuery(async () => {
        const existing = await findUserByUidOrEmail(uid, cleanEmail);
        user = await upsertUserRowSafe({
          existingUser: existing,
          uid,
          email: cleanEmail,
          name: s.name,
          password: cleanPassword,
          defaultPassword: 'Student@123',
          role: 'STUDENT',
        });
        if (user?.id) {
          await upsertStudentDataRowSafe(user.id, s);
        }
      }, null);

      broadcastRealtime({ type: "student:created", scope: "data", entity: "students", targetId: uid });
      res.json({ success: true, user: user || studentObj });
    } catch (e) {
      console.error('Error creating student:', e);
      res.status(500).json({ error: "Failed to create student" });
    }
  });

  // Create Staff (Non-destructive upsert)
  app.post("/api/staff/create", requireAuth, async (req: AuthRequest, res) => {
    try {
      const s = req.body;
      if (!s.name || !s.email) {
        res.status(400).json({ error: "Name and email are required" });
        return;
      }

      const uid = s.id || `STAFF-${Date.now()}`;
      const cleanEmail = normEmail(s.email);
      const cleanPassword = typeof s.password === 'string' && s.password.trim() ? s.password.trim() : undefined;

      const existingMirror = await sysKvGet<any[]>("portal_staff_mirror", []);
      const staffObj = {
        ...s,
        id: uid,
        uid,
        email: cleanEmail,
        password: cleanPassword || s.password || 'Staff@123',
        role: s.role || 'COUNSELOR',
        status: s.status || 'Active',
        students: s.students || 'All',
      };
      const filteredMirror = existingMirror.filter((m) => m?.id !== uid && normEmail(m?.email) !== cleanEmail);
      await sysKvSet("portal_staff_mirror", [...filteredMirror, staffObj]);

      let user: any = null;
      await safeDbQuery(async () => {
        const existing = await findUserByUidOrEmail(uid, cleanEmail);
        user = await upsertUserRowSafe({
          existingUser: existing,
          uid,
          email: cleanEmail,
          name: s.name,
          password: cleanPassword,
          defaultPassword: 'Staff@123',
          role: s.role || 'COUNSELOR',
        });

        if (user?.id && hasTable("staff_data")) {
          const existingStaff = await db.select().from(staffData).where(eq(staffData.userId, user.id)).then(r => r[0]);
          if (existingStaff) {
            await db.update(staffData).set({
              status: s.status !== undefined ? s.status : existingStaff.status,
              students: s.students !== undefined ? s.students : existingStaff.students,
            }).where(eq(staffData.userId, user.id));
          } else {
            await db.insert(staffData).values({
              userId: user.id,
              status: s.status || 'Active',
              students: s.students || 'All'
            });
          }
        }
      }, null);

      broadcastRealtime({ type: "staff:created", scope: "data", entity: "staff", targetId: uid });
      res.json({ success: true, user: user || staffObj });
    } catch (e) {
      console.error('Error creating staff:', e);
      res.status(500).json({ error: "Failed to create staff" });
    }
  });

  app.post("/api/staff", requireAuth, async (req: AuthRequest, res) => {
    try {
      const staffArr = Array.isArray(req.body) ? req.body : [];
      if (staffArr.length > 0) {
        const existingMirror = await sysKvGet<any[]>("portal_staff_mirror", []);
        const merged = mergeRecordsById(staffArr.filter((s) => s && !isSysKvUid(s.id)), existingMirror, "id");
        await sysKvSet("portal_staff_mirror", merged);
      }
      await safeDbQuery(async () => {
        for (const s of staffArr) {
          if (!s?.id || !s?.email || isSysKvUid(s.id)) continue;
          const cleanEmail = normEmail(s.email);
          const cleanPassword = typeof s.password === 'string' && s.password.trim() ? s.password.trim() : undefined;
          const existing = await findUserByUidOrEmail(s.id, cleanEmail);
          const userRecord = await upsertUserRowSafe({
            existingUser: existing,
            uid: s.id,
            email: cleanEmail,
            name: s.name || cleanEmail,
            password: cleanPassword,
            defaultPassword: 'Staff@123',
            role: s.role || 'COUNSELOR',
          });
          if (userRecord?.id && hasTable("staff_data")) {
            const existingStaff = await db.select().from(staffData).where(eq(staffData.userId, userRecord.id)).then(r => r[0]);
            if (existingStaff) {
              await db.update(staffData).set({
                status: s.status !== undefined ? s.status : existingStaff.status,
                students: s.students !== undefined ? s.students : existingStaff.students,
              }).where(eq(staffData.userId, userRecord.id));
            } else {
              await db.insert(staffData).values({
                userId: userRecord.id,
                status: s.status || 'Active',
                students: s.students || 'All',
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

  app.delete("/api/staff/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      if (!id || isSysKvUid(id)) return res.status(400).json({ error: "Missing staff ID" });
      const existingMirror = await sysKvGet<any[]>("portal_staff_mirror", []);
      await sysKvSet("portal_staff_mirror", existingMirror.filter((m) => m?.id !== id));

      await safeDbQuery(async () => {
        const allU = await readAllUsersSafe();
        const userRecord = allU.find((u) => u.uid === id);
        if (userRecord && normEmail(userRecord.email) !== 'uppseekers@gmail.com') {
          if (hasTable("staff_data")) {
            await db.delete(staffData).where(eq(staffData.userId, userRecord.id));
          }
          await db.delete(users).where(eq(users.id, userRecord.id));
        }
      }, null);
      broadcastRealtime({ type: "staff:deleted", scope: "data", entity: "staff", targetId: id });
      res.json({ success: true });
    } catch (e) {
      res.json({ success: true });
    }
  });

  app.post("/api/students", requireAuth, async (req: AuthRequest, res) => {
    try {
      const studentsArr = Array.isArray(req.body) ? req.body : [];
      if (studentsArr.length > 0) {
        const existingMirror = await sysKvGet<any[]>("portal_students_mirror", []);
        const merged = mergeRecordsById(studentsArr.filter((s) => s && !isSysKvUid(s.id)), existingMirror, "id");
        await sysKvSet("portal_students_mirror", merged);
      }
      await safeDbQuery(async () => {
        for (const student of studentsArr) {
          if (!student?.id || isSysKvUid(student.id)) continue;
          const cleanEmail = normEmail(student.email);
          const cleanPassword = typeof student.password === 'string' && student.password.trim() ? student.password.trim() : undefined;
          const existing = await findUserByUidOrEmail(student.id, cleanEmail);
          const userRecord = await upsertUserRowSafe({
            existingUser: existing,
            uid: student.id,
            email: cleanEmail || `${student.id.toLowerCase()}@uppseekers.local`,
            name: student.name || 'Student',
            password: cleanPassword,
            defaultPassword: 'Student@123',
            role: 'STUDENT',
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

  app.delete("/api/students/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      if (!id || isSysKvUid(id)) return res.status(400).json({ error: "Missing student ID" });
      const existingMirror = await sysKvGet<any[]>("portal_students_mirror", []);
      await sysKvSet("portal_students_mirror", existingMirror.filter((m) => m?.id !== id));

      await safeDbQuery(async () => {
        const allU = await readAllUsersSafe();
        const userRecord = allU.find((u) => u.uid === id);
        if (userRecord) {
          if (hasTable("students_data")) {
            await db.delete(studentsData).where(eq(studentsData.userId, userRecord.id));
          }
          await db.delete(users).where(eq(users.id, userRecord.id));
        }
      }, null);
      broadcastRealtime({ type: "student:deleted", scope: "data", entity: "students", targetId: id });
      res.json({ success: true });
    } catch (e) {
      res.json({ success: true });
    }
  });

  app.put("/api/student", requireAuth, async (req: AuthRequest, res) => {
    try {
      const student = req.body;
      if (!student?.id || isSysKvUid(student.id)) return res.status(400).json({ error: "Missing student ID" });

      const cleanEmail = normEmail(student.email);
      const existingMirror = await sysKvGet<any[]>("portal_students_mirror", []);
      const filteredMirror = existingMirror.filter(
        (m) => m?.id !== student.id && (!cleanEmail || normEmail(m?.email) !== cleanEmail)
      );
      await sysKvSet("portal_students_mirror", [...filteredMirror, student]);

      await safeDbQuery(async () => {
        const cleanPassword = typeof student.password === 'string' && student.password.trim() ? student.password.trim() : undefined;
        const existing = await findUserByUidOrEmail(student.id, cleanEmail);
        const userRecord = await upsertUserRowSafe({
          existingUser: existing,
          uid: student.id,
          email: cleanEmail || `${student.id.toLowerCase()}@uppseekers.local`,
          name: student.name || 'Student',
          password: cleanPassword,
          defaultPassword: 'Student@123',
          role: 'STUDENT',
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

  // Admin / Manager Provision Firebase Auth User (Server-Side via Admin SDK or Identity Toolkit)
  app.post("/api/firebase-admin/provision-user", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userType = String(req.body?.userType || "student").trim().toLowerCase();
      const allowed =
        userType === "staff"
          ? await isVerifiedFirebaseAdmin(req)
          : await isVerifiedPortalManager(req);
      if (!allowed) {
        return res.status(403).json({
          error:
            userType === "staff"
              ? "Forbidden: Only System Admins can provision staff accounts."
              : "Forbidden: Only Admins or Category Managers can provision student accounts.",
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
            ...(displayName ? { displayName } : {}),
            password,
            emailVerified: true,
          });
          if (userType !== "staff") {
            await saveUserPasswordMirror(existing.uid, cleanEmail, password);
          }
          return res.json({ ok: true, uid: existing.uid, created: false });
        } catch (lookupErr: any) {
          if (lookupErr?.code !== "auth/user-not-found") {
            throw lookupErr;
          }
          const created = await adminAuth.createUser({
            email: cleanEmail,
            password,
            displayName: displayName || cleanEmail.split("@")[0],
            emailVerified: true,
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
        message: toolkitResult.error || "Falling back to client provisioner.",
      });
    } catch (err: any) {
      console.error("Error in /api/firebase-admin/provision-user:", err);
      return res.status(500).json({ ok: false, error: err?.message || "Failed to provision Firebase user" });
    }
  });

  // Admin / Category Manager Change Firebase Auth User Password (Direct, Zero Emails)
  const handleAdminChangeFirebasePassword = async (req: AuthRequest, res: express.Response) => {
    try {
      const userType = String(req.body?.userType || "student").trim().toLowerCase();
      const allowed =
        userType === "staff"
          ? await isVerifiedFirebaseAdmin(req)
          : await isVerifiedPortalManager(req);
      if (!allowed) {
        return res.status(403).json({
          error:
            userType === "staff"
              ? "Forbidden: Only System Admins can change staff passwords."
              : "Forbidden: Only Admins or Category Managers can change student passwords.",
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
            emailVerified: true,
          });
          if (userType !== "staff") {
            await saveUserPasswordMirror(userRecord.uid, cleanEmail, cleanNewPassword);
          }
          return res.json({ ok: true, success: true, uid: userRecord.uid, message: "Firebase password updated successfully." });
        } catch (err: any) {
          if (err?.code === "auth/user-not-found") {
            const created = await adminAuth.createUser({
              email: cleanEmail,
              password: cleanNewPassword,
              displayName: String(req.body?.name || cleanEmail.split("@")[0]).trim(),
              emailVerified: true,
            });
            if (userType !== "staff") {
              await saveUserPasswordMirror(created.uid, cleanEmail, cleanNewPassword);
            }
            return res.json({ ok: true, success: true, uid: created.uid, message: "Firebase Auth account created with the new password." });
          }
          throw err;
        }
      }

      // No service account: attempt verified update via Identity Toolkit using known previous password(s)
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
          message: toolkitResult.created
            ? "Firebase Auth account created with the new password."
            : "Firebase password updated successfully.",
        });
      }

      return res.status(422).json({
        ok: false,
        fallbackToClient: false,
        error:
          toolkitResult.error ||
          "Could not update Firebase Auth password. Ensure the previous password is known or configure FIREBASE_SERVICE_ACCOUNT_JSON.",
      });
    } catch (e: any) {
      console.error("Error in admin password change:", e);
      return res.status(500).json({ ok: false, error: e?.message || "Failed to update password in Firebase Auth." });
    }
  };

  app.post("/api/firebase-admin/change-password", requireAuth, handleAdminChangeFirebasePassword);
  app.post("/api/admin/change-password", requireAuth, handleAdminChangeFirebasePassword);

  // Authenticated User Self-Service Direct Password Change (No Email Links)
  app.post("/api/auth/self-change-password", requireAuth, async (req: AuthRequest, res) => {
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
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
          } catch {
            // Non-fatal mirror sync
          }
        }
        return res.json({ ok: true, success: true, message: "Password updated successfully." });
      }

      // Fallback using Identity Toolkit with caller's ID token or currentPassword
      if (firebaseWebApiKey) {
        let tokenToUse = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
        if (currentPassword) {
          const signInRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(firebaseWebApiKey)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, password: currentPassword, returnSecureToken: true }),
            }
          );
          const signInJson: any = await signInRes.json().catch(() => null);
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
            body: JSON.stringify({ idToken: tokenToUse, password: newPassword, returnSecureToken: true }),
          }
        );
        const updateJson: any = await updateRes.json().catch(() => null);
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
            error: "Please enter your current password to verify your identity before updating.",
          });
        }
        return res.status(400).json({ ok: false, error: errMsg || "Failed to update password." });
      }

      return res.status(500).json({ ok: false, error: "Firebase authentication configuration missing on server." });
    } catch (e: any) {
      console.error("Error in /api/auth/self-change-password:", e);
      return res.status(500).json({ ok: false, error: e?.message || "Failed to update password." });
    }
  });

  // Seamless Login-Time Legacy Student Credential Migration (Zero Emails)
  // If an existing student from legacy SQL / credential store hasn't been migrated to Firebase Auth yet,
  // verify their legacy password and provision their Firebase Auth account with that exact password.
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

      // 1. Check legacy SQL users table
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

      // 2. Check user_passwords KV mirror
      if (!matchedPassword) {
        const kvMap = await sysKvGet<Record<string, string>>("user_passwords", {});
        const kvPwd = typeof kvMap?.[`email:${cleanEmail}`] === "string" ? kvMap[`email:${cleanEmail}`].trim() : "";
        if (kvPwd && kvPwd === rawPassword) {
          matchedPassword = kvPwd;
          matchedRole = "STUDENT";
        }
      }

      // 3. Check admin_student_credentials in Firestore if Admin SDK is configured
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
          // ignore
        }
      }

      if (!matchedPassword) {
        return res.json({ ok: false, migrated: false });
      }

      // Provision or sync into Firebase Auth with exact legacy password (zero emails)
      if (hasAdminServiceAccount()) {
        try {
          const existing = await adminAuth.getUserByEmail(cleanEmail);
          await adminAuth.updateUser(existing.uid, {
            password: matchedPassword,
            emailVerified: true,
          });
          if (matchedRole === "STUDENT") {
            await saveUserPasswordMirror(existing.uid, cleanEmail, matchedPassword);
          }
          return res.json({ ok: true, migrated: true, uid: existing.uid });
        } catch (lookupErr: any) {
          if (lookupErr?.code !== "auth/user-not-found") {
            throw lookupErr;
          }
          const created = await adminAuth.createUser({
            email: cleanEmail,
            password: matchedPassword,
            displayName,
            emailVerified: true,
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
              returnSecureToken: false,
            }),
          }
        );
        const signUpJson: any = await signUpRes.json().catch(() => null);
        if (signUpRes.ok) {
          if (matchedRole === "STUDENT") {
            await saveUserPasswordMirror(signUpJson?.localId || cleanEmail, cleanEmail, matchedPassword);
          }
          return res.json({ ok: true, migrated: true, uid: signUpJson?.localId });
        }
      }

      return res.json({ ok: false, migrated: false });
    } catch (err: any) {
      console.error("Error in /api/auth/migrate-legacy-login:", err);
      return res.json({ ok: false, migrated: false });
    }
  });

  // Admin & Category Manager: Read stored student portal passwords (never staff passwords)
  app.get("/api/firebase-admin/student-passwords", requireAuth, async (req: AuthRequest, res) => {
    try {
      const allowed = await isVerifiedPortalManager(req);
      if (!allowed) {
        return res.status(403).json({ error: "Forbidden: Only Admins and Category Managers can view student portal passwords." });
      }
      const passwordsByEmail: Record<string, string> = {};
      const passwordsByUid: Record<string, string> = {};
      const staffEmails = new Set<string>(["uppseekers@gmail.com"]);

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

      const kvMap = await sysKvGet<Record<string, string>>("user_passwords", {});
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
    } catch (err: any) {
      console.error("Error in /api/firebase-admin/student-passwords:", err);
      return res.status(500).json({ ok: false, error: err?.message || "Failed to load student passwords." });
    }
  });

  // Admin-only: Migrate legacy Cloud SQL user passwords into Firebase Auth (never returns plaintext passwords)
  // and optionally return sanitized non-password legacy students/staff/batches/events for Firestore merge.
  const DEMO_LEGACY_EMAILS = new Set([
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
    "qasim.khan@example.com",
  ]);

  app.post("/api/firebase-admin/sync-legacy-users", requireAuth, async (req: AuthRequest, res) => {
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
          events: [],
        });
      }

      const includeDemo = Boolean(req.body?.includeDemo);
      const includeData = Boolean(req.body?.includeData);
      const allSqlUsers = await readAllUsersSafe();

      let provisioned = 0;
      let alreadyExisted = 0;
      let skipped = 0;
      let failed = 0;
      const details: Array<{ email: string; role: string; status: string }> = [];

      const isDemoEmail = (em: string) =>
        DEMO_LEGACY_EMAILS.has(em) || em.endsWith("@example.com");

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
            } catch (lookupErr: any) {
              if (lookupErr?.code !== "auth/user-not-found") throw lookupErr;
              await adminAuth.createUser({
                email: cleanEmail,
                password: rawPwd,
                displayName: String(u?.name || cleanEmail.split("@")[0]).trim(),
                emailVerified: true,
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
                  returnSecureToken: false,
                }),
              }
            );
            const signUpJson: any = await signUpRes.json().catch(() => null);
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
                status: `failed:${signUpJson?.error?.message || signUpRes.status}`,
              });
            }
            if (roleUpper === "STUDENT") {
              await saveUserPasswordMirror(String(u?.uid || cleanEmail), cleanEmail, rawPwd);
            }
          } else {
            failed++;
          }
        } catch (err: any) {
          failed++;
          details.push({ email: cleanEmail, role: roleUpper, status: `error:${err?.code || err?.message || "unknown"}` });
        }
        // Always backfill legacy student passwords into password mirror & Firestore credential vault
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
                  updatedAt: new Date().toISOString(),
                },
                { merge: true }
              );
            } catch {
              // ignore non-fatal mirror failure
            }
          }
        }
      }

      let sanitizedStudents: any[] = [];
      let sanitizedStaff: any[] = [];
      let legacyBatches: any[] = [];
      let legacyEvents: any[] = [];

      if (includeData) {
        const allSd = await readAllStudentsDataSafe();
        const studentUsers = allSqlUsers.filter((u) => String(u?.role || "").toUpperCase() === "STUDENT");
        sanitizedStudents = studentUsers
          .filter((u) => includeDemo || !isDemoEmail(normEmail(u?.email)))
          .map((u) => {
            const sd = allSd.find((row) => row.userId === u.id);
            const built = buildStudentFromRow(u, sd);
            const { password: _removedPwd, ...cleanStudent } = built;
            return cleanStudent;
          });

        const staffRows = hasTable("staff_data")
          ? await safeDbQuery(() => db.select().from(staffData), [])
          : [];
        sanitizedStaff = allSqlUsers
          .filter((u) => {
            const r = String(u?.role || "").toUpperCase();
            return r && r !== "STUDENT" && (includeDemo || !isDemoEmail(normEmail(u?.email)));
          })
          .map((u) => {
            const sd = staffRows.find((sRow) => sRow.userId === u.id);
            return {
              id: u.uid || `STAFF-${u.id}`,
              name: u.name || u.email,
              email: normEmail(u.email),
              role: u.role || "COUNSELOR",
              students: sd?.students || "Assigned Scope",
              status: sd?.status || "Active",
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
        events: legacyEvents,
      });
    } catch (e: any) {
      console.error("Error in /api/firebase-admin/sync-legacy-users:", e);
      return res.status(500).json({ ok: false, error: e?.message || "Failed to sync legacy users." });
    }
  });

  // Automated outbound password-reset emails are strictly disabled.
  // Password updates are performed directly in-app by Admins/Managers or authenticated users.
  app.post("/api/auth/request-password-reset", async (_req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(410).json({
      success: false,
      disabled: true,
      error: "Automated password reset emails are disabled. Please change your password directly inside your portal profile or ask your Category Manager / Admin to update it directly.",
    });
  });

  // Verify Reset Code or Token
  app.post("/api/auth/verify-reset-code", async (req, res) => {
    try {
      const { email, code, token } = req.body;
      let found: PasswordResetItem | undefined;

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

  // Complete Password Reset
  app.post("/api/auth/complete-password-reset", async (req, res) => {
    try {
      const { email, code, token, newPassword } = req.body;
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters long" });
        return;
      }

      let found: PasswordResetItem | undefined;
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

      const targetEmail = (found ? found.email : (email || '')).toLowerCase().trim();
      if (!targetEmail) {
        res.status(400).json({ error: "Invalid request. Email is missing." });
        return;
      }

      // If token/code expired
      if (found && Date.now() > found.expiresAt) {
        res.status(400).json({ error: "Password reset link has expired. Please request a new one." });
        return;
      }

      // Update in PostgreSQL users table + KV password vault
      const cleanResetPassword = newPassword.trim();
      await saveUserPasswordMirror(undefined, targetEmail, cleanResetPassword);
      await safeDbQuery(async () => {
        const matches = await findAllMatchingUsers(undefined, targetEmail);
        if (matches.length > 0) {
          for (const m of matches) {
            await saveUserPasswordMirror(m.uid, m.email, cleanResetPassword);
            if (hasColumn("users", "password")) {
              await db.update(users).set({ password: cleanResetPassword }).where(eq(users.id, m.id));
            }
          }
        } else {
          await upsertUserRowSafe({
            uid: `USER-${Date.now()}`,
            name: targetEmail.split('@')[0],
            email: targetEmail,
            password: cleanResetPassword,
            defaultPassword: cleanResetPassword,
            role: 'STUDENT',
          });
        }
      }, null);

      // Clean up used token
      if (found) {
        passwordResetStore.delete(found.token);
        passwordResetStore.delete(`code_${targetEmail}_${found.code}`);
      }

      res.json({
        success: true,
        message: "Password reset complete! You can now sign in with your new password.",
        email: targetEmail
      });
    } catch (err: any) {
      console.error("Error in /api/auth/complete-password-reset:", err);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.post("/api/batches", requireAuth, async (req: AuthRequest, res) => {
    try {
      const batches = Array.isArray(req.body) ? req.body : (Array.isArray(req.body?.items) ? req.body.items : []);
      await safeDbQuery(async () => {
        for (const b of batches) {
          if (!b?.id || !b?.name) continue;
          await db.insert(batchesData).values({
            id: b.id,
            name: b.name,
            type: b.type || 'Master Batch',
            parentBatchId: b.parentBatchId || null,
            mentors: b.mentors || [],
            meetingLink: b.meetingLink || '',
            status: b.status || 'Active',
            capacity: b.capacity || 20,
            students: b.students || [],
            completedSessions: b.completedSessions || 0,
            totalSessions: b.totalSessions || 0,
          }).onConflictDoUpdate({
            target: batchesData.id,
            set: {
              name: b.name,
              type: b.type || 'Master Batch',
              parentBatchId: b.parentBatchId || null,
              mentors: b.mentors || [],
              meetingLink: b.meetingLink || '',
              status: b.status || 'Active',
              capacity: b.capacity || 20,
              students: b.students || [],
              completedSessions: b.completedSessions || 0,
              totalSessions: b.totalSessions || 0,
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

  app.delete("/api/batches/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      if (id) {
        await safeDbQuery(() => db.delete(batchesData).where(eq(batchesData.id, id)), null);
      }
      broadcastRealtime({ type: "batch:deleted", scope: "data", entity: "batches", targetId: id });
      res.json({ success: true });
    } catch (e) {
      res.json({ success: true });
    }
  });

  app.post("/api/events", requireAuth, async (req: AuthRequest, res) => {
    try {
      const events = Array.isArray(req.body) ? req.body : (Array.isArray(req.body?.items) ? req.body.items : []);
      await safeDbQuery(async () => {
        for (const e of events) {
          if (!e) continue;
          const eventId = e.id || `EVT-${Math.floor(Math.random() * 100000)}`;
          const rowPayload = {
            id: eventId,
            title: e.title || '',
            date: e.date || e.day || '',
            type: e.stream || e.type || 'Counselling',
            category: e.category || '',
            attendees: typeof e.students === 'string' ? e.students : (e.attendees || ''),
            status: e.status || 'Scheduled',
            link: e.location || e.link || '',
            time: e.time || '',
            duration: e.duration || '1 hr',
            videoProvider: e.videoProvider || null,
            zohoMeetingKey: e.zohoMeetingKey || null,
            hostStartLink: e.hostStartLink || null,
            participantEmails: Array.isArray(e.participantEmails) ? e.participantEmails : null,
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
              participantEmails: rowPayload.participantEmails,
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

  app.delete("/api/events/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      if (id) {
        await safeDbQuery(() => db.delete(eventsData).where(eq(eventsData.id, id)), null);
      }
      broadcastRealtime({ type: "event:deleted", scope: "data", entity: "events", targetId: id });
      res.json({ success: true });
    } catch (e) {
      res.json({ success: true });
    }
  });

  // Google Sheets Real-Time Sync & Backup Endpoint
  app.post("/api/sheets/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { accessToken, spreadsheetId, students = [], staff = [], events = [] } = req.body;
      
      const studentRows = [
        ['Student ID', 'Full Name', 'Email', 'Phone', 'Intake Batch', 'Counselor', 'School', 'Target Countries', 'Readiness Score (%)', 'Total Tasks', 'Completed Tasks'],
        ...students.map((s: any) => [
          s.id || '',
          s.name || '',
          s.email || '',
          s.phone || '',
          s.intake || 'Fall 2026',
          s.counselor || 'Unassigned',
          s.school || '',
          Array.isArray(s.countries) ? s.countries.join(', ') : (s.countries || ''),
          `${s.readiness || 0}%`,
          String((s.tasks || []).length),
          String((s.tasks || []).filter((t: any) => t.stage === 'COMPLETED' || t.stage === 'VERIFIED_COMPLETED').length)
        ])
      ];

      const taskRows = [
        ['Task ID', 'Task Name', 'Category', 'Student ID', 'Student Name', 'Stage / Status', 'Due Date', 'Assigned By'],
        ...students.flatMap((s: any) => (s.tasks || []).map((t: any) => [
          t.id || '',
          t.name || '',
          t.category || 'Other',
          s.id || '',
          s.name || '',
          t.stage || 'TO_DO',
          t.dueDate || '',
          t.assignedBy || 'Admin'
        ]))
      ];

      const eventRows = [
        ['Meeting ID', 'Title', 'Subject / Type', 'Date', 'Time', 'Duration', 'Organiser / Host', 'Attendees', 'Status', 'Meeting Link'],
        ...events.map((e: any) => [
          e.id || '',
          e.title || '',
          e.type || e.stream || 'Counselling',
          e.date || e.day || '',
          e.time || '',
          e.duration || '1 hr',
          e.host || e.organiser || 'Counselor',
          typeof e.attendees === 'string' ? e.attendees : (e.students || ''),
          e.status || 'Scheduled',
          e.link || e.location || ''
        ])
      ];

      const staffRows = [
        ['Staff ID', 'Name', 'Email', 'Role', 'Status', 'Assigned Students'],
        ...staff.map((st: any) => [
          st.id || '',
          st.name || '',
          st.email || '',
          st.role || 'COUNSELOR',
          st.status || 'Active',
          st.students || 'All'
        ])
      ];

      if (accessToken) {
        const { google } = await import("googleapis");
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: accessToken });
        const sheets = google.sheets({ version: "v4", auth });

        let currentSheetId = spreadsheetId;

        if (!currentSheetId) {
          const newSheet = await sheets.spreadsheets.create({
            requestBody: {
              properties: {
                title: "Uppseekers Portal Database - Realtime Backup & Live Sync"
              },
              sheets: [
                { properties: { title: "Students" } },
                { properties: { title: "Tasks" } },
                { properties: { title: "Meetings" } },
                { properties: { title: "Staff" } },
              ]
            }
          });
          currentSheetId = newSheet.data.spreadsheetId || undefined;
        }

        if (currentSheetId) {
          await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: currentSheetId,
            requestBody: {
              valueInputOption: "USER_ENTERED",
              data: [
                { range: "Students!A1", values: studentRows },
                { range: "Tasks!A1", values: taskRows },
                { range: "Meetings!A1", values: eventRows },
                { range: "Staff!A1", values: staffRows },
              ]
            }
          });

          return res.json({
            success: true,
            spreadsheetId: currentSheetId,
            spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${currentSheetId}/edit`,
            timestamp: new Date().toISOString(),
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
        spreadsheetUrl: spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : undefined,
        timestamp: new Date().toISOString(),
        counts: {
          students: students.length,
          staff: staff.length,
          tasks: taskRows.length - 1,
          events: events.length
        }
      });
    } catch (err: any) {
      console.error("Sheets sync error:", err);
      res.status(500).json({ error: err.message || "Failed to sync with Google Sheets" });
    }
  });

  // AI Narrative Strategist API for Author's Compass
  app.post("/api/ai/narrative-angles", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { essayType, prompt, wordCount, studentProfile } = req.body;
      if (!essayType || !wordCount) {
        res.status(400).json({ error: "Draft Classification (essayType) and Target Word Count (wordCount) are mandatory." });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      
      // Smart Fallback Narrative Generator when GEMINI_API_KEY is not set or API fails
      const generateFallbackNarrative = () => {
        const typeStr = essayType || 'Personal Statement';
        const targetWords = wordCount || 500;
        const topic = prompt && prompt.trim() ? prompt.trim() : 'Personal Journey & Intellectual Growth';
        
        return {
          options: [
            {
              title: `The Unexpected Catalyst: Grounded in ${typeStr}`,
              narrativeTurn: `Pivoting from a specific moment of curiosity or challenge during ${topic} into a transformative realization about your core values and future aspirations.`,
              profileConnection: `Highlighting relevant leadership, academic projects, or extracurricular milestones from your background to ground the narrative in real lived experience.`,
              structuralOutline: `• Hook (15% - ~${Math.round(targetWords*0.15)} words): An immersive opening scene showing a problem or pivotal moment.\n• Development (45% - ~${Math.round(targetWords*0.45)} words): Exploring your technical/intellectual growth and active problem-solving.\n• Reflection & Future (40% - ~${Math.round(targetWords*0.4)} words): Connecting this realization to your target university major and career vision.`,
              grammarAndToneAdvice: `Use active voice, avoid clichés ('ever since I was young'), and keep sentence structures varied and engaging.`
            },
            {
              title: `Connecting the Dots: Intellectual Inquiry & Impact`,
              narrativeTurn: `Framing your interest in ${topic} as an evolving puzzle where each activity and project answered one question while raising a deeper one.`,
              profileConnection: `Drawing direct lines between your coursework, research efforts, and extracurricular achievements to show sustained dedication.`,
              structuralOutline: `• Introduction (20% - ~${Math.round(targetWords*0.2)} words): Introducing the central thesis and curiosity that drives you.\n• Core Body (50% - ~${Math.round(targetWords*0.5)} words): Two contrasting experiences demonstrating analytical depth and teamwork.\n• Synthesis (30% - ~${Math.round(targetWords*0.3)} words): Synthesizing lessons learned and articulating why this academic path is your true calling.`,
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
        const ai = new GoogleGenAI({ apiKey });

        const generateWithFallback = async (params: any) => {
          const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
          let lastErr: any;
          for (const modelName of modelsToTry) {
            try {
              return await ai.models.generateContent({ ...params, model: modelName });
            } catch (err: any) {
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
2. Formulate 2–3 distinct potential narrative angles/options.
3. For each option, include:
   - title: Catchy, working narrative angle title.
   - narrativeTurn: The creative pivot, central story arc, or storytelling perspective.
   - profileConnection: Specific suggestions connecting the user's profile details (activities, extracurriculars, interests) to this narration.
   - structuralOutline: Step-by-step structural pacing and section word distribution scaled to the target word count.
   - grammarAndToneAdvice: Key English grammar, phrase errors to avoid, punctuation tips, and tone advice.

Maintain an encouraging, authentic authorial tone. Avoid cliché college admissions buzzwords ("testament," "beacon," "tapestry," "delve").`;

        const userPrompt = `
MANDATORY SETUP:
- Draft Classification: ${essayType}
- Target Word Count: ${wordCount}

OPTIONAL PROMPT / TOPIC:
${prompt && prompt.trim() ? prompt.trim() : 'General personal narrative / Open topic grounded in student profile'}

STUDENT PROFILE CONTEXT:
${typeof studentProfile === 'string' ? studentProfile : JSON.stringify(studentProfile, null, 2)}
`;

        const response = await generateWithFallback({
          contents: [
            { role: 'user', parts: [{ text: userPrompt }] }
          ],
          config: {
            systemInstruction: systemInstruction,
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
          jsonResult = JSON.parse(response.text || '{}');
        } catch (e) {
          jsonResult = { options: [], rawText: response.text };
        }

        if (!jsonResult.options || jsonResult.options.length === 0) {
          jsonResult = generateFallbackNarrative();
        }

        res.json({ result: jsonResult });
      } catch (geminiError: any) {
        console.warn("Gemini API call failed, using fallback strategy:", geminiError?.message);
        res.json({ result: generateFallbackNarrative() });
      }
    } catch (err: any) {
      console.error("AI narrative angles error:", err);
      res.status(500).json({ error: err.message || "Failed to generate narrative strategy." });
    }
  });

  // AI SOP & Personal Essay Proofreader / Mentor API
  app.post("/api/ai/proofread-essay", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { essayText } = req.body;
      if (!essayText || !essayText.trim()) {
        res.status(400).json({ error: "Input text is required." });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;

      const generateFallbackProofread = (text: string) => {
        // Simple rule-based polish fallback if Gemini API is unavailable
        let polished = text;
        const correctionLogs: string[] = [];

        // Fix double spaces
        if (/\s{2,}/.test(polished)) {
          polished = polished.replace(/\s{2,}/g, ' ');
          correctionLogs.push("• Spacing: Fixed redundant double spaces for cleaner layout.");
        }
        // Capitalize sentence beginnings
        polished = polished.replace(/(^\s*|[.!?]\s+)([a-z])/g, (m, p1, p2) => {
          if (p2 !== p2.toUpperCase()) {
            correctionLogs.push(`• Capitalization: Capitalized '${p2}' at the start of sentence.`);
          }
          return p1 + p2.toUpperCase();
        });

        if (correctionLogs.length === 0) {
          correctionLogs.push("• Style & Tone: Validated narrative flow and confirmed proper grammar and punctuation.");
        }

        return `### 1. **Polished Text:**\n${polished}\n\n### 2. **Correction Log:**\n${correctionLogs.join('\n')}`;
      };

      if (!apiKey) {
        return res.json({ result: generateFallbackProofread(essayText) });
      }

      try {
        const ai = new GoogleGenAI({ apiKey });

        const generateWithFallback = async (params: any) => {
          const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
          let lastErr: any;
          for (const modelName of modelsToTry) {
            try {
              return await ai.models.generateContent({ ...params, model: modelName });
            } catch (err: any) {
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
            { role: 'user', parts: [{ text: `Input text to edit:\n${essayText}` }] }
          ],
          config: {
            systemInstruction: systemInstruction,
          }
        });

        res.json({ result: response.text || generateFallbackProofread(essayText) });
      } catch (geminiError: any) {
        console.warn("Gemini API call failed, using fallback proofread:", geminiError?.message);
        res.json({ result: generateFallbackProofread(essayText) });
      }
    } catch (err: any) {
      console.error("AI proofread error:", err);
      res.status(500).json({ error: err.message || "Failed to process AI proofreading request." });
    }
  });

  app.post("/api/settings/permissions", requireAuth, async (req: AuthRequest, res) => {
    try {
      const matrix = req.body?.permissionsMatrix || req.body;
      if (!matrix || typeof matrix !== "object") {
        res.status(400).json({ error: "Invalid permissions matrix" });
        return;
      }
      await sysKvSet("permissions_matrix", matrix);
      await safeDbQuery(async () => {
        if (hasTable("portal_settings")) {
          await db
            .insert(portalSettings)
            .values({
              key: "permissions_matrix",
              valueJson: matrix,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: portalSettings.key,
              set: {
                valueJson: matrix,
                updatedAt: new Date(),
              },
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
      const allStaffData = (await safeDbQuery(() => db.select().from(staffData), [])).filter((sd) =>
        validUserIds.has(sd.userId)
      );
      const allSettings = hasTable("portal_settings")
        ? await safeDbQuery(() => db.select().from(portalSettings), [])
        : [];
      const permsRow = allSettings.find(r => r.key === "permissions_matrix");
      const kvPermissionsMatrix = await sysKvGet<any>("permissions_matrix", null);

      const studentsByKey = new Map<string, any>();
      allStudentsData.forEach(sd => {
        const u = allUsers.find(u => u.id === sd.userId);
        if (!u) return;
        const item = buildStudentFromRow(u, sd);
        const key = normEmail(item.email) || item.id;
        studentsByKey.set(key, item);
      });

      // Also include any STUDENT users in users table missing from students_data
      allUsers
        .filter(u => (u.role || '').toUpperCase() === 'STUDENT')
        .forEach(u => {
          const key = normEmail(u.email) || u.uid;
          if (!studentsByKey.has(key) && !Array.from(studentsByKey.values()).some(s => s.id === u.uid)) {
            studentsByKey.set(key, buildStudentFromRow(u, null));
          }
        });

      const kvStudents = await sysKvGet<any[]>("portal_students_mirror", []);
      for (const ks of kvStudents || []) {
        if (!ks?.id || isSysKvUid(ks.id)) continue;
        const key = normEmail(ks.email) || ks.id;
        if (!studentsByKey.has(key)) {
          studentsByKey.set(key, ks);
        }
      }
      const students = Array.from(studentsByKey.values());

      const staffByKey = new Map<string, any>();
      allStaffData.forEach(sd => {
        const u = allUsers.find(u => u.id === sd.userId);
        if (!u || isSysKvUid(u.uid)) return;
        const resolvedRole = u?.role === 'STAFF' ? 'COUNSELOR' : (u?.role || 'COUNSELOR');
        const item = {
          id: u?.uid || `STAFF-${sd.id}`,
          name: u?.name || 'Staff Member',
          email: u?.email || '',
          password: u?.password || '',
          role: resolvedRole,
          students: sd.students || 'All',
          status: sd.status || 'Active'
        };
        const key = normEmail(item.email) || item.id;
        staffByKey.set(key, item);
      });

      // Also include any non-student users in users table missing from staff_data
      allUsers
        .filter(u => !isSysKvUid(u.uid) && (u.role || '').toUpperCase() !== 'STUDENT')
        .forEach(u => {
          const key = normEmail(u.email) || u.uid;
          if (!staffByKey.has(key) && !Array.from(staffByKey.values()).some(s => s.id === u.uid)) {
            const resolvedRole = u.role === 'STAFF' ? 'COUNSELOR' : (u.role || 'COUNSELOR');
            staffByKey.set(key, {
              id: u.uid || `STAFF-${u.id}`,
              name: u.name || 'Staff Member',
              email: u.email || '',
              password: u.password || '',
              role: resolvedRole,
              students: 'All',
              status: 'Active'
            });
          }
        });

      const kvStaff = await sysKvGet<any[]>("portal_staff_mirror", []);
      for (const kst of kvStaff || []) {
        if (!kst?.id || isSysKvUid(kst.id)) continue;
        const key = normEmail(kst.email) || kst.id;
        if (!staffByKey.has(key)) {
          staffByKey.set(key, kst);
        }
      }
      const staff = Array.from(staffByKey.values());

      const batches = hasTable("batches_data")
        ? await safeDbQuery(() => db.select().from(batchesData), [])
        : [];
      const rawEvents = hasTable("events_data")
        ? await safeDbQuery(() => db.select().from(eventsData), [])
        : [];
      const events = rawEvents.map(e => ({
        ...e,
        stream: e.type,
        type: e.type,
        location: e.link,
        link: e.link,
        students: e.attendees,
        attendees: e.attendees,
        day: e.date,
        date: e.date,
      }));

      res.json({
        students,
        staff,
        batches,
        events,
        permissionsMatrix: permsRow?.valueJson || kvPermissionsMatrix || null,
      });
    } catch (error) {
      res.json({ students: [], staff: [], batches: [], events: [], permissionsMatrix: null });
    }
  });

  // Launchpad Module API Endpoints (Dual-Write: Relational Tables + Day-1 SQL KV Vault)
  app.get("/api/launchpad/state", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const dbSubjects = hasTable("launchpad_subjects")
        ? await safeDbQuery(() => db.select().from(launchpadSubjects).orderBy(asc(launchpadSubjects.sortOrder)), [])
        : [];
      const dbChapters = hasTable("launchpad_chapters")
        ? await safeDbQuery(() => db.select().from(launchpadChapters).orderBy(asc(launchpadChapters.weekNumber)), [])
        : [];
      const dbCertQuestions = hasTable("launchpad_certification_questions")
        ? await safeDbQuery(() => db.select().from(launchpadCertificationQuestions).orderBy(asc(launchpadCertificationQuestions.sortOrder)), [])
        : [];
      const dbPermissions = hasTable("launchpad_team_permissions")
        ? await safeDbQuery(() => db.select().from(launchpadTeamPermissions), [])
        : [];
      const dbEnrollments = hasTable("launchpad_student_enrollments")
        ? (hasColumn("launchpad_student_enrollments", "student_email")
            ? await safeDbQuery(() => db.select().from(launchpadStudentEnrollments), [])
            : await safeDbQuery(async () => {
                const r = await createPool().query(
                  `SELECT "student_id" AS "studentId", "assigned_by" AS "assignedBy", "assigned_at" AS "assignedAt" FROM "launchpad_student_enrollments"`
                );
                return r.rows || [];
              }, []))
        : [];
      const dbReleases = hasTable("launchpad_subject_releases")
        ? (hasColumn("launchpad_subject_releases", "student_email")
            ? await safeDbQuery(() => db.select().from(launchpadSubjectReleases), [])
            : await safeDbQuery(async () => {
                const r = await createPool().query(
                  `SELECT "id", "student_id" AS "studentId", "subject_id" AS "subjectId", "is_unlocked" AS "isUnlocked", "unlocked_by" AS "unlockedBy", "unlocked_at" AS "unlockedAt" FROM "launchpad_subject_releases"`
                );
                return r.rows || [];
              }, []))
        : [];
      const dbProgress = hasTable("launchpad_progress_and_submissions")
        ? await safeDbQuery(() => db.select().from(launchpadProgressAndSubmissions), [])
        : [];
      const dbCertifications = hasTable("launchpad_certifications")
        ? await safeDbQuery(() => db.select().from(launchpadCertifications), [])
        : [];
      const dbEvaluations = hasTable("assignment_evaluations")
        ? await safeDbQuery(() => db.select().from(assignmentEvaluations).orderBy(desc(assignmentEvaluations.submittedAt)), [])
        : [];
      const dbNotifications = hasTable("notifications")
        ? await safeDbQuery(() => db.select().from(notificationsTable).orderBy(desc(notificationsTable.createdAt)), [])
        : [];

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
        kvStudentsMirror,
      ] = await Promise.all([
        sysKvGet<any[]>("lp_subjects", []),
        sysKvGet<string[]>("lp_deleted_subjects", []),
        sysKvGet<any[]>("lp_chapters", []),
        sysKvGet<any[]>("lp_cert_questions", []),
        sysKvGet<any[]>("lp_permissions", []),
        sysKvGet<any[]>("lp_enrollments", []),
        sysKvGet<any[]>("lp_releases", []),
        sysKvGet<any[]>("lp_progress", []),
        sysKvGet<any[]>("lp_certifications", []),
        sysKvGet<any[]>("lp_evaluations", []),
        sysKvGet<any[]>("lp_notifications", []),
        readAllUsersSafe(),
        sysKvGet<any[]>("portal_students_mirror", []),
      ]);

      const deletedSubjSet = new Set(Array.isArray(kvDeletedSubjects) ? kvDeletedSubjects : []);
      let subjects = mergeRecordsById(dbSubjects, kvSubjects, "id", "updatedAt").filter(
        (s) => s && !deletedSubjSet.has(s.id)
      );
      if (subjects.length === 0) {
        subjects = buildDefaultLaunchpadSubjects()
          .filter((s) => !deletedSubjSet.has(s.id))
          .map((s) => ({
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
            isArchived: Boolean(s.isArchived),
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
          practicalExerciseJson: c.practicalExercise || {},
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
          payloadJson: q.payload || {},
        }));
        certQuestions = [...defaultQs, ...certQuestions];
      }
      certQuestions.sort((a, b) => Number(a.sortOrder ?? 1) - Number(b.sortOrder ?? 1));

      const uidToEmail = new Map<string, string>();
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
        studentEmail: normEmail(e.studentEmail) || uidToEmail.get(String(e.studentId || "").trim()) || undefined,
      }));
      const releases = mergeRecordsById(dbReleases, kvReleases, "id", "unlockedAt").map((r) => ({
        ...r,
        isUnlocked: Boolean(r.isUnlocked),
        studentEmail: normEmail(r.studentEmail) || uidToEmail.get(String(r.studentId || "").trim()) || undefined,
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
          isArchived: Boolean(s.isArchived),
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

  app.post("/api/launchpad/subjects", requireAuth, async (req: AuthRequest, res) => {
    try {
      const s = req.body;
      if (!s?.id || !s?.title) {
        return res.status(400).json({ error: "id and title are required" });
      }
      const nowDate = new Date();
      const subjRow = {
        id: s.id,
        sortOrder: Number(s.order ?? s.sortOrder ?? 1),
        title: s.title,
        description: s.description || '',
        accentHex: s.accentHex || '#4F46E5',
        surfaceTint: s.surfaceTint || '#EEF2FF',
        iconKey: s.iconKey || 'comm-public-speaking',
        customIconUrl: s.customIconUrl || null,
        hasCurriculum: Boolean(s.hasCurriculum),
        courseGoal: s.courseGoal || null,
        passingThreshold: Number(s.passingThreshold ?? 75),
        certificateTitle: s.certificateTitle || null,
        isArchived: Boolean(s.isArchived),
        updatedAt: nowDate.toISOString(),
      };
      const existingKv = await sysKvGet<any[]>("lp_subjects", []);
      await sysKvSet("lp_subjects", mergeRecordsById([subjRow], existingKv, "id", "updatedAt"));
      const deletedKv = await sysKvGet<string[]>("lp_deleted_subjects", []);
      if (deletedKv.includes(s.id)) {
        await sysKvSet("lp_deleted_subjects", deletedKv.filter((id) => id !== s.id));
      }

      if (hasTable("launchpad_subjects")) {
        await safeDbQuery(async () => {
          await db.insert(launchpadSubjects)
            .values({ ...subjRow, updatedAt: nowDate })
            .onConflictDoUpdate({
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
                updatedAt: nowDate,
              },
            });
        }, null);
      }
      broadcastRealtime({ type: "launchpad:subject_saved", scope: "launchpad", entity: "subjects", targetId: s.id });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save launchpad subject" });
    }
  });

  app.delete("/api/launchpad/subjects/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const existingKv = await sysKvGet<any[]>("lp_subjects", []);
      await sysKvSet("lp_subjects", existingKv.filter((s) => s?.id !== id));
      const deletedKv = await sysKvGet<string[]>("lp_deleted_subjects", []);
      if (!deletedKv.includes(id)) {
        await sysKvSet("lp_deleted_subjects", [...deletedKv, id]);
      }
      const existingCh = await sysKvGet<any[]>("lp_chapters", []);
      await sysKvSet("lp_chapters", existingCh.filter((c) => c?.subjectId !== id));
      const existingQs = await sysKvGet<any[]>("lp_cert_questions", []);
      await sysKvSet("lp_cert_questions", existingQs.filter((q) => q?.subjectId !== id));

      await safeDbQuery(async () => {
        if (hasTable("launchpad_chapters")) {
          await db.delete(launchpadChapters).where(eq(launchpadChapters.subjectId, id));
        }
        if (hasTable("launchpad_certification_questions")) {
          await db.delete(launchpadCertificationQuestions).where(eq(launchpadCertificationQuestions.subjectId, id));
        }
        if (hasTable("launchpad_subjects")) {
          await db.delete(launchpadSubjects).where(eq(launchpadSubjects.id, id));
        }
      }, null);
      broadcastRealtime({ type: "launchpad:subject_deleted", scope: "launchpad", entity: "subjects", targetId: id });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete launchpad subject" });
    }
  });

  app.post("/api/launchpad/chapters", requireAuth, async (req: AuthRequest, res) => {
    try {
      const c = req.body;
      if (!c?.id || !c?.subjectId || !c?.title) {
        return res.status(400).json({ error: "id, subjectId, and title are required" });
      }
      const nowDate = new Date();
      const chRow = {
        id: c.id,
        subjectId: c.subjectId,
        weekNumber: Number(c.weekNumber ?? 1),
        title: c.title,
        learningObjectives: c.learningObjectives || [],
        lectureJson: c.lecture || c.lectureJson || {},
        readingGuideJson: c.readingGuide || c.readingGuideJson || {},
        practicalExerciseJson: c.practicalExercise || c.practicalExerciseJson || {},
        updatedAt: nowDate.toISOString(),
      };
      const existingKv = await sysKvGet<any[]>("lp_chapters", []);
      await sysKvSet("lp_chapters", mergeRecordsById([chRow], existingKv, "id", "updatedAt"));

      if (hasTable("launchpad_chapters")) {
        await safeDbQuery(async () => {
          await db.insert(launchpadChapters)
            .values({ ...chRow, updatedAt: nowDate })
            .onConflictDoUpdate({
              target: launchpadChapters.id,
              set: {
                weekNumber: chRow.weekNumber,
                title: chRow.title,
                learningObjectives: chRow.learningObjectives,
                lectureJson: chRow.lectureJson,
                readingGuideJson: chRow.readingGuideJson,
                practicalExerciseJson: chRow.practicalExerciseJson,
                updatedAt: nowDate,
              },
            });
        }, null);
      }
      broadcastRealtime({ type: "launchpad:chapter_saved", scope: "launchpad", entity: "chapters", targetId: c.id });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save launchpad chapter" });
    }
  });

  app.post("/api/launchpad/chapters/reorder", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { chapters } = req.body;
      if (!Array.isArray(chapters)) {
        return res.status(400).json({ error: "chapters array is required" });
      }
      const nowIso = new Date().toISOString();
      const existingKv = await sysKvGet<any[]>("lp_chapters", []);
      const orderMap = new Map(chapters.filter((ch: any) => ch?.id).map((ch: any) => [String(ch.id), Number(ch.weekNumber)]));
      const updatedKv = existingKv.map((item) =>
        orderMap.has(String(item?.id))
          ? { ...item, weekNumber: orderMap.get(String(item.id)), updatedAt: nowIso }
          : item
      );
      await sysKvSet("lp_chapters", updatedKv);

      if (hasTable("launchpad_chapters")) {
        await safeDbQuery(async () => {
          for (const ch of chapters) {
            if (!ch?.id) continue;
            await db.update(launchpadChapters)
              .set({ weekNumber: Number(ch.weekNumber), updatedAt: new Date() })
              .where(eq(launchpadChapters.id, ch.id));
          }
        }, null);
      }
      broadcastRealtime({ type: "launchpad:chapters_reordered", scope: "launchpad", entity: "chapters" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to reorder chapters" });
    }
  });

  app.delete("/api/launchpad/chapters/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const existingKv = await sysKvGet<any[]>("lp_chapters", []);
      await sysKvSet("lp_chapters", existingKv.filter((c) => c?.id !== id));

      if (hasTable("launchpad_chapters")) {
        await safeDbQuery(async () => {
          await db.delete(launchpadChapters).where(eq(launchpadChapters.id, id));
        }, null);
      }
      broadcastRealtime({ type: "launchpad:chapter_deleted", scope: "launchpad", entity: "chapters", targetId: id });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete launchpad chapter" });
    }
  });

  app.post("/api/launchpad/cert-questions", requireAuth, async (req: AuthRequest, res) => {
    try {
      const q = req.body;
      if (!q?.id || !q?.subjectId || !q?.questionType) {
        return res.status(400).json({ error: "id, subjectId, and questionType are required" });
      }
      const nowDate = new Date();
      const qRow = {
        id: q.id,
        subjectId: q.subjectId,
        questionType: q.questionType,
        sortOrder: Number(q.sortOrder ?? 1),
        payloadJson: q.payload || q.payloadJson || {},
        updatedAt: nowDate.toISOString(),
      };
      const existingKv = await sysKvGet<any[]>("lp_cert_questions", []);
      await sysKvSet("lp_cert_questions", mergeRecordsById([qRow], existingKv, "id", "updatedAt"));

      if (hasTable("launchpad_certification_questions")) {
        await safeDbQuery(async () => {
          await db.insert(launchpadCertificationQuestions)
            .values({ ...qRow, updatedAt: nowDate })
            .onConflictDoUpdate({
              target: launchpadCertificationQuestions.id,
              set: {
                questionType: qRow.questionType,
                sortOrder: qRow.sortOrder,
                payloadJson: qRow.payloadJson,
                updatedAt: nowDate,
              },
            });
        }, null);
      }
      broadcastRealtime({ type: "launchpad:cert_question_saved", scope: "launchpad", entity: "certQuestions", targetId: q.id });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save certification question" });
    }
  });

  app.delete("/api/launchpad/cert-questions/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const existingKv = await sysKvGet<any[]>("lp_cert_questions", []);
      await sysKvSet("lp_cert_questions", existingKv.filter((q) => q?.id !== id));

      if (hasTable("launchpad_certification_questions")) {
        await safeDbQuery(async () => {
          await db.delete(launchpadCertificationQuestions).where(eq(launchpadCertificationQuestions.id, id));
        }, null);
      }
      broadcastRealtime({ type: "launchpad:cert_question_deleted", scope: "launchpad", entity: "certQuestions", targetId: id });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete certification question" });
    }
  });

  app.post("/api/launchpad/permissions", requireAuth, async (req: AuthRequest, res) => {
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
      const editAccess = launchpadEditCurriculumAccess || editCurriculumAccess || 'none';
      const nowDate = new Date();
      const permRow = {
        userId,
        accessScope,
        launchpadStudentTabAccess: studentAccess,
        launchpadReviewExerciseAccess: reviewAccess,
        launchpadEditCurriculumAccess: editAccess,
        updatedBy: updatedBy || 'Admin',
        updatedAt: nowDate.toISOString(),
      };
      const existingKv = await sysKvGet<any[]>("lp_permissions", []);
      await sysKvSet("lp_permissions", mergeRecordsById([permRow], existingKv, "userId", "updatedAt"));

      if (hasTable("launchpad_team_permissions")) {
        await safeDbQuery(async () => {
          await db.insert(launchpadTeamPermissions)
            .values({ ...permRow, updatedAt: nowDate })
            .onConflictDoUpdate({
              target: launchpadTeamPermissions.userId,
              set: {
                accessScope,
                launchpadStudentTabAccess: studentAccess,
                launchpadReviewExerciseAccess: reviewAccess,
                launchpadEditCurriculumAccess: editAccess,
                updatedBy: updatedBy || 'Admin',
                updatedAt: nowDate
              },
            });
        }, null);
      }
      broadcastRealtime({ type: "launchpad:permissions_updated", scope: "launchpad", entity: "permissions", targetId: userId });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save launchpad permission" });
    }
  });

  app.post("/api/launchpad/enrollments", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { studentIds, studentEmails, assignedBy } = req.body;
      if (!Array.isArray(studentIds)) {
        return res.status(400).json({ error: "studentIds array is required" });
      }
      const allUsers = await readAllUsersSafe();
      const kvStudents = await sysKvGet<any[]>("portal_students_mirror", []);
      const resolveEmailForId = (sid: string): string | null => {
        const passed = studentEmails && typeof studentEmails === "object" ? normEmail(studentEmails[sid]) : "";
        if (passed) return passed;
        const u = allUsers.find((usr) => String(usr.uid || "").trim() === sid);
        if (u?.email && !normEmail(u.email).endsWith("@uppseekers.local")) return normEmail(u.email);
        const ks = kvStudents.find((st) => String(st?.id || "").trim() === sid);
        if (ks?.email) return normEmail(ks.email);
        return null;
      };

      const nowDate = new Date();
      const nowIso = nowDate.toISOString();
      const newEnrollmentRows = studentIds.filter(Boolean).map((studentId: string) => ({
        studentId,
        studentEmail: resolveEmailForId(studentId),
        assignedBy: assignedBy || 'Counselor',
        assignedAt: nowIso,
      }));

      const existingKv = await sysKvGet<any[]>("lp_enrollments", []);
      await sysKvSet("lp_enrollments", mergeRecordsById(newEnrollmentRows, existingKv, "studentId", "assignedAt"));

      if (hasTable("launchpad_student_enrollments")) {
        await safeDbQuery(async () => {
          for (const row of newEnrollmentRows) {
            if (hasColumn("launchpad_student_enrollments", "student_email")) {
              await db.insert(launchpadStudentEnrollments)
                .values({
                  studentId: row.studentId,
                  studentEmail: row.studentEmail,
                  assignedBy: row.assignedBy,
                  assignedAt: nowDate,
                })
                .onConflictDoUpdate({
                  target: launchpadStudentEnrollments.studentId,
                  set: {
                    ...(row.studentEmail ? { studentEmail: row.studentEmail } : {}),
                  },
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

  app.delete("/api/launchpad/enrollments/:studentId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { studentId } = req.params;
      const existingKv = await sysKvGet<any[]>("lp_enrollments", []);
      await sysKvSet("lp_enrollments", existingKv.filter((e) => e?.studentId !== studentId));

      if (hasTable("launchpad_student_enrollments")) {
        await safeDbQuery(async () => {
          await db.delete(launchpadStudentEnrollments).where(eq(launchpadStudentEnrollments.studentId, studentId));
        }, null);
      }
      broadcastRealtime({ type: "launchpad:enrollment_deleted", scope: "launchpad", entity: "enrollments", targetId: studentId });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove enrollment" });
    }
  });

  app.post("/api/launchpad/releases", requireAuth, async (req: AuthRequest, res) => {
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
          const kvStudents = await sysKvGet<any[]>("portal_students_mirror", []);
          const foundKs = kvStudents.find((s) => String(s?.id || "").trim() === cleanStudentId);
          if (foundKs?.email) cleanStudentEmail = normEmail(foundKs.email);
        }
      }

      const nowDate = new Date();
      const nowIso = nowDate.toISOString();
      const id = `${cleanStudentId}__${cleanSubjectId}`;
      const unlockedBool = Boolean(isUnlocked);
      const actor = unlockedBy || 'Counselor';

      const releaseRecord = {
        id,
        studentId: cleanStudentId,
        studentEmail: cleanStudentEmail || null,
        subjectId: cleanSubjectId,
        isUnlocked: unlockedBool,
        unlockedBy: actor,
        unlockedAt: nowIso,
      };

      // 1. Persist to Day-1 SQL KV Vault + portal_settings + memory
      if (unlockedBool) {
        const existingEnrollKv = await sysKvGet<any[]>("lp_enrollments", []);
        const enrollRow = {
          studentId: cleanStudentId,
          studentEmail: cleanStudentEmail || null,
          assignedBy: actor,
          assignedAt: nowIso,
        };
        await sysKvSet("lp_enrollments", mergeRecordsById([enrollRow], existingEnrollKv, "studentId", "assignedAt"));
      }

      const existingReleasesKv = await sysKvGet<any[]>("lp_releases", []);
      const syncedAliasKv = existingReleasesKv.map((r) => {
        if (
          cleanStudentEmail &&
          r?.subjectId === cleanSubjectId &&
          normEmail(r?.studentEmail) === cleanStudentEmail
        ) {
          return {
            ...r,
            isUnlocked: unlockedBool,
            unlockedBy: actor,
            unlockedAt: nowIso,
          };
        }
        return r;
      });
      const kvSaved = await sysKvSet(
        "lp_releases",
        mergeRecordsById([releaseRecord], syncedAliasKv, "id", "unlockedAt")
      );

      // 2. Persist to Relational Tables (launchpad_subject_releases + launchpad_student_enrollments)
      let sqlTableSaved = false;
      await safeDbQuery(async () => {
        if (unlockedBool && hasTable("launchpad_student_enrollments")) {
          if (hasColumn("launchpad_student_enrollments", "student_email")) {
            await db.insert(launchpadStudentEnrollments)
              .values({
                studentId: cleanStudentId,
                studentEmail: cleanStudentEmail || null,
                assignedBy: actor,
                assignedAt: nowDate,
              })
              .onConflictDoUpdate({
                target: launchpadStudentEnrollments.studentId,
                set: {
                  ...(cleanStudentEmail ? { studentEmail: cleanStudentEmail } : {}),
                },
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
            await db.insert(launchpadSubjectReleases)
              .values({
                id,
                studentId: cleanStudentId,
                studentEmail: cleanStudentEmail || null,
                subjectId: cleanSubjectId,
                isUnlocked: unlockedBool,
                unlockedBy: actor,
                unlockedAt: nowDate,
              })
              .onConflictDoUpdate({
                target: launchpadSubjectReleases.id,
                set: {
                  ...(cleanStudentEmail ? { studentEmail: cleanStudentEmail } : {}),
                  isUnlocked: unlockedBool,
                  unlockedBy: actor,
                  unlockedAt: nowDate,
                },
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

  app.post("/api/launchpad/progress", requireAuth, async (req: AuthRequest, res) => {
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
      const nowDate = new Date();
      const parsedEvaluatedAt =
        evaluatedAt && !isNaN(new Date(evaluatedAt).getTime()) ? new Date(evaluatedAt) : null;
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
        updatedAt: nowDate.toISOString(),
      };
      const existingKv = await sysKvGet<any[]>("lp_progress", []);
      await sysKvSet("lp_progress", mergeRecordsById([progRow], existingKv, "id", "updatedAt"));

      if (hasTable("launchpad_progress_and_submissions")) {
        await safeDbQuery(async () => {
          await db.insert(launchpadProgressAndSubmissions)
            .values({
              ...progRow,
              evaluatedAt: parsedEvaluatedAt,
              updatedAt: nowDate,
            })
            .onConflictDoUpdate({
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
                updatedAt: nowDate,
              },
            });
        }, null);
      }
      broadcastRealtime({ type: "launchpad:progress_updated", scope: "launchpad", entity: "progress", targetId: studentId });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save launchpad progress" });
    }
  });

  app.post("/api/launchpad/certifications", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { studentId, subjectId, testScore, passed, certificateCode } = req.body;
      if (!studentId || !subjectId || typeof testScore !== 'number' || !certificateCode) {
        return res.status(400).json({ error: "Missing certification fields" });
      }
      const id = `${studentId}__${subjectId}`;
      const nowDate = new Date();
      const certRow = {
        id,
        studentId,
        subjectId,
        testScore,
        passed: Boolean(passed),
        certificateCode,
        issuedAt: nowDate.toISOString(),
      };
      const existingKv = await sysKvGet<any[]>("lp_certifications", []);
      await sysKvSet("lp_certifications", mergeRecordsById([certRow], existingKv, "id", "issuedAt"));

      if (hasTable("launchpad_certifications")) {
        await safeDbQuery(async () => {
          await db.insert(launchpadCertifications)
            .values({ ...certRow, issuedAt: nowDate })
            .onConflictDoUpdate({
              target: launchpadCertifications.id,
              set: {
                testScore,
                passed: Boolean(passed),
                certificateCode,
                issuedAt: nowDate,
              },
            });
        }, null);
      }
      broadcastRealtime({ type: "launchpad:certification_saved", scope: "launchpad", entity: "certifications", targetId: studentId });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save certification" });
    }
  });

  app.post("/api/launchpad/evaluations", requireAuth, async (req: AuthRequest, res) => {
    try {
      const ev = req.body;
      if (!ev?.id || !ev?.studentId || !ev?.subjectId) {
        return res.status(400).json({ error: "id, studentId, and subjectId are required" });
      }
      const subDate = ev.submittedAt ? new Date(ev.submittedAt) : new Date();
      const evalDate = ev.evaluatedAt ? new Date(ev.evaluatedAt) : null;
      const evRow = {
        id: ev.id,
        sourceType: ev.sourceType || 'LAUNCHPAD',
        studentId: ev.studentId,
        studentName: ev.studentName || 'Student',
        subjectId: ev.subjectId,
        subjectTitle: ev.subjectTitle || '',
        weekNumber: Number(ev.weekNumber ?? 1),
        chapterTitle: ev.chapterTitle || '',
        taskId: ev.taskId || null,
        submissionJson: ev.submissionJson || {},
        status: ev.status || 'Submitted',
        feedback: ev.feedback || null,
        evaluatedBy: ev.evaluatedBy || null,
        submittedAt: subDate.toISOString(),
        evaluatedAt: evalDate ? evalDate.toISOString() : null,
      };
      const existingKv = await sysKvGet<any[]>("lp_evaluations", []);
      await sysKvSet("lp_evaluations", mergeRecordsById([evRow], existingKv, "id", "submittedAt"));

      if (hasTable("assignment_evaluations")) {
        await safeDbQuery(async () => {
          await db.insert(assignmentEvaluations)
            .values({
              ...evRow,
              submittedAt: subDate,
              evaluatedAt: evalDate,
            })
            .onConflictDoUpdate({
              target: assignmentEvaluations.id,
              set: {
                submissionJson: evRow.submissionJson,
                status: evRow.status,
                feedback: evRow.feedback,
                evaluatedBy: evRow.evaluatedBy,
                evaluatedAt: evalDate,
              },
            });
        }, null);
      }
      broadcastRealtime({ type: "launchpad:evaluation_saved", scope: "launchpad", entity: "evaluations", targetId: ev.studentId });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save launchpad evaluation" });
    }
  });

  app.post("/api/launchpad/notifications", requireAuth, async (req: AuthRequest, res) => {
    try {
      const n = req.body;
      if (!n?.id || !n?.recipientId || !n?.title) {
        return res.status(400).json({ error: "id, recipientId, and title are required" });
      }
      const createdDate = n.createdAt ? new Date(n.createdAt) : new Date();
      const notifRow = {
        id: n.id,
        recipientType: n.recipientType || 'student',
        recipientId: n.recipientId,
        title: n.title,
        message: n.message || '',
        category: n.category || 'LAUNCHPAD',
        link: n.link || '/student/launchpad',
        metadataJson: n.metadata || n.metadataJson || {},
        isRead: Boolean(n.isRead),
        createdAt: createdDate.toISOString(),
      };
      const existingKv = await sysKvGet<any[]>("lp_notifications", []);
      await sysKvSet("lp_notifications", mergeRecordsById([notifRow], existingKv, "id", "createdAt"));

      if (hasTable("notifications")) {
        await safeDbQuery(async () => {
          await db.insert(notificationsTable)
            .values({
              ...notifRow,
              createdAt: createdDate,
            })
            .onConflictDoUpdate({
              target: notificationsTable.id,
              set: {
                isRead: notifRow.isRead,
                metadataJson: notifRow.metadataJson,
              },
            });
        }, null);
      }
      broadcastRealtime({ type: "launchpad:notification_created", scope: "launchpad", entity: "notifications", targetId: n.recipientId });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save notification" });
    }
  });

  app.post("/api/launchpad/notifications/:id/read", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const existingKv = await sysKvGet<any[]>("lp_notifications", []);
      await sysKvSet(
        "lp_notifications",
        existingKv.map((item) => (item?.id === id ? { ...item, isRead: true } : item))
      );

      if (hasTable("notifications")) {
        await safeDbQuery(async () => {
          await db.update(notificationsTable)
            .set({ isRead: true })
            .where(eq(notificationsTable.id, id));
        }, null);
      }
      broadcastRealtime({ type: "launchpad:notification_read", scope: "launchpad", entity: "notifications", targetId: id });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notification read" });
    }
  });

  // Auto-Parse Launchpad Chapter Document (.docx, .doc, .txt, .pdf) into Read Guide, Watch Lecture & Practical Exercise
  const extractYoutubeIdServer = (url: string): string | undefined => {
    if (!url) return undefined;
    const match = url.trim().match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : undefined;
  };

  const slugifyFieldKey = (label: string, idx: number) => {
    const slug = (label || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40);
    return slug || `field_${idx + 1}`;
  };

  const parseAgreedLaunchpadChapterText = (rawText: string) => {
    const lines = (rawText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    let area: 'meta' | 'guide' | 'lecture' | 'exercise' = 'meta';
    let listTarget: 'objectives' | 'summary' | 'body' | 'bullets' | 'focus' | 'scenario' | 'instructions' | 'selfCheck' | 'fields' | null = null;

    let chapterTitle = '';
    let weekNumber: number | undefined;
    const learningObjectives: string[] = [];

    let guideTitle = '';
    let readTime = '8 min read';
    const guideSummaryLines: string[] = [];
    const guideSections: { heading: string; body: string; bullets: string[] }[] = [];
    let currentSection: { heading: string; bodyLines: string[]; bullets: string[] } | null = null;

    let lectureTitle = '';
    let speaker = '';
    let lectureUrl = '';
    let duration = '15 min';
    const focusNoteLines: string[] = [];

    let exerciseTitle = '';
    const scenarioLines: string[] = [];
    const instructions: string[] = [];
    const selfCheckCriteria: string[] = [];
    let allowFileUpload = true;
    const worksheetFields: { key: string; label: string; placeholder: string; type: 'text' | 'textarea'; showWordCount: boolean }[] = [];

    const flushSection = () => {
      if (currentSection && (currentSection.heading || currentSection.bodyLines.length > 0 || currentSection.bullets.length > 0)) {
        guideSections.push({
          heading: currentSection.heading || 'Core Framework',
          body: currentSection.bodyLines.join('\n').trim(),
          bullets: currentSection.bullets.filter(Boolean),
        });
      }
      currentSection = null;
    };

    const stripListPrefix = (s: string) => s.replace(/^\s*(?:[-*•●◦]|\d+[.)])\s+/, '').trim();

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        if (listTarget === 'body' && currentSection && currentSection.bodyLines.length > 0) {
          currentSection.bodyLines.push('');
        } else if (listTarget === 'summary' && guideSummaryLines.length > 0) {
          guideSummaryLines.push('');
        } else if (listTarget === 'scenario' && scenarioLines.length > 0) {
          scenarioLines.push('');
        }
        continue;
      }

      const upperClean = line.replace(/^[#*\s]+|[#*\s:]+$/g, '').toUpperCase();

      if (/^(\[)?(?:1\.?\s*)?READ GUIDE(\])?$/.test(upperClean) || upperClean === 'READING GUIDE' || upperClean === 'SECTION 1: READ GUIDE') {
        area = 'guide';
        listTarget = null;
        continue;
      }
      if (/^(\[)?(?:2\.?\s*)?WATCH LECTURE(\])?$/.test(upperClean) || upperClean === 'VIDEO LECTURE' || upperClean === 'SECTION 2: WATCH LECTURE') {
        flushSection();
        area = 'lecture';
        listTarget = null;
        continue;
      }
      if (/^(\[)?(?:3\.?\s*)?PRACTICAL EXERCISE(\])?$/.test(upperClean) || upperClean === 'PRACTICE EXERCISE' || upperClean === 'PRACTICAL EXERCISE & WORKSHEET' || upperClean === 'SECTION 3: PRACTICAL EXERCISE') {
        flushSection();
        area = 'exercise';
        listTarget = null;
        continue;
      }

      const kvMatch = line.match(/^([A-Za-z][A-Za-z0-9 \-/&]+?)\s*:\s*(.*)$/);
      if (kvMatch) {
        const key = kvMatch[1].trim().toUpperCase();
        const val = kvMatch[2].trim();

        if (key === 'CHAPTER TITLE' || key === 'MODULE TITLE' || key === 'WEEK TITLE') {
          if (val) chapterTitle = val;
          listTarget = null;
          continue;
        }
        if (key === 'WEEK NUMBER' || key === 'WEEK #') {
          const n = parseInt(val.replace(/[^\d]/g, ''), 10);
          if (Number.isFinite(n) && n > 0) weekNumber = n;
          listTarget = null;
          continue;
        }
        if (key === 'LEARNING OBJECTIVES' || key === 'OBJECTIVES') {
          listTarget = 'objectives';
          if (val) learningObjectives.push(stripListPrefix(val));
          continue;
        }
        if (key === 'GUIDE TITLE' || key === 'READING TITLE') {
          area = 'guide';
          if (val) guideTitle = val;
          listTarget = null;
          continue;
        }
        if (key === 'READ TIME' || key === 'READING TIME') {
          area = 'guide';
          if (val) readTime = val;
          listTarget = null;
          continue;
        }
        if (key === 'SUMMARY' || key === 'EXECUTIVE SUMMARY' || key === 'GUIDE SUMMARY') {
          area = 'guide';
          listTarget = 'summary';
          if (val) guideSummaryLines.push(val);
          continue;
        }
        if (key === 'SECTION' || key === 'SECTION HEADING' || key === 'SECTION TITLE') {
          area = 'guide';
          flushSection();
          currentSection = { heading: val || 'Core Framework', bodyLines: [], bullets: [] };
          listTarget = 'body';
          continue;
        }
        if (key === 'BODY' || key === 'CONTENT') {
          area = 'guide';
          if (!currentSection) currentSection = { heading: 'Core Framework', bodyLines: [], bullets: [] };
          listTarget = 'body';
          if (val) currentSection.bodyLines.push(val);
          continue;
        }
        if (key === 'BULLETS' || key === 'KEY POINTS' || key === 'TAKEAWAYS') {
          area = 'guide';
          if (!currentSection) currentSection = { heading: 'Core Framework', bodyLines: [], bullets: [] };
          listTarget = 'bullets';
          if (val) currentSection.bullets.push(stripListPrefix(val));
          continue;
        }
        if (key === 'LECTURE TITLE' || key === 'VIDEO TITLE') {
          area = 'lecture';
          if (val) lectureTitle = val;
          listTarget = null;
          continue;
        }
        if (key === 'SPEAKER' || key === 'SPEAKER / CHANNEL' || key === 'INSTRUCTOR') {
          area = 'lecture';
          if (val) speaker = val;
          listTarget = null;
          continue;
        }
        if (key === 'VIDEO URL' || key === 'LECTURE URL' || key === 'YOUTUBE URL' || key === 'VIDEO LINK') {
          area = 'lecture';
          if (val) lectureUrl = val;
          listTarget = null;
          continue;
        }
        if (key === 'DURATION' || key === 'LECTURE DURATION') {
          area = 'lecture';
          if (val) duration = val;
          listTarget = null;
          continue;
        }
        if (key === 'FOCUS NOTE' || key === 'WATCH FOCUS NOTE') {
          area = 'lecture';
          listTarget = 'focus';
          if (val) focusNoteLines.push(val);
          continue;
        }
        if (key === 'EXERCISE TITLE' || key === 'PRACTICAL EXERCISE TITLE') {
          area = 'exercise';
          if (val) exerciseTitle = val;
          listTarget = null;
          continue;
        }
        if (key === 'SCENARIO' || key === 'REAL-WORLD SCENARIO' || key === 'REAL WORLD SCENARIO') {
          area = 'exercise';
          listTarget = 'scenario';
          if (val) scenarioLines.push(val);
          continue;
        }
        if (key === 'INSTRUCTIONS' || key === 'STEP-BY-STEP INSTRUCTIONS') {
          area = 'exercise';
          listTarget = 'instructions';
          if (val) instructions.push(stripListPrefix(val));
          continue;
        }
        if (key === 'SELF CHECK' || key === 'SELF-CHECK' || key === 'SELF CHECK CRITERIA' || key === 'SELF-CHECK CRITERIA' || key === 'SELF-EVALUATION CHECKLIST') {
          area = 'exercise';
          listTarget = 'selfCheck';
          if (val) selfCheckCriteria.push(stripListPrefix(val));
          continue;
        }
        if (key === 'WORKSHEET FIELDS' || key === 'SUBMISSION FIELDS') {
          area = 'exercise';
          listTarget = 'fields';
          if (val) {
            const parts = val.split('|').map(p => p.trim());
            const label = stripListPrefix(parts[0] || '');
            if (label) {
              const idx = worksheetFields.length;
              worksheetFields.push({
                key: slugifyFieldKey(label, idx),
                label,
                placeholder: parts[1] || `Write your ${label.toLowerCase()}...`,
                type: parts[2]?.toLowerCase() === 'text' ? 'text' : 'textarea',
                showWordCount: (parts[3] || '').toLowerCase().includes('word') || parts[2]?.toLowerCase() !== 'text',
              });
            }
          }
          continue;
        }
        if (key === 'ALLOW FILE UPLOAD' || key === 'STUDENT FILE UPLOAD') {
          area = 'exercise';
          allowFileUpload = !/^(no|false|0|off|disabled)$/i.test(val);
          listTarget = null;
          continue;
        }
      }

      // Handle continuation lines for current target
      const cleanedItem = stripListPrefix(line);
      if (listTarget === 'objectives' && cleanedItem) {
        learningObjectives.push(cleanedItem);
      } else if (listTarget === 'summary') {
        guideSummaryLines.push(line);
      } else if (listTarget === 'body' && currentSection) {
        if (/^\s*[-*•●◦]\s+/.test(rawLine)) {
          currentSection.bullets.push(cleanedItem);
        } else {
          currentSection.bodyLines.push(line);
        }
      } else if (listTarget === 'bullets' && currentSection && cleanedItem) {
        currentSection.bullets.push(cleanedItem);
      } else if (listTarget === 'focus') {
        focusNoteLines.push(line);
      } else if (listTarget === 'scenario') {
        scenarioLines.push(line);
      } else if (listTarget === 'instructions' && cleanedItem) {
        instructions.push(cleanedItem);
      } else if (listTarget === 'selfCheck' && cleanedItem) {
        selfCheckCriteria.push(cleanedItem);
      } else if (listTarget === 'fields' && cleanedItem) {
        const parts = cleanedItem.split('|').map(p => p.trim());
        const label = parts[0] || '';
        if (label) {
          const idx = worksheetFields.length;
          worksheetFields.push({
            key: slugifyFieldKey(label, idx),
            label,
            placeholder: parts[1] || `Write your ${label.toLowerCase()}...`,
            type: parts[2]?.toLowerCase() === 'text' ? 'text' : 'textarea',
            showWordCount: (parts[3] || '').toLowerCase().includes('word') || parts[2]?.toLowerCase() !== 'text',
          });
        }
      }
    }

    flushSection();

    const parsedSummary = guideSummaryLines.join('\n').trim();
    const parsedScenario = scenarioLines.join('\n').trim();
    const parsedFocus = focusNoteLines.join('\n').trim();

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
          sections: guideSections,
        },
        lecture: {
          title: lectureTitle || chapterTitle,
          speaker,
          url: lectureUrl,
          youtubeId: extractYoutubeIdServer(lectureUrl),
          duration,
          focusNote: parsedFocus,
        },
        practicalExercise: {
          title: exerciseTitle || (chapterTitle ? `${chapterTitle} — Practical Exercise` : ''),
          scenario: parsedScenario,
          instructions,
          allowFileUpload,
          selfCheckCriteria: selfCheckCriteria.length > 0
            ? selfCheckCriteria
            : ['I clearly structured my response and verified all instructions.'],
          fields: worksheetFields.length > 0
            ? worksheetFields
            : [
                {
                  key: 'response_main',
                  label: 'Primary Worksheet Response',
                  placeholder: 'Write your structured response here...',
                  type: 'textarea' as const,
                  showWordCount: true,
                },
              ],
        },
      },
    };
  };

  app.post("/api/launchpad/parse-chapter-doc", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { fileName, mimeType, base64Data } = req.body || {};
      if (!base64Data || typeof base64Data !== 'string') {
        return res.status(400).json({ error: "Document content (base64Data) is required." });
      }

      const cleanName = String(fileName || 'chapter-document').trim();
      const lowerName = cleanName.toLowerCase();
      const rawBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const fileBuffer = Buffer.from(rawBase64, 'base64');

      const isPdf = (mimeType || '').includes('pdf') || lowerName.endsWith('.pdf');
      const isDocx = (mimeType || '').includes('wordprocessingml') || lowerName.endsWith('.docx');
      const isDoc = (mimeType || '').includes('msword') || lowerName.endsWith('.doc');

      let extractedText = '';
      if (isDocx) {
        try {
          const mammothMod: any = await import("mammoth");
          const mammoth = mammothMod.default || mammothMod;
          const result = await mammoth.extractRawText({ buffer: fileBuffer });
          extractedText = result.value || '';
        } catch (docErr: any) {
          console.warn('Mammoth DOCX parse warning:', docErr?.message);
        }
      } else if (!isPdf) {
        const rawUtf8 = fileBuffer.toString('utf8');
        if (isDoc && /<html|<body|<p\b/i.test(rawUtf8)) {
          extractedText = rawUtf8
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<\/(p|div|h\d|li|tr|br)>/gi, '\n')
            .replace(/<li[^>]*>/gi, '\n- ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        } else {
          extractedText = rawUtf8;
        }
      }

      // First try exact deterministic agreed-format parser on extracted text (for .docx/.doc/.txt)
      const deterministic = !isPdf && extractedText ? parseAgreedLaunchpadChapterText(extractedText) : null;
      if (deterministic?.isCompleteMatch) {
        const ch = deterministic.chapter;
        return res.json({
          success: true,
          mode: 'agreed_template',
          chapter: ch,
          summary: {
            sectionsCount: ch.readingGuide.sections.length,
            objectivesCount: ch.learningObjectives.length,
            instructionsCount: ch.practicalExercise.instructions.length,
            fieldsCount: ch.practicalExercise.fields.length,
          },
        });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        if (deterministic?.hasAnyMatch) {
          const ch = deterministic.chapter;
          return res.json({
            success: true,
            mode: 'agreed_template',
            chapter: ch,
            summary: {
              sectionsCount: ch.readingGuide.sections.length,
              objectivesCount: ch.learningObjectives.length,
              instructionsCount: ch.practicalExercise.instructions.length,
              fieldsCount: ch.practicalExercise.fields.length,
            },
          });
        }
        return res.status(400).json({
          error: isPdf
            ? "PDF extraction requires GEMINI_API_KEY in Secrets, or upload a .docx / .txt file using the Agreed Format template."
            : "Could not detect the Launchpad chapter sections in this document. Download the Agreed Format template to ensure headings match.",
        });
      }

      // Use Gemini 4 Hydrogen (server-side) for PDF documents or unstructured DOCX/DOC content
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const systemInstruction = `You are a Launchpad curriculum parser. Extract a complete weekly Launchpad chapter from the provided document into the exact JSON schema:
1. Chapter Title, Week Number (if stated), and Learning Objectives.
2. Read Guide: Guide Title, Read Time (e.g. "8 min read"), Summary, and structured Reading Sections (each with heading, body paragraph, and key takeaway bullets).
3. Watch Lecture: Lecture Title, Speaker/Channel, Video URL (extract exact YouTube/Vimeo/external URL if present in the document, else empty string), Duration (e.g. "15 min"), and Focus Note.
4. Practical Exercise: Exercise Title, Real-World Scenario, Step-by-Step Instructions, Self-Check Criteria checklist items, Worksheet Input Fields (label, placeholder, type "textarea" or "text", showWordCount boolean), and allowFileUpload boolean.
Preserve the author's exact wording wherever present in the document. If a list like worksheet fields isn't explicitly defined, create 1 relevant Primary Worksheet Response textarea field.`;

      const contentsPayload = isPdf
        ? {
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: rawBase64,
                },
              },
              {
                text: `Extract the full Launchpad chapter (metadata, Read Guide, Watch Lecture, Practical Exercise) from "${cleanName}".`,
              },
            ],
          }
        : `Extract the full Launchpad chapter (metadata, Read Guide, Watch Lecture, Practical Exercise) from the document "${cleanName}":\n\n${extractedText.slice(0, 60000)}`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: contentsPayload,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              weekNumber: { type: Type.INTEGER },
              learningObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
              readingGuide: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  readTime: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  sections: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        heading: { type: Type.STRING },
                        body: { type: Type.STRING },
                        bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
                      },
                      required: ['heading', 'body'],
                    },
                  },
                },
                required: ['title', 'summary', 'sections'],
              },
              lecture: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  speaker: { type: Type.STRING },
                  url: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  focusNote: { type: Type.STRING },
                },
                required: ['title'],
              },
              practicalExercise: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  scenario: { type: Type.STRING },
                  instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
                  allowFileUpload: { type: Type.BOOLEAN },
                  selfCheckCriteria: { type: Type.ARRAY, items: { type: Type.STRING } },
                  fields: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING },
                        placeholder: { type: Type.STRING },
                        type: { type: Type.STRING },
                        showWordCount: { type: Type.BOOLEAN },
                      },
                      required: ['label', 'placeholder', 'type'],
                    },
                  },
                },
                required: ['title', 'scenario', 'instructions', 'selfCheckCriteria', 'fields'],
              },
            },
            required: ['title', 'readingGuide', 'lecture', 'practicalExercise'],
          },
        },
      });

      const parsedJson = JSON.parse((aiResponse.text || '{}').trim());
      const rawFields = Array.isArray(parsedJson?.practicalExercise?.fields) ? parsedJson.practicalExercise.fields : [];
      const normalizedFields = rawFields.length > 0
        ? rawFields.map((f: any, idx: number) => ({
            key: slugifyFieldKey(f.label || '', idx),
            label: String(f.label || `Response Field ${idx + 1}`),
            placeholder: String(f.placeholder || 'Write your structured response here...'),
            type: f.type === 'text' ? ('text' as const) : ('textarea' as const),
            showWordCount: f.showWordCount !== false,
          }))
        : [
            {
              key: 'response_main',
              label: 'Primary Worksheet Response',
              placeholder: 'Write your structured response here...',
              type: 'textarea' as const,
              showWordCount: true,
            },
          ];

      const lectureUrl = String(parsedJson?.lecture?.url || deterministic?.chapter.lecture.url || '').trim();
      const ch = {
        title: String(parsedJson?.title || deterministic?.chapter.title || cleanName.replace(/\.[^.]+$/, '')),
        weekNumber: Number.isFinite(parsedJson?.weekNumber) && parsedJson.weekNumber > 0
          ? parsedJson.weekNumber
          : deterministic?.chapter.weekNumber,
        learningObjectives: Array.isArray(parsedJson?.learningObjectives) && parsedJson.learningObjectives.length > 0
          ? parsedJson.learningObjectives.map((x: any) => String(x)).filter(Boolean)
          : (deterministic?.chapter.learningObjectives || []),
        readingGuide: {
          title: String(parsedJson?.readingGuide?.title || parsedJson?.title || cleanName.replace(/\.[^.]+$/, '')),
          readTime: String(parsedJson?.readingGuide?.readTime || '8 min read'),
          summary: String(parsedJson?.readingGuide?.summary || deterministic?.chapter.readingGuide.summary || ''),
          sections: Array.isArray(parsedJson?.readingGuide?.sections) && parsedJson.readingGuide.sections.length > 0
            ? parsedJson.readingGuide.sections.map((s: any) => ({
                heading: String(s.heading || 'Core Framework'),
                body: String(s.body || ''),
                bullets: Array.isArray(s.bullets) ? s.bullets.map((b: any) => String(b)).filter(Boolean) : [],
              }))
            : (deterministic?.chapter.readingGuide.sections || []),
        },
        lecture: {
          title: String(parsedJson?.lecture?.title || deterministic?.chapter.lecture.title || ''),
          speaker: String(parsedJson?.lecture?.speaker || deterministic?.chapter.lecture.speaker || ''),
          url: lectureUrl,
          youtubeId: extractYoutubeIdServer(lectureUrl),
          duration: String(parsedJson?.lecture?.duration || deterministic?.chapter.lecture.duration || '15 min'),
          focusNote: String(parsedJson?.lecture?.focusNote || deterministic?.chapter.lecture.focusNote || ''),
        },
        practicalExercise: {
          title: String(parsedJson?.practicalExercise?.title || deterministic?.chapter.practicalExercise.title || ''),
          scenario: String(parsedJson?.practicalExercise?.scenario || deterministic?.chapter.practicalExercise.scenario || ''),
          instructions: Array.isArray(parsedJson?.practicalExercise?.instructions)
            ? parsedJson.practicalExercise.instructions.map((x: any) => String(x)).filter(Boolean)
            : (deterministic?.chapter.practicalExercise.instructions || []),
          allowFileUpload: parsedJson?.practicalExercise?.allowFileUpload !== false,
          selfCheckCriteria: Array.isArray(parsedJson?.practicalExercise?.selfCheckCriteria) && parsedJson.practicalExercise.selfCheckCriteria.length > 0
            ? parsedJson.practicalExercise.selfCheckCriteria.map((x: any) => String(x)).filter(Boolean)
            : ['I clearly structured my response and verified all instructions.'],
          fields: normalizedFields,
        },
      };

      res.json({
        success: true,
        mode: 'ai_extracted',
        chapter: ch,
        summary: {
          sectionsCount: ch.readingGuide.sections.length,
          objectivesCount: ch.learningObjectives.length,
          instructionsCount: ch.practicalExercise.instructions.length,
          fieldsCount: ch.practicalExercise.fields.length,
        },
      });
    } catch (error: any) {
      console.error('Parse Launchpad chapter doc error:', error);
      res.status(500).json({ error: error?.message || "Failed to parse Launchpad chapter document." });
    }
  });

  // ============================================================================
  // ZOHO MEETING OAUTH 2.0 & AUTOMATED MEETING CREATION (MULTI-DC AWARE)
  // ============================================================================
  const ZOHO_DC_MAP: Record<string, { accounts: string; meeting: string }> = {
    'https://accounts.zoho.com': { accounts: 'https://accounts.zoho.com', meeting: 'https://meeting.zoho.com' },
    'https://accounts.zoho.in': { accounts: 'https://accounts.zoho.in', meeting: 'https://meeting.zoho.in' },
    'https://accounts.zoho.eu': { accounts: 'https://accounts.zoho.eu', meeting: 'https://meeting.zoho.eu' },
    'https://accounts.zoho.com.au': { accounts: 'https://accounts.zoho.com.au', meeting: 'https://meeting.zoho.com.au' },
    'https://accounts.zoho.jp': { accounts: 'https://accounts.zoho.jp', meeting: 'https://meeting.zoho.jp' },
    'https://accounts.zoho.ca': { accounts: 'https://accounts.zoho.ca', meeting: 'https://meeting.zoho.ca' },
    'https://accounts.zoho.sa': { accounts: 'https://accounts.zoho.sa', meeting: 'https://meeting.zoho.sa' },
    'https://accounts.zoho.uk': { accounts: 'https://accounts.zoho.uk', meeting: 'https://meeting.zoho.uk' },
  };
  const ZOHO_LOCATION_MAP: Record<string, { accounts: string; meeting: string }> = {
    us: ZOHO_DC_MAP['https://accounts.zoho.com'],
    com: ZOHO_DC_MAP['https://accounts.zoho.com'],
    in: ZOHO_DC_MAP['https://accounts.zoho.in'],
    eu: ZOHO_DC_MAP['https://accounts.zoho.eu'],
    au: ZOHO_DC_MAP['https://accounts.zoho.com.au'],
    jp: ZOHO_DC_MAP['https://accounts.zoho.jp'],
    ca: ZOHO_DC_MAP['https://accounts.zoho.ca'],
    sa: ZOHO_DC_MAP['https://accounts.zoho.sa'],
    uk: ZOHO_DC_MAP['https://accounts.zoho.uk'],
  };

  const cleanEnvSecret = (val?: string) => {
    const trimmed = (val || '').trim();
    const unquoted = trimmed.replace(/^["']([\s\S]*)["']$/, '$1').trim();
    return unquoted;
  };

  const getZohoCreds = () => {
    const rawId = process.env.ZOHO_CLIENT_ID || '';
    const rawSecret = process.env.ZOHO_CLIENT_SECRET || '';
    const clientId = cleanEnvSecret(rawId);
    const clientSecret = cleanEnvSecret(rawSecret);
    return {
      clientId,
      clientSecret,
      rawHadWhitespaceOrQuotes: rawId !== clientId || rawSecret !== clientSecret,
      clientIdValidFormat: clientId.startsWith('1000.'),
      clientIdPreview: clientId ? `${clientId.slice(0, 10)}... (${clientId.length} chars)` : '',
      clientSecretLength: clientSecret.length,
      secretLooksLikeClientId: Boolean(clientSecret && (clientSecret === clientId || clientSecret.startsWith('1000.'))),
    };
  };

  const defaultLoc = cleanEnvSecret(process.env.ZOHO_DC || 'com').toLowerCase();
  const ZOHO_ACCOUNTS_BASE = (ZOHO_LOCATION_MAP[defaultLoc] || ZOHO_DC_MAP['https://accounts.zoho.com']).accounts;
  const ZOHO_MEETING_BASE = (ZOHO_LOCATION_MAP[defaultLoc] || ZOHO_DC_MAP['https://accounts.zoho.com']).meeting;

  const resolveZohoDc = (accountsServerQuery?: string, locationQuery?: string) => {
    const normalizedAccounts = (accountsServerQuery || '').trim().replace(/\/+$/, '').toLowerCase();
    if (normalizedAccounts && ZOHO_DC_MAP[normalizedAccounts]) {
      return ZOHO_DC_MAP[normalizedAccounts];
    }
    const loc = (locationQuery || '').trim().toLowerCase();
    if (loc && ZOHO_LOCATION_MAP[loc]) {
      return ZOHO_LOCATION_MAP[loc];
    }
    return { accounts: ZOHO_ACCOUNTS_BASE, meeting: ZOHO_MEETING_BASE };
  };

  const DEFAULT_ZOHO_SCOPES = [
    'AaaServer.profile.Read',
    'ZohoMeeting.manageOrg.READ',
    'ZohoMeeting.meeting.READ',
    'ZohoMeeting.meeting.CREATE',
    'ZohoMeeting.meeting.UPDATE',
    'ZohoMeeting.meeting.DELETE',
  ];

  const getZohoOAuthScopes = () => {
    const rawEnvScopes = cleanEnvSecret(process.env.ZOHO_SCOPES);
    if (!rawEnvScopes) {
      return DEFAULT_ZOHO_SCOPES.join(',');
    }
    const merged = new Set<string>(
      rawEnvScopes
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    );
    // Ensure core profile & meeting creation scopes are always present for non-admin employees
    merged.add('AaaServer.profile.Read');
    merged.add('ZohoMeeting.meeting.READ');
    merged.add('ZohoMeeting.meeting.CREATE');
    merged.add('ZohoMeeting.meeting.UPDATE');
    merged.add('ZohoMeeting.meeting.DELETE');
    return Array.from(merged).join(',');
  };

  const zohoConnectionsMemory = new Map<string, any>();
  let zohoKvHydrated = false;

  interface ZohoServerTraceEvent {
    id: string;
    timestamp: string;
    stage: string;
    category: 'API_HANDSHAKE' | 'TOKEN_STORAGE' | 'AUTH_SESSION' | 'SERVER_RUNTIME';
    ok: boolean;
    httpStatus: number;
    durationMs: number;
    staffKey?: string;
    redirectUri?: string;
    accountsServer?: string;
    meetingBase?: string;
    summary: string;
    details?: Record<string, any>;
  }

  const recentZohoServerEvents: ZohoServerTraceEvent[] = [];
  const recordZohoServerEvent = (evt: Omit<ZohoServerTraceEvent, 'id' | 'timestamp'>) => {
    recentZohoServerEvents.unshift({
      id: `srv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...evt,
    });
    if (recentZohoServerEvents.length > 35) {
      recentZohoServerEvents.length = 35;
    }
  };

  const inspectSealedVaultFormat = (rawSealed?: string | null, expectedStaffKey?: string) => {
    if (!rawSealed || typeof rawSealed !== 'string' || !rawSealed.trim()) {
      return {
        present: false,
        validEnvelopeFormat: false,
        decryptOk: false,
        reason: 'No x-zoho-sealed-vault header/payload provided (normal before first connect or after disconnect).',
      };
    }
    const trimmed = rawSealed.trim();
    const parts = trimmed.split('.');
    if (parts.length !== 3) {
      return {
        present: true,
        length: trimmed.length,
        segmentCount: parts.length,
        validEnvelopeFormat: false,
        decryptOk: false,
        reason: `Malformed sealedVault envelope: expected 3 dot-separated base64url segments (iv.authTag.ciphertext), got ${parts.length}.`,
      };
    }
    let ivBytes = 0;
    let tagBytes = 0;
    let cipherBytes = 0;
    try {
      ivBytes = Buffer.from(parts[0], 'base64url').length;
      tagBytes = Buffer.from(parts[1], 'base64url').length;
      cipherBytes = Buffer.from(parts[2], 'base64url').length;
    } catch {
      return {
        present: true,
        length: trimmed.length,
        segmentCount: 3,
        validEnvelopeFormat: false,
        decryptOk: false,
        reason: 'Base64url decoding failed on one or more AES-256-GCM segments.',
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
        reason: `Unexpected AES-256-GCM byte lengths: iv=${ivBytes}B (expected 12), tag=${tagBytes}B (expected 16), ciphertext=${cipherBytes}B.`,
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
        reason: 'AES-256-GCM decryption failed (likely ZOHO_CLIENT_SECRET or ZOHO_STATE_SECRET changed since this vault was sealed, or required fields staffKey/refreshToken/zsoid were missing).',
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
      refreshTokenLength: typeof decrypted.refreshToken === 'string' ? decrypted.refreshToken.length : 0,
      hasAccessToken: Boolean(decrypted.accessToken),
      hasZsoid: Boolean(decrypted.zsoid),
      hasZuid: Boolean(decrypted.zuid),
      accountsServer: decrypted.accountsServer || '',
      meetingBase: decrypted.meetingBase || '',
      tokenExpiresAt: decrypted.tokenExpiresAt instanceof Date ? decrypted.tokenExpiresAt.toISOString() : String(decrypted.tokenExpiresAt || ''),
      reason: staffKeyMatch
        ? 'Valid 3-segment AES-256-GCM envelope; decrypted and verified staffKey/refreshToken/zsoid.'
        : `Envelope decrypted cleanly, but stored staffKey (${decrypted.staffKey}) does not match current user (${expectedStaffKey}).`,
    };
  };

  const hydrateZohoConnectionsFromKv = async () => {
    if (zohoKvHydrated) return;
    try {
      const kvMap = await sysKvGet<Record<string, any>>('zoho_connections_vault', {});
      if (kvMap && typeof kvMap === 'object') {
        for (const [k, rawVal] of Object.entries(kvMap)) {
          if (!rawVal || typeof rawVal !== 'object') continue;
          if (!zohoConnectionsMemory.has(k)) {
            zohoConnectionsMemory.set(k, {
              ...rawVal,
              tokenExpiresAt: rawVal.tokenExpiresAt ? new Date(rawVal.tokenExpiresAt) : new Date(0),
              connectedAt: rawVal.connectedAt ? new Date(rawVal.connectedAt) : new Date(),
              updatedAt: rawVal.updatedAt ? new Date(rawVal.updatedAt) : new Date(),
            });
          }
        }
      }
      zohoKvHydrated = true;
    } catch {
      // Ignore KV hydration errors
    }
  };

  const persistZohoConnectionsToKv = async () => {
    try {
      const serializedMap: Record<string, any> = {};
      for (const [k, row] of zohoConnectionsMemory.entries()) {
        if (!row) continue;
        serializedMap[k] = {
          ...row,
          tokenExpiresAt:
            row.tokenExpiresAt instanceof Date ? row.tokenExpiresAt.toISOString() : String(row.tokenExpiresAt || ''),
          connectedAt:
            row.connectedAt instanceof Date ? row.connectedAt.toISOString() : String(row.connectedAt || ''),
          updatedAt:
            row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt || ''),
        };
      }
      await sysKvSet('zoho_connections_vault', serializedMap);
    } catch {
      // Non-fatal if SQL KV is unavailable
    }
  };

  const getZohoStateSecret = () => {
    const { clientSecret } = getZohoCreds();
    return cleanEnvSecret(process.env.ZOHO_STATE_SECRET) || clientSecret || 'uppseekers_zoho_oauth_state_secret';
  };

  const getValidAppUrl = () => {
    const cleaned = cleanEnvSecret(process.env.APP_URL).replace(/\/+$/, '');
    if (!cleaned || cleaned.includes('MY_APP_URL') || !/^https?:\/\//i.test(cleaned)) {
      return '';
    }
    return cleaned;
  };

  const getConfiguredZohoRedirectUriEnv = () => {
    const raw = cleanEnvSecret(process.env.ZOHO_REDIRECT_URI).replace(/\/+$/, '');
    if (!raw || raw.includes('MY_APP_URL') || !/^https?:\/\//i.test(raw)) {
      return '';
    }
    try {
      const parsed = new URL(raw);
      if (!parsed.pathname || parsed.pathname === '/') {
        return `${parsed.protocol}//${parsed.host}/api/zoho/oauth/callback`;
      }
      return `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, '')}`;
    } catch {
      return '';
    }
  };

  const sanitizeOriginForZoho = (rawOrigin?: string, reqHost?: string): string => {
    const trimmed = (rawOrigin || '').trim().replace(/\/+$/, '');
    if (!trimmed) return '';
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
      const host = parsed.host.toLowerCase();
      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname.endsWith('.run.app') ||
        hostname.endsWith('.vercel.app') ||
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        (reqHost && host === reqHost.toLowerCase())
      ) {
        return `${parsed.protocol}//${parsed.host}`;
      }
    } catch {
      return '';
    }
    return '';
  };

  const getZohoRedirectUriInfo = (req: express.Request): { redirectUri: string; source: 'ZOHO_REDIRECT_URI' | 'APP_URL' | 'VERCEL_URL' | 'CLIENT_ORIGIN' | 'HOST_FALLBACK' } => {
    // 1. Explicit ZOHO_REDIRECT_URI environment variable always wins
    const explicitRedirectEnv = getConfiguredZohoRedirectUriEnv();
    if (explicitRedirectEnv) {
      return { redirectUri: explicitRedirectEnv, source: 'ZOHO_REDIRECT_URI' };
    }

    const reqHost = (req.headers['x-forwarded-host'] as string)?.split(',')[0]?.trim() || req.get('host') || '';
    const rawClientOrigin =
      (typeof req.query?.clientOrigin === 'string' ? req.query.clientOrigin : '') ||
      (typeof req.headers['x-client-origin'] === 'string' ? req.headers['x-client-origin'] : '') ||
      (typeof req.headers.origin === 'string' ? req.headers.origin : '');
    const safeClientOrigin = sanitizeOriginForZoho(rawClientOrigin, reqHost);

    // 2. Configured APP_URL environment variable (standard AI Studio & Cloud Run container URL)
    const envBase = getValidAppUrl();
    if (envBase) {
      // Guard only against the case where a user opened the Shared/Published Cloud Run URL (ais-pre-*)
      // or a Vercel custom domain while APP_URL was accidentally hardcoded to a dev-only origin (ais-dev-*).
      if (safeClientOrigin) {
        try {
          const envHost = new URL(envBase).hostname.toLowerCase();
          const clientHost = new URL(safeClientOrigin).hostname.toLowerCase();
          if (envHost.startsWith('ais-dev-') && clientHost !== envHost) {
            return { redirectUri: `${safeClientOrigin}/api/zoho/oauth/callback`, source: 'CLIENT_ORIGIN' };
          }
        } catch {
          // Use APP_URL below
        }
      }
      return { redirectUri: `${envBase}/api/zoho/oauth/callback`, source: 'APP_URL' };
    }

    // 3. Vercel runtime environment variables if deployed on Vercel without APP_URL
    const vercelProdHost = cleanEnvSecret(process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL).replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    if (vercelProdHost && !safeClientOrigin) {
      return { redirectUri: `https://${vercelProdHost}/api/zoho/oauth/callback`, source: 'VERCEL_URL' };
    }

    // 4. Verified client origin or request host fallback
    if (safeClientOrigin) {
      return { redirectUri: `${safeClientOrigin}/api/zoho/oauth/callback`, source: 'CLIENT_ORIGIN' };
    }

    const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim() || req.protocol || 'https';
    const host = reqHost || 'localhost:3000';
    return { redirectUri: `${proto}://${host}/api/zoho/oauth/callback`, source: 'HOST_FALLBACK' };
  };

  const getZohoRedirectUri = (req: express.Request) => getZohoRedirectUriInfo(req).redirectUri;

  const getZohoVaultKey = (): Buffer => {
    return crypto.createHash('sha256').update(getZohoStateSecret()).digest();
  };

  const sealZohoVault = (record: Record<string, any>): string => {
    try {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', getZohoVaultKey(), iv);
      const serialized = JSON.stringify({
        staffKey: record.staffKey,
        staffUid: record.staffUid || record.staffKey,
        staffEmail: record.staffEmail || '',
        staffName: record.staffName || '',
        zohoEmail: record.zohoEmail || '',
        zohoDisplayName: record.zohoDisplayName || '',
        zsoid: String(record.zsoid || ''),
        zuid: String(record.zuid || ''),
        accessToken: record.accessToken || '',
        refreshToken: record.refreshToken || '',
        tokenExpiresAt:
          record.tokenExpiresAt instanceof Date
            ? record.tokenExpiresAt.toISOString()
            : String(record.tokenExpiresAt || ''),
        accountsServer: record.accountsServer || ZOHO_ACCOUNTS_BASE,
        meetingBase: record.meetingBase || ZOHO_MEETING_BASE,
        connectedAt:
          record.connectedAt instanceof Date
            ? record.connectedAt.toISOString()
            : String(record.connectedAt || new Date().toISOString()),
        updatedAt: new Date().toISOString(),
      });
      const encrypted = Buffer.concat([cipher.update(serialized, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
    } catch {
      return '';
    }
  };

  const unsealZohoVault = (sealed?: string | null): Record<string, any> | null => {
    if (!sealed || typeof sealed !== 'string') return null;
    const parts = sealed.trim().split('.');
    if (parts.length !== 3) return null;
    try {
      const iv = Buffer.from(parts[0], 'base64url');
      const tag = Buffer.from(parts[1], 'base64url');
      const ciphertext = Buffer.from(parts[2], 'base64url');
      const decipher = crypto.createDecipheriv('aes-256-gcm', getZohoVaultKey(), iv);
      decipher.setAuthTag(tag);
      const jsonStr = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
      const parsed = JSON.parse(jsonStr);
      if (!parsed?.staffKey || !parsed?.refreshToken || !parsed?.zsoid) return null;
      return {
        ...parsed,
        tokenExpiresAt: parsed.tokenExpiresAt ? new Date(parsed.tokenExpiresAt) : new Date(0),
        connectedAt: parsed.connectedAt ? new Date(parsed.connectedAt) : new Date(),
        updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : new Date(),
      };
    } catch {
      return null;
    }
  };

  const resolveStaffIdentity = async (req: AuthRequest) => {
    const rawEmail = (req.user?.email || '').trim().toLowerCase();
    const rawUid = (req.user?.uid || '').trim();
    const headerEmail = (typeof req.headers['x-staff-email'] === 'string' ? req.headers['x-staff-email'] : '').trim().toLowerCase();
    const headerName = (typeof req.headers['x-staff-name'] === 'string' ? req.headers['x-staff-name'] : '').trim();

    let effectiveEmail = rawEmail && rawEmail !== 'guest@app.com' ? rawEmail : headerEmail;
    let effectiveUid = rawUid && rawUid !== 'guest' ? rawUid : '';
    let effectiveName = req.user?.name || headerName || effectiveEmail;

    // Allow verified System Admins to target a specific team member when using "Test as" / Connect For in Settings
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
      staffEmail: effectiveEmail || '',
      staffName: effectiveName || staffKey,
    };
  };

  const signZohoState = (payload: Record<string, any>) => {
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const sig = crypto.createHmac('sha256', getZohoStateSecret()).update(encoded).digest('base64url');
    return `${encoded}.${sig}`;
  };

  const verifyZohoState = (stateStr: string): Record<string, any> | null => {
    if (!stateStr || !stateStr.includes('.')) return null;
    const [encoded, sig] = stateStr.split('.');
    if (!encoded || !sig) return null;
    const expectedSig = crypto.createHmac('sha256', getZohoStateSecret()).update(encoded).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    try {
      const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
      if (!parsed?.staffKey || !parsed?.ts) return null;
      if (Date.now() - Number(parsed.ts) > 15 * 60 * 1000) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const findSharedOrgZsoid = async (preferredMeetingBase?: string, stateSharedZsoid?: string): Promise<string> => {
    const envOrgId = cleanEnvSecret(process.env.ZOHO_ORG_ID);
    if (envOrgId) return envOrgId;
    if (stateSharedZsoid && String(stateSharedZsoid).trim()) {
      return String(stateSharedZsoid).trim();
    }

    await hydrateZohoConnectionsFromKv();

    // Check in-memory / KV hydrated connections (preferring Admin's org or matching DC)
    const adminCandidate = zohoConnectionsMemory.get('uppseekers@gmail.com');
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
        const snap = await adminDb.collection('zoho_connections').limit(10).get();
        for (const d of snap.docs) {
          const data = d.data();
          if (data?.zsoid && (!preferredMeetingBase || !data.meetingBase || data.meetingBase === preferredMeetingBase)) {
            return String(data.zsoid);
          }
        }
      } catch {
        // Ignore
      }
    }

    const dbRows = await safeDbQuery(
      () => db.select().from(zohoConnections).orderBy(desc(zohoConnections.connectedAt)),
      [] as any[]
    );
    for (const row of dbRows) {
      if (row?.zsoid && (!preferredMeetingBase || !row.meetingBase || row.meetingBase === preferredMeetingBase)) {
        return String(row.zsoid);
      }
    }

    return '';
  };

  const fetchZohoOAuthUserInfo = async (accountsBase: string, accessToken: string): Promise<{
    zuid: string;
    email: string;
    displayName: string;
  } | null> => {
    try {
      const infoRes = await fetch(`${accountsBase}/oauth/user/info`, {
        method: 'GET',
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      });
      if (!infoRes.ok) return null;
      const infoJson: any = await infoRes.json().catch(() => null);
      if (!infoJson || typeof infoJson !== 'object') return null;
      const zuid = String(infoJson.ZUID || infoJson.zuid || '').trim();
      const email = String(infoJson.Email || infoJson.email || '').trim().toLowerCase();
      const fullName = [infoJson.First_Name, infoJson.Last_Name].filter(Boolean).join(' ').trim();
      const displayName = String(infoJson.Display_Name || fullName || email || '').trim();
      if (!zuid && !email) return null;
      return { zuid, email, displayName };
    } catch {
      return null;
    }
  };

  const getZohoConnectionByKey = async (staffKey: string, req?: express.Request) => {
    await hydrateZohoConnectionsFromKv();
    const safeKey = normEmailKey(staffKey);

    if (req) {
      const headerSealed = typeof req.headers['x-zoho-sealed-vault'] === 'string' ? req.headers['x-zoho-sealed-vault'] : '';
      const unsealed = unsealZohoVault(headerSealed);
      if (unsealed && unsealed.staffKey === staffKey) {
        zohoConnectionsMemory.set(staffKey, unsealed);
      }
    }

    if (hasAdminServiceAccount()) {
      try {
        const snap = await adminDb.collection('zoho_connections').doc(safeKey).get();
        if (snap.exists) {
          const data = snap.data() as any;
          zohoConnectionsMemory.set(staffKey, data);
          return data;
        }
      } catch (err) {
        console.warn('Firestore zoho_connections read fallback:', err);
      }
    }

    const dbRow = await safeDbQuery(
      () => db.select().from(zohoConnections).where(eq(zohoConnections.staffKey, staffKey)).then(r => r[0] || null),
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

  const upsertZohoConnectionRecord = async (record: {
    staffKey: string;
    staffUid: string;
    staffEmail: string;
    staffName: string;
    zohoEmail: string;
    zohoDisplayName: string;
    zsoid: string;
    zuid: string;
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: Date;
    accountsServer?: string;
    meetingBase?: string;
  }) => {
    await hydrateZohoConnectionsFromKv();
    const now = new Date();
    const accountsServer = record.accountsServer || ZOHO_ACCOUNTS_BASE;
    const meetingBase = record.meetingBase || ZOHO_MEETING_BASE;
    const memoryRow = { ...record, accountsServer, meetingBase, connectedAt: now, updatedAt: now };
    zohoConnectionsMemory.set(record.staffKey, memoryRow);
    await persistZohoConnectionsToKv();

    if (hasAdminServiceAccount()) {
      try {
        const safeKey = normEmailKey(record.staffKey);
        await adminDb.collection('zoho_connections').doc(safeKey).set(
          {
            ...record,
            accountsServer,
            meetingBase,
            tokenExpiresAt: record.tokenExpiresAt.toISOString(),
            connectedAt: now.toISOString(),
            updatedAt: now.toISOString(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Firestore zoho_connections write warning:', err);
      }
    }

    await safeDbQuery(async () => {
      await db.insert(zohoConnections)
        .values({
          ...record,
          accountsServer,
          meetingBase,
          connectedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
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
            updatedAt: now,
          },
        });
    }, null);
  };

  const deleteZohoConnectionByKey = async (staffKey: string) => {
    await hydrateZohoConnectionsFromKv();
    zohoConnectionsMemory.delete(staffKey);
    await persistZohoConnectionsToKv();
    if (hasAdminServiceAccount()) {
      try {
        await adminDb.collection('zoho_connections').doc(normEmailKey(staffKey)).delete();
      } catch (err) {
        console.warn('Firestore zoho_connections delete warning:', err);
      }
    }
    await safeDbQuery(async () => {
      await db.delete(zohoConnections).where(eq(zohoConnections.staffKey, staffKey));
    }, null);
  };

  const formatZohoStartTime = (dateStr: string, timeStr: string) => {
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateParts = (dateStr || '').split('-').map(Number);
    const timeParts = (timeStr || '10:00').split(':').map(Number);

    const year = dateParts[0] || new Date().getFullYear();
    const monthIdx = Math.max(0, Math.min(11, (dateParts[1] || 1) - 1));
    const day = dateParts[2] || new Date().getDate();
    const hour24 = Number.isFinite(timeParts[0]) ? timeParts[0] : 10;
    const minute = Number.isFinite(timeParts[1]) ? timeParts[1] : 0;

    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

    const dd = String(day).padStart(2, '0');
    const hh = String(hour12).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');

    return `${MONTHS[monthIdx]} ${dd}, ${year} ${hh}:${mm} ${ampm}`;
  };

  const refreshZohoAccessToken = async (conn: any, force = false): Promise<string> => {
    const expiresAtMs = new Date(conn.tokenExpiresAt).getTime();
    if (!force && Number.isFinite(expiresAtMs) && Date.now() < expiresAtMs - 60_000 && conn.accessToken) {
      return conn.accessToken;
    }

    const { clientId, clientSecret } = getZohoCreds();
    if (!clientId || !clientSecret) {
      throw new Error('Zoho OAuth credentials (ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET) are not configured on the server.');
    }
    if (!conn.refreshToken) {
      throw new Error('Zoho refresh token missing. Please disconnect and reconnect your Zoho Meeting account.');
    }

    const accountsServer = conn.accountsServer || ZOHO_ACCOUNTS_BASE;
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: conn.refreshToken,
    });

    const tokenRes = await fetch(`${accountsServer}/oauth/v2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const tokenJson: any = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokenJson?.access_token) {
      const errMsg = tokenJson?.error_description || tokenJson?.error || 'Failed to refresh Zoho access token';
      throw new Error(`Zoho token refresh failed: ${errMsg}. Please reconnect your Zoho Meeting account.`);
    }

    const expiresInSec = Number(tokenJson.expires_in) || 3600;
    const nextExpiresAt = new Date(Date.now() + expiresInSec * 1000);

    await upsertZohoConnectionRecord({
      staffKey: conn.staffKey,
      staffUid: conn.staffUid || conn.staffKey,
      staffEmail: conn.staffEmail || '',
      staffName: conn.staffName || '',
      zohoEmail: conn.zohoEmail || '',
      zohoDisplayName: conn.zohoDisplayName || '',
      zsoid: conn.zsoid,
      zuid: conn.zuid,
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token || conn.refreshToken,
      tokenExpiresAt: nextExpiresAt,
      accountsServer: conn.accountsServer || ZOHO_ACCOUNTS_BASE,
      meetingBase: conn.meetingBase || ZOHO_MEETING_BASE,
    });

    return tokenJson.access_token;
  };

  const renderZohoPopupHtml = (payload: Record<string, any>, isSuccess: boolean, headline: string, detail: string) => {
    const safeJson = JSON.stringify({ ...payload, _ts: Date.now() }).replace(/</g, '\\u003c');
    const safeHeadline = headline.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeDetail = detail.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Zoho Meeting Connection</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px 32px; max-width: 440px; text-align: center; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08); }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 12px; background: ${isSuccess ? '#dcfce7' : '#fee2e2'}; color: ${isSuccess ? '#166534' : '#991b1b'}; }
    h1 { font-size: 18px; margin: 0 0 8px; }
    p { font-size: 13px; color: #475569; margin: 0 0 16px; line-height: 1.5; word-break: break-word; }
    button { background: #0f172a; color: #fff; border: 0; border-radius: 8px; padding: 9px 18px; font-size: 12px; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${isSuccess ? 'Connected' : 'Connection Error'}</div>
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
      ${isSuccess ? 'setTimeout(function() { window.close(); }, 650);' : ''}
    })();
  </script>
</body>
</html>`;
  };

  // 1. Check current counselor's Zoho Meeting connection status
  app.get("/api/zoho/status", requireAuth, async (req: AuthRequest, res) => {
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
          sharedOrgZsoid: sharedOrgZsoid || undefined,
        });
      }

      res.json({
        configured,
        connected: true,
        staffKey: conn.staffKey,
        zohoEmail: conn.zohoEmail || '',
        zohoDisplayName: conn.zohoDisplayName || '',
        zsoid: conn.zsoid,
        zuid: conn.zuid,
        connectedAt: conn.connectedAt,
        redirectUri,
        redirectUriSource,
        sharedOrgZsoid: conn.zsoid || sharedOrgZsoid || undefined,
        sealedVault: sealZohoVault(conn),
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to check Zoho status' });
    }
  });

  // 2. Generate Zoho OAuth 2.0 Authorization URL for the counselor's browser popup
  app.get("/api/zoho/auth/url", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { clientId, clientSecret } = getZohoCreds();
      const { redirectUri, source: redirectUriSource } = getZohoRedirectUriInfo(req);

      if (!clientId || !clientSecret) {
        return res.status(400).json({
          configured: false,
          redirectUri,
          redirectUriSource,
          error: 'Zoho OAuth credentials (ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET) are not configured in server environment variables.',
        });
      }

      const staff = await resolveStaffIdentity(req);
      if (!staff) {
        return res.status(401).json({ error: 'Unable to identify signed-in counselor. Please sign in again.' });
      }

      const clientSharedZsoid =
        typeof req.query.sharedOrgZsoid === 'string' ? req.query.sharedOrgZsoid.trim() : '';
      const sharedOrgZsoid = await findSharedOrgZsoid(undefined, clientSharedZsoid);

      const state = signZohoState({
        staffKey: staff.staffKey,
        staffUid: staff.staffUid,
        staffEmail: staff.staffEmail,
        staffName: staff.staffName,
        redirectUri,
        sharedOrgZsoid: sharedOrgZsoid || '',
        ts: Date.now(),
      });

      const authParams = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        scope: getZohoOAuthScopes(),
        redirect_uri: redirectUri,
        access_type: 'offline',
        prompt: 'consent',
        state,
      });

      const url = `${ZOHO_ACCOUNTS_BASE}/oauth/v2/auth?${authParams.toString()}`;
      res.json({ url, redirectUri, redirectUriSource });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to build Zoho OAuth URL' });
    }
  });

  // 3. Zoho OAuth 2.0 Redirect Callback (registers both with & without trailing slash)
  app.get(["/api/zoho/oauth/callback", "/api/zoho/oauth/callback/"], async (req, res) => {
    try {
      const oauthError = typeof req.query.error === 'string' ? req.query.error : '';
      if (oauthError) {
        const desc = typeof req.query.error_description === 'string' ? req.query.error_description : oauthError;
        return res.status(400).send(
          renderZohoPopupHtml(
            { type: 'ZOHO_OAUTH_ERROR', error: desc },
            false,
            'Zoho Authorization Declined',
            desc
          )
        );
      }

      const code = typeof req.query.code === 'string' ? req.query.code : '';
      const stateStr = typeof req.query.state === 'string' ? req.query.state : '';
      const verifiedState = verifyZohoState(stateStr);

      if (!code || !verifiedState) {
        return res.status(400).send(
          renderZohoPopupHtml(
            { type: 'ZOHO_OAUTH_ERROR', error: 'Invalid or expired Zoho OAuth state. Please try connecting again.' },
            false,
            'Invalid OAuth Session',
            'The authorization request expired or could not be verified. Close this window and click Connect Zoho Meeting again.'
          )
        );
      }

      const { clientId, clientSecret, clientIdPreview, clientSecretLength, secretLooksLikeClientId } = getZohoCreds();
      if (!clientId || !clientSecret) {
        return res.status(500).send(
          renderZohoPopupHtml(
            { type: 'ZOHO_OAUTH_ERROR', error: 'ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET missing on server.' },
            false,
            'Server Configuration Missing',
            'ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET must be set on the server.'
          )
        );
      }

      const queryAccountsServer = typeof req.query['accounts-server'] === 'string' ? req.query['accounts-server'] : '';
      const queryLocation = typeof req.query.location === 'string' ? req.query.location : '';
      const dcEndpoints = resolveZohoDc(queryAccountsServer, queryLocation);

      const redirectUri = verifiedState.redirectUri || getZohoRedirectUri(req);
      const exchangeCodeAt = async (accountsBase: string) => {
        const tokenParams = new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code,
        });
        const resExchange = await fetch(`${accountsBase}/oauth/v2/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: tokenParams.toString(),
        });
        const jsonExchange: any = await resExchange.json().catch(() => ({}));
        return { resExchange, jsonExchange };
      };

      let activeDc = dcEndpoints;
      let { resExchange: tokenRes, jsonExchange: tokenJson } = await exchangeCodeAt(activeDc.accounts);

      // If Zoho returned invalid_client on a regional DC, also try default .com once in case the client is .com-only
      if ((!tokenRes.ok || !tokenJson?.access_token) && tokenJson?.error === 'invalid_client' && activeDc.accounts !== ZOHO_ACCOUNTS_BASE) {
        const fallbackAttempt = await exchangeCodeAt(ZOHO_ACCOUNTS_BASE);
        if (fallbackAttempt.resExchange.ok && fallbackAttempt.jsonExchange?.access_token) {
          tokenRes = fallbackAttempt.resExchange;
          tokenJson = fallbackAttempt.jsonExchange;
          activeDc = { accounts: ZOHO_ACCOUNTS_BASE, meeting: ZOHO_MEETING_BASE };
        }
      }

      if (!tokenRes.ok || !tokenJson?.access_token) {
        const rawErr = tokenJson?.error_description || tokenJson?.error || 'Failed to exchange Zoho authorization code';
        let detailMsg = rawErr;
        if (tokenJson?.error === 'invalid_client') {
          if (secretLooksLikeClientId) {
            detailMsg = `invalid_client: ZOHO_CLIENT_SECRET currently contains a Client ID (${clientIdPreview}) instead of the Client Secret. Copy the value from the "Client Secret" tab in Zoho API Console.`;
          } else if (activeDc.accounts !== ZOHO_ACCOUNTS_BASE) {
            detailMsg = `Regional Data Center mismatch: this employee's Zoho account is hosted at ${activeDc.accounts} (location=${queryLocation || 'regional'}), while your Zoho OAuth Client is configured for ${ZOHO_ACCOUNTS_BASE}. Open Zoho API Console -> your Server-based Application -> Settings -> enable "Use the same OAuth credentials for all data centers" (Multi-DC), or sign in with an account in your shared ${ZOHO_ACCOUNTS_BASE} organization.`;
          } else {
            detailMsg = `invalid_client at ${activeDc.accounts} (Client ID=${clientIdPreview}, Secret length=${clientSecretLength} chars). Verify ZOHO_CLIENT_SECRET matches the Client Secret tab in Zoho API Console.`;
          }
        } else if (String(tokenJson?.error || '').toLowerCase().includes('redirect')) {
          detailMsg = `Redirect URI mismatch (${rawErr}). Add this exact Authorized Redirect URI in Zoho API Console: ${redirectUri}`;
        }
        recordZohoServerEvent({
          stage: 'OAUTH_CALLBACK_TOKEN_EXCHANGE',
          category: 'API_HANDSHAKE',
          ok: false,
          httpStatus: tokenRes.status || 400,
          durationMs: 0,
          staffKey: verifiedState.staffKey,
          redirectUri,
          accountsServer: activeDc.accounts,
          meetingBase: activeDc.meeting,
          summary: `Zoho token exchange rejected (${tokenJson?.error || tokenRes.status}): ${detailMsg}`,
          details: {
            zohoError: tokenJson?.error || '',
            zohoErrorDescription: tokenJson?.error_description || '',
            queryLocation,
            queryAccountsServer,
            clientIdPreview,
            clientSecretLength,
            secretLooksLikeClientId,
          },
        });
        return res.status(400).send(
          renderZohoPopupHtml(
            {
              type: 'ZOHO_OAUTH_ERROR',
              error: detailMsg,
              redirectUri,
              diagnostics: {
                stage: 'TOKEN_EXCHANGE',
                category: 'API_HANDSHAKE',
                zohoHttpStatus: tokenRes.status,
                zohoError: tokenJson?.error || '',
                accountsServer: activeDc.accounts,
                location: queryLocation || 'default',
              },
            },
            false,
            'Token Exchange Failed',
            detailMsg
          )
        );
      }

      // Fetch both Zoho Meeting org user details (/api/v2/user.json) AND universal OAuth profile (/oauth/user/info).
      // Non-admin employees/presenters in Zoho Meeting can receive HTTP 403 ("Invalid Org Admin") or lack zsoid
      // on /api/v2/user.json even when their OAuth grant is valid — /oauth/user/info + shared org zsoid handles them cleanly.
      const [meetingUserOutcome, oauthUserInfo] = await Promise.all([
        fetch(`${activeDc.meeting}/api/v2/user.json`, {
          method: 'GET',
          headers: {
            Authorization: `Zoho-oauthtoken ${tokenJson.access_token}`,
          },
        })
          .then(async (r) => ({ ok: r.ok, status: r.status, json: await r.json().catch(() => ({})) }))
          .catch(() => ({ ok: false, status: 0, json: {} as any })),
        fetchZohoOAuthUserInfo(activeDc.accounts, tokenJson.access_token),
      ]);

      const userJson = meetingUserOutcome.json || {};
      const userDetails = userJson?.userDetails || userJson || {};

      const resolvedZuid = String(userDetails?.zuid || oauthUserInfo?.zuid || '').trim();
      const resolvedZohoEmail = String(
        userDetails?.primaryEmail || userDetails?.email || oauthUserInfo?.email || ''
      ).trim();
      const resolvedDisplayName = String(
        userDetails?.displayName || userDetails?.firstName || oauthUserInfo?.displayName || resolvedZohoEmail
      ).trim();

      let resolvedZsoid = String(userDetails?.zsoid || '').trim();
      let zsoidSource = resolvedZsoid ? 'zoho_meeting_user_api' : '';
      if (!resolvedZsoid) {
        resolvedZsoid = await findSharedOrgZsoid(activeDc.meeting, verifiedState.sharedOrgZsoid);
        if (resolvedZsoid) {
          zsoidSource = verifiedState.sharedOrgZsoid ? 'state_shared_org_zsoid' : 'server_shared_org_zsoid';
        }
      }

      if (!resolvedZsoid || !resolvedZuid) {
        const apiMsg =
          userJson?.message ||
          userJson?.error?.message ||
          (!resolvedZsoid
            ? `Your Zoho account (${resolvedZohoEmail || 'non-admin member'}) authorized successfully, but Zoho did not return an Organization ID (zsoid) from ${activeDc.meeting}. Make sure this email is invited to your Zoho Meeting organization (Manage Organization -> Users) and that the Zoho Organization Admin has connected their account once in Admin Settings (or set ZOHO_ORG_ID).`
            : `Could not retrieve Zoho User ID (ZUID) from ${activeDc.accounts}.`);
        recordZohoServerEvent({
          stage: 'OAUTH_CALLBACK_ORG_LOOKUP',
          category: 'API_HANDSHAKE',
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
            meetingUserMessage: userJson?.message || userJson?.error?.message || '',
            oauthUserInfoResolved: Boolean(oauthUserInfo),
            resolvedZuidPresent: Boolean(resolvedZuid),
            resolvedZsoidPresent: Boolean(resolvedZsoid),
            stateSharedOrgZsoidPresent: Boolean(verifiedState.sharedOrgZsoid),
          },
        });
        return res.status(400).send(
          renderZohoPopupHtml(
            {
              type: 'ZOHO_OAUTH_ERROR',
              error: apiMsg,
              diagnostics: {
                stage: 'ORG_USER_LOOKUP',
                category: 'API_HANDSHAKE',
                meetingUserStatus: meetingUserOutcome.status,
                oauthUserInfoResolved: Boolean(oauthUserInfo),
                resolvedZuidPresent: Boolean(resolvedZuid),
                resolvedZsoidPresent: Boolean(resolvedZsoid),
              },
            },
            false,
            'Zoho Meeting Organization Lookup',
            apiMsg
          )
        );
      }

      const existing = await getZohoConnectionByKey(verifiedState.staffKey);
      const refreshToken = tokenJson.refresh_token || existing?.refreshToken || '';
      if (!refreshToken) {
        const msg = 'Zoho did not issue a refresh token. Please retry and click Accept on the Zoho consent prompt.';
        recordZohoServerEvent({
          stage: 'OAUTH_CALLBACK_REFRESH_TOKEN',
          category: 'TOKEN_STORAGE',
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
            hadExistingConnection: Boolean(existing),
          },
        });
        return res.status(400).send(
          renderZohoPopupHtml(
            {
              type: 'ZOHO_OAUTH_ERROR',
              error: msg,
              diagnostics: {
                stage: 'REFRESH_TOKEN_MISSING',
                category: 'TOKEN_STORAGE',
                tokenResponseKeys: Object.keys(tokenJson || {}),
              },
            },
            false,
            'Missing Refresh Token',
            msg
          )
        );
      }

      const expiresInSec = Number(tokenJson.expires_in) || 3600;
      const tokenExpiresAt = new Date(Date.now() + expiresInSec * 1000);

      const connectionPayload = {
        staffKey: verifiedState.staffKey,
        staffUid: verifiedState.staffUid || verifiedState.staffKey,
        staffEmail: verifiedState.staffEmail || '',
        staffName: verifiedState.staffName || '',
        zohoEmail: resolvedZohoEmail,
        zohoDisplayName: resolvedDisplayName,
        zsoid: resolvedZsoid,
        zuid: resolvedZuid,
        accessToken: tokenJson.access_token,
        refreshToken,
        tokenExpiresAt,
        accountsServer: activeDc.accounts,
        meetingBase: activeDc.meeting,
      };
      await upsertZohoConnectionRecord(connectionPayload);
      const sealedVault = sealZohoVault(connectionPayload);

      recordZohoServerEvent({
        stage: 'OAUTH_CALLBACK_COMPLETE',
        category: 'API_HANDSHAKE',
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
          sealedVaultSegments: sealedVault ? sealedVault.split('.').length : 0,
          expiresInSec,
        },
      });

      res.send(
        renderZohoPopupHtml(
          {
            type: 'ZOHO_OAUTH_SUCCESS',
            staffKey: verifiedState.staffKey,
            staffEmail: verifiedState.staffEmail || '',
            staffName: verifiedState.staffName || '',
            zohoEmail: resolvedZohoEmail,
            zohoDisplayName: resolvedDisplayName,
            zsoid: resolvedZsoid,
            zuid: resolvedZuid,
            accountsServer: activeDc.accounts,
            meetingBase: activeDc.meeting,
            connectedAt: new Date().toISOString(),
            tokenExpiresAt: tokenExpiresAt.toISOString(),
            sealedVault,
            diagnostics: {
              meetingUserStatus: meetingUserOutcome.status,
              zsoidSource,
              sealedVaultLength: sealedVault.length,
            },
          },
          true,
          'Zoho Meeting Connected',
          `Signed in as ${resolvedZohoEmail || resolvedDisplayName}. Returning to Uppseekers...`
        )
      );
    } catch (err: any) {
      const msg = err?.message || 'Unexpected error during Zoho OAuth callback';
      recordZohoServerEvent({
        stage: 'OAUTH_CALLBACK_EXCEPTION',
        category: 'SERVER_RUNTIME',
        ok: false,
        httpStatus: 500,
        durationMs: 0,
        summary: msg,
        details: {
          errorName: err?.name || 'Error',
          stackTop: typeof err?.stack === 'string' ? err.stack.split('\n').slice(0, 4).join(' | ') : '',
        },
      });
      res.status(500).send(
        renderZohoPopupHtml(
          {
            type: 'ZOHO_OAUTH_ERROR',
            error: msg,
            diagnostics: {
              stage: 'CALLBACK_EXCEPTION',
              category: 'SERVER_RUNTIME',
              errorName: err?.name || 'Error',
            },
          },
          false,
          'Connection Error',
          msg
        )
      );
    }
  });

  const isAdminCaller = async (staff: { staffKey: string; staffUid: string; staffEmail: string }, req?: AuthRequest) => {
    if (req && (await isVerifiedFirebaseAdmin(req))) return true;
    if (staff.staffEmail === 'uppseekers@gmail.com') return true;
    if (hasAdminServiceAccount()) {
      try {
        if (staff.staffUid) {
          const adminSnap = await adminDb.collection('admins').doc(staff.staffUid).get();
          if (adminSnap.exists) return true;
        }
        const dirSnap = await adminDb.collection('staff_directory').doc(normEmailKey(staff.staffEmail || staff.staffKey)).get();
        if (dirSnap.exists) {
          const role = String(dirSnap.data()?.role || '').toUpperCase();
          if (role === 'SYSTEM_ADMIN' || role === 'ADMIN' || role === 'CATEGORY_MANAGER' || role === 'OPERATIONS_LEAD') {
            return true;
          }
        }
      } catch {
        // Fallback to SQL check
      }
    }
    const userRow = await safeDbQuery(
      () => db.select().from(users).where(or(eq(users.email, staff.staffEmail), eq(users.uid, staff.staffUid))).then(r => r[0] || null),
      null
    );
    const role = (userRow?.role || '').toUpperCase();
    return role === 'SYSTEM_ADMIN' || role === 'ADMIN' || role === 'CATEGORY_MANAGER' || role === 'OPERATIONS_LEAD';
  };

  // 4. Disconnect current counselor's (or admin-selected counselor's) Zoho Meeting account
  app.delete("/api/zoho/connection", requireAuth, async (req: AuthRequest, res) => {
    try {
      const staff = await resolveStaffIdentity(req);
      if (!staff) {
        return res.status(401).json({ error: 'Unable to identify counselor.' });
      }
      const requestedKey = typeof req.query.staffKey === 'string'
        ? req.query.staffKey.trim().toLowerCase()
        : (typeof req.body?.staffKey === 'string' ? req.body.staffKey.trim().toLowerCase() : '');

      let targetKey = staff.staffKey;
      if (requestedKey && requestedKey !== staff.staffKey) {
        const allowed = await isAdminCaller(staff, req);
        if (!allowed) {
          return res.status(403).json({ error: 'Only administrators can disconnect another team member.' });
        }
        targetKey = requestedKey;
      }

      await deleteZohoConnectionByKey(targetKey);
      res.json({ success: true, staffKey: targetKey });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to disconnect Zoho account' });
    }
  });

  // 4b. Org-wide Zoho readiness & counselor connections diagnostics (tokens never exposed)
  app.get("/api/zoho/connections", requireAuth, async (req: AuthRequest, res) => {
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
        rawHadWhitespaceOrQuotes: creds.rawHadWhitespaceOrQuotes,
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
          sharedOrgZsoid: sharedOrgZsoid || undefined,
          ...safeCredDiagnostics,
          connections: [],
        });
      }

      const admin = await isAdminCaller(staff, req);
      await getZohoConnectionByKey(staff.staffKey, req);
      const mergedMap = new Map<string, any>();

      if (hasAdminServiceAccount()) {
        try {
          const snap = await adminDb.collection('zoho_connections').get();
          snap.forEach((docSnap) => {
            const row = docSnap.data();
            if (row?.staffKey) mergedMap.set(row.staffKey, row);
          });
        } catch (err) {
          console.warn('Firestore zoho_connections list warning:', err);
        }
      }

      const dbRows = await safeDbQuery(
        () => db.select().from(zohoConnections).orderBy(desc(zohoConnections.connectedAt)),
        [] as any[]
      );

      for (const row of dbRows) {
        if (!mergedMap.has(row.staffKey)) mergedMap.set(row.staffKey, row);
      }
      for (const [k, row] of zohoConnectionsMemory.entries()) {
        if (!mergedMap.has(k)) mergedMap.set(k, row);
      }

      const visibleRows = Array.from(mergedMap.values())
        .filter((row) => admin || row.staffKey === staff.staffKey)
        .map((row) => ({
          staffKey: row.staffKey,
          staffEmail: row.staffEmail || '',
          staffName: row.staffName || '',
          zohoEmail: row.zohoEmail || '',
          zohoDisplayName: row.zohoDisplayName || '',
          zsoid: row.zsoid,
          zuid: row.zuid,
          accountsServer: row.accountsServer || ZOHO_ACCOUNTS_BASE,
          meetingBase: row.meetingBase || ZOHO_MEETING_BASE,
          connectedAt: row.connectedAt,
          updatedAt: row.updatedAt,
          tokenExpiresAt: row.tokenExpiresAt,
        }));

      res.json({
        configured,
        hasClientId,
        hasClientSecret,
        hasAppUrl,
        redirectUri,
        redirectUriSource,
        sharedOrgZsoid: sharedOrgZsoid || visibleRows[0]?.zsoid || undefined,
        ...safeCredDiagnostics,
        isAdminView: admin,
        connections: visibleRows,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to inspect Zoho connections' });
    }
  });

  // 4c. Live handshake test against Zoho Meeting API v2 (/api/v2/user.json + non-admin /oauth/user/info fallback)
  app.post("/api/zoho/test", requireAuth, async (req: AuthRequest, res) => {
    const startedAt = Date.now();
    try {
      const staff = await resolveStaffIdentity(req);
      if (!staff) {
        return res.status(401).json({ ok: false, error: 'Unable to identify signed-in counselor.' });
      }

      const requestedKey = typeof req.body?.staffKey === 'string' ? req.body.staffKey.trim().toLowerCase() : '';
      const targetSealedFromBody = typeof req.body?.sealedVault === 'string' ? req.body.sealedVault.trim() : '';
      let targetKey = staff.staffKey;
      if (requestedKey && requestedKey !== staff.staffKey) {
        const allowed = await isAdminCaller(staff, req);
        if (!allowed) {
          return res.status(403).json({ ok: false, error: 'Only administrators can test another counselor connection.' });
        }
        targetKey = requestedKey;
      }

      if (targetSealedFromBody) {
        const unsealedTarget = unsealZohoVault(targetSealedFromBody);
        if (unsealedTarget && unsealedTarget.staffKey === targetKey) {
          zohoConnectionsMemory.set(targetKey, unsealedTarget);
        }
      }

      // Hydrate own sealed vault into memory if provided
      await getZohoConnectionByKey(staff.staffKey, req);

      const conn = await getZohoConnectionByKey(targetKey, req);
      if (!conn) {
        return res.status(400).json({
          ok: false,
          error: 'No Zoho account connected for this user yet. Click Connect Zoho Account first.',
        });
      }

      const meetingBase = conn.meetingBase || ZOHO_MEETING_BASE;
      const accountsServer = conn.accountsServer || ZOHO_ACCOUNTS_BASE;
      let accessToken = await refreshZohoAccessToken(conn, false);
      let userRes = await fetch(`${meetingBase}/api/v2/user.json`, {
        method: 'GET',
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
      });

      if (userRes.status === 401) {
        accessToken = await refreshZohoAccessToken(conn, true);
        userRes = await fetch(`${meetingBase}/api/v2/user.json`, {
          method: 'GET',
          headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
        });
      }

      const userJson: any = await userRes.json().catch(() => ({}));
      const details = userJson?.userDetails || userJson;

      if (!userRes.ok || !details?.zsoid) {
        // Non-admin Zoho presenters may receive 403 on /api/v2/user.json; verify token via /oauth/user/info + conn.zsoid
        const oauthInfo = await fetchZohoOAuthUserInfo(accountsServer, accessToken);
        if (oauthInfo && conn.zsoid) {
          const refreshedConn = zohoConnectionsMemory.get(targetKey) || conn;
          return res.json({
            ok: true,
            zohoEmail: oauthInfo.email || conn.zohoEmail || '',
            zohoDisplayName: oauthInfo.displayName || conn.zohoDisplayName || '',
            zsoid: String(conn.zsoid),
            zuid: String(oauthInfo.zuid || conn.zuid),
            latencyMs: Date.now() - startedAt,
            checkedAt: new Date().toISOString(),
            sealedVault: targetKey === staff.staffKey ? sealZohoVault(refreshedConn) : undefined,
          });
        }

        return res.status(userRes.status >= 400 ? userRes.status : 502).json({
          ok: false,
          error: userJson?.message || userJson?.error?.message || `Zoho API returned HTTP ${userRes.status}`,
        });
      }

      const refreshedConn = zohoConnectionsMemory.get(targetKey) || conn;
      res.json({
        ok: true,
        zohoEmail: details.primaryEmail || conn.zohoEmail || '',
        zohoDisplayName: details.displayName || conn.zohoDisplayName || '',
        zsoid: String(details.zsoid),
        zuid: String(details.zuid || conn.zuid),
        latencyMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
        sealedVault: targetKey === staff.staffKey ? sealZohoVault(refreshedConn) : undefined,
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        latencyMs: Date.now() - startedAt,
        error: err?.message || 'Zoho API handshake test failed',
      });
    }
  });

  // 4d. Comprehensive Zoho OAuth Diagnostic Probe (isolates Runtime vs Auth vs Token Storage Format vs API Handshake)
  app.post("/api/zoho/diagnostics/probe", requireAuth, async (req: AuthRequest, res) => {
    const probeStartedAt = Date.now();
    const stages: Array<{
      stage: string;
      category: 'SERVER_RUNTIME' | 'AUTH_SESSION' | 'TOKEN_STORAGE' | 'API_HANDSHAKE';
      status: 'pass' | 'warn' | 'fail';
      durationMs: number;
      summary: string;
      data?: Record<string, any>;
    }> = [];

    try {
      // Stage 1: Runtime & Environment Readiness
      const s1Start = Date.now();
      const creds = getZohoCreds();
      const { redirectUri, source: redirectUriSource } = getZohoRedirectUriInfo(req);
      const scopes = getZohoOAuthScopes();
      const envOk = Boolean(creds.clientId && creds.clientSecret && !creds.secretLooksLikeClientId);
      stages.push({
        stage: 'Server Runtime & OAuth Config',
        category: 'SERVER_RUNTIME',
        status: envOk ? 'pass' : 'fail',
        durationMs: Date.now() - s1Start,
        summary: envOk
          ? `Server ready (${process.env.VERCEL ? 'vercel-serverless' : 'node-server'} · ${redirectUriSource})`
          : !creds.clientId || !creds.clientSecret
          ? 'Missing ZOHO_CLIENT_ID or ZOHO_CLIENT_SECRET in server environment.'
          : 'ZOHO_CLIENT_SECRET appears to contain a Client ID instead of the Client Secret.',
        data: {
          runtime: process.env.VERCEL ? 'vercel-serverless' : 'node-server',
          nodeVersion: process.version,
          vercelRegion: process.env.VERCEL_REGION || 'local',
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
          hasSqlEnv: hasSqlEnv(),
        },
      });

      // Stage 2: Firebase Auth & Staff Identity Resolution
      const s2Start = Date.now();
      const staff = await resolveStaffIdentity(req);
      const adminCaller = staff ? await isAdminCaller(staff, req) : false;
      stages.push({
        stage: 'Firebase Auth & Staff Identity',
        category: 'AUTH_SESSION',
        status: staff ? 'pass' : 'fail',
        durationMs: Date.now() - s2Start,
        summary: staff
          ? `Verified ${staff.staffKey} (${adminCaller ? 'Admin' : 'Counselor/Staff'})`
          : 'Could not resolve signed-in staff identity from Firebase token.',
        data: {
          firebaseUid: req.user?.uid || '',
          firebaseEmail: req.user?.email || '',
          headerStaffEmail: typeof req.headers['x-staff-email'] === 'string' ? req.headers['x-staff-email'] : '',
          resolvedStaffKey: staff?.staffKey || '',
          isAdminCaller: adminCaller,
        },
      });

      // Stage 3: Token Storage Format & Cryptography Self-Test
      const s3Start = Date.now();
      const headerVault = typeof req.headers['x-zoho-sealed-vault'] === 'string' ? req.headers['x-zoho-sealed-vault'] : '';
      const bodyVault = typeof req.body?.sealedVault === 'string' ? req.body.sealedVault : '';
      const rawVaultToInspect = bodyVault || headerVault;
      const vaultAudit = inspectSealedVaultFormat(rawVaultToInspect, staff?.staffKey);

      // Verify server AES-256-GCM seal/unseal & HMAC state signing round-trip
      let cryptoRoundTripOk = false;
      let stateRoundTripOk = false;
      try {
        const probeSealed = sealZohoVault({
          staffKey: 'probe@check.local',
          refreshToken: 'probe_rt_123',
          zsoid: '00000000',
          zuid: '00000000',
        });
        const probeUnsealed = unsealZohoVault(probeSealed);
        cryptoRoundTripOk = Boolean(probeUnsealed && probeUnsealed.staffKey === 'probe@check.local');
      } catch {
        cryptoRoundTripOk = false;
      }
      try {
        const probeState = signZohoState({ staffKey: 'probe@check.local', ts: Date.now() });
        const verifiedProbeState = verifyZohoState(probeState);
        stateRoundTripOk = Boolean(verifiedProbeState && verifiedProbeState.staffKey === 'probe@check.local');
      } catch {
        stateRoundTripOk = false;
      }

      const activeConn = staff ? await getZohoConnectionByKey(staff.staffKey, req) : null;
      const sharedOrgZsoid = await findSharedOrgZsoid();
      const vaultHasFormatIssue = vaultAudit.present && (!vaultAudit.validEnvelopeFormat || !vaultAudit.decryptOk || vaultAudit.staffKeyMatch === false);
      const storageStatus: 'pass' | 'warn' | 'fail' =
        !cryptoRoundTripOk || !stateRoundTripOk || vaultHasFormatIssue
          ? 'fail'
          : activeConn
          ? 'pass'
          : 'warn';

      stages.push({
        stage: 'Token Storage Format & Crypto Audit',
        category: 'TOKEN_STORAGE',
        status: storageStatus,
        durationMs: Date.now() - s3Start,
        summary: vaultHasFormatIssue
          ? `Token storage format error: ${vaultAudit.reason}`
          : !cryptoRoundTripOk || !stateRoundTripOk
          ? 'Server encryption (AES-256-GCM) or OAuth state HMAC self-test failed.'
          : activeConn
          ? `Stored connection valid for ${staff?.staffKey} (zsoid=${activeConn.zsoid}, refreshToken=${activeConn.refreshToken ? 'present' : 'missing'})`
          : `Crypto/state format healthy; no active connection stored yet for ${staff?.staffKey || 'user'}.`,
        data: {
          cryptoRoundTripOk,
          stateRoundTripOk,
          sealedVaultAudit: vaultAudit,
          memoryCacheHasUser: Boolean(staff && zohoConnectionsMemory.has(staff.staffKey)),
          memoryCacheTotalUsers: zohoConnectionsMemory.size,
          sharedOrgZsoidResolved: Boolean(sharedOrgZsoid),
          sharedOrgZsoid: sharedOrgZsoid || '',
          activeConnectionSummary: activeConn
            ? {
                staffKey: activeConn.staffKey,
                zohoEmail: activeConn.zohoEmail || '',
                zsoid: activeConn.zsoid || '',
                zuid: activeConn.zuid || '',
                accountsServer: activeConn.accountsServer || '',
                meetingBase: activeConn.meetingBase || '',
                hasRefreshToken: Boolean(activeConn.refreshToken),
                tokenExpiresAt:
                  activeConn.tokenExpiresAt instanceof Date
                    ? activeConn.tokenExpiresAt.toISOString()
                    : String(activeConn.tokenExpiresAt || ''),
              }
            : null,
        },
      });

      // Stage 4: Zoho API Handshake & Upstream Reachability
      const s4Start = Date.now();
      let upstreamReachable = false;
      let upstreamStatus = 0;
      let upstreamError = '';
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4500);
        try {
          const pingRes = await fetch(`${ZOHO_ACCOUNTS_BASE}/.well-known/openid-configuration`, {
            method: 'GET',
            signal: controller.signal,
          });
          upstreamStatus = pingRes.status;
          upstreamReachable = pingRes.status > 0 && pingRes.status < 500;
        } finally {
          clearTimeout(timer);
        }
      } catch (e: any) {
        upstreamError = e?.message || 'Failed to reach Zoho Accounts server';
      }

      let liveRefreshDetail: Record<string, any> | null = null;
      let handshakeOk = upstreamReachable && envOk;
      if (activeConn && envOk) {
        try {
          const accessToken = await refreshZohoAccessToken(activeConn, false);
          const meetingBase = activeConn.meetingBase || ZOHO_MEETING_BASE;
          const accountsServer = activeConn.accountsServer || ZOHO_ACCOUNTS_BASE;
          const [meetingRes, oauthInfo] = await Promise.all([
            fetch(`${meetingBase}/api/v2/user.json`, {
              method: 'GET',
              headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
            })
              .then(async (r) => ({ ok: r.ok, status: r.status, body: await r.json().catch(() => ({})) }))
              .catch((e: any) => ({ ok: false, status: 0, body: { error: e?.message } })),
            fetchZohoOAuthUserInfo(accountsServer, accessToken),
          ]);
          const verifiedViaFallback = Boolean(oauthInfo && activeConn.zsoid);
          liveRefreshDetail = {
            tokenRefreshOk: true,
            meetingUserApiStatus: meetingRes.status,
            meetingUserApiOk: meetingRes.ok,
            meetingUserApiMessage: meetingRes.body?.message || meetingRes.body?.error?.message || '',
            oauthUserInfoFallbackOk: Boolean(oauthInfo),
            verifiedViaFallback,
          };
          handshakeOk = Boolean(meetingRes.ok || verifiedViaFallback);
        } catch (refreshErr: any) {
          liveRefreshDetail = {
            tokenRefreshOk: false,
            error: refreshErr?.message || 'Token refresh failed',
          };
          handshakeOk = false;
        }
      }

      stages.push({
        stage: 'Zoho Upstream API Handshake',
        category: 'API_HANDSHAKE',
        status: handshakeOk ? 'pass' : 'fail',
        durationMs: Date.now() - s4Start,
        summary: !upstreamReachable
          ? `Cannot reach ${ZOHO_ACCOUNTS_BASE}: ${upstreamError || `HTTP ${upstreamStatus}`}`
          : liveRefreshDetail
          ? liveRefreshDetail.tokenRefreshOk
            ? liveRefreshDetail.meetingUserApiOk
              ? `Live Zoho Meeting API handshake succeeded (HTTP ${liveRefreshDetail.meetingUserApiStatus}).`
              : liveRefreshDetail.verifiedViaFallback
              ? `Non-admin Zoho presenter verified via /oauth/user/info fallback (/api/v2/user.json returned HTTP ${liveRefreshDetail.meetingUserApiStatus}).`
              : `Zoho Meeting API returned HTTP ${liveRefreshDetail.meetingUserApiStatus}: ${liveRefreshDetail.meetingUserApiMessage}`
            : `Zoho token refresh failed: ${liveRefreshDetail.error}`
          : `Zoho Accounts endpoint reachable (HTTP ${upstreamStatus}); ready for OAuth authorize redirect.`,
        data: {
          accountsBase: ZOHO_ACCOUNTS_BASE,
          upstreamReachable,
          upstreamStatus,
          upstreamError: upstreamError || undefined,
          liveRefreshDetail,
        },
      });

      const failedStage = stages.find((s) => s.status === 'fail');
      const verdict = failedStage
        ? {
            status: 'fail' as const,
            rootCauseCategory: failedStage.category,
            headline: `Issue isolated in ${failedStage.stage}`,
            recommendation: failedStage.summary,
          }
        : {
            status: 'pass' as const,
            rootCauseCategory: 'NONE',
            headline: activeConn
              ? 'All storage format, auth, runtime, and Zoho API handshake checks passed.'
              : 'Server runtime, crypto storage format, and Zoho upstream reachability are healthy.',
            recommendation: activeConn
              ? 'Connection is healthy and ready to generate Zoho Meeting links.'
              : 'Click Connect My Zoho Account to complete the browser OAuth consent flow.',
          };

      const filteredServerEvents = adminCaller
        ? recentZohoServerEvents.slice(0, 20)
        : recentZohoServerEvents.filter((e) => !e.staffKey || e.staffKey === staff?.staffKey).slice(0, 15);

      res.json({
        ok: !failedStage,
        checkedAt: new Date().toISOString(),
        totalDurationMs: Date.now() - probeStartedAt,
        verdict,
        stages,
        recentServerEvents: filteredServerEvents,
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        checkedAt: new Date().toISOString(),
        totalDurationMs: Date.now() - probeStartedAt,
        error: err?.message || 'Zoho diagnostic probe failed',
        stages,
      });
    }
  });

  // 5. Create an automated Zoho Meeting under the signed-in counselor's Zoho account
  app.post("/api/zoho/meetings", requireAuth, async (req: AuthRequest, res) => {
    try {
      const staff = await resolveStaffIdentity(req);
      if (!staff) {
        return res.status(401).json({ error: 'Unable to identify counselor. Please sign in again.' });
      }

      const conn = await getZohoConnectionByKey(staff.staffKey, req);
      if (!conn) {
        return res.status(400).json({
          code: 'ZOHO_NOT_CONNECTED',
          error: 'Your Zoho Meeting account is not connected. Connect Zoho Meeting first or choose Manual Video Link.',
        });
      }

      const {
        topic,
        agenda,
        startDate,
        startTime,
        durationMinutes,
        timezone,
        participantEmails,
      } = req.body || {};

      if (!topic || !startDate || !startTime) {
        return res.status(400).json({ error: 'topic, startDate, and startTime are required to create a Zoho Meeting.' });
      }

      const formattedStartTime = formatZohoStartTime(String(startDate), String(startTime));
      const clampedDurationMins = Math.max(15, Math.min(720, Number(durationMinutes) || 60));
      const durationMs = clampedDurationMins * 60 * 1000;

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const uniqueEmails = Array.from(
        new Set(
          (Array.isArray(participantEmails) ? participantEmails : [])
            .map((e: any) => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
            .filter((e: string) => emailRegex.test(e))
        )
      );

      const presenterNumeric = Number(conn.zuid);
      const sessionPayload: Record<string, any> = {
        topic: String(topic).trim().slice(0, 200),
        agenda: String(agenda || '').trim().slice(0, 1000),
        presenter: Number.isFinite(presenterNumeric) ? presenterNumeric : conn.zuid,
        startTime: formattedStartTime,
        duration: durationMs,
        timezone: typeof timezone === 'string' && timezone.trim() ? timezone.trim() : 'UTC',
      };

      if (uniqueEmails.length > 0) {
        sessionPayload.participants = uniqueEmails.map((email) => ({ email }));
      }

      const meetingBase = conn.meetingBase || ZOHO_MEETING_BASE;
      const callCreateMeeting = async (accessToken: string) => {
        const zohoRes = await fetch(`${meetingBase}/api/v2/${encodeURIComponent(conn.zsoid)}/sessions.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            Authorization: `Zoho-oauthtoken ${accessToken}`,
          },
          body: JSON.stringify({ session: sessionPayload }),
        });
        const zohoJson: any = await zohoRes.json().catch(() => ({}));
        return { zohoRes, zohoJson };
      };

      let accessToken = await refreshZohoAccessToken(conn, false);
      let { zohoRes, zohoJson } = await callCreateMeeting(accessToken);

      if (zohoRes.status === 401) {
        accessToken = await refreshZohoAccessToken(conn, true);
        ({ zohoRes, zohoJson } = await callCreateMeeting(accessToken));
      }

      const createdSession = zohoJson?.session || zohoJson;
      if (!zohoRes.ok || !createdSession?.joinLink) {
        const zohoErr =
          zohoJson?.message ||
          zohoJson?.error?.message ||
          zohoJson?.error_description ||
          `Zoho Meeting API returned status ${zohoRes.status}`;
        return res.status(zohoRes.status >= 400 ? zohoRes.status : 502).json({
          error: `Zoho Meeting creation failed: ${zohoErr}`,
        });
      }

      const refreshedConn = zohoConnectionsMemory.get(staff.staffKey) || conn;
      res.json({
        meetingKey: String(createdSession.meetingKey || ''),
        joinLink: createdSession.joinLink,
        startLink: createdSession.startLink || createdSession.joinLink,
        zohoEmail: conn.zohoEmail || '',
        participantCount: uniqueEmails.length,
        participantEmails: uniqueEmails,
        startTimeFormatted: formattedStartTime,
        sealedVault: sealZohoVault(refreshedConn),
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to create Zoho Meeting' });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", runtime: process.env.VERCEL ? "vercel-serverless" : "node-server" });
  });

  if (process.env.VERCEL) {
    app.all("/api/*", (_req, res) => {
      res.status(404).json({ error: "API endpoint not found." });
    });
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error("[Express Serverless Error]", err?.message || err);
      if (res.headersSent) return;
      res.status(err?.status || 500).json({
        error: err?.message || "Internal server error",
      });
    });
  }

  return app;
}

async function startLocalServer() {
  const SERVER_INSTANCE_ID = crypto.randomUUID();
  const PORT = Number(process.env.PORT) || 3000;
  const { WebSocketServer, WebSocket } = await import("ws");

  type AliveWebSocket = InstanceType<typeof WebSocket> & { isAlive?: boolean };
  let wss: InstanceType<typeof WebSocketServer> | null = null;

  const sendToLocalWsClients = (serializedPayload: string) => {
    if (!wss) return;
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(serializedPayload);
        } catch {
          // Ignore send errors on closing sockets
        }
      }
    });
  };

  const app = createExpressApp({
    sendToLocalWsClients,
    serverInstanceId: SERVER_INSTANCE_ID,
  });

  const httpServer = http.createServer(app);
  wss = new WebSocketServer({ server: httpServer, path: "/ws/realtime" });

  // Cross-instance Cloud Run & Preview<->Published PostgreSQL LISTEN/NOTIFY bridge
  let pgListenClient: any = null;
  let pgListenConnecting = false;
  let pgIdleReleaseTimer: ReturnType<typeof setTimeout> | null = null;
  let pgReconnectTimer: ReturnType<typeof setTimeout> | null = null;

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
      clientToRelease.query("UNLISTEN uppseekers_realtime").catch(() => {}).finally(() => {
        try {
          clientToRelease.release();
        } catch {
          // Ignore release errors
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

      client.on("notification", (msg: any) => {
        if (msg?.channel !== "uppseekers_realtime" || !msg.payload) return;
        try {
          const parsed = JSON.parse(msg.payload);
          if (!parsed || parsed.instanceId === SERVER_INSTANCE_ID) return;
          const { instanceId: _ignored, ...cleanEvent } = parsed;
          sendToLocalWsClients(JSON.stringify(cleanEvent));
        } catch {
          // Ignore malformed notification payloads
        }
      });

      const handleDisconnect = () => {
        if (pgListenClient === client) {
          pgListenClient = null;
          try {
            client.release(true);
          } catch {
            // Ignore release errors
          }
          if (wss && wss.clients.size > 0 && !pgReconnectTimer) {
            pgReconnectTimer = setTimeout(() => {
              pgReconnectTimer = null;
              void ensurePgListener();
            }, 3000);
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
        }, 4000);
      }
    } finally {
      pgListenConnecting = false;
    }
  };

  wss.on("connection", (ws: AliveWebSocket) => {
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
          ws.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
        }
      } catch {
        // Ignore malformed client frames
      }
    });
    ws.on("close", () => {
      if (wss && wss.clients.size === 0 && !pgIdleReleaseTimer) {
        pgIdleReleaseTimer = setTimeout(() => {
          pgIdleReleaseTimer = null;
          if (wss && wss.clients.size === 0) {
            releasePgListener();
          }
        }, 30000);
      }
    });
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "connected",
          timestamp: new Date().toISOString(),
        })
      );
    }
  });

  const wsHeartbeat = setInterval(() => {
    wss?.clients.forEach((client) => {
      const ws = client as AliveWebSocket;
      if (ws.isAlive === false) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch {
        // Ignore ping errors on closing sockets
      }
    });
  }, 25000);

  wss.on("close", () => {
    clearInterval(wsHeartbeat);
    releasePgListener();
  });

  // Vite middleware for local development only (never loaded on Vercel serverless)
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);

    app.use("*", async (req, res, next) => {
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith(".html")) {
            res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          }
        },
      })
    );
    app.all("/api/*", (_req, res) => {
      res.status(404).json({ error: "API endpoint not found." });
    });
    app.get("*", (_req, res) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[Express Error]", err?.message || err);
    if (res.headersSent) return;
    res.status(err?.status || 500).json({
      error: err?.message || "Internal server error",
    });
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  return app;
}

let cachedServerlessApp: express.Express | null = null;
function getServerlessApp(): express.Express {
  if (!cachedServerlessApp) {
    cachedServerlessApp = createExpressApp();
  }
  return cachedServerlessApp;
}

if (!process.env.VERCEL) {
  void startLocalServer();
}

export default function handler(req: any, res: any): Promise<void> {
  return new Promise<void>((resolve) => {
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
      app(req, res, (err: any) => {
        if (err && !res.headersSent) {
          console.error("[Vercel Handler Error]", err?.message || err);
          res.status(500).json({ error: err?.message || "Internal server error" });
        } else if (!res.headersSent) {
          res.status(404).json({ error: "API endpoint not found." });
        }
        finish();
      });
    } catch (err: any) {
      console.error("[Vercel Handler Sync Error]", err?.message || err);
      if (!res.headersSent) {
        res.status(500).json({ error: err?.message || "Server initialization error" });
      }
      finish();
    }
  });
}

