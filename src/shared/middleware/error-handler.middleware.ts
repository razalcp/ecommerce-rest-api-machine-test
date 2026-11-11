import { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { env } from '../../config/env';
import { AppError } from '../errors/app-error';
import { HttpStatus } from '../errors/http-status';

interface ErrorResponseBody {
  success: false;
  message: string;
  error: {
    code: string;
  };
}

interface DuplicateKeyError {
  code: number;
  keyValue?: Record<string, unknown>;
}

const isDuplicateKeyError = (error: unknown): error is DuplicateKeyError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
};

const isProduction = env.NODE_ENV === 'production';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
  let message = 'Internal server error';
  let code = 'INTERNAL_SERVER_ERROR';

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.isOperational || !isProduction ? error.message : 'Internal server error';

    if (!error.isOperational && isProduction) {
      code = 'INTERNAL_SERVER_ERROR';
    }
  } else if (error instanceof mongoose.Error.ValidationError) {
    statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
    code = 'VALIDATION_ERROR';
    message = Object.values(error.errors)
      .map((validationError) => validationError.message)
      .join(', ');
  } else if (error instanceof mongoose.Error.CastError) {
    statusCode = HttpStatus.BAD_REQUEST;
    code = 'INVALID_IDENTIFIER';
    message = `Invalid value provided for ${error.path}`;
  } else if (isDuplicateKeyError(error)) {
    statusCode = HttpStatus.CONFLICT;
    code = 'DUPLICATE_KEY';

    const fields = error.keyValue ? Object.keys(error.keyValue) : [];
    message =
      fields.length > 0
        ? `Duplicate value for: ${fields.join(', ')}`
        : 'Duplicate value provided';
  } else {
    message = isProduction
      ? 'Internal server error'
      : error instanceof Error
        ? error.message
        : 'Internal server error';
  }

  if (!(error instanceof AppError) || !error.isOperational) {
    const logMessage = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error(`[error] ${logMessage}`);
  }

  const body: ErrorResponseBody = {
    success: false,
    message,
    error: { code },
  };

  res.status(statusCode).json(body);
};
