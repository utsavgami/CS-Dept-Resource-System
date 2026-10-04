# 🗄️ PostgreSQL Database Documentation & Guide
### CS Department Peer-to-Peer Resource Sharing System

Welcome to the comprehensive database documentation for the **CS Resource Sharing Platform**. This document details the database architecture, environment configuration, full table schemas, entity relationships, business logic constraints, and operational maintenance guides.

---

## 📌 Table of Contents

1. [Database Overview & Tech Stack](#1-database-overview--tech-stack)
2. [Connection & Environment Setup](#2-connection--environment-setup)
3. [Architecture & Design Principles](#3-architecture--design-principles)
   - [ID Generation Convention](#id-generation-convention)
   - [Snake_Case to CamelCase Row Mapping](#snake_case-to-camelcase-row-mapping)
   - [PostgreSQL NUMERIC Precision Handling](#postgresql-numeric-precision-handling)
4. [Entity-Relationship Diagram (ERD)](#4-entity-relationship-diagram-erd)
5. [Complete Table Schemas (10 Tables)](#5-complete-table-schemas)
   - [1. `users`](#51-users-table)
   - [2. `items`](#52-items-table)
   - [3. `bookings`](#53-bookings-table)
   - [4. `ratings`](#54-ratings-table)
   - [5. `complaints`](#55-complaints-table)
   - [6. `messages`](#56-messages-table)
   - [7. `notifications`](#57-notifications-table)
   - [8. `favorites`](#58-favorites-table)
   - [9. `blocked_dates`](#59-blocked_dates-table)
   - [10. `email_otps`](#510-email_otps-table)
6. [Business Logic & Automated Database Rules](#6-business-logic--automated-database-rules)
   - [Auto-Block on 5 Verified Complaints](#auto-block-on-5-verified-complaints)
   - [Duplicate Rating Prevention](#duplicate-rating-prevention)
   - [Real-Time Reviewer Reputation & Metrics](#real-time-reviewer-reputation--metrics)
   - [Live Joins vs Stale Snapshots](#live-joins-vs-stale-snapshots)
7. [Database Setup, Backup & Restore Guide](#7-database-setup-backup--restore-guide)

---

## 1. Database Overview & Tech Stack

| Parameter | Specification |
|---|---|
| **Database Engine** | PostgreSQL 14+ |
| **Database Name** | `resource_sharing_db` |
| **Node.js Driver** | `pg` (node-postgres v8.23+) with `pg.Pool` |
| **ORM / Query Style** | Raw SQL Queries via Parameterized Helpers (`$1`, `$2`) to eliminate SQL Injection risks |
| **Primary Key Pattern** | Prefixed string identifiers (`VARCHAR(50)`) generated via timestamp + entropy |

---

## 2. Connection & Environment Setup

The backend connects to PostgreSQL via a connection pool defined in [`backend/server/db.js`](file:///c:/Users/utsav/OneDrive/Desktop/resource-react-node/backend/server/db.js).

### Environment Configuration (`backend/.env`)

Configure the following variables in your `.env` file:

```env
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_password
PGDATABASE=resource_sharing_db
```

Or provide a single connection string:
```env
DATABASE_URL=postgres://postgres:your_password@localhost:5432/resource_sharing_db
```

---

## 3. Architecture & Design Principles

### ID Generation Convention
Rather than auto-incrementing integers, records use human-readable, domain-prefixed unique strings generated via `genId(prefix)`:

| Table | Prefix Example | Sample Generated ID |
|---|---|---|
| `users` (Student) | `usr_std_` | `usr_std_1790246059270_7s3ded` |
| `users` (Admin) | `usr_admin_` | `usr_admin_1789717673531_ky99gw` |
| `items` | `itm_` | `itm_1789897641318_72q4aa` |
| `bookings` | `bkg_` | `bkg_1789897726110_2krndf` |
| `ratings` | `rtg_` | `rtg_1790080185244_vqde73` |
| `complaints` | `cmp_` | `cmp_1789901122334_m4x9la` |
| `messages` | `msg_` | `msg_1789905544112_q1w2e3` |
| `notifications` | `ntf_` | `ntf_1789908877665_z9y8x7` |
| `blocked_dates` | `blk_` | `blk_1789912233445_a1b2c3` |

### Snake_Case to CamelCase Row Mapping
PostgreSQL column names use standard `snake_case` (e.g. `rent_price_per_day`, `is_blocked`), but the frontend React application expects `camelCase` (e.g. `rentPricePerDay`, `isBlocked`).
The database layer (`queryRows` in `db.js`) automatically converts all row keys to `camelCase` and maps `id` to `_id` at the boundary so that API consumers receive a clean, Mongo-like interface without breaking relational integrity.

### PostgreSQL NUMERIC Precision Handling
By default, the `node-postgres` driver parses `NUMERIC` / `DECIMAL` columns (OID 1700) as JavaScript **strings** to prevent floating-point precision loss. In standard JavaScript, this can cause concatenation bugs (e.g. `"60" + "40" = "6040"`).
[`backend/server/db.js`](file:///c:/Users/utsav/OneDrive/Desktop/resource-react-node/backend/server/db.js) explicitly configures the type parser on startup:
```javascript
types.setTypeParser(1700, (value) => (value === null ? null : parseFloat(value)));
```
All currency and price fields are cleanly parsed as native numeric floats.

---

## 4. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    users ||--o{ items : "owns / lists"
    users ||--o{ bookings : "borrows"
    users ||--o{ bookings : "receives requests (owner)"
    users ||--o{ ratings : "submits (reviewer)"
    users ||--o{ ratings : "receives (reviewee)"
    users ||--o{ complaints : "reports"
    users ||--o{ complaints : "is reported"
    users ||--o{ messages : "sends"
    users ||--o{ messages : "receives"
    users ||--o{ notifications : "receives"
    users ||--o{ favorites : "saves"
    
    items ||--o{ bookings : "is booked"
    items ||--o{ ratings : "is rated"
    items ||--o{ blocked_dates : "has unavailable dates"
    items ||--o{ favorites : "is favorited"

    bookings ||--o{ ratings : "rated under"
    bookings ||--o{ messages : "has chat thread"
```

---

## 5. Complete Table Schemas

### 5.1. `users` Table
Stores authentication credentials, student records, profile attributes, and reputation scores.

| Column | Data Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(50)` | **NO** | *None* | **Primary Key** |
| `name` | `VARCHAR(150)` | **NO** | *None* | Full student or admin name |
| `email` | `VARCHAR(150)` | **NO** | *None* | **Unique** institutional college email |
| `password_hash` | `VARCHAR(255)` | **NO** | *None* | Bcrypt password hash |
| `enrollment_number` | `VARCHAR(50)` | **NO** | *None* | **Unique** college enrollment ID |
| `mobile_number` | `VARCHAR(20)` | YES | `NULL` | Student contact number |
| `department` | `VARCHAR(150)` | YES | `NULL` | Academic department |
| `semester` | `VARCHAR(50)` | YES | `NULL` | Current academic semester |
| `role` | `VARCHAR(20)` | **NO** | `'student'` | Role: `'student'` or `'admin'` |
| `verified` | `BOOLEAN` | YES | `true` | Email/identity verification state |
| `is_blocked` | `BOOLEAN` | YES | `false` | Block flag (set manually or at 5 complaints) |
| `avatar` | `TEXT` | YES | `NULL` | Profile photo path (`/uploads/avatars/...`) |
| `complaint_count` | `INTEGER` | YES | `0` | Verified complaint count |
| `average_rating` | `NUMERIC` | YES | `5.0` | Peer review average score |
| `total_ratings` | `INTEGER` | YES | `0` | Count of reviews received |
| `created_at` | `TIMESTAMPTZ` | YES | `now()` | Registration timestamp |
| `updated_at` | `TIMESTAMPTZ` | YES | `now()` | Last update timestamp |

* **Constraints:**
  * `PRIMARY KEY (id)`
  * `UNIQUE (email)`
  * `UNIQUE (enrollment_number)`

---

### 5.2. `items` Table
Stores resource equipment listings posted by students.

| Column | Data Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(50)` | **NO** | *None* | **Primary Key** |
| `owner_id` | `VARCHAR(50)` | YES | `NULL` | **Foreign Key** referencing `users(id)` |
| `title` | `VARCHAR(200)` | **NO** | *None* | Resource title |
| `category` | `VARCHAR(100)` | YES | `NULL` | Category (e.g. `Calculators`, `Electronics`) |
| `description` | `TEXT` | YES | `NULL` | Listing description and guidelines |
| `images` | `TEXT[]` (ARRAY) | YES | `NULL` | Array of image upload URLs |
| `rent_price_per_day` | `NUMERIC` | **NO** | *None* | Daily rental rate in ₹ |
| `security_deposit` | `NUMERIC` | YES | `0` | Refundable deposit in ₹ |
| `availability` | `BOOLEAN` | YES | `true` | Listing active state |
| `condition` | `VARCHAR(50)` | YES | `NULL` | Item physical condition |
| `pickup_location` | `VARCHAR(200)` | YES | `NULL` | Campus pickup meeting point |
| `created_at` | `TIMESTAMPTZ` | YES | `now()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | YES | `now()` | Modification timestamp |

* **Constraints & Indexes:**
  * `PRIMARY KEY (id)`
  * `FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE`
  * `CREATE INDEX idx_items_owner ON items(owner_id)`

---

### 5.3. `bookings` Table
Tracks rental transactions between borrowers and owners.

| Column | Data Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(50)` | **NO** | *None* | **Primary Key** |
| `item_id` | `VARCHAR(50)` | YES | `NULL` | **Foreign Key** referencing `items(id)` |
| `borrower_id` | `VARCHAR(50)` | YES | `NULL` | **Foreign Key** referencing `users(id)` (borrower) |
| `owner_id` | `VARCHAR(50)` | YES | `NULL` | **Foreign Key** referencing `users(id)` (lender) |
| `start_date` | `DATE` | **NO** | *None* | Start of rental period |
| `end_date` | `DATE` | **NO** | *None* | End of rental period |
| `total_days` | `INTEGER` | YES | `NULL` | Duration in days |
| `total_cost` | `NUMERIC` | YES | `NULL` | Total amount: `(days * rent_price) + deposit` |
| `status` | `VARCHAR(30)` | YES | `'Pending'` | Status (`Pending`, `Accepted`, `Completed`, `Rejected`) |
| `created_at` | `TIMESTAMPTZ` | YES | `now()` | Request timestamp |
| `updated_at` | `TIMESTAMPTZ` | YES | `now()` | Last status change timestamp |

* **Constraints & Indexes:**
  * `PRIMARY KEY (id)`
  * `FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE`
  * `FOREIGN KEY (borrower_id) REFERENCES users(id) ON DELETE CASCADE`
  * `FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE`
  * `CREATE INDEX idx_bookings_item ON bookings(item_id)`
  * `CREATE INDEX idx_bookings_borrower ON bookings(borrower_id)`

---

### 5.4. `ratings` Table
Stores peer ratings and feedback submitted after rental completion.

| Column | Data Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(50)` | **NO** | *None* | **Primary Key** |
| `booking_id` | `VARCHAR(50)` | YES | `NULL` | **Foreign Key** referencing `bookings(id)` |
| `item_id` | `VARCHAR(50)` | YES | `NULL` | **Foreign Key** referencing `items(id)` |
| `reviewer_id` | `VARCHAR(50)` | YES | `NULL` | **Foreign Key** referencing `users(id)` (reviewer) |
| `reviewee_id` | `VARCHAR(50)` | YES | `NULL` | **Foreign Key** referencing `users(id)` (reviewee) |
| `stars` | `INTEGER` | YES | `NULL` | Star rating (1 to 5) |
| `comment` | `TEXT` | YES | `NULL` | Review text |
| `created_at` | `TIMESTAMPTZ` | YES | `now()` | Submission timestamp |

* **Constraints & Indexes:**
  * `PRIMARY KEY (id)`
  * `CHECK (stars >= 1 AND stars <= 5)`
  * `FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE`
  * `FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE`
  * `FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE`
  * `FOREIGN KEY (reviewee_id) REFERENCES users(id) ON DELETE CASCADE`
  * `CREATE UNIQUE INDEX idx_ratings_booking_reviewer ON ratings(booking_id, reviewer_id)` *(Enforces 1 review per user per booking)*

---

### 5.5. `complaints` Table
Tracks disputes, policy violations, and damage reports.

| Column | Data Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(50)` | **NO** | *None* | **Primary Key** |
| `reporter_id` | `VARCHAR(50)` | YES | `NULL` | **Foreign Key** referencing `users(id)` |
| `reported_user_id` | `VARCHAR(50)` | YES | `NULL` | **Foreign Key** referencing `users(id)` |
| `booking_id` | `VARCHAR(50)` | YES | `NULL` | Related booking ID (if dispute is rental-based) |
| `item_title` | `VARCHAR(200)` | YES | `NULL` | Related item title |
| `type` | `VARCHAR(100)` | YES | `NULL` | Category (e.g. `Late Return`, `Item Damaged`) |
| `description` | `TEXT` | YES | `NULL` | Incident description |
| `proof_url` | `TEXT` | YES | `NULL` | Uploaded proof image path (`/uploads/complaint-proofs/...`) |
| `status` | `VARCHAR(30)` | YES | `'Pending'` | Status (`Pending`, `Under Review`, `Resolved`, `Dismissed`) |
| `admin_note` | `TEXT` | YES | `NULL` | Admin investigation notes |
| `created_at` | `TIMESTAMPTZ` | YES | `now()` | Filing timestamp |

* **Constraints:**
  * `PRIMARY KEY (id)`
  * `FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE`
  * `FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE`

---

### 5.6. `messages` Table
Stores real-time chat messages between borrowers/owners and direct admin helpdesk threads.

| Column | Data Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(50)` | **NO** | *None* | **Primary Key** |
| `booking_id` | `VARCHAR(50)` | YES | `NULL` | **Foreign Key** referencing `bookings(id)` (`NULL` for direct admin chat) |
| `sender_id` | `VARCHAR(50)` | YES | `NULL` | **Foreign Key** referencing `users(id)` |
| `receiver_id` | `VARCHAR(50)` | YES | `NULL` | **Foreign Key** referencing `users(id)` |
| `content` | `TEXT` | **NO** | *None* | Message text body |
| `is_read` | `BOOLEAN` | YES | `false` | Read receipt flag |
| `timestamp` | `TIMESTAMPTZ` | YES | `now()` | Message timestamp |

* **Constraints & Indexes:**
  * `PRIMARY KEY (id)`
  * `FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE`
  * `FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE`
  * `FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE`
  * `CREATE INDEX idx_messages_booking ON messages(booking_id)`

---

### 5.7. `notifications` Table
Stores in-app alerts and notifications delivered to users.

| Column | Data Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(50)` | **NO** | *None* | **Primary Key** |
| `user_id` | `VARCHAR(50)` | YES | `NULL` | **Foreign Key** referencing `users(id)` |
| `title` | `VARCHAR(200)` | YES | `NULL` | Notification title |
| `message` | `TEXT` | YES | `NULL` | Notification body |
| `type` | `VARCHAR(50)` | YES | `NULL` | Type (`booking`, `chat`, `rating`, `complaint`, `system`) |
| `link` | `TEXT` | YES | `NULL` | In-app redirect path |
| `read` | `BOOLEAN` | YES | `false` | Read status |
| `created_at` | `TIMESTAMPTZ` | YES | `now()` | Notification timestamp |

* **Constraints & Indexes:**
  * `PRIMARY KEY (id)`
  * `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
  * `CREATE INDEX idx_notifications_user ON notifications(user_id)`

---

### 5.8. `favorites` Table
Join table for user wishlists.

| Column | Data Type | Nullable | Default | Description |
|---|---|---|---|---|
| `user_id` | `VARCHAR(50)` | **NO** | *None* | **Composite Primary Key** & FK referencing `users(id)` |
| `item_id` | `VARCHAR(50)` | **NO** | *None* | **Composite Primary Key** & FK referencing `items(id)` |
| `created_at` | `TIMESTAMPTZ` | YES | `now()` | Saved timestamp |

* **Constraints:**
  * `PRIMARY KEY (user_id, item_id)`
  * `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
  * `FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE`

---

### 5.9. `blocked_dates` Table
Owner-managed dates where an item is unavailable for rent (independent of bookings).

| Column | Data Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(50)` | **NO** | *None* | **Primary Key** |
| `item_id` | `VARCHAR(50)` | YES | `NULL` | **Foreign Key** referencing `items(id)` |
| `start_date` | `DATE` | **NO** | *None* | Beginning of blocked date range |
| `end_date` | `DATE` | **NO** | *None* | End of blocked date range |
| `reason` | `TEXT` | YES | `NULL` | Reason (e.g. `Owner unavailable`, `Personal use`) |
| `created_at` | `TIMESTAMPTZ` | YES | `now()` | Creation timestamp |

* **Constraints & Indexes:**
  * `PRIMARY KEY (id)`
  * `FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE`
  * `CREATE INDEX idx_blocked_dates_item ON blocked_dates(item_id)`

---

### 5.10. `email_otps` Table
Stores temporary verification codes for student registration and password resets.

| Column | Data Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(50)` | **NO** | *None* | **Primary Key** |
| `email` | `VARCHAR(100)` | **NO** | *None* | Target email address |
| `otp_code` | `VARCHAR(10)` | **NO** | *None* | 6-digit OTP code |
| `verified` | `BOOLEAN` | **NO** | `false` | True once successfully verified |
| `expires_at` | `TIMESTAMP` | **NO** | *None* | Expiration cutoff timestamp (typically 10 minutes) |
| `created_at` | `TIMESTAMP` | **NO** | `now()` | OTP generation timestamp |

* **Constraints & Indexes:**
  * `PRIMARY KEY (id)`
  * `CREATE INDEX idx_email_otps_email ON email_otps(email)`

---

## 6. Business Logic & Automated Database Rules

### Auto-Block on 5 Verified Complaints
[`backend/server/db.js`](file:///c:/Users/utsav/OneDrive/Desktop/resource-react-node/backend/server/db.js) implements `checkAndApplyAutoBlock(userId)`:
* Whenever an admin marks a complaint against a user as `Resolved` (verified), the system counts all verified complaints against that user.
* If `count >= 5`, `users.is_blocked` is automatically flipped to `true`.
* A high-priority system notification is dispatched to the user. Blocked users are immediately rejected by `authenticateToken` middleware with HTTP `403 Forbidden`.

### Duplicate Rating Prevention
To guarantee that a student cannot review the same booking more than once:
1. **Application Layer:** Backend executes `ratings.findByBookingAndReviewer(bookingId, reviewerId)` before insertion and returns HTTP `409 Conflict`.
2. **Database Engine Layer:** The unique index `idx_ratings_booking_reviewer` on `(booking_id, reviewer_id)` rejects any concurrent insert with error code `23505`.

### Real-Time Reviewer Reputation & Metrics
When reviews are fetched via `ratings.findForUser(userId)`, the database runs an optimized SQL aggregation query joining the reviewer's profile and computing activity metrics on-the-fly:
* **Completed Bookings:** Count of all bookings where the reviewer was borrower or lender with `status = 'Completed'`.
* **Reviews Given:** Total ratings this reviewer has submitted across the platform.
* **Their Own Rating:** Reviewer's current average score.
* This eliminates stale counter columns and guarantees accurate student reputation data.

### Live Joins vs Stale Snapshots
Owner name, email, phone, avatar, and semester are **not** snapshotted in `items` or `bookings`. Instead:
* `ITEM_SELECT` joins `users` on `it.owner_id = u.id`.
* `BOOKING_SELECT` joins `users` for both borrower and owner.
* When a student changes their avatar photo, phone number, or semester, all past and active listings/bookings instantly reflect the updated profile without requiring batch updates.

---

## 7. Database Setup, Backup & Restore Guide

### Recreating the Database from Scratch
You can recreate the entire database schema using the provided [`database_schema.sql`](file:///c:/Users/utsav/OneDrive/Desktop/resource-react-node/database_schema.sql) script:

```bash
# 1. Create the database (if not exists)
psql -U postgres -c "CREATE DATABASE resource_sharing_db;"

# 2. Execute the DDL schema script
psql -U postgres -d resource_sharing_db -f database_schema.sql
```

### Creating a Complete Database Backup
To create a timestamped SQL dump of your database:

```bash
pg_dump -U postgres -d resource_sharing_db -F p -b -v -f "backup_resource_sharing_$(date +%Y%m%d).sql"
```

### Restoring from Backup
To restore data into a clean database:

```bash
psql -U postgres -d resource_sharing_db -f "backup_resource_sharing_20261002.sql"
```

### Quick Diagnostic Queries

```sql
-- Check total counts across all tables
SELECT 'users' AS table_name, COUNT(*) FROM users
UNION ALL SELECT 'items', COUNT(*) FROM items
UNION ALL SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL SELECT 'ratings', COUNT(*) FROM ratings
UNION ALL SELECT 'complaints', COUNT(*) FROM complaints
UNION ALL SELECT 'messages', COUNT(*) FROM messages;

-- Inspect active bookings
SELECT b.id, b.status, it.title, br.name AS borrower, ow.name AS owner
FROM bookings b
JOIN items it ON it.id = b.item_id
JOIN users br ON br.id = b.borrower_id
JOIN users ow ON ow.id = b.owner_id
WHERE b.status IN ('Pending', 'Accepted');
```
