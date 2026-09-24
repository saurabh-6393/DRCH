import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { checkRole } from '../../middleware/authorize';
import {
  createResourceHandler,
  getResourcesHandler,
  allocateResourceHandler,
  deleteAllocationHandler,
} from './resources.controller';

const router = Router();

// GET /api/v1/resources - List resource inventory and allocation status (VOLUNTEER, NGO, AUTHORITY, ADMIN)
router.get(
  '/',
  authenticate,
  checkRole(['VOLUNTEER', 'NGO', 'AUTHORITY', 'ADMIN']),
  getResourcesHandler
);

// POST /api/v1/resources - Register new resource item (NGO, AUTHORITY, ADMIN)
router.post(
  '/',
  authenticate,
  checkRole(['NGO', 'AUTHORITY', 'ADMIN']),
  createResourceHandler
);

// POST /api/v1/resources/:id/allocate - Allocate quantity to target entity (NGO, AUTHORITY, ADMIN)
router.post(
  '/:id/allocate',
  authenticate,
  checkRole(['NGO', 'AUTHORITY', 'ADMIN']),
  allocateResourceHandler
);

// DELETE /api/v1/resources/allocations/:id - Delete allocation & return quantity to pool (NGO, AUTHORITY, ADMIN)
router.delete(
  '/allocations/:id',
  authenticate,
  checkRole(['NGO', 'AUTHORITY', 'ADMIN']),
  deleteAllocationHandler
);

export default router;
