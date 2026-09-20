import React, { useState, useEffect } from 'react';
import { api } from '../lib/apiClient';
import {
  Search,
  Sparkles,
  ShieldCheck,
  BookOpen,
  Calculator,
  Cpu,
  Microscope,
  FolderKanban,
  Laptop,
  Activity,
  ArrowRight,
  Star,
  MapPin,
  Clock,
  AlertCircle,
  Users,
  CheckCircle2
} from 'lucide-react';

export const LandingPage = ({
  user,
  setActiveTab,
  onSelectItem,
  onOpenDemoModal
}) => {
  const [recentItems, setRecentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadRecentItems();
  }, []);

  const loadRecentItems = async () => {
    try {
      setLoading(true);
      const res = await api.getItems();
      setRecentItems((res.items || []).slice(0, 6));
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { name: 'Calculators', icon: Calculator, count: 'TI-84, Casio' },
    { name: 'Books', icon: BookOpen, count: 'CLRS, OS, Networking' },
    { name: 'Electronics', icon: Cpu, count: 'Raspberry Pi, Sensors' },
    { name: 'Lab Equipment', icon: Microscope, count: 'Oscilloscopes, DMM' },
    { name: 'Project Components', icon: FolderKanban, count: 'Arduino, ESP32' },
    { name: 'Laptop Accessories', icon: Laptop, count: 'Docks, Monitors' },
    { name: 'Sports Items', icon: Activity, count: 'Rackets, Balls' }
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveTab(`explore?q=${encodeURIComponent(searchQuery)}`);
    } else {
      setActiveTab('explore');
    }
  };

  return (
    <div className="space-y-16 py-6 animate-in fade-in">

      {/* Hero Section */}
      <div className="relative rounded-2xl bg-indigo-950 bg-grid-pattern text-white p-8 sm:p-12 lg:p-16 overflow-hidden shadow-xl border border-indigo-900/60">

        {/* Geometric Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />

        {/* Background glow effects */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-md bg-indigo-900/80 border border-indigo-700/60 text-indigo-300 text-xs font-semibold backdrop-blur-sm tracking-wide">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>VERIFIED CS DEPARTMENT PEER RESOURCE EXCHANGE</span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Share, Rent & Borrow <br />
            <span className="bg-gradient-to-r from-indigo-300 via-indigo-200 to-violet-300 bg-clip-text text-transparent">
              CS Lab Equipment & Textbooks
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl font-sans">
            Save hundreds of rupees on graphing calculators, Raspberry Pi kits, digital oscilloscopes, and algorithm textbooks. Rent safely from verified CS department peers with built-in real-time chat, security deposit management, and complaint auto-blocking!
          </p>

          {/* Quick Search Input */}
          <form onSubmit={handleSearchSubmit} className="pt-2 flex flex-col sm:flex-row gap-3 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-indigo-300/60" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search TI-84, Raspberry Pi, CLRS Algorithms..."
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-indigo-900/40 text-white placeholder-slate-400 border border-indigo-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 backdrop-blur-md text-sm transition"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition text-sm flex items-center justify-center space-x-2 shrink-0 border border-indigo-400/30"
            >
              <span>Search Resources</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Switcher CTA */}
          <div className="pt-4 flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <span>Want to test immediately?</span>
            <button
              type="button"
              onClick={onOpenDemoModal}
              className="px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 rounded-lg font-bold flex items-center space-x-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Switch Demo Accounts (Student)</span>
            </button>
          </div>

        </div>
      </div>

      {/* Category Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Browse CS Department Categories
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select a category to view available student listings
            </p>
          </div>
          <button
            onClick={() => setActiveTab('explore')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.name}
                onClick={() => setActiveTab(`explore?cat=${encodeURIComponent(cat.name)}`)}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition cursor-pointer text-center group flex flex-col items-center justify-between h-36"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 transition">
                    {cat.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{cat.count}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Listings Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Featured CS Department Listings
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Recently listed resources by verified Computer Science students
            </p>
          </div>
          <button
            onClick={() => setActiveTab('explore')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
          >
            <span>Explore All Items</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-72 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : recentItems.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
            <p className="text-sm text-slate-500">No items available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentItems.map((item) => (
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

                  {/* Card Content */}
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
                        Condition: {item.condition}
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

      {/* Safety & Policy Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            100% CS Department Verified
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Only registered Computer Science students with valid college email addresses and enrollment numbers can access the platform.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            5-Complaint Auto-Block Engine
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Automatic security protocol: If a user receives 5 verified complaints (fake listing, extortion, damaged item), their account is automatically blocked.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Real-Time Chat & Ratings
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Direct Socket.io messaging between borrower and lender to coordinate pickup locations on campus. 5-star ratings build student reputation!
          </p>
        </div>

      </div>

    </div>
  );
};
