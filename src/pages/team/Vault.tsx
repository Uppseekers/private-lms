import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Filter, CheckCircle2, AlertCircle, Clock, FileText, Check, X, ShieldAlert, Eye } from 'lucide-react';
import { useDatabase } from '@/context/DatabaseContext';
import { cn } from '@/lib/utils';
import { getScopedStudentsForStaff } from '@/lib/staffPermissions';
import DocumentPreviewModal from '@/components/DocumentPreviewModal';

interface DocumentInfo {
  id: string;
  studentId: string;
  studentName: string;
  name: string;
  category: string;
  type: string;
  uploadedBy: string;
  status: 'pending' | 'verified' | 'rejected' | 'draft';
  date: string;
  fileExt: string;
}

const initialDocuments: any[] = [];

export default function TeamVault() {
  const { students, updateStudent, currentUser } = useDatabase();
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);

  React.useEffect(() => {
    const scopedStudents = getScopedStudentsForStaff(students, currentUser);
    const allDocs = scopedStudents.flatMap(s => (s.documents || []).map(d => ({
      ...d,
      studentId: s.id,
      studentName: s.name,
      fileExt: 'pdf'
    })));
    setDocuments(allDocs as unknown as DocumentInfo[]);
  }, [students, currentUser]);
  const [activeTab, setActiveTab] = useState('Pending Verification');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentFilter, setSelectedStudentFilter] = useState('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState<'ALL' | '7d' | '30d' | '90d' | 'this_year'>('ALL');

  const scopedStudents = React.useMemo(() => getScopedStudentsForStaff(students, currentUser), [students, currentUser]);

  // Extract all unique categories present in documents
  const allCategories = React.useMemo(() => {
    const set = new Set<string>();
    documents.forEach(d => {
      if (d.category) set.add(d.category);
    });
    return Array.from(set);
  }, [documents]);

  // Review Drawer & Full Preview Modal State
  const [selectedDoc, setSelectedDoc] = useState<DocumentInfo | null>(null);
  const [fullPreviewDoc, setFullPreviewDoc] = useState<DocumentInfo | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'internal' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [feedback, setFeedback] = useState('');

  const filteredDocs = documents.filter(d => {
    if (selectedStudentFilter !== 'ALL' && d.studentId !== selectedStudentFilter) {
      return false;
    }
    if (selectedCategoryFilter !== 'ALL' && d.category !== selectedCategoryFilter) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!d.name.toLowerCase().includes(q) && 
          !d.studentId.toLowerCase().includes(q) && 
          !d.studentName.toLowerCase().includes(q) &&
          !(d.category || '').toLowerCase().includes(q) &&
          !(d.type || '').toLowerCase().includes(q)) {
        return false;
      }
    }
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
    if (activeTab === 'Pending Verification') return d.status.toLowerCase() === 'pending';
    if (activeTab === 'Verified & Approved') return d.status.toLowerCase() === 'verified';
    if (activeTab === 'Rejected') return d.status.toLowerCase() === 'rejected';
    return true; // 'All'
  });

  const handleOpenReview = (doc: DocumentInfo) => {
    setSelectedDoc(doc);
    setReviewAction(null);
    setRejectReason('');
    setFeedback('');
  };

  const handleCloseReview = () => {
    setSelectedDoc(null);
  };

  const handleReviewSubmit = () => {
    if (!selectedDoc || !reviewAction) return;
    
    let newStatus = selectedDoc.status;
    if (reviewAction === 'approve') newStatus = 'verified';
    if (reviewAction === 'reject') newStatus = 'rejected';

    const studentToUpdate = students.find(s => s.id === selectedDoc.studentId);
    if (studentToUpdate) {
      const updatedDocs = studentToUpdate.documents.map((d: any) => 
        d.id === selectedDoc.id ? { ...d, status: newStatus, rejectReason, feedback } : d
      );
      updateStudent({
        ...studentToUpdate,
        documents: updatedDocs
      });
    }
    
    handleCloseReview();
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'verified':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3" /> Verified</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700"><AlertCircle className="w-3 h-3" /> Rejected</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700"><Clock className="w-3 h-3" /> Pending</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full">
      <div className={cn(
        "flex-1 max-w-7xl mx-auto space-y-8 pb-12 transition-all duration-300",
        selectedDoc ? "pr-[400px]" : ""
      )}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Global Document Center</h2>
            <p className="text-sm text-slate-500 font-medium">Verify, approve, and manage official student documents.</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student, ID, document name, category or type..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Student Filter */}
              <select
                value={selectedStudentFilter}
                onChange={(e) => setSelectedStudentFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">All Students ({scopedStudents.length})</option>
                {scopedStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                ))}
              </select>

              {/* Category Filter */}
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {allCategories.map(cat => (
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

              {/* Clear Filters button */}
              {(selectedStudentFilter !== 'ALL' || selectedCategoryFilter !== 'ALL' || selectedDateFilter !== 'ALL' || searchQuery.trim()) && (
                <button
                  onClick={() => {
                    setSelectedStudentFilter('ALL');
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
            <span>Showing <strong>{filteredDocs.length}</strong> of <strong>{documents.length}</strong> total documents</span>
            {selectedCategoryFilter !== 'ALL' && (
              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                Category: {selectedCategoryFilter}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-slate-200">
          {['Pending Verification', 'Verified & Approved', 'Rejected', 'All'].map((tab) => (
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
              {tab === 'Pending Verification' && documents.filter(d => d.status === 'pending').length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs inline-block align-middle mb-0.5">{documents.filter(d => d.status === 'pending').length}</span>
              )}
            </button>
          ))}
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4">Document</th>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Date & Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.length === 0 ? (
                   <tr>
                     <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                       No documents in this queue.
                     </td>
                   </tr>
                ) : (
                  filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => handleOpenReview(doc)}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-500">
                            <span className="text-[10px] font-bold uppercase">{doc.fileExt}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate max-w-[200px]">{doc.name}</p>
                            <p className="text-xs text-slate-500 truncate max-w-[200px]">{doc.type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-bold text-slate-900">{doc.studentName}</p>
                        <p className="text-xs font-mono text-slate-500">{doc.studentId}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded whitespace-nowrap">
                          {doc.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-slate-500 text-xs mb-1">{doc.date}</p>
                        {getStatusBadge(doc.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                         <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50">
                           {doc.status === 'pending' ? 'Review' : 'View'}
                         </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Review Drawer */}
      {selectedDoc && (
        <div className="fixed right-0 top-0 h-full w-[400px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50 transform transition-transform duration-300">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900">Document Review</h3>
            <button onClick={handleCloseReview} className="p-2 rounded-full hover:bg-slate-100 text-slate-500">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {/* High-speed preview render */}
            <div className="h-64 bg-slate-900 flex flex-col items-center justify-center text-slate-400 relative overflow-hidden group">
               <FileText className="w-12 h-12 mb-3 text-blue-400 opacity-80" />
               <p className="text-sm font-bold text-white">{selectedDoc.name}</p>
               <p className="text-xs text-slate-400">{selectedDoc.type} • {selectedDoc.category}</p>
               <Button 
                 onClick={() => setFullPreviewDoc(selectedDoc)} 
                 className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg flex items-center gap-2"
               >
                 <Eye className="w-4 h-4" /> Open Interactive Document Viewer
               </Button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">{selectedDoc.name}</h4>
                <p className="text-xs text-slate-500">{selectedDoc.type} • {selectedDoc.category}</p>
                <div className="mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 flex items-center gap-2">
                   Uploaded by {selectedDoc.uploadedBy} on {selectedDoc.date}
                </div>
              </div>

              {selectedDoc.status.toLowerCase() === 'pending' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Verification Action</h4>
                  
                  <div className="space-y-3">
                    <label className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
                      reviewAction === 'approve' ? "bg-green-50 border-green-200" : "bg-white border-slate-200 hover:bg-slate-50"
                    )}>
                      <input 
                        type="radio" 
                        name="review" 
                        className="mt-0.5 text-green-600 focus:ring-green-500 border-slate-300"
                        onChange={() => setReviewAction('approve')}
                        checked={reviewAction === 'approve'}
                      />
                      <div>
                        <p className={cn("text-sm font-bold", reviewAction === 'approve' ? "text-green-800" : "text-slate-900")}>Verified & Approved</p>
                        <p className="text-xs text-slate-500">Document is valid and official.</p>
                      </div>
                    </label>

                    <label className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
                      reviewAction === 'reject' ? "bg-red-50 border-red-200" : "bg-white border-slate-200 hover:bg-slate-50"
                    )}>
                      <input 
                        type="radio" 
                        name="review" 
                        className="mt-0.5 text-red-600 focus:ring-red-500 border-slate-300"
                        onChange={() => setReviewAction('reject')}
                        checked={reviewAction === 'reject'}
                      />
                      <div>
                        <p className={cn("text-sm font-bold", reviewAction === 'reject' ? "text-red-800" : "text-slate-900")}>Reject / Needs Revision</p>
                        <p className="text-xs text-slate-500">Document is invalid or incomplete.</p>
                      </div>
                    </label>
                    
                    <label className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
                      reviewAction === 'internal' ? "bg-slate-100 border-slate-300" : "bg-white border-slate-200 hover:bg-slate-50"
                    )}>
                      <input 
                        type="radio" 
                        name="review" 
                        className="mt-0.5 text-slate-600 focus:ring-slate-500 border-slate-300"
                        onChange={() => setReviewAction('internal')}
                        checked={reviewAction === 'internal'}
                      />
                      <div>
                        <p className={cn("text-sm font-bold", reviewAction === 'internal' ? "text-slate-800" : "text-slate-900")}>Mark Internal Only</p>
                        <p className="text-xs text-slate-500">Confidential, hidden from student view.</p>
                      </div>
                    </label>
                  </div>

                  {reviewAction === 'reject' && (
                    <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Rejection Reason</label>
                        <select 
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900"
                        >
                          <option value="">Select a reason...</option>
                          <option>Illegible / Low Quality Scan</option>
                          <option>Incomplete Document / Missing Pages</option>
                          <option>Expired File / Passport</option>
                          <option>Name Mismatch on Document</option>
                          <option>Incorrect File Format</option>
                          <option>Other (Custom Note)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Feedback for Student</label>
                        <textarea 
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          rows={3}
                          placeholder="e.g. Please re-upload a full color PDF scan..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900 resize-none"
                        ></textarea>
                      </div>
                    </div>
                  )}
                  
                  {reviewAction === 'approve' && (
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-start gap-3 mt-4">
                      <ShieldAlert className="w-4 h-4 text-blue-600 mt-0.5" />
                      <p className="text-xs text-blue-800">
                        Approving this official document will sync relevant data points (like scores) to the student's central profile automatically.
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {selectedDoc.status.toLowerCase() !== 'pending' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                   {getStatusBadge(selectedDoc.status)}
                   <p className="text-xs text-slate-500 mt-2 font-medium">This document has already been processed.</p>
                </div>
              )}

            </div>
          </div>
          
          {selectedDoc.status === 'pending' && (
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <Button variant="outline" className="flex-1 bg-white" onClick={handleCloseReview}>Cancel</Button>
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" 
                disabled={!reviewAction || (reviewAction === 'reject' && !rejectReason)}
                onClick={handleReviewSubmit}
              >
                Submit Review
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Full Document Preview Modal */}
      {fullPreviewDoc && (
        <DocumentPreviewModal 
          doc={fullPreviewDoc}
          isStaff={true}
          onClose={() => setFullPreviewDoc(null)}
          onVerify={(newStatus, reason, feedback) => {
            const studentToUpdate = students.find(s => s.id === fullPreviewDoc.studentId);
            if (studentToUpdate) {
              const updatedDocs = (studentToUpdate.documents || []).map((d: any) => 
                d.id === fullPreviewDoc.id ? { ...d, status: newStatus, rejectReason: reason, feedback } : d
              );
              updateStudent({
                ...studentToUpdate,
                documents: updatedDocs,
                operationalLogs: [
                  {
                    id: 'LOG-' + Date.now(),
                    timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
                    performedBy: 'Counsellor Admin',
                    role: 'COUNSELLOR',
                    studentId: studentToUpdate.id,
                    activityType: 'Document Verified',
                    description: `Document "${fullPreviewDoc.name}" marked as ${newStatus.toUpperCase()}`
                  },
                  ...(studentToUpdate.operationalLogs || [])
                ]
              });
            }
            setFullPreviewDoc(null);
            handleCloseReview();
          }}
        />
      )}
    </div>
  );
}
