import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { User, Item, Booking, Message, Complaint, Rating, ItemCategory, ItemCondition } from '../src/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'cs_department_jwt_secret_key_2026';

export const apiRouter = express.Router();
apiRouter.use(express.json());

// Authentication Middleware
export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token missing or invalid' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = db.users.find(u => u._id === decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User account not found' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: 'Your account has been blocked due to policy violations or complaint threshold (5+ complaints). Contact CS Admin.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired session token' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin authorization required' });
  }
  next();
}

// ----------------------------------------------------
// AUTHENTICATION APIs
// ----------------------------------------------------

// POST /api/auth/register
apiRouter.post('/auth/register', async (req: Request, res: Response) => {
  const { name, email, enrollmentNumber, mobileNumber, password, semester, department } = req.body;

  if (!name || !email || !enrollmentNumber || !mobileNumber || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const existingEmail = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingEmail) {
    return res.status(400).json({ error: 'An account with this email already exists' });
  }

  const existingEnrollment = db.users.find(u => u.enrollmentNumber.toLowerCase() === enrollmentNumber.toLowerCase());
  if (existingEnrollment) {
    return res.status(400).json({ error: 'An account with this enrollment number already exists' });
  }

  // Verification rule: CS Department email / student check
  const isCSDept = email.toLowerCase().includes('cs') || 
                   email.toLowerCase().endsWith('.edu') || 
                   email.toLowerCase().endsWith('.ac.in') ||
                   (department && department.toLowerCase().includes('computer'));

  const newUser: User = {
    _id: `usr_std_${Date.now()}`,
    name,
    email: email.toLowerCase(),
    enrollmentNumber,
    mobileNumber,
    department: department || 'Computer Science & Engineering',
    semester: semester || '1st Semester',
    role: 'student',
    verified: isCSDept,
    isBlocked: false,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
    complaintCount: 0,
    averageRating: 5.0,
    totalRatings: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.users.push(newUser);

  const token = jwt.sign({ userId: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });

  return res.status(201).json({
    message: 'Student registered successfully',
    user: newUser,
    token
  });
});

// POST /api/auth/login
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(400).json({ error: 'Invalid email or password' });
  }

  if (user.isBlocked) {
    return res.status(403).json({ error: 'ACCOUNT BLOCKED: You have received 5 or more verified complaints. Only CS Admin can unblock your account.' });
  }

  const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

  return res.json({
    message: 'Login successful',
    user,
    token
  });
});

// GET /api/auth/me
apiRouter.get('/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: req.user });
});

// ----------------------------------------------------
// USER APIs
// ----------------------------------------------------

// GET /api/users/:id
apiRouter.get('/users/:id', (req: Request, res: Response) => {
  const user = db.users.find(u => u._id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const userListings = db.items.filter(i => i.ownerId === user._id);
  const userBookings = db.bookings.filter(b => b.borrowerId === user._id && b.status === 'Completed');
  const userRatings = db.ratings.filter(r => r.revieweeId === user._id);

  // Return non-sensitive profile
  const { ...profile } = user;
  return res.json({
    user: profile,
    listingsCount: userListings.length,
    borrowedCount: userBookings.length,
    ratings: userRatings
  });
});

// PUT /api/users/profile
apiRouter.put('/users/profile', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { name, mobileNumber, semester, avatar } = req.body;

  if (name) user.name = name;
  if (mobileNumber) user.mobileNumber = mobileNumber;
  if (semester) user.semester = semester;
  if (avatar) user.avatar = avatar;
  user.updatedAt = new Date().toISOString();

  // Update name/avatar in owned items & bookings
  db.items.forEach(item => {
    if (item.ownerId === user._id) {
      item.ownerName = user.name;
      item.ownerAvatar = user.avatar;
    }
  });

  return res.json({ message: 'Profile updated successfully', user });
});

// ----------------------------------------------------
// ITEM APIs
// ----------------------------------------------------

