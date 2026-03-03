import { Router } from 'express';
import { hash, compare } from 'bcrypt';
import { sign } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

const SALT_ROUNDS  = 12;
const JWT_SECRET   = process.env.JWT_SECRET;
const JWT_EXPIRES  = process.env.JWT_EXPIRES_IN || '7d';

// ─── POST /api/auth/register ──────────────────────────────────────────────────

/**
 * @route   POST /api/auth/register
 * @desc    Create a new user account
 * @access  Public
 * @body    { email, username, password }
 */
router.post('/register', async (req, res, next) => {
  try {
    const { email, username, password } = req.body;

    // Basic validation
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'email, username and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check for duplicates
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      return res.status(409).json({
        error: existing.email === email ? 'Email already in use' : 'Username already taken',
      });
    }

    // Hash password
    const hashed = await hash(password, SALT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: { email, username, password: hashed },
      select: { id: true, email: true, username: true, createdAt: true },
    });

    // Generate token
    const token = sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT
 * @access  Public
 * @body    { email, password }
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password
    const match = await compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.json({
      user: { id: user.id, email: user.email, username: user.username },
      token,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

/**
 * @route   GET /api/auth/me
 * @desc    Return current authenticated user
 * @access  Private
 */
import { authMiddleware } from '../middlewares/auth.middleware';

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, username: true, createdAt: true },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;