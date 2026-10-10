import React, { useEffect, useRef, useState } from 'react';
import { api, setAuthToken, setStoredUser } from '../lib/apiClient';
import { Avatar } from './Avatar';
import { UserPlus, Mail, Lock, User as UserIcon, Phone, FileText, Upload, Loader2, AlertTriangle, CheckCircle2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { animate, createScope, stagger } from 'animejs';

// Must match the backend's COLLEGE_EMAIL_REGEX in api.js — format:
// 0801CSYYRRRR@sgsits.ac.in
const COLLEGE_EMAIL_REGEX = /^0801cs\d{2}\d{4}@sgsits\.ac\.in$/i;
const isValidCollegeEmail = (value) => COLLEGE_EMAIL_REGEX.test(String(value || '').trim());

export const RegisterPage = ({
  onSuccess,
  onSwitchToLogin,

}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [enrollmentNumber, setEnrollmentNumber] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [semester, setSemester] = useState('4th Semester');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarWarning, setAvatarWarning] = useState('');

  // Email OTP verification (required before the account can be created)
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const [otpMessageType, setOtpMessageType] = useState('success'); // 'success' | 'error'
  const [resendCooldown, setResendCooldown] = useState(0);

  const rootRef = useRef(null);
  const scopeRef = useRef(null);
  const errorRef = useRef(null);
  const buttonRef = useRef(null);
  const avatarWrapRef = useRef(null);
  const otpBoxRef = useRef(null);
  const verifiedBadgeRef = useRef(null);

  // Mount animation: card fades/scales in, the icon badge pops with a
  // spring, then each form field eases up in a staggered sequence.
  useEffect(() => {
    scopeRef.current = createScope({ root: rootRef }).add(() => {
      animate('.register-card', {
        opacity: [0, 1],
        translateY: [24, 0],
        scale: [0.97, 1],
        ease: 'outExpo',
        duration: 600
      });

      animate('.register-icon', {
        opacity: [0, 1],
        scale: [0.4, 1.08, 1],
        rotate: [-12, 2, 0],
        ease: 'outElastic(1, .6)',
        duration: 900,
        delay: 150
      });

      animate('.anime-field', {
        opacity: [0, 1],
        translateY: [16, 0],
        ease: 'outQuad',
        duration: 500,
        delay: stagger(70, { start: 300 })
      });
    });

    // Properly revert every anime.js instance declared in this scope when
    // the component unmounts (e.g. switching back to the Login page).
    return () => scopeRef.current.revert();
  }, []);

  // Shake the error banner every time a new error message comes in.
  useEffect(() => {
    if (error && errorRef.current) {
      animate(errorRef.current, {
        opacity: [0, 1],
        translateX: [0, -8, 7, -6, 4, -2, 0],
        ease: 'outQuad',
        duration: 500
      });
    }
  }, [error]);

  // Pop the avatar circle whenever a new photo is picked.
  useEffect(() => {
    if (avatarPreview && avatarWrapRef.current) {
      animate(avatarWrapRef.current, {
        scale: [0.6, 1.1, 1],
        opacity: [0.4, 1],
        ease: 'outElastic(1, .6)',
        duration: 700
      });
    }
  }, [avatarPreview]);

  // Build/revoke a local preview URL whenever a new photo is picked, so we
  // don't leak object URLs across re-renders.
  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  // Pop the OTP input row in when it first appears.
  useEffect(() => {
    if (otpSent && !otpVerified && otpBoxRef.current) {
      animate(otpBoxRef.current, {
        opacity: [0, 1],
        translateY: [-8, 0],
        ease: 'outQuad',
        duration: 350
      });
    }
  }, [otpSent, otpVerified]);

  // Pop the "Email Verified" badge in once verification succeeds.
  useEffect(() => {
    if (otpVerified && verifiedBadgeRef.current) {
      animate(verifiedBadgeRef.current, {
        opacity: [0, 1],
        scale: [0.6, 1.08, 1],
        ease: 'outElastic(1, .6)',
        duration: 600
      });
    }
  }, [otpVerified]);

  // 1-second countdown for the "Resend OTP" cooldown.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleAvatarChange = (file) => {
    setAvatarWarning('');
    if (!file) {
      setAvatarFile(null);
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setAvatarWarning('Please choose a JPG, PNG, WEBP, or GIF image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarWarning('Image must be under 5 MB.');
      return;
    }
    setAvatarFile(file);
  };

  // Editing the email after an OTP was sent/verified invalidates it — the
  // user must verify the new address before they can register with it.
  const handleEmailChange = (value) => {
    setEmail(value);
    if (otpSent || otpVerified) {
      setOtpSent(false);
      setOtpVerified(false);
      setOtpCode('');
      setOtpMessage('');
    }
  };

  const handleSendOtp = async () => {
    setOtpMessage('');
    if (!isValidCollegeEmail(email)) {
      setOtpMessage('Enter a valid college email first (format: 0801CSYYRRRR@sgsits.ac.in).');
      setOtpMessageType('error');
      return;
    }
    try {
      setOtpSending(true);
      const res = await api.sendOtp({ email: email.trim().toLowerCase() });
      setOtpSent(true);
      setOtpCode('');
      setOtpMessage(res.message || 'OTP sent to your email.');
      setOtpMessageType('success');
      setResendCooldown(60); // matches the OTP's 1-minute validity
    } catch (err) {
      setOtpMessage(err.message || 'Could not send OTP');
      setOtpMessageType('error');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpMessage('');
    try {
      setOtpVerifying(true);
      const res = await api.verifyOtp({ email: email.trim().toLowerCase(), otp: otpCode });
      setOtpVerified(true);
      setOtpMessage(res.message || 'Email verified!');
      setOtpMessageType('success');
    } catch (err) {
      setOtpMessage(err.message || 'Invalid OTP');
      setOtpMessageType('error');
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleButtonPress = () => {
    if (buttonRef.current) {
      animate(buttonRef.current, {
        scale: [1, 0.95, 1],
        ease: 'outQuad',
        duration: 300
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !enrollmentNumber || !mobileNumber || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (!otpVerified) {
      setError('Please verify your email with the OTP before registering.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.register({
        name,
        email,
        enrollmentNumber,
        mobileNumber,
        password,
        semester,
        department: 'Computer Science & Engineering'
      });

      setAuthToken(res.token);

      let finalUser = res.user;
      if (avatarFile) {
        try {
          const uploadRes = await api.uploadProfileImage(avatarFile);
          finalUser = uploadRes.user;
        } catch (uploadErr) {
          // Don't block account creation over a photo upload hiccup —
          // the account already exists and can add a photo later from
          // the profile page.
          setAvatarWarning('Account created, but the photo upload failed. You can add it later from your profile.');
        }
      }

      setStoredUser(finalUser);
      onSuccess(finalUser);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={rootRef} className="max-w-lg mx-auto py-8">
      <div className="register-card bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="register-icon w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
            <UserPlus className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            CS Student Registration
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create your account to start listing, renting, and sharing CS resources
          </p>
        </div>

        {error && (
          <div
            ref={errorRef}
            className="p-3 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300 text-xs font-semibold border border-red-200 dark:border-red-800"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Profile Photo (optional) */}
          <div className="anime-field flex items-center gap-4 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 transition-colors duration-200 hover:border-blue-300 dark:hover:border-blue-700">
            <div ref={avatarWrapRef}>
              <Avatar src={avatarPreview} name={name} size="w-14 h-14" textSize="text-base" />
            </div>
            <div className="flex-1">
              <label className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold cursor-pointer transition hover:bg-blue-100 dark:hover:bg-blue-900/50`}>
                <Upload className="w-3.5 h-3.5" />
                <span>{avatarFile ? 'Change photo' : 'Add profile photo'}</span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) => handleAvatarChange(event.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              <p className="mt-1 text-[10px] text-slate-400">Optional — JPG, PNG, WEBP or GIF · max 5 MB</p>
              {avatarWarning && (
                <p className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>{avatarWarning}</span>
                </p>
              )}
            </div>
          </div>

          {/* Full Name */}
          <div className="anime-field">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Full Name *
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="User Full Name"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* College Email + OTP Verification */}
          <div className="anime-field">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              College Email (@sgsits.ac.in) *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                disabled={otpVerified}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="enrollement@sgsits.ac.in"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-60"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Must be a valid student email address for CS department verification
            </p>

            {/* Send / Resend OTP, or the verified badge */}
            <div className="mt-2">
              {otpVerified ? (
                <span
                  ref={verifiedBadgeRef}
                  className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Email Verified</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpSending || resendCooldown > 0 || !isValidCollegeEmail(email)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold transition hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>
                    {otpSending
                      ? 'Sending...'
                      : resendCooldown > 0
                        ? `Resend OTP in ${resendCooldown}s`
                        : otpSent
                          ? 'Resend OTP'
                          : 'Send OTP'}
                  </span>
                </button>
              )}
            </div>

            {/* OTP entry — shown after a code has been sent and before it's verified */}
            {otpSent && !otpVerified && (
              <div ref={otpBoxRef} className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit OTP"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs tracking-widest focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={otpVerifying || otpCode.length !== 6}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {otpVerifying ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            )}

            {otpMessage && (
              <p
                className={`mt-1.5 text-[11px] font-semibold ${
                  otpMessageType === 'error'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {otpMessage}
              </p>
            )}
          </div>

          {/* Enrollment Number & Mobile */}
          <div className="anime-field grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Enrollment No. *
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={enrollmentNumber}
                  onChange={(e) => setEnrollmentNumber(e.target.value)}
                  placeholder="Full Enrollment Number"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mobile Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="+91-9876543210"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Semester & Password */}
          <div className="anime-field grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Current Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="1st Semester">1st Semester</option>
                <option value="2nd Semester">2nd Semester</option>
                <option value="3rd Semester">3rd Semester</option>
                <option value="4th Semester">4th Semester</option>
                <option value="5th Semester">5th Semester</option>
                <option value="6th Semester">6th Semester</option>
                <option value="7th Semester">7th Semester</option>
                <option value="8th Semester">8th Semester</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">At least 8 characters, with a letter and a number</p>
            </div>
          </div>

          <button
            ref={buttonRef}
            type="submit"
            disabled={loading || !otpVerified}
            title={!otpVerified ? 'Verify your email with the OTP first' : undefined}
            onMouseDown={handleButtonPress}
            className="anime-field w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating account…</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>{otpVerified ? 'Register CS Student Account' : 'Verify Email to Continue'}</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Already registered?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
            >
              Sign In
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};