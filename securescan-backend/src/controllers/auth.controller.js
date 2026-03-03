import bcryptPkg from 'bcrypt';
const bcrypt = bcryptPkg;

import jwtPkg from 'jsonwebtoken';
const jwt = jwtPkg;
import {
  findUserByEmailOrUsername,
  findUserByEmail,
  findUserById,
  createUser,
} from '../services/db/databaseManager.js';

const SALT_ROUNDS = 12;
const JWT_SECRET  = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

// ─── Register ─────────────────────────────────────────────────────────────────

/**
 * Register a new user account.
 *
 * @route   POST /api/auth/register
 * @access  Public
 *
 * @param {import('express').Request}  req  - Express request object
 * @param {import('express').Response} res  - Express response object
 * @param {import('express').NextFunction} next - Express next middleware
 *
 * @body {{ email: string, username: string, password: string }}
 *
 * @returns {201} { user: { id, email, username, createdAt }, token: string }
 * @returns {400} Missing fields or password too short
 * @returns {409} Email or username already in use
 */
const register = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'email, username and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await findUserByEmailOrUsername(email, username);
    if (existing) {
      return res.status(409).json({
        error: existing.email === email ? 'Email already in use' : 'Username already taken',
      });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user   = await createUser({ email, username, password: hashed });
    const token  = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * Authenticate a user and return a JWT token.
 *
 * @route   POST /api/auth/login
 * @access  Public
 *
 * @param {import('express').Request}  req  - Express request object
 * @param {import('express').Response} res  - Express response object
 * @param {import('express').NextFunction} next - Express next middleware
 *
 * @body {{ email: string, password: string }}
 *
 * @returns {200} { user: { id, email, username }, token: string }
 * @returns {400} Missing fields
 * @returns {401} Invalid credentials
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.json({
      user:  { id: user.id, email: user.email, username: user.username },
      token,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Me ───────────────────────────────────────────────────────────────────────

/**
 * Return the currently authenticated user's profile.
 *
 * @route   GET /api/auth/me
 * @access  Private (requires JWT via authMiddleware)
 *
 * @param {import('express').Request}  req  - Express request object (req.userId injected by authMiddleware)
 * @param {import('express').Response} res  - Express response object
 * @param {import('express').NextFunction} next - Express next middleware
 *
 * @returns {200} { user: { id, email, username, createdAt } }
 * @returns {401} No token or invalid token
 */
const me = async (req, res, next) => {
  try {
    const user = await findUserById(req.userId);
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

export { register, login, me };