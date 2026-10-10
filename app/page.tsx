'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import AuthModal from '@/components/AuthModal';

interface TagInfo {
  id: string;
  name: string;
  tier: number;
}

interface QuestionItem {
  id: string;
  title: string;
  year: number;
  exam_type: string;
  category: string;
  sub_category: string;
  created_at: string;
  avg_rating?: number;
  rating_count?: number;
  official_skills: string[];
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
}

export default function HomePage() {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [tier3Skills, setTier3Skills] = useState<TagInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // 테마 상태
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>('light');

  // 인증 및 프로필 상태
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // 관리자 모드 토글 (실제 admin 계정일 때만 활성화 가능)
  const [isAdminMode, setIsAdminMode] = useState(false);

  // 필터 상태
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('전체');
  const [selectedSubCategory, setSelectedSubCategory] = useState('전체');
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('reading_theme') as 'light' | 'dark' | 'sepia';
    if (savedTheme) setTheme(savedTheme);

    fetchAuthAndData();

    // Supabase 인증 상태 변화 구독
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      fetchAuthAndData();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchAuthAndData = async () => {
    setLoading(true);

    // 1. 로그인 유저 확인
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setCurrentUserProfile(profile as UserProfile);
        // admin 권한이 없으면 관리자 모드 자동 해제
        if (profile.role !== 'admin') {
          setIsAdminMode(false);
        }
      }
    } else {
      setCurrentUserProfile(null);
      setIsAdminMode(false);
    }

    // 2. 초기 데이터 로드
    const { data: tagData } = await supabase
      .from('tags')
      .select('*')
      .eq('tier', 3);

    if (tagData) {
      setTier3Skills(
        tagData.map((t) => ({
          id: t.id,
          name: t.tag_name || t.name || '',
          tier: 3,
        }))
      );
    }

    const { data: qData } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: officialTagMap } = await supabase
      .from('question_official_tags')
      .select('question_id, tag_id');

    const qSkillMap: Record<string, string[]> = {};
    officialTagMap?.forEach((m) => {
      if (!qSkillMap[m.question_id]) qSkillMap[m.question_id] = [];
      qSkillMap[m.question_id].push(m.tag_id);
    });

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
          official_skills: qSkillMap[q.id] || [],
        };
      });

      setQuestions(formatted);
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
    setIsAdminMode(false);
  };

  const handleSkillToggle = (id: string) => {
    if (selectedSkillIds.includes(id)) {
      setSelectedSkillIds(selectedSkillIds.filter((item) => item !== id));
    } else {
      setSelectedSkillIds([...selectedSkillIds, id]);
    }
  };

  const filteredQuestions = questions.filter((item) => {
    const matchesKeyword = item.title.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchesExamType = selectedExamType === '전체' || item.exam_type === selectedExamType;
    const matchesSubCategory =
      selectedSubCategory === '전체' || item.sub_category === selectedSubCategory;

    const matchesSkills =
      selectedSkillIds.length === 0 ||
      selectedSkillIds.every((sId) => item.official_skills.includes(sId));

    return matchesKeyword && matchesExamType && matchesSubCategory && matchesSkills;
  });

  const isRealAdmin = currentUserProfile?.role === 'admin';

  // 테마 스타일 매핑
  const themeBgMap = {
    light: 'bg-gray-50 text-gray-900',
    dark: 'bg-gray-950 text-gray-100',
    sepia: 'bg-[#f4ecd8] text-[#433422]',
  };

  const headerBgMap = {
    light: 'bg-white border-b border-gray-200 text-gray-800',
    dark: 'bg-gray-900 border-b border-gray-800 text-gray-100',
    sepia: 'bg-[#e8decb] border-b border-[#e0d3b6] text-[#433422]',
  };

  const cardBgMap = {
    light: 'bg-white border-gray-200 hover:border-blue-400 text-gray-900',
    dark: 'bg-gray-900 border-gray-800 hover:border-blue-500 text-gray-100',
    sepia: 'bg-[#e0d5be] border-[#d8ccb0] hover:border-blue-600 text-[#433422]',
  };

  const panelBgMap = {
    light: 'bg-white border-gray-200',
    dark: 'bg-gray-900 border-gray-800',
    sepia: 'bg-[#e8decb] border-[#e0d3b6]',
  };

  const inputBgMap = {
    light: 'bg-white border-gray-200 text-gray-800',
    dark: 'bg-gray-800 border-gray-700 text-gray-100',
    sepia: 'bg-[#f4ecd8] border-[#d8ccb0] text-[#433422]',
  };

  return (
    <div className={`min-h-screen transition-colors ${themeBgMap[theme]}`}>
      {/* 상단 네비게이션 */}
      <header className={`px-8 py-4 flex items-center justify-between shadow-sm transition-colors ${headerBgMap[theme]}`}>
        <div className="flex items-center">
          <span className="text-2xl font-black text-black dark:text-white tracking-tight">
            평가원 평가하기
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

          {/* 로그인 / 사용자 프로필 표시 */}
          {currentUserProfile ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 bg-black/5 dark:bg-white/10 rounded-lg">
                👤 {currentUserProfile.username}님
                {isRealAdmin && <span className="text-amber-600 font-extrabold ml-1">(👑 admin)</span>}
              </span>

              {/* 관리자(admin) 전용 모드 전환 버튼 */}
              {isRealAdmin && (
                <button
                  onClick={() => setIsAdminMode(!isAdminMode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                    isAdminMode
                      ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-sm'
                      : 'bg-black/5 border-black/10 text-gray-600 hover:bg-black/10'
                  }`}
                >
                  {isAdminMode ? '👑 관리자 모드 On' : '👤 유저 모드 On'}
                </button>
              )}

              {/* 관리자 페이지 링크 (admin 권한 계정만 노출) */}
              {isRealAdmin && (
                <Link
                  href="/admin"
                  className="px-3.5 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-700 transition"
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
              className="px-4 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition"
            >
              🔑 로그인 / 회원가입
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className={`p-6 rounded-xl border shadow-sm space-y-5 transition-colors ${panelBgMap[theme]}`}>
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <input
              type="text"
              placeholder="지문 제목 검색..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className={`w-full md:w-80 p-2.5 border rounded-lg text-sm transition-colors ${inputBgMap[theme]}`}
            />

            <div className="flex gap-3 w-full md:w-auto">
              <select
                value={selectedExamType}
                onChange={(e) => setSelectedExamType(e.target.value)}
                className={`p-2.5 border rounded-lg text-sm font-medium transition-colors ${inputBgMap[theme]}`}
              >
                <option value="전체">1차: 시험 구분 (전체)</option>
                <option value="수능">수능</option>
                <option value="6월모의">6월 모의고사</option>
                <option value="9월모의">9월 모의고사</option>
                <option value="LEET">LEET</option>
              </select>

              <select
                value={selectedSubCategory}
                onChange={(e) => setSelectedSubCategory(e.target.value)}
                className={`p-2.5 border rounded-lg text-sm font-medium transition-colors ${inputBgMap[theme]}`}
              >
                <option value="전체">2차: 표면 주제 (전체)</option>
                <option value="인문">인문</option>
                <option value="사회(경제)">사회(경제)</option>
                <option value="법">법</option>
                <option value="과학">과학</option>
                <option value="기술">기술</option>
                <option value="철학">철학</option>
              </select>
            </div>
          </div>

          {tier3Skills.length > 0 && (
            <div className="pt-4 border-t border-black/10 dark:border-white/10">
              <div className="text-xs font-bold mb-2.5 opacity-80">
                🧠 3차 독해 능력 필터링 (불변 중요 태그):
              </div>
              <div className="flex flex-wrap gap-2">
                {tier3Skills.map((skill) => {
                  const isSelected = selectedSkillIds.includes(skill.id);
                  return (
                    <button
                      key={skill.id}
                      onClick={() => handleSkillToggle(skill.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-black/5 hover:bg-black/10 border-black/10'
                      }`}
                    >
                      #{skill.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20 opacity-60 font-medium">지문 불러오는 중...</div>
        ) : filteredQuestions.length === 0 ? (
          <div className={`text-center py-20 rounded-xl border opacity-70 ${panelBgMap[theme]}`}>
            조건에 부합하는 지문이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredQuestions.map((q) => (
              <Link
                key={q.id}
                href={`/passages/${q.id}`}
                className={`group p-5 rounded-xl border shadow-sm transition flex flex-col justify-between ${cardBgMap[theme]}`}
              >
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-600 mb-2">
                    <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/40 rounded">{q.exam_type}</span>
                    <span className="px-2 py-0.5 bg-black/5 dark:bg-white/10 opacity-80 rounded">
                      {q.year}학년도
                    </span>
                    <span className="px-2 py-0.5 bg-black/5 dark:bg-white/10 opacity-80 rounded">
                      {q.sub_category}
                    </span>
                  </div>

                  <h2 className="font-bold group-hover:text-blue-600 transition line-clamp-2 mb-3 leading-snug">
                    {q.title}
                  </h2>
                </div>

                <div className="pt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs opacity-80">
                  <div className="flex items-center gap-1 font-semibold">
                    <span className="text-amber-500">★</span>
                    <span className="font-bold">
                      {q.avg_rating && q.avg_rating > 0 ? q.avg_rating : '-'}
                    </span>
                    <span>({q.rating_count || 0})</span>
                  </div>
                  <span className="font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                    검토하기 →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Auth 모달 */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={fetchAuthAndData}
      />
    </div>
  );
}
