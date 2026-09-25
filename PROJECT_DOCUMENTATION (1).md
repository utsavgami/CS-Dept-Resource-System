# CS Department Resource Sharing System — Full Project Documentation

A peer-to-peer web app where CS students list, rent, and borrow lab equipment, textbooks, calculators, and similar resources from each other.

Ye ek peer-to-peer web app hai jahan CS department ke students apas me lab equipment, books, calculators, aur aise hi resources list, rent, aur borrow kar sakte hain.

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS v4 |
| Backend | Node.js + Express |
| Real-time chat | Socket.IO |
| Database | PostgreSQL (via the `pg` package) |
| Auth | JWT (jsonwebtoken) + bcrypt password hashing |
| File uploads | Multer (disk storage) |

**Hinglish:** Frontend React se bana hai (Vite build tool + Tailwind CSS styling). Backend Node.js/Express hai. Chat real-time Socket.IO se chalti hai. Data Postgres database me store hota hai (`pg` npm package ke through). Login/session JWT tokens se manage hota hai, password bcrypt se hash hote hain. File uploads (photos) Multer se disk pe save hote hain.

---

## 2. Project Structure

```
resource-react-node/
├── backend/
│   ├── server.js                  # App entry point — Express + Socket.IO setup
│   ├── server/
│   │   ├── db.js                  # ALL database queries live here
│   │   ├── api.js                 # ALL REST API routes
│   │   ├── models/                # UserModel.js, ItemModel.js (thin wrappers)
│   │   ├── controllers/           # UserController.js (profile logic)
│   │   ├── routes/                # userRoutes.js
│   │   └── middleware/            # upload.js (multer config)
│   ├── scripts/
│   │   └── seed.js                # Fills demo accounts + sample data
│   └── uploads/                   # Uploaded avatar/proof photos (not in Git)
└── frontend/
    └── src/
        ├── App.jsx                 # Top-level router (tab-based, not URL routing)
        ├── components/              # One file per page/section
        ├── controllers/             # useProfileController.js (page logic hooks)
        └── lib/
            └── apiClient.js         # Every API call the frontend makes, in one place
```

**Hinglish:** `backend/server/db.js` me saari database queries hain. `api.js` me saare REST API routes (endpoints) hain. `models/` aur `controllers/` sirf user-profile wale hisse ke liye hain (chhota MVC pattern). Frontend me `App.jsx` ek tab-based router hai (React Router nahi use hua — bas ek `activeTab` state ke hisab se component switch hota hai). `apiClient.js` ek hi jagah hai jahan se saari backend calls hoti hain — koi bhi component seedha `fetch()` nahi karta, sab `api.xyz()` ke through jaata hai.

---

## 3. Database (PostgreSQL)

The database has 9 tables, all created by `schema.sql` (plus two small migrations).

Database me 9 tables hain, saari `schema.sql` se banti hain (plus do chhoti migrations).

### `users`
Every registered person — students AND the admin, both live in this same table, distinguished only by the `role` column (`'student'` or `'admin'`).

Har registered insaan (student ho ya admin) isi ek table me hota hai — bas `role` column se pata chalta hai kaun kya hai.

Key columns: `id`, `name`, `email`, `password_hash` (bcrypt hash, never the real password), `enrollment_number`, `role`, `is_blocked`, `avatar` (a file path, e.g. `/uploads/avatars/xyz.png`), `complaint_count`, `average_rating`.

### `items`
A resource listing (calculator, book, oscilloscope, etc.). Linked to its owner via `owner_id`.

Ek listed resource (calculator, kitab, waghera). `owner_id` se pata chalta hai kiska hai.

### `favorites`
A simple join table: which user has favorited which item (`user_id` + `item_id` pair).

Simple table jo batata hai kis user ne kaunsa item favorite kiya hai.

### `blocked_dates`
Date ranges an item's owner has manually marked unavailable (e.g. "I'm out of town this week"), separate from actual bookings.

Owner ne khud se jo dates "unavailable" mark kiye hain (jaise "main is hafte campus pe nahi hoon") — ye actual bookings se alag hai.

