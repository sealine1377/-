'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isSignUp) {
        // --- 회원가입 ---
        if (!username.trim() || !email.trim() || !password) {
          setErrorMsg('모든 항목을 입력해 주세요.');
          setLoading(false);
          return;
        }

        // 아이디 'admin'인 경우 자동으로 admin 권한 부여
        const initialRole = username.trim().toLowerCase() === 'admin' ? 'admin' : 'user';

        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { username: username.trim() },
          },
        });

        if (signUpError) throw signUpError;

        if (authData.user) {
          // profiles 테이블에 프로필 생성
          const { error: profileError } = await supabase.from('profiles').insert([
            {
              id: authData.user.id,
              username: username.trim(),
              email: email.trim(),
              role: initialRole,
            },
          ]);

          if (profileError) throw profileError;
        }

        alert(
          initialRole === 'admin'
            ? '🎉 관리자(admin) 계정으로 회원가입이 완료되었습니다!'
            : '🎉 회원가입이 완료되었습니다!'
        );
        onSuccess();
        onClose();
      } else {
        // --- 로그인 ---
        let targetEmail = email.trim();

        // 아이디로 입력한 경우 이메일 찾기
        if (!targetEmail.includes('@')) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('email')
            .eq('username', targetEmail)
            .single();

          if (profileData?.email) {
            targetEmail = profileData.email;
          } else {
            setErrorMsg('존재하지 않는 아이디 또는 이메일입니다.');
            setLoading(false);
            return;
          }
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password,
        });

        if (signInError) throw signInError;

        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || '인증 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full p-7 space-y-6 shadow-2xl text-gray-900 border border-gray-100">
        <div className="flex justify-between items-center border-b pb-4">
          <h2 className="text-xl font-black tracking-tight">
            {isSignUp ? '📝 평가원 평가하기 회원가입' : '🔑 로그인'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-black font-bold text-lg transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">사용자 아이디 *</label>
              <input
                type="text"
                placeholder="아이디 입력 (예: admin)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {isSignUp ? '이메일 주소 *' : '아이디 또는 이메일 *'}
            </label>
            <input
              type={isSignUp ? 'email' : 'text'}
              placeholder={isSignUp ? 'example@email.com' : '아이디 또는 이메일 입력'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">비밀번호 *</label>
            <input
              type="password"
              placeholder="비밀번호 입력 (6자리 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {errorMsg && (
            <p className="text-xs font-bold text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
              ⚠️ {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-black text-white font-bold text-sm rounded-xl hover:bg-gray-800 disabled:bg-gray-400 transition shadow-md"
          >
            {loading ? '처리 중...' : isSignUp ? '회원가입 완료' : '로그인하기'}
          </button>
        </form>

        <div className="text-center pt-2 border-t text-xs text-gray-500">
          {isSignUp ? '이미 계정이 있으신가요?' : '아직 계정이 없으신가요?'}{' '}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg('');
            }}
            className="font-bold text-blue-600 hover:underline ml-1"
          >
            {isSignUp ? '로그인하기' : '회원가입하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
