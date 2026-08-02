import { useDatabase } from '@/context/DatabaseContext';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Filter, Plus, FileText, CheckCircle2, AlertCircle, Clock, ChevronRight, GraduationCap, X, UploadCloud, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Shared types and data (ideally these would be in a shared context or API)
interface RequiredDoc {
  id: string;
  name: string;
}

interface AttachedDoc {
  docId: string;
  status: 'verified' | 'draft' | 'missing';
  fileName?: string;
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

const shortlist: University[] = [
  {
    id: 'U-001',
    name: 'Columbia University',
    category: 'Reach',
    major: 'B.S. in Computer Science',
    round: 'Early Decision (ED)',
    deadline: '2026-11-01T23:59',
    portalLink: 'https://commonapp.org',
    requiredDocs: mockRequiredDocs,
    attachedDocs: {
      'doc1': { docId: 'doc1', status: 'verified', fileName: 'HS_Transcripts_Official.pdf' },
      'doc5': { docId: 'doc5', status: 'draft', fileName: 'Columbia_Essay_v2.docx' },
    }
  },
  {
    id: 'U-002',
    name: 'University of Michigan',
    category: 'Target',
    major: 'B.S. in Computer Science',
    round: 'Regular Decision (RD)',
    deadline: '2027-01-05T23:59',
    portalLink: 'https://commonapp.org',
    requiredDocs: mockRequiredDocs.slice(0, 5),
    attachedDocs: {
      'doc1': { docId: 'doc1', status: 'verified', fileName: 'HS_Transcripts_Official.pdf' },
      'doc2': { docId: 'doc2', status: 'verified', fileName: 'SAT_Score_Report.pdf' },
      'doc3': { docId: 'doc3', status: 'verified', fileName: 'TOEFL_Report.pdf' },
      'doc4': { docId: 'doc4', status: 'verified', fileName: 'Main_Essay_Final.pdf' },
      'doc5': { docId: 'doc5', status: 'verified', fileName: 'UMich_Supp_Final.pdf' },
    }
  },
  {
    id: 'U-003',
    name: 'Arizona State University',
    category: 'Safety',
    major: 'B.S. in Computer Science',
    round: 'Rolling',
    deadline: '2027-05-01T23:59',
    portalLink: 'https://asu.edu/apply',
    requiredDocs: [mockRequiredDocs[0], mockRequiredDocs[2], mockRequiredDocs[5]],
    attachedDocs: {
      'doc1': { docId: 'doc1', status: 'verified', fileName: 'HS_Transcripts_Official.pdf' },
      'doc3': { docId: 'doc3', status: 'verified', fileName: 'TOEFL_Report.pdf' },
    }
  }
];

export default function StudentUniversities() {
  const { currentUser, students, updateStudent } = useDatabase();
  const student = students.find(s => s.id === currentUser.id || s.email === currentUser.email) || (currentUser as any);
  const rawShortlist = student?.shortlist || [];

  const [expandedUniId, setExpandedUniId] = useState<string | null>(null);
  const [attachModalOpen, setAttachModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<{uniId: string, reqId: string, reqName: string} | null>(null);
  const [isAddUniModalOpen, setIsAddUniModalOpen] = useState(false);

  // New Uni form state
  const [newUniName, setNewUniName] = useState('');
  const [newUniCategory, setNewUniCategory] = useState<'Reach' | 'Target' | 'Safety'>('Target');
  const [newUniMajor, setNewUniMajor] = useState('Computer Science');
  const [newUniRound, setNewUniRound] = useState('Regular Decision (RD)');
  const [newUniDeadline, setNewUniDeadline] = useState('');
  const [newUniPortal, setNewUniPortal] = useState('https://commonapp.org');

  // Helper to normalize university items safely
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
      shortlist: updatedShortlist
    });

