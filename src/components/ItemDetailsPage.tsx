import React, { useState, useEffect } from 'react';
import { Item, User, Rating } from '../types';
import { api } from '../lib/apiClient';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  ShieldCheck, 
  Star, 
  User as UserIcon, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare, 
  BookmarkPlus, 
  Phone, 
  Mail,
  DollarSign
} from 'lucide-react';

interface ItemDetailsPageProps {
  item: Item;
  currentUser: User | null;
  onBack: () => void;
  onBookingSuccess: () => void;
  onRequireLogin: () => void;
}

export const ItemDetailsPage: React.FC<ItemDetailsPageProps> = ({
  item,
  currentUser,
  onBack,
  onBookingSuccess,
  onRequireLogin
}) => {
  const [selectedImage, setSelectedImage] = useState(item.images[0] || '');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const future = new Date();
    future.setDate(future.getDate() + 3);
    return future.toISOString().split('T')[0];
  });

  const [ownerData, setOwnerData] = useState<User | null>(null);
  const [ownerRatings, setOwnerRatings] = useState<Rating[]>([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState('');

  useEffect(() => {
    loadOwnerDetails();
  }, [item._id]);

  const loadOwnerDetails = async () => {
    try {
      const res = await api.getItemById(item._id);
      setOwnerData(res.owner);
      setOwnerRatings(res.ownerRatings || []);
    } catch {
      // ignore
    }
  };

  // Calculate rental days & cost
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.max(0, end.getTime() - start.getTime());
  const rentalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  const rentalFee = rentalDays * item.rentPricePerDay;
  const totalAmount = rentalFee + item.securityDeposit;

  const handleBookNow = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError('');
    setBookingSuccessMsg('');

    if (!currentUser) {
      onRequireLogin();
      return;
    }

    if (currentUser._id === item.ownerId) {
      setBookingError('You cannot rent your own listed item.');
      return;
    }

    if (!item.availability) {
      setBookingError('Item is currently marked as unavailable.');
      return;
    }

    try {
      setBookingLoading(true);
      await api.createBooking({
        itemId: item._id,
        startDate,
        endDate
      });

      setBookingSuccessMsg('Booking request sent successfully to owner! Check your Bookings tab.');
      setTimeout(() => {
        onBookingSuccess();
      }, 1500);
    } catch (err: any) {
      setBookingError(err.message || 'Failed to submit booking request');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6 animate-in fade-in">
      
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Resources</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Images & Main Specs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Image View */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="relative h-80 sm:h-96 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800">
              <img
                src={selectedImage || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=800'}
                alt={item.title}
                className="w-full h-full object-cover"
              />
              <span className={`absolute top-4 left-4 text-xs font-bold px-3 py-1 rounded-full ${
                item.availability ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
              }`}>
                {item.availability ? 'Available for Rent' : 'Currently Rented'}
              </span>
            </div>

            {/* Thumbnail switcher */}
            {item.images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto pb-1">
                {item.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition shrink-0 ${
                      selectedImage === img ? 'border-blue-600 scale-105' : 'border-transparent opacity-70'
                    }`}
                  >
                    <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details & Specs Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div>
              <div className="flex items-center space-x-2 text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">
                <span>{item.category}</span>
                <span>•</span>
                <span>Condition: {item.condition}</span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {item.title}
              </h1>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                Resource Description
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {item.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Pickup Location</span>
                <p className="font-bold text-slate-900 dark:text-white flex items-center space-x-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>{item.pickupLocation}</span>
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Security Deposit</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  ${item.securityDeposit} <span className="text-[10px] text-slate-400 font-normal">(Refundable)</span>
                </p>
              </div>
            </div>
          </div>

          {/* Owner Profile & Reviews */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
              <UserIcon className="w-4 h-4 text-blue-600" />
              <span>Owner Student Profile</span>
            </h3>

            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <img
                  src={item.ownerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.ownerName}`}
                  alt={item.ownerName}
                  className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                />
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {item.ownerName}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {item.ownerSemester || 'CS Student'} • Computer Science Dept
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center space-x-1 text-amber-500 font-bold text-sm justify-end">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{ownerData?.averageRating || 5.0}</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  {ownerData?.totalRatings || ownerRatings.length} Peer Reviews
                </p>
              </div>
            </div>

            {/* Peer Reviews List */}
            {ownerRatings.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Recent Peer Feedback
                </h4>
                <div className="space-y-2">
                  {ownerRatings.map((r) => (
                    <div key={r._id} className="p-3 bg-slate-50 dark:bg-slate-950/30 rounded-xl text-xs space-y-1 border border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{r.reviewerName}</span>
                        <div className="flex items-center text-amber-400">
                          {Array.from({ length: r.stars }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 italic">"{r.comment}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Right Col: Booking Request Form */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl sticky top-20 space-y-6">
            
            <div className="pb-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-baseline">
              <div>
                <span className="text-3xl font-black text-blue-600 dark:text-blue-400">
                  ${item.rentPricePerDay}
                </span>
                <span className="text-xs text-slate-500 font-medium"> / day</span>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Deposit: ${item.securityDeposit}
              </span>
            </div>

            {bookingError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300 text-xs font-semibold border border-red-200 dark:border-red-800">
                {bookingError}
              </div>
            )}

            {bookingSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
                {bookingSuccessMsg}
              </div>
            )}

            <form onSubmit={handleBookNow} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Rental Start Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Rental End Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              {/* Cost Calculation Summary */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-2">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Duration:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{rentalDays} Days</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Rental Fee (${item.rentPricePerDay} × {rentalDays}):</span>
                  <span className="font-bold text-slate-900 dark:text-white">${rentalFee}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Security Deposit:</span>
                  <span className="font-bold text-slate-900 dark:text-white">${item.securityDeposit}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between font-extrabold text-sm text-slate-900 dark:text-white">
                  <span>Total Due at Pickup:</span>
                  <span className="text-blue-600 dark:text-blue-400">${totalAmount}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={bookingLoading || !item.availability}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {bookingLoading ? <span>Submitting Request...</span> : (
                  <>
                    <BookmarkPlus className="w-4 h-4" />
                    <span>Send Booking Request</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-[11px] text-slate-400 dark:text-slate-500 space-y-1">
              <p className="flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Security deposit is fully refunded upon item return.</span>
              </p>
              <p className="flex items-center space-x-1">
                <MessageSquare className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Chat opens automatically after booking request.</span>
              </p>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
