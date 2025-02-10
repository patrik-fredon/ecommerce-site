import Image from 'next/image';
import Link from 'next/link';
import { BlogPost } from '../utils/types';

interface BlogCardProps {
  post: BlogPost;
}

export default function BlogCard({ post }: BlogCardProps) {
  return (
    <article className="flex flex-col overflow-hidden rounded-lg shadow-lg">
      <div className="flex-shrink-0">
        <div className="relative h-48 w-full">
          <Image
            src={post.image}
            alt={post.title}
            className="object-cover object-center"
            fill
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-between bg-white p-6">
        <div className="flex-1">
          <div className="flex items-center text-sm">
            <time dateTime={post.date} className="text-gray-500">
              {new Date(post.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </time>
            <span className="mx-1 text-gray-500">•</span>
            <span className="text-gray-500">{post.author}</span>
          </div>
          <Link href={`/blog/${post.slug}`} className="mt-2 block">
            <h3 className="text-xl font-semibold text-gray-900 hover:text-blue-600">
              {post.title}
            </h3>
            <p className="mt-3 text-base text-gray-500 line-clamp-3">
              {post.excerpt}
            </p>
          </Link>
        </div>
        <div className="mt-6">
          <Link
            href={`/blog/${post.slug}`}
            className="text-base font-semibold text-blue-600 hover:text-blue-500"
          >
            Read more →
          </Link>
        </div>
      </div>
    </article>
  );
}
