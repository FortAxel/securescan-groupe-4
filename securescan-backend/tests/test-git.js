/**
 * @file git.test.js
 * @description Integration test for SecureScan Git service.
 * This test performs:
 * - Clone repository
 * - Pull latest changes
 * - Create remote branch
 * - Create local branch
 * - Create dummy file
 * - Commit
 * - Push
 * - Display branch URL
 *
 * Requires:
 * - Valid GITHUB_TOKEN in .env
 * - Repository where you have push permissions
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  cloneRepository,
  pullRepository,
  createRemoteBranch,
  createLocalBranch,
  commitChanges,
  pushBranch,
  generateBranchUrl,
  createPullRequest
} from "../src/services/git.service.js";

// ─────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────

const accessToken = process.env.GITHUB_TOKEN;
const owner = process.env.GITHUB_USERNAME;
const repo = "test-securescan"; // 🔴 CHANGE THIS
const baseBranch = "master";

if (!accessToken || !owner) {
  console.error("❌ Missing GITHUB_TOKEN or GITHUB_USERNAME in .env");
  process.exit(1);
}

const repoUrl = `https://github.com/${owner}/${repo}.git`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localRepoPath = "/tmp/repos/securescan-test-repo";

// ─────────────────────────────────────────────
// TEST EXECUTION
// ─────────────────────────────────────────────

async function runTest() {
  try {
    console.log("🚀 Starting Git integration test...\n");

    // Clean previous test folder
    if (fs.existsSync(localRepoPath)) {
      fs.rmSync(localRepoPath, { recursive: true, force: true });
    }

    console.log("1️⃣ Cloning repository...");
    await cloneRepository(repoUrl, localRepoPath, accessToken);

    console.log("2️⃣ Pulling latest changes...");
    await pullRepository(localRepoPath, baseBranch);

    console.log("3️⃣ Creating remote branch...");
    const branchName = await createRemoteBranch(
      owner,
      repo,
      baseBranch,
      accessToken
    );

    console.log(`   ✔ Remote branch created: ${branchName}`);

    console.log("4️⃣ Creating local branch...");
    await createLocalBranch(localRepoPath, branchName);

    console.log("5️⃣ Creating dummy test file...");
    const testFilePath = path.join(
      localRepoPath,
      "securescan-test.txt"
    );

    fs.writeFileSync(
      testFilePath,
      `SecureScan test commit - ${new Date().toISOString()}`
    );

    console.log("6️⃣ Committing changes...");
    await commitChanges(
      localRepoPath,
      "test: SecureScan Git integration test"
    );

    console.log("7️⃣ Pushing branch...");
    await pushBranch(localRepoPath, branchName);

    console.log("8️⃣ Creating Pull Request...");

    const prUrl = await createPullRequest(
        owner,
        repo,
        branchName,
        baseBranch,
        accessToken
    );

    console.log("   ✔ Pull Request created:");
    console.log(prUrl);

    const branchUrl = generateBranchUrl(owner, repo, branchName);

    console.log("\n🎉 SUCCESS!");
    console.log("Branch available at:");
    console.log(branchUrl);

    console.log("\n🧹 Cleaning local test folder...");
    fs.rmSync(localRepoPath, { recursive: true, force: true });

    console.log("✅ Test completed successfully.");
  } catch (error) {
    console.error("\n❌ TEST FAILED");
    console.error(error);
  }
}

runTest();