    setNewUniName('');
    setIsAddUniModalOpen(false);
  };

  const handleRemoveUniversity = (uniId: string) => {
    if (!student) return;
    const targetUni = shortlist.find(u => u.id === uniId);
    const updatedShortlist = (student.shortlist || []).filter((u: any) => u.id !== uniId && u.name !== targetUni?.name);
    updateStudent({
      ...student,
      shortlist: updatedShortlist
    });
  };

  const handleAttachFile = (fileName: string) => {
    if (!selectedReq || !student) return;
    const { uniId, reqId } = selectedReq;

    const updatedShortlist = (student.shortlist || []).map((u: any) => {
      if (u.id === uniId) {
        const currentAttached = u.attachedDocs || {};
        return {
          ...u,
          attachedDocs: {
            ...currentAttached,
            [reqId]: { docId: reqId, status: 'verified', fileName }
          }
        };
      }
      return u;
    });

    updateStudent({
      ...student,
      shortlist: updatedShortlist
    });

    setAttachModalOpen(false);
    setSelectedReq(null);
  };

  if (shortlist.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 max-w-lg mx-auto">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-2">
          <GraduationCap className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Your University Shortlist is Empty</h2>
        <p className="text-slate-500 text-sm">
          Target universities are shortlisted and managed in the database by your assigned lead counselor: <strong className="text-slate-800">{student?.counselor || 'Assigned Lead Counselor'}</strong>.
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 text-left space-y-2 w-full mt-2">
          <span className="font-bold text-slate-800 uppercase block text-[10px] tracking-wider text-blue-600">Counselor Managed Database</span>
          <p>Please consult with your assigned counselor to review your admissions strategy and add target Reach, Target, or Safety universities to your shortlist.</p>
        </div>
      </div>
    );
  }

  // Overall readiness logic
  const totalDocsNeeded = shortlist.reduce((acc: number, uni: any) => acc + (uni.requiredDocs?.length || 0), 0);
  const totalDocsAttached = shortlist.reduce((acc: number, uni: any) => acc + (uni.attachedDocs ? Object.keys(uni.attachedDocs).length : 0), 0);
  const overallReadiness = totalDocsNeeded > 0 ? Math.round((totalDocsAttached / totalDocsNeeded) * 100) : 0;

  const reachCount = shortlist.filter(u => u.category === 'Reach').length;
  const targetCount = shortlist.filter(u => u.category === 'Target').length;
  const safetyCount = shortlist.filter(u => u.category === 'Safety').length;

  const getReadinessColor = (percent: number) => {
    if (percent >= 90) return 'text-green-600';
    if (percent >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  const getReadinessBg = (percent: number) => {
    if (percent >= 90) return 'bg-green-500';
    if (percent >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const openAttachModal = (uniId: string, reqId: string, reqName: string) => {
    setSelectedReq({ uniId, reqId, reqName });
    setAttachModalOpen(true);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">University Shortlist</h2>
          <p className="text-sm text-slate-500 font-medium">Track your deadlines and application readiness.</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-blue-600" />
          <div className="text-xs">
            <span className="text-[10px] text-blue-600 font-bold uppercase block leading-none">Assigned Lead Counselor</span>
            <span className="font-bold text-slate-900">{student?.counselor || 'Sarah Jenkins'}</span>
          </div>
        </div>
      </div>

      {/* Application Readiness Engine */}
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 space-y-6 w-full">
              <div>
                <h3 className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-2">Overall Portfolio Readiness</h3>
                <div className="flex items-end gap-3 mb-2">
                  <span className={cn("text-5xl font-black tracking-tighter", getReadinessColor(overallReadiness))}>
                    {overallReadiness}%
                  </span>
                  <span className="text-slate-300 font-medium pb-1.5">Complete</span>
                </div>
                <div className="h-3 w-full bg-slate-800/50 rounded-full overflow-hidden backdrop-blur-sm border border-slate-700/50">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-1000", getReadinessBg(overallReadiness))}
                    style={{ width: `${overallReadiness}%` }}
                  />
                </div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    {shortlist.length > 0 ? `Tracking ${shortlist.length} university application${shortlist.length > 1 ? 's' : ''}` : 'No active applications'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{totalDocsAttached} of {totalDocsNeeded} required documents attached</p>
                </div>
              </div>
            </div>

            <div className="w-full md:w-1/2 space-y-4">
              <h3 className="text-slate-400 font-bold uppercase tracking-wider text-xs border-b border-slate-700 pb-2">University Readiness Breakdown</h3>
              <div className="space-y-3">
                {shortlist.map(uni => {
                  const uniAttached = Object.keys(uni.attachedDocs).length;
                  const uniTotal = uni.requiredDocs.length;
                  const uniPercent = uniTotal > 0 ? Math.round((uniAttached / uniTotal) * 100) : 0;
                  
                  return (
                    <div key={uni.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-200 truncate pr-4">{uni.name}</span>
                        <span className={cn("font-bold whitespace-nowrap", getReadinessColor(uniPercent))}>{uniPercent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-1000", getReadinessBg(uniPercent))}
                          style={{ width: `${uniPercent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Target Strategy */}
      <div className="flex items-center gap-3 mb-6">
        <h3 className="text-sm font-bold text-slate-900">Target Strategy</h3>
        <div className="flex gap-2">
          <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-md text-xs font-bold border border-red-100">{reachCount} Reach</span>
          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-md text-xs font-bold border border-amber-100">{targetCount} Target</span>
          <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-md text-xs font-bold border border-green-100">{safetyCount} Safety</span>
        </div>
      </div>

      <div className="space-y-4">
        {shortlist.map((uni) => (
          <Card key={uni.id} className="overflow-hidden border-slate-200 transition-all hover:shadow-md">
            <div 
              className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between cursor-pointer group gap-4"
              onClick={() => setExpandedUniId(expandedUniId === uni.id ? null : uni.id)}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0 pr-2 w-full md:w-auto">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 text-slate-400 group-hover:text-blue-600 transition-colors">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 min-w-0">
                    <span className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      uni.category === 'Reach' ? "bg-red-500" :
                      uni.category === 'Target' ? "bg-amber-500" :
                      "bg-green-500"
                    )} />
                    <h3 className="font-bold text-slate-900 text-base sm:text-lg group-hover:text-blue-600 transition-colors truncate" title={uni.name}>{uni.name}</h3>
                  </div>
                  <p className="text-sm text-slate-500 truncate">{uni.major}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 sm:gap-6 shrink-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                <div className="text-left md:text-right shrink-0">
                  <p className="text-sm font-bold text-slate-900">{uni.round}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 justify-start md:justify-end">
                    <Clock className="w-3.5 h-3.5" /> 
                    {isNaN(new Date(uni.deadline).getTime()) ? uni.deadline : new Date(uni.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-slate-900">{Object.keys(uni.attachedDocs).length}/{uni.requiredDocs.length} Docs</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Completed</p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleRemoveUniversity(uni.id); }}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Remove from shortlist"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className={cn(
                    "p-2 rounded-full bg-slate-50 text-slate-400 transition-transform",
                    expandedUniId === uni.id ? "rotate-90 bg-blue-50 text-blue-600" : "group-hover:bg-slate-100"
                  )}>
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded Drawer */}
            {expandedUniId === uni.id && (
              <div className="border-t border-slate-100 bg-slate-50/50 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs">Required Documents Checklist</h4>
                  <a href={uni.portalLink} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-full">
                    Go to Application Portal <LinkIcon className="w-3 h-3" />
                  </a>
                </div>
                
                <div className="space-y-4">
                  {uni.requiredDocs.map((req: RequiredDoc, index: number) => {
                    const attached = uni.attachedDocs[req.id];
                    return (
                      <div key={req.id || index} className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 font-mono text-xs text-slate-400 font-bold w-5">{index + 1}.</div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm mb-1">{req.name}</p>
                            {attached ? (
                              <div className="flex items-center gap-2">
                                {attached.status === 'verified' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3" /> Verified</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700"><Clock className="w-3 h-3" /> Draft Attached</span>
                                )}
                                <span className="text-xs text-slate-500 font-medium truncate max-w-[200px] flex items-center gap-1">
                                  <FileText className="w-3 h-3" /> {attached.fileName}
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700"><AlertCircle className="w-3 h-3" /> Missing / Required</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="ml-8 md:ml-0 flex-shrink-0">
                          {attached ? (
                            <Button variant="outline" size="sm" className="text-xs bg-white text-slate-600" onClick={() => openAttachModal(uni.id, req.id, req.name)}>
                              <FileText className="w-3.5 h-3.5 mr-1.5" /> Change / Select File
                            </Button>
                          ) : (
                            <Button size="sm" className="text-xs bg-blue-600 hover:bg-blue-700 text-white w-full md:w-auto" onClick={() => openAttachModal(uni.id, req.id, req.name)}>
                              <UploadCloud className="w-3.5 h-3.5 mr-1.5" /> Attach / Upload
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Modal for adding university */}
      {isAddUniModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">Add Target University</h3>
              <button onClick={() => setIsAddUniModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddUniversity} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">University Name</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Stanford University" 
                  value={newUniName} 
                  onChange={e => setNewUniName(e.target.value)} 
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Category</label>
                  <select 
                    value={newUniCategory} 
                    onChange={e => setNewUniCategory(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none"
                  >
                    <option value="Reach">Reach</option>
                    <option value="Target">Target</option>
                    <option value="Safety">Safety</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Round</label>
                  <select 
                    value={newUniRound} 
                    onChange={e => setNewUniRound(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none"
                  >
                    <option value="Early Decision (ED)">Early Decision (ED)</option>
                    <option value="Early Action (EA)">Early Action (EA)</option>
                    <option value="Regular Decision (RD)">Regular Decision (RD)</option>
                    <option value="Rolling">Rolling</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Major / Program</label>
                <input 
                  type="text" 
                  placeholder="e.g. B.S. in Computer Science" 
                  value={newUniMajor} 
                  onChange={e => setNewUniMajor(e.target.value)} 
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Application Deadline</label>
                <input 
                  type="date" 
                  value={newUniDeadline} 
                  onChange={e => setNewUniDeadline(e.target.value)} 
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <Button type="button" variant="ghost" onClick={() => setIsAddUniModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Add University</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attach Modal */}
      {attachModalOpen && selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Attach Document</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">Requirement: <span className="text-slate-900">{selectedReq.reqName}</span></p>
              </div>
              <button onClick={() => setAttachModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full border border-slate-200">
                 <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-6">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Option 1: Select from Existing Vault Files</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 relative">
                    <Search className="w-4 h-4 absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Search vault files..." className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-sm" />
                  </div>
                  <div className="max-h-48 overflow-y-auto p-2 space-y-1 bg-slate-50/50">
                    {['HS_Transcripts_Official.pdf', 'Columbia_Essay_v2.docx', 'Bank_Statement_Chase.pdf', 'TOEFL_Report.pdf'].map((file, i) => (
                      <button 
                        key={i} 
                        type="button"
                        onClick={() => handleAttachFile(file)}
                        className="w-full flex items-center justify-between p-2 hover:bg-blue-50 rounded-lg cursor-pointer border border-transparent hover:border-blue-200 transition-all text-left"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-slate-700">{file}</span>
                        </div>
                        <span className="text-xs font-bold text-blue-600">Select</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-px bg-slate-200 flex-1"></div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">OR</span>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Option 2: Upload New Document</h4>
                <label className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition-colors cursor-pointer group">
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleAttachFile(e.target.files[0].name);
                      }
                    }} 
                  />
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-slate-200 mb-3 group-hover:border-blue-200 group-hover:text-blue-600 shadow-sm">
                    <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <p className="text-sm font-bold text-slate-700 group-hover:text-blue-700 mb-1">Click to browse or drag file here</p>
                  <p className="text-xs text-slate-500">PDF, DOCX, JPG up to 10MB</p>
                  <p className="text-[10px] font-semibold text-slate-400 mt-4 bg-white px-2 py-1 rounded border border-slate-100">Will be saved and auto-tagged</p>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-3xl">
              <Button variant="ghost" onClick={() => setAttachModalOpen(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
