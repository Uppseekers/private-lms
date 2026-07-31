import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { db } from "./src/db/index.ts";
import { users, studentsData, staffData, batchesData, eventsData } from "./src/db/schema.ts";
import { eq } from "drizzle-orm";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API endpoints
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
        // If it's uppseekers@gmail.com, make them SYSTEM_ADMIN
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
            students: '0',
          });
        }
      }

      res.json({ user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
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
      // For simplicity in this prototype, clear and rewrite
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
      if (events.length > 0) {
        await db.insert(eventsData).values(events.map((e: any) => ({
          id: e.id,
          title: e.title || '',
          date: e.date || '',
          type: e.type || e.stream || 'Other',
          category: e.category || '',
          attendees: e.attendees || e.students || '',
          status: e.status || '',
          link: e.link || '',
          time: e.time || '',
          duration: e.duration || '',
        })));
      }
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to update events" });
    }
  });

  app.get("/api/data", requireAuth, async (req: AuthRequest, res) => {
    try {
      // Fetch all students, staff, batches, events
      // Wait, let's keep it simple: for now we just return empty arrays or basic data to fulfill the frontend.
      // But we can actually join them!
      const allUsers = await db.select().from(users);
      
      const allStudentsData = await db.select().from(studentsData);
      const allStaffData = await db.select().from(staffData);
      
      const students = allStudentsData.map(sd => {
        const u = allUsers.find(u => u.id === sd.userId);
        return {
          id: u?.uid,
          name: u?.name,
          email: u?.email,
          role: u?.role,
          ...sd
        };
      });

      const staff = allStaffData.map(sd => {
        const u = allUsers.find(u => u.id === sd.userId);
        return {
          id: u?.uid,
          name: u?.name,
          email: u?.email,
          role: u?.role,
          ...sd
        };
      });

      const batches = await db.select().from(batchesData);
      const rawEvents = await db.select().from(eventsData);
      const events = rawEvents.map(e => ({
        ...e,
        stream: e.type,
        location: e.link,
        students: e.attendees,
        day: e.date,
      }));

      res.json({ students, staff, batches, events });
    } catch (error) {
      console.error("Data error:", error);
      res.status(500).json({ error: "Data fetch failed" });
    }
  });

  // Since we are migrating, we can add a simple ping endpoint
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