// GET /api/items
apiRouter.get('/items', (req: Request, res: Response) => {
  const { search, category, minPrice, maxPrice, availableOnly, condition } = req.query;

  let filtered = [...db.items];

  if (search) {
    const q = (search as string).toLowerCase();
    filtered = filtered.filter(i => 
      i.title.toLowerCase().includes(q) || 
      i.description.toLowerCase().includes(q) ||
      i.pickupLocation.toLowerCase().includes(q)
    );
  }

  if (category && category !== 'All') {
    filtered = filtered.filter(i => i.category === category);
  }

  if (condition) {
    filtered = filtered.filter(i => i.condition === condition);
  }

  if (availableOnly === 'true') {
    filtered = filtered.filter(i => i.availability === true);
  }

  if (minPrice) {
    filtered = filtered.filter(i => i.rentPricePerDay >= Number(minPrice));
  }

  if (maxPrice) {
    filtered = filtered.filter(i => i.rentPricePerDay <= Number(maxPrice));
  }

  // Sort by latest
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({ items: filtered, total: filtered.length });
});

// GET /api/items/my/listings
apiRouter.get('/items/my/listings', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const myListings = db.items.filter(i => i.ownerId === req.user!._id);
  return res.json({ items: myListings });
});

// GET /api/items/:id
apiRouter.get('/items/:id', (req: Request, res: Response) => {
  const item = db.items.find(i => i._id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Resource listing not found' });
  }

  const owner = db.users.find(u => u._id === item.ownerId);
  const ownerRatings = db.ratings.filter(r => r.revieweeId === item.ownerId);

  return res.json({
    item,
    owner: owner ? {
      _id: owner._id,
      name: owner.name,
      email: owner.email,
      department: owner.department,
      semester: owner.semester,
      avatar: owner.avatar,
      averageRating: owner.averageRating,
      totalRatings: owner.totalRatings
    } : null,
    ownerRatings
  });
});

// POST /api/items
apiRouter.post('/items', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { title, category, description, images, rentPricePerDay, securityDeposit, condition, pickupLocation } = req.body;

  if (!title || !category || !description || !rentPricePerDay || !pickupLocation) {
    return res.status(400).json({ error: 'Please provide all required item details' });
  }

  const newItem: Item = {
    _id: `itm_${Date.now()}`,
    ownerId: user._id,
    ownerName: user.name,
    ownerEmail: user.email,
    ownerPhone: user.mobileNumber,
    ownerAvatar: user.avatar,
    ownerSemester: user.semester,
    title,
    category: category as ItemCategory,
    description,
    images: Array.isArray(images) && images.length > 0 ? images : ['https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=800'],
    rentPricePerDay: Number(rentPricePerDay),
    securityDeposit: Number(securityDeposit || 0),
    availability: true,
    condition: (condition as ItemCondition) || 'Good',
    pickupLocation,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.items.unshift(newItem);

  return res.status(201).json({ message: 'Item listed successfully', item: newItem });
});

// PUT /api/items/:id
apiRouter.put('/items/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const item = db.items.find(i => i._id === req.params.id);

  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  if (item.ownerId !== user._id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized to modify this listing' });
  }

  const { title, category, description, images, rentPricePerDay, securityDeposit, availability, condition, pickupLocation } = req.body;

  if (title) item.title = title;
  if (category) item.category = category;
  if (description) item.description = description;
  if (images) item.images = images;
  if (rentPricePerDay !== undefined) item.rentPricePerDay = Number(rentPricePerDay);
  if (securityDeposit !== undefined) item.securityDeposit = Number(securityDeposit);
  if (availability !== undefined) item.availability = Boolean(availability);
  if (condition) item.condition = condition;
  if (pickupLocation) item.pickupLocation = pickupLocation;
  item.updatedAt = new Date().toISOString();

  return res.json({ message: 'Item listing updated', item });
});

