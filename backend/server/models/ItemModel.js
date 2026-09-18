import { items } from '../db.js';

/**
 * Model boundary for items. `syncOwnerDetails` no longer needs to do
 * anything: owner name/avatar are now joined live from the users table on
 * every read, so there's nothing to keep in sync when a profile changes.
 */
export const ItemModel = {
  findByOwnerId: (ownerId) => items.findByOwnerId(ownerId),

  // Kept as a no-op so UserController.updateProfile doesn't need to change.
  syncOwnerDetails(_user) {
    // Intentionally empty — owner_name/owner_avatar are joined from `users`
    // at read time (see db.js's ITEM_SELECT), not stored on items.
  }
};