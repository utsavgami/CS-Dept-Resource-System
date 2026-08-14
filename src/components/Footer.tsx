import React from 'react';
import { Laptop, Shield, FileText, Heart, CheckCircle2 } from 'lucide-react';

interface FooterProps {
  setActiveTab: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ setActiveTab }) => {
  return (
    <footer className="bg-indigo-950 text-slate-400 border-t border-indigo-900/60 mt-20 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm shadow-indigo-500/20">
                <Laptop className="w-5 h-5" />
              </div>
              <span className="font-display font-extrabold text-lg text-white tracking-tight">
                CS Dept <span className="text-indigo-400">Resource System</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              An exclusive peer-to-peer resource sharing, rental, and equipment management platform built specifically for Computer Science & Engineering students and faculty.
            </p>
            <div className="flex items-center space-x-2 text-xs text-emerald-300 font-semibold bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-md w-fit">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verified CS Department Network</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-bold text-white text-sm mb-4">Platform Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => setActiveTab('explore')} className="hover:text-indigo-400 transition">
                  Explore Equipment & Books
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('add-item')} className="hover:text-indigo-400 transition">
                  List Your Resource
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('complaints')} className="hover:text-indigo-400 transition">
                  Submit a Complaint / Report
                </button>
              </li>
              <li>
              </li>
            </ul>
          </div>

          {/* Department Guidelines */}
          <div>
            <h4 className="font-display font-bold text-white text-sm mb-4">CS Dept Sharing Rules</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-start space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span>Return items on time in original condition</span>
              </li>
              <li className="flex items-start space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span>Inspect items upon pickup at designated CS labs</span>
              </li>
              <li className="flex items-start space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span>5 Verified Complaints trigger Auto-Block</span>
              </li>
            </ul>
          </div>

          {/* MERN Stack Spec */}
          {/* <div>
            <h4 className="font-display font-bold text-white text-sm mb-4">MERN Stack Tech</h4>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span className="bg-indigo-900/60 border border-indigo-800/60 text-slate-300 px-2 py-1 rounded-md font-mono">React.js 19</span>
              <span className="bg-indigo-900/60 border border-indigo-800/60 text-slate-300 px-2 py-1 rounded-md font-mono">Node.js + Express</span>
              <span className="bg-indigo-900/60 border border-indigo-800/60 text-slate-300 px-2 py-1 rounded-md font-mono">MongoDB Mongoose</span>
              <span className="bg-indigo-900/60 border border-indigo-800/60 text-slate-300 px-2 py-1 rounded-md font-mono">Socket.io Chat</span>
              <span className="bg-indigo-900/60 border border-indigo-800/60 text-slate-300 px-2 py-1 rounded-md font-mono">JWT Auth</span>
              <span className="bg-indigo-900/60 border border-indigo-800/60 text-slate-300 px-2 py-1 rounded-md font-mono">Tailwind CSS v4</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-3">
              Full production-ready modular REST API server running on port 3000.
            </p>
          </div> */}

        </div>

        <div className="border-t border-indigo-900/60 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Computer Science & Engineering Department. All rights reserved.</p>
          <p className="flex items-center space-x-1 mt-2 sm:mt-0">
            <span>Built for CS Department Students with</span>
            <Heart className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />
          </p>
        </div>
      </div>
    </footer>
  );
};
