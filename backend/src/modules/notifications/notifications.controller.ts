import { Request, Response, NextFunction } from 'express';
import { SubscribePushSchema, UpdateLocationSchema } from './notifications.types';
import {
  getVapidPublicKey,
  subscribePush,
  updatePushLocation,
  getNotifications,
  markNotificationAsRead,
} from './notifications.service';
import { sendSuccess } from '../../shared/response';
import { AppError } from '../../shared/errors';

export async function getVapidPublicKeyHandler(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const key = getVapidPublicKey();
    return sendSuccess(res, { publicKey: key }, 200);
  } catch (error) {
    next(error);
  }
}

export async function subscribePushHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parseResult = SubscribePushSchema.safeParse(req.body);
    if (!parseResult.success) {
      return next(
        AppError.validationFailed(
          'Invalid push subscription payload.',
          parseResult.error.issues
        )
      );
    }

    const userId = req.user?.id;
    if (!userId) {
      return next(AppError.unauthenticated('User context missing.'));
    }

    await subscribePush(userId, parseResult.data);
    return sendSuccess(res, { message: 'Web Push subscription registered.' }, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateLocationHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parseResult = UpdateLocationSchema.safeParse(req.body);
    if (!parseResult.success) {
      return next(
        AppError.validationFailed(
          'Invalid location coordinates.',
          parseResult.error.issues
        )
      );
    }

    const userId = req.user?.id;
    if (!userId) {
      return next(AppError.unauthenticated('User context missing.'));
    }

    await updatePushLocation(userId, parseResult.data);
    return sendSuccess(res, { message: 'Push subscription location updated.' }, 200);
  } catch (error) {
    next(error);
  }
}

export async function getNotificationsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(AppError.unauthenticated('User context missing.'));
    }

    const notifications = await getNotifications(userId);
    return sendSuccess(res, notifications, 200);
  } catch (error) {
    next(error);
  }
}

export async function markAsReadHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const notificationId = req.params.id as string;
    if (!notificationId) {
      return next(AppError.validationFailed('Notification ID is required.'));
    }

    const userId = req.user?.id;
    if (!userId) {
      return next(AppError.unauthenticated('User context missing.'));
    }

    const notification = await markNotificationAsRead(userId, notificationId);
    return sendSuccess(res, notification, 200);
  } catch (error) {
    next(error);
  }
}
