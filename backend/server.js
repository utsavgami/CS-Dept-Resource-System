import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import { apiRouter } from './server/api.js';
import { bookings, messages, notifications, pool } from './server/db.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Quick startup check so the terminal shows whether Postgres actually connected.
  try {
    const result = await pool.query('SELECT NOW()');
    console.log(`[Postgres] Connected successfully — server time: ${result.rows[0].now}`);
  } catch (err) {
    console.error('[Postgres] Connection FAILED:', err.message);
    console.error('[Postgres] Check your .env values (PGHOST/PGUSER/PGPASSWORD/PGDATABASE) and that Postgres is running.');
    process.exit(1);
  }

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // HTTP server wrap for Socket.io
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Real-Time Socket.io Chat Events
  io.on('connection', (socket) => {
    console.log('[Socket.io] Client connected:', socket.id);

    socket.on('join_booking_room', (bookingId) => {
      socket.join(`booking_${bookingId}`);
      console.log(`[Socket.io] Client ${socket.id} joined room booking_${bookingId}`);
    });

    socket.on('send_chat_message', async (data) => {
      try {
        // Only allow chat once the owner has accepted the booking (or later,
        // once completed) — same rule enforced by the REST /chat/messages route.
        const booking = await bookings.findById(data.bookingId);
        if (!booking || (booking.status !== 'Accepted' && booking.status !== 'Completed')) {
          return; // silently drop; the sender's REST call will already have
                  // been rejected with a proper error, this just guards the
                  // realtime path too.
        }

        const newMsg = await messages.create({
          bookingId: data.bookingId,
          senderId: data.senderId,
          receiverId: data.receiverId,
          content: data.content
        });

        // Broadcast to room
        io.to(`booking_${data.bookingId}`).emit('receive_chat_message', newMsg);

        // Create notification
        await notifications.create({
          userId: data.receiverId,
          title: `Message from ${data.senderName}`,
          message: data.content.substring(0, 60) + (data.content.length > 60 ? '...' : ''),
          type: 'chat',
          link: `/messages?booking=${data.bookingId}`
        });
      } catch (err) {
        console.error('[Socket.io] send_chat_message error:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log('[Socket.io] Client disconnected:', socket.id);
    });
  });

  // Serve uploaded profile photos
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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
}

startServer();