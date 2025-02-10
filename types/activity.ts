export enum ActivityType {
  // User activities
  USER_LOGIN = 'USER_LOGIN',
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_BLOCKED = 'USER_BLOCKED',
  USER_UNBLOCKED = 'USER_UNBLOCKED',
  
  // Blog activities
  BLOG_CREATED = 'BLOG_CREATED',
  BLOG_UPDATED = 'BLOG_UPDATED',
  BLOG_DELETED = 'BLOG_DELETED',
  
  // Product activities
  PRODUCT_CREATED = 'PRODUCT_CREATED',
  PRODUCT_UPDATED = 'PRODUCT_UPDATED',
  PRODUCT_DELETED = 'PRODUCT_DELETED',
  
  // Settings activities
  SETTINGS_UPDATED = 'SETTINGS_UPDATED',
  
  // System activities
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  SYSTEM_WARNING = 'SYSTEM_WARNING',
  SYSTEM_INFO = 'SYSTEM_INFO'
}

export enum ActivitySubject {
  USER = 'USER',
  BLOG = 'BLOG',
  PRODUCT = 'PRODUCT',
  SETTINGS = 'SETTINGS',
  SYSTEM = 'SYSTEM'
}

export const ACTIVITY_TYPES = Object.values(ActivityType);
export const ACTIVITY_SUBJECTS = Object.values(ActivitySubject);
