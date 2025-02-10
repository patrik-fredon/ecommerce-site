import type { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth } from '../../../../middleware/adminAuth';
import { AuthRequest } from '../../../../types/auth';
import { productService } from '../../../../services/ProductService';
import { logModelActivity, logBulkActivity } from '../../../../utils/adminActivity';
import { ActivityType, ActivitySubject } from '../../../../utils/adminActivity';
import { withCache, CacheTags, CacheConfigs } from '../../../../utils/adminCache';
import { withErrorHandler } from '../../../../utils/adminErrorHandler';
import { validateRequestAndSendError } from '../../../../utils/adminValidation';
import { ValidationMessages, validateAndSendIdErrors } from '../../../../utils/adminValidators';
import {
  sendSuccess,
  sendError,
  sendBadRequest,
  sendMethodNotAllowed,
  sendPaginated
} from '../../../../utils/adminResponse';
import {
  getPaginationParams,
  buildQuery,
  applyFilters,
} from '../../../../utils/adminPagination';

async function handler(req: AuthRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      try {
        const { skip, limit, page, sort } = getPaginationParams(req, {
          defaultLimit: 20,
          maxLimit: 50
        });

        const query = buildQuery(req, {
          search: {
            fields: ['name', 'description', 'sku'],
            term: req.query.search as string,
          },
          dateRange: {
            field: 'createdAt',
            start: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
            end: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
          },
        });

        const filters = applyFilters(req, [
          { field: 'category', values: ['electronics', 'clothing', 'books', 'home'], type: 'in' },
          { field: 'featured', values: ['true', 'false'], type: 'boolean' },
          { field: 'stock', values: ['0'], type: 'exists' }
        ]);

        const [products, total] = await Promise.all([
          productService.find(
            { ...query, ...filters },
            { skip, limit, sort }
          ),
          productService.count({ ...query, ...filters })
        ]);

        return sendPaginated(res, products, {
          page,
          limit,
          total,
          message: 'Products retrieved successfully'
        });
      } catch (error) {
        throw error;
      }

    case 'POST':
      try {
        const validation = validateRequestAndSendError(
          req,
          res,
          [
            {
              field: 'name',
              type: 'string',
              required: true,
              min: 2,
              max: 100,
              message: ValidationMessages.MIN_LENGTH(2)
            },
            {
              field: 'description',
              type: 'string',
              required: true,
              min: 10,
              max: 1000,
              message: ValidationMessages.MIN_LENGTH(10)
            },
            {
              field: 'price',
              type: 'number',
              required: true,
              min: 0,
              message: 'Price must be a positive number'
            },
            {
              field: 'stock',
              type: 'number',
              required: true,
              min: 0,
              message: 'Stock must be a positive integer'
            },
            {
              field: 'category',
              type: 'string',
              required: true,
              enum: ['electronics', 'clothing', 'books', 'home'],
              message: ValidationMessages.INVALID_ENUM(['electronics', 'clothing', 'books', 'home'])
            },
            {
              field: 'image',
              type: 'string',
              required: true
            },
            {
              field: 'featured',
              type: 'boolean'
            }
          ],
          { source: 'body' }
        );

        if (validation) {
          return validation;
        }

        const product = await productService.create(req.body);

        await logModelActivity({
          req,
          action: ActivityType.PRODUCT_CREATED,
          subject: ActivitySubject.PRODUCT,
          itemName: product.name
        });

        return sendSuccess(res, product, 'Product created successfully', undefined, 201);
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
          case 'bulk-update-stock': {
            const validation = validateRequestAndSendError(
              req,
              res,
              [
                {
                  field: 'updates',
                  type: 'array',
                  required: true,
                  min: 1,
                  message: ValidationMessages.MIN_ITEMS(1)
                }
              ],
              { source: 'body' }
            );

            if (validation) {
              return validation;
            }

            const { updates } = req.body;
            const results = await productService.bulkUpdateStock(updates);
            
            await logBulkActivity({
              req,
              action: ActivityType.PRODUCT_STOCK_UPDATED,
              subject: ActivitySubject.PRODUCT,
              count: updates.length,
            });

            return sendSuccess(res, results);
          }

          case 'bulk-toggle-featured': {
            const validation = validateRequestAndSendError(
              req,
              res,
              [
                {
                  field: 'productIds',
                  type: 'array',
                  required: true,
                  min: 1,
                  message: ValidationMessages.MIN_ITEMS(1)
                },
                {
                  field: 'featured',
                  type: 'boolean',
                  required: true
                }
              ],
              { source: 'body' }
            );

            if (validation) {
              return validation;
            }

            const { productIds, featured } = req.body;

            if (validateAndSendIdErrors(res, productIds, 'productIds')) {
              return;
            }

            const result = await productService.bulkToggleFeatured(productIds, featured);

            await logBulkActivity({
              req,
              action: featured ? ActivityType.BULK_FEATURE : ActivityType.BULK_UNFEATURE,
              subject: ActivitySubject.PRODUCT,
              count: productIds.length,
            });

            return sendSuccess(
              res,
              result,
              `Successfully ${featured ? 'featured' : 'unfeatured'} ${result.modifiedCount} products`
            );
          }

          default:
            return sendBadRequest(res, 'Invalid operation');
        }
      } catch (error) {
        throw error;
      }

    default:
      return sendMethodNotAllowed(res, ['GET', 'POST', 'PATCH']);
  }
}

export default withAdminAuth(
  withCache(
    withErrorHandler(handler, 'manage', 'Products', 'Error managing products'),
    {
      ...CacheConfigs.shortTerm,
      tags: [CacheTags.PRODUCTS, CacheTags.STATS]
    }
  )
);
