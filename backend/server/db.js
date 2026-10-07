import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool, types } = pg;

// Postgres NUMERIC columns (rent_price_per_day, security_deposit, total_cost,
// average_rating, etc.) come back from node-postgres as STRINGS by default —
// this avoids precision loss for huge numbers, but it silently breaks normal
// arithmetic ("60" + "40" === "6040" via string concatenation instead of
// addition). None of our amounts need arbitrary precision, so parse NUMERIC
// (OID 1700) as a real float for every query in this app.
types.setTypeParser(1700, (value) => (value === null ? null : parseFloat(value)));

// ----------------------------------------------------
// Connection
// ----------------------------------------------------
// Prefer a single DATABASE_URL (e.g. postgres://user:pass@localhost:5432/resource_sharing_db),
// or fall back to individual PG* env vars.
export const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.PGHOST || 'localhost',
        port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || '',
        database: process.env.PGDATABASE || 'resource_sharing_db'
      }
);

pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error:', err.message);
});

// ----------------------------------------------------
// Row mapping helpers
// ----------------------------------------------------
// The app is written Mongo-style (every record has `_id`), but Postgres
// columns are snake_case with a plain `id` primary key. These helpers convert
// row shape at the boundary so the rest of the app doesn't need to change.

function toCamelKey(key) {
  return key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function rowToCamel(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key === 'id' ? '_id' : toCamelKey(key);
    out[camelKey] = value;
  }
  return out;
}

export async function queryRows(text, params = []) {
  const result = await pool.query(text, params);
  return result.rows.map(rowToCamel);
}

export async function queryOne(text, params = []) {
  const rows = await queryRows(text, params);
  return rows[0] || null;
}

export function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ----------------------------------------------------
// USERS
// ----------------------------------------------------
export const users = {
  findById: (id) => queryOne('SELECT * FROM users WHERE id = $1', [id]),

  findByEmail: (email) => queryOne('SELECT * FROM users WHERE lower(email) = lower($1)', [email]),

  findByEnrollment: (enrollmentNumber) =>
    queryOne('SELECT * FROM users WHERE lower(enrollment_number) = lower($1)', [enrollmentNumber]),

  create: ({ name, email, passwordHash, enrollmentNumber, mobileNumber, department, semester, avatar, role = 'student' }) => {
    const id = genId(role === 'admin' ? 'usr_admin' : 'usr_std');
    return queryOne(
      `INSERT INTO users
         (id, name, email, password_hash, enrollment_number, mobile_number, department, semester, role, avatar, average_rating, total_ratings)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,0)
       RETURNING *`,
      [id, name, email, passwordHash, enrollmentNumber, mobileNumber, department, semester, role, avatar]
    );
  },

  verifyPassword: (plainPassword, passwordHash) => bcrypt.compare(plainPassword, passwordHash),

  updateProfile: (id, { name, mobileNumber, semester, avatar }) =>
    queryOne(
      `UPDATE users SET
         name = COALESCE($2, name),
         mobile_number = COALESCE($3, mobile_number),
         semester = COALESCE($4, semester),
         avatar = COALESCE($5, avatar),
         updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id, name || null, mobileNumber || null, semester || null, avatar || null]
    ),

  // source: 'manual' (admin blocked) or 'auto' (5+ complaints). Only 'auto'
  // blocks are lifted automatically when complaints get rejected.
  // Needs: ALTER TABLE users ADD COLUMN IF NOT EXISTS block_source VARCHAR(10);
  setBlocked: (id, isBlocked, source = 'manual') =>
    queryOne(
      'UPDATE users SET is_blocked = $2, block_source = $3, updated_at = now() WHERE id = $1 RETURNING *',
      [id, isBlocked, isBlocked ? source : null]
    ),

  // updateProfile's COALESCE can only set avatar to a new truthy value, never
  // clear it back to null — this does the explicit clear for "remove photo".
  clearAvatar: (id) =>
    queryOne('UPDATE users SET avatar = NULL, updated_at = now() WHERE id = $1 RETURNING *', [id]),

  setPassword: (id, passwordHash) =>
    queryOne('UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1 RETURNING *', [id, passwordHash]),

  setComplaintCount: (id, count) =>
    queryOne('UPDATE users SET complaint_count = $2, updated_at = now() WHERE id = $1 RETURNING *', [id, count]),

  setRatingStats: (id, averageRating, totalRatings) =>
    queryOne(
      'UPDATE users SET average_rating = $2, total_ratings = $3, updated_at = now() WHERE id = $1 RETURNING *',
      [id, averageRating, totalRatings]
    ),

  findAllForAdmin: () => queryRows('SELECT * FROM users ORDER BY created_at DESC'),

  countStudents: async () => (await queryOne(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'student'`)).count,

  countBlocked: async () => (await queryOne('SELECT COUNT(*)::int AS count FROM users WHERE is_blocked = true')).count,

  findAdmins: () => queryRows(`SELECT * FROM users WHERE role = 'admin'`)
};

