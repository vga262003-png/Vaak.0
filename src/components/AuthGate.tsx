import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Languages,
  Loader2,
  Lock,
  Phone,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import {
  ConfirmationResult,
  RecaptchaVerifier,
  User,
  createUserWithEmailAndPassword,
  getRedirectResult,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { upsertUserProfile } from '../utils/firebaseService';
import { AppLanguage, CountryOption, UserSession } from '../types/app';
import { COUNTRIES } from '../data/countries';
import { LANGUAGES_81 } from '../data/languages50';
import { getTranslation } from '../data/i18n';
import { SonicShieldLogo } from './SonicShieldLogo';
import { LanguageSelectorModal } from './LanguageSelectorModal';
import {
  generateBoundDeviceId,
  generateX25519KeyFingerprint,
} from '../utils/securityEngine';

export const USER_PREFS_STORAGE_KEY = 'vaak_user_prefs_v2';

interface AuthGateProps {
  language: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  onLoginSuccess: (session: UserSession) => void;
  onBackToOnboarding: () => void;
  onOpenGovVault: () => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  language,
  onLanguageChange,
  onLoginSuccess,
  onBackToOnboarding,
  onOpenGovVault,
}) => {
  const t = getTranslation(language);

  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(COUNTRIES[0]);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const [langModalOpen, setLangModalOpen] = useState(false);

  const [authTab, setAuthTab] = useState<'google' | 'phone' | 'email' | 'duress'>('google');
  const [customCallSign, setCustomCallSign] = useState('');
  const [duressPinInput, setDuressPinInput] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [offerRedirectFallback, setOfferRedirectFallback] = useState(false);
  const [providerNotEnabled, setProviderNotEnabled] = useState<'phone' | 'email' | null>(null);

  // Email Auth State
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [resetSentMsg, setResetSentMsg] = useState<string | null>(null);
  const [unverifiedUser, setUnverifiedUser] = useState<User | null>(null);
  const [verificationMsg, setVerificationMsg] = useState<string | null>(null);

  // Phone Auth State
  const [phoneNumberInput, setPhoneNumberInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const isEmbeddedIframe =
    typeof window !== 'undefined' &&
    (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();

  const mapAuthError = (err: unknown, provider: 'google' | 'phone' | 'email'): string => {
    const code = (err as { code?: string })?.code || '';
    const msg = err instanceof Error ? err.message : '';
    if (code === 'auth/operation-not-allowed' || msg.includes('auth/operation-not-allowed')) {
      if (provider === 'phone' || provider === 'email') {
        setProviderNotEnabled(provider);
      }
      return provider === 'phone'
        ? 'Phone OTP sign-in is not enabled in Firebase Console yet (auth/operation-not-allowed). Enable "Phone" under Firebase Console -> Authentication -> Sign-in method, OR use Google Sign-In right now.'
        : 'Email/Password sign-in is not enabled in Firebase Console yet (auth/operation-not-allowed). Enable "Email/Password" under Firebase Console -> Authentication -> Sign-in method, OR use Google Sign-In right now.';
    }
    if (code === 'auth/popup-closed-by-user') {
      setOfferRedirectFallback(true);
      return 'Google Sign-In popup was closed before finishing. Try again or tap "Use Redirect Sign-In" below.';
    }
    if (code === 'auth/popup-blocked') {
      setOfferRedirectFallback(true);
      return 'Popup was blocked by your browser. Tap "Use Redirect Sign-In" below or allow popups.';
    }
    if (code === 'auth/unauthorized-domain') {
      return `This domain (${window.location.hostname}) is not authorized in Firebase Console -> Authentication -> Settings -> Authorized domains.`;
    }
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Invalid email or password. If you first signed in with Google, please use the Google tab.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'This email is already registered. Switch to Sign In mode or use Forgot Password.';
    }
    if (code === 'auth/weak-password') {
      return 'Password must be at least 6 characters long.';
    }
    if (code === 'auth/invalid-phone-number') {
      return 'Please enter a valid phone number with country code.';
    }
    if (code === 'auth/invalid-verification-code') {
      return 'Incorrect 6-digit OTP code. Please check and try again.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Too many attempts. Please wait a moment before trying again.';
    }
    return msg || 'Authentication failed. Please try again.';
  };

  const completeFirebaseLogin = async (
    user: User,
    authMethod: 'google' | 'otp' | 'password',
    overridePhone?: string
  ) => {
    const phoneNum = user.phoneNumber || overridePhone || '';
    const resolvedEmail =
      user.email ||
      `${(phoneNum || user.uid).replace(/\D/g, '') || user.uid}@phone.vaak.mesh`;
    const resolvedIdentifier = user.email || phoneNum || user.uid;
    const rawPrefix = (
      user.displayName ||
      (user.email ? user.email.split('@')[0] : phoneNum.replace(/\D/g, '').slice(-6)) ||
      'USER'
    )
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 8);

    const callSign = (
      customCallSign.trim() ||
      (authMethod === 'otp'
        ? `VAAK-${selectedCountry.iso}-PH-${rawPrefix || user.uid.slice(0, 6).toUpperCase()}`
        : `VAAK-${selectedCountry.iso}-${rawPrefix || user.uid.slice(0, 6).toUpperCase()}`)
    )
      .toUpperCase()
      .slice(0, 40);

    const deviceId = generateBoundDeviceId(user.uid);
    const x25519Key = generateX25519KeyFingerprint(`${user.uid}:${deviceId}`);

    try {
      localStorage.setItem(
        USER_PREFS_STORAGE_KEY,
        JSON.stringify({ countryIso: selectedCountry.iso, callSign })
      );
    } catch {
      // Ignore storage errors
    }

    try {
      await upsertUserProfile({
        uid: user.uid,
        email: resolvedEmail,
        displayName: user.displayName || callSign,
        callSign,
        deviceId,
        x25519PublicKey: x25519Key,
        countryIso: selectedCountry.iso,
        photoURL: user.photoURL || undefined,
      });
    } catch (syncErr) {
      console.warn('Deferred profile sync after auth:', syncErr);
    }

    onLoginSuccess({
      uid: user.uid,
      email: resolvedEmail,
      displayName: user.displayName || callSign,
      photoURL: user.photoURL || undefined,
      identifier: resolvedIdentifier,
      callSign,
      deviceId,
      x25519PublicKey: x25519Key,
      country: selectedCountry,
      authMethod,
      isDuressMode: false,
      isSuspended: false,
      strikeCount: 0,
      duressPin: '',
    });
  };

  useEffect(() => {
    let active = true;
    getRedirectResult(auth)
      .then(async (result) => {
        if (!active || !result?.user) return;
        await completeFirebaseLogin(result.user, 'google');
      })
      .catch((err) => {
        if (!active) return;
        setErrorMsg(mapAuthError(err, 'google'));
      });
    return () => {
      active = false;
    };
  }, []);

  const boundDeviceId = useMemo(
    () => generateBoundDeviceId(customCallSign || selectedCountry.iso),
    [customCallSign, selectedCountry.iso]
  );

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.iso.toLowerCase().includes(q)
    );
  }, [countryQuery]);

  const handleGoogleSignIn = async () => {
    if (signingIn) return;
    setErrorMsg(null);
    setSigningIn(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const user = cred.user;
      if (!user || !user.email) {
        setErrorMsg('Google account email is required to verify your Vaak identity.');
        return;
      }
      await completeFirebaseLogin(user, 'google');
    } catch (err) {
      setErrorMsg(mapAuthError(err, 'google'));
    } finally {
      setSigningIn(false);
    }
  };

  const handleGoogleRedirectSignIn = async () => {
    setErrorMsg(null);
    setProviderNotEnabled(null);
    setSigningIn(true);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err) {
      setSigningIn(false);
      setErrorMsg(mapAuthError(err, 'google'));
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setProviderNotEnabled(null);
    const cleanedDigits = phoneNumberInput.replace(/\D/g, '');
    if (cleanedDigits.length < 8) {
      setErrorMsg('Please enter a valid phone number.');
      return;
    }
    setSigningIn(true);
    try {
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
      }
      const fullPhoneNumber = `${selectedCountry.code}${cleanedDigits}`;
      const confirmation = await signInWithPhoneNumber(auth, fullPhoneNumber, recaptchaVerifierRef.current);
      setConfirmationResult(confirmation);
      setOtpSent(true);
    } catch (err) {
      setErrorMsg(mapAuthError(err, 'phone'));
    } finally {
      setSigningIn(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!confirmationResult || otpInput.trim().length < 6) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }
    setSigningIn(true);
    try {
      const result = await confirmationResult.confirm(otpInput.trim());
      const user = result.user;
      if (!user) {
        setErrorMsg('Phone verification failed.');
        setSigningIn(false);
        return;
      }

      const phoneNum = user.phoneNumber || `${selectedCountry.code}${phoneNumberInput}`;
      await completeFirebaseLogin(user, 'otp', phoneNum);
    } catch (err) {
      setErrorMsg(mapAuthError(err, 'phone'));
    } finally {
      setSigningIn(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setResetSentMsg(null);
    setVerificationMsg(null);
    setUnverifiedUser(null);
    if (!emailInput.trim() || !passwordInput.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    setSigningIn(true);
    try {
      const userCred = isSignUp
        ? await createUserWithEmailAndPassword(auth, emailInput.trim(), passwordInput.trim())
        : await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput.trim());
      const user = userCred.user;
      if (!user) {
        setErrorMsg('Authentication failed.');
        return;
      }

      if (!user.emailVerified) {
        if (isSignUp) {
          try {
            await sendEmailVerification(user);
          } catch {
            // Ignore rate-limit error if link was just dispatched
          }
        }
        setUnverifiedUser(user);
        setVerificationMsg(
          `Verification link sent to ${user.email || emailInput.trim()}. Please open Gmail, click the verification link, and then tap "I've Verified — Continue" below (or use Google Sign-In for instant 1-click access).`
        );
        return;
      }

      await completeFirebaseLogin(user, 'password');
    } catch (err) {
      setErrorMsg(mapAuthError(err, 'email'));
    } finally {
      setSigningIn(false);
    }
  };

  const handleResendEmailVerification = async () => {
    const targetUser = unverifiedUser || auth.currentUser;
    if (!targetUser) return;
    setErrorMsg(null);
    setSigningIn(true);
    try {
      await sendEmailVerification(targetUser);
      setVerificationMsg(
        `Fresh verification link sent to ${targetUser.email || emailInput.trim()}. Check Inbox/Spam, click the link, then tap "I've Verified — Continue".`
      );
    } catch (err) {
      setErrorMsg(mapAuthError(err, 'email'));
    } finally {
      setSigningIn(false);
    }
  };

  const handleCheckEmailVerified = async () => {
    const targetUser = unverifiedUser || auth.currentUser;
    if (!targetUser) return;
    setErrorMsg(null);
    setSigningIn(true);
    try {
      await targetUser.reload();
      const refreshed = auth.currentUser || targetUser;
      if (refreshed.emailVerified) {
        setUnverifiedUser(null);
        setVerificationMsg(null);
        await completeFirebaseLogin(refreshed, 'password');
      } else {
        setErrorMsg('Email is not verified yet. Please click the verification link in your inbox first.');
      }
    } catch (err) {
      setErrorMsg(mapAuthError(err, 'email'));
    } finally {
      setSigningIn(false);
    }
  };

  const handleForgotPassword = async () => {
    setErrorMsg(null);
    setResetSentMsg(null);
    setProviderNotEnabled(null);
    if (!emailInput.trim()) {
      setErrorMsg('Please enter your email address above first to reset your password.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, emailInput.trim());
      setResetSentMsg(`Password reset email sent to ${emailInput.trim()}. Check your inbox.`);
    } catch (err) {
      setErrorMsg(mapAuthError(err, 'email'));
    }
  };

  const handleDuressUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (duressPinInput.trim().length !== 4) {
      setErrorMsg('Enter a 4-digit Duress PIN to engage decoy mode.');
      return;
    }
    const cleanCallSign = (
      customCallSign.trim() || `VAAK-${selectedCountry.iso}-DURESS`
    ).toUpperCase();
    const deviceId = generateBoundDeviceId(`DURESS:${cleanCallSign}`);

    onLoginSuccess({
      identifier: cleanCallSign,
      callSign: cleanCallSign,
      deviceId,
      x25519PublicKey: generateX25519KeyFingerprint(`${cleanCallSign}:${deviceId}`),
      country: selectedCountry,
      authMethod: 'duress',
      isDuressMode: true,
      isSuspended: false,
      strikeCount: 0,
      duressPin: duressPinInput.trim(),
    });
  };

  const activeLangMeta = LANGUAGES_81.find((l) => l.code === language);

  return (
    <div
      dir={t.dir}
      className="min-h-[100dvh] w-full max-w-full overflow-x-hidden box-border vaak-canvas flex flex-col justify-between px-3 py-4 sm:px-8 lg:px-12"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
      }}
    >
      {/* Top Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between pb-4 border-b border-white/8 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBackToOnboarding}
            className="min-h-[42px] min-w-[42px] rounded-xl bg-[#1B1E24] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer shrink-0"
            aria-label="Back to consent screen"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <SonicShieldLogo size={32} />
          <span className="font-display text-base sm:text-lg font-bold text-white truncate">
            Vaak / PingTalk
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setLangModalOpen(true)}
            className="min-h-[38px] px-2.5 rounded-xl bg-[#1B1E24] border border-white/10 text-xs font-semibold text-[#0EA5E9] hover:border-[#0EA5E9] flex items-center gap-1.5 cursor-pointer"
          >
            <Languages className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">
              {activeLangMeta?.native || '81 Languages'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenGovVault}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#0EA5E9] min-h-[38px] px-2.5 rounded-xl bg-[#1B1E24] border border-white/10 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">/gov-vault</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl w-full mx-auto my-auto py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Information Panel */}
        <section className="lg:col-span-5 min-w-0 space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#0EA5E9]">
              {selectedCountry.name} · Emergency Helpline {selectedCountry.emergencyNumber}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight text-balance leading-tight">
              {t.loginTitle}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Sign in securely with your verified Google account via Firebase Authentication. Your real contacts, pinned family, private PIN rooms, and encrypted messages are persisted in real time in Firebase Firestore.
            </p>
          </div>

          <div className="vaak-surface rounded-2xl p-4 sm:p-5 space-y-2 border border-emerald-500/30">
            <h2 className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Firebase Authenticated Sync</span>
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Zero sample or placeholder records. Every message, room, walkie transmission, and contact you create belongs strictly to your verified account.
            </p>
          </div>

          <div className="vaak-surface rounded-2xl p-4 sm:p-5 space-y-2 border border-white/10">
            <h2 className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Coercion &amp; Duress PIN Protection</span>
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              If under physical coercion, switch to Duress PIN to open a clean decoy screen without exposing your private workspace.
            </p>
          </div>
        </section>

        {/* Right Form Card */}
        <section className="lg:col-span-7 min-w-0 w-full vaak-surface rounded-2xl sm:rounded-3xl p-4 sm:p-7 space-y-5">
          {/* Mode Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-[#121418] border border-white/8 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setAuthTab('google');
                setErrorMsg(null);
                setResetSentMsg(null);
                setProviderNotEnabled(null);
              }}
              className={`min-h-[42px] px-1 rounded-xl transition-all cursor-pointer truncate ${
                authTab === 'google'
                  ? 'bg-[#0EA5E9] text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Google
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('phone');
                setErrorMsg(null);
                setResetSentMsg(null);
                setProviderNotEnabled(null);
              }}
              className={`min-h-[42px] px-1 rounded-xl transition-all cursor-pointer truncate ${
                authTab === 'phone'
                  ? 'bg-[#0EA5E9] text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Phone
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('email');
                setErrorMsg(null);
                setResetSentMsg(null);
                setProviderNotEnabled(null);
              }}
              className={`min-h-[42px] px-1 rounded-xl transition-all cursor-pointer truncate ${
                authTab === 'email'
                  ? 'bg-[#0EA5E9] text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('duress');
                setErrorMsg(null);
                setResetSentMsg(null);
                setProviderNotEnabled(null);
              }}
              className={`min-h-[42px] px-1 rounded-xl transition-all cursor-pointer truncate ${
                authTab === 'duress'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-amber-300 hover:text-amber-200'
              }`}
            >
              Duress
            </button>
          </div>

          {authTab === 'google' ? (
            <div className="space-y-4">
              {/* Region & Optional Call-Sign */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-semibold text-slate-300">Emergency Region</label>
                  <button
                    type="button"
                    onClick={() => setCountryDropdownOpen((prev) => !prev)}
                    className="w-full min-h-[46px] px-3 rounded-xl bg-[#121418] border border-white/10 flex items-center justify-between text-xs text-white hover:border-[#0EA5E9] cursor-pointer"
                  >
                    <span className="font-mono-tabular font-medium truncate">
                      {selectedCountry.iso} {selectedCountry.code} · {selectedCountry.name}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </button>

                  {countryDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 w-72 max-w-[90vw] z-50 rounded-2xl bg-[#1B1E24] border border-white/15 shadow-2xl p-2 space-y-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={countryQuery}
                          onChange={(e) => setCountryQuery(e.target.value)}
                          placeholder="Search countries..."
                          className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#121418] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto divide-y divide-white/6">
                        {filteredCountries.map((c) => (
                          <button
                            key={c.iso}
                            type="button"
                            onClick={() => {
                              setSelectedCountry(c);
                              setCountryDropdownOpen(false);
                              setCountryQuery('');
                            }}
                            className="w-full px-2.5 py-2 text-left flex items-center justify-between text-xs hover:bg-[#0EA5E9]/15 rounded-lg cursor-pointer"
                          >
                            <span className="text-white truncate">{c.name}</span>
                            <span className="font-mono-tabular text-[#0EA5E9] shrink-0">{c.code}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Call-Sign ID (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={40}
                    value={customCallSign}
                    onChange={(e) => setCustomCallSign(e.target.value.toUpperCase())}
                    placeholder="Auto-generated from Google profile"
                    className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#121418] border border-white/10 font-mono-tabular text-xs text-white placeholder:text-slate-500 uppercase focus:outline-none focus:border-[#0EA5E9]"
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-[#F43F5E] bg-rose-950/40 border border-rose-500/30 rounded-xl p-3 flex items-start gap-2 break-words">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="min-w-0 break-words">{errorMsg}</span>
                </p>
              )}

              <button
                type="button"
                disabled={signingIn}
                onClick={handleGoogleSignIn}
                className="w-full min-h-[52px] rounded-xl bg-white hover:bg-slate-100 disabled:opacity-60 text-slate-900 font-semibold text-sm px-5 cursor-pointer shadow-lg flex items-center justify-center gap-3 transition-colors"
              >
                {signingIn ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-[#0EA5E9]" />
                    <span>Signing in with Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              {(offerRedirectFallback || isEmbeddedIframe) && (
                <div className="space-y-2 rounded-xl bg-[#121418] border border-white/10 p-3">
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {isEmbeddedIframe
                      ? 'Preview frame detected: if the Google login popup closes automatically, open Vaak in a full browser tab to sign in smoothly.'
                      : 'Popup closed or blocked? Use Redirect Sign-In or open in a full browser tab.'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <a
                      href={typeof window !== 'undefined' ? window.location.href : '/'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[40px] rounded-xl bg-[#0EA5E9] hover:bg-sky-400 text-white font-semibold text-xs px-3 flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span>Open Full Browser Tab</span>
                    </a>
                    <button
                      type="button"
                      disabled={signingIn}
                      onClick={handleGoogleRedirectSignIn}
                      className="min-h-[40px] rounded-xl bg-[#1B1E24] hover:bg-[#232730] border border-[#0EA5E9]/40 text-sky-300 font-semibold text-xs px-3 cursor-pointer"
                    >
                      Use Redirect Sign-In
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-400 text-center">
                Protected by Firebase Authentication &amp; strict owner-only Firestore rules.
              </p>
            </div>
          ) : authTab === 'phone' ? (
            <div className="space-y-4">
              <div id="recaptcha-container" />
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Phone Number ({selectedCountry.code})</label>
                    <div className="flex gap-2">
                      <div className="px-3 min-h-[46px] rounded-xl bg-[#121418] border border-white/10 flex items-center font-mono-tabular text-xs text-sky-400 shrink-0">
                        {selectedCountry.code}
                      </div>
                      <input
                        type="tel"
                        required
                        value={phoneNumberInput}
                        onChange={(e) => setPhoneNumberInput(e.target.value)}
                        placeholder="9876543210"
                        className="flex-1 min-h-[46px] px-3.5 rounded-xl bg-[#121418] border border-white/10 font-mono-tabular text-sm text-white focus:outline-none focus:border-[#0EA5E9]"
                      />
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="text-xs text-[#F43F5E] bg-rose-950/40 border border-rose-500/30 rounded-xl p-3 space-y-2.5 break-words">
                      <p className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="min-w-0 break-words">{errorMsg}</span>
                      </p>
                      {providerNotEnabled === 'phone' && (
                        <button
                          type="button"
                          onClick={() => {
                            setAuthTab('google');
                            setErrorMsg(null);
                            setProviderNotEnabled(null);
                          }}
                          className="w-full min-h-[38px] px-3 rounded-lg bg-white text-slate-900 font-semibold text-xs cursor-pointer"
                        >
                          Switch to Google Sign-In (Active Now)
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={signingIn}
                    className="w-full min-h-[48px] rounded-xl bg-[#0EA5E9] hover:bg-sky-400 disabled:opacity-60 text-white font-semibold text-sm px-5 cursor-pointer shadow-lg flex items-center justify-center gap-2"
                  >
                    {signingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                    <span>Send SMS Verification Code</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Enter 6-Digit SMS Code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full min-h-[48px] px-4 rounded-xl bg-[#121418] border border-[#0EA5E9]/50 font-mono-tabular text-xl tracking-[0.5em] text-center text-white focus:outline-none focus:border-[#0EA5E9]"
                      autoFocus
                    />
                  </div>

                  {errorMsg && (
                    <p className="text-xs text-[#F43F5E] bg-rose-950/40 border border-rose-500/30 rounded-xl p-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="min-h-[48px] px-4 rounded-xl bg-[#1B1E24] hover:bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={signingIn}
                      className="flex-1 min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold text-sm px-5 cursor-pointer shadow-lg flex items-center justify-center gap-2"
                    >
                      {signingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      <span>Verify OTP &amp; Sign In</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : authTab === 'email' ? (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Email Address</label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#121418] border border-white/10 text-sm text-white focus:outline-none focus:border-[#0EA5E9]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs text-[#0EA5E9] hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#121418] border border-white/10 text-sm text-white focus:outline-none focus:border-[#0EA5E9]"
                />
              </div>

              {errorMsg && (
                <div className="text-xs text-[#F43F5E] bg-rose-950/40 border border-rose-500/30 rounded-xl p-3 space-y-2.5 break-words">
                  <p className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="min-w-0 break-words">{errorMsg}</span>
                  </p>
                  {providerNotEnabled === 'email' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('google');
                        setErrorMsg(null);
                        setProviderNotEnabled(null);
                      }}
                      className="w-full min-h-[38px] px-3 rounded-lg bg-white text-slate-900 font-semibold text-xs cursor-pointer"
                    >
                      Switch to Google Sign-In (Active Now)
                    </button>
                  )}
                </div>
              )}

              {resetSentMsg && (
                <p className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{resetSentMsg}</span>
                </p>
              )}

              {verificationMsg && (
                <div className="text-xs text-amber-200 bg-amber-950/40 border border-amber-500/30 rounded-xl p-3 space-y-2.5">
                  <p className="flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <span>{verificationMsg}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={signingIn}
                      onClick={handleCheckEmailVerified}
                      className="flex-1 min-h-[38px] px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>I&apos;ve Verified — Continue</span>
                    </button>
                    <button
                      type="button"
                      disabled={signingIn}
                      onClick={handleResendEmailVerification}
                      className="min-h-[38px] px-3 rounded-lg bg-[#1B1E24] hover:bg-slate-800 text-slate-200 font-semibold text-xs cursor-pointer"
                    >
                      Resend Link
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('google');
                        setErrorMsg(null);
                        setVerificationMsg(null);
                      }}
                      className="w-full min-h-[36px] px-3 rounded-lg bg-white text-slate-900 font-semibold text-xs cursor-pointer"
                    >
                      Use Google Sign-In Instead (Instant)
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={signingIn}
                className="w-full min-h-[48px] rounded-xl bg-[#0EA5E9] hover:bg-sky-400 disabled:opacity-60 text-white font-semibold text-sm px-5 cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                {signingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>{isSignUp ? 'Create Account & Sign In' : 'Sign In with Email'}</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp((v) => !v);
                    setErrorMsg(null);
                    setResetSentMsg(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleDuressUnlock} className="space-y-4">
              <div className="rounded-xl bg-rose-950/40 border border-rose-500/30 p-3.5 text-xs text-rose-200 space-y-1">
                <p className="font-bold">Silent Threat Coercion Mode</p>
                <p>
                  Enter any 4-digit Duress PIN to open the benign decoy screen immediately without unlocking encrypted user records.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">4-Digit Duress PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={duressPinInput}
                  onChange={(e) => setDuressPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full min-h-[48px] px-4 rounded-xl bg-[#121418] border border-rose-500/40 font-mono-tabular text-xl tracking-[0.5em] text-center text-white focus:outline-none focus:border-rose-400"
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-[#F43F5E] flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </p>
              )}

              <button
                type="submit"
                className="w-full min-h-[48px] rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm px-5 cursor-pointer"
              >
                Open Decoy Screen
              </button>
            </form>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto pt-4 border-t border-white/8 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>Region: {selectedCountry.name} ({selectedCountry.emergencyNumber})</span>
        <span className="font-mono-tabular text-[#0EA5E9]">
          Hardware Bound: {boundDeviceId} · Firebase Auth + Firestore
        </span>
      </footer>

      <LanguageSelectorModal
        isOpen={langModalOpen}
        currentLang={language}
        onSelectLanguage={onLanguageChange}
        onClose={() => setLangModalOpen(false)}
      />
    </div>
  );
};
