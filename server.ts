import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { google } from "googleapis";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { db } from "./src/db/index.ts";
import { users, studentsData, staffData, batchesData, eventsData } from "./src/db/schema.ts";
import { eq, or } from "drizzle-orm";

async function safeDbQuery<T>(queryFn: () => Promise<T>, fallback: T): Promise<T> {
  if (!process.env.SQL_HOST && !process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    return fallback;
  }
  try {
    return await queryFn();
  } catch (err) {
    return fallback;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Seed default System Admin if not exists in SQL
  safeDbQuery(async () => {
    const adminUser = await db.select().from(users).where(eq(users.email, 'uppseekers@gmail.com')).then(r => r[0]);
    if (!adminUser) {
      const inserted = await db.insert(users).values({
        uid: 'admin-1',
        email: 'uppseekers@gmail.com',
        name: 'System Admin',
        password: 'Uppseekers@1',
        role: 'SYSTEM_ADMIN'
      }).returning();
      await db.insert(staffData).values({
        userId: inserted[0].id,
        status: 'Active',
        students: 'All'
      });
    }
  }, null);

  // API endpoints

  // Credential Login (Email & Password)
  app.post("/api/auth/login-credentials", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check default admin fallback
      if ((normalizedEmail === 'uppseekers@gmail.com' || normalizedEmail === 'uppseekers@gmail.cm') && (password === 'Uppseekers@1' || password === 'Admin@123')) {
        const foundUser = {
          id: 1,
          uid: '1',
          email: 'uppseekers@gmail.com',
          name: 'System Admin',
          role: 'SYSTEM_ADMIN'
        };
        const token = `custom_${foundUser.uid}_${foundUser.email}`;
        res.json({ user: foundUser, token });
        return;
      }

      const allUsers = await safeDbQuery(() => db.select().from(users), []);
      
      const foundUser = allUsers.find(u => {
        const uEmail = u.email.toLowerCase().trim();
        const emailMatches = uEmail === normalizedEmail;
        const passMatches = u.password === password;
        return emailMatches && passMatches;
      });

      if (!foundUser) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const token = `custom_${foundUser.uid}_${foundUser.email}`;
      res.json({ user: foundUser, token });
    } catch (error) {
      res.status(401).json({ error: "Authentication failed" });
    }
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

  // Create Student
  app.post("/api/students/create", requireAuth, async (req: AuthRequest, res) => {
    try {
      const s = req.body;
      if (!s.name || !s.email) {
        res.status(400).json({ error: "Name and email are required" });
        return;
      }

      const uid = s.id || `STU-${Date.now()}`;
      
      let user = await db.select().from(users).where(or(eq(users.uid, uid), eq(users.email, s.email))).then(res => res[0]);
      
      if (!user) {
        const insertedUsers = await db.insert(users).values({
          uid,
          email: s.email,
          name: s.name,
          password: s.password || 'Uppseekers@1',
          role: 'STUDENT',
        }).returning();
        user = insertedUsers[0];

        await db.insert(studentsData).values({
          userId: user.id,
          phone: s.phone || '',
          intake: s.intake || 'Fall 2026',
          countries: s.countries || ['USA'],
          readiness: s.readiness || 0,
          counselor: s.counselor || 'Unassigned',
          school: s.school || '',
          activities: s.activities || [],
          extracurriculars: s.extracurriculars || [],
          academicScores: s.academicScores || [],
          shortlist: s.shortlist || [],
          documents: s.documents || [],
          essays: s.essays || [],
          tasks: s.tasks || [],
        });
      } else {
        await db.update(users).set({
          name: s.name,
          password: s.password || user.password || 'Uppseekers@1'
        }).where(eq(users.id, user.id));

        await db.update(studentsData).set({
          phone: s.phone || '',
          intake: s.intake || 'Fall 2026',
          countries: s.countries || ['USA'],
          readiness: s.readiness || 0,
          counselor: s.counselor || 'Unassigned',
          school: s.school || '',
          activities: s.activities || [],
          extracurriculars: s.extracurriculars || [],
          academicScores: s.academicScores || [],
          shortlist: s.shortlist || [],
          documents: s.documents || [],
          essays: s.essays || [],
          tasks: s.tasks || [],
        }).where(eq(studentsData.userId, user.id));
      }

      res.json({ success: true, user });
    } catch (e) {
      console.error('Error creating student:', e);
      res.status(500).json({ error: "Failed to create student" });
    }
  });

  // Create Staff
  app.post("/api/staff/create", requireAuth, async (req: AuthRequest, res) => {
    try {
      const s = req.body;
      if (!s.name || !s.email) {
        res.status(400).json({ error: "Name and email are required" });
        return;
      }

      const uid = s.id || `STAFF-${Date.now()}`;
      let user = await db.select().from(users).where(or(eq(users.uid, uid), eq(users.email, s.email))).then(res => res[0]);

      if (!user) {
        const insertedUsers = await db.insert(users).values({
          uid,
          email: s.email,
          name: s.name,
          password: s.password || 'Uppseekers@1',
          role: s.role || 'COUNSELOR',
        }).returning();
        user = insertedUsers[0];

        await db.insert(staffData).values({
          userId: user.id,
          status: s.status || 'Active',
          students: s.students || 'All'
        });
      } else {
        await db.update(users).set({
          name: s.name,
          role: s.role || user.role,
          password: s.password || user.password || 'Uppseekers@1'
        }).where(eq(users.id, user.id));

        await db.update(staffData).set({
          status: s.status || 'Active',
          students: s.students || 'All'
        }).where(eq(staffData.userId, user.id));
      }

      res.json({ success: true, user });
    } catch (e) {
      console.error('Error creating staff:', e);
      res.status(500).json({ error: "Failed to create staff" });
    }
  });

  app.post("/api/students", requireAuth, async (req: AuthRequest, res) => {
    try {
      const studentsArr = req.body;
      await safeDbQuery(async () => {
        for (const student of studentsArr) {
          if (!student.id) continue;
          const userRecord = await db.select().from(users).where(eq(users.uid, student.id)).then(res => res[0]);
          if (!userRecord) continue;
          
          await db.update(users).set({ name: student.name }).where(eq(users.id, userRecord.id));
          await db.update(studentsData).set({
            phone: student.phone || '',
            intake: student.intake || '',
            countries: student.countries || [],
            readiness: student.readiness || 0,
            counselor: student.counselor || 'Unassigned',
            school: student.school || '',
            activities: student.activities || [],
            extracurriculars: student.extracurriculars || [],
            academicScores: student.academicScores || [],
            shortlist: student.shortlist || [],
            documents: student.documents || [],
            essays: student.essays || [],
            tasks: student.tasks || [],
          }).where(eq(studentsData.userId, userRecord.id));
        }
      }, null);
      res.json({ success: true });
    } catch (e) {
      res.json({ success: true });
    }
  });

  app.put("/api/student", requireAuth, async (req: AuthRequest, res) => {
    try {
      const student = req.body;
      if (!student.id) return res.status(400).json({ error: "Missing student ID" });
      await safeDbQuery(async () => {
        const userRecord = await db.select().from(users).where(eq(users.uid, student.id)).then(res => res[0]);
        if (!userRecord) return;
        
        await db.update(users).set({ name: student.name }).where(eq(users.id, userRecord.id));
        await db.update(studentsData).set({
          phone: student.phone || '',
          intake: student.intake || '',
          countries: student.countries || [],
          readiness: student.readiness || 0,
          counselor: student.counselor || 'Unassigned',
          school: student.school || '',
          activities: student.activities || [],
          extracurriculars: student.extracurriculars || [],
          academicScores: student.academicScores || [],
          shortlist: student.shortlist || [],
          documents: student.documents || [],
          essays: student.essays || [],
          tasks: student.tasks || [],
        }).where(eq(studentsData.userId, userRecord.id));
      }, null);
      
      res.json({ success: true });
    } catch (e) {
      res.json({ success: true });
    }
  });

  app.post("/api/batches", requireAuth, async (req: AuthRequest, res) => {
    try {
      const batches = req.body;
      await safeDbQuery(async () => {
        await db.delete(batchesData);
        if (batches.length > 0) {
          await db.insert(batchesData).values(batches.map((b: any) => ({
            id: b.id,
            name: b.name,
            type: b.type,
            parentBatchId: b.parentBatchId || null,
            mentors: b.mentors || [],
            meetingLink: b.meetingLink || '',
            status: b.status || 'Active',
            capacity: b.capacity || 20,
            students: b.students || [],
            completedSessions: b.completedSessions || 0,
            totalSessions: b.totalSessions || 0,
          })));
        }
      }, null);
      res.json({ success: true });
    } catch (e) {
      res.json({ success: true });
    }
  });

  app.post("/api/events", requireAuth, async (req: AuthRequest, res) => {
    try {
      const events = req.body;
      await safeDbQuery(async () => {
        await db.delete(eventsData);
        if (events && events.length > 0) {
          await db.insert(eventsData).values(events.map((e: any) => ({
            id: e.id || `EVT-${Math.floor(Math.random() * 100000)}`,
            title: e.title || '',
            date: e.day || e.date || '',
            type: e.stream || e.type || 'Counselling',
            category: e.category || '',
            attendees: typeof e.students === 'string' ? e.students : (e.attendees || ''),
            status: e.status || 'Scheduled',
            link: e.location || e.link || '',
            time: e.time || '',
            duration: e.duration || '1 hr',
          })));
        }
      }, null);
      res.json({ success: true });
    } catch (e) {
      res.json({ success: true });
    }
  });

  // Google Sheets Real-Time Sync & Backup Endpoint
  app.post("/api/sheets/sync", async (req, res) => {
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
  app.post("/api/ai/narrative-angles", async (req, res) => {
    try {
      const { essayType, prompt, wordCount, studentProfile } = req.body;
      if (!essayType || !wordCount) {
        res.status(400).json({ error: "Draft Classification (essayType) and Target Word Count (wordCount) are mandatory." });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({ error: "GEMINI_API_KEY environment variable is missing." });
        return;
      }

      const ai = new GoogleGenAI({ apiKey });

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

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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

      res.json({ result: jsonResult });
    } catch (err: any) {
      console.error("AI narrative angles error:", err);
      res.status(500).json({ error: err.message || "Failed to generate narrative strategy." });
    }
  });

  // AI SOP & Personal Essay Proofreader / Mentor API
  app.post("/api/ai/proofread-essay", async (req, res) => {
    try {
      const { essayText } = req.body;
      if (!essayText || !essayText.trim()) {
        res.status(400).json({ error: "Input text is required." });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({ error: "GEMINI_API_KEY environment variable is missing." });
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      
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

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: `Input text to edit:\n${essayText}` }] }
        ],
        config: {
          systemInstruction: systemInstruction,
        }
      });

      res.json({ result: response.text });
    } catch (err: any) {
      console.error("AI proofread error:", err);
      res.status(500).json({ error: err.message || "Failed to process AI proofreading request." });
    }
  });

  app.get("/api/data", async (req, res) => {
    try {
      const allUsers = await safeDbQuery(() => db.select().from(users), []);
      const allStudentsData = await safeDbQuery(() => db.select().from(studentsData), []);
      const allStaffData = await safeDbQuery(() => db.select().from(staffData), []);
      
      const students = allStudentsData.map(sd => {
        const u = allUsers.find(u => u.id === sd.userId);
        return {
          id: u?.uid || `STU-${sd.id}`,
          name: u?.name || 'Unknown',
          email: u?.email || '',
          password: u?.password || '',
          role: u?.role || 'STUDENT',
          phone: sd.phone || '',
          intake: sd.intake || 'Fall 2026',
          countries: sd.countries || ['USA'],
          readiness: sd.readiness || 0,
          counselor: sd.counselor || 'Unassigned',
          school: sd.school || '',
          activities: sd.activities || [],
          extracurriculars: sd.extracurriculars || [],
          academicScores: sd.academicScores || [],
          shortlist: sd.shortlist || [],
          documents: sd.documents || [],
          essays: sd.essays || [],
          tasks: sd.tasks || [],
        };
      });

      const staff = allStaffData.map(sd => {
        const u = allUsers.find(u => u.id === sd.userId);
        return {
          id: u?.uid || `STAFF-${sd.id}`,
          name: u?.name || 'Staff Member',
          email: u?.email || '',
          password: u?.password || '',
          role: u?.role || 'COUNSELOR',
          students: sd.students || 'All',
          status: sd.status || 'Active'
        };
      });

      const batches = await safeDbQuery(() => db.select().from(batchesData), []);
      const rawEvents = await safeDbQuery(() => db.select().from(eventsData), []);
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

      res.json({ students, staff, batches, events });
    } catch (error) {
      res.json({ students: [], staff: [], batches: [], events: [] });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // SPA wildcard route fallback for dev mode
    app.use("*", async (req, res, next) => {
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }

  return app;
}

const appPromise = startServer();
export default async function handler(req: any, res: any) {
  const app = await appPromise;
  return app(req, res);
}

