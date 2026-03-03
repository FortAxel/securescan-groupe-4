import { execSync } from 'child_process';
import { mapSemgrepOwasp } from './mappings/owasp.mapping.js';

const SEMGREP_BIN = process.env.SEMGREP_BIN || 'semgrep';

/**
 * Maps a Semgrep severity string to our internal severity levels
 * @param {string} semgrepSeverity
 * @returns {'critical'|'high'|'medium'|'low'|'info'}
 */
function mapSeverity(semgrepSeverity) {
  switch (semgrepSeverity?.toUpperCase()) {
    case 'ERROR':   return 'high';
    case 'WARNING': return 'medium';
    case 'INFO':    return 'low';
    default:        return 'info';
  }
}

/**
 * Runs Semgrep on the given project path using the auto ruleset.
 * Returns a normalized list of findings.
 *
 * @param {string} projectPath - Absolute path to the cloned/extracted project
 * @returns {{ tool: string, findings: object[], error: string|null }}
 */
function runSemgrep(projectPath) {
  try {
    const output = execSync(
      `${SEMGREP_BIN} --config auto --json --quiet --exclude node_modules "${projectPath}"`,
      { timeout: 120_000, maxBuffer: 10 * 1024 * 1024 }
    ).toString();

    const parsed = JSON.parse(output);
    const results = parsed.results || [];

    const findings = results.map((r) => ({
      tool:          'SEMGREP',
      severity:      mapSeverity(r.extra?.severity),
      owaspCategory: mapSemgrepOwasp(r),
      title:         r.check_id || 'Semgrep finding',
      description:   r.extra?.message || null,
      filePath:      r.path || null,
      lineStart:     r.start?.line || null,
      lineEnd:       r.end?.line   || null,
      rawOutput:     r,
    }));

    return { tool: 'SEMGREP', findings, error: null };
  } catch (err) {
    console.error('[Semgrep] Error:', err.message);
    return { tool: 'SEMGREP', findings: [], error: err.message };
  }
}

export { runSemgrep };
