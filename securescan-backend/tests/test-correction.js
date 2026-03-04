/**
 * @file test-correction.js
 * @description Unit + Integration tests — Correction system (SecureScan)
 * @usage node tests/test-correction.js
 */

import assert from "assert";
import { PrismaClient } from "@prisma/client";

import { generateTemplateCorrection } from "../src/services/correction.service.js";
import {
  createCorrectionFromFinding,
  getCorrectionByFinding,
  validateCorrection,
  rejectCorrection,
} from "../src/services/db/databaseManager.js";

const prisma = new PrismaClient();

// ─── Runner ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(label, fn) {
  try {
    fn();
    console.log(`  ✅ ${label}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${label}\n     → ${err.message}`);
    failed++;
  }
}

async function testAsync(label, fn) {
  try {
    await fn();
    console.log(`  ✅ ${label}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${label}\n     → ${err.message}`);
    failed++;
  }
}

// ─── Seed / Cleanup ───────────────────────────────────────────────────────────

const toClean = { findingIds: [], analysisIds: [], projectIds: [], userIds: [] };

async function seedFinding(owaspCategory = "A05", codeSnippet = "query(userId)", tool = "SEMGREP") {
  const ts = Date.now();

  const user = await prisma.user.create({
    data: {
      email:    `test_${ts}@securescan.test`,
      username: `testuser_${ts}`,
      password: "hashed_password_test",
    },
  });
  toClean.userIds.push(user.id);

  const project = await prisma.project.create({
    data: { userId: user.id, name: "Test Project", sourceType: "ZIP" },
  });
  toClean.projectIds.push(project.id);

  const analysis = await prisma.analysis.create({
    data: { projectId: project.id, status: "PENDING" },
  });
  toClean.analysisIds.push(analysis.id);

  const finding = await prisma.finding.create({
    data: {
      analysisId:    analysis.id,
      tool,
      severity:      "HIGH",
      owaspCategory: owaspCategory,
      title:         `Test finding ${owaspCategory}`,
      description:   `Correction test pour ${owaspCategory}`,
      rawOutput:     { codeSnippet },
    },
  });
  toClean.findingIds.push(finding.id);
  return finding;
}

async function cleanup() {
  for (const fid of toClean.findingIds) {
    await prisma.correction.deleteMany({ where: { findingId: fid } }).catch(() => {});
    await prisma.finding.delete({ where: { id: fid } }).catch(() => {});
  }
  for (const id of toClean.analysisIds) await prisma.analysis.delete({ where: { id } }).catch(() => {});
  for (const id of toClean.projectIds)  await prisma.project.delete({ where: { id } }).catch(() => {});
  for (const id of toClean.userIds)     await prisma.user.delete({ where: { id } }).catch(() => {});
}

// ─── Assertion helper ─────────────────────────────────────────────────────────

function assertCorrection(result, expectedType) {
  assert.ok(result,                               "résultat null");
  assert.strictEqual(result.type, expectedType,   `type attendu ${expectedType}, reçu ${result.type}`);
  assert.ok(result.originalSnippet !== undefined, "originalSnippet manquant");
  assert.ok(result.fixedSnippet    !== undefined, "fixedSnippet manquant");
  assert.ok(result.explanation,                   "explanation manquante");
}

// ══════════════════════════════════════════════════════════════════════════════
// UNIT TESTS — generateTemplateCorrection
// ══════════════════════════════════════════════════════════════════════════════

console.log("\n══════════════════════════════════════════════");
console.log("  UNIT TESTS — generateTemplateCorrection");
console.log("══════════════════════════════════════════════");

// ── A01 ───────────────────────────────────────────────────────────────────────
console.log("\n📋 A01 — Broken Access Control");

