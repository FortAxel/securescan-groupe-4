import { existsSync, rmSync, mkdirSync, createReadStream } from 'fs';
import { join } from 'path';
import { Extract } from 'unzipper';
import {
  getGithubAuthByUserId,
  createProject,
  updateProject,
  findProjectByUrlAndUser,
  createAnalysis,
  updateAnalysis,
  createFinding,
  createCorrectionFromFinding,
} from "../services/db/databaseManager.js";
import { cloneRepository } from "../services/git.service.js";
import { runAllScans } from "../services/scanner.service.js";
import { generateTemplateCorrection } from '../services/correction.service.js';
import { detectLanguage } from '../services/utils.service.js';

const TMP_BASE = '/tmp/securescan';

/**
 * Clean temporary folder.
 * @param {string} folder
 */
function cleanup(folder) {
  if (existsSync(folder)) {
    rmSync(folder, { recursive: true, force: true });
  }
}

/**
 * Persist findings one by one and generate a correction for each.
 * We insert individually (not createMany) to get the id back from Prisma.
 * @param {number} analysisId
 * @param {object[]} findings - Raw findings from scanner
 * @returns {Promise<void>}
 */
async function saveFindingsAndCorrections(analysisId, findings) {
  for (const finding of findings) {
    if (finding.filePath?.includes('/.git/')) continue;

    const savedFinding = await createFinding({
      ...finding,
      analysisId,
      severity: finding.severity.toUpperCase(),
      tool: finding.tool.toUpperCase(),
      owaspCategory: finding.owaspCategory?.toUpperCase() ?? null,
    });

    const template = generateTemplateCorrection(savedFinding);
    if (!template) continue;

    await createCorrectionFromFinding(savedFinding.id, template);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// GIT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Handle Git project submission.
 * POST /api/projects/
 */
export async function createFromGit(req, res) {
  const { url, name } = req.body;
  if (!url) return res.status(400).json({ error: 'Repository URL required' });

  const projectPath = join(TMP_BASE, Date.now().toString());
  let analysis = null;

  try {
    mkdirSync(projectPath, { recursive: true });

    const githubAuth = await getGithubAuthByUserId(req.userId);
    if (!githubAuth?.githubAccessToken) {
      return res.status(401).json({
        error: 'GitHub account not connected',
        redirectTo: '/githubAuth/',
      });
    }

    let project = await findProjectByUrlAndUser(url, req.userId);
    if (!project) {
      project = await createProject(req.userId, {
        name,
        sourceType: 'GIT',
        sourceUrl: url,
        localPath: projectPath,
        status: 'PENDING',
      });
    }

    await updateProject(project.id, { status: 'CLONING', localPath: projectPath });
    await cloneRepository(url, projectPath, githubAuth.githubAccessToken);

    const language = detectLanguage(projectPath);
    await updateProject(project.id, { language, status: 'ANALYZING' });

    analysis = await createAnalysis(project.id);
    const scanResult = await runAllScans(projectPath);

    await saveFindingsAndCorrections(analysis.id, scanResult.findings);

    await updateAnalysis(analysis.id, {
      status: 'DONE',
      score: scanResult.score,
      grade: scanResult.grade,
      finishedAt: new Date(),
    });
    await updateProject(project.id, { status: 'DONE' });

    return res.status(201).json({
      projectId: project.id,
      analysisId: analysis.id,
      language,
      score: scanResult.score,
      grade: scanResult.grade,
    });

  } catch (err) {
    if (analysis?.id) {
      await updateAnalysis(analysis.id, { status: 'ERROR', errorMessage: err.message }).catch(() => {});
    }
    cleanup(projectPath);
    return res.status(500).json({ error: 'Git scan failed', details: err.message });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ZIP
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Handle ZIP upload submission.
 * POST /api/projects/upload
 */
export async function createFromZip(req, res) {
  if (!req.file) return res.status(400).json({ error: 'ZIP file required' });

  const projectPath = join(TMP_BASE, Date.now().toString());
  let analysis = null;

  try {
    mkdirSync(projectPath, { recursive: true });

    await createReadStream(req.file.path)
      .pipe(Extract({ path: projectPath }))
      .promise();

    const language = detectLanguage(projectPath);

    const project = await createProject(req.userId, {
      name: req.body.name,
      sourceType: 'ZIP',
      localPath: projectPath,
      language,
      status: 'ANALYZING',
    });

    analysis = await createAnalysis(project.id);
    const scanResult = await runAllScans(projectPath);

    await saveFindingsAndCorrections(analysis.id, scanResult.findings);

    await updateAnalysis(analysis.id, {
      status: 'DONE',
      score: scanResult.score,
      grade: scanResult.grade,
      finishedAt: new Date(),
    });
    await updateProject(project.id, { status: 'DONE' });

    return res.status(201).json({
      projectId: project.id,
      analysisId: analysis.id,
      language,
      score: scanResult.score,
      grade: scanResult.grade,
    });

  } catch (err) {
    if (analysis?.id) {
      await updateAnalysis(analysis.id, { status: 'ERROR', errorMessage: err.message }).catch(() => {});
    }
    cleanup(projectPath);
    return res.status(500).json({ error: 'ZIP scan failed', details: err.message });
  }
}
