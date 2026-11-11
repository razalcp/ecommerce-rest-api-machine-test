import { z } from 'zod';
import '../config/env';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { userRepository } from '../modules/users/user.repository';
import { USER_ROLES } from '../modules/users/user.types';
import { hashPassword } from '../shared/utils/password.util';

const seedEnvSchema = z.object({
  ADMIN_SEED_NAME: z
    .string({ error: 'ADMIN_SEED_NAME is required' })
    .trim()
    .min(2, 'ADMIN_SEED_NAME must be at least 2 characters long')
    .max(100, 'ADMIN_SEED_NAME must be at most 100 characters long'),
  ADMIN_SEED_EMAIL: z
    .string({ error: 'ADMIN_SEED_EMAIL is required' })
    .trim()
    .toLowerCase()
    .email('ADMIN_SEED_EMAIL must be a valid email address'),
  ADMIN_SEED_PASSWORD: z
    .string({ error: 'ADMIN_SEED_PASSWORD is required' })
    .min(5, 'ADMIN_SEED_PASSWORD must be at least 16 characters long')
    .refine(
      (password) => Buffer.byteLength(password, 'utf8') <= 72,
      'ADMIN_SEED_PASSWORD must not exceed 72 UTF-8 bytes'
    ),
});

interface SeedAdminConfig {
  fullName: string;
  email: string;
  password: string;
}

class SeedError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'SeedError';
  }
}

const isDuplicateKeyError = (error: unknown): boolean => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
};

const parseSeedConfig = (): SeedAdminConfig => {
  const parsed = seedEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => {
        const path = issue.path.join('.') || 'ENV';
        return `${path}: ${issue.message}`;
      })
      .join('\n');

    throw new SeedError(`Invalid Admin seed configuration:\n${details}`);
  }

  return {
    fullName: parsed.data.ADMIN_SEED_NAME,
    email: parsed.data.ADMIN_SEED_EMAIL,
    password: parsed.data.ADMIN_SEED_PASSWORD,
  };
};

const reportExistingAdmin = (email: string): void => {
  console.log(`Admin account already exists for ${email}. No changes were made.`);
};

const reportExistingCustomer = (email: string): never => {
  throw new SeedError(
    `An account with email ${email} already exists but is not an ADMIN. Refusing to promote or modify it.`
  );
};

const seedAdmin = async (config: SeedAdminConfig): Promise<void> => {
  const existingUser = await userRepository.findByEmail(config.email);

  if (existingUser) {
    if (existingUser.role === USER_ROLES.ADMIN) {
      reportExistingAdmin(config.email);
      return;
    }

    reportExistingCustomer(config.email);
  }

  const passwordHash = await hashPassword(config.password);

  try {
    await userRepository.create({
      fullName: config.fullName,
      email: config.email,
      passwordHash,
      role: USER_ROLES.ADMIN,
      isActive: true,
    });

    console.log(`Admin account created successfully for ${config.email}.`);
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    const duplicateUser = await userRepository.findByEmail(config.email);

    if (duplicateUser?.role === USER_ROLES.ADMIN) {
      reportExistingAdmin(config.email);
      return;
    }

    if (duplicateUser) {
      reportExistingCustomer(config.email);
    }

    throw new SeedError(
      `An account with email ${config.email} already exists. No changes were made.`
    );
  }
};

const main = async (): Promise<void> => {
  const config = parseSeedConfig();

  try {
    await connectDatabase();
    await seedAdmin(config);
  } finally {
    try {
      await disconnectDatabase();
    } catch {
      console.error('Failed to close the MongoDB connection cleanly.');
      process.exitCode = 1;
    }
  }
};

void main().catch((error: unknown) => {
  if (error instanceof SeedError) {
    console.error(error.message);
  } else {
    console.error(
      'Admin seed failed due to an unexpected error. Check the database connection and configuration.'
    );
  }

  process.exitCode = 1;
});
