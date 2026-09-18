# CS Department Resource Sharing System

## Project guide / Project ka guide

This document explains what the project does, how a student uses it, how the frontend and backend communicate, and the purpose of every maintained source file.

Yeh document project ka complete overview deta hai: user kya kar sakta hai, data kaise flow hota hai, aur har important file ka role kya hai.

---

## 1. What this project is / Yeh project kya hai

The CS Department Resource Sharing System is a peer-to-peer platform for Computer Science students. A student can list an item such as a calculator, book, lab kit, or electronic accessory and another student can request to rent it.

Simple words mein: CS students apne unused resources list karte hain; doosre students unhe search karke booking request bhejte hain. Owner request accept/reject karta hai, phir dono chat karke pickup decide kar sakte hain.

### Main capabilities / Main features

| Feature | English | Hinglish |
| --- | --- | --- |
| Authentication | Register and sign in with a student account. | Student register aur login kar sakta hai. |
| Explore listings | Search, filter, and open available resources. | Items ko search/filter karke details dekh sakte hain. |
| Owner profile | Shows the selected item owner's details, enrollment number, and User ID. | Selected item ke actual owner ka profile, enrollment number aur User ID dikhta hai. |
| Listings | Students create, edit, pause, delete, and block unavailable dates for their own items. | Owner apne items add/edit/pause/delete aur unavailable dates manage karta hai. |
| Bookings | A borrower sends a date-based request; an owner accepts, rejects, or completes it. | Borrower request bhejta hai aur owner usko accept/reject/complete karta hai. |
| Chat | Accepted bookings allow messages between borrower and owner. | Accepted booking ke baad dono users chat kar sakte hain. |
| Ratings | Students can leave a rating/review after a completed booking. | Completed rental ke baad review aur rating de sakte hain. |
| Complaints | Users can report another user; repeated valid complaints can block a user. | Kisi user ke against complaint file kar sakte hain; threshold par auto-block ho sakta hai. |
| Favorites and notifications | Save items and receive in-app notifications. | Items favorite kar sakte hain aur notifications milte hain. |
| Admin tools | Admin can review users, listings, complaints, and platform statistics. | Admin users/listings/complaints aur stats manage kar sakta hai. |

---

## 2. Technology and architecture / Technology aur architecture

```text
Browser (React + Vite + Tailwind CSS)
          |
          | fetch('/api/...') with JWT token when required
          v
Express API + Socket.IO (backend/server.js)
          |
          v
In-memory DatabaseStore (backend/server/db.js)
```

- **Frontend:** React components render all pages. Tailwind CSS classes and `src/index.css` provide responsive styling, light/dark theme rules, transitions, and animations.
- **Backend:** Express exposes REST APIs under `/api`. Socket.IO emits live chat messages.
- **Data store:** `DatabaseStore` keeps users, items, bookings, messages, complaints, ratings, and notifications in memory.
- **Authentication:** JWT tokens identify signed-in users for protected API calls.

Important: this version does **not** use a permanent database. Server restart hone par registrations, new listings, bookings, messages, and other runtime changes reset ho jaate hain.

---

## 3. How to run / Project kaise run karein

### Prerequisites

- Node.js 18+ recommended
- npm

### Recommended local run

The backend starts Express and mounts Vite as middleware, so use the backend server during normal development:

```powershell
cd backend
npm install
npm run dev
```

Open `http://localhost:3000`.

`backend/server.js` finds the sibling `frontend` folder and serves the React app. API requests such as `/api/items` go to the same server.

### Frontend production check

```powershell
cd frontend
npm install
npm run build
```

This only verifies that the React frontend can build. API functionality still needs the backend server.

---

## 4. User journey / User project kaise use kare

### A. New student / Naya student

1. Open the app and choose **Register**.
2. Enter name, college email, enrollment number, mobile number, password, semester, and department.
3. The backend validates the college email format and checks duplicate email/enrollment number.
4. After successful registration, a JWT token and user object are stored in browser local storage.

Note: the current registration rule expects `0801CSYYRRRR@gmail.com` format. Demo accounts are available from the quick demo login modal.

### B. Explore and request an item / Item dhoondhna aur request bhejna

