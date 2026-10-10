'use client';

import { useState } from 'react';

export interface Tag {
  id: string;
  name: string;
  tier: number;
}

export interface ReviewItem {
  id: string;
  question_id: string;
  content: string;
  user_title: string;
  is_verified: boolean;
  likes_count: number;
  created_at: string;
}

interface AdminGlobalTagsTabProps {
  tagsTier3: Tag[];
  topReviews: ReviewItem[];
  onAddTier3Tag: (name: string) => Promise<void>;
  onDeleteTag: (id: string) => Promise<void>;
  onPromoteReviewToTag: (content: string) => Promise<void>;
}

export default function AdminGlobalTagsTab({
  tagsTier3,
  topReviews,
  onAddTier3Tag,
  onDeleteTag,
  onPromoteReviewToTag,
}: AdminGlobalTagsTabProps) {
  const [newSkillTag, setNewSkillTag] = useState('');
  const [tagMsg, setTagMsg] = useState('');

  const handleSubmitTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillTag.trim()) return;

    await onAddTier3Tag(newSkillTag.trim());
    setNewSkillTag('');
    setTagMsg('✅ 3차 독해 능력 태그가 등록되었습니다.');
  };

  return (
    <div className="space-y-6">
      {/* 3차 공식 독해 능력 태그 관리 */}
      <section className="bg-white p-6 rounded-xl border shadow-sm space-y-5">
        <h2 className="text-lg font-bold text-gray-800">🧠 3차 독해 능력 태그 관리 (공식 필터용)</h2>
        <form onSubmit={handleSubmitTag} className="flex gap-2">
          <input
            type="text"
            placeholder="새 핵심 독해 능력 입력 (예: 거시적 붙여읽기)"
            value={newSkillTag}
            onChange={(e) => setNewSkillTag(e.target.value)}
            className="flex-1 p-2 border rounded-lg text-sm"
          />
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg">
            3차 태그 추가
          </button>
        </form>
        {tagMsg && <p className="text-xs font-bold text-blue-600">{tagMsg}</p>}
        <div className="flex flex-wrap gap-2 pt-2">
          {tagsTier3.map((tag) => (
            <span
              key={tag.id}
              className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold rounded-lg flex items-center gap-2"
            >
              #{tag.name}
              <button onClick={() => onDeleteTag(tag.id)} className="text-red-500 hover:text-red-700 font-normal">
                ✕
              </button>
            </span>
          ))}
        </div>
      </section>

      {/* 인기 유저 한줄평 검토 및 3차 태그 승격 */}
      <section className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-gray-800">💬 인기 유저 한줄평 검토 및 3차 태그 승격</h2>
        <div className="space-y-2">
          {topReviews.length === 0 ? (
            <p className="text-xs text-gray-400 py-4">공감을 받은 유저 한줄평이 아직 없습니다.</p>
          ) : (
            topReviews.map((rev) => (
              <div key={rev.id} className="p-3 bg-gray-50 border rounded-lg flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-600">👍 {rev.likes_count}</span>
                    <span className="font-semibold text-gray-700">[{rev.user_title}]</span>
                  </div>
                  <p className="font-medium text-gray-900">{rev.content}</p>
                </div>
                <button
                  onClick={() => onPromoteReviewToTag(rev.content)}
                  className="px-3 py-1.5 bg-green-600 text-white font-bold text-xs rounded-lg hover:bg-green-700 shrink-0"
                >
                  3차 태그로 승격 ⬆
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}