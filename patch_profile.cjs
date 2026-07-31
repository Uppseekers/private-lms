const fs = require('fs');
let code = fs.readFileSync('src/pages/student/Profile.tsx', 'utf8');

// Update options
code = code.replace(/options=\{\["Fall 2026", "Spring 2027", "Fall 2027"\]\}/g, `options={["Fall 2026", "Spring 2027", "Fall 2027", "Spring 2028", "Fall 2028", "Spring 2029", "Fall 2029", "Spring 2030", "Fall 2030", "Spring 2031", "Fall 2031", "Spring 2032", "Fall 2032", "Spring 2033", "Fall 2033", "Spring 2034", "Fall 2034", "Spring 2035", "Fall 2035"]}`);

code = code.replace(/options=\{\["Bachelor of Science \(B.Sc.\)", "Bachelor of Arts \(B.A.\)", "Dual Degree"\]\}/g, `options={["Bachelor of Science (B.Sc.)", "Bachelor of Arts (B.A.)", "Bachelor of Engineering (B.E.)", "Bachelor of Technology (B.Tech)", "Bachelor of Commerce (B.Com)", "Bachelor of Business Admin (BBA)", "Dual Degree"]}`);

code = code.replace(/options=\{\["IB Diploma", "AP\/US High School", "A-Levels", "CBSE", "Other"\]\}/g, `options={["IB Diploma", "AP/US High School", "A-Levels", "CBSE", "ICSE/ISC", "Other"]}`);

code = code.replace(/options=\{\["Grade 9", "Grade 10", "Grade 11", "Grade 12", "Gap Year"\]\}/g, `options={["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12", "Gap Year"]}`);

// Add form handling
code = code.replace('export default function StudentProfile() {', `export default function StudentProfile() {\n  const [isSaving, setIsSaving] = useState(false);\n  const [saveMessage, setSaveMessage] = useState('');\n  const { updateStudent } = useDatabase();\n`);

code = code.replace(/<div className="max-w-5xl mx-auto space-y-8 pb-12">/, `<form onSubmit={(e) => {
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
    }} className="max-w-5xl mx-auto space-y-8 pb-12">`);

code = code.replace(/<\/div>\s*<div className="flex justify-end gap-4 mt-8">/, `
      <div className="flex justify-end gap-4 mt-8 items-center">
        {saveMessage && <span className="text-emerald-600 font-semibold">{saveMessage}</span>}
        <Button variant="outline" size="lg" type="button">Discard Changes</Button>
        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8" type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </form>
    `);
    
code = code.replace(/<Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8">Save Profile<\/Button>\s*<\/div>\s*<\/div>/, '');


// Add name attributes
code = code.replace(/label="Full Name" placeholder="John Doe" defaultValue=\{student\?.name\}/, `label="Full Name" name="name" placeholder="John Doe" defaultValue={student?.name}`);
code = code.replace(/label="Nationality \/ Citizenship" options=\{/g, `label="Nationality / Citizenship" name="countries" options={`);
code = code.replace(/label="Contact Details \(Email & Phone\)" placeholder=/g, `label="Phone Number" name="phone" placeholder=`);
code = code.replace(/label="Target Intake Year & Term" options=\{/g, `label="Target Intake Year & Term" name="intake" options={`);
code = code.replace(/label="Current High School Name & City" placeholder=/g, `label="Current High School Name & City" name="school" placeholder=`);

fs.writeFileSync('src/pages/student/Profile.tsx', code);
