import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {
  users,
  items,
  blockedDates,
  favorites,
  bookings,
  messages,
  complaints,
  ratings,
  notifications,
  checkAndApplyAutoBlock
} from './db.js';
import { createUserRouter } from './routes/userRoutes.js';

const JWT_SECRET = process.env.JWT_SECRET || 'cs_department_jwt_secret_key_2026';

export const apiRouter = express.Router();
apiRouter.use(express.json());

function stripPassword(user) {
  if (!user) return user;
  const { passwordHash, ...rest } = user;
  return rest;
}

// Authentication Middleware
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token missing or invalid' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await users.findById(decoded.userId);

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

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin authorization required' });
  }
  next();
}

// ----------------------------------------------------
// AUTHENTICATION APIs
// ----------------------------------------------------

// POST /api/auth/register
apiRouter.post('/auth/register', async (req, res) => {
  try {
    const {
      name,
      email,
      enrollmentNumber,
      mobileNumber,
      password,
      semester,
      department
    } = req.body;

    if (!name || !email || !enrollmentNumber || !mobileNumber || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // ONLY COLLEGE CS GMAIL ALLOWED
    // Format: 0801CSYYRRRR@sgsits.ac.in
    const emailValue = String(email).trim().toLowerCase();
    const collegeEmailRegex = /^0801cs\d{2}\d{4}@sgsits\.ac\.in$/i;

    if (!collegeEmailRegex.test(emailValue)) {
      return res.status(400).json({
        error: 'Please use your college CS email. Format: 0801CSYYRRRR@sgsits.ac.in'
      });
    }

    const existingEmail = await users.findByEmail(emailValue);
    if (existingEmail) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const existingEnrollment = await users.findByEnrollment(String(enrollmentNumber).trim());
    if (existingEnrollment) {
      return res.status(400).json({ error: 'An account with this enrollment number already exists' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const newUser = await users.create({
      name: String(name).trim(),
      email: emailValue,
      passwordHash,
      enrollmentNumber: String(enrollmentNumber).trim(),
      mobileNumber: String(mobileNumber).trim(),
      department: department || 'Computer Science & Engineering',
      semester: semester || '1st Semester',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`
    });

    const token = jwt.sign({ userId: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      message: 'Student registered successfully',
      user: stripPassword(newUser),
      token
    });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ error: 'Could not register account' });
  }
});

// POST /api/auth/login
apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const emailValue = String(email).trim().toLowerCase();
    const user = await users.findByEmail(emailValue);

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        error: 'ACCOUNT BLOCKED: You have received 5 or more verified complaints. Only CS Admin can unblock your account.'
      });
    }

    const passwordMatches = await users.verifyPassword(String(password), user.passwordHash);
    if (!passwordMatches) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      message: 'Login successful',
      user: stripPassword(user),
      token
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'Could not log in' });
  }
});

// GET /api/auth/me
apiRouter.get('/auth/me', authenticateToken, (req, res) => {
  return res.json({ user: stripPassword(req.user) });
});

// USER APIs: route -> controller -> model
apiRouter.use('/users', createUserRouter(authenticateToken));

// ----------------------------------------------------
// ITEM APIs
// ----------------------------------------------------

// GET /api/items
apiRouter.get('/items', async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, availableOnly, condition } = req.query;
    const result = await items.findAll({ search, category, minPrice, maxPrice, availableOnly, condition });
    return res.json({ items: result, total: result.length });
  } catch (err) {
    console.error('list items error:', err);
    return res.status(500).json({ error: 'Could not load items' });
  }
});

// GET /api/items/my/listings
apiRouter.get('/items/my/listings', authenticateToken, async (req, res) => {
  try {
    const myListings = await items.findByOwnerId(req.user._id);
    return res.json({ items: myListings });
  } catch (err) {
    console.error('my listings error:', err);
    return res.status(500).json({ error: 'Could not load your listings' });
  }
});

// GET /api/items/:id
apiRouter.get('/items/:id', async (req, res) => {
  try {
    const item = await items.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Resource listing not found' });
    }

    const ownerRatings = await ratings.findForUser(item.ownerId);

    return res.json({
      item,
      owner: {
        _id: item.ownerId,
        name: item.ownerName,
        email: item.ownerEmail,
        department: item.department,
        semester: item.ownerSemester,
        avatar: item.ownerAvatar,
        averageRating: item.averageRating,
        totalRatings: item.totalRatings
      },
      ownerRatings
    });
  } catch (err) {
    console.error('get item error:', err);
    return res.status(500).json({ error: 'Could not load item' });
  }
});

// POST /api/items
apiRouter.post('/items', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { title, category, description, images, rentPricePerDay, securityDeposit, condition, pickupLocation } = req.body;

    if (!title || !category || !description || !rentPricePerDay || !pickupLocation) {
      return res.status(400).json({ error: 'Please provide all required item details' });
    }

    const newItem = await items.create({
      ownerId: user._id,
      title,
      category,
      description,
      images: Array.isArray(images) && images.length > 0
        ? images
        : ['https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=800'],
      rentPricePerDay: Number(rentPricePerDay),
      securityDeposit: Number(securityDeposit || 0),
      condition: condition || 'Good',
      pickupLocation
    });

    return res.status(201).json({ message: 'Item listed successfully', item: newItem });
  } catch (err) {
    console.error('create item error:', err);
    return res.status(500).json({ error: 'Could not create listing' });
  }
});

// PUT /api/items/:id
apiRouter.put('/items/:id', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const item = await items.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    if (item.ownerId !== user._id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to modify this listing' });
    }

    const { title, category, description, images, rentPricePerDay, securityDeposit, availability, condition, pickupLocation } = req.body;

    const changes = {};
    if (title) changes.title = title;
    if (category) changes.category = category;
    if (description) changes.description = description;
    if (images) changes.images = images;
    if (rentPricePerDay !== undefined) changes.rentPricePerDay = Number(rentPricePerDay);
    if (securityDeposit !== undefined) changes.securityDeposit = Number(securityDeposit);
    if (availability !== undefined) changes.availability = Boolean(availability);
    if (condition) changes.condition = condition;
    if (pickupLocation) changes.pickupLocation = pickupLocation;

    const updated = await items.update(req.params.id, changes);
    return res.json({ message: 'Item listing updated', item: updated });
  } catch (err) {
    console.error('update item error:', err);
    return res.status(500).json({ error: 'Could not update listing' });
  }
});

// DELETE /api/items/:id
apiRouter.delete('/items/:id', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const item = await items.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    if (item.ownerId !== user._id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to delete this listing' });
    }

    await items.delete(req.params.id);
    return res.json({ message: 'Listing deleted successfully' });
  } catch (err) {
    console.error('delete item error:', err);
    return res.status(500).json({ error: 'Could not delete listing' });
  }
});

// GET /api/items/:id/booked-dates
apiRouter.get('/items/:id/booked-dates', async (req, res) => {
  try {
    const itemId = req.params.id;
    const item = await items.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const activeBookings = await bookings.findActiveForItem(itemId);
    const fromBookings = activeBookings.map((b) => ({
      startDate: b.startDate,
      endDate: b.endDate,
      status: b.status,
      source: 'booking'
    }));

    const ownerBlocks = await blockedDates.findByItemId(itemId);
    const fromOwner = ownerBlocks.map((d) => ({
      _id: d._id,
      startDate: d.startDate,
      endDate: d.endDate,
      reason: d.reason,
      source: 'owner'
    }));

    return res.json({ bookedRanges: [...fromBookings, ...fromOwner] });
  } catch (err) {
    console.error('booked-dates error:', err);
    return res.status(500).json({ error: 'Could not load booked dates' });
  }
});

// POST /api/items/:id/blocked-dates
apiRouter.post('/items/:id/blocked-dates', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const item = await items.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    if (item.ownerId !== user._id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the item owner can block dates for this listing' });
    }

    const { startDate, endDate, reason } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid start or end date' });
    }
    if (end < start) {
      return res.status(400).json({ error: 'End date cannot be before start date' });
    }

    const newBlock = await blockedDates.create({ itemId: req.params.id, startDate, endDate, reason });
    const allBlocks = await blockedDates.findByItemId(req.params.id);

    return res.status(201).json({ message: 'Dates blocked successfully', blockedDate: newBlock, blockedDates: allBlocks });
  } catch (err) {
    console.error('block dates error:', err);
    return res.status(500).json({ error: 'Could not block dates' });
  }
});

// DELETE /api/items/:id/blocked-dates/:blockId
apiRouter.delete('/items/:id/blocked-dates/:blockId', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const item = await items.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    if (item.ownerId !== user._id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the item owner can modify blocked dates for this listing' });
    }

    const removed = await blockedDates.delete(req.params.blockId, req.params.id);
    if (!removed) {
      return res.status(404).json({ error: 'Blocked date entry not found' });
    }

    const allBlocks = await blockedDates.findByItemId(req.params.id);
    return res.json({ message: 'Blocked dates removed', blockedDates: allBlocks });
  } catch (err) {
    console.error('unblock dates error:', err);
    return res.status(500).json({ error: 'Could not remove blocked dates' });
  }
});

// ----------------------------------------------------
// FAVORITES / WISHLIST APIs
// ----------------------------------------------------

// GET /api/favorites
apiRouter.get('/favorites', authenticateToken, async (req, res) => {
  try {
    const favoriteItems = await favorites.itemsForUser(req.user._id);
    return res.json({ items: favoriteItems });
  } catch (err) {
    console.error('favorites error:', err);
    return res.status(500).json({ error: 'Could not load favorites' });
  }
});

// POST /api/favorites/:itemId  (toggles on/off)
apiRouter.post('/favorites/:itemId', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { itemId } = req.params;

    const item = await items.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const currentlyFavorite = await favorites.isFavorite(user._id, itemId);
    if (currentlyFavorite) {
      await favorites.remove(user._id, itemId);
    } else {
      await favorites.add(user._id, itemId);
    }
    const isFavorite = !currentlyFavorite;

    const favoriteItems = await favorites.itemsForUser(user._id);

    return res.json({
      message: isFavorite ? 'Added to favorites' : 'Removed from favorites',
      isFavorite,
      favorites: favoriteItems.map((i) => i._id)
    });
  } catch (err) {
    console.error('toggle favorite error:', err);
    return res.status(500).json({ error: 'Could not update favorites' });
  }
});

// ----------------------------------------------------
// BOOKING APIs
// ----------------------------------------------------

// POST /api/bookings
apiRouter.post('/bookings', authenticateToken, async (req, res) => {
  try {
    const borrower = req.user;
    const { itemId, startDate, endDate } = req.body;

    if (!itemId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Item ID, start date, and end date are required' });
    }

    const item = await items.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Resource item not found' });
    }
    if (!item.availability) {
      return res.status(400).json({ error: 'This listing has been turned off by the owner' });
    }
    if (item.ownerId === borrower._id) {
      return res.status(400).json({ error: 'You cannot rent your own listed item' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid start or end date' });
    }
    if (end < start) {
      return res.status(400).json({ error: 'End date cannot be before start date' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxBookingDate = new Date(today);
    maxBookingDate.setDate(maxBookingDate.getDate() + 30);

    if (start < today) {
      return res.status(400).json({ error: 'Booking start date cannot be in the past' });
    }
    if (end > maxBookingDate) {
      return res.status(400).json({ error: 'Bookings can only be made up to 30 days in advance' });
    }

    const activeBookings = await bookings.findActiveForItem(itemId);
    const hasBookingOverlap = activeBookings.some((b) => {
      const bStart = new Date(b.startDate);
      const bEnd = new Date(b.endDate);
      return start <= bEnd && end >= bStart;
    });

    const ownerBlocks = await blockedDates.findByItemId(itemId);
    const hasOwnerBlockOverlap = ownerBlocks.some((d) => {
      const dStart = new Date(d.startDate);
      const dEnd = new Date(d.endDate);
      return start <= dEnd && end >= dStart;
    });

    if (hasBookingOverlap || hasOwnerBlockOverlap) {
      return res.status(400).json({ error: 'This item is already unavailable for some of the selected dates. Check the available dates below.' });
    }

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    const totalCost = diffDays * item.rentPricePerDay + item.securityDeposit;

    const newBooking = await bookings.create({
      itemId: item._id,
      borrowerId: borrower._id,
      ownerId: item.ownerId,
      startDate,
      endDate,
      totalDays: diffDays,
      totalCost
    });

    await notifications.create({
      userId: item.ownerId,
      title: 'New Booking Request',
      message: `${borrower.name} requested to rent "${item.title}" for ${diffDays} days.`,
      type: 'booking',
      link: '/bookings'
    });

    return res.status(201).json({ message: 'Booking request sent successfully', booking: newBooking });
  } catch (err) {
    console.error('create booking error:', err);
    return res.status(500).json({ error: 'Could not create booking' });
  }
});

// GET /api/bookings/my
apiRouter.get('/bookings/my', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const [borrowed, ownerRequests] = await Promise.all([
      bookings.findByBorrower(userId),
      bookings.findByOwner(userId)
    ]);
    return res.json({ borrowed, ownerRequests });
  } catch (err) {
    console.error('my bookings error:', err);
    return res.status(500).json({ error: 'Could not load bookings' });
  }
});

// PUT /api/bookings/:id/status
apiRouter.put('/bookings/:id/status', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { status } = req.body;

    const booking = await bookings.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const isOwner = booking.ownerId === user._id;
    const isBorrower = booking.borrowerId === user._id;

    if (!isOwner && !isBorrower && user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized for this booking action' });
    }
    if (['Accepted', 'Rejected'].includes(status) && !isOwner && user.role !== 'admin') {
      return res.status(403).json({ error: 'Only item owner can accept or reject booking requests' });
    }

    const updated = await bookings.updateStatus(req.params.id, status);

    const targetUserId = isOwner ? booking.borrowerId : booking.ownerId;
    await notifications.create({
      userId: targetUserId,
      title: `Booking ${status}`,
      message: `Booking for "${booking.itemTitle}" status updated to: ${status}`,
      type: 'booking',
      link: '/bookings'
    });

    return res.json({ message: `Booking status updated to ${status}`, booking: updated });
  } catch (err) {
    console.error('update booking status error:', err);
    return res.status(500).json({ error: 'Could not update booking status' });
  }
});

// ----------------------------------------------------
// CHAT APIs
// ----------------------------------------------------

// GET /api/chat/conversations
apiRouter.get('/chat/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const [asBorrower, asOwner] = await Promise.all([bookings.findByBorrower(userId), bookings.findByOwner(userId)]);
    const relevant = [...asBorrower, ...asOwner].filter(
      (b) => b.status === 'Accepted' || b.status === 'Completed'
    );

    const conversations = await Promise.all(
      relevant.map(async (booking) => {
        const otherUserId = booking.ownerId === userId ? booking.borrowerId : booking.ownerId;
        const otherUser = await users.findById(otherUserId);
        const lastMessage = await messages.lastForBooking(booking._id);
        const unreadCount = await messages.unreadCountForUser(booking._id, userId);

        return {
          booking,
          participant: {
            _id: otherUserId,
            name: otherUser?.name || (booking.ownerId === userId ? booking.borrowerName : booking.ownerName),
            avatar: otherUser?.avatar || null
          },
          lastMessage,
          unreadCount,
          lastActivityAt: lastMessage?.timestamp || booking.updatedAt || booking.createdAt
        };
      })
    );

    conversations.sort((a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt));

    return res.json({ conversations });
  } catch (err) {
    console.error('conversations error:', err);
    return res.status(500).json({ error: 'Could not load conversations' });
  }
});

// GET /api/chat/messages/:bookingId
apiRouter.get('/chat/messages/:bookingId', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await bookings.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.borrowerId !== req.user._id && booking.ownerId !== req.user._id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied to this booking chat' });
    }
    if (booking.status !== 'Accepted' && booking.status !== 'Completed' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chat is only available after the owner accepts this booking' });
    }

    const bookingMessages = await messages.findByBooking(bookingId);
    await messages.markReadForReceiver(bookingId, req.user._id);

    return res.json({ messages: bookingMessages, booking });
  } catch (err) {
    console.error('chat messages error:', err);
    return res.status(500).json({ error: 'Could not load messages' });
  }
});

// PUT /api/chat/messages/:bookingId/read
apiRouter.put('/chat/messages/:bookingId/read', authenticateToken, async (req, res) => {
  try {
    const booking = await bookings.findById(req.params.bookingId);
    if (!booking || (booking.borrowerId !== req.user._id && booking.ownerId !== req.user._id && req.user.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied to this booking chat' });
    }

    await messages.markReadForReceiver(booking._id, req.user._id);
    return res.json({ success: true });
  } catch (err) {
    console.error('mark read error:', err);
    return res.status(500).json({ error: 'Could not mark messages as read' });
  }
});

// POST /api/chat/messages
apiRouter.post('/chat/messages', authenticateToken, async (req, res) => {
  try {
    const sender = req.user;
    const { bookingId, content } = req.body;

    if (!bookingId || !content) {
      return res.status(400).json({ error: 'Booking ID and message content are required' });
    }

    const booking = await bookings.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking reference not found' });
    }
    if (booking.borrowerId !== sender._id && booking.ownerId !== sender._id && sender.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied to this booking chat' });
    }
    if (booking.status !== 'Accepted' && booking.status !== 'Completed' && sender.role !== 'admin') {
      return res.status(403).json({ error: 'Chat is only available after the owner accepts this booking' });
    }

    const receiverId = booking.borrowerId === sender._id ? booking.ownerId : booking.borrowerId;
    const newMsg = await messages.create({ bookingId, senderId: sender._id, receiverId, content });

    return res.status(201).json({ message: newMsg });
  } catch (err) {
    console.error('send message error:', err);
    return res.status(500).json({ error: 'Could not send message' });
  }
});

// ----------------------------------------------------
// COMPLAINT & AUTO-BLOCK APIs
// ----------------------------------------------------

// POST /api/complaints
apiRouter.post('/complaints', authenticateToken, async (req, res) => {
  try {
    const reporter = req.user;
    const { reportedUserId, bookingId, type, description, proofUrl, itemTitle } = req.body;

    if (!reportedUserId || !type || !description) {
      return res.status(400).json({ error: 'Reported user, complaint type, and description are required' });
    }

    const trimmed = String(reportedUserId).trim();
    const reportedUser = (await users.findById(trimmed)) || (await users.findByEmail(trimmed));
    if (!reportedUser) {
      return res.status(404).json({ error: 'Reported user not found' });
    }

    const newComplaint = await complaints.create({
      reporterId: reporter._id,
      reportedUserId: reportedUser._id,
      bookingId,
      itemTitle,
      type,
      description,
      proofUrl: proofUrl || 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&q=80&w=800'
    });

    await checkAndApplyAutoBlock(reportedUser._id);

    return res.status(201).json({
      message: 'Complaint filed successfully. Admin will review the proof and take action.',
      complaint: newComplaint
    });
  } catch (err) {
    console.error('create complaint error:', err);
    return res.status(500).json({ error: 'Could not file complaint' });
  }
});

// GET /api/complaints/my
apiRouter.get('/complaints/my', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const [filed, againstMe] = await Promise.all([complaints.findByReporter(userId), complaints.findAgainst(userId)]);
    return res.json({ filed, againstMe });
  } catch (err) {
    console.error('my complaints error:', err);
    return res.status(500).json({ error: 'Could not load complaints' });
  }
});

// ----------------------------------------------------
// RATING APIs
// ----------------------------------------------------

// POST /api/ratings
apiRouter.post('/ratings', authenticateToken, async (req, res) => {
  try {
    const reviewer = req.user;
    const { bookingId, revieweeId, stars, comment } = req.body;

    if (!bookingId || !revieweeId || !stars) {
      return res.status(400).json({ error: 'Booking ID, reviewee ID, and star rating (1-5) are required' });
    }

    const reviewee = await users.findById(revieweeId);
    if (!reviewee) {
      return res.status(404).json({ error: 'Student to rate not found' });
    }

    const newRating = await ratings.create({
      bookingId,
      revieweeId,
      reviewerId: reviewer._id,
      stars: Number(stars),
      comment: comment || 'Great CS resource exchange!'
    });

    const { averageRating, totalRatings } = await ratings.averageForUser(revieweeId);
    await users.setRatingStats(revieweeId, averageRating, totalRatings);

    return res.status(201).json({ message: 'Rating and review submitted!', rating: newRating });
  } catch (err) {
    console.error('create rating error:', err);
    return res.status(500).json({ error: 'Could not submit rating' });
  }
});

// GET /api/ratings/user/:userId
apiRouter.get('/ratings/user/:userId', async (req, res) => {
  try {
    const userRatings = await ratings.findForUser(req.params.userId);
    return res.json({ ratings: userRatings });
  } catch (err) {
    console.error('ratings error:', err);
    return res.status(500).json({ error: 'Could not load ratings' });
  }
});

// ----------------------------------------------------
// ADMIN PANEL APIs
// ----------------------------------------------------

// GET /api/admin/stats
apiRouter.get('/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [totalStudents, activeListings, totalBookings, pendingComplaints, blockedUsers, totalRentalVolume] = await Promise.all([
      users.countStudents(),
      items.countAll(),
      bookings.countAll(),
      complaints.countPending(),
      users.countBlocked(),
      bookings.totalRentalVolume()
    ]);

    return res.json({ totalStudents, activeListings, totalBookings, pendingComplaints, blockedUsers, totalRentalVolume });
  } catch (err) {
    console.error('admin stats error:', err);
    return res.status(500).json({ error: 'Could not load admin stats' });
  }
});

// GET /api/admin/users
apiRouter.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const allUsers = await users.findAllForAdmin();
    return res.json({ users: allUsers.map(stripPassword) });
  } catch (err) {
    console.error('admin users error:', err);
    return res.status(500).json({ error: 'Could not load users' });
  }
});

// PUT /api/admin/users/:id/block
apiRouter.put('/admin/users/:id/block', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const targetUser = await users.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (targetUser.role === 'admin') {
      return res.status(403).json({ error: 'Admin accounts cannot be blocked or modified.' });
    }

    const { isBlocked } = req.body;
    const updated = await users.setBlocked(req.params.id, Boolean(isBlocked));

    return res.json({
      message: `User ${updated.name} ${updated.isBlocked ? 'blocked' : 'unblocked'} successfully.`,
      user: stripPassword(updated)
    });
  } catch (err) {
    console.error('block user error:', err);
    return res.status(500).json({ error: 'Could not update user' });
  }
});

// GET /api/admin/complaints
apiRouter.get('/admin/complaints', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const allComplaints = await complaints.findAll();
    return res.json({ complaints: allComplaints });
  } catch (err) {
    console.error('admin complaints error:', err);
    return res.status(500).json({ error: 'Could not load complaints' });
  }
});

// PUT /api/admin/complaints/:id
apiRouter.put('/admin/complaints/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const complaint = await complaints.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const { status, adminNote } = req.body;
    const updated = await complaints.update(req.params.id, { status, adminNote });

    if (status === 'Resolved') {
      const isNowBlocked = await checkAndApplyAutoBlock(complaint.reportedUserId);
      return res.json({
        message: `Complaint status updated to ${status}.${isNowBlocked ? ' Reported user reached complaint limit and has been AUTO-BLOCKED!' : ''}`,
        complaint: updated,
        userAutoBlocked: isNowBlocked
      });
    }

    return res.json({ message: 'Complaint updated', complaint: updated });
  } catch (err) {
    console.error('update complaint error:', err);
    return res.status(500).json({ error: 'Could not update complaint' });
  }
});

// DELETE /api/admin/items/:id
apiRouter.delete('/admin/items/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const item = await items.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    await items.delete(req.params.id);
    return res.json({ message: `Admin deleted fake listing "${item.title}"` });
  } catch (err) {
    console.error('admin delete item error:', err);
    return res.status(500).json({ error: 'Could not delete listing' });
  }
});

// ----------------------------------------------------
// NOTIFICATION APIs
// ----------------------------------------------------

apiRouter.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const list = await notifications.findForUser(req.user._id);
    return res.json({ notifications: list });
  } catch (err) {
    console.error('notifications error:', err);
    return res.status(500).json({ error: 'Could not load notifications' });
  }
});

apiRouter.put('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    await notifications.markRead(req.params.id, req.user._id);
    return res.json({ success: true });
  } catch (err) {
    console.error('mark notification read error:', err);
    return res.status(500).json({ error: 'Could not update notification' });
  }
});