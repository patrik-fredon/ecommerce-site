/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	images: {
		domains: ['source.unsplash.com'] // Add any other image domains you might need
	},
	// Optimize builds
	// swcMinify: true,
	// Configure environment variables that can be exposed to the browser
	env: {
		MONGODB_URI: process.env.MONGODB_URI,
		JWT_SECRET: process.env.JWT_SECRET
	},
	// Add webpack configuration if needed
	webpack: (config, { dev, isServer }) => {
		// Add custom webpack configuration here if needed
		return config;
	}
};

module.exports = nextConfig;
