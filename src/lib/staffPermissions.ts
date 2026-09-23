import { StaffMember, Student } from '@/types';

/**
 * Checks if the current staff member has administrative or oversight privileges.
 * System Admins, Operations Leads, Developers, Category Managers, or the primary admin email have admin access.
 */
export function isUserAdmin(currentUser?: StaffMember | null): boolean {
  if (!currentUser) return false;
  const roleUpper = (currentUser.role || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  const emailLower = (currentUser.email || '').trim().toLowerCase();
  return (
    roleUpper === 'SYSTEM_ADMIN' ||
    roleUpper === 'ADMIN' ||
    roleUpper === 'OPERATIONS_LEAD' ||
    roleUpper === 'DEVELOPER' ||
    roleUpper === 'SUPER_ADMIN' ||
    roleUpper === 'CATEGORY_MANAGER' ||
    roleUpper.includes('CATEGORY') ||
    emailLower === 'uppseekers@gmail.com'
  );
}

/**
 * Determines whether a staff member has global/unrestricted access to all students in the database.
 * Evaluates:
 * 1. Administrator roles (SYSTEM_ADMIN, OPERATIONS_LEAD, DEVELOPER, ADMIN, CATEGORY_MANAGER)
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
  const explicitScope = ((currentUser as any).scope || '').trim().toLowerCase();
  if (
    studentsScope === 'all' ||
    studentsScope === 'global' ||
    studentsScope === 'global scope' ||
    studentsScope.includes('all') ||
    studentsScope.includes('global') ||
    explicitScope.includes('all') ||
    explicitScope.includes('global')
  ) {
    return true;
  }

  // 2. Check role-level global scope (e.g. CATEGORY_MANAGER)
  const roleUpper = (currentUser.role || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (
    roleUpper === 'CATEGORY_MANAGER' ||
    roleUpper === 'CATEGORY_LEAD' ||
    roleUpper.includes('CATEGORY') ||
    roleUpper === 'ACADEMIC_DIRECTOR' ||
    roleUpper === 'HEAD_COUNSELOR'
  ) {
    return true;
  }

  // 3. Check passed permissions matrix
  if (permissionsMatrix) {
    const roleCategories = permissionsMatrix[currentUser.role] || permissionsMatrix[roleUpper];
    if (roleCategories && Array.isArray(roleCategories)) {
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
  const anyCounselorId = ((student as any).counselorId || '').trim().toLowerCase();
  const anyMentorId = ((student as any).mentorId || '').trim().toLowerCase();
  const rawMentorsList = (student as any).mentors;

  // Helper for matching values against staff credentials
  const matchesStaff = (val: string) => {
    if (!val) return false;
    const cleanVal = val.toLowerCase().trim();
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
  if (matchesStaff(anyCounselorId)) return true;
  if (matchesStaff(anyMentorId)) return true;

  if (Array.isArray(rawMentorsList)) {
    if (rawMentorsList.some((m: any) => typeof m === 'string' && matchesStaff(m))) return true;
  }

  // Check if student is assigned to staff member via batches
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const savedBatches = localStorage.getItem('uppseekers_batches_v2');
      if (savedBatches) {
        const batches = JSON.parse(savedBatches);
        if (Array.isArray(batches)) {
          for (const b of batches) {
            const hasMentor = Array.isArray(b.mentors) && b.mentors.some((m: string) => matchesStaff(m));
            const hasStudent = Array.isArray(b.students) && b.students.some((sid: string) => sid === student.id);
            if (hasMentor && hasStudent) {
              return true;
            }
          }
        }
      }
    } catch (e) {
      // Ignore batch read errors
    }
  }

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

/**
 * Determines whether a student is allowed to view an event in their schedule or dashboard.
 * Strict Requirements:
 * - Students must ONLY see sessions they have been explicitly added to by the counselor.
 * - In batches case, ONLY assigned/enrolled students in that batch will get these sessions in their schedule.
 * - Different students MUST NEVER see scheduled sessions of other students under any circumstances.
 */
export function canStudentAccessEvent(
  event: any,
  student?: any | null,
  batches: any[] = []
): boolean {
  if (!student || !event) return false;

  const studentId = (student.id || '').trim().toLowerCase();
  const studentName = (student.name || '').trim().toLowerCase();
  const studentEmail = (student.email || '').trim().toLowerCase();

  if (!studentId && !studentName && !studentEmail) {
    return false;
  }

  // 1. Batch Case:
  // Identify if this event is for a cohort batch (via event.batch OR if event.students matches a batch name)
  const matchingBatch = batches.find(b => {
    if (!b) return false;
    const bId = (b.id || '').trim().toLowerCase();
    const bName = (b.name || '').trim().toLowerCase();
    if (event.batch) {
      const eBatch = String(event.batch).trim().toLowerCase();
      if (eBatch === bId || eBatch === bName) return true;
    }
    if (typeof event.students === 'string' && event.students.trim()) {
      const eStudents = event.students.trim().toLowerCase();
      if (eStudents === bName || eStudents === bId) return true;
    }
    return false;
  });

  if (matchingBatch) {
    // In batches case, ONLY assigned students in that batch will get these sessions at their schedules
    if (!Array.isArray(matchingBatch.students) || matchingBatch.students.length === 0) {
      return false;
    }
    return matchingBatch.students.some((sidOrName: string) => {
      if (!sidOrName) return false;
      const clean = String(sidOrName).trim().toLowerCase();
      return (
        (studentId && clean === studentId) ||
        (studentName && clean === studentName) ||
        (studentEmail && clean === studentEmail)
      );
    });
  }

  // 2. Individual Sessions:
  // Must ONLY be visible to the specific student added by the counselor for the session

  // Case 2A: Explicit foreign studentId check
  if (event.studentId) {
    const eStudentId = String(event.studentId).trim().toLowerCase();
    if (studentId && eStudentId === studentId) return true;
    // If the event has a specific studentId that does NOT match this student, it belongs to another student
    return false;
  }

  // Case 2B: studentIds array
  if (Array.isArray(event.studentIds) && event.studentIds.length > 0) {
    const inIds = event.studentIds.some((sid: string) => {
      const clean = String(sid).trim().toLowerCase();
      return (studentId && clean === studentId) || (studentName && clean === studentName);
    });
    if (inIds) return true;
    return false; // Explicit studentIds list without this student
  }

  // Case 2C: Attendees array match
  if (Array.isArray(event.attendees) && event.attendees.length > 0) {
    const isAttending = event.attendees.some((att: any) => {
      if (typeof att === 'string') {
        const clean = att.trim().toLowerCase();
        return (
          (studentId && clean === studentId) ||
          (studentName && clean === studentName) ||
          (studentEmail && clean === studentEmail)
        );
      }
      if (att && typeof att === 'object') {
        const attId = (att.id || '').trim().toLowerCase();
        const attEmail = (att.email || '').trim().toLowerCase();
        const attName = (att.name || '').trim().toLowerCase();
        return (
          (studentId && attId === studentId) ||
          (studentEmail && attEmail === studentEmail) ||
          (studentName && attName === studentName)
        );
      }
      return false;
    });
    if (isAttending) return true;
    return false;
  }

  // Case 2D: Check 'students' string field (when counselor typed or selected the student name)
  if (typeof event.students === 'string' && event.students.trim()) {
    const studentsStr = event.students.trim().toLowerCase();
    
    // Disallow generic or placeholder labels (which would over-expose to other students)
    const genericPlaceholders = [
      'all', 
      'all students', 
      'all assigned students', 
      '15 students', 
      'batch cohort',
      'batch',
      'general',
      'open session',
      'tbd'
    ];
    if (genericPlaceholders.includes(studentsStr)) {
      return false;
    }

    // Tokenize names
    const tokens = studentsStr
      .split(/[,;&+]|\band\b/i)
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    const matchesCurrent = tokens.some(token => {
      return (
        (studentName && (token === studentName || token.startsWith(studentName + ' ') || token.includes(`(${studentId})`))) ||
        (studentId && (token === studentId || token.includes(studentId))) ||
        (studentEmail && token === studentEmail)
      );
    });

    if (matchesCurrent) return true;
    return false;
  }

  return false;
}

/**
 * Determines whether a staff member has access to view, manage, or join a scheduled session.
 * Requirements:
 * - Only team (admin / global management), assigned counselor, and respective student-mentor
 *   should have access and meet details in their schedule.
 * - In batches case, assigned mentors of the batch have access to their batch's sessions and meet details.
 * - Other staff members do not have access to sessions of students they do not mentor or counsel.
 */
export function canStaffAccessEvent(
  event: any,
  currentUser: StaffMember | null,
  students: Student[] = [],
  batches: any[] = [],
  permissionsMatrix?: Record<string, any[]>
): boolean {
  if (!currentUser || !event) return false;

  // 1. Team administrators and global management have full access to all schedules and meet details
  if (isUserAdmin(currentUser) || canStaffAccessAllStudents(currentUser, permissionsMatrix)) {
    return true;
  }

  const staffName = (currentUser.name || '').trim().toLowerCase();
  const staffEmail = (currentUser.email || '').trim().toLowerCase();
  const staffId = (currentUser.id || '').trim().toLowerCase();

  const matchesStaff = (val?: string) => {
    if (!val) return false;
    const clean = val.toLowerCase().trim();
    return (
      clean === staffName ||
      clean === staffEmail ||
      clean === staffId ||
      (staffName.length > 2 && clean === staffName) ||
      (staffName.length > 2 && clean.includes(staffName)) ||
      (clean.length > 2 && staffName.includes(clean))
    );
  };

  // 2. Event Host, Organiser, or Assigned By
  if (matchesStaff(event.host) || matchesStaff(event.organiser) || matchesStaff(event.assignedBy)) {
    return true;
  }

  // 3. Attendees array match
  if (Array.isArray(event.attendees) && event.attendees.length > 0) {
    const isAttending = event.attendees.some((att: any) => {
      if (typeof att === 'string') return matchesStaff(att);
      if (att && typeof att === 'object') {
        return matchesStaff(att.id) || matchesStaff(att.name) || matchesStaff(att.email);
      }
      return false;
    });
    if (isAttending) return true;
  }

  // 4. Batch Session Access:
  // If the event belongs to a batch, ONLY mentors assigned to that batch (or team admin) have access
  const matchingBatch = batches.find(b => {
    if (!b) return false;
    const bId = (b.id || '').trim().toLowerCase();
    const bName = (b.name || '').trim().toLowerCase();
    if (event.batch) {
      const eBatch = String(event.batch).trim().toLowerCase();
      if (eBatch === bId || eBatch === bName) return true;
    }
    if (typeof event.students === 'string' && event.students.trim()) {
      const eStudents = event.students.trim().toLowerCase();
      if (eStudents === bName || eStudents === bId) return true;
    }
    return false;
  });

  if (matchingBatch) {
    if (Array.isArray(matchingBatch.mentors) && matchingBatch.mentors.some((m: string) => matchesStaff(m))) {
      return true;
    }
    // If it's a batch session and current staff is NOT an assigned mentor for this batch, do not grant access
    return false;
  }

  // 5. Individual Student Session Access:
  // ONLY the assigned counselor and respective student-mentor have access to the session & meet details
  let targetStudent: Student | undefined;
  if (event.studentId) {
    targetStudent = students.find(s => s.id === event.studentId);
  }
  if (!targetStudent && typeof event.students === 'string' && event.students.trim()) {
    const studentsField = event.students.trim().toLowerCase();
    targetStudent = students.find(s => {
      if (!s.name) return false;
      const sName = s.name.toLowerCase();
      return studentsField === sName || studentsField.includes(sName);
    });
  }

  if (targetStudent) {
    return isStudentAssignedToStaff(targetStudent, currentUser, permissionsMatrix);
  }

  return false;
}


