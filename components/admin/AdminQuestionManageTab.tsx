'use client';

import Link from 'next/link';

export interface QuestionItem {
  id: string;
  title: string;
  year: number | null;
  exam_type: string;
  category: string;
  sub_category: string;
  pdf_url: string;
  created_at: string;
  avg_rating: number;
  rating_count: number;
}

export type SortOption = 'year_desc' | 'year_asc' | 'rating_desc' | 'rating_asc';

interface AdminQuestionManageTabProps {
  questions: QuestionItem[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  onOpenManageModal: (q: QuestionItem) => void;
}

export default function AdminQuestionManageTab({
  questions,
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  onOpenManageModal,
}: AdminQuestionManageTabProps) {
  return (
    <section className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
      {/* 검색 및 정렬 컨트롤 */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b pb-4">
        <input
          type="text"
          placeholder="🔍 지문 제목 검색..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full md:w-80 p-2.5 border rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <span className="text-xs font-bold text-gray-500">정렬:</span>
          <select
            value={sortOption}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="p-2 border rounded-lg text-xs font-bold bg-white text-gray-700"
          >
            <option value="year_desc">📅 시행연월 내림차순 (최신순)</option>
            <option value="year_asc">📅 시행연월 오름차순 (오래된순)</option>
            <option value="rating_desc">★ 별점 높은순</option>
            <option value="rating_asc">★ 별점 낮은순</option>
          </select>
        </div>
      </div>

      {/* 지문 테이블 */}
      {questions.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-xs">검색 결과가 없습니다.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b text-gray-600 font-bold uppercase">
                <th className="py-2.5 px-3">지문 제목 (클릭 시 열람)</th>
                <th className="py-2.5 px-3">2차 태그</th>
                <th className="py-2.5 px-3">별점</th>
                <th className="py-2.5 px-3 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y text-gray-800 font-medium">
              {questions.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50 transition">
                  <td className="py-3 px-3">
                    <Link
                      href={`/passages/${q.id}`}
                      target="_blank"
                      className="font-bold text-gray-900 hover:text-blue-600 hover:underline flex items-center gap-1.5"
                    >
                      <span>{q.title}</span>
                      <span className="text-[10px] text-blue-500 font-normal">↗</span>
                    </Link>
                  </td>
                  <td className="py-3 px-3 text-gray-600">{q.sub_category || '-'}</td>
                  <td className="py-3 px-3 font-bold text-amber-600">
                    ★ {q.avg_rating > 0 ? q.avg_rating : '-'}{' '}
                    <span className="text-gray-400 font-normal">({q.rating_count})</span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onOpenManageModal(q)}
                      className="px-3 py-1 bg-gray-900 hover:bg-black text-white font-bold rounded-lg transition"
                    >
                      ⚙️ 관리
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}