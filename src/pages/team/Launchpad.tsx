import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  UserPlus,
  Lock,
  Unlock,
  Award,
  Users,
  BookOpen,
  X,
  CheckCircle2,
  ShieldAlert,
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
  SlidersHorizontal,
  Plus,
  Edit3,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Save,
  FileText,
  Video,
  ClipboardCheck,
  Upload,
  Archive,
  RotateCcw,
  Check,
  Sparkles,
  ExternalLink,
  Download,
  Wand2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useDatabase } from '@/context/DatabaseContext';
import { getFirebaseIdToken } from '@/lib/firebase';
import {
  LaunchpadSubject,
  LaunchpadWeekModule,
  LaunchpadCertQuestionRecord,
  LaunchpadMCQ,
  LaunchpadSituationalPrompt,
  LaunchpadTestDocumentPayload,
  LaunchpadReadingSection,
  LaunchpadExerciseField,
  extractYoutubeId,
} from '@/data/launchpadData';
import {
  SubjectIllustration,
  LAUNCHPAD_ICON_OPTIONS,
} from '@/components/launchpad/SubjectIllustration';
import { LaunchpadGamificationGuide } from '@/components/launchpad/LaunchpadGamificationGuide';
import {
  getStaffLaunchpadPermissions,
  isStudentAssignedToStaff,
} from '@/lib/staffPermissions';
import { Student } from '@/types';

const ACCENT_PRESETS = [
  { accentHex: '#4F46E5', surfaceTint: '#EEF2FF', label: 'Indigo' },
  { accentHex: '#0284C7', surfaceTint: '#F0F9FF', label: 'Sky' },
  { accentHex: '#0D9488', surfaceTint: '#F0FDFA', label: 'Teal' },
  { accentHex: '#D97706', surfaceTint: '#FFFBEB', label: 'Amber' },
  { accentHex: '#E11D48', surfaceTint: '#FFF1F2', label: 'Rose' },
  { accentHex: '#059669', surfaceTint: '#ECFDF5', label: 'Emerald' },
  { accentHex: '#7C3AED', surfaceTint: '#F5F3FF', label: 'Violet' },
  { accentHex: '#2563EB', surfaceTint: '#EFF6FF', label: 'Blue' },
];

