import { RequestHandler } from 'express';
import { UserRole } from '../../modules/users/user.types';
import { AppError } from '../errors/app-error';
import { HttpStatus } from '../errors/http-status';

export const authorizeRoles = (...allowedRoles: UserRole[]): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user) {
      next(
        new AppError(
          'Authentication required',
          HttpStatus.UNAUTHORIZED,
          'AUTHENTICATION_REQUIRED'
        )
      );
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(
        new AppError(
          'You do not have permission to perform this action',
          HttpStatus.FORBIDDEN,
          'FORBIDDEN'
        )
      );
      return;
    }

    next();
  };
};
