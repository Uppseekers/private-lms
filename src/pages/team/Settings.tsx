import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  Shield,
  Code,
  Activity,
  Plus,
  Search,
  Lock,
  Unlock,
  Edit,
  Trash2,
  RefreshCw,
  Power,
  Save,
  CheckCircle2,
  FolderTree,
  Bell,
  CalendarDays,
  CreditCard,
  Download,
  KeyRound,
  LayoutDashboard,
  Compass,
  BookOpen,
  FolderLock,
  CheckSquare,
  FileSpreadsheet,
  GraduationCap,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDatabase, PermissionCategory } from '@/context/DatabaseContext';
import { StaffMember } from '@/types';
import { isUserAdmin } from '@/lib/staffPermissions';
import ChangeUserPasswordModal, { TargetUserForPassword } from '@/components/ChangeUserPasswordModal';
import ZohoSetupDiagnosticsPanel from '@/components/ZohoSetupDiagnosticsPanel';

type TabType = 'staff' | 'permissions' | 'taxonomies' | 'communications' | 'calendar' | 'billing' | 'developer' | 'audit';
type Scope = 'Global Scope' | 'Assigned Scope' | 'Read-Only Scope' | 'Enabled' | 'None' | null;

export default function TeamSettings() {
  const navigate = useNavigate();
  const {
    staff,
    setStaff,
    currentUser,
    setCurrentUser,
    students,
    setStudents,
    permissionsMatrix,
    setPermissionsMatrix,
    roles
  } = useDatabase();
  const isAdmin = isUserAdmin(currentUser);
  const [activeTab, setActiveTab] = useState<TabType>('permissions');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [userForPasswordChange, setUserForPasswordChange] = useState<TargetUserForPassword | null>(null);

  const handleSaveUserPassword = async (userId: string, userType: 'student' | 'staff', newPassword: string) => {
    const updatedStaff = staff.map(s => {
      if (s.id === userId) {
        return { ...s, password: newPassword };
      }
      return s;
    });
    setStaff(updatedStaff);
    const token = localStorage.getItem('auth_token') || 'admin_token';
    try {
      await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId, newPassword, userType: 'staff' })
      });
    } catch (e) {
      console.warn('Backend password sync error (fallback active):', e);
    }
  };
  
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formScope, setFormScope] = useState<'Global Scope' | 'Assigned Scope'>('Assigned Scope');
  
  // Assignment state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTargetId, setAssignTargetId] = useState<string | null>(null);
  const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([]);

  // Permissions State
  const [selectedRoleForPerms, setSelectedRoleForPerms] = useState('COUNSELOR');

  // Developer State
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [envMode, setEnvMode] = useState('Production (Live)');
  const [uploadLimit, setUploadLimit] = useState('Max File Size: 25 MB');
  const [sessionLimit, setSessionLimit] = useState('Auto-logout after 60 Mins');

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState([
    { id: '1', date: 'July 30, 2026 - 14:05', user: 'Sarah Jenkins', role: 'Counselor', action: 'Added new user Dr. Aris Thorne (Role: Research Guide)' },
  ]);

  const addAuditLog = (action: string) => {
    const newLog = {
      id: Math.random().toString(),
      date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false }),
      user: currentUser.name,
      role: currentUser.role,
      action
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleDownloadFavicon = (size: number, format: 'png' | 'svg') => {
    try {
      if (format === 'svg') {
        const a = document.createElement('a');
        a.href = '/favicon.svg';
        a.download = 'uppseekers-favicon.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = '/favicon.svg';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, size, size);
            const dataUrl = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `uppseekers-favicon-${size}x${size}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
        } catch (err) {
          console.error('Error generating favicon raster preview:', err);
        }
      };
      img.onerror = () => {
        const a = document.createElement('a');
        a.href = '/favicon.svg';
        a.download = 'uppseekers-favicon.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };
    } catch (e) {
      console.error('Download error:', e);
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setEditingId(null);
    setFormName('');
    setFormEmail('');
    setFormRole('COUNSELOR');
    setFormPassword('');
    setFormScope('Assigned Scope');
    setIsModalOpen(true);
  };

  const openEditModal = (member: StaffMember) => {
    setIsEditMode(true);
    setEditingId(member.id);
    setFormName(member.name);
    setFormEmail(member.email);
    setFormRole(member.role);
    setFormPassword(member.password || '');
    const isGlobal = (member.students || '').toLowerCase().includes('all') || 
                     (member.students || '').toLowerCase().includes('global') ||
                     member.role === 'CATEGORY_MANAGER' || 
                     member.role === 'SYSTEM_ADMIN';
    setFormScope(isGlobal ? 'Global Scope' : 'Assigned Scope');
    setIsModalOpen(true);
  };

  const saveStaff = () => {
    if (!formName || !formEmail || !formRole) return;
    
    const assignedScopeStr = formScope === 'Global Scope' || formRole === 'CATEGORY_MANAGER' || formRole === 'SYSTEM_ADMIN'
      ? 'All'
      : '0 Students';

    if (isEditMode && editingId) {
      const updatedStaff = staff.map(s => 
        s.id === editingId 
          ? { 
              ...s, 
              name: formName, 
              email: formEmail, 
              role: formRole, 
              password: formPassword || s.password,
              students: formScope === 'Global Scope' || formRole === 'CATEGORY_MANAGER' || formRole === 'SYSTEM_ADMIN' ? 'All' : (s.students === 'All' ? '0 Students' : s.students)
            } 
          : s
      );
      setStaff(updatedStaff);
      
      const member = updatedStaff.find(s => s.id === editingId);
      if (member) {
        fetch('/api/staff/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
          },
          body: JSON.stringify(member)
        }).catch(console.error);
      }
      
      addAuditLog(`Updated user ${formName} (Role: ${formRole}, Scope: ${formScope})`);
    } else {
      const generatedPassword = formPassword || Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 10);
      const newMember: StaffMember = {
        id: `STAFF-${Math.floor(Math.random() * 10000)}`,
        name: formName,
        email: formEmail,
        role: formRole,
        students: assignedScopeStr,
        status: 'Active',
        password: generatedPassword
      };
      setStaff([...staff, newMember]);
      
      fetch('/api/staff/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify(newMember)
      }).catch(console.error);

      addAuditLog(`Added new user ${formName} (Role: ${formRole}, Scope: ${formScope})`);
    }
    
    setIsModalOpen(false);
  };

  const openAssignModal = (member: StaffMember) => {
    setAssignTargetId(member.id);
    const assigned = students.filter(s => 
      s.counselor === member.name || 
      s.researchMentor === member.name || 
      s.satMathMentor === member.name || 
      s.satVerbalMentor === member.name ||
      (s as any).mentor === member.name ||
      (s as any).counsellor === member.name
    ).map(s => s.id);
    setAssignedStudentIds(assigned);
    setIsAssignModalOpen(true);
  };

  const toggleStudentAssignment = (studentId: string) => {
    if (assignedStudentIds.includes(studentId)) {
      setAssignedStudentIds(prev => prev.filter(id => id !== studentId));
    } else {
      setAssignedStudentIds(prev => [...prev, studentId]);
    }
  };

  const saveAssignments = () => {
    if (!assignTargetId) return;
    const member = staff.find(s => s.id === assignTargetId);
    if (!member) return;

    const roleUpper = (member.role || '').toUpperCase().replace(/[\s-]+/g, '_');

    const updatedStudents = students.map(s => {
      if (assignedStudentIds.includes(s.id)) {
        if (roleUpper === 'RESEARCH_GUIDE') {
          return { ...s, researchMentor: member.name };
        } else if (roleUpper === 'SAT_MATH_FACULTY') {
          return { ...s, satMathMentor: member.name };
        } else if (roleUpper === 'SAT_VERBAL_FACULTY') {
          return { ...s, satVerbalMentor: member.name };
        } else {
          return { ...s, counselor: member.name, mentor: member.name } as any;
        }
      } else {
        const updated = { ...s } as any;
        if (updated.counselor === member.name) updated.counselor = '';
        if (updated.researchMentor === member.name) updated.researchMentor = '';
        if (updated.satMathMentor === member.name) updated.satMathMentor = '';
        if (updated.satVerbalMentor === member.name) updated.satVerbalMentor = '';
        if (updated.mentor === member.name) updated.mentor = '';
        return updated;
      }
    });
    setStudents(updatedStudents);

    const updatedStaff = staff.map(s => 
      s.id === assignTargetId ? { ...s, students: `${assignedStudentIds.length} Students` } : s
    );
    setStaff(updatedStaff);

    addAuditLog(`Updated student assignments for ${member.name} (${assignedStudentIds.length} assigned)`);
    setIsAssignModalOpen(false);
  };

  const toggleStaffStatus = (id: string) => {
    setStaff(staff.map(s => {
      if (s.id === id) {
        const newStatus = s.status === 'Active' ? 'Suspended' : 'Active';
        addAuditLog(`${newStatus === 'Suspended' ? 'Suspended' : 'Reactivated'} user ${s.name}`);
        return { ...s, status: newStatus };
      }
      return s;
    }));
  };

  const deleteStaff = (id: string) => {
    const member = staff.find(s => s.id === id);
    if (member) {
      setStaff(staff.filter(s => s.id !== id));
      addAuditLog(`Deleted user ${member.name}`);
    }
  };

  const handleTogglePermission = (categoryId: string, itemId: string) => {
    // Strictly prevent enabling Admin Settings & System Controls for non-admin roles
    if (categoryId === 'admin' && selectedRoleForPerms !== 'SYSTEM_ADMIN') {
      return;
    }
    if (categoryId === 'tab_visibility' && itemId === 'tab_settings') {
      // Keep Admin Settings strictly tied to SYSTEM_ADMIN (always visible for SYSTEM_ADMIN, hidden for others)
      return;
    }
    const currentRolePerms = JSON.parse(JSON.stringify(permissionsMatrix[selectedRoleForPerms])) as PermissionCategory[];
    
    const category = currentRolePerms.find(c => c.id === categoryId);
    if (category) {
      const item = category.items.find(i => i.id === itemId);
      if (item) {
        item.enabled = !item.enabled;
        if (categoryId === 'launchpad') {
          if (!item.enabled) {
            item.scope = 'None';
          } else if (item.id === 'launchpad_edit_curriculum_access') {
            if (!item.scope || item.scope === 'None') item.scope = 'Enabled';
          } else if (!item.scope || item.scope === 'None') {
            item.scope = 'Assigned Scope';
          }
        }
        // When toggling a 1-to-1 tab visibility button ON, ensure the underlying entry permission is enabled so the tab works immediately
        if (categoryId === 'tab_visibility' && item.enabled) {
          const ensureItemEnabled = (targetCatId: string, targetItemId: string, defaultScope?: Scope) => {
            const targetCat = currentRolePerms.find(c => c.id === targetCatId);
            const targetItem = targetCat?.items.find(i => i.id === targetItemId);
            if (targetItem && !targetItem.enabled) {
              targetItem.enabled = true;
              if (defaultScope && (!targetItem.scope || targetItem.scope === 'None')) {
                targetItem.scope = defaultScope;
              }
            }
          };
          if (itemId === 'tab_batches') ensureItemEnabled('batch', 'view_past');
          if (itemId === 'tab_scheduler') ensureItemEnabled('schedule', 'create_class', 'Assigned Scope');
          if (itemId === 'tab_vault') ensureItemEnabled('vault', 'view_vault', 'Assigned Scope');
          if (itemId === 'tab_evaluator') ensureItemEnabled('tasks', 'assign_tasks', 'Assigned Scope');
          if (itemId === 'tab_users') ensureItemEnabled('profile', 'view_roster', 'Assigned Scope');
          if (itemId === 'tab_reports') ensureItemEnabled('reports', 'view_meeting_reports', 'Assigned Scope');
          if (itemId === 'tab_universities') ensureItemEnabled('shortlist', 'add_uni', 'Assigned Scope');
          if (itemId === 'tab_launchpad') {
            const lpCat = currentRolePerms.find(c => c.id === 'launchpad');
            const lpTab = lpCat?.items.find(i => i.id === 'launchpad_student_tab_access');
            const lpEdit = lpCat?.items.find(i => i.id === 'launchpad_edit_curriculum_access');
            if (lpTab && !lpTab.enabled && (!lpEdit || !lpEdit.enabled)) {
              lpTab.enabled = true;
              if (!lpTab.scope || lpTab.scope === 'None') lpTab.scope = 'Assigned Scope';
            }
          }
        }
      }
    }
    setPermissionsMatrix({ ...permissionsMatrix, [selectedRoleForPerms]: currentRolePerms });
  };

  const handleChangeScope = (categoryId: string, itemId: string, newScope: Scope) => {
    if (categoryId === 'admin' && selectedRoleForPerms !== 'SYSTEM_ADMIN') {
      return;
    }
    const currentRolePerms = JSON.parse(JSON.stringify(permissionsMatrix[selectedRoleForPerms])) as PermissionCategory[];
    
    const category = currentRolePerms.find(c => c.id === categoryId);
    if (category) {
      const item = category.items.find(i => i.id === itemId);
      if (item) {
        item.scope = newScope;
        if (categoryId === 'launchpad') {
          item.enabled = newScope !== 'None';
        }
      }
    }
    setPermissionsMatrix({ ...permissionsMatrix, [selectedRoleForPerms]: currentRolePerms });
  };

  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  const savePermissions = () => {
    // 1. Sanitize matrix: enforce that Admin Settings category remains strictly restricted to SYSTEM_ADMIN
    const sanitizedMatrix = { ...permissionsMatrix };
    for (const [roleName, catList] of Object.entries(sanitizedMatrix)) {
      if (roleName !== 'SYSTEM_ADMIN') {
        const adminCat = catList.find(c => c.id === 'admin');
        if (adminCat) {
          adminCat.items.forEach(item => {
            item.enabled = false;
            if (item.scope) item.scope = null;
          });
        }
        const tabVisCat = catList.find(c => c.id === 'tab_visibility');
        const settingsTab = tabVisCat?.items.find(i => i.id === 'tab_settings');
        if (settingsTab) settingsTab.enabled = false;
      } else {
        const tabVisCat = catList.find(c => c.id === 'tab_visibility');
        const settingsTab = tabVisCat?.items.find(i => i.id === 'tab_settings');
        if (settingsTab) settingsTab.enabled = true;
      }
    }

    setPermissionsMatrix(sanitizedMatrix);
    try {
      localStorage.setItem('uppseekers_permissions_v2', JSON.stringify(sanitizedMatrix));
    } catch (e) {
      console.warn('Could not save permissions to localStorage:', e);
    }

    // 2. Check if selected role has global scope
    const roleCategories = sanitizedMatrix[selectedRoleForPerms] || [];
    const hasGlobalScope = roleCategories.some(cat => 
      cat.items.some(item => item.enabled && item.scope && item.scope.toLowerCase().includes('global'))
    );

    const isManagerRole = selectedRoleForPerms === 'CATEGORY_MANAGER' || 
                          selectedRoleForPerms.includes('CATEGORY') ||
                          selectedRoleForPerms === 'OPERATIONS_LEAD' ||
                          selectedRoleForPerms === 'SYSTEM_ADMIN';

    if (hasGlobalScope || isManagerRole) {
      // Sync all staff members of this role to have students: 'All'
      const updatedStaff = staff.map(s => {
        const sRole = (s.role || '').toUpperCase().replace(/[\s-]+/g, '_');
        const targetRole = selectedRoleForPerms.toUpperCase().replace(/[\s-]+/g, '_');
        if (sRole === targetRole) {
          return { ...s, students: 'All' };
        }
        return s;
      });
      setStaff(updatedStaff);

      const curRole = (currentUser.role || '').toUpperCase().replace(/[\s-]+/g, '_');
      const targetRole = selectedRoleForPerms.toUpperCase().replace(/[\s-]+/g, '_');
      if (curRole === targetRole) {
        setCurrentUser({ ...currentUser, students: 'All' });
      }
    }

    addAuditLog(`Updated & saved permissions for ${selectedRoleForPerms} role (Global Scope: ${hasGlobalScope || isManagerRole ? 'Active' : 'Custom'})`);
    setShowSaveSuccess(true);
    setTimeout(() => {
      setShowSaveSuccess(false);
    }, 3000);
  };

  const filteredStaff = staff.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.email.toLowerCase().includes(searchQuery.toLowerCase()) || s.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'All' || s.role === roleFilter;
    const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });
  
  const currentCategoryData = permissionsMatrix[selectedRoleForPerms] || [];

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-rose-200 rounded-2xl shadow-sm text-center animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-600 shadow-inner">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted: Administrator Only</h2>
        <p className="text-sm text-slate-600 mb-3 leading-relaxed">
          The Admin Settings Control Center is strictly restricted to System Administrators only. Non-admin roles (including Category Managers, Counselors, and Faculty) do not have authorization to access system configuration, developer APIs, or permission matrices.
        </p>
        <div className="inline-block bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs text-slate-600 mb-6">
          Logged in as: <strong>{currentUser?.name || 'Staff Member'}</strong> • Role: <span className="font-semibold text-rose-600">{currentUser?.role}</span>
        </div>
        <div>
          <Button onClick={() => navigate('/team/dashboard')} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-semibold">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <Shield className="w-8 h-8 text-indigo-600" />
          Admin Settings Control Center
        </h1>
        <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
          Access Level: {currentUser.role}
          <select value={currentUser.id} onChange={e => setCurrentUser(staff.find(s => s.id === e.target.value)!)} className="ml-4 text-xs border rounded p-1">
            {staff.map(s => <option key={s.id} value={s.id}>Test as: {s.name} ({s.role})</option>)}
          </select>
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {(
          [
            { id: 'staff', label: 'Staff Onboarding', icon: Users },
            { id: 'permissions', label: 'Access & Permissions', icon: Shield },
            { id: 'taxonomies', label: 'Master Taxonomies', icon: FolderTree },
            { id: 'communications', label: 'Communication & Alerts', icon: Bell },
            { id: 'calendar', label: 'Calendar & Links', icon: CalendarDays },
            { id: 'billing', label: 'Billing & Packages', icon: CreditCard },
            { id: 'developer', label: 'Developer & APIs', icon: Code },
            { id: 'audit', label: 'Security Audit & Logs', icon: Activity },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2.5 rounded-t-lg text-sm font-semibold transition-all flex items-center gap-2 -mb-2 border-b-2",
              activeTab === tab.id
                ? "bg-slate-50 text-indigo-700 border-indigo-600"
                : "bg-transparent text-slate-500 border-transparent hover:text-slate-800"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'staff' && (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 bg-white border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
             <div className="flex-1 w-full flex items-center gap-4">
               <div className="relative max-w-sm w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Name, Email, or Role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                  />
               </div>
               <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                 <option value="All">Role: All Roles</option>
                 {roles.map(r => <option key={r} value={r}>{r}</option>)}
               </select>
               <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                 <option value="All">Status: All</option>
                 <option value="Active">Status: Active</option>
                 <option value="Suspended">Status: Suspended</option>
               </select>
             </div>
             <Button onClick={openAddModal} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shrink-0">
               <Plus className="w-4 h-4 mr-2" /> Add Team Member
             </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4">Name & Email</th>
                  <th className="px-6 py-4">Role</th>
                  {isAdmin && <th className="px-6 py-4">Password</th>}
                  <th className="px-6 py-4">Assigned Students</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredStaff.map(member => (
                  <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{member.name}</div>
                      <div className="text-xs text-slate-500">{member.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-semibold border border-indigo-100">
                        {member.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {member.password || '---'}
                      </td>
                    )}
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {(member.students || '').toLowerCase().includes('all') || (member.students || '').toLowerCase().includes('global') || member.role === 'CATEGORY_MANAGER' || member.role === 'SYSTEM_ADMIN' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-bold border border-emerald-200">
                          <Shield className="w-3 h-3 text-emerald-600" /> Global Scope (All Students)
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-700 font-semibold">{member.students || '0 Students'}</span>
                          <Button variant="ghost" size="sm" onClick={() => openAssignModal(member)} className="text-xs text-indigo-600 hover:text-indigo-700 underline p-0 h-auto font-semibold">Assign</Button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider", member.status === 'Active' ? 'text-emerald-600' : 'text-slate-400')}>
                        <span className={cn("w-2 h-2 rounded-full", member.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400')}></span> {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {isAdmin && (
                        <Button 
                          onClick={() => setUserForPasswordChange({
                            id: member.id,
                            name: member.name,
                            email: member.email,
                            role: member.role,
                            type: 'staff',
                            currentPassword: member.password || 'Staff@123'
                          })} 
                          variant="ghost" 
                          size="sm" 
                          className="text-slate-500 hover:text-amber-600"
                          title="Change Password (Admin Only)"
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>
                      )}
                      <Button onClick={() => openEditModal(member)} variant="ghost" size="sm" className="text-slate-500 hover:text-indigo-600">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button onClick={() => toggleStaffStatus(member.id)} variant="ghost" size="sm" className="text-slate-500 hover:text-amber-600" title={member.status === 'Active' ? 'Suspend' : 'Reactivate'}>
                        {member.status === 'Active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </Button>
                      <Button onClick={() => deleteStaff(member.id)} variant="ghost" size="sm" className="text-slate-500 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredStaff.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No staff members found matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'permissions' && (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
           <div className="p-6 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row justify-between md:items-center gap-4">
             <div>
               <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  Access & Permissions Settings
               </h3>
             </div>
             <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
               <div className="flex items-center gap-2 w-full sm:w-auto">
                 <span className="text-sm font-semibold text-slate-600 whitespace-nowrap">Select Role to Configure:</span>
                 <select 
                   value={selectedRoleForPerms}
                   onChange={e => setSelectedRoleForPerms(e.target.value)}
                   className="bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm w-full sm:w-auto text-slate-900"
                 >
                   {roles.map(r => <option key={r} value={r}>Role: {r.replace(/_/g, ' ')}</option>)}
                 </select>
               </div>
               <div className="flex items-center gap-3">
                 {showSaveSuccess && (
                   <span className="text-sm font-bold text-emerald-600 flex items-center animate-in fade-in zoom-in duration-300">
                     <CheckCircle2 className="w-4 h-4 mr-1" /> Settings Saved!
                   </span>
                 )}
                 <Button onClick={savePermissions} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm whitespace-nowrap w-full sm:w-auto">
                   <Save className="w-4 h-4 mr-2" /> Save & Apply Permissions
                 </Button>
               </div>
             </div>
           </div>

           <div className="p-0 bg-white">
             {/* One-to-One Sidebar Tab Visibility Controls */}
             {(() => {
               const tabVisCategory = currentCategoryData.find(c => c.id === 'tab_visibility');
               const tabIconMap: Record<string, React.ElementType> = {
                 tab_dashboard: LayoutDashboard,
                 tab_launchpad: Compass,
                 tab_batches: BookOpen,
                 tab_scheduler: CalendarDays,
                 tab_vault: FolderLock,
                 tab_evaluator: CheckSquare,
                 tab_users: Users,
                 tab_reports: FileSpreadsheet,
                 tab_universities: GraduationCap,
                 tab_settings: Shield,
               };
               const tabLabelMap: Record<string, string> = {
                 tab_dashboard: 'Dashboard',
                 tab_launchpad: 'Launchpad',
                 tab_batches: 'Batches & Cohorts',
                 tab_scheduler: 'Class Scheduler',
                 tab_vault: 'Document Center',
                 tab_evaluator: 'Assignment Evaluator',
                 tab_users: 'Student Database',
                 tab_reports: 'Reports',
                 tab_universities: 'Universities',
                 tab_settings: 'Admin Settings',
               };
               const items = tabVisCategory?.items || [];
               const visibleCount = items.filter(i => i.enabled).length;
               return (
                 <div className="border-b border-slate-200 bg-indigo-50/30">
                   <div className="px-6 py-3.5 bg-indigo-50/70 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2">
                     <div>
                       <h4 className="text-xs font-bold text-indigo-950 tracking-wider uppercase flex items-center gap-2">
                         <Eye className="w-4 h-4 text-indigo-600" />
                         Sidebar Tab Visibility Controls (1-to-1 Tab Buttons)
                       </h4>
                       <p className="text-xs text-slate-600 mt-0.5">
                         Click any tab button below to show or hide that sidebar tab for <span className="font-semibold text-indigo-700">{selectedRoleForPerms.replace(/_/g, ' ')}</span>.
                       </p>
                     </div>
                     <span className="text-xs font-bold text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs">
                       {visibleCount} / {items.length} Tabs Visible
                     </span>
                   </div>
                   <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                     {items.map((tabItem) => {
                       const TabIcon = tabIconMap[tabItem.id] || Shield;
                       const tabTitle = tabLabelMap[tabItem.id] || tabItem.name;
                       const isLockedSettings = tabItem.id === 'tab_settings';
                       return (
                         <button
                           key={tabItem.id}
                           type="button"
                           disabled={isLockedSettings}
                           onClick={() => handleTogglePermission('tab_visibility', tabItem.id)}
                           className={cn(
                             "flex items-center justify-between gap-2.5 p-3 rounded-xl border text-left transition-all",
                             isLockedSettings && selectedRoleForPerms !== 'SYSTEM_ADMIN'
                               ? "bg-rose-50/70 border-rose-200 text-rose-800 cursor-not-allowed opacity-85"
                               : isLockedSettings && selectedRoleForPerms === 'SYSTEM_ADMIN'
                               ? "bg-indigo-600 border-indigo-600 text-white cursor-default shadow-xs"
                               : tabItem.enabled
                               ? "bg-white border-indigo-300 text-slate-900 shadow-xs hover:border-indigo-500 hover:bg-indigo-50/40 cursor-pointer ring-1 ring-indigo-500/15"
                               : "bg-slate-100/80 border-slate-200 text-slate-500 hover:bg-slate-200/60 hover:text-slate-700 cursor-pointer"
                           )}
                         >
                           <div className="flex items-center gap-2.5 min-w-0">
                             <div className={cn(
                               "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                               isLockedSettings && selectedRoleForPerms === 'SYSTEM_ADMIN'
                                 ? "bg-white/20 text-white"
                                 : isLockedSettings
                                 ? "bg-rose-100 text-rose-600"
                                 : tabItem.enabled
                                 ? "bg-indigo-100 text-indigo-700"
                                 : "bg-slate-200 text-slate-400"
                             )}>
                               <TabIcon className="w-4 h-4" />
                             </div>
                             <div className="min-w-0">
                               <p className="text-xs font-bold truncate">{tabTitle}</p>
                               <p className={cn(
                                 "text-[10px] font-semibold",
                                 isLockedSettings && selectedRoleForPerms === 'SYSTEM_ADMIN'
                                   ? "text-indigo-100"
                                   : isLockedSettings
                                   ? "text-rose-600"
                                   : tabItem.enabled
                                   ? "text-emerald-600"
                                   : "text-slate-400"
                               )}>
                                 {isLockedSettings && selectedRoleForPerms !== 'SYSTEM_ADMIN'
                                   ? 'Admin Only'
                                   : isLockedSettings
                                   ? 'Always Visible'
                                   : tabItem.enabled
                                   ? 'Visible'
                                   : 'Hidden'}
                               </p>
                             </div>
                           </div>
                           <div className="shrink-0">
                             {isLockedSettings ? (
                               <Lock className={cn(
                                 "w-4 h-4",
                                 selectedRoleForPerms === 'SYSTEM_ADMIN' ? "text-white/90" : "text-rose-500"
                               )} />
                             ) : tabItem.enabled ? (
                               <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                                 <Eye className="w-3 h-3" /> ON
                               </span>
                             ) : (
                               <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 text-[10px] font-bold">
                                 <EyeOff className="w-3 h-3" /> OFF
                               </span>
                             )}
                           </div>
                         </button>
                       );
                     })}
                   </div>
                 </div>
               );
             })()}

             {currentCategoryData.filter(category => category.id !== 'tab_visibility').map((category, index) => {
               const categoryToTabMap: Record<string, { tabId: string; label: string }> = {
                 profile: { tabId: 'tab_users', label: 'Student Database Tab' },
                 schedule: { tabId: 'tab_scheduler', label: 'Class Scheduler Tab' },
                 batch: { tabId: 'tab_batches', label: 'Batches & Cohorts Tab' },
                 shortlist: { tabId: 'tab_universities', label: 'Universities Tab' },
                 vault: { tabId: 'tab_vault', label: 'Document Center Tab' },
                 tasks: { tabId: 'tab_evaluator', label: 'Assignment Evaluator Tab' },
                 reports: { tabId: 'tab_reports', label: 'Reports Tab' },
                 launchpad: { tabId: 'tab_launchpad', label: 'Launchpad Tab' },
                 admin: { tabId: 'tab_settings', label: 'Admin Settings Tab' },
               };
               const mappedTab = categoryToTabMap[category.id];
               const tabVisCat = currentCategoryData.find(c => c.id === 'tab_visibility');
               const mappedTabItem = mappedTab ? tabVisCat?.items.find(i => i.id === mappedTab.tabId) : undefined;

               return (
                <div key={category.id} className={cn("border-b border-slate-100 last:border-0", index % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
                  <div className="px-6 py-3 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-800 tracking-wider">{category.title}</h4>
                    <div className="flex flex-wrap items-center gap-2">
                      {category.id === 'admin' && selectedRoleForPerms !== 'SYSTEM_ADMIN' && (
                        <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1 shadow-2xs">
                          <Lock className="w-3 h-3 text-rose-600" /> Locked to System Admin Only
                        </span>
                      )}
                      {category.id === 'reports' && (
                        <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-1 shadow-2xs">
                          Reports & Audit Engine
                        </span>
                      )}
                      {category.id === 'shortlist' && (
                        <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 flex items-center gap-1 shadow-2xs">
                          Global Directory & Shortlisting
                        </span>
                      )}
                      {category.id === 'launchpad' && (
                        <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-1 shadow-2xs">
                          Unified Launchpad Controls
                        </span>
                      )}
                      {mappedTab && mappedTabItem && category.id !== 'admin' && (
                        <button
                          type="button"
                          onClick={() => handleTogglePermission('tab_visibility', mappedTab.tabId)}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer shadow-2xs",
                            mappedTabItem.enabled
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-200/80 text-slate-600 border-slate-300 hover:bg-slate-300/70"
                          )}
                        >
                          {mappedTabItem.enabled ? (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              {mappedTab.label}: Visible
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              {mappedTab.label}: Hidden
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {category.items.map((item) => (
                      <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 gap-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-slate-700">• {item.name}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-6 shrink-0">
                          {/* Toggle Switch */}
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold uppercase text-slate-400 w-12 text-right">Toggle:</span>
                            {category.id === 'admin' && selectedRoleForPerms !== 'SYSTEM_ADMIN' ? (
                              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 rounded-md text-xs font-semibold border border-rose-200 shadow-2xs">
                                <Lock className="w-3.5 h-3.5 text-rose-600" /> Admin Only
                              </div>
                            ) : (
                              <>
                                <button 
                                  onClick={() => handleTogglePermission(category.id, item.id)}
                                  className={cn(
                                    "w-11 h-6 rounded-full relative transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500", 
                                    item.enabled ? "bg-indigo-600" : "bg-slate-300"
                                  )}
                                >
                                  <span className={cn(
                                    "absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm", 
                                    item.enabled ? "translate-x-5" : ""
                                  )}></span>
                                </button>
                                <span className={cn("text-xs font-bold w-6", item.enabled ? "text-indigo-700" : "text-slate-500")}>
                                  {item.enabled ? 'ON' : 'OFF'}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Scope Selector */}
                          <div className="flex items-center gap-3 w-[220px]">
                            {item.scope !== null && item.scope !== undefined ? (
                              <>
                                <span className="text-xs font-bold uppercase text-slate-400 w-12 text-right">Scope:</span>
                                <select 
                                  value={item.scope || (category.id === 'launchpad' ? 'None' : '')}
                                  onChange={(e) => handleChangeScope(category.id, item.id, e.target.value as Scope)}
                                  disabled={!item.enabled && category.id !== 'launchpad'}
                                  className={cn(
                                    "border rounded-lg px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1",
                                    (!item.enabled && category.id !== 'launchpad') ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed" : "bg-white border-slate-300 text-slate-700 shadow-sm cursor-pointer"
                                  )}
                                >
                                  {category.id === 'launchpad' && item.id === 'launchpad_edit_curriculum_access' ? (
                                    <>
                                      <option value="Enabled">Enabled</option>
                                      <option value="Read-Only Scope">Read-Only Scope</option>
                                      <option value="None">None</option>
                                    </>
                                  ) : category.id === 'launchpad' ? (
                                    <>
                                      <option value="Global Scope">Global Scope</option>
                                      <option value="Assigned Scope">Assigned Scope</option>
                                      <option value="Read-Only Scope">Read-Only Scope</option>
                                      <option value="None">None</option>
                                    </>
                                  ) : (
                                    <>
                                      <option value="Global Scope">Global Scope</option>
                                      <option value="Assigned Scope">Assigned Scope</option>
                                      <option value="Read-Only Scope">Read-Only Scope</option>
                                    </>
                                  )}
                                </select>
                              </>
                            ) : (
                              <div className="w-full"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
               );
             })}
           </div>
           <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-3">
             {showSaveSuccess && (
               <span className="text-sm font-bold text-emerald-600 flex items-center animate-in fade-in zoom-in duration-300">
                 <CheckCircle2 className="w-4 h-4 mr-1" /> Settings Saved!
               </span>
             )}
             <Button onClick={savePermissions} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
               <Save className="w-4 h-4 mr-2" /> Save & Apply Permissions
             </Button>
           </div>
        </Card>
      )}

      {activeTab === 'taxonomies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           <Card className="border-slate-200 shadow-sm">
             <CardHeader className="bg-slate-50 border-b border-slate-200">
               <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900">University & Program Repository Controls</CardTitle>
             </CardHeader>
             <CardContent className="p-6 space-y-4">
               <div className="space-y-3">
                 <p className="text-xs text-slate-500">Manage target universities, majors, and allowed countries for student selection.</p>
                 <Button variant="outline" className="w-full justify-between"><span className="flex items-center gap-2">Universities Database</span> <Edit className="w-4 h-4 text-slate-400" /></Button>
                 <Button variant="outline" className="w-full justify-between"><span className="flex items-center gap-2">Majors & Programs</span> <Edit className="w-4 h-4 text-slate-400" /></Button>
                 <Button variant="outline" className="w-full justify-between"><span className="flex items-center gap-2">Application Rounds & Intakes</span> <Edit className="w-4 h-4 text-slate-400" /></Button>
               </div>
             </CardContent>
           </Card>

           <Card className="border-slate-200 shadow-sm">
             <CardHeader className="bg-slate-50 border-b border-slate-200">
               <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900">Document Taxonomy Engine</CardTitle>
             </CardHeader>
             <CardContent className="p-6 space-y-4">
               <div className="space-y-3">
                 <p className="text-xs text-slate-500">Define categories for Vault uploads and global file size restrictions.</p>
                 <Button variant="outline" className="w-full justify-between"><span className="flex items-center gap-2">Document Categories</span> <Edit className="w-4 h-4 text-slate-400" /></Button>
                 <div className="pt-2">
                   <label className="text-xs font-bold text-slate-700 block mb-1">Max Upload File Size</label>
                   <select className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                     <option>25 MB</option>
                     <option>50 MB</option>
                     <option>100 MB</option>
                   </select>
                 </div>
               </div>
             </CardContent>
           </Card>

           <Card className="border-slate-200 shadow-sm">
             <CardHeader className="bg-slate-50 border-b border-slate-200">
               <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900">Task & Activity Categories</CardTitle>
             </CardHeader>
             <CardContent className="p-6 space-y-4">
               <div className="space-y-3">
                 <p className="text-xs text-slate-500">Create & manage categories for extracurriculars and task assignments.</p>
                 <div className="flex gap-2">
                   <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-medium border border-indigo-100 flex items-center gap-1">Internships <Power className="w-3 h-3 rotate-45 cursor-pointer text-indigo-400 hover:text-indigo-600" /></span>
                   <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-medium border border-indigo-100 flex items-center gap-1">Research <Power className="w-3 h-3 rotate-45 cursor-pointer text-indigo-400 hover:text-indigo-600" /></span>
                 </div>
                 <div className="flex gap-2">
                   <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-medium border border-indigo-100 flex items-center gap-1">MOOCs <Power className="w-3 h-3 rotate-45 cursor-pointer text-indigo-400 hover:text-indigo-600" /></span>
                   <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-medium border border-indigo-100 flex items-center gap-1">Impact Projects <Power className="w-3 h-3 rotate-45 cursor-pointer text-indigo-400 hover:text-indigo-600" /></span>
                 </div>
                 <Button variant="outline" size="sm" className="w-full mt-2 border-dashed"><Plus className="w-4 h-4 mr-2" /> Add New Category</Button>
               </div>
             </CardContent>
           </Card>
        </div>
      )}

      {activeTab === 'communications' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <Card className="border-slate-200 shadow-sm">
             <CardHeader className="bg-slate-50 border-b border-slate-200">
               <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900">Email & SMS Gateways</CardTitle>
             </CardHeader>
             <CardContent className="p-6 space-y-4">
               <div className="space-y-3">
                 <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center">
                       <Activity className="w-4 h-4" />
                     </div>
                     <div>
                       <div className="font-semibold text-sm">SendGrid Email API</div>
                       <div className="text-xs text-slate-500">Connected & Verified</div>
                     </div>
                   </div>
                   <Button variant="ghost" size="sm" className="text-slate-500"><Edit className="w-4 h-4" /></Button>
                 </div>
                 <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center">
                       <Activity className="w-4 h-4" />
                     </div>
                     <div>
                       <div className="font-semibold text-sm">Twilio WhatsApp API</div>
                       <div className="text-xs text-slate-500">Connected & Verified</div>
                     </div>
                   </div>
                   <Button variant="ghost" size="sm" className="text-slate-500"><Edit className="w-4 h-4" /></Button>
                 </div>
               </div>
             </CardContent>
           </Card>

           <Card className="border-slate-200 shadow-sm">
             <CardHeader className="bg-slate-50 border-b border-slate-200">
               <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900">Automated Notification Triggers</CardTitle>
             </CardHeader>
             <CardContent className="p-6 space-y-4">
               <div className="space-y-4">
                 {[
                   { name: 'Draft Submission Alert', desc: 'Notify counselors when student submits essay' },
                   { name: 'Schedule Reminders', desc: 'SMS/Email 24hr & 1hr before classes' },
                   { name: 'Task Overdue Warning', desc: 'Alert when project deadline is missed' }
                 ].map(trigger => (
                   <div key={trigger.name} className="flex justify-between items-center pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                     <div>
                       <div className="font-semibold text-sm text-slate-900">{trigger.name}</div>
                       <div className="text-xs text-slate-500">{trigger.desc}</div>
                     </div>
                     <button className="w-10 h-5 bg-indigo-600 rounded-full relative focus:outline-none">
                       <span className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full translate-x-5 transition-transform shadow-sm"></span>
                     </button>
                   </div>
                 ))}
                 <Button variant="outline" className="w-full mt-4"><span className="flex items-center gap-2"><Edit className="w-4 h-4" /> Open Email Template Builder</span></Button>
               </div>
             </CardContent>
           </Card>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <ZohoSetupDiagnosticsPanel currentUser={currentUser} />

           <Card className="border-slate-200 shadow-sm">
             <CardHeader className="bg-slate-50 border-b border-slate-200">
               <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900">Global Holidays & Timezones</CardTitle>
             </CardHeader>
             <CardContent className="p-6 space-y-4">
               <div className="space-y-4">
                 <div>
                   <label className="text-xs font-bold text-slate-700 block mb-1">Institution Primary Timezone</label>
                   <select className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                     <option>Asia/Kolkata (IST)</option>
                     <option>America/New_York (EST)</option>
                     <option>Europe/London (GMT)</option>
                   </select>
                 </div>
                 <div className="pt-2">
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-xs font-bold text-slate-700 block">Upcoming Blocked Dates (Holidays)</span>
                     <Button variant="ghost" size="sm" className="text-indigo-600 h-6 px-2 text-xs"><Plus className="w-3 h-3 mr-1" /> Add</Button>
                   </div>
                   <div className="space-y-2">
                     <div className="flex justify-between items-center text-sm border border-slate-200 p-2 rounded-lg">
                       <span>Diwali Break</span>
                       <span className="text-slate-500 text-xs">Nov 10 - Nov 14</span>
                     </div>
                     <div className="flex justify-between items-center text-sm border border-slate-200 p-2 rounded-lg">
                       <span>Winter Break</span>
                       <span className="text-slate-500 text-xs">Dec 24 - Jan 02</span>
                     </div>
                   </div>
                 </div>
               </div>
             </CardContent>
           </Card>
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <Card className="border-slate-200 shadow-sm lg:col-span-2">
             <CardHeader className="bg-slate-50 border-b border-slate-200">
               <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900">Service Packages & Subscriptions</CardTitle>
             </CardHeader>
             <CardContent className="p-0">
               <table className="w-full text-left text-sm whitespace-nowrap">
                 <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                   <tr>
                     <th className="px-6 py-4">Package Tier</th>
                     <th className="px-6 py-4">Counseling Sessions</th>
                     <th className="px-6 py-4">Essay Reviews</th>
                     <th className="px-6 py-4">Status</th>
                     <th className="px-6 py-4 text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 bg-white">
                   <tr className="hover:bg-slate-50">
                     <td className="px-6 py-4 font-bold text-slate-900">SAT Prep Only</td>
                     <td className="px-6 py-4 text-slate-600">0</td>
                     <td className="px-6 py-4 text-slate-600">0</td>
                     <td className="px-6 py-4"><span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded">Active</span></td>
                     <td className="px-6 py-4 text-right"><Button variant="ghost" size="sm" className="text-slate-500"><Edit className="w-4 h-4" /></Button></td>
                   </tr>
                   <tr className="hover:bg-slate-50">
                     <td className="px-6 py-4 font-bold text-slate-900">Comprehensive UG Admissions</td>
                     <td className="px-6 py-4 text-slate-600">12 Sessions</td>
                     <td className="px-6 py-4 text-slate-600">Unlimited</td>
                     <td className="px-6 py-4"><span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded">Active</span></td>
                     <td className="px-6 py-4 text-right"><Button variant="ghost" size="sm" className="text-slate-500"><Edit className="w-4 h-4" /></Button></td>
                   </tr>
                   <tr className="hover:bg-slate-50">
                     <td className="px-6 py-4 font-bold text-slate-900">Ivy League Mentorship</td>
                     <td className="px-6 py-4 text-slate-600">Unlimited</td>
                     <td className="px-6 py-4 text-slate-600">Unlimited</td>
                     <td className="px-6 py-4"><span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded">Active</span></td>
                     <td className="px-6 py-4 text-right"><Button variant="ghost" size="sm" className="text-slate-500"><Edit className="w-4 h-4" /></Button></td>
                   </tr>
                 </tbody>
               </table>
               <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-center">
                 <Button variant="outline" size="sm" className="bg-white"><Plus className="w-4 h-4 mr-2" /> Create New Package Tier</Button>
               </div>
             </CardContent>
           </Card>
           
           <Card className="border-slate-200 shadow-sm">
             <CardHeader className="bg-slate-50 border-b border-slate-200">
               <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900">Payment Gateway</CardTitle>
             </CardHeader>
             <CardContent className="p-6 space-y-4">
               <div className="flex items-center justify-between p-3 border border-indigo-200 bg-indigo-50 rounded-lg">
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center">
                     <CreditCard className="w-4 h-4" />
                   </div>
                   <div>
                     <div className="font-semibold text-sm text-indigo-900">Stripe Live Mode</div>
                     <div className="text-xs text-indigo-700">Connected & Processing</div>
                   </div>
                 </div>
                 <Button variant="ghost" size="sm" className="text-indigo-700 hover:bg-indigo-100"><Edit className="w-4 h-4" /></Button>
               </div>
               <Button variant="outline" className="w-full mt-2"><span className="flex items-center gap-2">Manage Discount Coupons</span></Button>
               <Button variant="outline" className="w-full"><span className="flex items-center gap-2">Configure Invoice Settings</span></Button>
             </CardContent>
           </Card>
        </div>
      )}

      {activeTab === 'developer' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <Card className="border-slate-200 shadow-sm">
             <CardHeader className="bg-slate-50 border-b border-slate-200">
               <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900">API Keys & Integrations</CardTitle>
             </CardHeader>
             <CardContent className="p-6 space-y-6">
               <div className="space-y-4">
                 {[
                   { name: 'Zoho Meeting OAuth 2.0 (.com)', status: 'Managed', desc: 'Per-counselor OAuth & automated meeting provisioning configured under Calendar & Links' },
                   { name: 'SendGrid / WhatsApp API Engine', status: 'Connected', desc: 'Triggers email/SMS alerts for essay feedback' },
                   { name: 'AI Quality Assistant (OpenAI)', status: 'Connected', desc: 'Powers live essay grammar & tone check' }
                 ].map((api, idx) => (
                   <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                     <div>
                       <div className="font-semibold text-slate-900 flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                         {api.name}
                       </div>
                       <p className="text-xs text-slate-500 mt-1">{api.desc}</p>
                     </div>
                   </div>
                 ))}
               </div>
               <div className="flex gap-3 pt-4 border-t border-slate-100">
                 <Button onClick={() => addAuditLog('Regenerated API Keys')} variant="outline" className="bg-white flex-1 hover:bg-slate-50">
                   <RefreshCw className="w-4 h-4 mr-2 text-slate-500" /> Regenerate API Keys
                 </Button>
                 <Button onClick={() => addAuditLog('Configured Webhooks')} variant="outline" className="bg-white flex-1 hover:bg-slate-50">
                   <Code className="w-4 h-4 mr-2 text-slate-500" /> Configure Webhooks
                 </Button>
               </div>
             </CardContent>
           </Card>

           <Card className="border-slate-200 shadow-sm">
             <CardHeader className="bg-slate-50 border-b border-slate-200">
               <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900">System Configuration & Environment</CardTitle>
             </CardHeader>
             <CardContent className="p-6 space-y-6">
               <div className="space-y-6">
                 <div className="flex justify-between items-center">
                   <div>
                     <div className="font-semibold text-slate-900">Environment Mode</div>
                     <div className="text-xs text-slate-500 mt-0.5">Toggle between live and test databases</div>
                   </div>
                   <select value={envMode} onChange={e => { setEnvMode(e.target.value); addAuditLog(`Environment set to ${e.target.value}`); }} className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                     <option>Production (Live)</option>
                     <option>Staging (Testing)</option>
                   </select>
                 </div>
                 
                 <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                   <div>
                     <div className="font-semibold text-slate-900">Maintenance Mode</div>
                     <div className="text-xs text-slate-500 mt-0.5">Lock Student Portal for updates</div>
                   </div>
                   <button 
                     onClick={() => { setMaintenanceMode(!maintenanceMode); addAuditLog(`${!maintenanceMode ? 'Enabled' : 'Disabled'} Maintenance Mode`); }}
                     className={cn("w-12 h-6 rounded-full relative transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500", maintenanceMode ? "bg-red-500" : "bg-slate-200")}
                   >
                     <span className={cn("absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200", maintenanceMode ? "translate-x-6" : "")}></span>
                   </button>
                 </div>

                 <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                   <div>
                     <div className="font-semibold text-slate-900">Global Upload Limit</div>
                   </div>
                   <select value={uploadLimit} onChange={(e) => { setUploadLimit(e.target.value); addAuditLog(`Updated Upload Limit to ${e.target.value}`); }} className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                     <option>Max File Size: 25 MB</option>
                     <option>Max File Size: 50 MB</option>
                   </select>
                 </div>

                 <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                   <div>
                     <div className="font-semibold text-slate-900">Session Timeout Limit</div>
                   </div>
                   <select value={sessionLimit} onChange={(e) => { setSessionLimit(e.target.value); addAuditLog(`Updated Session Timeout to ${e.target.value}`); }} className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                     <option>Auto-logout after 60 Mins</option>
                     <option>Auto-logout after 120 Mins</option>
                   </select>
                 </div>
               </div>
             </CardContent>
           </Card>

            {/* BRAND ASSETS & OFFICIAL FAVICON CARD */}
            <Card className="border-slate-200 shadow-sm md:col-span-2">
              <CardHeader className="bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900">Official Brand Assets & Favicon</CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">Download the official application favicon and branding mark in crisp high-resolution pixel formats and vector SVG.</p>
                </div>
                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-md border border-indigo-200">
                  Active in Browser
                </span>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center gap-8 bg-slate-50/60 p-6 rounded-2xl border border-slate-200">
                  <div className="flex flex-col items-center">
                    <div className="w-28 h-28 rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-blue-600 p-1 shadow-xl flex items-center justify-center border-4 border-white">
                      <img src="/favicon.svg" alt="App Favicon" className="w-20 h-20 drop-shadow-md" />
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 mt-2">favicon.svg (512×512)</span>
                  </div>

                  <div className="flex-1 space-y-3 text-center md:text-left">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">Always Look Up • Graduation Cap Emblem</h4>
                      <p className="text-xs text-slate-600 mt-1 max-w-xl">
                        The official favicon geometry features the white mortarboard graduation cap on a royal indigo-to-blue gradient squircle with top-light highlight and soft depth shadow.
                      </p>
                    </div>

                    <div className="pt-2 flex flex-wrap gap-2.5 justify-center md:justify-start">
                      <Button
                        size="sm"
                        onClick={() => handleDownloadFavicon(512, 'png')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Download 512×512 PNG
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadFavicon(256, 'png')}
                        className="border-slate-300 bg-white hover:bg-slate-50 font-bold text-xs text-slate-700"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" /> 256×256 PNG
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadFavicon(64, 'png')}
                        className="border-slate-300 bg-white hover:bg-slate-50 font-bold text-xs text-slate-700"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" /> 64×64 PNG
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadFavicon(512, 'svg')}
                        className="border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/60 font-bold text-xs text-indigo-700"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Vector SVG
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
        </div>
      )}

      {activeTab === 'audit' && (
        <Card className="border-slate-200 shadow-sm">
          <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
             <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Global System Audit Logs</h3>
             <Button variant="outline" size="sm" className="bg-white">
               Export Logs (CSV)
             </Button>
          </div>
          <div className="p-0">
            <table className="w-full text-left text-sm whitespace-nowrap">
               <thead className="bg-white border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                 <tr>
                   <th className="px-6 py-4">Timestamp</th>
                   <th className="px-6 py-4">Executed By</th>
                   <th className="px-6 py-4">Action Event</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 bg-white">
                 {auditLogs.map(log => (
                   <tr key={log.id} className="hover:bg-slate-50">
                     <td className="px-6 py-4 text-xs font-medium text-slate-500">{log.date}</td>
                     <td className="px-6 py-4 font-semibold text-slate-900">{log.user} <span className="font-normal text-slate-500">({log.role})</span></td>
                     <td className="px-6 py-4 text-slate-700">{log.action}</td>
                   </tr>
                 ))}
               </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add / Edit Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-sm">{isEditMode ? 'Edit Team Member' : 'Add New Team Member'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Power className="w-4 h-4 rotate-45" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input value={formName} onChange={e => setFormName(e.target.value)} type="text" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input value={formEmail} onChange={e => setFormEmail(e.target.value)} type="email" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                {isAdmin && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Password (Admin Only)</label>
                    <input value={formPassword} onChange={e => setFormPassword(e.target.value)} type="text" placeholder="Auto-generate if empty" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4" />
                  </div>
                )}
                <label className="block text-xs font-bold text-slate-700 mb-1">Role Assignment</label>
                <select value={formRole} onChange={e => {
                  setFormRole(e.target.value);
                  if (e.target.value === 'CATEGORY_MANAGER' || e.target.value === 'SYSTEM_ADMIN' || e.target.value === 'OPERATIONS_LEAD') {
                    setFormScope('Global Scope');
                  }
                }} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4">
                  <option value="">Select Role</option>
                  {roles.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                </select>

                <label className="block text-xs font-bold text-slate-700 mb-1">Student Access Scope</label>
                <select value={formScope} onChange={e => setFormScope(e.target.value as any)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="Global Scope">Global Scope (Access All Students Across All Counselors/Mentors)</option>
                  <option value="Assigned Scope">Assigned Scope (Access Only Explicitly Assigned Students)</option>
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)} className="bg-white">Cancel</Button>
              <Button onClick={saveStaff} className="bg-indigo-600 hover:bg-indigo-700 text-white">Save Member</Button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Students Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-sm">Assign Students</h3>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Power className="w-4 h-4 rotate-45" />
              </button>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
               <div className="space-y-2">
                  {students.map(student => (
                    <div key={student.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-colors cursor-pointer" onClick={() => toggleStudentAssignment(student.id)}>
                      <input 
                        type="checkbox" 
                        checked={assignedStudentIds.includes(student.id)} 
                        onChange={() => toggleStudentAssignment(student.id)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer" 
                      />
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">{student.name}</div>
                        <div className="text-xs text-slate-500">{student.email}</div>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAssignModalOpen(false)} className="bg-white">Cancel</Button>
              <Button onClick={saveAssignments} className="bg-indigo-600 hover:bg-indigo-700 text-white">Save Assignments</Button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Change Password Modal in Team Settings */}
      {isAdmin && userForPasswordChange && (
        <ChangeUserPasswordModal
          isOpen={Boolean(userForPasswordChange)}
          onClose={() => setUserForPasswordChange(null)}
          targetUser={userForPasswordChange}
          onSavePassword={handleSaveUserPassword}
        />
      )}
    </div>
  );
}
