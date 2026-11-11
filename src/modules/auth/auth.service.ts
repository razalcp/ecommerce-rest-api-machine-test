import { AppError } from '../../shared/errors/app-error';
import { HttpStatus } from '../../shared/errors/http-status';
import { hashPassword, verifyPassword } from '../../shared/utils/password.util';
import { userRepository } from '../users/user.repository';
import { USER_ROLES, UserDocument } from '../users/user.types';
import { AuthResult, AuthUser, LoginInput, RegisterInput } from './auth.types';
import { createAccessToken } from './token.service';

const EMAIL_ALREADY_EXISTS_MESSAGE = 'An account with this email already exists';
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

const isDuplicateKeyError = (error: unknown): boolean => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
};

const toAuthUser = (user: UserDocument): AuthUser => ({
  id: user._id.toString(),
  fullName: user.fullName,
  email: user.email,
  role: user.role,
});

const buildAuthResult = (user: UserDocument): AuthResult => {
  const token = createAccessToken({
    userId: user._id.toString(),
    role: user.role,
    tokenVersion: user.tokenVersion,
  });

  return {
    user: toAuthUser(user),
    token,
  };
};

export const registerUser = async (input: RegisterInput): Promise<AuthResult> => {
  const email = input.email.trim().toLowerCase();

  const existingUser = await userRepository.findByEmail(email);

  if (existingUser) {
    throw new AppError(
      EMAIL_ALREADY_EXISTS_MESSAGE,
      HttpStatus.CONFLICT,
      'EMAIL_ALREADY_EXISTS'
    );
  }

  const passwordHash = await hashPassword(input.password);

  try {
    const user = await userRepository.create({
      fullName: input.fullName,
      email,
      passwordHash,
      role: USER_ROLES.CUSTOMER,
    });

    return buildAuthResult(user);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(
        EMAIL_ALREADY_EXISTS_MESSAGE,
        HttpStatus.CONFLICT,
        'EMAIL_ALREADY_EXISTS'
      );
    }

    throw error;
  }
};

export const loginUser = async (input: LoginInput): Promise<AuthResult> => {
  const email = input.email.trim().toLowerCase();
  const user = await userRepository.findByEmail(email, true);

  if (!user || !user.passwordHash) {
    throw new AppError(
      INVALID_CREDENTIALS_MESSAGE,
      HttpStatus.UNAUTHORIZED,
      'INVALID_CREDENTIALS'
    );
  }

  const isPasswordValid = await verifyPassword(input.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AppError(
      INVALID_CREDENTIALS_MESSAGE,
      HttpStatus.UNAUTHORIZED,
      'INVALID_CREDENTIALS'
    );
  }

  if (!user.isActive) {
    throw new AppError('Account is inactive', HttpStatus.FORBIDDEN, 'ACCOUNT_INACTIVE');
  }

  return buildAuthResult(user);
};
