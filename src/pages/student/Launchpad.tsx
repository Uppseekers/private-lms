import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Lock,
  Award,
  ArrowLeft,
  Play,
  BookOpen,
  ClipboardCheck,
  CheckCircle2,
  Circle,
  ExternalLink,
  Download,
  Clock,
  FileText,
  ShieldCheck,
  AlertCircle,
  ChevronRight,
  Compass,
  Upload,
  MessageSquare,
  Star,
  Zap,
  RotateCcw,
  Unlock,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useDatabase } from '@/context/DatabaseContext';
import {
  SUBJECT_1_FINAL_TEST,
  LaunchpadSubject,
  LaunchpadWeekModule,
  LaunchpadMCQ,
  LaunchpadSituationalPrompt,
  LaunchpadTestDocumentPayload,
  extractYoutubeId,
} from '@/data/launchpadData';
import { SubjectIllustration } from '@/components/launchpad/SubjectIllustration';
import { CertificateGenerator } from '@/components/launchpad/CertificateGenerator';
import { LaunchpadGamificationGuide } from '@/components/launchpad/LaunchpadGamificationGuide';
import { LaunchpadWeekProgress } from '@/types';

function countWords(text: string): number {
  const trimmed = (text || '').trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export default function StudentLaunchpad() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    students,
    currentUser,
    launchpadSubjects: rawLaunchpadSubjects,
    launchpadChapters: rawLaunchpadChapters,
    launchpadCertQuestions: rawLaunchpadCertQuestions,
    launchpadEnrollments: rawLaunchpadEnrollments,
    launchpadSubjectReleases: rawLaunchpadSubjectReleases,
    launchpadProgress: rawLaunchpadProgress,
    saveLaunchpadWeekProgress,
    markLaunchpadWeekInProgress,
    submitLaunchpadPracticalExercise,
    launchpadCertifications: rawLaunchpadCertifications,
    saveLaunchpadCertification,
    launchpadEvaluations: rawLaunchpadEvaluations,
    initializeData,
  } = useDatabase();

  useEffect(() => {
    void initializeData(localStorage.getItem('auth_token') || '');
  }, []);

  const launchpadSubjects = Array.isArray(rawLaunchpadSubjects) ? rawLaunchpadSubjects : [];
  const launchpadChapters = Array.isArray(rawLaunchpadChapters) ? rawLaunchpadChapters : [];
  const launchpadCertQuestions = Array.isArray(rawLaunchpadCertQuestions) ? rawLaunchpadCertQuestions : [];
  const launchpadEnrollments = Array.isArray(rawLaunchpadEnrollments) ? rawLaunchpadEnrollments : [];
  const launchpadSubjectReleases = Array.isArray(rawLaunchpadSubjectReleases) ? rawLaunchpadSubjectReleases : [];
  const launchpadProgress = Array.isArray(rawLaunchpadProgress) ? rawLaunchpadProgress : [];
  const launchpadCertifications = Array.isArray(rawLaunchpadCertifications) ? rawLaunchpadCertifications : [];
  const launchpadEvaluations = Array.isArray(rawLaunchpadEvaluations) ? rawLaunchpadEvaluations : [];

  const currentStudent = useMemo(() => {
    const savedAuthEmail = (localStorage.getItem('auth_user_email') || '').trim().toLowerCase();
    const cleanUserEmail = (
      ((currentUser?.role || '').toUpperCase() === 'STUDENT' ? currentUser?.email : '') ||
      savedAuthEmail ||
      currentUser?.email ||
      ''
    )
      .trim()
      .toLowerCase();

    return (
      students.find(
        (s) =>
          (currentUser?.id && s.id === currentUser.id) ||
          (cleanUserEmail && (s.email || '').trim().toLowerCase() === cleanUserEmail)
      ) ||
      ((currentUser?.role || '').toUpperCase() === 'STUDENT'
        ? (currentUser as any)
        : savedAuthEmail && savedAuthEmail !== 'uppseekers@gmail.com'
        ? ({
            id: currentUser?.id || savedAuthEmail,
            name: savedAuthEmail.split('@')[0] || 'Student',
            email: savedAuthEmail,
          } as any)
        : students[0])
    );
  }, [students, currentUser]);

  const studentId = currentStudent?.id || currentUser?.id || 'STU-101';
  const studentName = currentStudent?.name || currentUser?.name || 'Student';
  const cleanStudentEmail = useMemo(() => {
    const savedAuthEmail = (localStorage.getItem('auth_user_email') || '').trim().toLowerCase();
    return (
      currentStudent?.email ||
      ((currentUser?.role || '').toUpperCase() === 'STUDENT' ? currentUser?.email : '') ||
      (savedAuthEmail !== 'uppseekers@gmail.com' ? savedAuthEmail : '') ||
      ''
    )
      .trim()
      .toLowerCase();
  }, [currentStudent?.email, currentUser?.email, currentUser?.role]);

  const studentCandidateIds = useMemo(() => {
    const ids = new Set<string>();
    if (studentId) ids.add(studentId);
    if (currentUser?.id && (currentUser?.role || '').toUpperCase() === 'STUDENT') {
      ids.add(currentUser.id);
    }
    if (cleanStudentEmail) {
      students.forEach((s) => {
        if ((s.email || '').trim().toLowerCase() === cleanStudentEmail && s.id) {
          ids.add(s.id);
        }
      });
    }
    return ids;
  }, [studentId, currentUser?.id, currentUser?.role, cleanStudentEmail, students]);

  const matchesCurrentStudent = (record: { studentId?: string; studentEmail?: string } | null | undefined) => {
    if (!record) return false;
    if (record.studentId && studentCandidateIds.has(record.studentId)) return true;
    if (
      cleanStudentEmail &&
      record.studentEmail &&
      record.studentEmail.trim().toLowerCase() === cleanStudentEmail
    ) {
      return true;
    }
    return false;
  };

  const isEnrolled = useMemo(() => {
    return (
      launchpadEnrollments.some((e) => matchesCurrentStudent(e)) ||
      launchpadSubjectReleases.some((r) => matchesCurrentStudent(r) && r.isUnlocked)
    );
  }, [launchpadEnrollments, launchpadSubjectReleases, studentCandidateIds, cleanStudentEmail]);

  const visibleSubjects = useMemo(
    () =>
      launchpadSubjects
        .filter((s) => !s.isArchived)
        .sort((a, b) => a.order - b.order),
    [launchpadSubjects]
  );

  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [selectedWeekNum, setSelectedWeekNum] = useState<number>(1);
  // Default active tab is strictly 'guide' (1. Read Guide -> 2. Watch Lecture -> 3. Practical Exercise)
  const [activeTab, setActiveTab] = useState<'guide' | 'lecture' | 'exercise'>('guide');
  const [isTestMode, setIsTestMode] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  // Worksheet form state for current week
  const [exerciseFields, setExerciseFields] = useState<Record<string, string>>({});
  const [exerciseChecklist, setExerciseChecklist] = useState<Record<string, boolean>>({});
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [exerciseSavedNotice, setExerciseSavedNotice] = useState(false);
  const [exerciseValidationError, setExerciseValidationError] = useState<string | null>(null);

  // Final Test state
  const [testStarted, setTestStarted] = useState(false);
  const [timeLeftSec, setTimeLeftSec] = useState(SUBJECT_1_FINAL_TEST.timeLimitMinutes * 60);
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, number>>({});
  const [situationalAnswers, setSituationalAnswers] = useState<Record<string, string>>({});
  const [testAttachmentUrl, setTestAttachmentUrl] = useState('');
  const [testAttachmentName, setTestAttachmentName] = useState('');
  const [testValidationError, setTestValidationError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    score: number;
    passed: boolean;
    mcqCorrect: number;
    mcqTotal: number;
    situationalFeedback: { id: string; earned: number; max: number; note: string }[];
  } | null>(null);

  // Helper: check if subject is unlocked for current student (matches by ID or email, newest action wins)
  const isSubjectUnlocked = (subjectId: string) => {
    const matching = launchpadSubjectReleases.filter(
      (r) => r.subjectId === subjectId && matchesCurrentStudent(r)
    );
    if (matching.length === 0) return false;
    const sorted = [...matching].sort((a, b) => {
      const tB = a && b && b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
      const tA = a && a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
      return (Number.isFinite(tB) ? tB : 0) - (Number.isFinite(tA) ? tA : 0);
    });
    return Boolean(sorted[0]?.isUnlocked);
  };

  // Helper: get certification for a subject
  const getCertification = (subjectId: string) => {
    return launchpadCertifications.find(
      (c) => studentCandidateIds.has(c.studentId) && c.subjectId === subjectId && c.passed
    );
  };

  // Helper: get week progress record
  const getWeekProgress = (subjectId: string, weekNumber: number): LaunchpadWeekProgress => {
    const found = launchpadProgress.find(
      (p) =>
        studentCandidateIds.has(p.studentId) &&
        p.subjectId === subjectId &&
        p.weekNumber === weekNumber
    );
    return (
      found || {
        id: `${studentId}__${subjectId}__w${weekNumber}`,
        studentId,
        subjectId,
        weekNumber,
        lectureCompleted: false,
        readingCompleted: false,
        exerciseSubmissionJson: null,
        exerciseCompleted: false,
      }
    );
  };

  // Helper: effective evaluation status (progress record or evaluation record)
  const getEffectiveEvalStatus = (subjectId: string, weekNumber: number) => {
    const wp = getWeekProgress(subjectId, weekNumber);
    const ev = launchpadEvaluations.find(
      (e) =>
        studentCandidateIds.has(e.studentId) &&
        e.subjectId === subjectId &&
        e.weekNumber === weekNumber
    );
    return wp.evaluationStatus || ev?.status || null;
  };

  // Helper: per-subject gamification & accessibility summary
  const getSubjectSummary = (subject: LaunchpadSubject) => {
    const chapters = launchpadChapters
      .filter((c) => (c.subjectId || 'comm-public-speaking') === subject.id)
      .sort((a, b) => a.weekNumber - b.weekNumber);
    const totalWeeks = chapters.length;
    const totalSteps = totalWeeks * 3;
    let completedSteps = 0;
    let submittedWeeks = 0;
    let approvedWeeks = 0;
    let needsRevisionWeek: LaunchpadWeekModule | undefined;

    chapters.forEach((ch) => {
      const wp = getWeekProgress(subject.id, ch.weekNumber);
      const evStatus = getEffectiveEvalStatus(subject.id, ch.weekNumber);
      if (wp.readingCompleted) completedSteps++;
      if (wp.lectureCompleted) completedSteps++;
      if (wp.exerciseCompleted) completedSteps++;
      if (wp.exerciseCompleted || evStatus) submittedWeeks++;
      if (evStatus === 'Approved' || evStatus === 'Reviewed') approvedWeeks++;
      if (evStatus === 'Needs Revision' && !needsRevisionWeek) {
        needsRevisionWeek = ch;
      }
    });

    const cert = getCertification(subject.id);
    const unlockedByCounselor = isSubjectUnlocked(subject.id);
    const hasNeedsRevision = Boolean(needsRevisionWeek);
    const hasSubmittedOrProgress =
      submittedWeeks > 0 || completedSteps > 0 || Boolean(cert) || hasNeedsRevision;
    const canOpen = unlockedByCounselor || hasSubmittedOrProgress;
    const allSubmitted = totalWeeks > 0 && submittedWeeks === totalWeeks;

    const earnedXP = completedSteps * 50 + (cert ? 200 : 0);
    const maxXP = totalWeeks > 0 ? totalWeeks * 150 + 200 : 200;
    const progressPct = cert
      ? 100
      : totalSteps > 0
      ? Math.round((completedSteps / totalSteps) * 100)
      : 0;

    type FolderState =
      | 'locked'
      | 'needs_revision'
      | 'certified'
      | 'submitted'
      | 'in_progress'
      | 'unlocked';

    let folderState: FolderState = 'locked';
    if (!canOpen) folderState = 'locked';
    else if (hasNeedsRevision) folderState = 'needs_revision';
    else if (cert) folderState = 'certified';
    else if (allSubmitted) folderState = 'submitted';
    else if (submittedWeeks > 0 || completedSteps > 0) folderState = 'in_progress';
    else folderState = 'unlocked';

    return {
      chapters,
      totalWeeks,
      totalSteps,
      completedSteps,
      submittedWeeks,
      approvedWeeks,
      needsRevisionWeek,
      hasNeedsRevision,
      allSubmitted,
      cert,
      unlockedByCounselor,
      canOpen,
      earnedXP,
      maxXP,
      progressPct,
      folderState,
    };
  };

  // Handle URL deep-linking from notifications (?subject=...&week=...)
  useEffect(() => {
    const paramSubject = searchParams.get('subject');
    if (!paramSubject) return;
    const targetSubj = launchpadSubjects.find((s) => s.id === paramSubject);
    if (!targetSubj) return;
    const summary = getSubjectSummary(targetSubj);
    if (!summary.canOpen) return;
    const paramWeek = Number(searchParams.get('week'));
    setActiveSubjectId(paramSubject);
    setIsTestMode(false);
    setActiveTab('guide');
    if (paramWeek && !isNaN(paramWeek)) {
      setSelectedWeekNum(paramWeek);
    } else if (summary.needsRevisionWeek) {
      setSelectedWeekNum(summary.needsRevisionWeek.weekNumber);
    } else {
      setSelectedWeekNum(summary.chapters[0]?.weekNumber || 1);
    }
  }, [searchParams, isEnrolled, launchpadSubjectReleases, launchpadProgress, launchpadEvaluations, studentId]);

  const activeSubject: LaunchpadSubject | undefined = useMemo(
    () => launchpadSubjects.find((s) => s.id === activeSubjectId),
    [launchpadSubjects, activeSubjectId]
  );

  const subjectChapters: LaunchpadWeekModule[] = useMemo(() => {
    if (!activeSubjectId) return [];
    return launchpadChapters
      .filter((c) => (c.subjectId || 'comm-public-speaking') === activeSubjectId)
      .sort((a, b) => a.weekNumber - b.weekNumber);
  }, [launchpadChapters, activeSubjectId]);

  // Sequential Week Locking helper: Week 1 open; Week N open when prior week's exercise is submitted OR week itself already has progress/submission/revision
  const isWeekUnlocked = (weekNumber: number): boolean => {
    if (subjectChapters.length === 0) return weekNumber === 1;
    const idx = subjectChapters.findIndex((c) => c.weekNumber === weekNumber);
    if (idx <= 0) return true;
    if (activeSubjectId) {
      const ownProg = getWeekProgress(activeSubjectId, weekNumber);
      const ownEval = getEffectiveEvalStatus(activeSubjectId, weekNumber);
      if (ownProg.exerciseCompleted || ownProg.readingCompleted || ownProg.lectureCompleted || ownEval) {
        return true;
      }
    }
    const prevChapter = subjectChapters[idx - 1];
    const prevProg = activeSubjectId ? getWeekProgress(activeSubjectId, prevChapter.weekNumber) : null;
    return Boolean(prevProg?.exerciseCompleted);
  };

  const activeWeekModule: LaunchpadWeekModule | undefined = useMemo(() => {
    if (subjectChapters.length === 0) return undefined;
    return subjectChapters.find((w) => w.weekNumber === selectedWeekNum) || subjectChapters[0];
  }, [subjectChapters, selectedWeekNum]);

  // Dynamic Final Test questions & companion document for active subject
  const subjectCertTest = useMemo(() => {
    if (!activeSubjectId) {
      return {
        passingThreshold: 75,
        timeLimitMinutes: 20,
        mcqQuestions: [] as LaunchpadMCQ[],
        situationalQuestions: [] as LaunchpadSituationalPrompt[],
        testDoc: null as LaunchpadTestDocumentPayload | null,
      };
    }
    const qs = launchpadCertQuestions
      .filter((q) => q.subjectId === activeSubjectId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const mcqs = qs
      .filter((q) => q.questionType === 'mcq')
      .map((q) => q.payload as LaunchpadMCQ);
    const sit = qs
      .filter((q) => q.questionType === 'situational')
      .map((q) => q.payload as LaunchpadSituationalPrompt);
    const docRec = qs.find((q) => q.questionType === 'test_doc');

    return {
      passingThreshold: activeSubject?.passingThreshold ?? 75,
      timeLimitMinutes: SUBJECT_1_FINAL_TEST.timeLimitMinutes,
      mcqQuestions: mcqs,
      situationalQuestions: sit,
      testDoc: docRec ? (docRec.payload as LaunchpadTestDocumentPayload) : null,
    };
  }, [activeSubjectId, activeSubject, launchpadCertQuestions]);

  // Transition To-Do -> In Progress automatically when student opens/interacts with an unlocked chapter
  useEffect(() => {
    if (!activeSubject || !activeSubjectId || !activeWeekModule || isTestMode) return;
    if (!getSubjectSummary(activeSubject).canOpen) return;
    if (!isWeekUnlocked(activeWeekModule.weekNumber)) return;
    markLaunchpadWeekInProgress(studentId, activeSubjectId, activeWeekModule.weekNumber);
  }, [activeSubjectId, activeWeekModule?.weekNumber, activeTab, isTestMode, studentId]);

  // Sync local form state when switching week or subject
  useEffect(() => {
    if (activeSubjectId && activeWeekModule) {
      const wp = getWeekProgress(activeSubjectId, activeWeekModule.weekNumber);
      setExerciseFields(wp.exerciseSubmissionJson?.fields || {});
      setExerciseChecklist(wp.exerciseSubmissionJson?.checklist || {});
      setAttachmentUrl(wp.exerciseSubmissionJson?.attachmentUrl || '');
      setAttachmentName(wp.exerciseSubmissionJson?.attachmentName || '');
      setExerciseValidationError(null);
      setExerciseSavedNotice(false);
    }
  }, [activeSubjectId, activeWeekModule?.weekNumber, launchpadProgress]);

  // Countdown timer for Final Certification Test
  useEffect(() => {
    if (!testStarted || testResult) return;
    const timer = setInterval(() => {
      setTimeLeftSec((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [testStarted, testResult]);

  useEffect(() => {
    if (testStarted && !testResult && timeLeftSec === 0) {
      handleSubmitTest();
    }
  }, [testStarted, testResult, timeLeftSec]);

  // Completion stats for active subject
  const subjectStats = useMemo(() => {
    if (!activeSubjectId || subjectChapters.length === 0) {
      return { completedWeeks: 0, totalWeeks: 0, completedSteps: 0, totalSteps: 0, allWeeksComplete: false };
    }
    let completedWeeks = 0;
    let completedSteps = 0;
    subjectChapters.forEach((w) => {
      const wp = getWeekProgress(activeSubjectId, w.weekNumber);
      if (wp.lectureCompleted) completedSteps++;
      if (wp.readingCompleted) completedSteps++;
      if (wp.exerciseCompleted) completedSteps++;
      if (wp.exerciseCompleted && (wp.lectureCompleted || wp.readingCompleted || wp.exerciseCompleted)) {
        // Count week complete once reading + lecture + exercise are done, or exercise is completed
      }
      if (wp.lectureCompleted && wp.readingCompleted && wp.exerciseCompleted) {
        completedWeeks++;
      }
    });
    return {
      completedWeeks,
      totalWeeks: subjectChapters.length,
      completedSteps,
      totalSteps: subjectChapters.length * 3,
      allWeeksComplete: subjectChapters.length > 0 && completedWeeks === subjectChapters.length,
    };
  }, [launchpadProgress, studentId, activeSubjectId, subjectChapters]);

  const handleToggleStepCompletion = (step: 'lecture' | 'reading') => {
    if (!activeSubjectId || !activeWeekModule) return;
    const current = getWeekProgress(activeSubjectId, activeWeekModule.weekNumber);
    markLaunchpadWeekInProgress(studentId, activeSubjectId, activeWeekModule.weekNumber);
    saveLaunchpadWeekProgress({
      ...current,
      lectureCompleted: step === 'lecture' ? !current.lectureCompleted : current.lectureCompleted,
      readingCompleted: step === 'reading' ? !current.readingCompleted : current.readingCompleted,
    });
  };

  const handleDownloadGuide = (week: LaunchpadWeekModule) => {
    const htmlDoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Week ${week.weekNumber}: ${week.readingGuide.title}</title>
<style>
  body { font-family: Georgia, serif; max-width: 760px; margin: 40px auto; color: #0f172a; line-height: 1.65; padding: 0 20px; }
  h1 { font-size: 26px; margin-bottom: 6px; }
  .meta { color: #64748b; font-family: sans-serif; font-size: 13px; margin-bottom: 24px; }
  .summary { background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin-bottom: 28px; }
  h2 { font-family: sans-serif; font-size: 17px; margin-top: 28px; color: #1e1b4b; }
  .framework { border: 1px solid #cbd5e1; padding: 14px 18px; border-radius: 8px; margin: 14px 0; background: #ffffff; }
  .fw-item { margin-bottom: 10px; }
  .fw-term { font-weight: bold; color: #4338ca; font-family: sans-serif; }
</style>
</head>
<body>
  <div class="meta">Uppseekers Launchpad · ${activeSubject?.title || 'Subject'} · Week ${week.weekNumber}</div>
  <h1>${week.readingGuide.title}</h1>
  <div class="summary">${week.readingGuide.summary}</div>
  ${week.readingGuide.sections
    .map(
      (sec) => `
    <h2>${sec.heading}</h2>
    <p>${sec.body}</p>
    ${sec.bullets ? `<ul>${sec.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>` : ''}
    ${
      sec.frameworkItems
        ? `<div class="framework">${sec.frameworkItems
            .map(
              (item) =>
                `<div class="fw-item"><span class="fw-term">${item.term}:</span> ${item.detail}</div>`
            )
            .join('')}</div>`
        : ''
    }
  `
    )
    .join('')}
</body>
</html>`;
    const blob = new Blob([htmlDoc], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Launchpad-Week-${week.weekNumber}-${week.readingGuide.title.replace(/[^a-z0-9]+/gi, '-')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExerciseFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setExerciseValidationError('Uploaded file must be under 2 MB. For large videos, paste a share link below.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentName(file.name);
      setAttachmentUrl(typeof reader.result === 'string' ? reader.result : '');
      setExerciseValidationError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubjectId || !activeWeekModule) return;

    const missingFields = activeWeekModule.practicalExercise.fields.filter(
      (f) => !(exerciseFields[f.key] || '').trim()
    );
    if (missingFields.length > 0) {
      setExerciseValidationError(
        `Please complete all worksheet fields (${missingFields[0].label}) before submitting.`
      );
      return;
    }

    setExerciseValidationError(null);
    const current = getWeekProgress(activeSubjectId, activeWeekModule.weekNumber);
    submitLaunchpadPracticalExercise({
      studentId,
      subjectId: activeSubjectId,
      weekNumber: activeWeekModule.weekNumber,
      progressItem: {
        ...current,
        exerciseCompleted: true,
        exerciseSubmissionJson: {
          fields: exerciseFields,
          checklist: exerciseChecklist,
          attachmentName: attachmentName.trim() || undefined,
          attachmentUrl: attachmentUrl.trim() || undefined,
          submittedAt: new Date().toISOString(),
        },
      },
    });
    setExerciseSavedNotice(true);
    setTimeout(() => setExerciseSavedNotice(false), 4500);
  };

  const handleStartTest = () => {
    setMcqAnswers({});
    setSituationalAnswers({});
    setTestAttachmentUrl('');
    setTestAttachmentName('');
    setTestValidationError(null);
    setTestResult(null);
    setTimeLeftSec(subjectCertTest.timeLimitMinutes * 60);
    setTestStarted(true);
  };

  const handleTestFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setTestValidationError('Uploaded test document must be under 4 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setTestAttachmentName(file.name);
      setTestAttachmentUrl(typeof reader.result === 'string' ? reader.result : '');
      setTestValidationError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitTest = () => {
    const mcqs = subjectCertTest.mcqQuestions;
    const sits = subjectCertTest.situationalQuestions;
    if (
      mcqs.length === 0 &&
      sits.length === 0 &&
      subjectCertTest.testDoc?.allowStudentUpload &&
      !testAttachmentUrl.trim()
    ) {
      setTestValidationError('Please upload your completed assessment document or paste a share link before submitting.');
      return;
    }
    setTestValidationError(null);
    let mcqCorrect = 0;
    mcqs.forEach((q) => {
      if (mcqAnswers[q.id] === q.correctIndex) {
        mcqCorrect++;
      }
    });

    const hasMcq = mcqs.length > 0;
    const hasSit = sits.length > 0;
    const mcqWeight = hasMcq && hasSit ? 70 : hasMcq ? 100 : 0;
    const sitWeight = hasMcq && hasSit ? 30 : hasSit ? 100 : 0;

    const mcqPoints = hasMcq ? (mcqCorrect / mcqs.length) * mcqWeight : 0;

    let situationalPointsRaw = 0;
    const maxSitPerPrompt = hasSit ? sitWeight / sits.length : 15;

    const situationalFeedback = sits.map((sq) => {
      const response = (situationalAnswers[sq.id] || '').trim();
      const words = countWords(response);
      const lower = response.toLowerCase();
      const matchedKeywords = (sq.rubricKeywords || []).filter((kw) =>
        lower.includes(kw.toLowerCase())
      );

      let ratio = 0;
      if (words >= sq.minWords) ratio += 0.6;
      else if (words >= Math.floor(sq.minWords * 0.5)) ratio += 0.35;

      if ((sq.rubricKeywords || []).length === 0) {
        if (words >= sq.minWords) ratio += 0.4;
      } else if (matchedKeywords.length >= 3) {
        ratio += 0.4;
      } else if (matchedKeywords.length >= 1) {
        ratio += 0.2;
      }

      const earned = Math.round(ratio * maxSitPerPrompt);
      situationalPointsRaw += earned;
      return {
        id: sq.id,
        earned,
        max: Math.round(maxSitPerPrompt),
        note:
          earned >= Math.round(maxSitPerPrompt * 0.8)
            ? 'Strong structure and framework alignment.'
            : `Ensure at least ${sq.minWords} words and clear framework elements (${sq.rubricGuidance}).`,
      };
    });

    const totalScore =
      !hasMcq && !hasSit ? 100 : Math.min(100, Math.round(mcqPoints + situationalPointsRaw));
    const passed = totalScore >= subjectCertTest.passingThreshold;

    setTestResult({
      score: totalScore,
      passed,
      mcqCorrect,
      mcqTotal: mcqs.length,
      situationalFeedback,
    });

    if (passed && activeSubjectId) {
      const existingCert = getCertification(activeSubjectId);
      const code =
        existingCert?.certificateCode ||
        `UPP-LP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      saveLaunchpadCertification({
        id: `${studentId}__${activeSubjectId}`,
        studentId,
        subjectId: activeSubjectId,
        testScore: totalScore,
        passed: true,
        certificateCode: code,
        issuedAt: new Date().toISOString(),
      });
    }
  };

  // Inside a Subject Workspace (All subjects are visible in catalog below regardless of enrollment)
  if (activeSubject) {
    const activeCert = getCertification(activeSubject.id);

    // Coming Soon state when no chapters exist yet for this subject
    if (subjectChapters.length === 0) {
      return (
        <div className="max-w-5xl mx-auto space-y-6">
          <button
            onClick={() => {
              setActiveSubjectId(null);
              setSearchParams({});
            }}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Launchpad Catalog</span>
          </button>

          <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-8 border-b border-slate-200">
              <div className="w-24 h-24 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                <SubjectIllustration
                  subjectId={activeSubject.iconKey || activeSubject.id}
                  customIconUrl={activeSubject.customIconUrl}
                  accentHex={activeSubject.accentHex}
                  className="w-20 h-20"
                />
              </div>
              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-500">
                  Launchpad Subject {activeSubject.order} · Unlocked
                </div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {activeSubject.title}
                </h1>
                <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
                  {activeSubject.description}
                </p>
              </div>
            </div>

            <div className="py-14 text-center space-y-3 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
                <Compass className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                Curriculum Modules Coming Soon
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                This subject has been released to your profile by your counselor. Weekly reading guides, lectures, and practical exercises are currently being finalized.
              </p>
            </div>
          </div>
        </div>
      );
    }

    const currentWeek = activeWeekModule || subjectChapters[0];
    const weekProgress = getWeekProgress(activeSubject.id, currentWeek.weekNumber);
    const currentEvaluation = launchpadEvaluations.find(
      (e) =>
        studentCandidateIds.has(e.studentId) &&
        e.subjectId === activeSubject.id &&
        e.weekNumber === currentWeek.weekNumber
    );
    const evalStatus = weekProgress.evaluationStatus || currentEvaluation?.status || null;
    const evalFeedback = weekProgress.evaluatorFeedback || currentEvaluation?.feedback || null;
    const evalBy = weekProgress.evaluatedBy || currentEvaluation?.evaluatedBy || null;
    const lectureYoutubeId =
      currentWeek.lecture.youtubeId || extractYoutubeId(currentWeek.lecture.url);
    const hasNextWeek = subjectChapters.some((c) => c.weekNumber > currentWeek.weekNumber);
    const nextWeekObj = subjectChapters.find((c) => c.weekNumber > currentWeek.weekNumber);

    return (
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Breadcrumb & Subject Header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              onClick={() => {
                setActiveSubjectId(null);
                setIsTestMode(false);
                setSearchParams({});
              }}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Launchpad</span>
            </button>

            <div className="flex items-center gap-4 text-xs font-medium text-slate-600 tabular-nums">
              <span>{subjectStats.completedWeeks} / {subjectStats.totalWeeks} Weeks Completed</span>
              <span aria-hidden="true">·</span>
              <span>{subjectStats.completedSteps} / {subjectStats.totalSteps} Steps</span>
              {activeCert && (
                <>
                  <span aria-hidden="true">·</span>
                  <button
                    onClick={() => setShowCertificateModal(true)}
                    className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold hover:underline whitespace-nowrap"
                  >
                    <Award className="w-4 h-4" />
                    <span>Certified ({activeCert.testScore}%) — View Certificate</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {activeSubject.title}
            </h1>
            <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
              {activeSubject.description}
            </p>
            {activeSubject.courseGoal && (
              <p className="text-xs sm:text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mt-2">
                <span className="font-semibold text-slate-900">Course Goal:</span> {activeSubject.courseGoal}
              </p>
            )}
          </div>
        </div>

        {/* Two-Column Syllabus Sidebar + Main Content Pane */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left-hand Week/Item Navigation Sidebar */}
          <aside className="w-full lg:w-72 bg-white border border-slate-200 rounded-2xl p-3 shrink-0 space-y-1.5">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Weekly Syllabus
            </div>
            {subjectChapters.map((week, idx) => {
              const wp = getWeekProgress(activeSubject.id, week.weekNumber);
              const unlocked = isWeekUnlocked(week.weekNumber);
              const stepDoneCount =
                (wp.readingCompleted ? 1 : 0) +
                (wp.lectureCompleted ? 1 : 0) +
                (wp.exerciseCompleted ? 1 : 0);
              const isWeekDone = stepDoneCount === 3;
              const isSelected = !isTestMode && currentWeek.weekNumber === week.weekNumber;

              return (
                <button
                  key={week.id || week.weekNumber}
                  type="button"
                  disabled={!unlocked}
                  title={!unlocked ? `Submit Week ${subjectChapters[idx - 1]?.weekNumber} exercise to unlock` : week.title}
                  onClick={() => {
                    if (!unlocked) return;
                    setIsTestMode(false);
                    setSelectedWeekNum(week.weekNumber);
                    setActiveTab('guide');
                  }}
                  className={cn(
                    'w-full text-left px-3 py-3 rounded-xl transition-colors flex items-start gap-3',
                    !unlocked
                      ? 'bg-slate-50/80 text-slate-400 border border-transparent opacity-70 cursor-not-allowed'
                      : isSelected
                      ? 'bg-indigo-50 text-indigo-900 border border-indigo-200'
                      : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    {!unlocked ? (
                      <Lock className="w-4 h-4 text-slate-400" />
                    ) : isWeekDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Circle className={cn('w-4 h-4', isSelected ? 'text-indigo-600' : 'text-slate-300')} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 tabular-nums flex items-center justify-between gap-1">
                      <span>Week {week.weekNumber} · {stepDoneCount}/3</span>
                      {wp.evaluationStatus === 'Needs Revision' && (
                        <span className="text-[10px] font-bold text-rose-600">Revision</span>
                      )}
                    </div>
                    <div className="text-sm font-semibold leading-snug mt-0.5">
                      {week.title}
                    </div>
                    {!unlocked && (
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Locked until Week {subjectChapters[idx - 1]?.weekNumber} submitted
                      </div>
                    )}
                  </div>
                </button>
              );
            })}

            <div className="pt-2 mt-2 border-t border-slate-200">
              <button
                onClick={() => {
                  if (subjectStats.allWeeksComplete || activeCert) {
                    setIsTestMode(true);
                  }
                }}
                disabled={!subjectStats.allWeeksComplete && !activeCert}
                className={cn(
                  'w-full text-left px-3 py-3 rounded-xl transition-colors flex items-center justify-between gap-2 border',
                  isTestMode
                    ? 'bg-slate-900 text-white border-slate-900'
                    : subjectStats.allWeeksComplete || activeCert
                    ? 'bg-emerald-50/70 hover:bg-emerald-50 text-emerald-900 border-emerald-200'
                    : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {subjectStats.allWeeksComplete || activeCert ? (
                    <Award className="w-4 h-4 shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">Final Certification Test</div>
                    <div className="text-[11px] opacity-80 tabular-nums">
                      {activeCert
                        ? `Certified · ${activeCert.testScore}%`
                        : subjectStats.allWeeksComplete
                        ? `Unlocked · ${subjectCertTest.passingThreshold}% to pass`
                        : `Complete all ${subjectChapters.length} weeks (${subjectStats.completedWeeks}/${subjectChapters.length})`}
                    </div>
                  </div>
                </div>
                {(subjectStats.allWeeksComplete || activeCert) && (
                  <ChevronRight className="w-4 h-4 shrink-0" />
                )}
              </button>
            </div>
          </aside>

          {/* Main Content Pane */}
          <section className="flex-1 min-w-0 w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
            {isTestMode ? (
              /* FINAL CERTIFICATION TEST VIEW */
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                      Final Certification Assessment
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mt-1">
                      {activeSubject.title}
                    </h2>
                  </div>
                  {testStarted && !testResult && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white font-mono text-sm font-bold tabular-nums">
                      <Clock className="w-4 h-4" />
                      <span>
                        {String(Math.floor(timeLeftSec / 60)).padStart(2, '0')}:
                        {String(timeLeftSec % 60).padStart(2, '0')}
                      </span>
                    </div>
                  )}
                </div>

                {activeCert && !testStarted && !testResult && (
                  <div className="space-y-6">
                    <CertificateGenerator
                      inline
                      studentName={studentName}
                      subjectTitle={activeSubject.title}
                      certificateTitle={activeSubject.certificateTitle}
                      moduleCount={subjectChapters.length}
                      passingThreshold={subjectCertTest.passingThreshold}
                      certificateCode={activeCert.certificateCode}
                      issuedAt={activeCert.issuedAt}
                      testScore={activeCert.testScore}
                    />
                    <div className="flex justify-end">
                      <Button variant="outline" onClick={handleStartTest}>
                        Retake Assessment
                      </Button>
                    </div>
                  </div>
                )}

                {!activeCert && !testStarted && !testResult && (
                  <div className="py-8 max-w-2xl space-y-6">
                    <p className="text-sm text-slate-600 leading-relaxed">
                      You have completed all {subjectChapters.length} weekly modules. Pass this timed assessment with a score of{' '}
                      <strong className="text-slate-900">{subjectCertTest.passingThreshold}% or higher</strong> to earn your verified Certificate of Completion.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-xs text-slate-500">Format</div>
                        <div className="font-semibold text-slate-900 mt-1">
                          {subjectCertTest.mcqQuestions.length === 0 && subjectCertTest.situationalQuestions.length === 0 && subjectCertTest.testDoc?.docUrl
                            ? 'Document Assessment'
                            : `${subjectCertTest.mcqQuestions.length} MCQs + ${subjectCertTest.situationalQuestions.length} Scenarios${subjectCertTest.testDoc?.docUrl ? ' + Doc' : ''}`}
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-xs text-slate-500">Time Limit</div>
                        <div className="font-semibold text-slate-900 mt-1 tabular-nums">
                          {subjectCertTest.timeLimitMinutes} Minutes
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-xs text-slate-500">Passing Threshold</div>
                        <div className="font-semibold text-slate-900 mt-1 tabular-nums">
                          {subjectCertTest.passingThreshold}%
                        </div>
                      </div>
                    </div>
                    {subjectCertTest.testDoc && (subjectCertTest.testDoc.docUrl || subjectCertTest.testDoc.instructions) && (
                      <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold uppercase tracking-wider text-indigo-800">
                            Assessment Reference Document
                          </div>
                          <div className="text-xs text-slate-700">
                            {subjectCertTest.testDoc.instructions ||
                              subjectCertTest.testDoc.docFileName ||
                              'Download the assessment guide / prompt document before starting.'}
                          </div>
                        </div>
                        {subjectCertTest.testDoc.docUrl && (
                          <a
                            href={subjectCertTest.testDoc.docUrl}
                            download={subjectCertTest.testDoc.docFileName || 'Assessment-Reference-Doc'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold whitespace-nowrap"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{subjectCertTest.testDoc.docFileName || 'Download Test Document'}</span>
                          </a>
                        )}
                      </div>
                    )}

                    <Button
                      onClick={handleStartTest}
                      className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5"
                    >
                      Start Certification Assessment
                    </Button>
                  </div>
                )}

                {testStarted && !testResult && (
                  <div className="space-y-8">
                    {subjectCertTest.mcqQuestions.length > 0 && (
                      <div className="space-y-6">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                          Part 1 · Scenario Multiple-Choice ({subjectCertTest.mcqQuestions.length} Questions)
                        </h3>
                        {subjectCertTest.mcqQuestions.map((q, idx) => (
                          <div key={q.id} className="p-5 rounded-xl border border-slate-200 space-y-3">
                            <div className="text-sm font-semibold text-slate-900">
                              <span className="text-indigo-600 mr-2 tabular-nums">Q{idx + 1}.</span>
                              {q.question}
                            </div>
                            <div className="space-y-2">
                              {q.options.map((opt, oIdx) => {
                                const checked = mcqAnswers[q.id] === oIdx;
                                return (
                                  <label
                                    key={oIdx}
                                    className={cn(
                                      'flex items-start gap-3 p-3 rounded-lg border text-sm cursor-pointer transition-colors',
                                      checked
                                        ? 'bg-indigo-50 border-indigo-300 text-slate-900 font-medium'
                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                    )}
                                  >
                                    <input
                                      type="radio"
                                      name={q.id}
                                      checked={checked}
                                      onChange={() =>
                                        setMcqAnswers((prev) => ({ ...prev, [q.id]: oIdx }))
                                      }
                                      className="mt-1 accent-indigo-600"
                                    />
                                    <span>{opt}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {subjectCertTest.situationalQuestions.length > 0 && (
                      <div className="space-y-6 pt-4 border-t border-slate-200">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                          Part 2 · Situational Written Application ({subjectCertTest.situationalQuestions.length} Prompts)
                        </h3>
                        {subjectCertTest.situationalQuestions.map((sq) => {
                          const val = situationalAnswers[sq.id] || '';
                          const words = countWords(val);
                          return (
                            <div key={sq.id} className="p-5 rounded-xl border border-slate-200 space-y-3">
                              <div className="font-semibold text-slate-900 text-sm">{sq.title}</div>
                              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                {sq.scenario}
                              </p>
                              <p className="text-sm text-slate-800">{sq.prompt}</p>
                              <textarea
                                rows={5}
                                value={val}
                                onChange={(e) =>
                                  setSituationalAnswers((prev) => ({
                                    ...prev,
                                    [sq.id]: e.target.value,
                                  }))
                                }
                                placeholder="Write your structured response here..."
                                className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                              <div className="flex items-center justify-between text-xs text-slate-500 tabular-nums">
                                <span>Minimum target: {sq.minWords} words</span>
                                <span className={words >= sq.minWords ? 'text-emerald-700 font-semibold' : ''}>
                                  {words} words
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {subjectCertTest.testDoc && (subjectCertTest.testDoc.docUrl || subjectCertTest.testDoc.instructions) && (
                      <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold uppercase tracking-wider text-indigo-800">
                            Assessment Reference Document
                          </div>
                          <div className="text-xs text-slate-700">
                            {subjectCertTest.testDoc.instructions ||
                              subjectCertTest.testDoc.docFileName ||
                              'Download the accompanying assessment document below.'}
                          </div>
                        </div>
                        {subjectCertTest.testDoc.docUrl && (
                          <a
                            href={subjectCertTest.testDoc.docUrl}
                            download={subjectCertTest.testDoc.docFileName || 'Assessment-Reference-Doc'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold whitespace-nowrap"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{subjectCertTest.testDoc.docFileName || 'Download Test Document'}</span>
                          </a>
                        )}
                      </div>
                    )}

                    {subjectCertTest.testDoc?.allowStudentUpload && (
                      <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                          Upload Completed Assessment Document
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-800">
                              Document / Drive Link (Optional)
                            </label>
                            <input
                              type="url"
                              value={testAttachmentUrl.startsWith('data:') ? '' : testAttachmentUrl}
                              onChange={(e) => {
                                setTestAttachmentUrl(e.target.value);
                                if (!testAttachmentName) setTestAttachmentName('External Link');
                              }}
                              placeholder="https://drive.google.com/..."
                              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-800">
                              Or Upload Response File (Max 4MB)
                            </label>
                            <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-dashed border-slate-300 bg-white hover:bg-slate-50 cursor-pointer text-xs font-medium text-slate-700">
                              <Upload className="w-4 h-4 text-indigo-600 shrink-0" />
                              <span className="truncate">
                                {testAttachmentName ? testAttachmentName : 'Choose PDF, DOC, or image...'}
                              </span>
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xlsx,.csv,.png,.jpg,.jpeg"
                                onChange={handleTestFileUpload}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    {testValidationError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{testValidationError}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                      <span className="text-xs text-slate-500 tabular-nums">
                        Answered {Object.keys(mcqAnswers).length}/{subjectCertTest.mcqQuestions.length} MCQs
                      </span>
                      <Button
                        onClick={handleSubmitTest}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6"
                      >
                        Submit Final Assessment
                      </Button>
                    </div>
                  </div>
                )}

                {testResult && (
                  <div className="space-y-6">
                    <div
                      className={cn(
                        'p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4',
                        testResult.passed
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50 border-rose-200 text-rose-900'
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-bold text-lg">
                          {testResult.passed ? (
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-rose-600" />
                          )}
                          <span>
                            {testResult.passed
                              ? 'Assessment Passed — Certificate Issued'
                              : `Score Below ${subjectCertTest.passingThreshold}% Passing Threshold`}
                          </span>
                        </div>
                        <p className="text-sm opacity-90 tabular-nums">
                          Final Score: <strong>{testResult.score}%</strong>
                          {testResult.mcqTotal > 0 && ` · Multiple Choice: ${testResult.mcqCorrect}/${testResult.mcqTotal} correct`}
                        </p>
                      </div>

                      {!testResult.passed && (
                        <Button
                          onClick={handleStartTest}
                          className="bg-slate-900 hover:bg-slate-800 text-white shrink-0"
                        >
                          Retake Assessment
                        </Button>
                      )}
                    </div>

                    {testResult.passed && activeCert && (
                      <CertificateGenerator
                        inline
                        studentName={studentName}
                        subjectTitle={activeSubject.title}
                        certificateTitle={activeSubject.certificateTitle}
                        moduleCount={subjectChapters.length}
                        passingThreshold={subjectCertTest.passingThreshold}
                        certificateCode={activeCert.certificateCode}
                        issuedAt={activeCert.issuedAt}
                        testScore={activeCert.testScore}
                      />
                    )}

                    {!testResult.passed && testResult.situationalFeedback.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-slate-900">Situational Feedback</h4>
                        {testResult.situationalFeedback.map((fb, idx) => (
                          <div key={fb.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm">
                            <div className="font-semibold text-slate-900 tabular-nums">
                              Prompt {idx + 1}: {fb.earned} / {fb.max} pts
                            </div>
                            <p className="text-slate-600 text-xs mt-1">{fb.note}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* WEEKLY 3-TAB FLOW: 1. Read Guide (Default) -> 2. Watch Lecture -> 3. Practical Exercise */
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 tabular-nums">
                      Week {currentWeek.weekNumber} of {subjectChapters.length}
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mt-1">
                      {currentWeek.title}
                    </h2>
                  </div>

                  {/* Clean Tab Order: 1. Read Guide (Default), 2. Watch Lecture, 3. Practical Exercise */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                    {[
                      { id: 'guide' as const, label: '1. Read Guide', done: weekProgress.readingCompleted, icon: BookOpen },
                      { id: 'lecture' as const, label: '2. Watch Lecture', done: weekProgress.lectureCompleted, icon: Play },
                      { id: 'exercise' as const, label: '3. Practical Exercise', done: weekProgress.exerciseCompleted, icon: ClipboardCheck },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0',
                          activeTab === item.id
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        )}
                      >
                        {item.done ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <item.icon className="w-3.5 h-3.5" />
                        )}
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Persistent Resubmission / Submission Callout across all 3 learning steps */}
                {evalStatus === 'Needs Revision' && (
                  <div className="p-4 rounded-xl bg-rose-50/80 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Resubmission Required for Week {currentWeek.weekNumber}</span>
                      </div>
                      <p className="text-xs text-rose-900/90 leading-relaxed">
                        {evalFeedback
                          ? `Counselor feedback: "${evalFeedback}" — Review the Read Guide and Watch Lecture above, then resubmit your updated Practical Exercise.`
                          : 'Your counselor requested a revision. Go through the Read Guide and Watch Lecture steps again, then update and resubmit your Practical Exercise.'}
                      </p>
                    </div>
                    {activeTab !== 'exercise' && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('exercise')}
                        className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold whitespace-nowrap shrink-0"
                      >
                        Go to Resubmit Exercise
                      </button>
                    )}
                  </div>
                )}

                {evalStatus === 'Submitted' && weekProgress.exerciseCompleted && activeTab !== 'exercise' && (
                  <div className="px-4 py-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200 flex flex-wrap items-center justify-between gap-2 text-xs text-indigo-900">
                    <span className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>
                        Week {currentWeek.weekNumber} exercise submitted for review. You can revisit the guide, lecture, or update your submission anytime.
                      </span>
                    </span>
                  </div>
                )}

                {/* TAB 1 (DEFAULT): READ GUIDE */}
                {activeTab === 'guide' && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          {currentWeek.readingGuide.title}
                        </h3>
                        <div className="text-xs text-slate-500 mt-1">
                          Week {currentWeek.weekNumber} Reading Guide · {currentWeek.readingGuide.readTime}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {currentWeek.readingGuide.pdfUrl && (
                          <a
                            href={currentWeek.readingGuide.pdfUrl}
                            download={currentWeek.readingGuide.pdfFileName || `Week-${currentWeek.weekNumber}-Reading-Material`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold whitespace-nowrap shrink-0"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{currentWeek.readingGuide.pdfFileName || 'Download Reading Material'}</span>
                          </a>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => handleDownloadGuide(currentWeek)}
                          className="whitespace-nowrap shrink-0"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          <span>Download Guide (DOC)</span>
                        </Button>
                      </div>
                    </div>

                    {currentWeek.learningObjectives && currentWeek.learningObjectives.length > 0 && (
                      <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-1.5 max-w-3xl">
                        <div className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                          Learning Objectives
                        </div>
                        <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-700 space-y-1">
                          {currentWeek.learningObjectives.map((obj, idx) => (
                            <li key={idx}>{obj}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed max-w-3xl">
                      {currentWeek.readingGuide.summary}
                    </div>

                    <div className="space-y-8 max-w-3xl">
                      {currentWeek.readingGuide.sections.map((section, sIdx) => (
                        <div key={sIdx} className="space-y-3">
                          <h4 className="text-base font-bold text-slate-900">{section.heading}</h4>
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{section.body}</p>

                          {section.bullets && section.bullets.length > 0 && (
                            <ul className="space-y-2 pl-5 list-disc text-sm text-slate-700 leading-relaxed">
                              {section.bullets.map((b, bIdx) => (
                                <li key={bIdx}>{b}</li>
                              ))}
                            </ul>
                          )}

                          {section.frameworkItems && section.frameworkItems.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              {section.frameworkItems.map((item, fIdx) => (
                                <div
                                  key={fIdx}
                                  className="p-4 rounded-xl border border-slate-200 bg-white space-y-1"
                                >
                                  <div className="text-xs font-bold text-indigo-700">{item.term}</div>
                                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    {item.detail}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
                      <Button
                        onClick={() => handleToggleStepCompletion('reading')}
                        variant={weekProgress.readingCompleted ? 'outline' : 'default'}
                        className={cn(
                          'whitespace-nowrap shrink-0',
                          weekProgress.readingCompleted
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        )}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {weekProgress.readingCompleted ? 'Marked as Read ✓' : 'Mark as Read'}
                      </Button>

                      <Button
                        variant="ghost"
                        onClick={() => setActiveTab('lecture')}
                        className="text-slate-700 hover:text-slate-900 whitespace-nowrap shrink-0"
                      >
                        <span>Continue to Step 2: Watch Lecture</span>
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* TAB 2: WATCH LECTURE */}
                {activeTab === 'lecture' && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-slate-900">
                        {currentWeek.lecture.title}
                      </h3>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>{currentWeek.lecture.speaker}</span>
                        <span aria-hidden="true">·</span>
                        <span>{currentWeek.lecture.duration}</span>
                      </div>
                    </div>

                    {lectureYoutubeId ? (
                      <div className="space-y-3">
                        <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-950">
                          <iframe
                            src={`https://www.youtube.com/embed/${lectureYoutubeId}`}
                            title={currentWeek.lecture.title}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                          <span>Having trouble with the embedded player?</span>
                          <a
                            href={currentWeek.lecture.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 hover:underline"
                          >
                            <span>Open Lecture on YouTube</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 sm:p-8 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="space-y-2">
                          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                            External Video Lecture · {currentWeek.lecture.speaker}
                          </div>
                          <h4 className="text-lg font-bold text-slate-900">
                            {currentWeek.lecture.title}
                          </h4>
                          <p className="text-sm text-slate-600 max-w-xl leading-relaxed">
                            {currentWeek.lecture.focusNote}
                          </p>
                        </div>
                        {currentWeek.lecture.url && (
                          <a
                            href={currentWeek.lecture.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold whitespace-nowrap shrink-0 transition-colors"
                          >
                            <Play className="w-4 h-4" />
                            <span>Launch Lecture</span>
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    )}

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed">
                      <span className="font-semibold text-slate-900">Listening Focus:</span>{' '}
                      {currentWeek.lecture.focusNote}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
                      <Button
                        onClick={() => handleToggleStepCompletion('lecture')}
                        variant={weekProgress.lectureCompleted ? 'outline' : 'default'}
                        className={cn(
                          'whitespace-nowrap shrink-0',
                          weekProgress.lectureCompleted
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        )}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {weekProgress.lectureCompleted ? 'Marked as Watched ✓' : 'Mark as Watched'}
                      </Button>

                      <Button
                        variant="ghost"
                        onClick={() => setActiveTab('exercise')}
                        className="text-slate-700 hover:text-slate-900 whitespace-nowrap shrink-0"
                      >
                        <span>Continue to Step 3: Practical Exercise</span>
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* TAB 3: PRACTICAL EXERCISE */}
                {activeTab === 'exercise' && (
                  <form onSubmit={handleSubmitExercise} className="space-y-6 max-w-3xl">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-lg font-bold text-slate-900">
                          {currentWeek.practicalExercise.title}
                        </h3>
                        {evalStatus && (
                          <span
                            className={cn(
                              'px-2.5 py-1 rounded-full text-xs font-bold border',
                              evalStatus === 'Approved' || evalStatus === 'Reviewed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : evalStatus === 'Needs Revision'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            )}
                          >
                            Counselor Review: {evalStatus}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-4 leading-relaxed">
                        <span className="font-semibold text-slate-900">Scenario:</span>{' '}
                        {currentWeek.practicalExercise.scenario}
                      </p>
                      {currentWeek.practicalExercise.instructions &&
                        currentWeek.practicalExercise.instructions.length > 0 && (
                          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1.5">
                            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                              Step-by-Step Instructions
                            </div>
                            <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-1">
                              {currentWeek.practicalExercise.instructions.map((step, i) => (
                                <li key={i}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                      {currentWeek.practicalExercise.docUrl && (
                        <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 flex flex-wrap items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold uppercase tracking-wider text-indigo-800">
                              Exercise Reference / Worksheet Document
                            </div>
                            <div className="text-xs text-slate-700">
                              {currentWeek.practicalExercise.docFileName || 'Download companion exercise worksheet'}
                            </div>
                          </div>
                          <a
                            href={currentWeek.practicalExercise.docUrl}
                            download={
                              currentWeek.practicalExercise.docFileName ||
                              `Week-${currentWeek.weekNumber}-Exercise-Doc`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold whitespace-nowrap shrink-0"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>
                              {currentWeek.practicalExercise.docFileName || 'Download Exercise Doc'}
                            </span>
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Counselor Evaluation Feedback Card (when evaluated in Assignment Evaluator) */}
                    {(evalFeedback || evalStatus) && (
                      <div
                        className={cn(
                          'p-4 rounded-xl border space-y-1.5',
                          evalStatus === 'Needs Revision'
                            ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                            : evalStatus === 'Approved' || evalStatus === 'Reviewed'
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                            : 'bg-indigo-50/60 border-indigo-200 text-indigo-950'
                        )}
                      >
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5" />
                            Counselor Evaluation Status: {evalStatus || 'Submitted'}
                          </span>
                          {evalBy && <span className="font-medium normal-case">Reviewed by {evalBy}</span>}
                        </div>
                        {evalFeedback ? (
                          <p className="text-sm leading-relaxed">{evalFeedback}</p>
                        ) : (
                          <p className="text-xs opacity-80">
                            Your exercise is in the Assignment Evaluator queue. Any counselor feedback will appear here and in your Task Manager.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Self-Evaluation Checklist */}
                    {currentWeek.practicalExercise.selfCheckCriteria.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Self-Evaluation Checklist
                        </div>
                        <div className="space-y-2">
                          {currentWeek.practicalExercise.selfCheckCriteria.map((criterion) => {
                            const checked = Boolean(exerciseChecklist[criterion]);
                            return (
                              <label
                                key={criterion}
                                className={cn(
                                  'flex items-center gap-3 p-3 rounded-xl border text-sm cursor-pointer transition-colors',
                                  checked
                                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 font-medium'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    setExerciseChecklist((prev) => ({
                                      ...prev,
                                      [criterion]: !prev[criterion],
                                    }))
                                  }
                                  className="w-4 h-4 rounded accent-emerald-600"
                                />
                                <span>{criterion}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Interactive Worksheet Fields */}
                    <div className="space-y-4">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Worksheet Submission Fields
                      </div>
                      {currentWeek.practicalExercise.fields.map((field) => {
                        const value = exerciseFields[field.key] || '';
                        const wordCount = countWords(value);
                        return (
                          <div key={field.key} className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <label className="text-sm font-semibold text-slate-900">
                                {field.label}
                              </label>
                              {field.showWordCount && (
                                <span className="text-xs font-mono text-slate-500 tabular-nums">
                                  {wordCount} words {field.hint ? `(${field.hint})` : ''}
                                </span>
                              )}
                            </div>
                            {field.type === 'text' ? (
                              <input
                                type="text"
                                value={value}
                                onChange={(e) =>
                                  setExerciseFields((prev) => ({
                                    ...prev,
                                    [field.key]: e.target.value,
                                  }))
                                }
                                placeholder={field.placeholder}
                                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            ) : (
                              <textarea
                                rows={4}
                                value={value}
                                onChange={(e) =>
                                  setExerciseFields((prev) => ({
                                    ...prev,
                                    [field.key]: e.target.value,
                                  }))
                                }
                                placeholder={field.placeholder}
                                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            )}
                          </div>
                        );
                      })}

                      {currentWeek.practicalExercise.allowFileUpload !== false && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-900">
                              Optional Recording or Document Link
                            </label>
                            <input
                              type="url"
                              value={attachmentUrl.startsWith('data:') ? '' : attachmentUrl}
                              onChange={(e) => {
                                setAttachmentUrl(e.target.value);
                                if (!attachmentName) setAttachmentName('External Link');
                              }}
                              placeholder="https://drive.google.com/... or Loom link"
                              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-900">
                              Or Upload Deliverable File (Max 2MB)
                            </label>
                            <label className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs font-medium text-slate-700">
                              <Upload className="w-4 h-4 text-indigo-600 shrink-0" />
                              <span className="truncate">
                                {attachmentName ? attachmentName : 'Choose PDF, DOC, or image...'}
                              </span>
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                                onChange={handleExerciseFileUpload}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    {exerciseValidationError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{exerciseValidationError}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
                      <div className="flex items-center gap-3">
                        <Button
                          type="submit"
                          className="bg-slate-900 hover:bg-slate-800 text-white whitespace-nowrap shrink-0"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          {evalStatus === 'Needs Revision'
                            ? 'Resubmit Updated Exercise'
                            : weekProgress.exerciseCompleted
                            ? 'Resubmit Exercise'
                            : 'Submit Practical Exercise'}
                        </Button>
                        {exerciseSavedNotice && (
                          <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            {evalStatus === 'Needs Revision'
                              ? 'Resubmitted! Sent back to your counselor for review.'
                              : nextWeekObj
                              ? `Submitted! Week ${nextWeekObj.weekNumber} is now unlocked.`
                              : 'Submitted & Sent to Evaluator!'}
                          </span>
                        )}
                      </div>

                      {hasNextWeek && nextWeekObj ? (
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={!weekProgress.exerciseCompleted}
                          title={
                            !weekProgress.exerciseCompleted
                              ? 'Submit this exercise first to unlock the next week'
                              : `Proceed to Week ${nextWeekObj.weekNumber}`
                          }
                          onClick={() => {
                            if (!weekProgress.exerciseCompleted) return;
                            setSelectedWeekNum(nextWeekObj.weekNumber);
                            setActiveTab('guide');
                          }}
                          className="whitespace-nowrap shrink-0"
                        >
                          <span>
                            {weekProgress.exerciseCompleted
                              ? `Next: Week ${nextWeekObj.weekNumber}`
                              : `Submit to Unlock Week ${nextWeekObj.weekNumber}`}
                          </span>
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      ) : (
                        (subjectStats.allWeeksComplete || activeCert) && (
                          <Button
                            type="button"
                            onClick={() => setIsTestMode(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap shrink-0"
                          >
                            <Award className="w-4 h-4 mr-2" />
                            <span>Proceed to Final Certification Test</span>
                          </Button>
                        )
                      )}
                    </div>
                  </form>
                )}
              </div>
            )}
          </section>
        </div>

        {showCertificateModal && activeCert && (
          <CertificateGenerator
            studentName={studentName}
            subjectTitle={activeSubject.title}
            certificateTitle={activeSubject.certificateTitle}
            moduleCount={subjectChapters.length}
            passingThreshold={subjectCertTest.passingThreshold}
            certificateCode={activeCert.certificateCode}
            issuedAt={activeCert.issuedAt}
            testScore={activeCert.testScore}
            onClose={() => setShowCertificateModal(false)}
          />
        )}
      </div>
    );
  }

  // SUBJECT FOLDER CATALOG VIEW (4-COLUMN GRID — ALL SUBJECTS VISIBLE, GAMIFIED FACE, ZERO HOVER TEXT)
  const subjectSummaries = visibleSubjects.map((subject) => ({
    subject,
    summary: getSubjectSummary(subject),
  }));

  const unlockedOrOpenCount = subjectSummaries.filter(({ summary }) => summary.canOpen).length;
  const submittedSubjectsCount = subjectSummaries.filter(
    ({ summary }) => summary.submittedWeeks > 0
  ).length;
  const certifiedCount = subjectSummaries.filter(({ summary }) => Boolean(summary.cert)).length;
  const totalEarnedXP = subjectSummaries.reduce((acc, { summary }) => acc + summary.earnedXP, 0);

  const playerRank =
    totalEarnedXP >= 2500
      ? 'Trailblazer'
      : totalEarnedXP >= 1500
      ? 'Launchpad Fellow'
      : totalEarnedXP >= 800
      ? 'Scholar'
      : totalEarnedXP >= 300
      ? 'Explorer'
      : 'Starter';

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Clean Header with Live Gamification Progression */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Launchpad
          </h1>
          <p className="text-sm text-slate-500">
            Academic, communication, and leadership readiness folders. Complete guides, lectures, and exercises to earn XP and mastery stars.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600 tabular-nums shrink-0">
          <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>{playerRank}</span>
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1 font-semibold text-indigo-700">
            <Zap className="w-3.5 h-3.5 text-indigo-600" />
            <span>{totalEarnedXP.toLocaleString()} XP</span>
          </span>
          <span aria-hidden="true">·</span>
          <span>{unlockedOrOpenCount}/{visibleSubjects.length} Active</span>
          <span aria-hidden="true">·</span>
          <span>{submittedSubjectsCount} Submitted</span>
          <span aria-hidden="true">·</span>
          <span>{certifiedCount} Certified</span>
        </div>
      </div>

      {/* Crisp Gamification Guide & Live Rank Progress */}
      <LaunchpadGamificationGuide
        mode="student"
        totalEarnedXP={totalEarnedXP}
        certifiedCount={certifiedCount}
        totalSubjects={visibleSubjects.length}
      />

      {!isEnrolled && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 flex items-center gap-3">
          <Lock className="w-4 h-4 text-slate-500 shrink-0" />
          <span>
            All Launchpad subject folders are shown below. Folders marked <strong>Locked</strong> will unlock as soon as your counselor releases them to your profile.
          </span>
        </div>
      )}

      {/* Responsive 4-Column Subject Folder Grid (No hover text tooltips) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {subjectSummaries.map(({ subject, summary }) => {
          const {
            chapters,
            totalWeeks,
            submittedWeeks,
            needsRevisionWeek,
            cert,
            canOpen,
            earnedXP,
            maxXP,
            progressPct,
            folderState,
          } = summary;

          const starCount = totalWeeks > 0 ? Math.min(totalWeeks, 6) : 4;
          const barColor =
            folderState === 'certified'
              ? '#059669'
              : folderState === 'needs_revision'
              ? '#E11D48'
              : folderState === 'locked'
              ? '#CBD5E1'
              : subject.accentHex || '#4F46E5';

          return (
            <button
              key={subject.id}
              type="button"
              disabled={!canOpen}
              onClick={() => {
                if (!canOpen) return;
                setActiveSubjectId(subject.id);
                setSelectedWeekNum(
                  needsRevisionWeek?.weekNumber || chapters[0]?.weekNumber || 1
                );
                setActiveTab('guide');
                setIsTestMode(false);
              }}
              className={cn(
                'group relative flex flex-col justify-between text-center rounded-2xl border overflow-hidden min-h-[320px] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                canOpen
                  ? folderState === 'needs_revision'
                    ? 'bg-white border-rose-300 hover:border-rose-400 hover:-translate-y-0.5 hover:shadow-md cursor-pointer'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-md cursor-pointer'
                  : 'bg-slate-50/90 border-slate-200/90 opacity-85 cursor-not-allowed'
              )}
            >
              {/* Top Folder Accent Spine */}
              <div
                className="w-full h-1.5 shrink-0"
                style={{
                  backgroundColor:
                    folderState === 'locked'
                      ? '#CBD5E1'
                      : folderState === 'needs_revision'
                      ? '#E11D48'
                      : folderState === 'certified'
                      ? '#059669'
                      : subject.accentHex || '#4F46E5',
                }}
              />

              <div className="flex-1 w-full flex flex-col items-center justify-between p-5 pt-4 gap-3">
                {/* Top Folder Face Row: Gamified XP + Explicit Status Indicator */}
                <div className="w-full flex items-center justify-between gap-2 text-xs tabular-nums">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 font-semibold',
                      canOpen ? 'text-slate-700' : 'text-slate-400'
                    )}
                  >
                    {cert ? (
                      <Trophy className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Zap
                        className="w-3.5 h-3.5"
                        style={{ color: canOpen ? subject.accentHex || '#4F46E5' : '#94A3B8' }}
                      />
                    )}
                    <span>{earnedXP}</span>
                    <span className="text-slate-400 font-normal">/ {maxXP} XP</span>
                  </span>

                  {folderState === 'locked' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Locked</span>
                    </span>
                  )}
                  {folderState === 'needs_revision' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700">
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Resubmit</span>
                    </span>
                  )}
                  {folderState === 'certified' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                      <Award className="w-3.5 h-3.5" />
                      <span>Certified</span>
                    </span>
                  )}
                  {folderState === 'submitted' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Submitted</span>
                    </span>
                  )}
                  {folderState === 'in_progress' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700">
                      <Play className="w-3.5 h-3.5" />
                      <span>In Progress</span>
                    </span>
                  )}
                  {folderState === 'unlocked' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Ready</span>
                    </span>
                  )}
                </div>

                {/* Folder Icon & Milestone Stars */}
                <div className="flex flex-col items-center justify-center gap-2.5 my-1">
                  <SubjectIllustration
                    subjectId={subject.iconKey || subject.id}
                    customIconUrl={subject.customIconUrl}
                    accentHex={subject.accentHex}
                    isLocked={!canOpen}
                    className={cn(
                      'w-24 h-24 sm:w-28 sm:h-28 transition-transform duration-200',
                      canOpen ? 'group-hover:scale-105' : ''
                    )}
                  />

                  {/* Week Milestone Stars directly on folder face */}
                  <div
                    className="flex items-center justify-center gap-1.5"
                    aria-label={
                      totalWeeks > 0
                        ? `${submittedWeeks} of ${totalWeeks} weekly stars earned`
                        : 'Milestone stars'
                    }
                  >
                    {Array.from({ length: starCount }).map((_, idx) => {
                      const ch = chapters[idx];
                      const wp = ch ? getWeekProgress(subject.id, ch.weekNumber) : null;
                      const evStatus = ch ? getEffectiveEvalStatus(subject.id, ch.weekNumber) : null;
                      const isRevisionStar = evStatus === 'Needs Revision';
                      const isEarnedStar =
                        Boolean(cert) ||
                        Boolean(ch && wp?.exerciseCompleted && !isRevisionStar);

                      return (
                        <Star
                          key={idx}
                          className={cn(
                            'w-4 h-4 transition-colors',
                            !canOpen
                              ? 'text-slate-300'
                              : isRevisionStar
                              ? 'text-rose-500 fill-rose-100'
                              : isEarnedStar
                              ? 'text-amber-500 fill-amber-400'
                              : 'text-slate-300'
                          )}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Subject Title & Folder Mastery Progress Bar */}
                <div className="w-full space-y-2.5">
                  <h2
                    className={cn(
                      'text-base font-bold leading-snug tracking-tight',
                      canOpen ? 'text-slate-900' : 'text-slate-500'
                    )}
                  >
                    {subject.title}
                  </h2>

                  <div className="w-full space-y-1.5">
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${canOpen ? progressPct : 0}%`,
                          backgroundColor: barColor,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-medium tabular-nums">
                      <span
                        className={cn(
                          folderState === 'needs_revision'
                            ? 'text-rose-700 font-semibold'
                            : canOpen
                            ? 'text-slate-500'
                            : 'text-slate-400'
                        )}
                      >
                        {!canOpen
                          ? 'Counselor Locked'
                          : folderState === 'needs_revision' && needsRevisionWeek
                          ? `Revise Week ${needsRevisionWeek.weekNumber}`
                          : totalWeeks > 0
                          ? `${submittedWeeks}/${totalWeeks} Weeks Submitted`
                          : 'Curriculum Coming Soon'}
                      </span>
                      <span
                        className={cn(
                          'font-semibold',
                          folderState === 'certified'
                            ? 'text-emerald-700'
                            : folderState === 'needs_revision'
                            ? 'text-rose-700'
                            : canOpen
                            ? 'text-slate-700'
                            : 'text-slate-400'
                        )}
                      >
                        {cert ? `${cert.testScore}% Score` : `${canOpen ? progressPct : 0}%`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
