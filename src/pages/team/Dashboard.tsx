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
import { normalizeTaskStage, normalizeTaskCategory } from '@/lib/taskActivityUtils';
import { 
  Users, BookOpen, CheckSquare, Clock, Filter, Search, 
  CheckCircle2, AlertCircle, ArrowUpRight, Calendar, UserCheck, 
  TrendingUp, ExternalLink, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TeamDashboard() {
  const { students, batches, events, staff, updateStudent } = useDatabase();

  // Date & Timeframe Evaluation Filters for Tasks Chart
  const [dateEvalMode, setDateEvalMode] = useState<'DUE_DATE' | 'TASK_DATE'>('DUE_DATE');
  const [selectedTimeframeFilter, setSelectedTimeframeFilter] = useState('ALL');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');

  // Other Filters for Tasks Chart
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('ALL');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('ALL');
  const [selectedStudentFilter, setSelectedStudentFilter] = useState('ALL');

  // Filters for Section 1: Day-Wise Meetings: Scheduled vs Completed
  const [daywiseTimeframe, setDaywiseTimeframe] = useState('ALL');
  const [daywiseCustomFrom, setDaywiseCustomFrom] = useState('');
  const [daywiseCustomTo, setDaywiseCustomTo] = useState('');
  const [daywiseStaffSearch, setDaywiseStaffSearch] = useState('');
  const [daywiseBatchSearch, setDaywiseBatchSearch] = useState('');
  const [daywiseStudentSearch, setDaywiseStudentSearch] = useState('');

  // Filters for Section 2: Meetings List View
  const [listTimeframe, setListTimeframe] = useState('ALL');
  const [listCustomFrom, setListCustomFrom] = useState('');
  const [listCustomTo, setListCustomTo] = useState('');
  const [listStaffSearch, setListStaffSearch] = useState('');
  const [listBatchSearch, setListBatchSearch] = useState('');
  const [listStudentSearch, setListStudentSearch] = useState('');

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

  // Generic Date Timeframe Matcher for Meetings
  const isDateMatchingTimeframe = (dateStr: string, timeframe: string, customFrom: string, customTo: string) => {
    if (!dateStr || timeframe === 'ALL') return true;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (timeframe === 'TODAY') {
      return dateStr === todayStr || dateStr === 'Today';
    }

    if (timeframe === 'YESTERDAY') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return dateStr === yesterday.toISOString().split('T')[0];
    }

    let itemDate = new Date(dateStr);
    if (dateStr === 'Today') itemDate = today;
    if (isNaN(itemDate.getTime())) return true;

    if (timeframe === 'THIS_WEEK') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0,0,0,0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23,59,59,999);
      return itemDate >= startOfWeek && itemDate <= endOfWeek;
    }

    if (timeframe === 'THIS_MONTH') {
      return itemDate.getMonth() === today.getMonth() && itemDate.getFullYear() === today.getFullYear();
    }

    if (timeframe === 'LAST_MONTH') {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return itemDate.getMonth() === lastMonth.getMonth() && itemDate.getFullYear() === lastMonth.getFullYear();
    }

    if (timeframe === 'CUSTOM') {
      const formatted = itemDate.toISOString().split('T')[0];
      if (customFrom && formatted < customFrom) return false;
      if (customTo && formatted > customTo) return false;
      return true;
    }

    return true;
  };

  // Helper to filter events based on timeframe, staff, batch, student searches
  const filterEventsList = (
    eventItems: any[],
    timeframe: string,
    customFrom: string,
    customTo: string,
    staffQuery: string,
    batchQuery: string,
    studentQuery: string
  ) => {
    return eventItems.filter(evt => {
      // 1. Timeframe
      if (!isDateMatchingTimeframe(evt.date, timeframe, customFrom, customTo)) {
        return false;
      }

      // 2. Staff / Mentor (text search)
      if (staffQuery.trim()) {
        const q = staffQuery.toLowerCase().trim();
        const staffVal = (evt.host || evt.organiser || evt.staff?.name || evt.counselor || '').toLowerCase();
        if (!staffVal.includes(q)) return false;
      }

      // 3. Batch / Cohort (text search)
      if (batchQuery.trim()) {
        const q = batchQuery.toLowerCase().trim();
        const batchVal = (evt.batch || evt.batchName || evt.cohort || evt.stream || evt.type || '').toLowerCase();
        if (!batchVal.includes(q)) return false;
      }

      // 4. Students (text search)
      if (studentQuery.trim()) {
        const q = studentQuery.toLowerCase().trim();
        const studentVal = (
          evt.students || 
          evt.studentName || 
          evt.assignedToStudentName || 
          evt.studentId || 
          ''
        ).toLowerCase();
        if (!studentVal.includes(q)) return false;
      }

      return true;
    });
  };

  // Day-wise Scheduled vs Completed Meetings Filtered Events
  const daywiseFilteredEvents = useMemo(() => {
    return filterEventsList(
      events,
      daywiseTimeframe,
      daywiseCustomFrom,
      daywiseCustomTo,
      daywiseStaffSearch,
      daywiseBatchSearch,
      daywiseStudentSearch
    );
  }, [events, daywiseTimeframe, daywiseCustomFrom, daywiseCustomTo, daywiseStaffSearch, daywiseBatchSearch, daywiseStudentSearch]);

  // Day-wise Scheduled vs Completed Meetings Chart Data
  const dayWiseMeetingData = useMemo(() => {
    const daysMap: Record<string, { date: string, scheduled: number, completed: number }> = {};
    daywiseFilteredEvents.forEach(evt => {
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
  }, [daywiseFilteredEvents]);

  // Meetings List View Filtered Events
  const meetingsListFilteredEvents = useMemo(() => {
    return filterEventsList(
      events,
      listTimeframe,
      listCustomFrom,
      listCustomTo,
      listStaffSearch,
      listBatchSearch,
      listStudentSearch
    );
  }, [events, listTimeframe, listCustomFrom, listCustomTo, listStaffSearch, listBatchSearch, listStudentSearch]);

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
          category: normalizeTaskCategory(t.category),
          stage: normalizeTaskStage(t.stage || t.status),
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
          title: mt.title || 'Untitled Meeting Task',
          category: normalizeTaskCategory('Post Meeting Action'),
          stage: normalizeTaskStage(mt.status || mt.stage),
          dueDate: mt.dueDate || '2026-08-15',
          taskDate: (evt as any).date || mt.dueDate || '2026-08-01',
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

      {/* SECTION: Meetings: Scheduled vs Completed (day wise) */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-800 text-lg">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Meetings: Scheduled vs Completed (day wise)
            </CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              Day-by-day comparison of scheduled and completed sessions filtered by timeframe, mentor staff, cohort batch, or students.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-lg border border-indigo-100">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span> Scheduled
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-100">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span> Completed
            </span>
          </div>
        </CardHeader>

        {/* Filter Controls Bar */}
        <div className="bg-slate-50 border-b border-slate-100 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Filter 1: Time Frame Range */}
            <div>
              <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Time Frame Range</label>
              <select
                value={daywiseTimeframe}
                onChange={(e) => setDaywiseTimeframe(e.target.value)}
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

            {/* Filter 2: Staff / Mentor Search */}
            <div>
              <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Staff / Mentor</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Staff / Mentor..."
                  value={daywiseStaffSearch}
                  onChange={(e) => setDaywiseStaffSearch(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>
            </div>

            {/* Filter 3: Batch / Cohort Search */}
            <div>
              <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Batch / Cohort</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Batch / Cohort..."
                  value={daywiseBatchSearch}
                  onChange={(e) => setDaywiseBatchSearch(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>
            </div>

            {/* Filter 4: Students Search */}
            <div>
              <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Students</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Students..."
                  value={daywiseStudentSearch}
                  onChange={(e) => setDaywiseStudentSearch(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Custom Date Pickers if CUSTOM timeframe selected */}
          {daywiseTimeframe === 'CUSTOM' && (
            <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600">From Date:</span>
                <input 
                  type="date" 
                  value={daywiseCustomFrom} 
                  onChange={(e) => setDaywiseCustomFrom(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600">To Date:</span>
                <input 
                  type="date" 
                  value={daywiseCustomTo} 
                  onChange={(e) => setDaywiseCustomTo(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {(daywiseCustomFrom || daywiseCustomTo) && (
                <button 
                  onClick={() => { setDaywiseCustomFrom(''); setDaywiseCustomTo(''); }}
                  className="text-xs text-red-600 hover:underline font-bold"
                >
                  Reset Custom Dates
                </button>
              )}
            </div>
          )}
        </div>

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

      {/* SECTION: Meetings & Counseling Sessions List View */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-800 text-lg">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Scheduled & Completed Meetings Directory
            </CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              Detailed list of meetings showing meeting name, subject category, organiser, time, and session status.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-900">
              Total Meetings: <span className="font-bold text-indigo-700">{meetingsListFilteredEvents.length}</span>
            </div>
          </div>
        </CardHeader>

        {/* Filter Controls Bar */}
        <div className="bg-slate-50 border-b border-slate-100 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Filter 1: Time Frame Range */}
            <div>
              <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Time Frame Range</label>
              <select
                value={listTimeframe}
                onChange={(e) => setListTimeframe(e.target.value)}
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

            {/* Filter 2: Staff / Mentor Search */}
            <div>
              <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Staff / Mentor</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Staff / Mentor..."
                  value={listStaffSearch}
                  onChange={(e) => setListStaffSearch(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>
            </div>

            {/* Filter 3: Batch / Cohort Search */}
            <div>
              <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Batch / Cohort</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Batch / Cohort..."
                  value={listBatchSearch}
                  onChange={(e) => setListBatchSearch(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>
            </div>

            {/* Filter 4: Students Search */}
            <div>
              <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Students</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Students..."
                  value={listStudentSearch}
                  onChange={(e) => setListStudentSearch(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Custom Date Pickers if CUSTOM timeframe selected */}
          {listTimeframe === 'CUSTOM' && (
            <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600">From Date:</span>
                <input 
                  type="date" 
                  value={listCustomFrom} 
                  onChange={(e) => setListCustomFrom(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600">To Date:</span>
                <input 
                  type="date" 
                  value={listCustomTo} 
                  onChange={(e) => setListCustomTo(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {(listCustomFrom || listCustomTo) && (
                <button 
                  onClick={() => { setListCustomFrom(''); setListCustomTo(''); }}
                  className="text-xs text-red-600 hover:underline font-bold"
                >
                  Reset Custom Dates
                </button>
              )}
            </div>
          )}
        </div>

        {/* List View Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4">Meeting Name</th>
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Organiser</th>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {meetingsListFilteredEvents.length > 0 ? (
                meetingsListFilteredEvents.map((evt) => {
                  // Subject determination: Research, Counselling, SAT, Others
                  let subjectCategory = 'Counselling';
                  const typeLower = (evt.type || evt.subject || '').toLowerCase();
                  if (typeLower.includes('research')) subjectCategory = 'Research';
                  else if (typeLower.includes('sat')) subjectCategory = 'SAT';
                  else if (typeLower.includes('counsel')) subjectCategory = 'Counselling';
                  else if (evt.type) subjectCategory = evt.type;
                  else subjectCategory = 'Others';

                  const statusVal = evt.status || 'Scheduled';
                  const isCompleted = statusVal === 'Completed';

                  return (
                    <tr key={evt.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Meeting Name */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{evt.title}</div>
                        {evt.description && (
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs">{evt.description}</div>
                        )}
                      </td>

                      {/* Subject */}
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1",
                          subjectCategory === 'Research' ? "bg-purple-50 text-purple-700 border-purple-200" :
                          subjectCategory === 'SAT' ? "bg-amber-50 text-amber-700 border-amber-200" :
                          subjectCategory === 'Counselling' ? "bg-blue-50 text-blue-700 border-blue-200" :
                          "bg-slate-100 text-slate-700 border-slate-200"
                        )}>
                          {subjectCategory}
                        </span>
                      </td>

                      {/* Organiser */}
                      <td className="px-6 py-4 font-medium text-slate-800 text-xs">
                        {evt.host || evt.organiser || 'Admin / Counselor'}
                      </td>

                      {/* Time */}
                      <td className="px-6 py-4 text-xs font-mono text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{evt.date}</span>
                          {evt.time && <span className="text-slate-400">@ {evt.time}</span>}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 text-right">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1 uppercase text-[10px]",
                          isCompleted ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                          statusVal === 'Cancelled' ? "bg-rose-50 text-rose-800 border-rose-200" :
                          "bg-indigo-50 text-indigo-800 border-indigo-200"
                        )}>
                          {statusVal}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No Meetings Found</p>
                    <p className="text-xs">Adjust your timeframe or text filters to display sessions.</p>
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
