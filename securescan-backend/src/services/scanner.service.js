import { runSemgrep } from './semgrep.service.js';
import { runNpmAudit } from './npmAudit.service.js';
import { runTrufflehog } from './trufflehog.service.js';

/**
 * Computes a security score (0-100) and grade (A→F)
 * based on the severity of all findings.
 *
 * @param {object[]} findings
 * @returns {{ score: number, grade: string }}
 */
function computeScore(findings) {
  if (findings.length === 0) return { score: 100, grade: 'A' };

  const weights = { critical: 20, high: 10, medium: 5, low: 2, info: 0 };
  const penalty = findings.reduce((acc, f) => acc + (weights[f.severity] || 0), 0);

  const score = Math.max(0, 100 - penalty);

  let grade;
  if (score >= 90)      grade = 'A';
  else if (score >= 75) grade = 'B';
  else if (score >= 60) grade = 'C';
  else if (score >= 30) grade = 'D';
  else                  grade = 'F';

  return { score, grade };
}

/**
 * Orchestrates all security tools on a given project path.
 * Runs all 3 tools, aggregates findings, and computes a score.
 * If a tool fails, its error is recorded but the others still run.
 *
 * @param {string} projectPath - Absolute path to the project to scan
 * @returns {{
 *   findings: object[],
 *   score: number,
 *   grade: string,
 *   errors: { tool: string, message: string }[]
 * }}
 */
async function runAllScans(projectPath) {
  console.log(`[Scanner] Starting scans on: ${projectPath}`);

  const results = await Promise.all([
    runSemgrep(projectPath),
    runNpmAudit(projectPath),
    runTrufflehog(projectPath),
  ]);

  const allFindings = [];
  const errors      = [];

  for (const result of results) {
    if (result.error) {
      errors.push({ tool: result.tool, message: result.error });
    }
    if (result.findings && result.findings.length) {
      allFindings.push(...result.findings);
      console.log(`[Scanner] ${result.tool}: ${result.findings.length} finding(s)`);
    }
  }

  const { score, grade } = computeScore(allFindings);

  console.log(`[Scanner] Done. ${allFindings.length} findings total — Score: ${score} (${grade})`);

  return { findings: allFindings, score, grade, errors };
}

export { runAllScans };
