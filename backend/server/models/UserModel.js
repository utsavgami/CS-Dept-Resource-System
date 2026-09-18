import { users } from '../db.js';

/**
 * Model boundary for users — hides the database layer from controllers.
 * Same shape as before, but every method is now async (Postgres, not an
 * in-memory array), so callers must `await` them.
 */
export const UserModel = {
  findById: (id) => users.findById(id),

  findByEmail: (email) => users.findByEmail(email),

  updateProfile: (user, changes) => users.updateProfile(user._id, changes)
};