// DELETE /api/items/:id
apiRouter.delete('/items/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const index = db.items.findIndex(i => i._id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const item = db.items[index];
  if (item.ownerId !== user._id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized to delete this listing' });
  }

  db.items.splice(index, 1);
  return res.json({ message: 'Listing deleted successfully' });
});

// ----------------------------------------------------
// BOOKING APIs
// ----------------------------------------------------

// POST /api/bookings
apiRouter.post('/bookings', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const borrower = req.user!;
  const { itemId, startDate, endDate } = req.body;

  if (!itemId || !startDate || !endDate) {
    return res.status(400).json({ error: 'Item ID, start date, and end date are required' });
  }

  const item = db.items.find(i => i._id === itemId);
  if (!item) {
    return res.status(404).json({ error: 'Resource item not found' });
  }

  if (!item.availability) {
    return res.status(400).json({ error: 'Item is currently unavailable for rental' });
  }

  if (item.ownerId === borrower._id) {
    return res.status(400).json({ error: 'You cannot rent your own listed item' });
  }

  // Calculate rental days
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

  const totalCost = (diffDays * item.rentPricePerDay) + item.securityDeposit;

  const newBooking: Booking = {
    _id: `bkg_${Date.now()}`,
    itemId: item._id,
    itemTitle: item.title,
    itemImage: item.images[0],
    itemCategory: item.category,
    rentPricePerDay: item.rentPricePerDay,
    securityDeposit: item.securityDeposit,
    borrowerId: borrower._id,
    borrowerName: borrower.name,
    borrowerEmail: borrower.email,
    ownerId: item.ownerId,
    ownerName: item.ownerName,
    ownerEmail: item.ownerEmail,
    startDate,
    endDate,
    totalDays: diffDays,
    totalCost,
    status: 'Pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.bookings.unshift(newBooking);

  // Notify Owner
  db.notifications.push({
    _id: `ntf_${Date.now()}`,
    userId: item.ownerId,
    title: 'New Booking Request',
    message: `${borrower.name} requested to rent "${item.title}" for ${diffDays} days.`,
    type: 'booking',
    read: false,
    link: '/bookings',
    createdAt: new Date().toISOString()
  });

  return res.status(201).json({ message: 'Booking request sent successfully', booking: newBooking });
});

// GET /api/bookings/my
apiRouter.get('/bookings/my', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!._id;

  const borrowed = db.bookings.filter(b => b.borrowerId === userId);
  const ownerRequests = db.bookings.filter(b => b.ownerId === userId);

  return res.json({ borrowed, ownerRequests });
});

// PUT /api/bookings/:id/status
apiRouter.put('/bookings/:id/status', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { status } = req.body;

  const booking = db.bookings.find(b => b._id === req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  // Permission check
  const isOwner = booking.ownerId === user._id;
  const isBorrower = booking.borrowerId === user._id;

  if (!isOwner && !isBorrower && user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized for this booking action' });
  }

  if (['Accepted', 'Rejected'].includes(status) && !isOwner && user.role !== 'admin') {
    return res.status(403).json({ error: 'Only item owner can accept or reject booking requests' });
  }

  booking.status = status;
  booking.updatedAt = new Date().toISOString();

  // If accepted, update item availability
  if (status === 'Accepted') {
    const item = db.items.find(i => i._id === booking.itemId);
    if (item) item.availability = false;
  } else if (status === 'Completed' || status === 'Rejected') {
    const item = db.items.find(i => i._id === booking.itemId);
    if (item) item.availability = true;
  }

  // Send Notification to counterparty
  const targetUserId = isOwner ? booking.borrowerId : booking.ownerId;
  db.notifications.push({
    _id: `ntf_${Date.now()}`,
    userId: targetUserId,
    title: `Booking ${status}`,
    message: `Booking for "${booking.itemTitle}" status updated to: ${status}`,
    type: 'booking',
    read: false,
    link: '/bookings',
    createdAt: new Date().toISOString()
  });

  return res.json({ message: `Booking status updated to ${status}`, booking });
});

