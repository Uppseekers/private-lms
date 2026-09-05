import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  KeyRound, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  ShieldCheck, 
  Lock, 
  Globe, 
  Sparkles, 
  Download, 
  X,
  School,
  FileCheck,
  CreditCard,
  Plane,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { PortalCredential, Student } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  student: Student;
  onUpdateCredentials: (credentials: PortalCredential[]) => void;
  readOnly?: boolean;
}

const CATEGORIES = [
  'University Portal',
  'Application System',
  'Testing & Scores',
  'Financial Aid & Scholarships',
  'Visa & Embassy',
  'Other'
];

const PRESET_PORTALS = [
  {
    title: 'Common Application',
    category: 'Application System',
    websiteUrl: 'https://apply.commonapp.org',
    notes: 'Common App ID (CAID) is visible in the top-right corner once logged in.'
  },
  {
    title: 'College Board (SAT & AP)',
    category: 'Testing & Scores',
    websiteUrl: 'https://mysat.collegeboard.org',
    notes: 'Access SAT score reports, test registration, and score sends.'
  },
  {
    title: 'ACT Student Account',
    category: 'Testing & Scores',
    websiteUrl: 'https://my.act.org',
    notes: 'ACT ID needed for score sending.'
  },
  {
    title: 'CSS Profile / College Board',
    category: 'Financial Aid & Scholarships',
    websiteUrl: 'https://cssprofile.collegeboard.org',
    notes: 'Institutional financial aid application for private universities.'
  },
  {
    title: 'FAFSA (StudentAid.gov)',
    category: 'Financial Aid & Scholarships',
    websiteUrl: 'https://studentaid.gov',
    notes: 'Requires FSA ID (username and password).'
  },
  {
    title: 'UC Application Portal',
    category: 'Application System',
    websiteUrl: 'https://apply.universityofcalifornia.edu',
    notes: 'University of California application for Berkeley, UCLA, UCSD, etc.'
  },
  {
    title: 'IELTS IDP Portal',
    category: 'Testing & Scores',
    websiteUrl: 'https://ielts.idp.com',
    notes: 'TRF number and test verification.'
  },
  {
    title: 'TOEFL iBT (ETS)',
    category: 'Testing & Scores',
    websiteUrl: 'https://toefl-registration.ets.org',
    notes: 'ETS appointment number and score reports.'
  }
];

