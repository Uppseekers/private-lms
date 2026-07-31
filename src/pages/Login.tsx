import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap } from 'lucide-react';
import { useDatabase } from '@/context/DatabaseContext';
import { auth, googleAuthProvider } from '@/lib/firebase';
import { signInWithPopup } from 'firebase/auth';

export default function Login() {
  const navigate = useNavigate();
  const { setCurrentUser, setIsAuthenticated, initializeData, staff, students } = useDatabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Send login request to backend Cloud SQL auth
      const response = await fetch('/api/auth/login-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const { user, token } = await response.json();
        localStorage.setItem('auth_token', token);
        
        // Load latest Cloud SQL database
        await initializeData(token);
        
        setCurrentUser(user);
        setIsAuthenticated(true);

        if (user.role === 'STUDENT') {
          navigate('/student/dashboard');
        } else {
          navigate('/team/dashboard');
        }
        return;
      }
    } catch (err) {
      console.error('API login error:', err);
    } finally {
      setLoading(false);
    }
    
    // Fallback: Check local memory/localStorage if backend fails
    const staffUser = staff.find(s => {
      const isEmailMatch = s.email === email || (s.email === 'uppseekers@gmail.com' && (email === 'uppseekers@gmail.com' || email === 'uppseekers@gmail.cm'));
      const isPasswordMatch = s.password === password || (s.email === 'uppseekers@gmail.com' && password === 'Uppseekers@1');
      return isEmailMatch && isPasswordMatch;
    });
    
    if (staffUser) {
      localStorage.setItem('auth_token', `custom_${staffUser.id}_${staffUser.email}`);
      setCurrentUser(staffUser);
      setIsAuthenticated(true);
      navigate('/team/dashboard');
      return;
    }
    
    const studentUser = students.find(s => s.email === email && s.password === password);
    if (studentUser) {
      localStorage.setItem('auth_token', `custom_${studentUser.id}_${studentUser.email}`);
      setCurrentUser({
        ...studentUser,
        role: 'STUDENT',
        status: 'Active',
      } as any);
      setIsAuthenticated(true);
      
      let score = 0;
      if (studentUser.phone) score++;
      if (studentUser.countries && studentUser.countries.length > 0) score++;
      if (studentUser.intake) score++;
      if (studentUser.school) score++;
      if (studentUser.activities && studentUser.activities.length > 0) score++;
      if (studentUser.extracurriculars && studentUser.extracurriculars.length > 0) score++;
      if (studentUser.academicScores && studentUser.academicScores.length > 0) score++;
      if (studentUser.documents && studentUser.documents.length > 0) score++;
      
      const completion = (score / 8) * 100;
      if (completion < 60) {
        navigate('/student/profile');
      } else {
        navigate('/student/dashboard');
      }
      return;
    }

    setError('Invalid email or password');
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const token = await result.user.getIdToken();
      localStorage.setItem('auth_token', token);
      
      // Login to backend to sync user
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Backend login failed');
      
      const { user } = await response.json();
      
      // Load all data
      const data = await initializeData(token);

      setCurrentUser(user);
      setIsAuthenticated(true);
      
      if (user.role === 'STUDENT') {
        const studentUser = data?.students?.find((s: any) => s.userId === user.id) || user;
        let score = 0;
        if (studentUser.phone) score++;
        if (studentUser.countries && studentUser.countries.length > 0) score++;
        if (studentUser.intake) score++;
        if (studentUser.school) score++;
        if (studentUser.activities && studentUser.activities.length > 0) score++;
        if (studentUser.extracurriculars && studentUser.extracurriculars.length > 0) score++;
        if (studentUser.academicScores && studentUser.academicScores.length > 0) score++;
        if (studentUser.documents && studentUser.documents.length > 0) score++;
        
        const completion = (score / 8) * 100;
        if (completion < 60) {
          navigate('/student/profile');
        } else {
          navigate('/student/dashboard');
        }
      } else {
        navigate('/team/dashboard');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Login failed');
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

