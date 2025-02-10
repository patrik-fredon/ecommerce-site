import mongoose, { Model } from 'mongoose';
import { hash, compare } from 'bcryptjs';
import { IUser, IUserMethods, IUserModel } from '../types/models';

type UserModelType = Model<IUser, {}, IUserMethods> & IUserModel;

const userSchema = new mongoose.Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [50, 'Name cannot be more than 50 characters long'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    avatar: {
      type: String,
    },
    posts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BlogPost'
    }],
    favorites: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }],
    cart: [{
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }],
    orders: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    }]
  },
  {
    timestamps: true,
  }
);

// Add indexes for common queries
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ isBlocked: 1 });
userSchema.index({ createdAt: -1 });

// Add compound indexes
userSchema.index({ 'cart.product': 1, 'cart.addedAt': -1 });

// Middleware
userSchema.pre('save', async function(this: IUser & IUserMethods, next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    this.password = await hash(this.password, 10);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance methods
userSchema.methods.comparePassword = async function(this: IUser & IUserMethods, candidatePassword: string): Promise<boolean> {
  try {
    return await compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Error during password comparison:', error);
    return false;
  }
};

// Virtual for checking if user is admin
userSchema.virtual('isAdmin').get(function(this: IUser) {
  return this.role === 'admin';
});

// Instance methods for user status
userSchema.methods.block = async function(this: IUser & IUserMethods) {
  this.isBlocked = true;
  return this.save();
};

userSchema.methods.unblock = async function(this: IUser & IUserMethods) {
  this.isBlocked = false;
  return this.save();
};

// Static methods
userSchema.statics.findByEmail = async function(email: string) {
  return this.findOne({ email })
    .select('+password')
    .exec();
};

userSchema.statics.findAdmins = async function() {
  return this.find({ role: 'admin' })
    .sort({ createdAt: -1 })
    .exec();
};

// Ensure virtuals are included when converting to JSON
userSchema.set('toJSON', { virtuals: true });

const User = (mongoose.models.User as UserModelType) || 
  mongoose.model<IUser, UserModelType>('User', userSchema);

export default User;
