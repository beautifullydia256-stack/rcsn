import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Reduce bundle size
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', 'framer-motion', 'lucide-react'],
  },
  
  // Faster builds
  typescript: {
    // Skip type checking during build (faster builds)
    ignoreBuildErrors: true,
  },
  
  eslint: {
    // Skip ESLint during build (faster builds)
    ignoreDuringBuilds: true,
  },
  
  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Reduce bundle size in production
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };
    }
    
    return config;
  },
};

export default nextConfig;
