import type { NextApiResponse } from 'next';
import { withAdminAuth } from '../../../../middleware/adminAuth';
import { AuthRequest } from '../../../../types/auth';
import dbConnect from '../../../../lib/dbConnect';
import Order from '../../../../models/Order';
import { logModelActivity } from '../../../../utils/adminActivity';
import { ActivityType, ActivitySubject } from '../../../../utils/adminActivity';
import { withErrorHandler } from '../../../../utils/adminErrorHandler';
import { withCache, CacheTags, CacheConfigs, combineTags } from '../../../../utils/adminCache';
import {
  sendSuccess,
  sendError,
  sendNotFound,
  sendBadRequest,
  sendMethodNotAllowed,
} from '../../../../utils/adminResponse';

async function orderHandler(req: AuthRequest, res: NextApiResponse) {
  const {
    query: { id },
    method,
  } = req;

  await dbConnect();

  switch (method) {
    case 'GET':
      try {
        const order = await Order.findById(id)
          .populate('userId', 'name email')
          .populate('items.productId', 'name sku stock')
          .lean();

        if (!order) {
          return sendNotFound(res, 'Order not found');
        }

        return sendSuccess(res, order);
      } catch (error) {
        throw error;
      }
      break;

    case 'PUT':
      try {
        const updates = req.body;
        
        // Don't allow direct status updates through this endpoint
        if (updates.status) {
          delete updates.status;
        }

        const order = await Order.findByIdAndUpdate(
          id,
          { $set: updates },
          { new: true, runValidators: true }
        );

        if (!order) {
          return sendNotFound(res, 'Order not found');
        }

        await logModelActivity({
          req,
          action: ActivityType.ORDER_STATUS_UPDATED,
          subject: ActivitySubject.ORDER,
          itemName: `#${order._id}`,
        });

        return sendSuccess(res, order, 'Order updated successfully');
      } catch (error) {
        throw error;
      }
      break;

    case 'PATCH':
      try {
        const { operation } = req.body;

        if (!operation) {
          return sendBadRequest(res, 'Operation not specified');
        }

        let order;
        switch (operation) {
          case 'update-status':
            const { status } = req.body;
            const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
            
            if (!validStatuses.includes(status)) {
              return sendBadRequest(res, 'Invalid status');
            }

            order = await Order.findByIdAndUpdate(
              id,
              {
                $set: {
                  status,
                  ...(status === 'delivered' && { deliveredAt: new Date() }),
                  ...(status === 'shipped' && { shippedAt: new Date() }),
                }
              },
              { new: true }
            );
            if (!order) {
              return sendNotFound(res, 'Order not found');
            }

            await logModelActivity({
              req,
              action: ActivityType.ORDER_STATUS_UPDATED,
              subject: ActivitySubject.ORDER,
              itemName: `#${order._id}`,
              details: `Status updated to "${status}"`,
            });

            return sendSuccess(res, order);

          case 'update-payment':
            const { paymentStatus } = req.body;
            const validPaymentStatuses = ['pending', 'completed', 'failed', 'refunded'];

            if (!validPaymentStatuses.includes(paymentStatus)) {
              return sendBadRequest(res, 'Invalid payment status');
            }

            order = await Order.findByIdAndUpdate(
              id,
              { $set: { paymentStatus } },
              { new: true }
            );

            if (!order) {
              return sendNotFound(res, 'Order not found');
            }

            await logModelActivity({
              req,
              action: ActivityType.ORDER_PAYMENT_UPDATED,
              subject: ActivitySubject.ORDER,
              itemName: `#${order._id}`,
              details: `Payment status updated to "${paymentStatus}"`,
            });

            return sendSuccess(res, order);

          case 'add-note':
            const { note } = req.body;
            if (!note) {
              return sendBadRequest(res, 'Note is required');
            }

            order = await Order.findByIdAndUpdate(
              id,
              {
                $push: {
                  notes: {
                    content: note,
                    addedBy: req.user?.name || 'Admin',
                    addedAt: new Date(),
                  },
                },
              },
              { new: true }
            );

            if (!order) {
              return sendNotFound(res, 'Order not found');
            }

            await logModelActivity({
              req,
              action: ActivityType.ORDER_NOTE_ADDED,
              subject: ActivitySubject.ORDER,
              itemName: `#${order._id}`,
              details: note,
            });

            return sendSuccess(res, order);

          default:
            return sendBadRequest(res, 'Invalid operation');
        }
      } catch (error) {
        throw error;
      }
      break;

    default:
      return sendMethodNotAllowed(res, ['GET', 'PUT', 'PATCH']);
  }
}

export default withAdminAuth(
  withCache(
    withErrorHandler(
      orderHandler,
      'manage',
      'Order',
      'Error managing order'
    ),
    {
      ...CacheConfigs.shortTerm,
      tags: combineTags(
        [CacheTags.ORDERS],
        [CacheTags.STATS]
      ),
    }
  )
);
