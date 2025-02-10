import mongoose, { Model } from 'mongoose';
import { IProduct, IProductMethods, IProductModel, IProductDocument } from '../types/models';
import { createHash } from 'crypto';

type ProductModelType = Model<IProductDocument> & IProductModel;

const productSchema = new mongoose.Schema<IProductDocument>(
  {
    name: {
      type: String,
      required: [true, 'Please provide a product name'],
      trim: true,
      maxlength: [100, 'Product name cannot be more than 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please provide a product description'],
      maxlength: [2000, 'Description cannot be more than 2000 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Please provide a product price'],
      min: [0, 'Price cannot be negative'],
    },
    image: {
      type: String,
      required: [true, 'Please provide a product image URL'],
    },
    category: {
      type: String,
      required: [true, 'Please provide a product category'],
      trim: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating must be at least 0'],
      max: [5, 'Rating cannot be more than 5'],
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: [0, 'Number of reviews cannot be negative'],
    },
    stock: {
      type: Number,
      required: [true, 'Please provide stock quantity'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    sku: {
      type: String,
      required: [true, 'Please provide a SKU'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    lastStockUpdate: {
      type: Date,
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Add virtual populate for reviews
productSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'product'
});

// Add virtual for review count
productSchema.virtual('totalReviews').get(function() {
  return this.reviewCount || 0;
});

// Add indexes for common queries
productSchema.index({ category: 1 });
productSchema.index({ featured: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ stock: 1 });
productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ name: 'text', description: 'text' }); // For text search

// Instance methods
productSchema.methods.updateStock = async function(quantity: number): Promise<IProductDocument> {
  const newStock = this.stock + quantity;
  if (newStock < 0) {
    throw new Error('Insufficient stock');
  }
  this.stock = newStock;
  this.lastStockUpdate = new Date();
  return this.save();
};

productSchema.methods.updateRating = async function(newRating: number): Promise<IProductDocument> {
  if (newRating < 0 || newRating > 5) {
    throw new Error('Rating must be between 0 and 5');
  }
  const currentTotal = this.rating * this.reviewCount;
  this.reviewCount += 1;
  this.rating = (currentTotal + newRating) / this.reviewCount;
  return this.save();
};

// Static methods
productSchema.statics.findFeatured = function(): Promise<IProductDocument[]> {
  return this.find({ featured: true, stock: { $gt: 0 } })
    .sort({ rating: -1 })
    .populate('reviews')
    .exec();
};

productSchema.statics.findByCategory = function(category: string): Promise<IProductDocument[]> {
  return this.find({ category, stock: { $gt: 0 } })
    .sort({ rating: -1 })
    .populate('reviews')
    .exec();
};

productSchema.statics.findInStock = function(): Promise<IProductDocument[]> {
  return this.find({ stock: { $gt: 0 } })
    .sort({ category: 1, rating: -1 })
    .populate('reviews')
    .exec();
};

// Pre-save middleware
productSchema.pre('save', function(next) {
  if (!this.sku) {
    // Generate SKU using a more reliable method
    const hash = createHash('md5')
      .update(this.name + Date.now().toString())
      .digest('hex');
    this.sku = `${this.name.substring(0, 3).toUpperCase()}-${hash.substring(0, 6)}`;
  }
  next();
});

// Virtual for calculating availability status
productSchema.virtual('availability').get(function() {
  if (this.stock <= 0) return 'Out of Stock';
  if (this.stock < 10) return 'Low Stock';
  return 'In Stock';
});

const Product = (mongoose.models.Product as ProductModelType) || 
  mongoose.model<IProductDocument, ProductModelType>('Product', productSchema);

export default Product;
