/** @type {import('next').NextConfig} */
const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'clearnav.cv';

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.pexels.com' },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [`*.${ROOT_DOMAIN}`],
    },
  },
};

export default nextConfig;
