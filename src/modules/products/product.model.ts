import { model, Model, Schema } from 'mongoose';
import { Product, PRODUCT_STATUSES } from './product.types';

const hasAtMostTwoDecimalPlaces = (value: number): boolean =>
  Number(value.toFixed(2)) === value;

const removeInternalFields = (
  _document: unknown,
  returnedObject: Record<string, unknown>
): Record<string, unknown> => {
  delete returnedObject.__v;
  delete returnedObject.stockRestorationKeys;
  return returnedObject;
};

const productSchema = new Schema<Product>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Product name must be at least 2 characters long'],
      maxlength: [150, 'Product name must be at most 150 characters long'],
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      trim: true,
      uppercase: true,
      unique: true,
      minlength: [2, 'SKU must be at least 2 characters long'],
      maxlength: [50, 'SKU must be at most 50 characters long'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description must be at most 2000 characters long'],
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      validate: [
        {
          validator: Number.isFinite,
          message: 'Price must be a finite number',
        },
        {
          validator: (value: number) => value > 0,
          message: 'Price must be greater than zero',
        },
        {
          validator: hasAtMostTwoDecimalPlaces,
          message: 'Price must have at most two decimal places',
        },
      ],
    },
    salePrice: {
      type: Number,
      default: null,
      validate: [
        {
          validator: (value: number | null) => value === null || Number.isFinite(value),
          message: 'Sale price must be a finite number',
        },
        {
          validator: (value: number | null) => value === null || value > 0,
          message: 'Sale price must be greater than zero',
        },
        {
          validator: (value: number | null) =>
            value === null || hasAtMostTwoDecimalPlaces(value),
          message: 'Sale price must have at most two decimal places',
        },
      ],
    },
    stock: {
      type: Number,
      required: [true, 'Stock is required'],
      default: 0,
      min: [0, 'Stock cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Stock must be an integer',
      },
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    status: {
      type: String,
      enum: {
        values: Object.values(PRODUCT_STATUSES),
        message: '{VALUE} is not a supported product status',
      },
      default: PRODUCT_STATUSES.ACTIVE,
    },
    stockRestorationKeys: {
      type: [String],
      default: [],
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: removeInternalFields,
    },
    toObject: {
      transform: removeInternalFields,
    },
  }
);

productSchema.index({ category: 1, status: 1 });
productSchema.index({ createdAt: -1 });

export const ProductModel: Model<Product> = model<Product>('Product', productSchema);
