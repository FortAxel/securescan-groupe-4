import express, { json, urlencoded } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

import 'dotenv/config';

import authRoutes from './routes/auth.routes.js';
import meRoutes from './routes/me.routes.js';
import projectRoutes from './routes/projects.routes.js';
import analysisRoutes from './routes/analysis.routes.js';
import correctionRoutes from './routes/correction.routes.js';
import projectRoutes from './routes/projects.routes.js';
import analysisRoutes from './routes/analysis.routes.js';
import githubAuthRoutes from './routes/githubAuth.routes.js';

const app = express();

// ─── Middlewares ──────────────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(json({ limit: '50mb' }));
app.use(urlencoded({ extended: true, limit: '50mb' }));

// Ensure temp dirs exist
const uploadDir = process.env.UPLOAD_DIR || join(__dirname, 'tmp/uploads');
const repoDir   = process.env.REPO_DIR   || join(__dirname, 'tmp/repos');
[uploadDir, repoDir].forEach(dir => {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth',        authRoutes);
app.use('/api/me',          meRoutes);
app.use('/api/projects',    projectRoutes);
app.use('/api/analysis',    analysisRoutes);
app.use('/api/corrections', correctionRoutes);
app.use('/api/githubAuth',  githubAuthRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global error handler ─────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`🚀 SecureScan API running on http://localhost:${port}`);
});

// Requêtes de scan (clone + analyse) peuvent prendre 1 à 5 min
server.timeout = Number(process.env.SERVER_TIMEOUT_MS) || 5 * 60 * 1000;

export default app;