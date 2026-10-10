import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import rateLimit from 'express-rate-limit';
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
  checkAndApplyAutoBlock,
  emailOtps
} from './db.js';
import multer from 'multer';
import { createUserRouter } from './routes/userRoutes.js';
import { proofUpload } from './middleware/upload.js';
import { sendOtpEmail } from './mailer.js';

// No fallback on purpose: a hard-coded secret means anyone with the source can
// forge login tokens. The server refuses to start without a strong one.
// Generate one with:  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
export const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('[Security] JWT_SECRET is missing or shorter than 32 characters. Set a long random value in backend/.env and restart.');
  process.exit(1);
}

// ---- Login tokens ----
// Lifetime of a login (override with JWT_EXPIRES_IN in .env, e.g. 12h or 3d).
const TOKEN_LIFETIME = process.env.JWT_EXPIRES_IN || '3d';

// Every token carries the user's current token version ("tv"). Logging out or
// resetting the password bumps that version, which kills all older tokens at once.
export function signToken(user) {
  return jwt.sign({ userId: user._id, role: user.role, tv: user.tokenVersion ?? 0 }, JWT_SECRET, { expiresIn: TOKEN_LIFETIME });
}
// Tokens issued before this feature have no "tv" and count as version 0.
export function tokenIsCurrent(decoded, user) {
  return (decoded.tv ?? 0) === (user.tokenVersion ?? 0);
}

// ---- OTP hardening ----
const OTP_MAX_ATTEMPTS = 5;          // wrong guesses before the code is burned
const OTP_RESEND_COOLDOWN_SECONDS = 60;

// Cryptographically secure 6-digit code (Math.random is predictable).
const generateOtp = () => String(crypto.randomInt(100000, 1000000));

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Shared by both verify-otp routes. Returns an error string or null on success.
async function checkOtpGuess(emailValue, purpose, guess) {
  const record = await emailOtps.findLatestByEmail(emailValue, purpose);
  if (!record) return 'No OTP found for this email. Please request a new one.';
  if (new Date(record.expiresAt) < new Date()) return 'This OTP has expired. Please request a new one.';
  if (Number(record.attempts) >= OTP_MAX_ATTEMPTS) return 'Too many wrong attempts. Please request a new OTP.';
  if (!safeEqual(record.otpCode, String(guess).trim())) {
    const used = await emailOtps.incrementAttempts(record._id);
    return used >= OTP_MAX_ATTEMPTS
      ? 'Too many wrong attempts. Please request a new OTP.'
      : 'Incorrect OTP. Please check and try again.';
  }
  return null;
}

// Returns seconds left to wait before another OTP may be sent, or 0.
async function otpCooldownLeft(emailValue, purpose) {
  const age = await emailOtps.secondsSinceLastSent(emailValue, purpose);
  if (age === null || age >= OTP_RESEND_COOLDOWN_SECONDS) return 0;
  return Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - age);
}

// ---- Input validation helpers (Step 3) ----
// Password: 8-72 characters (72 is bcrypt's limit), at least one letter and one number.
function passwordProblem(pw) {
  const value = String(pw ?? '');
  if (value.length < 8) return 'Password must be at least 8 characters long';
  if (value.length > 72) return 'Password must be at most 72 characters long';
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return 'Password must contain at least one letter and one number';
  return null;
}

// Chat / direct message text: a non-empty string, at most 2000 characters.
function cleanMessage(content) {
  if (typeof content !== 'string') return null;
  const text = content.trim();
  return text && text.length <= 2000 ? text : null;
}

const ITEM_CATEGORIES = ['Books', 'Calculators', 'Laptop Accessories', 'Electronics', 'Lab Equipment', 'Project Components', 'Sports Items', 'Other'];
const ITEM_CONDITIONS = ['New', 'Like New', 'Good', 'Fair'];
const MAX_ITEM_IMAGES = 5;
const MAX_IMAGE_DATA_LENGTH = 7000000; // ~5 MB photo once base64-encoded (matches the 5 MB upload limit in the form)

