import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Clock, X, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentInfo {
  id: string;
  name: string;
  category: string;
  type: string;
  uploadedBy: string;
  target?: string;
  notes?: string;
  status: 'draft' | 'pending' | 'verified' | 'rejected';
  date: string;
  fileExt: string;
}

const CATEGORIES = {
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

const initialDocuments: any[] = [];

export default function StudentVault() {
  const [documents, setDocuments] = useState<DocumentInfo[]>(initialDocuments);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('All');

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

    const newDoc: DocumentInfo = {
      id: `DOC-00${documents.length + 1}`,
      name: docName || selectedType,
      category: selectedCategory,
      type: selectedType,
      uploadedBy: 'Student (Anya Patel - STU-1002)',
      target: docTarget,
      notes: docNotes,
      status: selectedCategory === 'Application & Writing Assets' ? 'draft' : 'pending',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      fileExt: ext
    };

    setDocuments([newDoc, ...documents]);
    setIsUploadModalOpen(false);
    resetForm();
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

  const filteredDocs = activeTab === 'All' ? documents : documents.filter(d => {
    if (activeTab === 'Action Needed') return d.status === 'rejected';
    if (activeTab === 'Verified') return d.status === 'verified';
    if (activeTab === 'Drafts') return d.status === 'draft';
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
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
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">My Document Vault</h2>
          <p className="text-sm text-slate-500 font-medium">Securely upload and manage your official documents and drafts.</p>
        </div>
        <Button onClick={handleOpenUpload} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shrink-0">
          <UploadCloud className="w-4 h-4 mr-2" /> Upload New Document
        </Button>
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
                    <Button variant="outline" className="flex-1 text-xs">Preview</Button>
                    {(doc.status === 'rejected' || doc.status === 'draft') && (
                      <Button variant="outline" className="flex-1 text-xs text-blue-600 hover:text-blue-700">Re-upload</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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
    </div>
  );
}
