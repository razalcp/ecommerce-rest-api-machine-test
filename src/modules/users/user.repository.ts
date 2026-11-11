import { UserModel } from './user.model';
import {
  CreateUserInput,
  UserDocument,
  UserId,
  UserRepository,
} from './user.types';

export class MongooseUserRepository implements UserRepository {
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
}

export const userRepository: UserRepository = new MongooseUserRepository();
