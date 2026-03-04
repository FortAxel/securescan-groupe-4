import express from 'express';
import { getScans } from '../controllers/me.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @route   GET /api/me/scans
 * @desc    List all analyses (scans) for the current user
 * @access  Private
 */
router.get('/scans', authMiddleware, getScans);

export default router;