// Validates item fields for create (partial = false: everything required) and
// edit (partial = true: only the fields that were sent). Returns { error } or { value }.
function validateItem(body, { partial = false } = {}) {
  const value = {};
  const has = (k) => body[k] !== undefined && body[k] !== null && body[k] !== '';
  const text = (k, label, min, max) => {
    if (!has(k)) return partial ? null : `${label} is required`;
    if (typeof body[k] !== 'string') return `${label} is invalid`;
    const t = body[k].trim();
    if (t.length < min || t.length > max) return `${label} must be ${min}-${max} characters`;
    value[k] = t;
    return null;
  };

  let err =
    text('title', 'Title', 3, 100) ||
    text('description', 'Description', 10, 2000) ||
    text('pickupLocation', 'Pickup location', 2, 200);
  if (err) return { error: err };

  if (has('category')) {
    if (!ITEM_CATEGORIES.includes(body.category)) return { error: 'Invalid category' };
    value.category = body.category;
  } else if (!partial) return { error: 'Category is required' };

  if (has('condition')) {
    if (!ITEM_CONDITIONS.includes(body.condition)) return { error: 'Invalid condition' };
    value.condition = body.condition;
  } else if (!partial) value.condition = 'Good';

  if (has('rentPricePerDay')) {
    const price = Number(body.rentPricePerDay);
    if (!Number.isFinite(price) || price <= 0 || price > 100000) return { error: 'Rent per day must be a number between 1 and 100000' };
    value.rentPricePerDay = price;
  } else if (!partial) return { error: 'Rent per day is required' };

  if (has('securityDeposit')) {
    const deposit = Number(body.securityDeposit);
    if (!Number.isFinite(deposit) || deposit < 0 || deposit > 1000000) return { error: 'Security deposit must be a number between 0 and 1000000' };
    value.securityDeposit = deposit;
  } else if (!partial) value.securityDeposit = 0;

  if (body.images !== undefined || !partial) {
    const images = body.images;
    if (!Array.isArray(images) || images.length === 0) return { error: 'Please upload at least one image of the item' };
    if (images.length > MAX_ITEM_IMAGES) return { error: `You can add at most ${MAX_ITEM_IMAGES} images` };
    const imageOk = (img) =>
      typeof img === 'string' && img.length <= MAX_IMAGE_DATA_LENGTH && /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(img);
    if (!images.every(imageOk)) return { error: 'Only uploaded image files (JPG, PNG, WEBP, GIF, max 5 MB each) are allowed' };
    value.images = images;
  }

  if (partial && body.availability !== undefined) value.availability = Boolean(body.availability);
  return { value };
}

// ---- Rate limits ----
// Limits are per ACCOUNT (the email being tried), not just per IP, because many
// students can share one IP (college wifi / NAT) and one student's wrong guesses
// must not lock out everyone else. Each IP also gets a much larger ceiling so a
// single machine can't hammer thousands of accounts. (Behind a proxy/nginx, set
// app.set('trust proxy', 1) in server.js so the IP seen here is the real one.)
const emailOf = (req) => String(req.body?.email || '').trim().toLowerCase().slice(0, 200);

const makeLimiter = ({ minutes, max, message, byEmail = false, failedOnly = false }) =>
  rateLimit({
    windowMs: minutes * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
    // failedOnly: only responses with an error status count (a correct login doesn't use up attempts)
    skipSuccessfulRequests: failedOnly,
    // byEmail: one bucket per email address; requests without an email skip this limiter
    ...(byEmail ? { keyGenerator: (req) => emailOf(req), skip: (req) => !emailOf(req) } : {})
  });

// Login: 10 wrong passwords per account per 15 min; 100 wrong attempts per IP per 15 min.
const loginLimiter = [
  makeLimiter({ minutes: 15, max: 100, failedOnly: true, message: 'Too many failed login attempts from this network. Please try again in 15 minutes.' }),
  makeLimiter({ minutes: 15, max: 10, byEmail: true, failedOnly: true, message: 'Too many failed login attempts for this account. Please try again in 15 minutes.' })
];
// Register: per IP only (the email must already be OTP-verified, which is limited below).
const registerLimiter = makeLimiter({ minutes: 60, max: 30, message: 'Too many registration attempts. Please try again later.' });
// OTP emails: 6 per address per hour (plus the 60-second cooldown), 60 per IP per hour.
const otpSendLimiter = [
  makeLimiter({ minutes: 60, max: 60, message: 'Too many OTP requests from this network. Please try again later.' }),
  makeLimiter({ minutes: 60, max: 6, byEmail: true, message: 'Too many OTP requests for this email. Please try again later.' })
];
// OTP checks: the real guard is the 5-wrong-guesses cap stored with each OTP;
// these just stop floods (30 per address, 300 per IP, per 15 min).
const otpVerifyLimiter = [
  makeLimiter({ minutes: 15, max: 300, message: 'Too many verification attempts from this network. Please try again later.' }),
  makeLimiter({ minutes: 15, max: 30, byEmail: true, message: 'Too many verification attempts for this email. Please try again in 15 minutes.' })
];
// Complaints: per logged-in user (the limiter runs after authenticateToken), not per IP.
const complaintLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'You are filing complaints too quickly. Please try again later.' },
  keyGenerator: (req) => String(req.user?._id || 'anonymous')
});

