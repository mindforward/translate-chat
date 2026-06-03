'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { generateSessionToken } from '@/lib/utils';

const LANGUAGES = [
  { code: 'yue', name: '廣東話', flag: '🇭🇰' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
];

export default function HomePage() {
  const router = useRouter();
  const [step, setStep] = useState<'invite' | 'profile'>('invite');
  const [nickname, setNickname] = useState('');
  const [language, setLanguage] = useState('yue');
  const [roomId, setRoomId] = useState<number>(1);
  const [inviteToken, setInviteToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedRoomId = sessionStorage.getItem('invite_room_id');
    const storedToken = sessionStorage.getItem('invite_token');
    if (storedRoomId && storedToken) {
      setRoomId(Number(storedRoomId));
      setInviteToken(storedToken);
      setStep('profile');
      sessionStorage.removeItem('invite_room_id');
      sessionStorage.removeItem('invite_token');
    }
  }, []);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken.trim()) {
      setError('請輸入 Invite Link Token');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/verify-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteToken: inviteToken.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invite link 無效');
        setLoading(false);
        return;
      }
      setRoomId(data.room_id);
      setStep('profile');
    } catch {
      setError('無法驗證 Invite Link');
    }
    setLoading(false);
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError('請輸入你的名稱');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const sessionToken = generateSessionToken();
      const { error: sessionError } = await supabase
        .from('sessions')
        .insert({
          room_id: roomId,
          nickname: nickname.trim(),
          language,
          session_token: sessionToken,
        });

      if (sessionError) {
        setError('加入聊天室失敗');
        setLoading(false);
        return;
      }

      sessionStorage.setItem('session_token', sessionToken);
      sessionStorage.setItem('nickname', nickname.trim());
      sessionStorage.setItem('language', language);
      sessionStorage.setItem('room_id', String(roomId));

      router.push(`/room/${roomId}`);
    } catch {
      setError('連線錯誤');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">💬</div>
          <h1 className="text-[36px] sm:text-[40px] font-bold text-sky-700 mb-1">Translate Chat</h1>
          <p className="text-lg text-gray-500">即時翻譯對話</p>
        </div>

        <div className="bg-white rounded-2xl p-6 sm:p-8 border-2 border-sky-200 shadow-sm">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-[15px] font-semibold">
              {error}
            </div>
          )}

          {step === 'invite' ? (
            <form onSubmit={handleInviteSubmit}>
              <h2 className="text-[20px] font-bold mb-1 text-gray-800">🔗 輸入邀請碼</h2>
              <p className="text-sm text-gray-400 mb-5">
                請輸入管理員俾你嘅 Invite Token
              </p>
              <input
                type="text"
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)}
                placeholder="例如: a1b2c3d4e5f6g7h8"
                className="w-full px-5 py-4 bg-gray-50 border-2 border-sky-200 rounded-2xl text-gray-800 text-[17px] placeholder:text-gray-400 focus:outline-none focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-200 mb-4 transition-all"
              />
              <button type="submit" disabled={loading}
                className="w-full py-4 bg-sky-600 hover:bg-sky-700 rounded-2xl font-bold text-white text-[17px] transition-all disabled:opacity-40 shadow-sm">
                {loading ? '驗證中...' : '下一步 →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinRoom}>
              <h2 className="text-[20px] font-bold mb-1 text-gray-800">加入聊天室</h2>
              <p className="text-sm text-gray-400 mb-5">
                Room {roomId} · 已通過邀請驗證
              </p>

              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-500 mb-2">
                  你的名稱
                </label>
                <input type="text" value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="例如: 小明"
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-sky-200 rounded-2xl text-gray-800 text-[17px] placeholder:text-gray-400 focus:outline-none focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-200 transition-all"
                  maxLength={20} autoFocus />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-500 mb-2">
                  你的語言
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {LANGUAGES.map((lang) => (
                    <button key={lang.code} type="button"
                      onClick={() => setLanguage(lang.code)}
                      className={`px-2 py-3.5 rounded-2xl text-[15px] font-medium border-2 transition-all ${
                        language === lang.code
                          ? 'bg-sky-600 border-sky-600 text-white shadow-sm font-bold'
                          : 'bg-white border-sky-200 text-gray-800 hover:border-sky-400'
                      }`}>
                      {lang.flag} {lang.name}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-4 bg-sky-600 hover:bg-sky-700 rounded-2xl font-bold text-white text-[17px] transition-all disabled:opacity-40 shadow-sm">
                {loading ? '加入中...' : '進入聊天室 💬'}
              </button>

              <button type="button" onClick={() => setStep('invite')}
                className="mt-3 w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                ← 返回輸入邀請碼
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">Translate Chat v1.0</p>
      </div>
    </div>
  );
}
