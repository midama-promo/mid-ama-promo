import React, { useEffect, useState } from 'react';
import { X, Mail, AlertCircle, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../common/Logo';

export type AuthTabMode = 'signin' | 'register' | 'create-password' | 'reset';

interface AuthModalProps {
  isOpen: boolean;
  initialTab?: AuthTabMode;
  initialEmail?: string;
  onClose: () => void;
  onSuccess: (loggedInUser?: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialTab = 'signin',
  initialEmail = '',
  onClose,
  onSuccess,
}) => {
  const { requestLoginOtp, verifyLoginOtp, registerArtist } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [realFirstName, setRealFirstName] = useState('');
  const [realSurname, setRealSurname] = useState('');
  const [artistName, setArtistName] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [cooldownExpiresAt, setCooldownExpiresAt] = useState<number>(() => {
    try {
      const stored = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('midama_otp_cooldown_expires') : null;
      const ts = stored ? Number(stored) : 0;
      return Number.isFinite(ts) && ts > Date.now() ? ts : 0;
    } catch (_) {
      return 0;
    }
  });
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setEmail(initialEmail || '');
    setRealFirstName('');
    setRealSurname('');
    setArtistName('');
    setCode('');
    setStep('email');
    setError(null);
    setSuccessNotice(null);
  }, [isOpen, initialEmail]);

  useEffect(() => {
    if (cooldownExpiresAt <= now) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [cooldownExpiresAt, now]);

  const cooldown = Math.max(0, Math.ceil((cooldownExpiresAt - now) / 1000));

  if (!isOpen) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!realFirstName.trim() || !realSurname.trim() || !artistName.trim() || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Enter your real first name, surname, artist name, and a valid email address.');
      return;
    }
    if (cooldown > 0) { setError(`Please wait ${cooldown} seconds before requesting another code.`); return; }
    try {
      setIsSubmitting(true); setError(null);
      const message = await registerArtist({ realFirstName: realFirstName.trim(), realSurname: realSurname.trim(), artistName: artistName.trim(), email: normalizedEmail });
      setStep('code'); setEmail(normalizedEmail); setSuccessNotice(message);
      const expiry = Date.now() + 60_000; setCooldownExpiresAt(expiry);
      try { sessionStorage.setItem('midama_otp_cooldown_expires', String(expiry)); } catch (_) {}
    } catch (err: any) { setError(err.message || 'Could not register your account.'); }
    finally { setIsSubmitting(false); }
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Please enter a valid registered email address.');
      return;
    }

    if (cooldown > 0) {
      setError(`Please wait ${cooldown} seconds before requesting another login code.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const message = await requestLoginOtp(normalizedEmail);
      setEmail(normalizedEmail);
      setStep('code');
      const expiry = Date.now() + 60_000;
      setCooldownExpiresAt(expiry);
      try {
        sessionStorage.setItem('midama_otp_cooldown_expires', String(expiry));
      } catch (_) {}
      setSuccessNotice(message);
    } catch (err: any) {
      setError(err.message || 'Could not send the login code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code from your email.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const loggedIn = await verifyLoginOtp(email.trim().toLowerCase(), code.trim());
      setSuccessNotice('Email verified. Opening your dashboard...');
      window.setTimeout(() => {
        onSuccess(loggedIn);
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'The code is invalid or has expired. Please request a new code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-in fade-in duration-200" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="relative w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-900 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6 space-y-1">
          <Logo size="sm" />
          <h2 className="text-xl sm:text-2xl font-bold text-white font-['Space_Grotesk'] pt-2">{initialTab === 'register' ? 'Artist Registration' : 'Secure Sign In'}</h2>
          <p className="text-xs text-neutral-400">
            {initialTab === 'register' ? 'Register with your real details and verify your email with a one-time code. No password is required.' : 'Sign in with a one-time code sent to your registered email. No password is required.'}
          </p>
        </div>

        <div className="mb-5 p-3.5 bg-neutral-900/80 border border-neutral-800 rounded-xl flex items-start gap-2.5 text-xs text-neutral-300">
          <ShieldCheck className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>Your code is single-use and expires automatically. Never share your login code with anyone.</span>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-950/40 border border-red-800/80 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {successNotice && (
          <div className="mb-5 p-3.5 bg-emerald-950/50 border border-emerald-800/80 rounded-xl flex items-start gap-2.5 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span>{successNotice}</span>
          </div>
        )}

        {step === 'email' ? (
          initialTab === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-neutral-300 mb-1.5">Real First Name</label><input required value={realFirstName} onChange={e=>setRealFirstName(e.target.value)} className="w-full bg-neutral-900/90 border border-neutral-800 rounded-xl px-3.5 py-3 text-xs text-white focus:outline-none focus:border-red-600" /></div>
                <div><label className="block text-xs font-semibold text-neutral-300 mb-1.5">Surname</label><input required value={realSurname} onChange={e=>setRealSurname(e.target.value)} className="w-full bg-neutral-900/90 border border-neutral-800 rounded-xl px-3.5 py-3 text-xs text-white focus:outline-none focus:border-red-600" /></div>
              </div>
              <div><label className="block text-xs font-semibold text-neutral-300 mb-1.5">Artist Name</label><input required value={artistName} onChange={e=>setArtistName(e.target.value)} placeholder="Your public artist name" className="w-full bg-neutral-900/90 border border-neutral-800 rounded-xl px-3.5 py-3 text-xs text-white focus:outline-none focus:border-red-600" /></div>
              <div><label className="block text-xs font-semibold text-neutral-300 mb-1.5">Email</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="w-full bg-neutral-900/90 border border-neutral-800 rounded-xl px-3.5 py-3 text-xs text-white focus:outline-none focus:border-red-600" /></div>
              <button type="submit" disabled={isSubmitting} className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2"><span>{isSubmitting ? 'Registering...' : 'Register & Send Code'}</span><ArrowRight className="w-4 h-4" /></button>
              <p className="text-[11px] text-neutral-500 text-center">Your real name is used for account records; your artist name is used for releases.</p>
            </form>
          ) : (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="artist@recordlabel.com"
                  className="w-full bg-neutral-900/90 border border-neutral-800 rounded-xl pl-10 pr-3.5 py-3 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600 transition-colors"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-red-950 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>{isSubmitting ? 'Sending Code...' : 'Send Code'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
          )
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">6-Digit Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="w-full bg-neutral-900/90 border border-neutral-800 rounded-xl px-4 py-4 text-center tracking-[0.45em] text-xl font-bold text-white placeholder-neutral-600 focus:outline-none focus:border-red-600 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || code.length !== 6}
              className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-red-950 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>{isSubmitting ? 'Verifying...' : 'Verify Code'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                type="button"
                onClick={() => { setStep('email'); setCode(''); setError(null); setSuccessNotice(null); }}
                className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                ← Back / Change Email
              </button>
              <button
                type="button"
                disabled={cooldown > 0 || isSubmitting}
                onClick={handleRequestCode as any}
                className="text-red-400 hover:text-red-300 disabled:text-neutral-600 disabled:cursor-not-allowed font-semibold transition-colors cursor-pointer"
              >
                {cooldown > 0 ? `Resend Code (${cooldown}s)` : 'Resend Code'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-neutral-900 text-center">
          <p className="text-[11px] text-neutral-500">Artists can register publicly; all access is verified by one-time email codes.</p>
        </div>
      </div>
    </div>
  );
};
