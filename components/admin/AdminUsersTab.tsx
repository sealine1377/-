'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
}

export default function AdminUsersTab() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setUsers(data as UserProfile[]);
    }
    setLoading(false);
  };

  const handleToggleRole = async (targetUser: UserProfile) => {
    if (targetUser.username === 'admin') {
      alert("최초 관리자 'admin' 계정의 권한은 변경할 수 없습니다.");
      return;
    }

    const nextRole = targetUser.role === 'admin' ? 'user' : 'admin';
    const confirmMsg = `'${targetUser.username}' 사용자에게 [${
      nextRole === 'admin' ? '👑 관리자' : '👤 일반유저'
    }] 권한을 부여하시겠습니까?`;

    if (!confirm(confirmMsg)) return;

    const { error } = await supabase
      .from('profiles')
      .update({ role: nextRole })
      .eq('id', targetUser.id);

    if (error) {
      alert(`권한 변경 실패: ${error.message}`);
    } else {
      alert(`✅ '${targetUser.username}' 님의 권한이 변경되었습니다.`);
      fetchUsers();
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section className="bg-white p-6 rounded-xl border shadow-sm space-y-5 text-gray-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
        <div>
          <h2 className="text-lg font-bold">👥 사용자 목록 및 권한 관리</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            가입한 유저들을 조회하고 특정 유저에게 관리자(admin) 권한을 부여하거나 회수할 수 있습니다.
          </p>
        </div>

        <input
          type="text"
          placeholder="🔍 아이디 또는 이메일 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-72 p-2.5 border rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-xs font-medium">사용자 목록 로드 중...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-xs">검색된 사용자가 없습니다.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b text-gray-600 font-bold uppercase">
                <th className="py-3 px-3">아이디</th>
                <th className="py-3 px-3">이메일</th>
                <th className="py-3 px-3">가입일</th>
                <th className="py-3 px-3">현재 권한</th>
                <th className="py-3 px-3 text-right">권한 설정</th>
              </tr>
            </thead>
            <tbody className="divide-y text-gray-800 font-medium">
              {filteredUsers.map((u) => {
                const isAdminAccount = u.role === 'admin';
                const isMainAdmin = u.username === 'admin';

                return (
                  <tr key={u.id} className="hover:bg-gray-50 transition">
                    <td className="py-3.5 px-3 font-bold flex items-center gap-1.5">
                      <span>{u.username}</span>
                      {isMainAdmin && (
                        <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded-full font-extrabold">
                          최초 관리자
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-gray-600">{u.email}</td>
                    <td className="py-3.5 px-3 text-gray-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-3 font-bold">
                      {isAdminAccount ? (
                        <span className="text-amber-600 font-black">👑 관리자</span>
                      ) : (
                        <span className="text-gray-500">👤 일반유저</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {isMainAdmin ? (
                        <span className="text-[11px] text-gray-400 italic">변경 불가</span>
                      ) : (
                        <button
                          onClick={() => handleToggleRole(u)}
                          className={`px-3 py-1.5 font-bold rounded-lg text-xs transition ${
                            isAdminAccount
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'bg-amber-500 text-white hover:bg-amber-600'
                          }`}
                        >
                          {isAdminAccount ? '일반유저로 변경' : '👑 관리자 권한 부여'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
