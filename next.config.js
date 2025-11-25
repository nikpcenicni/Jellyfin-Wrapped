/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    // In development, proxy API requests to Express backend
    // In production (Docker), nginx handles routing
    if (process.env.NODE_ENV === 'development') {
      // In development, proxy API requests to Express backend on port 3000
      const apiUrl = 'http://localhost:3000';
      return [
        {
          source: '/api/:path*',
          destination: `${apiUrl}/api/:path*`,
        },
      ];
    }
    return [];
  },
};

module.exports = nextConfig;
