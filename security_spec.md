# Uppseekers Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Email-Verified Zero-Trust Identity**: No unauthenticated or unverified session may read or mutate any domain collection.
2. **Split-Collection Password Isolation (Pillar 6)**: Neither `students` nor `staff` documents may accept or store a top-level `password` key (`!('password' in data)`). Student portal passwords live strictly inside `/admin_student_credentials/{credId}`, readable and writable exclusively by `isAdmin()` (System Admin), completely isolated from counsellors and students.
3. **Immutable Ownership & Identifiers**: Path ID (`{studentId}`, `{credId}`, `{emailKey}`, etc.) must equal the document's `id`/`studentId` field, match `^[a-zA-Z0-9_-]+$` (`<= 128` chars), and cannot be reassigned on update.
4. **Counsellor-Managed Shortlists & Mentor Scope**: Active counsellors and mentors (`counselor`, `counsellor`, `mentor`, `universityMentor`, `researchMentor`, `satMathMentor`, `satVerbalMentor`) may read and update their assigned students' `shortlist`, `activities`, and `operationalLogs`. Students may never add or remove universities from `shortlist` (`incoming().shortlist.size() == existing().shortlist.size()`) and may never modify `counselor`, `readiness`, or RBAC fields.
5. **Per-Counsellor Sealed Zoho OAuth Vault**: `/staff_zoho_vault/{emailKey}` stores AES-256-GCM server-sealed Zoho tokens (`sealedVault`) accessible only to the owning active staff member (`emailKey == authEmailKey() && staffEmail == authEmailLower()`) or `isAdmin()`.
6. **Query Enforcer (Pillar 8)**: Every `allow list` rule evaluates `resource.data` directly, preventing unauthorized cross-student or cross-staff scraping.
7. **Anti-Update-Gap**: Every `allow update` calls `isValid[Entity](incoming())` first and explicitly restricts mutable fields with `incoming().diff(existing()).affectedKeys().hasOnly(...)` on non-admin paths.

## 2. The "Dirty Dozen" Payloads (Expected: `PERMISSION_DENIED`)
1. **P1 (Unauthenticated Read)**: `get(/students/STU-101)` with `request.auth == null`.
2. **P2 (Missing Email Token Spoof)**: `get(/students/STU-101)` where `request.auth.token` has no valid `email`.
3. **P3 (Plaintext Password Injection on Student Profile)**: `create(/students/STU-999)` including `password: 'Student@123'`.
4. **P4 (Counsellor Reading Admin Student Credentials Vault)**: Active counsellor (`sarah@uppseekers.com`) calling `get(/admin_student_credentials/aarav_uppseekers_com)`.
5. **P5 (Path ID Poisoning)**: `create(/students/STU-101)` with mismatched `id: 'STU-999'` or invalid chars `'STU/../../admin'`.
6. **P6 (Oversized String Denial-of-Wallet)**: `create(/launchpad_releases/STU-101__sub1)` with 20KB `unlockedBy` string exceeding `160` char max.
7. **P7 (Student Self-Adding or Removing University Shortlist)**: Verified student (`aarav@uppseekers.com`) calling `update(/students/STU-101)` changing `shortlist.size()`.
8. **P8 (Cross-Student PII Read)**: Verified Student A (`studentA@uppseekers.com`) calling `get(/students/STU-102)` where `email == 'studentB@uppseekers.com'`.
9. **P9 (Unbounded Query Scraping)**: Verified Student A running `list(/students)` without matching `email == studentA@uppseekers.com`.
10. **P10 (Student Privilege Escalation on Self-Doc)**: Verified student updating `/students/STU-101` with `counselor: 'Self'` or `readiness: 100`.
11. **P11 (Cross-Counsellor Zoho Vault Read/Write)**: Counsellor A (`sarah@uppseekers.com`) calling `get(/staff_zoho_vault/david_uppseekers_com)`.
12. **P12 (Staff Self-Promotion to Admin)**: Active counselor creating `/admins/{counselorUid}` or updating `/staff/STAFF-1` with `role: 'SYSTEM_ADMIN'`.
