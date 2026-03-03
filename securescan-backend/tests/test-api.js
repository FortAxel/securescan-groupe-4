/**
 * SecureScan — API Test Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs a full end-to-end test of the SecureScan API.
 * Make sure the server is running before executing this script.
 *
 * Usage: node --env-file=.env tests/test-api.js
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

let token = null;
let passed = 0;
let failed = 0;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const colors = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
};

/**
 * Makes an HTTP request and returns { status, body }
 * @param {string} method
 * @param {string} path
 * @param {object} [body]
 * @param {boolean} [withAuth]
 */
async function request(method, path, body = null, withAuth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (withAuth && token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  return { status: res.status, body: data };
}

/**
 * Assert a condition and log the result
 * @param {string} label
 * @param {boolean} condition
 * @param {string} [detail]
 */
function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ${colors.green('✓')} ${label}`);
    passed++;
  } else {
    console.log(`  ${colors.red('✗')} ${label}${detail ? colors.red(` → ${detail}`) : ''}`);
    failed++;
  }
}

function section(title) {
  console.log(`\n${colors.cyan(colors.bold(`━━━ ${title} ${'━'.repeat(Math.max(0, 40 - title.length))}`))}` );
}

async function seedTestData(userId) {
  console.log(`  ${colors.yellow('→ Seeding test data...')}`);

  // Nettoie les données de test précédentes
  await prisma.finding.deleteMany({ where: { analysis: { project: { userId } } } });
  await prisma.analysis.deleteMany({ where: { project: { userId } } });
  await prisma.project.deleteMany({ where: { userId } });

  // Crée un projet
  const project = await prisma.project.create({
    data: {
      userId,
      name:       'Test Project',
      sourceType: 'GIT',
      sourceUrl:  'https://github.com/test/test-repo',
      status:     'DONE',
    },
  });

  // Crée une analyse
  const analysis = await prisma.analysis.create({
    data: {
      projectId:  project.id,
      status:     'DONE',
      score:      42,
      grade:      'D',
      startedAt:  new Date(),
      finishedAt: new Date(),
    },
  });

  // Crée des findings
  await prisma.finding.createMany({
    data: [
      {
        analysisId:    analysis.id,
        tool:          'SEMGREP',
        severity:      'HIGH',
        owaspCategory: 'A05',
        title:         'sql-injection',
        description:   'SQL injection detected',
        filePath:      'src/db.js',
        lineStart:     42,
        fixStatus:     'PENDING',
      },
      {
        analysisId:    analysis.id,
        tool:          'SEMGREP',
        severity:      'MEDIUM',
        owaspCategory: 'A07',
        title:         'cors-misconfiguration',
        description:   'CORS misconfiguration detected',
        filePath:      'src/server.js',
        lineStart:     12,
        fixStatus:     'PENDING',
      },
      {
        analysisId:    analysis.id,
        tool:          'TRUFFLEHOG',
        severity:      'CRITICAL',
        owaspCategory: 'A02',
        title:         'Exposed secret: GitHub token',
        description:   'A GitHub token was found in the source code',
        filePath:      '.env.backup',
        lineStart:     3,
        fixStatus:     'PENDING',
      },
    ],
  });

  console.log(`  ${colors.yellow(`→ Created project #${project.id}, analysis #${analysis.id}, 3 findings`)}`);
  return { project, analysis };
}

async function cleanup(userId) {
  await prisma.finding.deleteMany({ where: { analysis: { project: { userId } } } });
  await prisma.analysis.deleteMany({ where: { project: { userId } } });
  await prisma.project.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { email: 'testuser@securescan.dev' } });
  await prisma.$disconnect();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

async function testHealth() {
  section('GET /health');
  const { status, body } = await request('GET', '/../health');
  assert('Returns 200',           status === 200,     `got ${status}`);
  assert('Status is ok',          body.status === 'ok');
  assert('Has timestamp',         !!body.timestamp);
}

async function testRegister() {
  section('POST /auth/register');

  // Valid registration
  const { status, body } = await request('POST', '/auth/register', {
    email:    'testuser@securescan.dev',
    username: 'testuser',
    password: 'password123',
  });
  assert('Returns 201',           status === 201,     `got ${status}`);
  assert('Returns user object',   !!body.user);
  assert('Returns token',         !!body.token);
  assert('User has id',           !!body.user?.id);
  assert('User has email',        body.user?.email === 'testuser@securescan.dev');
  assert('Password not exposed',  !body.user?.password);

  // Missing fields
  const { status: s2 } = await request('POST', '/auth/register', { email: 'x@x.com' });
  assert('Returns 400 on missing fields', s2 === 400, `got ${s2}`);

  // Short password
  const { status: s3 } = await request('POST', '/auth/register', {
    email: 'x@x.com', username: 'x', password: '123',
  });
  assert('Returns 400 on short password', s3 === 400, `got ${s3}`);

  // Duplicate email
  const { status: s4 } = await request('POST', '/auth/register', {
    email: 'testuser@securescan.dev', username: 'other', password: 'password123',
  });
  assert('Returns 409 on duplicate email', s4 === 409, `got ${s4}`);
}

async function testLogin() {
  section('POST /auth/login');

  // Valid login
  const { status, body } = await request('POST', '/auth/login', {
    email:    'testuser@securescan.dev',
    password: 'password123',
  });
  assert('Returns 200',         status === 200,   `got ${status}`);
  assert('Returns token',       !!body.token);
  assert('Returns user',        !!body.user);

  // Save token for subsequent tests
  if (body.token) {
    token = body.token;
    console.log(`  ${colors.yellow('→ Token saved for protected routes')}`);
  }

  // Wrong password
  const { status: s2 } = await request('POST', '/auth/login', {
    email: 'testuser@securescan.dev', password: 'wrongpassword',
  });
  assert('Returns 401 on wrong password', s2 === 401, `got ${s2}`);

  // Unknown email
  const { status: s3 } = await request('POST', '/auth/login', {
    email: 'nobody@nowhere.com', password: 'password123',
  });
  assert('Returns 401 on unknown email', s3 === 401, `got ${s3}`);

  // Missing fields
  const { status: s4 } = await request('POST', '/auth/login', { email: 'test@test.com' });
  assert('Returns 400 on missing fields', s4 === 400, `got ${s4}`);
}

async function testMe() {
  section('GET /auth/me');

  // Authenticated
  const { status, body } = await request('GET', '/auth/me', null, true);
  assert('Returns 200',           status === 200,   `got ${status}`);
  assert('Returns user',          !!body.user);
  assert('Has correct email',     body.user?.email === 'testuser@securescan.dev');
  assert('Password not exposed',  !body.user?.password);

  // No token
  const { status: s2 } = await request('GET', '/auth/me', null, false);
  assert('Returns 401 without token', s2 === 401, `got ${s2}`);

  // Invalid token
  const savedToken = token;
  token = 'invalid.token.here';
  const { status: s3 } = await request('GET', '/auth/me', null, true);
  assert('Returns 401 on invalid token', s3 === 401, `got ${s3}`);
  token = savedToken;
}

async function testAnalysisResults(analysisId) {
  section('GET /analysis/:id/results');

  // Full results
  const { status, body } = await request('GET', `/analysis/${analysisId}/results`, null, true);
  assert('Returns 200',             status === 200,       `got ${status}`);
  assert('Has projectId',           body.projectId !== undefined);
  assert('Has score',               body.score !== undefined);
  assert('Has grade',               !!body.grade);
  assert('Has summary',             !!body.summary);
  assert('Summary has severities',  'critical' in (body.summary || {}));
  assert('Has findings array',      Array.isArray(body.findings));

  if (body.findings?.length > 0) {
    const f = body.findings[0];
    assert('Finding has id',          !!f.id);
    assert('Finding has severity',    !!f.severity);
    assert('Finding has tool',        !!f.tool);
    assert('Finding has owasp',       f.owasp !== undefined);
  }

  // Filter by severity
  const { status: s2, body: b2 } = await request('GET', `/analysis/${analysisId}/results?severity=critical`, null, true);
  assert('Filter severity=critical returns 200', s2 === 200, `got ${s2}`);
  assert('All findings are critical', (b2.findings || []).every(f => f.severity === 'critical'));

  // Filter by owasp
  const { status: s3, body: b3 } = await request('GET', `/analysis/${analysisId}/results?owasp=A05`, null, true);
  assert('Filter owasp=A05 returns 200', s3 === 200, `got ${s3}`);
  assert('All findings are A05', (b3.findings || []).every(f => f.owasp === 'A05'));

  // Filter by tool
  const { status: s4, body: b4 } = await request('GET', `/analysis/${analysisId}/results?tool=semgrep`, null, true);
  assert('Filter tool=semgrep returns 200', s4 === 200, `got ${s4}`);
  assert('All findings are from semgrep', (b4.findings || []).every(f => f.tool === 'semgrep'));

  // Not found
  const { status: s5 } = await request('GET', '/analysis/9999/results', null, true);
  assert('Returns 404 on unknown analysis', s5 === 404, `got ${s5}`);

  // No token
  const { status: s6 } = await request('GET', `/analysis/${analysisId}/results`, null, false);
  assert('Returns 401 without token', s6 === 401, `got ${s6}`);
}

async function testOwaspBreakdown(analysisId) {
  section('GET /analysis/:id/results/owasp');

  const { status, body } = await request('GET', `/analysis/${analysisId}/results/owasp`, null, true);
  assert('Returns 200',         status === 200,     `got ${status}`);
  assert('Has analysisId',      !!body.analysisId);
  assert('Has byOwasp object',  !!body.byOwasp);

  const categories = Object.keys(body.byOwasp || {});
  assert('byOwasp has entries', categories.length > 0);

  if (categories.length > 0) {
    const first = body.byOwasp[categories[0]];
    assert('Each category has total', first.total !== undefined);
    assert('Each category has critical', first.critical !== undefined);
  }

  // Not found
  const { status: s2 } = await request('GET', '/analysis/9999/results/owasp', null, true);
  assert('Returns 404 on unknown analysis', s2 === 404, `got ${s2}`);
}

// ─── Runner ───────────────────────────────────────────────────────────────────

async function run() {
  console.log(colors.bold('\n🔐 SecureScan — API Test Suite'));
  console.log(`   Base URL: ${colors.yellow(BASE_URL)}\n`);

  let userId = null;

  await prisma.user.deleteMany({ where: { email: 'testuser@securescan.dev' } });

  try {
    await testHealth();
    await testRegister();
    await testLogin();
    await testMe();

    // Récupère l'userId du testuser pour le seed
    const { body } = await request('GET', '/auth/me', null, true);
    userId = body.user?.id;

    // Seed les données de test
    section('Seeding test data');
    const { analysis } = await seedTestData(userId);

    // Passe l'analysisId dynamiquement aux tests
    await testAnalysisResults(analysis.id);
    await testOwaspBreakdown(analysis.id);

  } catch (err) {
    console.error(colors.red(`\n[FATAL] Unexpected error: ${err.message}`));
    console.error(err.stack);
  } finally {
    // Nettoie après les tests
    if (userId) {
      section('Cleanup');
      await cleanup(userId);
      console.log(`  ${colors.yellow('→ Test data cleaned up')}`);
    }
  }

  const total = passed + failed;
  console.log(`\n${'━'.repeat(45)}`);
  console.log(colors.bold('📊 Results'));
  console.log(`   ${colors.green(`✓ ${passed} passed`)}  ${failed > 0 ? colors.red(`✗ ${failed} failed`) : ''}  / ${total} total`);

  if (failed === 0) {
    console.log(colors.green(colors.bold('\n  ✅ All tests passed!\n')));
  } else {
    console.log(colors.red(colors.bold(`\n  ❌ ${failed} test(s) failed\n`)));
    process.exit(1);
  }
}

run();