1. Open **Explore Resources**.
2. Use search, category, condition, maximum price, and available-only filters.
3. Click a resource card to open its details.
4. The page fetches the selected item's owner profile using that item's `ownerId`.
5. In **Owner Student Profile**, the enrollment number is shown first and then the owner’s User ID. Yeh ID current logged-in user ki nahi, selected resource ke owner ki hoti hai.
6. Select valid rental dates and click **Send Booking Request**.
7. The owner receives the request in **Bookings** and can accept or reject it.

### C. Listing an item / Apna item list karna

1. Sign in and open **List Resource**.
2. Add item title, category, condition, price, deposit, pickup location, description, and images.
3. Submit the form.
4. Open **My Listings** to edit the item, pause availability, delete it, or add blocked/unavailable dates.

### D. Chat, completion, and review / Chat aur review

1. After the owner accepts a booking, open **Messages**.
2. Select the accepted booking and send messages for pickup/return coordination.
3. When the rental is complete, the relevant user can submit a rating and written review.

### E. Student profile / Apna profile

1. Open **Profile** from the navigation.
2. The profile shows the signed-in student's name, department, semester, enrollment number, and then User ID.
3. The User ID comes from `currentUser._id`, which originates in actual backend user data. It is never generated in the UI.
4. Use **Edit Profile** to update supported profile values such as name, mobile number, semester, and avatar.

### F. Admin / Admin use

1. Sign in using an admin account.
2. Open the Admin dashboard.
3. Review platform stats, users, listings, and complaints.
4. Block/unblock users, resolve complaints, and remove inappropriate listings when needed.

---

## 5. Important data flows / Important flows

### Owner User ID flow

```text
Explore card click
  -> App stores selected item
  -> ItemDetailsPage calls GET /api/items/:itemId
  -> API finds item.ownerId and returns owner._id
  -> ItemDetailsPage calls GET /api/users/:ownerId
  -> Owner profile shows enrollmentNumber, then _id (User ID)
```

This prevents a common bug: displaying the viewer's ID instead of the resource owner's ID.

### Login flow

```text
Login form -> POST /api/auth/login -> JWT + user returned
-> apiClient stores token/user in localStorage
-> later requests send Authorization: Bearer <token>
-> authenticateToken finds req.user from the JWT userId
```

### Booking flow

```text
Borrower selects dates -> POST /api/bookings
-> API verifies listing, owner, availability, dates, and conflicts
-> booking is stored + owner notification is created
-> owner changes status through PUT /api/bookings/:id/status
-> accepted booking unlocks chat
```

---

## 6. API summary / API ka summary

All routes below are prefixed with `/api`.

| Area | Endpoints | Purpose |
| --- | --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | Registration, login, and current session. |
| Users | `GET /users/:id`, `PUT /users/profile` | Public profile lookup and own-profile update. |
| Items | `GET /items`, `GET /items/:id`, `POST/PUT/DELETE /items/:id` | Browse and manage resource listings. |
| Availability | `GET /items/:id/booked-dates`, `POST/DELETE .../blocked-dates` | Read booking conflicts and manage owner blocked dates. |
| Favorites | `GET /favorites`, `POST /favorites/:itemId` | Read and toggle favorites. |
| Bookings | `POST /bookings`, `GET /bookings/my`, `PUT /bookings/:id/status` | Create and manage rental requests. |
| Chat | `GET /chat/messages/:bookingId`, `POST /chat/messages` | Read/send permitted booking messages. |
| Complaints | `POST /complaints`, `GET /complaints/my` | File and review a user's own complaints. |
| Ratings | `POST /ratings`, `GET /ratings/user/:userId` | Add/read peer ratings. |
| Notifications | `GET /notifications`, `PUT /notifications/:id/read` | Show and mark notifications as read. |
| Admin | `/admin/stats`, `/admin/users`, `/admin/complaints`, `/admin/items/:id` | Admin-only moderation and dashboard actions. |

Protected route ka matlab: request mein valid JWT token hona chahiye. Admin route ke liye user role `admin` bhi hona zaroori hai.

---

## 7. File-by-file reference / Har file ka role

### Root

| File | Role |
| --- | --- |
| `PROJECT_GUIDE_EN_HINGLISH.md` | This English + Hinglish project guide. |

### Backend

