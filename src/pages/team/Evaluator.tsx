import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDatabase } from '@/context/DatabaseContext';
import { 
  FileText, Search, Filter, CheckCircle2, AlertCircle, Clock, 
  MessageSquare, Edit3, Save, Lock, Unlock, ArrowRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Evaluator() {
  const { students, updateStudent } = useDatabase();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Flatten all essays from all students
  const allEssays = students.flatMap(student => 
    (student.essays || []).map(essay => ({
      ...essay,
      studentName: student.name,
      studentId: student.id,
      counselor: student.counselor
    }))
  );

  const pendingEssays = allEssays.filter(e => e.status === 'Under Review' || e.status === 'Needs Revision');

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <Edit3 className="w-8 h-8 text-indigo-600" />
          Assignment Evaluator & Essay Review
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review student submissions, provide inline feedback, and manage essay statuses.
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 bg-white border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative max-w-sm w-full">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input
               type="text"
               placeholder="Search by student or prompt..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
             />
          </div>
          <Button variant="outline" className="shrink-0">
            <Filter className="w-4 h-4 mr-2" /> Filter Queues
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4">Student & Prompt</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Counselor</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {pendingEssays.length > 0 ? pendingEssays.map(essay => (
                <tr key={essay.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{essay.studentName}</div>
                    <div className="text-xs text-slate-500 mt-0.5 max-w-[300px] truncate">{essay.prompt}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-semibold border inline-flex items-center gap-1",
                      essay.status === 'Under Review' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                    )}>
                      {essay.status === 'Under Review' ? <Clock className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      {essay.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{essay.counselor}</td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="outline" size="sm" className="bg-white border-slate-200 hover:bg-slate-50 hover:text-indigo-600">
                      Open Editor <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                    <p className="font-semibold text-slate-700">All caught up!</p>
                    <p className="text-xs">No pending essays or assignments require evaluation.</p>
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
