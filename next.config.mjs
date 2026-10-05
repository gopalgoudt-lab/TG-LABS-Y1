/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse/pdf.js loads its worker and optional Node canvas at runtime.
  // Keep the package external to the Next server bundle so Vercel traces the
  // package files instead of rewriting worker resolution into .next chunks.
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist', '@napi-rs/canvas'],
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
