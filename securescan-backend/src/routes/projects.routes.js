import { Router } from 'express';
import multer from 'multer';
import { mkdirSync } from 'fs';
import { createFromGit, createFromZip } from '../controllers/projects.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
const router = Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = process.env.UPLOAD_DIR || './tmp/uploads';
      mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 1000 * 1024 * 1024 },
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
