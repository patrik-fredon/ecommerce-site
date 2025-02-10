import mongoose from 'mongoose';
import { hash, compare } from 'bcryptjs';

export interface IUser {
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

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
      unique: true, // This automatically creates an index
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false, // Don't include password by default in queries
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  {
    timestamps: true,
  }
);

// Only create index for role since email already has an index from unique: true
userSchema.index({ role: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
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

// Custom method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword: string) {
  try {
    // Use bcrypt.compare to compare the candidate password with the stored hash
    return await compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Error during password comparison:', error);
    return false;
  }
};

// Ensure the model isn't recreated if it already exists
export default mongoose.models.User || mongoose.model<IUser>('User', userSchema);