test("Retourne une correction non null", () => {
  const f = { owaspCategory: "A01", tool: "SEMGREP", filePath: "routes/admin.js",
               rawOutput: { codeSnippet: "router.get('/admin', handler)" } };
  assert.ok(generateTemplateCorrection(f) !== null);
});
test("fixedSnippet ajoute une vérification de rôle (JS)", () => {
  const f = { owaspCategory: "A01", tool: "SEMGREP", filePath: "admin.js",
               rawOutput: { codeSnippet: "doAdminAction()" } };
  const r = generateTemplateCorrection(f);
  assert.ok(r.fixedSnippet.includes("req.user") || r.fixedSnippet.includes("role"),
    `fixedSnippet reçu : ${r.fixedSnippet}`);
});

// ── A02 ───────────────────────────────────────────────────────────────────────
console.log("\n📋 A02 — Cryptographic Failures");

test("Mot de passe en clair (JS) → bcrypt", () => {
  const f = { owaspCategory: "A02", tool: "SEMGREP", filePath: "auth.js",
               rawOutput: { codeSnippet: "password = 'monMotDePasse'" } };
  const r = generateTemplateCorrection(f);
  assert.ok(r.fixedSnippet.includes("bcrypt"), `fixedSnippet reçu : ${r.fixedSnippet}`);
});
test("MD5 → sha256", () => {
  const f = { owaspCategory: "A02", tool: "SEMGREP", filePath: "hash.js",
               rawOutput: { codeSnippet: "md5(userInput)" } };
  const r = generateTemplateCorrection(f);
  assert.ok(r.fixedSnippet.includes("sha256"), `fixedSnippet reçu : ${r.fixedSnippet}`);
});
test("HTTP → HTTPS", () => {
  const f = { owaspCategory: "A02", tool: "SEMGREP", filePath: "api.js",
               rawOutput: { codeSnippet: "fetch('http://api.example.com/data')" } };
  const r = generateTemplateCorrection(f);
  assert.ok(r.fixedSnippet.includes("https://"), `fixedSnippet reçu : ${r.fixedSnippet}`);
});

// ── A03 ───────────────────────────────────────────────────────────────────────
console.log("\n📋 A03 — Injection");

test("innerHTML → textContent (XSS JS)", () => {
  const f = { owaspCategory: "A03", tool: "SEMGREP", filePath: "ui.js",
               rawOutput: { codeSnippet: "el.innerHTML = userInput" } };
  const r = generateTemplateCorrection(f);
  assertCorrection(r, "XSS");
  assert.ok(r.fixedSnippet.includes("textContent"), `fixedSnippet reçu : ${r.fixedSnippet}`);
});
test("echo $_GET → htmlspecialchars (PHP)", () => {
  const f = { owaspCategory: "A03", tool: "SEMGREP", filePath: "page.php",
               rawOutput: { codeSnippet: "echo $_GET['name']" } };
  const r = generateTemplateCorrection(f);
  assertCorrection(r, "XSS");
  assert.ok(r.fixedSnippet.includes("htmlspecialchars"), `fixedSnippet reçu : ${r.fixedSnippet}`);
});
test("Concaténation SQL → requête paramétrée (JS)", () => {
  const f = { owaspCategory: "A03", tool: "SEMGREP", filePath: "db.js",
               rawOutput: { codeSnippet: "query('SELECT * FROM users WHERE id = ' + userId)" } };
  const r = generateTemplateCorrection(f);
  assertCorrection(r, "SQL_INJECTION");
  assert.ok(r.fixedSnippet.includes("?") || r.fixedSnippet.includes("[userId]"),
    `fixedSnippet reçu : ${r.fixedSnippet}`);
});

// ── A04 ───────────────────────────────────────────────────────────────────────
console.log("\n📋 A04 — Secrets hardcodés");

test("API key hardcodée → process.env", () => {
  const f = { owaspCategory: "A04", tool: "SEMGREP",
               rawOutput: { codeSnippet: "apiKey = 'sk-abc123xyz456abc123xyz456'" } };
  const r = generateTemplateCorrection(f);
  assertCorrection(r, "SECRET");
  assert.ok(r.fixedSnippet.includes("process.env"), `fixedSnippet reçu : ${r.fixedSnippet}`);
});
test("Mot de passe hardcodé → process.env", () => {
  const f = { owaspCategory: "A04", tool: "SEMGREP",
               rawOutput: { codeSnippet: "password: 'superSecret123'" } };
  const r = generateTemplateCorrection(f);
  assertCorrection(r, "SECRET");
  assert.ok(r.fixedSnippet.includes("process.env"), `fixedSnippet reçu : ${r.fixedSnippet}`);
});

