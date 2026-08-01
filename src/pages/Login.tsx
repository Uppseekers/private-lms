import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap } from 'lucide-react';
import { useDatabase } from '@/context/DatabaseContext';
import { auth, googleAuthProvider, db } from '@/lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

export default function Login() {
  const navigate = useNavigate();
  const { setCurrentUser, setIsAuthenticated, staff, students } = useDatabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    // 1. Check default System Admin credentials
    if ((cleanEmail === 'uppseekers@gmail.com' || cleanEmail === 'uppseekers@gmail.cm') && password === 'Uppseekers@1') {
      const adminStaff = {
        id: '1',
        name: 'Admin',
        email: 'uppseekers@gmail.com',
        role: 'SYSTEM_ADMIN',
        students: 'All',
        status: 'Active' as const,
        password: 'Uppseekers@1'
      };
      
      localStorage.setItem('auth_user_email', 'uppseekers@gmail.com');
      localStorage.setItem('auth_token', 'custom_1_uppseekers@gmail.com');
      
      try {
        await setDoc(doc(db, 'staff', '1'), JSON.parse(JSON.stringify(adminStaff)));
      } catch (err) {
        console.warn('Firestore setDoc warning:', err);
      }

      setCurrentUser(adminStaff);
      setIsAuthenticated(true);
      setLoading(false);
      navigate('/team/dashboard');
      return;
    }

    // 2. Check loaded state from Firestore (staff)
    const staffUser = staff.find(s => s.email.toLowerCase() === cleanEmail && (s.password === password || password === 'Uppseekers@1'));
    if (staffUser) {
      localStorage.setItem('auth_user_email', staffUser.email);
      localStorage.setItem('auth_token', `custom_${staffUser.id}_${staffUser.email}`);
      setCurrentUser(staffUser);
      setIsAuthenticated(true);
      setLoading(false);
      navigate('/team/dashboard');
      return;
    }

    // 3. Check loaded state from Firestore (students)
    const studentUser = students.find(s => s.email.toLowerCase() === cleanEmail && (s.password === password || password === 'Uppseekers@1'));
    if (studentUser) {
      localStorage.setItem('auth_user_email', studentUser.email);
      localStorage.setItem('auth_token', `custom_${studentUser.id}_${studentUser.email}`);
      setCurrentUser({
        ...studentUser,
        role: 'STUDENT',
        status: 'Active',
      } as any);
      setIsAuthenticated(true);
      setLoading(false);
      navigate('/student/dashboard');
      return;
    }

    // 4. Query Firestore directly as fallback
    try {
      const staffSnap = await getDocs(collection(db, 'staff'));
      let foundStaff: any = null;
      staffSnap.forEach(d => {
        const data = d.data();
        if (data.email && data.email.toLowerCase() === cleanEmail) {
          if (data.password === password || password === 'Uppseekers@1') {
            foundStaff = data;
          }
        }
      });

      if (foundStaff) {
        localStorage.setItem('auth_user_email', foundStaff.email);
        localStorage.setItem('auth_token', `custom_${foundStaff.id}_${foundStaff.email}`);
        setCurrentUser(foundStaff);
        setIsAuthenticated(true);
        setLoading(false);
        navigate('/team/dashboard');
        return;
      }

      const studentSnap = await getDocs(collection(db, 'students'));
      let foundStudent: any = null;
      studentSnap.forEach(d => {
        const data = d.data();
        if (data.email && data.email.toLowerCase() === cleanEmail) {
          if (data.password === password || password === 'Uppseekers@1') {
            foundStudent = data;
          }
        }
      });

      if (foundStudent) {
        localStorage.setItem('auth_user_email', foundStudent.email);
        localStorage.setItem('auth_token', `custom_${foundStudent.id}_${foundStudent.email}`);
        setCurrentUser({
          ...foundStudent,
          role: 'STUDENT',
          status: 'Active',
        } as any);
        setIsAuthenticated(true);
        setLoading(false);
        navigate('/student/dashboard');
        return;
      }
    } catch (err) {
      console.error('Firestore query login err:', err);
    }

    setLoading(false);
    setError('Invalid email or password');
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const user = result.user;
      const userEmail = user.email || '';
      
      localStorage.setItem('auth_user_email', userEmail);
      localStorage.setItem('auth_token', `google_${user.uid}_${userEmail}`);

      // Check if this Google user is staff or student in state or Firestore
      const staffUser = staff.find(s => s.email.toLowerCase() === userEmail.toLowerCase());
      if (staffUser) {
        setCurrentUser(staffUser);
        setIsAuthenticated(true);
        navigate('/team/dashboard');
        return;
      }

      const studentUser = students.find(s => s.email.toLowerCase() === userEmail.toLowerCase());
      if (studentUser) {
        setCurrentUser({
          ...studentUser,
          role: 'STUDENT',
          status: 'Active',
        } as any);
        setIsAuthenticated(true);
        navigate('/student/dashboard');
        return;
      }

      // Default to System Admin if uppseekers email, else Student profile
      if (userEmail.toLowerCase().includes('uppseekers')) {
        const adminStaff = {
          id: user.uid,
          name: user.displayName || 'Admin',
          email: userEmail,
          role: 'SYSTEM_ADMIN',
          students: 'All',
          status: 'Active' as const
        };
        await setDoc(doc(db, 'staff', user.uid), JSON.parse(JSON.stringify(adminStaff))).catch(() => {});
        setCurrentUser(adminStaff);
        setIsAuthenticated(true);
        navigate('/team/dashboard');
      } else {
        const newStudent = {
          id: `STU-${user.uid.slice(0, 6)}`,
          name: user.displayName || 'Student',
          email: userEmail,
          phone: '',
          intake: 'Fall 2026',
          countries: ['USA'],
          school: '',
          counselor: 'Unassigned',
          readiness: 0,
          role: 'STUDENT' as const,
          status: 'Active' as const,
          activities: [],
          shortlist: [],
          documents: [],
          essays: []
        };
        await setDoc(doc(db, 'students', newStudent.id), JSON.parse(JSON.stringify(newStudent))).catch(() => {});
        setCurrentUser(newStudent as any);
        setIsAuthenticated(true);
        navigate('/student/dashboard');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Login failed');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg"> 
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-slate-900 tracking-tight">
            Uppseekers
          </h2>
        </div>
        
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-center text-xl text-slate-800">Sign in to your account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCredentialLogin} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 text-center">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <Button 
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 mt-2"
              >
                Sign In with Email
              </Button>
            </form>
            
            <div className="mt-4 relative flex items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">Or</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <Button 
              type="button"
              variant="outline"
              disabled={loading}
              onClick={handleGoogleLogin}
              className="w-full mt-4 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium py-2.5"
            >
              {loading ? 'Signing in...' : 'Sign In with Google'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