// Format: 0801CSYYRRRR@sgsits.ac.in — shared by send-otp, verify-otp and register.
const COLLEGE_EMAIL_REGEX = /^0801cs\d{2}\d{4}@sgsits\.ac\.in$/i;

// Fast Delivery: surcharge is a percentage of the rental fee (price/day ×
// days), rounded to the nearest rupee, plus the owner's acceptance window.
// Must match FAST_DELIVERY_FEE_PERCENT in frontend/src/components/ItemDetailsPage.jsx.
const FAST_DELIVERY_FEE_PERCENT = 0.25;
const FAST_DELIVERY_WINDOW_MINUTES = 30;

export const apiRouter = express.Router();
apiRouter.use(express.json());

function stripPassword(user) {
  if (!user) return user;
  const { passwordHash, tokenVersion, ...rest } = user;
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

    if (!tokenIsCurrent(decoded, user)) {
      return res.status(401).json({ error: 'Session ended. Please log in again.' });
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

// POST /api/auth/send-otp — step 1 of registration: email a 6-digit code.
apiRouter.post('/auth/send-otp', otpSendLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const emailValue = String(email).trim().toLowerCase();
    if (!COLLEGE_EMAIL_REGEX.test(emailValue)) {
      return res.status(400).json({
        error: 'Please use your college CS email. Format: 0801CSYYRRRR@sgsits.ac.in'
      });
    }

    const existingEmail = await users.findByEmail(emailValue);
    if (existingEmail) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const waitSeconds = await otpCooldownLeft(emailValue, 'register');
    if (waitSeconds > 0) {
      return res.status(429).json({ error: `Please wait ${waitSeconds} seconds before requesting another OTP.` });
    }

    const otpCode = generateOtp();
    await emailOtps.create(emailValue, otpCode, 'register', 1);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] register OTP for ${emailValue}: ${otpCode}`);
    }

    try {
      await sendOtpEmail(emailValue, otpCode);
    } catch (mailErr) {
      console.error('send otp email error:', mailErr);
      return res.status(500).json({ error: 'Could not send verification email. Please try again in a moment.' });
    }

    return res.json({ message: 'A 6-digit code has been sent to your email. It is valid for 1 minute.' });
  } catch (err) {
    console.error('send-otp error:', err);
    return res.status(500).json({ error: 'Could not send OTP' });
  }
});

// POST /api/auth/verify-otp — step 2 of registration: check the code.
apiRouter.post('/auth/verify-otp', otpVerifyLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const emailValue = String(email).trim().toLowerCase();
    const otpError = await checkOtpGuess(emailValue, 'register', otp);
    if (otpError) {
      return res.status(400).json({ error: otpError });
    }

    await emailOtps.markVerified(emailValue, 'register');
    return res.json({ message: 'Email verified successfully.' });
  } catch (err) {
    console.error('verify-otp error:', err);
    return res.status(500).json({ error: 'Could not verify OTP' });
  }
});

// POST /api/auth/register — step 3: requires a verified OTP for this email.
apiRouter.post('/auth/register', registerLimiter, async (req, res) => {
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

    const nameText = String(name).trim();
    if (nameText.length < 2 || nameText.length > 60) {
      return res.status(400).json({ error: 'Name must be 2-60 characters long' });
    }
    if (!/^\d{10}$/.test(String(mobileNumber).trim())) {
      return res.status(400).json({ error: 'Mobile number must be 10 digits' });
    }
    const passwordError = passwordProblem(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }
    if (String(semester || '').length > 30 || String(department || '').length > 100) {
      return res.status(400).json({ error: 'Invalid semester or department' });
    }

    // ONLY COLLEGE CS GMAIL ALLOWED
    // Format: 0801CSYYRRRR@sgsits.ac.in
    const emailValue = String(email).trim().toLowerCase();

    if (!COLLEGE_EMAIL_REGEX.test(emailValue)) {
      return res.status(400).json({
        error: 'Please use your college CS email. Format: 0801CSYYRRRR@sgsits.ac.in'
      });
    }

    // The enrollment number is the first part of the college email
    // (0801CS23xxxx@sgsits.ac.in), so nobody can register with someone else's number.
    if (String(enrollmentNumber).trim().toLowerCase() !== emailValue.split('@')[0]) {
      return res.status(400).json({ error: 'Enrollment number must match your college email (the part before @)' });
    }

    // Email must have gone through send-otp + verify-otp before an account
    // can be created.
    const otpVerified = await emailOtps.isVerified(emailValue, 'register');
    if (!otpVerified) {
      return res.status(400).json({ error: 'Please verify your email with the OTP before registering.' });
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
      name: nameText,
      email: emailValue,
      passwordHash,
      enrollmentNumber: String(enrollmentNumber).trim(),
      mobileNumber: String(mobileNumber).trim(),
      department: department || 'Computer Science & Engineering',
      semester: semester || '1st Semester',
      avatar: null
    });

    // Consumed — the next registration attempt for this email needs a
    // fresh OTP.
    await emailOtps.deleteByEmail(emailValue, 'register');

    const token = signToken(newUser);

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
apiRouter.post('/auth/login', loginLimiter, async (req, res) => {
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

    const passwordMatches = await users.verifyPassword(String(password), user.passwordHash);
    if (!passwordMatches) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Checked only after the password is right, so a wrong guess can't reveal
    // whether an account exists or is blocked.
    if (user.isBlocked) {
      return res.status(403).json({
        error: 'ACCOUNT BLOCKED: You have received 5 or more verified complaints. Only CS Admin can unblock your account.'
      });
    }


    const token = signToken(user);

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

// POST /api/auth/logout — ends this login on the server too: every token issued
// to this user so far stops working (so a copied token can't be reused).
apiRouter.post('/auth/logout', authenticateToken, async (req, res) => {
  try {
    await users.bumpTokenVersion(req.user._id);
    return res.json({ message: 'Logged out' });
  } catch (err) {
    console.error('logout error:', err);
    return res.status(500).json({ error: 'Could not log out' });
  }
});

// ----------------------------------------------------
// FORGOT PASSWORD (email OTP) — mirrors the register OTP flow, but requires
// an account to already EXIST for the email, and uses purpose 'reset' so it
// never interferes with a pending registration OTP for the same address.
// ----------------------------------------------------

// POST /api/auth/forgot-password/send-otp
apiRouter.post('/auth/forgot-password/send-otp', otpSendLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const emailValue = String(email).trim().toLowerCase();
    if (!COLLEGE_EMAIL_REGEX.test(emailValue)) {
      return res.status(400).json({
        error: 'Please use your college CS email. Format: 0801CSYYRRRR@sgsits.ac.in'
      });
    }

    const existingUser = await users.findByEmail(emailValue);
    if (!existingUser) {
      return res.status(404).json({ error: 'No account found with this email.' });
    }

    const waitSeconds = await otpCooldownLeft(emailValue, 'reset');
    if (waitSeconds > 0) {
      return res.status(429).json({ error: `Please wait ${waitSeconds} seconds before requesting another OTP.` });
    }

    const otpCode = generateOtp();
    await emailOtps.create(emailValue, otpCode, 'reset', 1);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] reset OTP for ${emailValue}: ${otpCode}`);
    }

    try {
      await sendOtpEmail(emailValue, otpCode, 'reset');
    } catch (mailErr) {
      console.error('send reset otp email error:', mailErr);
      return res.status(500).json({ error: 'Could not send verification email. Please try again in a moment.' });
    }

    return res.json({ message: 'A 6-digit code has been sent to your email. It is valid for 1 minute.' });
  } catch (err) {
    console.error('forgot-password send-otp error:', err);
    return res.status(500).json({ error: 'Could not send OTP' });
  }
});

