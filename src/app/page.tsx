'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { generateSessionToken } from '@/lib/utils';

const LANGUAGES = [
  { code: 'yue', name: '廣東話', flag: '🇭🇰' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'zh', name: '繁體中文', flag: '🇨🇳' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
];

export default function HomePage() {
  const router = useRouter();
  const [step, setStep] = useState<'invite' | 'room'>('invite');
  const [nickname, setNickname] = useState('');
  const [language, setLanguage] = useState('yue');
  const [roomId, setRoomId] = useState(1);
  const [password, setPassword] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check for invite info from sessionStorage (redirected from /invite/[token])
  useEffect(() => {
    const storedRoomId = sessionStorage.getItem('invite_room_id');
    const storedToken = sessionStorage.getItem('invite_token');
    if (storedRoomId && storedToken) {
      setRoomId(Number(storedRoomId));
      setInviteToken(storedToken);
      setStep('room');
      // Clean up
      sessionStorage.removeItem('invite_room_id');
      sessionStorage.removeItem('invite_token');
    }
  }, []);

  // Check invite link on mount
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
      setStep('room');
    } catch {
      setError('無法驗證 Invite Link');
    }
    setLoading(false);
  };

  const handleRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !password.trim()) {
      setError('請輸入名稱、語言、和密碼');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/verify-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '密碼錯誤');
        setLoading(false);
        return;
      }

      // Create session
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
        setError('建立 session 失敗');
        setLoading(false);
        return;
      }

      // Store in sessionStorage and redirect
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">💬 Translate Chat</h1>
          <p className="text-[var(--text-muted)]">即時翻譯對話通訊</p>
        </div>

        <div className="bg-[var(--bg-card)] rounded-2xl p-6 shadow-xl border border-[var(--border)]">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {step === 'invite' ? (
            <form onSubmit={handleInviteSubmit}>
              <h2 className="text-lg font-semibold mb-4">🔗 輸入 Invite Link</h2>
              <p className="text-sm text-[var(--text-muted)] mb-4">
                請輸入你收到的邀請鏈接 Token
              </p>
              <input
                type="text"
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)}
                placeholder="例如: abcdef1234567890"
                className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] mb-4"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-xl font-semibold transition-colors disabled:opacity-50"
              >
                {loading ? '驗證中...' : '下一步 →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRoomSubmit}>
              <h2 className="text-lg font-semibold mb-4">
                進入 Room {roomId}
              </h2>

              <div className="mb-4">
                <label className="block text-sm text-[var(--text-muted)] mb-2">
                  你的名稱
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="例如: 小明"
                  className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
                  maxLength={20}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm text-[var(--text-muted)] mb-2">
                  你的語言
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setLanguage(lang.code)}
                      className={`px-3 py-2 rounded-xl text-sm border transition-colors ${
                        language === lang.code
                          ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                          : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)]'
                      }`}
                    >
                      {lang.flag} {lang.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm text-[var(--text-muted)] mb-2">
                  房間密碼
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="輸入房間密碼"
                  className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-xl font-semibold transition-colors disabled:opacity-50"
              >
                {loading ? '驗證中...' : '進入聊天室 💬'}
              </button>
            </form>
          )}

          {step === 'room' && (
            <button
              onClick={() => setStep('invite')}
              className="mt-3 w-full py-2 text-sm text-[var(--text-muted)] hover:text-white transition-colors"
            >
              ← 返回輸入 Invite Link
            </button>
          )}
        </div>

        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          Translate Chat v1.0 — Made with ❤️
        </p>
      </div>
    </div>
  );
}
