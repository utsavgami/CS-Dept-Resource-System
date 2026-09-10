import React, { useState } from 'react';
import { api, setAuthToken, setStoredUser } from '../lib/apiClient';
import { LogIn, Mail, Lock, Sparkles, ShieldCheck } from 'lucide-react';

export const LoginPage = ({
  onSuccess,
  onSwitchToRegister,
  onOpenDemoModal
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    <div className="max-w-md mx-auto py-12 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
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
          <div className="p-3 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300 text-xs font-semibold border border-red-200 dark:border-red-800 leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              College Email (@cs.edu)
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex.chen@cs.edu or admin@cs.edu"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? <span>Authenticating...</span> : (
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

          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 space-y-2">
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
          </div>
        </div>

      </div>
    </div>
  );
};
