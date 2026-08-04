import { StaffMember, Student } from '@/types';

/**
 * Determines whether a staff member has global/unrestricted access to all students in the database.
 * Admin roles (SYSTEM_ADMIN, OPERATIONS_LEAD, DEVELOPER) or staff with students === 'All' have global access.
 */
export function canStaffAccessAllStudents(currentUser?: StaffMember | null): boolean {
  if (!currentUser) return false;
  const roleUpper = (currentUser.role || '').toUpperCase();
  if (roleUpper === 'SYSTEM_ADMIN' || roleUpper === 'OPERATIONS_LEAD' || roleUpper === 'DEVELOPER') {
    return true;
  }
  if (currentUser.students === 'All' || currentUser.students === 'ALL') {
    return true;
  }
  return false;
}

/**
 * Checks if a specific student is assigned to the staff member.
 */
export function isStudentAssignedToStaff(student: Student, currentUser?: StaffMember | null): boolean {
  if (!currentUser) return false;
  
  // If staff has global access, return true
  if (canStaffAccessAllStudents(currentUser)) {
    return true;
  }

  const staffName = (currentUser.name || '').trim().toLowerCase();
  const staffEmail = (currentUser.email || '').trim().toLowerCase();
  const staffId = (currentUser.id || '').trim().toLowerCase();

  const counselorName = (student.counselor || '').trim().toLowerCase();
  const researchMentor = (student.researchMentor || '').trim().toLowerCase();
  const satVerbalMentor = (student.satVerbalMentor || '').trim().toLowerCase();
  const satMathMentor = (student.satMathMentor || '').trim().toLowerCase();

  // Check if student's counselor or mentor fields match the staff member's name, email, or ID
  const matchesName = (val: string) => {
    if (!val) return false;
    return val === staffName || val === staffEmail || val === staffId;
  };

  if (matchesName(counselorName)) return true;
  if (matchesName(researchMentor)) return true;
  if (matchesName(satVerbalMentor)) return true;
  if (matchesName(satMathMentor)) return true;

  return false;
}

/**
 * Filters a list of students based on the staff member's access scope.
 */
export function getScopedStudentsForStaff(students: Student[], currentUser?: StaffMember | null): Student[] {
  if (!currentUser) return students;
  if (canStaffAccessAllStudents(currentUser)) return students;
  return students.filter(student => isStudentAssignedToStaff(student, currentUser));
}
