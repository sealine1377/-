'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

import AdminTabNav, { AdminTab } from '@/components/admin/AdminTabNav';
import AdminQuestionManageTab, { QuestionItem, SortOption } from '@/components/admin/AdminQuestionManageTab';
import AdminBatchUploadTab from '@/components/admin/AdminBatchUploadTab';
import AdminGlobalTagsTab, { Tag, ReviewItem } from '@/components/admin/AdminGlobalTagsTab';
import AdminQuestionDetailModal from '@/components/admin/AdminQuestionDetailModal';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('manage');

  // 지문 목록 & 검색/정렬 상태
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('year_desc');

  // 개별 지문 모달 상태
  const [selectedManageQuestion, setSelectedManageQuestion] = useState<QuestionItem | null>(null);

  // 글로벌 태그 및 리뷰 상태
  const [tagsTier3, setTagsTier3] = useState<Tag[]>([]);
  const [topReviews, setTopReviews] = useState<ReviewItem[]>([]);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const getExamMonthWeight = (examType: string): number => {
    if (!examType) return 0;
    if (examType.includes('수능') || examType.includes('11월')) return 11;
    if (examType.includes('9월')) return 9;
    if (examType.includes('6월')) return 6;
    if (examType.includes('LEET')) return 7;
    const match = examType.match(/(\d+)월/);
    if (match) return parseInt(match[1], 10);
    return 0;
  };

  const fetchAdminData = async () => {
    // 1. 질문 및 별점 로드
    const { data: qData } = await supabase.from('questions').select('*');
    const { data: rData } = await supabase.from('ratings').select('question_id, score');

    const ratingMap: Record<string, { total: number; count: number }> = {};
    rData?.forEach((r) => {
      if (!ratingMap[r.question_id]) ratingMap[r.question_id] = { total: 0, count: 0 };
      ratingMap[r.question_id].total += r.score;
      ratingMap[r.question_id].count += 1;
    });

    if (qData) {
      const formatted: QuestionItem[] = qData.map((q) => {
        const rInfo = ratingMap[q.id];
        const count = rInfo?.count || 0;
        const avg = count > 0 ? Number((rInfo.total / count).toFixed(1)) : 0;
        return {
          ...q,
          avg_rating: avg,
          rating_count: count,
        };
      });
      setQuestions(formatted);
    }

    // 2. 3차 태그 로드
    const { data: tagData } = await supabase.from('tags').select('*').eq('tier', 3);
    if (tagData) {
      setTagsTier3(
        tagData.map((t) => ({
          id: t.id,
          name: t.tag_name || t.name || '',
          tier: 3,
        }))
      );
    }

    // 3. 인기 한줄평 로드
    const { data: revData } = await supabase
      .from('reviews')
      .select('*')
      .gte('likes_count', 1)
      .order('likes_count', { ascending: false })
      .limit(10);

    if (revData) {
      setTopReviews(revData);
    }
  };

  // 개별 지문 삭제
  const handleDeleteQuestion = async (qId: string, qTitle: string) => {
    if (!confirm(`'${qTitle}' 지문을 삭제하시겠습니까?\n모든 관련 별점 및 한줄평도 함께 삭제됩니다.`)) return;

    const { error } = await supabase.from('questions').delete().eq('id', qId);
    if (error) {
      alert(`삭제 실패: ${error.message}`);
    } else {
      alert('✅ 지문이 삭제되었습니다.');
      setSelectedManageQuestion(null);
      fetchAdminData();
    }
  };

  // 글로벌 3차 태그 추가
  const handleAddTier3Tag = async (name: string) => {
    const { error } = await supabase.from('tags').insert([{ name, tag_name: name, tier: 3 }]);
    if (error) {
      alert(`태그 추가 실패: ${error.message}`);
    } else {
      fetchAdminData();
    }
  };

  // 한줄평 3차 태그 승격
  const handlePromoteReviewToTag = async (content: string) => {
    if (!confirm(`'${content}' 문구를 [3차 공식 독해 능력 태그]로 승격하시겠습니까?`)) return;

    const { error } = await supabase.from('tags').insert([{ name: content, tag_name: content, tier: 3 }]);
    if (error) {
      alert(`승격 실패: ${error.message}`);
    } else {
      alert('✅ 3차 공식 독해 능력 태그로 승격되었습니다.');
      fetchAdminData();
    }
  };

  // 글로벌 태그 삭제
  const handleDeleteTag = async (id: string) => {
    if (!confirm('태그를 삭제하시겠습니까?')) return;
    await supabase.from('tags').delete().eq('id', id);
    fetchAdminData();
  };

  // 지문 필터링 및 정렬
  const filteredAndSortedQuestions = questions
    .filter((q) => q.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortOption === 'year_desc' || sortOption === 'year_asc') {
        const yearA = a.year || 0;
        const yearB = b.year || 0;
        const weightA = getExamMonthWeight(a.exam_type);
        const weightB = getExamMonthWeight(b.exam_type);
        const valA = yearA * 100 + weightA;
        const valB = yearB * 100 + weightB;
        return sortOption === 'year_desc' ? valB - valA : valA - valB;
      } else {
        const rateA = a.avg_rating || 0;
        const rateB = b.avg_rating || 0;
        return sortOption === 'rating_desc' ? rateB - rateA : rateA - rateB;
      }
    });

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-8">
      {/* 상단 네비게이션 헤더 */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">⚙️ 평가원 평가하기 관리자 시스템</h1>
          <p className="text-xs text-gray-500 mt-1">지문 다중 업로드, 목록 관리 및 태그/한줄평 종합 관리</p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition"
        >
          ← 메인 화면으로 이동
        </Link>
      </div>

      {/* 탭 북마크 바 */}
      <AdminTabNav activeTab={activeTab} onTabChange={setActiveTab} questionCount={questions.length} />

      {/* 탭 1: 지문 관리 */}
      {activeTab === 'manage' && (
        <AdminQuestionManageTab
          questions={filteredAndSortedQuestions}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortOption={sortOption}
          onSortChange={setSortOption}
          onOpenManageModal={setSelectedManageQuestion}
        />
      )}

      {/* 탭 2: 다중 일괄 업로드 */}
      {activeTab === 'upload' && <AdminBatchUploadTab onSuccess={fetchAdminData} />}

      {/* 탭 3: 글로벌 태그 & 한줄평 승격 */}
      {activeTab === 'tags' && (
        <AdminGlobalTagsTab
          tagsTier3={tagsTier3}
          topReviews={topReviews}
          onAddTier3Tag={handleAddTier3Tag}
          onDeleteTag={handleDeleteTag}
          onPromoteReviewToTag={handlePromoteReviewToTag}
        />
      )}

      {/* 개별 지문 통합 관리 모달 */}
      {selectedManageQuestion && (
        <AdminQuestionDetailModal
          question={selectedManageQuestion}
          tagsTier3={tagsTier3}
          onClose={() => setSelectedManageQuestion(null)}
          onSuccess={() => {
            setSelectedManageQuestion(null);
            fetchAdminData();
          }}
          onDeleteQuestion={handleDeleteQuestion}
        />
      )}
    </div>
  );
}