// POST /api/auth/forgot-password/verify-otp
apiRouter.post('/auth/forgot-password/verify-otp', otpVerifyLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const emailValue = String(email).trim().toLowerCase();
    const otpError = await checkOtpGuess(emailValue, 'reset', otp);
    if (otpError) {
      return res.status(400).json({ error: otpError });
    }

    await emailOtps.markVerified(emailValue, 'reset');
    return res.json({ message: 'OTP verified. You can now set a new password.' });
  } catch (err) {
    console.error('forgot-password verify-otp error:', err);
    return res.status(500).json({ error: 'Could not verify OTP' });
  }
});

// POST /api/auth/forgot-password/reset — final step: requires a verified
// 'reset' OTP for this email, consumes it on success.
apiRouter.post('/auth/forgot-password/reset', otpVerifyLimiter, async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required' });
    }
    const newPasswordError = passwordProblem(newPassword);
    if (newPasswordError) {
      return res.status(400).json({ error: newPasswordError });
    }

    const emailValue = String(email).trim().toLowerCase();

    const otpVerified = await emailOtps.isVerified(emailValue, 'reset');
    if (!otpVerified) {
      return res.status(400).json({ error: 'Please verify your email with the OTP before resetting your password.' });
    }

    const existingUser = await users.findByEmail(emailValue);
    if (!existingUser) {
      return res.status(404).json({ error: 'No account found with this email.' });
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 10);
    await users.setPassword(existingUser._id, passwordHash);
    await users.bumpTokenVersion(existingUser._id); // old logins must not survive a password reset

    // Consumed — a future reset for this email needs a fresh OTP.
    await emailOtps.deleteByEmail(emailValue, 'reset');

    return res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (err) {
    console.error('forgot-password reset error:', err);
    return res.status(500).json({ error: 'Could not reset password' });
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

    // ownerComplaints = non-rejected complaints against the owner, without
    // reporter / proof / admin-note details (public endpoint).
    const [ownerRatings, ownerComplaints] = await Promise.all([
      ratings.findForUser(item.ownerId),
      complaints.findPublicAgainst(item.ownerId)
    ]);

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
      ownerRatings,
      ownerComplaints
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

    const checked = validateItem(req.body);
    if (checked.error) {
      return res.status(400).json({ error: checked.error });
    }

    const newItem = await items.create({
      ownerId: user._id,
      title: checked.value.title,
      category: checked.value.category,
      description: checked.value.description,
      images: checked.value.images,
      rentPricePerDay: checked.value.rentPricePerDay,
      securityDeposit: checked.value.securityDeposit,
      condition: checked.value.condition,
      pickupLocation: checked.value.pickupLocation
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

    const checked = validateItem(req.body, { partial: true });
    if (checked.error) {
      return res.status(400).json({ error: checked.error });
    }
    const changes = checked.value;

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
    const { itemId, startDate, endDate, isFastDelivery } = req.body;

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

    // Fast Delivery: surcharge = 25% of the rental fee (never trusted from
    // the client — recomputed here) + a server-generated 30-minute deadline.
    const rentalFee = diffDays * item.rentPricePerDay;
    const fastDelivery = Boolean(isFastDelivery);
    const fastDeliveryFee = fastDelivery ? Math.round(rentalFee * FAST_DELIVERY_FEE_PERCENT) : 0;
    const totalCost = rentalFee + item.securityDeposit + fastDeliveryFee;
    const expiresAt = fastDelivery
      ? new Date(Date.now() + FAST_DELIVERY_WINDOW_MINUTES * 60 * 1000)
      : null;

    const newBooking = await bookings.create({
      itemId: item._id,
      borrowerId: borrower._id,
      ownerId: item.ownerId,
      startDate,
      endDate,
      totalDays: diffDays,
      totalCost,
      isFastDelivery: fastDelivery,
      fastDeliveryFee,
      expiresAt
    });

    if (fastDelivery) {
      console.log(
        `[FAST_BOOKING_CREATED] booking_id=${newBooking._id} user_id=${newBooking.borrowerId} owner_id=${newBooking.ownerId} product_id=${newBooking.itemId} timestamp=${new Date().toISOString()}`
      );
    }

    await notifications.create({
      userId: item.ownerId,
      title: fastDelivery ? '⚡ FAST DELIVERY Booking Request' : 'New Booking Request',
      message: fastDelivery
        ? `${borrower.name} requested to rent "${item.title}" with FAST DELIVERY — accept within 30 minutes or the request will automatically expire.`
        : `${borrower.name} requested to rent "${item.title}" for ${diffDays} days.`,
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

// New status -> the only status a booking may be in beforehand.
// (Expired is set only by the server's own expiry job.)
const BOOKING_TRANSITIONS = {
  Accepted: 'Pending',
  Rejected: 'Pending',
  Completed: 'Accepted'
};

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
    // Only these changes exist, and each one is allowed from one stage only.
    // Borrowers cannot change status at all: accepting, rejecting and marking
    // the item returned (Completed) are the owner's (or admin's) decisions.
    if (typeof status !== 'string' || !Object.prototype.hasOwnProperty.call(BOOKING_TRANSITIONS, status)) {
      return res.status(400).json({ error: 'Invalid booking status' });
    }
    if (!isOwner && user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the item owner can accept, reject or complete a booking' });
    }

    let updated;

    if (status === 'Accepted') {
      // Atomic, expiry-aware accept — the single source of truth. This
      // still rejects a late accept even if the background sweep (which
      // runs once a minute) hasn't caught this booking yet.
      updated = await bookings.acceptIfPending(req.params.id);
      if (!updated) {
        const fresh = await bookings.findById(req.params.id);
        if (fresh?.status === 'Expired') {
          return res.status(409).json({
            error: 'This Fast Delivery request expired before you accepted it. It can no longer be accepted.'
          });
        }
        return res.status(409).json({
          error: `This booking is no longer pending (current status: ${fresh?.status || 'unknown'}).`
        });
      }
      console.log(
        `[FAST_BOOKING_ACCEPTED] booking_id=${updated._id} user_id=${updated.borrowerId} owner_id=${updated.ownerId} product_id=${updated.itemId} timestamp=${new Date().toISOString()}`
      );
    } else {
      updated = await bookings.updateStatusIf(req.params.id, BOOKING_TRANSITIONS[status], status);
      if (!updated) {
        const fresh = await bookings.findById(req.params.id);
        return res.status(409).json({
          error: `This booking can't be marked ${status} from its current status (${fresh?.status || 'unknown'}).`
        });
      }
      if (status === 'Rejected' && booking.isFastDelivery) {
        console.log(
          `[FAST_BOOKING_REJECTED] booking_id=${updated._id} user_id=${updated.borrowerId} owner_id=${updated.ownerId} product_id=${updated.itemId} timestamp=${new Date().toISOString()}`
        );
      }
    }

    const targetUserId = booking.borrowerId; // the actor is always the owner/admin
    await notifications.create({
      userId: targetUserId,
      title: `Booking ${updated.status}`,
      message: `Booking for "${booking.itemTitle}" status updated to: ${updated.status}`,
      type: 'booking',
      link: '/bookings'
    });

    return res.json({ message: `Booking status updated to ${updated.status}`, booking: updated });
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
          isDirect: false,
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

    // Direct (non-booking) threads: every student always sees a thread with
    // the CS Admin (even before the first message); an admin sees one entry
    // per student who has messaged in.
    if (req.user.role === 'admin') {
      const threads = await messages.findAdminInboxThreads(userId);
      for (const t of threads) {
        conversations.push({
          booking: null,
          isDirect: true,
          participant: { _id: t.otherId, name: t.otherName, avatar: t.otherAvatar },
          lastMessage: t.lastMessage,
          unreadCount: t.unreadCount,
          lastActivityAt: t.lastMessage.timestamp
        });
      }
    } else {
      const admins = await users.findAdmins();
      if (admins.length) {
        const admin = admins[0];
        const thread = await messages.findDirectThread(userId, admin._id);
        const last = thread[thread.length - 1] || null;
        const unreadCount = thread.filter((m) => m.receiverId === userId && !m.isRead).length;

        conversations.push({
          booking: null,
          isDirect: true,
          participant: { _id: admin._id, name: admin.name, avatar: admin.avatar },
          lastMessage: last,
          unreadCount,
          lastActivityAt: last?.timestamp || null
        });
      }
    }

    conversations.sort((a, b) => new Date(b.lastActivityAt || 0) - new Date(a.lastActivityAt || 0));

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
    const { bookingId } = req.body;
    const content = cleanMessage(req.body.content);

    if (!bookingId || !content) {
      return res.status(400).json({ error: 'Booking ID and a message (up to 2000 characters) are required' });
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

    await notifications.create({
      userId: receiverId,
      title: `New message from ${sender.name}`,
      message: content.length > 60 ? `${content.slice(0, 60)}...` : content,
      type: 'chat',
      link: `/messages?booking=${bookingId}`
    });

    return res.status(201).json({ message: newMsg });
  } catch (err) {
    console.error('send message error:', err);
    return res.status(500).json({ error: 'Could not send message' });
  }
});

// ----------------------------------------------------
// DIRECT MESSAGES (student <-> admin, not tied to a booking)
// ----------------------------------------------------

// GET /api/messages/direct/admin-contact — who to message ("Message Admin" button)
apiRouter.get('/messages/direct/admin-contact', authenticateToken, async (req, res) => {
  try {
    const admins = await users.findAdmins();
    if (!admins.length) {
      return res.status(404).json({ error: 'No admin account is configured' });
    }
    const admin = admins[0];
    return res.json({ admin: { _id: admin._id, name: admin.name, avatar: admin.avatar } });
  } catch (err) {
    console.error('admin-contact error:', err);
    return res.status(500).json({ error: 'Could not load admin contact' });
  }
});

// GET /api/messages/direct — admin's inbox: one row per student thread (admin only)
apiRouter.get('/messages/direct', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const threads = await messages.findAdminInboxThreads(req.user._id);
    return res.json({ threads });
  } catch (err) {
    console.error('admin inbox error:', err);
    return res.status(500).json({ error: 'Could not load messages' });
  }
});

// POST /api/messages/direct — send a direct message. Students may only
// message an admin; admins may reply to anyone.
apiRouter.post('/messages/direct', authenticateToken, async (req, res) => {
  try {
    const sender = req.user;
    const { receiverId } = req.body;
    const content = cleanMessage(req.body.content);

    if (!receiverId || !content) {
      return res.status(400).json({ error: 'Recipient and a message (up to 2000 characters) are required' });
    }

    if (sender.role !== 'admin') {
      const receiver = await users.findById(receiverId);
      if (!receiver || receiver.role !== 'admin') {
        return res.status(403).json({ error: 'You can only message the CS Admin directly' });
      }
    }

    const newMsg = await messages.createDirect({ senderId: sender._id, receiverId, content });

    await notifications.create({
      userId: receiverId,
      title: `New message from ${sender.name}`,
      message: content.length > 60 ? `${content.slice(0, 60)}...` : content,
      type: 'chat',
      link: `/messages?direct=${sender._id}`
    });

    return res.status(201).json({ message: newMsg });
  } catch (err) {
    console.error('send direct message error:', err);
    return res.status(500).json({ error: 'Could not send message' });
  }
});

// GET /api/messages/direct/:userId — the thread between me and :userId.
// A student can only open a thread with an admin; an admin can open a
// thread with any student.
apiRouter.get('/messages/direct/:userId', authenticateToken, async (req, res) => {
  try {
    const me = req.user;
    const otherId = req.params.userId;

    if (me.role !== 'admin') {
      const other = await users.findById(otherId);
      if (!other || other.role !== 'admin') {
        return res.status(403).json({ error: 'Direct messaging is only available with the CS Admin' });
      }
    }

    const thread = await messages.findDirectThread(me._id, otherId);
    await messages.markDirectReadForReceiver(otherId, me._id);

    return res.json({ messages: thread });
  } catch (err) {
    console.error('direct thread error:', err);
    return res.status(500).json({ error: 'Could not load messages' });
  }
});

// ----------------------------------------------------
// COMPLAINT & AUTO-BLOCK APIs
// ----------------------------------------------------

// POST /api/complaints/proof — uploads a proof image/PDF to disk and
// returns its URL, to be included as proofUrl in the POST /complaints call
// right after. Keeps the actual file out of the request body/DB.
apiRouter.post('/complaints/proof', authenticateToken, proofUpload.single('proof'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file received' });
  }
  return res.json({ url: `/uploads/complaint-proofs/${req.file.filename}` });
});

