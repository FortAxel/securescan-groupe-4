import {
  findProjectsByUser,
  findFindingsByAnalysis,
} from '../services/db/databaseManager.js';

/**
 * Map backend AnalysisStatus to front status.
 */
function toFrontStatus(status) {
  const s = (status || '').toUpperCase();
  if (s === 'DONE') return 'completed';
  if (s === 'RUNNING' || s === 'PENDING') return 'running';
  return 'failed';
}

/**
 * GET /api/me/scans
 * List all analyses (scans) for the current user, one per analysis with project info and severity summary.
 */
const getScans = async (req, res, next) => {
  try {
    const userId = req.userId;
    const projects = await findProjectsByUser(userId);

    const scans = [];

    for (const project of projects) {
      const analyses = project.analyses || [];
      for (const a of analyses) {
        const findings = await findFindingsByAnalysis(a.id);
        const summary = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
        findings.forEach(f => {
          const sev = (f.severity || '').toLowerCase();
          if (summary.hasOwnProperty(sev)) summary[sev]++;
        });
        const totalVulnerabilities = findings.length;
        const date = a.createdAt || project.createdAt;
        scans.push({
          id: String(a.id),
          projectId: project.id,
          projectName: project.name || `Projet #${project.id}`,
          date: date ? new Date(date).toISOString().slice(0, 10) : '',
          createdAt: date ? new Date(date).toISOString() : null,
          grade: a.grade || 'N/A',
          score: a.score != null ? Number(a.score) : 0,
          critical: summary.critical,
          high: summary.high,
          medium: summary.medium,
          low: summary.low,
          status: toFrontStatus(a.status),
          totalVulnerabilities,
        });
      }
    }

    // Sort by createdAt desc (most recent first)
    scans.sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tB - tA;
    });

    res.json({ scans });
  } catch (err) {
    next(err);
  }
};

export { getScans };
