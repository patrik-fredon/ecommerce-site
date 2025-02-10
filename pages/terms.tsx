import Layout from '../components/Layout';

export default function Terms() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-8">Terms of Service</h1>
        
        <div className="prose prose-blue max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-600 mb-4">
              Welcome to EcoShop. By accessing and using our website, you agree to these terms and conditions.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Use of the Service</h2>
            <p className="text-gray-600 mb-4">
              You must be at least 18 years old to use this service. You are responsible for maintaining
              the confidentiality of your account information.
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>You must provide accurate and complete information when creating an account</li>
              <li>You are responsible for all activities that occur under your account</li>
              <li>You must notify us immediately of any unauthorized use of your account</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Product Information</h2>
            <p className="text-gray-600 mb-4">
              We make every effort to display as accurately as possible the colors and features of our
              products. We cannot guarantee that your computer monitor's display will be accurate.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Shipping & Returns</h2>
            <p className="text-gray-600 mb-4">
              We ship to most countries worldwide. For returns, items must be unused and in their
              original packaging. Contact our customer service team within 30 days of receiving your order.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Privacy & Security</h2>
            <p className="text-gray-600 mb-4">
              Your privacy is important to us. Please review our Privacy Policy to understand how we
              collect, use, and protect your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Changes to Terms</h2>
            <p className="text-gray-600 mb-4">
              We reserve the right to modify these terms at any time. We will notify users of any
              material changes via email or through our website.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Last updated: February 10, 2025
          </p>
        </div>
      </div>
    </Layout>
  );
}
