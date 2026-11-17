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
} from 'lucide-react';
import { auth, normalizeEmail } from '@/lib/firebase';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  sendPasswordResetEmail,
} from 'firebase/auth';

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
  const [activeTab, setActiveTab] = useState<'direct' | 'email'>('direct');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (userEmail) {
      setEmail(userEmail);
    }
  }, [userEmail]);

  if (!isOpen) return null;

  const resetForm = () => {
    setNewPassword('');
    setConfirmPassword('');
    setCurrentPassword('');
    setError('');
    setSuccessMsg('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTriggerResetEmail = async () => {
    const cleanEmail = normalizeEmail(email || auth.currentUser?.email);
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await sendPasswordResetEmail(auth, cleanEmail, {
        url: `${window.location.origin}/login`,
      });
      setSuccessMsg(`A password reset link has been sent to ${cleanEmail} via Firebase Authentication.`);
    } catch (err: any) {
      setError(err?.message || 'Error sending password reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!currentPassword) {
      setError('Please enter your current password to verify your identity.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    const fbUser = auth.currentUser;
    if (!fbUser || !fbUser.email) {
      setError('No active Firebase session found. Please sign in again.');
      return;
    }

    setLoading(true);
    try {
      const cred = EmailAuthProvider.credential(fbUser.email, currentPassword);
      await reauthenticateWithCredential(fbUser, cred);
      await updatePassword(fbUser, newPassword);
      setSuccessMsg('Your password has been updated successfully!');
      setTimeout(() => {
        handleClose();
      }, 1400);
    } catch (err: any) {
      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        setError('Your current password is incorrect.');
      } else {
        setError(err?.message || 'Error updating password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-snug">Change Password</h3>
              <p className="text-xs text-slate-400">
                {userName ? `${userName} • ` : ''}{email || auth.currentUser?.email || 'User Account'}
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

        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-medium">
          <button
            type="button"
            onClick={() => { setActiveTab('direct'); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2.5 px-4 text-center border-b-2 flex items-center justify-center gap-1.5 transition ${
              activeTab === 'direct'
                ? 'border-blue-600 text-blue-600 bg-white font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Update Password Now
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('email'); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2.5 px-4 text-center border-b-2 flex items-center justify-center gap-1.5 transition ${
              activeTab === 'email'
                ? 'border-blue-600 text-blue-600 bg-white font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Send Reset Email
          </button>
        </div>

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
              <p className="font-medium">{successMsg}</p>
            </div>
          )}

          {activeTab === 'direct' ? (
            <form onSubmit={handleDirectChange} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Current Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <Button type="button" variant="outline" onClick={handleClose} className="text-xs">
                  Cancel
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
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5">
                <p className="text-xs text-blue-900 leading-relaxed font-medium">
                  Forgot your current password? Send a secure Firebase password reset link to{' '}
                  <strong>{email || auth.currentUser?.email}</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Account Email Address
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
                onClick={handleTriggerResetEmail}
                disabled={loading || !email}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {loading ? 'Sending Reset Email...' : 'Send Password Reset Email'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
