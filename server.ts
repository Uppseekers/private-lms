import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { db } from "./src/db/index.ts";
import { users, studentsData, staffData, batchesData, eventsData } from "./src/db/schema.ts";
import { eq, or } from "drizzle-orm";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Seed default System Admin if not exists
  try {
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
      console.log('Default Admin account created in Cloud SQL');
    }
  } catch (err) {
    console.error('Error seeding admin:', err);
  }

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
      const allUsers = await db.select().from(users);
      
      const foundUser = allUsers.find(u => {
        const uEmail = u.email.toLowerCase().trim();
        const emailMatches = uEmail === normalizedEmail || 
          (normalizedEmail === 'uppseekers@gmail.cm' && uEmail === 'uppseekers@gmail.com');
        
        // Password match or default admin fallback password
        const passMatches = u.password === password || 
          (uEmail === 'uppseekers@gmail.com' && password === 'Uppseekers@1');
          
        return emailMatches && passMatches;
      });

      if (!foundUser) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const token = `custom_${foundUser.uid}_${foundUser.email}`;
      res.json({ user: foundUser, token });
    } catch (error) {
      console.error("Login credentials error:", error);
      res.status(500).json({ error: "Authentication failed" });
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
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to update students" });
    }
  });

  app.put("/api/student", requireAuth, async (req: AuthRequest, res) => {
    try {
      const student = req.body;
      if (!student.id) return res.status(400).json({ error: "Missing student ID" });
      const userRecord = await db.select().from(users).where(eq(users.uid, student.id)).then(res => res[0]);
      if (!userRecord) return res.status(404).json({ error: "User not found" });
      
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
      
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to update student" });
    }
  });

  app.post("/api/batches", requireAuth, async (req: AuthRequest, res) => {
    try {
      const batches = req.body;
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
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to update batches" });
    }
  });

  app.post("/api/events", requireAuth, async (req: AuthRequest, res) => {
    try {
      const events = req.body;
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
      res.json({ success: true });
    } catch (e) {
      console.error('Error saving events:', e);
      res.status(500).json({ error: "Failed to update events" });
    }
  });

  app.get("/api/data", async (req, res) => {
    try {
      const allUsers = await db.select().from(users);
      const allStudentsData = await db.select().from(studentsData);
      const allStaffData = await db.select().from(staffData);
      
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

      const batches = await db.select().from(batchesData);
      const rawEvents = await db.select().from(eventsData);
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
      console.error("Data error:", error);
      res.status(500).json({ error: "Data fetch failed" });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