export default function TeamLaunchpad() {
  const {
    students,
    batches,
    currentUser,
    permissionsMatrix,
    launchpadPermissions,
    launchpadSubjects,
    saveLaunchpadSubject,
    deleteLaunchpadSubject,
    launchpadChapters,
    saveLaunchpadChapter,
    reorderLaunchpadChapters,
    deleteLaunchpadChapter,
    launchpadCertQuestions,
    saveLaunchpadCertQuestion,
    deleteLaunchpadCertQuestion,
    launchpadEnrollments,
    assignStudentsToLaunchpad,
    removeStudentFromLaunchpad,
    launchpadSubjectReleases,
    toggleLaunchpadSubjectRelease,
    launchpadProgress,
    launchpadCertifications,
  } = useDatabase();

  const { studentTabAccess, editCurriculumAccess } = useMemo(
    () => getStaffLaunchpadPermissions(currentUser, launchpadPermissions, permissionsMatrix),
    [currentUser, launchpadPermissions, permissionsMatrix]
  );

  const hasStudentTabAccess = studentTabAccess !== 'none';
  const hasEditTabAccess = editCurriculumAccess !== 'none';
  const isRosterReadOnly = studentTabAccess === 'read_only' || studentTabAccess === 'none';
  const isCurriculumReadOnly = editCurriculumAccess === 'read_only';

  const [activeMode, setActiveMode] = useState<'enrollment' | 'curriculum'>(
    hasStudentTabAccess ? 'enrollment' : 'curriculum'
  );

  useEffect(() => {
    if (!hasStudentTabAccess && hasEditTabAccess) {
      setActiveMode('curriculum');
    } else if (hasStudentTabAccess && !hasEditTabAccess) {
      setActiveMode('enrollment');
    }
  }, [hasStudentTabAccess, hasEditTabAccess]);

  // Enrollment & Release Management State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'certified' | 'none_unlocked'>('all');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [selectedToAssign, setSelectedToAssign] = useState<string[]>([]);
  const [drawerStudent, setDrawerStudent] = useState<Student | null>(null);
  const [drawerInspectSubjectId, setDrawerInspectSubjectId] = useState<string>('comm-public-speaking');
  const [expandedWeekSubmission, setExpandedWeekSubmission] = useState<number | null>(null);

  // Curriculum Builder State
  const sortedSubjects = useMemo(
    () => [...launchpadSubjects].sort((a, b) => a.order - b.order),
    [launchpadSubjects]
  );
  const activeSubjects = useMemo(
    () => sortedSubjects.filter((s) => !s.isArchived),
    [sortedSubjects]
  );

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    () => sortedSubjects[0]?.id || 'comm-public-speaking'
  );
  const [curriculumSubTab, setCurriculumSubTab] = useState<'chapters' | 'certification'>('chapters');

  useEffect(() => {
    if (sortedSubjects.length > 0 && !sortedSubjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId(sortedSubjects[0].id);
    }
  }, [sortedSubjects, selectedSubjectId]);

  const selectedSubject = useMemo(
    () => sortedSubjects.find((s) => s.id === selectedSubjectId) || sortedSubjects[0],
    [sortedSubjects, selectedSubjectId]
  );

  const getChaptersForSubject = (subjectId: string) =>
    [...launchpadChapters]
      .filter((c) => (c.subjectId || 'comm-public-speaking') === subjectId)
      .sort((a, b) => a.weekNumber - b.weekNumber);

  const selectedSubjectChapters = useMemo(
    () => (selectedSubject ? getChaptersForSubject(selectedSubject.id) : []),
    [launchpadChapters, selectedSubject]
  );

  // Subject Modal State
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubjectDraft, setEditingSubjectDraft] = useState<LaunchpadSubject | null>(null);
  const [confirmDeleteSubjectId, setConfirmDeleteSubjectId] = useState<string | null>(null);
  const [builderToast, setBuilderToast] = useState<string | null>(null);

  // Chapter Editor State
  const [editingChapterDraft, setEditingChapterDraft] = useState<LaunchpadWeekModule | null>(null);
  const [confirmDeleteChapterId, setConfirmDeleteChapterId] = useState<string | null>(null);
  const [isParsingChapterDoc, setIsParsingChapterDoc] = useState(false);
  const [chapterDocParseStatus, setChapterDocParseStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showAgreedFormatHelp, setShowAgreedFormatHelp] = useState(false);
  const [attachImportedDocToGuide, setAttachImportedDocToGuide] = useState(false);

  // Certification Builder State
  const [certThresholdInput, setCertThresholdInput] = useState<number>(75);
  const [certTitleInput, setCertTitleInput] = useState<string>('');
  const [editingMcqDraft, setEditingMcqDraft] = useState<{ id?: string; sortOrder: number; payload: LaunchpadMCQ } | null>(null);
  const [editingSituationalDraft, setEditingSituationalDraft] = useState<{
    id?: string;
    sortOrder: number;
    payload: LaunchpadSituationalPrompt;
    keywordsText: string;
  } | null>(null);
  const [confirmDeleteCertQId, setConfirmDeleteCertQId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedSubject) {
      setCertThresholdInput(selectedSubject.passingThreshold ?? 75);
      setCertTitleInput(
        selectedSubject.certificateTitle || `Launchpad Certified — ${selectedSubject.title}`
      );
      setEditingChapterDraft(null);
      setChapterDocParseStatus(null);
      setEditingMcqDraft(null);
      setEditingSituationalDraft(null);
    }
  }, [selectedSubject?.id]);

  const showToast = (msg: string) => {
    setBuilderToast(msg);
    setTimeout(() => setBuilderToast(null), 3000);
  };

  // Scoped students the current team member is permitted to view/manage
  const scopedStudents = useMemo(() => {
    if (!hasStudentTabAccess) return [];
    if (studentTabAccess === 'global' || studentTabAccess === 'read_only') {
      return students;
    }
    return students.filter((s) =>
      isStudentAssignedToStaff(s, currentUser, permissionsMatrix, batches)
    );
  }, [students, batches, studentTabAccess, hasStudentTabAccess, currentUser, permissionsMatrix]);

  const enrolledIdsSet = useMemo(() => {
    const set = new Set<string>();
    const enrolledEmails = new Set<string>();
    launchpadEnrollments.forEach((e) => {
      if (e.studentId) set.add(e.studentId);
      if (e.studentEmail) enrolledEmails.add(e.studentEmail.trim().toLowerCase());
    });
    launchpadSubjectReleases.forEach((r) => {
      if (r.isUnlocked) {
        if (r.studentId) set.add(r.studentId);
        if (r.studentEmail) enrolledEmails.add(r.studentEmail.trim().toLowerCase());
      }
    });
    if (enrolledEmails.size > 0) {
      students.forEach((s) => {
        const em = (s.email || '').trim().toLowerCase();
        if (em && enrolledEmails.has(em)) set.add(s.id);
      });
    }
    return set;
  }, [launchpadEnrollments, launchpadSubjectReleases, students]);

  const enrolledScopedStudents = useMemo(
    () => scopedStudents.filter((s) => enrolledIdsSet.has(s.id)),
    [scopedStudents, enrolledIdsSet]
  );

  const assignableStudents = useMemo(() => {
    if (isRosterReadOnly) return [];
    return scopedStudents.filter((s) => !enrolledIdsSet.has(s.id));
  }, [scopedStudents, enrolledIdsSet, isRosterReadOnly]);

  const safeLaunchpadProgress = Array.isArray(launchpadProgress) ? launchpadProgress : [];
  const safeLaunchpadSubjectReleases = Array.isArray(launchpadSubjectReleases) ? launchpadSubjectReleases : [];
  const safeLaunchpadCertifications = Array.isArray(launchpadCertifications) ? launchpadCertifications : [];

  const isSubjectUnlockedForStudentObj = (student: Student | undefined, subjectId: string): boolean => {
    if (!student) return false;
    const cleanEm = (student.email || '').trim().toLowerCase();
    const matching = safeLaunchpadSubjectReleases.filter(
      (r) =>
        r.subjectId === subjectId &&
        (r.studentId === student.id ||
          (cleanEm && (r.studentEmail || '').trim().toLowerCase() === cleanEm))
    );
    if (matching.length === 0) return false;
    const sorted = [...matching].sort((a, b) => {
      const tB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
      const tA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
      return (Number.isFinite(tB) ? tB : 0) - (Number.isFinite(tA) ? tA : 0);
    });
    return Boolean(sorted[0]?.isUnlocked);
  };

  const getStudentReleases = (studentId: string) => {
    const stu = students.find((s) => s.id === studentId);
    if (!stu) {
      return safeLaunchpadSubjectReleases.filter((r) => r.studentId === studentId && r.isUnlocked);
    }
    return activeSubjects.filter((subj) => isSubjectUnlockedForStudentObj(stu, subj.id));
  };

  const getSubjectWeeksDone = (studentId: string, subjectId: string) => {
    const chs = getChaptersForSubject(subjectId);
    let done = 0;
    chs.forEach((w) => {
      const wp = safeLaunchpadProgress.find(
        (p) =>
          p.studentId === studentId &&
          p.subjectId === subjectId &&
          p.weekNumber === w.weekNumber
      );
      if (wp && (wp.exerciseCompleted || (wp.lectureCompleted && wp.readingCompleted))) {
        done++;
      }
    });
    return { done, total: chs.length };
  };

  const getStudentCerts = (studentId: string) =>
    safeLaunchpadCertifications.filter((c) => c.studentId === studentId && c.passed);

  // KPI Metrics
  const kpis = useMemo(() => {
    const totalAssigned = enrolledScopedStudents.length;
    let activeLearners = 0;
    let certificationsEarned = 0;

    enrolledScopedStudents.forEach((s) => {
      const unlocked = getStudentReleases(s.id).length;
      const hasProgress = safeLaunchpadProgress.some(
        (p) =>
          p.studentId === s.id &&
          (p.lectureCompleted || p.readingCompleted || p.exerciseCompleted)
      );
      if (unlocked > 0 || hasProgress) activeLearners++;
      certificationsEarned += getStudentCerts(s.id).length;
    });

    return { totalAssigned, activeLearners, certificationsEarned };
  }, [enrolledScopedStudents, safeLaunchpadSubjectReleases, safeLaunchpadProgress, safeLaunchpadCertifications]);

  // Filtered roster
  const filteredRoster = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return enrolledScopedStudents.filter((s) => {
      const matchesSearch =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.counselor?.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      const unlockedCount = getStudentReleases(s.id).length;
      const certsCount = getStudentCerts(s.id).length;
      if (statusFilter === 'unlocked') return unlockedCount > 0;
      if (statusFilter === 'certified') return certsCount > 0;
      if (statusFilter === 'none_unlocked') return unlockedCount === 0;
      return true;
    });
  }, [enrolledScopedStudents, searchQuery, statusFilter, launchpadSubjectReleases, launchpadCertifications]);

  const filteredAssignable = useMemo(() => {
    const q = assignSearch.toLowerCase().trim();
    return assignableStudents.filter(
      (s) =>
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.intake?.toLowerCase().includes(q)
    );
  }, [assignableStudents, assignSearch]);

  if (!hasStudentTabAccess && !hasEditTabAccess) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-4">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-500">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Launchpad Access Not Enabled</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Your role currently has <strong>No Access</strong> to the Launchpad module. Contact a System Administrator to adjust your Launchpad permission scope inside Admin Settings &rarr; Access &amp; Permissions.
        </p>
      </div>
    );
  }

  const handleConfirmAssign = () => {
    if (isRosterReadOnly || selectedToAssign.length === 0) return;
    assignStudentsToLaunchpad(selectedToAssign, currentUser?.name || 'Team Member');
    setSelectedToAssign([]);
    setAssignSearch('');
    setIsAssignModalOpen(false);
  };

  // --- Curriculum Builder Handlers ---
  const openCreateSubjectModal = () => {
    if (isCurriculumReadOnly) return;
    const nextOrder = sortedSubjects.length > 0 ? Math.max(...sortedSubjects.map((s) => s.order)) + 1 : 1;
    const preset = ACCENT_PRESETS[(nextOrder - 1) % ACCENT_PRESETS.length];
    const tempId = `subj_${Date.now()}`;
    setEditingSubjectDraft({
      id: tempId,
      order: nextOrder,
      title: '',
      description: '',
      courseGoal: '',
      accentHex: preset.accentHex,
      surfaceTint: preset.surfaceTint,
      iconKey: 'comm-public-speaking',
      customIconUrl: '',
      hasCurriculum: false,
      passingThreshold: 75,
      certificateTitle: '',
      isArchived: false,
    });
    setIsSubjectModalOpen(true);
  };

  const openEditSubjectModal = (subject: LaunchpadSubject) => {
    if (isCurriculumReadOnly) return;
    setEditingSubjectDraft({
      ...subject,
      iconKey: subject.iconKey || subject.id,
      passingThreshold: subject.passingThreshold ?? 75,
      certificateTitle: subject.certificateTitle || `Launchpad Certified — ${subject.title}`,
    });
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubjectDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCurriculumReadOnly || !editingSubjectDraft || !editingSubjectDraft.title.trim()) return;
    const cleanTitle = editingSubjectDraft.title.trim();
    const cleanSlug =
      editingSubjectDraft.id.startsWith('subj_')
        ? `${cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32)}-${Date.now().toString(36)}`
        : editingSubjectDraft.id;

    const toSave: LaunchpadSubject = {
      ...editingSubjectDraft,
      id: cleanSlug,
      title: cleanTitle,
      description: editingSubjectDraft.description.trim(),
      courseGoal: editingSubjectDraft.courseGoal?.trim() || '',
      certificateTitle:
        editingSubjectDraft.certificateTitle?.trim() || `Launchpad Certified — ${cleanTitle}`,
      hasCurriculum:
        editingSubjectDraft.hasCurriculum || getChaptersForSubject(cleanSlug).length > 0,
    };

    saveLaunchpadSubject(toSave);
    setSelectedSubjectId(toSave.id);
    setIsSubjectModalOpen(false);
    setEditingSubjectDraft(null);
    showToast(`Saved subject "${toSave.title}"`);
  };

  const handleCustomIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingSubjectDraft) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditingSubjectDraft({ ...editingSubjectDraft, customIconUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const openNewChapterEditor = () => {
    if (isCurriculumReadOnly || !selectedSubject) return;
    const nextWeek =
      selectedSubjectChapters.length > 0
        ? Math.max(...selectedSubjectChapters.map((c) => c.weekNumber)) + 1
        : 1;
    setEditingChapterDraft({
      id: `${selectedSubject.id}__w${nextWeek}__${Date.now()}`,
      subjectId: selectedSubject.id,
      weekNumber: nextWeek,
      title: '',
      learningObjectives: [''],
      lecture: {
        title: '',
        speaker: '',
        url: '',
        youtubeId: '',
        duration: '15 min',
        focusNote: '',
      },
      readingGuide: {
        title: '',
        readTime: '8 min read',
        summary: '',
        pdfUrl: '',
        pdfFileName: '',
        sections: [
          {
            heading: 'Core Framework',
            body: '',
            bullets: [''],
          },
        ],
      },
      practicalExercise: {
        title: '',
        scenario: '',
        instructions: [''],
        docUrl: '',
        docFileName: '',
        allowFileUpload: true,
        selfCheckCriteria: ['I clearly structured my response and verified clarity.'],
        fields: [
          {
            key: 'response_main',
            label: 'Primary Worksheet Response',
            placeholder: 'Write your structured response here...',
            type: 'textarea',
            showWordCount: true,
          },
        ],
      },
    });
  };

  const openEditChapterEditor = (chapter: LaunchpadWeekModule) => {
    setEditingChapterDraft(JSON.parse(JSON.stringify(chapter)));
  };

  const handleSaveChapterDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCurriculumReadOnly || !editingChapterDraft || !editingChapterDraft.title.trim()) return;

    const cleanLectureUrl = editingChapterDraft.lecture.url.trim();
    const detectedYt = extractYoutubeId(cleanLectureUrl);

    const cleaned: LaunchpadWeekModule = {
      ...editingChapterDraft,
      subjectId: selectedSubject.id,
      title: editingChapterDraft.title.trim(),
      learningObjectives: (editingChapterDraft.learningObjectives || [])
        .map((o) => o.trim())
        .filter(Boolean),
      lecture: {
        ...editingChapterDraft.lecture,
        url: cleanLectureUrl,
        youtubeId: detectedYt || editingChapterDraft.lecture.youtubeId || undefined,
      },
      readingGuide: {
        ...editingChapterDraft.readingGuide,
        sections: (editingChapterDraft.readingGuide.sections || [])
          .filter((sec) => sec.heading.trim() || sec.body.trim())
          .map((sec) => ({
            ...sec,
            bullets: (sec.bullets || []).map((b) => b.trim()).filter(Boolean),
          })),
      },
      practicalExercise: {
        ...editingChapterDraft.practicalExercise,
        instructions: (editingChapterDraft.practicalExercise.instructions || [])
          .map((ins) => ins.trim())
          .filter(Boolean),
        selfCheckCriteria: (editingChapterDraft.practicalExercise.selfCheckCriteria || [])
          .map((sc) => sc.trim())
          .filter(Boolean),
        fields: (editingChapterDraft.practicalExercise.fields || []).filter((f) =>
          f.label.trim()
        ).map((f, idx) => ({
          ...f,
          key: f.key.trim() || `field_${idx + 1}`,
          label: f.label.trim(),
        })),
      },
    };

    saveLaunchpadChapter(cleaned);
    setEditingChapterDraft(null);
    showToast(`Saved Week ${cleaned.weekNumber}: "${cleaned.title}"`);
  };

  const handleMoveChapter = (chapterIndex: number, direction: -1 | 1) => {
    if (isCurriculumReadOnly || !selectedSubject) return;
    const targetIndex = chapterIndex + direction;
    if (targetIndex < 0 || targetIndex >= selectedSubjectChapters.length) return;
    const reordered = [...selectedSubjectChapters];
    const [moved] = reordered.splice(chapterIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    const orderedIds = reordered.map(
      (c) => c.id || `${selectedSubject.id}__w${c.weekNumber}`
    );
    reorderLaunchpadChapters(selectedSubject.id, orderedIds);
    showToast('Updated syllabus week order');
  };

  const handleGuidePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingChapterDraft) return;
    if (file.size > 4 * 1024 * 1024) {
      showToast('File must be under 4 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditingChapterDraft({
          ...editingChapterDraft,
          readingGuide: {
            ...editingChapterDraft.readingGuide,
            pdfUrl: reader.result,
            pdfFileName: file.name,
          },
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExerciseDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingChapterDraft) return;
    if (file.size > 4 * 1024 * 1024) {
      showToast('Exercise document must be under 4 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditingChapterDraft({
          ...editingChapterDraft,
          practicalExercise: {
            ...editingChapterDraft.practicalExercise,
            docUrl: reader.result,
            docFileName: file.name,
          },
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadAgreedChapterTemplate = () => {
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Launchpad Chapter Agreed Format Template</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; line-height: 1.5; color: #1e293b; max-width: 780px; margin: 24px auto; }
  h2 { color: #312e81; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 22px; }
  p { margin: 5px 0; }
  .note { background: #eef2ff; border-left: 4px solid #4f46e5; padding: 10px 14px; font-size: 13px; margin-bottom: 18px; }
</style>
</head>
<body>
<div class="note">
  <strong>Launchpad Chapter Agreed Format:</strong> Fill in your chapter details below while keeping the uppercase labels (e.g. <code>CHAPTER TITLE:</code>, <code>[READ GUIDE]</code>, <code>[WATCH LECTURE]</code>, <code>[PRACTICAL EXERCISE]</code>). Save as <strong>.docx</strong>, <strong>.doc</strong>, <strong>.pdf</strong>, or <strong>.txt</strong> and click <em>Upload &amp; Auto-Fill</em> inside Launchpad.
</div>

<p><strong>CHAPTER TITLE:</strong> Foundations of Structured Storytelling</p>
<p><strong>WEEK NUMBER:</strong> 1</p>
<p><strong>LEARNING OBJECTIVES:</strong></p>
<p>- Structure any personal or academic story using a clear narrative arc.</p>
<p>- Identify concrete turning points and measurable outcomes.</p>

<h2>[READ GUIDE]</h2>
<p><strong>GUIDE TITLE:</strong> Structuring High-Impact Narratives</p>
<p><strong>READ TIME:</strong> 8 min read</p>
<p><strong>SUMMARY:</strong> Learn how strong communicators move beyond chronological lists into focused, insight-driven storytelling.</p>
<p><strong>SECTION:</strong> The Three-Part Narrative Arc</p>
<p><strong>BODY:</strong> Strong essays and presentations anchor on a specific tension point before explaining actions taken and lasting change.</p>
<p><strong>BULLETS:</strong></p>
<p>- Open with a grounded decision or observation rather than generic background.</p>
<p>- Spend most space on choices, trade-offs, and concrete evidence.</p>
<p>- Close with a forward-looking takeaway tied to your goals.</p>
<p><strong>SECTION:</strong> Avoiding Common Pitfalls</p>
<p><strong>BODY:</strong> Replace broad adjectives with observable actions, numbers, and dialogue moments so admissions officers and mentors remember your work.</p>
<p><strong>BULLETS:</strong></p>
<p>- Show rather than tell by naming real tools, steps, and stakeholders.</p>
<p>- Cut throat-clearing intros and get directly to the core challenge.</p>

<h2>[WATCH LECTURE]</h2>
<p><strong>LECTURE TITLE:</strong> How Great Storytellers Hook Their Audience</p>
<p><strong>SPEAKER:</strong> Uppseekers Faculty</p>
<p><strong>VIDEO URL:</strong> https://www.youtube.com/watch?v=dQw4w9WgXcQ</p>
<p><strong>DURATION:</strong> 14 min</p>
<p><strong>FOCUS NOTE:</strong> Pay attention to how the speaker narrows a broad experience down to one pivotal two-minute scene.</p>

<h2>[PRACTICAL EXERCISE]</h2>
<p><strong>EXERCISE TITLE:</strong> Rewrite Your Core Origin Story</p>
<p><strong>SCENARIO:</strong> You are pitching your flagship leadership project to a university interview panel in under three minutes.</p>
<p><strong>INSTRUCTIONS:</strong></p>
<p>- Write a 2-sentence hook describing the exact moment the problem became personal.</p>
<p>- List three specific decisions you made and their measurable results.</p>
<p>- Reflect on what changed in how you approach teamwork afterward.</p>
<p><strong>SELF CHECK:</strong></p>
<p>- My hook starts inside a concrete scene or turning point.</p>
<p>- Every claim is supported by an action or measurable outcome.</p>
<p><strong>WORKSHEET FIELDS:</strong></p>
<p>- Core Turning Point Hook | Describe the pivotal moment in 2-3 sentences... | textarea | wordcount</p>
<p>- Key Actions &amp; Outcomes | Summarize your 3 main actions and results... | textarea | wordcount</p>
<p>- One-Line Takeaway | Distill your main insight into one crisp sentence | text</p>
<p><strong>ALLOW FILE UPLOAD:</strong> Yes</p>
</body>
</html>`;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Launchpad_Chapter_Agreed_Template.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Downloaded agreed chapter format template (.doc)');
  };

  const handleAutoFillChapterFromDoc = async (
    e: React.ChangeEvent<HTMLInputElement>,
    createNewIfMissing = false
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedSubject || isCurriculumReadOnly) return;

    if (file.size > 6 * 1024 * 1024) {
      const msg = 'Document must be under 6 MB for automatic chapter extraction.';
      setChapterDocParseStatus({ type: 'error', message: msg });
      showToast(msg);
      return;
    }

    setIsParsingChapterDoc(true);
    setChapterDocParseStatus(null);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') resolve(reader.result);
          else reject(new Error('Could not read uploaded file.'));
        };
        reader.onerror = () => reject(new Error('Failed to read file contents.'));
        reader.readAsDataURL(file);
      });

      const token = await getFirebaseIdToken();

      const res = await fetch('/api/launchpad/parse-chapter-doc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          base64Data: dataUrl,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.chapter) {
        const errMsg =
          data?.error || 'Could not extract Launchpad chapter content from this document.';
        setChapterDocParseStatus({ type: 'error', message: errMsg });
        showToast(errMsg);
        return;
      }

      const parsed = data.chapter;
      const existingDraft = !createNewIfMissing ? editingChapterDraft : null;
      const nextWeek =
        Number(parsed.weekNumber) > 0
          ? Number(parsed.weekNumber)
          : existingDraft?.weekNumber ||
            (selectedSubjectChapters.length > 0
              ? Math.max(...selectedSubjectChapters.map((c) => c.weekNumber)) + 1
              : 1);

      const cleanLectureUrl = String(parsed.lecture?.url || '').trim();
      const detectedYoutube = parsed.lecture?.youtubeId || extractYoutubeId(cleanLectureUrl);

      const parsedSections: LaunchpadReadingSection[] =
        Array.isArray(parsed.readingGuide?.sections) && parsed.readingGuide.sections.length > 0
          ? parsed.readingGuide.sections.map((s: any) => ({
              heading: String(s.heading || 'Core Framework'),
              body: String(s.body || ''),
              bullets:
                Array.isArray(s.bullets) && s.bullets.length > 0
                  ? s.bullets.map((b: any) => String(b))
                  : [''],
            }))
          : [
              {
                heading: 'Core Framework',
                body: '',
                bullets: [''],
              },
            ];

      const parsedFields: LaunchpadExerciseField[] =
        Array.isArray(parsed.practicalExercise?.fields) && parsed.practicalExercise.fields.length > 0
          ? parsed.practicalExercise.fields.map((f: any, idx: number) => ({
              key: String(f.key || `field_${idx + 1}`),
              label: String(f.label || `Worksheet Field ${idx + 1}`),
              placeholder: String(f.placeholder || 'Write your structured response here...'),
              type: f.type === 'text' ? 'text' : 'textarea',
              showWordCount: f.showWordCount !== false,
            }))
          : [
              {
                key: 'response_main',
                label: 'Primary Worksheet Response',
                placeholder: 'Write your structured response here...',
                type: 'textarea',
                showWordCount: true,
              },
            ];

      const parsedObjectives: string[] =
        Array.isArray(parsed.learningObjectives) && parsed.learningObjectives.length > 0
          ? parsed.learningObjectives.map((o: any) => String(o)).filter(Boolean)
          : [''];

      const parsedInstructions: string[] =
        Array.isArray(parsed.practicalExercise?.instructions) &&
        parsed.practicalExercise.instructions.length > 0
          ? parsed.practicalExercise.instructions.map((ins: any) => String(ins)).filter(Boolean)
          : [''];

      const parsedSelfCheck: string[] =
        Array.isArray(parsed.practicalExercise?.selfCheckCriteria) &&
        parsed.practicalExercise.selfCheckCriteria.length > 0
          ? parsed.practicalExercise.selfCheckCriteria.map((sc: any) => String(sc)).filter(Boolean)
          : ['I clearly structured my response and verified all instructions.'];

      const populatedDraft: LaunchpadWeekModule = {
        id: existingDraft?.id || `${selectedSubject.id}__w${nextWeek}__${Date.now()}`,
        subjectId: selectedSubject.id,
        weekNumber: nextWeek,
        title: String(parsed.title || existingDraft?.title || file.name.replace(/\.[^.]+$/, '')),
        learningObjectives: parsedObjectives.length > 0 ? parsedObjectives : [''],
        readingGuide: {
          title: String(parsed.readingGuide?.title || parsed.title || ''),
          readTime: String(parsed.readingGuide?.readTime || '8 min read'),
          summary: String(parsed.readingGuide?.summary || ''),
          pdfUrl: attachImportedDocToGuide
            ? dataUrl
            : existingDraft?.readingGuide?.pdfUrl || '',
          pdfFileName: attachImportedDocToGuide
            ? file.name
            : existingDraft?.readingGuide?.pdfFileName || '',
          sections: parsedSections,
        },
        lecture: {
          title: String(parsed.lecture?.title || parsed.title || ''),
          speaker: String(parsed.lecture?.speaker || ''),
          url: cleanLectureUrl,
          youtubeId: detectedYoutube || '',
          duration: String(parsed.lecture?.duration || '15 min'),
          focusNote: String(parsed.lecture?.focusNote || ''),
        },
        practicalExercise: {
          title: String(parsed.practicalExercise?.title || ''),
          scenario: String(parsed.practicalExercise?.scenario || ''),
          instructions: parsedInstructions.length > 0 ? parsedInstructions : [''],
          docUrl: existingDraft?.practicalExercise?.docUrl || '',
          docFileName: existingDraft?.practicalExercise?.docFileName || '',
          allowFileUpload: parsed.practicalExercise?.allowFileUpload !== false,
          selfCheckCriteria: parsedSelfCheck,
          fields: parsedFields,
        },
      };

      setEditingChapterDraft(populatedDraft);

      const modeLabel =
        data.mode === 'agreed_template'
          ? 'Matched Agreed Format template directly'
          : 'Extracted via AI document parser';
      const summaryMsg = `${modeLabel} from "${file.name}": ${parsedSections.length} Read Guide section(s), Lecture metadata, and ${parsedFields.length} Exercise field(s) populated. Review below and click Save Chapter.`;

      setChapterDocParseStatus({ type: 'success', message: summaryMsg });
      showToast(`Auto-filled chapter from "${file.name}"`);
    } catch (err: any) {
      const msg = err?.message || 'Unexpected error while extracting chapter document.';
      setChapterDocParseStatus({ type: 'error', message: msg });
      showToast(msg);
    } finally {
      setIsParsingChapterDoc(false);
    }
  };

  // Certification Questions & Companion Test Doc for Selected Subject
  const subjectCertMcqs = useMemo(() => {
    if (!selectedSubject) return [];
    return launchpadCertQuestions
      .filter((q) => q.subjectId === selectedSubject.id && q.questionType === 'mcq')
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [launchpadCertQuestions, selectedSubject]);

  const subjectCertSituational = useMemo(() => {
    if (!selectedSubject) return [];
    return launchpadCertQuestions
      .filter((q) => q.subjectId === selectedSubject.id && q.questionType === 'situational')
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [launchpadCertQuestions, selectedSubject]);

  const subjectCertDocRecord = useMemo(() => {
    if (!selectedSubject) return null;
    return (
      launchpadCertQuestions.find(
        (q) => q.subjectId === selectedSubject.id && q.questionType === 'test_doc'
      ) || null
    );
  }, [launchpadCertQuestions, selectedSubject]);

  const subjectCertDocPayload = subjectCertDocRecord
    ? (subjectCertDocRecord.payload as LaunchpadTestDocumentPayload)
    : null;

  const handleCertTestDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSubject || isCurriculumReadOnly) return;
    if (file.size > 4 * 1024 * 1024) {
      showToast('Test document must be under 4 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const docId = subjectCertDocRecord?.id || `${selectedSubject.id}__test_doc`;
        saveLaunchpadCertQuestion({
          id: docId,
          subjectId: selectedSubject.id,
          questionType: 'test_doc',
          sortOrder: 0,
          payload: {
            id: docId,
            subjectId: selectedSubject.id,
            docUrl: reader.result,
            docFileName: file.name,
            instructions: subjectCertDocPayload?.instructions || '',
            allowStudentUpload: subjectCertDocPayload?.allowStudentUpload ?? true,
          },
        });
        showToast(`Attached test document "${file.name}"`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateCertTestDocMeta = (patch: Partial<LaunchpadTestDocumentPayload>) => {
    if (!selectedSubject || isCurriculumReadOnly) return;
    const docId = subjectCertDocRecord?.id || `${selectedSubject.id}__test_doc`;
    saveLaunchpadCertQuestion({
      id: docId,
      subjectId: selectedSubject.id,
      questionType: 'test_doc',
      sortOrder: 0,
      payload: {
        id: docId,
        subjectId: selectedSubject.id,
        docUrl: subjectCertDocPayload?.docUrl || '',
        docFileName: subjectCertDocPayload?.docFileName || '',
        instructions: subjectCertDocPayload?.instructions || '',
        allowStudentUpload: subjectCertDocPayload?.allowStudentUpload ?? false,
        ...patch,
      },
    });
  };

  const handleSaveCertSettings = () => {
    if (isCurriculumReadOnly || !selectedSubject) return;
    saveLaunchpadSubject({
      ...selectedSubject,
      passingThreshold: Math.min(100, Math.max(10, Number(certThresholdInput) || 75)),
      certificateTitle:
        certTitleInput.trim() || `Launchpad Certified — ${selectedSubject.title}`,
    });
    showToast('Certification settings saved');
  };

  const handleSaveMcq = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCurriculumReadOnly || !selectedSubject || !editingMcqDraft) return;
    if (!editingMcqDraft.payload.question.trim()) return;
    const qId = editingMcqDraft.id || `${selectedSubject.id}__mcq_${Date.now()}`;
    const record: LaunchpadCertQuestionRecord = {
      id: qId,
      subjectId: selectedSubject.id,
      questionType: 'mcq',
      sortOrder: editingMcqDraft.sortOrder,
      payload: {
        ...editingMcqDraft.payload,
        id: qId,
        subjectId: selectedSubject.id,
        sortOrder: editingMcqDraft.sortOrder,
      },
    };
    saveLaunchpadCertQuestion(record);
    setEditingMcqDraft(null);
    showToast('Saved MCQ question');
  };

  const handleSaveSituational = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCurriculumReadOnly || !selectedSubject || !editingSituationalDraft) return;
    if (!editingSituationalDraft.payload.prompt.trim()) return;
    const qId = editingSituationalDraft.id || `${selectedSubject.id}__sit_${Date.now()}`;
    const keywords = editingSituationalDraft.keywordsText
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const record: LaunchpadCertQuestionRecord = {
      id: qId,
      subjectId: selectedSubject.id,
      questionType: 'situational',
      sortOrder: editingSituationalDraft.sortOrder,
      payload: {
        ...editingSituationalDraft.payload,
        id: qId,
        subjectId: selectedSubject.id,
        sortOrder: editingSituationalDraft.sortOrder,
        rubricKeywords: keywords,
      },
    };
    saveLaunchpadCertQuestion(record);
    setEditingSituationalDraft(null);
    showToast('Saved situational prompt');
  };

  const subjectsWithChapters = sortedSubjects.filter(
    (s) => getChaptersForSubject(s.id).length > 0
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Toast */}
      {builderToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{builderToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Launchpad Management
            </h1>
            <span className="text-xs font-medium text-slate-500">
              {activeMode === 'curriculum'
                ? isCurriculumReadOnly
                  ? 'Curriculum View (Read-Only)'
                  : 'Curriculum & Subject Builder'
                : studentTabAccess === 'global'
                ? 'Global Scope'
                : studentTabAccess === 'assigned'
                ? 'Assigned Students Scope'
                : 'Read-Only Access'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {activeMode === 'curriculum'
              ? 'Create subjects, build week-by-week guides, lectures & practical exercises, and configure certification assessments.'
              : 'Enroll students into Launchpad and manage per-subject unlock controls across readiness tracks.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {hasEditTabAccess && (
            <div className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-xl">
              <button
                type="button"
                disabled={!hasStudentTabAccess}
                onClick={() => hasStudentTabAccess && setActiveMode('enrollment')}
                className={cn(
                  'px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap',
                  activeMode === 'enrollment'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900',
                  !hasStudentTabAccess && 'opacity-40 cursor-not-allowed'
                )}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Student Enrollment &amp; Releases</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('curriculum')}
                className={cn(
                  'px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap',
                  activeMode === 'curriculum'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Curriculum</span>
              </button>
            </div>
          )}

          {activeMode === 'enrollment' && hasStudentTabAccess && (
            <Button
              onClick={() => {
                if (isRosterReadOnly) return;
                setSelectedToAssign([]);
                setIsAssignModalOpen(true);
              }}
              disabled={isRosterReadOnly}
              title={isRosterReadOnly ? 'Read-Only Access' : 'Assign Students to Launchpad'}
              className={cn(
                'whitespace-nowrap shrink-0',
                isRosterReadOnly
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              )}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              <span>Assign Students to Launchpad</span>
            </Button>
          )}
        </div>
      </div>

      {/* Collapsible Gamification Reference Bar for Team */}
      <LaunchpadGamificationGuide mode="team" />

      {/* ========================================================================= */}
      {/* MODE 1: STUDENT ENROLLMENT & RELEASES */}
      {/* ========================================================================= */}
      {activeMode === 'enrollment' && hasStudentTabAccess && (
        <>
          {isRosterReadOnly && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-center gap-3">
              <Eye className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Read-Only Access:</strong> You can inspect Launchpad enrollment counts and student progress, but enrollment edits and subject lock/unlock controls are disabled.
              </span>
            </div>
          )}

          {/* KPI Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Total Students Assigned</p>
                <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                  {kpis.totalAssigned}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Active Learners</p>
                <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                  {kpis.activeLearners}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Certifications Earned</p>
                <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                  {kpis.certificationsEarned}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Enrolled Roster Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search enrolled students by name, email, or counselor..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
                {[
                  { id: 'all' as const, label: 'All Enrolled' },
                  { id: 'unlocked' as const, label: 'Has Unlocked' },
                  { id: 'none_unlocked' as const, label: 'All Locked' },
                  { id: 'certified' as const, label: 'Certified' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0',
                      statusFilter === tab.id
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-3.5">Student</th>
                    <th className="px-6 py-3.5">Counselor &amp; Intake</th>
                    <th className="px-6 py-3.5">Unlocked Subjects</th>
                    <th className="px-6 py-3.5">Module Progress</th>
                    <th className="px-6 py-3.5">Certifications</th>
                    <th className="px-6 py-3.5 text-right">Subject Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRoster.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-14 text-center">
                        <div className="max-w-sm mx-auto space-y-2">
                          <p className="text-sm font-semibold text-slate-800">
                            {enrolledScopedStudents.length === 0
                              ? 'No students enrolled in Launchpad yet'
                              : 'No enrolled students match your current filter'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {enrolledScopedStudents.length === 0
                              ? 'Use "Assign Students to Launchpad" to enroll students and release subjects individually.'
                              : 'Adjust your search query or status filter above.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRoster.map((student) => {
                      const unlockedCount = getStudentReleases(student.id).length;
                      const primarySubject = subjectsWithChapters[0] || activeSubjects[0];
                      const primaryProg = primarySubject
                        ? getSubjectWeeksDone(student.id, primarySubject.id)
                        : { done: 0, total: 0 };
                      const certs = getStudentCerts(student.id);
                      const enrollment = launchpadEnrollments.find(
                        (e) => e.studentId === student.id
                      );

                      return (
                        <tr
                          key={student.id}
                          onClick={() => {
                            setDrawerStudent(student);
                            setDrawerInspectSubjectId(
                              subjectsWithChapters[0]?.id || 'comm-public-speaking'
                            );
                            setExpandedWeekSubmission(null);
                          }}
                          className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900">{student.name}</div>
                            <div className="text-xs text-slate-500">{student.email}</div>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-600">
                            <div className="font-medium text-slate-800">
                              {student.counselor || 'Unassigned'}
                            </div>
                            <div className="text-slate-400">
                              {student.intake || 'Fall 2026'} · Added by {enrollment?.assignedBy || 'Team'}
                            </div>
                          </td>
                          <td className="px-6 py-4 tabular-nums">
                            <span className="font-semibold text-slate-900">
                              {unlockedCount} / {activeSubjects.length}
                            </span>
                            <span className="text-xs text-slate-500 ml-2">released</span>
                          </td>
                          <td className="px-6 py-4 tabular-nums">
                            <span className="text-xs font-semibold text-slate-800">
                              {primaryProg.total > 0
                                ? `Week ${primaryProg.done}/${primaryProg.total}`
                                : '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4 tabular-nums">
                            {certs.length > 0 ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                                <Award className="w-4 h-4" />
                                <span>{certs.length} Certified</span>
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                          <td
                            className="px-6 py-4 text-right space-x-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDrawerStudent(student);
                                setDrawerInspectSubjectId(
                                  subjectsWithChapters[0]?.id || 'comm-public-speaking'
                                );
                                setExpandedWeekSubmission(null);
                              }}
                              className="text-xs whitespace-nowrap"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
                              <span>{isRosterReadOnly ? 'View Subjects' : 'Manage Subjects'}</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isRosterReadOnly}
                              title={isRosterReadOnly ? 'Read-Only Access' : 'Remove student from Launchpad'}
                              onClick={() => {
                                if (isRosterReadOnly) return;
                                removeStudentFromLaunchpad(student.id);
                                if (drawerStudent?.id === student.id) {
                                  setDrawerStudent(null);
                                }
                              }}
                              className={cn(
                                'text-slate-400',
                                isRosterReadOnly ? 'cursor-not-allowed opacity-50' : 'hover:text-rose-600'
                              )}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: IN-TAB CURRICULUM & SUBJECT BUILDER */}
      {/* ========================================================================= */}
      {activeMode === 'curriculum' && hasEditTabAccess && (
        <div className="space-y-4">
          {isCurriculumReadOnly && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-center gap-3">
              <Eye className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Read-Only Curriculum Scope:</strong> You can browse subjects, chapters, reading guides, and certification questions, but editing is disabled.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Sidebar: Subjects List */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50/70">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Subjects ({sortedSubjects.length})</h2>
                  <p className="text-[11px] text-slate-500">Select a subject to manage its syllabus</p>
                </div>
                <Button
                  size="sm"
                  disabled={isCurriculumReadOnly}
                  onClick={openCreateSubjectModal}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> New Subject
                </Button>
              </div>

              <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
                {sortedSubjects.map((subj) => {
                  const chCount = getChaptersForSubject(subj.id).length;
                  const isSelected = selectedSubject?.id === subj.id;
                  const isConfirmingDel = confirmDeleteSubjectId === subj.id;

                  return (
                    <div
                      key={subj.id}
                      onClick={() => setSelectedSubjectId(subj.id)}
                      className={cn(
                        'p-3.5 cursor-pointer transition-colors border-l-4',
                        isSelected
                          ? 'bg-indigo-50/60 border-indigo-600'
                          : 'bg-white border-transparent hover:bg-slate-50',
                        subj.isArchived && 'opacity-65'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <SubjectIllustration
                          subjectId={subj.iconKey || subj.id}
                          customIconUrl={subj.customIconUrl}
                          accentHex={subj.accentHex}
                          className="w-11 h-11 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono text-slate-400">
                              {String(subj.order).padStart(2, '0')}
                            </span>
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {subj.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                            <span>{chCount} {chCount === 1 ? 'chapter' : 'chapters'}</span>
                            <span>·</span>
                            <span>Pass {subj.passingThreshold ?? 75}%</span>
                            {subj.isArchived && (
                              <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded text-[10px] font-semibold">
                                Archived
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick Subject Actions */}
                      <div
                        className="mt-2.5 flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!isCurriculumReadOnly && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditSubjectModal(subj)}
                              className="px-2 py-1 rounded-lg text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                saveLaunchpadSubject({ ...subj, isArchived: !subj.isArchived })
                              }
                              className="px-2 py-1 rounded-lg text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 flex items-center gap-1"
                            >
                              {subj.isArchived ? (
                                <>
                                  <RotateCcw className="w-3 h-3" /> Restore
                                </>
                              ) : (
                                <>
                                  <Archive className="w-3 h-3" /> Archive
                                </>
                              )}
                            </button>
                            {!isConfirmingDel ? (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteSubjectId(subj.id)}
                                className="px-2 py-1 rounded-lg text-[11px] font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" /> Delete
                              </button>
                            ) : (
                              <div className="flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200">
                                <span className="text-[10px] font-bold text-rose-800">Confirm?</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    deleteLaunchpadSubject(subj.id);
                                    setConfirmDeleteSubjectId(null);
                                    showToast(`Deleted subject "${subj.title}"`);
                                  }}
                                  className="text-[10px] font-bold text-rose-700 hover:underline"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteSubjectId(null)}
                                  className="text-[10px] font-semibold text-slate-600 hover:underline"
                                >
                                  No
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Workspace: Selected Subject Chapters & Certification */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl overflow-hidden">
              {selectedSubject ? (
                <>
                  {/* Subject Banner */}
                  <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                    <div className="flex items-start gap-4">
                      <SubjectIllustration
                        subjectId={selectedSubject.iconKey || selectedSubject.id}
                        customIconUrl={selectedSubject.customIconUrl}
                        accentHex={selectedSubject.accentHex}
                        className="w-16 h-16 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-slate-900">
                            {selectedSubject.title}
                          </h2>
                          {selectedSubject.isArchived && (
                            <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold uppercase">
                              Archived
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                          {selectedSubject.description}
                        </p>
                        {selectedSubject.courseGoal && (
                          <p className="text-[11px] text-slate-500 mt-1.5">
                            <strong>Goal:</strong> {selectedSubject.courseGoal}
                          </p>
                        )}
                      </div>
                    </div>

                    {!isCurriculumReadOnly && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditSubjectModal(selectedSubject)}
                        className="shrink-0 text-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit Subject Details
                      </Button>
                    )}
                  </div>

                  {/* Sub-Tabs */}
                  <div className="px-6 pt-3 border-b border-slate-200 flex items-center gap-4 bg-white">
                    <button
                      type="button"
                      onClick={() => {
                        setCurriculumSubTab('chapters');
                        setEditingChapterDraft(null);
                      }}
                      className={cn(
                        'pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5',
                        curriculumSubTab === 'chapters'
                          ? 'border-indigo-600 text-indigo-700'
                          : 'border-transparent text-slate-500 hover:text-slate-900'
                      )}
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Chapters &amp; Syllabus ({selectedSubjectChapters.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurriculumSubTab('certification')}
                      className={cn(
                        'pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5',
                        curriculumSubTab === 'certification'
                          ? 'border-indigo-600 text-indigo-700'
                          : 'border-transparent text-slate-500 hover:text-slate-900'
                      )}
                    >
                      <Award className="w-4 h-4" />
                      <span>
                        Certification Test ({subjectCertMcqs.length + subjectCertSituational.length})
                      </span>
                    </button>
                  </div>

                  {/* TAB A: CHAPTERS & SYLLABUS */}
                  {curriculumSubTab === 'chapters' && (
                    <div className="p-6">
                      {!editingChapterDraft ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">
                                Week-by-Week Modules
                              </h3>
                              <p className="text-xs text-slate-500">
                                Students unlock weeks sequentially by submitting each practical exercise.
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {!isCurriculumReadOnly && (
                                <>
                                  <button
                                    type="button"
                                    onClick={handleDownloadAgreedChapterTemplate}
                                    title="Download Agreed Chapter Format (.doc)"
                                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold inline-flex items-center gap-1.5"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Format (.doc)</span>
                                  </button>
                                  <label
                                    className={cn(
                                      'px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5',
                                      isParsingChapterDoc && 'opacity-60 pointer-events-none'
                                    )}
                                  >
                                    {isParsingChapterDoc ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Wand2 className="w-3.5 h-3.5" />
                                    )}
                                    <span>
                                      {isParsingChapterDoc
                                        ? 'Extracting...'
                                        : 'Import Week from Doc / PDF'}
                                    </span>
                                    <input
                                      type="file"
                                      accept=".docx,.doc,.pdf,.txt,.md"
                                      disabled={isParsingChapterDoc}
                                      onChange={(e) => handleAutoFillChapterFromDoc(e, true)}
                                      className="hidden"
                                    />
                                  </label>
                                </>
                              )}
                              <Button
                                size="sm"
                                disabled={isCurriculumReadOnly}
                                onClick={openNewChapterEditor}
                                className="bg-slate-900 hover:bg-slate-800 text-white text-xs"
                              >
                                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Week / Chapter
                              </Button>
                            </div>
                          </div>

                          {chapterDocParseStatus && (
                            <div
                              className={cn(
                                'p-3 rounded-lg border text-xs flex items-start gap-2',
                                chapterDocParseStatus.type === 'success'
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                  : 'bg-rose-50 border-rose-200 text-rose-800'
                              )}
                            >
                              {chapterDocParseStatus.type === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                              )}
                              <span>{chapterDocParseStatus.message}</span>
                            </div>
                          )}

                          {selectedSubjectChapters.length === 0 ? (
                            <div className="p-10 border border-dashed border-slate-200 rounded-2xl text-center space-y-2 bg-slate-50/50">
                              <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                              <p className="text-sm font-semibold text-slate-700">
                                No chapters created for this subject yet
                              </p>
                              <p className="text-xs text-slate-500">
                                Add Week 1 to activate full learning guides, lectures, and exercises for students.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {selectedSubjectChapters.map((ch, idx) => {
                                const chKey = ch.id || `${selectedSubject.id}__w${ch.weekNumber}`;
                                const isDelConfirm = confirmDeleteChapterId === chKey;

                                return (
                                  <div
                                    key={chKey}
                                    className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                                  >
                                    <div className="space-y-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-bold tabular-nums">
                                          Week {ch.weekNumber}
                                        </span>
                                        <span className="text-sm font-bold text-slate-900 truncate">
                                          {ch.title}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                                        <span className="flex items-center gap-1">
                                          <FileText className="w-3 h-3 text-slate-400" />
                                          {ch.readingGuide.sections.length} guide sections
                                        </span>
                                        <span>·</span>
                                        <span className="flex items-center gap-1">
                                          <Video className="w-3 h-3 text-slate-400" />
                                          {ch.lecture.duration || 'Video'}
                                        </span>
                                        <span>·</span>
                                        <span className="flex items-center gap-1">
                                          <ClipboardCheck className="w-3 h-3 text-slate-400" />
                                          {ch.practicalExercise.fields.length} worksheet fields
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {!isCurriculumReadOnly && (
                                        <>
                                          <button
                                            type="button"
                                            disabled={idx === 0}
                                            onClick={() => handleMoveChapter(idx, -1)}
                                            title="Move Earlier"
                                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                                          >
                                            <ArrowUp className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            disabled={idx === selectedSubjectChapters.length - 1}
                                            onClick={() => handleMoveChapter(idx, 1)}
                                            title="Move Later"
                                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                                          >
                                            <ArrowDown className="w-3.5 h-3.5" />
                                          </button>
                                        </>
                                      )}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openEditChapterEditor(ch)}
                                        className="text-xs h-8"
                                      >
                                        <Edit3 className="w-3.5 h-3.5 mr-1" />
                                        {isCurriculumReadOnly ? 'View' : 'Edit'}
                                      </Button>
                                      {!isCurriculumReadOnly &&
                                        (!isDelConfirm ? (
                                          <button
                                            type="button"
                                            onClick={() => setConfirmDeleteChapterId(chKey)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        ) : (
                                          <div className="flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                deleteLaunchpadChapter(chKey, selectedSubject.id);
                                                setConfirmDeleteChapterId(null);
                                                showToast(`Removed Week ${ch.weekNumber}`);
                                              }}
                                              className="text-[11px] font-bold text-rose-700 hover:underline"
                                            >
                                              Delete
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setConfirmDeleteChapterId(null)}
                                              className="text-[11px] text-slate-600 hover:underline ml-1"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        /* CHAPTER EDITOR FORM */
                        <form onSubmit={handleSaveChapterDraft} className="space-y-6">
                          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                            <button
                              type="button"
                              onClick={() => setEditingChapterDraft(null)}
                              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
                            >
                              <ArrowLeft className="w-4 h-4" /> Back to Syllabus
                            </button>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                                Week {editingChapterDraft.weekNumber}
                              </span>
                              {!isCurriculumReadOnly && (
                                <Button
                                  type="submit"
                                  size="sm"
                                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs"
                                >
                                  <Save className="w-3.5 h-3.5 mr-1.5" /> Save Chapter
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* AUTO-FILL CHAPTER FROM AGREED FORMAT DOC / PDF */}
                          {!isCurriculumReadOnly && (
                            <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="space-y-1 max-w-xl">
                                  <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                                    <Wand2 className="w-4 h-4 text-indigo-600" />
                                    <span>Auto-Fill Whole Chapter from Document (DOCX / DOC / PDF / TXT)</span>
                                  </div>
                                  <p className="text-[11px] text-indigo-900/80 leading-relaxed">
                                    Upload a structured chapter document following the agreed format (or PDF) to auto-populate <strong>Chapter Title</strong>, <strong>1. Read Guide</strong>, <strong>2. Watch Lecture</strong>, and <strong>3. Practical Exercise</strong> all at once.
                                  </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={handleDownloadAgreedChapterTemplate}
                                    className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold inline-flex items-center gap-1.5"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Agreed Format (.doc)</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setShowAgreedFormatHelp((v) => !v)}
                                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium"
                                  >
                                    {showAgreedFormatHelp ? 'Hide Format' : 'View Format'}
                                  </button>
                                  <label
                                    className={cn(
                                      'px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 shadow-2xs',
                                      isParsingChapterDoc && 'opacity-60 pointer-events-none'
                                    )}
                                  >
                                    {isParsingChapterDoc ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Upload className="w-3.5 h-3.5" />
                                    )}
                                    <span>
                                      {isParsingChapterDoc ? 'Extracting...' : 'Upload & Auto-Fill'}
                                    </span>
                                    <input
                                      type="file"
                                      accept=".docx,.doc,.pdf,.txt,.md"
                                      disabled={isParsingChapterDoc}
                                      onChange={(e) => handleAutoFillChapterFromDoc(e, false)}
                                      className="hidden"
                                    />
                                  </label>
                                </div>
                              </div>

                              <label className="inline-flex items-center gap-2 text-[11px] font-medium text-indigo-950 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={attachImportedDocToGuide}
                                  onChange={(e) => setAttachImportedDocToGuide(e.target.checked)}
                                  className="rounded accent-indigo-600"
                                />
                                <span>Also attach this uploaded file as downloadable Reading Material for students</span>
                              </label>

                              {showAgreedFormatHelp && (
                                <pre className="p-3 rounded-lg bg-white border border-indigo-200 text-[11px] text-slate-700 overflow-x-auto leading-relaxed font-mono">
{`CHAPTER TITLE: Foundations of Structured Storytelling
WEEK NUMBER: 1
LEARNING OBJECTIVES:
- Objective 1
- Objective 2

[READ GUIDE]
GUIDE TITLE: Structuring High-Impact Narratives
READ TIME: 8 min read
SUMMARY: Brief overview paragraph for the reading guide.
SECTION: Core Framework
BODY: Main section paragraph explaining the concept.
BULLETS:
- Key takeaway bullet 1
- Key takeaway bullet 2

[WATCH LECTURE]
LECTURE TITLE: Talk Title
SPEAKER: Speaker or Channel Name
VIDEO URL: https://www.youtube.com/watch?v=...
DURATION: 15 min
FOCUS NOTE: What students should observe while watching.

[PRACTICAL EXERCISE]
EXERCISE TITLE: Practical Activity Title
SCENARIO: Real-world prompt/scenario description.
INSTRUCTIONS:
- Step 1 instruction
- Step 2 instruction
SELF CHECK:
- Checklist item 1
WORKSHEET FIELDS:
- Field Label | Placeholder hint | textarea | wordcount
ALLOW FILE UPLOAD: Yes`}
                                </pre>
                              )}

                              {chapterDocParseStatus && (
                                <div
                                  className={cn(
                                    'p-3 rounded-lg border text-xs flex items-start gap-2',
                                    chapterDocParseStatus.type === 'success'
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                      : 'bg-rose-50 border-rose-200 text-rose-800'
                                  )}
                                >
                                  {chapterDocParseStatus.type === 'success' ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                  ) : (
                                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                  )}
                                  <span>{chapterDocParseStatus.message}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Basic Info & Learning Objectives */}
                          <div className="grid grid-cols-1 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                            <div>
                              <label className="text-xs font-bold text-slate-700 block mb-1">
                                Chapter / Week Title *
                              </label>
                              <input
                                type="text"
                                required
                                disabled={isCurriculumReadOnly}
                                value={editingChapterDraft.title}
                                onChange={(e) =>
                                  setEditingChapterDraft({
                                    ...editingChapterDraft,
                                    title: e.target.value,
                                  })
                                }
                                placeholder="e.g. Executive Presence & Vocal Clarity"
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                              />
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-700">
                                  Learning Objectives
                                </label>
                                {!isCurriculumReadOnly && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingChapterDraft({
                                        ...editingChapterDraft,
                                        learningObjectives: [
                                          ...(editingChapterDraft.learningObjectives || []),
                                          '',
                                        ],
                                      })
                                    }
                                    className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                                  >
                                    <Plus className="w-3 h-3" /> Add Objective
                                  </button>
                                )}
                              </div>
                              {(editingChapterDraft.learningObjectives || []).map((obj, oIdx) => (
                                <div key={oIdx} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    disabled={isCurriculumReadOnly}
                                    value={obj}
                                    onChange={(e) => {
                                      const next = [
                                        ...(editingChapterDraft.learningObjectives || []),
                                      ];
                                      next[oIdx] = e.target.value;
                                      setEditingChapterDraft({
                                        ...editingChapterDraft,
                                        learningObjectives: next,
                                      });
                                    }}
                                    placeholder={`Objective ${oIdx + 1}`}
                                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                                  />
                                  {!isCurriculumReadOnly && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const next = (
                                          editingChapterDraft.learningObjectives || []
                                        ).filter((_, i) => i !== oIdx);
                                        setEditingChapterDraft({
                                          ...editingChapterDraft,
                                          learningObjectives: next,
                                        });
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-rose-600"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* SECTION 1: READ GUIDE */}
                          <div className="p-4 rounded-xl border border-slate-200 space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                                <FileText className="w-4 h-4" /> 1. Read Guide (Default Active Tab)
                              </h4>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="sm:col-span-2">
                                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                                  Guide Title
                                </label>
                                <input
                                  type="text"
                                  disabled={isCurriculumReadOnly}
                                  value={editingChapterDraft.readingGuide.title}
                                  onChange={(e) =>
                                    setEditingChapterDraft({
                                      ...editingChapterDraft,
                                      readingGuide: {
                                        ...editingChapterDraft.readingGuide,
                                        title: e.target.value,
                                      },
                                    })
                                  }
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                                  Estimated Read Time
                                </label>
                                <input
                                  type="text"
                                  disabled={isCurriculumReadOnly}
                                  value={editingChapterDraft.readingGuide.readTime}
                                  onChange={(e) =>
                                    setEditingChapterDraft({
                                      ...editingChapterDraft,
                                      readingGuide: {
                                        ...editingChapterDraft.readingGuide,
                                        readTime: e.target.value,
                                      },
                                    })
                                  }
                                  placeholder="e.g. 8 min read"
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                                Guide Executive Summary
                              </label>
                              <textarea
                                rows={2}
                                disabled={isCurriculumReadOnly}
                                value={editingChapterDraft.readingGuide.summary}
                                onChange={(e) =>
                                  setEditingChapterDraft({
                                    ...editingChapterDraft,
                                    readingGuide: {
                                      ...editingChapterDraft.readingGuide,
                                      summary: e.target.value,
                                    },
                                  })
                                }
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                              />
                            </div>

                            {/* Reading Material Document Upload (PDF / DOC / DOCX) */}
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                              <div className="text-xs">
                                <div className="font-semibold text-slate-800">
                                  Optional Reading Material (PDF / DOC / DOCX)
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {editingChapterDraft.readingGuide.pdfFileName
                                    ? `Attached: ${editingChapterDraft.readingGuide.pdfFileName}`
                                    : 'Upload a companion reading document (.pdf, .doc, .docx, .ppt, .txt) for students to download'}
                                </div>
                              </div>
                              {!isCurriculumReadOnly && (
                                <div className="flex items-center gap-2">
                                  {editingChapterDraft.readingGuide.pdfUrl && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditingChapterDraft({
                                          ...editingChapterDraft,
                                          readingGuide: {
                                            ...editingChapterDraft.readingGuide,
                                            pdfUrl: '',
                                            pdfFileName: '',
                                          },
                                        })
                                      }
                                      className="text-xs font-semibold text-rose-600 hover:underline"
                                    >
                                      Remove File
                                    </button>
                                  )}
                                  <label className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer flex items-center gap-1.5">
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Upload Document</span>
                                    <input
                                      type="file"
                                      accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xlsx,.csv"
                                      onChange={handleGuidePdfUpload}
                                      className="hidden"
                                    />
                                  </label>
                                </div>
                              )}
                            </div>

                            {/* Reading Sections */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-600 uppercase">
                                  Reading Guide Sections ({editingChapterDraft.readingGuide.sections.length})
                                </span>
                                {!isCurriculumReadOnly && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingChapterDraft({
                                        ...editingChapterDraft,
                                        readingGuide: {
                                          ...editingChapterDraft.readingGuide,
                                          sections: [
                                            ...editingChapterDraft.readingGuide.sections,
                                            { heading: '', body: '', bullets: [] },
                                          ],
                                        },
                                      })
                                    }
                                    className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Add Section
                                  </button>
                                )}
                              </div>

                              {editingChapterDraft.readingGuide.sections.map((sec, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <input
                                      type="text"
                                      disabled={isCurriculumReadOnly}
                                      value={sec.heading}
                                      onChange={(e) => {
                                        const nextSecs = [
                                          ...editingChapterDraft.readingGuide.sections,
                                        ];
                                        nextSecs[sIdx] = { ...sec, heading: e.target.value };
                                        setEditingChapterDraft({
                                          ...editingChapterDraft,
                                          readingGuide: {
                                            ...editingChapterDraft.readingGuide,
                                            sections: nextSecs,
                                          },
                                        });
                                      }}
                                      placeholder={`Section ${sIdx + 1} Heading`}
                                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                                    />
                                    {!isCurriculumReadOnly && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nextSecs =
                                            editingChapterDraft.readingGuide.sections.filter(
                                              (_, i) => i !== sIdx
                                            );
                                          setEditingChapterDraft({
                                            ...editingChapterDraft,
                                            readingGuide: {
                                              ...editingChapterDraft.readingGuide,
                                              sections: nextSecs,
                                            },
                                          });
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-rose-600"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                  <textarea
                                    rows={3}
                                    disabled={isCurriculumReadOnly}
                                    value={sec.body}
                                    onChange={(e) => {
                                      const nextSecs = [
                                        ...editingChapterDraft.readingGuide.sections,
                                      ];
                                      nextSecs[sIdx] = { ...sec, body: e.target.value };
                                      setEditingChapterDraft({
                                        ...editingChapterDraft,
                                        readingGuide: {
                                          ...editingChapterDraft.readingGuide,
                                          sections: nextSecs,
                                        },
                                      });
                                    }}
                                    placeholder="Section narrative body..."
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                                  />
                                  <textarea
                                    rows={2}
                                    disabled={isCurriculumReadOnly}
                                    value={(sec.bullets || []).join('\n')}
                                    onChange={(e) => {
                                      const nextSecs = [
                                        ...editingChapterDraft.readingGuide.sections,
                                      ];
                                      nextSecs[sIdx] = {
                                        ...sec,
                                        bullets: e.target.value.split('\n'),
                                      };
                                      setEditingChapterDraft({
                                        ...editingChapterDraft,
                                        readingGuide: {
                                          ...editingChapterDraft.readingGuide,
                                          sections: nextSecs,
                                        },
                                      });
                                    }}
                                    placeholder="Key takeaways (one bullet point per line)"
                                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* SECTION 2: WATCH LECTURE */}
                          <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                              <Video className="w-4 h-4" /> 2. Watch Lecture
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                                  Lecture Title
                                </label>
                                <input
                                  type="text"
                                  disabled={isCurriculumReadOnly}
                                  value={editingChapterDraft.lecture.title}
                                  onChange={(e) =>
                                    setEditingChapterDraft({
                                      ...editingChapterDraft,
                                      lecture: {
                                        ...editingChapterDraft.lecture,
                                        title: e.target.value,
                                      },
                                    })
                                  }
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                                  Speaker / Source
                                </label>
                                <input
                                  type="text"
                                  disabled={isCurriculumReadOnly}
                                  value={editingChapterDraft.lecture.speaker}
                                  onChange={(e) =>
                                    setEditingChapterDraft({
                                      ...editingChapterDraft,
                                      lecture: {
                                        ...editingChapterDraft.lecture,
                                        speaker: e.target.value,
                                      },
                                    })
                                  }
                                  placeholder="e.g. Julian Treasure (TED)"
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                                  Video URL (YouTube / Vimeo / External)
                                </label>
                                <input
                                  type="url"
                                  disabled={isCurriculumReadOnly}
                                  value={editingChapterDraft.lecture.url}
                                  onChange={(e) => {
                                    const url = e.target.value;
                                    const ytId = extractYoutubeId(url);
                                    setEditingChapterDraft({
                                      ...editingChapterDraft,
                                      lecture: {
                                        ...editingChapterDraft.lecture,
                                        url,
                                        youtubeId: ytId || '',
                                      },
                                    });
                                  }}
                                  placeholder="https://www.youtube.com/watch?v=..."
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                                />
                                {extractYoutubeId(editingChapterDraft.lecture.url) && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 mt-1">
                                    <CheckCircle2 className="w-3 h-3" /> Auto-detected YouTube Embed ID:{' '}
                                    {extractYoutubeId(editingChapterDraft.lecture.url)}
                                  </span>
                                )}
                              </div>
                              <div>
                                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                                  Duration
                                </label>
                                <input
                                  type="text"
                                  disabled={isCurriculumReadOnly}
                                  value={editingChapterDraft.lecture.duration}
                                  onChange={(e) =>
                                    setEditingChapterDraft({
                                      ...editingChapterDraft,
                                      lecture: {
                                        ...editingChapterDraft.lecture,
                                        duration: e.target.value,
                                      },
                                    })
                                  }
                                  placeholder="e.g. 12 min"
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                                Listening Focus Note
                              </label>
                              <textarea
                                rows={2}
                                disabled={isCurriculumReadOnly}
                                value={editingChapterDraft.lecture.focusNote}
                                onChange={(e) =>
                                  setEditingChapterDraft({
                                    ...editingChapterDraft,
                                    lecture: {
                                      ...editingChapterDraft.lecture,
                                      focusNote: e.target.value,
                                    },
                                  })
                                }
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                              />
                            </div>
                          </div>

                          {/* SECTION 3: PRACTICAL EXERCISE */}
                          <div className="p-4 rounded-xl border border-slate-200 space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                                <ClipboardCheck className="w-4 h-4" /> 3. Practical Exercise &amp; Worksheet
                              </h4>
                              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  disabled={isCurriculumReadOnly}
                                  checked={editingChapterDraft.practicalExercise.allowFileUpload !== false}
                                  onChange={(e) =>
                                    setEditingChapterDraft({
                                      ...editingChapterDraft,
                                      practicalExercise: {
                                        ...editingChapterDraft.practicalExercise,
                                        allowFileUpload: e.target.checked,
                                      },
                                    })
                                  }
                                  className="rounded accent-indigo-600"
                                />
                                Allow Student File / Recording Upload
                              </label>
                            </div>

                            {/* Exercise Companion Doc / Worksheet Upload */}
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                              <div className="text-xs">
                                <div className="font-semibold text-slate-800">
                                  Optional Exercise Document / Worksheet Template
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {editingChapterDraft.practicalExercise.docFileName
                                    ? `Attached: ${editingChapterDraft.practicalExercise.docFileName}`
                                    : 'Upload a reference brief, worksheet, or case document (.pdf, .doc, .docx, image)'}
                                </div>
                              </div>
                              {!isCurriculumReadOnly && (
                                <div className="flex items-center gap-2">
                                  {editingChapterDraft.practicalExercise.docUrl && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditingChapterDraft({
                                          ...editingChapterDraft,
                                          practicalExercise: {
                                            ...editingChapterDraft.practicalExercise,
                                            docUrl: '',
                                            docFileName: '',
                                          },
                                        })
                                      }
                                      className="text-xs font-semibold text-rose-600 hover:underline"
                                    >
                                      Remove Doc
                                    </button>
                                  )}
                                  <label className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer flex items-center gap-1.5">
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Upload Document</span>
                                    <input
                                      type="file"
                                      accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xlsx,.csv,.png,.jpg,.jpeg"
                                      onChange={handleExerciseDocUpload}
                                      className="hidden"
                                    />
                                  </label>
                                </div>
                              )}
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                                Exercise Title
                              </label>
                              <input
                                type="text"
                                disabled={isCurriculumReadOnly}
                                value={editingChapterDraft.practicalExercise.title}
                                onChange={(e) =>
                                  setEditingChapterDraft({
                                    ...editingChapterDraft,
                                    practicalExercise: {
                                      ...editingChapterDraft.practicalExercise,
                                      title: e.target.value,
                                    },
                                  })
                                }
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                                Real-World Scenario
                              </label>
                              <textarea
                                rows={2}
                                disabled={isCurriculumReadOnly}
                                value={editingChapterDraft.practicalExercise.scenario}
                                onChange={(e) =>
                                  setEditingChapterDraft({
                                    ...editingChapterDraft,
                                    practicalExercise: {
                                      ...editingChapterDraft.practicalExercise,
                                      scenario: e.target.value,
                                    },
                                  })
                                }
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                                  Step-by-Step Instructions (1 per line)
                                </label>
                                <textarea
                                  rows={3}
                                  disabled={isCurriculumReadOnly}
                                  value={(editingChapterDraft.practicalExercise.instructions || []).join('\n')}
                                  onChange={(e) =>
                                    setEditingChapterDraft({
                                      ...editingChapterDraft,
                                      practicalExercise: {
                                        ...editingChapterDraft.practicalExercise,
                                        instructions: e.target.value.split('\n'),
                                      },
                                    })
                                  }
                                  placeholder="Step 1: Watch the prompt&#10;Step 2: Complete fields below"
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                                  Self-Check Criteria Checklist (1 per line)
                                </label>
                                <textarea
                                  rows={3}
                                  disabled={isCurriculumReadOnly}
                                  value={editingChapterDraft.practicalExercise.selfCheckCriteria.join('\n')}
                                  onChange={(e) =>
                                    setEditingChapterDraft({
                                      ...editingChapterDraft,
                                      practicalExercise: {
                                        ...editingChapterDraft.practicalExercise,
                                        selfCheckCriteria: e.target.value.split('\n'),
                                      },
                                    })
                                  }
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                                />
                              </div>
                            </div>

                            {/* Custom Worksheet Fields Builder */}
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-600 uppercase">
                                  Worksheet Input Fields ({editingChapterDraft.practicalExercise.fields.length})
                                </span>
                                {!isCurriculumReadOnly && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingChapterDraft({
                                        ...editingChapterDraft,
                                        practicalExercise: {
                                          ...editingChapterDraft.practicalExercise,
                                          fields: [
                                            ...editingChapterDraft.practicalExercise.fields,
                                            {
                                              key: `field_${Date.now().toString(36)}`,
                                              label: '',
                                              placeholder: 'Enter response...',
                                              type: 'textarea',
                                              showWordCount: false,
                                            },
                                          ],
                                        },
                                      })
                                    }
                                    className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Add Worksheet Field
                                  </button>
                                )}
                              </div>

                              {editingChapterDraft.practicalExercise.fields.map((fld, fIdx) => (
                                <div
                                  key={fIdx}
                                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                                >
                                  <input
                                    type="text"
                                    disabled={isCurriculumReadOnly}
                                    value={fld.label}
                                    onChange={(e) => {
                                      const next = [
                                        ...editingChapterDraft.practicalExercise.fields,
                                      ];
                                      next[fIdx] = { ...fld, label: e.target.value };
                                      setEditingChapterDraft({
                                        ...editingChapterDraft,
                                        practicalExercise: {
                                          ...editingChapterDraft.practicalExercise,
                                          fields: next,
                                        },
                                      });
                                    }}
                                    placeholder="Field Prompt / Label"
                                    className="sm:col-span-5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                                  />
                                  <input
                                    type="text"
                                    disabled={isCurriculumReadOnly}
                                    value={fld.placeholder}
                                    onChange={(e) => {
                                      const next = [
                                        ...editingChapterDraft.practicalExercise.fields,
                                      ];
                                      next[fIdx] = { ...fld, placeholder: e.target.value };
                                      setEditingChapterDraft({
                                        ...editingChapterDraft,
                                        practicalExercise: {
                                          ...editingChapterDraft.practicalExercise,
                                          fields: next,
                                        },
                                      });
                                    }}
                                    placeholder="Placeholder text"
                                    className="sm:col-span-4 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                                  />
                                  <select
                                    disabled={isCurriculumReadOnly}
                                    value={fld.type}
                                    onChange={(e) => {
                                      const next = [
                                        ...editingChapterDraft.practicalExercise.fields,
                                      ];
                                      next[fIdx] = {
                                        ...fld,
                                        type: e.target.value as 'text' | 'textarea',
                                      };
                                      setEditingChapterDraft({
                                        ...editingChapterDraft,
                                        practicalExercise: {
                                          ...editingChapterDraft.practicalExercise,
                                          fields: next,
                                        },
                                      });
                                    }}
                                    className="sm:col-span-2 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                                  >
                                    <option value="textarea">Long Text</option>
                                    <option value="text">Short Input</option>
                                  </select>
                                  {!isCurriculumReadOnly && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const next =
                                          editingChapterDraft.practicalExercise.fields.filter(
                                            (_, i) => i !== fIdx
                                          );
                                        setEditingChapterDraft({
                                          ...editingChapterDraft,
                                          practicalExercise: {
                                            ...editingChapterDraft.practicalExercise,
                                            fields: next,
                                          },
                                        });
                                      }}
                                      className="sm:col-span-1 p-1.5 text-slate-400 hover:text-rose-600 justify-self-end"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {!isCurriculumReadOnly && (
                            <div className="flex justify-end gap-2 pt-2">
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setEditingChapterDraft(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                className="bg-slate-900 hover:bg-slate-800 text-white"
                              >
                                <Save className="w-4 h-4 mr-2" /> Save Chapter Changes
                              </Button>
                            </div>
                          )}
                        </form>
                      )}
                    </div>
                  )}

                  {/* TAB B: CERTIFICATION TEST BUILDER */}
                  {curriculumSubTab === 'certification' && (
                    <div className="p-6 space-y-6">
                      {/* Passing Threshold & Certificate Title */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                        <div className="sm:col-span-7">
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">
                            Certificate Title
                          </label>
                          <input
                            type="text"
                            disabled={isCurriculumReadOnly}
                            value={certTitleInput}
                            onChange={(e) => setCertTitleInput(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">
                            Passing Score (%)
                          </label>
                          <input
                            type="number"
                            min={10}
                            max={100}
                            disabled={isCurriculumReadOnly}
                            value={certThresholdInput}
                            onChange={(e) => setCertThresholdInput(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs tabular-nums"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={isCurriculumReadOnly}
                            onClick={handleSaveCertSettings}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs h-9"
                          >
                            Save
                          </Button>
                        </div>
                      </div>

                      {/* Assessment Reference / Question Paper Doc Upload */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="text-xs">
                            <div className="font-bold text-slate-900">
                              Assessment Reference / Question Paper Document
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {subjectCertDocPayload?.docFileName
                                ? `Attached: ${subjectCertDocPayload.docFileName}`
                                : 'Upload a test paper, prompt doc, or case study (.pdf, .doc, .docx, image) for students'}
                            </div>
                          </div>
                          {!isCurriculumReadOnly && (
                            <div className="flex items-center gap-2">
                              {subjectCertDocRecord && subjectCertDocPayload?.docUrl && (
                                <a
                                  href={subjectCertDocPayload.docUrl}
                                  download={subjectCertDocPayload.docFileName || 'Certification-Test-Doc'}
                                  className="text-xs font-semibold text-indigo-600 hover:underline"
                                >
                                  Download
                                </a>
                              )}
                              {subjectCertDocRecord && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    deleteLaunchpadCertQuestion(subjectCertDocRecord.id);
                                    showToast('Removed test document');
                                  }}
                                  className="text-xs font-semibold text-rose-600 hover:underline"
                                >
                                  Remove
                                </button>
                              )}
                              <label className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer flex items-center gap-1.5">
                                <Upload className="w-3.5 h-3.5" />
                                <span>Upload Test Doc</span>
                                <input
                                  type="file"
                                  accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xlsx,.csv,.png,.jpg,.jpeg"
                                  onChange={handleCertTestDocUpload}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-1">
                          <div className="sm:col-span-8">
                            <input
                              type="text"
                              disabled={isCurriculumReadOnly}
                              value={subjectCertDocPayload?.instructions || ''}
                              onChange={(e) =>
                                handleUpdateCertTestDocMeta({ instructions: e.target.value })
                              }
                              placeholder="Optional notes or instructions for using the uploaded test document..."
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                            />
                          </div>
                          <label className="sm:col-span-4 flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={isCurriculumReadOnly}
                              checked={Boolean(subjectCertDocPayload?.allowStudentUpload)}
                              onChange={(e) =>
                                handleUpdateCertTestDocMeta({ allowStudentUpload: e.target.checked })
                              }
                              className="rounded accent-indigo-600"
                            />
                            <span>Allow Student Doc Upload in Test</span>
                          </label>
                        </div>
                      </div>

                      {/* MCQs List & Form */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-slate-900">
                            Multiple-Choice Questions ({subjectCertMcqs.length})
                          </h3>
                          {!isCurriculumReadOnly && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setEditingMcqDraft({
                                  sortOrder: subjectCertMcqs.length + 1,
                                  payload: {
                                    id: '',
                                    weekRef: 1,
                                    question: '',
                                    options: ['', '', '', ''],
                                    correctIndex: 0,
                                    explanation: '',
                                  },
                                })
                              }
                              className="text-xs h-8"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" /> Add MCQ
                            </Button>
                          )}
                        </div>

                        {editingMcqDraft && (
                          <form
                            onSubmit={handleSaveMcq}
                            className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-indigo-900">
                                {editingMcqDraft.id ? 'Edit MCQ' : 'New MCQ Question'}
                              </span>
                              <div className="flex items-center gap-2">
                                <label className="text-[11px] font-semibold text-slate-600">
                                  Week Ref:
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  max={20}
                                  value={editingMcqDraft.payload.weekRef}
                                  onChange={(e) =>
                                    setEditingMcqDraft({
                                      ...editingMcqDraft,
                                      payload: {
                                        ...editingMcqDraft.payload,
                                        weekRef: Number(e.target.value) || 1,
                                      },
                                    })
                                  }
                                  className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                                />
                              </div>
                            </div>
                            <input
                              type="text"
                              required
                              value={editingMcqDraft.payload.question}
                              onChange={(e) =>
                                setEditingMcqDraft({
                                  ...editingMcqDraft,
                                  payload: {
                                    ...editingMcqDraft.payload,
                                    question: e.target.value,
                                  },
                                })
                              }
                              placeholder="Enter question stem..."
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {editingMcqDraft.payload.options.map((opt, oIdx) => (
                                <label
                                  key={oIdx}
                                  className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-xl"
                                >
                                  <input
                                    type="radio"
                                    name="correctMcqOpt"
                                    checked={editingMcqDraft.payload.correctIndex === oIdx}
                                    onChange={() =>
                                      setEditingMcqDraft({
                                        ...editingMcqDraft,
                                        payload: {
                                          ...editingMcqDraft.payload,
                                          correctIndex: oIdx,
                                        },
                                      })
                                    }
                                    className="accent-indigo-600"
                                  />
                                  <input
                                    type="text"
                                    required
                                    value={opt}
                                    onChange={(e) => {
                                      const nextOpts = [...editingMcqDraft.payload.options];
                                      nextOpts[oIdx] = e.target.value;
                                      setEditingMcqDraft({
                                        ...editingMcqDraft,
                                        payload: {
                                          ...editingMcqDraft.payload,
                                          options: nextOpts,
                                        },
                                      });
                                    }}
                                    placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                                    className="flex-1 text-xs focus:outline-none"
                                  />
                                </label>
                              ))}
                            </div>
                            <input
                              type="text"
                              value={editingMcqDraft.payload.explanation}
                              onChange={(e) =>
                                setEditingMcqDraft({
                                  ...editingMcqDraft,
                                  payload: {
                                    ...editingMcqDraft.payload,
                                    explanation: e.target.value,
                                  },
                                })
                              }
                              placeholder="Explanation shown after submission..."
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingMcqDraft(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                              >
                                Save MCQ
                              </Button>
                            </div>
                          </form>
                        )}

                        <div className="space-y-2">
                          {subjectCertMcqs.map((rec, idx) => {
                            const mcq = rec.payload as LaunchpadMCQ;
                            const isDel = confirmDeleteCertQId === rec.id;
                            return (
                              <div
                                key={rec.id}
                                className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3"
                              >
                                <div className="space-y-1">
                                  <div className="text-xs font-bold text-slate-900">
                                    Q{idx + 1} (Week {mcq.weekRef}): {mcq.question}
                                  </div>
                                  <div className="text-[11px] text-emerald-700 font-medium">
                                    Correct Answer: {mcq.options[mcq.correctIndex]}
                                  </div>
                                </div>
                                {!isCurriculumReadOnly && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditingMcqDraft({
                                          id: rec.id,
                                          sortOrder: rec.sortOrder,
                                          payload: JSON.parse(JSON.stringify(mcq)),
                                        })
                                      }
                                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    {!isDel ? (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteCertQId(rec.id)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          deleteLaunchpadCertQuestion(rec.id);
                                          setConfirmDeleteCertQId(null);
                                        }}
                                        className="text-[11px] font-bold text-rose-700 px-2 py-1 bg-rose-50 rounded"
                                      >
                                        Confirm
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Situational Prompts List & Form */}
                      <div className="space-y-3 pt-4 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-slate-900">
                            Applied Situational Prompts ({subjectCertSituational.length})
                          </h3>
                          {!isCurriculumReadOnly && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setEditingSituationalDraft({
                                  sortOrder: 100 + subjectCertSituational.length + 1,
                                  keywordsText: 'clarity, structure, action',
                                  payload: {
                                    id: '',
                                    title: '',
                                    scenario: '',
                                    prompt: '',
                                    minWords: 60,
                                    rubricKeywords: ['clarity', 'structure', 'action'],
                                    rubricGuidance: '',
                                  },
                                })
                              }
                              className="text-xs h-8"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" /> Add Situational Prompt
                            </Button>
                          )}
                        </div>

                        {editingSituationalDraft && (
                          <form
                            onSubmit={handleSaveSituational}
                            className="p-4 rounded-xl bg-sky-50/50 border border-sky-200 space-y-3"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <input
                                type="text"
                                required
                                value={editingSituationalDraft.payload.title}
                                onChange={(e) =>
                                  setEditingSituationalDraft({
                                    ...editingSituationalDraft,
                                    payload: {
                                      ...editingSituationalDraft.payload,
                                      title: e.target.value,
                                    },
                                  })
                                }
                                placeholder="Case Title"
                                className="sm:col-span-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                              />
                              <input
                                type="number"
                                min={10}
                                value={editingSituationalDraft.payload.minWords}
                                onChange={(e) =>
                                  setEditingSituationalDraft({
                                    ...editingSituationalDraft,
                                    payload: {
                                      ...editingSituationalDraft.payload,
                                      minWords: Number(e.target.value) || 40,
                                    },
                                  })
                                }
                                placeholder="Min words"
                                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                              />
                            </div>
                            <textarea
                              rows={2}
                              value={editingSituationalDraft.payload.scenario}
                              onChange={(e) =>
                                setEditingSituationalDraft({
                                  ...editingSituationalDraft,
                                  payload: {
                                    ...editingSituationalDraft.payload,
                                    scenario: e.target.value,
                                  },
                                })
                              }
                              placeholder="Scenario context..."
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                            />
                            <textarea
                              rows={2}
                              required
                              value={editingSituationalDraft.payload.prompt}
                              onChange={(e) =>
                                setEditingSituationalDraft({
                                  ...editingSituationalDraft,
                                  payload: {
                                    ...editingSituationalDraft.payload,
                                    prompt: e.target.value,
                                  },
                                })
                              }
                              placeholder="Question prompt for student..."
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                            />
                            <input
                              type="text"
                              value={editingSituationalDraft.keywordsText}
                              onChange={(e) =>
                                setEditingSituationalDraft({
                                  ...editingSituationalDraft,
                                  keywordsText: e.target.value,
                                })
                              }
                              placeholder="Rubric keywords (comma separated, e.g. listen, acknowledge, propose)"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingSituationalDraft(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                size="sm"
                                className="bg-slate-900 hover:bg-slate-800 text-white text-xs"
                              >
                                Save Situational Prompt
                              </Button>
                            </div>
                          </form>
                        )}

                        <div className="space-y-2">
                          {subjectCertSituational.map((rec, idx) => {
                            const sp = rec.payload as LaunchpadSituationalPrompt;
                            const isDel = confirmDeleteCertQId === rec.id;
                            return (
                              <div
                                key={rec.id}
                                className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3"
                              >
                                <div className="space-y-1">
                                  <div className="text-xs font-bold text-slate-900">
                                    Prompt {idx + 1}: {sp.title}
                                  </div>
                                  <p className="text-[11px] text-slate-600 line-clamp-2">{sp.prompt}</p>
                                  <div className="text-[10px] text-slate-400">
                                    Min {sp.minWords} words · Keywords: {sp.rubricKeywords.join(', ')}
                                  </div>
                                </div>
                                {!isCurriculumReadOnly && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditingSituationalDraft({
                                          id: rec.id,
                                          sortOrder: rec.sortOrder,
                                          keywordsText: sp.rubricKeywords.join(', '),
                                          payload: JSON.parse(JSON.stringify(sp)),
                                        })
                                      }
                                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    {!isDel ? (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteCertQId(rec.id)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          deleteLaunchpadCertQuestion(rec.id);
                                          setConfirmDeleteCertQId(null);
                                        }}
                                        className="text-[11px] font-bold text-rose-700 px-2 py-1 bg-rose-50 rounded"
                                      >
                                        Confirm
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CREATE / EDIT SUBJECT MODAL */}
      {/* ========================================================================= */}
      {isSubjectModalOpen && editingSubjectDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleSaveSubjectDraft}
            className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {editingSubjectDraft.id.startsWith('subj_')
                  ? 'Create New Launchpad Subject'
                  : 'Edit Subject Details'}
              </h2>
              <button
                type="button"
                onClick={() => setIsSubjectModalOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-3">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Subject Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingSubjectDraft.title}
                    onChange={(e) =>
                      setEditingSubjectDraft({ ...editingSubjectDraft, title: e.target.value })
                    }
                    placeholder="e.g. Executive Research & Academic Writing"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Catalog Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editingSubjectDraft.order}
                    onChange={(e) =>
                      setEditingSubjectDraft({
                        ...editingSubjectDraft,
                        order: Number(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Short Description (Tooltip &amp; Inner Course Header)
                </label>
                <textarea
                  rows={2}
                  value={editingSubjectDraft.description}
                  onChange={(e) =>
                    setEditingSubjectDraft({ ...editingSubjectDraft, description: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Course Learning Goal
                </label>
                <input
                  type="text"
                  value={editingSubjectDraft.courseGoal || ''}
                  onChange={(e) =>
                    setEditingSubjectDraft({ ...editingSubjectDraft, courseGoal: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* Accent Theme */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Subject Accent Color
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {ACCENT_PRESETS.map((p) => (
                    <button
                      key={p.accentHex}
                      type="button"
                      onClick={() =>
                        setEditingSubjectDraft({
                          ...editingSubjectDraft,
                          accentHex: p.accentHex,
                          surfaceTint: p.surfaceTint,
                        })
                      }
                      className={cn(
                        'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform',
                        editingSubjectDraft.accentHex === p.accentHex
                          ? 'border-slate-900 scale-110'
                          : 'border-white shadow-xs'
                      )}
                      style={{ backgroundColor: p.accentHex }}
                      title={p.label}
                    >
                      {editingSubjectDraft.accentHex === p.accentHex && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minimalist Icon Picker */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Subject Illustration / Custom Icon
                  </label>
                  <div className="flex items-center gap-2">
                    {editingSubjectDraft.customIconUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditingSubjectDraft({ ...editingSubjectDraft, customIconUrl: '' })
                        }
                        className="text-xs font-semibold text-rose-600 hover:underline"
                      >
                        Clear Custom Icon
                      </button>
                    )}
                    <label className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer flex items-center gap-1">
                      <Upload className="w-3 h-3" /> Upload Custom Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCustomIconUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {LAUNCHPAD_ICON_OPTIONS.map((opt) => {
                    const selected =
                      !editingSubjectDraft.customIconUrl &&
                      editingSubjectDraft.iconKey === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setEditingSubjectDraft({
                            ...editingSubjectDraft,
                            iconKey: opt.id,
                            customIconUrl: '',
                          })
                        }
                        className={cn(
                          'p-2 rounded-xl border flex flex-col items-center gap-1 transition-all',
                          selected
                            ? 'border-indigo-600 bg-indigo-50/70'
                            : 'border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        <SubjectIllustration
                          subjectId={opt.id}
                          accentHex={editingSubjectDraft.accentHex}
                          className="w-10 h-10"
                        />
                        <span className="text-[10px] font-medium text-slate-600 truncate w-full text-center">
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsSubjectModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white">
                <Save className="w-4 h-4 mr-2" /> Save Subject
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ASSIGN STUDENTS MODAL */}
      {/* ========================================================================= */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Assign Students to Launchpad</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Subjects start Locked by default until you release them per student.
                </p>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  placeholder="Search available students..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {filteredAssignable.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  {assignableStudents.length === 0
                    ? 'All students in your scope are already enrolled in Launchpad.'
                    : 'No matching students found.'}
                </div>
              ) : (
                filteredAssignable.map((s) => {
                  const checked = selectedToAssign.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors',
                        checked
                          ? 'bg-indigo-50/70 border-indigo-200'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedToAssign((prev) =>
                              prev.includes(s.id)
                                ? prev.filter((id) => id !== s.id)
                                : [...prev, s.id]
                            )
                          }
                          className="w-4 h-4 rounded accent-indigo-600"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            {s.name}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {s.email} · {s.counselor || 'Unassigned'}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0 ml-2">
                        {s.intake || 'Fall 2026'}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500 tabular-nums">
                {selectedToAssign.length} selected
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setIsAssignModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmAssign}
                  disabled={selectedToAssign.length === 0 || isRosterReadOnly}
                  className="bg-slate-900 hover:bg-slate-800 text-white"
                >
                  Assign to Launchpad
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PER-STUDENT SUBJECT RELEASE DRAWER */}
      {/* ========================================================================= */}
      {drawerStudent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
            <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  Subject Release Matrix
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                  {drawerStudent.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {drawerStudent.email} · Counselor: {drawerStudent.counselor || 'Unassigned'}
                </p>
              </div>
              <button
                onClick={() => setDrawerStudent(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isRosterReadOnly && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-700" />
                  <span>Read-Only Access: Subject lock/unlock toggles are disabled.</span>
                </div>
              )}

              <div className="divide-y divide-slate-200 border border-slate-200 rounded-2xl overflow-hidden">
                {activeSubjects.map((subject) => {
                  const isUnlocked = isSubjectUnlockedForStudentObj(drawerStudent, subject.id);
                  const cert = launchpadCertifications.find(
                    (c) =>
                      c.studentId === drawerStudent.id &&
                      c.subjectId === subject.id &&
                      c.passed
                  );
                  const { done, total } = getSubjectWeeksDone(drawerStudent.id, subject.id);

                  return (
                    <div
                      key={subject.id}
                      className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400 tabular-nums">
                            {String(subject.order).padStart(2, '0')}.
                          </span>
                          <span className="text-sm font-semibold text-slate-900">
                            {subject.title}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 pl-6 tabular-nums">
                          <span>
                            {total > 0
                              ? `Progress: Week ${done}/${total}`
                              : 'Curriculum Coming Soon'}
                          </span>
                          {cert && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                <Award className="w-3.5 h-3.5" />
                                Certified ({cert.testScore}% · {cert.certificateCode})
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 pl-6 sm:pl-0">
                        <span
                          className={cn(
                            'text-xs font-semibold flex items-center gap-1 w-20 justify-end',
                            isUnlocked ? 'text-emerald-700' : 'text-slate-400'
                          )}
                        >
                          {isUnlocked ? (
                            <>
                              <Unlock className="w-3.5 h-3.5" /> Unlocked
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" /> Locked
                            </>
                          )}
                        </span>

                        <button
                          type="button"
                          disabled={isRosterReadOnly}
                          title={
                            isRosterReadOnly
                              ? 'Read-Only Access'
                              : isUnlocked
                              ? 'Lock subject for student'
                              : 'Unlock & release subject to student'
                          }
                          onClick={async () => {
                            if (isRosterReadOnly) return;
                            const nextState = !isUnlocked;
                            const ok = await toggleLaunchpadSubjectRelease(
                              drawerStudent.id,
                              subject.id,
                              nextState,
                              currentUser?.name || 'Counselor',
                              drawerStudent.email
                            );
                            if (ok) {
                              showToast(
                                `${nextState ? 'Unlocked' : 'Locked'} "${subject.title}" for ${drawerStudent.name}`
                              );
                            } else {
                              showToast(
                                `Could not save "${subject.title}" status to server. Please retry.`
                              );
                            }
                          }}
                          className={cn(
                            'w-12 h-6 rounded-full relative transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                            isRosterReadOnly
                              ? 'opacity-50 cursor-not-allowed bg-slate-300'
                              : isUnlocked
                              ? 'bg-emerald-600 cursor-pointer'
                              : 'bg-slate-300 cursor-pointer'
                          )}
                        >
                          <span
                            className={cn(
                              'absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-xs',
                              isUnlocked ? 'translate-x-6' : ''
                            )}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Weekly Progress & Practical Submissions Inspector */}
              {subjectsWithChapters.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Weekly Progress &amp; Practical Submissions
                    </h3>
                    {subjectsWithChapters.length > 1 && (
                      <select
                        value={drawerInspectSubjectId}
                        onChange={(e) => {
                          setDrawerInspectSubjectId(e.target.value);
                          setExpandedWeekSubmission(null);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
                      >
                        {subjectsWithChapters.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-2xl divide-y divide-slate-200 overflow-hidden">
                    {getChaptersForSubject(drawerInspectSubjectId).map((w) => {
                      const wp = safeLaunchpadProgress.find(
                        (p) =>
                          p.studentId === drawerStudent.id &&
                          p.subjectId === drawerInspectSubjectId &&
                          p.weekNumber === w.weekNumber
                      );
                      const hasSubmission = Boolean(
                        wp?.exerciseSubmissionJson?.fields ||
                          wp?.exerciseSubmissionJson?.attachmentUrl
                      );
                      const isExpanded = expandedWeekSubmission === w.weekNumber;

                      return (
                        <div key={w.weekNumber} className="bg-white">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedWeekSubmission(isExpanded ? null : w.weekNumber)
                            }
                            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-slate-900">
                                  Week {w.weekNumber}: {w.title}
                                </span>
                                {wp?.evaluationStatus && (
                                  <span
                                    className={cn(
                                      'px-2 py-0.5 rounded-md text-[10px] font-bold',
                                      wp.evaluationStatus === 'Approved' ||
                                        wp.evaluationStatus === 'Reviewed'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : wp.evaluationStatus === 'Needs Revision'
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                    )}
                                  >
                                    {wp.evaluationStatus}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                                <span>Guide: {wp?.readingCompleted ? 'Done' : 'Pending'}</span>
                                <span aria-hidden="true">·</span>
                                <span>Lecture: {wp?.lectureCompleted ? 'Done' : 'Pending'}</span>
                                <span aria-hidden="true">·</span>
                                <span>
                                  Exercise: {wp?.exerciseCompleted ? 'Submitted' : 'Pending'}
                                </span>
                              </div>
                            </div>
                            {hasSubmission &&
                              (isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                              ))}
                          </button>

                          {isExpanded && (
                            <div className="px-4 pb-4 pt-2 bg-slate-50 border-t border-slate-100 space-y-2.5 text-xs">
                              {!hasSubmission ? (
                                <p className="text-slate-500 italic">
                                  No exercise worksheet submitted yet for Week {w.weekNumber}.
                                </p>
                              ) : (
                                <>
                                  {w.practicalExercise.fields.map((f) => (
                                    <div key={f.key} className="space-y-0.5">
                                      <div className="font-semibold text-slate-700">{f.label}</div>
                                      <div className="text-slate-600 whitespace-pre-wrap bg-white p-2.5 rounded-lg border border-slate-200">
                                        {wp?.exerciseSubmissionJson?.fields?.[f.key] || '—'}
                                      </div>
                                    </div>
                                  ))}
                                  {wp?.exerciseSubmissionJson?.attachmentUrl && (
                                    <div>
                                      <span className="font-semibold text-slate-700">
                                        Attachment:{' '}
                                      </span>
                                      <a
                                        href={wp.exerciseSubmissionJson.attachmentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download={wp.exerciseSubmissionJson.attachmentName || undefined}
                                        className="text-indigo-600 hover:underline break-all inline-flex items-center gap-1"
                                      >
                                        <span>
                                          {wp.exerciseSubmissionJson.attachmentName ||
                                            wp.exerciseSubmissionJson.attachmentUrl}
                                        </span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </div>
                                  )}
                                  {wp?.evaluatorFeedback && (
                                    <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-200">
                                      <div className="text-[11px] font-bold text-indigo-900">
                                        Counselor Feedback ({wp.evaluatedBy || 'Team'}):
                                      </div>
                                      <div className="text-slate-700 mt-0.5">
                                        {wp.evaluatorFeedback}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
