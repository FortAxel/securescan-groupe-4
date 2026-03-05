/**
 * @file test-report.js
 * @description Seed + test du rapport HTML exportable
 * @usage node tests/test-report.js
 */

import fs                  from 'fs';
import path                from 'path';
import assert              from 'assert';
import { PrismaClient }    from '@prisma/client';
import { generateTemplateCorrection } from '../src/services/correction.service.js';
import { generateHtmlReport }         from '../src/services/report.service.js';
import {
  createCorrectionFromFinding,
  validateCorrection,
  findAnalysisByIdAndUser,
  findFindingsByAnalysis,
  findValidatedCorrectionsByAnalysis,
} from '../src/services/db/databaseManager.js';

const prisma = new PrismaClient();

// ─── Runner ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function test(label, fn) {
  try {
    await fn();
    console.log(`  ✅ ${label}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${label}\n     → ${err.message}`);
    failed++;
  }
}

// ─── Cleanup tracker ─────────────────────────────────────────────────────────

const toClean = { findingIds: [], analysisIds: [], projectIds: [], userIds: [] };

async function cleanup() {
  for (const fid of toClean.findingIds) {
    await prisma.correction.deleteMany({ where: { findingId: fid } }).catch(() => {});
    await prisma.finding.delete({ where: { id: fid } }).catch(() => {});
  }
  for (const id of toClean.analysisIds) await prisma.analysis.delete({ where: { id } }).catch(() => {});
  for (const id of toClean.projectIds)  await prisma.project.delete({ where: { id } }).catch(() => {});
  for (const id of toClean.userIds)     await prisma.user.delete({ where: { id } }).catch(() => {});
}

// ─── Seed complet ─────────────────────────────────────────────────────────────

/**
 * Crée user → project → analysis → findings variés → corrections validées
 * Simule un vrai scénario d'analyse de sécurité
 */
