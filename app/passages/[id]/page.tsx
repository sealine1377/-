'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

import PassageHeader from '@/components/PassageHeader';
import PdfViewer from '@/components/PdfViewer';
import RatingSection from '@/components/RatingSection';
import TagSection, { OfficialTag, ReviewItem } from '@/components/TagSection';
import AdminTagEditModal from '@/components/AdminTagEditModal';

interface Question {
  id: string;
  title: string;
  year: number;
  exam_type: string;
  category: string;
  sub_category: string;
  passage_text?: string;
  pdf_url: string;
}

interface RelatedQuestion {
  id: string;
  title: string;
  year: number;
  exam_type: string;
  sub_category: string;
  shared_tags: string[];
}

function PassageContent() {
  const params = useParams();
  const passageId = params?.id as string;

  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);

  // 우측 분석 패널 열림/닫힘 상태
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // 권한 상태
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // 화면 테마
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>('light');

  // 별점 상태
  const [avgRating, setAvgRating] = useState<number>(0);
  const [userRating, setUserRating] = useState<number>(0);
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [hasRated, setHasRated] = useState<boolean>(false);

  // 3차 공식 태그 & 4차 한줄평 데이터
  const [officialTags, setOfficialTags] = useState<OfficialTag[]>([]);
  const [attachedSkillIds, setAttachedSkillIds] = useState<string[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [votedReviewIds, setVotedReviewIds] = useState<Record<string, 'like' | 'dislike'>>({});

  // 3차 능력 기반 연계 추천 지문 목록
  const [relatedQuestions, setRelatedQuestions] = useState<RelatedQuestion[]>([]);

  useEffect(() => {
    if (!passageId) return;

    checkAuthRole();

    const savedTheme = localStorage.getItem('reading_theme') as 'light' | 'dark' | 'sepia';
    if (savedTheme) setTheme(savedTheme);

    const savedRating = localStorage.getItem(`rating_${passageId}`);
    if (savedRating) {
      setUserRating(Number(savedRating));
      setHasRated(true);
    }

    const savedVotes = localStorage.getItem(`voted_reviews_${passageId}`);
    if (savedVotes) {
      try {
        setVotedReviewIds(JSON.parse(savedVotes));
      } catch (e) {
        console.error(e);
      }
    }

    fetchQuestionData(true);
  }, [passageId]);

  const checkAuthRole = () => {
    const savedRole = localStorage.getItem('user_role');
    setIsAdmin(savedRole === 'admin');
  };

  const handleToggleAdminRole = () => {
    const nextRole = !isAdmin;
    setIsAdmin(nextRole);
    localStorage.setItem('user_role', nextRole ? 'admin' : 'user');
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'sepia') => {
    setTheme(newTheme);
    localStorage.setItem('reading_theme', newTheme);
  };

  const fetchQuestionData = async (isInitial = false) => {
    if (isInitial) setLoading(true);

    const { data: qData } = await supabase
      .from('questions')
      .select('*')
      .eq('id', passageId)
      .single();

    if (qData) setQuestion(qData);

    const { data: rData } = await supabase
      .from('ratings')
      .select('score')
      .eq('question_id', passageId);

    if (rData && rData.length > 0) {
      const total = rData.reduce((acc, cur) => acc + cur.score, 0);
      setAvgRating(Number((total / rData.length).toFixed(1)));
      setRatingCount(rData.length);
    }

    const { data: officialSkillData } = await supabase
      .from('question_official_tags')
      .select('tag_id')
      .eq('question_id', passageId);

    const officialIds = officialSkillData?.map((s) => s.tag_id) || [];
    setAttachedSkillIds(officialIds);

    let currentOfficialTagList: OfficialTag[] = [];

    if (officialIds.length > 0) {
      const { data: tagData } = await supabase
        .from('tags')
        .select('*')
        .in('id', officialIds);

      if (tagData) {
        currentOfficialTagList = tagData.map((t) => ({ id: t.id, name: t.tag_name || t.name || '' }));
        setOfficialTags(currentOfficialTagList);
      }

      const { data: relatedTagMappings } = await supabase
        .from('question_official_tags')
        .select('question_id, tag_id')
        .in('tag_id', officialIds)
        .neq('question_id', passageId);

      if (relatedTagMappings && relatedTagMappings.length > 0) {
        const qToSharedTagIds: Record<string, string[]> = {};
        relatedTagMappings.forEach((m) => {
          if (!qToSharedTagIds[m.question_id]) {
            qToSharedTagIds[m.question_id] = [];
          }
          if (!qToSharedTagIds[m.question_id].includes(m.tag_id)) {
            qToSharedTagIds[m.question_id].push(m.tag_id);
          }
        });

        const uniqueQIds = Object.keys(qToSharedTagIds).slice(0, 3);

        const { data: relatedQData } = await supabase
          .from('questions')
          .select('id, title, year, exam_type, sub_category')
          .in('id', uniqueQIds);

        const tagMap = new Map(currentOfficialTagList.map((t) => [t.id, t.name]));

        if (relatedQData) {
          const formattedRelated: RelatedQuestion[] = relatedQData.map((rq) => {
            const sharedNames = (qToSharedTagIds[rq.id] || [])
              .map((tId) => tagMap.get(tId))
              .filter((name): name is string => Boolean(name));

            return {
              ...rq,
              shared_tags: sharedNames,
            };
          });

          setRelatedQuestions(formattedRelated);
        }
      } else {
        setRelatedQuestions([]);
      }
    } else {
      setOfficialTags([]);
      setRelatedQuestions([]);
    }

    const { data: reviewData } = await supabase
      .from('reviews')
      .select('*')
      .eq('question_id', passageId)
      .order('likes_count', { ascending: false });

    if (reviewData) {
      setReviews(reviewData);
    }

    if (isInitial) setLoading(false);
  };

  const handleRate = async (score: number) => {
    const savedRatingId = localStorage.getItem(`rating_id_${passageId}`);

    if (hasRated) {
      if (userRating === score) return;

      const oldScore = userRating;
      const oldTotal = avgRating * ratingCount;
      const newTotal = oldTotal - oldScore + score;
      const newAvg = Number((newTotal / ratingCount).toFixed(1));

      setUserRating(score);
      setAvgRating(newAvg);
      localStorage.setItem(`rating_${passageId}`, score.toString());

      if (savedRatingId) {
        await supabase.from('ratings').update({ score }).eq('id', savedRatingId);
      } else {
        const { data } = await supabase
          .from('ratings')
          .insert([{ question_id: passageId, score }])
          .select('id')
          .single();
        if (data?.id) localStorage.setItem(`rating_id_${passageId}`, data.id);
      }
    } else {
      const newCount = ratingCount + 1;
      const newTotal = avgRating * ratingCount + score;
      const newAvg = Number((newTotal / newCount).toFixed(1));

      setUserRating(score);
      setHasRated(true);
      setRatingCount(newCount);
      setAvgRating(newAvg);
      localStorage.setItem(`rating_${passageId}`, score.toString());

      const { data } = await supabase
        .from('ratings')
        .insert([{ question_id: passageId, score }])
        .select('id')
        .single();

      if (data?.id) {
        localStorage.setItem(`rating_id_${passageId}`, data.id);
      }
    }
  };

  const handleVoteReview = async (reviewId: string, type: 'like' | 'dislike') => {
    const currentVote = votedReviewIds[reviewId];
    if (currentVote === type) return;

    const targetReview = reviews.find((r) => r.id === reviewId);
    if (!targetReview) return;

    let newLikes = targetReview.likes_count;
    let newDislikes = targetReview.dislikes_count;

    if (type === 'like') {
      newLikes += 1;
      if (currentVote === 'dislike') newDislikes = Math.max(0, newDislikes - 1);
    } else {
      newDislikes += 1;
      if (currentVote === 'like') newLikes = Math.max(0, newLikes - 1);
    }

    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? { ...r, likes_count: newLikes, dislikes_count: newDislikes }
          : r
      )
    );

    const updatedMap = { ...votedReviewIds, [reviewId]: type };
    setVotedReviewIds(updatedMap);
    localStorage.setItem(`voted_reviews_${passageId}`, JSON.stringify(updatedMap));

    await supabase
      .from('reviews')
      .update({ likes_count: newLikes, dislikes_count: newDislikes })
      .eq('id', reviewId);
  };

  const handleAddReview = async (content: string, userTitle: string, isVerified: boolean) => {
    const { error } = await supabase.from('reviews').insert([
      {
        question_id: passageId,
        content,
        user_title: userTitle,
        is_verified: isVerified,
      },
    ]);

    if (error) {
      alert(`한줄평 등록 실패: ${error.message}`);
    } else {
      fetchQuestionData();
    }
  };

  const panelThemeMap = {
    light: 'bg-white text-gray-900 border-l border-gray-200',
    dark: 'bg-gray-900 text-gray-100 border-l border-gray-800',
    sepia: 'bg-[#f4ecd8] text-[#433422] border-l border-[#e2d5b8]',
  };

  const tabThemeMap = {
    light: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 shadow-md',
    dark: 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800 shadow-md',
    sepia: 'bg-[#f4ecd8] text-[#433422] border-[#e2d5b8] hover:bg-[#eae0ca] shadow-md',
  };

  if (loading) return <div className="p-8 text-center text-gray-500">데이터를 불러오는 중...</div>;
  if (!question) return <div className="p-8 text-center text-red-500">지문을 찾을 수 없습니다.</div>;

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden">
      <PassageHeader
        title={question.title}
        pdfUrl={question.pdf_url}
        theme={theme}
        isAdmin={isAdmin}
        onThemeChange={handleThemeChange}
        onToggleAdmin={handleToggleAdminRole}
        onOpenAdminEditModal={() => setIsAdminModalOpen(true)}
      />

      {/* 메인 뷰 컨테이너 */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* PDF 뷰어 영역 (패널이 닫히면 전체 너비 차지) */}
        <div className="flex-1 h-full min-h-0 w-full overflow-hidden relative">
          <PdfViewer pdfUrl={question.pdf_url} theme={theme} />
        </div>

        {/* 우측 분석 패널 래퍼 (절대 짤리지 않는 서랍형 탭) */}
        <div className="relative h-full flex shrink-0 z-20">
          {/* 서랍 손잡이 탭 버튼: 동일한 top-6 위치에서 왼쪽으로 톡 튀어나옴 */}
          <button
            onClick={() => setIsPanelOpen((prev) => !prev)}
            title={isPanelOpen ? '분석 패널 접기' : '분석 패널 펼치기'}
            className={`absolute -left-9 top-6 z-30 flex items-center justify-center w-9 h-11 border border-r-0 rounded-l-xl transition-all cursor-pointer ${tabThemeMap[theme]}`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
          </button>

          {/* 패널 본문 (열려 있을 때만 노출) */}
          {isPanelOpen && (
            <div className={`w-[360px] lg:w-[420px] h-full min-h-0 p-6 overflow-y-auto space-y-8 transition-all shrink-0 ${panelThemeMap[theme]}`}>
              <div className="border-b pb-4 border-black/10 dark:border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-600">
                  <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/50 rounded">{question.exam_type}</span>
                  <span className="px-2 py-0.5 bg-black/5 rounded">{question.year}학년도</span>
                  <span className="px-2 py-0.5 bg-black/5 rounded">
                    {question.category} / {question.sub_category}
                  </span>
                </div>

                <h2 className="text-xl font-bold leading-snug pt-1">{question.title}</h2>
              </div>

              <RatingSection
                avgRating={avgRating}
                ratingCount={ratingCount}
                userRating={userRating}
                hasRated={hasRated}
                onRate={handleRate}
              />

              <TagSection
                officialTags={officialTags}
                reviews={reviews}
                votedReviewIds={votedReviewIds}
                onVoteReview={handleVoteReview}
                onAddReview={handleAddReview}
              />

              {/* 연계 독해 지문 추천 모듈 */}
              {relatedQuestions.length > 0 && (
                <div className="border-t pt-5 border-black/10 dark:border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      🔗 동일 독해 메커니즘 연계 지문
                    </h3>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                      3차 능력 연계
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {relatedQuestions.map((rq) => (
                      <Link
                        key={rq.id}
                        href={`/passages/${rq.id}`}
                        className="block p-3 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 hover:border-blue-500 transition group"
                      >
                        <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 mb-1">
                          <span>{rq.exam_type}</span>
                          <span>·</span>
                          <span>{rq.year}학년도</span>
                          <span>·</span>
                          <span>{rq.sub_category}</span>
                        </div>
                        <div className="text-xs font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition line-clamp-1 mb-2">
                          {rq.title}
                        </div>

                        {rq.shared_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {rq.shared_tags.map((tagName, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-[10px] font-bold rounded-md"
                              >
                                #{tagName}
                              </span>
                            ))}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {question.passage_text && (
                <div className="border-t pt-4 border-black/10 dark:border-white/10">
                  <h3 className="text-sm font-bold mb-2">지문 요약 및 메모</h3>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap bg-black/5 p-3 rounded-lg border border-black/5">
                    {question.passage_text}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <AdminTagEditModal
        questionId={passageId}
        initialData={{
          year: question.year,
          exam_type: question.exam_type,
          category: question.category,
          sub_category: question.sub_category,
        }}
        attachedSkillIds={attachedSkillIds}
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onSuccess={() => fetchQuestionData()}
      />
    </div>
  );
}

export default function PassageDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">데이터를 불러오는 중...</div>}>
      <PassageContent />
    </Suspense>
  );
}