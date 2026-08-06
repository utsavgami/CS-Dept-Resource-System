import { User, Item, Booking, Message, Complaint, Rating, AppNotification, SystemStats } from '../types';

const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('cs_sharing_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('cs_sharing_token', token);
  } else {
    localStorage.removeItem('cs_sharing_token');
  }
}

export function getStoredUser(): User | null {
  const data = localStorage.getItem('cs_sharing_user');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setStoredUser(user: User | null) {
  if (user) {
    localStorage.setItem('cs_sharing_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('cs_sharing_user');
  }
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
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
  register: (data: any) => fetchWithAuth('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: any) => fetchWithAuth('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => fetchWithAuth('/auth/me'),

  // Users
  getUserProfile: (id: string) => fetchWithAuth(`/users/${id}`),
  updateProfile: (data: any) => fetchWithAuth('/users/profile', { method: 'PUT', body: JSON.stringify(data) }),

  // Items
  getItems: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchWithAuth(`/items?${query}`);
  },
  getItemById: (id: string) => fetchWithAuth(`/items/${id}`),
  getMyListings: () => fetchWithAuth('/items/my/listings'),
  createItem: (data: any) => fetchWithAuth('/items', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id: string, data: any) => fetchWithAuth(`/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteItem: (id: string) => fetchWithAuth(`/items/${id}`, { method: 'DELETE' }),

  // Bookings
  createBooking: (data: { itemId: string; startDate: string; endDate: string }) => 
    fetchWithAuth('/bookings', { method: 'POST', body: JSON.stringify(data) }),
  getMyBookings: () => fetchWithAuth('/bookings/my'),
  updateBookingStatus: (id: string, status: string) => 
    fetchWithAuth(`/bookings/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // Chat
  getMessages: (bookingId: string) => fetchWithAuth(`/chat/messages/${bookingId}`),
  sendMessage: (data: { bookingId: string; content: string }) => 
    fetchWithAuth('/chat/messages', { method: 'POST', body: JSON.stringify(data) }),

  // Complaints
  createComplaint: (data: any) => fetchWithAuth('/complaints', { method: 'POST', body: JSON.stringify(data) }),
  getMyComplaints: () => fetchWithAuth('/complaints/my'),

  // Ratings
  createRating: (data: { bookingId: string; revieweeId: string; stars: number; comment: string }) => 
    fetchWithAuth('/ratings', { method: 'POST', body: JSON.stringify(data) }),
  getUserRatings: (userId: string) => fetchWithAuth(`/ratings/user/${userId}`),

  // Notifications
  getNotifications: () => fetchWithAuth('/notifications'),
  markNotificationRead: (id: string) => fetchWithAuth(`/notifications/${id}/read`, { method: 'PUT' }),

  // Admin
  getAdminStats: () => fetchWithAuth('/admin/stats'),
  getAdminUsers: () => fetchWithAuth('/admin/users'),
  toggleUserBlock: (userId: string, isBlocked: boolean) => 
    fetchWithAuth(`/admin/users/${userId}/block`, { method: 'PUT', body: JSON.stringify({ isBlocked }) }),
  getAdminComplaints: () => fetchWithAuth('/admin/complaints'),
  updateComplaintStatus: (id: string, status: string, adminNote?: string) => 
    fetchWithAuth(`/admin/complaints/${id}`, { method: 'PUT', body: JSON.stringify({ status, adminNote }) }),
  adminDeleteItem: (id: string) => fetchWithAuth(`/admin/items/${id}`, { method: 'DELETE' })
};
