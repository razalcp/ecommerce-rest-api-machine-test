import { AppError } from './app-error';
import { HttpStatus } from './http-status';

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, HttpStatus.NOT_FOUND, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}
