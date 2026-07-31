import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Legend,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { useDatabase } from '@/context/DatabaseContext';

export default function StudentDashboard() {
  const { currentUser, events, batches } = useDatabase();
  
  const student = currentUser as any;
  const tasks = student?.tasks || [];
  const shortlist = student?.shortlist || [];
  const essays = student?.essays || [];
  
  const studentBatches = batches.filter(b => b.students?.includes(student?.id));
  const studentEvents = events.filter(e => studentBatches.some(b => b.id === e.batch) || e.students?.includes(student?.id));

  const hasData = tasks.length > 0 || shortlist.length > 0 || essays.length > 0 || studentBatches.length > 0 || studentEvents.length > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl text-slate-400">📊</span>
        </div>
        <h2 className="text-2xl font-semibold text-slate-800">Welcome to your Dashboard</h2>
        <p className="text-slate-500 max-w-md">
          Your dashboard is currently empty. Once tasks, universities, or meetings are assigned to you, they will appear here.
        </p>
      </div>
    );
  }

  // Calculate task statistics
  const completedTasks = tasks.filter((t: any) => t.stage === 'COMPLETED').length;
  const inProgressTasks = tasks.filter((t: any) => t.stage === 'IN_PROGRESS').length;
  const pendingTasks = tasks.filter((t: any) => t.stage === 'TO_DO').length;
  const needsRevisionTasks = tasks.filter((t: any) => t.stage === 'NEEDS_REVISION').length;

  const taskData = [];
  if (completedTasks > 0) taskData.push({ name: 'Completed', value: completedTasks, color: '#10b981' });
  if (inProgressTasks > 0) taskData.push({ name: 'In Progress', value: inProgressTasks, color: '#3b82f6' });
  if (pendingTasks > 0) taskData.push({ name: 'Pending', value: pendingTasks, color: '#f59e0b' });
  if (needsRevisionTasks > 0) taskData.push({ name: 'Needs Revision', value: needsRevisionTasks, color: '#ef4444' });

  // Fallback for empty pie chart
  if (taskData.length === 0) {
    taskData.push({ name: 'No Tasks', value: 1, color: '#e2e8f0' });
  }

  // Chart 2: Mock journey data since we don't have historical grades easily available
  const journeyData = [
    { week: 'W1', attendance: 100, grade: 85, uploads: 2 },
    { week: 'W2', attendance: 100, grade: 88, uploads: 3 },
    { week: 'W3', attendance: 80, grade: 82, uploads: 1 },
    { week: 'W4', attendance: 100, grade: 90, uploads: 4 },
  ];

  // Calculate dynamic deadline countdown
  const now = new Date();
  const upcomingDeadlines: { date: Date; name: string }[] = [];

  shortlist.forEach((uni: any) => {
    if (uni.deadline) {
      const d = new Date(uni.deadline);
      if (!isNaN(d.getTime())) {
        upcomingDeadlines.push({ date: d, name: uni.name });
      }
    }
  });

  tasks.forEach((t: any) => {
    if (t.dueDate && t.stage !== 'COMPLETED') {
      const d = new Date(t.dueDate);
      if (!isNaN(d.getTime())) {
        upcomingDeadlines.push({ date: d, name: t.name });
      }
    }
  });

  const futureDeadlines = upcomingDeadlines.filter(item => item.date.getTime() >= now.getTime());
  futureDeadlines.sort((a, b) => a.date.getTime() - b.date.getTime());

  let daysLeft = 0;
  let targetLabel = 'No upcoming deadlines';

  if (futureDeadlines.length > 0) {
    const closest = futureDeadlines[0];
    const diffMs = closest.date.getTime() - now.getTime();
    daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    targetLabel = `Next: ${closest.name}`;
  } else if (upcomingDeadlines.length > 0) {
    daysLeft = 0;
    targetLabel = 'All current deadlines reached';
  } else {
    daysLeft = 30;
    targetLabel = 'Target Intake Prep';
  }

  const countdownData = [
    { name: 'Remaining', value: daysLeft, fill: '#3b82f6' },
    { name: 'Total', value: 100, fill: '#f1f5f9' }
  ];

  const currentBatch = studentBatches.length > 0 ? studentBatches[0].name : 'Not Assigned';
  const avgEssayScore = 'N/A'; // Mocked
  const attendance = '100%'; // Mocked

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Task Live & Status */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Task Status Breakdown</CardTitle>
            {tasks.length === 0 && <CardDescription>No tasks assigned yet</CardDescription>}
          </CardHeader>
          <CardContent className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={taskData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {taskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 3: Application Countdown */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Deadline Countdown</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[250px] flex flex-col items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart 
                cx="50%" 
                cy="50%" 
                innerRadius="70%" 
                outerRadius="100%" 
                barSize={20} 
                data={countdownData}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar
                  background
                  dataKey="value"
                  cornerRadius={10}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center mt-8 text-center px-4">
              <span className="text-4xl font-bold text-slate-800">{daysLeft}</span>
              <span className="text-sm text-slate-500 font-medium">Days Left</span>
              <span className="text-xs text-blue-600 font-semibold truncate max-w-[180px] mt-1">{targetLabel}</span>
            </div>
          </CardContent>
        </Card>

        {/* Info Card or Placeholder for consistency */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 font-medium text-sm">Current Batch</span>
                <span className="font-semibold text-slate-900">{currentBatch}</span>
             </div>
             <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 font-medium text-sm">Tasks</span>
                <span className="font-semibold text-slate-900">{tasks.length} Total</span>
             </div>
             <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 font-medium text-sm">Shortlisted Univs</span>
                <span className="font-semibold text-slate-900">{shortlist.length}</span>
             </div>
             <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 font-medium text-sm">Essays</span>
                <span className="font-semibold text-emerald-600">{essays.length}</span>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart 2: Class Journey & Impact (Full Width) */}
      <Card>
        <CardHeader>
          <CardTitle>Class Journey & Performance Impact</CardTitle>
          {tasks.length === 0 && <CardDescription>Start completing tasks to see performance metrics</CardDescription>}
        </CardHeader>
        <CardContent className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={journeyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorGrade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="week" stroke="#64748b" />
              <YAxis yAxisId="left" stroke="#64748b" domain={[0, 100]} />
              <YAxis yAxisId="right" orientation="right" stroke="#64748b" />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend />
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="grade" 
                name="Essay Grade (%)"
                stroke="#8b5cf6" 
                fillOpacity={1} 
                fill="url(#colorGrade)" 
              />
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="attendance" 
                name="Attendance (%)"
                stroke="#10b981" 
                fillOpacity={1} 
                fill="url(#colorAttendance)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

