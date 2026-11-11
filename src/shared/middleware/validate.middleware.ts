import { RequestHandler } from 'express';
import { ZodType } from 'zod';
import { AppError } from '../errors/app-error';
import { HttpStatus } from '../errors/http-status';

export const validateBody = <T>(schema: ZodType<T>): RequestHandler => {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const message = result.error.issues
        .map((issue) => {
          const path = issue.path.join('.');
          return path ? `${path}: ${issue.message}` : issue.message;
        })
        .join(', ');

      next(new AppError(message, HttpStatus.UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR'));
      return;
    }

    req.body = result.data;
    next();
  };
};
