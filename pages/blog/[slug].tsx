import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { blogPosts } from '../../utils/sampleData';
import Image from 'next/image';

export default function BlogPost() {
  const router = useRouter();
  const { slug } = router.query;

  const post = blogPosts.find(p => p.slug === slug);

  if (!post) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-gray-900">Blog post not found</h1>
            <p className="mt-2 text-gray-600">The article you're looking for doesn't exist.</p>
            <button
              onClick={() => router.push('/blog')}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Blog
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            {post.title}
          </h1>
          <div className="mt-4 flex items-center justify-center space-x-3 text-gray-500">
            <div className="text-base">
              {new Date(post.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            <span>•</span>
            <div className="text-base">By {post.author}</div>
          </div>
        </div>

        {/* Featured Image */}
        <div className="mt-12 relative aspect-video w-full overflow-hidden rounded-lg">
          <Image
            src={post.image}
            alt={post.title}
            className="object-cover"
            fill
            priority
          />
        </div>

        {/* Content */}
        <div className="mt-12 prose prose-blue prose-lg mx-auto">
          <p className="lead text-xl text-gray-500 mb-8">
            {post.excerpt}
          </p>
          <div className="mt-8 text-gray-700 leading-relaxed space-y-6">
            {post.content}
          </div>
        </div>

        {/* Share and Navigation */}
        <div className="mt-12 border-t border-gray-200 pt-8">
          <div className="flex justify-between items-center">
            <button
              onClick={() => router.push('/blog')}
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              ← Back to Blog
            </button>
            <div className="flex space-x-4">
              <button className="text-gray-400 hover:text-gray-500">
                <span className="sr-only">Share on Twitter</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </button>
              <button className="text-gray-400 hover:text-gray-500">
                <span className="sr-only">Share on LinkedIn</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </article>
    </Layout>
  );
}
