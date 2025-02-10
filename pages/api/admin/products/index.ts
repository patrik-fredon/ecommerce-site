import type { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth } from '../../../../middleware/adminAuth';
import { AuthRequest } from '../../../../types/auth';
import dbConnect from '../../../../lib/dbConnect';
import Product from '../../../../models/Product';
import { logModelActivity, logBulkActivity } from '../../../../utils/adminActivity';
import { ActivityType, ActivitySubject } from '../../../../utils/adminActivity';
import { withErrorHandler } from '../../../../utils/adminErrorHandler';
import { withCache, CacheTags, CacheConfigs, combineTags } from '../../../../utils/adminCache';
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
import { validateRequest, validateRequestAndSendError } from '../../../../utils/adminValidation';
import {
  ValidationPatterns,
  validateAndSendIdErrors,
  ObjectIdRule,
  ValidationMessages,
} from '../../../../utils/adminValidators';

async function productsHandler(req: AuthRequest, res: NextApiResponse) {
  const { method } = req;

  await dbConnect();

  switch (method) {
    case 'GET':
      try {
        const { skip, limit, page, sort } = getPaginationParams(req, {
          defaultLimit: 20,
          maxLimit: 50,
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
          { 
            field: 'category', 
            values: ['electronics', 'clothing', 'books', 'home'], 
            type: 'in' 
          },
          { 
            field: 'featured', 
            values: ['true', 'false'], 
            type: 'boolean' 
          },
          { 
            field: 'stock', 
            values: ['0'], 
            type: 'exists' 
          }
        ]);

        const finalQuery = { ...query, ...filters };

        const [products, total] = await Promise.all([
          Product.find(finalQuery)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean(),
          Product.countDocuments(finalQuery),
        ]);

        return sendPaginated(res, products, {
          page,
          limit,
          total,
          message: 'Products retrieved successfully',
          meta: {
            filters: req.query,
          },
        });
      } catch (error) {
        throw error;
      }
      break;

    case 'POST':
      try {
        const postValidation = validateRequestAndSendError(
          req,
          res,
          [
            {
              field: 'name',
              type: 'string',
              required: true,
              min: 2,
              max: 100,
              message: ValidationMessages.MIN_LENGTH(2),
            },
            {
              field: 'description',
              type: 'string',
              required: true,
              min: 10,
              max: 1000,
              message: ValidationMessages.MIN_LENGTH(10),
            },
            {
              field: 'price',
              type: 'number',
              required: true,
              min: 0,
              pattern: ValidationPatterns.CURRENCY,
              message: 'Invalid price format',
            },
            {
              field: 'stock',
              type: 'number',
              required: true,
              min: 0,
              pattern: ValidationPatterns.POSITIVE_INT,
              message: 'Stock must be a positive integer',
            },
            {
              field: 'category',
              type: 'string',
              required: true,
              enum: ['electronics', 'clothing', 'books', 'home'],
              message: ValidationMessages.INVALID_ENUM(['electronics', 'clothing', 'books', 'home']),
            },
            {
              field: 'sku',
              type: 'string',
              pattern: ValidationPatterns.SKU,
              message: 'Invalid SKU format',
            },
            {
              field: 'featured',
              type: 'boolean',
            },
          ],
          { source: 'body', allowUnknown: false }
        );

        if (postValidation) {
          return postValidation;
        }

        // Generate SKU if not provided
        if (!req.body.sku) {
          const count = await Product.countDocuments();
          req.body.sku = `PRD${(count + 1).toString().padStart(6, '0')}`;
        }

        const product = await Product.create(req.body);

        await logModelActivity({
          req,
          action: ActivityType.PRODUCT_CREATED,
          subject: ActivitySubject.PRODUCT,
          itemName: product.name,
        });

        return sendSuccess(res, product, 'Product created successfully', undefined, 201);
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

        switch (operation) {
          case 'bulk-update-stock':
            const { updates } = req.body;
            const stockValidation = validateRequestAndSendError(
              req,
              res,
              [
                {
                  field: 'updates',
                  type: 'array',
                  required: true,
                  min: 1,
                  message: ValidationMessages.MIN_ITEMS(1),
                },
              ],
              { source: 'body', allowUnknown: false }
            );

            if (stockValidation) {
              return stockValidation;
            }

            // Validate each update item
            for (const update of updates) {
              const itemValidation = validateRequest(
                { body: update } as NextApiRequest,
                [
                  {
                    field: 'id',
                    ...ObjectIdRule,
                  },
                  {
                    field: 'quantity',
                    type: 'number',
                    required: true,
                    pattern: ValidationPatterns.POSITIVE_INT,
                    message: 'Quantity must be a positive integer',
                  },
                ],
                { source: 'body' }
              );

              if (itemValidation.length > 0) {
                return sendBadRequest(res, 'Invalid update item format', itemValidation);
              }
            }

            const results = await Promise.all(
              updates.map(async (update: { id: string; quantity: number }) => {
                const { id, quantity } = update;
                try {
                  const product = await Product.findByIdAndUpdate(
                    id,
                    { $inc: { stock: quantity } },
                    { new: true }
                  );
                  if (product) {
                    await logModelActivity({
                      req,
                      action: ActivityType.PRODUCT_STOCK_UPDATED,
                      subject: ActivitySubject.PRODUCT,
                      itemName: product.name,
                      details: `Stock ${quantity >= 0 ? 'increased' : 'decreased'} by ${Math.abs(quantity)} units`,
                    });
                  }
                  return { id, success: true, product };
                } catch (error) {
                  return { id, success: false, error: (error as Error).message };
                }
              })
            );

            return sendSuccess(res, results);

          case 'bulk-toggle-featured':
            const { productIds, featured } = req.body;
            const featuredValidation = validateRequestAndSendError(
              req,
              res,
              [
                {
                  field: 'productIds',
                  type: 'array',
                  required: true,
                  min: 1,
                  message: ValidationMessages.MIN_ITEMS(1),
                },
                {
                  field: 'featured',
                  type: 'boolean',
                  required: true,
                },
              ],
              { source: 'body', allowUnknown: false }
            );

            if (featuredValidation) {
              return featuredValidation;
            }

            if (validateAndSendIdErrors(res, productIds, 'productIds')) {
              return;
            }

            const updatedProducts = await Product.updateMany(
              { _id: { $in: productIds } },
              { $set: { featured } }
            );

            await logBulkActivity({
              req,
              action: featured ? ActivityType.BULK_FEATURE : ActivityType.BULK_UNFEATURE,
              subject: ActivitySubject.PRODUCT,
              count: productIds.length,
            });

            return sendSuccess(
              res,
              { modifiedCount: updatedProducts.modifiedCount },
              `Successfully ${featured ? 'featured' : 'unfeatured'} ${updatedProducts.modifiedCount} products`
            );

          default:
            return sendBadRequest(res, 'Invalid operation');
        }
      } catch (error) {
        throw error;
      }
      break;

    default:
      return sendMethodNotAllowed(res, ['GET', 'POST', 'PATCH']);
  }
}

export default withAdminAuth(
  withCache(
    withErrorHandler(
      productsHandler,
      'manage',
      'Products',
      'Error managing products'
    ),
    {
      ...CacheConfigs.mediumTerm,
      tags: combineTags(
        [CacheTags.PRODUCTS],
        [CacheTags.FEATURED],
        [CacheTags.STATS]
      ),
    }
  )
);
