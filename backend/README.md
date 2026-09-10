# CS Resource Sharing — Backend (JavaScript, converted from TypeScript)

## Structure
```
backend-final/
├── server.js          # Entry point — starts Express + Socket.IO + Vite middleware
├── server/
│   ├── api.js         # All API routes (auth, items, bookings, chat, complaints, ratings, admin)
│   └── db.js          # In-memory database with seed data
├── package.json
└── .env.example
```

## IMPORTANT — Placement
`server.js` uses Vite in **middleware mode** to serve your React frontend on the
same port as the API (port 3000). This means `server.js` and the `server/` folder
must sit in the **same root folder as your frontend project** — i.e., alongside
your existing `src/`, `index.html`, and `vite.config.ts/js`.

Copy `server.js` and the `server/` folder into your frontend project root
(the one with `index.html`, `src/`, `vite.config.ts`), then merge the
dependencies below into your existing `package.json` instead of using this one
standalone.

## Install & Run
```bash
npm install express cors jsonwebtoken bcryptjs socket.io vite
node server.js
```

Then open: http://localhost:3000

- `/api/*` → backend routes
- everything else → your React frontend (served via Vite dev middleware)

## Notes / things to know
- No MongoDB connection — uses in-memory `db.js` (data resets on server restart).
- Passwords are NOT currently hashed or checked (register/login only validate
  presence, not correctness) — this was already the case in the original
  TypeScript code. Say the word if you want real bcrypt-based password auth
  wired in.
- Default seeded accounts (login with just the email, any password):
  - Admin: `0801AD000001@gmail.com`
  - Student: `alex.chen@cs.edu`, `priya.sharma@cs.edu`, `marcus.vance@cs.edu`,
    `david.m@cs.edu` (this one has 4 complaints — one more auto-blocks him)
- Student registration requires college email format: `0801CSYYRRRR@gmail.com`