// ----------------------------------------------------
// ITEMS  (owner_name/email/phone/avatar/semester are joined live from users,
// not stored — the old in-memory copies could go stale on profile edits)
// ----------------------------------------------------
const ITEM_SELECT = `
  SELECT it.*,
         u.name AS owner_name, u.email AS owner_email, u.mobile_number AS owner_phone,
         u.avatar AS owner_avatar, u.semester AS owner_semester
  FROM items it
  JOIN users u ON u.id = it.owner_id
`;

export const items = {
  findAll: ({ search, category, minPrice, maxPrice, availableOnly, condition } = {}) => {
    const clauses = [];
    const params = [];
    let i = 1;

    if (search) {
      clauses.push(`(it.title ILIKE $${i} OR it.description ILIKE $${i} OR it.pickup_location ILIKE $${i})`);
      params.push(`%${search}%`);
      i++;
    }
    if (category && category !== 'All') {
      clauses.push(`it.category = $${i}`);
      params.push(category);
      i++;
    }
    if (condition) {
      clauses.push(`it.condition = $${i}`);
      params.push(condition);
      i++;
    }
    if (availableOnly === 'true') {
      clauses.push('it.availability = true');
    }
    if (minPrice) {
      clauses.push(`it.rent_price_per_day >= $${i}`);
      params.push(Number(minPrice));
      i++;
    }
    if (maxPrice) {
      clauses.push(`it.rent_price_per_day <= $${i}`);
      params.push(Number(maxPrice));
      i++;
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    return queryRows(`${ITEM_SELECT} ${where} ORDER BY it.created_at DESC`, params);
  },

  findByOwnerId: (ownerId) =>
    queryRows(`${ITEM_SELECT} WHERE it.owner_id = $1 ORDER BY it.created_at DESC`, [ownerId]),

  findById: (id) => queryOne(`${ITEM_SELECT} WHERE it.id = $1`, [id]),

  create: async ({ ownerId, title, category, description, images, rentPricePerDay, securityDeposit, condition, pickupLocation }) => {
    const id = genId('itm');
    await pool.query(
      `INSERT INTO items
         (id, owner_id, title, category, description, images, rent_price_per_day, security_deposit, availability, condition, pickup_location)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,$9,$10)`,
      [id, ownerId, title, category, description, images, rentPricePerDay, securityDeposit, condition, pickupLocation]
    );
    return items.findById(id);
  },

  update: async (id, changes) => {
    const fieldMap = {
      title: 'title',
      category: 'category',
      description: 'description',
      images: 'images',
      rentPricePerDay: 'rent_price_per_day',
      securityDeposit: 'security_deposit',
      availability: 'availability',
      condition: 'condition',
      pickupLocation: 'pickup_location'
    };
    const sets = [];
    const params = [id];
    let i = 2;
    for (const [key, col] of Object.entries(fieldMap)) {
      if (changes[key] !== undefined) {
        sets.push(`${col} = $${i}`);
        params.push(changes[key]);
        i++;
      }
    }
    if (!sets.length) return items.findById(id);
    sets.push('updated_at = now()');
    await pool.query(`UPDATE items SET ${sets.join(', ')} WHERE id = $1`, params);
    return items.findById(id);
  },

  delete: async (id) => {
    const result = await pool.query('DELETE FROM items WHERE id = $1', [id]);
    return result.rowCount > 0;
  },

  countAll: async () => (await queryOne('SELECT COUNT(*)::int AS count FROM items')).count
};

// ----------------------------------------------------
// BLOCKED DATES (owner-managed unavailability ranges, separate from bookings)
// ----------------------------------------------------
export const blockedDates = {
  findByItemId: (itemId) =>
    queryRows('SELECT * FROM blocked_dates WHERE item_id = $1 ORDER BY start_date', [itemId]),

  create: ({ itemId, startDate, endDate, reason }) => {
    const id = genId('blk');
    return queryOne(
      `INSERT INTO blocked_dates (id, item_id, start_date, end_date, reason)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, itemId, startDate, endDate, reason || 'Owner unavailable']
    );
  },

  delete: async (id, itemId) => {
    const result = await pool.query('DELETE FROM blocked_dates WHERE id = $1 AND item_id = $2', [id, itemId]);
    return result.rowCount > 0;
  }
};

// ----------------------------------------------------
// FAVORITES (join table, not an array on the user)
// ----------------------------------------------------
export const favorites = {
  itemsForUser: (userId) =>
    queryRows(
      `${ITEM_SELECT} JOIN favorites f ON f.item_id = it.id WHERE f.user_id = $1 ORDER BY f.created_at DESC`,
      [userId]
    ),

  isFavorite: async (userId, itemId) =>
    !!(await queryOne('SELECT 1 AS x FROM favorites WHERE user_id = $1 AND item_id = $2', [userId, itemId])),

  add: (userId, itemId) =>
    pool.query('INSERT INTO favorites (user_id, item_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [userId, itemId]),

  remove: (userId, itemId) =>
    pool.query('DELETE FROM favorites WHERE user_id = $1 AND item_id = $2', [userId, itemId])
};

// ----------------------------------------------------
// BOOKINGS  (item/owner/borrower details are joined live, not snapshotted)
// ----------------------------------------------------
const BOOKING_SELECT = `
  SELECT b.*,
         it.title AS item_title, it.images[1] AS item_image, it.category AS item_category,
         it.rent_price_per_day AS rent_price_per_day, it.security_deposit AS security_deposit,
         br.name AS borrower_name, br.email AS borrower_email,
         ow.name AS owner_name, ow.email AS owner_email
  FROM bookings b
  JOIN items it ON it.id = b.item_id
  JOIN users br ON br.id = b.borrower_id
  JOIN users ow ON ow.id = b.owner_id
`;

export const bookings = {
  findById: (id) => queryOne(`${BOOKING_SELECT} WHERE b.id = $1`, [id]),

  findActiveForItem: (itemId) =>
    queryRows(`SELECT * FROM bookings WHERE item_id = $1 AND status IN ('Pending','Accepted')`, [itemId]),

  findByBorrower: (userId) =>
    queryRows(`${BOOKING_SELECT} WHERE b.borrower_id = $1 ORDER BY b.created_at DESC`, [userId]),

  findByOwner: (userId) =>
    queryRows(`${BOOKING_SELECT} WHERE b.owner_id = $1 ORDER BY b.created_at DESC`, [userId]),

  create: async ({
    itemId,
    borrowerId,
    ownerId,
    startDate,
    endDate,
    totalDays,
    totalCost,
    isFastDelivery = false,
    fastDeliveryFee = 0,
    expiresAt = null
  }) => {
    const id = genId('bkg');
    await pool.query(
      `INSERT INTO bookings
         (id, item_id, borrower_id, owner_id, start_date, end_date, total_days, total_cost, status, is_fast_delivery, fast_delivery_fee, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Pending',$9,$10,$11)`,
      [id, itemId, borrowerId, ownerId, startDate, endDate, totalDays, totalCost, isFastDelivery, fastDeliveryFee, expiresAt]
    );
    return bookings.findById(id);
  },

  // Plain status transition — used for Reject / Complete, where there's no
  // expiry race to worry about.
  updateStatus: async (id, status) => {
    await pool.query('UPDATE bookings SET status = $2, updated_at = now() WHERE id = $1', [id, status]);
    return bookings.findById(id);
  },

  // Atomic, expiry-aware accept. Succeeds only while still Pending, and —
  // for Fast Delivery bookings — only before expires_at. This is the single
  // source of truth for whether an accept is allowed: it does NOT depend on
  // the background sweep having already run, so a late accept is rejected
  // even if the sweep is delayed or down.
  acceptIfPending: async (id) => {
    const result = await pool.query(
      `UPDATE bookings
         SET status = 'Accepted', accepted_at = now(), updated_at = now()
       WHERE id = $1
         AND status = 'Pending'
         AND (is_fast_delivery = false OR expires_at > now())
       RETURNING id`,
      [id]
    );
    if (result.rowCount === 0) {
      // Didn't accept. If this is a Fast Delivery booking that just passed
      // its deadline, flip it to Expired right now instead of waiting for
      // the next sweep tick.
      await bookings.expireIfOverdue(id);
      return null;
    }
    return bookings.findById(id);
  },

  // Flips a single Fast Delivery booking to Expired if it's overdue.
  // Idempotent — a no-op (rowCount 0) if it's already been handled by
  // something else (accepted, rejected, or already expired).
  expireIfOverdue: async (id) => {
    const result = await pool.query(
      `UPDATE bookings
         SET status = 'Expired', expired_at = now(), updated_at = now()
       WHERE id = $1
         AND status = 'Pending'
         AND is_fast_delivery = true
         AND expires_at <= now()
       RETURNING id`,
      [id]
    );
    return result.rowCount > 0;
  },

  // Background sweep: bulk-expires every overdue Fast Delivery booking in
  // one query. Idempotent — the WHERE clause only ever matches rows still
  // Pending, so re-running it is always safe. Call on a timer from server.js.
  expireOverdueFastDeliveryRequests: async () => {
    const result = await pool.query(
      `UPDATE bookings
         SET status = 'Expired', expired_at = now(), updated_at = now()
       WHERE is_fast_delivery = true
         AND status = 'Pending'
         AND expires_at <= now()
       RETURNING id`
    );

    for (const row of result.rows) {
      const b = await bookings.findById(row.id); // joined version, for names in the notification copy
      if (!b) continue;

      await notifications.create({
        userId: b.borrowerId,
        title: 'Fast Delivery Request Expired',
        message: `${b.ownerName} didn't accept your Fast Delivery request for "${b.itemTitle}" within 30 minutes, so it expired. The item is still listed — you can request it again.`,
        type: 'booking',
        link: '/bookings'
      });

      await notifications.create({
        userId: b.ownerId,
        title: 'Fast Delivery Request Expired',
        message: `A Fast Delivery request for "${b.itemTitle}" expired because it wasn't accepted within 30 minutes. It can no longer be accepted.`,
        type: 'booking',
        link: '/bookings'
      });

      console.log(
        `[FAST_BOOKING_EXPIRED] booking_id=${b._id} user_id=${b.borrowerId} owner_id=${b.ownerId} product_id=${b.itemId} timestamp=${new Date().toISOString()}`
      );
    }

    return result.rows.length;
  },

  countAll: async () => (await queryOne('SELECT COUNT(*)::int AS count FROM bookings')).count,

  totalRentalVolume: async () =>
    (
      await queryOne(
        `SELECT COALESCE(SUM(total_cost), 0)::float AS total FROM bookings WHERE status IN ('Completed','Accepted')`
      )
    ).total
};

// ----------------------------------------------------
// MESSAGES (sender/receiver names joined live)
// ----------------------------------------------------
const MESSAGE_SELECT = `
  SELECT m.*, s.name AS sender_name, r.name AS receiver_name
  FROM messages m
  JOIN users s ON s.id = m.sender_id
  JOIN users r ON r.id = m.receiver_id
`;

export const messages = {
  findByBooking: (bookingId) => queryRows(`${MESSAGE_SELECT} WHERE m.booking_id = $1 ORDER BY m.timestamp`, [bookingId]),

  lastForBooking: async (bookingId) => {
    const rows = await queryRows(`${MESSAGE_SELECT} WHERE m.booking_id = $1 ORDER BY m.timestamp DESC LIMIT 1`, [bookingId]);
    return rows[0] || null;
  },

  unreadCountForUser: async (bookingId, userId) =>
    (
      await queryOne(
        'SELECT COUNT(*)::int AS count FROM messages WHERE booking_id = $1 AND receiver_id = $2 AND is_read = false',
        [bookingId, userId]
      )
    ).count,

  create: async ({ bookingId, senderId, receiverId, content }) => {
    const id = genId('msg');
    await pool.query(
      `INSERT INTO messages (id, booking_id, sender_id, receiver_id, content, is_read)
       VALUES ($1,$2,$3,$4,$5,false)`,
      [id, bookingId, senderId, receiverId, content]
    );
    const rows = await queryRows(`${MESSAGE_SELECT} WHERE m.id = $1`, [id]);
    return rows[0];
  },

  markReadForReceiver: (bookingId, userId) =>
    pool.query('UPDATE messages SET is_read = true WHERE booking_id = $1 AND receiver_id = $2 AND is_read = false', [
      bookingId,
      userId
    ]),

  // ---- Direct messages (student <-> admin, not tied to any booking) ----
  // booking_id has no NOT NULL constraint, so a direct thread is simply the
  // set of messages between two users where booking_id IS NULL.
  findDirectThread: (userA, userB) =>
    queryRows(
      `${MESSAGE_SELECT} WHERE m.booking_id IS NULL
         AND ((m.sender_id = $1 AND m.receiver_id = $2) OR (m.sender_id = $2 AND m.receiver_id = $1))
       ORDER BY m.timestamp`,
      [userA, userB]
    ),

  createDirect: async ({ senderId, receiverId, content }) => {
    const id = genId('msg');
    await pool.query(
      `INSERT INTO messages (id, booking_id, sender_id, receiver_id, content, is_read)
       VALUES ($1,NULL,$2,$3,$4,false)`,
      [id, senderId, receiverId, content]
    );
    const rows = await queryRows(`${MESSAGE_SELECT} WHERE m.id = $1`, [id]);
    return rows[0];
  },

  markDirectReadForReceiver: (otherUserId, userId) =>
    pool.query(
      `UPDATE messages SET is_read = true
       WHERE booking_id IS NULL AND sender_id = $1 AND receiver_id = $2 AND is_read = false`,
      [otherUserId, userId]
    ),

  // Groups an admin's direct messages by the other party, newest first,
  // for an inbox-style list (one row per student who has messaged in).
  findAdminInboxThreads: async (adminId) => {
    const rows = await queryRows(
      `SELECT m.*, s.name AS sender_name, s.avatar AS sender_avatar,
              r.name AS receiver_name, r.avatar AS receiver_avatar
       FROM messages m
       JOIN users s ON s.id = m.sender_id
       JOIN users r ON r.id = m.receiver_id
       WHERE m.booking_id IS NULL AND (m.sender_id = $1 OR m.receiver_id = $1)
       ORDER BY m.timestamp DESC`,
      [adminId]
    );

    const byOther = new Map();
    for (const row of rows) {
      const isFromAdmin = row.senderId === adminId;
      const otherId = isFromAdmin ? row.receiverId : row.senderId;
      const otherName = isFromAdmin ? row.receiverName : row.senderName;
      const otherAvatar = isFromAdmin ? row.receiverAvatar : row.senderAvatar;

      if (!byOther.has(otherId)) {
        byOther.set(otherId, {
          otherId,
          otherName,
          otherAvatar,
          lastMessage: row,
          unreadCount: 0
        });
      }
      if (row.receiverId === adminId && !row.isRead) {
        byOther.get(otherId).unreadCount += 1;
      }
    }
    return Array.from(byOther.values());
  }
};

// ----------------------------------------------------
// COMPLAINTS (reporter/reported names joined live)
// ----------------------------------------------------
const COMPLAINT_SELECT = `
  SELECT c.*, rp.name AS reporter_name, rd.name AS reported_user_name
  FROM complaints c
  JOIN users rp ON rp.id = c.reporter_id
  JOIN users rd ON rd.id = c.reported_user_id
`;

export const complaints = {
  findByReporter: (userId) => queryRows(`${COMPLAINT_SELECT} WHERE c.reporter_id = $1 ORDER BY c.created_at DESC`, [userId]),

  findAgainst: (userId) => queryRows(`${COMPLAINT_SELECT} WHERE c.reported_user_id = $1 ORDER BY c.created_at DESC`, [userId]),

  findAll: () => queryRows(`${COMPLAINT_SELECT} ORDER BY c.created_at DESC`),

  findById: (id) => queryOne(`${COMPLAINT_SELECT} WHERE c.id = $1`, [id]),

  // Rejected complaints (dismissed by admin as fake) don't count toward
  // the auto-block threshold.
  countByReportedUser: async (userId) =>
    (await queryOne(`SELECT COUNT(*)::int AS count FROM complaints WHERE reported_user_id = $1 AND status != 'Rejected'`, [userId])).count,

  // Public view for the item page: only non-rejected complaints, and no
  // reporter / proof / admin note — just what the complaint was about.
  findPublicAgainst: (userId) =>
    queryRows(
      `SELECT id, type, description, status, created_at
       FROM complaints
       WHERE reported_user_id = $1 AND status != 'Rejected'
       ORDER BY created_at DESC`,
      [userId]
    ),

  countPending: async () =>
    (await queryOne(`SELECT COUNT(*)::int AS count FROM complaints WHERE status IN ('Pending','Under Review')`)).count,

  create: async ({ reporterId, reportedUserId, bookingId, itemTitle, type, description, proofUrl }) => {
    const id = genId('cmp');
    await pool.query(
      `INSERT INTO complaints (id, reporter_id, reported_user_id, booking_id, item_title, type, description, proof_url, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Pending')`,
      [id, reporterId, reportedUserId, bookingId || null, itemTitle || null, type, description, proofUrl]
    );
    return complaints.findById(id);
  },

  update: async (id, { status, adminNote }) => {
    const sets = [];
    const params = [id];
    let i = 2;
    if (status !== undefined) {
      sets.push(`status = $${i}`);
      params.push(status);
      i++;
    }
    if (adminNote !== undefined) {
      sets.push(`admin_note = $${i}`);
      params.push(adminNote);
      i++;
    }
    if (!sets.length) return complaints.findById(id);
    await pool.query(`UPDATE complaints SET ${sets.join(', ')} WHERE id = $1`, params);
    return complaints.findById(id);
  }
};

// ----------------------------------------------------
// RATINGS
// ----------------------------------------------------
export const ratings = {
  findForUser: (userId) =>
    queryRows(
      `SELECT r.*, u.name AS reviewer_name, u.avatar AS reviewer_avatar
       FROM ratings r
       LEFT JOIN users u ON u.id = r.reviewer_id
       WHERE r.reviewee_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    ),

  create: async ({ bookingId, revieweeId, reviewerId, stars, comment }) => {
    const id = genId('rtg');
    // item_id isn't sent by the client — derive it from the booking.
    const booking = await queryOne('SELECT item_id FROM bookings WHERE id = $1', [bookingId]);
    await pool.query(
      `INSERT INTO ratings (id, booking_id, item_id, reviewer_id, reviewee_id, stars, comment)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, bookingId, booking ? booking.itemId : null, reviewerId, revieweeId, stars, comment]
    );
    return queryOne('SELECT * FROM ratings WHERE id = $1', [id]);
  },

  averageForUser: async (userId) => {
    const row = await queryOne(
      'SELECT COALESCE(AVG(stars), 0)::numeric(3,2) AS avg, COUNT(*)::int AS total FROM ratings WHERE reviewee_id = $1',
      [userId]
    );
    return { averageRating: Number(row.avg), totalRatings: row.total };
  },

  // True if this reviewer has already rated this booking (one rating per booking).
  existsForBooking: async (bookingId, reviewerId) => {
    const row = await queryOne(
      'SELECT 1 AS found FROM ratings WHERE booking_id = $1 AND reviewer_id = $2 LIMIT 1',
      [bookingId, reviewerId]
    );
    return Boolean(row);
  }
};

