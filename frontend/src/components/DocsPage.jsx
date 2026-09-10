import React, { useState } from 'react';
import {
  FileCode,
  Database,
  Server,
  Laptop,
  ShieldCheck,
  Layers,
  Globe,
  Cpu,
  CheckCircle2,
  Copy,
  Terminal,
  Workflow
} from 'lucide-react';

export const DocsPage = () => {
  const [activeSection, setActiveSection] = useState('architecture');
  const [copied, setCopied] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 py-6 animate-in fade-in max-w-5xl mx-auto">

      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <FileCode className="w-7 h-7 text-indigo-600" />
            <span>MERN Stack Architecture & ER Diagram Documentation</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete technical specification, MongoDB schemas, REST API endpoints, and production deployment guide
          </p>
        </div>

        {/* Section Navigation */}
        <div className="flex flex-wrap bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit text-xs">
          <button
            onClick={() => setActiveSection('architecture')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              activeSection === 'architecture' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Architecture
          </button>
          <button
            onClick={() => setActiveSection('erdiagram')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              activeSection === 'erdiagram' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            ER Diagram
          </button>
          <button
            onClick={() => setActiveSection('models')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              activeSection === 'models' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            MongoDB Models
          </button>
          <button
            onClick={() => setActiveSection('apis')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              activeSection === 'apis' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            REST APIs
          </button>
          <button
            onClick={() => setActiveSection('deployment')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              activeSection === 'deployment' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Deployment Guide
          </button>
        </div>
      </div>

      {/* Architecture Overview */}
      {activeSection === 'architecture' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <Workflow className="w-5 h-5 text-indigo-600" />
              <span>Full-Stack MERN Architecture Overview</span>
            </h2>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              The CS Department Resource Sharing & Rental System is engineered as a high-performance full-stack application following MERN conventions.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-2">
                <div className="font-bold text-xs text-blue-900 dark:text-blue-300 flex items-center space-x-1.5">
                  <Laptop className="w-4 h-4" />
                  <span>Frontend Tier</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  React 19 SPA, Vite build pipeline, Tailwind CSS v4 design system, Lucide icons, Motion animations, Socket.io-client.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
                <div className="font-bold text-xs text-emerald-900 dark:text-emerald-300 flex items-center space-x-1.5">
                  <Server className="w-4 h-4" />
                  <span>Backend Express Tier</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Node.js Express server running on port 3000, JWT middleware, Socket.io HTTP server, modular REST routes.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-2">
                <div className="font-bold text-xs text-purple-900 dark:text-purple-300 flex items-center space-x-1.5">
                  <Database className="w-4 h-4" />
                  <span>MongoDB Data Store</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Mongoose collections for Users, Items, Bookings, Messages, Complaints, Ratings, and Notifications.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2">
                <div className="font-bold text-xs text-amber-900 dark:text-amber-300 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Auto-Block Engine</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Automated security middleware triggering account block when complaint count reaches 5 verified reports.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ER Diagram */}
      {activeSection === 'erdiagram' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <Database className="w-5 h-5 text-indigo-600" />
              <span>Entity Relationship (ER) Diagram</span>
            </h2>
            <span className="text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold px-2.5 py-1 rounded-full">
              7 Collections
            </span>
          </div>

          <div className="p-6 bg-slate-950 text-slate-200 font-mono text-xs rounded-2xl overflow-x-auto border border-slate-800 leading-relaxed">
            <pre>{`
+-----------------------+           1 : N           +-----------------------+
|        USERS          |---------------------------|        ITEMS          |
+-----------------------+                           +-----------------------+
| _id (PK)              |                           | _id (PK)              |
| name                  |                           | ownerId (FK -> Users) |
| email (@cs.edu)       |                           | title                 |
| enrollmentNumber      |                           | category              |
| mobileNumber          |                           | rentPricePerDay       |
| semester              |                           | securityDeposit       |
| role (student/admin)  |                           | availability          |
| isBlocked (AutoBlock) |                           | pickupLocation        |
| complaintCount        |                           +-----------------------+
+-----------------------+                                       |
        |                                                       | 1 : N
        | 1 : N                                                 v
        |                                           +-----------------------+
        +-------------------------------------------|       BOOKINGS        |
        |                                           +-----------------------+
        |                                           | _id (PK)              |
        |                                           | itemId (FK -> Items)  |
        |                                           | borrowerId (FK Users) |
        |                                           | ownerId (FK Users)    |
        v                                           | startDate / endDate   |
+-----------------------+                           | status (Pending/Acc)  |
|      MESSAGES         |                           +-----------------------+
+-----------------------+                                       |
| _id (PK)              |                                       | 1 : N
| bookingId (FK)        |                                       v
| senderId (FK Users)   |                           +-----------------------+
| receiverId (FK Users) |                           |      COMPLAINTS       |
| content               |                           +-----------------------+
| timestamp             |                           | _id (PK)              |
+-----------------------+                           | reporterId (FK Users) |
                                                    | reportedUserId (FK)   |
+-----------------------+                           | type / proofUrl       |
|       RATINGS         |                           | status                |
+-----------------------+                           +-----------------------+
| _id (PK)              |
| reviewerId (FK Users) |
| revieweeId (FK Users) |
| stars (1-5) / comment |
+-----------------------+
`}</pre>
          </div>
        </div>
      )}

      {/* Database Models */}
      {activeSection === 'models' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <span>Mongoose MongoDB Collection Schemas</span>
          </h2>

          <div className="space-y-4 text-xs font-mono">

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">1. UserSchema</h4>
              <p className="text-slate-500 font-sans">
                Stores student credentials, enrollment details, department verification, ratings average, and complaint count.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">2. ItemSchema</h4>
              <p className="text-slate-500 font-sans">
                Resource listings including title, category (Calculators, Books, Lab Equipment, Electronics), images, pricing, security deposit, and campus pickup location.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">3. BookingSchema</h4>
              <p className="text-slate-500 font-sans">
                Rental contracts tracking borrower ID, owner ID, item reference, rental start/end dates, total days, total cost, and status (Pending, Accepted, Rejected, Completed).
              </p>
            </div>

          </div>
        </div>
      )}

      {/* REST APIs */}
      {activeSection === 'apis' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <Server className="w-5 h-5 text-indigo-600" />
            <span>REST API Endpoint Catalog</span>
          </h2>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl flex items-center justify-between">
              <span className="font-bold text-emerald-600">POST /api/auth/register</span>
              <span className="text-slate-400 font-sans">Register CS student with email & enrollment</span>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl flex items-center justify-between">
              <span className="font-bold text-emerald-600">POST /api/auth/login</span>
              <span className="text-slate-400 font-sans">Authenticate & return JWT session token</span>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl flex items-center justify-between">
              <span className="font-bold text-blue-600">GET /api/items</span>
              <span className="text-slate-400 font-sans">List resources with category/price/availability filter</span>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl flex items-center justify-between">
              <span className="font-bold text-emerald-600">POST /api/bookings</span>
              <span className="text-slate-400 font-sans">Create rental booking request</span>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl flex items-center justify-between">
              <span className="font-bold text-emerald-600">POST /api/complaints</span>
              <span className="text-slate-400 font-sans">Submit report + proof (triggers auto-block at 5)</span>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl flex items-center justify-between">
              <span className="font-bold text-purple-600">GET /api/admin/stats</span>
              <span className="text-slate-400 font-sans">Admin overview statistics & metrics</span>
            </div>
          </div>
        </div>
      )}

      {/* Deployment Guide */}
      {activeSection === 'deployment' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <Globe className="w-5 h-5 text-indigo-600" />
            <span>Production Deployment Guide</span>
          </h2>

          <div className="p-4 bg-slate-950 text-slate-200 rounded-2xl font-mono text-xs space-y-2">
            <p className="text-slate-400"># 1. Install dependencies</p>
            <p className="text-emerald-400">npm install</p>

            <p className="text-slate-400 pt-2"># 2. Build frontend SPA & bundle backend CommonJS server</p>
            <p className="text-emerald-400">npm run build</p>

            <p className="text-slate-400 pt-2"># 3. Start standalone production server (Node.js port 3000)</p>
            <p className="text-emerald-400">npm start</p>
          </div>
        </div>
      )}

    </div>
  );
};