export default function PortalCredentialsManager({ student, onUpdateCredentials, readOnly = false }: Props) {
  const credentials = useMemo(() => student.credentials || [], [student.credentials]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState(CATEGORIES[0]);
  const [formWebsiteUrl, setFormWebsiteUrl] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPinOrCode, setFormPinOrCode] = useState('');
  const [formLinkedUniversity, setFormLinkedUniversity] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formPasswordVisible, setFormPasswordVisible] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Copy helper
  const handleCopy = (text: string, fieldId: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => {
      setCopiedField(prev => (prev === fieldId ? null : prev));
    }, 2000);
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Password Generator
  const generateStrongPassword = () => {
    const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*()_+-=';
    let pass = '';
    // ensure at least one upper, lower, digit, symbol
    pass += 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)];
    pass += 'abcdefghijkmnopqrstuvwxyz'[Math.floor(Math.random() * 25)];
    pass += '23456789'[Math.floor(Math.random() * 8)];
    pass += '!@#$%^&*'[Math.floor(Math.random() * 8)];
    for (let i = pass.length; i < 16; i++) {
      pass += chars[Math.floor(Math.random() * chars.length)];
    }
    // shuffle
    const shuffled = pass.split('').sort(() => 0.5 - Math.random()).join('');
    setFormPassword(shuffled);
    setFormPasswordVisible(true);
  };

  const openAddModal = (preset?: typeof PRESET_PORTALS[0] | { title: string; category: string; websiteUrl?: string; linkedUniversity?: string }) => {
    setEditingId(null);
    if (preset) {
      setFormTitle(preset.title);
      setFormCategory(preset.category || CATEGORIES[0]);
      setFormWebsiteUrl(preset.websiteUrl || '');
      setFormUsername(student.email || '');
      setFormPassword('');
      setFormPinOrCode('');
      setFormLinkedUniversity((preset as any).linkedUniversity || '');
      setFormNotes((preset as any).notes || '');
    } else {
      setFormTitle('');
      setFormCategory(CATEGORIES[0]);
      setFormWebsiteUrl('');
      setFormUsername(student.email || '');
      setFormPassword('');
      setFormPinOrCode('');
      setFormLinkedUniversity('');
      setFormNotes('');
    }
    setFormPasswordVisible(false);
    setIsModalOpen(true);
  };

  const openEditModal = (cred: PortalCredential) => {
    setEditingId(cred.id);
    setFormTitle(cred.title);
    setFormCategory(cred.category || CATEGORIES[0]);
    setFormWebsiteUrl(cred.websiteUrl || '');
    setFormUsername(cred.username);
    setFormPassword(cred.password || '');
    setFormPinOrCode(cred.pinOrCode || '');
    setFormLinkedUniversity(cred.linkedUniversity || '');
    setFormNotes(cred.notes || '');
    setFormPasswordVisible(false);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formUsername.trim()) return;

    const now = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    let updated: PortalCredential[];

    if (editingId) {
      updated = credentials.map(c => {
        if (c.id === editingId) {
          return {
            ...c,
            title: formTitle.trim(),
            category: formCategory,
            websiteUrl: formWebsiteUrl.trim(),
            username: formUsername.trim(),
            password: formPassword,
            pinOrCode: formPinOrCode.trim(),
            linkedUniversity: formLinkedUniversity.trim(),
            notes: formNotes.trim(),
            lastUpdated: now
          };
        }
        return c;
      });
    } else {
      const newCred: PortalCredential = {
        id: `CRED-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: formTitle.trim(),
        category: formCategory,
        websiteUrl: formWebsiteUrl.trim(),
        username: formUsername.trim(),
        password: formPassword,
        pinOrCode: formPinOrCode.trim(),
        linkedUniversity: formLinkedUniversity.trim(),
        notes: formNotes.trim(),
        lastUpdated: now
      };
      updated = [newCred, ...credentials];
    }

    onUpdateCredentials(updated);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    const updated = credentials.filter(c => c.id !== id);
    onUpdateCredentials(updated);
    setDeleteConfirmId(null);
  };

  // Export clean summary for student safe keeping
  const handleExport = () => {
    if (credentials.length === 0) return;
    const lines = [
      `=============================================================`,
      `UPPSEEKERS - STUDENT PORTAL CREDENTIALS VAULT BACKUP`,
      `Student: ${student.name} (${student.id})`,
      `Date Exported: ${new Date().toLocaleString()}`,
      `=============================================================`,
      ``
    ];

    credentials.forEach((c, idx) => {
      lines.push(`${idx + 1}. ${c.title.toUpperCase()}`);
      lines.push(`   Category: ${c.category}`);
      if (c.linkedUniversity) lines.push(`   University: ${c.linkedUniversity}`);
      if (c.websiteUrl) lines.push(`   Portal URL: ${c.websiteUrl}`);
      lines.push(`   Username / ID: ${c.username}`);
      if (c.password) lines.push(`   Password: ${c.password}`);
      if (c.pinOrCode) lines.push(`   PIN / Code: ${c.pinOrCode}`);
      if (c.notes) lines.push(`   Notes: ${c.notes}`);
      lines.push(`   Last Updated: ${c.lastUpdated}`);
      lines.push(`-------------------------------------------------------------`);
    });

    lines.push(``);
    lines.push(`* Keep this document strictly confidential and offline.`);

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${student.name.replace(/\s+/g, '_')}_Portal_Credentials_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filtered list
  const filteredCredentials = useMemo(() => {
    return credentials.filter(c => {
      if (selectedCategory !== 'ALL' && c.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (c.title || '').toLowerCase().includes(q);
        const matchUser = (c.username || '').toLowerCase().includes(q);
        const matchUrl = (c.websiteUrl || '').toLowerCase().includes(q);
        const matchUni = (c.linkedUniversity || '').toLowerCase().includes(q);
        const matchNotes = (c.notes || '').toLowerCase().includes(q);
        if (!matchTitle && !matchUser && !matchUrl && !matchUni && !matchNotes) {
          return false;
        }
      }
      return true;
    });
  }, [credentials, selectedCategory, searchQuery]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'University Portal':
        return <School className="w-4 h-4 text-indigo-600" />;
      case 'Application System':
        return <Globe className="w-4 h-4 text-blue-600" />;
      case 'Testing & Scores':
        return <FileCheck className="w-4 h-4 text-emerald-600" />;
      case 'Financial Aid & Scholarships':
        return <CreditCard className="w-4 h-4 text-amber-600" />;
      case 'Visa & Embassy':
        return <Plane className="w-4 h-4 text-rose-600" />;
      default:
        return <KeyRound className="w-4 h-4 text-slate-600" />;
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'University Portal':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Application System':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Testing & Scores':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Financial Aid & Scholarships':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Visa & Embassy':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              Private Credentials & Applicant Logins
            </div>
            <h3 className="text-xl font-bold tracking-tight text-white">
              Website Logins & ID Passwords
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Remember all your university applicant portals, Common App, College Board, ACT, and financial aid logins in one secure vault.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {credentials.length > 0 && (
              <Button
                variant="outline"
                onClick={handleExport}
                className="bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5"
                title="Download offline backup text file"
              >
                <Download className="w-3.5 h-3.5" /> Export Offline Backup
              </Button>
            )}

            {!readOnly && (
              <Button
                onClick={() => openAddModal()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Login / Password
              </Button>
            )}
          </div>
        </div>

        {/* Quick Add Presets (Shortlist + Standard Portals) */}
        {!readOnly && (
          <div className="mt-5 pt-4 border-t border-slate-800/80">
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Quick-Add Presets for College Applications:
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_PORTALS.slice(0, 5).map(preset => {
                const alreadyAdded = credentials.some(c => c.title.toLowerCase() === preset.title.toLowerCase());
                return (
                  <button
                    key={preset.title}
                    onClick={() => openAddModal(preset)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 border",
                      alreadyAdded 
                        ? "bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800" 
                        : "bg-indigo-900/40 text-indigo-200 border-indigo-700/60 hover:bg-indigo-800/50 hover:border-indigo-500"
                    )}
                  >
                    <Plus className="w-3 h-3 text-indigo-400" />
                    {preset.title}
                    {alreadyAdded && <Check className="w-3 h-3 text-emerald-400 ml-0.5" />}
                  </button>
                );
              })}

              {/* Also offer student's shortlisted universities if available */}
              {student.shortlist && student.shortlist.slice(0, 3).map(uni => {
                const uniTitle = `${uni.name} Applicant Portal`;
                const alreadyAdded = credentials.some(c => c.title.toLowerCase().includes(uni.name.toLowerCase()));
                return (
                  <button
                    key={uni.id}
                    onClick={() => openAddModal({
                      title: uniTitle,
                      category: 'University Portal',
                      websiteUrl: uni.portalLink || '',
                      linkedUniversity: uni.name
                    })}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 border",
                      alreadyAdded 
                        ? "bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800" 
                        : "bg-emerald-950/40 text-emerald-200 border-emerald-800/60 hover:bg-emerald-900/50"
                    )}
                  >
                    <School className="w-3 h-3 text-emerald-400" />
                    {uni.name} Portal
                    {alreadyAdded && <Check className="w-3 h-3 text-emerald-400 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search website name, portal URL, username, application ID, notes..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Categories ({credentials.length})</option>
              {CATEGORIES.map(cat => {
                const count = credentials.filter(c => c.category === cat).length;
                return (
                  <option key={cat} value={cat}>
                    {cat} ({count})
                  </option>
                );
              })}
            </select>

            {(selectedCategory !== 'ALL' || searchQuery.trim()) && (
              <button
                onClick={() => {
                  setSelectedCategory('ALL');
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
          <span>
            Showing <strong>{filteredCredentials.length}</strong> of <strong>{credentials.length}</strong> saved login{credentials.length !== 1 ? 's' : ''}
          </span>
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <Lock className="w-3 h-3 text-slate-400" /> Passwords masked by default
          </span>
        </div>
      </div>

      {/* Credential Cards Grid */}
      {filteredCredentials.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50 rounded-3xl p-12 text-center">
          <div className="w-16 h-16 bg-indigo-50 border border-indigo-100 rounded-2xl mx-auto flex items-center justify-center text-indigo-600 mb-4">
            <KeyRound className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-slate-900 mb-1">
            {credentials.length === 0 ? 'No Website Credentials Added Yet' : 'No Logins Match Your Filter'}
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
            {credentials.length === 0
              ? 'Add your university applicant portals, Common App, and SAT credentials to easily track IDs and passwords during application deadlines.'
              : 'Try clearing the search or category filter to view all stored credentials.'}
          </p>
          {!readOnly && credentials.length === 0 && (
            <Button
              onClick={() => openAddModal()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Your First Login
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredCredentials.map(cred => {
            const isPasswordShown = !!visiblePasswords[cred.id];
            const isUserCopied = copiedField === `${cred.id}_user`;
            const isPassCopied = copiedField === `${cred.id}_pass`;
            const isPinCopied = copiedField === `${cred.id}_pin`;

            return (
              <Card 
                key={cred.id} 
                className="rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col bg-white overflow-hidden group"
              >
                <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  {/* Top Bar: Icon + Category Badge + Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                        {getCategoryIcon(cred.category)}
                      </div>
                      <div className="min-w-0">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider inline-block truncate max-w-[170px]",
                          getCategoryBadgeClass(cred.category)
                        )}>
                          {cred.category}
                        </span>
                        {cred.linkedUniversity && (
                          <p className="text-[11px] font-semibold text-indigo-600 truncate mt-0.5">
                            {cred.linkedUniversity}
                          </p>
                        )}
                      </div>
                    </div>

                    {!readOnly && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(cred)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Credential"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(cred.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Credential"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title & Website Link */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-snug break-words">
                      {cred.title}
                    </h4>
                    {cred.websiteUrl && (
                      <a
                        href={cred.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline mt-1 truncate max-w-full"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{cred.websiteUrl.replace(/^https?:\/\//, '')}</span>
                      </a>
                    )}
                  </div>

                  {/* Credentials Box */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2.5">
                    {/* Username / ID */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Username / ID
                        </span>
                        <p className="text-xs font-mono font-medium text-slate-900 truncate" title={cred.username}>
                          {cred.username}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCopy(cred.username, `${cred.id}_user`)}
                        className={cn(
                          "px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 border transition-all shrink-0",
                          isUserCopied 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                        )}
                        title="Copy Username"
                      >
                        {isUserCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                        <span>{isUserCopied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {/* Password */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Password
                        </span>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-mono font-medium text-slate-900 truncate">
                            {isPasswordShown ? (cred.password || '—') : '••••••••••••'}
                          </p>
                          {cred.password && (
                            <button
                              onClick={() => togglePasswordVisibility(cred.id)}
                              className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                              title={isPasswordShown ? "Hide Password" : "Show Password"}
                            >
                              {isPasswordShown ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {cred.password && (
                        <button
                          onClick={() => handleCopy(cred.password || '', `${cred.id}_pass`)}
                          className={cn(
                            "px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 border transition-all shrink-0",
                            isPassCopied 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                          )}
                          title="Copy Password"
                        >
                          {isPassCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                          <span>{isPassCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                      )}
                    </div>

                    {/* PIN / Code (if present) */}
                    {cred.pinOrCode && (
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            PIN / App ID / 2FA
                          </span>
                          <p className="text-xs font-mono font-medium text-slate-800 truncate">
                            {cred.pinOrCode}
                          </p>
                        </div>
                        <button
                          onClick={() => handleCopy(cred.pinOrCode || '', `${cred.id}_pin`)}
                          className={cn(
                            "px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 border transition-all shrink-0",
                            isPinCopied 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                          )}
                          title="Copy PIN / Code"
                        >
                          {isPinCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                          <span>{isPinCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Notes / Security Questions */}
                  {cred.notes && (
                    <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-2.5 text-[11px] text-amber-900 leading-relaxed break-words">
                      <span className="font-bold text-amber-950 block mb-0.5">Notes:</span>
                      {cred.notes}
                    </div>
                  )}

                  {/* Card Footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Updated {cred.lastUpdated}</span>
                    {cred.websiteUrl && (
                      <a
                        href={cred.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        Launch <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Delete Credential?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to remove this login from your vault? You will no longer be able to view this saved password.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmId(null)}
                className="text-xs font-semibold px-4 py-2 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDelete(deleteConfirmId)}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs"
              >
                Yes, Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Credential Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingId ? 'Edit Website Credential' : 'Add Website Login / Password'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Save university applicant portals, Common App, and testing IDs.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Preset suggestions in modal */}
              {!editingId && (
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                    Quick Suggestion Presets:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_PORTALS.map(preset => (
                      <button
                        type="button"
                        key={preset.title}
                        onClick={() => {
                          setFormTitle(preset.title);
                          setFormCategory(preset.category);
                          setFormWebsiteUrl(preset.websiteUrl);
                          setFormNotes(preset.notes);
                        }}
                        className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg text-slate-600 transition-colors border border-slate-200"
                      >
                        {preset.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Website / Portal Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Harvard Applicant Status Portal, Common App"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Category & Associated University */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                    Linked University (Optional)
                  </label>
                  <input
                    type="text"
                    value={formLinkedUniversity}
                    onChange={(e) => setFormLinkedUniversity(e.target.value)}
                    placeholder="e.g. Harvard University"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Website URL */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Portal URL / Login Link
                </label>
                <input
                  type="url"
                  value={formWebsiteUrl}
                  onChange={(e) => setFormWebsiteUrl(e.target.value)}
                  placeholder="https://apply.commonapp.org"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Username & PIN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                    Username / ID / Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="student@example.com or CAID"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                    PIN / App ID / 2FA Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={formPinOrCode}
                    onChange={(e) => setFormPinOrCode(e.target.value)}
                    placeholder="e.g. PIN: 9281, App ID"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Password with Generator */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={generateStrongPassword}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" /> Generate Strong Password
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={formPasswordVisible ? "text" : "password"}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Enter password..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setFormPasswordVisible(!formPasswordVisible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title={formPasswordVisible ? "Hide password" : "Show password"}
                  >
                    {formPasswordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Notes / Security Questions */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Notes / Security Questions & Answers
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. Security question: First school -> Lincoln High. Decision released Dec 15."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-xs"
                >
                  {editingId ? 'Save Changes' : 'Save Credential'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
