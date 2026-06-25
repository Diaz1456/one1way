# One Way — Gamified Admin & Player Dashboard

A full-stack web application featuring a dramatic vortex login animation, real-time leaderboards, team-based notifications, a global countdown timer, daily tasks, achievements, coins, and more.

## Tech Stack

- **Frontend**: React (Vite) + Tailwind CSS + Framer Motion + Zustand + Socket.IO Client
- **Backend**: Node.js + Express + Socket.IO + JWT + Multer
- **Database**: MongoDB (Mongoose ODM)
- **Real-time**: Socket.IO (WebSockets)

## Prerequisites

- Node.js 18+
- MongoDB 6+ (local or Atlas)
- npm 9+

## Setup

### 1. Clone and install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment variables

Edit `backend/.env`:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/oneway
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
UPLOAD_DIR=uploads
```

### 3. Seed the database

```bash
cd backend
npm run seed
```

This creates:
- Admin account (default: `admin` / `admin123`)
- 3 teams (Alpha Squad, Bravo Crew, Delta Force)
- 5 sample player accounts (player1–player5, password: `password123`)
- A sample daily task
- Initial countdown record

### 4. Start the application

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

- Backend runs on `http://localhost:5000`
- Frontend runs on `http://localhost:3000`

### 5. Login

| Role   | Username  | Password     |
|--------|-----------|--------------|
| Admin  | admin     | admin123     |
| Player | player1   | password123  |
| Player | player2   | password123  |

## Deploy to Render

### Backend

