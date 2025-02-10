import { Product, BlogPost } from './types';

export const products: Product[] = [
  {
    id: '1',
    name: 'Premium Wireless Headphones',
    description: 'High-quality wireless headphones with noise cancellation technology',
    price: 199.99,
    image: '/images/headphones.jpg',
    category: 'Electronics',
    featured: true,
    rating: 4.8,
    reviews: 245
  },
  {
    id: '2',
    name: 'Smart Fitness Watch',
    description: 'Track your fitness goals with this advanced smartwatch',
    price: 149.99,
    image: '/images/smartwatch.jpg',
    category: 'Electronics',
    featured: true,
    rating: 4.6,
    reviews: 189
  },
  {
    id: '3',
    name: 'Eco-Friendly Water Bottle',
    description: 'Sustainable and durable water bottle for everyday use',
    price: 24.99,
    image: '/images/bottle.jpg',
    category: 'Lifestyle',
    featured: true,
    rating: 4.9,
    reviews: 320
  },
  {
    id: '4',
    name: 'Organic Cotton T-Shirt',
    description: 'Comfortable and sustainable cotton t-shirt',
    price: 29.99,
    image: '/images/tshirt.jpg',
    category: 'Fashion',
    featured: true,
    rating: 4.7,
    reviews: 156
  }
];

export const blogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'The Future of Sustainable Shopping',
    excerpt: 'Discover how eco-friendly products are reshaping the retail landscape',
    content: 'Full article content here...',
    author: 'Jane Smith',
    date: '2025-02-01',
    image: '/images/sustainable-shopping.jpg',
    slug: 'future-of-sustainable-shopping'
  },
  {
    id: '2',
    title: 'Top Tech Trends for 2025',
    excerpt: 'Explore the latest innovations in consumer technology',
    content: 'Full article content here...',
    author: 'John Doe',
    date: '2025-01-28',
    image: '/images/tech-trends.jpg',
    slug: 'top-tech-trends-2025'
  },
  {
    id: '3',
    title: 'Living a Minimalist Lifestyle',
    excerpt: 'Tips and tricks for decluttering your life',
    content: 'Full article content here...',
    author: 'Sarah Johnson',
    date: '2025-01-25',
    image: '/images/minimalist-lifestyle.jpg',
    slug: 'living-minimalist-lifestyle'
  }
];
