import React, { useState } from 'react';
import {
  KeyRound,
  Shield,
  Eye,
  EyeOff,
  Copy,
  Check,
  Sparkles,
  Lock,
  AlertCircle,
  X,
  Mail,
  CheckCircle2,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface TargetUserForPassword {
  id: string;
  name: string;
  email: string;
  role?: string;
  type: 'student' | 'staff';
}

export type SavePasswordHandlerResult =
  | void
  | { ok?: boolean; mode?: 'direct' | 'reset_email'; error?: string };

interface ChangeUserPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: TargetUserForPassword | null;
  onSavePassword: (
    userId: string,
    userType: 'student' | 'staff',
    newPassword: string,
    currentPasswordForReauth?: string
  ) => Promise<SavePasswordHandlerResult> | SavePasswordHandlerResult;
  onSendResetEmail?: (email: string) => Promise<void> | void;
  isSelf?: boolean;
}

export default function ChangeUserPasswordModal({
  isOpen,
  onClose,
  targetUser,
  onSavePassword,
  onSendResetEmail,
  isSelf = false,
}: ChangeUserPasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [successMode, setSuccessMode] = useState<'direct' | 'reset_email'>('direct');
  const [triggeredByResetButton, setTriggeredByResetButton] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen || !targetUser) return null;

  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    const prefix = targetUser.type === 'student' ? 'Student' : 'Seeker';
    let randPart = '';
    for (let i = 0; i < 4; i++) {
      randPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const numPart = Math.floor(100 + Math.random() * 900);
    const generated = `${prefix}@${numPart}${randPart}`;
    setNewPassword(generated);
    setShowNewPassword(true);
    setValidationError(null);
  };

  const handleCopy = (text: string, fieldId: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSelf && !currentPassword.trim()) {
      setValidationError('Please enter your current password to verify your identity.');
      return;
    }
    if (!newPassword || newPassword.trim().length < 6) {
      setValidationError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);
      setValidationError(null);
      const res = await onSavePassword(
        targetUser.id,
        targetUser.type,
        newPassword.trim(),
        isSelf ? currentPassword : undefined
      );
      if (res && res.ok === false) {
        throw new Error(res.error || 'Failed to update password.');
      }
      const resolvedMode = (res && res.mode) || 'direct';
      setTriggeredByResetButton(false);
      setSuccessMode(resolvedMode);
      setSuccessMessage(
        resolvedMode === 'reset_email'
          ? `Typed password was NOT applied — Firebase Reset Link sent to ${targetUser.email} instead.`
          : `Password successfully updated for ${targetUser.name}!`
      );
    } catch (err: any) {
      setValidationError(err?.message || 'Failed to update password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispatchResetEmail = async () => {
    if (!onSendResetEmail) return;
    try {
      setIsSubmitting(true);
      setValidationError(null);
      await onSendResetEmail(targetUser.email);
      setTriggeredByResetButton(true);
      setSuccessMode('reset_email');
      setSuccessMessage(`Firebase password reset link sent to ${targetUser.email}.`);
    } catch (err: any) {
      setValidationError(err?.message || 'Could not send reset email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loginInstructions = `Hi ${targetUser.name},

Your UppSeekers portal password has been updated:
• Portal URL: ${window.location.origin}/login
• Email: ${targetUser.email}
• Password: ${newPassword}

Please log in and keep your credentials secure.`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-white">
                  {isSelf ? 'Change Your Password' : 'Reset User Password'}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Shield className="w-3 h-3" /> {isSelf ? 'Firebase Account' : 'Admin Password Reset'}
                </span>
              </div>
              <p className="text-xs text-slate-300">Managed via Firebase Authentication (no plaintext storage)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                {targetUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-900 truncate">{targetUser.name}</p>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-slate-200 text-slate-700">
                    {targetUser.type === 'student' ? 'Student' : targetUser.role || 'Staff'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 truncate mt-0.5">
                  <Mail className="w-3 h-3 shrink-0 text-slate-400" />
                  <span className="truncate">{targetUser.email}</span>
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-400 px-2 py-1 bg-white rounded border border-slate-200 shrink-0 ml-2">
              {targetUser.id}
            </span>
          </div>

          {successMessage ? (
            <div
              className={`p-4 border rounded-xl space-y-3 animate-in zoom-in-95 duration-200 ${
                successMode === 'reset_email' && !triggeredByResetButton
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              <div
                className={`flex items-center gap-2 font-bold text-sm ${
                  successMode === 'reset_email' && !triggeredByResetButton ? 'text-amber-900' : 'text-emerald-800'
                }`}
              >
                {successMode === 'reset_email' && !triggeredByResetButton ? (
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
                <span>{successMessage}</span>
              </div>

              {successMode === 'reset_email' ? (
                triggeredByResetButton ? (
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    The user has received a Firebase password reset link at <strong>{targetUser.email}</strong> to set their new password securely.
                  </p>
                ) : (
                  <div className="text-xs text-amber-800 leading-relaxed space-y-1.5">
                    <p>
                      <strong>{targetUser.email}</strong> already has a Firebase Authentication account. For security, Firebase does not allow overwriting an existing user&apos;s password directly without server Admin SDK credentials.
                    </p>
                    <p>
                      Instead, a <strong>Firebase password reset link</strong> has been emailed to <strong>{targetUser.email}</strong>. Ask the user to open that email (check Inbox &amp; Spam) and set their new password—it will work immediately on the login page.
                    </p>
                  </div>
                )
              ) : (
                <>
                  <p className="text-xs text-emerald-700">
                    The new password is now active in Firebase Authentication and works immediately across all browsers and devices—no email verification required.
                  </p>
                  <div className="p-3 bg-white rounded-lg border border-emerald-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Shareable Credentials</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(loginInstructions, 'instructions')}
                        className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      >
                        {copiedField === 'instructions' ? (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 mr-1" /> Copy Login Message
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="font-mono text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 whitespace-pre-line select-all">
                      {loginInstructions}
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end pt-2">
                <Button onClick={onClose} className="bg-slate-900 hover:bg-black text-white text-xs font-bold">
                  Done & Close
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              {isSelf && (
                <div>
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="Enter your current password"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                    New Password
                  </label>
                  {!isSelf && (
                    <button
                      type="button"
                      onClick={generateStrongPassword}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Generate Strong Password
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="Enter new password (min. 6 characters)"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-20"
                    autoFocus={!isSelf}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {newPassword && (
                      <button
                        type="button"
                        onClick={() => handleCopy(newPassword, 'new')}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100"
                        title="Copy password"
                      >
                        {copiedField === 'new' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100"
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {validationError && (
                  <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {validationError}
                  </p>
                )}
              </div>

              <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1 text-amber-800">
                  <Shield className="w-3.5 h-3.5 text-amber-600" />
                  {isSelf ? 'Firebase Identity Verification' : 'Firebase Authentication Update'}
                </p>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  {isSelf
                    ? 'Passwords are encrypted and stored solely inside Firebase Authentication. Your current password is required for security verification.'
                    : 'Updates the user password via Firebase Admin SDK if configured, or automatically dispatches a secure Firebase password reset email.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                {onSendResetEmail ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDispatchResetEmail}
                    disabled={isSubmitting}
                    className="text-xs font-semibold text-blue-700 border-blue-200 hover:bg-blue-50 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send Reset Email Instead
                  </Button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !newPassword.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm"
                  >
                    {isSubmitting ? 'Updating Password...' : 'Save New Password'}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
