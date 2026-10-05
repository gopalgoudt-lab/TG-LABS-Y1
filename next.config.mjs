/** @type {import('next').NextConfig} */
const nextConfig = {
  // Recommended serverless packaging for pdf-parse. The worker itself is
  // configured explicitly in lib/report-pdf-extraction.ts.
  serverExternalPackages: ['pdf-parse', '@napi-rs/canvas'],
  async redirects() {
    return [
      { source: '/appointment', destination: '/', permanent: true },
      { source: '/book-appointment', destination: '/', permanent: true },
      { source: '/tests', destination: '/', permanent: true },
      { source: '/health-check-packages', destination: '/', permanent: true },
      { source: '/health-check-packages/:path*', destination: '/', permanent: true },
      { source: '/package-a', destination: '/', permanent: true },
      { source: '/package-b', destination: '/', permanent: true },
      { source: '/package-c', destination: '/', permanent: true },
      { source: '/package-d', destination: '/', permanent: true },
      { source: '/reports', destination: '/patient', permanent: true },
      { source: '/download-report', destination: '/patient', permanent: true },
      { source: '/contact.php', destination: '/contact-us', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), payment=(self)',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
