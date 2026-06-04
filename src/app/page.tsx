'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { generateSessionToken } from '@/lib/utils';
import { t, getBrowserLang } from '@/lib/i18n';

const LANGUAGES = [
  { code: 'yue', name: '廣東話', flag: '🇭🇰' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'zh', name: '普通話 (简体)', flag: '🇨🇳' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
];

function generateDefaultName(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `用戶${num}`;
}

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
      setError(t(getBrowserLang(), 'login.enter_token'));
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
        setError(t(getBrowserLang(), 'login.invalid_token'));
        setLoading(false);
        return;
      }
      setRoomId(data.room_id);
      setStep('profile');
    } catch {
      setError(t(getBrowserLang(), 'login.verify_error'));
    }
    setLoading(false);
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Auto-generate name if empty
      const finalName = nickname.trim() || generateDefaultName();
      if (!nickname.trim()) {
        setNickname(finalName);
      }

      const sessionToken = generateSessionToken();

      // Clean up old sessions with the same nickname in this room
      await supabase
        .from('sessions')
        .delete()
        .eq('room_id', roomId)
        .eq('nickname', finalName);

      const { error: sessionError } = await supabase
        .from('sessions')
        .insert({
          room_id: roomId,
          nickname: finalName,
          language,
          session_token: sessionToken,
        });

      if (sessionError) {
        setError(t(language, 'login.join_error'));
        setLoading(false);
        return;
      }

      sessionStorage.setItem('session_token', sessionToken);
      sessionStorage.setItem('nickname', finalName);
      sessionStorage.setItem('language', language);
      sessionStorage.setItem('room_id', String(roomId));

      router.push(`/room/${roomId}`);
    } catch {
      setError(t(language, 'login.connection_error'));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-dvh flex items-center justify-center px-[50px] py-6 sm:px-[50px] sm:py-8" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">💬</div>
          <h1 className="text-[36px] sm:text-[40px] font-bold" style={{ color: '#1e375a' }}>Translate Chat</h1>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>{t(getBrowserLang(), 'app.subtitle')}</p>
        </div>

        <div className="rounded-lg p-6 sm:p-8 bg-white" style={{ boxShadow: '0 30px 60px 0 rgba(170, 195, 225, 0.3)', border: '1px solid var(--border)' }}>
          {error && (
            <div className="mb-4 p-4 rounded-lg text-[15px] font-semibold" style={{ backgroundColor: '#fff5f5', border: '1px solid #fed7d7', color: '#e74c3c' }}>
              {error}
            </div>
          )}

          {step === 'invite' ? (
            <form onSubmit={handleInviteSubmit}>
              <h2 className="text-[20px] font-bold mb-1" style={{ color: '#1e375a' }}>{t(getBrowserLang(), 'login.title')}</h2>
              <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
                {t(getBrowserLang(), 'login.subtitle')}
              </p>
              <input
                type="text"
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)}
                placeholder={t(getBrowserLang(), 'login.placeholder')}
                className="w-full rounded-lg placeholder: mb-4 transition-all focus:outline-none"
                style={{
                  fontSize: '20px',
                  padding: '8px',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              />
              <button type="submit" disabled={loading}
                className="w-full rounded-lg font-bold text-white transition-all disabled:opacity-40"
                style={{
                  fontSize: '20px',
                  padding: '8px',
                  backgroundColor: 'var(--primary)',
                  boxShadow: '0 8px 20px 0 rgba(0, 171, 228, 0.25)',
                  borderRadius: '12px',
                }}>
                {loading ? t(getBrowserLang(), 'login.verifying') : t(getBrowserLang(), 'login.next')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinRoom}>
              <h2 className="text-[20px] font-bold mb-1" style={{ color: '#1e375a' }}>{t(language, 'login.join_room')}</h2>
              <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
                {t(language, 'login.room_verified', String(roomId))}
              </p>

              <div className="mb-5">
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {t(language, 'login.name_label')}
                </label>
                <input type="text" value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={t(language, 'login.name_placeholder')}
                  className="w-full rounded-lg placeholder: transition-all focus:outline-none text-center"
                  style={{
                    fontSize: '20px',
                    padding: '8px',
                    backgroundColor: 'var(--bg-input)',
                    border: '2px solid #f59e0b',
                    color: 'var(--text)',
                  }}
                  maxLength={20} autoFocus />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {t(language, 'login.lang_label')}
                </label>
                <div className="grid grid-cols-3 gap-[5px]">
                  {LANGUAGES.map((lang) => (
                    <button key={lang.code} type="button"
                      onClick={() => setLanguage(lang.code)}
                      className="font-medium transition-all m-[2.5px] text-sm sm:text-lg"
                      style={{
                        padding: '8px',
                        borderRadius: '8px',
                        ...(language === lang.code ? {
                          backgroundColor: 'var(--primary)',
                          color: '#fff',
                          fontWeight: 'bold',
                          boxShadow: '0 4px 10px 0 rgba(0, 171, 228, 0.2)',
                          border: 'none',
                        } : {
                          backgroundColor: '#fff',
                          border: '1px solid var(--border)',
                          color: 'var(--text)',
                        }),
                      }}>
                      {lang.flag} {lang.name}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full rounded-lg font-bold transition-all disabled:opacity-40"
                style={{
                  fontSize: '20px',
                  padding: '8px',
                  marginTop: '15px',
                  marginBottom: '15px',
                  color: '#fff',
                  backgroundColor: 'var(--primary)',
                  boxShadow: '0 8px 20px 0 rgba(0, 171, 228, 0.25)',
                  borderRadius: '12px',
                }}>
                {loading ? t(language, 'login.joining') : t(language, 'login.enter_chat')}
              </button>

              <button type="button" onClick={() => setStep('invite')}
                className="mt-3 w-full py-2 text-sm transition-colors"
                style={{ color: 'var(--text-muted)' }}>
                {t(language, 'login.back')}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>Translate Chat v1.0</p>
      </div>
    </div>
  );
}