// ----------------------------------------------------
// NOTIFICATIONS
// ----------------------------------------------------
export const notifications = {
  findForUser: (userId) => queryRows('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC', [userId]),

  create: ({ userId, title, message, type, link }) => {
    const id = genId('ntf');
    return queryOne(
      `INSERT INTO notifications (id, user_id, title, message, type, link, read)
       VALUES ($1,$2,$3,$4,$5,$6,false) RETURNING *`,
      [id, userId, title, message, type, link || null]
    );
  },

  markRead: (id, userId) =>
    pool.query('UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2', [id, userId])
};

// ----------------------------------------------------
// EMAIL OTPs (registration email verification + password reset)
// ----------------------------------------------------
// Needs: CREATE TABLE email_otps (...) — see migration SQL provided with
// this feature. `purpose` ('register' | 'reset') keeps a registration OTP
// from being usable to reset an unrelated account's password, and vice versa.
export const emailOtps = {
  // Replaces any pending OTP for this email+purpose with a fresh one.
  create: async (email, otpCode, purpose = 'register', expiresInMinutes = 1) => {
    await pool.query('DELETE FROM email_otps WHERE email = $1 AND purpose = $2', [email, purpose]);
    const id = genId('otp');
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    await pool.query(
      `INSERT INTO email_otps (id, email, otp_code, purpose, verified, expires_at)
       VALUES ($1,$2,$3,$4,false,$5)`,
      [id, email, otpCode, purpose, expiresAt]
    );
    return queryOne('SELECT * FROM email_otps WHERE id = $1', [id]);
  },

  findLatestByEmail: (email, purpose = 'register') =>
    queryOne(
      'SELECT * FROM email_otps WHERE email = $1 AND purpose = $2 ORDER BY created_at DESC LIMIT 1',
      [email, purpose]
    ),

  markVerified: (email, purpose = 'register') =>
    pool.query('UPDATE email_otps SET verified = true WHERE email = $1 AND purpose = $2', [email, purpose]),

  // Has this email completed OTP verification for this purpose, not yet
  // consumed? (Row is deleted once the account is created / password reset.)
  isVerified: async (email, purpose = 'register') => {
    const row = await queryOne(
      'SELECT * FROM email_otps WHERE email = $1 AND purpose = $2 AND verified = true',
      [email, purpose]
    );
    return !!row;
  },

  deleteByEmail: (email, purpose = 'register') =>
    pool.query('DELETE FROM email_otps WHERE email = $1 AND purpose = $2', [email, purpose])
};

