import { Router } from 'express';
import { register, login, refresh, logout, me } from './auth.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Cookie-authenticated routes
router.post('/refresh', refresh);
router.post('/logout', logout);

// JWT-authenticated routes
router.get('/me', authenticate, me);

export default router;
