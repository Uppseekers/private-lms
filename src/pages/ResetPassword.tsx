import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  GraduationCap,
  Key,
  Lock,
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Shield,
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import {
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode,
} from 'firebase/auth';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const urlMode = searchParams.get('mode') || '';
  const urlOobCode = searchParams.get('oobCode') || '';
  const urlEmail = searchParams.get('email') || '';

  const [step, setStep] = useState<'info' | 'verify_and_set' | 'success'>(
    urlMode === 'resetPassword' && urlOobCode ? 'verify_and_set' : 'info'
  );

  const [email, setEmail] = useState(urlEmail);
  const [oobCode, setOobCode] = useState(urlOobCode);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (urlEmail) setEmail(urlEmail);
    if (urlOobCode) setOobCode(urlOobCode);

    const handleActionLink = async () => {
      if (!urlOobCode) return;
      if (urlMode === 'verifyEmail') {
        setLoading(true);
        setError('');
        try {
          await applyActionCode(auth, urlOobCode);
          setSuccessMsg('Your email address has been verified! You can now sign in.');
          setStep('success');
        } catch (err: any) {
          setError(err?.message || 'Verification link is invalid or expired.');
        } finally {
          setLoading(false);
        }
      } else if (urlMode === 'resetPassword') {
        setLoading(true);
        setError('');
        try {
          const verifiedEmail = await verifyPasswordResetCode(auth, urlOobCode);
          if (verifiedEmail) setEmail(verifiedEmail);
          setStep('verify_and_set');
        } catch (err: any) {
          setError(err?.message || 'Password reset link is invalid or expired.');
          setStep('info');
        } finally {
          setLoading(false);
        }
      }
    };

    void handleActionLink();
  }, [urlMode, urlOobCode, urlEmail]);

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!oobCode) {
      setError('Missing password reset verification code.');
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccessMsg('Your password has been successfully updated in Firebase Authentication.');
      setStep('success');
    } catch (err: any) {
      setError(err?.message || 'Failed to update password. The reset link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
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

        {step === 'info' && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="text-center pb-3">
              <div className="mx-auto w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-2">
                <Shield className="w-5 h-5" />
              </div>
              <CardTitle className="text-xl text-slate-800">Direct Password Management</CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Automated password reset emails are disabled on this portal.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs text-slate-700 leading-relaxed">
                <p>
                  <strong>Already signed in?</strong> Change your password directly inside your <strong>Profile</strong> page or the top-right account menu—no email verification links needed.
                </p>
                <p>
                  <strong>Locked out of your account?</strong> Contact your <strong>Category Manager</strong> or <strong>System Administrator</strong> to set a new password directly from the Student Database.
                </p>
              </div>

              <Button
                onClick={() => navigate('/login')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Sign In
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'verify_and_set' && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="text-center pb-3">
              <div className="mx-auto w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                <Key className="w-5 h-5" />
              </div>
              <CardTitle className="text-xl text-slate-800">Set New Password</CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                {email ? `Updating password for ${email}` : 'Choose a strong new password for your account.'}
              </p>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleConfirmReset} className="space-y-4">
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
                  {loading ? 'Saving New Password...' : 'Save New Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'success' && (
          <Card className="border-slate-200 shadow-sm text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Account Updated</h3>
              <p className="text-sm text-slate-600 max-w-sm mx-auto">
                {successMsg || 'Your credentials have been updated. You can now sign into your Uppseekers account.'}
              </p>
              <div className="pt-2">
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5"
                >
                  Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
