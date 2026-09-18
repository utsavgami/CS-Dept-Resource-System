import React, { useState, useEffect } from 'react';
import { api } from '../lib/apiClient';
import {
  Laptop,
  Search,
  PlusCircle,
  MessageSquare,
  ShieldCheck,
  User as UserIcon,
  Bell,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  FileCode,
  Sparkles
} from 'lucide-react';

export const Navbar = ({
  user,
  activeTab,
  setActiveTab,
  onLogout,
  onOpenDemoModal,
  darkMode,
  setDarkMode
}) => {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
    } catch {
      // ignore transient error
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = async (id, link) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      if (link) {
        if (link.includes('booking')) setActiveTab('bookings');
        else if (link.includes('messages') || link.includes('chat')) setActiveTab('messages');
        else if (link.includes('complaint')) setActiveTab('complaints');
      }
      setShowNotifications(false);
    } catch {
      // ignore
    }
  };

  return (
    <nav className="app-navbar sticky top-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/80 dark:border-indigo-900/40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo & CS Dept Badge */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-10 h-10 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center font-bold shadow-sm shadow-indigo-500/30 border border-indigo-500/20">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-display font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                  CS Dept <span className="text-indigo-600 dark:text-indigo-400">Share & Rent</span>
                </span>
                {/* <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/80 tracking-wider">
                  CS EDU ONLY
                </span> */}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block">

              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-1 font-medium text-sm">
            <button
              onClick={() => setActiveTab('explore')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'explore'
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-300 font-semibold border border-indigo-200/60 dark:border-indigo-800/60'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Explore Items</span>
            </button>

            {user && (
              <>
                <button
                  onClick={() => setActiveTab('add-item')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'add-item'
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-300 font-semibold border border-indigo-200/60 dark:border-indigo-800/60'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>List Item</span>
                </button>

                <button
                  onClick={() => setActiveTab('messages')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'messages'
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-300 font-semibold border border-indigo-200/60 dark:border-indigo-800/60'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Chat</span>
                </button>
              </>
            )}

            {user?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-colors ${
                  activeTab === 'admin'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-semibold border border-purple-200 dark:border-purple-800'
                    : 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin Panel</span>
              </button>
            )}

             
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-3">

            {/* Quick Demo Login Switcher Button */}
            <button
              onClick={onOpenDemoModal}
              className="flex items-center space-x-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80 hover:bg-emerald-100 transition"
              title="Switch demo student/admin accounts instantly"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Demo Switcher</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Toggle Theme"
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notification Bell */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Popup Drawer */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                        <Bell className="w-4 h-4 text-blue-600" />
                        <span>Notifications</span>
                      </h4>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {unreadCount} new
                      </span>
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 my-2">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-6">No notifications yet</p>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n._id}
                            onClick={() => markRead(n._id, n.link)}
                            className={`py-2.5 px-2 rounded-lg cursor-pointer transition text-xs ${
                              n.read
                                ? 'opacity-70 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                : 'bg-blue-50/70 dark:bg-blue-950/40 font-medium hover:bg-blue-100/50'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-semibold text-slate-900 dark:text-slate-100">{n.title}</span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 mt-1">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Profile / Auth buttons */}
            {user ? (
              <div className="flex items-center space-x-2 border-l border-slate-200 dark:border-slate-800 pl-3">
                <button
                  onClick={() => setActiveTab('profile')}
                  className="flex items-center space-x-2 text-left hover:opacity-80 transition"
                >
                  <img
                    src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
                    alt={user.name}
                    className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                  />
                  <div className="hidden md:block">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                      {user.name}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                      {user.role} • {user.semester}
                    </p>
                  </div>
                </button>

                <button
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveTab('login')}
                  className="text-xs font-bold px-3 py-2 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  Student Login
                </button>
                <button
                  onClick={() => setActiveTab('register')}
                  className="text-xs font-bold px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition"
                >
                  Register
                </button>
              </div>
            )}

            {/* Mobile Hamburger Toggle */}
            <div className="flex lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 space-y-2">
          <button
            onClick={() => { setActiveTab('explore'); setMobileMenuOpen(false); }}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Explore Resource Listings
          </button>
          {user && (
            <>
              <button
                onClick={() => { setActiveTab('add-item'); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                + List New Item
              </button>
              <button
                onClick={() => { setActiveTab('messages'); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Chat Messages
              </button>
              <button
                onClick={() => { setActiveTab('profile'); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                My Profile
              </button>
            </>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={() => { setActiveTab('admin'); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30"
            >
              Admin Dashboard
            </button>
          )}

        </div>
      )}
    </nav>
  );
};
