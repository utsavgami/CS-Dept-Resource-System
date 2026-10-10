import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { apiRouter, JWT_SECRET, tokenIsCurrent } from './server/api.js';
import { bookings, complaints, messages, notifications, pool, users } from './server/db.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Behind a proxy (nginx, Render, Railway, ...) every request would look like it
  // comes from the proxy's IP, so rate limits would treat all students as one.
  // Set TRUST_PROXY=1 in .env on the server (number of proxies in front of the app).
  // Leave it unset when running directly (e.g. on your laptop): trusting the header
  // without a proxy would let anyone fake their IP and dodge the limits.
  if (process.env.TRUST_PROXY) {
    const hops = Number(process.env.TRUST_PROXY);
    app.set('trust proxy', Number.isInteger(hops) ? hops : process.env.TRUST_PROXY);
  }

  // Quick startup check so the terminal shows whether Postgres actually connected.
  try {
    const result = await pool.query('SELECT NOW()');
    console.log(`[Postgres] Connected successfully — server time: ${result.rows[0].now}`);
  } catch (err) {
    console.error('[Postgres] Connection FAILED:', err.message);
    console.error('[Postgres] Check your .env values (PGHOST/PGUSER/PGPASSWORD/PGDATABASE) and that Postgres is running.');
    process.exit(1);
  }

  // Which websites may call this API from a browser. The app itself is served
  // by this same server, so it needs no CORS at all; this list only matters if
  // you host the frontend on a different address. Set CLIENT_ORIGIN in .env
  // (comma-separated) to allow more, e.g. CLIENT_ORIGIN=https://yourdomain.com
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...String(process.env.CLIENT_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean)
  ];
  const originAllowed = (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin));

  // Standard security headers (nosniff, clickjacking protection, HSTS, referrer policy...).
  // CSP is left off for now: it needs separate testing against the built site.
  app.use(helmet({ contentSecurityPolicy: false, crossOriginOpenerPolicy: false }));
  app.use(cors({ origin: originAllowed }));
  app.use(express.json({ limit: '10mb' }));

  // HTTP server wrap for Socket.io
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: {
      origin: originAllowed,
      methods: ['GET', 'POST']
    }
  });

  // Every socket must present a valid login token (same JWT as the REST API).
  // The client passes it via io({ auth: { token } }).
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await users.findById(decoded.userId);
      if (!user || user.isBlocked || !tokenIsCurrent(decoded, user)) return next(new Error('Authentication failed'));
      socket.data.user = user;
      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });

  const MAX_CHAT_LENGTH = 2000;

  // Same access rule as the REST chat routes: the borrower, the owner, or an admin.
  const canAccessBooking = (booking, user) =>
    !!booking && (booking.borrowerId === user._id || booking.ownerId === user._id || user.role === 'admin');

  // Real-Time Socket.io Chat Events
  io.on('connection', (socket) => {
    const user = socket.data.user;
    console.log('[Socket.io] Client connected:', socket.id);

    socket.on('join_booking_room', async (bookingId) => {
      try {
        const booking = await bookings.findById(bookingId);
        if (!canAccessBooking(booking, user)) return; // not your chat
        socket.join(`booking_${booking._id}`);
        console.log(`[Socket.io] Client ${socket.id} joined room booking_${booking._id}`);
      } catch (err) {
        console.error('[Socket.io] join_booking_room error:', err);
      }
    });

    socket.on('send_chat_message', async (data) => {
      try {
        // Sender is always the authenticated user; the receiver is derived from
        // the booking. Nothing identity-related is taken from the client payload.
        const booking = await bookings.findById(data?.bookingId);
        if (!canAccessBooking(booking, user)) return;
        if (booking.status !== 'Accepted' && booking.status !== 'Completed' && user.role !== 'admin') return;

        const content = typeof data.content === 'string' ? data.content.trim() : '';
        if (!content || content.length > MAX_CHAT_LENGTH) return;

        const receiverId = booking.borrowerId === user._id ? booking.ownerId : booking.borrowerId;

        const newMsg = await messages.create({
          bookingId: booking._id,
          senderId: user._id,
          receiverId,
          content
        });

        // Broadcast to room
        io.to(`booking_${booking._id}`).emit('receive_chat_message', newMsg);

        // Create notification
        await notifications.create({
          userId: receiverId,
          title: `Message from ${user.name}`,
          message: content.substring(0, 60) + (content.length > 60 ? '...' : ''),
          type: 'chat',
          link: `/messages?booking=${booking._id}`
        });
      } catch (err) {
        console.error('[Socket.io] send_chat_message error:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log('[Socket.io] Client disconnected:', socket.id);
    });
  });

  // Uploaded files. Only the avatars folder is public; everything else
  // (complaint proofs) is served through an authenticated route below.
  // nosniff + a locked-down CSP mean a browser never treats an upload as a page.
  const safeFileHeaders = (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  };
  app.use(
    '/uploads/avatars',
    express.static(path.join(process.cwd(), 'uploads', 'avatars'), { index: false, setHeaders: safeFileHeaders })
  );

  // Complaint proofs: only the reporter, the reported student, or an admin.
  // The client sends the normal login token in the Authorization header
  // (the frontend fetches the file and shows it from memory).
  app.get('/uploads/complaint-proofs/:file', async (req, res) => {
    try {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;
      if (!token) return res.status(401).json({ error: 'Login required' });

      let user;
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        user = await users.findById(decoded.userId);
        if (user && !tokenIsCurrent(decoded, user)) user = null;
      } catch {
        return res.status(401).json({ error: 'Login required' });
      }
      if (!user || user.isBlocked) return res.status(401).json({ error: 'Login required' });

      const file = req.params.file;
      if (!/^[A-Za-z0-9._-]+$/.test(file)) return res.status(404).json({ error: 'File not found' });

      const complaint = await complaints.findByProofUrl(`/uploads/complaint-proofs/${file}`);
      const allowed =
        user.role === 'admin' ||
        file.startsWith(`${user._id}_`) || // the uploader (before the complaint is filed)
        (complaint && (complaint.reporterId === user._id || complaint.reportedUserId === user._id));
      if (!allowed) return res.status(403).json({ error: 'Not allowed to view this file' });

      safeFileHeaders(res);
      res.setHeader('Cache-Control', 'private, no-store');
      return res.sendFile(file, { root: path.join(process.cwd(), 'uploads', 'complaint-proofs'), dotfiles: 'deny' }, (err) => {
        if (err && !res.headersSent) res.status(404).json({ error: 'File not found' });
      });
    } catch (err) {
      console.error('[uploads] proof route error:', err);
      return res.status(500).json({ error: 'Could not load file' });
    }
  });

  // Mount API router FIRST
  app.use('/api', apiRouter);

  // Path to the frontend project (sibling folder: ../frontend)
  const frontendRoot = path.join(process.cwd(), '..', 'frontend');

  // Vite middleware or production static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      root: frontendRoot,
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(frontendRoot, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`CS Department Resource Sharing System Server running`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`====================================================`);
  });

  // Fast Delivery expiry sweep — auto-flips any Pending Fast Delivery
  // booking whose 30-minute deadline has passed to 'Expired', and notifies
  // both sides. This is a backstop: the accept endpoint (PUT
  // /bookings/:id/status) ALSO enforces the deadline on every accept
  // attempt, so correctness never depends on this job having run recently.
  // Runs once at startup (catches anything missed while the server was
  // down) and then every minute. Idempotent — safe to run repeatedly.
  const runFastDeliverySweep = () => {
    bookings.expireOverdueFastDeliveryRequests().catch((err) => {
      console.error('[FastDelivery] expiry sweep failed:', err);
    });
  };
  runFastDeliverySweep();
  setInterval(runFastDeliverySweep, 60 * 1000);
}

startServer();