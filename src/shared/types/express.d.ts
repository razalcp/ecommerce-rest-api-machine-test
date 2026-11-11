import { AuthenticatedUser } from './auth-user.type';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
