// ─── Database Schema ────────────────────────────────────────────────────────
//
//  CREATE TABLE seats (
//      id SERIAL PRIMARY KEY,
//      name VARCHAR(255),
//      isbooked INT DEFAULT 0
//  );
//  INSERT INTO seats (isbooked)
//  SELECT 0 FROM generate_series(1, 20);
//
//  CREATE TABLE users (
//      id                  SERIAL PRIMARY KEY,
//      name                VARCHAR(255) NOT NULL,
//      email               VARCHAR(255) UNIQUE NOT NULL,
//      password            VARCHAR(255) NOT NULL,
//      reset_token         VARCHAR(255),
//      reset_token_expires TIMESTAMP,
//      created_at          TIMESTAMP DEFAULT NOW()
//  );

import express from "express";
import pg from "pg";
import { dirname } from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { MOVIES } from "./mockData.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const port = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET;

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 20,
  connectionTimeoutMillis: 0,
  idleTimeoutMillis: 0,
});


const app = new express();
app.use(cors());
app.use(express.json());

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Expects: Bearer <token>

  if (!token) {
    return res.status(401).json({ error: "Access denied. Please login first." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (ex) {
    return res.status(403).json({ error: "Invalid or expired token. Please login again." });
  }
};

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/movies", (req, res) => {
  res.json(MOVIES);
});

app.get("/seats", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM seats");
    res.send(result.rows);
  } catch (ex) {
    console.error(ex);
    res.status(500).json({ error: "Failed to fetch seats." });
  }
});

app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required." });
    }
    if (name.trim().length < 2) {
      return res.status(400).json({ error: "Name must be at least 2 characters." });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, created_at",
      [name.trim(), email.toLowerCase(), hashedPassword]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Registration successful!",
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (ex) {
    console.error(ex);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful!",
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (ex) {
    console.error(ex);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

app.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    const result = await pool.query(
      "SELECT id, name FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (result.rowCount === 0) {
      return res.json({
        message: "If an account with that email exists, a reset link has been sent.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // expires in 1 hour

    await pool.query(
      "UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3",
      [resetToken, expiresAt, email.toLowerCase()]
    );

    res.json({
      message: "If an account with that email exists, a reset link has been sent.",
      demo_token: resetToken,
    });
  } catch (ex) {
    console.error(ex);
    res.status(500).json({ error: "Failed to process request. Please try again." });
  }
});

app.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: "Reset token and new password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const result = await pool.query(
      "SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()",
      [token]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: "Reset token is invalid or has expired." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      "UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE reset_token = $2",
      [hashedPassword, token]
    );

    res.json({ message: "Password reset successful! You can now sign in with your new password." });
  } catch (ex) {
    console.error(ex);
    res.status(500).json({ error: "Failed to reset password. Please try again." });
  }
});


app.get("/me", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, created_at FROM users WHERE id = $1",
      [req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found." });
    }
    res.json(result.rows[0]);
  } catch (ex) {
    console.error(ex);
    res.status(500).json({ error: "Failed to fetch profile." });
  }
});

app.get("/my-bookings", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM seats WHERE name = $1 AND isbooked = 1 ORDER BY id",
      [req.user.name]
    );
    res.json(result.rows);
  } catch (ex) {
    console.error(ex);
    res.status(500).json({ error: "Failed to fetch bookings." });
  }
});

app.put("/book/:id", authMiddleware, async (req, res) => {
  const conn = await pool.connect();
  try {
    const id   = req.params.id;
    const name = req.user.name;

    await conn.query("BEGIN");

    const sql = "SELECT * FROM seats WHERE id = $1 AND isbooked = 0 FOR UPDATE";
    const result = await conn.query(sql, [id]);

    if (result.rowCount === 0) {
      await conn.query("ROLLBACK");
      return res.status(409).json({ error: "Seat is already booked." });
    }

    const sqlU = "UPDATE seats SET isbooked = 1, name = $2 WHERE id = $1 RETURNING *";
    const updateResult = await conn.query(sqlU, [id, name]);

    await conn.query("COMMIT");
    res.json({
      message: `Seat ${id} booked successfully!`,
      seat: updateResult.rows[0],
    });
  } catch (ex) {
    await conn.query("ROLLBACK");
    console.error(ex);
    res.status(500).json({ error: "Booking failed. Please try again." });
  } finally {
    conn.release();
  }
});

app.put("/:id/:name", authMiddleware, async (req, res) => {
  const conn = await pool.connect();
  try {
    const id   = req.params.id;
    const name = req.user.name;

    await conn.query("BEGIN");

    const sql = "SELECT * FROM seats WHERE id = $1 AND isbooked = 0 FOR UPDATE";
    const result = await conn.query(sql, [id]);

    if (result.rowCount === 0) {
      await conn.query("ROLLBACK");
      res.send({ error: "Seat already booked" });
      return;
    }

    const sqlU = "UPDATE seats SET isbooked = 1, name = $2 WHERE id = $1";
    const updateResult = await conn.query(sqlU, [id, name]);

    await conn.query("COMMIT");
    res.send(updateResult);
  } catch (ex) {
    await conn.query("ROLLBACK");
    console.error(ex);
    res.send(500);
  } finally {
    conn.release();
  }
});

app.listen(port, () => console.log("Server starting on port: " + port));
