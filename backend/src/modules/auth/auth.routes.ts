import { Router } from 'express';
import { register, login, refresh, logout, me } from './auth.controller';
import { authenticate } from '../../middleware/authenticate';
import { authLimiter, refreshLimiter } from '../../middleware/rateLimiter';

const router = Router();

// Public routes protected by authLimiter (5 req / 15 min)
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

// Cookie-authenticated routes
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', logout);

// JWT-authenticated routes
router.get('/me', authenticate, me);

export default router;
