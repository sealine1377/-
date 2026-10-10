'use client';

import Link from 'next/link';

interface PassageHeaderProps {
  title: string;
  pdfUrl?: string;
  theme: 'light' | 'dark' | 'sepia';
  isAdmin: boolean;
  onThemeChange: (theme: 'light' | 'dark' | 'sepia') => void;
  onToggleAdmin: () => void;
  onOpenAdminEditModal?: () => void;
}

export default function PassageHeader({
  title,
  pdfUrl,
  theme,
  isAdmin,
  onThemeChange,
  onToggleAdmin,
  onOpenAdminEditModal,
}: PassageHeaderProps) {
  const headerBgMap = {
    light: 'bg-white border-b border-gray-200 text-gray-800',
    dark: 'bg-gray-900 border-b border-gray-800 text-gray-100',
    sepia: 'bg-[#f4ecd8] border-b border-[#e2d5b8] text-[#433422]',
  };

  return (
    <header className={`px-6 py-3 flex items-center justify-between shrink-0 shadow-sm z-10 transition-colors ${headerBgMap[theme]}`}>
      {/* 좌측: 목록으로 돌아가기 + 지문 제목 */}
      <div className="flex items-center gap-4 min-w-0">
        <Link href="/" className="opacity-70 hover:opacity-100 font-semibold text-sm shrink-0">
          ← 목록으로
        </Link>
        <h1 className="font-bold text-lg truncate">{title}</h1>
      </div>

      {/* 우측 컨트롤 기능 모음 */}
      <div className="flex items-center gap-3 shrink-0">
        {/* 관리자 모드 시 1·2·3차 태그 수정 버튼 */}
        {isAdmin && onOpenAdminEditModal && (
          <button
            onClick={onOpenAdminEditModal}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition shadow-sm"
          >
            ⚙️ 1·2·3차 태그 수정
          </button>
        )}

        {/* 권한 스위치 */}
        <button
          onClick={onToggleAdmin}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition border ${
            isAdmin
              ? 'bg-amber-100 border-amber-300 text-amber-900'
              : 'bg-black/5 border-black/10 text-gray-600'
          }`}
        >
          {isAdmin ? '👑 관리자 모드' : '👤 유저 모드'}
        </button>

        {/* PDF 원본 다운로드 버튼 */}
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-sm"
          >
            📥 PDF 다운로드
          </a>
        )}

        {/* 테마 스위치 */}
        <div className="flex items-center gap-1 bg-black/5 p-1 rounded-lg text-xs font-semibold">
          <button
            onClick={() => onThemeChange('light')}
            className={`px-2 py-1 rounded transition ${theme === 'light' ? 'bg-white text-black shadow-sm' : 'opacity-60'}`}
          >
            ☀️
          </button>
          <button
            onClick={() => onThemeChange('sepia')}
            className={`px-2 py-1 rounded transition ${theme === 'sepia' ? 'bg-[#e8decb] text-[#433422] shadow-sm' : 'opacity-60'}`}
          >
            📜
          </button>
          <button
            onClick={() => onThemeChange('dark')}
            className={`px-2 py-1 rounded transition ${theme === 'dark' ? 'bg-gray-700 text-white shadow-sm' : 'opacity-60'}`}
          >
            🌙
          </button>
        </div>
      </div>
    </header>
  );
}