// ── A05 ───────────────────────────────────────────────────────────────────────
console.log("\n📋 A05 — Security Misconfiguration");

test("CORS wildcard → origin restreint", () => {
  const f = { owaspCategory: "A05", tool: "SEMGREP", filePath: "app.js",
               rawOutput: { codeSnippet: "cors({ origin: '*' })" } };
  const r = generateTemplateCorrection(f);
  assert.ok(!r.fixedSnippet.includes("'*'"), `Le wildcard ne devrait plus être présent`);
});
test("Express sans helmet → helmet ajouté", () => {
  const f = { owaspCategory: "A05", tool: "SEMGREP", filePath: "server.js",
               rawOutput: { codeSnippet: "const app = express()" } };
  const r = generateTemplateCorrection(f);
  assert.ok(r.fixedSnippet.includes("helmet"), `fixedSnippet reçu : ${r.fixedSnippet}`);
});

// ── A06 ───────────────────────────────────────────────────────────────────────
console.log("\n📋 A06 — Outdated Components");

test("NPM Audit → commande install avec version fixée", () => {
  const f = { owaspCategory: "A06", tool: "NPM_AUDIT",
               rawOutput: { name: "lodash", version: "4.17.4",
                            fixAvailable: { version: "4.17.21" } } };
  const r = generateTemplateCorrection(f);
  assertCorrection(r, "DEPENDENCY");
  assert.ok(r.fixedSnippet.includes("lodash"),   `package absent : ${r.fixedSnippet}`);
  assert.ok(r.fixedSnippet.includes("4.17.21"),  `version fix absente : ${r.fixedSnippet}`);
});

// ── A07 ───────────────────────────────────────────────────────────────────────
console.log("\n📋 A07 — Auth Failures");

test("JWT sans expiresIn → expiresIn ajouté", () => {
  const f = { owaspCategory: "A07", tool: "SEMGREP", filePath: "auth.js",
               rawOutput: { codeSnippet: "jwt.sign({ userId }, process.env.JWT_SECRET)" } };
  const r = generateTemplateCorrection(f);
  assert.ok(r.fixedSnippet.includes("expiresIn"), `fixedSnippet reçu : ${r.fixedSnippet}`);
});
test("Route /login sans rateLimit → rateLimit ajouté", () => {
  const f = { owaspCategory: "A07", tool: "SEMGREP", filePath: "routes.js",
               rawOutput: { codeSnippet: "router.post('/login', loginController)" } };
  const r = generateTemplateCorrection(f);
  assert.ok(r.fixedSnippet.includes("rateLimit"), `fixedSnippet reçu : ${r.fixedSnippet}`);
});

// ── A08 ───────────────────────────────────────────────────────────────────────
console.log("\n📋 A08 — Integrity Failures");

test("JSON.parse non validé → try/catch + validation", () => {
  const f = { owaspCategory: "A08", tool: "SEMGREP", filePath: "parser.js",
               rawOutput: { codeSnippet: "const data = JSON.parse(userInput)" } };
  const r = generateTemplateCorrection(f);
  assert.ok(r.fixedSnippet.includes("try") || r.fixedSnippet.includes("Valider"),
    `fixedSnippet reçu : ${r.fixedSnippet}`);
});

// ── A09 ───────────────────────────────────────────────────────────────────────
console.log("\n📋 A09 — Logging Failures");

test("catch sans log → logger.error ajouté", () => {
  const f = { owaspCategory: "A09", tool: "SEMGREP", filePath: "handler.js",
               rawOutput: { codeSnippet: "try { doSomething() } catch (err) { res.status(500) }" } };
  const r = generateTemplateCorrection(f);
  assert.ok(r.fixedSnippet.includes("logger") || r.fixedSnippet.includes("error"),
    `fixedSnippet reçu : ${r.fixedSnippet}`);
});

