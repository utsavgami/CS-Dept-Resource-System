import React, { useState, useEffect } from 'react';
import { Complaint, ComplaintType, User, Booking } from '../types';
import { api } from '../lib/apiClient';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Upload, 
  Clock, 
  CheckCircle2, 
  FileText, 
  PlusCircle, 
  Image as ImageIcon,
  Lock
} from 'lucide-react';

interface ComplaintsPageProps {
  currentUser: User;
  initialBooking?: Booking | null;
}

export const ComplaintsPage: React.FC<ComplaintsPageProps> = ({
  currentUser,
  initialBooking
}) => {
  const [complaints, setComplaints] = useState<{ filed: Complaint[]; againstMe: Complaint[] }>({
    filed: [],
    againstMe: []
  });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(Boolean(initialBooking));

  // Form Fields
  const [type, setType] = useState<ComplaintType>('Demanding More Money');
  const [reportedUserId, setReportedUserId] = useState(initialBooking ? (initialBooking.ownerId === currentUser._id ? initialBooking.borrowerId : initialBooking.ownerId) : '');
  const [description, setDescription] = useState('');
  const [proofUrl, setProofUrl] = useState('https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&q=80&w=800');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sample CS students for dropdown
  const [students, setStudents] = useState<User[]>([]);

  useEffect(() => {
    loadComplaints();
  }, []);

  const loadComplaints = async () => {
    try {
      setLoading(true);
      const res = await api.getMyComplaints();
      setComplaints(res || { filed: [], againstMe: [] });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const complaintTypes: ComplaintType[] = [
    'Demanding More Money',
    'Fake Listing',
    'Damaged Item',
    'Fraud',
    'Misbehavior',
    'Other'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!reportedUserId || !description) {
      setError('Please select reported student and describe the issue');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.createComplaint({
        reportedUserId,
        bookingId: initialBooking?._id,
        itemTitle: initialBooking?.itemTitle,
        type,
        description,
        proofUrl
      });

      setSuccessMsg(res.message);
      setShowForm(false);
      setDescription('');
      loadComplaints();
    } catch (err: any) {
      setError(err.message || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setProofUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8 py-6 animate-in fade-in">
      
      {/* Header & Auto-Block Security Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <AlertTriangle className="w-7 h-7 text-amber-500" />
            <span>Complaint & Safety Protocol</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Submit verified reports against fraud, fake listings, or extortion.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/20 transition flex items-center space-x-2 w-fit"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{showForm ? 'Cancel Report' : 'File New Complaint'}</span>
        </button>
      </div>

      {/* Auto-Block Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-red-500/10 to-purple-500/10 border border-amber-300 dark:border-amber-800/60 flex items-start space-x-4">
        <div className="p-3 bg-amber-500 text-slate-950 rounded-xl font-bold shrink-0">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
            <span>Automatic Account Blocking Protocol</span>
            <span className="text-[10px] bg-red-600 text-white font-bold px-2 py-0.5 rounded-full">
              THRESHOLD: 5 COMPLAINTS
            </span>
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            If any registered student receives <strong>5 verified complaints</strong> (e.g. extortion, damaged items, fake listings), their account is <strong>automatically BLOCKED</strong> by the system engine. Blocked users cannot log in, list items, or send messages until reviewed by Admin.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200 text-xs font-bold border border-emerald-300 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Complaint Submission Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              File a Student Complaint Form
            </h3>
            <p className="text-xs text-slate-500">
              Provide accurate proof (screenshot or photo). Fake reports may result in penalties.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300 text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Complaint Type *
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ComplaintType)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                >
                  {complaintTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reported Student Account ID / Email *
                </label>
                <input
                  type="text"
                  required
                  value={reportedUserId}
                  onChange={(e) => setReportedUserId(e.target.value)}
                  placeholder="e.g. usr_std_104 or david.m@cs.edu"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Description of Incident *
              </label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail what occurred (e.g. owner demanded extra cash at pickup, item was damaged, fake specs provided)..."
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Upload Proof (Photo / Screenshot / PDF)
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="Image URL or upload file below..."
                  className="flex-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                />
                <label className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs cursor-pointer hover:bg-slate-200 flex items-center justify-center space-x-1 shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose File</span>
                  <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>

            <div className="pt-3 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition"
              >
                {submitting ? 'Submitting Report...' : 'Submit Complaint to Admin'}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Complaints List */}
      <div className="space-y-4">
        <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
          Complaints Filed & History
        </h3>

        {loading ? (
          <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
        ) : complaints.filed.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-xs text-slate-400">
            You have not filed any complaints.
          </div>
        ) : (
          <div className="space-y-3">
            {complaints.filed.map((c) => (
              <div
                key={c._id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 font-bold text-[10px] px-2.5 py-0.5 rounded-full">
                      {c.type}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Reported: {c.reportedUserName}
                    </span>
                  </div>

                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full w-fit ${
                    c.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                    c.status === 'Under Review' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    Status: {c.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {c.description}
                </p>

                {c.proofUrl && (
                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Submitted Proof:
                    </span>
                    <img
                      src={c.proofUrl}
                      alt="Proof"
                      className="w-32 h-20 rounded-xl object-cover border border-slate-200 dark:border-slate-800"
                    />
                  </div>
                )}

                {c.adminNote && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200">
                    <strong>CS Admin Response:</strong> {c.adminNote}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
