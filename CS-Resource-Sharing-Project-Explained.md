# CS Resource Sharing System — Frontend, Backend & Database Explained
### (English + Hinglish)

Ye document project ke teeno layers (Frontend, Backend, Database) ko file-by-file explain karta hai — kya kaam karta hai, konsi file kya karti hai, aur data kaise flow karta hai.

---

## 🎨 1. FRONTEND (React + Vite)

**Overall role:** UI dikhana, user input lena, backend ko API calls bhejna. Koi bhi component seedha database ko touch nahi karta — sab `apiClient.js` ke through jaata hai.

| File | English | Hinglish |
|---|---|---|
| `App.jsx` | Top-level router. No React Router — one `activeTab` state decides which page shows. | Sabse upar ka router hai. URL-routing nahi hai, bas ek `activeTab` state se pata chalta hai konsa page dikhana hai. |
| `main.jsx` | Entry point — mounts `App.jsx` into the DOM. | React app ko browser mein "start" karta hai. |
| `lib/apiClient.js` | Every backend call lives here, in one object (`api.getItems()`, `api.createBooking()` etc.). Auto-attaches JWT token to requests. Also handles `localStorage`. | Backend ki HAR call ek hi jagah hai. Har request mein login token automatically laga deta hai. `localStorage` (saved login, recently viewed) bhi yahi manage karta hai. |
| `controllers/useProfileController.js` | A hook that holds Profile page's logic (edit form state, save handler) separate from its UI. | Profile page ka logic (edit karna, save karna) UI se alag rakha gaya hai is hook mein. |
| `components/Navbar.jsx` | Top bar — different links for guest/student/admin, dark mode toggle, notification bell (polls every 10s). | Upar ki bar — login/student/admin ke hisab se alag links, dark mode switch, notification bell. |
| `components/LandingPage.jsx` | Home/welcome page for logged-out users. | Logged-out user ka home page. |
| `components/RegisterPage.jsx` | Signup form + optional profile photo upload at signup. | Signup form, chaho to photo bhi register ke time upload kar sakte ho. |
| `components/LoginPage.jsx` | Login form, shows "ACCOUNT BLOCKED" error if applicable. | Login form, agar account block hai to error dikhata hai. |
| `components/QuickDemoLoginModal.jsx` | A popup for quick demo-account login (testing shortcut). | Quick demo-login ka popup, testing ke liye shortcut. |
| `components/ExploreItemsPage.jsx` | Browse/search/filter all listed items. | Saari listed items browse/search/filter karne ka page. |
| `components/ItemDetailsPage.jsx` | Single item's full details + the booking-request form (date picker, price calc, overlap check). | Ek item ki poori details + booking form (dates, price calculation, clash check). |
| `components/AddItemPage.jsx` | Form to create a new listing OR edit an existing one. | Naya item add karne ya existing item edit karne ka form. |
| `components/MyListingsPage.jsx` | Your own listings — edit, delete, pause, block-dates. | Apni listings — edit, delete, pause karna, dates block karna. |
| `components/MyBookingsPage.jsx` | Bookings you made/received — accept/reject actions. | Apni bookings (di hui aur li hui) — accept/reject karne ke buttons. |
| `components/FavoritesPage.jsx` | Saved (favorited) items + "recently viewed" (browser-only history). | Favorite kiye hue items + recently-viewed history (sirf browser mein, DB mein nahi). |
| `components/MessagesPage.jsx` | Chat UI — booking chats (real-time via Socket.IO) + admin direct chat (REST, 5s refresh). | Chat wala page — booking-chat real-time hai, admin-chat har 5 second mein refresh hoti hai. |
| `components/ComplaintsPage.jsx` | File a complaint against another user, with real photo/PDF proof upload. | Kisi user ke against complaint file karna, proof photo/PDF ke saath. |
| `components/ProfilePage.jsx` | View/edit your profile, photo upload; different layout for admin. | Apni profile dekhna/edit karna, photo change karna; admin ke liye alag layout. |
| `components/AdminDashboardPage.jsx` | Admin's main panel — stats, complaint review, block/unblock students, delete listings. | Admin ka main control panel — stats, complaint resolve karna, students block/unblock karna, listings delete karna. |
| `components/AdminDashboard.jsx` | A sub-piece of the admin panel (likely stats/overview widget). | Admin panel ka ek chhota hissa (stats widget). |
| `components/Avatar.jsx` | Shared small component — shows real photo or colored initials. | Chhota reusable component — photo ho to photo, warna colored initials dikhata hai. |
| `components/DocsPage.jsx` | In-app documentation/help page. | App ke andar hi help/documentation page. |
| `components/Footer.jsx` | Bottom footer of the app. | App ka neeche wala footer. |