// ── A10 ───────────────────────────────────────────────────────────────────────
console.log("\n📋 A10 — SSRF");

test("fetch avec URL utilisateur → validation ajoutée (JS)", () => {
  const f = { owaspCategory: "A10", tool: "SEMGREP", filePath: "proxy.js",
               rawOutput: { codeSnippet: "fetch(userInput)" } };
  const r = generateTemplateCorrection(f);
  assert.ok(r.fixedSnippet.includes("localhost") || r.fixedSnippet.includes("URL"),
    `fixedSnippet reçu : ${r.fixedSnippet}`);
});

// ── Outils ────────────────────────────────────────────────────────────────────
console.log("\n📋 Priorité outil — TRUFFLEHOG & NPM_AUDIT");

test("TRUFFLEHOG → template SECRET (ignore owaspCategory)", () => {
  const f = { owaspCategory: "A01", tool: "TRUFFLEHOG",
               rawOutput: { codeSnippet: "token = 'ghp_realTokenABCDEF1234567890abcdef'" } };
  const r = generateTemplateCorrection(f);
  assertCorrection(r, "SECRET");
  assert.ok(r.fixedSnippet.includes("process.env"), `fixedSnippet reçu : ${r.fixedSnippet}`);
});
test("NPM_AUDIT → template DEPENDENCY (ignore owaspCategory)", () => {
  const f = { owaspCategory: "A01", tool: "NPM_AUDIT",
               rawOutput: { name: "axios", version: "0.21.1",
                            fixAvailable: { version: "1.6.8" } } };
  const r = generateTemplateCorrection(f);
  assertCorrection(r, "DEPENDENCY");
  assert.ok(r.fixedSnippet.includes("axios"), `fixedSnippet reçu : ${r.fixedSnippet}`);
});

// ── Détection de langage ──────────────────────────────────────────────────────
console.log("\n📋 Détection de langage");

test("PHP via filePath → htmlspecialchars (A03)", () => {
  const f = { owaspCategory: "A03", tool: "SEMGREP", filePath: "views/index.php",
               rawOutput: { codeSnippet: "echo $_GET['q']" } };
  const r = generateTemplateCorrection(f);
  assert.ok(r.fixedSnippet.includes("htmlspecialchars"), `fixedSnippet reçu : ${r.fixedSnippet}`);
});
test("Python via filePath → fix python (A02)", () => {
  const f = { owaspCategory: "A02", tool: "SEMGREP", filePath: "auth.py",
               rawOutput: { codeSnippet: "password = 'monMotDePasse'" } };
  const r = generateTemplateCorrection(f);
  assert.ok(r.fixedSnippet.includes("bcrypt"), `fixedSnippet reçu : ${r.fixedSnippet}`);
});

// ── Cas limites ───────────────────────────────────────────────────────────────
console.log("\n📋 Cas limites");

test("owaspCategory null → null", () => {
  const f = { owaspCategory: null, tool: "SEMGREP", rawOutput: { codeSnippet: "code()" } };
  assert.strictEqual(generateTemplateCorrection(f), null);
});
test("rawOutput vide → originalSnippet === ''", () => {
  const f = { owaspCategory: "A04", tool: "SEMGREP", rawOutput: {} };
  const r = generateTemplateCorrection(f);
  assert.ok(r !== null);
  assert.strictEqual(r.originalSnippet, "");
});
test("rawOutput undefined → pas de crash", () => {
  assert.doesNotThrow(() =>
    generateTemplateCorrection({ owaspCategory: "A05", tool: "SEMGREP" })
  );
});
test("finding null → lève TypeError", () => {
  assert.throws(() => generateTemplateCorrection(null), TypeError);
});

// ══════════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS — databaseManager
// ══════════════════════════════════════════════════════════════════════════════

