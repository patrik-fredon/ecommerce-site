import { Document } from 'mongoose';
import { BaseService } from './BaseService';
import BlogPost, { IBlogPost } from '../models/BlogPost';

export interface BlogPostDocument extends IBlogPost, Document {}

class BlogService extends BaseService<BlogPostDocument> {
  constructor() {
    super(BlogPost);
  }

  // Custom methods specific to blog posts
  async findPublished(options = {}) {
    return this.find(
      { published: true },
      { ...options, sort: { publishedAt: -1 } }
    );
  }

  async findBySlug(slug: string) {
    try {
      await this.ensureConnection();
      return await this.model.findOne({ slug, published: true }).exec();
    } catch (error) {
      console.error('Error in findBySlug:', error);
      throw error;
    }
  }

  async publish(id: string) {
    try {
      await this.ensureConnection();
      return await this.update(id, {
        published: true,
        publishedAt: new Date(),
      });
    } catch (error) {
      console.error('Error in publish:', error);
      throw error;
    }
  }

  async unpublish(id: string) {
    try {
      await this.ensureConnection();
      return await this.update(id, {
        published: false,
        $unset: { publishedAt: "" }
      });
    } catch (error) {
      console.error('Error in unpublish:', error);
      throw error;
    }
  }

  // Override create to handle slug generation if not provided
  async create(data: Partial<BlogPostDocument>) {
    if (!data.slug && data.title) {
      data.slug = this.generateSlug(data.title);
    }
    return super.create(data);
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
}

// Export a singleton instance
export const blogService = new BlogService();
