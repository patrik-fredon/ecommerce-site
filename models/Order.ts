import mongoose, { Model } from 'mongoose';
import { IOrder, IOrderMethods, IAddress, OrderStatus, PaymentStatus } from '../types/models';

interface IOrderModel extends Model<IOrder, {}, IOrderMethods> {
  findByUser(userId: mongoose.Types.ObjectId): Promise<IOrder[]>;
  findPending(): Promise<IOrder[]>;
  findByStatus(status: string): Promise<IOrder[]>;
}

const addressSchema = new mongoose.Schema<IAddress>({
  street: {
    type: String,
    required: [true, 'Street address is required'],
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true
  },
  zipCode: {
    type: String,
    required: [true, 'ZIP code is required'],
    trim: true
  }
});

const orderSchema = new mongoose.Schema<IOrder, IOrderModel>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    },
    items: [{
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1']
      },
      price: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative']
      }
    }],
    total: {
      type: Number,
      required: true,
      min: [0, 'Total cannot be negative']
    },
      status: {
        type: String,
        enum: Object.values(OrderStatus),
        default: OrderStatus.PENDING
      },
    shippingAddress: {
      type: addressSchema,
      required: true
    },
      paymentStatus: {
        type: String,
        enum: Object.values(PaymentStatus),
        default: PaymentStatus.PENDING
      },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      trim: true
    },
    trackingNumber: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ 'items.product': 1 });

// Instance methods
// Instance methods
orderSchema.methods.updateStatus = async function(status: OrderStatus): Promise<IOrder> {
  this.status = status;
  if (status === OrderStatus.DELIVERED) {
    this.deliveredAt = new Date();
  }
  return this.save();
};

orderSchema.methods.updatePaymentStatus = async function(status: PaymentStatus): Promise<IOrder> {
  this.paymentStatus = status;
  if (status === PaymentStatus.PAID) {
    this.paidAt = new Date();
  }
  return this.save();
};

orderSchema.methods.cancel = async function(): Promise<IOrder> {
  if (this.status !== OrderStatus.PENDING && this.status !== OrderStatus.PROCESSING) {
    throw new Error('Cannot cancel order that has been shipped or delivered');
  }
  this.status = OrderStatus.CANCELLED;
  return this.save();
};

// Static methods
orderSchema.statics.findByUser = function(userId: mongoose.Types.ObjectId) {
  return this.find({ user: userId })
    .populate('items.product', 'name image price')
    .sort({ createdAt: -1 })
    .exec();
};

orderSchema.statics.findPending = function() {
  return this.find({ status: 'pending' })
    .populate('user', 'name email')
    .populate('items.product', 'name price')
    .sort({ createdAt: 1 })
    .exec();
};

orderSchema.statics.findByStatus = function(status: OrderStatus) {
  return this.find({ status })
    .populate('user', 'name email')
    .populate('items.product', 'name price')
    .sort({ createdAt: -1 })
    .exec();
};

// Middleware
orderSchema.pre('save', async function(next) {
if (this.isModified('status') && this.status === OrderStatus.DELIVERED) {
    // Update product stock when order is delivered
    const Product = mongoose.model('Product');
    for (const item of this.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity }
      });
    }
  }
  next();
});

// Virtuals
orderSchema.virtual('itemCount').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

const Order = (mongoose.models.Order as IOrderModel) ||
  mongoose.model<IOrder, IOrderModel>('Order', orderSchema);

export default Order;
