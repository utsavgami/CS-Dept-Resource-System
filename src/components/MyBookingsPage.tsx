import React, { useState, useEffect } from 'react';
import { Booking, User } from '../types';
import { api } from '../lib/apiClient';
import { 
  BookmarkCheck, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Star, 
  User as UserIcon, 
  Calendar,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

interface MyBookingsPageProps {
  currentUser: User;
  onOpenChat: (bookingId: string) => void;
  onOpenComplaint: (booking: Booking) => void;
}

export const MyBookingsPage: React.FC<MyBookingsPageProps> = ({
  currentUser,
  onOpenChat,
  onOpenComplaint
}) => {
  const [activeTab, setActiveTab] = useState<'borrowed' | 'requests'>('borrowed');
  const [borrowedBookings, setBorrowedBookings] = useState<Booking[]>([]);
  const [ownerRequests, setOwnerRequests] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Rating Modal state
  const [ratingBooking, setRatingBooking] = useState<Booking | null>(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const res = await api.getMyBookings();
      setBorrowedBookings(res.borrowed || []);
      setOwnerRequests(res.ownerRequests || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (bookingId: string, status: string) => {
    try {
      await api.updateBookingStatus(bookingId, status);
      loadBookings();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingBooking) return;

    const revieweeId = ratingBooking.borrowerId === currentUser._id 
      ? ratingBooking.ownerId 
      : ratingBooking.borrowerId;

    try {
      setRatingLoading(true);
      await api.createRating({
        bookingId: ratingBooking._id,
        revieweeId,
        stars,
        comment
      });
      alert('Rating and review submitted successfully!');
      setRatingBooking(null);
      setComment('');
    } catch (err: any) {
      alert(err.message || 'Failed to submit rating');
    } finally {
      setRatingLoading(false);
    }
  };

  const listToDisplay = activeTab === 'borrowed' ? borrowedBookings : ownerRequests;

  return (
    <div className="space-y-6 py-6 animate-in fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            My Rental Bookings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track resource borrow requests, approve rentals, and communicate for pickups
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('borrowed')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'borrowed'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Items I Borrowed ({borrowedBookings.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'requests'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Requests for My Items ({ownerRequests.length})
          </button>
        </div>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : listToDisplay.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <BookmarkCheck className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            No bookings found in this category
          </h3>
          <p className="text-xs text-slate-500">
            {activeTab === 'borrowed' 
              ? 'You have not submitted any rental requests yet.' 
              : 'No students have requested to rent your listed resources yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {listToDisplay.map((b) => {
            const isOwner = b.ownerId === currentUser._id;
            const counterpartyName = isOwner ? b.borrowerName : b.ownerName;

            return (
              <div
                key={b._id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                
                {/* Left Info */}
                <div className="flex items-start space-x-4">
                  <img
                    src={b.itemImage || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=800'}
                    alt={b.itemTitle}
                    className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-800"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        b.status === 'Accepted' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        b.status === 'Pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                        b.status === 'Completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                        'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                      }`}>
                        {b.status}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {isOwner ? 'Borrower:' : 'Owner:'} <strong className="text-slate-800 dark:text-slate-200">{counterpartyName}</strong>
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {b.itemTitle}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        <span>{b.startDate} to {b.endDate} ({b.totalDays} days)</span>
                      </span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        Total: ₹{b.totalCost}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
                  
                  {/* Chat button */}
                  <button
                    onClick={() => onOpenChat(b._id)}
                    className="px-3 py-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 rounded-xl text-xs font-bold hover:bg-blue-100 transition flex items-center space-x-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Open Chat</span>
                  </button>

                  {/* Owner Accept / Reject buttons */}
                  {isOwner && b.status === 'Pending' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(b._id, 'Accepted')}
                        className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition flex items-center space-x-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(b._id, 'Rejected')}
                        className="px-3 py-2 bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300 rounded-xl text-xs font-bold hover:bg-red-200 transition flex items-center space-x-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </>
                  )}

                  {/* Complete Rental button */}
                  {b.status === 'Accepted' && (
                    <button
                      onClick={() => handleUpdateStatus(b._id, 'Completed')}
                      className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
                    >
                      Mark Item Returned (Complete)
                    </button>
                  )}

                  {/* Rate User button for completed rentals */}
                  {b.status === 'Completed' && (
                    <button
                      onClick={() => setRatingBooking(b)}
                      className="px-3 py-2 bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold hover:bg-amber-500/30 transition flex items-center space-x-1"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>Rate Peer</span>
                    </button>
                  )}

                  {/* Report Complaint button */}
                  <button
                    onClick={() => onOpenComplaint(b)}
                    className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Report Complaint regarding this booking"
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </button>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Rating & Review Modal */}
      {ratingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center space-x-2">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span>Rate Peer CS Student</span>
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Leave a 5-star rating for {ratingBooking.ownerId === currentUser._id ? ratingBooking.borrowerName : ratingBooking.ownerName} regarding "{ratingBooking.itemTitle}".
            </p>

            <form onSubmit={handleSubmitRating} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Rating Stars
                </label>
                <div className="flex space-x-2 text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      onClick={() => setStars(s)}
                      className={`w-8 h-8 cursor-pointer transition ${
                        s <= stars ? 'fill-amber-400 text-amber-400 scale-110' : 'text-slate-300 dark:text-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Review Comment
                </label>
                <textarea
                  rows={3}
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Punctual, polite, item was in pristine condition..."
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex space-x-2 justify-end">
                <button
                  type="button"
                  onClick={() => setRatingBooking(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ratingLoading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition"
                >
                  {ratingLoading ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
