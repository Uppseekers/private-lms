import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Key, 
  Mail, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Eye, 
  EyeOff, 
  Lock,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userName?: string;
}

export default function ChangePasswordModal({
  isOpen,
  onClose,
  userEmail = '',
  userName = '',
}: ChangePasswordModalProps) {
  const [email, setEmail] = useState(userEmail);
  const [activeTab, setActiveTab] = useState<'email' | 'direct'>('email');
  
  // Email-triggered flow state
  const [emailSent, setEmailSent] = useState(false);
  const [code, setCode] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Direct change flow state
  const [currentPassword, setCurrentPassword] = useState('');
  
  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (userEmail) {
      setEmail(userEmail);
    }
  }, [userEmail]);

  if (!isOpen) return null;

  const resetForm = () => {
    setEmailSent(false);
    setCode('');
    setToken('');
    setNewPassword('');
    setConfirmPassword('');
    setCurrentPassword('');
    setError('');
    setSuccessMsg('');
    setPreviewUrl(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Sync password with Firestore document
  const syncWithFirestore = async (targetEmail: string, pass: string) => {
    try {
      const cleanEmail = targetEmail.trim().toLowerCase();
      // Update in students
      const stuSnap = await getDocs(collection(db, 'students'));
      for (const d of stuSnap.docs) {
        const data = d.data();
        if (data.email && data.email.trim().toLowerCase() === cleanEmail) {
          await updateDoc(doc(db, 'students', d.id), { password: pass });
        }
      }
      // Update in staff
      const staffSnap = await getDocs(collection(db, 'staff'));
      for (const d of staffSnap.docs) {
        const data = d.data();
        if (data.email && data.email.trim().toLowerCase() === cleanEmail) {
          await updateDoc(doc(db, 'staff', d.id), { password: pass });
        }
      }
    } catch (e) {
      console.warn('Firestore password sync:', e);
    }
  };

  // Trigger password reset email
  const handleTriggerEmail = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');
    setPreviewUrl(null);

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

      setEmailSent(true);
      if (data.token) setToken(data.token);
      if (data.code) setCode(data.code);
      if (data.previewUrl) setPreviewUrl(data.previewUrl);

      setSuccessMsg(`Password reset email triggered to ${cleanEmail}! Enter the verification code below.`);
    } catch (err: any) {
      setError(err.message || 'Error triggering reset email');
    } finally {
      setLoading(false);
    }
  };

  // Complete password reset with code
  const handleCompleteReset = async (e: React.FormEvent) => {
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
        throw new Error(data.error || 'Failed to update password');
      }

      await syncWithFirestore(cleanEmail, newPassword);

      setSuccessMsg('Your password has been successfully updated!');
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error completing reset');
    } finally {
      setLoading(false);
    }
  };

  // Direct change password handler
  const handleDirectChange = async (e: React.FormEvent) => {
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
    setLoading(true);

    try {
      // Check admin or direct endpoint
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || 'custom_user'}`
        },
        body: JSON.stringify({
          email: cleanEmail,
          newPassword,
        })
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to change password');
      }

      await syncWithFirestore(cleanEmail, newPassword);
      setSuccessMsg('Password successfully changed!');
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error changing password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-snug">Change Password</h3>
              <p className="text-xs text-slate-400">
                {userName ? `${userName} • ` : ''}{email || 'User Account'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-medium">
          <button
            type="button"
            onClick={() => { setActiveTab('email'); setError(''); }}
            className={`flex-1 py-2.5 px-4 text-center border-b-2 flex items-center justify-center gap-1.5 transition ${
              activeTab === 'email'
                ? 'border-blue-600 text-blue-600 bg-white font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Email Verification Flow (Recommended)
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('direct'); setError(''); }}
            className={`flex-1 py-2.5 px-4 text-center border-b-2 flex items-center justify-center gap-1.5 transition ${
              activeTab === 'direct'
                ? 'border-blue-600 text-blue-600 bg-white font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Direct Password Change
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-100 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 text-emerald-700 text-xs p-3 rounded-lg border border-emerald-100 flex items-start gap-2">
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

          {/* Tab 1: Email Triggered Reset Flow */}
          {activeTab === 'email' && (
            <div className="space-y-4">
              <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5">
                <p className="text-xs text-blue-900 leading-relaxed font-medium">
                  We will trigger an email to your user email ID (<strong>{email}</strong>) with a secure reset link and a 6-digit OTP verification code.
                </p>
              </div>

              {!emailSent ? (
                <div className="space-y-4 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      User Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handleTriggerEmail}
                    disabled={loading || !email}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {loading ? 'Triggering Email...' : 'Trigger Password Reset Email'}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleCompleteReset} className="space-y-3.5 pt-1">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-700">
                        6-Digit Verification Code
                      </label>
                      <button
                        type="button"
                        onClick={handleTriggerEmail}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Resend email?
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 481920"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm tracking-widest font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
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
                    <label className="block text-xs font-medium text-slate-700 mb-1">
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

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEmailSent(false)}
                      className="text-xs"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-4"
                    >
                      {loading ? 'Updating Password...' : 'Save New Password'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Tab 2: Direct Change Password Flow */}
          {activeTab === 'direct' && (
            <form onSubmit={handleDirectChange} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  User Account Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
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
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-4"
                >
                  {loading ? 'Changing Password...' : 'Update Password Directly'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
