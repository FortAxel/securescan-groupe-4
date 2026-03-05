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


export default router;