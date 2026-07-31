const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const replacement = `
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

  app.put("/api/student",`;

code = code.replace("  app.put(\"/api/student\",", replacement);
fs.writeFileSync('server.ts', code);
