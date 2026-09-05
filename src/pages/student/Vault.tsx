import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, CheckCircle2, AlertCircle, Clock, X, Trash2, Eye, Download, FileText, Search, Filter, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDatabase } from '@/context/DatabaseContext';
import PortalCredentialsManager from '@/components/PortalCredentialsManager';
import { PortalCredential } from '@/types';

interface DocumentInfo {
  id: string;
  name: string;
  category: string;
  type: string;
  uploadedBy: string;
  target?: string;
  notes?: string;
  status: 'draft' | 'pending' | 'verified' | 'rejected' | 'Pending' | 'Verified' | 'Rejected';
  date: string;
  fileExt: string;
  fileUrl?: string;
}

const CATEGORIES = {
  'Certificates & Awards': [
    'Official Certificate / Honor Award',
    'Competition / Olympiad Award Certificate',
    'Scholarship / Excellence Recognition',
    'Extracurricular Certificate / Badge',
  ],
  'Experience & Projects': [
    'Project Report / Research Portfolio',
    'Internship Completion Letter / Certificate',
    'Community Impact / Volunteering Proof',
    'Work Experience / Leadership Portfolio',
  ],
  'Academic Records': [
    'High School Transcript (Grade 9, 10, 11, 12)',
    'Projected / Predicted Grades Sheet',
    'High School Diploma / Graduation Certificate',
    'School Mid-Term / Terminal Reports',
    'Course Syllabi / Course Descriptions',
  ],
  'Standardized Tests': [
    'SAT Official Score Report',
    'ACT Official Score Report',
    'AP Score Report',
    'PSAT / NMSQT Score Sheet',
  ],
  'Language Proficiency': [
    'IELTS Test Report Form (TRF)',
    'TOEFL iBT Score Report',
    'Duolingo English Test (DET) Certificate',
    'PTE Academic Score Card',
  ],
  'Identity & Civil Documents': [
    'Passport (Bio Page)',
    'National Identity Card',
    'Birth Certificate',
    'Passport-Size Photo / Digital Headshot',
  ],
  'Financial & Visa Documents': [
    'Bank Statement / Solvency Certificate',
    'Financial Guarantee / Affidavit of Support',
    'Tax Returns / Proof of Income',
    'Property Evaluation / Asset Proof',
    'Scholarship Award Letter',
  ],
  'Application & Writing Assets': [
    'Statement of Purpose (SOP) / Personal Statement',
    'Supplemental Essay Draft',
    'Student Resume / CV',
    'Portfolio / Writing Sample',
  ],
  'Recommendations & Research': [
    'Letter of Recommendation (LOR) — Academic',
    'Letter of Recommendation (LOR) — Counselor',
    'Letter of Recommendation (LOR) — Professional',
    'Research Paper Draft / Abstract',
  ],
  'Administrative & Visa': [
    'College Offer Letter / Admission Decision',
    'Form I-20 / CAS Document',
    'Visa Application Form / Visa Copy',
    'Immunization / Medical Records',
  ]
};

