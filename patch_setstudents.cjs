const fs = require('fs');
let code = fs.readFileSync('src/context/DatabaseContext.tsx', 'utf8');

code = code.replace(
  "const [students, setStudentsState] = useState<Student[]>(() => {",
  `const [students, setStudentsState] = useState<Student[]>(() => {`
);

code = code.replace(
  "students, setStudents: setStudentsState, updateStudent",
  "students, setStudents: async (newStudents: Student[]) => { setStudentsState(newStudents); localStorage.setItem('uppseekers_students_v2', JSON.stringify(newStudents)); const token = localStorage.getItem('auth_token'); if(token) { Promise.all(newStudents.map(s => fetch('/api/student', { method: 'PUT', headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token}, body: JSON.stringify(s) }))); } }, updateStudent"
);

fs.writeFileSync('src/context/DatabaseContext.tsx', code);
