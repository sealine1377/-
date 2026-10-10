'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import AuthModal from '@/components/AuthModal';

interface QuestionDetail {
  id: string;
  title: string;
  year: number;
  exam_type: string;
  category: string;
  sub_category: string;
  pdf_url: string;
  created_at: string;
}

interface TagItem {
  id: string;
  name: string;
  tier: number;
}

interface ReviewItem {
  id: string;
  question_id: string;
  content: string;
  user_title: string;
  likes_count: number;
  dislikes_count: number;
  created_at: string;
  user_id?: string;
}

interface LinkedQuestion {
  id: string;
  title: string;
  year: number;
  exam_type: string;
  sub_category: string;
  shared_skills: string[];
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
}

export default function PassageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const passageId = params.id as string;

  // 데이터 상태
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [officialSkills, setOfficialSkills] = useState<TagItem[]>([]);
  const [linkedQuestions, setLinkedQuestions] = useState<LinkedQuestion[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [myRating, setMyRating] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // 패널 서랍 토글 상태
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // 테마 상태
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>('light');

  // 인증 및 프로필 상태
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // 신규 한줄평 작성 폼 상태
  const [newReviewContent, setNewReviewContent] = useState('');
  const [newUserTitle, setNewUserTitle] = useState('칭호: 불꽃 독해자');

  useEffect(() => {
    const savedTheme = localStorage.getItem('reading_theme') as 'light' | 'dark' | 'sepia';
    if (savedTheme) setTheme(savedTheme);

    fetchAuthAndData();

    // Supabase 인증 상태 변화 감지
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      fetchAuthAndData();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [passageId]);

  const fetchAuthAndData = async () => {
    setLoading(true);

    // 1. 현재 사용자 로그인 정보 확인
    const { data: { user } } = await supabase.auth.getUser();
    let profileData: UserProfile | null = null;

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        profileData = profile as UserProfile;
        setCurrentUserProfile(profileData);
      }
    } else {
      setCurrentUserProfile(null);
    }

    // 2. 지문 기본 메타데이터 로드
    const { data: qData, error: qError } = await supabase
      .from('questions')
      .select('*')
      .eq('id', passageId)
      .single();

    if (qError || !qData) {
      setLoading(false);
      return;
    }
    setQuestion(qData);

    // 3. 지문 별점 정보 및 내 별점 로드
    const { data: rData } = await supabase
      .from('ratings')
      .select('*')
      .eq('question_id', passageId);

    if (rData && rData.length > 0) {
      const total = rData.reduce((acc, cur) => acc + cur.score, 0);
      setAvgRating(Number((total / rData.length).toFixed(1)));
      setRatingCount(rData.length);

      if (user) {
        const mine = rData.find((r) => r.user_id === user.id);
        if (mine) setMyRating(mine.score);
      }
    } else {
      setAvgRating(0);
      setRatingCount(0);
      setMyRating(0);
    }

    // 4. 3차 공식 독해 능력 태그 로드
    const { data: tagMapData } = await supabase
      .from('question_official_tags')
      .select('tag_id')
      .eq('question_id', passageId);

    const tagIds = tagMapData?.map((t) => t.tag_id) || [];
    let skills: TagItem[] = [];

    if (tagIds.length > 0) {
      const { data: skillTags } = await supabase
        .from('tags')
        .select('*')
        .in('id', tagIds);

      if (skillTags) {
        skills = skillTags.map((t) => ({
          id: t.id,
          name: t.tag_name || t.name || '',
          tier: 3,
        }));
        setOfficialSkills(skills);
      }
    } else {
      setOfficialSkills([]);
    }

    // 5. 연계 추천 지문 로드 (동일한 3차 독해 능력을 공유하는 지문)
    if (tagIds.length > 0) {
      const { data: sharedMapData } = await supabase
        .from('question_official_tags')
        .select('question_id, tag_id')
        .in('tag_id', tagIds)
        .neq('question_id', passageId);

      if (sharedMapData && sharedMapData.length > 0) {
        const sharedQIds = Array.from(new Set(sharedMapData.map((s) => s.question_id)));

        const { data: linkedQData } = await supabase
          .from('questions')
          .select('*')
          .in('id', sharedQIds)
          .limit(5);

        if (linkedQData) {
          const linkedList: LinkedQuestion[] = linkedQData.map((lq) => {
            const sharedTagIds = sharedMapData
              .filter((sm) => sm.question_id === lq.id)
              .map((sm) => sm.tag_id);

            const sharedNames = skills
              .filter((sk) => sharedTagIds.includes(sk.id))
              .map((sk) => sk.name);

            return {
              id: lq.id,
              title: lq.title,
              year: lq.year,
              exam_type: lq.exam_type,
              sub_category: lq.sub_category,
              shared_skills: sharedNames,
            };
          });

          setLinkedQuestions(linkedList);
        }
      } else {
        setLinkedQuestions([]);
      }
    }

    // 6. 4차 유저 한줄평 및 공감 피드 로드
    const { data: revData } = await supabase
      .from('reviews')
      .select('*')
      .eq('question_id', passageId)
      .order('likes_count', { ascending: false });

    if (revData) {
      setReviews(revData);
    }

    setLoading(false);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'sepia') => {
    setTheme(newTheme);
    localStorage.setItem('reading_theme', newTheme);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setCurrentUserProfile(null);
  };

  // 로그인 필수 검증 함수
  const requireAuth = (): boolean => {
    if (!currentUserProfile) {
      alert('🔒 로그인 후 이용 가능한 기능입니다.');
      setIsAuthModalOpen(true);
      return false;
    }
    return true;
  };

  // 별점 남기기
  const handleRatingSubmit = async (score: number) => {
    if (!requireAuth()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('ratings').upsert(
      [
        {
          question_id: passageId,
          user_id: user.id,
          score,
        },
      ],
      { onConflict: 'question_id,user_id' }
    );

    if (error) {
      alert(`별점 등록 실패: ${error.message}`);
    } else {
      setMyRating(score);
      alert('⭐ 별점 평가가 제출되었습니다!');
      fetchAuthAndData();
    }
  };

  // 한줄평 작성 제출
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireAuth()) return;

    if (!newReviewContent.trim()) {
      alert('한줄평 내용을 입력해 주세요.');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('reviews').insert([
      {
        question_id: passageId,
        user_id: user.id,
        content: newReviewContent.trim(),
        user_title: newUserTitle,
        likes_count: 0,
        dislikes_count: 0,
      },
    ]);

    if (error) {
      alert(`한줄평 작성 실패: ${error.message}`);
    } else {
      setNewReviewContent('');
      alert('💬 유저 한줄평이 추가되었습니다!');
      fetchAuthAndData();
    }
  };

  // 한줄평 공감 (좋아요 / 싫어요)
  const handleReviewReaction = async (reviewId: string, type: 'like' | 'dislike') => {
    if (!requireAuth()) return;

    const target = reviews.find((r) => r.id === reviewId);
    if (!target) return;

    const newLikes = type === 'like' ? target.likes_count + 1 : target.likes_count;
    const newDislikes = type === 'dislike' ? target.dislikes_count + 1 : target.dislikes_count;

    const { error } = await supabase
      .from('reviews')
      .update({
        likes_count: newLikes,
        dislikes_count: newDislikes,
      })
      .eq('id', reviewId);

    if (!error) {
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, likes_count: newLikes, dislikes_count: newDislikes } : r
        )
      );
    }
  };

  const isRealAdmin = currentUserProfile?.role === 'admin';

  // 테마 매핑
  const themeBgMap = {
    light: 'bg-gray-100 text-gray-900',
    dark: 'bg-gray-950 text-gray-100',
    sepia: 'bg-[#f4ecd8] text-[#433422]',
  };

  const headerBgMap = {
    light: 'bg-white border-b border-gray-200 text-gray-800',
    dark: 'bg-gray-900 border-b border-gray-800 text-gray-100',
    sepia: 'bg-[#e8decb] border-b border-[#e0d3b6] text-[#433422]',
  };

  const panelBgMap = {
    light: 'bg-white border-l border-gray-200 text-gray-900',
    dark: 'bg-gray-900 border-l border-gray-800 text-gray-100',
    sepia: 'bg-[#e8decb] border-l border-[#e0d3b6] text-[#433422]',
  };

  const boxBgMap = {
    light: 'bg-gray-50 border-gray-200',
    dark: 'bg-gray-800/50 border-gray-700',
    sepia: 'bg-[#f4ecd8] border-[#d8ccb0]',
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">
        지문 데이터를 불러오는 중...
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <p className="font-bold text-gray-600">존재하지 않거나 삭제된 지문입니다.</p>
        <Link href="/" className="px-4 py-2 bg-black text-white rounded-lg text-xs font-bold">
          메인으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${themeBgMap[theme]}`}>
      {/* 상단 네비게이션 헤더 */}
      <header className={`px-6 py-3 flex items-center justify-between shadow-sm transition-colors z-20 ${headerBgMap[theme]}`}>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-xs font-bold px-2.5 py-1.5 bg-black/5 dark:bg-white/10 rounded-lg hover:bg-black/10 transition"
          >
            ← 메인 목록
          </Link>
          <span className="text-lg font-black tracking-tight">{question.title}</span>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded">
            {question.exam_type} ({question.year}학년도)
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* 테마 스위치 */}
          <div className="flex items-center gap-1 bg-black/5 dark:bg-white/10 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => handleThemeChange('light')}
              className={`px-2.5 py-1 rounded transition ${theme === 'light' ? 'bg-white text-black shadow-sm font-bold' : 'opacity-60'}`}
            >
              ☀️ 라이트
            </button>
            <button
              onClick={() => handleThemeChange('sepia')}
              className={`px-2.5 py-1 rounded transition ${theme === 'sepia' ? 'bg-[#f4ecd8] text-[#433422] shadow-sm font-bold' : 'opacity-60'}`}
            >
              📜 세피아
            </button>
            <button
              onClick={() => handleThemeChange('dark')}
              className={`px-2.5 py-1 rounded transition ${theme === 'dark' ? 'bg-gray-700 text-white shadow-sm font-bold' : 'opacity-60'}`}
            >
              🌙 다크
            </button>
          </div>

          {/* 사용자 로그인/프로필 상태 */}
          {currentUserProfile ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 bg-black/5 dark:bg-white/10 rounded-lg">
                👤 {currentUserProfile.username}님
                {isRealAdmin && <span className="text-amber-600 font-extrabold ml-1">(👑 admin)</span>}
              </span>

              {isRealAdmin && (
                <Link
                  href="/admin"
                  className="px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-700 transition"
                >
                  ⚙️ 관리자
                </Link>
              )}

              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs rounded-lg transition"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3.5 py-1.5 bg-black text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition"
            >
              🔑 로그인 / 회원가입
            </button>
          )}
        </div>
      </header>

      {/* 메인 콘텐츠 메인 뷰어 & 서랍형 분석 패널 */}
      <div className="flex-1 flex relative overflow-hidden h-[calc(100vh-57px)]">
        {/* PDF 원본 지문 뷰어 */}
        <div className="flex-1 h-full bg-gray-200 dark:bg-gray-900 relative">
          {question.pdf_url ? (
            <iframe
              src={`${question.pdf_url}#toolbar=0&navpanes=0`}
              className="w-full h-full border-none"
              title={question.title}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-sm font-bold text-gray-500">
              등록된 PDF 지문 파일이 없습니다.
            </div>
          )}
        </div>

        {/* 우측 서랍형 분석 패널 토글 버튼 */}
        <button
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-30 px-2 py-4 bg-gray-900 text-white text-xs font-bold rounded-l-xl shadow-2xl transition-all duration-300 hover:bg-black ${
            isPanelOpen ? 'mr-[380px]' : 'mr-0'
          }`}
          title={isPanelOpen ? '분석 패널 접기' : '분석 패널 펼치기'}
        >
          {isPanelOpen ? '▶' : '◀ 분석 패널'}
        </button>

        {/* 우측 분석 패널 */}
        <div
          className={`w-[380px] h-full overflow-y-auto p-6 space-y-6 shadow-xl transition-all duration-300 z-20 ${
            panelBgMap[theme]
          } ${isPanelOpen ? 'translate-x-0' : 'translate-x-full absolute right-0'}`}
        >
          {/* 패널 타이틀 & PDF 다운로드 */}
          <div className="border-b border-black/10 dark:border-white/10 pb-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black tracking-tight">📊 지문 분석 & 한줄평 피드</h3>
              {question.pdf_url && (
                <a
                  href={question.pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition"
                >
                  📥 PDF 다운로드
                </a>
              )}
            </div>
            <p className="text-xs opacity-70">
              2차 표면 주제: <b>{question.sub_category || '미지정'}</b>
            </p>
          </div>

          {/* 3차 공식 독해 능력 배지 */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold opacity-80">🧠 3차 공식 독해 능력 (불변 핵심 태그)</h4>
            <div className="flex flex-wrap gap-1.5">
              {officialSkills.length === 0 ? (
                <span className="text-xs text-gray-400">등록된 3차 독해 능력이 없습니다.</span>
              ) : (
                officialSkills.map((s) => (
                  <span
                    key={s.id}
                    className="px-2.5 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold rounded-lg"
                  >
                    #{s.name}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* ⭐ 별점 평가 섹션 (로그인 시에만 작동) */}
          <div className={`p-4 rounded-xl border space-y-3 ${boxBgMap[theme]}`}>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold">⭐ 지문 체감 난이도 평가</span>
              <span className="text-xs font-black text-amber-500">
                ★ {avgRating > 0 ? avgRating : '-'} <span className="text-gray-400 font-normal">({ratingCount}명)</span>
              </span>
            </div>

            <div className="flex justify-center gap-2 pt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRatingSubmit(star)}
                  className={`text-xl transition-transform hover:scale-125 ${
                    star <= myRating ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'
                  }`}
                  title={`${star}점 부여`}
                >
                  ★
                </button>
              ))}
            </div>
            {!currentUserProfile && (
              <p className="text-[11px] text-center text-gray-400">💡 별점 등록은 로그인 후 가능합니다.</p>
            )}
          </div>

          {/* 🔗 3차 태그 연계 추천 지문 모듈 */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold opacity-80">🔗 동일 독해 능력 연계 추천 지문</h4>
            {linkedQuestions.length === 0 ? (
              <p className="text-xs text-gray-400 italic">공유하는 독해 능력 연계 지문이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {linkedQuestions.map((lq) => (
                  <Link
                    key={lq.id}
                    href={`/passages/${lq.id}`}
                    className={`block p-3 rounded-xl border transition hover:border-blue-500 ${boxBgMap[theme]}`}
                  >
                    <div className="flex justify-between items-start text-xs font-bold">
                      <span className="line-clamp-1">{lq.title}</span>
                      <span className="text-[10px] text-blue-600 shrink-0 ml-2">
                        {lq.year} {lq.exam_type}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {lq.shared_skills.map((skillName, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-medium rounded"
                        >
                          #{skillName}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 💬 4차 유저 한줄평 & 칭호 인증 피드 */}
          <div className="space-y-4 pt-2 border-t border-black/10 dark:border-white/10">
            <h4 className="text-xs font-bold opacity-80">💬 유저 체감 한줄평 & 공감 피드 ({reviews.length})</h4>

            {/* 한줄평 작성 폼 */}
            <form onSubmit={handleReviewSubmit} className="space-y-2">
              <select
                value={newUserTitle}
                onChange={(e) => setNewUserTitle(e.target.value)}
                className={`w-full p-2 border rounded-lg text-xs font-bold ${boxBgMap[theme]}`}
              >
                <option value="칭호: 불꽃 독해자">🔥 칭호: 불꽃 독해자</option>
                <option value="칭호: 평가원 출제위원급">👓 칭호: 평가원 출제위원급</option>
                <option value="칭호: 구조독해 마스터">📐 칭호: 구조독해 마스터</option>
                <option value="칭호: 리트 피지컬">⚡ 칭호: 리트 피지컬</option>
              </select>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={
                    currentUserProfile
                      ? '지문에 대한 한줄평을 남겨주세요...'
                      : '로그인 후 한줄평 작성이 가능합니다.'
                  }
                  value={newReviewContent}
                  onChange={(e) => setNewReviewContent(e.target.value)}
                  onClick={() => {
                    if (!currentUserProfile) requireAuth();
                  }}
                  className={`flex-1 p-2 border rounded-lg text-xs ${boxBgMap[theme]}`}
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-black dark:bg-white dark:text-black text-white text-xs font-bold rounded-lg hover:opacity-80 transition"
                >
                  등록
                </button>
              </div>
            </form>

            {/* 한줄평 목록 */}
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {reviews.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">가장 먼저 한줄평을 작성해 보세요!</p>
              ) : (
                reviews.map((rev) => (
                  <div key={rev.id} className={`p-3 rounded-xl border text-xs space-y-1.5 ${boxBgMap[theme]}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-blue-600 text-[11px]">{rev.user_title}</span>
                      <div className="flex gap-2 text-[11px]">
                        <button
                          onClick={() => handleReviewReaction(rev.id, 'like')}
                          className="hover:text-blue-600 font-bold"
                        >
                          👍 {rev.likes_count}
                        </button>
                        <button
                          onClick={() => handleReviewReaction(rev.id, 'dislike')}
                          className="hover:text-red-600 font-bold opacity-60"
                        >
                          👎 {rev.dislikes_count}
                        </button>
                      </div>
                    </div>
                    <p className="font-medium leading-relaxed">{rev.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 로그인/회원가입 모달 */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={fetchAuthAndData}
      />
    </div>
  );
}
