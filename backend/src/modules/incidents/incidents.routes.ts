import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { checkRole } from '../../middleware/authorize';
import { uploadMiddleware } from '../../middleware/upload';
import { createIncidentHandler, getMyReportsHandler, getPublicIncidentsHandler } from './incidents.controller';
import { generalPublicLimiter, incidentSubmissionLimiter } from '../../middleware/rateLimiter';

const router = Router();

const ALLOWED_ROLES = ['CITIZEN', 'VOLUNTEER', 'NGO', 'AUTHORITY', 'ADMIN'];

// GET /api/v1/incidents/public - List sanitized verified incident reports with rounded coordinates
router.get('/public', generalPublicLimiter, getPublicIncidentsHandler);

// POST /api/v1/incidents - Submit structured incident report + media evidence
// Critical order: authenticate -> checkRole -> incidentSubmissionLimiter -> uploadMiddleware -> createIncidentHandler
router.post(
  '/',
  authenticate,
  checkRole(ALLOWED_ROLES),
  incidentSubmissionLimiter,
  uploadMiddleware('media'),
  createIncidentHandler
);

// GET /api/v1/incidents/my-reports - List authenticated citizen's submitted reports
router.get(
  '/my-reports',
  authenticate,
  checkRole(ALLOWED_ROLES),
  getMyReportsHandler
);

export default router;
