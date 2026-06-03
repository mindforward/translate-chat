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
    <div className="min-h-dvh flex items-center justify-center p-4 sm:p-6" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">💬</div>
          <h1 className="text-[36px] sm:text-[40px] font-bold" style={{ color: '#1e375a' }}>Translate Chat</h1>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>即時翻譯對話</p>
        </div>

        <div className="rounded-lg p-6 sm:p-8 bg-white" style={{ boxShadow: '0 30px 60px 0 rgba(170, 195, 225, 0.3)', border: '1px solid var(--border)' }}>
          {error && (
            <div className="mb-4 p-4 rounded-lg text-[15px] font-semibold" style={{ backgroundColor: '#fff5f5', border: '1px solid #fed7d7', color: '#e74c3c' }}>
              {error}
            </div>
          )}

          {step === 'invite' ? (
            <form onSubmit={handleInviteSubmit}>
              <h2 className="text-[20px] font-bold mb-1" style={{ color: '#1e375a' }}>🔗 輸入邀請碼</h2>
              <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
                請輸入管理員俾你嘅 Invite Token
              </p>
              <input
                type="text"
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)}
                placeholder="例如: a1b2c3d4e5f6g7h8"
                className="w-full px-5 py-4 rounded-lg text-[17px] placeholder: mb-4 transition-all focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              />
              <button type="submit" disabled={loading}
                className="w-full py-4 rounded-lg font-bold text-white text-[17px] transition-all disabled:opacity-40"
                style={{
                  backgroundColor: 'var(--primary)',
                  boxShadow: '0 8px 20px 0 rgba(0, 171, 228, 0.25)',
                }}>
                {loading ? '驗證中...' : '下一步 →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinRoom}>
              <h2 className="text-[20px] font-bold mb-1" style={{ color: '#1e375a' }}>加入聊天室</h2>
              <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
                Room {roomId} · 已通過邀請驗證
              </p>

              <div className="mb-5">
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  你的名稱
                </label>
                <input type="text" value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="例如: 小明"
                  className="w-full px-5 py-4 rounded-lg text-[17px] placeholder: transition-all focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                  maxLength={20} autoFocus />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  你的語言
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {LANGUAGES.map((lang) => (
                    <button key={lang.code} type="button"
                      onClick={() => setLanguage(lang.code)}
                      className={`px-2 py-3.5 rounded-lg text-[15px] font-medium transition-all`}
                      style={language === lang.code ? {
                        backgroundColor: 'var(--primary)',
                        color: '#fff',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 10px 0 rgba(0, 171, 228, 0.2)',
                        border: 'none',
                      } : {
                        backgroundColor: '#fff',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                      }}>
                      {lang.flag} {lang.name}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-4 rounded-lg font-bold text-white text-[17px] transition-all disabled:opacity-40"
                style={{
                  backgroundColor: 'var(--primary)',
                  boxShadow: '0 8px 20px 0 rgba(0, 171, 228, 0.25)',
                }}>
                {loading ? '加入中...' : '進入聊天室 💬'}
              </button>

              <button type="button" onClick={() => setStep('invite')}
                className="mt-3 w-full py-2 text-sm transition-colors"
                style={{ color: 'var(--text-muted)' }}>
                ← 返回輸入邀請碼
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>Translate Chat v1.0</p>
      </div>
    </div>
  );
}
