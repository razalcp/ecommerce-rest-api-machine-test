import { model, Model, Schema } from 'mongoose';
import {
  INVENTORY_STATUSES,
  Order,
  OrderItem,
  ORDER_CURRENCIES,
  ORDER_STATUSES,
} from './order.types';

const removeInternalFields = (
  _document: unknown,
  returnedObject: Record<string, unknown>
): Record<string, unknown> => {
  delete returnedObject.__v;
  return returnedObject;
};

const safeIntegerValidator = (value: number): boolean => Number.isSafeInteger(value);

const orderItemSchema = new Schema<OrderItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    name: {
      type: String,
      required: [true, 'Product name snapshot is required'],
      trim: true,
      maxlength: [150, 'Product name snapshot must be at most 150 characters long'],
    },
    sku: {
      type: String,
      required: [true, 'Product SKU snapshot is required'],
      trim: true,
      uppercase: true,
      maxlength: [50, 'Product SKU snapshot must be at most 50 characters long'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      validate: [
        {
          validator: Number.isInteger,
          message: 'Quantity must be an integer',
        },
        {
          validator: (value: number) => value <= 1000,
          message: 'Quantity must not exceed 1000',
        },
      ],
    },
    unitPricePaise: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [1, 'Unit price must be greater than zero'],
      validate: {
        validator: safeIntegerValidator,
        message: 'Unit price must be a safe integer number of paise',
      },
    },
    lineTotalPaise: {
      type: Number,
      required: [true, 'Line total is required'],
      min: [1, 'Line total must be greater than zero'],
      validate: {
        validator: safeIntegerValidator,
        message: 'Line total must be a safe integer number of paise',
      },
    },
  },
  {
    _id: false,
  }
);

const orderSchema = new Schema<Order>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer ID is required'],
    },
    items: {
      type: [orderItemSchema],
      required: [true, 'Order items are required'],
      validate: {
        validator: (items: OrderItem[]) => items.length > 0,
        message: 'An order must contain at least one item',
      },
    },
    subtotalPaise: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [1, 'Subtotal must be greater than zero'],
      validate: {
        validator: safeIntegerValidator,
        message: 'Subtotal must be a safe integer number of paise',
      },
    },
    totalPaise: {
      type: Number,
      required: [true, 'Total is required'],
      min: [1, 'Total must be greater than zero'],
      validate: {
        validator: safeIntegerValidator,
        message: 'Total must be a safe integer number of paise',
      },
    },
    currency: {
      type: String,
      enum: {
        values: Object.values(ORDER_CURRENCIES),
        message: '{VALUE} is not a supported currency',
      },
      required: [true, 'Currency is required'],
      default: ORDER_CURRENCIES.INR,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(ORDER_STATUSES),
        message: '{VALUE} is not a supported order status',
      },
      required: [true, 'Order status is required'],
      default: ORDER_STATUSES.PENDING,
    },
    inventoryStatus: {
      type: String,
      enum: {
        values: Object.values(INVENTORY_STATUSES),
        message: '{VALUE} is not a supported inventory status',
      },
      required: [true, 'Inventory status is required'],
      default: INVENTORY_STATUSES.RESERVED,
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

orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

export const OrderModel: Model<Order> = model<Order>('Order', orderSchema);
