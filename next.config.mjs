/** @type {import('next').NextConfig} */
const nextConfig = {
  // WAJIB untuk Dockerfile di EasyPanel — tanpa ini image jadi besar sekali
  output: "standalone",
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
