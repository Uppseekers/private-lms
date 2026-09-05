import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  Mail, 
  Key, 
  Lock, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ShieldCheck,
  Send,
  ExternalLink
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const urlToken = searchParams.get('token') || '';
  const urlEmail = searchParams.get('email') || '';
  const urlCode = searchParams.get('code') || '';

  const [step, setStep] = useState<'request' | 'verify_and_set' | 'success'>(
    urlToken || urlCode ? 'verify_and_set' : 'request'
  );

  const [email, setEmail] = useState(urlEmail);
  const [code, setCode] = useState(urlCode);
  const [token, setToken] = useState(urlToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (urlEmail) setEmail(urlEmail);
    if (urlToken) setToken(urlToken);
    if (urlCode) setCode(urlCode);
    if (urlToken || urlCode) {
      setStep('verify_and_set');
    }
  }, [urlEmail, urlToken, urlCode]);

  // Handle requesting the reset email
  const handleRequestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setPreviewUrl(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to trigger reset email');
      }

      setSuccessMsg(`Reset instructions and verification code sent to ${cleanEmail}`);
      if (data.token) setToken(data.token);
      if (data.code) setCode(data.code);
      if (data.previewUrl) setPreviewUrl(data.previewUrl);
      
      // Advance to verify and reset step
      setStep('verify_and_set');
    } catch (err: any) {
      setError(err.message || 'Error requesting password reset email');
    } finally {
      setLoading(false);
    }
  };

  // Helper to sync password with Firestore if student or staff document exists
  const syncPasswordWithFirestore = async (targetEmail: string, pass: string) => {
    try {
      const cleanEmail = targetEmail.trim().toLowerCase();

      // Check students collection
      const stuSnap = await getDocs(collection(db, 'students'));
      for (const d of stuSnap.docs) {
        const sData = d.data();
        if (sData.email && sData.email.trim().toLowerCase() === cleanEmail) {
          await updateDoc(doc(db, 'students', d.id), { password: pass });
          console.log('[Firestore] Updated student password:', d.id);
        }
      }

      // Check staff collection
      const staffSnap = await getDocs(collection(db, 'staff'));
      for (const d of staffSnap.docs) {
        const stData = d.data();
        if (stData.email && stData.email.trim().toLowerCase() === cleanEmail) {
          await updateDoc(doc(db, 'staff', d.id), { password: pass });
          console.log('[Firestore] Updated staff password:', d.id);
        }
      }
    } catch (fsErr) {
      console.warn('[Firestore Sync Notice] Could not update Firestore doc directly:', fsErr);
    }
  };

  // Handle completing the password reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please provide your account email address');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/complete-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          code: code.trim(),
          token: token.trim(),
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to reset password');
      }

      // Sync with Firestore for client login
      await syncPasswordWithFirestore(cleanEmail, newPassword);

      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Error updating password. Token or code may be expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center">
          <Link to="/login" className="flex flex-col items-center group">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:bg-blue-700 transition">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h2 className="mt-4 text-center text-3xl font-bold text-slate-900 tracking-tight">
              Uppseekers
            </h2>
            <p className="text-sm text-slate-500 font-medium">Always Look Up</p>
          </Link>
        </div>

        {/* Step 1: Request Email */}
        {step === 'request' && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="text-center pb-3">
              <div className="mx-auto w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-2">
                <Mail className="w-5 h-5" />
              </div>
              <CardTitle className="text-xl text-slate-800">Forgot / Reset Password</CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Enter your registered user email address. We will trigger an email containing your password reset link and verification code.
              </p>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRequestEmail} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Your Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. student@uppseekers.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {loading ? 'Triggering Reset Email...' : 'Send Password Reset Email'}
                </Button>
              </form>

              <div className="mt-6 text-center border-t border-slate-100 pt-4">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Verify Code and Set New Password */}
        {step === 'verify_and_set' && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="text-center pb-3">
              <div className="mx-auto w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                <Key className="w-5 h-5" />
              </div>
              <CardTitle className="text-xl text-slate-800">Set New Password</CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Enter the verification code sent to your email and choose a strong new password.
              </p>
            </CardHeader>
            <CardContent>
              {successMsg && (
                <div className="mb-4 bg-emerald-50 text-emerald-700 text-xs p-3 rounded-lg border border-emerald-100 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">{successMsg}</p>
                    {previewUrl && (
                      <a 
                        href={previewUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center gap-1 mt-1 font-semibold text-emerald-800 underline hover:text-emerald-900"
                      >
                        <ExternalLink className="w-3 h-3" /> View Triggered Email (Dev Preview)
                      </a>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-4 bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {!token && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700">
                        6-Digit Verification Code
                      </label>
                      <button
                        type="button"
                        onClick={() => setStep('request')}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Resend code?
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 123456"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm tracking-widest font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 flex items-center justify-center gap-2 mt-2"
                >
                  <Lock className="w-4 h-4" />
                  {loading ? 'Saving New Password...' : 'Save & Update Password'}
                </Button>
              </form>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> Re-enter email address
                </button>
                <Link to="/login" className="text-slate-600 hover:underline">
                  Cancel
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Success */}
        {step === 'success' && (
          <Card className="border-slate-200 shadow-sm text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Password Reset Successful</h3>
              <p className="text-sm text-slate-600 max-w-sm mx-auto">
                Your password has been successfully updated. You can now log into your Uppseekers account using your new credentials.
              </p>
              <div className="pt-2">
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5"
                >
                  Sign In with New Password
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
