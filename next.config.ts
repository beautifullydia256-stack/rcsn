import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API CORS: use root middleware.ts so apex + www + localhost match the request Origin.
  // Reduce bundle size
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', 'framer-motion', 'lucide-react'],
  },
  
  // Faster builds
  typescript: {
    // Skip type checking during build (faster builds)
    ignoreBuildErrors: true,
  },
  
  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  
  // Webpack optimizations
  // Note: In Next.js 16, Turbopack is default, but we use webpack for custom optimizations
  // The empty turbopack config below tells Next.js to use webpack instead
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
  
  // Empty turbopack config to explicitly use webpack instead of Turbopack
  // This is required in Next.js 16 when using webpack config
  turbopack: {},
};

export default nextConfig;
