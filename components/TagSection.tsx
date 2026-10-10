'use client';

import { useState } from 'react';

export interface OfficialTag {
  id: string;
  name: string;
}

export interface ReviewItem {
  id: string;
  content: string;
  user_title: string;
  is_verified: boolean;
  likes_count: number;
  dislikes_count: number;
  created_at: string;
}

interface TagSectionProps {
  officialTags: OfficialTag[];
  reviews: ReviewItem[];
  votedReviewIds: Record<string, 'like' | 'dislike'>;
  onVoteReview: (reviewId: string, type: 'like' | 'dislike') => void;
  onAddReview: (content: string, userTitle: string, isVerified: boolean) => Promise<void>;
}

// 사용할 수 있는 칭호 목록 예시
const TITLE_OPTIONS = [
  { label: '🎓 서울대 국어교육과 (인증)', value: '서울대 국어교육과', verified: true },
  { label: '🎓 연세대 로스쿨 (인증)', value: '연세대 로스쿨', verified: true },
  { label: '🎓 수능 국어 1등급 (인증)', value: '수능 국어 1등급', verified: true },
  { label: '👤 수능 N수생', value: '수능 N수생', verified: false },
  { label: '👤 LEET 준비생', value: 'LEET 준비생', verified: false },
  { label: '👤 일반 독해자', value: '일반 독해자', verified: false },
];

export default function TagSection({
  officialTags,
  reviews,
  votedReviewIds,
  onVoteReview,
  onAddReview,
}: TagSectionProps) {
  const [contentInput, setContentInput] = useState('');
  const [selectedTitleIdx, setSelectedTitleIdx] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentInput.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const titleOpt = TITLE_OPTIONS[selectedTitleIdx];
    await onAddReview(contentInput.trim(), titleOpt.value, titleOpt.verified);
    setContentInput('');
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {/* 3차: 공식 독해 능력 태그 */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          🧠 지문 요구 독해 능력 (3차 공식)
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {officialTags.length === 0 ? (
            <span className="text-xs text-gray-400">지정된 공식 능력이 없습니다.</span>
          ) : (
            officialTags.map((tag) => (
              <span
                key={tag.id}
                className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold rounded-md"
              >
                #{tag.name}
              </span>
            ))
          )}
        </div>
      </div>

      {/* 4차: 한줄평 & 칭호 리뷰 피드 */}
      <div className="border-t pt-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            💬 실시간 한줄평 & 독해 팁 ({reviews.length})
          </h3>
        </div>

        {/* 한줄평 등록 폼 */}
        <form onSubmit={handleSubmit} className="bg-gray-50 p-3 rounded-xl border space-y-2 mb-5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-500">내 칭호 선택:</span>
            <select
              value={selectedTitleIdx}
              onChange={(e) => setSelectedTitleIdx(Number(e.target.value))}
              className="p-1 border rounded text-xs bg-white font-semibold text-gray-700 flex-1"
            >
              {TITLE_OPTIONS.map((opt, idx) => (
                <option key={idx} value={idx}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="지문 독해 팁이나 한줄평을 남겨주세요..."
              value={contentInput}
              onChange={(e) => setContentInput(e.target.value)}
              className="flex-1 px-3 py-1.5 border rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              maxLength={100}
            />
            <button
              type="submit"
              disabled={isSubmitting || !contentInput.trim()}
              className="px-3.5 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition shrink-0"
            >
              등록
            </button>
          </div>
        </form>

        {/* 한줄평 목록 */}
        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
          {reviews.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">
              첫 번째 한줄평을 작성해 보세요!
            </p>
          ) : (
            reviews.map((rev) => {
              const myVote = votedReviewIds[rev.id];
              return (
                <div
                  key={rev.id}
                  className="bg-white p-3 rounded-xl border shadow-sm space-y-2 hover:border-gray-300 transition"
                >
                  <div className="flex justify-between items-center">
                    {/* 칭호 및 인증 배지 */}
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          rev.is_verified
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {rev.is_verified ? '🎓 인증' : '👤'} {rev.user_title}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {new Date(rev.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* 한줄평 내용 */}
                  <p className="text-xs text-gray-800 leading-relaxed font-medium">
                    {rev.content}
                  </p>

                  {/* 좋아요 / 싫어요 버튼 */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
                    <button
                      onClick={() => onVoteReview(rev.id, 'like')}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition ${
                        myVote === 'like'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      👍 {rev.likes_count}
                    </button>
                    <button
                      onClick={() => onVoteReview(rev.id, 'dislike')}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition ${
                        myVote === 'dislike'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      👎 {rev.dislikes_count}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}