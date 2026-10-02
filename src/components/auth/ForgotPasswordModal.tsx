import React, { useState } from 'react';
import { X, Mail, Lock, KeyRound, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import { Logo } from '../common/Logo';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSignIn: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onOpenSignIn,
}) => {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your account email.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await api.forgotPassword(email.trim());
      setSuccessMsg(res.message);
      if (res.demoToken) {
        setToken(res.demoToken);
      }
      setStep('reset');
    } catch (err: any) {
      setError(err.message || 'Failed to process password reset request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !password) {
      setError('Please provide the reset code and new password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await api.resetPassword({
        token: token.trim(),
        password,
        confirmPassword,
      });
      setSuccessMsg(res.message);
      setTimeout(() => {
        onClose();
        onOpenSignIn();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired reset token.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-6 sm:p-8 overflow-hidden">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6 space-y-1">
          <Logo size="sm" />
          <h2 className="text-xl font-bold text-white font-['Space_Grotesk'] pt-2">
            Reset Portal Password
          </h2>
          <p className="text-xs text-neutral-400">
            {step === 'request'
              ? 'Enter your registered client email to receive a password reset token.'
              : 'Enter the reset token sent to your email along with your new password.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-800/80 rounded-xl flex items-start gap-2.5 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-xl flex items-start gap-2.5 text-xs text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Client Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="artist@midamapromo.com"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-red-950 flex items-center justify-center gap-2 mt-2"
            >
              <span>{isSubmitting ? 'Sending Request...' : 'Send Reset Instructions'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setStep('reset')}
                className="text-xs text-neutral-400 hover:text-white"
              >
                Already have a reset token? Enter it here
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Reset Token / Code
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste reset token here..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600 transition-colors font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-red-950 flex items-center justify-center gap-2 mt-2"
            >
              <span>{isSubmitting ? 'Updating...' : 'Set New Password & Sign In'}</span>
            </button>
          </form>
        )}

        <div className="mt-4 pt-4 border-t border-neutral-900 text-center">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSignIn();
            }}
            className="text-xs text-neutral-400 hover:text-white"
          >
            ← Return to Sign In
          </button>
        </div>

      </div>
    </div>
  );
};
