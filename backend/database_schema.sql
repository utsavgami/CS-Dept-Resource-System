-- =====================================================================
-- CS Department Resource Sharing System
-- Complete PostgreSQL Database Schema DDL
-- Database: resource_sharing_db
-- =====================================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    enrollment_number VARCHAR(50) NOT NULL UNIQUE,
    mobile_number VARCHAR(20),
    department VARCHAR(150),
    semester VARCHAR(50),
    role VARCHAR(20) NOT NULL DEFAULT 'student',
    verified BOOLEAN DEFAULT TRUE,
    is_blocked BOOLEAN DEFAULT FALSE,
    avatar TEXT,
    complaint_count INTEGER DEFAULT 0,
    average_rating NUMERIC DEFAULT 5.0,
    total_ratings INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ITEMS TABLE
CREATE TABLE IF NOT EXISTS items (
    id VARCHAR(50) PRIMARY KEY,
    owner_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    images TEXT[],
    rent_price_per_day NUMERIC NOT NULL,
    security_deposit NUMERIC DEFAULT 0,
    availability BOOLEAN DEFAULT TRUE,
    condition VARCHAR(50),
    pickup_location VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_owner ON items(owner_id);

-- 3. BOOKED / BLOCKED DATES (Owner-managed unavailability)
CREATE TABLE IF NOT EXISTS blocked_dates (
    id VARCHAR(50) PRIMARY KEY,
    item_id VARCHAR(50) REFERENCES items(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocked_dates_item ON blocked_dates(item_id);

-- 4. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(50) PRIMARY KEY,
    item_id VARCHAR(50) REFERENCES items(id) ON DELETE CASCADE,
    borrower_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    owner_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER,
    total_cost NUMERIC,
    status VARCHAR(30) DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_item ON bookings(item_id);
CREATE INDEX IF NOT EXISTS idx_bookings_borrower ON bookings(borrower_id);

-- 5. RATINGS TABLE
CREATE TABLE IF NOT EXISTS ratings (
    id VARCHAR(50) PRIMARY KEY,
    booking_id VARCHAR(50) REFERENCES bookings(id) ON DELETE CASCADE,
    item_id VARCHAR(50) REFERENCES items(id) ON DELETE CASCADE,
    reviewer_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    stars INTEGER CHECK (stars >= 1 AND stars <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enforce maximum 1 rating per participant per booking
CREATE UNIQUE INDEX IF NOT EXISTS idx_ratings_booking_reviewer 
ON ratings(booking_id, reviewer_id);

-- 6. COMPLAINTS TABLE
CREATE TABLE IF NOT EXISTS complaints (
    id VARCHAR(50) PRIMARY KEY,
    reporter_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    booking_id VARCHAR(50),
    item_title VARCHAR(200),
    type VARCHAR(100),
    description TEXT,
    proof_url TEXT,
    status VARCHAR(30) DEFAULT 'Pending',
    admin_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(50) PRIMARY KEY,
    booking_id VARCHAR(50) REFERENCES bookings(id) ON DELETE CASCADE,
    sender_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    receiver_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_booking ON messages(booking_id);

-- 8. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200),
    message TEXT,
    type VARCHAR(50),
    link TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- 9. FAVORITES TABLE (Many-to-Many join)
CREATE TABLE IF NOT EXISTS favorites (
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    item_id VARCHAR(50) REFERENCES items(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, item_id)
);

-- 10. EMAIL OTPS TABLE
CREATE TABLE IF NOT EXISTS email_otps (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_otps_email ON email_otps(email);
