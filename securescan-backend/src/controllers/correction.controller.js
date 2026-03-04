import {
  findFindingById,
  getCorrectionByFinding,
  validateCorrection,
  rejectCorrection,
} from '../services/db/databaseManager.js';

// ─── Get correction ───────────────────────────────────────────────────────────

/**
 * Get the suggested correction for a finding.
 *
 * @route   GET /api/corrections/:findingId
 * @access  Private (requires JWT via authMiddleware)
 *
 * @param {import('express').Request}      req  - req.userId injected by authMiddleware
 * @param {import('express').Response}     res
 * @param {import('express').NextFunction} next
 *
 * @returns {200} { id, findingId, type, originalSnippet, fixedSnippet, status, createdAt, validatedAt }
 * @returns {404} Finding not found
 * @returns {404} No correction available for this finding
 */
const getCorrection = async (req, res, next) => {
  try {
    const findingId = Number(req.params.findingId);

    const finding = await findFindingById(findingId);
    if (!finding) return res.status(404).json({ error: 'Finding not found' });

    const correction = await getCorrectionByFinding(findingId);
    if (!correction) {
      return res.status(404).json({ error: 'No correction found for this finding' });
    }

    return res.json({
      id:              correction.id,
      findingId:       correction.findingId,
      type:            correction.type,
      originalSnippet: correction.originalSnippet,
      fixedSnippet:    correction.fixedSnippet,
      status:          correction.status.toLowerCase(),
      createdAt:       correction.createdAt,
      validatedAt:     correction.validatedAt,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Validate correction ──────────────────────────────────────────────────────

/**
 * Mark a correction as validated.
 * Sets status to VALIDATED and records validatedAt timestamp.
 *
 * @route   POST /api/corrections/:findingId/validate
 * @access  Private (requires JWT via authMiddleware)
 *
 * @returns {200} { success: true, findingId, status: 'validated' }
 * @returns {404} Finding not found
 * @returns {404} No correction to validate
 */
const validateCorrectionHandler = async (req, res, next) => {
  try {
    const findingId = Number(req.params.findingId);

    const finding = await findFindingById(findingId);
    if (!finding) return res.status(404).json({ error: 'Finding not found' });

    const correction = await getCorrectionByFinding(findingId);
    if (!correction) {
      return res.status(404).json({ error: 'No correction found for this finding' });
    }

    await validateCorrection(findingId);

    return res.json({ success: true, findingId, status: 'validated' });
  } catch (err) {
    next(err);
  }
};

// ─── Reject correction ────────────────────────────────────────────────────────

/**
 * Mark a correction as rejected.
 * Sets status to REJECTED.
 *
 * @route   POST /api/corrections/:findingId/reject
 * @access  Private (requires JWT via authMiddleware)
 *
 * @returns {200} { success: true, findingId, status: 'rejected' }
 * @returns {404} Finding not found
 * @returns {404} No correction to reject
 */
const rejectCorrectionHandler = async (req, res, next) => {
  try {
    const findingId = Number(req.params.findingId);

    const finding = await findFindingById(findingId);
    if (!finding) return res.status(404).json({ error: 'Finding not found' });

    const correction = await getCorrectionByFinding(findingId);
    if (!correction) {
      return res.status(404).json({ error: 'No correction found for this finding' });
    }

    await rejectCorrection(findingId);

    return res.json({ success: true, findingId, status: 'rejected' });
  } catch (err) {
    next(err);
  }
};

export { getCorrection, validateCorrectionHandler, rejectCorrectionHandler };