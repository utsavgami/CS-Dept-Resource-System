import React, { useState, useEffect } from 'react';
import { User, Item, Booking } from './types';
import { api, getStoredUser, setStoredUser, setAuthToken } from './lib/apiClient';

// Components
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './components/LandingPage';
import { ExploreItemsPage } from './components/ExploreItemsPage';
import { ItemDetailsPage } from './components/ItemDetailsPage';
import { AddItemPage } from './components/AddItemPage';
import { MyListingsPage } from './components/MyListingsPage';
import { MyBookingsPage } from './components/MyBookingsPage';
import { MessagesPage } from './components/MessagesPage';
import { ComplaintsPage } from './components/ComplaintsPage';
import { ProfilePage } from './components/ProfilePage';
import { AdminDashboardPage } from './components/AdminDashboardPage';
import { DocsPage } from './components/DocsPage';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { QuickDemoLoginModal } from './components/QuickDemoLoginModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getStoredUser());
  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [chatBookingId, setChatBookingId] = useState<string | undefined>(undefined);
  const [complaintBooking, setComplaintBooking] = useState<Booking | null>(null);

  const [showDemoModal, setShowDemoModal] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('cs_sharing_theme') === 'dark';
  });

  // Apply dark mode class to html document element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('cs_sharing_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('cs_sharing_theme', 'light');
    }
  }, [darkMode]);

  // Validate stored user session on boot
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await api.getMe();
        if (res.user) {
          setCurrentUser(res.user);
          setStoredUser(res.user);
        }
      } catch {
        // invalid token
        setCurrentUser(null);
        setStoredUser(null);
        setAuthToken(null);
      }
    };
    if (currentUser) {
      checkSession();
    }
  }, []);

  const handleLogout = () => {
    setAuthToken(null);
    setStoredUser(null);
    setCurrentUser(null);
    setActiveTab('home');
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveTab('home');
  };

  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    setActiveTab('item-details');
  };

  const handleOpenChatForBooking = (bookingId: string) => {
    setChatBookingId(bookingId);
    setActiveTab('messages');
  };

  const handleOpenComplaintForBooking = (booking: Booking) => {
    setComplaintBooking(booking);
    setActiveTab('complaints');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between font-sans transition-colors duration-200">
      
      {/* Top Navigation Bar */}
      <Navbar
        user={currentUser}
        activeTab={activeTab.split('?')[0]}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onLogout={handleLogout}
        onOpenDemoModal={() => setShowDemoModal(true)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 w-full">
        
        {/* Landing Page */}
        {activeTab === 'home' && (
          <LandingPage
            user={currentUser}
            setActiveTab={setActiveTab}
            onSelectItem={handleSelectItem}
            onOpenDemoModal={() => setShowDemoModal(true)}
          />
        )}

        {/* Explore Items */}
        {activeTab.startsWith('explore') && (
          <ExploreItemsPage
            onSelectItem={handleSelectItem}
            initialCategory={
              activeTab.includes('cat=') 
                ? decodeURIComponent(activeTab.split('cat=')[1].split('&')[0]) 
                : undefined
            }
            initialQuery={
              activeTab.includes('q=') 
                ? decodeURIComponent(activeTab.split('q=')[1].split('&')[0]) 
                : undefined
            }
          />
        )}

        {/* Item Details View */}
        {activeTab === 'item-details' && selectedItem && (
          <ItemDetailsPage
            item={selectedItem}
            currentUser={currentUser}
            onBack={() => setActiveTab('explore')}
            onBookingSuccess={() => setActiveTab('bookings')}
            onRequireLogin={() => setActiveTab('login')}
          />
        )}

        {/* Add / Edit Listing */}
        {activeTab === 'add-item' && (
          currentUser ? (
            <AddItemPage
              editingItem={editingItem}
              onSuccess={() => {
                setEditingItem(null);
                setActiveTab('my-listings');
              }}
              onCancel={() => {
                setEditingItem(null);
                setActiveTab('my-listings');
              }}
            />
          ) : (
            <LoginPage
              onSuccess={handleLoginSuccess}
              onSwitchToRegister={() => setActiveTab('register')}
              onOpenDemoModal={() => setShowDemoModal(true)}
            />
          )
        )}

        {/* My Listings */}
        {activeTab === 'my-listings' && (
          currentUser ? (
            <MyListingsPage
              currentUser={currentUser}
              onAddNew={() => {
                setEditingItem(null);
                setActiveTab('add-item');
              }}
              onEditItem={(item) => {
                setEditingItem(item);
                setActiveTab('add-item');
              }}
              onViewDetails={handleSelectItem}
            />
          ) : (
            <LoginPage
              onSuccess={handleLoginSuccess}
              onSwitchToRegister={() => setActiveTab('register')}
              onOpenDemoModal={() => setShowDemoModal(true)}
            />
          )
        )}

        {/* My Bookings */}
        {activeTab === 'bookings' && (
          currentUser ? (
            <MyBookingsPage
              currentUser={currentUser}
              onOpenChat={handleOpenChatForBooking}
              onOpenComplaint={handleOpenComplaintForBooking}
            />
          ) : (
            <LoginPage
              onSuccess={handleLoginSuccess}
              onSwitchToRegister={() => setActiveTab('register')}
              onOpenDemoModal={() => setShowDemoModal(true)}
            />
          )
        )}

        {/* Chat Messages */}
        {activeTab === 'messages' && (
          currentUser ? (
            <MessagesPage
              currentUser={currentUser}
              initialBookingId={chatBookingId}
            />
          ) : (
            <LoginPage
              onSuccess={handleLoginSuccess}
              onSwitchToRegister={() => setActiveTab('register')}
              onOpenDemoModal={() => setShowDemoModal(true)}
            />
          )
        )}

        {/* Complaints Protocol */}
        {activeTab === 'complaints' && (
          currentUser ? (
            <ComplaintsPage
              currentUser={currentUser}
              initialBooking={complaintBooking}
            />
          ) : (
            <LoginPage
              onSuccess={handleLoginSuccess}
              onSwitchToRegister={() => setActiveTab('register')}
              onOpenDemoModal={() => setShowDemoModal(true)}
            />
          )
        )}

        {/* Student Profile */}
        {activeTab === 'profile' && (
          currentUser ? (
            <ProfilePage
              currentUser={currentUser}
              onUserUpdated={(updated) => setCurrentUser(updated)}
            />
          ) : (
            <LoginPage
              onSuccess={handleLoginSuccess}
              onSwitchToRegister={() => setActiveTab('register')}
              onOpenDemoModal={() => setShowDemoModal(true)}
            />
          )
        )}

        {/* Admin Dashboard */}
        {activeTab === 'admin' && (
          currentUser?.role === 'admin' ? (
            <AdminDashboardPage />
          ) : (
            <div className="py-20 text-center space-y-3">
              <p className="text-sm font-bold text-red-600">Admin authorization required to access this panel.</p>
              <button
                onClick={() => setShowDemoModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-xs"
              >
                Switch to Admin Demo Account (Dr. Alan Turing)
              </button>
            </div>
          )
        )}

        {/* Architecture & Documentation */}
        {activeTab === 'docs' && (
          <DocsPage />
        )}

        {/* Login */}
        {activeTab === 'login' && (
          <LoginPage
            onSuccess={handleLoginSuccess}
            onSwitchToRegister={() => setActiveTab('register')}
            onOpenDemoModal={() => setShowDemoModal(true)}
          />
        )}

        {/* Register */}
        {activeTab === 'register' && (
          <RegisterPage
            onSuccess={handleLoginSuccess}
            onSwitchToLogin={() => setActiveTab('login')}
            onOpenDemoModal={() => setShowDemoModal(true)}
          />
        )}

      </main>

      {/* Footer */}
      <Footer setActiveTab={setActiveTab} />

      {/* Demo Login Switcher Modal */}
      <QuickDemoLoginModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />

    </div>
  );
}