// ----------------------------------------------------
// CHAT APIs
// ----------------------------------------------------

// GET /api/chat/messages/:bookingId
apiRouter.get('/chat/messages/:bookingId', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { bookingId } = req.params;
  const booking = db.bookings.find(b => b._id === bookingId);

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  if (booking.borrowerId !== req.user!._id && booking.ownerId !== req.user!._id && req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied to this booking chat' });
  }

  const messages = db.messages.filter(m => m.bookingId === bookingId);
  return res.json({ messages, booking });
});

// POST /api/chat/messages
apiRouter.post('/chat/messages', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const sender = req.user!;
  const { bookingId, content } = req.body;

  if (!bookingId || !content) {
    return res.status(400).json({ error: 'Booking ID and message content are required' });
  }

  const booking = db.bookings.find(b => b._id === bookingId);
  if (!booking) {
    return res.status(404).json({ error: 'Booking reference not found' });
  }

  const receiverId = booking.borrowerId === sender._id ? booking.ownerId : booking.borrowerId;
  const receiverName = booking.borrowerId === sender._id ? booking.ownerName : booking.borrowerName;

  const newMsg: Message = {
    _id: `msg_${Date.now()}`,
    bookingId,
    senderId: sender._id,
    senderName: sender.name,
    receiverId,
    receiverName,
    content,
    timestamp: new Date().toISOString(),
    isRead: false
  };

  db.messages.push(newMsg);

  return res.status(201).json({ message: newMsg });
});

// ----------------------------------------------------
// COMPLAINT & AUTO-BLOCK APIs
// ----------------------------------------------------

// POST /api/complaints
apiRouter.post('/complaints', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const reporter = req.user!;
  const { reportedUserId, bookingId, type, description, proofUrl, itemTitle } = req.body;

  if (!reportedUserId || !type || !description) {
    return res.status(400).json({ error: 'Reported user, complaint type, and description are required' });
  }

  const reportedUser = db.users.find(u => u._id === reportedUserId);
  if (!reportedUser) {
    return res.status(404).json({ error: 'Reported student account not found' });
  }

  const newComplaint: Complaint = {
    _id: `cmp_${Date.now()}`,
    reporterId: reporter._id,
    reporterName: reporter.name,
    reportedUserId,
    reportedUserName: reportedUser.name,
    bookingId,
    itemTitle,
    type,
    description,
    proofUrl: proofUrl || 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&q=80&w=800',
    status: 'Pending',
    createdAt: new Date().toISOString()
  };

  db.complaints.unshift(newComplaint);

  // Check auto-block count update
  db.checkAndApplyAutoBlock(reportedUserId);

  return res.status(201).json({
    message: 'Complaint filed successfully. Admin will review the proof and take action.',
    complaint: newComplaint
  });
});

// GET /api/complaints/my
apiRouter.get('/complaints/my', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!._id;
  const filed = db.complaints.filter(c => c.reporterId === userId);
  const againstMe = db.complaints.filter(c => c.reportedUserId === userId);

  return res.json({ filed, againstMe });
});

// ----------------------------------------------------
// RATING APIs
// ----------------------------------------------------

// POST /api/ratings
apiRouter.post('/ratings', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const reviewer = req.user!;
  const { bookingId, revieweeId, stars, comment } = req.body;

  if (!bookingId || !revieweeId || !stars) {
    return res.status(400).json({ error: 'Booking ID, reviewee ID, and star rating (1-5) are required' });
  }

  const reviewee = db.users.find(u => u._id === revieweeId);
  if (!reviewee) {
    return res.status(404).json({ error: 'Student to rate not found' });
  }

  const newRating: Rating = {
    _id: `rtg_${Date.now()}`,
    bookingId,
    reviewerId: reviewer._id,
    reviewerName: reviewer.name,
    revieweeId,
    stars: Number(stars),
    comment: comment || 'Great CS resource exchange!',
    createdAt: new Date().toISOString()
  };

  db.ratings.push(newRating);

  // Recalculate average rating for reviewee
  const userRatings = db.ratings.filter(r => r.revieweeId === revieweeId);
  const total = userRatings.reduce((sum, r) => sum + r.stars, 0);
  reviewee.totalRatings = userRatings.length;
  reviewee.averageRating = Number((total / userRatings.length).toFixed(1));

  return res.status(201).json({ message: 'Rating and review submitted!', rating: newRating });
});

