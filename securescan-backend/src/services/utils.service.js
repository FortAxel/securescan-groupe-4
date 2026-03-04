import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Detect project language.
 * @param {string} projectPath
 * @returns {string|null}
 */
export function detectLanguage(projectPath) {
  if (existsSync(join(projectPath, 'package.json'))) return 'JavaScript';
  if (existsSync(join(projectPath, 'requirements.txt'))) return 'Python';
  if (existsSync(join(projectPath, 'composer.json'))) return 'PHP';
  return null;
}