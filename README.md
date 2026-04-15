# Book My Ticket

A full-stack movie seat booking project for the ChaiCode cohort. The app serves a frontend from `index.html` and exposes an Express API backed by PostgreSQL for auth and seat bookings.

## Features

- User registration and login with JWT authentication
- Password reset flow with OTP over email (SMTP via Nodemailer)
- Movie list and seat map per movie
- Concurrency-safe seat booking using DB transactions and row locks
- "My bookings" endpoint for authenticated users
- Dockerized app + PostgreSQL setup

## Tech Stack

- Node.js + Express
- PostgreSQL (`pg`)
- JWT (`jsonwebtoken`)
- Password hashing (`bcryptjs`)
- Email (`nodemailer`)
- Vanilla HTML/CSS/JS frontend
- Docker + Docker Compose

## Project Structure

```text
book-my-ticket/
├── index.mjs            # Express server + API routes + DB access
├── index.html           # Frontend UI (served at /)
├── mockData.js          # Static movies data
├── package.json         # Node dependencies and scripts
├── init.sql             # DB schema + seed data (used by Docker Postgres init)
├── Dockerfile           # App container definition
├── docker-compose.yaml  # App + Postgres local orchestration
├── .dockerignore
├── .gitignore
└── README.md
```

## Prerequisites

For local (without Docker):

- Node.js 20+ (Node 22 recommended)
- PostgreSQL 14+ (16 recommended)

For Docker setup:

- Docker Desktop

## Environment Variables

Create a `.env` file in the project root:

```env
PORT=8080
JWT_SECRET=replace-with-a-strong-secret
REFRESH_TOKEN_SECRET=replace-with-a-strong-refresh-secret
PASSWORD_RESET_SECRET=replace-with-a-strong-password-reset-secret
JWT_ACCESS_EXPIRES_IN=15m

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=bookmyticket

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password-or-app-password
SMTP_FROM=your-email@example.com
```

If you run through Docker Compose, use:

- `DB_HOST=postgres` (service name in compose)

## Run Locally (Node + Existing PostgreSQL)

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create database tables and seed seats using `init.sql`.
   - You can run the SQL script directly in PostgreSQL client tools.

3. Start the server:

   ```bash
   npm start
   ```

4. Open:

   - App: `http://localhost:8080`
   - Movies API: `http://localhost:8080/movies`

## Run with Docker Compose

1. Create `.env` with the required values (`DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `PASSWORD_RESET_SECRET`, `JWT_ACCESS_EXPIRES_IN`, SMTP values).
2. Start services:

   ```bash
   docker compose up --build
   ```

3. Open:

   - App: `http://localhost:8080`

`init.sql` is mounted into Postgres init directory and will create/seed tables on first DB initialization.

## API Overview

### Public

- `GET /` - Serve frontend
- `GET /movies` - List available movies
- `GET /seats?movieId=<id>` - Seats for a movie
- `POST /register` - Register user
- `POST /login` - Login user
- `POST /forgot-password` - Send OTP
- `POST /reset-password` - Reset password using OTP token

### Auth Required (Bearer token)

- `GET /me` - Current user profile
- `GET /my-bookings` - Seats booked by current user
- `PUT /book/:id` - Book a specific seat ID

## Authentication

Include JWT token in request headers:

```http
Authorization: Bearer <token>
```

## Notes

- `init.sql` is currently in `.gitignore`, but if already tracked by Git, remove it from tracking first:

  ```bash
  git rm --cached init.sql
  ```

- There are two booking update routes in `index.mjs`; prefer using `PUT /book/:id` for consistent JSON responses and clearer semantics.

## Scripts

- `npm start` - Run server using `.env` file via Node's `--env-file`

## License

ISC