// Allowed complaint types / statuses (must match the frontend dropdown and the admin actions).
const COMPLAINT_TYPES = ['Demanding More Money', 'Fake Listing', 'Damaged Item', 'Fraud', 'Misbehavior', 'Other'];
const COMPLAINT_STATUSES = ['Pending', 'Under Review', 'Resolved', 'Rejected'];

// proofUrl must be a file the reporter themself uploaded via /complaints/proof
// (stored as /uploads/complaint-proofs/<their user id>_<something>.<ext>).
// Anything else — javascript: links, other sites, someone else's file — is refused.
function isOwnProofUrl(proofUrl, reporterId) {
  if (typeof proofUrl !== 'string') return false;
  const escapedId = String(reporterId).replace(/[^A-Za-z0-9_-]/g, '');
  const re = new RegExp('^/uploads/complaint-proofs/' + escapedId + '_[A-Za-z0-9._-]+\\.(png|jpe?g|webp|gif|pdf)$', 'i');
  if (!re.test(proofUrl)) return false;
  const file = path.join(process.cwd(), 'uploads', 'complaint-proofs', path.basename(proofUrl));
  return fs.existsSync(file);
}

// POST /api/complaints
apiRouter.post('/complaints', authenticateToken, complaintLimiter, async (req, res) => {
  try {
    const reporter = req.user;
    const { reportedUserId, bookingId, type, description, proofUrl, itemTitle } = req.body;

    if (!reportedUserId || !type || !description) {
      return res.status(400).json({ error: 'Reported user, complaint type, and description are required' });
    }

    // Proof image is mandatory — no default/placeholder image is used as a
    // fallback. The client must upload a file via POST /complaints/proof
    // first and pass the returned url here.
    if (!proofUrl) {
      return res.status(400).json({ error: 'Please upload an image as proof before submitting the complaint.' });
    }

    const trimmed = String(reportedUserId).trim();
    const reportedUser = (await users.findById(trimmed)) || (await users.findByEmail(trimmed));
    if (!reportedUser) {
      return res.status(404).json({ error: 'Reported user not found' });
    }

    if (!COMPLAINT_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid complaint type' });
    }
    const descriptionText = String(description).trim();
    if (!descriptionText || descriptionText.length > 2000) {
      return res.status(400).json({ error: 'Description is required and must be at most 2000 characters' });
    }
    if (!isOwnProofUrl(proofUrl, reporter._id)) {
      return res.status(400).json({ error: 'Invalid proof file. Please upload your proof again.' });
    }
    if (String(reportedUser._id) === String(reporter._id)) {
      return res.status(400).json({ error: 'You cannot file a complaint against yourself' });
    }

    // If the complaint is tied to a booking, the reporter must be on it and
    // the reported student must be the other side; the item title comes from
    // the booking, not from the client.
    let booking = null;
    if (bookingId) {
      booking = await bookings.findById(bookingId);
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      const parties = [String(booking.borrowerId), String(booking.ownerId)];
      if (!parties.includes(String(reporter._id)) || !parties.includes(String(reportedUser._id))) {
        return res.status(403).json({ error: 'You can only report the other person on your own booking' });
      }
    }

    if (await complaints.existsActive(reporter._id, reportedUser._id, booking ? booking._id : null)) {
      return res.status(409).json({ error: 'You have already filed a complaint against this student for this booking.' });
    }

    const newComplaint = await complaints.create({
      reporterId: reporter._id,
      reportedUserId: reportedUser._id,
      bookingId: booking ? booking._id : null,
      itemTitle: booking ? booking.itemTitle : null,
      type,
      description: descriptionText,
      proofUrl
    });

    // No auto-block here: only complaints the admin verifies (Resolved) count,
    // and that check runs in PUT /admin/complaints/:id.

    const admins = await users.findAdmins();
    await Promise.all(
      admins.map((admin) =>
        notifications.create({
          userId: admin._id,
          title: 'New Complaint Filed',
          message: `${reporter.name} reported ${reportedUser.name} for "${type}".`,
          type: 'complaint',
          link: '/admin'
        })
      )
    );

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

    const starsNum = Number(stars);
    if (!Number.isInteger(starsNum) || starsNum < 1 || starsNum > 5) {
      return res.status(400).json({ error: 'Star rating must be a whole number from 1 to 5' });
    }

    if (String(revieweeId) === String(reviewer._id)) {
      return res.status(400).json({ error: 'You cannot rate yourself' });
    }

    // Only the two people on a booking can rate each other, once per booking.
    const booking = await bookings.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const parties = [String(booking.borrowerId), String(booking.ownerId)];
    if (!parties.includes(String(reviewer._id)) || !parties.includes(String(revieweeId))) {
      return res.status(403).json({ error: 'You can only rate the other person on your own booking' });
    }
    if (booking.status !== 'Completed') {
      return res.status(400).json({ error: 'You can rate only after the booking is completed' });
    }
    if (await ratings.existsForBooking(bookingId, reviewer._id)) {
      return res.status(409).json({ error: 'You have already rated this booking' });
    }

    const newRating = await ratings.create({
      bookingId,
      revieweeId,
      reviewerId: reviewer._id,
      stars: starsNum,
      comment: (typeof comment === 'string' && comment.trim() ? comment.trim() : 'Great CS resource exchange!').slice(0, 500)
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
// Manual admin block/unblock (works even with just 1 complaint). setBlocked
// defaults to source 'manual', so these are never auto-unblocked.
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
    if (status !== undefined && !COMPLAINT_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid complaint status' });
    }
    if (adminNote !== undefined && String(adminNote).length > 2000) {
      return res.status(400).json({ error: 'Admin note is too long (max 2000 characters)' });
    }
    const updated = await complaints.update(req.params.id, { status, adminNote });

    if (status && status !== complaint.status) {
      await notifications.create({
        userId: complaint.reporterId,
        title: 'Complaint Status Updated',
        message: `Your complaint against ${complaint.reportedUserName} is now: ${status}.`,
        type: 'complaint',
        link: '/complaints'
      });
    }

    if (status === 'Resolved') {
      const isNowBlocked = await checkAndApplyAutoBlock(complaint.reportedUserId);
      return res.json({
        message: `Complaint status updated to ${status}.${isNowBlocked ? ' Reported user reached complaint limit and has been AUTO-BLOCKED!' : ''}`,
        complaint: updated,
        userAutoBlocked: isNowBlocked
      });
    }

    if (status === 'Rejected') {
      // Dismissed as a fake/invalid complaint — recompute the reported
      // student's complaint count. If they were AUTO-blocked and now have
      // fewer than 5 complaints, checkAndApplyAutoBlock unblocks them.
      await checkAndApplyAutoBlock(complaint.reportedUserId);
      return res.json({ message: 'Complaint rejected and removed from student\'s record', complaint: updated });
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

// ----------------------------------------------------
// GLOBAL ERROR HANDLER
// ----------------------------------------------------
// Without this, an error thrown by multer (bad file type, file too large)
// or anything else outside a route's own try/catch would reach Express's
// default handler and the connection could close without a proper JSON
// body — which is what causes the frontend's
// "Unexpected end of JSON input" error. This guarantees every error
// response is real, parseable JSON.
apiRouter.use((err, req, res, next) => {
  console.error('Unhandled API error:', err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File is too large. Max size is 5 MB.' });
    }
    return res.status(400).json({ error: err.message || 'File upload error' });
  }

  // fileFilter in upload.js rejects bad file types via a plain Error
  if (err && err.message && err.message.toLowerCase().includes('allowed')) {
    return res.status(400).json({ error: err.message });
  }

  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
});