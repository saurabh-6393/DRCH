import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { checkRole } from '../../middleware/authorize';
import {
  getQueueHandler,
  submitReviewHandler,
  submitVerifyHandler,
} from './verifications.controller';

const router = Router();

// GET /api/v1/verifications/queue - Shared backlog queue sorted by AI priority
router.get(
  '/queue',
  authenticate,
  checkRole(['VOLUNTEER', 'NGO', 'AUTHORITY', 'ADMIN']),
  getQueueHandler
);

// POST /api/v1/verifications/:id/review - Stage 2 human recommendation (VOLUNTEER, NGO, AUTHORITY, ADMIN)
router.post(
  '/:id/review',
  authenticate,
  checkRole(['VOLUNTEER', 'NGO', 'AUTHORITY', 'ADMIN']),
  submitReviewHandler
);

// POST /api/v1/verifications/:id/verify - Stage 3 final Authority sign-off gate (AUTHORITY, ADMIN only)
router.post(
  '/:id/verify',
  authenticate,
  checkRole(['AUTHORITY', 'ADMIN']),
  submitVerifyHandler
);

export default router;
