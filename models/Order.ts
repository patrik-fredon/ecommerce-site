import mongoose from 'mongoose';

export interface OrderItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface OrderNote {
  content: string;
  addedBy: string;
  addedAt: Date;
}

export interface IOrder extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  notes: OrderNote[];
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
}

interface IOrderModel extends mongoose.Model<IOrder> {
  findByUser(userId: string): Promise<IOrder[]>;
  findPending(): Promise<IOrder[]>;
  updateStatus(id: string, status: IOrder['status']): Promise<IOrder | null>;
}

const orderSchema = new mongoose.Schema<IOrder, IOrderModel>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
          min: [0, 'Price cannot be negative'],
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, 'Quantity must be at least 1'],
        },
        subtotal: {
          type: Number,
          required: true,
          min: [0, 'Subtotal cannot be negative'],
        },
      },
    ],
    total: {
      type: Number,
      required: true,
      min: [0, 'Total cannot be negative'],
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    shippingAddress: {
      street: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      zipCode: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        required: true,
      },
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
    notes: [
      {
        content: {
          type: String,
          required: true,
        },
        addedBy: {
          type: String,
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add indexes for common queries
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ 'items.productId': 1 });

// Static methods
orderSchema.statics.findByUser = function(userId: string) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .exec();
};

orderSchema.statics.findPending = function() {
  return this.find({ status: 'pending' })
    .sort({ createdAt: 1 })
    .exec();
};

orderSchema.statics.updateStatus = async function(id: string, status: IOrder['status']) {
  const updates: any = { status };
  
  // Add timestamp based on status
  switch (status) {
    case 'shipped':
      updates.shippedAt = new Date();
      break;
    case 'delivered':
      updates.deliveredAt = new Date();
      break;
    case 'cancelled':
      updates.cancelledAt = new Date();
      break;
  }

  return this.findByIdAndUpdate(id, { $set: updates }, { new: true });
};

// Virtuals
orderSchema.virtual('itemCount').get(function(this: IOrder) {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

const Order = mongoose.models.Order || mongoose.model<IOrder, IOrderModel>('Order', orderSchema);

export default Order;
