import { Request, Response, NextFunction } from 'express';
import { CreateResourceSchema, AllocateResourceSchema } from './resources.types';
import {
  createResource,
  getResources,
  allocateResource,
  deleteAllocation,
} from './resources.service';
import { sendSuccess } from '../../shared/response';
import { AppError } from '../../shared/errors';

export async function createResourceHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parseResult = CreateResourceSchema.safeParse(req.body);
    if (!parseResult.success) {
      return next(
        AppError.validationFailed(
          'Invalid resource payload.',
          parseResult.error.issues
        )
      );
    }

    const userOrgId = (req.user as any)?.orgId || null;
    const resource = await createResource(userOrgId, parseResult.data);
    return sendSuccess(res, resource, 201);
  } catch (error) {
    next(error);
  }
}

export async function getResourcesHandler(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const resources = await getResources();
    return sendSuccess(res, resources, 200);
  } catch (error) {
    next(error);
  }
}

export async function allocateResourceHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const resourceId = req.params.id as string;
    if (!resourceId) {
      return next(AppError.validationFailed('Resource ID is required.'));
    }

    const parseResult = AllocateResourceSchema.safeParse(req.body);
    if (!parseResult.success) {
      return next(
        AppError.validationFailed(
          'Invalid allocation payload.',
          parseResult.error.issues
        )
      );
    }

    const userRoles = req.user?.roles || [];
    const userOrgId = (req.user as any)?.orgId || null;

    const allocation = await allocateResource(
      userRoles,
      userOrgId,
      resourceId,
      parseResult.data,
      req.user?.id,
      req.ip
    );
    return sendSuccess(res, allocation, 201);
  } catch (error) {
    next(error);
  }
}

export async function deleteAllocationHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const allocationId = req.params.id as string;
    if (!allocationId) {
      return next(AppError.validationFailed('Allocation ID is required.'));
    }

    const userRoles = req.user?.roles || [];
    const userOrgId = (req.user as any)?.orgId || null;

    await deleteAllocation(userRoles, userOrgId, allocationId, req.user?.id, req.ip);
    return sendSuccess(res, { message: 'Allocation deleted successfully.' }, 200);
  } catch (error) {
    next(error);
  }
}
