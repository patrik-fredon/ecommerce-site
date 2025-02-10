import mongoose from 'mongoose';

export interface IBlogPost extends mongoose.Document {
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: Date;
  image: string;
  slug: string;
  published: boolean;
  publishedAt?: Date;
}

interface IBlogPostModel extends mongoose.Model<IBlogPost> {
  findPublished(): Promise<IBlogPost[]>;
  findBySlug(slug: string): Promise<IBlogPost | null>;
}

const blogPostSchema = new mongoose.Schema<IBlogPost, IBlogPostModel>(
  {
    title: {
      type: String,
      required: [true, 'Please provide a blog post title'],
      trim: true,
      maxlength: [200, 'Title cannot be more than 200 characters'],
    },
    excerpt: {
      type: String,
      required: [true, 'Please provide a blog post excerpt'],
      maxlength: [500, 'Excerpt cannot be more than 500 characters'],
    },
    content: {
      type: String,
      required: [true, 'Please provide blog post content'],
    },
    author: {
      type: String,
      required: [true, 'Please provide an author name'],
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    image: {
      type: String,
      required: [true, 'Please provide a featured image URL'],
    },
    slug: {
      type: String,
      required: [true, 'Please provide a URL slug'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    published: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Add indexes for common queries
blogPostSchema.index({ slug: 1 }, { unique: true });
blogPostSchema.index({ date: -1 });
blogPostSchema.index({ author: 1 });
blogPostSchema.index({ published: 1, publishedAt: -1 });

// Static methods
blogPostSchema.statics.findPublished = function() {
  return this.find({ published: true })
    .sort({ publishedAt: -1 })
    .exec();
};

blogPostSchema.statics.findBySlug = function(slug: string) {
  return this.findOne({ slug, published: true })
    .exec();
};

// Create slug from title if not provided
blogPostSchema.pre('save', function(next) {
  if (!this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
  next();
});

export default mongoose.models.BlogPost || mongoose.model<IBlogPost, IBlogPostModel>('BlogPost', blogPostSchema);
