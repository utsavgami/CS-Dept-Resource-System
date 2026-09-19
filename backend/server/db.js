import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

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

  create: ({ name, email, passwordHash, enrollmentNumber, mobileNumber, department, semester, avatar }) => {
    const id = genId('usr_std');
    return queryOne(
      `INSERT INTO users
         (id, name, email, password_hash, enrollment_number, mobile_number, department, semester, role, avatar)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'student',$9)
       RETURNING *`,
      [id, name, email, passwordHash, enrollmentNumber, mobileNumber, department, semester, avatar]
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

  setBlocked: (id, isBlocked) =>
    queryOne('UPDATE users SET is_blocked = $2, updated_at = now() WHERE id = $1 RETURNING *', [id, isBlocked]),

  // updateProfile's COALESCE can only set avatar to a new truthy value, never
  // clear it back to null — this does the explicit clear for "remove photo".
  clearAvatar: (id) =>
    queryOne('UPDATE users SET avatar = NULL, updated_at = now() WHERE id = $1 RETURNING *', [id]),

  setComplaintCount: (id, count) =>
    queryOne('UPDATE users SET complaint_count = $2, updated_at = now() WHERE id = $1 RETURNING *', [id, count]),

  setRatingStats: (id, averageRating, totalRatings) =>
    queryOne(
      'UPDATE users SET average_rating = $2, total_ratings = $3, updated_at = now() WHERE id = $1 RETURNING *',
      [id, averageRating, totalRatings]
    ),

  findAllForAdmin: () => queryRows('SELECT * FROM users ORDER BY created_at DESC'),

  countStudents: async () => (await queryOne(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'student'`)).count,

  countBlocked: async () => (await queryOne('SELECT COUNT(*)::int AS count FROM users WHERE is_blocked = true')).count
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

  create: async ({ itemId, borrowerId, ownerId, startDate, endDate, totalDays, totalCost }) => {
    const id = genId('bkg');
    await pool.query(
      `INSERT INTO bookings (id, item_id, borrower_id, owner_id, start_date, end_date, total_days, total_cost, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Pending')`,
      [id, itemId, borrowerId, ownerId, startDate, endDate, totalDays, totalCost]
    );
    return bookings.findById(id);
  },

  updateStatus: async (id, status) => {
    await pool.query('UPDATE bookings SET status = $2, updated_at = now() WHERE id = $1', [id, status]);
    return bookings.findById(id);
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
    ])
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

  countByReportedUser: async (userId) =>
    (await queryOne('SELECT COUNT(*)::int AS count FROM complaints WHERE reported_user_id = $1', [userId])).count,

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
  findForUser: (userId) => queryRows('SELECT * FROM ratings WHERE reviewee_id = $1 ORDER BY created_at DESC', [userId]),

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
      'SELECT COALESCE(AVG(stars), 5.0)::numeric(3,2) AS avg, COUNT(*)::int AS total FROM ratings WHERE reviewee_id = $1',
      [userId]
    );
    return { averageRating: Number(row.avg), totalRatings: row.total };
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
// AUTO-BLOCK
// ----------------------------------------------------
// Recomputes a user's complaint_count from the complaints table and blocks
// them once it reaches 5, same threshold as the original in-memory logic.
export async function checkAndApplyAutoBlock(userId) {
  const user = await users.findById(userId);
  if (!user) return false;

  const count = await complaints.countByReportedUser(userId);
  await users.setComplaintCount(userId, count);

  if (count >= 5 && !user.isBlocked) {
    await users.setBlocked(userId, true);
    await notifications.create({
      userId,
      title: 'Account Blocked',
      message:
        'Your account has been automatically blocked due to receiving 5 verified complaints. Please contact CS Department Admin.',
      type: 'system'
    });
    return true;
  }
  return user.isBlocked;
}