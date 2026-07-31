import { useDatabase } from '@/context/DatabaseContext';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Upload, Plus, ShieldCheck, Clock, FileText, AlertCircle } from 'lucide-react';

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
      <option value="" disabled>Select...</option>
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

export default function StudentProfile() {
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const { updateStudent } = useDatabase();

  const { currentUser } = useDatabase();
  const student = currentUser as any;

  const [activities, setActivities] = useState(student?.activities || []);
  const [honors, setHonors] = useState(student?.extracurriculars || []);

  let score = 0;
  if (student?.phone) score++;
  if (student?.countries && student?.countries.length > 0) score++;
  if (student?.intake) score++;
  if (student?.school) score++;
  if (student?.activities && student?.activities.length > 0) score++;
  if (student?.extracurriculars && student?.extracurriculars.length > 0) score++;
  if (student?.academicScores && student?.academicScores.length > 0) score++;
  if (student?.documents && student?.documents.length > 0) score++;
  
  const completion = Math.round((score / 8) * 100);

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      setIsSaving(true);
      const fd = new FormData(e.target);
      const updated = {
        ...student,
        name: fd.get('name') || student?.name,
        phone: fd.get('phone') || student?.phone,
        countries: fd.get('countries') ? [fd.get('countries')] : student?.countries,
        intake: fd.get('intake') || student?.intake,
        school: fd.get('school') || student?.school
      };
      updateStudent(updated).then(() => {
        setIsSaving(false);
        setSaveMessage('Profile saved successfully!');
        setTimeout(() => setSaveMessage(''), 3000);
      });
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
          <Input label="Full Name" name="name" placeholder="John Doe" defaultValue={student?.name} />
          <Input label="Date of Birth" type="date" />
          <Select label="Gender" options={["Male", "Female", "Non-Binary", "Prefer not to say"]} defaultValue="" />
          <Select label="Nationality / Citizenship" name="countries" options={["USA", "India", "UK", "Canada", "Australia", "Other"]} defaultValue={student?.countries?.[0] || ''} />
          <Input label="Country & City of Residence" placeholder="e.g. New York, USA" />
          <Input label="Phone Number" name="phone" placeholder="+1 234 567 8900 | john@example.com" defaultValue={`${student?.phone || ''} | ${student?.email}`} />
        </div>
        <div className="pt-4 border-t border-slate-100">
          <h4 className="text-sm font-bold text-slate-900 mb-4">Passport Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Select label="Passport Status" options={["Valid Passport", "Applied / In Process", "Do Not Have"]} defaultValue="" />
            <Input label="Expiry Date" type="date" />
            <FileUpload label="Upload Passport Copy" />
          </div>
        </div>
            </Section>

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