### `bookings`
A rental request: who's borrowing (`borrower_id`), from whom (`owner_id`), which item, which dates, and its `status` (`Pending` → `Accepted`/`Rejected` → `Completed`).

Ek rental request — kaun le raha hai, kiska item, kaunse dates, aur uska status.

### `messages`
Every chat message. `booking_id` links it to a specific booking's chat — **except** direct messages to/from the admin, where `booking_id` is `NULL` (there's no booking involved).

Har chat message. `booking_id` batata hai kis booking ki chat hai — **lekin** admin ke saath direct chat me `booking_id` `NULL` hota hai (kyunki koi booking involved nahi hai).

### `complaints`
A report filed by one student against another (or against the admin's oversight). Has an `admin_note` column for the admin's written resolution comment.

Ek student dusre ke against complaint file karta hai. `admin_note` column me admin apna resolution comment likh sakta hai.

### `ratings`
A star rating + comment one student leaves for another, tied to a specific completed booking.

Ek student dusre ko star rating + comment deta hai, kisi complete hui booking ke against.

### `notifications`
In-app notifications — new booking request, booking accepted/rejected, new chat message, new complaint, complaint resolved, etc.

App ke andar ke notifications — naya booking request, booking accept/reject, naya message, naya complaint, waghera.

---

## 4. Backend — How It's Organized

### `db.js` — the only file that talks to Postgres
Every other backend file goes through `db.js`; nothing else runs raw SQL. It exports grouped objects: `users`, `items`, `bookings`, `messages`, `complaints`, `ratings`, `notifications`, `favorites`, `blockedDates`. Each has functions like `users.findById(id)`, `items.create({...})`, `bookings.updateStatus(id, status)`.

**Hinglish:** Poore backend me sirf `db.js` hi Postgres se seedha baat karta hai. Baaki koi bhi file raw SQL nahi likhti — sab `db.js` ke exported functions use karte hain, jaise `users.findById(id)`, `items.create({...})`.

Two important things `db.js` handles automatically for every query:
1. **`id` → `_id` renaming** — the app is written "Mongo-style" (`user._id`, not `user.id`), so every row coming back from Postgres gets its `id` column renamed to `_id`, and every other `snake_case` column (like `owner_id`) becomes `camelCase` (`ownerId`).
2. **NUMERIC → real number** — Postgres returns `NUMERIC` columns (prices, deposits, ratings) as *strings* by default (to avoid precision loss). `db.js` configures the `pg` driver to always convert these to real JavaScript numbers, so math like `price + deposit` works correctly instead of accidentally concatenating text.

**Hinglish:** Do zaroori automatic cheezein: (1) Postgres ka `id` column response me `_id` ban jata hai, aur `owner_id` jaisa snake_case `ownerId` (camelCase) ban jata hai — taaki poora app consistent naming use kare. (2) Postgres `NUMERIC` columns (price, deposit, rating) ko default me **text/string** ki tarah bhejta hai — `db.js` ne isko fix kiya taaki hamesha real number aaye, warna `"60" + "40"` jaisi galti se "6040" ban jata (string jod diya jata, number add nahi hota).

### `api.js` — every REST endpoint
All routes (`/api/auth/*`, `/api/items/*`, `/api/bookings/*`, `/api/chat/*`, `/api/complaints/*`, `/api/ratings/*`, `/api/admin/*`, `/api/notifications/*`, `/api/messages/direct/*`) live in this one file, grouped by section with comments.

**Hinglish:** `api.js` me saare endpoints hain, section-wise comments ke saath group kiye hue.

### `server.js` — the entry point
Starts Express, tests the Postgres connection on boot (prints success/failure to the terminal), sets up Socket.IO for real-time booking chat, serves uploaded files at `/uploads/...`, and hands off frontend rendering to Vite (dev) or static files (production).

**Hinglish:** Ye sabse pehle chalne wali file hai — Express start karta hai, Postgres connection test karta hai (terminal me confirm dikhata hai), Socket.IO setup karta hai real-time chat ke liye, aur `/uploads/...` pe uploaded photos serve karta hai.

### `middleware/upload.js` — file uploads
Configures Multer for two kinds of uploads: profile photos (`avatars/` folder) and complaint proof images/PDFs (`complaint-proofs/` folder). Files are saved to disk on the server; only their URL path is stored in the database.

**Hinglish:** Profile photo aur complaint-proof photos ke liye Multer setup hai. Actual file server ki disk pe save hoti hai, database me sirf uska chhota sa path (URL) store hota hai — poori file database me nahi jaati.

### `models/` + `controllers/` + `routes/` (user profile only)
Just for `/api/users/*` endpoints, the code is split MVC-style: `userRoutes.js` (defines the URL) → `UserController.js` (handles the request) → `UserModel.js`/`ItemModel.js` (talks to `db.js`). Everything else in the app stays in the flatter `api.js` file directly.

**Hinglish:** Sirf `/api/users/*` (profile) routes ke liye code MVC style me split hai. Baaki poora app seedha `api.js` me hi hai, alag files me nahi todа gaya.

---

## 5. Frontend — How It's Organized

### `App.jsx` — the router
There's no URL-based routing (no React Router). Instead, one `activeTab` state variable decides which component to show (`'home'`, `'explore'`, `'profile'`, `'admin'`, etc.), and `setActiveTab('...')` is how any component navigates.

**Hinglish:** Yahan URL-based routing nahi hai (React Router use nahi hua). Ek `activeTab` naam ka state decide karta hai konsa page dikhna hai, aur `setActiveTab('...')` call karke koi bhi component kahin bhi navigate kar sakta hai.

### `lib/apiClient.js` — every backend call, in one place
Exports an `api` object with a function for every endpoint (`api.getItems()`, `api.createBooking(...)`, `api.uploadProfileImage(file)`, etc.). It automatically attaches the login token (`Authorization: Bearer ...`) to every request. Also handles `localStorage` for the saved login token/user and "recently viewed" items.

**Hinglish:** Ye file backend ki har call ko ek jagah rakhti hai. Har request me automatically login token attach hota hai. `localStorage` me saved login aur "recently viewed" items bhi yahi manage karti hai.

### Key components

- **`Navbar.jsx`** — top bar, shows different links for logged-out / student / admin. Notification bell polls every 10 seconds.
- **`RegisterPage.jsx` / `LoginPage.jsx`** — signup (with optional profile-photo upload right at signup) and login.
- **`ExploreItemsPage.jsx` / `ItemDetailsPage.jsx`** — browsing listings, and the booking-request form on a single item.
- **`AddItemPage.jsx` / `MyListingsPage.jsx`** — creating/editing/managing your own listings.
- **`MyBookingsPage.jsx`** — bookings you've made or received, with accept/reject actions.
- **`MessagesPage.jsx`** — the chat UI. Handles two kinds of conversations: booking chats (real-time via Socket.IO) and direct admin chats (refreshed every 5 seconds via REST, since there's no booking to tie a socket room to).
- **`ComplaintsPage.jsx`** — filing a complaint, with real photo/PDF proof upload.
- **`ProfilePage.jsx`** — view/edit your own profile; shows a different layout for admin accounts (no student stats, an "Open Admin Panel" shortcut instead).
- **`FavoritesPage.jsx`** — saved items + recently viewed (recently-viewed is stored only in the browser, not the database).
- **`AdminDashboardPage.jsx`** — stats, complaint moderation, student management (block/unblock), listing moderation.
- **`Avatar.jsx`** — a small shared component: shows the real photo if one's uploaded, otherwise colored initials (no auto-generated cartoon avatars anymore).

**Hinglish:** Har component ka apna kaam hai — Navbar upar ki bar hai, Register/Login signup-login, Explore/ItemDetails listings dekhne aur book karne ke liye, AddItem/MyListings apni listings manage karne ke liye, MyBookings apni bookings dekhne ke liye, Messages chat ke liye (booking-wali real-time, admin-wali har 5 second me refresh hoti hai), Complaints complaint file karne ke liye, Profile apni profile dekhne/edit karne ke liye (admin ke liye alag layout), Favorites saved items ke liye, AdminDashboard admin ke saare controls ke liye, aur Avatar ek chhota shared component hai jo photo ya initials dikhata hai.

---

## 6. How a Request Actually Flows (Example: Booking an Item)

1. Student fills the booking form on `ItemDetailsPage.jsx` and clicks "Send Booking Request".
2. Frontend calls `api.createBooking({ itemId, startDate, endDate })` (from `apiClient.js`).
3. This sends `POST /api/bookings` with the JWT token in the header.
4. `api.js` checks: is the item available? Do the dates overlap an existing booking or an owner-blocked date? If all good, it calls `bookings.create(...)` in `db.js`.
5. `db.js` runs the actual `INSERT INTO bookings ...` SQL and returns the new row.
6. `api.js` also calls `notifications.create(...)` to notify the item's owner.
7. The response goes back to the frontend, which shows a success message and redirects to "My Bookings".

**Hinglish:** (1) Student form bharta hai aur submit karta hai. (2) Frontend `apiClient.js` se ek function call karta hai. (3) Ye backend ko ek POST request bhejta hai, token ke saath. (4) `api.js` check karta hai item available hai ya nahi, dates clash to nahi kar rahe, phir `db.js` ko bolta hai booking create karne ke liye. (5) `db.js` actual SQL query chalata hai database me. (6) Owner ko notification bhi bheja jata hai. (7) Response wapas frontend ko jata hai, jo success message dikhata hai.

Every other feature (creating an item, sending a chat message, filing a complaint...) follows this exact same pattern: **Component → apiClient.js → api.js route → db.js function → Postgres**, and back.

Har feature (item banana, message bhejna, complaint file karna...) isi pattern ko follow karta hai: **Component → apiClient.js → api.js route → db.js function → Postgres**, aur wapas.

---

## 7. Feature-by-Feature Summary

| Feature | How it works |
|---|---|
| **Auth** | Register hashes the password with bcrypt; login verifies it with bcrypt; a JWT token is issued and stored in `localStorage`, sent as `Authorization: Bearer <token>` on every request after that. |
| **Items & Bookings** | Full CRUD on listings; booking has a status lifecycle (Pending → Accepted/Rejected → Completed); date-range overlap checking prevents double-booking. |
| **Owner-blocked dates** | Separate from bookings — owner manually marks themselves unavailable for a range, with an optional reason. |
| **Favorites** | A simple toggle, backed by the `favorites` join table. |
| **Chat** | Booking chats use Socket.IO for real-time delivery + a REST fallback. Direct admin chats are REST-only, polled every 5 seconds. |
| **Complaints & auto-block** | Filing a complaint notifies every admin. If a student accumulates 5 complaints, their account is automatically blocked (can't log in) until an admin reviews it. |
| **Ratings** | Left after a completed booking; recalculates the reviewee's average rating and total count. |
| **Notifications** | Created server-side for: new booking request, booking status change, new chat message (booking or direct), new complaint (to admins), complaint status change (to reporter). |
| **Admin panel** | Stats overview, complaint review/resolution, block/unblock students, delete fake listings — all admin-only, enforced both in the UI and on the backend (`requireAdmin` middleware). |
| **Profile photos** | Uploaded as a real file (not embedded as text) via Multer, saved to `backend/uploads/avatars/`, only the file path stored in the database. Old photo is deleted from disk when replaced or removed. |

**Hinglish (summary):** Auth password ko hash karke rakhta hai, JWT token se login track hota hai. Items/Bookings me status lifecycle hai. Owner khud apni availability block kar sakta hai. Favorites ek simple toggle hai. Chat booking-wali real-time hai, admin-wali thodi der me refresh hoti hai. Complaint file karne se admins ko pata chal jata hai; 5 complaints pe account auto-block ho jata hai. Ratings booking complete hone ke baad diye jate hain. Notifications har important event pe automatically bante hain. Admin panel se poora platform manage hota hai. Profile photos real files ki tarah disk pe save hoti hain, database me sirf path.

---

## 8. Running the Project Locally

1. Install Postgres, create a database (e.g. `resource_sharing_db`).
2. Run `schema.sql`, then `migration_blocked_dates.sql`, then `migration_admin_note.sql`, in pgAdmin's Query Tool.
3. In `backend/`, create a `.env` file with `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, and `JWT_SECRET`.
4. `npm install` in both `backend/` and `frontend/`.
5. (Optional) `node --env-file=.env scripts/seed.js` to create demo accounts.
6. `npm run dev` in `backend/` — this also serves the frontend via Vite middleware, so one server on `http://localhost:3000` runs everything.

**Hinglish:** (1) Postgres install karo, database banao. (2) `schema.sql` aur dono migrations pgAdmin me chalao. (3) `backend/.env` file banao, DB credentials aur JWT secret daalo. (4) `npm install` dono folders (`backend`, `frontend`) me. (5) Chaho to `scripts/seed.js` chala ke demo accounts bana lo. (6) `npm run dev` backend me chalao — yahi ek server frontend bhi serve karta hai, sab kuch `http://localhost:3000` pe chalta hai.

---

## 9. Button-by-Button Testing Guide

Every button/action on every page, what it does, and how to test it. Go through this top to bottom for a full manual test pass.

Har page ke har button/action ka kaam aur usko test karne ka tarika. Upar se neeche follow karo poori app test karne ke liye.

### 9.1 Register Page

| Element | Kya karta hai | Test kaise karo |
|---|---|---|
| Add profile photo | File-picker kholta hai, chuni gayi image ka turant preview dikhata hai | Ek JPG/PNG chuno → preview initials ki jagah photo dikhni chahiye |
| Full Name / Mobile / Enrollment No | Text input fields | Khaali chhod ke submit karo → "Please fill in all required fields" error aana chahiye |
| College Email | Sirf `@sgsits.ac.in` (ya jo format tumne set kiya) format accept karta hai | Galat format daalo (jaise `abc@gmail.com`) → format error aana chahiye |
| Semester dropdown | 1st–8th Semester me se select | Koi bhi select karo, save hona chahiye |
| Password | Register ke time bcrypt se hash hota hai | Registration ke baad pgAdmin me `users.password_hash` check karo — real password nahi, hash dikhna chahiye |
| **Register CS Student Account** button | Account banata hai, token milte hi (agar photo choose ki thi) photo upload karta hai, phir home pe redirect | Sahi data bhar ke submit karo → success ke baad Navbar me apna naam/photo dikhna chahiye |
| **Sign In** link | Login page pe le jata hai | Click karke confirm karo |

### 9.2 Login Page

| Element | Kya karta hai | Test kaise karo |
|---|---|---|
| Email + Password fields | Login credentials | Galat password daalo → "Invalid email or password" aana chahiye |
| Login button | `POST /auth/login` call karta hai, token save karke home pe le jata hai | Sahi credentials se login karke confirm karo |
| Blocked account | Agar user 5 complaints se block ho, login par error dikhna chahiye | Kisi blocked test-user se login try karo → "ACCOUNT BLOCKED..." error aana chahiye |

### 9.3 Navbar (har page pe upar)

| Element | Kya karta hai | Test kaise karo |
|---|---|---|
| Logo / "CS Dept Share & Rent" | Home page pe le jata hai | Kisi bhi page se click karo |
| Explore Items | Saari listings dikhata hai | Click karke items grid dikhna chahiye |
| List Item *(sirf students)* | Naya item add karne ka form kholta hai | Admin account se login karo → ye button **nahi dikhna chahiye** |
| Chat | Messages page kholta hai | Click karke conversation list dikhni chahiye |
| Admin Panel *(sirf admin)* | Admin dashboard kholta hai | Student account se login karo → ye button **nahi dikhna chahiye** |
| Dark mode toggle (sun/moon icon) | Poori app ka theme switch karta hai | Click karo → background dark/light ho jana chahiye, refresh ke baad bhi wahi theme rahe |
| Notification bell | Dropdown me saari notifications dikhata hai, unread count badge ke saath | Koi action karo jo notification banati ho (jaise booking) → bell pe red count dikhna chahiye |
| Notification click | Us notification se related page pe le jata hai aur read mark kar deta hai | Click karke confirm karo sahi page khula |
| Avatar/Name (right side) | Apni profile page kholta hai | Click karo |
| Logout icon | Token clear karke login screen pe le jata hai | Click karke confirm logout ho gaya |
| Hamburger menu (mobile) | Mobile view me same links ek dropdown me dikhata hai | Browser window chhoti karo (ya mobile se kholo) aur test karo |

### 9.4 Explore Items Page

| Element | Kya karta hai | Test kaise karo |
|---|---|---|
| Search box | Title/description me text match karta hai | Kisi item ka naam type karo → sirf wahi item(s) dikhne chahiye |
| Category filter | Category ke hisab se items filter karta hai | Ek category select karo → sirf usi category ke items dikhein |
| Price filter | Min/Max price ke beech ke items dikhata hai | Range set karo, confirm karo bahar wale items hide ho jayein |
| Item card click | Us item ki details page kholta hai | Click karke confirm karo |

### 9.5 Item Details Page

| Element | Kya karta hai | Test kaise karo |
|---|---|---|
| Heart (favorite) icon | Item ko favorites me add/remove karta hai | Click karo, Favorites page pe jaake confirm karo item wahan hai |
| Thumbnail images | Selected image ko bada dikhata hai | Alag-alag thumbnail pe click karke confirm karo |
| Rental Start/End Date | Booking ke dates select karte hain; booked/owner-blocked dates automatically overlap check karte hain | Kisi already-booked date range se overlap karo → error aana chahiye, submit disabled ho |
| Total calculation (rent + deposit) | Automatically calculate hota hai | Dates badal ke confirm karo total sahi update ho raha hai (NUMERIC-string bug ab fix hai) |
| **Send Booking Request** button | `POST /bookings` call karta hai, owner ko notification jaati hai | Submit karke confirm karo — My Bookings me request dikhni chahiye, owner ko notification aani chahiye |

### 9.6 Add / Edit Item Page

| Element | Kya karta hai | Test kaise karo |
|---|---|---|
| Title, Category, Description, Price, Deposit, Condition, Pickup Location fields | Item ki details | Required fields khaali chhod ke submit karo → error aana chahiye |
| Images | Item ki photos (URLs ya upload, jo bhi tumhara current form support karta hai) | Ek image ke saath list karo, confirm karo dikh rahi hai |
| Save/List button | Naya item create karta hai, ya existing update karta hai (edit mode me) | Submit karke My Listings me confirm karo |

### 9.7 My Listings Page

| Element | Kya karta hai | Test kaise karo |
|---|---|---|
| Edit icon/button | Add Item form ko us item ke data se pre-fill karke kholta hai | Edit karke save karo, changes reflect hone chahiye |
| Delete icon/button | Item permanently delete karta hai | Delete karo, confirm karo Explore se bhi gayab ho gaya |
| Availability toggle | Item ko on/off (rentable/paused) karta hai | Off karo, confirm karo item "Paused by Owner" dikhta hai |
| Block Dates button | Owner khud ke liye specific dates unavailable mark karta hai (reason ke saath) | Ek date-range block karo, Item Details page pe jaake confirm karo wahi range "unavailable" dikh raha hai |

### 9.8 My Bookings Page

| Element | Kya karta hai | Test kaise karo |
|---|---|---|
| Accept button *(owner ke liye)* | Booking status "Accepted" karta hai, borrower ko notification, chat unlock hoti hai | Accept karke confirm karo status badla aur Chat me entry aa gayi |
| Reject button *(owner ke liye)* | Booking status "Rejected" karta hai | Reject karo, borrower ko notification aani chahiye |
| Chat icon | Messages page pe us booking ki conversation kholta hai | Click karke confirm karo sahi chat khuli |
| File Complaint icon | Complaints page kholta hai, reported-user pre-filled | Click karke confirm karo form pre-filled hai |

### 9.9 Messages Page

| Element | Kya karta hai | Test kaise karo |
|---|---|---|
| Conversation list (left side) | Saari booking-chats + admin-wali direct chat dikhata hai | Confirm karo student ko "CS Admin" wali entry hamesha dikhti hai, chahe pehle message hua ho ya na ho |
| Conversation click | Us thread ke messages load karta hai, unread count clear karta hai | Click karke confirm karo messages load hue aur unread badge gaya |
| Message input + Send | Message bhejta hai — booking-chat real-time (Socket.IO), admin-chat REST (5 sec me refresh) | Do alag accounts se (2 browser tabs) message bhejo, confirm karo dusri taraf turant/thodi der me dikh raha hai |
| **New Message** button *(sirf admin)* | Kisi bhi student ko search karke naya conversation shuru karta hai | Admin se login karo, kisi student ko search karo, message bhejo — student ki taraf notification aani chahiye |

### 9.10 Complaints Page

| Element | Kya karta hai | Test kaise karo |
|---|---|---|
| File New Complaint button | Complaint form toggle karta hai | Click karke form open/close confirm karo |
| Complaint Type dropdown | Complaint ki category select karta hai | Koi bhi type select karo |
| Reported Student ID/Email | Kis user ke against complaint hai | Galat/non-existent ID daalo → "Reported user not found" error aana chahiye |
| Description | Incident ka detail | Khaali chhod ke submit karo → error aana chahiye |
| Choose File button | Proof photo/PDF real upload karta hai (disk pe save), thumbnail preview dikhata hai | Photo upload karo, confirm karo thumbnail dikha, aur admin panel me bhi wahi photo khulti hai (naya tab me) |
| Submit Complaint button | Complaint create karta hai, **saare admins ko notification** bhejta hai | Submit karke admin account se login karke confirm karo notification aayi |
| Auto-block | 5vi complaint pe reported user automatically block ho jata hai | Test account pe 5 complaints file karo, confirm karo login fail hone lage ("ACCOUNT BLOCKED") |

### 9.11 Profile Page

| Element | Kya karta hai | Test kaise karo |
|---|---|---|
| Edit Profile button | Edit form toggle karta hai (Name, Mobile, Semester, Photo) | Click karke form open/close confirm karo |
| Change/Upload photo button | Naya photo upload karke turant profile pe update karta hai | Photo upload karo, confirm karo Navbar + Profile dono jagah naya photo dikhe |
| Remove photo button | Photo hata deta hai, wapas initials-avatar dikhta hai | Remove karke confirm karo initials wapas aa gaye, aur purani file disk se bhi delete ho gayi |
| Save Profile Changes button | Name/Mobile/Semester update karta hai | Values badal ke save karo, refresh ke baad bhi persist hone chahiye |
| Quick Action buttons (student) | My Listings / My Bookings / Favorites / Complaints pe le jate hain | Har button click karke sahi page khulna chahiye |
| Open Admin Control Panel button *(sirf admin)* | Admin Dashboard kholta hai | Admin se login karke confirm karo |

### 9.12 Favorites Page

| Element | Kya karta hai | Test kaise karo |
|---|---|---|
| Saved item card | Favorited items dikhata hai | Kisi item ko favorite karo, yahan aake confirm karo dikh raha hai |
| Remove/heart toggle | Favorites se hata deta hai | Un-favorite karke confirm karo list se gayab ho gaya |
| Recently Viewed | Jo items dekhe hain unka local history (browser-only, database me nahi) | Kuch items khol ke dekho, confirm karo yahan list me aa gaye |

### 9.13 Admin Dashboard

| Element | Kya karta hai | Test kaise karo |
|---|---|---|
| Overview Stats tab | Total students, listings, bookings, complaints, blocked users, rental volume dikhata hai | Confirm karo numbers actual data se match karte hain |
| Complaints tab | Saari complaints table me, "Review/Resolve" button ke saath | Kisi complaint pe click karke modal khulna chahiye |
| Review/Resolve button (modal ke andar) | Admin note likh ke complaint ko "Resolved" mark karta hai, reporter ko notification bhejta hai | Resolve karo, reporter account se login karke confirm karo notification aayi |
| Students tab | Saare registered students ki list, Block/Unblock button ke saath | Kisi student ko block karo, confirm karo wo login nahi kar pa raha |
| Block/Unblock button | User ka `is_blocked` status toggle karta hai (admin khud block nahi ho sakta) | Toggle karke confirm karo status badla |
| Resource Listings tab | Saare items, delete button ke saath | Delete karke confirm karo Explore se bhi gayab ho gaya |

---

**General testing tip / Aam test tarika:** Do alag browsers (ya ek normal + ek incognito window) khol ke ek me student aur ek me admin login karo — is tarah real-time features (chat, notifications) dono taraf se ek saath test kar sakte ho.
