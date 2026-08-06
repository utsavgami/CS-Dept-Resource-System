export type UserRole = 'student' | 'admin';

export interface User {
  _id: string;
  name: string;
  email: string;
  enrollmentNumber: string;
  mobileNumber: string;
  department: string;
  semester: string;
  role: UserRole;
  verified: boolean;
  isBlocked: boolean;
  avatar?: string;
  complaintCount: number;
  averageRating?: number;
  totalRatings?: number;
  createdAt: string;
  updatedAt: string;
}

export type ItemCategory = 
  | 'Books'
  | 'Calculators'
  | 'Laptop Accessories'
  | 'Electronics'
  | 'Lab Equipment'
  | 'Project Components'
  | 'Sports Items'
  | 'Other';

export type ItemCondition = 'New' | 'Like New' | 'Good' | 'Fair';

export interface Item {
  _id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  ownerAvatar?: string;
  ownerSemester?: string;
  title: string;
  category: ItemCategory;
  description: string;
  images: string[];
  rentPricePerDay: number;
  securityDeposit: number;
  availability: boolean;
  condition: ItemCondition;
  pickupLocation: string;
  createdAt: string;
  updatedAt: string;
}

export type BookingStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Completed';

export interface Booking {
  _id: string;
  itemId: string;
  itemTitle: string;
  itemImage?: string;
  itemCategory?: string;
  rentPricePerDay: number;
  securityDeposit: number;
  borrowerId: string;
  borrowerName: string;
  borrowerEmail: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalCost: number;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  bookingId: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

export type ComplaintType = 
  | 'Demanding More Money'
  | 'Fake Listing'
  | 'Damaged Item'
  | 'Fraud'
  | 'Misbehavior'
  | 'Other';

export type ComplaintStatus = 'Pending' | 'Under Review' | 'Resolved';

export interface Complaint {
  _id: string;
  reporterId: string;
  reporterName: string;
  reportedUserId: string;
  reportedUserName: string;
  bookingId?: string;
  itemTitle?: string;
  type: ComplaintType;
  description: string;
  proofUrl?: string;
  status: ComplaintStatus;
  adminNote?: string;
  createdAt: string;
}

export interface Rating {
  _id: string;
  bookingId: string;
  itemId?: string;
  reviewerId: string;
  reviewerName: string;
  revieweeId: string;
  stars: number;
  comment: string;
  createdAt: string;
}

export interface AppNotification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: 'booking' | 'chat' | 'complaint' | 'system' | 'rating';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface SystemStats {
  totalStudents: number;
  activeListings: number;
  totalBookings: number;
  pendingComplaints: number;
  blockedUsers: number;
  totalRentalVolume: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
}
