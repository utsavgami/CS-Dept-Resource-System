import express from 'express';
import { UserController } from '../controllers/UserController.js';
import { avatarUpload } from '../middleware/upload.js';

export function createUserRouter(authenticateToken) {
  const router = express.Router();
  router.get('/:id', UserController.getProfile);
  router.put('/profile', authenticateToken, UserController.updateProfile);
  router.post('/avatar', authenticateToken, avatarUpload.single('avatar'), UserController.uploadAvatar);
  router.delete('/avatar', authenticateToken, UserController.removeAvatar);
  return router;
}