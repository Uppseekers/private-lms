import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Key,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react';
import { auth, getFirebaseIdToken } from '@/lib/firebase';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
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
  const [currentPassword, setCurrentPassword] = useState('');
  const [needsCurrentPassword, setNeedsCurrentPassword] = useState(false);
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
    setNeedsCurrentPassword(false);
    setError('');
    setSuccessMsg('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleDirectChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanNew = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (cleanNew.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (cleanNew !== cleanConfirm) {
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
      // 1. Primary path: server-verified direct password update (updates Firebase Auth + syncs student credential vault, no email sent)
      const idToken = await getFirebaseIdToken();
      if (idToken) {
        const res = await fetch('/api/auth/self-change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            newPassword: cleanNew,
            currentPassword: currentPassword.trim() || undefined,
          }),
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.ok) {
          setSuccessMsg('Your password has been updated directly in Firebase Authentication!');
          setTimeout(() => {
            handleClose();
          }, 1400);
          return;
        }
        if (json?.requiresRecentLogin) {
          setNeedsCurrentPassword(true);
          setError('For your security, please enter your current password to confirm this change.');
          return;
        }
        if (res.status === 400 && json?.error) {
          setError(json.error);
          return;
        }
      }

      // 2. Client SDK fallback
      if (currentPassword.trim()) {
        const cred = EmailAuthProvider.credential(fbUser.email, currentPassword.trim());
        await reauthenticateWithCredential(fbUser, cred);
      }
      await updatePassword(fbUser, cleanNew);
      setSuccessMsg('Your password has been updated directly in Firebase Authentication!');
      setTimeout(() => {
        handleClose();
      }, 1400);
    } catch (err: any) {
      if (err?.code === 'auth/requires-recent-login') {
        setNeedsCurrentPassword(true);
        setError('Please enter your current password to verify your identity.');
      } else if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
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

          <form onSubmit={handleDirectChange} className="space-y-3.5">
            {needsCurrentPassword && (
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
            )}

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

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Updates your password immediately inside Firebase Authentication without sending any verification emails.
              </span>
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
        </div>
      </div>
    </div>
  );
}
