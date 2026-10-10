'use client';

export type AdminTab = 'manage' | 'upload' | 'tags' | 'users';

interface AdminTabNavProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  questionCount: number;
}

export default function AdminTabNav({ activeTab, onTabChange, questionCount }: AdminTabNavProps) {
  return (
    <div className="flex border-b border-gray-200 gap-2 overflow-x-auto">
      <button
        onClick={() => onTabChange('manage')}
        className={`px-5 py-2.5 font-bold text-sm border-b-2 transition whitespace-nowrap ${
          activeTab === 'manage'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-800'
        }`}
      >
        📂 지문 관리 ({questionCount})
      </button>
      <button
        onClick={() => onTabChange('upload')}
        className={`px-5 py-2.5 font-bold text-sm border-b-2 transition whitespace-nowrap ${
          activeTab === 'upload'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-800'
        }`}
      >
        📥 지문 업로드
      </button>
      <button
        onClick={() => onTabChange('tags')}
        className={`px-5 py-2.5 font-bold text-sm border-b-2 transition whitespace-nowrap ${
          activeTab === 'tags'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-800'
        }`}
      >
        🏷️ 태그 & 한줄평 관리
      </button>
      <button
        onClick={() => onTabChange('users')}
        className={`px-5 py-2.5 font-bold text-sm border-b-2 transition whitespace-nowrap ${
          activeTab === 'users'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-800'
        }`}
      >
        👥 사용자 & 권한 관리
      </button>
    </div>
  );
}