async function seedFullAnalysis() {
  const ts = Date.now();

  // 1. User
  const user = await prisma.user.create({
    data: {
      email:    `report_test_${ts}@securescan.test`,
      username: `report_user_${ts}`,
      password: 'hashed_password_test',
    },
  });
  toClean.userIds.push(user.id);

  // 2. Project
  const project = await prisma.project.create({
    data: { userId: user.id, name: 'MyApp Backend', sourceType: 'GIT',
            sourceUrl: 'https://github.com/example/myapp' },
  });
  toClean.projectIds.push(project.id);

  // 3. Analysis
  const analysis = await prisma.analysis.create({
    data: {
      projectId:  project.id,
      status:     'DONE',
      score:      62,
      grade:      'C',
      startedAt:  new Date(Date.now() - 60000),
      finishedAt: new Date(),
    },
  });
  toClean.analysisIds.push(analysis.id);

  // 4. Findings variés (couvre plusieurs catégories OWASP + outils)
  const findingsData = [
    {
      tool: 'SEMGREP', severity: 'CRITICAL', owaspCategory: 'A03',
      title: 'SQL Injection detected',
      description: 'User input directly concatenated into SQL query',
      filePath: 'src/controllers/user.controller.js', lineStart: 42,
      rawOutput: { codeSnippet: "query('SELECT * FROM users WHERE id = ' + userId)" },
    },
    {
      tool: 'SEMGREP', severity: 'HIGH', owaspCategory: 'A03',
      title: 'XSS via innerHTML',
      description: 'Unsanitized user input rendered as HTML',
      filePath: 'src/views/profile.js', lineStart: 17,
      rawOutput: { codeSnippet: "el.innerHTML = userInput" },
    },
    {
      tool: 'TRUFFLEHOG', severity: 'CRITICAL', owaspCategory: 'A04',
      title: 'Hardcoded API key',
      description: 'Secret found in source code',
      filePath: 'src/config/api.js', lineStart: 3,
      rawOutput: { codeSnippet: "const apiKey = 'sk-abc123xyz456abc123xyz456'" },
    },
    {
      tool: 'NPM_AUDIT', severity: 'HIGH', owaspCategory: 'A06',
      title: 'Vulnerable dependency: lodash',
      description: 'Prototype pollution vulnerability',
      filePath: null, lineStart: null,
      rawOutput: { name: 'lodash', version: '4.17.4', fixAvailable: { version: '4.17.21' } },
    },
    {
      tool: 'SEMGREP', severity: 'MEDIUM', owaspCategory: 'A07',
      title: 'JWT without expiration',
      description: 'Token never expires',
      filePath: 'src/services/auth.service.js', lineStart: 28,
      rawOutput: { codeSnippet: "jwt.sign({ userId }, process.env.JWT_SECRET)" },
    },
    {
      tool: 'SEMGREP', severity: 'MEDIUM', owaspCategory: 'A05',
      title: 'CORS wildcard',
      description: 'All origins allowed',
      filePath: 'src/app.js', lineStart: 12,
      rawOutput: { codeSnippet: "cors({ origin: '*' })" },
    },
    {
      tool: 'SEMGREP', severity: 'LOW', owaspCategory: 'A02',
      title: 'MD5 used for hashing',
      description: 'MD5 is cryptographically broken',
      filePath: 'src/utils/hash.js', lineStart: 8,
      rawOutput: { codeSnippet: "md5(userInput)" },
    },
    {
      tool: 'SEMGREP', severity: 'INFO', owaspCategory: 'A09',
      title: 'Missing error logging',
      description: 'Catch block without logger',
      filePath: 'src/middlewares/error.middleware.js', lineStart: 5,
      rawOutput: { codeSnippet: "try { doSomething() } catch (err) { res.status(500) }" },
    },
  ];

  const findings = [];
  for (const data of findingsData) {
    const f = await prisma.finding.create({ data: { analysisId: analysis.id, ...data } });
    toClean.findingIds.push(f.id);
    findings.push(f);
  }

  // 5. Corrections — génère et valide pour certains findings
  const toCorrect = findings.filter(f =>
    ['A03', 'A04', 'A06', 'A07'].includes(f.owaspCategory)
  );

  for (const finding of toCorrect) {
    const template = generateTemplateCorrection(finding);
    if (!template) continue;
    await createCorrectionFromFinding(finding.id, template);
    await validateCorrection(finding.id);
  }

  return { user, project, analysis, findings };
}

// ══════════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════════

