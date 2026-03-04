import { execSync } from 'child_process';
import { join } from 'path';
import { existsSync, mkdirSync, rmSync } from 'fs';
import {
  createProject,
  createAnalysis,
  updateAnalysis,
  updateProject,
  createFindings,
  findProjectByIdAndUser,
  findFindingsByAnalysis,
} from '../services/db/databaseManager.js';
import { runAllScans } from '../services/scanner.service.js';

const repoDir = process.env.REPO_DIR || join(process.cwd(), 'tmp', 'repos');

const OWASP_VALUES = ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10'];

function toPrismaSeverity(sev) {
  const s = (sev || 'info').toUpperCase();
  return ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].includes(s) ? s : 'INFO';
}

function toPrismaOwasp(val) {
  if (!val) return null;
  const v = String(val).toUpperCase().replace(/^A(\d)$/, 'A0$1');
  return OWASP_VALUES.includes(v) ? v : null;
}

/**
 * POST /api/projects
 * Body: { name?: string, sourceUrl: string } (sourceUrl = Git clone URL)
 * Creates project + analysis, clones repo, runs scanner, saves findings.
 * Returns { projectId, analysisId } for front to navigate to /scan then dashboard.
 */
const startScan = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { name, sourceUrl, url } = req.body;
    const rawUrl = sourceUrl ?? url;
    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
      return res.status(400).json({ error: 'sourceUrl or url is required (Git clone URL)' });
    }

    const gitUrl = rawUrl.trim();
    if (!/^https?:\/\/|^git@/i.test(gitUrl)) {
      return res.status(400).json({ error: 'Invalid Git URL' });
    }

    const projectName = (name && String(name).trim()) || `Scan ${new Date().toISOString().slice(0, 10)}`;

    const project = await createProject(userId, {
      name: projectName,
      sourceType: 'GIT',
      sourceUrl: gitUrl,
      status: 'CLONING',
    });

    const analysis = await createAnalysis(project.id);
    await updateAnalysis(analysis.id, { status: 'RUNNING', startedAt: new Date() });

    if (!existsSync(repoDir)) mkdirSync(repoDir, { recursive: true });
    const projectPath = join(repoDir, `project-${project.id}`);

    try {
      if (existsSync(projectPath)) {
        rmSync(projectPath, { recursive: true, force: true });
      }
      console.log(`[Projects] Cloning ${gitUrl} into ${projectPath}...`);
      execSync(`git clone --depth 1 "${gitUrl}" "${projectPath}"`, {
        timeout: 120_000,
        stdio: 'pipe',
      });
      console.log(`[Projects] Clone OK. Starting Semgrep + npm audit + TruffleHog...`);
    } catch (cloneErr) {
      await updateAnalysis(analysis.id, { status: 'ERROR', errorMessage: cloneErr.message });
      return res.status(422).json({
        error: 'Clone failed',
        detail: cloneErr.message,
        projectId: project.id,
        analysisId: analysis.id,
      });
    }

    let scanResult;
    try {
      scanResult = await runAllScans(projectPath);
      console.log(`[Projects] Scan OK. Saving ${scanResult.findings?.length ?? 0} findings...`);
    } catch (scanErr) {
      await updateAnalysis(analysis.id, { status: 'ERROR', errorMessage: scanErr.message });
      return res.status(500).json({
        error: 'Scan failed',
        detail: scanErr.message,
        projectId: project.id,
        analysisId: analysis.id,
      });
    }

    const { findings: rawFindings, score, grade } = scanResult;

    const findingsForDb = rawFindings.map((f) => ({
      analysisId: analysis.id,
      tool: (f.tool || 'SEMGREP').toUpperCase(),
      severity: toPrismaSeverity(f.severity),
      owaspCategory: toPrismaOwasp(f.owaspCategory),
      title: (f.title || 'Finding').slice(0, 255),
      description: f.description || null,
      filePath: f.filePath || f.file || null,
      lineStart: f.lineStart ?? f.line ?? null,
      lineEnd: f.lineEnd ?? null,
      rawOutput: f.rawOutput || null,
      fixStatus: 'PENDING',
    }));

    if (findingsForDb.length > 0) {
      await createFindings(findingsForDb);
    }

    await updateAnalysis(analysis.id, {
      status: 'DONE',
      score: score ?? 0,
      grade: grade ?? 'N/A',
      finishedAt: new Date(),
    });
    await updateProject(project.id, { status: 'DONE' });

    console.log(`[Projects] Done. projectId=${project.id} analysisId=${analysis.id} findings=${findingsForDb.length}`);
    res.status(201).json({
      projectId: project.id,
      analysisId: analysis.id,
      projectName: project.name,
      status: 'DONE',
      score: score ?? 0,
      grade: grade ?? 'N/A',
      findingsCount: findingsForDb.length,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/projects/:projectId/findings
 * Returns findings of the latest analysis for the project (same shape as front getProjectFindings).
 */
const getProjectFindings = async (req, res, next) => {
  try {
    const projectId = Number(req.params.projectId);
    const project = await findProjectByIdAndUser(projectId, req.userId);
    if (!project || !project.analyses?.length) {
      return res.status(404).json({ error: 'Project or analysis not found' });
    }
    const latestAnalysis = project.analyses[0];
    const findings = await findFindingsByAnalysis(latestAnalysis.id);
    const summary = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach(f => {
      const s = (f.severity || '').toLowerCase();
      if (summary.hasOwnProperty(s)) summary[s]++;
    });
    const total = findings.length;
    res.json({
      grade: latestAnalysis.grade ?? 'N/A',
      score: latestAnalysis.score ?? 0,
      critical: summary.critical,
      high: summary.high,
      medium: summary.medium,
      low: summary.low,
      totalVulnerabilities: total,
      findings: findings.map(f => ({
        id: f.id,
        tool: f.tool,
        severity: (f.severity || 'LOW').toLowerCase(),
        owaspCategory: f.owaspCategory,
        title: f.title || f.description || 'Finding',
        description: f.description,
        filePath: f.filePath,
        lineStart: f.lineStart,
        lineEnd: f.lineEnd,
      })),
    });
  } catch (err) {
    next(err);
  }
};

export { startScan, getProjectFindings };
