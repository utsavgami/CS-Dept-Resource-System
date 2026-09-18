import { users, bookings, ratings } from '../db.js';
import { UserModel } from '../models/UserModel.js';
import { ItemModel } from '../models/ItemModel.js';

export const UserController = {
  async getProfile(req, res) {
    try {
      const user = await UserModel.findById(req.params.id);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const [userRatings, listings, borrowedBookings] = await Promise.all([
        ratings.findForUser(user._id),
        ItemModel.findByOwnerId(user._id),
        bookings.findByBorrower(user._id)
      ]);

      const borrowedCount = borrowedBookings.filter((b) => b.status === 'Completed').length;

      return res.json({
        user: { ...user, passwordHash: undefined },
        listingsCount: listings.length,
        borrowedCount,
        ratings: userRatings
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
  }
};