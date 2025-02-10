import mongoose from 'mongoose';

export interface IProduct extends mongoose.Document {
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  featured: boolean;
  rating: number;
  reviews: number;
  stock: number;
  sku: string;
  lastStockUpdate?: Date;
}

interface IProductModel extends mongoose.Model<IProduct> {
  findFeatured(): Promise<IProduct[]>;
  findByCategory(category: string): Promise<IProduct[]>;
  findInStock(): Promise<IProduct[]>;
  updateStock(id: string, quantity: number): Promise<IProduct | null>;
}

const productSchema = new mongoose.Schema<IProduct, IProductModel>(
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
    reviews: {
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
    },
  },
  { timestamps: true }
);

// Add indexes for common queries
productSchema.index({ category: 1 });
productSchema.index({ featured: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ stock: 1 });
productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ name: 'text', description: 'text' }); // For text search

// Static methods
productSchema.statics.findFeatured = function() {
  return this.find({ featured: true, stock: { $gt: 0 } })
    .sort({ rating: -1 })
    .exec();
};

productSchema.statics.findByCategory = function(category: string) {
  return this.find({ category, stock: { $gt: 0 } })
    .sort({ rating: -1 })
    .exec();
};

productSchema.statics.findInStock = function() {
  return this.find({ stock: { $gt: 0 } })
    .sort({ category: 1, rating: -1 })
    .exec();
};

productSchema.statics.updateStock = async function(id: string, quantity: number) {
  const product = await this.findById(id);
  if (!product) return null;

  const newStock = product.stock + quantity;
  if (newStock < 0) {
    throw new Error('Insufficient stock');
  }

  product.stock = newStock;
  product.lastStockUpdate = new Date();
  return product.save();
};

// Pre-save middleware
productSchema.pre('save', function(next) {
  if (!this.sku) {
    // Generate SKU from name and random number if not provided
    this.sku = this.name
      .substring(0, 3)
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .padEnd(3, 'X') +
      Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0');
  }
  next();
});

const Product = mongoose.models.Product || mongoose.model<IProduct, IProductModel>('Product', productSchema);

export default Product;
