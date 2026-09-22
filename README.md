# CS Department Resource Sharing System

Welcome to the CS Department Resource Sharing System.

Yeh project ek smart and simple platform hai jahan CS department ke students apni resources share, rent, borrow, aur manage kar sakte hain. Students can list items like books, devices, lab tools, project kits, and other useful stuff. Borrowers can request bookings, chat with owners, file complaints, and rate each other after the exchange.

Is project ka main goal hai ki students ko ek trusted place mile jahan they can access needed materials easily and safely.

## Main Idea

This platform is built for a college environment where students often need devices or resources for projects, labs, and academic work.

Instead of buying everything separately, students can share and rent items from each other. The system supports:

- Resource listing and search
- Booking requests and approvals
- Real-time chat between borrower and owner
- Complaint management
- Ratings and reviews
- Admin dashboard
- Auto-block for repeated complaints

Simple English: students can upload their items, others can request to borrow them, and the owner can accept or reject the request.

Hinglish version: students items list kar sakte hain, log request bhej sakte hain, owner approve/reject kar sakta hai, aur chat, review, complaint sab manage hota hai.

## Features

### 1. Resource Marketplace
- Students can add items for sharing or rent
- Items include price, condition, location, and images
- Search and filter support by category, condition, and price

### 2. Booking System
- Borrowers can request to rent an item
- Owner can accept or reject the request
- Rental dates and total cost are calculated automatically

### 3. Real-Time Messaging
- Users can chat after booking creation
- Messages are handled using Socket.IO
- Chat is connected to the booking room

### 4. Complaint and Block System
- Students can report issues or misuse
- Admin can review complaints
- Users can be auto-blocked after repeated verified complaints

### 5. Rating and Reviews
- After a transaction, users can rate each other
- Average ratings are displayed publicly

### 6. Admin Panel
- Admin can view stats
- Manage user accounts and complaints
- Monitor platform activity and rental volume

## Tech Stack

- React + Vite for frontend
- TypeScript for app logic
- Express.js for backend APIs
- Socket.IO for real-time chat
- JWT authentication for session management
- bcryptjs for password hashing support
- Tailwind CSS for styling
- In-memory database for demo/local use

## Project Structure

```bash
.
├── src/                 # Frontend React app
│   ├── components/      # UI pages and reusable components
│   ├── lib/             # API client and auth helpers
│   ├── App.tsx          # Main app router / page state
│   ├── types.ts         # Type definitions
│   └── main.tsx         # App entry point
├── server/              # Backend API and database logic
│   ├── api.ts           # All API routes
│   └── db.ts            # In-memory data storage and seeded entries
├── server.ts            # Main server setup with Express + Vite + Socket.IO
├── public/              # Static files (if any)
├── assets/              # Project assets
├── .env.example         # Sample environment variables
├── package.json         # Scripts and dependencies
├── index.html           # Root HTML file
├── vite.config.ts       # Vite config
├── tsconfig.json        # TypeScript config
├── README.md            # Project documentation
└── ...
```

## How to Run the Project

### 1. Install dependencies

```bash
npm install
```

### 2. Setup environment variables

Create a `.env` file or copy `.env.example`:

```bash
cp .env.example .env
```

Update values as needed, especially:

- `JWT_SECRET`
- `GEMINI_API_KEY` (if required by any AI feature)
- `APP_URL`

### 3. Start the app

```bash
npm run dev
```

Then open:

```bash
http://localhost:3000
```

### 4. Production build

```bash
npm run build
npm run start
```

## Authentication and Demo Accounts

This project supports student registration and login.

Important rules:
- Registration requires a valid college CS email in this format:
  `0801CSYYRRRR@gmail.com`
- Example: `0801CS231160@gmail.com`
- Demo accounts can be used for testing

Sample demo users:

- Admin: `0801AD000001@gmail.com`
- Student: `alex.chen@cs.edu`
- Student: `priya.sharma@cs.edu`
- Student: `marcus.vance@cs.edu`
- Student: `david.m@cs.edu`

Password is usually any value for demo login in this local setup, but you should still enter a password while testing.

## Notes

- This app uses an in-memory database, so data resets when the server restarts.
- It is designed for local development and demonstration purposes.
- Real production deployment would need stronger database, auth, and security improvements.
- The project is focused on student peer-to-peer resource sharing inside a CS department.

## Why This Project is Useful

This project helps solve a real problem:

Students often need expensive or rare educational resources, but they do not want to buy everything individually. With this app, they can:

- borrow what they need
- lend what they have
- manage bookings easily
- communicate with other students
- keep track of complaints and trust

In short: library + marketplace + communication platform for college students.

## Future Improvements

- Add MongoDB or PostgreSQL for persistent storage
- Add email verification
- Add file upload for real item images
- Add admin moderation and user blocking tools
- Add notifications and reminders
- Add payment or deposit handling
- Improve UI and mobile responsiveness

## Summary

This project is a student resource-sharing platform with booking, chat, complaints, ratings, and admin support.

Basic English: simple, useful, and student-friendly.
Hinglish: easy to use, helpful, aur campus life ke liye perfect.

If you want, you can also extend this project with a real database, payment module, or full authentication flow.