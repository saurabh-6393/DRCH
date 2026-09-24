import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { requestIdMiddleware } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';
import { sendSuccess } from './shared/response';
import authRoutes from './modules/auth/auth.routes';
import incidentsRoutes from './modules/incidents/incidents.routes';
import verificationsRoutes from './modules/verifications/verifications.routes';
import sheltersRoutes from './modules/shelters/shelters.routes';
import alertsRoutes from './modules/alerts/alerts.routes';
import resourcesRoutes from './modules/resources/resources.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';

const app = express();

// ============================================================
// Global Middleware
// ============================================================

// Security headers (Helmet)
app.use(helmet());

// CORS — restrict to frontend origin, allow credentials (cookies)
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

// Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// Cookie parser
app.use(cookieParser());

// Request ID for structured logging
app.use(requestIdMiddleware);

// ============================================================
// Health Check
// ============================================================

app.get('/health', (_req, res) => {
  sendSuccess(res, { status: 'healthy', timestamp: new Date().toISOString() });
});

// ============================================================
// API Routes (Phase 1, Phase 2, Phase 3, & Phase 4)
// ============================================================

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/incidents', incidentsRoutes);
app.use('/api/v1/verifications', verificationsRoutes);
app.use('/api/v1/shelters', sheltersRoutes);
app.use('/api/v1/alerts', alertsRoutes);
app.use('/api/v1/resources', resourcesRoutes);
app.use('/api/v1/notifications', notificationsRoutes);

// ============================================================
// Centralized Error Handler (must be last)
// ============================================================

app.use(errorHandler);

export default app;
