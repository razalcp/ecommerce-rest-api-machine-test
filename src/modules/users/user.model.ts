import { model, Model, Schema } from 'mongoose';
import { USER_ROLES, User } from './user.types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const removeSensitiveFields = (
  _document: unknown,
  returnedObject: Record<string, unknown>
): Record<string, unknown> => {
  delete returnedObject.passwordHash;
  delete returnedObject.__v;
  return returnedObject;
};

const userSchema = new Schema<User>(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters long'],
      maxlength: [100, 'Full name must be at most 100 characters long'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      unique: true,
      match: [EMAIL_PATTERN, 'Email must be a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: Object.values(USER_ROLES),
        message: '{VALUE} is not a supported role',
      },
      required: [true, 'Role is required'],
      default: USER_ROLES.CUSTOMER,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tokenVersion: {
      type: Number,
      default: 0,
      min: [0, 'Token version cannot be negative'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: removeSensitiveFields,
    },
    toObject: {
      transform: removeSensitiveFields,
    },
  }
);

userSchema.index({ role: 1, isActive: 1, createdAt: -1 });

export const UserModel: Model<User> = model<User>('User', userSchema);
