import { db } from '../db.js';

export const ItemModel = {
  findByOwnerId: (ownerId) => db.items.filter((item) => item.ownerId === ownerId),
  syncOwnerDetails(user) {
    db.items.forEach((item) => {
      if (item.ownerId === user._id) {
        item.ownerName = user.name;
        item.ownerAvatar = user.avatar;
      }
    });
  }
};
