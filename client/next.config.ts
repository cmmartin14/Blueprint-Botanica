import { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
