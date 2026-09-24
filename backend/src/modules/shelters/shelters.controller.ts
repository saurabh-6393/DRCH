import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { createShelterSchema, updateCapacitySchema } from './shelters.types';
import {
  getSheltersProximity,
  createShelter,
  updateShelterCapacity,
} from './shelters.service';
import { AppError } from '../../shared/errors';
import { sendSuccess } from '../../shared/response';

export async function getProximityHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const latStr = req.query.latitude as string;
    const lngStr = req.query.longitude as string;
    const radiusStr = req.query.radiusMeters as string;

    if (!latStr || !lngStr) {
      throw AppError.validationFailed('Latitude and longitude query parameters are required.');
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    const radius = radiusStr ? parseInt(radiusStr, 10) : 50000;

    if (isNaN(lat) || lat < -90 || lat > 90) {
      throw AppError.validationFailed('Latitude must be a valid number between -90 and 90.');
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      throw AppError.validationFailed('Longitude must be a valid number between -180 and 180.');
    }

    const shelters = await getSheltersProximity(lat, lng, radius);
    sendSuccess(res, shelters, 200);
  } catch (error) {
    next(error);
  }
}

export async function createShelterHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createShelterSchema.parse(req.body);
    const shelter = await createShelter(input);
    sendSuccess(res, shelter, 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return next(
        AppError.validationFailed(
          'Please verify your shelter input details and try again.',
          error.issues.map((e) => ({ field: e.path.join('.'), message: e.message }))
        )
      );
    }
    next(error);
  }
}

export async function updateCapacityHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    if (!id) {
      throw AppError.validationFailed('Shelter ID is required.');
    }

    const input = updateCapacitySchema.parse(req.body);
    const updated = await updateShelterCapacity(id, input);
    sendSuccess(res, updated, 200);
  } catch (error) {
    if (error instanceof ZodError) {
      return next(
        AppError.validationFailed(
          'Please verify your capacity input details and try again.',
          error.issues.map((e) => ({ field: e.path.join('.'), message: e.message }))
        )
      );
    }
    next(error);
  }
}
