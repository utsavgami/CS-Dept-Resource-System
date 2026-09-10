import React, { useState, useEffect } from 'react';
import { api, setStoredUser } from '../lib/apiClient';
import {
  User as UserIcon,
  Mail,
  Phone,
  GraduationCap,
  FileText,
  Star,
  ShieldCheck,
  BookOpen,
  BookmarkCheck,
  Edit3,
  AlertTriangle,
  Award
} from 'lucide-react';

export const ProfilePage = ({
  currentUser,
  onUserUpdated
}) => {
  const [profileStats, setProfileStats] = useState({
    listingsCount: 0,
    borrowedCount: 0,
    ratings: []
  });

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // Edit fields
  const [name, setName] = useState(currentUser.name);
  const [mobileNumber, setMobileNumber] = useState(currentUser.mobileNumber);
  const [semester, setSemester] = useState(currentUser.semester);
  const [avatar, setAvatar] = useState(currentUser.avatar || '');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadProfileDetails();
  }, [currentUser._id]);

  const loadProfileDetails = async () => {
    try {
      setLoading(true);
      const res = await api.getUserProfile(currentUser._id);
      setProfileStats({
        listingsCount: res.listingsCount || 0,
        borrowedCount: res.borrowedCount || 0,
        ratings: res.ratings || []
      });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setUpdating(true);
      const res = await api.updateProfile({
        name,
        mobileNumber,
        semester,
        avatar
      });

      setStoredUser(res.user);
      onUserUpdated(res.user);
      setEditing(false);
      alert('Profile updated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8 animate-in fade-in">

      {/* Profile Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">

        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">

          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
            <img
              src={currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.name}`}
              alt={currentUser.name}
              className="w-24 h-24 rounded-full object-cover border-4 border-blue-500/20 shadow-md"
            />

            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                  {currentUser.name}
                </h1>
                <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Verified CS Student</span>
                </span>
              </div>

              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {currentUser.department} • {currentUser.semester}
              </p>

              <p className="text-xs text-slate-400 flex items-center justify-center sm:justify-start space-x-2 pt-1">
                <span>Enrollment: <strong className="text-slate-700 dark:text-slate-300">{currentUser.enrollmentNumber}</strong></span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setEditing(!editing)}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 shrink-0"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>

        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">

          <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-center space-x-1 text-amber-500 font-black text-xl">
              <Star className="w-5 h-5 fill-amber-400" />
              <span>{currentUser.averageRating || 5.0}</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Peer Rating</p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="font-black text-xl text-blue-600 dark:text-blue-400">
              {profileStats.listingsCount}
            </span>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Listed Resources</p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="font-black text-xl text-emerald-600 dark:text-emerald-400">
              {profileStats.borrowedCount}
            </span>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Items Borrowed</p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className={`font-black text-xl ${
              currentUser.complaintCount > 0 ? 'text-amber-600' : 'text-slate-600 dark:text-slate-300'
            }`}>
              {currentUser.complaintCount} / 5
            </span>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Complaints Received</p>
          </div>

        </div>

      </div>

      {/* Edit Form Modal */}
      {editing && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
            Update Profile Information
          </h3>

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Semester</label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
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
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Avatar Image URL</label>
                <input
                  type="text"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold"
              >
                {updating ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Peer Reviews Received */}
      <div className="space-y-4">
        <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center space-x-2">
          <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
          <span>Peer Student Reviews ({profileStats.ratings.length})</span>
        </h3>

        {profileStats.ratings.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
            No peer ratings received yet. Complete rentals to earn ratings!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profileStats.ratings.map((r) => (
              <div
                key={r._id}
                className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 text-xs"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{r.reviewerName}</span>
                  <div className="flex items-center text-amber-400">
                    {Array.from({ length: r.stars }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                    ))}
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-300 italic leading-relaxed">
                  "{r.comment}"
                </p>
                <span className="text-[10px] text-slate-400 block pt-1">
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
