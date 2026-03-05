import {
  findAnalysisByIdAndUser,
  findFindingsByAnalysis,
  findValidatedCorrectionsByAnalysis,
} from '../services/db/databaseManager.js';
import { generateHtmlReport } from '../services/report.service.js';
import puppeteer from 'puppeteer';

// ─── Get results ──────────────────────────────────────────────────────────────

/**
 * Get full analysis results with findings, score, grade and severity summary.
 * Supports optional query filters.
 *
 * @route   GET /api/analysis/:analysisId/results
 * @access  Private (requires JWT via authMiddleware)
 *
 * @param {import('express').Request}  req  - Express request (req.userId injected by authMiddleware)
 * @param {import('express').Response} res  - Express response
 * @param {import('express').NextFunction} next
 *
 * @queryparam {string} [severity]  - Filter by severity (critical|high|medium|low|info)
 * @queryparam {string} [owasp]     - Filter by OWASP category (A01..A10)
 * @queryparam {string} [tool]      - Filter by tool (semgrep|npm_audit|trufflehog)
 *
 * @returns {200} { projectId, projectName, analysisId, status, score, grade, startedAt, finishedAt, summary, findings[] }
 * @returns {404} Analysis not found or does not belong to user
 */
const getResults = async (req, res, next) => {
  try {
    const { analysisId } = req.params;
    const { severity, owasp, tool } = req.query;

    const analysis = await findAnalysisByIdAndUser(Number(analysisId), req.userId);
    if (!analysis) return res.status(404).json({ error: 'Analysis not found' });

    const findings = await findFindingsByAnalysis(analysis.id, {
      severity,
      owaspCategory: owasp,
      tool,
    });

    const summary = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach(f => { summary[f.severity.toLowerCase()]++; });

    const formattedFindings = findings.map(f => ({
      id:          f.id,
      file:        f.filePath    || null,
      line:        f.lineStart   || null,
      description: f.description || f.title,
      severity:    f.severity.toLowerCase(),
      owasp:       f.owaspCategory || null,
      tool:        f.tool.toLowerCase(),
    }));

    res.json({
      projectId:   analysis.project.id,
      projectName: analysis.project.name,
      analysisId:  analysis.id,
      status:      analysis.status,
      score:       analysis.score,
      grade:       analysis.grade,
      startedAt:   analysis.startedAt,
      finishedAt:  analysis.finishedAt,
      summary,
      findings:    formattedFindings,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get OWASP breakdown ──────────────────────────────────────────────────────

/**
 * Get findings grouped by OWASP category, useful for dashboard charts.
 *
 * @route   GET /api/analysis/:analysisId/results/owasp
 * @access  Private (requires JWT via authMiddleware)
 *
 * @param {import('express').Request}  req  - Express request (req.userId injected by authMiddleware)
 * @param {import('express').Response} res  - Express response
 * @param {import('express').NextFunction} next
 *
 * @returns {200} { analysisId, byOwasp: { [category]: { critical, high, medium, low, info, total } } }
 * @returns {404} Analysis not found or does not belong to user
 */
const getOwaspBreakdown = async (req, res, next) => {
  try {
    const { analysisId } = req.params;

    const analysis = await findAnalysisByIdAndUser(Number(analysisId), req.userId);
    if (!analysis) return res.status(404).json({ error: 'Analysis not found' });

    const findings = await findFindingsByAnalysis(analysis.id);

    const byOwasp = findings.reduce((acc, f) => {
      const cat = f.owaspCategory || 'UNKNOWN';
      if (!acc[cat]) acc[cat] = { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0 };
      acc[cat][f.severity.toLowerCase()]++;
      acc[cat].total++;
      return acc;
    }, {});

    res.json({ analysisId: analysis.id, byOwasp });
  } catch (err) {
    next(err);
  }
};

// ─── Export HTML report ───────────────────────────────────────────────────────

/**
 * Generate and download an HTML security report for a given analysis.
 *
 * @route   GET /api/analysis/:analysisId/report
 * @access  Private (requires JWT via authMiddleware)
 *
 * @param {import('express').Request}      req  - req.userId injected by authMiddleware
 * @param {import('express').Response}     res
 * @param {import('express').NextFunction} next
 *
 * @returns {200} HTML file download (Content-Disposition: attachment)
 * @returns {404} Analysis not found or does not belong to user
 */
const exportReport = async (req, res, next) => {
  try {
    const { analysisId } = req.params;

    const analysis = await findAnalysisByIdAndUser(Number(analysisId), req.userId);
    if (!analysis) return res.status(404).json({ error: 'Analysis not found' });

    const findings = await findFindingsByAnalysis(analysis.id);
    const corrections = await findValidatedCorrectionsByAnalysis(analysis.id);

    const html = generateHtmlReport(analysis, findings, corrections);

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    const filename = `securescan-report-${analysis.project.name.replace(/\s+/g, '-').toLowerCase()}-${analysisId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdf);
  } catch (err) {
    next(err);
  }
};

export { getResults, getOwaspBreakdown, exportReport };
