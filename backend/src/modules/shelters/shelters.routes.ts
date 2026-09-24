import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { checkRole } from '../../middleware/authorize';
import {
  getProximityHandler,
  createShelterHandler,
  updateCapacityHandler,
} from './shelters.controller';

const router = Router();

// GET /api/v1/shelters/proximity - Search operational shelters near (lat, lng) within radiusMeters (default 50,000m)
router.get('/proximity', getProximityHandler);

// POST /api/v1/shelters - Create new shelter record (NGO, AUTHORITY, ADMIN)
router.post(
  '/',
  authenticate,
  checkRole(['NGO', 'AUTHORITY', 'ADMIN']),
  createShelterHandler
);

// PUT /api/v1/shelters/:id/capacity - Update available shelter capacity and status (NGO, AUTHORITY, ADMIN)
router.put(
  '/:id/capacity',
  authenticate,
  checkRole(['NGO', 'AUTHORITY', 'ADMIN']),
  updateCapacityHandler
);

export default router;
