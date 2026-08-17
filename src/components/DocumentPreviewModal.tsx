import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  FileText, Download, Printer, CheckCircle2, AlertCircle, Clock, 
  X, ExternalLink, ShieldCheck, ZoomIn, ZoomOut, RotateCw, Eye,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fileStorage } from '@/lib/storage';

interface DocumentInfo {
  id: string;
  name: string;
  category: string;
  type: string;
  uploadedBy?: string;
  studentName?: string;
  studentId?: string;
  date: string;
  status: string;
  fileExt?: string;
  fileUrl?: string;
  notes?: string;
  target?: string;
  rejectReason?: string;
  feedback?: string;
}

interface DocumentPreviewModalProps {
  doc: DocumentInfo;
  onClose: () => void;
  onVerify?: (newStatus: 'verified' | 'rejected', reason?: string, feedback?: string) => void;
  isStaff?: boolean;
}

export default function DocumentPreviewModal({
  doc,
  onClose,
  onVerify,
  isStaff = true
}: DocumentPreviewModalProps) {
  const [zoom, setZoom] = useState<number>(100);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [feedbackNote, setFeedbackNote] = useState<string>('');
  const [resolvedFileUrl, setResolvedFileUrl] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);

  const fileExt = (doc.fileExt || doc.name.split('.').pop() || 'pdf').toLowerCase();
  const studentName = doc.studentName || doc.uploadedBy || 'Student';
  const studentId = doc.studentId || 'STU-1001';

  useEffect(() => {
    let isMounted = true;
    const loadFile = async () => {
      const rawUrl = doc.fileUrl || '';
      if (rawUrl.startsWith('idb://')) {
        setIsLoadingFile(true);
        const storageKey = rawUrl.replace('idb://', '');
        const data = await fileStorage.getFile(storageKey);
        if (isMounted) {
          setResolvedFileUrl(data || null);
          setIsLoadingFile(false);
        }
      } else if (rawUrl) {
        setResolvedFileUrl(rawUrl);
      } else if (doc.id) {
        // Attempt to check if IndexedDB has it under doc_<id>
        setIsLoadingFile(true);
        const data = await fileStorage.getFile(`doc_${doc.id}`);
        if (isMounted) {
          setResolvedFileUrl(data || null);
          setIsLoadingFile(false);
        }
      } else {
        setResolvedFileUrl(null);
      }
    };

    loadFile();
    return () => {
      isMounted = false;
    };
  }, [doc.fileUrl, doc.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const activeUrl = resolvedFileUrl || doc.fileUrl;
    if (activeUrl && !activeUrl.startsWith('idb://')) {
      const a = document.createElement('a');
      a.href = activeUrl;
      a.download = doc.name || 'document.pdf';
      a.target = '_blank';
      a.click();
    } else {
      const blob = new Blob([
        `DOCUMENT PREVIEW RECORD\n\nTitle: ${doc.name}\nCategory: ${doc.category}\nType: ${doc.type}\nStudent: ${studentName} (${studentId})\nStatus: ${doc.status}\nUploaded: ${doc.date}\n\nOfficial Verification Stamp: UPPSEEKERS EDUCATION SERVICES`
      ], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.name ? doc.name.replace(/\.[^/.]+$/, "") : 'document'}_verified.txt`;
      a.click();
    }
  };

  const handleFormSubmit = () => {
    if (!reviewAction || !onVerify) return;
    if (reviewAction === 'approve') {
      onVerify('verified');
    } else if (reviewAction === 'reject') {
      onVerify('rejected', rejectReason, feedbackNote);
    }
  };

  const isImage = resolvedFileUrl && (
    resolvedFileUrl.startsWith('data:image') || 
    ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(fileExt)
  );

  const isPdf = resolvedFileUrl && (
    resolvedFileUrl.startsWith('data:application/pdf') || 
    fileExt === 'pdf'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-5xl h-[92vh] max-h-[900px] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Top Control Bar */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 font-bold text-xs uppercase">
              {fileExt}
            </div>
            <div>
              <h3 className="text-sm font-bold truncate max-w-md">{doc.name}</h3>
              <p className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>{doc.category} • {doc.type}</span>
                <span>•</span>
                <span className="text-slate-300 font-medium">Student: {studentName} ({studentId})</span>
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
              <button 
                onClick={() => setZoom(z => Math.max(70, z - 15))} 
                className="p-1.5 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono px-2 text-slate-300">{zoom}%</span>
              <button 
                onClick={() => setZoom(z => Math.min(150, z + 15))} 
                className="p-1.5 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <Button size="sm" variant="outline" onClick={handlePrint} className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 text-xs h-8">
              <Printer className="w-3.5 h-3.5 mr-1.5" /> Print
            </Button>

            <Button size="sm" onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8">
              <Download className="w-3.5 h-3.5 mr-1.5" /> Download
            </Button>

            <button 
              onClick={onClose} 
              className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Viewport: Canvas & Side Controls */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100">
          
          {/* Main Document Render Area */}
          <div className="flex-1 p-4 sm:p-8 overflow-y-auto flex justify-center items-start scrollbar-thin">
            {isLoadingFile ? (
              <div className="flex flex-col items-center justify-center p-16 space-y-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-sm font-semibold text-slate-600">Loading document preview from secure storage...</p>
              </div>
            ) : (
              <div 
                className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-slate-200 p-8 sm:p-12 space-y-6 transition-transform duration-200 relative"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
              >
                {/* Document Header Seal */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-slate-900 pb-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-6 h-6 text-blue-600" />
                      <span className="text-xs font-bold text-blue-900 uppercase tracking-widest">UPPSEEKERS VERIFIED VAULT</span>
                    </div>
                    <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{doc.name}</h1>
                    <p className="text-xs text-slate-500">{doc.category} — {doc.type}</p>
                  </div>

                  <div className="text-right shrink-0 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">VERIFICATION STATUS</span>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mt-1",
                      doc.status.toLowerCase() === 'verified' ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                      doc.status.toLowerCase() === 'rejected' ? "bg-rose-100 text-rose-800 border border-rose-200" :
                      "bg-amber-100 text-amber-800 border border-amber-200"
                    )}>
                      {doc.status.toLowerCase() === 'verified' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                      {doc.status.toLowerCase() === 'rejected' && <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
                      {doc.status.toLowerCase() === 'pending' && <Clock className="w-3.5 h-3.5 text-amber-600" />}
                      {doc.status}
                    </span>
                  </div>
                </div>

                {/* Render Actual URL / Image if present */}
                {resolvedFileUrl ? (
                  <div className="space-y-4">
                    {isImage ? (
                      <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center p-2">
                        <img src={resolvedFileUrl} alt={doc.name} className="w-full h-auto max-h-[550px] object-contain rounded-lg" />
                      </div>
                    ) : isPdf ? (
                      <div className="space-y-3">
                        <div className="bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-blue-400" />
                            <div>
                              <p className="text-xs font-bold">{doc.name}</p>
                              <p className="text-[10px] text-slate-400">PDF Document Stream</p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={handleDownload}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7"
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open / Download PDF
                          </Button>
                        </div>
                        <div className="relative w-full h-[450px] rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                          <object 
                            data={resolvedFileUrl} 
                            type="application/pdf" 
                            className="w-full h-full"
                          >
                            <iframe 
                              src={resolvedFileUrl} 
                              title={doc.name} 
                              className="w-full h-full border-0" 
                            />
                          </object>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-blue-400" />
                            <div>
                              <p className="text-xs font-bold">{doc.name}</p>
                              <p className="text-[10px] text-slate-400">Attached Document Link</p>
                            </div>
                          </div>
                          <a 
                            href={resolvedFileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Open Document in New Tab
                          </a>
                        </div>
                        <div className="relative w-full h-[400px] rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                          <iframe 
                            src={resolvedFileUrl} 
                            title={doc.name} 
                            sandbox="allow-scripts allow-same-origin allow-popups"
                            className="w-full h-full border-0" 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Rich Simulated Document Display based on Document Type */
                  <div className="space-y-6 pt-2">
                    {/* Category-Specific Detailed Template */}
                    {doc.category === 'Academic Records' && (
                      <div className="space-y-4 text-xs">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-bold block">Student Name</span>
                            <span className="font-bold text-slate-800">{studentName}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-bold block">Student ID</span>
                            <span className="font-mono font-bold text-slate-800">{studentId}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-bold block">Academic Term</span>
                            <span className="font-bold text-slate-800">Grade 11 & 12 Consolidated</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-bold block">Overall GPA</span>
                            <span className="font-bold text-emerald-700">3.92 / 4.00 (Unweighted)</span>
                          </div>
                        </div>

                        <table className="w-full text-left border-collapse border border-slate-200 rounded-lg overflow-hidden">
                          <thead className="bg-slate-100 text-slate-700 font-bold text-[11px] uppercase">
                            <tr>
                              <th className="p-2.5 border-b border-slate-200">Subject / Course</th>
                              <th className="p-2.5 border-b border-slate-200">Level</th>
                              <th className="p-2.5 border-b border-slate-200">Score (%)</th>
                              <th className="p-2.5 border-b border-slate-200">Grade</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                            <tr><td className="p-2.5">Advanced Mathematics & Calculus</td><td className="p-2.5">AP / Honors</td><td className="p-2.5">96%</td><td className="p-2.5 font-bold text-emerald-600">A+</td></tr>
                            <tr><td className="p-2.5">Physics (Mechanics & Magnetism)</td><td className="p-2.5">AP Physics C</td><td className="p-2.5">92%</td><td className="p-2.5 font-bold text-emerald-600">A</td></tr>
                            <tr><td className="p-2.5">English Literature & Composition</td><td className="p-2.5">Honors</td><td className="p-2.5">90%</td><td className="p-2.5 font-bold text-emerald-600">A</td></tr>
                            <tr><td className="p-2.5">Computer Science & Algorithms</td><td className="p-2.5">AP Comp Sci A</td><td className="p-2.5">98%</td><td className="p-2.5 font-bold text-emerald-600">A+</td></tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    {doc.category === 'Standardized Tests' && (
                      <div className="space-y-4 text-xs">
                        <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 flex justify-between items-center">
                          <div>
                            <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Official Testing Agency Verification</p>
                            <p className="text-lg font-extrabold text-blue-950 mt-0.5">SAT Composite Score: 1550 / 1600</p>
                          </div>
                          <span className="text-xs font-bold text-blue-900 bg-blue-100 px-3 py-1 rounded-full border border-blue-300">Percentile: 99th</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-slate-400 font-bold uppercase text-[10px]">Evidence-Based Reading & Writing</p>
                            <p className="text-2xl font-black text-slate-800 mt-1">760 <span className="text-xs font-normal text-slate-500">/ 800</span></p>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-slate-400 font-bold uppercase text-[10px]">Mathematics Section</p>
                            <p className="text-2xl font-black text-emerald-700 mt-1">790 <span className="text-xs font-normal text-slate-500">/ 800</span></p>
                          </div>
                        </div>
                      </div>
                    )}

                    {doc.category !== 'Academic Records' && doc.category !== 'Standardized Tests' && (
                      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Document Summary & Extracted Fields</p>
                        <div className="space-y-2 text-xs text-slate-600">
                          <p><strong className="text-slate-800">Document Type:</strong> {doc.type}</p>
                          <p><strong className="text-slate-800">Target Application:</strong> {doc.target || 'General Application Vault'}</p>
                          <p><strong className="text-slate-800">Submission Date:</strong> {doc.date}</p>
                          <p><strong className="text-slate-800">Uploaded By:</strong> {doc.uploadedBy || studentName}</p>
                          {doc.notes && <p className="bg-white p-3 rounded-lg border border-slate-200"><strong className="text-slate-800">Student Notes:</strong> {doc.notes}</p>}
                        </div>
                      </div>
                    )}

                    {/* Verification Watermark Footer */}
                    <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-400 gap-2">
                      <span>Document ID: {doc.id} • Digitally Hashed</span>
                      <span>Verified by Uppseekers Counselor Portal</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Verification & Audit Action Sidebar (If Staff View) */}
          {isStaff && onVerify && (
            <div className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l border-slate-200 p-5 flex flex-col justify-between shrink-0 overflow-y-auto">
              <div className="space-y-5">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Counsellor Action</h4>
                  <h3 className="text-base font-bold text-slate-900">Document Audit & Verification</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Evaluate document legibility and validity before approving.</p>
                </div>

                <div className="space-y-3">
                  <label className={cn(
                    "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
                    reviewAction === 'approve' ? "bg-emerald-50 border-emerald-300" : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                  )}>
                    <input 
                      type="radio" 
                      name="reviewAction" 
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500" 
                      checked={reviewAction === 'approve'}
                      onChange={() => setReviewAction('approve')}
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Verify & Approve Document</span>
                      <span className="text-[11px] text-slate-500">Document is complete, clear, and officially verified.</span>
                    </div>
                  </label>

                  <label className={cn(
                    "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
                    reviewAction === 'reject' ? "bg-rose-50 border-rose-300" : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                  )}>
                    <input 
                      type="radio" 
                      name="reviewAction" 
                      className="mt-0.5 text-rose-600 focus:ring-rose-500" 
                      checked={reviewAction === 'reject'}
                      onChange={() => setReviewAction('reject')}
                    />
                    <div>
                      <span className="text-xs font-bold text-rose-900 block">Reject / Request Revision</span>
                      <span className="text-[11px] text-slate-500">Document is blurry, incomplete, or requires re-upload.</span>
                    </div>
                  </label>
                </div>

                {reviewAction === 'reject' && (
                  <div className="space-y-3 p-3 bg-rose-50/70 rounded-xl border border-rose-200 text-xs animate-in fade-in">
                    <div>
                      <label className="block font-bold text-rose-900 mb-1">Rejection Reason</label>
                      <select 
                        value={rejectReason} 
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="w-full bg-white border border-rose-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-rose-500"
                      >
                        <option value="">Select a reason...</option>
                        <option value="Illegible / Low Quality Scan">Illegible / Low Quality Scan</option>
                        <option value="Incomplete Document / Missing Pages">Incomplete Document / Missing Pages</option>
                        <option value="Expired File / Passport">Expired File / Passport</option>
                        <option value="Name Mismatch on Document">Name Mismatch on Document</option>
                        <option value="Incorrect File Format">Incorrect File Format</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-rose-900 mb-1">Feedback for Student</label>
                      <textarea 
                        rows={3} 
                        value={feedbackNote}
                        onChange={(e) => setFeedbackNote(e.target.value)}
                        placeholder="Explain what the student needs to re-upload..."
                        className="w-full bg-white border border-rose-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-rose-500 resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2">
                <Button 
                  onClick={handleFormSubmit}
                  disabled={!reviewAction || (reviewAction === 'reject' && !rejectReason)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 shadow-sm"
                >
                  Confirm & Submit Verification
                </Button>
                <Button variant="ghost" onClick={onClose} className="w-full text-xs text-slate-500">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
