import { Document, Types, PopulateOptions } from 'mongoose';
import { BaseService } from './BaseService';
import Order from '../models/Order';
import { IOrder, OrderStatus, PaymentStatus } from '../types/models';
import { productService } from './ProductService';
import dbConnect from '../lib/dbConnect';

export interface OrderDocument extends IOrder, Document {}

export interface OrderItem {
  product: string;
  quantity: number;
  price: number;
}

export interface OrderAddress {
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

export interface OrderCreateData {
  user: string;
  items: OrderItem[];
  shippingAddress: OrderAddress;
  paymentMethod: string;
}

export interface OrderUpdateData {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  trackingNumber?: string;
  shippingAddress?: OrderAddress;
}

class OrderService extends BaseService<OrderDocument> {
  constructor() {
    super(Order);
  }

  // Create a new order
  async createOrder(data: OrderCreateData): Promise<OrderDocument> {
    await this.ensureConnection();
    const mongoose = (await dbConnect()).default;
    const session = await mongoose.startSession();

    try {
      let order: OrderDocument | null = null;

      // Validate and calculate total
      const items = await Promise.all(
        data.items.map(async (item) => {
          const product = await productService.findById(item.product);
          if (!product) {
            throw new Error(`Product not found: ${item.product}`);
          }
          if ((product.stock || 0) < item.quantity) {
            throw new Error(`Insufficient stock for product: ${product.name || 'Unknown'}`);
          }
          return {
            ...item,
            product: new Types.ObjectId(item.product),
            price: product.price || 0
          };
        })
      );

      const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // Start transaction
      await session.startTransaction();

      try {
        // Create order
        order = await super.create({
          user: new Types.ObjectId(data.user),
          items,
          total,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          shippingAddress: data.shippingAddress,
          paymentMethod: data.paymentMethod
        }, { session });

        // Update product stock
        await Promise.all(
          items.map(item =>
            productService.update(item.product.toString(), {
              $inc: { stock: -item.quantity }
            }, { session })
          )
        );

        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        throw error;
      }

      if (!order) {
        throw new Error('Failed to create order');
      }

      return this.findById(order.id, {
        populate: [
          { path: 'user', select: 'name email' },
          { path: 'items.product', select: 'name image price' }
        ]
      }) as Promise<OrderDocument>;
    } finally {
      await session.endSession();
    }
  }

  // Update order status
  async updateOrder(id: string, data: OrderUpdateData): Promise<OrderDocument | null> {
    await this.ensureConnection();
    const mongoose = (await dbConnect()).default;
    const session = await mongoose.startSession();

    try {
      await session.startTransaction();

      const order = await super.update(id, {
        ...data,
        ...(data.status === OrderStatus.DELIVERED && { deliveredAt: new Date() })
      }, { session });

      if (!order) {
        await session.abortTransaction();
        return null;
      }

      await session.commitTransaction();

      return this.findById(order.id, {
        populate: [
          { path: 'user', select: 'name email' },
          { path: 'items.product', select: 'name image price' }
        ]
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  // Cancel order and restore stock
  async cancelOrder(id: string): Promise<OrderDocument | null> {
    await this.ensureConnection();
    const mongoose = (await dbConnect()).default;
    const session = await mongoose.startSession();

    try {
      await session.startTransaction();

      const order = await this.findById(id);
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PROCESSING) {
        throw new Error('Cannot cancel order that has been shipped or delivered');
      }

      // Restore product stock
      await Promise.all(
        order.items.map(item =>
          productService.update(item.product.toString(), {
            $inc: { stock: item.quantity }
          }, { session })
        )
      );

      // Update order status
      const cancelledOrder = await super.update(id, {
        status: OrderStatus.CANCELLED,
        $set: { cancelledAt: new Date() }
      }, { session });

      if (!cancelledOrder) {
        throw new Error('Failed to cancel order');
      }

      await session.commitTransaction();

      return this.findById(cancelledOrder.id, {
        populate: [
          { path: 'user', select: 'name email' },
          { path: 'items.product', select: 'name image price' }
        ]
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  // Find orders by user
  async findByUser(userId: string, options = {}) {
    const populateOptions: PopulateOptions[] = [
      { path: 'items.product', select: 'name image price' }
    ];

    return this.find(
      { user: new Types.ObjectId(userId) },
      {
        ...options,
        sort: { createdAt: -1 },
        populate: populateOptions
      }
    );
  }

  // Find orders by status
  async findByStatus(status: OrderStatus, options = {}) {
    const populateOptions: PopulateOptions[] = [
      { path: 'user', select: 'name email' },
      { path: 'items.product', select: 'name image price' }
    ];

    return this.find(
      { status },
      {
        ...options,
        sort: { createdAt: -1 },
        populate: populateOptions
      }
    );
  }

  // Get order statistics
  async getStats(startDate?: Date, endDate?: Date) {
    await this.ensureConnection();

    const dateMatch = {
      ...(startDate && { $gte: startDate }),
      ...(endDate && { $lte: endDate })
    };

    const stats = await this.aggregate([
      {
        $match: {
          ...(Object.keys(dateMatch).length > 0 && { createdAt: dateMatch })
        }
      },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: '$total' },
                averageOrderValue: { $avg: '$total' }
              }
            }
          ],
          statusBreakdown: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                revenue: { $sum: '$total' }
              }
            }
          ],
          dailyOrders: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                orders: { $sum: 1 },
                revenue: { $sum: '$total' }
              }
            },
            { $sort: { '_id': -1 } }
          ],
          topProducts: [
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.product',
                totalQuantity: { $sum: '$items.quantity' },
                totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
              }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 }
          ]
        }
      }
    ]);

    const result = stats[0];
    return {
      overview: result.overview[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0
      },
      statusBreakdown: result.statusBreakdown,
      dailyOrders: result.dailyOrders,
      topProducts: await Promise.all(
        result.topProducts.map(async (item: any) => {
          const product = await productService.findById(item._id);
          return {
            ...item,
            product: product ? {
              id: product.id,
              name: product.name || 'Unknown',
              image: product.image || ''
            } : null
          };
        })
      )
    };
  }
}

// Export a singleton instance
export const orderService = new OrderService();
