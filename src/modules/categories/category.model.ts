import { model, Model, Schema } from 'mongoose';
import { Category } from './category.types';

const categorySchema = new Schema<Category>(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters long'],
      maxlength: [100, 'Category name must be at most 100 characters long'],
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    ancestors: {
      type: [Schema.Types.ObjectId],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.index({ parentId: 1 });
categorySchema.index({ ancestors: 1 });

export const CategoryModel: Model<Category> = model<Category>('Category', categorySchema);
