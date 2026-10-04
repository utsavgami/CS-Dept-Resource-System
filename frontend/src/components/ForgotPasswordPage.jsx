import React, { useEffect, useRef, useState } from 'react';
import { api } from '../lib/apiClient';
import { KeyRound, Mail, Lock, ShieldCheck, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { animate, createScope, stagger } from 'animejs';

// Must match the backend's COLLEGE_EMAIL_REGEX in api.js — format:
// 0801CSYYRRRR@sgsits.ac.in
const COLLEGE_EMAIL_REGEX = /^0801cs\d{2}\d{4}@sgsits\.ac\.in$/i;
const isValidCollegeEmail = (value) => COLLEGE_EMAIL_REGEX.test(String(value || '').trim());

export const ForgotPasswordPage = ({ onSuccess, onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const [otpMessageType, setOtpMessageType] = useState('success'); // 'success' | 'error'
  const [resendCooldown, setResendCooldown] = useState(0);

  const [resetLoading, setResetLoading] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [error, setError] = useState('');

  const rootRef = useRef(null);
  const scopeRef = useRef(null);
  const errorRef = useRef(null);
  const buttonRef = useRef(null);
  const otpBoxRef = useRef(null);
  const verifiedBadgeRef = useRef(null);
  const passwordStepRef = useRef(null);
  const successRef = useRef(null);

  // Mount animation: card fades/scales in, the icon badge pops with a
  // spring, then the email field eases up.
  useEffect(() => {
    scopeRef.current = createScope({ root: rootRef }).add(() => {
      animate('.forgot-card', {
        opacity: [0, 1],
        translateY: [24, 0],
        scale: [0.97, 1],
        ease: 'outExpo',
        duration: 600
      });

      animate('.forgot-icon', {
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
        delay: stagger(90, { start: 320 })
      });
    });

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

  // Pop the "Verified" badge, then slide the new-password step in.
  useEffect(() => {
    if (otpVerified && verifiedBadgeRef.current) {
      animate(verifiedBadgeRef.current, {
        opacity: [0, 1],
        scale: [0.6, 1.08, 1],
        ease: 'outElastic(1, .6)',
        duration: 600
      });
    }
    if (otpVerified && passwordStepRef.current) {
      animate(passwordStepRef.current, {
        opacity: [0, 1],
        translateY: [16, 0],
        ease: 'outQuad',
        duration: 450,
        delay: 150
      });
    }
  }, [otpVerified]);

  // Pop the success message in once the password has been reset.
  useEffect(() => {
    if (resetDone && successRef.current) {
      animate(successRef.current, {
        opacity: [0, 1],
        scale: [0.7, 1.05, 1],
        ease: 'outElastic(1, .6)',
        duration: 600
      });
    }
  }, [resetDone]);

  // 1-second countdown for the "Resend OTP" cooldown.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Editing the email after an OTP was sent/verified invalidates it.
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
    setError('');
    setOtpMessage('');
    if (!isValidCollegeEmail(email)) {
      setOtpMessage('Enter a valid college email first (format: 0801CSYYRRRR@sgsits.ac.in).');
      setOtpMessageType('error');
      return;
    }
    try {
      setOtpSending(true);
      const res = await api.forgotPasswordSendOtp({ email: email.trim().toLowerCase() });
      setOtpSent(true);
      setOtpCode('');
      setOtpMessage(res.message || 'OTP sent to your email.');
      setOtpMessageType('success');
      setResendCooldown(30);
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
      const res = await api.forgotPasswordVerifyOtp({ email: email.trim().toLowerCase(), otp: otpCode });
      setOtpVerified(true);
      setOtpMessage(res.message || 'OTP verified!');
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

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!otpVerified) {
      setError('Please verify your email with the OTP first.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setResetLoading(true);
      await api.resetPassword({
        email: email.trim().toLowerCase(),
        newPassword
      });
      setResetDone(true);
      setTimeout(() => {
        onSuccess();
      }, 1800);
    } catch (err) {
      setError(err.message || 'Could not reset password');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div ref={rootRef} className="max-w-md mx-auto py-12">
      <div className="forgot-card bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="forgot-icon w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            Reset Your Password
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Verify your college email with an OTP, then set a new password
          </p>
        </div>

        {resetDone ? (
          <div ref={successRef} className="text-center space-y-3 py-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              Password reset successfully!
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Redirecting you to Sign In...
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div
                ref={errorRef}
                className="p-3 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300 text-xs font-semibold border border-red-200 dark:border-red-800 leading-relaxed"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">

              {/* Step 1: College Email + OTP */}
              <div className="anime-field">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  College Email (@sgsits.ac.in)
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

              {/* Step 2: New Password — only shown/usable once OTP is verified */}
              {otpVerified && (
                <div ref={passwordStepRef} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">At least 6 characters</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    ref={buttonRef}
                    type="submit"
                    disabled={resetLoading}
                    onMouseDown={handleButtonPress}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {resetLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Resetting...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Reset Password</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
              <button
                onClick={onSwitchToLogin}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};