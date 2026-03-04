import { existsSync, rmSync, mkdirSync, createReadStream } from 'fs';
import { join } from 'path';
import { Extract } from 'unzipper';
import { getGithubAuthByUserId } from "../services/db/databaseManager.js";
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
        message: "GitHub account not connected",
      });
    }
    await updateProjectStatus(projectId, 'CLONING');

    await cloneRepository(
      project.sourceUrl,
      project.localPath,
      githubAuth.githubAccessToken
    );

    const language = detectLanguage(projectPath);

    const project = await createProject({
      userId: req.user.id,
      name,
      sourceType: 'GIT',
      sourceUrl: url,
      localPath: projectPath,
      language,
      status: 'PENDING'
    });

    runAllScans(projectPath);

    return res.json({
      projectId: project.id,
      language,
      status: project.status
    });

  } catch (err) {
    cleanup(projectPath);
    return res.status(500).json({ error: 'Git clone failed', details: err.message });
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

    const project = await createProject({
      userId: req.user.id,
      name: req.body.name,
      sourceType: 'ZIP',
      localPath: projectPath,
      language,
      status: 'PENDING'
    });

    launchScan(project.id, projectPath);

    return res.json({
      projectId: project.id,
      language,
      status: project.status
    });

  } catch (err) {
    cleanup(projectPath);
    return res.status(500).json({ error: 'ZIP processing failed', details: err.message });
  }
}
