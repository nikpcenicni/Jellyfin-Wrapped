/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    // In development, proxy API requests to Express backend
    // In production (Docker), nginx handles routing
    if (process.env.NODE_ENV === 'development') {
      const apiUrl = process.env.API_URL || 'http://localhost:3000';
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
