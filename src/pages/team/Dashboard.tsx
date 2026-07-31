import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { useDatabase } from '@/context/DatabaseContext';
import { Users, BookOpen } from 'lucide-react';

export default function TeamDashboard() {
  const { students, batches } = useDatabase();

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

  const activeBatches = useMemo(() => {
    return batches.filter(b => b.status === 'Active');
  }, [batches]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Intake-wise Data */}
        <Card className="flex flex-col border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <Users className="w-5 h-5 text-indigo-600" />
              Student Intake (2026 - 2035)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={intakeData} margin={{ top: 20, right: 20, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }} 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="students" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Total Students" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Live Batches Progress */}
        <Card className="flex flex-col border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              Live Batches Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[350px]">
            {activeBatches.length > 0 ? (
              <div className="space-y-6">
                {activeBatches.map(batch => {
                  const completed = batch.completedSessions || 0;
                  const total = batch.totalSessions || 1; // Prevent div by zero
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
    </div>
  );
}
