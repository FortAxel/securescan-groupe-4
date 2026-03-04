import { Router } from 'express';
import { redirectToGithub, githubCallback } from '../controllers/githubAuth.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * Redirect user to GitHub OAuth
 */
router.get('/', redirectToGithub);

/**
 * GitHub OAuth callback
 */
router.get('/callback', githubCallback);

// TEST ONLY — Remove before production

import { saveGithubOAuthData } from '../services/db/databaseManager.js';

router.post('/inject', authMiddleware, async (req, res) => {
  await saveGithubOAuthData(req.userId, { 
    githubId: `test_${req.userId}`,  // unique par user
    accessToken: req.body.accessToken 
  });
  res.json({ ok: true });
});

export default router;