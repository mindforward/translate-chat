'use client';

import { useState, useEffect } from 'react';

const ROOMS = [
  { id: 1, name: 'Group A' },
  { id: 2, name: 'Group B' },
  { id: 3, name: 'Group C' },
  { id: 4, name: 'Group D' },
  { id: 5, name: 'Group E' },
];

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [adminPw, setAdminPw] = useState('');
  const [pwError, setPwError] = useState('');

  const [selectedRoom, setSelectedRoom] = useState(1);
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (sessionStorage.getItem('admin_logged_in') === 'true') {
      setLoggedIn(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    try {
      const res = await fetch('/admin/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPw }),
      });
      if (res.ok) {
        sessionStorage.setItem('admin_logged_in', 'true');
        setLoggedIn(true);
      } else {
        setPwError('密碼錯誤');
      }
    } catch {
      setPwError('連線錯誤');
    }
  };

  if (!loggedIn) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4 bg-[var(--bg)]">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">⚙️</div>
            <h1 className="text-[26px] font-bold text-[var(--text)] mb-1">Admin Panel</h1>
            <p className="text-[15px] text-[var(--text-secondary)]">請輸入管理員密碼</p>
          </div>
          <form onSubmit={handleLogin} className="bg-white rounded-2xl p-6 border border-[var(--border)] shadow-sm">
            {pwError && (
              <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-[14px]">
                {pwError}
              </div>
            )}
            <input
              type="password"
              value={adminPw}
              onChange={(e) => setAdminPw(e.target.value)}
              placeholder="Admin Password"
              className="w-full px-4 py-3.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-[var(--text)] text-[16px] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)] mb-4"
              autoFocus
            />
            <button
              type="submit"
              className="w-full py-3.5 bg-[var(--primary)] hover:brightness-110 rounded-xl font-medium text-white text-[16px] transition-all"
            >
              進入
            </button>
          </form>
        </div>
      </div>
    );
  }

  const generateInvite = async () => {
    setLoading(true);
    setError('');
    setInviteUrl('');
    setInviteToken('');

    try {
      const res = await fetch('/api/generate-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: selectedRoom, expiresInMinutes: 15 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Generation failed');
      } else {
        setInviteUrl(data.url);
        setInviteToken(data.token);
        setExpiresAt(new Date(data.expires_at).toLocaleString('zh-HK'));
      }
    } catch {
      setError('Network error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-dvh p-4 sm:p-6 max-w-lg mx-auto bg-[var(--bg)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--text)]">⚙️ Admin</h1>
          <p className="text-[14px] text-[var(--text-secondary)]">管理 Invite Links</p>
        </div>
        <button
          onClick={() => {
            sessionStorage.removeItem('admin_logged_in');
            setLoggedIn(false);
          }}
          className="text-[13px] px-3 py-1.5 bg-white border border-[var(--border)] rounded-xl text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
        >
          登出
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-[14px]">
          {error}
        </div>
      )}

      {/* Room Selection */}
      <div className="bg-white rounded-2xl p-5 border border-[var(--border)] shadow-sm mb-3">
        <h2 className="font-semibold text-[16px] mb-3">選擇房間</h2>
        <div className="grid grid-cols-5 gap-2">
          {ROOMS.map((room) => (
            <button
              key={room.id}
              onClick={() => setSelectedRoom(room.id)}
              className={`py-2.5 rounded-xl text-[13px] font-medium border transition-all ${
                selectedRoom === room.id
                  ? 'bg-[var(--primary)] border-[var(--primary)] text-white shadow-sm'
                  : 'bg-white border-[var(--border)] text-[var(--text)] hover:border-[var(--primary)]'
              }`}
            >
              {room.name}
            </button>
          ))}
        </div>
      </div>

      {/* Generate Invite */}
      <div className="bg-white rounded-2xl p-5 border border-[var(--border)] shadow-sm">
        <h2 className="font-semibold text-[16px] mb-1">🔗 一次性 Invite Link</h2>
        <p className="text-[13px] text-[var(--text-secondary)] mb-4">
          產生後 15 分鐘有效，使用一次即失效
        </p>

        <button
          onClick={generateInvite}
          disabled={loading}
          className="w-full py-3.5 bg-[var(--primary)] hover:brightness-110 rounded-xl font-medium text-white text-[15px] transition-all disabled:opacity-40 mb-4"
        >
          {loading ? '產生中...' : '產生 Invite Link'}
        </button>

        {inviteToken && (
          <div className="space-y-2.5">
            <div className="p-3.5 bg-[var(--bg-input)] rounded-xl border border-[var(--border)]">
              <p className="text-[12px] text-[var(--text-muted)] mb-1">🔑 Token</p>
              <p className="font-mono text-[16px] font-bold select-all text-[var(--text)]">{inviteToken}</p>
            </div>
            <div className="p-3.5 bg-[var(--bg-input)] rounded-xl border border-[var(--border)]">
              <p className="text-[12px] text-[var(--text-muted)] mb-1">🔗 完整連結</p>
              <p className="text-[14px] break-all select-all text-[var(--text)]">{inviteUrl}</p>
            </div>
            <div className="p-3.5 bg-[var(--bg-input)] rounded-xl border border-[var(--border)]">
              <p className="text-[12px] text-[var(--text-muted)] mb-1">⏰ 到期</p>
              <p className="text-[14px] text-[var(--text)]">{expiresAt}</p>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-[12px] text-[var(--text-muted)] mt-6">
        Translate Chat v1.0
      </p>
    </div>
  );
}
