import { UserRole } from '../../modules/users/user.types';

export interface AuthenticatedUser {
  userId: string;
  role: UserRole;
}