1. Push the repository to GitHub
2. In the [Render Dashboard](https://dashboard.render.com), click **New + > Web Service**
3. Connect your GitHub repo
4. Set:
   - **Name**: `oneway-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run seed && npm start`
5. Add environment variables:
   - `MONGODB_URI` — your MongoDB Atlas connection string
   - `JWT_SECRET` — a random secret string
   - `JWT_REFRESH_SECRET` — another random string
   - `ADMIN_USERNAME` — `admin`
   - `ADMIN_PASSWORD` — your chosen admin password
   - `UPLOAD_DIR` — `uploads`
6. Create a **MongoDB Atlas** cluster (free tier works) and get the connection string
7. Deploy!

### Frontend

1. In Render Dashboard, click **New + > Static Site**
2. Connect your GitHub repo
3. Set:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Set environment variable:
   - `VITE_API_URL` — your backend URL (e.g., `https://oneway-backend.onrender.com`)
5. Deploy!
6. Update `vite.config.js` to remove the proxy and use `VITE_API_URL` instead if needed, or just set the API base URL in production.

Alternatively, for a single-service deploy, modify the backend to also serve the frontend's `dist` folder as static files in production.

## Project Structure

```
oneway/
├── backend/
│   ├── server.js              # Express + Socket.IO entry point
│   ├── db.js                  # MongoDB/Mongoose connection
│   ├── seed.js                # Seed script
│   ├── socket.js              # Socket.IO event manager
│   ├── models/
│   │   ├── index.js           # Model exports
│   │   ├── User.js
│   │   ├── Team.js
│   │   ├── Achievement.js
│   │   ├── Coin.js
│   │   ├── DailyTask.js
│   │   ├── DailyTaskCompletion.js
│   │   ├── Note.js
│   │   ├── Feedback.js
│   │   ├── PresenceLog.js
│   │   ├── GlobalCountdown.js
│   │   └── StockEvent.js
│   ├── middleware/
│   │   └── auth.js            # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js            # Login, register, token refresh
│   │   ├── users.js           # Player CRUD, leaderboard, details
│   │   ├── achievements.js    # Achievement CRUD + team overtake logic
│   │   ├── coins.js           # Bonus coin management
│   │   ├── tasks.js           # Daily tasks + completion tracking
│   │   ├── feedback.js        # Player feedback submission
│   │   ├── teams.js           # Team CRUD + member assignment
│   │   └── admin.js           # Countdown, presence, events
│   └── uploads/               # Avatar upload directory
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── main.jsx           # React entry point
        ├── App.jsx            # Router + auth provider
        ├── api.js             # Axios instance with JWT interceptor
        ├── store.js           # Zustand global state
        ├── socket.js          # Socket.IO client
        ├── sound.js           # Web Audio API sound effects
        ├── index.css          # Tailwind + global styles
        ├── components/
        │   ├── CountdownTimer.jsx
        │   ├── PresenceBar.jsx
        │   ├── StockTicker.jsx
        │   ├── AchievementPopUp.jsx
        │   ├── TeamOvertake.jsx
        │   ├── FeedbackBar.jsx
        │   ├── NightModeToggle.jsx
        │   └── SoundToggle.jsx
        └── pages/
            ├── Login.jsx              # Vortex login animation
            ├── AdminDashboard.jsx     # Admin layout + sidebar
            ├── PlayerDashboard.jsx    # Player layout + tabs
            ├── admin/
            │   ├── Accounts.jsx
            │   ├── Leaderboard.jsx
            │   ├── Achievements.jsx
            │   ├── History.jsx
            │   ├── Feedback.jsx
            │   ├── Teams.jsx
            │   └── Countdown.jsx
            └── player/
                ├── Profile.jsx
                ├── PlayerAchievements.jsx
                ├── DailyTask.jsx
                ├── TeamView.jsx
                ├── FeedbackForm.jsx
                └── Settings.jsx
```

## Features

### Authentication
- JWT-based login with access + refresh tokens
- Two roles: `admin` and `player`
- Admin can create/remove player accounts

### Admin Dashboard
- **Account Management**: Create, edit, delete players; change passwords; upload avatars
- **Leaderboard**: Global ranking with player detail modal (achievements, notes, coins)
- **Achievements**: Add/edit/delete achievements per player; category breakdown
- **History**: Daily task completion log filterable by player and date range
- **Feedback**: Real-time feedback from players with dismiss
- **Teams**: Create teams, assign members (multi-select), delete teams
- **Countdown**: Start/stop/reset global countdown timer broadcast to all users
- **Presence Bar**: Real-time online/offline indicators

### Player Dashboard
- **Profile**: Avatar, rank, total score, coins, Top 5 Champions
- **Achievements**: Category breakdown with progress bars
- **Daily Task**: Checkbox with points/coins rewards
- **Team**: View team name, color, and members
- **Feedback**: Send messages to admin
- **Settings**: Change password and display name

### Real-time Features
- Live digital clock
- Global countdown timer (blinking when < 10s, "TIME'S UP!" flash)
- Stock-market-style achievement surge pop-ups
- Team overtake full-screen notifications
- Scrolling event ticker bar
- Online presence indicators
- Live feedback delivery to admin

### UI/UX
- Responsive design (desktop-first, tablet-friendly)
- Dark/night mode toggle (persisted in localStorage)
- Custom vortex/tunnel login animation (Framer Motion)
- Sound effects (whoosh, click, coin up, bell, alarm, swoosh) via Web Audio API
- Smooth page transitions with Framer Motion AnimatePresence

## API Endpoints

| Method | Endpoint                     | Auth   | Description                  |
|--------|------------------------------|--------|------------------------------|
| POST   | /api/auth/login              | Public | Login                        |
| POST   | /api/auth/register           | Admin  | Create player account        |
| POST   | /api/auth/refresh            | Public | Refresh JWT token            |
| GET    | /api/users                   | All    | List users                   |
| GET    | /api/users/leaderboard       | All    | Global leaderboard           |
| GET    | /api/users/champions         | All    | Top 5 players                |
| GET    | /api/users/:id/details       | All    | User details + achievements  |
| PUT    | /api/users/:id               | All    | Update user                  |
| DELETE | /api/users/:id               | Admin  | Delete user                  |
| PUT    | /api/users/:id/avatar        | Admin  | Upload avatar                |
| PUT    | /api/users/:id/notes         | Admin  | Edit private notes           |
| GET    | /api/users/:id/achievements  | All    | User achievements            |
| GET    | /api/users/:id/coins         | All    | User coins                   |
| GET    | /api/achievements            | All    | List achievements            |
| POST   | /api/achievements            | Admin  | Create achievement           |
| PUT    | /api/achievements/:id        | Admin  | Update achievement           |
| DELETE | /api/achievements/:id        | Admin  | Delete achievement           |
| POST   | /api/coins                   | Admin  | Set bonus coins              |
| GET    | /api/tasks/current           | All    | Get active daily task        |
| POST   | /api/tasks                   | Admin  | Create daily task            |
| POST   | /api/tasks/complete          | Player | Toggle task completion       |
| GET    | /api/tasks/history           | Admin  | Task completion log          |
| GET    | /api/feedback                | Admin  | List feedback                |
| POST   | /api/feedback                | Player | Submit feedback              |
| DELETE | /api/feedback/:id            | Admin  | Delete feedback              |
| GET    | /api/teams                   | All    | List teams                   |
| POST   | /api/teams                   | Admin  | Create team                  |
| PUT    | /api/teams/:id               | Admin  | Update team                  |
| DELETE | /api/teams/:id               | Admin  | Delete team                  |
| PUT    | /api/teams/:id/members       | Admin  | Assign team members          |
| POST   | /api/admin/countdown         | Admin  | Start/stop/reset countdown   |
| GET    | /api/admin/countdown         | Admin  | Get countdown state          |
| GET    | /api/admin/presence          | Admin  | Online users + recent logs   |
| GET    | /api/admin/events            | Admin  | Recent stock events          |
