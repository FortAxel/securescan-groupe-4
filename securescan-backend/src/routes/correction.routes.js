import express from 'express';
import {
  getCorrection,
  validateCorrectionHandler,
  rejectCorrectionHandler,
} from '../controllers/correction.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @route   GET /api/corrections/:findingId
 * @desc    Get the suggested correction for a finding
 * @access  Private
 */
router.get('/:findingId', authMiddleware, getCorrection);

/**
 * @route   POST /api/corrections/:findingId/validate
 * @desc    Mark a correction as validated
 * @access  Private
 */
router.post('/:findingId/validate', authMiddleware, validateCorrectionHandler);

/**
 * @route   POST /api/corrections/:findingId/reject
 * @desc    Mark a correction as rejected
 * @access  Private
 */
router.post('/:findingId/reject', authMiddleware, rejectCorrectionHandler);

export default router;