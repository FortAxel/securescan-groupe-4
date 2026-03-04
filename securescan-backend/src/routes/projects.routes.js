import { Router } from 'express';
import multer from 'multer';
import { createFromGit, createFromZip } from '../controllers/projects.controller.js';

const router = Router();

const upload = multer({
  limits: { fileSize: 50 * 1024 * 1024 }
});

/**
 * Submit Git repository URL
 */
router.post('/', createFromGit);

/**
 * Upload ZIP archive
 */
router.post('/upload', upload.single('file'), createFromZip);

export default router;
