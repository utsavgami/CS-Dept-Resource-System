import { db } from '../db.js';
import { UserModel } from '../models/UserModel.js';
import { ItemModel } from '../models/ItemModel.js';

export const UserController = {
  getProfile(req, res) {
    const user = UserModel.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const ratings = db.ratings.filter((rating) => rating.revieweeId === user._id);
    const borrowedCount = db.bookings.filter(
      (booking) => booking.borrowerId === user._id && booking.status === 'Completed'
    ).length;

    return res.json({
      user: { ...user },
      listingsCount: ItemModel.findByOwnerId(user._id).length,
      borrowedCount,
      ratings
    });
  },

  updateProfile(req, res) {
    const user = UserModel.updateProfile(req.user, req.body);
    ItemModel.syncOwnerDetails(user);
    return res.json({ message: 'Profile updated successfully', user });
  }
};