| File | English explanation | Hinglish explanation |
| --- | --- | --- |
| `backend/package.json` | Backend dependencies and `start`/`dev` scripts. | Backend packages aur commands define karta hai. |
| `backend/package-lock.json` | Exact installed dependency versions. | Packages ke exact versions lock karta hai. |
| `backend/server.js` | Server entry point: creates Express/HTTP/Socket.IO, mounts APIs, and serves the frontend. | Main server file; API, Socket.IO aur frontend ko start karta hai. |
| `backend/server/api.js` | Main REST API routes, JWT middleware, validation, and feature business rules. | Auth, items, bookings, chat, complaints, ratings aur admin ka main logic. |
| `backend/server/db.js` | In-memory `DatabaseStore`, seed users/items, and automatic complaint-block helper. | Temporary database aur demo data yahin hai. Restart par data reset hota hai. |
| `backend/server/routes/userRoutes.js` | Registers `/users/:id` and `/users/profile` routes. | User routes ko controller se connect karta hai. |
| `backend/server/controllers/UserController.js` | Gets profile statistics and updates profile data. | User profile read/update ka controller logic. |
| `backend/server/models/UserModel.js` | User lookup and allowed profile-field updates. | User database operations ko small model layer mein rakhta hai. |
| `backend/server/models/ItemModel.js` | Item lookup by owner and syncing owner details after a profile edit. | Owner profile change hone par item owner details sync karta hai. |
| `backend/README.md` | Existing backend-specific notes and demo account information. | Backend run aur demo account ki additional info. |
| `backend/files.zip` | Archive asset; it is not required by normal runtime code. | Runtime ke liye required nahi; archive file hai. |

### Frontend foundation

| File | English explanation | Hinglish explanation |
| --- | --- | --- |
| `frontend/package.json` | Frontend dependencies and Vite scripts. | React frontend ke packages aur scripts. |
| `frontend/package-lock.json` | Exact frontend dependency tree. | Frontend packages ke exact versions. |
| `frontend/index.html` | HTML page containing the React mount element. | Browser ka starting HTML page. |
| `frontend/vite.config.js` | Vite config with React and Tailwind plugins. | Vite, React aur Tailwind integration. |
| `frontend/eslint.config.js` | Linting configuration. | Code quality/lint rules. |
| `frontend/src/main.jsx` | React application entry point; mounts `App`. | React app ko browser mein render karta hai. |
| `frontend/src/App.jsx` | Top-level state, navigation/tab switching, session handling, and component composition. | App ka main controller; pages switch aur current user manage karta hai. |
| `frontend/src/index.css` | Global Tailwind import, light/dark UI layer, animations, focus, card, table, and responsive styling. | Global CSS aur project-wide theme/animation improvements. |
| `frontend/src/App.css` | Legacy Vite template CSS; not imported by `main.jsx`. | Old template CSS hai, current UI `index.css` use karta hai. |
| `frontend/README.md` | Default Vite README. | Vite template ka default documentation. |

### Frontend API, controller, and pages

