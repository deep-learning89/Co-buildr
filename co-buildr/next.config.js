/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverComponentsExternalPackages: [
      'apify-client',
      'proxy-agent',
      'https-proxy-agent',
      'hpagent',
    ],
  },
  async headers() {
    // Extract Supabase URL from environment variables
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : 'gjembyeimymtppqugyrg.supabase.co';
    
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.supabase.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https: blob:",
              `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://api.groq.com https://api.apify.com`,
              "frame-src 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
}

export default nextConfig
