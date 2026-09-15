import React, { useState, useEffect } from 'react';
import { api } from '../lib/apiClient';
import { PlusCircle, Edit3, Trash2, ToggleLeft, ToggleRight, MapPin, Layers, ExternalLink, CalendarX2, X } from 'lucide-react';

export const MyListingsPage = ({
  currentUser,
  onAddNew,
  onEditItem,
  onViewDetails
}) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyListings();
  }, []);

  const loadMyListings = async () => {
    try {
      setLoading(true);
      const res = await api.getMyListings();
      setListings(res.items || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (item) => {
    try {
      const updated = await api.updateItem(item._id, { availability: !item.availability });
      setListings(prev => prev.map(i => i._id === item._id ? updated.item : i));
    } catch (err) {
      alert(err.message || 'Failed to update availability');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this resource listing?')) return;
    try {
      await api.deleteItem(itemId);
      setListings(prev => prev.filter(i => i._id !== itemId));
    } catch (err) {
      alert(err.message || 'Failed to delete listing');
    }
  };

  // Manage Unavailable Dates modal state
  const [manageDatesItem, setManageDatesItem] = useState(null);
  const [blockStartDate, setBlockStartDate] = useState('');
  const [blockEndDate, setBlockEndDate] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockSubmitting, setBlockSubmitting] = useState(false);
  const [blockError, setBlockError] = useState('');

  const openManageDates = (item) => {
    setManageDatesItem(item);
    setBlockStartDate('');
    setBlockEndDate('');
    setBlockReason('');
    setBlockError('');
  };

  const handleAddBlockedDate = async (e) => {
    e.preventDefault();
    setBlockError('');

    if (!blockStartDate || !blockEndDate) {
      setBlockError('Please pick both a start and end date');
      return;
    }

    try {
      setBlockSubmitting(true);
      const res = await api.addBlockedDate(manageDatesItem._id, {
        startDate: blockStartDate,
        endDate: blockEndDate,
        reason: blockReason
      });

      setManageDatesItem(prev => ({ ...prev, blockedDates: res.blockedDates }));
      setListings(prev => prev.map(i => i._id === manageDatesItem._id ? { ...i, blockedDates: res.blockedDates } : i));
      setBlockStartDate('');
      setBlockEndDate('');
      setBlockReason('');
    } catch (err) {
      setBlockError(err.message || 'Failed to block dates');
    } finally {
      setBlockSubmitting(false);
    }
  };

  const handleRemoveBlockedDate = async (blockId) => {
    try {
      const res = await api.removeBlockedDate(manageDatesItem._id, blockId);
      setManageDatesItem(prev => ({ ...prev, blockedDates: res.blockedDates }));
      setListings(prev => prev.map(i => i._id === manageDatesItem._id ? { ...i, blockedDates: res.blockedDates } : i));
    } catch (err) {
      alert(err.message || 'Failed to remove blocked dates');
    }
  };

  return (
    <div className="space-y-6 py-6 animate-in fade-in">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            My Resource Listings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your listed items, toggle availability status, or edit prices
          </p>
        </div>

        <button
          onClick={onAddNew}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center space-x-2 w-fit"
        >
          <PlusCircle className="w-4 h-4" />
          <span>List New Item</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center font-bold">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            You haven't listed any items yet
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Do you have unused graphing calculators, lab sensors, textbooks, or electronics? Share them with fellow CS students!
          </p>
          <button
            onClick={onAddNew}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition inline-flex items-center space-x-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Publish Your First Listing</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((item) => (
            <div
              key={item._id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="relative h-40 bg-slate-100 dark:bg-slate-800">
                  <img
                    src={item.images[0] || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=800'}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-3 left-3 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {item.category}
                  </span>
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {item.description}
                  </p>

                  <div className="pt-2 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                    <span>₹{item.rentPricePerDay} / day</span>
                    <span className="text-slate-400 font-normal">Deposit: ₹{item.securityDeposit}</span>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">

                {/* Availability Toggle */}
                <button
                  onClick={() => handleToggleAvailability(item)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                    item.availability
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {item.availability ? (
                    <>
                      <ToggleRight className="w-4 h-4 text-emerald-600" />
                      <span>Available</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-4 h-4 text-amber-600" />
                      <span>Off / Rented</span>
                    </>
                  )}
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openManageDates(item)}
                    className="p-1.5 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
                    title="Manage Unavailable Dates"
                  >
                    <CalendarX2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onViewDetails(item)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
                    title="View Item Details"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onEditItem(item)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
                    title="Edit Listing"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteItem(item._id)}
                    className="p-1.5 text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
                    title="Delete Listing"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </div>

            </div>
          ))}
        </div>
      )}

      {/* Manage Unavailable Dates Modal */}
      {manageDatesItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Manage Unavailable Dates
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                  {manageDatesItem.title}
                </p>
              </div>
              <button
                onClick={() => setManageDatesItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Existing blocked ranges */}
            {(manageDatesItem.blockedDates || []).length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Currently Blocked
                </span>
                <div className="space-y-1.5">
                  {manageDatesItem.blockedDates.map((d) => (
                    <div
                      key={d._id}
                      className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950/50 rounded-xl text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {new Date(d.startDate).toLocaleDateString('en-IN')} – {new Date(d.endDate).toLocaleDateString('en-IN')}
                        </span>
                        {d.reason && (
                          <p className="text-[10px] text-slate-400">{d.reason}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveBlockedDate(d._id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-lg"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {blockError && (
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300 text-xs font-semibold">
                {blockError}
              </div>
            )}

            {/* Add new blocked range form */}
            <form onSubmit={handleAddBlockedDate} className="space-y-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Block New Dates
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">From</label>
                  <input
                    type="date"
                    required
                    value={blockStartDate}
                    onChange={(e) => setBlockStartDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">To</label>
                  <input
                    type="date"
                    required
                    min={blockStartDate}
                    value={blockEndDate}
                    onChange={(e) => setBlockEndDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Reason (optional)</label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="e.g. Out of town, item under repair"
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                />
              </div>
              <button
                type="submit"
                disabled={blockSubmitting}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition disabled:opacity-50"
              >
                {blockSubmitting ? 'Blocking...' : 'Block These Dates'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};