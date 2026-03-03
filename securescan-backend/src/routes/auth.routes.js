import express                  from 'express';
import { register, login, me }  from '../controllers/auth.controller.js';
import { authMiddleware }       from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Create a new user account
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT token
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   GET /api/auth/me
 * @desc    Return currently authenticated user profile
 * @access  Private
 */
router.get('/me', authMiddleware, me);

export default router;