export default function StudentVault() {
  const { students, updateStudent, currentUser } = useDatabase();
  const student = students.find(s => s.id === currentUser?.id || s.email === currentUser?.email) || students[0];
  if (!student) return null;
  const documents: DocumentInfo[] = (student.documents || []) as DocumentInfo[];

  const [vaultMode, setVaultMode] = useState<'documents' | 'credentials'>('documents');

  const currentCredentials: PortalCredential[] = useMemo(() => {
    if (student.credentials && student.credentials.length > 0) {
      return student.credentials;
    }
    return [
      {
        id: 'CRED-SAMPLE-1',
        title: 'Common Application',
        category: 'Application System',
        websiteUrl: 'https://apply.commonapp.org',
        username: student.email || 'anya.patel@example.com',
        password: 'Pass#2026!Apply',
        pinOrCode: 'CAID: 8849201',
        notes: 'Submitted early applications. Remember to check recommender submission status.',
        lastUpdated: 'Aug 24, 2026'
      },
      {
        id: 'CRED-SAMPLE-2',
        title: 'College Board (SAT & AP)',
        category: 'Testing & Scores',
        websiteUrl: 'https://mysat.collegeboard.org',
        username: student.email || 'anya.patel@example.com',
        password: 'SatBoard#Score26',
        pinOrCode: 'CBID: 94821039',
        notes: 'SAT official score reports sent to target schools.',
        lastUpdated: 'Aug 15, 2026'
      }
    ];
  }, [student.credentials, student.email]);

  const handleUpdateCredentials = (newCredentials: PortalCredential[]) => {
    updateStudent({
      ...student,
      credentials: newCredentials
    });
  };

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [previewDoc, setPreviewDoc] = useState<DocumentInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState<'ALL' | '7d' | '30d' | '90d' | 'this_year'>('ALL');

  // Form State
  const [selectedCategory, setSelectedCategory] = useState(Object.keys(CATEGORIES)[0]);
  const [selectedType, setSelectedType] = useState(CATEGORIES[Object.keys(CATEGORIES)[0] as keyof typeof CATEGORIES][0]);
  const [docName, setDocName] = useState(selectedType);
  const [docTarget, setDocTarget] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCat = e.target.value;
    setSelectedCategory(newCat);
    const newType = CATEGORIES[newCat as keyof typeof CATEGORIES][0];
    setSelectedType(newType);
    setDocName(newType);
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value;
    setSelectedType(newType);
    setDocName(newType);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = () => {
    if (!selectedFile && !docName) return;

    let ext = 'pdf';
    if (selectedFile) {
      const parts = selectedFile.name.split('.');
      if (parts.length > 1) ext = parts.pop()!.toLowerCase();
    }

    const saveDoc = (fileDataUrl?: string) => {
      const newDoc: DocumentInfo = {
        id: `DOC-${Date.now()}`,
        name: docName || selectedType,
        category: selectedCategory,
        type: selectedType,
        uploadedBy: student.name || 'Student',
        target: docTarget,
        notes: docNotes,
        status: selectedCategory === 'Application & Writing Assets' ? 'draft' : 'pending',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        fileExt: ext,
        fileUrl: fileDataUrl || ''
      };

      const updatedDocs = [newDoc, ...documents];

      updateStudent({
        ...student,
        documents: updatedDocs
      });

      setIsUploadModalOpen(false);
      resetForm();
    };

    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        saveDoc(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      saveDoc();
    }
  };

  const handleDeleteDoc = (docId: string) => {
    const updatedDocs = documents.filter(d => d.id !== docId);
    updateStudent({
      ...student,
      documents: updatedDocs
    });
  };

  const resetForm = () => {
    const defaultCat = Object.keys(CATEGORIES)[0];
    setSelectedCategory(defaultCat);
    const defaultType = CATEGORIES[defaultCat as keyof typeof CATEGORIES][0];
    setSelectedType(defaultType);
    setDocName(defaultType);
    setDocTarget('');
    setDocNotes('');
    setSelectedFile(null);
  };

  const handleOpenUpload = () => {
    resetForm();
    setIsUploadModalOpen(true);
  };

  const filteredDocs = documents.filter(d => {
    // Tab Status Filter
    const st = d.status?.toLowerCase();
    if (activeTab === 'Action Needed' && st !== 'rejected') return false;
    if (activeTab === 'Verified' && st !== 'verified') return false;
    if (activeTab === 'Drafts' && st !== 'draft') return false;

    // Category Filter
    if (selectedCategoryFilter !== 'ALL' && d.category !== selectedCategoryFilter) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (d.name || '').toLowerCase().includes(q);
      const matchCat = (d.category || '').toLowerCase().includes(q);
      const matchType = (d.type || '').toLowerCase().includes(q);
      const matchTarget = (d.target || '').toLowerCase().includes(q);
      const matchNotes = (d.notes || '').toLowerCase().includes(q);
      if (!matchName && !matchCat && !matchType && !matchTarget && !matchNotes) {
        return false;
      }
    }

    // Date Filter
    if (selectedDateFilter !== 'ALL') {
      const docDate = new Date(d.date);
      if (!isNaN(docDate.getTime())) {
        const now = new Date();
        const diffDays = (now.getTime() - docDate.getTime()) / (1000 * 3600 * 24);
        if (selectedDateFilter === '7d' && diffDays > 7) return false;
        if (selectedDateFilter === '30d' && diffDays > 30) return false;
        if (selectedDateFilter === '90d' && diffDays > 90) return false;
        if (selectedDateFilter === 'this_year' && docDate.getFullYear() !== now.getFullYear()) return false;
      }
    }

    return true;
  });

  const getStatusBadge = (status: string) => {
    const st = status?.toLowerCase();
    switch (st) {
      case 'verified':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700"><CheckCircle2 className="w-3.5 h-3.5" /> Verified & Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700"><AlertCircle className="w-3.5 h-3.5" /> Action Needed</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700"><Clock className="w-3.5 h-3.5" /> Pending Verification</span>;
      case 'draft':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">Draft / In Review</span>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">My Student Vault</h2>
          <p className="text-sm text-slate-500 font-medium">
            Centralized hub for official documents, academic records, and university portal logins.
          </p>
        </div>
        {vaultMode === 'documents' && (
          <Button onClick={handleOpenUpload} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shrink-0">
            <UploadCloud className="w-4 h-4 mr-2" /> Upload New Document
          </Button>
        )}
      </div>

      {/* Mode Switcher */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 w-full sm:w-auto self-start gap-1">
        <button
          onClick={() => setVaultMode('documents')}
          className={cn(
            "flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
            vaultMode === 'documents'
              ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
          )}
        >
          <FileText className="w-4 h-4 text-blue-600" />
          <span>Official Documents ({documents.length})</span>
        </button>
        <button
          onClick={() => setVaultMode('credentials')}
          className={cn(
            "flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
            vaultMode === 'credentials'
              ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
          )}
        >
          <KeyRound className="w-4 h-4 text-indigo-600" />
          <span>Website Logins & Passwords ({currentCredentials.length})</span>
        </button>
      </div>

      {vaultMode === 'credentials' ? (
        <PortalCredentialsManager
          student={{ ...student, credentials: currentCredentials }}
          onUpdateCredentials={handleUpdateCredentials}
        />
      ) : (
        <>
          {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by document name, target university, type, or notes..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {Object.keys(CATEGORIES).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Date Range Filter */}
            <select
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">All Time</option>
              <option value="7d">Past 7 Days</option>
              <option value="30d">Past 30 Days</option>
              <option value="90d">Past 90 Days</option>
              <option value="this_year">This Year</option>
            </select>

            {/* Reset Filters */}
            {(selectedCategoryFilter !== 'ALL' || selectedDateFilter !== 'ALL' || searchQuery.trim()) && (
              <button
                onClick={() => {
                  setSelectedCategoryFilter('ALL');
                  setSelectedDateFilter('ALL');
                  setSearchQuery('');
                }}
                className="px-2.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>Showing <strong>{filteredDocs.length}</strong> of <strong>{documents.length}</strong> documents</span>
          {selectedCategoryFilter !== 'ALL' && (
            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-semibold text-[11px]">
              Category: {selectedCategoryFilter}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-slate-200">
        {['All', 'Action Needed', 'Verified', 'Drafts'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors whitespace-nowrap",
              activeTab === tab
                ? "bg-white text-blue-600 border-t border-l border-r border-slate-200"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            )}
          >
            {tab}
            {tab === 'Action Needed' && documents.some(d => d.status === 'rejected') && (
              <span className="ml-2 w-2 h-2 rounded-full bg-red-500 inline-block align-middle mb-0.5"></span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredDocs.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">
            No documents found in this view.
          </div>
        ) : (
          filteredDocs.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow group relative overflow-hidden flex flex-col">
              {doc.status === 'rejected' && (
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
              )}
              {doc.status === 'verified' && (
                <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
              )}
              {doc.status === 'pending' && (
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
              )}
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-500">
                    <span className="text-xs font-bold uppercase">{doc.fileExt}</span>
                  </div>
                  {getStatusBadge(doc.status)}
                </div>
                
                <h4 className="text-lg font-bold text-slate-900 mb-1 line-clamp-2">{doc.name}</h4>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">{doc.category}</p>
                
                {doc.notes && doc.status === 'rejected' && (
                  <div className="bg-red-50 text-red-800 text-xs p-3 rounded-lg mb-4 font-medium border border-red-100">
                    <span className="font-bold">Feedback:</span> {doc.notes}
                  </div>
                )}
                
                <div className="mt-auto pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center text-xs text-slate-500 mb-4">
                    <span>{doc.date}</span>
                    <span className="truncate max-w-[150px]">{doc.type}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 text-xs flex items-center justify-center gap-1.5 border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors" 
                      onClick={() => setPreviewDoc(doc)}
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" /> Document Preview
                    </Button>

                    <Button 
                      variant="outline" 
                      className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-slate-200 shrink-0"
                      onClick={() => handleDeleteDoc(doc.id)}
                      title="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Preview Details & Media Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-5 flex items-center justify-between z-10 rounded-t-3xl">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold text-xs uppercase">
                  {previewDoc.fileExt || 'DOC'}
                </div>
                <div className="truncate">
                  <h3 className="font-bold text-lg text-slate-900 truncate">{previewDoc.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">{previewDoc.category} • {previewDoc.type}</p>
                </div>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full transition-colors shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">
              {/* Document File Viewer Box */}
              {previewDoc.fileUrl ? (
                <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-inner p-2 flex flex-col items-center justify-center min-h-[250px]">
                  {previewDoc.fileUrl.startsWith('data:image') || ['png', 'jpg', 'jpeg', 'webp'].includes(previewDoc.fileExt.toLowerCase()) ? (
                    <img 
                      src={previewDoc.fileUrl} 
                      alt={previewDoc.name} 
                      className="max-h-[350px] w-auto object-contain rounded-lg"
                    />
                  ) : (
                    <iframe 
                      src={previewDoc.fileUrl} 
                      title={previewDoc.name} 
                      className="w-full h-[350px] rounded-lg bg-white border-none"
                    />
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-3">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">{previewDoc.name}</h4>
                    <p className="text-xs text-slate-500 mt-1">Document metadata record created on {previewDoc.date}</p>
                  </div>
                </div>
              )}

              {/* Metadata details */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px] mb-0.5">Category</span>
                  <span className="font-semibold text-slate-800">{previewDoc.category}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px] mb-0.5">Type</span>
                  <span className="font-semibold text-slate-800">{previewDoc.type}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px] mb-0.5">Uploaded Date</span>
                  <span className="font-semibold text-slate-800">{previewDoc.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px] mb-0.5">Status</span>
                  <span className="font-bold text-slate-900">{getStatusBadge(previewDoc.status)}</span>
                </div>
                {previewDoc.target && (
                  <div className="col-span-2">
                    <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px] mb-0.5">Associated Target</span>
                    <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 inline-block">{previewDoc.target}</span>
                  </div>
                )}
                {previewDoc.notes && (
                  <div className="col-span-2">
                    <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px] mb-0.5">Notes / Context</span>
                    <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">{previewDoc.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 sm:p-5 flex items-center justify-between gap-3 z-10 rounded-b-3xl">
              <Button variant="ghost" onClick={() => setPreviewDoc(null)} className="text-slate-500">Close</Button>
              <div className="flex gap-2">
                {previewDoc.fileUrl && (
                  <a href={previewDoc.fileUrl} download={previewDoc.name} target="_blank" rel="noopener noreferrer">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                      <Download className="w-4 h-4" /> Download Document
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-4 sm:p-6 flex items-center justify-between z-10 rounded-t-3xl">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-blue-600" /> Upload New Document
              </h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full transition-colors">
                 <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-6 flex-1">
              {/* Drag and Drop Zone */}
              <div 
                className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <input 
                  type="file" 
                  id="file-upload" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UploadCloud className="w-6 h-6" />
                </div>
                {selectedFile ? (
                  <div>
                    <p className="font-bold text-slate-900">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <>
                    <p className="font-bold text-slate-900 mb-1">Drag & Drop or Browse File</p>
                    <p className="text-xs text-slate-500 font-medium">Supports PDF, PNG, JPG (Max 25MB)</p>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Document Category</label>
                  <select 
                    value={selectedCategory}
                    onChange={handleCategoryChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  >
                    {Object.keys(CATEGORIES).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Specific Document Type</label>
                  <select 
                    value={selectedType}
                    onChange={handleTypeChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  >
                    {CATEGORIES[selectedCategory as keyof typeof CATEGORIES].map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Document Name</label>
                  <input 
                    type="text" 
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="e.g. Grade 11 Official Transcript - Term 1" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" 
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Pre-filled with document type, append terms as needed.</p>
                </div>

                <div className="md:col-span-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Uploaded By</label>
                  <input 
                    type="text" 
                    value="Student (Anya Patel - STU-1002)" 
                    disabled 
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none text-slate-500 cursor-not-allowed" 
                  />
                </div>
                
                <div className="md:col-span-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Associated Target (Optional)</label>
                  <select 
                    value={docTarget}
                    onChange={(e) => setDocTarget(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  >
                    <option value="">None</option>
                    <option value="USA - Columbia">USA — Columbia University Application</option>
                    <option value="UK - Oxford">UK — Oxford University Application</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Additional Notes</label>
                  <textarea 
                    value={docNotes}
                    onChange={(e) => setDocNotes(e.target.value)}
                    rows={3} 
                    placeholder="Any specific instructions or context for this document..." 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 resize-none"
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-100 p-4 sm:p-6 flex justify-end items-center gap-3 z-10 rounded-b-3xl">
              <Button variant="ghost" onClick={() => setIsUploadModalOpen(false)} className="text-slate-500 hover:text-slate-700">Cancel</Button>
              <Button onClick={handleUploadSubmit} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={!selectedFile && !docName}>
                 Upload Document
              </Button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
