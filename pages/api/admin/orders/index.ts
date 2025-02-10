import type { NextApiResponse } from 'next';
import { withAdminAuth } from '../../../../middleware/adminAuth';
import { AuthRequest } from '../../../../types/auth';
import dbConnect from '../../../../lib/dbConnect';
import Order from '../../../../models/Order';
import { logBulkActivity } from '../../../../utils/adminActivity';
import { ActivityType, ActivitySubject } from '../../../../utils/adminActivity';
import { withErrorHandler } from '../../../../utils/adminErrorHandler';
import { withCache, CacheTags, CacheConfigs, combineTags } from '../../../../utils/adminCache';
import { validateRequest, validateRequestAndSendError } from '../../../../utils/adminValidation';
import {
  ValidationPatterns,
  validateAndSendIdErrors,
  ValidationMessages,
  ObjectIdRule,
} from '../../../../utils/adminValidators';
import {
  sendSuccess,
  sendError,
  sendBadRequest,
  sendMethodNotAllowed,
  sendPaginated,
} from '../../../../utils/adminResponse';
import {
  getPaginationParams,
  buildQuery,
  applyFilters,
} from '../../../../utils/adminPagination';

async function ordersHandler(req: AuthRequest, res: NextApiResponse) {
  const { method } = req;

  await dbConnect();

  switch (method) {
    case 'GET':
      try {
        const { skip, limit, page, sort } = getPaginationParams(req, {
          defaultLimit: 50,
          maxLimit: 100,
        });

        const query = buildQuery(req, {
          search: {
            fields: ['_id', 'userId.name', 'userId.email'],
            term: req.query.search as string,
          },
          dateRange: {
            field: 'createdAt',
            start: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
            end: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
          },
        });

        const filters = applyFilters(req, [
          { 
            field: 'status', 
            values: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], 
            type: 'exact' 
          },
          { 
            field: 'paymentStatus', 
            values: ['pending', 'completed', 'failed', 'refunded'], 
            type: 'exact' 
          }
        ]);

        const finalQuery = { ...query, ...filters };

        // Run orders query and count concurrently
        const [orders, total] = await Promise.all([
          Order.find(finalQuery)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate('userId', 'name email')
            .lean(),
          Order.countDocuments(finalQuery),
        ]);

        // Get order statistics via aggregation
        const [stats] = await Order.aggregate([
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalRevenue: { $sum: '$total' },
              avgOrderValue: { $avg: '$total' },
              pendingOrders: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
              completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            }
          },
          {
            $project: {
              _id: 0,
              totalOrders: 1,
              totalRevenue: { $round: ['$totalRevenue', 2] },
              avgOrderValue: { $round: ['$avgOrderValue', 2] },
              pendingOrders: 1,
              completedOrders: 1,
            }
          }
        ]);

        return sendPaginated(res, orders, {
          page,
          limit,
          total,
          message: 'Orders retrieved successfully',
          meta: {
            stats: stats || {
              totalOrders: 0,
              totalRevenue: 0,
              avgOrderValue: 0,
              pendingOrders: 0,
              completedOrders: 0,
            },
            filters: req.query,
          },
        });
      } catch (error) {
        throw error;
      }

    case 'PATCH':
      try {
        const { operation } = req.body;

        if (!operation) {
          return sendBadRequest(res, 'Operation not specified');
        }

        switch (operation) {
          case 'update-status': {
            const { orderIds, status } = req.body;
            const statusValidation = validateRequestAndSendError(
              req,
              res,
              [
                {
                  field: 'orderIds',
                  type: 'array',
                  required: true,
                  min: 1,
                  message: ValidationMessages.MIN_ITEMS(1),
                },
                {
                  field: 'status',
                  type: 'string',
                  required: true,
                  enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
                  message: ValidationMessages.INVALID_ENUM(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
                },
              ],
              { source: 'body', allowUnknown: false }
            );

            if (statusValidation) {
              return statusValidation;
            }

            // Validate each orderId format
            if (validateAndSendIdErrors(res, orderIds, 'orderIds')) {
              return;
            }

            const updateResult = await Order.updateMany(
              { _id: { $in: orderIds } },
              {
                $set: {
                  status,
                  ...(status === 'delivered' && { deliveredAt: new Date() }),
                  ...(status === 'shipped' && { shippedAt: new Date() }),
                }
              }
            );

            await logBulkActivity({
              req,
              action: ActivityType.BULK_STATUS_UPDATE,
              subject: ActivitySubject.ORDER,
              count: orderIds.length,
              details: `Marked as "${status}"`,
            });

            return sendSuccess(
              res,
              { modifiedCount: updateResult.modifiedCount },
              `Successfully updated ${updateResult.modifiedCount} orders to "${status}"`
            );
          }

          case 'bulk-cancel': {
            const { orderIds: cancelIds, reason } = req.body;
            const cancelValidation = validateRequestAndSendError(
              req,
              res,
              [
                {
                  field: 'orderIds',
                  type: 'array',
                  required: true,
                  min: 1,
                  message: ValidationMessages.MIN_ITEMS(1),
                },
                {
                  field: 'reason',
                  type: 'string',
                  min: 5,
                  max: 500,
                  message: ValidationMessages.MIN_LENGTH(5),
                },
              ],
              { source: 'body', allowUnknown: false }
            );

            if (cancelValidation) {
              return cancelValidation;
            }

            // Validate each orderId format
            if (validateAndSendIdErrors(res, cancelIds, 'orderIds')) {
              return;
            }

            const cancelResult = await Order.updateMany(
              { _id: { $in: cancelIds }, status: { $nin: ['delivered', 'cancelled'] } },
              {
                $set: {
                  status: 'cancelled',
                  cancelledAt: new Date(),
                  cancellationReason: reason || 'Cancelled by admin',
                }
              }
            );

            await logBulkActivity({
              req,
              action: ActivityType.ORDER_CANCELLED,
              subject: ActivitySubject.ORDER,
              count: cancelIds.length,
              details: reason ? `Cancelled with reason: ${reason}` : undefined,
            });

            return sendSuccess(
              res,
              { modifiedCount: cancelResult.modifiedCount },
              `Successfully cancelled ${cancelResult.modifiedCount} orders`
            );
          }

          default:
            return sendBadRequest(res, 'Invalid operation');
        }
      } catch (error) {
        throw error;
      }

    default:
      return sendMethodNotAllowed(res, ['GET', 'PATCH']);
  }
}

export default withAdminAuth(
  withCache(
    withErrorHandler(
      ordersHandler,
      'manage',
      'Orders',
      'Error managing orders'
    ),
    {
      ...CacheConfigs.shortTerm,
      tags: combineTags([CacheTags.ORDERS], [CacheTags.STATS]),
    }
  )
);
