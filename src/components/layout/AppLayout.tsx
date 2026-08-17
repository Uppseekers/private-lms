import React, { useState, useEffect, useRef } from 'react';
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
  Search,
  X,
  ChevronRight,
  Command,
  FileText,
  Menu,
  FileSpreadsheet,
  Target,
  Bell,
  CheckCheck,
  Clock,
  AlertCircle,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getScopedStudentsForStaff } from '@/lib/staffPermissions';
import { Role } from '@/types';
import { useDatabase } from '@/context/DatabaseContext';
import { GoogleSheetsSyncModal } from '@/components/GoogleSheetsSyncModal';

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
  { name: 'Competency Radar', href: '/student/competency-radar', icon: Target },
  { name: 'Universities', href: '/student/universities', icon: GraduationCap },
  { name: 'Schedules', href: '/student/schedules', icon: CalendarDays },
  { name: 'Document Vault', href: '/student/vault', icon: FolderLock },
  { name: 'Essay Tool', href: '/student/essays', icon: PenTool },
  { name: 'Task Manager', href: '/student/tasks', icon: CheckSquare },
];

const teamNavigation: SidebarItem[] = [
  { name: 'Dashboard', href: '/team/dashboard', icon: LayoutDashboard },
  { name: 'Batches & Cohorts', href: '/team/batches', icon: BookOpen, permissionKey: 'view_past', categoryKey: 'batch' },
  { name: 'Class Scheduler', href: '/team/scheduler', icon: CalendarDays, permissionKey: 'create_class', categoryKey: 'schedule' },
  { name: 'Document Center', href: '/team/vault', icon: FolderLock, permissionKey: 'view_vault', categoryKey: 'vault' },
  { name: 'Assignment Evaluator', href: '/team/evaluator', icon: CheckSquare, permissionKey: 'assign_tasks', categoryKey: 'tasks' },
  { name: 'Student Database', href: '/team/users', icon: Users, permissionKey: 'view_roster', categoryKey: 'profile' },
  { name: 'Admin Settings', href: '/team/settings', icon: Shield, permissionKey: 'staff_onboard', categoryKey: 'admin' },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [globalSearch, setGlobalSearch] = useState('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('uppseekers_read_notifications') || '[]');
    } catch {
      return [];
    }
  });
  const [notifFilter, setNotifFilter] = useState<'ALL' | 'TASKS' | 'DOCS' | 'ESSAYS'>('ALL');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  const { currentUser, permissionsMatrix, staff, students, setCurrentUser, setIsAuthenticated } = useDatabase();
  
  // Close mobile drawer and notifications on navigation/click-outside
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsNotificationOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    if (isNotificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotificationOpen]);

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadNotifIds(allIds);
    try {
      localStorage.setItem('uppseekers_read_notifications', JSON.stringify(allIds));
    } catch {}
  };

  const markOneAsRead = (id: string) => {
    if (!readNotifIds.includes(id)) {
      const updated = [...readNotifIds, id];
      setReadNotifIds(updated);
      try {
        localStorage.setItem('uppseekers_read_notifications', JSON.stringify(updated));
      } catch {}
    }
  };

  // Basic mock auth detection based on URL
  const isTeam = location.pathname.startsWith('/team');
  const role = isTeam ? Role.TEACHER : Role.STUDENT;

  const accountName = isTeam 
    ? (currentUser?.name || 'Team Member') 
    : (currentUser?.name || students[0]?.name || 'Student');

  const getUserInitials = (name: string) => {
    if (!name) return 'ST';
    const cleanName = name.replace(/\([^)]*\)/g, '').trim();
    const parts = cleanName.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'ST';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const userInitials = getUserInitials(accountName);
  
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

  // Cmd+K / Ctrl+K shortcut to open Supersearch
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchModalOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentStudent = students.find(s => s.id === currentUser?.id || s.email === currentUser?.email) || students[0];

  // Supersearch filtering across entity types
  const query = globalSearch.toLowerCase().trim();

  const matchingPages = query 
    ? [...studentNavigation, ...teamNavigation].filter((nav, idx, self) => 
        self.findIndex(n => n.href === nav.href) === idx &&
        (nav.name.toLowerCase().includes(query) || nav.href.toLowerCase().includes(query))
      )
    : [];

  const matchingStudents = (query && isTeam)
    ? getScopedStudentsForStaff(students, currentUser).filter(s => s.name?.toLowerCase().includes(query) || s.email?.toLowerCase().includes(query) || s.counselor?.toLowerCase().includes(query))
    : [];

  const matchingUniversities = query
    ? (currentStudent?.shortlist || []).filter((u: any) => u.name?.toLowerCase().includes(query) || u.major?.toLowerCase().includes(query) || u.category?.toLowerCase().includes(query))
    : [];

  const matchingDocuments = query
    ? (currentStudent?.documents || []).filter((d: any) => d.name?.toLowerCase().includes(query) || d.category?.toLowerCase().includes(query) || d.type?.toLowerCase().includes(query))
    : [];

  const matchingEssays = query
    ? (currentStudent?.essays || []).filter((e: any) => e.prompt?.toLowerCase().includes(query) || e.university?.toLowerCase().includes(query))
    : [];

  const matchingTasks = query
    ? (currentStudent?.tasks || []).filter((t: any) => t.name?.toLowerCase().includes(query) || t.category?.toLowerCase().includes(query) || t.description?.toLowerCase().includes(query))
    : [];

  const totalResults = matchingPages.length + matchingStudents.length + matchingUniversities.length + matchingDocuments.length + matchingEssays.length + matchingTasks.length;

  // Notifications aggregation
  const notifications = React.useMemo(() => {
    const list: {
      id: string;
      title: string;
      message: string;
      time: string;
      category: 'TASKS' | 'DOCS' | 'ESSAYS';
      link: string;
      type: 'urgent' | 'info' | 'success' | 'warning';
      isRead: boolean;
    }[] = [];

    if (!isTeam && currentStudent) {
      // Student Notifications: Tasks assigned, Task updates/changes, Essays, Docs
      (currentStudent.tasks || []).forEach((t: any) => {
        const isCompleted = t.status === 'Completed';
        const isNeedsRev = t.status === 'Needs Revision';
        list.push({
          id: `task-${t.id}`,
          title: isNeedsRev ? `Task Revision: ${t.name}` : isCompleted ? `Task Approved: ${t.name}` : `Task Assigned: ${t.name}`,
          message: isNeedsRev 
            ? `Counselor feedback: ${t.feedback || 'Please update your submission and re-upload'}`
            : isCompleted 
            ? `Your task submission has been approved & marked complete.`
            : `Assigned: ${t.description || t.category || 'New task assigned'} (Due: ${t.deadline || 'Upcoming'})`,
          time: t.deadline ? `Due: ${t.deadline}` : 'Active',
          category: 'TASKS',
          link: '/student/tasks',
          type: isNeedsRev ? 'urgent' : isCompleted ? 'success' : 'info',
          isRead: readNotifIds.includes(`task-${t.id}`)
        });
      });

      (currentStudent.essays || []).forEach((e: any) => {
        if (e.feedback || e.status === 'Completed' || e.status === 'Needs Revision') {
          list.push({
            id: `essay-${e.id}`,
            title: `Essay Evaluation: ${e.university || 'Essay Draft'}`,
            message: e.feedback ? `Mentor note: "${e.feedback}"` : `Status updated to ${e.status}`,
            time: 'Evaluated',
            category: 'ESSAYS',
            link: '/student/essays',
            type: e.status === 'Completed' ? 'success' : 'warning',
            isRead: readNotifIds.includes(`essay-${e.id}`)
          });
        }
      });

      (currentStudent.documents || []).forEach((d: any) => {
        if (d.status === 'rejected') {
          list.push({
            id: `doc-${d.id}`,
            title: `Document Action Required: ${d.name}`,
            message: d.notes ? `Feedback: ${d.notes}` : 'Document was not approved. Please re-upload.',
            time: d.date || 'Recent',
            category: 'DOCS',
            link: '/student/vault',
            type: 'urgent',
            isRead: readNotifIds.includes(`doc-${d.id}`)
          });
        } else if (d.status === 'verified') {
          list.push({
            id: `doc-${d.id}`,
            title: `Document Verified: ${d.name}`,
            message: `Your document has been verified by the counselor.`,
            time: d.date || 'Recent',
            category: 'DOCS',
            link: '/student/vault',
            type: 'success',
            isRead: readNotifIds.includes(`doc-${d.id}`)
          });
        }
      });
    } else if (isTeam) {
      // Team / Counselor Notifications
      const scoped = getScopedStudentsForStaff(students, currentUser);
      scoped.forEach((s: any) => {
        (s.tasks || []).filter((t: any) => t.status === 'In Progress' || t.status === 'Needs Revision' || t.submissionText || t.submissionFileUrl).forEach((t: any) => {
          list.push({
            id: `team-task-${s.id}-${t.id}`,
            title: `${s.name}: ${t.name}`,
            message: `Task submission awaiting evaluation (${t.category} • ${t.priority || 'Medium'} Priority)`,
            time: t.deadline || 'Pending',
            category: 'TASKS',
            link: '/team/evaluator',
            type: 'info',
            isRead: readNotifIds.includes(`team-task-${s.id}-${t.id}`)
          });
        });

        (s.essays || []).forEach((e: any) => {
          if (e.status === 'Draft' || e.status === 'In Review' || e.draftText) {
            list.push({
              id: `team-essay-${s.id}-${e.id}`,
              title: `${s.name}: ${e.prompt || e.university || 'Essay Draft'}`,
              message: `Essay submission ready in Assignment Evaluator`,
              time: 'New Submission',
              category: 'ESSAYS',
              link: '/team/evaluator',
              type: 'info',
              isRead: readNotifIds.includes(`team-essay-${s.id}-${e.id}`)
            });
          }
        });

        (s.documents || []).filter((d: any) => d.status === 'pending' || d.status === 'Pending').forEach((d: any) => {
          list.push({
            id: `team-doc-${s.id}-${d.id}`,
            title: `${s.name}: ${d.name}`,
            message: `Document uploaded in ${d.category}. Needs counselor verification.`,
            time: d.date || 'Recent',
            category: 'DOCS',
            link: '/team/vault',
            type: 'warning',
            isRead: readNotifIds.includes(`team-doc-${s.id}-${d.id}`)
          });
        });
      });
    }

    return list;
  }, [isTeam, currentStudent, students, currentUser, readNotifIds]);

  const filteredNotifications = notifications.filter(n => {
    if (notifFilter === 'ALL') return true;
    return n.category === notifFilter;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleSelectResult = (path: string) => {
    setIsSearchModalOpen(false);
    setGlobalSearch('');
    navigate(path);
  };

  const handleLogout = () => { 
    localStorage.removeItem('auth_token');
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden lg:flex flex-col transition-all duration-300 shrink-0">
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
                    'group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-colors',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 shadow-xs'
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

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-lg tracking-tight text-slate-900">Uppseekers</span>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 px-3">
              <div className="px-3 mb-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {role === Role.TEACHER ? 'Team Portal' : 'Student Portal'}
              </div>
              <nav className="space-y-1">
                {navigation.map((item) => {
                  const isActive = location.pathname.includes(item.href);
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        'group flex items-center gap-3 px-3.5 py-3 text-base font-semibold rounded-xl transition-colors',
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      )}
                    >
                      <item.icon className={cn("h-5 w-5 flex-shrink-0 transition-colors", isActive ? "text-indigo-600" : "text-slate-400")} aria-hidden="true" />
                      {item.name}
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 p-2.5 w-full bg-white rounded-xl border border-slate-200 text-left shadow-2xs hover:bg-slate-100 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center">
                  <LogOut className="h-4 h-4 text-slate-600" />
                </div>
                <div className="overflow-hidden min-w-0 flex-1">
                  <p className="text-sm font-bold truncate text-slate-900">{isTeam ? currentUser.name : 'Sign Out'}</p>
                  <p className="text-xs text-slate-400 truncate">{isTeam ? currentUser.role : 'End Session'}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <span className="text-slate-500 text-xs sm:text-sm font-medium truncate">
              <span className="hidden sm:inline italic text-slate-400">{role === Role.TEACHER ? 'Team Portal' : 'Student Portal'} / </span>
              <span className="text-slate-800 not-italic font-bold">{navigation.find(n => location.pathname.includes(n.href))?.name || 'Dashboard'}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Google Sheets Sync Button (ADMIN ONLY) */}
            {isTeam && (currentUser?.role?.toUpperCase().includes('ADMIN') || currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && (
              <button
                onClick={() => setIsSheetsModalOpen(true)}
                title="Google Sheets Backup & Realtime Sync"
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-full py-1.5 px-3 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden md:inline">Sheets Sync</span>
              </button>
            )}

            {/* Supersearch Trigger Button */}
            <div 
              onClick={() => {
                setIsSearchModalOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 100);
              }}
              className="relative flex items-center cursor-pointer group"
            >
              <div className="bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-full py-1.5 px-3 sm:pl-9 sm:pr-10 text-xs text-slate-500 transition-all flex items-center justify-between shadow-2xs">
                <span className="sm:absolute sm:left-3 text-slate-400 group-hover:text-indigo-600 transition-colors">
                  <Search className="w-4 h-4" />
                </span>
                <span className="text-slate-600 font-medium hidden sm:inline text-xs">Supersearch...</span>
                <span className="hidden sm:flex absolute right-2 px-1.5 py-0.5 bg-white text-[10px] font-bold text-slate-400 rounded-md border border-slate-200 shadow-2xs items-center gap-0.5">
                  <Command className="w-2.5 h-2.5" /> K
                </span>
              </div>
            </div>

            {/* Notification Bell with Top Dropdown */}
            <div className="relative" ref={notifDropdownRef}>
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                title="Notifications: Tasks, Updates & Reviews"
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all relative border shadow-2xs",
                  isNotificationOpen 
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                    : "bg-slate-100 hover:bg-slate-200/80 text-slate-600 border-slate-200"
                )}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white animate-pulse shadow-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {/* Header */}
                  <div className="p-3.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Notifications</h4>
                      {unreadCount > 0 && (
                        <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {unreadCount} New
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 transition-colors"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="flex gap-1 p-2 bg-slate-50/50 border-b border-slate-100 text-[11px]">
                    {[
                      { id: 'ALL', label: 'All' },
                      { id: 'TASKS', label: 'Tasks & Updates' },
                      { id: 'ESSAYS', label: 'Essays' },
                      { id: 'DOCS', label: 'Documents' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setNotifFilter(tab.id as any)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0",
                          notifFilter === tab.id
                            ? "bg-white text-indigo-700 font-bold shadow-2xs border border-slate-200"
                            : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Notification List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {filteredNotifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <Bell className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-semibold">No notifications</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Assigned tasks and updates will appear here.</p>
                      </div>
                    ) : (
                      filteredNotifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markOneAsRead(n.id);
                            setIsNotificationOpen(false);
                            navigate(n.link);
                          }}
                          className={cn(
                            "p-3.5 hover:bg-indigo-50/50 cursor-pointer transition-colors flex gap-3 text-left relative group",
                            !n.isRead ? "bg-indigo-50/20" : "bg-white opacity-80 hover:opacity-100"
                          )}
                        >
                          {!n.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 absolute left-2 top-4"></span>
                          )}
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold",
                            n.type === 'urgent' ? "bg-rose-100 text-rose-600" :
                            n.type === 'success' ? "bg-emerald-100 text-emerald-600" :
                            n.type === 'warning' ? "bg-amber-100 text-amber-600" :
                            "bg-indigo-100 text-indigo-600"
                          )}>
                            {n.category === 'TASKS' ? <CheckSquare className="w-4 h-4" /> :
                             n.category === 'ESSAYS' ? <PenTool className="w-4 h-4" /> :
                             <FolderLock className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <h5 className="text-xs font-bold text-slate-900 truncate">{n.title}</h5>
                              <span className="text-[10px] text-slate-400 font-medium shrink-0">{n.time}</span>
                            </div>
                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{n.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                    <button
                      onClick={() => {
                        setIsNotificationOpen(false);
                        navigate(isTeam ? '/team/evaluator' : '/student/tasks');
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      {isTeam ? 'Open Assignment Evaluator →' : 'View All Tasks & Assignments →'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div 
              onClick={() => {
                if (isTeam) {
                  navigate('/team/users');
                } else {
                  navigate('/student/profile');
                }
              }}
              title={`${accountName} - Click to view Profile`}
              className="w-8 h-8 rounded-full bg-indigo-100 hover:bg-indigo-200 hover:scale-105 transition-all flex items-center justify-center text-indigo-700 font-bold text-xs relative cursor-pointer shadow-2xs border border-indigo-200 shrink-0"
            >
              {userInitials}
              <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
            </div>
          </div>
        </header>

        {/* Supersearch Modal Palette */}
        {isSearchModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-20 px-3 sm:px-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
              {/* Search Bar Input */}
              <div className="p-3.5 sm:p-4 border-b border-slate-200 flex items-center gap-2.5 bg-white sticky top-0 z-10">
                <Search className="w-5 h-5 text-indigo-600 shrink-0 ml-1" />
                <input 
                  ref={searchInputRef}
                  type="text"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="Supersearch students, universities, documents, essays..."
                  className="w-full bg-transparent text-slate-900 text-sm sm:text-base placeholder-slate-400 focus:outline-none font-medium"
                  autoFocus
                />
                {globalSearch && (
                  <button onClick={() => setGlobalSearch('')} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button 
                  onClick={() => setIsSearchModalOpen(false)}
                  className="px-2 py-1 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
                >
                  ESC
                </button>
              </div>

              {/* Search Results list */}
              <div className="p-3 sm:p-4 overflow-y-auto space-y-5 flex-1 text-sm">
                {!query && (
                  <div className="py-8 text-center text-slate-400 space-y-2">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <Search className="w-5 h-5" />
                    </div>
                    <p className="font-bold text-slate-700 text-sm">Type to search anything in Uppseekers</p>
                    <p className="text-xs text-slate-400 max-w-xs sm:max-w-sm mx-auto">Instant search across shortlisted universities, uploaded documents, essays, assigned tasks, and navigation pages.</p>
                  </div>
                )}

                {query && totalResults === 0 && (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    No results matching "<strong className="text-slate-800">{globalSearch}</strong>"
                  </div>
                )}

                {/* Pages */}
                {matchingPages.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">Navigation & Features</h4>
                    <div className="space-y-1">
                      {matchingPages.map(page => (
                        <div 
                          key={page.href}
                          onClick={() => handleSelectResult(page.href)}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50/80 cursor-pointer text-slate-800 group transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                              <page.icon className="w-4 h-4" />
                            </div>
                            <span className="font-semibold text-slate-900 group-hover:text-indigo-700">{page.name}</span>
                          </div>
                          <span className="text-xs font-mono text-slate-400 group-hover:text-indigo-600 flex items-center gap-1">
                            Go <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Students */}
                {matchingStudents.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">Students</h4>
                    <div className="space-y-1">
                      {matchingStudents.map(s => (
                        <div 
                          key={s.id}
                          onClick={() => handleSelectResult(`/team/users`)}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50/80 cursor-pointer text-slate-800 group transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {s.name?.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 group-hover:text-indigo-700 truncate">{s.name}</p>
                              <p className="text-xs text-slate-400 truncate">{s.email} • Counselor: {s.counselor || 'Unassigned'}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Universities */}
                {matchingUniversities.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">Shortlisted Universities</h4>
                    <div className="space-y-1">
                      {matchingUniversities.map((uni: any) => (
                        <div 
                          key={uni.id}
                          onClick={() => handleSelectResult(isTeam ? `/team/users` : `/student/universities`)}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50/80 cursor-pointer text-slate-800 group transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                              <GraduationCap className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 group-hover:text-blue-700 truncate">{uni.name}</p>
                              <p className="text-xs text-slate-400 truncate">{uni.major} • {uni.category}</p>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md shrink-0 ml-2">Shortlist</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vault Documents */}
                {matchingDocuments.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">Vault Documents</h4>
                    <div className="space-y-1">
                      {matchingDocuments.map((doc: any) => (
                        <div 
                          key={doc.id}
                          onClick={() => handleSelectResult(isTeam ? `/team/vault` : `/student/vault`)}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-amber-50/80 cursor-pointer text-slate-800 group transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 shrink-0">
                              <FolderLock className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 group-hover:text-amber-800 truncate">{doc.name}</p>
                              <p className="text-xs text-slate-400 truncate">{doc.category} • Status: {doc.status}</p>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md shrink-0 ml-2">Vault</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Essays */}
                {matchingEssays.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">Essays & Writings</h4>
                    <div className="space-y-1">
                      {matchingEssays.map((essay: any) => (
                        <div 
                          key={essay.id}
                          onClick={() => handleSelectResult(isTeam ? `/team/users` : `/student/essays`)}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-50/80 cursor-pointer text-slate-800 group transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                              <PenTool className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 group-hover:text-emerald-800 truncate">{essay.prompt}</p>
                              <p className="text-xs text-slate-400 truncate">{essay.university || 'General Essay'} • Status: {essay.status}</p>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md shrink-0 ml-2">Editor</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tasks */}
                {matchingTasks.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">Tasks & Action Items</h4>
                    <div className="space-y-1">
                      {matchingTasks.map((task: any) => (
                        <div 
                          key={task.id}
                          onClick={() => handleSelectResult(isTeam ? `/team/evaluator` : `/student/tasks`)}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-purple-50/80 cursor-pointer text-slate-800 group transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 shrink-0">
                              <CheckSquare className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 group-hover:text-purple-800 truncate">{task.name}</p>
                              <p className="text-xs text-slate-400 truncate">{task.category} • Stage: {task.stage}</p>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded-md shrink-0 ml-2">Tasks</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Supersearch Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>ESC to close</span>
                <span>{totalResults} result{totalResults !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        )}

        {/* Content View Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6 sm:gap-8 bg-slate-50">
          <Outlet />
        </div>
        
        {/* Bottom Status Bar */}
        <footer className="h-9 bg-white border-t border-slate-200 px-4 sm:px-8 flex items-center justify-between text-[10px] uppercase tracking-widest font-bold text-slate-400 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-2xs"></span> System operational</span>
            <span className="hidden sm:inline">Server: production-v1</span>
          </div>
          <div>Uppseekers v2.5.0</div>
        </footer>

        {/* Google Sheets Sync & Backup Modal */}
        <GoogleSheetsSyncModal 
          isOpen={isSheetsModalOpen} 
          onClose={() => setIsSheetsModalOpen(false)} 
        />
      </main>
    </div>
  );
}

