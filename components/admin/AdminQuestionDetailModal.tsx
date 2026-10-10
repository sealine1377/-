'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { QuestionItem } from './AdminQuestionManageTab';
import { Tag, ReviewItem } from './AdminGlobalTagsTab';

interface AdminQuestionDetailModalProps {
  question: QuestionItem;
  tagsTier3: Tag[];
  onClose: () => void;
  onSuccess: () => void;
  onDeleteQuestion: (qId: string, qTitle: string) => void;
}

export default function AdminQuestionDetailModal({
  question,
  tagsTier3,
  onClose,
  onSuccess,
  onDeleteQuestion,
}: AdminQuestionDetailModalProps) {
  const [modalTitle, setModalTitle] = useState(question.title);
  const [modalYear, setModalYear] = useState<number | string>(question.year || '');
  const [modalExamType, setModalExamType] = useState(question.exam_type || '');
  const [modalSubCategory, setModalSubCategory] = useState(question.sub_category || '');

  const [modalAttachedSkills, setModalAttachedSkills] = useState<string[]>([]);
  const [modalReviews, setModalReviews] = useState<ReviewItem[]>([]);
  const [modalSaving, setModalSaving] = useState(false);

  useEffect(() => {
    loadQuestionDetails();
  }, [question.id]);

  const loadQuestionDetails = async () => {
    const { data: skillData } = await supabase
      .from('question_official_tags')
      .select('tag_id')
      .eq('question_id', question.id);
    setModalAttachedSkills(skillData?.map((s) => s.tag_id) || []);

    const { data: revData } = await supabase
      .from('reviews')
      .select('*')
      .eq('question_id', question.id)
      .order('created_at', { ascending: false });
    setModalReviews(revData || []);
  };

  const handleSaveModal = async () => {
    setModalSaving(true);

    await supabase
      .from('questions')
      .update({
        title: modalTitle,
        year: modalYear ? Number(modalYear) : null,
        exam_type: modalExamType,
        sub_category: modalSubCategory,
      })
      .eq('id', question.id);

    await supabase.from('question_official_tags').delete().eq('question_id', question.id);

    if (modalAttachedSkills.length > 0) {
      const rows = modalAttachedSkills.map((tagId) => ({
        question_id: question.id,
        tag_id: tagId,
      }));
      await supabase.from('question_official_tags').insert(rows);
    }

    setModalSaving(false);
    onSuccess();
  };

  const handleResetRatings = async () => {
    if (!confirm('이 지문의 모든 별점 평가 데이터를 초기화하시겠습니까?')) return;

    const { error } = await supabase.from('ratings').delete().eq('question_id', question.id);
    if (error) {
      alert(`별점 초기화 실패: ${error.message}`);
    } else {
      alert('✅ 별점 데이터가 초기화되었습니다.');
      onSuccess();
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('이 한줄평을 삭제하시겠습니까?')) return;
    await supabase.from('reviews').delete().eq('id', reviewId);
    setModalReviews((prev) => prev.filter((r) => r.id !== reviewId));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-lg font-bold text-gray-900">⚙️ 지문 통합 관리</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black">
            ✕
          </button>
        </div>

        {/* 별점 초기화 박스 */}
        <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <div>
            <span className="text-xs font-bold text-amber-900 block">⭐ 별점 평가 상태</span>
            <span className="text-xs text-amber-700 font-medium">
              현재 평균: <b>★ {question.avg_rating > 0 ? question.avg_rating : '-'}</b> ({question.rating_count}명 참여)
            </span>
          </div>
          <button
            type="button"
            onClick={handleResetRatings}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition shrink-0"
          >
            별점 초기화
          </button>
        </div>

        {/* 1차/2차 메타데이터 수정 */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase">1차 시행 정보 & 2차 표면 주제</h3>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">지문 제목</label>
            <input
              type="text"
              value={modalTitle}
              onChange={(e) => setModalTitle(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm font-bold"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">시행 연도 (1차)</label>
              <input
                type="number"
                value={modalYear}
                onChange={(e) => setModalYear(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">시험 구분 (1차)</label>
              <select
                value={modalExamType}
                onChange={(e) => setModalExamType(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm bg-white font-bold text-blue-700"
              >
                <option value="">-- 직접 선택 --</option>
                <option value="수능">수능</option>
                <option value="6월모의">6월 모의고사</option>
                <option value="9월모의">9월 모의고사</option>
                <option value="LEET">LEET</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">표면 주제 (2차)</label>
              <input
                type="text"
                value={modalSubCategory}
                onChange={(e) => setModalSubCategory(e.target.value)}
                placeholder="예: 사회(경제), 과학"
                className="w-full p-2 border rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        {/* 3차 공식 독해 능력 태그 설정 */}
        <div className="space-y-3 pt-3 border-t">
          <h3 className="text-xs font-bold text-gray-500 uppercase">3차 공식 독해 능력 태그 설정</h3>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
            {tagsTier3.map((tag) => {
              const isChecked = modalAttachedSkills.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    if (isChecked) {
                      setModalAttachedSkills(modalAttachedSkills.filter((id) => id !== tag.id));
                    } else {
                      setModalAttachedSkills([...modalAttachedSkills, tag.id]);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold border transition ${
                    isChecked ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {isChecked ? '✓ ' : ''}#{tag.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4차 유저 한줄평 관리 */}
        <div className="space-y-3 pt-3 border-t">
          <h3 className="text-xs font-bold text-gray-500 uppercase">💬 작성된 4차 유저 한줄평 ({modalReviews.length})</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {modalReviews.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">등록된 한줄평이 없습니다.</p>
            ) : (
              modalReviews.map((rev) => (
                <div key={rev.id} className="p-2.5 bg-gray-50 border rounded-lg flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-blue-600">[{rev.user_title}]</span>
                    <p className="text-gray-800">{rev.content}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteReview(rev.id)}
                    className="px-2 py-1 bg-red-100 text-red-600 text-[10px] font-bold rounded hover:bg-red-200"
                  >
                    삭제
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 하단 모달 컨트롤 */}
        <div className="flex justify-between items-center pt-4 border-t">
          <button
            onClick={() => onDeleteQuestion(question.id, question.title)}
            className="px-3.5 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs rounded-xl transition"
          >
            🗑️ 지문 영구 삭제
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={handleSaveModal}
              disabled={modalSaving}
              className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 disabled:bg-gray-300 transition"
            >
              {modalSaving ? '저장 중...' : '수정 사항 저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}