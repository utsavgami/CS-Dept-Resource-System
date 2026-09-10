import React from 'react';
import { api, setAuthToken, setStoredUser } from '../lib/apiClient';
import { Sparkles, ShieldAlert, CheckCircle2, UserCheck, X } from 'lucide-react';

export const QuickDemoLoginModal = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  if (!isOpen) return null;

  const handleDemoLogin = async (email) => {
    try {
      const res = await api.login({ email, password: 'student123' });
      setAuthToken(res.token);
      setStoredUser(res.user);
      onLoginSuccess(res.user);
      onClose();
    } catch (err) {
      alert(err.message || 'Demo login failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
              Instant Demo Account Switcher
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select a pre-configured role to test all student & admin workflows
            </p>
          </div>
        </div>

        <div className="space-y-3 my-4">

          {/* Admin Account */}
          {/* <div
            onClick={() => handleDemoLogin('admin@cs.edu')}
            className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-100/60 dark:hover:bg-purple-900/40 cursor-pointer transition flex items-center justify-between group"
          >
            <div className="flex items-center space-x-3">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"
                alt="Admin"
                className="w-10 h-10 rounded-full object-cover border border-purple-300"
              />
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-bold text-purple-900 dark:text-purple-200">
                    Dr. Alan Turing
                  </h4>
                  <span className="text-[10px] font-bold bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-full">
                    CS Admin
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage users, resolve complaints, block accounts, delete fake listings
                </p>
              </div>
            </div>
            <UserCheck className="w-5 h-5 text-purple-600 opacity-0 group-hover:opacity-100 transition" />
          </div> */}

          {/* Top Rated Student */}
          <div
            onClick={() => handleDemoLogin('alex.chen@cs.edu')}
            className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/60 dark:hover:bg-blue-900/40 cursor-pointer transition flex items-center justify-between group"
          >
            <div className="flex items-center space-x-3">
              <img
                src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200"
                alt="Alex"
                className="w-10 h-10 rounded-full object-cover border border-blue-300"
              />
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200">
                    Alex Chen
                  </h4>
                  <span className="text-[10px] font-bold bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">
                    6th Sem Student (Rating: 4.9★)
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Owns TI-84 Calculator & CLRS Algorithm textbook
                </p>
              </div>
            </div>
            <CheckCircle2 className="w-5 h-5 text-blue-600 opacity-0 group-hover:opacity-100 transition" />
          </div>

          {/* Student 2 */}
          <div
            onClick={() => handleDemoLogin('priya.sharma@cs.edu')}
            className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 cursor-pointer transition flex items-center justify-between group"
          >
            <div className="flex items-center space-x-3">
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200"
                alt="Priya"
                className="w-10 h-10 rounded-full object-cover border border-emerald-300"
              />
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                    Priya Sharma
                  </h4>
                  <span className="text-[10px] font-bold bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full">
                    4th Sem Student
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Owns Raspberry Pi 4 Kit & Arduino Megas (Active rental borrower)
                </p>
              </div>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-600 opacity-0 group-hover:opacity-100 transition" />
          </div>

          {/* High Complaint Count Student (Testing Auto-Block) */}
          <div
            onClick={() => handleDemoLogin('david.m@cs.edu')}
            className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-900/40 cursor-pointer transition flex items-center justify-between group"
          >
            <div className="flex items-center space-x-3">
              <img
                src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200"
                alt="David"
                className="w-10 h-10 rounded-full object-cover border border-amber-300"
              />
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    David Miller
                  </h4>
                  <span className="text-[10px] font-bold bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full flex items-center space-x-1">
                    <ShieldAlert className="w-3 h-3 text-amber-700" />
                    <span>4 Complaints (Auto-Block Trigger)</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Test filing 1 more complaint against him to trigger the 5-complaint auto-block!
                </p>
              </div>
            </div>
            <ShieldAlert className="w-5 h-5 text-amber-600 opacity-0 group-hover:opacity-100 transition" />
          </div>

        </div>

        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-2">
          Note: You can also register a new custom student account anytime with any @cs.edu / college email.
        </p>
      </div>
    </div>
  );
};
