import express from 'express';
import { startScan } from '../controllers/projects.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

/** GET /api/projects — vérification que le router est monté (pour debug) */
router.get('/', (_req, res) => {
  res.json({ ok: true, message: 'POST /api/projects with { sourceUrl } to start a scan' });
});

/**
 * @route   POST /api/projects
 * @desc    Create project, clone Git repo, run security scan, save findings
 * @body    { name?: string, sourceUrl: string }
 * @access  Private
 */
router.post('/', authMiddleware, startScan);

export default router;
