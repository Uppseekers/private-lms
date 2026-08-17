import { useDatabase } from '@/context/DatabaseContext';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Search, Filter, Plus, FileText, CheckCircle2, AlertCircle, Clock, 
  ChevronRight, GraduationCap, X, UploadCloud, Link as LinkIcon, Eye, ShieldCheck, Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import DocumentPreviewModal from '@/components/DocumentPreviewModal';

// Shared types and data
interface RequiredDoc {
  id: string;
  name: string;
}

interface AttachedDoc {
  docId: string;
  name?: string;
  fileName?: string;
  fileUrl?: string;
  status: 'verified' | 'rejected' | 'pending' | 'draft' | 'missing';
  uploadedAt?: string;
  uploadedBy?: string;
  verifiedAt?: string;
  notes?: string;
  category?: string;
}

interface University {
  id: string;
  name: string;
  category: 'Reach' | 'Target' | 'Safety';
  major: string;
  round: string;
  deadline: string;
  portalLink: string;
  requiredDocs: RequiredDoc[];
  attachedDocs: Record<string, AttachedDoc>;
}

const mockRequiredDocs: RequiredDoc[] = [
  { id: 'doc1', name: 'High School Transcripts (9–12)' },
  { id: 'doc2', name: 'SAT / ACT Official Scorecard' },
  { id: 'doc3', name: 'English Test (IELTS / TOEFL / DET)' },
  { id: 'doc4', name: 'Personal Statement / Main Essay' },
  { id: 'doc5', name: 'Supplemental Essay(s)' },
  { id: 'doc6', name: 'Internships' },
  { id: 'doc7', name: 'Research Projects' },
  { id: 'doc8', name: 'Passion Projects' },
  { id: 'doc9', name: 'Impact Project / Community Service' },
  { id: 'doc10', name: 'MOOCs & Online Certifications' },
  { id: 'doc11', name: 'Competitions & Olympiads' },
  { id: 'doc12', name: 'Financial Bank Statement / Affidavit' },
];

