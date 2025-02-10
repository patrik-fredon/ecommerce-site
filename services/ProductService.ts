import { Document, Model } from 'mongoose';
import { BaseService } from './BaseService';
import Product from '../models/Product';
import { IProduct, IProductDocument, IProductMethods, IProductModel } from '../types/models';

export interface StockUpdateResult {
  id: string;
  success: boolean;
  product?: IProductDocument;
  error?: string;
}

class ProductService extends BaseService<IProductDocument> {
  constructor() {
    super(Product);
  }

  // Find featured products that are in stock
  async findFeatured(limit = 10) {
    return this.find(
      { featured: true, stock: { $gt: 0 } },
      { limit, sort: { rating: -1 } }
    );
  }

  // Find products by category
  async findByCategory(category: string, options = {}) {
    return this.find(
      { category, stock: { $gt: 0 } },
      { ...options, sort: { rating: -1 } }
    );
  }

  // Find products in stock
  async findInStock(options = {}) {
    return this.find(
      { stock: { $gt: 0 } },
      { ...options, sort: { category: 1, rating: -1 } }
    );
  }

  // Update stock level with validation
  async updateStock(id: string, quantity: number): Promise<StockUpdateResult> {
    try {
      await this.ensureConnection();
      
      const product = await this.model.findById(id).exec();
      if (!product) {
        return {
          id,
          success: false,
          error: 'Product not found'
        };
      }

      const newStock = product.stock + quantity;
      if (newStock < 0) {
        return {
          id,
          success: false,
          error: 'Insufficient stock'
        };
      }

      const updatedProduct = await this.update(id, {
        stock: newStock,
        lastStockUpdate: new Date()
      });

      return {
        id,
        success: true,
        product: updatedProduct || undefined
      };
    } catch (error) {
      console.error('Error in updateStock:', error);
      return {
        id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Bulk update stock levels
  async bulkUpdateStock(updates: { id: string; quantity: number }[]): Promise<StockUpdateResult[]> {
    return Promise.all(
      updates.map(update => this.updateStock(update.id, update.quantity))
    );
  }

  // Toggle featured status for multiple products
  async bulkToggleFeatured(productIds: string[], featured: boolean) {
    try {
      await this.ensureConnection();
      const result = await this.model.updateMany(
        { _id: { $in: productIds } },
        { $set: { featured } }
      );
      return {
        success: true,
        modifiedCount: result.modifiedCount
      };
    } catch (error) {
      console.error('Error in bulkToggleFeatured:', error);
      throw error;
    }
  }

  // Create product with automatic SKU generation if not provided
  async create(data: Partial<IProductDocument>) {
    const sku = await this.generateSKU((data as any).name || '');
    return super.create({
      ...data,
      sku
    });
  }

  // Generate a unique SKU
  private async generateSKU(name: string): Promise<string> {
    const prefix = name
      .substring(0, 3)
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .padEnd(3, 'X');

    const count = await this.count();
    const suffix = (count + 1).toString().padStart(4, '0');

    return `${prefix}${suffix}`;
  }

  // Search products
  async search(term: string, options = {}) {
    return this.find(
      {
        $or: [
          { name: { $regex: term, $options: 'i' } },
          { description: { $regex: term, $options: 'i' } },
          { sku: { $regex: term, $options: 'i' } }
        ]
      },
      options
    );
  }
}

// Export a singleton instance
export const productService = new ProductService();
