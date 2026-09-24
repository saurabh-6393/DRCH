import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { createIncidentSchema } from './incidents.types';
import { createIncident, getCitizenReports, getPublicVerifiedIncidents } from './incidents.service';
import { AppError } from '../../shared/errors';
import { sendSuccess } from '../../shared/response';

export async function createIncidentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw AppError.unauthenticated('User session expired or invalid.');
    }

    if (!req.file) {
      throw AppError.validationFailed('Media file evidence is required.');
    }

    const input = createIncidentSchema.parse(req.body);

    const incidentData = await createIncident(
      req.user.id,
      input,
      req.file,
      req.requestId
    );

    sendSuccess(res, incidentData, 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return next(
        AppError.validationFailed(
          'Please verify your input details and try again.',
          error.issues.map((e) => ({ field: e.path.join('.'), message: e.message }))
        )
      );
    }
    next(error);
  }
}

export async function getMyReportsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw AppError.unauthenticated('User session expired or invalid.');
    }

    const reports = await getCitizenReports(req.user.id);
    sendSuccess(res, reports, 200);
  } catch (error) {
    next(error);
  }
}

export async function getPublicIncidentsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const category = req.query.category as string | undefined;
    const incidents = await getPublicVerifiedIncidents(category);
    sendSuccess(res, incidents, 200);
  } catch (error) {
    next(error);
  }
}
