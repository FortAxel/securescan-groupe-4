import { execSync } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';
import { mapNpmAuditOwasp } from './mappings/owasp.mapping.js';

/**
 * npm audit severity → internal severity
 * @param {string} npmSeverity
 * @returns {'critical'|'high'|'medium'|'low'|'info'}
 */
function mapSeverity(npmSeverity) {
  switch (npmSeverity?.toLowerCase()) {
    case 'critical': return 'critical';
    case 'high':     return 'high';
    case 'moderate': return 'medium';
    case 'low':      return 'low';
    default:         return 'info';
  }
}

/**
 * Runs npm audit on the given project path.
 * The project must have a package.json and node_modules (or at least package-lock.json).
 * All dependency vulnerabilities are mapped to OWASP A03 (Software Supply Chain Failures).
 *
 * @param {string} projectPath - Absolute path to the project
 * @returns {{ tool: string, findings: object[], error: string|null }}
 */
function runNpmAudit(projectPath) {
  const packageJsonPath = join(projectPath, 'package.json');
  const hasPnpmLock     = existsSync(join(projectPath, 'pnpm-lock.yaml'));
  const hasNpmLock      = existsSync(join(projectPath, 'package-lock.json'));

  // Skip if not a Node.js project or no lockfile
  if (!existsSync(packageJsonPath) || (!hasNpmLock && !hasPnpmLock)) {
    return { tool: 'NPM_AUDIT', findings: [], error: 'No package.json or lockfile found — skipping audit' };
  }

  const cmd = hasPnpmLock 
  ? 'pnpm audit --json' 
  : 'npm audit --json --omit=dev';

  try {
    let rawOutput;
    try {
      rawOutput = execSync(cmd, {
        cwd: projectPath,
        timeout: 60_000,
        maxBuffer: 10 * 1024 * 1024,
      }).toString();
    } catch (execErr) {
      rawOutput = execErr.stdout?.toString() || execErr.message;
    }

    const parsed = JSON.parse(rawOutput);

    const vulnerabilities = parsed.vulnerabilities || {};
    const findings = [];

    for (const [pkgName, vuln] of Object.entries(vulnerabilities)) {
      const via = Array.isArray(vuln.via) ? vuln.via : [vuln.via];

      for (const advisory of via) {
        if (typeof advisory === 'string') continue;

        findings.push({
          tool:          'NPM_AUDIT',
          severity:      mapSeverity(vuln.severity),
          owaspCategory: mapNpmAuditOwasp(advisory),
          title:         `[${pkgName}] ${advisory.title || 'Vulnerable dependency'}`,
          description:   advisory.url
            ? `${advisory.overview || ''}\nMore info: ${advisory.url}`
            : advisory.overview || null,
          filePath:      'package.json',
          lineStart:     null,
          lineEnd:       null,
          rawOutput:     { pkg: pkgName, ...vuln },
        });
      }
    }

    return { tool: 'NPM_AUDIT', findings, error: null };
  } catch (err) {
    console.error('[npm audit] Error:', err.message);
    return { tool: 'NPM_AUDIT', findings: [], error: err.message };
  }
}

export { runNpmAudit };
