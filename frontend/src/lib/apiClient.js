const API_BASE = '/api';

export function getAuthToken() {
  return localStorage.getItem('cs_sharing_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('cs_sharing_token', token);
  } else {
    localStorage.removeItem('cs_sharing_token');
  }
}

export function getStoredUser() {
  const data = localStorage.getItem('cs_sharing_user');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) {
    localStorage.setItem('cs_sharing_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('cs_sharing_user');
  }
}

async function fetchWithAuth(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API Request failed');
  }

  return data;
}

export const api = {
  // Auth
  register: (data) => fetchWithAuth('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => fetchWithAuth('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => fetchWithAuth('/auth/me'),

  // Users
  getUserProfile: (id) => fetchWithAuth(`/users/${id}`),
  updateProfile: (data) => fetchWithAuth('/users/profile', { method: 'PUT', body: JSON.stringify(data) }),

  // Items
  getItems: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchWithAuth(`/items?${query}`);
  },
  getItemById: (id) => fetchWithAuth(`/items/${id}`),
  getMyListings: () => fetchWithAuth('/items/my/listings'),
  createItem: (data) => fetchWithAuth('/items', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id, data) => fetchWithAuth(`/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteItem: (id) => fetchWithAuth(`/items/${id}`, { method: 'DELETE' }),

  // Bookings
  createBooking: (data) =>
    fetchWithAuth('/bookings', { method: 'POST', body: JSON.stringify(data) }),
  getMyBookings: () => fetchWithAuth('/bookings/my'),
  updateBookingStatus: (id, status) =>
    fetchWithAuth(`/bookings/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // Chat
  getMessages: (bookingId) => fetchWithAuth(`/chat/messages/${bookingId}`),
  sendMessage: (data) =>
    fetchWithAuth('/chat/messages', { method: 'POST', body: JSON.stringify(data) }),

  // Complaints
  createComplaint: (data) => fetchWithAuth('/complaints', { method: 'POST', body: JSON.stringify(data) }),
  getMyComplaints: () => fetchWithAuth('/complaints/my'),

  // Ratings
  createRating: (data) =>
    fetchWithAuth('/ratings', { method: 'POST', body: JSON.stringify(data) }),
  getUserRatings: (userId) => fetchWithAuth(`/ratings/user/${userId}`),

  // Notifications
  getNotifications: () => fetchWithAuth('/notifications'),
  markNotificationRead: (id) => fetchWithAuth(`/notifications/${id}/read`, { method: 'PUT' }),

  // Admin
  getAdminStats: () => fetchWithAuth('/admin/stats'),
  getAdminUsers: () => fetchWithAuth('/admin/users'),
  toggleUserBlock: (userId, isBlocked) =>
    fetchWithAuth(`/admin/users/${userId}/block`, { method: 'PUT', body: JSON.stringify({ isBlocked }) }),
  getAdminComplaints: () => fetchWithAuth('/admin/complaints'),
  updateComplaintStatus: (id, status, adminNote) =>
    fetchWithAuth(`/admin/complaints/${id}`, { method: 'PUT', body: JSON.stringify({ status, adminNote }) }),
  adminDeleteItem: (id) => fetchWithAuth(`/admin/items/${id}`, { method: 'DELETE' }),

  // Booked dates (per item) — merges active bookings + owner-blocked dates
  getBookedDates: (itemId) => fetchWithAuth(`/items/${itemId}/booked-dates`),

  // Owner-managed unavailable dates
  addBlockedDate: (itemId, data) => fetchWithAuth(`/items/${itemId}/blocked-dates`, { method: 'POST', body: JSON.stringify(data) }),
  removeBlockedDate: (itemId, blockId) => fetchWithAuth(`/items/${itemId}/blocked-dates/${blockId}`, { method: 'DELETE' }),

  // Favorites
  getFavorites: () => fetchWithAuth('/favorites'),
  toggleFavorite: (itemId) => fetchWithAuth(`/favorites/${itemId}`, { method: 'POST' })
};

// ----------------------------------------------------
// Recently Viewed (client-side only, stored in localStorage)
// ----------------------------------------------------
const RECENTLY_VIEWED_KEY = 'cs_sharing_recently_viewed';
const RECENTLY_VIEWED_MAX = 20;

export function addToRecentlyViewed(item) {
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((i) => i._id !== item._id);
    filtered.unshift({
      _id: item._id,
      title: item.title,
      images: item.images,
      rentPricePerDay: item.rentPricePerDay,
      category: item.category,
      viewedAt: new Date().toISOString()
    });
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(filtered.slice(0, RECENTLY_VIEWED_MAX)));
  } catch {
    // ignore storage errors (e.g. private browsing quota)
  }
}

export function getRecentlyViewed() {
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearRecentlyViewed() {
  localStorage.removeItem(RECENTLY_VIEWED_KEY);
}