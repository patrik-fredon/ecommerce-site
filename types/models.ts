import { Document, Model, Types } from 'mongoose';
import { UserRole } from './auth';

// Base interface for all documents
export interface BaseDocument extends Document {
  createdAt: Date;
  updatedAt: Date;
}

// Product related types
export interface IProduct extends BaseDocument {
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  featured: boolean;
  rating: number;
  reviewCount: number;
  stock: number;
  sku: string;
  lastStockUpdate?: Date;
  reviews?: Types.ObjectId[]; // Virtual populated field
}

// Review related types
export interface IReview extends BaseDocument {
  product: Types.ObjectId;
  user: Types.ObjectId;
  rating: number;
  comment: string;
}

export interface IReviewDocument extends Document, IReview {
  id: string;
}

// Blog related types
export interface IBlogPost extends BaseDocument {
  title: string;
  excerpt: string;
  content: string;
  author: Types.ObjectId; // Reference to User
  date: Date;
  image: string;
  slug: string;
  published: boolean;
  publishedAt?: Date;
  tags?: string[];
  likes?: Types.ObjectId[]; // Reference to Users who liked
  comments?: IComment[];
}

// Comment sub-document
export interface IComment {
  _id?: Types.ObjectId;
  user: Types.ObjectId; // Reference to User
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// User related types
export interface IUser extends BaseDocument {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isBlocked: boolean;
  avatar?: string;
  posts?: Types.ObjectId[]; // Reference to BlogPosts
  favorites?: Types.ObjectId[]; // Reference to Products
  cart?: ICartItem[];
  orders?: Types.ObjectId[]; // Reference to Orders
}

// Cart item sub-document
export interface ICartItem {
  product: Types.ObjectId; // Reference to Product
  quantity: number;
  addedAt: Date;
}

// Order related types
export interface IOrder extends BaseDocument {
  user: Types.ObjectId; // Reference to User
  items: IOrderItem[];
  total: number;
  status: OrderStatus;
  shippingAddress: IAddress;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  trackingNumber?: string;
}

// Order item sub-document
export interface IOrderItem {
  product: Types.ObjectId; // Reference to Product
  quantity: number;
  price: number; // Price at time of purchase
}

// Address sub-document
export interface IAddress {
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

// Enums
export const OrderStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
} as const;
export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

export const PaymentStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded'
} as const;
export type PaymentStatus = typeof PaymentStatus[keyof typeof PaymentStatus];

// Method interfaces
export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
  block(): Promise<this>;
  unblock(): Promise<this>;
}

export interface IProductMethods {
  updateStock(quantity: number): Promise<IProductDocument>;
  updateRating(newRating: number): Promise<IProductDocument>;
}

export interface IProductDocument extends Document, IProduct, IProductMethods {
  id: string;
}

// Method interfaces
export interface IOrderMethods {
  updateStatus(status: OrderStatus): Promise<IOrder>;
  updatePaymentStatus(status: PaymentStatus): Promise<IOrder>;
  cancel(): Promise<IOrder>;
}

export interface IBlogPostMethods {
  publish(): Promise<this>;
  unpublish(): Promise<this>;
  addComment(userId: Types.ObjectId, content: string): Promise<this>;
  removeComment(commentId: Types.ObjectId): Promise<this>;
}

// Model static methods
export interface IUserModel extends Model<IUser, {}, IUserMethods> {
  findByEmail(email: string): Promise<IUser & IUserMethods>;
  findAdmins(): Promise<Array<IUser & IUserMethods>>;
}

export interface IProductModel extends Model<IProductDocument, {}, IProductMethods> {
  findFeatured(): Promise<IProductDocument[]>;
  findByCategory(category: string): Promise<IProductDocument[]>;
  findInStock(): Promise<IProductDocument[]>;
}

export interface IReviewModel extends Model<IReviewDocument> {
  findByProduct(productId: Types.ObjectId): Promise<IReviewDocument[]>;
  findByUser(userId: Types.ObjectId): Promise<IReviewDocument[]>;
}

export interface IBlogPostModel extends Model<IBlogPost, {}, IBlogPostMethods> {
  findPublished(): Promise<IBlogPost[]>;
  findBySlug(slug: string): Promise<IBlogPost | null>;
  findByAuthor(authorId: Types.ObjectId): Promise<IBlogPost[]>;
}
