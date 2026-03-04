import { Router } from 'express';
import { redirectToGithub, githubCallback } from '../controllers/githubAuth.controller.js';

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