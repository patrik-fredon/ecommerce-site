import { Document, Types, PopulateOptions } from 'mongoose';
import { BaseService } from './BaseService';
import BlogPost from '../models/BlogPost';
import { IBlogPost } from '../types/models';
import dbConnect from '../lib/dbConnect';

export interface BlogPostDocument extends IBlogPost, Document {}

export interface BlogPostCreateData {
  title: string;
  excerpt: string;
  content: string;
  author: string;
  image: string;
  tags?: string[];
  published?: boolean;
}

export interface BlogPostUpdateData {
  title?: string;
  excerpt?: string;
  content?: string;
  image?: string;
  tags?: string[];
}

class BlogPostService extends BaseService<BlogPostDocument> {
  constructor() {
    super(BlogPost);
  }

  // Create a blog post
  async createPost(data: BlogPostCreateData): Promise<BlogPostDocument> {
    await this.ensureConnection();
    const mongoose = (await dbConnect()).default;

    const post = await super.create({
      ...data,
      author: new Types.ObjectId(data.author),
      slug: this.generateSlug(data.title),
      publishedAt: data.published ? new Date() : undefined
    });

    return this.findById(post.id, {
      populate: [
        { path: 'author', select: 'name avatar' },
        { path: 'comments.user', select: 'name avatar' }
      ]
    }) as Promise<BlogPostDocument>;
  }

  // Update a blog post
  async updatePost(id: string, data: BlogPostUpdateData): Promise<BlogPostDocument | null> {
    await this.ensureConnection();

    const updateData: any = { ...data };
    if (data.title) {
      updateData.slug = this.generateSlug(data.title);
    }

    const post = await super.update(id, updateData);
    if (!post) return null;

    return this.findById(post.id, {
      populate: [
        { path: 'author', select: 'name avatar' },
        { path: 'comments.user', select: 'name avatar' }
      ]
    });
  }

  // Publish a blog post
  async publishPost(id: string): Promise<BlogPostDocument | null> {
    await this.ensureConnection();

    return super.update(id, {
      published: true,
      publishedAt: new Date()
    });
  }

  // Unpublish a blog post
  async unpublishPost(id: string): Promise<BlogPostDocument | null> {
    await this.ensureConnection();

    return super.update(id, {
      published: false,
      $unset: { publishedAt: 1 }
    });
  }

  // Add a comment to a blog post
  async addComment(postId: string, userId: string, content: string): Promise<BlogPostDocument | null> {
    await this.ensureConnection();

    const post = await super.update(postId, {
      $push: {
        comments: {
          user: new Types.ObjectId(userId),
          content,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }
    });

    if (!post) return null;

    return this.findById(post.id, {
      populate: [
        { path: 'author', select: 'name avatar' },
        { path: 'comments.user', select: 'name avatar' }
      ]
    });
  }

  // Remove a comment from a blog post
  async removeComment(postId: string, commentId: string): Promise<BlogPostDocument | null> {
    await this.ensureConnection();

    return super.update(postId, {
      $pull: { comments: { _id: new Types.ObjectId(commentId) } }
    });
  }

  // Toggle like on a blog post
  async toggleLike(postId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    await this.ensureConnection();
    const userObjectId = new Types.ObjectId(userId);

    const post = await this.findById(postId);
    if (!post) {
      throw new Error('Blog post not found');
    }

    const likes = post.likes || [];
    const userLikeIndex = likes.findIndex(id => id.equals(userObjectId));

    if (userLikeIndex === -1) {
      // Add like
      await super.update(postId, {
        $addToSet: { likes: userObjectId }
      });
      return { liked: true, likeCount: likes.length + 1 };
    } else {
      // Remove like
      await super.update(postId, {
        $pull: { likes: userObjectId }
      });
      return { liked: false, likeCount: likes.length - 1 };
    }
  }

  // Find published posts
  async findPublished(options = {}) {
    const populateOptions: PopulateOptions[] = [
      { path: 'author', select: 'name avatar' },
      { path: 'comments.user', select: 'name avatar' }
    ];

    return this.find(
      { published: true },
      {
        ...options,
        sort: { publishedAt: -1 },
        populate: populateOptions
      }
    );
  }

  // Find posts by author
  async findByAuthor(authorId: string, options = {}) {
    const populateOptions: PopulateOptions[] = [
      { path: 'author', select: 'name avatar' },
      { path: 'comments.user', select: 'name avatar' }
    ];

    return this.find(
      { author: new Types.ObjectId(authorId) },
      {
        ...options,
        sort: { createdAt: -1 },
        populate: populateOptions
      }
    );
  }

  // Find post by slug
  async findBySlug(slug: string): Promise<BlogPostDocument | null> {
    return this.findOne(
      { slug, published: true },
      {
        populate: [
          { path: 'author', select: 'name avatar' },
          { path: 'comments.user', select: 'name avatar' }
        ]
      }
    );
  }

  // Search posts
  async searchPosts(query: string, options = {}) {
    const populateOptions: PopulateOptions[] = [
      { path: 'author', select: 'name avatar' }
    ];

    return this.find(
      {
        published: true,
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { content: { $regex: query, $options: 'i' } },
          { tags: { $regex: query, $options: 'i' } }
        ]
      },
      {
        ...options,
        sort: { publishedAt: -1 },
        populate: populateOptions
      }
    );
  }

  // Find posts by tag
  async findByTag(tag: string, options = {}) {
    const populateOptions: PopulateOptions[] = [
      { path: 'author', select: 'name avatar' }
    ];

    return this.find(
      {
        published: true,
        tags: { $regex: new RegExp(tag, 'i') }
      },
      {
        ...options,
        sort: { publishedAt: -1 },
        populate: populateOptions
      }
    );
  }

  // Get blog statistics
  async getStats() {
    await this.ensureConnection();

    const stats = await this.aggregate([
      {
        $facet: {
          totalPosts: [
            { $match: { published: true } },
            { $count: 'count' }
          ],
          postsByMonth: [
            { $match: { published: true } },
            {
              $group: {
                _id: {
                  year: { $year: '$publishedAt' },
                  month: { $month: '$publishedAt' }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } }
          ],
          topTags: [
            { $match: { published: true } },
            { $unwind: '$tags' },
            {
              $group: {
                _id: '$tags',
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          commentStats: [
            { $match: { published: true } },
            {
              $group: {
                _id: null,
                totalComments: { $sum: { $size: { $ifNull: ['$comments', []] } } },
                avgCommentsPerPost: { $avg: { $size: { $ifNull: ['$comments', []] } } }
              }
            }
          ]
        }
      }
    ]);

    const result = stats[0];
    return {
      totalPosts: result.totalPosts[0]?.count || 0,
      postsByMonth: result.postsByMonth,
      topTags: result.topTags,
      commentStats: result.commentStats[0] || { totalComments: 0, avgCommentsPerPost: 0 }
    };
  }

  // Generate URL-friendly slug from title
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
}

// Export a singleton instance
export const blogPostService = new BlogPostService();
