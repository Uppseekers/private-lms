import assert from 'node:assert/strict';

export interface DirtyDozenCase {
  id: string;
  description: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_PAYLOADS: DirtyDozenCase[] = [
  {
    id: 'P1',
    description: 'Unauthenticated read on /students/STU-101',
    collection: 'students',
    operation: 'get',
    auth: null,
    payload: {},
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'P2',
    description: 'Malformed empty email spoof on /students/STU-101',
    collection: 'students',
    operation: 'get',
    auth: { uid: 'spoof-uid', email: '', email_verified: false },
    payload: {},
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'P3',
    description: 'Plaintext password injection into /students',
    collection: 'students',
    operation: 'create',
    auth: { uid: 'admin-uid', email: 'uppseekers@gmail.com', email_verified: true },
    payload: { id: 'STU-999', name: 'Test Student', email: 'test@uppseekers.com', password: 'SecretPassword123' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'P4',
    description: 'Non-admin counsellor reading /admin_student_credentials vault',
    collection: 'admin_student_credentials',
    operation: 'get',
    auth: { uid: 'staff-uid-1', email: 'sarah@uppseekers.com', email_verified: true },
    payload: { id: 'aarav_uppseekers_com' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'P5',
    description: 'Path ID mismatch / poisoning',
    collection: 'students',
    operation: 'create',
    auth: { uid: 'admin-uid', email: 'uppseekers@gmail.com', email_verified: true },
    payload: { id: 'STU-MISMATCH', name: 'Poison User', email: 'poison@uppseekers.com' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'P6',
    description: 'Oversized string payload Denial-of-Wallet check',
    collection: 'launchpad_releases',
    operation: 'create',
    auth: { uid: 'admin-uid', email: 'uppseekers@gmail.com', email_verified: true },
    payload: {
      id: 'STU-101__comm',
      studentId: 'STU-101',
      subjectId: 'comm',
      isUnlocked: true,
      unlockedBy: 'X'.repeat(5000),
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'P7',
    description: 'Student attempting to add or delete a university in own shortlist',
    collection: 'students',
    operation: 'update',
    auth: { uid: 'stu-uid-1', email: 'aarav@uppseekers.com', email_verified: true },
    payload: {
      id: 'STU-101',
      name: 'Aarav',
      email: 'aarav@uppseekers.com',
      shortlist: [],
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'P8',
    description: 'Student reading another student PII document',
    collection: 'students',
    operation: 'get',
    auth: { uid: 'stu-uid-1', email: 'aarav@uppseekers.com', email_verified: true },
    payload: { targetEmail: 'ananya@uppseekers.com' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'P9',
    description: 'Student listing all students unbounded',
    collection: 'students',
    operation: 'list',
    auth: { uid: 'stu-uid-1', email: 'aarav@uppseekers.com', email_verified: true },
    payload: {},
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'P10',
    description: 'Student modifying counselor/readiness on own student document',
    collection: 'students',
    operation: 'update',
    auth: { uid: 'stu-uid-1', email: 'aarav@uppseekers.com', email_verified: true },
    payload: { readiness: 100, counselor: 'Bypassed' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'P11',
    description: 'Counsellor reading another counsellor Zoho sealed vault',
    collection: 'staff_zoho_vault',
    operation: 'get',
    auth: { uid: 'staff-uid-1', email: 'sarah@uppseekers.com', email_verified: true },
    payload: { targetKey: 'david_uppseekers_com' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'P12',
    description: 'Non-admin counselor promoting self to SYSTEM_ADMIN in /admins',
    collection: 'admins',
    operation: 'create',
    auth: { uid: 'staff-uid-1', email: 'sarah@uppseekers.com', email_verified: true },
    payload: { uid: 'staff-uid-1', email: 'sarah@uppseekers.com', role: 'SYSTEM_ADMIN' },
    expectedResult: 'PERMISSION_DENIED',
  },
];

export function verifyDirtyDozenSpec(): void {
  assert.equal(DIRTY_DOZEN_PAYLOADS.length, 12);
  for (const testCase of DIRTY_DOZEN_PAYLOADS) {
    assert.equal(testCase.expectedResult, 'PERMISSION_DENIED');
    assert.equal(
      'password' in (testCase.collection === 'students' && testCase.id === 'P3' ? testCase.payload : {}),
      testCase.id === 'P3'
    );
  }
}
