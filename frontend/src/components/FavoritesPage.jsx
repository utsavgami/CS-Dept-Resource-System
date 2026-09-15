import React, { useState, useEffect } from 'react';
import { api, getRecentlyViewed, clearRecentlyViewed } from '../lib/apiClient';
import { Heart, Clock, MapPin, Trash2 } from 'lucide-react';

export const FavoritesPage = ({ onSelectItem }) => {
  const [activeTab, setActiveTab] = useState('favorites');
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  useEffect(() => {
    loadFavorites();
    setRecentlyViewed(getRecentlyViewed());
  }, []);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const res = await api.getFavorites();
      setFavorites(res.items || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (itemId) => {
    try {
      await api.toggleFavorite(itemId);
      setFavorites((prev) => prev.filter((i) => i._id !== itemId));
    } catch (err) {
      alert(err.message || 'Failed to remove favorite');
    }
  };

  const handleClearHistory = () => {
    clearRecentlyViewed();
    setRecentlyViewed([]);
  };

  const list = activeTab === 'favorites' ? favorites : recentlyViewed;

  return (
    <div className="space-y-6 py-6 animate-in fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Saved & Recently Viewed
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Quickly get back to items you've liked or looked at before, without searching again
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'favorites'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Favorites ({favorites.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'recent'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Recently Viewed ({recentlyViewed.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'recent' && recentlyViewed.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleClearHistory}
            className="text-xs text-red-600 dark:text-red-400 font-bold hover:underline flex items-center space-x-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>
      )}

      {/* List */}
      {activeTab === 'favorites' && loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          {activeTab === 'favorites' ? (
            <>
              <Heart className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                No favorites saved yet
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Tap the heart icon on any item's page to save it here for quick access later.
              </p>
            </>
          ) : (
            <>
              <Clock className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                No recently viewed items
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Items you open will show up here automatically.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.map((item) => (
            <div
              key={item._id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div
                onClick={() => onSelectItem(item)}
                className="cursor-pointer"
              >
                <div className="relative h-40 bg-slate-100 dark:bg-slate-800">
                  <img
                    src={item.images?.[0] || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=800'}
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
                  {item.pickupLocation && (
                    <div className="flex items-center space-x-1 text-xs text-slate-500 dark:text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">{item.pickupLocation}</span>
                    </div>
                  )}
                  <p className="text-sm font-black text-blue-600 dark:text-blue-400">
                    ₹{item.rentPricePerDay} <span className="text-[10px] text-slate-400 font-normal">/ day</span>
                  </p>
                </div>
              </div>

              {activeTab === 'favorites' && (
                <div className="px-4 pb-3">
                  <button
                    onClick={() => handleRemoveFavorite(item._id)}
                    className="w-full py-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 rounded-xl text-xs font-bold hover:bg-red-100 transition flex items-center justify-center space-x-1.5"
                  >
                    <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                    <span>Remove from Favorites</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
};