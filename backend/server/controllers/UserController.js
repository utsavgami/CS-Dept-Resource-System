import fs from 'fs';
import path from 'path';
import { users, bookings, ratings } from '../db.js';
import { UserModel } from '../models/UserModel.js';
import { ItemModel } from '../models/ItemModel.js';

// Deletes the previously-stored avatar file from disk, if any. Safe to call
// with null/undefined; only ever touches files under uploads/avatars.
function deleteAvatarFile(avatarUrl) {
  if (!avatarUrl || !avatarUrl.startsWith('/uploads/avatars/')) return;
  const filePath = path.join(process.cwd(), avatarUrl);
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error('Could not delete old avatar file:', err.message);
    }
  });
}

export const UserController = {
  async getProfile(req, res) {
    try {
      const user = await UserModel.findById(req.params.id);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const [userRatings, listings, borrowedBookings, lentBookings] = await Promise.all([
        ratings.findForUser(user._id),
        ItemModel.findByOwnerId(user._id),
        bookings.findByBorrower(user._id),
        bookings.findByOwner(user._id)
      ]);

      // Completed borrows = items this user rented from others.
      // Completed lends   = this user's own items that others rented and returned.
      const borrowedCount = borrowedBookings.filter((b) => b.status === 'Completed').length;
      const lentCount = lentBookings.filter((b) => b.status === 'Completed').length;

      // Public-safe view: other students must never receive email, phone,
      // password hash or admin-only flags — only what a profile page needs.
      const publicUser = {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
        department: user.department,
        semester: user.semester,
        role: user.role,
        enrollmentNumber: user.enrollmentNumber,
        verified: user.verified,
        averageRating: user.averageRating,
        totalRatings: user.totalRatings,
        createdAt: user.createdAt
      };
      const publicListings = listings.map(({ ownerEmail, ownerPhone, ...rest }) => rest);

      return res.json({
        user: publicUser,
        listingsCount: listings.length,
        borrowedCount,
        lentCount,
        ratings: userRatings,
        listings: publicListings
      });
    } catch (err) {
      console.error('getProfile error:', err);
      return res.status(500).json({ error: 'Could not load profile' });
    }
  },

  async updateProfile(req, res) {
    try {
      const updated = await UserModel.updateProfile(req.user, req.body);
      ItemModel.syncOwnerDetails(updated);
      return res.json({ message: 'Profile updated successfully', user: { ...updated, passwordHash: undefined } });
    } catch (err) {
      console.error('updateProfile error:', err);
      return res.status(500).json({ error: 'Could not update profile' });
    }
  },

  async uploadAvatar(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file received' });
      }

      const previousAvatar = req.user.avatar;
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      const updated = await UserModel.updateProfile(req.user, { avatar: avatarUrl });
      ItemModel.syncOwnerDetails(updated);
      deleteAvatarFile(previousAvatar);

      return res.json({ message: 'Profile photo updated', user: { ...updated, passwordHash: undefined } });
    } catch (err) {
      console.error('uploadAvatar error:', err);
      return res.status(500).json({ error: 'Could not upload profile photo' });
    }
  },

  async removeAvatar(req, res) {
    try {
      const previousAvatar = req.user.avatar;
      const updated = await UserModel.removeAvatar(req.user);
      ItemModel.syncOwnerDetails(updated);
      deleteAvatarFile(previousAvatar);

      return res.json({ message: 'Profile photo removed', user: { ...updated, passwordHash: undefined } });
    } catch (err) {
      console.error('removeAvatar error:', err);
      return res.status(500).json({ error: 'Could not remove profile photo' });
    }
  }
};