const fs = require('fs');
let code = fs.readFileSync('src/pages/team/Scheduler.tsx', 'utf8');

// Add edit state
code = code.replace(
  "const [isModalOpen, setIsModalOpen] = useState(false);",
  `const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);`
);

// Modify handleOpenModal
code = code.replace(
  "const handleOpenModal = () => {",
  `const handleEditEvent = (evt: any) => {
    setEditingEventId(evt.id);
    setFormData({
      stream: evt.stream || evt.type,
      title: evt.title,
      date: evt.date,
      time: evt.time,
      duration: evt.duration,
      location: evt.link || evt.location || '',
      isRecurring: false,
      recurringWeeks: 1,
      notes: evt.notes || ''
    });
    if (evt.batch) {
      setAudienceType('batch');
      setSelectedBatchId(evt.batch);
    } else {
      setAudienceType('individual');
    }
    setIsModalOpen(true);
  };
  
  const handleOpenModal = () => {
    setEditingEventId(null);`
);

// Modify handlePublish to support editing
code = code.replace(
  "const newEvents = Array.from({ length: formData.isRecurring ? formData.recurringWeeks : 1 }).map((_, i) => ({",
  `if (editingEventId) {
      const updatedEvents = events.map((e: any) => e.id === editingEventId ? {
        ...e,
        title: formData.title || \`\${formData.stream} Session\`,
        date: formData.date,
        time: formData.time,
        duration: formData.duration,
        stream: formData.stream,
        type: formData.stream,
        location: formData.location,
        link: formData.location,
        notes: formData.notes,
        batch: audienceType === 'batch' ? selectedBatchId : undefined,
        attendees: audienceType === 'batch' 
          ? \`Batch: \${batches.find(b => b.id === selectedBatchId)?.name}\` 
          : selectedStudents.length > 0 ? selectedStudents.map(id => students.find(s => s.id === id)?.name).join(', ') : 'No students assigned',
        students: audienceType === 'individual' ? selectedStudents.join(',') : '',
      } : e);
      setEvents(updatedEvents);
      handleCloseModal();
      return;
    }

    const newEvents = Array.from({ length: formData.isRecurring ? formData.recurringWeeks : 1 }).map((_, i) => ({`
);

// Modify the modal title
code = code.replace(
  "<h3 className=\"font-bold text-slate-900 text-lg\">Schedule New Session</h3>",
  "<h3 className=\"font-bold text-slate-900 text-lg\">{editingEventId ? 'Edit Session' : 'Schedule New Session'}</h3>"
);

// Modify the button text
code = code.replace(
  "{formData.isRecurring ? 'Schedule Recurring Events' : 'Schedule Event'}",
  "{editingEventId ? 'Save Changes' : (formData.isRecurring ? 'Schedule Recurring Events' : 'Schedule Event')}"
);

// Add Notes field in modal
code = code.replace(
  /<div className="col-span-2">[\s\S]*?<label className="text-sm font-semibold text-slate-700">Meeting Link \/ Location<\/label>[\s\S]*?<\/div>/,
  `$&
                <div className="col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Session Notes</label>
                  <textarea value={formData.notes || ''} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full mt-1.5 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]" placeholder="Add session notes, curriculum topics..." />
                </div>`
);

// Wire up the edit button
code = code.replace(
  /<Button variant="outline" size="sm" className="bg-white">/,
  `<Button variant="outline" size="sm" className="bg-white" onClick={() => handleEditEvent(evt)}>`
);

fs.writeFileSync('src/pages/team/Scheduler.tsx', code);
