import mongoose from 'mongoose';
import { env } from './env';

export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(env.MONGODB_URI);

    console.log(
      `MongoDB connected successfully to database "${mongoose.connection.name}" on host "${mongoose.connection.host}".`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database connection error';
    console.error(`MongoDB connection failed: ${message}`);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
};
