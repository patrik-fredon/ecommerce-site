import Layout from '../../components/Layout';
import BlogCard from '../../components/BlogCard';
import { blogPosts } from '../../utils/sampleData';

export default function Blog() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center pb-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Our Blog
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
            Stay updated with our latest articles, news, and insights
          </p>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {blogPosts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>

        {/* Newsletter Subscription */}
        <div className="mt-16 bg-blue-50 rounded-2xl px-6 py-10 sm:py-12 sm:px-12">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">
              Subscribe to our newsletter
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Get the latest updates delivered straight to your inbox
            </p>
            <form className="mt-8 sm:flex justify-center">
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-5 py-3 border border-gray-300 shadow-sm placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:max-w-xs rounded-md"
                placeholder="Enter your email"
              />
              <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3 sm:flex-shrink-0">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Subscribe
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
