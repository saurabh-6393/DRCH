import { Request, Response, NextFunction } from 'express';
import { CreateAlertSchema } from './alerts.types';
import { createAlert, getActiveAlerts, cancelAlert } from './alerts.service';
import { sendSuccess } from '../../shared/response';
import { AppError } from '../../shared/errors';

export async function createAlertHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parseResult = CreateAlertSchema.safeParse(req.body);
    if (!parseResult.success) {
      return next(
        AppError.validationFailed(
          'Invalid alert payload.',
          parseResult.error.issues
        )
      );
    }

    const userId = req.user?.id;
    if (!userId) {
      return next(AppError.unauthenticated('User context missing.'));
    }

    const alert = await createAlert(userId, parseResult.data);
    return sendSuccess(res, alert, 201);
  } catch (error) {
    next(error);
  }
}

export async function getActiveAlertsHandler(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const alerts = await getActiveAlerts();
    return sendSuccess(res, alerts, 200);
  } catch (error) {
    next(error);
  }
}

export async function cancelAlertHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const alertId = req.params.id as string;
    if (!alertId) {
      return next(AppError.validationFailed('Alert ID is required.'));
    }

    const alert = await cancelAlert(alertId);
    return sendSuccess(res, alert, 200);
  } catch (error) {
    next(error);
  }
}
