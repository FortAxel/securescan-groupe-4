import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { runAllScans } from './../src/services/scanner.service.js';

const projectPath = path.resolve('/home/axfortunato/searchProject/hyperSearchX/hypersearchx-backend');

console.log('🔍 Starting scan on:', projectPath);

const result = await runAllScans(projectPath);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 SCORE :', result.score, '|', result.grade);
console.log('📋 TOTAL FINDINGS :', result.findings.length);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Par outil
const byTool = result.findings.reduce((acc, f) => {
  acc[f.tool] = (acc[f.tool] || 0) + 1;
  return acc;
}, {});
console.log('🛠  By tool:', byTool);

// Par OWASP
const byOwasp = result.findings.reduce((acc, f) => {
  if (f.owaspCategory) acc[f.owaspCategory] = (acc[f.owaspCategory] || 0) + 1;
  return acc;
}, {});
console.log('🔐 By OWASP:', byOwasp);

// Par sévérité
const bySeverity = result.findings.reduce((acc, f) => {
  acc[f.severity] = (acc[f.severity] || 0) + 1;
  return acc;
}, {});
console.log('⚠️  By severity:', bySeverity);

// Erreurs
if (result.errors.length > 0) {
  console.log('\n❌ ERRORS:');
  result.errors.forEach(e => console.log(`  [${e.tool}] ${e.message}`));
}

// Détail par outil
for (const tool of ['SEMGREP', 'NPM_AUDIT', 'TRUFFLEHOG']) {
  const findings = result.findings.filter(f => f.tool === tool);
  if (findings.length === 0) continue;

  console.log(`\n${'━'.repeat(40)}`);
  console.log(`🔎 ${tool} — ${findings.length} findings`);
  console.log('━'.repeat(40));

  findings.forEach((f, i) => {
    console.log(`\n[${i + 1}] ${f.severity.toUpperCase()} | ${f.owaspCategory || 'N/A'}`);
    console.log(`    📄 ${f.filePath || 'N/A'}${f.lineStart ? `:${f.lineStart}` : ''}`);
    console.log(`    📌 ${f.title}`);
    if (f.description) console.log(`    💬 ${f.description.slice(0, 120)}...`);
  });
}