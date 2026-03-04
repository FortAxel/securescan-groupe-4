/**
 * @file git.service.js
 * @description Git service for SecureScan.
 * Handles repository cloning, pulling, branching,
 * committing and pushing using simple-git and Octokit.
 */

import simpleGit from "simple-git";
import { Octokit } from "@octokit/rest";
import path from "path";
import fs from "fs";

/**
 * Creates an authenticated repository URL using a GitHub access token.
 *
 * @param {string} repoUrl - HTTPS GitHub repository URL.
 * @param {string} accessToken - GitHub personal access token.
 * @returns {string} Authenticated repository URL.
 */
export function buildAuthenticatedRepoUrl(repoUrl, accessToken) {
  return repoUrl.replace(
    "https://",
    `https://${accessToken}@`
  );
}

/**
 * Returns an Octokit instance authenticated with a GitHub token.
 *
 * @param {string} accessToken - GitHub personal access token.
 * @returns {Octokit} Authenticated Octokit instance.
 */
export function getOctokit(accessToken) {
  return new Octokit({
    auth: accessToken,
  });
}

/**
 * Clones a GitHub repository locally using HTTPS authentication.
 *
 * @param {string} repoUrl - HTTPS GitHub repository URL.
 * @param {string} localPath - Local destination path.
 * @param {string} accessToken - GitHub personal access token.
 * @returns {Promise<void>}
 */
export async function cloneRepository(repoUrl, localPath, accessToken) {
  const authenticatedUrl = buildAuthenticatedRepoUrl(repoUrl, accessToken);
  const git = simpleGit();

  await git.clone(authenticatedUrl, localPath);
}

/**
 * Pulls the latest changes from a remote branch.
 * Authentication must already be configured in the remote URL.
 *
 * @param {string} localPath - Local repository path.
 * @param {string} branch - Branch name to pull from.
 * @returns {Promise<void>}
 */
export async function pullRepository(localPath, branch = "main") {
  const git = simpleGit(localPath);

  await git.checkout(branch);
  await git.pull("origin", branch);
}

/**
 * Retrieves the latest commit SHA from a remote branch using GitHub API.
 *
 * @param {string} owner - Repository owner.
 * @param {string} repo - Repository name.
 * @param {string} branch - Branch name.
 * @param {string} accessToken - GitHub personal access token.
 * @returns {Promise<string>} Latest commit SHA.
 */
export async function getLatestCommitSHA(owner, repo, branch, accessToken) {
  const octokit = getOctokit(accessToken);

  const { data } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });

  return data.object.sha;
}

/**
 * Creates a new remote branch based on an existing branch.
 *
 * @param {string} owner - Repository owner.
 * @param {string} repo - Repository name.
 * @param {string} baseBranch - Base branch (e.g., main).
 * @param {string} accessToken - GitHub personal access token.
 * @returns {Promise<string>} Created branch name.
 */
export async function createRemoteBranch(owner, repo, baseBranch, accessToken) {
  const octokit = getOctokit(accessToken);

  const date = new Date().toISOString().split("T")[0];
  const branchName = `fix/securescan-${date}`;

  const sha = await getLatestCommitSHA(owner, repo, baseBranch, accessToken);

  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha,
  });

  return branchName;
}

/**
 * Creates and checks out a new local branch.
 *
 * @param {string} localPath - Local repository path.
 * @param {string} branchName - Branch name.
 * @returns {Promise<void>}
 */
export async function createLocalBranch(localPath, branchName) {
  const git = simpleGit(localPath);
  await git.checkoutLocalBranch(branchName);
}

/**
 * Applies validated corrections to repository files.
 *
 * @param {Array<Object>} corrections - List of validated corrections.
 * @param {string} repoPath - Local repository path.
 * @returns {Promise<void>}
 */
export async function applyCorrections(corrections, repoPath) {
  corrections.forEach((correction) => {
    const filePath = path.join(repoPath, correction.filePath);

    let content = fs.readFileSync(filePath, "utf8");

    content = content.replace(
      correction.oldCode,
      correction.newCode
    );

    fs.writeFileSync(filePath, content);
  });
}

/**
 * Commits all staged changes.
 *
 * @param {string} localPath - Local repository path.
 * @param {string} message - Commit message.
 * @returns {Promise<void>}
 */
export async function commitChanges(localPath, message) {
  const git = simpleGit(localPath);

  await git.add(".");
  await git.commit(message);
}

/**
 * Pushes a branch to the remote repository.
 *
 * @param {string} localPath - Local repository path.
 * @param {string} branchName - Branch name to push.
 * @returns {Promise<void>}
 */
export async function pushBranch(localPath, branchName) {
  const git = simpleGit(localPath);
  await git.push("origin", branchName);
}

/**
 * Generates the GitHub branch URL.
 *
 * @param {string} owner - Repository owner.
 * @param {string} repo - Repository name.
 * @param {string} branchName - Branch name.
 * @returns {string} GitHub branch URL.
 */
export function generateBranchUrl(owner, repo, branchName) {
  return `https://github.com/${owner}/${repo}/tree/${branchName}`;
}

/**
 * Creates a Pull Request on GitHub.
 *
 * @param {string} owner - Repository owner.
 * @param {string} repo - Repository name.
 * @param {string} headBranch - Source branch (fix branch).
 * @param {string} baseBranch - Target branch (usually main).
 * @param {string} accessToken - GitHub personal access token.
 * @returns {Promise<string>} Pull Request URL.
 */
export async function createPullRequest(
  owner,
  repo,
  headBranch,
  baseBranch,
  accessToken
) {
  const octokit = getOctokit(accessToken);

  const { data } = await octokit.pulls.create({
    owner,
    repo,
    title: "fix: SecureScan automated security corrections",
    head: headBranch,
    base: baseBranch,
    body: `
This Pull Request was automatically generated by SecureScan.

It contains validated security corrections:
- Injection fixes
- Dependency updates
- Secret removal
- Password hashing improvements

Please review before merging.
    `,
  });

  return data.html_url;
}