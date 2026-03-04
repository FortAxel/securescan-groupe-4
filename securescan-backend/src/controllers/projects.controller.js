import { existsSync, rmSync, mkdirSync, createReadStream } from 'fs';
import { join } from 'path';
import { Extract } from 'unzipper';
import { getGithubAuthByUserId, updateProject, createProject } from "../services/db/databaseManager.js";
import { cloneRepository } from "../services/git.service.js";
import { runAllScans } from "../services/scanner.service.js";
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
 * Handle Git project submission.
 */
export async function createFromGit(req, res) {
  const { url, name } = req.body;

  if (!url) return res.status(400).json({ error: 'Repository URL required' });

  const projectPath = join(TMP_BASE, Date.now().toString());

  try {
    mkdirSync(projectPath, { recursive: true });

    const githubAuth = await getGithubAuthByUserId(req.user.id);

    if (!githubAuth?.githubAccessToken) {
      return res.status(401).json({
        error: 'GitHub account not connected',
        redirectTo: '/githubAuth/'
      });
    }

    const language = detectLanguage(projectPath);

    let project = await findProjectByUrlAndUser(url, req.user.id);

    if (!project) {
      project = await createProject(req.user.id, {
        name,
        sourceType: 'GIT',
        sourceUrl: url,
        localPath: projectPath,
        language,
        status: 'PENDING'
      });
    }

    await updateProject(project.id, { status: 'CLONING' });

    await cloneRepository(url, projectPath, githubAuth.githubAccessToken);

    const detectedLanguage = detectLanguage(projectPath);
    await updateProject(project.id, { language: detectedLanguage, status: 'SCANNING' });

    const analysis = await createAnalysis(project.id);

    const scanResult = runAllScans(projectPath);

    await updateAnalysis(analysis.id, {
      status: 'DONE',
      score: scanResult.score,
      grade: scanResult.grade,
    });
    
    await updateProject(project.id, { status: 'DONE' });

    return res.json({
      projectId: project.id,
      analysisId: analysis.id,
      language: detectedLanguage,
      status: 'DONE',
      score: scanResult.score,
      grade: scanResult.grade,
    });

  } catch (err) {
    if (analysis?.id) {
      await updateAnalysis(analysis.id, { status: 'ERROR', errorMessage: err.message });
    }
    cleanup(projectPath);
    return res.status(500).json({ error: '...', details: err.message });
  }
}

/**
 * Handle ZIP upload submission.
 */
export async function createFromZip(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'ZIP file required' });
  }

  const projectPath = join(TMP_BASE, Date.now().toString());

  try {
    mkdirSync(projectPath, { recursive: true });

    await createReadStream(req.file.path)
      .pipe(Extract({ path: projectPath }))
      .promise();

    const language = detectLanguage(projectPath);

    const project = await createProject(req.user.id, {
      name: req.body.name,
      sourceType: 'ZIP',
      localPath: projectPath,
      language,
      status: 'SCANNING'
    });

    const analysis = await createAnalysis(project.id);

    const scanResult = runAllScans(projectPath);

    await updateAnalysis(analysis.id, {
      status: 'DONE',
      score: scanResult.score,
      grade: scanResult.grade,
    });

    await updateProject(project.id, { status: 'DONE' });

    return res.json({
      projectId: project.id,
      analysisId: analysis.id,
      language,
      status: 'DONE',
      score: scanResult.score,
      grade: scanResult.grade,
    });

  } catch (err) {
    if (analysis?.id) {
      await updateAnalysis(analysis.id, { status: 'ERROR', errorMessage: err.message });
    }
    cleanup(projectPath);
    return res.status(500).json({ error: '...', details: err.message });
  }
}
