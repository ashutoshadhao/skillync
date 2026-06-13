/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclude pdfjs-dist from webpack bundling — it uses ES module syntax (.mjs)
  // that webpack can't process in the RSC context
  experimental: {
    serverComponentsExternalPackages: ["pdfjs-dist"],
  },
};

export default nextConfig;