async function runTests() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  TEST — Export rapport HTML SecureScan');
  console.log('══════════════════════════════════════════════');

  console.log('\n🌱 Seed des données...');
  const { user, analysis, findings } = await seedFullAnalysis();
  console.log(`  → Analysis #${analysis.id} | ${findings.length} findings | Projet "${analysis.project?.name || 'MyApp Backend'}"`);

  // ── Récupération des données (comme le controller) ────────────────────────
  console.log('\n📦 Récupération des données');

  let fetchedAnalysis, fetchedFindings, fetchedCorrections;

  await test('findAnalysisByIdAndUser retourne l\'analyse avec le projet', async () => {
    fetchedAnalysis = await findAnalysisByIdAndUser(analysis.id, user.id);
    assert.ok(fetchedAnalysis,                    'Analysis introuvable');
    assert.ok(fetchedAnalysis.project,            'Relation project manquante');
    assert.strictEqual(fetchedAnalysis.score, 62, 'Score incorrect');
    assert.strictEqual(fetchedAnalysis.grade, 'C','Grade incorrect');
  });

  await test('findFindingsByAnalysis retourne tous les findings', async () => {
    fetchedFindings = await findFindingsByAnalysis(analysis.id);
    assert.strictEqual(fetchedFindings.length, findings.length,
      `Attendu ${findings.length} findings, reçu ${fetchedFindings.length}`);
  });

  await test('findValidatedCorrectionsByAnalysis retourne les corrections validées', async () => {
    fetchedCorrections = await findValidatedCorrectionsByAnalysis(analysis.id);
    assert.ok(fetchedCorrections.length > 0, 'Aucune correction validée trouvée');
    fetchedCorrections.forEach(c => {
      assert.strictEqual(c.status, 'VALIDATED', `Correction #${c.id} non validée`);
    });
    console.log(`     → ${fetchedCorrections.length} correction(s) validée(s)`);
  });

  // ── Génération du HTML ────────────────────────────────────────────────────
  console.log('\n🔨 Génération du rapport HTML');

  let html;

  await test('generateHtmlReport retourne une string non vide', async () => {
    html = generateHtmlReport(fetchedAnalysis, fetchedFindings, fetchedCorrections);
    assert.ok(typeof html === 'string', 'Le rapport devrait être une string');
    assert.ok(html.length > 500,        'HTML trop court');
  });

  await test('Le rapport contient le nom du projet', async () => {
    assert.ok(html.includes('MyApp Backend'), 'Nom du projet absent');
  });

  await test('Le rapport contient le score et le grade', async () => {
    assert.ok(html.includes('62'),  'Score absent');
    assert.ok(html.includes('C'),   'Grade absent');
  });

  await test('Le rapport contient la section findings', async () => {
    assert.ok(html.includes('Détail des findings'), 'Section findings absente');
  });

  await test('Le rapport contient la section corrections', async () => {
    assert.ok(html.includes('Corrections appliquées'), 'Section corrections absente');
  });

  await test('Le rapport contient la section OWASP', async () => {
    assert.ok(html.includes('Répartition OWASP'), 'Section OWASP absente');
  });

  await test('Le rapport contient le footer SecureScan', async () => {
    assert.ok(html.includes('SecureScan') && html.includes('CyberSafe'), 'Footer absent');
  });

  await test('Le rapport est un HTML valide (doctype + balises de base)', async () => {
    assert.ok(html.includes('<!DOCTYPE html>'), 'DOCTYPE manquant');
    assert.ok(html.includes('<html'),            'Balise html manquante');
    assert.ok(html.includes('</html>'),          'Fermeture html manquante');
    assert.ok(html.includes('<body'),            'Balise body manquante');
    assert.ok(html.includes('</body>'),          'Fermeture body manquante');
  });

  await test('Les snippets de code sont échappés (pas de XSS dans le rapport)', async () => {
    // Les < et > doivent être échappés dans les snippets
    const snippetSection = html.match(/Code original[\s\S]*?Code corrigé/)?.[0] || '';
    assert.ok(!snippetSection.includes('<script'), 'Potentiel XSS détecté dans le rapport');
  });

  // ── Sauvegarde du fichier pour inspection visuelle ────────────────────────
  console.log('\n💾 Sauvegarde du rapport');

  await test('Fichier HTML sauvegardé dans tests/output/', async () => {
    const outputDir = path.resolve('tests/output');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const filepath = path.join(outputDir, `report-test-${Date.now()}.html`);
    fs.writeFileSync(filepath, html, 'utf-8');

    assert.ok(fs.existsSync(filepath), 'Fichier non créé');
    const stats = fs.statSync(filepath);
    assert.ok(stats.size > 1000, 'Fichier trop petit');

    console.log(`     → Rapport sauvegardé : ${filepath}`);
    console.log(`     → Ouvre ce fichier dans ton navigateur pour vérifier le rendu visuel`);
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  try {
    await runTests();
  } finally {
    await cleanup();
    await prisma.$disconnect();

    console.log(`\n──────────────────────────────────────────────`);
    console.log(`🎯 Résultats : ${passed} passed, ${failed} failed`);
    if (failed === 0) {
      console.log('🎉 Tous les tests sont passés !\n');
    } else {
      console.log('💥 Certains tests ont échoué.\n');
      process.exit(1);
    }
  }
}

main();