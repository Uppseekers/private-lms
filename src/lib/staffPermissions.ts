import { StaffMember, Student } from '@/types';

/**
 * Checks if the current staff member has administrative privileges.
 * System Admins, Operations Leads, Developers, or the primary admin email have admin access.
 */
export function isUserAdmin(currentUser?: StaffMember | null): boolean {
  if (!currentUser) return false;
  const roleUpper = (currentUser.role || '').trim().toUpperCase();
  const emailLower = (currentUser.email || '').trim().toLowerCase();
  return (
    roleUpper === 'SYSTEM_ADMIN' ||
    roleUpper === 'ADMIN' ||
    roleUpper === 'OPERATIONS_LEAD' ||
    roleUpper === 'DEVELOPER' ||
    roleUpper === 'SUPER_ADMIN' ||
    emailLower === 'uppseekers@gmail.com'
  );
}

/**
 * Determines whether a staff member has global/unrestricted access to all students in the database.
 * Evaluates:
 * 1. Administrator roles (SYSTEM_ADMIN, OPERATIONS_LEAD, DEVELOPER, ADMIN)
 * 2. Explicit students scope string ('All', 'ALL', 'Global', 'Global Scope', 'All Students')
 * 3. Category Manager role or roles granted 'Global Scope' in permissions matrix
 * 4. Stored permissions matrix in localStorage for the role
 */
export function canStaffAccessAllStudents(
  currentUser?: StaffMember | null,
  permissionsMatrix?: Record<string, any[]>
): boolean {
  if (!currentUser) return false;
  if (isUserAdmin(currentUser)) return true;

  // 1. Check explicit staff member students scope field
  const studentsScope = (currentUser.students || '').trim().toLowerCase();
  if (
    studentsScope === 'all' ||
    studentsScope === 'global' ||
    studentsScope === 'global scope' ||
    studentsScope.includes('all') ||
    studentsScope.includes('global')
  ) {
    return true;
  }

  // 2. Check role-level global scope (e.g. CATEGORY_MANAGER)
  const roleUpper = (currentUser.role || '').trim().toUpperCase();
  if (roleUpper === 'CATEGORY_MANAGER' || roleUpper === 'CATEGORY MANAGER') {
    return true;
  }

  // 3. Check passed permissions matrix
  if (permissionsMatrix && permissionsMatrix[currentUser.role]) {
    const roleCategories = permissionsMatrix[currentUser.role];
    for (const cat of roleCategories) {
      if (cat.items && Array.isArray(cat.items)) {
        for (const item of cat.items) {
          if (item.enabled && item.scope && item.scope.toLowerCase().includes('global')) {
            return true;
          }
        }
      }
    }
  }

  // 4. Fallback check localStorage permissions matrix if available in browser context
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = localStorage.getItem('uppseekers_permissions_v2');
      if (saved) {
        const matrix = JSON.parse(saved);
        const roleCats = matrix[currentUser.role] || matrix[roleUpper];
        if (roleCats && Array.isArray(roleCats)) {
          for (const cat of roleCats) {
            if (cat.items && Array.isArray(cat.items)) {
              for (const item of cat.items) {
                if (item.enabled && item.scope && item.scope.toLowerCase().includes('global')) {
                  return true;
                }
              }
            }
          }
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  return false;
}

/**
 * Checks if a specific student is assigned to the staff member.
 */
export function isStudentAssignedToStaff(
  student: Student,
  currentUser?: StaffMember | null,
  permissionsMatrix?: Record<string, any[]>
): boolean {
  if (!currentUser) return false;
  
  // If staff has global access, return true
  if (canStaffAccessAllStudents(currentUser, permissionsMatrix)) {
    return true;
  }

  const staffName = (currentUser.name || '').trim().toLowerCase();
  const staffEmail = (currentUser.email || '').trim().toLowerCase();
  const staffId = (currentUser.id || '').trim().toLowerCase();

  const counselorName = (student.counselor || '').trim().toLowerCase();
  const researchMentor = (student.researchMentor || '').trim().toLowerCase();
  const satVerbalMentor = (student.satVerbalMentor || '').trim().toLowerCase();
  const satMathMentor = (student.satMathMentor || '').trim().toLowerCase();
  const anyMentor = ((student as any).mentor || '').trim().toLowerCase();
  const anyCounsellor = ((student as any).counsellor || '').trim().toLowerCase();

  // Helper for matching values against staff credentials
  const matchesStaff = (val: string) => {
    if (!val) return false;
    const cleanVal = val.toLowerCase();
    return (
      cleanVal === staffName ||
      cleanVal === staffEmail ||
      cleanVal === staffId ||
      (staffName.length > 2 && cleanVal.includes(staffName)) ||
      (cleanVal.length > 2 && staffName.includes(cleanVal))
    );
  };

  if (matchesStaff(counselorName)) return true;
  if (matchesStaff(researchMentor)) return true;
  if (matchesStaff(satVerbalMentor)) return true;
  if (matchesStaff(satMathMentor)) return true;
  if (matchesStaff(anyMentor)) return true;
  if (matchesStaff(anyCounsellor)) return true;

  return false;
}

/**
 * Filters a list of students based on the staff member's access scope.
 */
export function getScopedStudentsForStaff(
  students: Student[],
  currentUser?: StaffMember | null,
  permissionsMatrix?: Record<string, any[]>
): Student[] {
  if (!currentUser) return students;
  if (canStaffAccessAllStudents(currentUser, permissionsMatrix)) return students;
  return students.filter(student => isStudentAssignedToStaff(student, currentUser, permissionsMatrix));
}

