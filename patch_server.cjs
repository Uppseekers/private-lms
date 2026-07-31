const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "const events = await db.select().from(eventsData);",
  `const rawEvents = await db.select().from(eventsData);
      const events = rawEvents.map(e => ({
        ...e,
        stream: e.type,
        location: e.link,
        students: e.attendees,
        day: e.date,
      }));`
);

fs.writeFileSync('server.ts', code);
