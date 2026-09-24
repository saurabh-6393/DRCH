import multer from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// Memory storage for inspecting file headers in memory before S3 write
const memoryStorage = multer.memoryStorage();

export const multerUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(
        new AppError(
          400,
          'VALIDATION_FAILED',
          'Invalid file format or extension. Only PNG, JPG, JPEG, and WEBP files under 5MB are allowed.'
        )
      );
    }
    cb(null, true);
  },
});

/**
 * Validates magic-byte signatures of file buffers to prevent disguised executable uploads.
 */
export async function validateMagicBytes(buffer: Buffer): Promise<boolean> {
  if (!buffer || buffer.length < 4) {
    return false;
  }

  // Common magic byte headers:
  // JPEG: FF D8 FF
  // PNG: 89 50 4E 47
  // WEBP: 52 49 46 46 (RIFF) ... 57 45 42 50
  try {
    const fileTypeModule = await (Function('return import("file-type")')() as Promise<any>);
    if (fileTypeModule && fileTypeModule.fileTypeFromBuffer) {
      const type = await fileTypeModule.fileTypeFromBuffer(buffer);
      if (type && ALLOWED_MIME_TYPES.includes(type.mime)) {
        return true;
      }
    }
  } catch (_err) {
    // Fallback to manual byte buffer header signature check below
  }

  const headerHex = buffer.toString('hex', 0, 4).toUpperCase();
  const isJpeg = headerHex.startsWith('FFD8FF');
  const isPng = headerHex === '89504E47';
  const isRiffWebp = headerHex === '52494646' && buffer.toString('hex', 8, 12).toUpperCase() === '57454250';

  return isJpeg || isPng || isRiffWebp;
}

/**
 * Express middleware to handle single file upload and magic bytes validation.
 */
export function uploadMiddleware(fieldName: string) {
  const uploadSingle = multerUpload.single(fieldName);

  return (req: Request, res: Response, next: NextFunction) => {
    uploadSingle(req, res, async (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(
              new AppError(
                400,
                'VALIDATION_FAILED',
                'File exceeds 5MB size limit. Please upload a smaller image.'
              )
            );
          }
          return next(new AppError(400, 'VALIDATION_FAILED', err.message));
        }
        return next(err);
      }

      if (!req.file) {
        return next(new AppError(400, 'VALIDATION_FAILED', 'Media file evidence is required.'));
      }

      // Execute Magic Byte Header Check
      const isValidMagic = await validateMagicBytes(req.file.buffer);
      if (!isValidMagic) {
        return next(
          new AppError(
            400,
            'VALIDATION_FAILED',
            'File content does not match allowed image signatures (magic bytes verification failed).'
          )
        );
      }

      next();
    });
  };
}
