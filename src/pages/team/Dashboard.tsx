import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { useDatabase } from '@/context/DatabaseContext';
import { 
  Users, BookOpen, CheckSquare, Clock, Filter, Search, 
  CheckCircle2, AlertCircle, ArrowUpRight, Calendar, UserCheck, 
  TrendingUp, ExternalLink, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TeamDashboard() {
  const { students, batches, events, staff, updateStudent } = useDatabase();

  // Date & Timeframe Evaluation Filters
  const [dateEvalMode, setDateEvalMode] = useState<'DUE_DATE' | 'TASK_DATE'>('DUE_DATE');
  const [selectedTimeframeFilter, setSelectedTimeframeFilter] = useState('ALL');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');

  // Other Filters for Charts
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('ALL');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('ALL');
  const [selectedStudentFilter, setSelectedStudentFilter] = useState('ALL');

  // Search for Post-Meeting Tasks & Meetings widget
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('ALL');
  const [meetingSearchQuery, setMeetingSearchQuery] = useState('');

  // Helper for Date Matching
  const isDateInTimeframe = (dateStr: string) => {
    if (!dateStr || selectedTimeframeFilter === 'ALL') return true;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (selectedTimeframeFilter === 'TODAY') {
      return dateStr === todayStr;
    }

    if (selectedTimeframeFilter === 'YESTERDAY') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return dateStr === yesterday.toISOString().split('T')[0];
    }

    const itemDate = new Date(dateStr);
    if (isNaN(itemDate.getTime())) return true;

    if (selectedTimeframeFilter === 'THIS_WEEK') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0,0,0,0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23,59,59,999);
      return itemDate >= startOfWeek && itemDate <= endOfWeek;
    }

    if (selectedTimeframeFilter === 'THIS_MONTH') {
      return itemDate.getMonth() === today.getMonth() && itemDate.getFullYear() === today.getFullYear();
    }

    if (selectedTimeframeFilter === 'LAST_MONTH') {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return itemDate.getMonth() === lastMonth.getMonth() && itemDate.getFullYear() === lastMonth.getFullYear();
    }

    if (selectedTimeframeFilter === 'CUSTOM') {
      if (customFromDate && dateStr < customFromDate) return false;
      if (customToDate && dateStr > customToDate) return false;
      return true;
    }

    return true;
  };

  // 1. Intake Data calculation
  const intakeData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (let i = 2026; i <= 2035; i++) {
      counts[i.toString()] = 0;
    }
    
    students.forEach(student => {
      const match = student.intake.match(/\d{4}/);
      if (match) {
        const year = match[0];
        if (counts[year] !== undefined) {
          counts[year]++;
        }
      }
    });

    return Object.keys(counts).map(year => ({
      year,
      students: counts[year]
    }));
  }, [students]);

  // 2. Active Batches calculation
  const activeBatches = useMemo(() => {
    return batches.filter(b => b.status === 'Active');
  }, [batches]);

  // 3. Consolidated All Tasks from Students & Meeting Events
  const allSystemTasks = useMemo(() => {
    const taskList: any[] = [];

    // From Student profile tasks
    students.forEach(student => {
      (student.tasks || []).forEach((t: any) => {
        taskList.push({
          id: t.id || Math.random().toString(),
          title: t.name || t.title || 'Untitled Task',
          category: t.category || 'GENERAL',
          stage: (t.stage || t.status || 'TO_DO').toUpperCase(),
          dueDate: t.dueDate || '2026-08-15',
          taskDate: t.createdDate || t.dueDate || '2026-08-01',
          studentId: student.id,
          studentName: student.name,
          counselor: student.counselor || 'Admin',
          assignedBy: t.assignedBy || 'Counselor',
          source: 'Student Profile',
          externalUrl: t.externalUrl
        });
      });
    });

    // From Meeting Post-Session Tasks
    events.forEach(evt => {
      (evt.tasks || []).forEach((mt: any) => {
        const studentObj = students.find(s => s.id === mt.assignedToStudentId);
        taskList.push({
          id: mt.id || Math.random().toString(),
          title: mt.title,
          category: 'POST_MEETING',
          stage: (mt.status || 'TO_DO').toUpperCase(),
          dueDate: mt.dueDate || '2026-08-15',
          taskDate: evt.date || mt.dueDate || '2026-08-01',
          studentId: mt.assignedToStudentId || studentObj?.id || 'STU-101',
          studentName: mt.assignedToStudentName || studentObj?.name || 'Student',
          counselor: evt.host || 'Counselor',
          assignedBy: mt.assignedBy || evt.host || 'Staff Mentor',
          source: `Meeting: ${evt.title}`,
          externalUrl: mt.externalUrl
        });
      });
    });

    return taskList;
  }, [students, events]);

  // 4. Stage-wise Tasks Chart Filtering Logic
  const filteredTasksForChart = useMemo(() => {
    return allSystemTasks.filter(task => {
      // Staff filter
      if (selectedStaffFilter !== 'ALL') {
        const matchesStaff = (task.counselor && task.counselor.toLowerCase().includes(selectedStaffFilter.toLowerCase())) ||
                             (task.assignedBy && task.assignedBy.toLowerCase().includes(selectedStaffFilter.toLowerCase()));
        if (!matchesStaff) return false;
      }

      // Batch filter
      if (selectedBatchFilter !== 'ALL') {
        const targetBatch = batches.find(b => b.id === selectedBatchFilter);
        if (targetBatch && !targetBatch.students.includes(task.studentId)) {
          return false;
        }
      }

      // Student filter
      if (selectedStudentFilter !== 'ALL' && task.studentId !== selectedStudentFilter) {
        return false;
      }

      // Timeframe & Date Mode filter
      const targetDateStr = dateEvalMode === 'DUE_DATE' ? task.dueDate : task.taskDate;
      if (!isDateInTimeframe(targetDateStr)) {
        return false;
      }

      return true;
    });
  }, [allSystemTasks, selectedStaffFilter, selectedBatchFilter, selectedStudentFilter, dateEvalMode, selectedTimeframeFilter, customFromDate, customToDate, batches]);

  // 5. Stage Breakdown Counts for Chart
  const stageChartData = useMemo(() => {
    const counts = {
      'TO_DO': 0,
      'IN_PROGRESS': 0,
      'UNDER_REVIEW': 0,
      'VERIFIED_COMPLETED': 0,
      'OVERDUE': 0
    };

    const todayStr = new Date().toISOString().split('T')[0];

    filteredTasksForChart.forEach(task => {
      let stageKey = task.stage;
      if (stageKey === 'COMPLETED' || stageKey === 'VERIFIED') stageKey = 'VERIFIED_COMPLETED';
      if (stageKey === 'IN PROGRESS') stageKey = 'IN_PROGRESS';
      if (stageKey === 'UNDER REVIEW') stageKey = 'UNDER_REVIEW';

      // Check if overdue
      if (stageKey !== 'VERIFIED_COMPLETED' && task.dueDate < todayStr) {
        counts['OVERDUE']++;
      } else if (counts[stageKey as keyof typeof counts] !== undefined) {
        counts[stageKey as keyof typeof counts]++;
      } else {
        counts['TO_DO']++;
      }
    });

    return [
      { name: 'To Do', code: 'TO_DO', count: counts['TO_DO'], color: '#64748b' },
      { name: 'In Progress', code: 'IN_PROGRESS', count: counts['IN_PROGRESS'], color: '#6366f1' },
      { name: 'Under Review', code: 'UNDER_REVIEW', count: counts['UNDER_REVIEW'], color: '#f59e0b' },
      { name: 'Completed / Verified', code: 'VERIFIED_COMPLETED', count: counts['VERIFIED_COMPLETED'], color: '#10b981' },
      { name: 'Overdue', code: 'OVERDUE', count: counts['OVERDUE'], color: '#f43f5e' }
    ];
  }, [filteredTasksForChart]);

  // Total calculated metrics
  const totalTaskCount = stageChartData.reduce((acc, curr) => acc + curr.count, 0);
  const completedTaskCount = stageChartData.find(d => d.code === 'VERIFIED_COMPLETED')?.count || 0;
  const completionRate = totalTaskCount > 0 ? Math.round((completedTaskCount / totalTaskCount) * 100) : 0;

  // 6. Filtered Meetings Analytics Data
  const filteredEvents = useMemo(() => {
    return events.filter(evt => {
      // Staff filter
      if (selectedStaffFilter !== 'ALL' && evt.host && !evt.host.toLowerCase().includes(selectedStaffFilter.toLowerCase())) {
        return false;
      }

      // Timeframe filter
      if (!isDateInTimeframe(evt.date)) {
        return false;
      }

      // Search filter
      if (meetingSearchQuery) {
        const q = meetingSearchQuery.toLowerCase();
        const matches = evt.title.toLowerCase().includes(q) ||
                        (evt.host && evt.host.toLowerCase().includes(q)) ||
                        (evt.description && evt.description.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [events, selectedStaffFilter, selectedTimeframeFilter, customFromDate, customToDate, meetingSearchQuery]);

  // Meeting Stream / Type Counts for Chart
  const meetingTypeChartData = useMemo(() => {
    const counts: Record<string, number> = {
      'General Counseling': 0,
      'Essay Review': 0,
      'SAT Strategy': 0,
      'Document Audit': 0,
      'Batch Seminar': 0,
      'Other': 0
    };

    filteredEvents.forEach(evt => {
      const type = evt.type || 'General Counseling';
      if (counts[type] !== undefined) {
        counts[type]++;
      } else {
        counts['Other']++;
      }
    });

    return [
      { name: 'General Counseling', count: counts['General Counseling'], color: '#6366f1' },
      { name: 'Essay Review', count: counts['Essay Review'], color: '#ec4899' },
      { name: 'SAT Strategy', count: counts['SAT Strategy'], color: '#f59e0b' },
      { name: 'Document Audit', count: counts['Document Audit'], color: '#3b82f6' },
      { name: 'Batch Seminar', count: counts['Batch Seminar'], color: '#10b981' },
      { name: 'Other', count: counts['Other'], color: '#64748b' }
    ].filter(d => d.count > 0 || filteredEvents.length === 0);
  }, [filteredEvents]);

  // Day-wise Scheduled vs Completed Meetings
  const dayWiseMeetingData = useMemo(() => {
    const daysMap: Record<string, { date: string, scheduled: number, completed: number }> = {};
    filteredEvents.forEach(evt => {
      const d = evt.date || 'Today';
      if (!daysMap[d]) {
        daysMap[d] = { date: d, scheduled: 0, completed: 0 };
      }
      daysMap[d].scheduled++;
      if (evt.status === 'Completed') {
        daysMap[d].completed++;
      }
    });

    const result = Object.values(daysMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (result.length === 0) {
      return [
        { date: 'Mon', scheduled: 5, completed: 4 },
        { date: 'Tue', scheduled: 7, completed: 6 },
        { date: 'Wed', scheduled: 9, completed: 8 },
        { date: 'Thu', scheduled: 6, completed: 5 },
        { date: 'Fri', scheduled: 10, completed: 9 },
      ];
    }
    return result;
  }, [filteredEvents]);

  // 7. Post-Meeting Tasks List
  const postMeetingTasksList = useMemo(() => {
    return allSystemTasks.filter(t => {
      const q = taskSearchQuery.toLowerCase();
      const matchesSearch = !q || 
        t.title.toLowerCase().includes(q) || 
        t.studentName.toLowerCase().includes(q) || 
        t.source.toLowerCase().includes(q);

      const matchesStatus = taskStatusFilter === 'ALL' || 
        (taskStatusFilter === 'PENDING' && t.stage !== 'VERIFIED_COMPLETED' && t.stage !== 'COMPLETED') ||
        (taskStatusFilter === 'COMPLETED' && (t.stage === 'VERIFIED_COMPLETED' || t.stage === 'COMPLETED'));

      const targetDateStr = dateEvalMode === 'DUE_DATE' ? t.dueDate : t.taskDate;
      const matchesTime = isDateInTimeframe(targetDateStr);

      return matchesSearch && matchesStatus && matchesTime;
    });
  }, [allSystemTasks, taskSearchQuery, taskStatusFilter, dateEvalMode, selectedTimeframeFilter, customFromDate, customToDate]);

  // Handler to toggle task complete
  const handleToggleTaskStatus = (task: any) => {
    const student = students.find(s => s.id === task.studentId);
    if (!student) return;

    const newStage = (task.stage === 'VERIFIED_COMPLETED' || task.stage === 'COMPLETED') ? 'IN_PROGRESS' : 'VERIFIED_COMPLETED';

    const updatedTasks = (student.tasks || []).map((t: any) => {
      if ((t.id && t.id === task.id) || t.name === task.title) {
        return { ...t, stage: newStage, status: newStage };
      }
      return t;
    });

    updateStudent({
      ...student,
      tasks: updatedTasks
    });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full pb-12">
      
      {/* Upper Grid: Intake + Batches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Student Intake Chart */}
        <Card className="flex flex-col border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-white">
            <CardTitle className="flex items-center gap-2 text-slate-800 text-base">
              <Users className="w-5 h-5 text-indigo-600" />
              Student Intake (2026 - 2035)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[320px] p-4 sm:p-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={intakeData} margin={{ top: 20, right: 20, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }} 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="students" fill="#4f46e5" radius={[6, 6, 0, 0]} name="Total Students" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Live Batches Progress */}
        <Card className="flex flex-col border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-white">
            <CardTitle className="flex items-center gap-2 text-slate-800 text-base">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              Live Batches Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[320px] p-6">
            {activeBatches.length > 0 ? (
              <div className="space-y-6">
                {activeBatches.map(batch => {
                  const completed = batch.completedSessions || 0;
                  const total = batch.totalSessions || 1;
                  const progress = Math.min(100, Math.round((completed / total) * 100));
                  
                  return (
                    <div key={batch.id} className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-slate-800">{batch.name}</span>
                        <span className="text-slate-600 font-medium text-xs bg-slate-100 px-2 py-1 rounded-md">{completed} of {total} Sessions Done</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden shadow-inner">
                        <div 
                          className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-slate-400">
                        {batch.type} {batch.mentors.length > 0 && `• ${batch.mentors.join(', ')}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 pb-8">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 mb-2">
                   <BookOpen className="w-8 h-8 text-slate-300" />
                </div>
                <p className="font-medium text-slate-500">No active batches available.</p>
                <p className="text-xs">Create and activate a batch to track progress here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* NEW SECTION 1: Stage-Wise Task Analytics Chart with Multi-Filters */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-800 text-lg">
              <CheckSquare className="w-5 h-5 text-indigo-600" />
              Stage-Wise Task Distribution Analytics
            </CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              Analyze task workload and completion rates filtered by mentor staff, batch, timeframe, or student.
            </p>
          </div>

          {/* Metrics summary */}
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-900">
              Total Tasks: <span className="font-bold text-indigo-700">{totalTaskCount}</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-900">
              Completion Rate: <span className="font-bold text-emerald-700">{completionRate}%</span>
            </div>
          </div>
        </CardHeader>

        {/* Global Filter Controls Bar */}
        <div className="bg-slate-50 border-b border-slate-100 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            
            {/* Filter 1: Date Evaluation Mode */}
            <div>
              <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Date Evaluation Basis</label>
              <select
                value={dateEvalMode}
                onChange={(e) => setDateEvalMode(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="DUE_DATE">Due Date Wise</option>
                <option value="TASK_DATE">Task / Created Date Wise</option>
              </select>
            </div>

            {/* Filter 2: Timeframe Preset */}
            <div>
              <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Timeframe Range</label>
              <select
                value={selectedTimeframeFilter}
                onChange={(e) => setSelectedTimeframeFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Today</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="THIS_WEEK">This Week</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="LAST_MONTH">Last Month</option>
                <option value="CUSTOM">Custom Date Range</option>
              </select>
            </div>

            {/* Filter 3: Staff / Mentor */}
            <div>
              <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Staff / Mentor</label>
              <select
                value={selectedStaffFilter}
                onChange={(e) => setSelectedStaffFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Staff Members ({staff.length})</option>
                {staff.map(s => (
                  <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                ))}
              </select>
            </div>

            {/* Filter 4: Batch */}
            <div>
              <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Batch / Cohort</label>
              <select
                value={selectedBatchFilter}
                onChange={(e) => setSelectedBatchFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Batches</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Filter 5: Student */}
            <div>
              <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Student</label>
              <select
                value={selectedStudentFilter}
                onChange={(e) => setSelectedStudentFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Students ({students.length})</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Date Pickers when CUSTOM is selected */}
          {selectedTimeframeFilter === 'CUSTOM' && (
            <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600">From Date:</span>
                <input 
                  type="date" 
                  value={customFromDate} 
                  onChange={(e) => setCustomFromDate(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600">To Date:</span>
                <input 
                  type="date" 
                  value={customToDate} 
                  onChange={(e) => setCustomToDate(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {(customFromDate || customToDate) && (
                <button 
                  onClick={() => { setCustomFromDate(''); setCustomToDate(''); }}
                  className="text-xs text-red-600 hover:underline font-bold"
                >
                  Reset Custom Dates
                </button>
              )}
            </div>
          )}
        </div>

        {/* Chart View Area */}
        <CardContent className="p-6">
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  formatter={(val: any) => [`${val} Tasks`, 'Count']}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} name="Task Count">
                  {stageChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* NEW SECTION: Day-Wise Scheduled vs Completed Meetings Chart */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-800 text-lg">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Day-Wise Meetings: Scheduled vs Completed
            </CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              Compare total scheduled sessions against completed meetings day by day within selected timeframes and staff filters.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-lg border border-indigo-100">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span> Scheduled
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-100">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span> Completed
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayWiseMeetingData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }} 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="scheduled" fill="#6366f1" radius={[4, 4, 0, 0]} name="Scheduled Meetings" />
                <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Completed Meetings" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* NEW SECTION: Meetings Counts Chart & Interactive Meetings List */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-800 text-lg">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Counseling & Meeting Session Analytics
            </CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              Distribution of scheduled and completed meetings across streams and staff hosts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-900">
              Filtered Sessions: <span className="font-bold text-indigo-700">{filteredEvents.length}</span>
            </div>
          </div>
        </CardHeader>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Meetings Chart */}
          <div className="lg:col-span-1 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Meeting Counts by Stream</h4>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={meetingTypeChartData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} width={100} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: any) => [`${val} Sessions`, 'Meetings']}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {meetingTypeChartData.map((entry, idx) => (
                      <Cell key={`m-cell-${idx}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-slate-400 text-center italic mt-2">
              Reflects selected timeframe and staff mentor filters
            </p>
          </div>

          {/* Meetings List */}
          <div className="lg:col-span-2 flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Scheduled Sessions & Meetings ({filteredEvents.length})</h4>
              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Filter meetings..." 
                  value={meetingSearchQuery}
                  onChange={(e) => setMeetingSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2 py-1 bg-white border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-[300px] border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
              {filteredEvents.length > 0 ? (
                filteredEvents.map(evt => (
                  <div key={evt.id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{evt.title}</span>
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full border border-indigo-100">
                          {evt.type || 'Counseling'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-mono"><Calendar className="w-3 h-3 text-slate-400" /> {evt.date} {evt.time ? `@ ${evt.time}` : ''}</span>
                        <span>•</span>
                        <span>Host: <strong className="text-slate-700">{evt.host || 'Counselor'}</strong></span>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded uppercase border border-emerald-200">
                        {evt.status || 'Scheduled'}
                      </span>
                      {evt.meetLink && (
                        <a 
                          href={evt.meetLink} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                          Join <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400">
                  <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-medium text-slate-600">No meetings match current timeframe or filter.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* NEW SECTION 2: Post-Meeting Tasks & Action Items Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-white p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-800 text-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
              Post-Meeting Tasks & Action Items
            </CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              Tasks assigned following counseling sessions and batch meetings across all students.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search tasks..." 
                value={taskSearchQuery}
                onChange={(e) => setTaskSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={taskStatusFilter}
              onChange={(e) => setTaskStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending / In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4">Task Title & Category</th>
                <th className="px-6 py-4">Assigned Student</th>
                <th className="px-6 py-4">Assigned By / Source</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Stage Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {postMeetingTasksList.length > 0 ? postMeetingTasksList.map((task, idx) => {
                const isCompleted = task.stage === 'VERIFIED_COMPLETED' || task.stage === 'COMPLETED';

                return (
                  <tr key={task.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{task.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{task.category}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{task.studentName}</div>
                      <div className="text-[10px] font-mono text-slate-400">{task.studentId}</div>
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-600">
                      <div>{task.assignedBy}</div>
                      <div className="text-[10px] text-slate-400">{task.source}</div>
                    </td>

                    <td className="px-6 py-4 text-xs font-mono font-medium text-slate-700">
                      {task.dueDate}
                    </td>

                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1.5",
                        isCompleted ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-indigo-50 text-indigo-800 border-indigo-200"
                      )}>
                        {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5 text-indigo-600" />}
                        {task.stage}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant={isCompleted ? "outline" : "default"}
                        onClick={() => handleToggleTaskStatus(task)}
                        className={cn(
                          "text-xs h-8 font-bold",
                          isCompleted ? "border-slate-200 text-slate-600 hover:bg-slate-100" : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        )}
                      >
                        {isCompleted ? 'Mark Pending' : 'Mark Complete'}
                      </Button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No Post-Meeting Tasks Found</p>
                    <p className="text-xs">Schedule a meeting or assign post-session action items to populate this list.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
