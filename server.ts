import express from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import { apiRouter } from './server/api.js';
import { db } from './server/db.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

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

    socket.on('join_booking_room', (bookingId: string) => {
      socket.join(`booking_${bookingId}`);
      console.log(`[Socket.io] Client ${socket.id} joined room booking_${bookingId}`);
    });

    socket.on('send_chat_message', (data: {
      bookingId: string;
      senderId: string;
      senderName: string;
      receiverId: string;
      receiverName: string;
      content: string;
    }) => {
      const newMsg = {
        _id: `msg_${Date.now()}`,
        bookingId: data.bookingId,
        senderId: data.senderId,
        senderName: data.senderName,
        receiverId: data.receiverId,
        receiverName: data.receiverName,
        content: data.content,
        timestamp: new Date().toISOString(),
        isRead: false
      };

      db.messages.push(newMsg);

      // Broadcast to room
      io.to(`booking_${data.bookingId}`).emit('receive_chat_message', newMsg);

      // Create notification
      db.notifications.push({
        _id: `ntf_${Date.now()}`,
        userId: data.receiverId,
        title: `Message from ${data.senderName}`,
        message: data.content.substring(0, 60) + (data.content.length > 60 ? '...' : ''),
        type: 'chat',
        read: false,
        link: `/messages?booking=${data.bookingId}`,
        createdAt: new Date().toISOString()
      });
    });

    socket.on('disconnect', () => {
      console.log('[Socket.io] Client disconnected:', socket.id);
    });
  });

  // Mount API router FIRST
  app.use('/api', apiRouter);

  // Vite middleware or production static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
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
