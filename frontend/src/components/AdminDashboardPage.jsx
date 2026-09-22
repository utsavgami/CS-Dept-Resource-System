import React, { useState, useEffect } from 'react';
import { api } from '../lib/apiClient';
import {
  ShieldCheck,
  Users,
  Layers,
  BookmarkCheck,
  AlertTriangle,
  ShieldAlert,
  DollarSign,
  Trash2,
  CheckCircle2,
  Ban,
  Unlock,
  Eye,
  FileText
} from 'lucide-react';

export const AdminDashboardPage = () => {
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Admin note modal for complaints
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [sRes, uRes, cRes, iRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getAdminComplaints(),
        api.getItems()
      ]);

      setStats(sRes);
      setUsers(uRes.users || []);
      setComplaints(cRes.complaints || []);
      setItems(iRes.items || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserBlock = async (userId, currentStatus) => {
    const action = currentStatus ? 'unblock' : 'block';
    if (!confirm(`Are you sure you want to ${action} this student account?`)) return;

    try {
      await api.toggleUserBlock(userId, !currentStatus);
      loadAdminData();
    } catch (err) {
      alert(err.message || 'Failed to update user block status');
    }
  };

  const handleResolveComplaint = async (complaintId, status) => {
    try {
      setActionLoading(true);
      const res = await api.updateComplaintStatus(complaintId, status, adminNote);
      alert(res.message);
      setSelectedComplaint(null);
      setAdminNote('');
      loadAdminData();
    } catch (err) {
      alert(err.message || 'Failed to update complaint');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteListing = async (itemId) => {
    if (!confirm('Are you sure you want to delete this listing as Admin?')) return;
    try {
      await api.adminDeleteItem(itemId);
      setItems(prev => prev.filter(i => i._id !== itemId));
    } catch (err) {
      alert(err.message || 'Failed to delete listing');
    }
  };

  return (
    <div className="space-y-8 py-6 animate-in fade-in">

      {/* Admin Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <ShieldCheck className="w-7 h-7 text-purple-600" />
            <span>CS Department Admin Control Panel</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            System moderation, student verification, complaint management, and auto-block overrides
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'stats' ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Overview Stats
          </button>
          <button
            onClick={() => setActiveTab('complaints')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'complaints' ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Complaints ({complaints.filter(c => c.status !== 'Resolved').length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'users' ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Students ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('listings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'listings' ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Resource Listings
          </button>
        </div>
      </div>

      {/* Overview Stats Cards */}
      {activeTab === 'stats' && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">CS Students</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalStudents}</p>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Active Listings</span>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.activeListings}</p>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Total Bookings</span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.totalBookings}</p>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Pending Complaints</span>
            <p className="text-2xl font-black text-amber-600">{stats.pendingComplaints}</p>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Blocked Accounts</span>
            <p className="text-2xl font-black text-red-600">{stats.blockedUsers}</p>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Rental Volume</span>
            <p className="text-2xl font-black text-purple-600">₹{stats.totalRentalVolume}</p>
          </div>
        </div>
      )}

      {/* Complaints Moderation Tab */}
      {(activeTab === 'complaints' || activeTab === 'stats') && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span>Complaint Submissions & Auto-Block Review</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Type</th>
                  <th className="p-3">Reporter</th>
                  <th className="p-3">Reported Student</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Proof</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {complaints.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-bold text-red-600">{c.type}</td>
                    <td className="p-3">{c.reporterName}</td>
                    <td className="p-3 font-bold">{c.reportedUserName}</td>
                    <td className="p-3 max-w-xs truncate">{c.description}</td>
                    <td className="p-3">
                      {c.proofUrl ? (
                        <a href={c.proofUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">
                          View Image
                        </a>
                      ) : 'No Proof'}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        c.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedComplaint(c)}
                        className="px-3 py-1 bg-purple-600 text-white rounded-lg font-bold text-[11px] hover:bg-purple-700"
                      >
                        Review / Resolve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users Management Tab */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center space-x-2">
            <Users className="w-5 h-5 text-purple-600" />
            <span>Manage Registered CS Students</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Enrollment No.</th>
                  <th className="p-3">Semester</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Complaints</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-bold flex items-center space-x-2">
                      <img src={u.avatar} alt="" className="w-6 h-6 rounded-full" />
                      <span>{u.name}</span>
                    </td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3 font-mono">{u.enrollmentNumber}</td>
                    <td className="p-3">{u.semester}</td>
                    <td className="p-3 capitalize font-bold">{u.role}</td>
                    <td className="p-3 font-bold text-amber-600">{u.complaintCount} / 5</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        u.isBlocked ? 'bg-red-600 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {u.isBlocked ? 'BLOCKED' : 'Active'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleUserBlock(u._id, u.isBlocked)}
                          className={`px-3 py-1 rounded-lg font-bold text-[11px] ${
                            u.isBlocked ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          {u.isBlocked ? 'Unblock' : 'Block Student'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Listings Moderation Tab */}
      {activeTab === 'listings' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center space-x-2">
            <Layers className="w-5 h-5 text-purple-600" />
            <span>Moderate Resource Listings</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div key={item._id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1">{item.title}</h4>
                  <button
                    onClick={() => handleDeleteListing(item._id)}
                    className="p-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 cursor-pointer"
                    title="Delete Fake / Violating Listing"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-slate-500 line-clamp-2">{item.description}</p>
                <div className="flex justify-between font-bold text-blue-600 pt-1">
                  <span>₹{item.rentPricePerDay}/day</span>
                  <span className="text-slate-400 font-normal">Owner: {item.ownerName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Complaint Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-xs">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Admin Complaint Resolution
            </h3>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-1">
              <p><strong>Type:</strong> {selectedComplaint.type}</p>
              <p><strong>Reporter:</strong> {selectedComplaint.reporterName}</p>
              <p><strong>Reported Student:</strong> {selectedComplaint.reportedUserName}</p>
              <p className="pt-1"><strong>Details:</strong> {selectedComplaint.description}</p>
            </div>

            <div>
              <label className="block font-bold mb-1">Admin Resolution Note</label>
              <textarea
                rows={3}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Verified proof screenshot. Warning issued / complaint approved..."
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setSelectedComplaint(null)}
                className="px-4 py-2 rounded-xl border font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResolveComplaint(selectedComplaint._id, 'Resolved')}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700"
              >
                {actionLoading ? 'Processing...' : 'Approve & Mark Resolved'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
