/** @type {import('next').NextConfig} */
const nextConfig = {
  staticPageGenerationTimeout: 120,
  // Erlaube Next.js <Image> mit lokal hochgeladenen Dateien aus /public/uploads
  images: {
    remotePatterns: [],
    localPatterns: [
      { pathname: '/uploads/**' },
    ],
  },
};
module.exports = nextConfig;
