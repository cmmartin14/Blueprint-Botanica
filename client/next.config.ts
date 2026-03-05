import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'pg'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bs.plantnet.org',
        port: '',
        pathname: '/image/**',
      },
    ],
    domains: ["perenual.com"]
  },
};

export default nextConfig;