---

## ⚙️ 2. BACKEND (Node.js + Express + Socket.IO)

**Overall role:** API endpoints handle karna, business logic (auth check, overlap check, notifications), aur database ke saath baat karna.

| File | English | Hinglish |
|---|---|---|
| `server.js` | Entry point — starts Express, tests Postgres connection, sets up Socket.IO, serves uploaded files at `/uploads/...`. | Sabse pehle chalne wali file — Express start karta hai, DB connection test karta hai, Socket.IO setup karta hai, aur uploaded photos serve karta hai. |
| `server/api.js` (1130 lines — sabse bada file) | ALL REST routes: auth, items, bookings, chat, complaints, ratings, admin, notifications, direct messages — grouped by section. | Poore app ke saare API endpoints yahin hain, section-wise arranged. |
| `server/db.js` (563 lines) | ONLY file that talks to Postgres. Auto-converts `id`→`_id`, `snake_case`→`camelCase`, and `NUMERIC` strings → real numbers. | Sirf yeh file database se seedha baat karti hai. `id` ko `_id` banati hai, column names ko camelCase karti hai, aur price/number columns ko sahi number format mein rakhti hai. |
| `server/models/UserModel.js`, `ItemModel.js` | Thin wrappers used only by the profile feature (MVC-style, just for `/api/users/*`). | Sirf profile feature ke liye — thin wrapper jo `db.js` ko call karta hai. |
| `server/controllers/UserController.js` | Handles the profile-related request logic. | Profile se related request ka logic yahan hai. |
| `server/routes/userRoutes.js` | Defines URLs for `/api/users/*`. | `/api/users/*` ke URLs yahan define hain. |
| `server/middleware/upload.js` | Multer config — handles avatar uploads and complaint-proof uploads to disk. | Photo/proof file upload ka setup — files disk pe save hoti hain, DB mein sirf path store hota hai. |

**Request flow (sab features isi pattern ko follow karte hain):**

```
Component → apiClient.js → api.js (route) → db.js (query) → Postgres → wapas response
```

**Example — Booking an item:**
1. Student `ItemDetailsPage.jsx` pe form bharta hai, "Send Booking Request" click karta hai.
2. `apiClient.js` se `api.createBooking(...)` call hota hai.
3. `POST /api/bookings` request jaati hai, JWT token header mein.
4. `api.js` check karta hai — item available hai? Dates clash to nahi kar rahe? Sab theek to `db.js` ko booking create karne bolta hai.
5. `db.js` `INSERT INTO bookings ...` chalata hai.
6. `api.js` owner ko notification bhi bhejta hai.
7. Response frontend ko wapas jata hai, success message + redirect.

---

## 🗄️ 3. DATABASE (PostgreSQL) — 9 Tables

### `users`
**Kaam:** Har registered person (student ya admin) yahin store hota hai — `role` column decide karta hai kaun kya hai.

| Column | Matlab |
|---|---|
| `id` | Primary key (VARCHAR, app khud custom IDs generate karta hai) |
| `password_hash` | Real password kabhi save nahi hota, sirf bcrypt-hashed version |
| `enrollment_number` | UNIQUE — do students same enrollment no. se register nahi kar sakte |
| `role` | `'student'` ya `'admin'` |
| `is_blocked` | 5 complaints ke baad auto-true ho jata hai |
| `complaint_count` | Har complaint pe backend isko +1 karta hai |
| `average_rating` / `total_ratings` | Har naye rating ke baad backend recalculate karta hai |

