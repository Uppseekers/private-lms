import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, SlidersHorizontal, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SuggestedSchedulerRulesCard from '@/components/SuggestedSchedulerRulesCard';
import CounsellorAutoSchedulerPanel from '@/components/CounsellorAutoSchedulerPanel';
import { useDatabase } from '@/context/DatabaseContext';
import { isUserAdmin } from '@/lib/staffPermissions';

export default function CapacityScheduler() {
  const navigate = useNavigate();
  const { currentUser } = useDatabase();
  const isAdmin = isUserAdmin(currentUser);

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <SlidersHorizontal className="w-6 h-6 text-indigo-600 shrink-0" />
            <span>Capacity Scheduler</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isAdmin
              ? 'Configure class-wise counselling frequency and session time (Grades 7–12), set counsellor working days, timing mode & per-day hourly width, and generate 3-month recurring schedules.'
              : 'View your daily counselling bandwidth and monthly student capacity, find your best suitable schedule, and download it.'}
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/team/users')}
              className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold h-9 whitespace-nowrap shrink-0"
            >
              <Users className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              <span>Student & Staff Availability</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/team/scheduler')}
              className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold h-9 whitespace-nowrap shrink-0"
            >
              <CalendarDays className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              <span>Open Class Calendar</span>
            </Button>
          </div>
        )}
      </div>

      {/* Admin-Only: Class-Wise Frequency & Session Time Rules */}
      {isAdmin && <SuggestedSchedulerRulesCard />}

      {/* Admin Full Controls vs Minimal Counsellor Capacity + Find & Download Schedule View */}
      <CounsellorAutoSchedulerPanel defaultShowAvailability={isAdmin} />
    </div>
  );
}
