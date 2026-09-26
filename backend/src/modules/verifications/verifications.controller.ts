import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { submitReviewSchema, submitVerifySchema } from './verifications.types';
import {
  getVerificationQueue,
  submitReviewRecommendation,
  submitAuthorityVerification,
} from './verifications.service';
import { AppError } from '../../shared/errors';
import { sendSuccess } from '../../shared/response';

export async function getQueueHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const priority = req.query.priority as string | undefined;
    const queue = await getVerificationQueue(priority);
    sendSuccess(res, queue, 200);
  } catch (error) {
    next(error);
  }
}

export async function submitReviewHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw AppError.unauthenticated('User session expired or invalid.');
    }

    const id = req.params.id as string;
    if (!id) {
      throw AppError.validationFailed('Incident ID is required.');
    }

    const input = submitReviewSchema.parse(req.body);
    const review = await submitReviewRecommendation(id, req.user.id, input);

    sendSuccess(res, review, 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return next(
        AppError.validationFailed(
          'Please verify your review input details and try again.',
          error.issues.map((e) => ({ field: e.path.join('.'), message: e.message }))
        )
      );
    }
    next(error);
  }
}

export async function submitVerifyHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw AppError.unauthenticated('User session expired or invalid.');
    }

    const id = req.params.id as string;
    if (!id) {
      throw AppError.validationFailed('Incident ID is required.');
    }

    const input = submitVerifySchema.parse(req.body);
    const result = await submitAuthorityVerification(id, req.user.id, input, req.ip);

    sendSuccess(res, result, 200);
  } catch (error) {
    if (error instanceof ZodError) {
      return next(
        AppError.validationFailed(
          'Please verify your verification input details and try again.',
          error.issues.map((e) => ({ field: e.path.join('.'), message: e.message }))
        )
      );
    }
    next(error);
  }
}
