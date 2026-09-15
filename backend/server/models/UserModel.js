import { db } from '../db.js';

/**
 * Model boundary for users.  It deliberately hides the in-memory store so it
 * can later be replaced with a database without changing controllers.
 */
export const UserModel = {
  findById: (id) => db.users.find((user) => user._id === id),
  findByEmail: (email) => db.users.find((user) => user.email.toLowerCase() === email.toLowerCase()),
  updateProfile(user, changes) {
    for (const key of ['name', 'mobileNumber', 'semester', 'avatar']) {
      if (changes[key]) user[key] = changes[key];
    }
    user.updatedAt = new Date().toISOString();
    return user;
  }
};