export default function StudentUniversities() {
  const { currentUser, students, updateStudent } = useDatabase();
  const student = students.find(s => s.id === currentUser.id || s.email === currentUser.email) || (currentUser as any);
  const rawShortlist = student?.shortlist || [];

  const [expandedUniId, setExpandedUniId] = useState<string | null>(null);
  const [attachModalOpen, setAttachModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<{uniId: string, reqId: string, reqName: string} | null>(null);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [isAddUniModalOpen, setIsAddUniModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Reach' | 'Target' | 'Safety'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // New Uni form state
  const [newUniName, setNewUniName] = useState('');
  const [newUniCategory, setNewUniCategory] = useState<'Reach' | 'Target' | 'Safety'>('Target');
  const [newUniMajor, setNewUniMajor] = useState('Computer Science');
  const [newUniRound, setNewUniRound] = useState('Regular Decision (RD)');
  const [newUniDeadline, setNewUniDeadline] = useState('');
  const [newUniPortal, setNewUniPortal] = useState('https://commonapp.org');

  // Normalize universities
  const shortlist = rawShortlist.map((uni: any, idx: number) => {
    let reqDocs: RequiredDoc[] = [];
    if (Array.isArray(uni.requiredDocs) && uni.requiredDocs.length > 0) {
      reqDocs = uni.requiredDocs.map((item: any, i: number) => {
        if (typeof item === 'string') {
          return { id: `doc_${i}_${item.slice(0, 8)}`, name: item };
        }
        return { id: item.id || `doc_${i}`, name: item.name || `Document ${i + 1}` };
      });
    } else {
      reqDocs = mockRequiredDocs.slice(0, 5);
    }

    return {
      id: uni.id || `U-${idx + 1}`,
      name: uni.name || 'University',
      category: (uni.category || 'Target') as 'Reach' | 'Target' | 'Safety',
      major: uni.major || 'B.S. Program',
      round: uni.round || 'Regular Decision',
      deadline: uni.deadline || '2026-11-01T23:59',
      portalLink: uni.portalLink || 'https://commonapp.org',
      requiredDocs: reqDocs,
      attachedDocs: (uni.attachedDocs && typeof uni.attachedDocs === 'object') ? uni.attachedDocs : {}
    };
  });

  const handleAddUniversity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUniName.trim() || !student) return;

    const newUni = {
      id: 'U-' + Date.now(),
      name: newUniName.trim(),
      category: newUniCategory,
      major: newUniMajor,
      round: newUniRound,
      deadline: newUniDeadline || '2026-12-01T23:59',
      portalLink: newUniPortal,
      requiredDocs: mockRequiredDocs.slice(0, 6),
      attachedDocs: {}
    };

    const updatedShortlist = [...(student.shortlist || []), newUni];
    updateStudent({
      ...student,
      shortlist: updatedShortlist,
      activities: [
        {
          id: Math.random().toString(),
          date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
          type: 'UPDATE',
          description: `Added target university: ${newUni.name}`
        },
        ...(student.activities || [])
      ]
    });

    setNewUniName('');
    setIsAddUniModalOpen(false);
  };

  const handleRemoveUniversity = (uniId: string) => {
    if (!student) return;
    const targetUni = shortlist.find((u: any) => u.id === uniId);
    const updatedShortlist = (student.shortlist || []).filter((u: any) => u.id !== uniId && u.name !== targetUni?.name);
    updateStudent({
      ...student,
      shortlist: updatedShortlist,
      activities: [
        {
          id: Math.random().toString(),
          date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
          type: 'UPDATE',
          description: `Removed university from shortlist: ${targetUni?.name || 'University'}`
        },
        ...(student.activities || [])
      ]
    });
  };

  const handleAttachFile = (fileName: string, fileUrl?: string) => {
    if (!selectedReq || !student) return;
    const { uniId, reqId, reqName } = selectedReq;
    const nowStr = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true });

    const newAttachedDoc: AttachedDoc = {
      docId: reqId,
      name: fileName,
      fileName: fileName,
      fileUrl: fileUrl || '',
      status: 'pending', // Pending counselor verification
      uploadedAt: nowStr,
      uploadedBy: student.name,
      category: 'Checklist Upload'
    };

    // Update shortlist
    const targetUni = shortlist.find((u: any) => u.id === uniId);
    const updatedShortlist = (student.shortlist || []).map((u: any) => {
      if (u.id === uniId || u.name === targetUni?.name) {
        const currentAttached = u.attachedDocs || {};
        return {
          ...u,
          attachedDocs: {
            ...currentAttached,
            [reqId]: newAttachedDoc,
            [reqName]: newAttachedDoc
          }
        };
      }
      return u;
    });

    // Also add to student.documents vault if not already there
    const existingDocIdx = (student.documents || []).findIndex((d: any) => d.name === fileName);
    let updatedDocuments = [...(student.documents || [])];
    if (existingDocIdx === -1) {
      updatedDocuments.unshift({
        id: `doc_${Date.now()}`,
        name: fileName,
        category: 'Application Doc',
        type: fileName.endsWith('.pdf') ? 'PDF Document' : 'Document',
        uploadedBy: student.name,
        target: targetUni?.name || 'Target University',
        status: 'pending',
        date: nowStr,
        fileUrl: fileUrl || ''
      });
    }

    updateStudent({
      ...student,
      shortlist: updatedShortlist,
      documents: updatedDocuments,
      activities: [
        {
          id: Math.random().toString(),
          date: nowStr,
          type: 'UPLOAD',
          description: `Uploaded "${fileName}" for ${targetUni?.name || 'University'} (Pending counselor review)`
        },
        ...(student.activities || [])
      ]
    });

    setAttachModalOpen(false);
    setSelectedReq(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      handleAttachFile(file.name, dataUrl);
    };
    reader.onerror = () => {
      handleAttachFile(file.name);
    };
    reader.readAsDataURL(file);
  };

  // Filtered universities
  const filteredShortlist = shortlist.filter((uni: any) => {
    const matchesCategory = categoryFilter === 'All' || uni.category === categoryFilter;
    const matchesSearch = !searchQuery.trim() || 
      uni.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      uni.major.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (shortlist.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 max-w-md mx-auto">
        <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center mb-3 text-blue-600 shadow-2xs">
          <GraduationCap className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Your University Shortlist is Empty</h2>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
          Target universities are shortlisted and managed by your lead counselor: <strong className="text-slate-800">{student?.counselor || 'Assigned Lead Counselor'}</strong>.
        </p>
      </div>
    );
  }

  // Stats calculation
  const totalDocsNeeded = shortlist.reduce((acc: number, uni: any) => acc + (uni.requiredDocs?.length || 0), 0);
  const totalDocsAttached = shortlist.reduce((acc: number, uni: any) => acc + (uni.attachedDocs ? Object.keys(uni.attachedDocs).length : 0), 0);
  const overallReadiness = totalDocsNeeded > 0 ? Math.round((totalDocsAttached / totalDocsNeeded) * 100) : 0;

  const reachCount = shortlist.filter((u: any) => u.category === 'Reach').length;
  const targetCount = shortlist.filter((u: any) => u.category === 'Target').length;
  const safetyCount = shortlist.filter((u: any) => u.category === 'Safety').length;

  const getCategoryBadge = (cat: 'Reach' | 'Target' | 'Safety') => {
    switch (cat) {
      case 'Reach':
        return 'bg-rose-50 text-rose-700 border-rose-200/80';
      case 'Target':
        return 'bg-amber-50 text-amber-700 border-amber-200/80';
      case 'Safety':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const openAttachModal = (uniId: string, reqId: string, reqName: string) => {
    setSelectedReq({ uniId, reqId, reqName });
    setAttachModalOpen(true);
  };

  // Student available vault documents
  const vaultDocs = student?.documents && student.documents.length > 0
    ? student.documents
    : [
        { id: 'v1', name: 'HS_Transcripts_Official.pdf', category: 'Academic', date: '2026-08-01', status: 'verified' },
        { id: 'v2', name: 'Columbia_Essay_v2.docx', category: 'Essays', date: '2026-08-05', status: 'pending' },
        { id: 'v3', name: 'Bank_Statement_Affidavit.pdf', category: 'Financial', date: '2026-07-28', status: 'verified' },
        { id: 'v4', name: 'TOEFL_Report.pdf', category: 'Test Scores', date: '2026-07-15', status: 'verified' },
        { id: 'v5', name: 'SAT_Scorecard_Official.pdf', category: 'Test Scores', date: '2026-08-02', status: 'verified' }
      ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">University Shortlist</h1>
            <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
              {shortlist.length} Listed
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Admissions target pipeline, application deadlines & document readiness.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <GraduationCap className="w-4 h-4 text-blue-600" />
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block leading-none">Counselor</span>
              <span className="font-semibold text-slate-800">{student?.counselor || 'Lead Counselor'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Portfolio KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Total Shortlist KPI */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Shortlist</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">{shortlist.length}</span>
            <span className="text-[11px] font-medium text-slate-500">Universities</span>
          </div>
        </div>

        {/* Reach KPI */}
        <div className="bg-rose-50/40 p-3.5 rounded-xl border border-rose-100/80 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700/80">Reach</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-rose-900 tracking-tight">{reachCount}</span>
            <span className="text-[11px] font-semibold text-rose-600">
              {shortlist.length > 0 ? Math.round((reachCount / shortlist.length) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Target KPI */}
        <div className="bg-amber-50/40 p-3.5 rounded-xl border border-amber-100/80 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700/80">Target</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-amber-900 tracking-tight">{targetCount}</span>
            <span className="text-[11px] font-semibold text-amber-600">
              {shortlist.length > 0 ? Math.round((targetCount / shortlist.length) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Safety KPI */}
        <div className="bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100/80 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700/80">Safety</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-emerald-900 tracking-tight">{safetyCount}</span>
            <span className="text-[11px] font-semibold text-emerald-600">
              {shortlist.length > 0 ? Math.round((safetyCount / shortlist.length) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Portfolio Readiness Meter */}
        <div className="col-span-2 md:col-span-1 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Readiness Score</span>
            <span className="text-xs font-bold text-blue-600">{overallReadiness}%</span>
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${overallReadiness}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 block text-right font-medium">
              {totalDocsAttached} of {totalDocsNeeded} Docs Attached
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
        {/* Category Filters */}
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg">
          {(['All', 'Reach', 'Target', 'Safety'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                categoryFilter === cat
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search university or major..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50/80 border border-slate-200 rounded-lg pl-8 pr-3 py-1 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Compact List of Universities */}
      <div className="space-y-3">
        {filteredShortlist.map((uni: any) => {
          const uniAttached = Object.keys(uni.attachedDocs || {}).length;
          const uniTotal = uni.requiredDocs.length;
          const uniPercent = uniTotal > 0 ? Math.round((uniAttached / uniTotal) * 100) : 0;
          const isExpanded = expandedUniId === uni.id;

          const formattedDeadline = isNaN(new Date(uni.deadline).getTime()) 
            ? uni.deadline 
            : new Date(uni.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

          return (
            <div 
              key={uni.id} 
              className={cn(
                "bg-white rounded-xl border transition-all duration-150 overflow-hidden shadow-2xs",
                isExpanded ? "border-blue-300 ring-2 ring-blue-50/50" : "border-slate-200/90 hover:border-slate-300"
              )}
            >
              {/* Card Main Row */}
              <div 
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
                onClick={() => setExpandedUniId(isExpanded ? null : uni.id)}
              >
                {/* Left Info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 text-slate-500">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm tracking-tight truncate hover:text-blue-600 transition-colors">
                        {uni.name}
                      </h3>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                        getCategoryBadge(uni.category)
                      )}>
                        {uni.category}
                      </span>
                    </div>
                    
                    <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">
                      {uni.major} • <span className="text-slate-700">{uni.round}</span>
                    </p>
                  </div>
                </div>

                {/* Right Meta Info & Progress */}
                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  
                  {/* Deadline Tag */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="font-medium">{formattedDeadline}</span>
                  </div>

                  {/* Document Completion Progress Pill */}
                  <div className="flex items-center gap-2.5">
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900 block">{uniAttached}/{uniTotal} Docs</span>
                      <span className="text-[10px] text-slate-400 font-medium">{uniPercent}% Ready</span>
                    </div>

                    <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-300", uniPercent >= 100 ? "bg-emerald-500" : "bg-blue-600")}
                        style={{ width: `${uniPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRemoveUniversity(uni.id); }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Remove from shortlist"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className={cn(
                      "p-1.5 rounded-lg text-slate-400 transition-transform duration-200",
                      isExpanded ? "rotate-90 text-blue-600 bg-blue-50" : "hover:bg-slate-100"
                    )}>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>

                </div>
              </div>

              {/* Compact Drawer for Documents Checklist */}
              {isExpanded && (
                <div className="border-t border-slate-200/80 bg-slate-50/70 p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200/60">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        Application Checklist & Verification ({uniAttached}/{uniTotal})
                      </span>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Uploaded documents undergo official verification by your assigned counselor.
                      </p>
                    </div>
                    {uni.portalLink && (
                      <a 
                        href={uni.portalLink} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline shrink-0"
                      >
                        Application Portal <LinkIcon className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {uni.requiredDocs.map((req: RequiredDoc, index: number) => {
                      const attached: AttachedDoc | undefined = uni.attachedDocs[req.id] || uni.attachedDocs[req.name];
                      const isVerified = attached?.status === 'verified';
                      const isRejected = attached?.status === 'rejected';
                      const isPending = !!attached && !isVerified && !isRejected;
                      const hasDoc = !!attached;

                      return (
                        <div 
                          key={req.id || index} 
                          className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between gap-2.5 shadow-2xs hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div className="shrink-0 mt-0.5">
                                {isVerified ? (
                                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </div>
                                ) : isRejected ? (
                                  <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                  </div>
                                ) : isPending ? (
                                  <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                                    <Clock className="w-3.5 h-3.5" />
                                  </div>
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                                    <FileText className="w-3.5 h-3.5" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">{req.name}</p>
                                {hasDoc ? (
                                  <p className="text-[11px] font-medium text-slate-600 truncate flex items-center gap-1.5 mt-0.5">
                                    <span>📄 {attached.fileName || attached.name || 'Document Attached'}</span>
                                    {attached.uploadedAt && <span className="text-[10px] text-slate-400">({attached.uploadedAt})</span>}
                                  </p>
                                ) : (
                                  <p className="text-[10px] text-slate-400 italic mt-0.5">
                                    Not uploaded yet
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div>
                              {isVerified ? (
                                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                                  <ShieldCheck className="w-3 h-3" /> Counselor Verified
                                </span>
                              ) : isRejected ? (
                                <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                                  <AlertCircle className="w-3 h-3" /> Needs Revision
                                </span>
                              ) : isPending ? (
                                <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                                  <Clock className="w-3 h-3" /> Pending Review
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded shrink-0">
                                  Action Required
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Notes if revision requested */}
                          {attached?.notes && (
                            <div className="text-[10px] text-rose-700 bg-rose-50/70 p-2 rounded-lg border border-rose-100 font-medium">
                              <strong>Counselor Note:</strong> {attached.notes}
                            </div>
                          )}

                          {/* Actions: Preview & Attach */}
                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                            {hasDoc && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPreviewDoc({
                                  id: attached.docId || req.id,
                                  name: attached.fileName || attached.name || req.name,
                                  category: attached.category || 'Application Doc',
                                  type: (attached.fileName?.endsWith('.pdf') || attached.name?.endsWith('.pdf')) ? 'PDF Document' : 'Document',
                                  status: isVerified ? 'Verified' : isRejected ? 'Rejected' : 'Pending',
                                  date: attached.uploadedAt || 'Recent',
                                  fileUrl: attached.fileUrl || '',
                                  studentName: student.name,
                                  studentId: student.id,
                                  notes: attached.notes
                                })}
                                className="text-[11px] h-7 px-2.5 rounded-lg font-semibold text-blue-700 border-blue-200 hover:bg-blue-50 flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" /> Preview
                              </Button>
                            )}

                            <Button 
                              size="sm" 
                              variant={hasDoc ? "outline" : "default"}
                              onClick={() => openAttachModal(uni.id, req.id, req.name)}
                              className={cn(
                                "text-[11px] h-7 px-2.5 rounded-lg shrink-0 font-semibold",
                                hasDoc 
                                  ? "border-slate-200 text-slate-600 hover:bg-slate-50" 
                                  : "bg-blue-600 hover:bg-blue-700 text-white"
                              )}
                            >
                              <UploadCloud className="w-3.5 h-3.5 mr-1" />
                              {hasDoc ? "Change File" : "Attach File"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredShortlist.length === 0 && (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
            No universities found matching your filter criteria.
          </div>
        )}
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal 
          doc={previewDoc} 
          onClose={() => setPreviewDoc(null)} 
          isStaff={false}
        />
      )}

      {/* Add University Modal */}
      {isAddUniModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Add Target University</h3>
              <button onClick={() => setIsAddUniModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddUniversity} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase mb-1 block">University Name</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Stanford University" 
                  value={newUniName} 
                  onChange={e => setNewUniName(e.target.value)} 
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase mb-1 block">Category</label>
                  <select 
                    value={newUniCategory} 
                    onChange={e => setNewUniCategory(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs outline-none bg-white"
                  >
                    <option value="Reach">Reach</option>
                    <option value="Target">Target</option>
                    <option value="Safety">Safety</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase mb-1 block">Round</label>
                  <select 
                    value={newUniRound} 
                    onChange={e => setNewUniRound(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs outline-none bg-white"
                  >
                    <option value="Early Decision (ED)">Early Decision (ED)</option>
                    <option value="Early Action (EA)">Early Action (EA)</option>
                    <option value="Regular Decision (RD)">Regular Decision (RD)</option>
                    <option value="Rolling">Rolling</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase mb-1 block">Major / Program</label>
                <input 
                  type="text" 
                  placeholder="e.g. B.S. in Computer Science" 
                  value={newUniMajor} 
                  onChange={e => setNewUniMajor(e.target.value)} 
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase mb-1 block">Deadline Date</label>
                <input 
                  type="date" 
                  value={newUniDeadline} 
                  onChange={e => setNewUniDeadline(e.target.value)} 
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs outline-none bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddUniModalOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">
                  Add University
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attach Modal */}
      {attachModalOpen && selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Attach Document</h3>
                <p className="text-xs text-slate-500 font-medium">Requirement: <span className="text-slate-800 font-bold">{selectedReq.reqName}</span></p>
              </div>
              <button onClick={() => setAttachModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-100 text-[11px] text-blue-800">
                <p className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  Counselor Verification Policy
                </p>
                <p className="text-blue-700 mt-0.5">
                  When you attach or update a document, it will be marked as <strong>Pending Verification</strong> until your assigned counselor inspects and approves it.
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Select from Student Vault ({vaultDocs.length})
                </span>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                  <div className="max-h-44 overflow-y-auto p-2 space-y-1 divide-y divide-slate-100">
                    {vaultDocs.map((doc: any, i: number) => (
                      <button 
                        key={doc.id || i} 
                        type="button"
                        onClick={() => handleAttachFile(doc.name, doc.fileUrl)}
                        className="w-full flex items-center justify-between p-2 hover:bg-blue-50 rounded-lg text-left transition-colors border border-transparent hover:border-blue-200"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-slate-800 block truncate">{doc.name}</span>
                            <span className="text-[10px] text-slate-400">{doc.category || 'Vault File'} • {doc.date || 'Saved'}</span>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-blue-600 shrink-0 ml-2 px-2.5 py-1 bg-blue-100/60 rounded-md hover:bg-blue-200">Select</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">OR UPLOAD NEW FILE</span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>

              <label className="border-2 border-dashed border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-200 cursor-pointer transition-colors group">
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                />
                <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-blue-600 mb-1 transition-colors" />
                <p className="text-xs font-bold text-slate-700">Browse file or drag here</p>
                <p className="text-[10px] text-slate-400">PDF, DOCX, PNG, JPG up to 25MB</p>
              </label>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setAttachModalOpen(false)} className="text-xs">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