// GET /api/ratings/user/:userId
apiRouter.get('/ratings/user/:userId', (req: Request, res: Response) => {
  const userRatings = db.ratings.filter(r => r.revieweeId === req.params.userId);
  return res.json({ ratings: userRatings });
});

// ----------------------------------------------------
// ADMIN PANEL APIs
// ----------------------------------------------------

// GET /api/admin/stats
apiRouter.get('/admin/stats', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const totalStudents = db.users.filter(u => u.role === 'student').length;
  const activeListings = db.items.length;
  const totalBookings = db.bookings.length;
  const pendingComplaints = db.complaints.filter(c => c.status === 'Pending' || c.status === 'Under Review').length;
  const blockedUsers = db.users.filter(u => u.isBlocked).length;
  const totalRentalVolume = db.bookings
    .filter(b => b.status === 'Completed' || b.status === 'Accepted')
    .reduce((sum, b) => sum + b.totalCost, 0);

  return res.json({
    totalStudents,
    activeListings,
    totalBookings,
    pendingComplaints,
    blockedUsers,
    totalRentalVolume
  });
});

// GET /api/admin/users
apiRouter.get('/admin/users', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ users: db.users });
});

// PUT /api/admin/users/:id/block
apiRouter.put('/admin/users/:id/block', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const targetUser = db.users.find(u => u._id === req.params.id);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { isBlocked } = req.body;
  targetUser.isBlocked = Boolean(isBlocked);
  targetUser.updatedAt = new Date().toISOString();

  return res.json({
    message: `User ${targetUser.name} ${targetUser.isBlocked ? 'blocked' : 'unblocked'} successfully.`,
    user: targetUser
  });
});

// GET /api/admin/complaints
apiRouter.get('/admin/complaints', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ complaints: db.complaints });
});

// PUT /api/admin/complaints/:id
apiRouter.put('/admin/complaints/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const complaint = db.complaints.find(c => c._id === req.params.id);
  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found' });
  }

  const { status, adminNote } = req.body;
  if (status) complaint.status = status;
  if (adminNote) complaint.adminNote = adminNote;

  // Check auto-block trigger if resolved / verified
  if (status === 'Resolved') {
    const isNowBlocked = db.checkAndApplyAutoBlock(complaint.reportedUserId);
    return res.json({
      message: `Complaint status updated to ${status}.${isNowBlocked ? ' Reported user reached complaint limit and has been AUTO-BLOCKED!' : ''}`,
      complaint,
      userAutoBlocked: isNowBlocked
    });
  }

  return res.json({ message: 'Complaint updated', complaint });
});

// DELETE /api/admin/items/:id
apiRouter.delete('/admin/items/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const index = db.items.findIndex(i => i._id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const deleted = db.items.splice(index, 1)[0];
  return res.json({ message: `Admin deleted fake listing "${deleted.title}"` });
});

// ----------------------------------------------------
// NOTIFICATION APIs
// ----------------------------------------------------

apiRouter.get('/notifications', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const list = db.notifications.filter(n => n.userId === req.user!._id);
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return res.json({ notifications: list });
});

apiRouter.put('/notifications/:id/read', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const n = db.notifications.find(item => item._id === req.params.id && item.userId === req.user!._id);
  if (n) {
    n.read = true;
  }
  return res.json({ success: true });
});
