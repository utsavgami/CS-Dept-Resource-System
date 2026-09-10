import React, { useState, useEffect } from 'react';
import { api } from '../lib/apiClient';
import {
  Search,
  Filter,
  MapPin,
  DollarSign,
  CheckCircle2,
  Clock,
  SlidersHorizontal,
  Tag,
  Layers
} from 'lucide-react';

export const ExploreItemsPage = ({
  onSelectItem,
  initialCategory,
  initialQuery
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState(initialQuery || '');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'All');
  const [selectedCondition, setSelectedCondition] = useState('All');
  const [maxPrice, setMaxPrice] = useState(50);
  const [availableOnly, setAvailableOnly] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [search, selectedCategory, selectedCondition, maxPrice, availableOnly]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (selectedCategory && selectedCategory !== 'All') params.category = selectedCategory;
      if (selectedCondition && selectedCondition !== 'All') params.condition = selectedCondition;
      if (maxPrice < 50) params.maxPrice = String(maxPrice);
      if (availableOnly) params.availableOnly = 'true';

      const res = await api.getItems(params);
      setItems(res.items || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'All',
    'Books',
    'Calculators',
    'Laptop Accessories',
    'Electronics',
    'Lab Equipment',
    'Project Components',
    'Sports Items',
    'Other'
  ];

  return (
    <div className="space-y-8 py-6 animate-in fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Explore CS Department Resources
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Search, filter, and rent books, lab equipment, and calculators listed by fellow students
          </p>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, description, or pickup location..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs font-bold text-slate-500 shrink-0 flex items-center space-x-1 pr-2">
            <Layers className="w-3.5 h-3.5" />
            <span>Category:</span>
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sub Filters Row */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">

          {/* Condition selector */}
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-600 dark:text-slate-400">Condition:</span>
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
            >
              <option value="All">All Conditions</option>
              <option value="New">New</option>
              <option value="Like New">Like New</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
            </select>
          </div>

          {/* Max Price Slider */}
          <div className="flex items-center space-x-3">
            <span className="font-semibold text-slate-600 dark:text-slate-400">
              Max Rent / Day: <strong className="text-blue-600 dark:text-blue-400">₹{maxPrice}</strong>
            </span>
            <input
              type="range"
              min="1"
              max="50"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-28 accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Availability Toggle */}
          <label className="flex items-center space-x-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600"
            />
            <span>Available Items Only</span>
          </label>

          {/* Clear Filters button */}
          {(search || selectedCategory !== 'All' || selectedCondition !== 'All' || maxPrice < 50 || availableOnly) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('All');
                setSelectedCondition('All');
                setMaxPrice(50);
                setAvailableOnly(false);
              }}
              className="text-xs text-red-600 dark:text-red-400 font-bold hover:underline"
            >
              Reset Filters
            </button>
          )}

        </div>

      </div>

      {/* Item Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-80 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <p className="text-base font-bold text-slate-700 dark:text-slate-200">
            No resources match your search criteria.
          </p>
          <p className="text-xs text-slate-500">
            Try adjusting your search query, price slider, or selecting a different category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item._id}
              onClick={() => onSelectItem(item)}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between group"
            >
              <div>
                {/* Image Container */}
                <div className="relative h-48 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <img
                    src={item.images[0] || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=800'}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20">
                    {item.category}
                  </span>
                  <span className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    item.availability
                      ? 'bg-emerald-500/90 text-white'
                      : 'bg-red-500/90 text-white'
                  }`}>
                    {item.availability ? 'Available' : 'Rented Out'}
                  </span>
                </div>

                {/* Content */}
                <div className="p-5 space-y-3">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 transition">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-1 text-slate-500 dark:text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate max-w-[150px]">{item.pickupLocation}</span>
                    </div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {item.condition}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-5 py-3.5 bg-slate-50/70 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-base font-black text-blue-600 dark:text-blue-400">
                    ₹{item.rentPricePerDay}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium"> / day</span>
                  {item.securityDeposit > 0 && (
                    <p className="text-[10px] text-slate-400">Deposit: ₹{item.securityDeposit}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <img
                    src={item.ownerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.ownerName}`}
                    alt={item.ownerName}
                    className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-700 object-cover"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {item.ownerName.split(' ')[0]}
                  </span>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};
