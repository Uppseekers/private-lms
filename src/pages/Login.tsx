import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, AlertCircle } from 'lucide-react';
import { useDatabase } from '@/context/DatabaseContext';
import { auth, normalizeEmail } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';

const BOOTSTRAP_ADMIN_EMAIL = 'uppseekers@gmail.com';

function mapFirebaseAuthError(err: any): string {
  const code = err?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Double-check your credentials or ask your Category Manager / Admin to update your password.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact your administrator.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a few minutes and try again.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled yet in Firebase Console Authentication -> Sign-in method.';
    case 'auth/network-request-failed':
      return 'Network error while contacting Firebase Authentication. Please check your connection.';
    default:
      return err?.message || 'Unable to sign in. Please verify your email and password.';
  }
}

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, currentUser, isFirebaseAuthReady, authError, clearAuthError, signOutAll, portalBranding } = useDatabase();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBootstrapAdminSetup, setShowBootstrapAdminSetup] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setLogoFailed(false);
  }, [portalBranding.logoUrl]);

  useEffect(() => {
    if (isFirebaseAuthReady && isAuthenticated && currentUser) {
      if ((currentUser.role || '').toUpperCase() === 'STUDENT') {
        navigate('/student/dashboard', { replace: true });
      } else {
        navigate('/team/dashboard', { replace: true });
      }
    }
  }, [isFirebaseAuthReady, isAuthenticated, currentUser, navigate]);

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setShowBootstrapAdminSetup(false);
    clearAuthError();

    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    try {
      // Strictly clear any previous account session & browser storage before signing in
      if (auth.currentUser && normalizeEmail(auth.currentUser.email) !== cleanEmail) {
        await signOutAll();
      } else {
        try {
          window.sessionStorage?.clear();
          if (window.localStorage) {
            const keys: string[] = [];
            for (let i = 0; i < window.localStorage.length; i++) {
              const k = window.localStorage.key(i);
              if (k && k !== 'uppseekers_zoho_diagnostic_trace_v1' && k !== 'uppseekers_portal_branding_cache') keys.push(k);
            }
            keys.forEach((k) => window.localStorage.removeItem(k));
          }
        } catch {
          // ignore storage cleanup failure
        }
        if (auth.currentUser) {
          await signOut(auth).catch(() => {});
        }
      }

      try {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
        // DatabaseContext onAuthStateChanged resolves the Firestore role & profile automatically
      } catch (firstErr: any) {
        const firstCode = firstErr?.code || '';
        // Attempt seamless legacy student/staff credential migration if account wasn't yet synced to Firebase Auth
        if (
          firstCode === 'auth/invalid-credential' ||
          firstCode === 'auth/user-not-found' ||
          firstCode === 'auth/wrong-password'
        ) {
          try {
            const migRes = await fetch('/api/auth/migrate-legacy-login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: cleanEmail, password }),
            });
            const migJson = await migRes.json().catch(() => null);
            if (migRes.ok && migJson?.ok && migJson?.migrated) {
              await signInWithEmailAndPassword(auth, cleanEmail, password);
              return;
            }
          } catch {
            // Fall through to normal error handling
          }
        }
        throw firstErr;
      }
    } catch (err: any) {
      const code = err?.code || '';
      setError(mapFirebaseAuthError(err));
      if (
        cleanEmail === BOOTSTRAP_ADMIN_EMAIL &&
        (code === 'auth/invalid-credential' || code === 'auth/user-not-found')
      ) {
        setShowBootstrapAdminSetup(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBootstrapAdminCreate = async () => {
    setError('');
    setNotice('');
    const cleanEmail = normalizeEmail(email);
    if (cleanEmail !== BOOTSTRAP_ADMIN_EMAIL) return;
    if (password.length < 6) {
      setError('Please enter a password of at least 6 characters to initialize the primary admin account.');
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      await updateProfile(cred.user, { displayName: 'System Admin' }).catch(() => {});
      setShowBootstrapAdminSetup(false);
      setNotice('Primary Admin account created! Signing you in...');
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') {
        setShowBootstrapAdminSetup(false);
        setError(
          'The primary admin account is already registered in Firebase Auth. Use Forgot / Reset Password if you need a new password.'
        );
      } else {
        setError(mapFirebaseAuthError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const activeError = error || authError;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="flex flex-col items-center">
          {portalBranding.logoUrl && !logoFailed ? (
            <img
              src={portalBranding.logoUrl}
              alt={portalBranding.portalName || 'Uppseekers'}
              onError={() => setLogoFailed(true)}
              className="h-14 max-w-[220px] object-contain"
            />
          ) : (
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
          )}
          <h2 className="mt-5 text-center text-3xl font-bold text-slate-900 tracking-tight">
            {portalBranding.portalName || 'Uppseekers'}
          </h2>
          <p className="mt-1 text-center text-sm text-slate-500">
            Student Counseling & Admissions Portal
          </p>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-center text-xl text-slate-800">
              Sign in to your account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {activeError && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{activeError}</span>
              </div>
            )}

            {notice && (
              <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg border border-blue-200 leading-relaxed">
                {notice}
              </div>
            )}

              <>
                <form onSubmit={handleCredentialLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@uppseekers.com"
                      autoComplete="email"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700">
                        Password
                      </label>
                      <Link
                        to={`/reset-password${email ? `?email=${encodeURIComponent(email.trim())}` : ''}`}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        Forgot Password?
                      </Link>
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 mt-2"
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>

                {showBootstrapAdminSetup && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2.5">
                    <p className="text-xs font-semibold text-amber-900">
                      First-Time Setup for {BOOTSTRAP_ADMIN_EMAIL}
                    </p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      If {BOOTSTRAP_ADMIN_EMAIL} has not been created in Firebase Authentication yet, initialize it with the password entered above.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBootstrapAdminCreate}
                      disabled={loading}
                      className="w-full text-xs border-amber-300 bg-white hover:bg-amber-100 text-amber-900 font-semibold"
                    >
                      Initialize Primary Admin Account
                    </Button>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 text-center">
                  <p className="text-xs text-slate-500">
                    Need help accessing your account? Use{' '}
                    <Link to="/reset-password" className="text-blue-600 font-medium hover:underline">
                      Forgot Password
                    </Link>{' '}
                    or contact your Uppseekers administrator.
                  </p>
                </div>
              </>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
