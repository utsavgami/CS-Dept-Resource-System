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

// Fetches a login-protected file (e.g. a complaint proof) and returns it as a
// Blob. <img src> / <a href> can't send the login token, so the file is
// fetched here and shown from memory. Only images and PDFs are accepted.
export async function fetchProtectedFile(url) {
  const token = getAuthToken();
  const response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) {
    throw new Error('Could not load the file');
  }
  const blob = await response.blob();
  if (!/^(image\/(png|jpeg|gif|webp)|application\/pdf)$/.test(blob.type)) {
    throw new Error('Unsupported file type');
  }
  return blob;
}

// A plain fetch() with no server response (slow/blocked network, backend
// hung on something like a slow SMTP connection) waits indefinitely — this
// is why "Send OTP" could look permanently stuck. Aborting after 20s turns
// that into a clear, actionable error instead of an endless spinner.
const REQUEST_TIMEOUT_MS = 20000;

async function fetchWithAuth(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API Request failed');
  }

  return data;
}

// Same as fetchWithAuth, but for multipart/form-data uploads. The browser
// must set its own Content-Type (with the multipart boundary), so we only
// attach the Authorization header here.
async function fetchWithAuthFile(endpoint, formData) {
  const token = getAuthToken();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

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
  sendOtp: (data) => fetchWithAuth('/auth/send-otp', { method: 'POST', body: JSON.stringify(data) }),
  verifyOtp: (data) => fetchWithAuth('/auth/verify-otp', { method: 'POST', body: JSON.stringify(data) }),
  forgotPasswordSendOtp: (data) => fetchWithAuth('/auth/forgot-password/send-otp', { method: 'POST', body: JSON.stringify(data) }),
  forgotPasswordVerifyOtp: (data) => fetchWithAuth('/auth/forgot-password/verify-otp', { method: 'POST', body: JSON.stringify(data) }),
  resetPassword: (data) => fetchWithAuth('/auth/forgot-password/reset', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => fetchWithAuth('/auth/me'),
  logout: () => fetchWithAuth('/auth/logout', { method: 'POST' }),

  // Users
  getUserProfile: (id) => fetchWithAuth(`/users/${id}`),
  updateProfile: (data) => fetchWithAuth('/users/profile', { method: 'PUT', body: JSON.stringify(data) }),
  // Profile photo is uploaded as a real file (multipart) to /users/avatar,
  // saved to disk on the server, and only the resulting URL is stored on
  // the user record — not the image bytes.
  uploadProfileImage: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return fetchWithAuthFile('/users/avatar', formData);
  },
  removeProfileImage: () => fetchWithAuth('/users/avatar', { method: 'DELETE' }),

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
  getConversations: () => fetchWithAuth('/chat/conversations'),
  getMessages: (bookingId) => fetchWithAuth(`/chat/messages/${bookingId}`),
  markConversationRead: (bookingId) => fetchWithAuth(`/chat/messages/${bookingId}/read`, { method: 'PUT' }),
  sendMessage: (data) =>
    fetchWithAuth('/chat/messages', { method: 'POST', body: JSON.stringify(data) }),

  // Direct messages (student <-> admin, no booking involved)
  getAdminContact: () => fetchWithAuth('/messages/direct/admin-contact'),
  getAdminInbox: () => fetchWithAuth('/messages/direct'),
  getDirectThread: (userId) => fetchWithAuth(`/messages/direct/${userId}`),
  sendDirectMessage: (data) =>
    fetchWithAuth('/messages/direct', { method: 'POST', body: JSON.stringify(data) }),

  // Complaints
  createComplaint: (data) => fetchWithAuth('/complaints', { method: 'POST', body: JSON.stringify(data) }),
  getMyComplaints: () => fetchWithAuth('/complaints/my'),
  uploadComplaintProof: (file) => {
    const formData = new FormData();
    formData.append('proof', file);
    return fetchWithAuthFile('/complaints/proof', formData);
  },

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