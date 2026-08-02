import { useDatabase } from '@/context/DatabaseContext';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Upload, Plus, ShieldCheck, Clock, FileText, AlertCircle, Trash2, Edit3, X } from 'lucide-react';
import { INDIAN_CITIES, WORLD_COUNTRIES } from '@/data/locationAndUniData';

// Reusable components
const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">{children}</label>
);

const Input = ({ label, type = "text", ...props }: any) => (
  <div>
    {label && <Label>{label}</Label>}
    <input 
      type={type} 
      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 w-full"
      {...props}
    />
  </div>
);

const Select = ({ label, options, ...props }: any) => (
  <div>
    {label && <Label>{label}</Label>}
    <select 
      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 w-full"
      {...props}
    >
      <option value="">Select...</option>
      {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const FileUpload = ({ label }: { label: string }) => (
  <div>
    {label && <Label>{label}</Label>}
    <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 hover:border-blue-400 cursor-pointer transition-colors">
      <Upload className="w-5 h-5 mb-2 opacity-50" />
      <span className="text-xs font-medium">Click to upload .pdf, .jpg</span>
    </div>
  </div>
);

const Section = ({ title, children, description }: any) => (
  <Card className="mb-8">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
    </CardHeader>
    <CardContent className="space-y-6">
      {children}
    </CardContent>
  </Card>
);

// Generate intake year options (current year + next 8 years)
const currentYear = new Date().getFullYear();
const intakeYears = Array.from({ length: 9 }, (_, i) => (currentYear + i).toString());
const intakeTerms = ['Fall', 'Spring', 'Summer', 'Winter'];
const fullIntakeOptions = intakeYears.flatMap(yr => intakeTerms.map(term => `${term} ${yr}`));

export default function StudentProfile() {
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const { updateStudent, currentUser } = useDatabase();
  const student = currentUser as any;

  // Split intake into term and year if present
  const initialIntakeParts = (student?.intake || '').split(' ');
  const [intakeTerm, setIntakeTerm] = useState<string>(initialIntakeParts[0] && intakeTerms.includes(initialIntakeParts[0]) ? initialIntakeParts[0] : 'Fall');
  const [intakeYear, setIntakeYear] = useState<string>(initialIntakeParts[1] || currentYear.toString());

  const [activities, setActivities] = useState<any[]>(student?.activities || []);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingActivityIdx, setEditingActivityIdx] = useState<number | null>(null);
  
  // Activity form state
  const [actTitle, setActTitle] = useState('');
  const [actCategory, setActCategory] = useState('Leadership & STEM');
  const [actOrg, setActOrg] = useState('');
  const [actDesc, setActDesc] = useState('');
  const [actYears, setActYears] = useState('11th, 12th Grade');
  const [actHoursPerWeek, setActHoursPerWeek] = useState('5');
  const [actWeeksPerYear, setActWeeksPerYear] = useState('30');

  const openAddActivityModal = () => {
    if (activities.length >= 16) return;
    setEditingActivityIdx(null);
    setActTitle('');
    setActCategory('Leadership & STEM');
    setActOrg('');
    setActDesc('');
    setActYears('11th, 12th Grade');
    setActHoursPerWeek('5');
    setActWeeksPerYear('30');
    setIsActivityModalOpen(true);
  };

  const openEditActivityModal = (idx: number) => {
    const act = activities[idx];
    setEditingActivityIdx(idx);
    setActTitle(act.title || act.description || '');
    setActCategory(act.category || act.role || 'Leadership & STEM');
    setActOrg(act.organization || '');
    setActDesc(act.description || '');
    setActYears(act.date || act.years || '11th, 12th Grade');
    setActHoursPerWeek(act.hoursPerWeek || '5');
    setActWeeksPerYear(act.weeksPerYear || '30');
    setIsActivityModalOpen(true);
  };

  const handleSaveActivity = () => {
    if (!actTitle.trim()) return;
    const newAct = {
      id: editingActivityIdx !== null ? activities[editingActivityIdx].id : 'act_' + Date.now(),
      title: actTitle.trim(),
      category: actCategory,
      organization: actOrg.trim(),
      description: actDesc.trim(),
      date: actYears,
      years: actYears,
      hoursPerWeek: actHoursPerWeek.trim(),
      weeksPerYear: actWeeksPerYear.trim(),
      role: actCategory
    };

    if (editingActivityIdx !== null) {
      const updated = [...activities];
      updated[editingActivityIdx] = newAct;
      setActivities(updated);
    } else {
      if (activities.length < 16) {
        setActivities([...activities, newAct]);
      }
    }
    setIsActivityModalOpen(false);
  };

  const handleRemoveActivity = (idx: number) => {
    setActivities(activities.filter((_, i) => i !== idx));
  };

  let score = 0;
  if (student?.phone) score++;
  if (student?.countries && student?.countries.length > 0) score++;
  if (student?.intake) score++;
  if (student?.school) score++;
  if (activities.length > 0) score++;
  if (student?.extracurriculars && student?.extracurriculars.length > 0) score++;
  if (student?.academicScores && student?.academicScores.length > 0) score++;
  if (student?.documents && student?.documents.length > 0) score++;
  
  const completion = Math.round((score / 8) * 100);

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      setIsSaving(true);
      const fd = new FormData(e.target);
      const combinedIntake = `${intakeTerm} ${intakeYear}`;
      const updated = {
        ...student,
        name: fd.get('name') || student?.name || '',
        phone: fd.get('phone') || student?.phone || '',
        countries: fd.get('countries') ? [fd.get('countries')] : (student?.countries || []),
        intake: combinedIntake,
        school: fd.get('school') || student?.school || '',
        dob: fd.get('dob') || student?.dob || '',
        gender: fd.get('gender') || student?.gender || '',
        cityCountry: fd.get('cityCountry') || student?.cityCountry || '',
        passportStatus: fd.get('passportStatus') || student?.passportStatus || '',
        passportExpiry: fd.get('passportExpiry') || student?.passportExpiry || '',
        curriculum: fd.get('curriculum') || student?.curriculum || '',
        grade: fd.get('grade') || student?.grade || '',
        gpa: fd.get('gpa') || student?.gpa || '',
        classRank: fd.get('classRank') || student?.classRank || '',
        graduationYear: fd.get('graduationYear') || student?.graduationYear || '',
        satTotal: fd.get('satTotal') || student?.satTotal || '',
        actScore: fd.get('actScore') || student?.actScore || '',
        engTest: fd.get('engTest') || student?.engTest || '',
        engScore: fd.get('engScore') || student?.engScore || '',
        major1: fd.get('major1') || student?.major1 || '',
        major2: fd.get('major2') || student?.major2 || '',
        activities: activities
      };
      updateStudent(updated);
      setIsSaving(false);
      setSaveMessage('Profile saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    }} className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Progress & Gamification */}
      <Card className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-none">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-1">Profile Readiness</h2>
              <p className="text-blue-100 text-sm">Update your timeline and documents to reach 100%</p>
            </div>
            <div className="text-right">
              <span className="text-4xl font-bold">{completion}%</span>
              <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">Completed</p>
            </div>
          </div>
          <div className="w-full bg-blue-900/50 rounded-full h-2.5 overflow-hidden mb-4">
            <div className="bg-white h-full rounded-full" style={{ width: `${completion}%` }}></div>
          </div>
          <div className="flex gap-4">
            {completion === 100 ? (
               <div className="bg-blue-800/50 rounded-lg px-4 py-2 text-sm flex items-center gap-2">
                 <CheckCircle2 className="w-4 h-4 text-emerald-400" /> All items verified
               </div>
            ) : (
               <div className="bg-blue-800/50 rounded-lg px-4 py-2 text-sm flex items-center gap-2">
                 <AlertCircle className="w-4 h-4 text-amber-400" /> Missing Information
               </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Section title="1. Basic Personal & Contact Information" description="Your primary identity and contact channels.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Full Name" name="name" placeholder="John Doe" defaultValue={student?.name || ''} />
          <Input label="Date of Birth" name="dob" type="date" defaultValue={student?.dob || ''} />
          <Select label="Gender" name="gender" options={["Male", "Female", "Non-Binary", "Prefer not to say"]} defaultValue={student?.gender || ''} />
          <Select label="Nationality / Citizenship" name="countries" options={["USA", "India", "UK", "Canada", "Australia", "Singapore", "Other"]} defaultValue={student?.countries?.[0] || ''} />
          <div>
            <Label>City of Residence (Auto-Prompt)</Label>
            <input 
              list="indian-cities-list" 
              name="cityCountry" 
              placeholder="Type city name (e.g. Mumbai, Delhi, Bengaluru)..." 
              defaultValue={student?.cityCountry || ''} 
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 w-full"
            />
            <datalist id="indian-cities-list">
              {INDIAN_CITIES.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <Input label="Phone & Email" name="phone" placeholder="+1 234 567 8900 | john@example.com" defaultValue={student?.phone ? `${student.phone}${student.email ? ' | ' + student.email : ''}` : (student?.email || '')} />
        </div>
        <div className="pt-4 border-t border-slate-100">
          <h4 className="text-sm font-bold text-slate-900 mb-4">Passport Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Select label="Passport Status" name="passportStatus" options={["Valid Passport", "Applied / In Process", "Do Not Have"]} defaultValue={student?.passportStatus || ''} />
            <Input label="Expiry Date" name="passportExpiry" type="date" defaultValue={student?.passportExpiry || ''} />
            <FileUpload label="Upload Passport Copy" />
          </div>
        </div>
      </Section>

      <Section title="2. Academic Profile & High School Information" description="Your educational history, GPA, curriculum, and class standing.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="High School Name" name="school" placeholder="e.g. Lincoln High School" defaultValue={student?.school || ''} />
          <Select label="Curriculum" name="curriculum" options={["US High School (AP)", "International Baccalaureate (IB)", "CBSE / ICSE", "A-Levels", "Other"]} defaultValue={student?.curriculum || ''} />
          <Input label="Current Grade / Class" name="grade" placeholder="e.g. 12th Grade (Senior Year)" defaultValue={student?.grade || ''} />
          <Input label="GPA / Percentage" name="gpa" placeholder="e.g. 3.92 Unweighted / 4.3 Weighted" defaultValue={student?.gpa || ''} />
          <Input label="Class Rank (If applicable)" name="classRank" placeholder="e.g. Top 5% / 15 out of 320" defaultValue={student?.classRank || ''} />
          <Input label="Expected Graduation Year" name="graduationYear" placeholder="e.g. 2026" defaultValue={student?.graduationYear || ''} />
        </div>
      </Section>

      <Section title="3. Standardized Test Scores" description="Your official or target SAT, ACT, and English Proficiency scores.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Input label="SAT Total Score" name="satTotal" placeholder="e.g. 1520" defaultValue={student?.satTotal || student?.academicScores?.find((s: any) => s.type === 'SAT')?.score || ''} />
          <Input label="SAT Reading & Writing" name="satRw" placeholder="e.g. 750" defaultValue="" />
          <Input label="SAT Math" name="satMath" placeholder="e.g. 770" defaultValue="" />
          <Input label="ACT Score (If taken)" name="actScore" placeholder="e.g. 34" defaultValue={student?.actScore || ''} />
          <Select label="English Proficiency Test" name="engTest" options={["TOEFL", "IELTS", "Duolingo", "Waived"]} defaultValue={student?.engTest || ''} />
          <Input label="English Test Score" name="engScore" placeholder="e.g. 112 / 120" defaultValue={student?.engScore || ''} />
        </div>
      </Section>

      <Section title="4. Target Intake & University Preferences" description="Your application timeline, target countries, and majors.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>Target Intake Term</Label>
            <select 
              value={intakeTerm}
              onChange={e => setIntakeTerm(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 w-full"
            >
              {intakeTerms.map(term => <option key={term} value={term}>{term}</option>)}
            </select>
          </div>

          <div>
            <Label>Target Intake Year (Next 8 Years)</Label>
            <select 
              value={intakeYear}
              onChange={e => setIntakeYear(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 w-full"
            >
              {intakeYears.map(yr => <option key={yr} value={yr}>{yr}</option>)}
            </select>
          </div>

          <div>
            <Label>Preferred Country (Auto-Prompt)</Label>
            <input 
              list="world-countries-list" 
              name="primaryCountry" 
              placeholder="Type country name (e.g. United States, United Kingdom)..." 
              defaultValue={student?.countries?.[0] || ''} 
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 w-full"
            />
            <datalist id="world-countries-list">
              {WORLD_COUNTRIES.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>

          <div>
            <Label>Other Interested Countries (Text Field Only)</Label>
            <input 
              type="text"
              name="otherCountries"
              placeholder="e.g. Germany, Japan, Ireland..." 
              defaultValue={student?.otherCountries || ''} 
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 w-full"
            />
          </div>

          <Input label="Intended Major 1" name="major1" placeholder="e.g. Computer Science & AI" defaultValue={student?.major1 || ''} />
          <Input label="Intended Major 2" name="major2" placeholder="e.g. Applied Mathematics" defaultValue={student?.major2 || ''} />
        </div>
      </Section>

      <Section title="5. Counselor & Mentor Team" description="Assigned advisors supporting your admissions journey.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-blue-600 block mb-1">Lead Counselor</span>
            <p className="font-bold text-slate-900">{student?.counselor || 'Assigned Counselor'}</p>
            <p className="text-xs text-slate-500 mt-1">Admissions & Strategy Advisor</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-indigo-600 block mb-1">SAT & Prep Mentor</span>
            <p className="font-bold text-slate-900">Test Prep Faculty</p>
            <p className="text-xs text-slate-500 mt-1">Standardized Prep Advisor</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-purple-600 block mb-1">Research Mentor</span>
            <p className="font-bold text-slate-900">Academic Mentor</p>
            <p className="text-xs text-slate-500 mt-1">Projects & Research Lead</p>
          </div>
        </div>

        {/* Task Sheet Link Field */}
        <div className="mt-4 p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-800 block mb-0.5">Task Sheet Link</span>
            <p className="text-xs text-slate-600">Click below to open your master counselor task sheet and action items.</p>
          </div>
          {student?.taskSheetLink ? (
            <a 
              href={student.taskSheetLink.startsWith('http') ? student.taskSheetLink : `https://${student.taskSheetLink}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
            >
              Open Task Sheet <FileText className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span className="text-xs font-semibold text-amber-700 bg-amber-100/80 px-3 py-1.5 rounded-lg border border-amber-200">
              Link not assigned by Counselor yet
            </span>
          )}
        </div>
      </Section>

      <Section title="6. Extracurricular Activities & Honors" description="Your leadership roles, awards, projects, and achievements (Add up to 16 activities).">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">
              Activities ({activities.length} / 16)
            </h4>
            <Button 
              type="button" 
              onClick={openAddActivityModal} 
              disabled={activities.length >= 16}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Activity
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activities.map((act: any, idx: number) => (
              <div key={act.id || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 relative group hover:border-blue-300 transition-colors">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">{act.title || act.description || `Activity #${idx + 1}`}</span>
                    <span className="text-[11px] text-blue-600 font-semibold">{act.category || act.role || 'General'}</span>
                    {act.organization && <span className="text-slate-500 block text-[11px]">{act.organization}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => openEditActivityModal(idx)} className="p-1 text-slate-400 hover:text-blue-600 rounded">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => handleRemoveActivity(idx)} className="p-1 text-slate-400 hover:text-red-600 rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {act.description && <p className="text-slate-600 line-clamp-2">{act.description}</p>}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
                  {act.date && <span className="bg-slate-200/70 px-2 py-0.5 rounded font-semibold text-slate-700">{act.date}</span>}
                  {(act.hoursPerWeek || act.weeksPerYear) && (
                    <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded font-bold">
                      ⏱️ {act.hoursPerWeek ? `${act.hoursPerWeek} hrs/wk` : ''}{act.hoursPerWeek && act.weeksPerYear ? ' • ' : ''}{act.weeksPerYear ? `${act.weeksPerYear} wks/yr` : ''}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {activities.length === 0 && (
              <div className="col-span-full p-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                No activities added yet. Click "+ Add Activity" to build your activity profile (up to 16 entries).
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Activity Modal */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingActivityIdx !== null ? 'Edit Activity' : 'Add New Activity'} ({activities.length + (editingActivityIdx === null ? 1 : 0)} / 16)
              </h3>
              <button type="button" onClick={() => setIsActivityModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-left">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Activity Title / Role *</label>
                <input 
                  type="text" 
                  value={actTitle} 
                  onChange={e => setActTitle(e.target.value)} 
                  placeholder="e.g. Captain, Robotics Club" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Category</label>
                  <select 
                    value={actCategory} 
                    onChange={e => setActCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Leadership & STEM">Leadership & STEM</option>
                    <option value="Community Service">Community Service</option>
                    <option value="Athletics & Sports">Athletics & Sports</option>
                    <option value="Arts & Music">Arts & Music</option>
                    <option value="Research & Academic">Research & Academic</option>
                    <option value="Internship & Work">Internship & Work</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Participation Grade(s)</label>
                  <input 
                    type="text" 
                    value={actYears} 
                    onChange={e => setActYears(e.target.value)} 
                    placeholder="e.g. 10th, 11th, 12th Grade" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Time Commitment: Hours/Week & Weeks/Year */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Hours Spent / Week</label>
                  <input 
                    type="text" 
                    value={actHoursPerWeek} 
                    onChange={e => setActHoursPerWeek(e.target.value)} 
                    placeholder="e.g. 5" 
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Weeks Spent / Year</label>
                  <input 
                    type="text" 
                    value={actWeeksPerYear} 
                    onChange={e => setActWeeksPerYear(e.target.value)} 
                    placeholder="e.g. 30" 
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Organization / School Name</label>
                <input 
                  type="text" 
                  value={actOrg} 
                  onChange={e => setActOrg(e.target.value)} 
                  placeholder="e.g. Lincoln High School / FIRST Robotics" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Description / Key Achievements</label>
                <textarea 
                  value={actDesc} 
                  onChange={e => setActDesc(e.target.value)} 
                  placeholder="Describe your role, responsibilities, and achievements..." 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setIsActivityModalOpen(false)}>Cancel</Button>
              <Button type="button" onClick={handleSaveActivity} disabled={!actTitle.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
                {editingActivityIdx !== null ? 'Save Changes' : 'Add Activity'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-4 mt-8 items-center">
        {saveMessage && <span className="text-emerald-600 font-semibold">{saveMessage}</span>}
        <Button variant="outline" size="lg" type="button">Discard Changes</Button>
        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8" type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </form>
  );
}