async function runIntegrationTests() {
  console.log("\n══════════════════════════════════════════════");
  console.log("  INTEGRATION TESTS — databaseManager");
  console.log("══════════════════════════════════════════════");

  let mainFinding = null;

  console.log("\n🗄️  createCorrectionFromFinding");

  await testAsync("Crée une correction SQL_INJECTION (statut PENDING)", async () => {
    mainFinding    = await seedFinding("A05", "query(userId)", "SEMGREP");
    const template = generateTemplateCorrection(mainFinding);

    const correction = await createCorrectionFromFinding(mainFinding.id, template);

    assert.ok(correction,                                    "Correction non créée");
    assert.strictEqual(correction.findingId, mainFinding.id, "findingId incorrect");
    assert.strictEqual(correction.status,    "PENDING",       "statut initial incorrect");
    assert.strictEqual(correction.originalSnippet, template.originalSnippet);
    assert.strictEqual(correction.fixedSnippet,    template.fixedSnippet);
  });

  await testAsync("Crée une correction DEPENDENCY via NPM_AUDIT", async () => {
    const finding = await seedFinding("A06", "", "NPM_AUDIT");
    await prisma.finding.update({
      where: { id: finding.id },
      data:  { rawOutput: { name: "lodash", version: "4.17.4",
                            fixAvailable: { version: "4.17.21" } } },
    });
    const updated  = await prisma.finding.findUnique({ where: { id: finding.id } });
    const template = generateTemplateCorrection(updated);

    assert.ok(template,                       "template null");
    assert.strictEqual(template.type, "DEPENDENCY");

    const correction = await createCorrectionFromFinding(finding.id, template);
    assert.ok(correction);
    assert.strictEqual(correction.type, "DEPENDENCY");
  });

  await testAsync("Finding inexistant → lève 'Finding not found'", async () => {
    const template = { type: "SQL_INJECTION", originalSnippet: "a", fixedSnippet: "b" };
    try {
      await createCorrectionFromFinding(999999, template);
      assert.fail("Aurait dû lever une erreur");
    } catch (err) {
      assert.ok(err.message.includes("Finding not found"), `Message inattendu : ${err.message}`);
    }
  });

  console.log("\n🔍  getCorrectionByFinding");

  await testAsync("Retourne la correction liée au finding", async () => {
    assert.ok(mainFinding, "mainFinding absent");
    const correction = await getCorrectionByFinding(mainFinding.id);
    assert.ok(correction);
    assert.strictEqual(correction.findingId, mainFinding.id);
  });

  await testAsync("Id inconnu (999999) → retourne null", async () => {
    assert.strictEqual(await getCorrectionByFinding(999999), null);
  });

  console.log("\n✅  validateCorrection");

  await testAsync("Statut passe à VALIDATED + validatedAt renseigné", async () => {
    assert.ok(mainFinding, "mainFinding absent");
    await validateCorrection(mainFinding.id);
    const c = await prisma.correction.findFirst({ where: { findingId: mainFinding.id } });
    assert.strictEqual(c.status, "VALIDATED");
    assert.ok(c.validatedAt !== null);
    assert.ok(c.validatedAt instanceof Date);
  });

  console.log("\n❌  rejectCorrection");

  await testAsync("Statut passe à REJECTED", async () => {
    assert.ok(mainFinding, "mainFinding absent");
    await prisma.correction.updateMany({
      where: { findingId: mainFinding.id },
      data:  { status: "PENDING", validatedAt: null },
    });
    await rejectCorrection(mainFinding.id);
    const c = await prisma.correction.findFirst({ where: { findingId: mainFinding.id } });
    assert.strictEqual(c.status, "REJECTED");
  });

  await testAsync("REJECTED → validatedAt reste null", async () => {
    assert.ok(mainFinding, "mainFinding absent");
    const c = await prisma.correction.findFirst({ where: { findingId: mainFinding.id } });
    assert.strictEqual(c.validatedAt, null);
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  try {
    await runIntegrationTests();
  } finally {
    await cleanup();
    await prisma.$disconnect();

    console.log(`\n──────────────────────────────────────────────`);
    console.log(`🎯 Résultats : ${passed} passed, ${failed} failed`);
    if (failed === 0) {
      console.log("🎉 Tous les tests sont passés !\n");
    } else {
      console.log("💥 Certains tests ont échoué.\n");
      process.exit(1);
    }
  }
}

main();