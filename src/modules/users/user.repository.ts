import { QueryFilter } from 'mongoose';
import { UserModel } from './user.model';
import {
  CreateUserInput,
  PaginationOptions,
  UpdateProfileInput,
  User,
  UserDocument,
  UserId,
  UserListFilters,
  UserRepository,
} from './user.types';

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export class MongooseUserRepository implements UserRepository {
  private buildFilter(filters: UserListFilters): QueryFilter<User> {
    const filter: QueryFilter<User> = {};

    if (filters.search) {
      const search = escapeRegex(filters.search.trim());

      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (filters.role) {
      filter.role = filters.role;
    }

    if (filters.isActive !== undefined) {
      filter.isActive = filters.isActive;
    }

    return filter;
  }

  public async create(userData: CreateUserInput): Promise<UserDocument> {
    return UserModel.create(userData);
  }

  public async findById(userId: UserId): Promise<UserDocument | null> {
    return UserModel.findById(userId).exec();
  }

  public async findByEmail(
    email: string,
    includePasswordHash = false
  ): Promise<UserDocument | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const query = UserModel.findOne({ email: normalizedEmail });

    if (includePasswordHash) {
      query.select('+passwordHash');
    }

    return query.exec();
  }

  public async updateProfile(
    userId: UserId,
    input: UpdateProfileInput
  ): Promise<UserDocument | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      { $set: { fullName: input.fullName } },
      { returnDocument: 'after', runValidators: true }
    ).exec();
  }

  public async findUsers(
    filters: UserListFilters,
    pagination: PaginationOptions
  ): Promise<UserDocument[]> {
    const skip = (pagination.page - 1) * pagination.limit;

    return UserModel.find(this.buildFilter(filters))
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(pagination.limit)
      .exec();
  }

  public async countUsers(filters: UserListFilters): Promise<number> {
    return UserModel.countDocuments(this.buildFilter(filters)).exec();
  }

  public async updateActiveStatus(
    userId: UserId,
    isActive: boolean
  ): Promise<UserDocument | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      { $set: { isActive } },
      { returnDocument: 'after', runValidators: true }
    ).exec();
  }

  public async incrementTokenVersion(userId: UserId): Promise<UserDocument | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      { $inc: { tokenVersion: 1 } },
      { returnDocument: 'after', runValidators: true }
    ).exec();
  }

  public async updateAccountStatusAndIncrementTokenVersion(
    userId: UserId,
    isActive: boolean
  ): Promise<UserDocument | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      {
        $set: { isActive },
        $inc: { tokenVersion: 1 },
      },
      { returnDocument: 'after', runValidators: true }
    ).exec();
  }
}

export const userRepository: UserRepository = new MongooseUserRepository();
