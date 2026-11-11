import { RequestHandler } from 'express';
import { ZodType } from 'zod';
import { AppError } from '../errors/app-error';
import { HttpStatus } from '../errors/http-status';
import { formatZodIssues } from '../utils/validation.util';

export const validateBody = <T>(schema: ZodType<T>): RequestHandler => {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      next(
        new AppError(
          formatZodIssues(result.error),
          HttpStatus.UNPROCESSABLE_ENTITY,
          'VALIDATION_ERROR'
        )
      );
      return;
    }

    req.body = result.data;
    next();
  };
};
