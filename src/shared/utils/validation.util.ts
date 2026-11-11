import { ZodError, ZodType } from 'zod';
import { AppError } from '../errors/app-error';
import { HttpStatus } from '../errors/http-status';

export const formatZodIssues = (error: ZodError): string => {
  return error.issues
    .map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join(', ');
};

export const parseWithSchema = <T>(schema: ZodType<T>, input: unknown): T => {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new AppError(
      formatZodIssues(result.error),
      HttpStatus.UNPROCESSABLE_ENTITY,
      'VALIDATION_ERROR'
    );
  }

  return result.data;
};
