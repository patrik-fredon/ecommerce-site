import mongoose, { Model } from 'mongoose';
import { IBlogPost, IBlogPostMethods, IBlogPostModel, IComment } from '../types/models';

type BlogPostModelType = Model<IBlogPost, {}, IBlogPostMethods> & IBlogPostModel;

const commentSchema = new mongoose.Schema<IComment>({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: [1000, 'Comment cannot be more than 1000 characters']
  }
}, { timestamps: true });

const blogPostSchema = new mongoose.Schema<IBlogPost>(
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
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide an author ID'],
    },
    tags: [{
      type: String,
      trim: true
    }],
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    comments: [commentSchema],
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

// Instance methods
blogPostSchema.methods.publish = async function(this: mongoose.Document & IBlogPost) {
  this.published = true;
  this.publishedAt = new Date();
  return this.save();
};

blogPostSchema.methods.unpublish = async function(this: mongoose.Document & IBlogPost) {
  this.published = false;
  this.publishedAt = undefined;
  return this.save();
};

blogPostSchema.methods.addComment = async function(this: mongoose.Document & IBlogPost, userId: mongoose.Types.ObjectId, content: string) {
  this.comments = this.comments || [];
  this.comments.push({
    user: userId,
    content,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return this.save();
};

blogPostSchema.methods.removeComment = async function(this: mongoose.Document & IBlogPost, commentId: mongoose.Types.ObjectId) {
  if (!this.comments) return this;
  this.comments = this.comments.filter(comment => comment._id && !comment._id.equals(commentId));
  return this.save();
};

// Static methods
// Static methods
blogPostSchema.statics = {
  findPublished: function() {
    return this.find({ published: true })
      .sort({ publishedAt: -1 })
      .populate('author', 'name')
      .populate('comments.user', 'name')
      .exec();
  },

  findBySlug: function(slug: string) {
    return this.findOne({ slug, published: true })
      .populate('author', 'name')
      .populate('comments.user', 'name')
      .exec();
  },

  findByAuthor: function(authorId: mongoose.Types.ObjectId) {
    return this.find({ author: authorId })
      .sort({ createdAt: -1 })
      .populate('comments.user', 'name')
      .exec();
  }
};

// Middleware
blogPostSchema.pre('save', function(next) {
  // Create slug from title if not provided
  if (!this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  // Set publishedAt date when post is published
  if (this.published && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  next();
});

// Virtual for comment count
blogPostSchema.virtual('commentCount').get(function(this: IBlogPost) {
  return this.comments?.length || 0;
});

// Virtual for like count
blogPostSchema.virtual('likeCount').get(function(this: IBlogPost) {
  return this.likes?.length || 0;
});

// Ensure virtuals are included when converting to JSON
blogPostSchema.set('toJSON', { virtuals: true });

const BlogPost = (mongoose.models.BlogPost as BlogPostModelType) ||
  mongoose.model<IBlogPost, BlogPostModelType>('BlogPost', blogPostSchema);

export default BlogPost;
