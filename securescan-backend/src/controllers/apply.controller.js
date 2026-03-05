import { existsSync, rmSync } from 'fs';
import archiver from 'archiver';
import {
  findAnalysisByIdAndUser,
  findValidatedCorrectionsByAnalysis,
  updateAnalysis,
  createFixBranch,
  updateFixBranch,
  getGithubAuthByUserId,
} from '../services/db/databaseManager.js';
import {
  applyCorrections,
  createRemoteBranch,
  createLocalBranch,
  commitChanges,
  pushBranch,
  createPullRequest,
  getDefaultBranch
} from '../services/git.service.js';

/**
 * Cleanup a local folder.
 * @param {string} folder
 */
function cleanup(folder) {
  if (existsSync(folder)) {
    rmSync(folder, { recursive: true, force: true });
  }
}

/**
 * Extract { owner, repo } from a GitHub URL.
 * @param {string} url
 * @returns {{ owner: string, repo: string }}
 */
function parseGithubUrl(url) {
  const [owner, repo] = url
    .replace('https://github.com/', '')
    .replace('.git', '')
    .split('/');
  return { owner, repo };
}

/**
 * Map DB corrections to the format expected by applyCorrections().
 * @param {object[]} corrections
 * @returns {object[]}
 */
function mapCorrections(corrections, localPath) {
  return corrections
    .filter((c) => c.finding.filePath && !c.finding.filePath.includes('/.git/'))
    .map((c) => ({
      filePath: c.finding.filePath.replace(localPath + '/', ''),
      oldCode: c.originalSnippet,
      newCode: c.fixedSnippet,
      lineStart: c.finding.lineStart,
      lineEnd: c.finding.lineEnd,
    }));
}
// ══════════════════════════════════════════════════════════════════════════════
// POST /api/analysis/:analysisId/apply
// Detects GIT or ZIP from the project and handles accordingly.
// GIT  → push branch + open PR  → returns { pullRequestUrl }
// ZIP  → streams corrected ZIP  → attachment download
// ══════════════════════════════════════════════════════════════════════════════

export async function applyCorrectionsHandler(req, res) {
  const analysisId = parseInt(req.params.analysisId);
  let fixBranch = null;

  try {
    const analysis = await findAnalysisByIdAndUser(analysisId, req.userId);
    if (!analysis) return res.status(404).json({ error: 'Analysis not found' });

    const { project } = analysis;

    if (!existsSync(project.localPath)) {
      return res.status(410).json({
        error: 'Project files no longer available, please re-scan.',
      });
    }

    const corrections = await findValidatedCorrectionsByAnalysis(analysisId);
    if (!corrections.length) {
      return res.status(400).json({ error: 'No validated corrections to apply' });
    }

    const mapped = mapCorrections(corrections, project.localPath);

    // ── GIT ────────────────────────────────────────────────────────────────

    if (project.sourceType === 'GIT') {
        const githubAuth = await getGithubAuthByUserId(req.userId);
        if (!githubAuth?.githubAccessToken) {
            return res.status(401).json({
                error: 'GitHub account not connected',
                redirectTo: '/githubAuth/',
            });
        }

        const { owner, repo } = parseGithubUrl(project.sourceUrl);
        const baseBranch = await getDefaultBranch(owner, repo, githubAuth.githubAccessToken);

        const branchName = await createRemoteBranch(owner, repo, baseBranch, githubAuth.githubAccessToken);
        await createLocalBranch(project.localPath, branchName);
        fixBranch = await createFixBranch(analysisId, branchName);

        await applyCorrections(mapped, project.localPath);
        await commitChanges(project.localPath, 'fix: SecureScan automated security corrections');
        await pushBranch(project.localPath, branchName);
        const prUrl = await createPullRequest(owner, repo, branchName, baseBranch, githubAuth.githubAccessToken);

        await updateFixBranch(fixBranch.id, { pushStatus: 'PUSHED' });
        await updateAnalysis(analysisId, { status: 'DONE' });
        cleanup(project.localPath);

        return res.json({
            pullRequestUrl: prUrl,
            branchName,
            correctionsApplied: corrections.length,
        });
    }

    // ── ZIP ────────────────────────────────────────────────────────────────

    if (project.sourceType === 'ZIP') {
      await applyCorrections(mapped, project.localPath);
      await updateAnalysis(analysisId, { status: 'DONE' });

      const zipName = `securescan-corrected-${analysisId}.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', (err) => { throw err; });
      archive.pipe(res);
      archive.directory(project.localPath, false);
      await archive.finalize();

      res.on('finish', () => cleanup(project.localPath));
      return;
    }

    // ── Unknown sourceType ─────────────────────────────────────────────────

    return res.status(400).json({ error: `Unsupported source type: ${project.sourceType}` });

  } catch (err) {
    if (fixBranch?.id) {
      await updateFixBranch(fixBranch.id, { pushStatus: 'ERROR' }).catch(() => {});
    }
    return res.status(500).json({ error: 'Failed to apply corrections', details: err.message });
  }
}