import React, { useState, useEffect } from 'react';
import { api } from '../lib/apiClient';
import { Avatar } from './Avatar';
import { ArrowLeft, Star, ShieldCheck, Package, MapPin, CalendarDays } from 'lucide-react';

// Public profile of another student (e.g. the owner of a resource).
// Data comes from GET /api/users/:id, which only returns public-safe fields
// (no email / phone) plus the student's listings and received reviews.
export const OwnerProfilePage = ({ userId, currentUser, onBack, onOpenItem }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    window.scrollTo({ top: 0 });
    setLoading(true);
    setError('');

    api
      .getUserProfile(userId)
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load this profile.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const backButton = (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
    >
      <ArrowLeft className="w-4 h-4" />
      <span>Back</span>
    </button>
  );

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        {backButton}
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading profile…</p>
      </div>
    );
  }

  if (error || !profile?.user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        {backButton}
        <p className="text-sm font-semibold text-red-600 dark:text-red-400">
          {error || 'Profile not found.'}
        </p>
      </div>
    );
  }

  const { user, listings = [], ratings = [], lentCount = 0 } = profile;
  // Prefer the server's own count; fall back to the list length.
  const listedCount = profile.listingsCount ?? listings.length;
  const isOwnProfile = currentUser?._id && currentUser._id === user._id;
  const avg = Number(user.averageRating) || 0;
  const totalRatings = user.totalRatings ?? ratings.length;
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {backButton}

      {isOwnProfile && (
        <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
          This is how other students see your profile.
        </p>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <Avatar src={user.avatar} name={user.name} size="w-24 h-24" textSize="text-3xl" />

          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">{user.name}</h1>
              {user.verified && (
                <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified CS Student</span>
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {user.department || 'Computer Science & Engineering'}
              {user.semester ? ` • ${user.semester}` : ''}
            </p>
            {memberSince && (
              <p className="text-xs text-slate-400 flex items-center space-x-1">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Member since {memberSince}</span>
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 text-center">
          <div>
            <div className="flex items-center justify-center space-x-1 text-amber-500 font-extrabold text-lg">
              <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
              <span>{avg > 0 ? avg.toFixed(1) : 0}</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Peer Rating ({totalRatings} {totalRatings === 1 ? 'review' : 'reviews'})
            </p>
          </div>
          <div>
            <p className="text-lg font-extrabold text-blue-600 dark:text-blue-400">{listedCount}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Listed Resources</p>
          </div>
          <div>
            <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{lentCount}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Completed Lends</p>
          </div>
        </div>
      </div>

      {/* Listings */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          Resources listed by {user.name.split(' ')[0]}
        </h2>

        {listings.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">No resources listed yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((item) => (
              <div
                key={item._id}
                role="button"
                tabIndex={0}
                onClick={() => onOpenItem(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenItem(item);
                  }
                }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition"
              >
                <div className="h-36 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  {item.images?.[0] ? (
                    <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                      {item.title}
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                        item.availability
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {item.availability ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.category}</p>
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                      ₹{item.rentPricePerDay}
                      <span className="text-[10px] text-slate-400 font-normal"> / day</span>
                    </p>
                    {item.pickupLocation && (
                      <p className="text-[10px] text-slate-400 flex items-center space-x-0.5 truncate">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[110px]">{item.pickupLocation}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reviews */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Peer Reviews</h2>

        {ratings.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">No reviews yet.</p>
        ) : (
          <div className="space-y-2">
            {ratings.map((r) => (
              <div
                key={r._id}
                className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <Avatar
                      src={r.reviewerAvatar}
                      name={r.reviewerName || 'Student'}
                      size="w-7 h-7"
                      textSize="text-[10px]"
                      borderClassName="border"
                      ringClassName="border-slate-200 dark:border-slate-700"
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {r.reviewerName || 'CS Student'}
                    </span>
                  </div>
                  <div className="flex items-center text-amber-400">
                    {Array.from({ length: r.stars }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                    ))}
                  </div>
                </div>
                {r.comment && (
                  <p className="text-slate-600 dark:text-slate-400 italic">"{r.comment}"</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};