| File | English explanation | Hinglish explanation |
| --- | --- | --- |
| `frontend/src/lib/apiClient.js` | Central API client, auth-token storage, user storage, and recently viewed item helpers. | Har API call, token/localStorage aur recently viewed logic yahin hai. |
| `frontend/src/controllers/useProfileController.js` | Profile page state, stats loading, form state, and profile update request. | Profile page ka data fetch aur edit/save state manage karta hai. |
| `frontend/src/components/Navbar.jsx` | Navigation links, mobile menu, theme toggle, logout, and notifications. | Top navbar, mobile menu, dark/light toggle aur notifications. |
| `frontend/src/components/Footer.jsx` | Footer links, platform explanation, and department rules. | Footer ka content aur quick links. |
| `frontend/src/components/LandingPage.jsx` | Home/hero page, categories, and featured listing entry points. | Home page aur explore ke entry sections. |
| `frontend/src/components/ExploreItemsPage.jsx` | Listing search, category/condition/price filters, loading/empty states, and resource cards. | Items browse, filters aur resource cards. |
| `frontend/src/components/ItemDetailsPage.jsx` | Full item view, owner profile, owner User ID lookup, reviews, favorites, dates, and booking request. | Item details, actual owner profile/User ID, booking aur reviews. |
| `frontend/src/components/AddItemPage.jsx` | Create/edit resource listing form and image/bill inputs. | Naya item add ya existing listing edit karne ka form. |
| `frontend/src/components/MyListingsPage.jsx` | Owner's listing management, availability switch, delete action, and blocked-date modal. | Apne listings aur unavailable dates manage karne ka page. |
| `frontend/src/components/MyBookingsPage.jsx` | Borrower/owner booking tabs, status actions, and review modal. | Booking requests manage aur review submit karne ka page. |
| `frontend/src/components/MessagesPage.jsx` | Booking-specific messages and Socket.IO live chat integration. | Accepted booking ke chat messages aur realtime communication. |
| `frontend/src/components/ComplaintsPage.jsx` | Complaint form, evidence handling, and submitted/received complaint views. | Complaint file aur complaint status dekhne ka page. |
| `frontend/src/components/FavoritesPage.jsx` | Saved item list and favorite removal. | Favorite resources dekhna aur remove karna. |
| `frontend/src/components/ProfilePage.jsx` | Current student profile, enrollment number then User ID, profile edit form, stats, and reviews. | Apna profile, Enrollment ke baad User ID, stats aur edit form. |
| `frontend/src/components/LoginPage.jsx` | Login form and quick-demo access entry. | Login page. |
| `frontend/src/components/RegisterPage.jsx` | Student registration form and client-side validation. | New student register page. |
| `frontend/src/components/QuickDemoLoginModal.jsx` | Modal for sign-in with seeded demo accounts. | Demo accounts se one-click login modal. |
| `frontend/src/components/AdminDashboardPage.jsx` | Main admin dashboard, stats, user actions, complaint review, and listing moderation. | Admin ka actual dashboard aur moderation controls. |
| `frontend/src/components/AdminDashboard.jsx` | Additional/older admin dashboard component kept in the source tree. | Extra/older admin component; primary app `AdminDashboardPage` use karta hai. |
| `frontend/src/components/DocsPage.jsx` | In-app documentation/ER-style visual explanation page. | App ke andar documentation page. |

---

## 8. Security and current limitations / Zaroori limitations

1. **In-memory data:** Data server restart ke baad reset hota hai. Production ke liye MongoDB/PostgreSQL jaisa persistent database add karna hoga.
2. **Passwords:** The current login route verifies that a user exists but does not currently compare a submitted password with a stored password. Production mein bcrypt hash/compare must be enforced.
3. **Environment values:** `JWT_SECRET` should be provided through environment variables in production; default secrets should not be used.
4. **Authorization:** API routes already protect most user actions. New routes should always verify ownership (`ownerId`, `borrowerId`) and role where applicable.
5. **Uploads:** File/image handling is demo-oriented. Production mein validation, storage, size limits, and malware scanning zaroor add karein.

---

## 9. Quick troubleshooting / Jaldi troubleshooting

| Problem | Check / Solution |
| --- | --- |
| App opens but APIs fail | Run `npm run dev` inside `backend`, then open port 3000. |
| Data disappeared | Expected with the in-memory store; restarting backend resets data. |
| User is blocked | Admin must review/unblock the user; complaint threshold may have been reached. |
| Chat cannot send | Booking must be `Accepted` or `Completed`; both users must belong to that booking. |
| Owner User ID is missing | Confirm the selected listing has a valid `ownerId` and matching user exists in `db.users`. The UI hides missing values safely. |
| Styling looks stale | Refresh the browser after restarting the Vite-backed backend server; use a hard reload if needed. |

---

## 10. Suggested next improvements / Next improvements

- Replace `DatabaseStore` with a real database and migrations.
- Implement secure password hashing and comparison end-to-end.
- Add automated tests for auth, ownership checks, bookings, and the owner User ID flow.
- Add image upload storage instead of relying only on URLs/data.
- Add pagination and server-side filtering for large numbers of listings.
- Add email/push notifications for booking changes.

**In short / Short mein:** this is a React + Express resource-rental system for CS students. Students can list, search, request, manage, chat, review, report, and administer resources. UI mein shown User IDs always come from existing backend user records: the item owner’s ID in Owner Student Profile and the logged-in user's ID in Student Profile.