### `items`
**Kaam:** Har listed resource (calculator, book, etc.), `owner_id` se malik pata chalta hai.

- `images` → **array** hai (`TEXT[]`), ek item ki multiple photos ek hi column mein.
- `blocked_dates` (column) → array hai, lekin isi naam ki ek alag **table** bhi hai (niche dekho) — original schema mein wo table nahi thi, migration se aayi thi. Ho sakta hai ye column legacy ho.

### `favorites`
**Kaam:** Simple many-to-many join table — kis user ne kaunsa item favorite kiya.

- `item_id` ka FK constraint baad mein `ALTER TABLE` se add hua (kyunki `items` table iske baad banti hai).
- Composite primary key `(user_id, item_id)` — ek user ek item ko sirf ek hi baar favorite kar sakta hai.

### `bookings`
**Kaam:** Rental request — kaun le raha hai (`borrower_id`), kiska hai (`owner_id`), kis item ka, kaunse dates, aur status.

- `status` lifecycle: `Pending → Accepted/Rejected → Completed` (aur `Cancelled` bhi hai schema mein).
- `total_days` aur `total_cost` — pre-calculated hoke store hote hain, taaki baad mein price change ho to purani booking ka amount na badle.

### `messages`
**Kaam:** Chat messages. `booking_id` batata hai kis booking ki chat hai.

- `receiver_id` bhi hai (`sender_id` ke saath) — direct 1-to-1 message model hai, group chat nahi.
- Admin-direct-chat ke liye `booking_id` NULL hota hai (koi `NOT NULL` constraint nahi hai isi par, isliye allowed hai).

### `complaints`
**Kaam:** Ek student dusre ke against complaint file karta hai.

- `booking_id` **FK reference nahi hai** — matlab booking delete ho jaye to complaint orphan reh sakta hai.
- `status`: `Pending | Verified | Dismissed`.
- `admin_note` column original schema mein nahi hai — baad mein migration se add hua.

### `ratings`
**Kaam:** Star rating + comment, completed booking ke against.

- `stars` par `CHECK (stars BETWEEN 1 AND 5)` — DB level pe hi validation hai.

### `notifications`
**Kaam:** In-app alerts (new booking, status change, new message, etc.)

- `link` column — click karne pe kahan navigate karna hai.
- `read` boolean — bell icon ka unread-count isi se calculate hota hai.

### Relationships (Foreign Keys) — Quick Map

```
users ──┬── items (owner_id)
        ├── favorites (user_id)
        ├── bookings (borrower_id, owner_id)
        ├── messages (sender_id, receiver_id)
        ├── complaints (reporter_id, reported_user_id)
        ├── ratings (reviewer_id, reviewee_id)
        └── notifications (user_id)

items ──┬── favorites (item_id)
        └── bookings (item_id)

bookings ──┬── messages (booking_id)
           └── ratings (booking_id)
```

Sab `ON DELETE CASCADE` hai — user delete hone par uski saari items, bookings, messages, complaints, ratings, notifications bhi automatically delete ho jayengi. (`complaints.booking_id` exception hai — FK hi nahi hai.)

### Indexes

5 indexes hain query speed ke liye — `owner`, `item`, `borrower`, `booking` (messages ke liye), aur `user` (notifications ke liye) columns pe. Exactly wahi columns jo `api.js` mein baar-baar `WHERE` clause mein use hote hain.

---

## 🔄 Overall Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS v4 |
| Backend | Node.js + Express |
| Real-time chat | Socket.IO |
| Database | PostgreSQL (via `pg` package) |
| Auth | JWT (jsonwebtoken) + bcrypt password hashing |
| File uploads | Multer (disk storage) |
