import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import {
  getVapidPublicKeyHandler,
  subscribePushHandler,
  updateLocationHandler,
  getNotificationsHandler,
  markAsReadHandler,
} from './notifications.controller';

const router = Router();

// GET /api/v1/notifications/vapid-public-key (Public / Authenticated)
router.get('/vapid-public-key', getVapidPublicKeyHandler);

// POST /api/v1/notifications/subscribe (Authenticated)
router.post('/subscribe', authenticate, subscribePushHandler);

// POST /api/v1/notifications/location (Authenticated)
router.post('/location', authenticate, updateLocationHandler);

// GET /api/v1/notifications (Authenticated user history)
router.get('/', authenticate, getNotificationsHandler);

// PATCH /api/v1/notifications/:id/read (Authenticated user read-state update)
router.patch('/:id/read', authenticate, markAsReadHandler);

export default router;
