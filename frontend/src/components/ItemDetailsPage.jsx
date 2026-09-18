import React, { useState, useEffect, useMemo } from "react";
import { api, addToRecentlyViewed } from "../lib/apiClient";
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
  DollarSign,
  Heart,
  CalendarX2,
} from "lucide-react";

// yyyy-mm-dd string for a Date object, in local time (not UTC), so date
// inputs and comparisons line up with what the user actually picked.
function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const ItemDetailsPage = ({
  item,
  currentUser,
  onBack,
  onBookingSuccess,
  onRequireLogin,
}) => {
  const [selectedImage, setSelectedImage] = useState(item.images[0] || "");
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const future = new Date();
    future.setDate(future.getDate() + 3);
    return future.toISOString().split("T")[0];
  });

  const [ownerData, setOwnerData] = useState(null);
  const [ownerRatings, setOwnerRatings] = useState([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState("");
  const [availabilityAfter, setAvailabilityAfter] = useState(null);

  // Date-range availability
  const [bookedRanges, setBookedRanges] = useState([]);
  const [datesLoading, setDatesLoading] = useState(true);

  // Favorites
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // Booking window: today up to 30 days from today
  const todayStr = useMemo(() => toDateInputValue(new Date()), []);
  const maxBookingStr = useMemo(() => {
    const max = new Date();
    max.setDate(max.getDate() + 30);
    return toDateInputValue(max);
  }, []);

  useEffect(() => {
    loadOwnerDetails();
    loadBookedDates();
    addToRecentlyViewed(item);

    if (currentUser?.favorites) {
      setIsFavorite(currentUser.favorites.includes(item._id));
    }
  }, [item._id]);

  const loadBookedDates = async () => {
    try {
      setDatesLoading(true);
      const res = await api.getBookedDates(item._id);
      setBookedRanges(res.bookedRanges || []);
    } catch {
      // ignore
    } finally {
      setDatesLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    try {
      setFavoriteLoading(true);
      const res = await api.toggleFavorite(item._id);
      setIsFavorite(res.isFavorite);
    } catch (err) {
      alert(err.message || "Failed to update favorites");
    } finally {
      setFavoriteLoading(false);
    }
  };

  const loadOwnerDetails = async () => {
    try {
      const res = await api.getItemById(item._id);
      const ownerId = res.owner?._id;

      setOwnerRatings(res.ownerRatings || []);

      // Fetch the profile for the owner of this resource, never the viewer.
      if (ownerId) {
        try {
          const profile = await api.getUserProfile(ownerId);
          setOwnerData(profile.user || res.owner);
        } catch {
          setOwnerData(res.owner);
        }
      } else {
        setOwnerData(res.owner || null);
      }

      // Backend se availability-after date aaye to use karo
      if (res.availabilityAfter) {
        setAvailabilityAfter(res.availabilityAfter);
      }
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

  // Does the currently selected date range overlap any already-booked range?
  const selectedRangeOverlaps = bookedRanges.some((r) => {
    const rStart = new Date(r.startDate);
    const rEnd = new Date(r.endDate);
    return start <= rEnd && end >= rStart;
  });

  const handleBookNow = async (e) => {
    e.preventDefault();
    setBookingError("");
    setBookingSuccessMsg("");

    if (!currentUser) {
      onRequireLogin();
      return;
    }

    if (currentUser._id === item.ownerId) {
      setBookingError("You cannot rent your own listed item.");
      return;
    }

    if (!item.availability) {
      setBookingError("This listing has been turned off by the owner.");
      return;
    }

    if (selectedRangeOverlaps) {
      setBookingError("Those dates overlap an existing booking for this item. Pick different dates below.");
      return;
    }

    try {
      setBookingLoading(true);
      await api.createBooking({
        itemId: item._id,
        startDate,
        endDate,
      });

      setBookingSuccessMsg(
        "Booking request sent successfully to owner! Check your Bookings tab.",
      );
      setTimeout(() => {
        onBookingSuccess();
      }, 1500);
    } catch (err) {
      setBookingError(err.message || "Failed to submit booking request");
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
                src={
                  selectedImage ||
                  "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=800"
                }
                alt={item.title}
                className="w-full h-full object-cover"
              />
              <span
                className={`absolute top-4 left-4 text-xs font-bold px-3 py-1 rounded-full ${
                  item.availability
                    ? "bg-emerald-500 text-white"
                    : "bg-red-500 text-white"
                }`}
              >
                {item.availability
                  ? "Listed for Rent"
                  : "Paused by Owner"}
              </span>

              {/* Favorite toggle */}
              <button
                onClick={handleToggleFavorite}
                disabled={favoriteLoading}
                title={isFavorite ? "Remove from favorites" : "Save to favorites"}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/90 dark:bg-slate-900/90 shadow-md hover:scale-105 transition disabled:opacity-50"
              >
                <Heart
                  className={`w-4 h-4 ${
                    isFavorite ? "fill-red-500 text-red-500" : "text-slate-500"
                  }`}
                />
              </button>
            </div>

            {/* Thumbnail switcher */}
            {item.images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto pb-1">
                {item.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition shrink-0 ${
                      selectedImage === img
                        ? "border-blue-600 scale-105"
                        : "border-transparent opacity-70"
                    }`}
                  >
                    <img
                      src={img}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />
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
                <span className="text-slate-400 font-medium">
                  Pickup Location
                </span>
                <p className="font-bold text-slate-900 dark:text-white flex items-center space-x-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>{item.pickupLocation}</span>
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-medium">
                  Security Deposit
                </span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  ₹{item.securityDeposit}{" "}
                  <span className="text-[10px] text-slate-400 font-normal">
                    (Refundable)
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Owner Profile & Reviews */}
          <div className="profile-panel bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
              <UserIcon className="w-4 h-4 text-blue-600" />
              <span>Owner Student Profile</span>
            </h3>

            <div className="profile-identity flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <img
                  src={
                    item.ownerAvatar ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.ownerName}`
                  }
                  alt={item.ownerName}
                  className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700 transition-transform duration-200 hover:scale-105"
                />
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {ownerData?.name || item.ownerName}
                  </h4>
                  {ownerData?.enrollmentNumber && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Enrollment Number: {ownerData.enrollmentNumber}
                    </p>
                  )}
                  {ownerData?._id && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      User ID: {ownerData._id}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {item.ownerSemester || "CS Student"} • Computer Science Dept
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
                    <div
                      key={r._id}
                      className="p-3 bg-slate-50 dark:bg-slate-950/30 rounded-xl text-xs space-y-1 border border-slate-100 dark:border-slate-800"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {r.reviewerName}
                        </span>
                        <div className="flex items-center text-amber-400">
                          {Array.from({ length: r.stars }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 italic">
                        "{r.comment}"
                      </p>
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
                  ₹{item.rentPricePerDay}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {" "}
                  / day
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Deposit: ₹{item.securityDeposit}
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

            {/* Already Booked / Owner-Blocked Dates */}
            {!datesLoading && bookedRanges.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-1.5">
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center space-x-1.5">
                  <CalendarX2 className="w-3.5 h-3.5" />
                  <span>Unavailable Dates — pick dates outside these ranges</span>
                </span>
                <ul className="text-[11px] text-amber-700 dark:text-amber-400 space-y-0.5">
                  {bookedRanges.map((r, idx) => (
                    <li key={idx}>
                      {new Date(r.startDate).toLocaleDateString("en-IN")} – {new Date(r.endDate).toLocaleDateString("en-IN")}
                      {r.source === "owner"
                        ? ` (owner unavailable${r.reason ? `: ${r.reason}` : ""})`
                        : r.status === "Pending"
                          ? " (pending booking)"
                          : " (booked)"}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedRangeOverlaps && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-[11px] font-semibold text-red-700 dark:text-red-300 flex items-center space-x-1.5">
                <CalendarX2 className="w-3.5 h-3.5 shrink-0" />
                <span>Selected dates overlap an existing booking.</span>
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
                    min={todayStr}
                    max={maxBookingStr}
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
                    min={startDate || todayStr}
                    max={maxBookingStr}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Bookings can be made from today up to {new Date(maxBookingStr).toLocaleDateString("en-IN")} (30 days ahead).
                </p>
              </div>

              {/* Cost Calculation Summary */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-2">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Duration:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {rentalDays} Days
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>
                    Rental Fee (₹{item.rentPricePerDay} × {rentalDays}):
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ₹{rentalFee}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Security Deposit:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ₹{item.securityDeposit}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between font-extrabold text-sm text-slate-900 dark:text-white">
                  <span>Total Due at Pickup:</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    ₹{totalAmount}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={bookingLoading || !item.availability || selectedRangeOverlaps}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {bookingLoading ? (
                  <span>Submitting Request...</span>
                ) : (
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
                <span>
                  Security deposit is fully refunded upon item return.
                </span>
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
