/**
 * @file test-flow.js
 * @description End-to-end test for the full SecureScan GIT flow.
 *
 * Flow tested:
 *  1. Register user
 *  2. Login → get JWT
 *  3. Simulate GitHub OAuth (inject token directly via API)
 *  4. Submit Git repo → scan + findings + corrections generated
 *  5. List corrections for the analysis
 *  6. Validate first correction
 *  7. Apply corrections → get Pull Request URL
 *
 * Usage:
 *   REPO_URL=https://github.com/you/your-repo node test.e2e.js
 */

import 'dotenv/config';

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const REPO_URL = process.env.REPO_URL;

if (!REPO_URL) {
  console.error('❌  Missing REPO_URL env variable');
  console.error('    Usage: REPO_URL=https://github.com/you/repo node test-flow.js');
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function req(method, path, body, token) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...(body && { body: JSON.stringify(body) }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

function log(step, data) {
  console.log(`\n✅  Step ${step}`);
  console.log(JSON.stringify(data, null, 2));
}

// ─── Test ─────────────────────────────────────────────────────────────────────

async function run() {
    console.log(`\n🚀  SecureScan E2E — target: ${BASE_URL}`);
    console.log(`📦  Repo: ${REPO_URL}\n`);

    // ── 1. Register ────────────────────────────────────────────────────────────
    const username = `testuser_${Date.now()}`;
    const email    = `${username}@test.com`;
    const password = 'TestPassword123!';

    let step1;
    try {
        step1 = await req('POST', '/api/auth/register', { username, email, password });
    } catch {
        // User might already exist, continue to login
        console.log('ℹ️   Register skipped (user may already exist)');
        step1 = {};
    }
    log(1, { message: 'Registered', ...step1 });

    // ── 2. Login → JWT ─────────────────────────────────────────────────────────
    const { token } = await req('POST', '/api/auth/login', { email, password });
    log(2, { message: 'Logged in', token: token.slice(0, 20) + '...' });

    // ── 3. Inject GitHub OAuth token directly ──────────────────────────────────
    // This bypasses the OAuth browser flow for testing purposes.
    // Your /api/githubAuth/inject route must exist (see note below).
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
        throw new Error('Missing GITHUB_TOKEN in .env — needed to inject GitHub auth for tests');
    }

    await req('POST', '/api/githubAuth/inject', { accessToken: githubToken }, token);
    log(3, { message: 'GitHub token injected' });

    // ── 4. Submit Git repo ─────────────────────────────────────────────────────
    console.log('\n⏳  Scanning repo (this may take a while)...');
    const scan = await req('POST', '/api/projects/', { url: REPO_URL, name: 'E2E Test Repo' }, token);
    log(4, scan);

    const { analysisId } = scan;

    // ── 5. Get findings + corrections ──────────────────────────────────────────
    const results = await req('GET', `/api/analysis/${analysisId}/results`, null, token);
    log(5, {
        score:        results.score,
        grade:        results.grade,
        totalFindings: results.findings.length,
        summary:      results.summary,
    });

    if (results.findings.length === 0) {
        console.log('\n⚠️   No findings — nothing to correct. Test ends here.');
        return;
    }

    // ── 6. Validate first correction ───────────────────────────────────────────
    // Get findings from results, then fetch correction for the first finding
    const firstFinding = results.findings.find(
        (f) => f.file && !f.file.includes('/.git/')
        );

    if (!firstFinding) {
        console.log('\n⚠️   No valid finding to correct. Test ends here.');
        return;
    }

    const correction = await req('GET', `/api/corrections/${firstFinding.id}`, null, token);

    if (!correction) {
        console.log('\n⚠️   No correction generated for first finding. Test ends here.');
        return;
    }

    await req('POST', `/api/corrections/${firstFinding.id}/validate`, null, token);
    log(6, { message: 'Correction validated', findingId: firstFinding.id, correctionId: correction.id });

    // ── 7. Apply corrections → Pull Request ────────────────────────────────────
    console.log('\n⏳  Applying corrections and opening Pull Request...');
    const apply = await req('POST', `/api/analysis/${analysisId}/apply`, null, token);
    log(7, apply);

    console.log('\n🎉  E2E test passed!');
    console.log(`🔗  Pull Request: ${apply.pullRequestUrl}`);
}

run().catch((err) => {
  console.error('\n❌  Test failed:', err.message);
  process.exit(1);
});