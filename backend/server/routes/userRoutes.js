import express from 'express';
import { UserController } from '../controllers/UserController.js';

export function createUserRouter(authenticateToken) {
  const router = express.Router();
  router.get('/:id', UserController.getProfile);
  router.put('/profile', authenticateToken, UserController.updateProfile);
  return router;
}