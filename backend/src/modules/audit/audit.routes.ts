import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { getAuditLogsHandler } from './audit.controller';

const router = Router();

// Append-only audit trail: strictly read-only endpoint restricted to ADMIN and AUTHORITY
router.get('/', authenticate, authorize(['ADMIN', 'AUTHORITY']), getAuditLogsHandler);

export default router;
