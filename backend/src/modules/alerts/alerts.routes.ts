import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { checkRole } from '../../middleware/authorize';
import {
  createAlertHandler,
  getActiveAlertsHandler,
  cancelAlertHandler,
} from './alerts.controller';

const router = Router();

// GET /api/v1/alerts - List active alerts (Public / Authenticated)
router.get('/', getActiveAlertsHandler);

// POST /api/v1/alerts - Publish geofenced warning alert (AUTHORITY, ADMIN)
router.post(
  '/',
  authenticate,
  checkRole(['AUTHORITY', 'ADMIN']),
  createAlertHandler
);

// PUT /api/v1/alerts/:id/cancel - Cancel active warning alert (AUTHORITY, ADMIN)
router.put(
  '/:id/cancel',
  authenticate,
  checkRole(['AUTHORITY', 'ADMIN']),
  cancelAlertHandler
);

export default router;
