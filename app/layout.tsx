import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '평가원 평가하기',
  description: '수능 및 LEET 기출 지문 분석 플랫폼',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