// ----------------------------------------------------
// AUTO-BLOCK
// ----------------------------------------------------
// Recomputes a user's complaint_count from the complaints table and blocks
// them once it reaches 5, same threshold as the original in-memory logic.
export async function checkAndApplyAutoBlock(userId) {
  const user = await users.findById(userId);
  if (!user) return false;

  const count = await complaints.countByReportedUser(userId);
  await users.setComplaintCount(userId, count);

  // Requirement 1: 5+ complaints -> auto block
  if (count >= 5 && !user.isBlocked) {
    await users.setBlocked(userId, true, 'auto');
    await notifications.create({
      userId,
      title: 'Account Blocked',
      message:
        'Your account has been automatically blocked due to receiving 5 verified complaints. Please contact CS Department Admin.',
      type: 'system'
    });
    return true;
  }

  // Requirement 3: auto-blocked user ka count 5 se neeche aaye -> khud unblock.
  // Manual (admin) block ko yahan touch nahi karte.
  if (count < 5 && user.isBlocked && user.blockSource === 'auto') {
    await users.setBlocked(userId, false);
    await notifications.create({
      userId,
      title: 'Account Unblocked',
      message:
        'A complaint against you was rejected by the admin, so your account has been automatically unblocked. You can log in again.',
      type: 'system'
    });
    return false;
  }

  return user.isBlocked;
}