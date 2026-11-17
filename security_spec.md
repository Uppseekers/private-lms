# Uppseekers Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Email-Verified Zero-Trust Identity**: No unauthenticated or unverified (`email_verified == false`) session may read or mutate any domain collection.
2. **No Plaintext Portal Passwords**: Neither `students` nor `staff` documents may accept or store a `password` key (`!('password' in data)`).
3. **Immutable Ownership & Identifiers**: Path ID (`{studentId}`, `{releaseId}`, etc.) must equal the document's `id`/`studentId` field, match `^[a-zA-Z0-9_-]+$` (`<= 128` chars), and cannot be reassigned on update.
4. **Staff vs Student Segregation**: Only `isAdmin()` or `isActiveStaff()` (verified via `/admins/{uid}` or `/staff_directory/{emailKey}`) may unlock Launchpad subjects (`launchpad_releases`), enroll students (`launchpad_enrollments`), or manage schedules (`events`, `batches`). Students may only update their own submissions (`tasks`, `essays`, `documents`, `launchpad_progress`, `launchpad_certifications`, `assignment_evaluations` with status `Submitted`, or `notifications.isRead`).
5. **Query Enforcer (Pillar 8)**: Every `allow list` rule evaluates `resource.data` directly (zero `get()` or `exists()` lookups in `allow list`), preventing O(n) read amplification and unauthorized cross-student scraping.
6. **Anti-Update-Gap**: Every `allow update` calls `isValid[Entity](incoming())` first and explicitly restricts mutable fields with `incoming().diff(existing()).affectedKeys().hasOnly(...)` on non-admin paths.

## 2. The "Dirty Dozen" Payloads (Expected: `PERMISSION_DENIED`)
1. **P1 (Unauthenticated Read)**: `get(/students/STU-101)` with `request.auth == null`.
2. **P2 (Unverified Email Spoof)**: `get(/students/STU-101)` where `request.auth.token.email == 'uppseekers@gmail.com'` and `email_verified == false`.
3. **P3 (Plaintext Password Injection)**: `create(/students/STU-999)` including `password: 'Student@123'`.
4. **P4 (Ghost Field / Shadow Create)**: `create(/launchpad_releases/STU-101__sub1)` containing an undeclared `isAdminOverride: true` key.
5. **P5 (Path ID Poisoning)**: `create(/students/STU-101)` with mismatched `id: 'STU-999'` or invalid chars `'STU/../../admin'`.
6. **P6 (Oversized String Denial-of-Wallet)**: `create(/launchpad_releases/STU-101__sub1)` with 20KB `unlockedBy` string exceeding `160` char max.
7. **P7 (Student Self-Unlock Escalation)**: Verified student (`email == 'aarav@uppseekers.com'`) calling `set(/launchpad_releases/STU-101__sub1, { isUnlocked: true })`.
8. **P8 (Cross-Student PII Read)**: Verified Student A (`studentA@uppseekers.com`) calling `get(/students/STU-102)` where `email == 'studentB@uppseekers.com'`.
9. **P9 (Unbounded Query Scraping)**: Verified Student A running `list(/students)` without matching `email == studentA@uppseekers.com`.
10. **P10 (Student Privilege Escalation on Self-Doc)**: Verified student updating `/students/STU-101` with `counselor: 'Self'` or `readiness: 100`.
11. **P11 (Student Self-Approving Evaluation)**: Verified student updating `/assignment_evaluations/STU-101__sub1__w1` with `status: 'Approved'` instead of `'Submitted'`.
12. **P12 (Staff Self-Promotion to Admin)**: Active counselor creating `/admins/{counselorUid}` or updating `/staff/STAFF-1` with `role: 'SYSTEM_ADMIN'`.
