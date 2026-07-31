import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  User, 
  CalendarDays, 
  FolderLock, 
  PenTool, 
  CheckSquare,
  Users,
  Shield,
  Settings,
  LogOut,
  GraduationCap,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Role } from '@/types';
import { useDatabase } from '@/context/DatabaseContext';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ElementType;
  permissionKey?: string;
  categoryKey?: string;
}

const studentNavigation: SidebarItem[] = [
  { name: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
  { name: 'Profile', href: '/student/profile', icon: User },
  { name: 'Universities', href: '/student/universities', icon: GraduationCap },
  { name: 'Schedules', href: '/student/schedules', icon: CalendarDays },
  { name: 'Document Vault', href: '/student/vault', icon: FolderLock },
  { name: 'Essay Tool', href: '/student/essays', icon: PenTool },
  { name: 'Task Manager', href: '/student/tasks', icon: CheckSquare },
];

const teamNavigation: SidebarItem[] = [
  { name: 'Dashboard', href: '/team/dashboard', icon: LayoutDashboard },
  { name: 'Class Scheduler', href: '/team/scheduler', icon: CalendarDays, permissionKey: 'create_class', categoryKey: 'schedule' },
  { name: 'Document Center', href: '/team/vault', icon: FolderLock, permissionKey: 'view_vault', categoryKey: 'vault' },
  { name: 'Assignment Evaluator', href: '/team/evaluator', icon: CheckSquare, permissionKey: 'assign_tasks', categoryKey: 'tasks' },
  { name: 'Student Database', href: '/team/users', icon: Users, permissionKey: 'view_roster', categoryKey: 'profile' },
  { name: 'Batch Allocator', href: '/team/batches', icon: Settings, permissionKey: 'create_batch', categoryKey: 'batch' },
  { name: 'Admin Settings', href: '/team/settings', icon: Shield, permissionKey: 'staff_onboard', categoryKey: 'admin' },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [globalSearch, setGlobalSearch] = React.useState('');
  const { currentUser, permissionsMatrix, staff, setCurrentUser, setIsAuthenticated } = useDatabase();
  
  // Basic mock auth detection based on URL
  const isTeam = location.pathname.startsWith('/team');
  const role = isTeam ? Role.TEACHER : Role.STUDENT;
  
  let navigation = isTeam ? teamNavigation : studentNavigation;
  
  if (isTeam && permissionsMatrix && currentUser) {
    const rolePerms = permissionsMatrix[currentUser.role];
    if (rolePerms) {
      navigation = teamNavigation.filter(item => {
        if (!item.permissionKey || !item.categoryKey) return true; // Keep items without specific permission mapping (e.g., Dashboard)
        const category = rolePerms.find(c => c.id === item.categoryKey);
        if (category) {
          const perm = category.items.find(i => i.id === item.permissionKey);
          return perm && perm.enabled;
        }
        return false;
      });
    }
  }

  const handleLogout = () => { 
    localStorage.removeItem('auth_token');
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col transition-all duration-300">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900 truncate">Uppseekers</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-6 mb-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {role === Role.TEACHER ? 'Team Portal' : 'Student Portal'}
          </div>
          <nav className="space-y-1 px-4">
            {navigation.map((item) => {
              const isActive = location.pathname.includes(item.href);
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'group flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <item.icon className={cn("h-5 w-5 flex-shrink-0 transition-colors", isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} aria-hidden="true" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
        </div>
        
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 p-2 w-full rounded-xl hover:bg-slate-50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center">
               <LogOut className="h-5 w-5 text-slate-500" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate text-slate-900">{isTeam ? currentUser.name : 'Sign Out'}</p>
              <p className="text-xs text-slate-400 truncate">{isTeam ? currentUser.role : 'End Session'}</p>
            </div>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm italic font-medium">
              {role === Role.TEACHER ? 'Team Portal' : 'Student Portal'} / <span className="text-slate-600 not-italic font-semibold">{navigation.find(n => location.pathname.includes(n.href))?.name || 'Dashboard'}</span>
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 flex items-center justify-center">
                <Search className="w-4 h-4" />
              </span>
              <input 
                 type="text" 
                 value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search..." 
                 className="bg-slate-100 border-none rounded-full py-1.5 pl-10 pr-4 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow" 
               />
            </div>

            {/* isTeam test as dropdown removed */}
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs relative cursor-pointer shadow-sm border border-indigo-200">
              {isTeam ? currentUser.name.substring(0, 2).toUpperCase() : 'ST'}
              <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8 bg-slate-50">
          <Outlet />
        </div>
        
        {/* Bottom Status Bar */}
        <footer className="h-10 bg-white border-t border-slate-200 px-8 flex items-center justify-between text-[10px] uppercase tracking-widest font-bold text-slate-400 shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-sm"></span> System operational</span>
            <span>Server: production-v1</span>
          </div>
          <div>Uppseekers v2.5.0</div>
        </footer>
      </main>
    </div>
  );
}
