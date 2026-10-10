'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!username || !password) {
      setMessage('아이디와 비밀번호를 모두 입력해 주세요.');
      return;
    }

    // 아이디를 임시 이메일 형태로 변환
    const fakeEmail = `${username.trim()}@local.app`;

    if (isSignUp) {
      // 1. 회원가입 처리
      const { data, error } = await supabase.auth.signUp({
        email: fakeEmail,
        password,
      });

      if (error) {
        setMessage(`회원가입 실패: ${error.message}`);
        return;
      }

      if (data.user) {
        // 프로필 테이블에 유저 정보 등록
        await supabase.from('profiles').insert([
          { id: data.user.id, username: username.trim(), role: 'student' }
        ]);
        setMessage('회원가입 성공! 로그인되었습니다.');
        router.push('/admin'); // 가입 후 관리자 페이지로 이동
      }
    } else {
      // 2. 로그인 처리
      const { error } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password,
      });

      if (error) {
        setMessage(`로그인 실패: 아이디나 비밀번호를 확인해 주세요.`);
        return;
      }

      setMessage('로그인 성공!');
      router.push('/admin');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-md border">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          {isSignUp ? '간편 회원가입' : '간편 로그인'}
        </h2>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
            <input
              type="text"
              placeholder="사용할 아이디 입력"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <input
              type="password"
              placeholder="비밀번호 입력 (6자리 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            {isSignUp ? '가입하기' : '로그인하기'}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-center text-sm text-red-600 font-medium">{message}</p>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-blue-600 underline"
          >
            {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
          </button>
        </div>
      </div>
    </div>
  );
}