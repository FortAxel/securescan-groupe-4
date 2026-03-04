import { Router } from 'express';
import multer from 'multer';
import { createFromGit, createFromZip } from '../controllers/projects.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

const upload = multer({
  limits: { fileSize: 50 * 1024 * 1024 }
});

/**
 * Submit Git repository URL
 */
router.post('/', authMiddleware, createFromGit);

/**
 * Upload ZIP archive
 */
router.post('/upload', authMiddleware, upload.single('file'), createFromZip);

export default router;
