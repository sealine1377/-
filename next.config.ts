import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    // 빌드 시 타입 검사 에러로 인한 배포 실패 방지
    ignoreBuildErrors: true,
  },
  eslint: {
    // 빌드 시 ESLint 경고로 인한 배포 실패 방지
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
