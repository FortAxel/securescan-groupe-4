import { execSync } from 'child_process';
import { mapTrufflehogOwasp } from './mappings/owasp.mapping.js';

const TRUFFLEHOG_BIN = process.env.TRUFFLEHOG_BIN || 'trufflehog';

/**
 * Runs TruffleHog on the given project path (filesystem mode).
 * Uses --json flag for machine-readable output.
 *
 * @param {string} projectPath - Absolute path to the cloned/extracted project
 * @returns {{ tool: string, findings: object[], error: string|null }}
 */
function runTrufflehog(projectPath) {
  try {
    let rawOutput;
    try {
      rawOutput = execSync(
        `${TRUFFLEHOG_BIN} filesystem "${projectPath}" --json --no-update --exclude-paths="node_modules"`,
        { timeout: 120_000, maxBuffer: 10 * 1024 * 1024 }
      ).toString();
    } catch (execErr) {
      rawOutput = execErr.stdout?.toString() || '';
      if (!rawOutput) {
        throw new Error(execErr.message);
      }
    }

    const lines = rawOutput
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    const findings = lines.map((line) => {
      let result;
      try {
        result = JSON.parse(line);
      } catch {
        return null;
      }

      const detectorName = result.DetectorName || result.detectorName || 'Unknown';
      
      const { owaspCategory, severity } = mapTrufflehogOwasp(detectorName);

      const filePath  = result.SourceMetadata?.Data?.Filesystem?.file
        || result.sourceMetadata?.data?.filesystem?.file
        || null;

      const lineStart = result.SourceMetadata?.Data?.Filesystem?.line
        || result.sourceMetadata?.data?.filesystem?.line
        || null;

      return {
        tool:          'TRUFFLEHOG',
        severity,
        owaspCategory,
        title:         `Exposed secret detected: ${detectorName}`,
        description:   result.Raw
          ? `A ${detectorName} secret was found in the source code. Rotate it immediately.`
          : `A ${detectorName} secret was detected.`,
        filePath,
        lineStart,
        lineEnd:       lineStart,
        rawOutput:     result,
      };
    }).filter(Boolean);

    return { tool: 'TRUFFLEHOG', findings, error: null };
  } catch (err) {
    console.error('[TruffleHog] Error:', err.message);
    return { tool: 'TRUFFLEHOG', findings: [], error: err.message };
  }
}

export { runTrufflehog };
