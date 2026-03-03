import express                           from 'express';
import { getResults, getOwaspBreakdown } from '../controllers/analysis.controller.js';
import { authMiddleware }                from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @route   GET /api/analysis/:analysisId/results
 * @desc    Get full analysis results with findings, score, grade and summary
 * @access  Private
 * @queryparam {string} [severity] - Filter by severity (critical|high|medium|low|info)
 * @queryparam {string} [owasp]    - Filter by OWASP category (A01..A10)
 * @queryparam {string} [tool]     - Filter by tool (semgrep|npm_audit|trufflehog)
 */
router.get('/:analysisId/results', authMiddleware, getResults);

/**
 * @route   GET /api/analysis/:analysisId/results/owasp
 * @desc    Get findings grouped by OWASP category for dashboard charts
 * @access  Private
 */
router.get('/:analysisId/results/owasp', authMiddleware, getOwaspBreakdown);

export default router;