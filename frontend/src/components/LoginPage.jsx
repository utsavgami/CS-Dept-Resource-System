import React, { useEffect, useRef, useState } from 'react';
import { api, setAuthToken, setStoredUser } from '../lib/apiClient';
import { LogIn, Mail, Lock, Sparkles, ShieldCheck, Loader2, Eye, EyeOff } from 'lucide-react';
import { animate, createScope, stagger } from 'animejs';

export const LoginPage = ({
  onSuccess,
  onSwitchToRegister,
  onSwitchToForgotPassword,
  onOpenDemoModal
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const rootRef = useRef(null);
  const scopeRef = useRef(null);
  const errorRef = useRef(null);
  const buttonRef = useRef(null);

  // Mount animation: card fades/scales in, the icon badge pops with a
  // spring, then each form field eases up in a staggered sequence.
  useEffect(() => {
    scopeRef.current = createScope({ root: rootRef }).add(() => {
      animate('.login-card', {
        opacity: [0, 1],
        translateY: [24, 0],
        scale: [0.97, 1],
        ease: 'outExpo',
        duration: 600
      });

      animate('.login-icon', {
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

    // Properly revert every anime.js instance declared in this scope when
    // the component unmounts (e.g. switching to the Register page).
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

    if (!email || !password) {
      setError('Please provide email and password');
      return;
    }

    try {
      setLoading(true);
      const res = await api.login({ email, password });
      setAuthToken(res.token);
      setStoredUser(res.user);
      onSuccess(res.user);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={rootRef} className="max-w-md mx-auto py-12">
      <div className="login-card bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="login-icon w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
            <LogIn className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            CS Portal Student Login
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sign in with your verified CS Department account
          </p>
        </div>

        {error && (
          <div
            ref={errorRef}
            className="p-3 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300 text-xs font-semibold border border-red-200 dark:border-red-800 leading-relaxed"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

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
                onChange={(e) => setEmail(e.target.value)}
                placeholder="enrollement@sgsits.ac.in"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="anime-field">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <button
                type="button"
                onClick={onSwitchToForgotPassword}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Forgot password?
              </button>
            </div>
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
          </div>

          <button
            ref={buttonRef}
            type="submit"
            disabled={loading}
            onMouseDown={handleButtonPress}
            className="anime-field w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In to CS Portal</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Don't have an account yet?{' '}
            <button
              onClick={onSwitchToRegister}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
            >
              Register Here
            </button>
          </p>

          {/* <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 space-y-2">
            <div className="flex items-center space-x-1.5 text-amber-800 dark:text-amber-300 font-bold text-xs">
              <Sparkles className="w-4 h-4" />
              <span>Instant Test Demo Access</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Skip registration and log in with 1-click using our pre-seeded CS student or Admin accounts.
            </p>
            <button
              onClick={onOpenDemoModal}
              className="w-full py-2 bg-amber-500 text-slate-950 font-extrabold text-xs rounded-lg hover:bg-amber-400 transition"
            >
              Open Instant Account Switcher
            </button>
          </div> */}
        </div>

      </div>
    </div>
  );
};