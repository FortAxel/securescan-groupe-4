import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ══════════════════════════════════════════════════════════════════════════════
// USER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Find a user by email
 * @param {string} email
 */
const findUserByEmail = (email) =>
  prisma.user.findUnique({ where: { email } });

/**
 * Find a user by email or username (used for duplicate check on register)
 * @param {string} email
 * @param {string} username
 */
const findUserByEmailOrUsername = (email, username) =>
  prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });

/**
 * Find a user by id (public fields only)
 * @param {number} id
 */
const findUserById = (id) =>
  prisma.user.findUnique({
    where:  { id },
    select: { id: true, email: true, username: true, createdAt: true },
  });

/**
 * Create a new user
 * @param {{ email: string, username: string, password: string }} data
 */
const createUser = (data) =>
  prisma.user.create({
    data,
    select: { id: true, email: true, username: true, createdAt: true },
  });

// ══════════════════════════════════════════════════════════════════════════════
// PROJECT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new project for a user
 * @param {number} userId
 * @param {{ name: string, sourceType: string, sourceUrl?: string, localPath?: string, language?: string, framework?: string }} data
 */
const createProject = (userId, data) =>
  prisma.project.create({ data: { userId, ...data } });

/**
 * Find all projects belonging to a user
 * @param {number} userId
 */
const findProjectsByUser = (userId) =>
  prisma.project.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    include: { analyses: { select: { id: true, status: true, score: true, grade: true, createdAt: true } } },
  });

/**
 * Find a single project by id, only if it belongs to the user
 * @param {number} id
 * @param {number} userId
 */
const findProjectByIdAndUser = (id, userId) =>
  prisma.project.findFirst({
    where:   { id, userId },
    include: { analyses: { orderBy: { createdAt: 'desc' } } },
  });

/**
 * Update project fields (status, language, localPath...)
 * @param {number} id
 * @param {object} data
 */
const updateProject = (id, data) =>
  prisma.project.update({ where: { id }, data });

/**
 * Delete a project by id
 * @param {number} id
 */
const deleteProject = (id) =>
  prisma.project.delete({ where: { id } });

// ══════════════════════════════════════════════════════════════════════════════
// ANALYSIS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new analysis for a project
 * @param {number} projectId
 */
const createAnalysis = (projectId) =>
  prisma.analysis.create({ data: { projectId, status: 'PENDING' } });

/**
 * Find an analysis by id, only if it belongs to the user (via project)
 * @param {number} id
 * @param {number} userId
 */
const findAnalysisByIdAndUser = (id, userId) =>
  prisma.analysis.findFirst({
    where:   { id, project: { userId } },
    include: { project: { select: { id: true, name: true } } },
  });

/**
 * Update analysis fields (status, score, grade, errorMessage...)
 * @param {number} id
 * @param {object} data
 */
const updateAnalysis = (id, data) =>
  prisma.analysis.update({ where: { id }, data });

// ══════════════════════════════════════════════════════════════════════════════
// FINDING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Bulk create findings for an analysis
 * @param {object[]} findings - Array of finding objects
 */
const createFindings = (findings) =>
  prisma.finding.createMany({ data: findings });

/**
 * Find all findings for an analysis, with optional filters
 * @param {number} analysisId
 * @param {{ severity?: string, owaspCategory?: string, tool?: string }} filters
 */
const findFindingsByAnalysis = (analysisId, filters = {}) => {
  const where = {
    analysisId,
    ...(filters.severity      && { severity:      filters.severity.toUpperCase() }),
    ...(filters.owaspCategory && { owaspCategory: filters.owaspCategory.toUpperCase() }),
    ...(filters.tool          && { tool:          filters.tool.toUpperCase() }),
  };

  return prisma.finding.findMany({
    where,
    orderBy: [{ severity: 'asc' }, { createdAt: 'asc' }],
  });
};

/**
 * Find a single finding by id
 * @param {number} id
 */
const findFindingById = (id) =>
  prisma.finding.findUnique({ where: { id } });

/**
 * Update a finding fix status or fix content
 * @param {number} id
 * @param {object} data
 */
const updateFinding = (id, data) =>
  prisma.finding.update({ where: { id }, data });

// ══════════════════════════════════════════════════════════════════════════════
// FIX BRANCH
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a fix branch record for an analysis
 * @param {number} analysisId
 * @param {string} branchName
 */
const createFixBranch = (analysisId, branchName) =>
  prisma.fixBranch.create({ data: { analysisId, branchName } });

/**
 * Update fix branch status
 * @param {number} id
 * @param {object} data
 */
const updateFixBranch = (id, data) =>
  prisma.fixBranch.update({ where: { id }, data });

// ══════════════════════════════════════════════════════════════════════════════

export {
  findUserByEmail,
  findUserByEmailOrUsername,
  findUserById,
  createUser,

  createProject,
  findProjectsByUser,
  findProjectByIdAndUser,
  updateProject,
  deleteProject,

  createAnalysis,
  findAnalysisByIdAndUser,
  updateAnalysis,

  createFindings,
  findFindingsByAnalysis,
  findFindingById,
  updateFinding,

  createFixBranch,
  updateFixBranch,
};