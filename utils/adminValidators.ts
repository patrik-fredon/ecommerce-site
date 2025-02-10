import { ValidationRule } from './adminValidation';
import { ActivityType, ActivitySubject } from './adminActivity';

export const CommonValidators = {
  name: {
    key: 'name',
    type: 'string',
    required: true,
    minLength: 2,
    maxLength: 50,
  } as ValidationRule,

  email: {
    key: 'email',
    type: 'string',
    required: true,
    pattern: /^\S+@\S+\.\S+$/,
    maxLength: 255,
  } as ValidationRule,

  password: {
    key: 'password',
    type: 'string',
    required: true,
    minLength: 8,
    maxLength: 100,
  } as ValidationRule,

  description: {
    key: 'description',
    type: 'string',
    maxLength: 1000,
  } as ValidationRule,

  slug: {
    key: 'slug',
    type: 'string',
    required: true,
    pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    maxLength: 100,
  } as ValidationRule,

  price: {
    key: 'price',
    type: 'number',
    required: true,
    minValue: 0,
  } as ValidationRule,

  quantity: {
    key: 'quantity',
    type: 'number',
    required: true,
    minValue: 0,
  } as ValidationRule,

  status: {
    key: 'status',
    type: 'string',
    required: true,
    enum: ['draft', 'published', 'archived'],
  } as ValidationRule,

  tags: {
    key: 'tags',
    type: 'array',
  } as ValidationRule,

  metadata: {
    key: 'metadata',
    type: 'object',
  } as ValidationRule,
};

export const ActivityValidators = {
  action: {
    key: 'action',
    type: 'string',
    required: true,
    enum: Object.values(ActivityType),
  } as ValidationRule,

  subject: {
    key: 'subject',
    type: 'string',
    required: true,
    enum: Object.values(ActivitySubject),
  } as ValidationRule,

  itemName: {
    key: 'itemName',
    type: 'string',
    maxLength: 200,
  } as ValidationRule,

  details: {
    key: 'details',
    type: 'string',
    maxLength: 1000,
  } as ValidationRule,
};

export const BlogValidators = {
  title: {
    key: 'title',
    type: 'string',
    required: true,
    minLength: 3,
    maxLength: 200,
  } as ValidationRule,

  content: {
    key: 'content',
    type: 'string',
    required: true,
    minLength: 10,
  } as ValidationRule,

  excerpt: {
    key: 'excerpt',
    type: 'string',
    maxLength: 500,
  } as ValidationRule,

  author: {
    key: 'author',
    type: 'string',
    required: true,
  } as ValidationRule,

  categories: {
    key: 'categories',
    type: 'array',
  } as ValidationRule,

  featuredImage: {
    key: 'featuredImage',
    type: 'string',
    pattern: /^https?:\/\/.+/,
  } as ValidationRule,
};

export const ProductValidators = {
  title: {
    key: 'title',
    type: 'string',
    required: true,
    minLength: 3,
    maxLength: 200,
  } as ValidationRule,

  description: CommonValidators.description,
  price: CommonValidators.price,
  quantity: CommonValidators.quantity,

  sku: {
    key: 'sku',
    type: 'string',
    required: true,
    pattern: /^[A-Z0-9-]+$/,
    maxLength: 50,
  } as ValidationRule,

  categories: {
    key: 'categories',
    type: 'array',
  } as ValidationRule,

  images: {
    key: 'images',
    type: 'array',
    custom: (value: any[]) => {
      if (!Array.isArray(value)) return false;
      return value.every(url => typeof url === 'string' && /^https?:\/\/.+/.test(url));
    },
  } as ValidationRule,

  specifications: {
    key: 'specifications',
    type: 'object',
  } as ValidationRule,
};

export const SettingsValidators = {
  siteName: {
    key: 'siteName',
    type: 'string',
    required: true,
    minLength: 2,
    maxLength: 100,
  } as ValidationRule,

  siteDescription: {
    key: 'siteDescription',
    type: 'string',
    maxLength: 500,
  } as ValidationRule,

  contactEmail: CommonValidators.email,

  socialLinks: {
    key: 'socialLinks',
    type: 'object',
    custom: (value: any) => {
      if (typeof value !== 'object' || value === null) return false;
      return Object.values(value).every(url => typeof url === 'string' && /^https?:\/\/.+/.test(url));
    },
  } as ValidationRule,

  theme: {
    key: 'theme',
    type: 'string',
    enum: ['light', 'dark', 'system'],
  } as ValidationRule,
};
