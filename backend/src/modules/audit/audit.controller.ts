import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { auditQuerySchema } from './audit.types';
import { getAuditLogs } from './audit.service';
import { sendSuccess } from '../../shared/response';
import { AppError } from '../../shared/errors';

export async function getAuditLogsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parseResult = auditQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return next(
        AppError.validationFailed(
          'Invalid audit log query parameters.',
          parseResult.error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          }))
        )
      );
    }

    const result = await getAuditLogs(parseResult.data);
    return sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}
