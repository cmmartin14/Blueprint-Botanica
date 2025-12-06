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
  },
};

export default nextConfig;
