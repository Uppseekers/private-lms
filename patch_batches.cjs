const fs = require('fs');
let code = fs.readFileSync('src/pages/team/Batches.tsx', 'utf8');

// Add edit state
code = code.replace(
  "const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);",
  `const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [meetingLink, setMeetingLink] = useState('');`
);

// Add edit handler function
code = code.replace(
  "const handleCreateBatch = () => {",
  `const handleEditBatch = () => {
    if(!editingBatch || !newBatchName) return;
    const updated = {
      ...editingBatch,
      name: newBatchName,
      type: newBatchType,
      capacity: parseInt(newBatchCapacity),
      totalSessions: parseInt(newBatchTotalSessions),
      completedSessions: parseInt(newBatchCompletedSessions),
      mentors: [newBatchMentor].filter(Boolean),
      meetingLink: meetingLink
    };
    setBatches(batches.map(b => b.id === editingBatch.id ? updated : b));
    setEditingBatch(null);
  };

  const openEditModal = (batch: Batch) => {
    setEditingBatch(batch);
    setNewBatchName(batch.name);
    setNewBatchType(batch.type as any);
    setNewBatchCapacity(batch.capacity.toString());
    setNewBatchTotalSessions(batch.totalSessions.toString());
    setNewBatchCompletedSessions(batch.completedSessions.toString());
    setNewBatchMentor(batch.mentors[0] || '');
    setMeetingLink(batch.meetingLink || '');
  };

  const handleCreateBatch = () => {`
);

// Handle both Create and Edit Modal UI by modifying the condition
code = code.replace(
  "{isCreateModalOpen && (",
  "{(isCreateModalOpen || editingBatch) && ("
);

// Update title based on edit state
code = code.replace(
  "<h3 className=\"font-bold text-slate-900\">Create New Batch</h3>",
  "<h3 className=\"font-bold text-slate-900\">{editingBatch ? 'Edit Batch' : 'Create New Batch'}</h3>"
);

// Update close handler for edit state
code = code.replace(
  "onClick={() => setIsCreateModalOpen(false)} className=\"p-2 rounded-full hover:bg-slate-100 text-slate-500\"",
  "onClick={() => { setIsCreateModalOpen(false); setEditingBatch(null); }} className=\"p-2 rounded-full hover:bg-slate-100 text-slate-500\""
);

// Add meeting link input to modal
code = code.replace(
  /<div className="space-y-4 pt-4 border-t border-slate-100">/,
  `<div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Meeting Link</label>
                  <input type="url" value={meetingLink} onChange={e => setMeetingLink(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="https://zoom.us/j/..." />
                </div>`
);

// Handle save button onClick
code = code.replace(
  /<Button onClick=\{handleCreateBatch\} className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1">.*?<\/Button>/s,
  `<Button onClick={editingBatch ? handleEditBatch : handleCreateBatch} className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1">
                  {editingBatch ? 'Save Changes' : 'Create Batch'}
                </Button>`
);

// Replace MoreVertical with Edit button in the table row
code = code.replace(
  /<Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">.*?<\/Button>/s,
  `<Button variant="outline" size="sm" onClick={() => openEditModal(batch)} className="bg-white border-slate-200 hover:bg-slate-50 hover:text-indigo-600">
                        Edit
                      </Button>`
);

fs.writeFileSync('src/pages/team/Batches.tsx', code);
